import test from "node:test";
import assert from "node:assert/strict";
import { loadPrinterConfig, PrinterConfigMissingError, CONFIG_SECRET_NAMES } from "../src/config.js";

test("loadPrinterConfig resolves all three secrets when present", async () => {
  const values = { [CONFIG_SECRET_NAMES.host]: "10.0.0.42", [CONFIG_SECRET_NAMES.serial]: "01ABC123", [CONFIG_SECRET_NAMES.accessCode]: "87654321" };
  const exec = async (cmd, args) => {
    const name = args[1].match(/secret:(.+)}}/)[1];
    return values[name];
  };
  const config = await loadPrinterConfig({ exec });
  assert.deepEqual(config, { host: "10.0.0.42", serial: "01ABC123", accessCode: "87654321" });
});

test("loadPrinterConfig throws PrinterConfigMissingError naming every unresolved secret", async () => {
  const exec = async (cmd, args) => {
    const name = args[1].match(/secret:(.+)}}/)[1];
    if (name === CONFIG_SECRET_NAMES.host) return "10.0.0.42";
    throw new Error("not found");
  };
  await assert.rejects(loadPrinterConfig({ exec }), (err) => {
    assert.ok(err instanceof PrinterConfigMissingError);
    assert.deepEqual(err.missingNames, [CONFIG_SECRET_NAMES.serial, CONFIG_SECRET_NAMES.accessCode]);
    return true;
  });
});

test("loadPrinterConfig treats an empty resolved value as missing", async () => {
  const exec = async () => "";
  await assert.rejects(loadPrinterConfig({ exec }), PrinterConfigMissingError);
});
