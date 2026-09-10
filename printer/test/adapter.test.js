import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import {
  BambuPrinterAdapter,
  PrinterUnreachableError,
  NotSupportedError,
} from "../src/adapter.js";

class FakeMqttClient extends EventEmitter {
  constructor() {
    super();
    this.subscribed = [];
    this.published = [];
    this.ended = false;
  }
  subscribe(topic) {
    this.subscribed.push(topic);
  }
  publish(topic, payload) {
    this.published.push({ topic, payload });
  }
  end() {
    this.ended = true;
  }
}

function makeAdapter({ statusTimeoutMs = 50 } = {}) {
  const fakeClient = new FakeMqttClient();
  const adapter = new BambuPrinterAdapter({
    host: "10.0.0.42",
    serial: "01ABC1234567",
    accessCode: "12345678",
    statusTimeoutMs,
    mqttClientFactory: () => fakeClient,
  });
  return { adapter, fakeClient };
}

test("constructor requires host, serial, and accessCode", () => {
  assert.throws(() => new BambuPrinterAdapter({ serial: "x", accessCode: "y" }), /host/);
  assert.throws(() => new BambuPrinterAdapter({ host: "x", accessCode: "y" }), /serial/);
  assert.throws(() => new BambuPrinterAdapter({ host: "x", serial: "y" }), /accessCode/);
});

test("connect() resolves once the mqtt client emits connect, and subscribes to the report topic", async () => {
  const { adapter, fakeClient } = makeAdapter();
  const connectPromise = adapter.connect();
  fakeClient.emit("connect");
  await connectPromise;
  assert.deepEqual(fakeClient.subscribed, ["device/01ABC1234567/report"]);
});

test("connect() rejects with PrinterUnreachableError when the mqtt client errors", async () => {
  const { adapter, fakeClient } = makeAdapter();
  const connectPromise = adapter.connect();
  fakeClient.emit("error", new Error("ECONNREFUSED"));
  await assert.rejects(connectPromise, PrinterUnreachableError);
});

test("getStatus() publishes a pushall request and resolves from the next report message", async () => {
  const { adapter, fakeClient } = makeAdapter();
  const connectPromise = adapter.connect();
  fakeClient.emit("connect");
  await connectPromise;

  const statusPromise = adapter.getStatus();
  assert.equal(fakeClient.published.length, 1);
  assert.equal(fakeClient.published[0].topic, "device/01ABC1234567/request");
  assert.match(fakeClient.published[0].payload, /pushall/);

  fakeClient.emit(
    "message",
    "device/01ABC1234567/report",
    Buffer.from(JSON.stringify({ print: { gcode_state: "RUNNING", mc_percent: 42, layer_num: 10, total_layer_num: 200, subtask_name: "bracket.gcode.3mf" } }))
  );

  const status = await statusPromise;
  assert.deepEqual(status, {
    state: "RUNNING",
    progressPercent: 42,
    layer: 10,
    totalLayers: 200,
    jobName: "bracket.gcode.3mf",
  });
});

test("getStatus() times out with PrinterUnreachableError if the printer never responds", async () => {
  const { adapter, fakeClient } = makeAdapter({ statusTimeoutMs: 20 });
  const connectPromise = adapter.connect();
  fakeClient.emit("connect");
  await connectPromise;

  await assert.rejects(adapter.getStatus(), PrinterUnreachableError);
});

test("getStatus() ignores malformed report frames instead of crashing", async () => {
  const { adapter, fakeClient } = makeAdapter({ statusTimeoutMs: 30 });
  const connectPromise = adapter.connect();
  fakeClient.emit("connect");
  await connectPromise;

  const statusPromise = adapter.getStatus();
  fakeClient.emit("message", "device/01ABC1234567/report", Buffer.from("{not json"));
  // malformed frame is dropped silently; the request eventually times out
  await assert.rejects(statusPromise, PrinterUnreachableError);
});

test("getAmsState() maps AMS units and trays from the report payload", async () => {
  const { adapter, fakeClient } = makeAdapter();
  const connectPromise = adapter.connect();
  fakeClient.emit("connect");
  await connectPromise;

  const amsPromise = adapter.getAmsState();
  fakeClient.emit(
    "message",
    "device/01ABC1234567/report",
    Buffer.from(
      JSON.stringify({
        print: {
          ams: {
            ams: [
              {
                id: "0",
                tray: [
                  { id: "0", tray_type: "PLA", tray_color: "FF0000FF", remain: 80 },
                  { id: "1", tray_type: "PETG", tray_color: "00FF00FF", remain: 15 },
                ],
              },
            ],
          },
        },
      })
    )
  );

  const ams = await amsPromise;
  assert.deepEqual(ams, [
    {
      id: "0",
      trays: [
        { trayId: "0", material: "PLA", color: "FF0000FF", remainPercent: 80 },
        { trayId: "1", material: "PETG", color: "00FF00FF", remainPercent: 15 },
      ],
    },
  ]);
});

test("getAmsState() returns an empty array when the report has no ams field yet", async () => {
  const { adapter, fakeClient } = makeAdapter();
  const connectPromise = adapter.connect();
  fakeClient.emit("connect");
  await connectPromise;

  const amsPromise = adapter.getAmsState();
  fakeClient.emit("message", "device/01ABC1234567/report", Buffer.from(JSON.stringify({ print: {} })));
  assert.deepEqual(await amsPromise, []);
});

test("sendFile() uploads via implicit FTPS on port 990 and always closes the client", async () => {
  const calls = { access: null, uploadFrom: null, closed: false };
  const fakeFtpClient = {
    async access(opts) {
      calls.access = opts;
    },
    async uploadFrom(local, remote) {
      calls.uploadFrom = { local, remote };
    },
    close() {
      calls.closed = true;
    },
  };
  const adapter = new BambuPrinterAdapter({
    host: "10.0.0.42",
    serial: "01ABC1234567",
    accessCode: "12345678",
    ftpClientFactory: () => fakeFtpClient,
  });

  const result = await adapter.sendFile("/tmp/bracket-plate1.gcode.3mf");
  assert.equal(calls.access.port, 990);
  assert.equal(calls.access.secure, "implicit");
  assert.equal(calls.access.user, "bblp");
  assert.equal(calls.uploadFrom.remote, "/bracket-plate1.gcode.3mf");
  assert.equal(calls.closed, true);
  assert.deepEqual(result, { queued: true, remoteName: "/bracket-plate1.gcode.3mf" });
});

test("sendFile() wraps FTP failures in PrinterUnreachableError and still closes the client", async () => {
  const calls = { closed: false };
  const fakeFtpClient = {
    async access() {
      throw new Error("connection timed out");
    },
    async uploadFrom() {},
    close() {
      calls.closed = true;
    },
  };
  const adapter = new BambuPrinterAdapter({
    host: "10.0.0.42",
    serial: "01ABC1234567",
    accessCode: "12345678",
    ftpClientFactory: () => fakeFtpClient,
  });

  await assert.rejects(adapter.sendFile("/tmp/x.gcode.3mf"), PrinterUnreachableError);
  assert.equal(calls.closed, true);
});

test("startPrint/stopPrint/pausePrint all reject with NotSupportedError, never silently no-op", async () => {
  const { adapter } = makeAdapter();
  await assert.rejects(adapter.startPrint(), NotSupportedError);
  await assert.rejects(adapter.stopPrint(), NotSupportedError);
  await assert.rejects(adapter.pausePrint(), NotSupportedError);
});
