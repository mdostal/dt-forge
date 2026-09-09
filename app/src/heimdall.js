// Thin wrapper around the local `heimdall` CLI — the routing layer DT Forge
// dogfoods (same pattern as gigradar's src-tauri/resources/server integration).
import { spawn } from "node:child_process";

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr.trim() || `${cmd} exited ${code}`));
    });
  });
}

/**
 * The BYOK app shell's "test call": ask Heimdall for its live lane roster,
 * proving the shell can reach the routing layer before any chat/studio
 * feature is built on top of it. This is NOT a completion call — Heimdall's
 * completion API wasn't confirmed during this story's research step, so the
 * shell proves connectivity rather than faking a chat response.
 */
export async function testCall({ exec = run } = {}) {
  const { stdout } = await exec("heimdall", []);
  let lanes = [];
  try {
    lanes = JSON.parse(stdout);
  } catch {
    throw new Error("heimdall returned non-JSON output");
  }
  return {
    ok: true,
    laneCount: lanes.length,
    lanes: lanes.map((l) => ({ lane_id: l.lane_id, status: l.status })),
  };
}
