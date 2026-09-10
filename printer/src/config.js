// Loads printer LAN credentials from Portunus — never a plaintext config
// file (design-discussion §3 risk: credentials must not be committed).
// Three separate secrets, same convention as app/src/portunus.js.
import { spawn } from "node:child_process";

const PROJECT = "dt-forge";
const NAMES = {
  host: "dt-forge-printer-host",
  serial: "dt-forge-printer-serial",
  accessCode: "dt-forge-printer-access-code",
};

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr.trim() || `${cmd} exited ${code}`));
    });
  });
}

/**
 * Resolves {host, serial, accessCode} via `portunus resolve`, or throws
 * PrinterConfigMissingError if any of the three secrets aren't set up yet.
 * Not yet exercised against real Portunus entries — no printer secrets
 * exist until the user provides real LAN details at the hardware-testing
 * stage (see story printer-agent-link notes).
 */
export async function loadPrinterConfig({ exec = run } = {}) {
  const missing = [];
  const values = {};
  for (const [key, name] of Object.entries(NAMES)) {
    try {
      const value = await exec("portunus", ["resolve", `{{secret:${name}}}`]);
      if (!value) throw new Error("empty");
      values[key] = value;
    } catch {
      missing.push(name);
    }
  }
  if (missing.length > 0) {
    throw new PrinterConfigMissingError(missing);
  }
  return values;
}

export class PrinterConfigMissingError extends Error {
  constructor(missingNames) {
    super(
      `Printer not configured — missing Portunus secret(s): ${missingNames.join(", ")}. ` +
        `Store them with: portunus drop <name> <name> --project ${PROJECT} --backend local --stdin`
    );
    this.name = "PrinterConfigMissingError";
    this.missingNames = missingNames;
  }
}

export const CONFIG_SECRET_NAMES = NAMES;
