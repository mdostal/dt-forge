import test from "node:test";
import assert from "node:assert/strict";
import { saveKey, keyConfigured, CONSTANTS } from "../src/portunus.js";

test("saveKey rejects empty values without shelling out", async () => {
  let called = false;
  const exec = async () => {
    called = true;
  };
  await assert.rejects(() => saveKey("", { exec }), /must not be empty/);
  await assert.rejects(() => saveKey("   ", { exec }), /must not be empty/);
  assert.equal(called, false);
});

test("saveKey pipes the value on stdin and never in argv", async () => {
  let seenArgs, seenInput;
  const exec = async (cmd, args, opts) => {
    seenArgs = args;
    seenInput = opts.input;
    return { stdout: "", stderr: "" };
  };
  await saveKey("sk-test-secret", { exec });
  assert.equal(seenArgs.includes("sk-test-secret"), false, "key value must never appear in argv");
  assert.equal(seenInput, "sk-test-secret");
  assert.ok(seenArgs.includes(CONSTANTS.KEY_NAME));
  assert.ok(seenArgs.includes("--project"));
  assert.ok(seenArgs.includes(CONSTANTS.PROJECT));
});

test("keyConfigured returns true only when the key name is present and active", async () => {
  const present = async () => ({
    stdout: JSON.stringify([{ name: CONSTANTS.KEY_NAME, state: "dropped" }, { name: "unrelated", state: "dropped" }]),
    stderr: "",
  });
  const absent = async () => ({ stdout: JSON.stringify([{ name: "unrelated", state: "dropped" }]), stderr: "" });

  assert.equal(await keyConfigured({ exec: present }), true);
  assert.equal(await keyConfigured({ exec: absent }), false);
});

test("keyConfigured returns false for a revoked key even though the reference still exists", async () => {
  const revoked = async () => ({
    stdout: JSON.stringify([{ name: CONSTANTS.KEY_NAME, state: "revoked" }]),
    stderr: "",
  });
  assert.equal(await keyConfigured({ exec: revoked }), false);
});

test("keyConfigured degrades to false on malformed output rather than throwing", async () => {
  const broken = async () => ({ stdout: "not json", stderr: "" });
  assert.equal(await keyConfigured({ exec: broken }), false);
});
