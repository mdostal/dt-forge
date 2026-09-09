import test from "node:test";
import assert from "node:assert/strict";
import { testCall } from "../src/heimdall.js";

test("testCall reports lane count and status from heimdall's JSON output", async () => {
  const exec = async () => ({
    stdout: JSON.stringify([
      { lane_id: "claude@mathew.dostal", status: "down" },
      { lane_id: "codex", status: "up" },
    ]),
    stderr: "",
  });
  const result = await testCall({ exec });
  assert.equal(result.ok, true);
  assert.equal(result.laneCount, 2);
  assert.deepEqual(result.lanes, [
    { lane_id: "claude@mathew.dostal", status: "down" },
    { lane_id: "codex", status: "up" },
  ]);
});

test("testCall throws a clear error on non-JSON output instead of crashing", async () => {
  const exec = async () => ({ stdout: "not json", stderr: "" });
  await assert.rejects(() => testCall({ exec }), /non-JSON/);
});
