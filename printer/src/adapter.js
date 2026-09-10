// Bambu X1C LAN-mode adapter — read-only status/AMS + send-file-for-a-human.
//
// UNVERIFIED AGAINST REAL HARDWARE. Built from the reverse-engineered LAN
// protocol documented by community projects (bambulabs_api,
// homeassistant-bambulab) — Bambu Lab does not publish an official
// third-party API. Firmware updates have broken these community
// integrations before; that's why this adapter is isolated in its own
// module (design-discussion §3 risk mitigation) and every method degrades
// to a clear error rather than crashing or hanging a caller.
//
// Protocol summary this adapter assumes:
//   - MQTT over TLS, port 8883, username "bblp", password = LAN access code
//   - Subscribe:  device/{serial}/report   (printer pushes state here)
//   - Publish:    device/{serial}/request  {"pushing":{"sequence_id":"0","command":"pushall"}}
//     to force a full status push instead of waiting for the next delta
//   - Report payload: { print: { gcode_state, mc_percent, layer_num,
//     total_layer_num, subtask_name, ams: { ams: [ { id, tray: [...] } ] } } }
//   - File transfer: implicit FTPS, port 990, username "bblp", password =
//     access code, upload target directory unconfirmed (defaults to "/").
//
// start/stop/pause are explicitly NOT implemented in this slice — see
// design-discussion §5 Q1. Calling them rejects with a clear message
// instead of silently no-op'ing.

import { EventEmitter } from "node:events";

const REPORT_TOPIC = (serial) => `device/${serial}/report`;
const REQUEST_TOPIC = (serial) => `device/${serial}/request`;
const PUSHALL_COMMAND = JSON.stringify({ pushing: { sequence_id: "0", command: "pushall" } });

export class PrinterUnreachableError extends Error {
  constructor(message) {
    super(message);
    this.name = "PrinterUnreachableError";
  }
}

export class NotSupportedError extends Error {
  constructor(action) {
    super(`${action} is not supported in this slice (read-only + send-file only — see design-discussion §5 Q1)`);
    this.name = "NotSupportedError";
  }
}

export class BambuPrinterAdapter extends EventEmitter {
  /**
   * @param {object} opts
   * @param {string} opts.host
   * @param {string} opts.serial
   * @param {string} opts.accessCode
   * @param {(opts: object) => object} [opts.mqttClientFactory] - injectable for tests; defaults to `mqtt.connect`
   * @param {() => object} [opts.ftpClientFactory] - injectable for tests; defaults to a `basic-ftp` Client
   * @param {number} [opts.statusTimeoutMs]
   */
  constructor({ host, serial, accessCode, mqttClientFactory, ftpClientFactory, statusTimeoutMs = 5000 }) {
    super();
    if (!host || !serial || !accessCode) {
      throw new Error("host, serial, and accessCode are all required");
    }
    this.host = host;
    this.serial = serial;
    this.accessCode = accessCode;
    this.statusTimeoutMs = statusTimeoutMs;
    this._mqttClientFactory = mqttClientFactory;
    this._ftpClientFactory = ftpClientFactory;
    this._client = null;
    this._lastReport = null;
    this._connected = false;
  }

  async connect() {
    if (this._connected) return;
    const factory = this._mqttClientFactory ?? (await defaultMqttFactory());
    this._client = factory({
      host: this.host,
      port: 8883,
      protocol: "mqtts",
      username: "bblp",
      password: this.accessCode,
      rejectUnauthorized: false, // Bambu printers use a self-signed cert in LAN mode
      reconnectPeriod: 0, // this adapter owns retry policy, not the mqtt lib
    });

    await new Promise((resolve, reject) => {
      const onError = (err) => {
        cleanup();
        reject(new PrinterUnreachableError(`Could not connect to ${this.host}: ${err.message}`));
      };
      const onConnect = () => {
        cleanup();
        this._connected = true;
        resolve();
      };
      const cleanup = () => {
        this._client.removeListener("error", onError);
        this._client.removeListener("connect", onConnect);
      };
      this._client.once("error", onError);
      this._client.once("connect", onConnect);
    });

    this._client.on("message", (topic, payload) => {
      if (topic === REPORT_TOPIC(this.serial)) {
        try {
          const data = JSON.parse(payload.toString());
          this._lastReport = { ...this._lastReport, ...data };
          this.emit("report", this._lastReport);
        } catch {
          // Malformed/partial report frame — ignore rather than crash the adapter.
        }
      }
    });
    this._client.subscribe(REPORT_TOPIC(this.serial));
  }

  disconnect() {
    if (this._client) {
      this._client.end(true);
      this._client = null;
    }
    this._connected = false;
    this._lastReport = null;
  }

  /** Force a full status push and wait for it (rather than trusting a stale cached delta). */
  async _requestFreshReport() {
    if (!this._connected) throw new PrinterUnreachableError("not connected — call connect() first");
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.removeListener("report", onReport);
        reject(new PrinterUnreachableError(`No status response from ${this.host} within ${this.statusTimeoutMs}ms`));
      }, this.statusTimeoutMs);
      const onReport = (report) => {
        clearTimeout(timer);
        resolve(report);
      };
      this.once("report", onReport);
      this._client.publish(REQUEST_TOPIC(this.serial), PUSHALL_COMMAND);
    });
  }

  async getStatus() {
    const report = await this._requestFreshReport();
    const print = report.print ?? {};
    return {
      state: print.gcode_state ?? "UNKNOWN",
      progressPercent: print.mc_percent ?? null,
      layer: print.layer_num ?? null,
      totalLayers: print.total_layer_num ?? null,
      jobName: print.subtask_name ?? null,
    };
  }

  async getAmsState() {
    const report = await this._requestFreshReport();
    const amsUnits = report.print?.ams?.ams ?? [];
    return amsUnits.map((unit) => ({
      id: unit.id,
      trays: (unit.tray ?? []).map((t) => ({
        trayId: t.id,
        material: t.tray_type ?? null,
        color: t.tray_color ?? null,
        remainPercent: t.remain ?? null,
      })),
    }));
  }

  /** Push a sliced file to the printer's onboard storage for a human to start. */
  async sendFile(localPath, { remoteDir = "/" } = {}) {
    const factory = this._ftpClientFactory ?? (await defaultFtpFactory());
    const client = factory();
    try {
      await client.access({
        host: this.host,
        port: 990,
        user: "bblp",
        password: this.accessCode,
        secure: "implicit",
        secureOptions: { rejectUnauthorized: false },
      });
      const remoteName = remoteDir.replace(/\/$/, "") + "/" + basename(localPath);
      await client.uploadFrom(localPath, remoteName);
      return { queued: true, remoteName };
    } catch (err) {
      throw new PrinterUnreachableError(`File send failed: ${err.message}`);
    } finally {
      client.close();
    }
  }

  async startPrint() {
    throw new NotSupportedError("startPrint");
  }
  async stopPrint() {
    throw new NotSupportedError("stopPrint");
  }
  async pausePrint() {
    throw new NotSupportedError("pausePrint");
  }
}

function basename(p) {
  return p.split("/").pop();
}

async function defaultMqttFactory() {
  const mqtt = await import("mqtt");
  return (opts) => mqtt.connect(`mqtts://${opts.host}:${opts.port}`, opts);
}

async function defaultFtpFactory() {
  const { Client } = await import("basic-ftp");
  return () => new Client();
}
