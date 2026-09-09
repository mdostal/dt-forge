// Thin wrapper around the local `portunus` CLI — never touch key material
// with anything but a direct stdin pipe into portunus itself.
import { spawn } from "node:child_process";

const PROJECT = "dt-forge";
const KEY_NAME = "dt-forge-byok-key";

function run(cmd, args, { input } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr.trim() || `${cmd} exited ${code}`));
    });
    if (input !== undefined) {
      child.stdin.write(input);
    }
    child.stdin.end();
  });
}

/** Store the user's BYOK key via `portunus drop`, piping the value on stdin. */
export async function saveKey(value, { exec = run } = {}) {
  if (!value || !value.trim()) {
    throw new Error("Key value must not be empty");
  }
  await exec(
    "portunus",
    [
      "drop",
      KEY_NAME,
      KEY_NAME,
      "--project",
      PROJECT,
      "--backend",
      "local",
      "--purpose",
      "BYOK key for DT Forge app shell test call",
      "--stdin",
    ],
    { input: value }
  );
  return { ok: true };
}

/** Check whether a key reference already exists (metadata only, never the value). */
export async function keyConfigured({ exec = run } = {}) {
  const { stdout } = await exec("portunus", ["list", "--project", PROJECT, "--json"]);
  let refs = [];
  try {
    refs = JSON.parse(stdout);
  } catch {
    refs = [];
  }
  return refs.some((r) => r.name === KEY_NAME && r.state !== "revoked");
}

export const CONSTANTS = { PROJECT, KEY_NAME };
