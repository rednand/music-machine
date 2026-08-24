import { describe, expect, it } from "vitest";
import { runWithAdminTrace, traceDeps, traceStep } from "./admin-trace";

describe("runWithAdminTrace", () => {
  it("returns an empty trace and the plain result when disabled", async () => {
    const { result, trace } = await runWithAdminTrace(false, async () => "value");

    expect(result).toBe("value");
    expect(trace).toEqual([]);
  });

  it("records successful traced steps when enabled", async () => {
    const findAlbum = traceStep("findAlbum", async (id: string) => ({ id }));

    const { result, trace } = await runWithAdminTrace(true, () => findAlbum("album-1"));

    expect(result).toEqual({ id: "album-1" });
    expect(trace).toEqual([
      expect.objectContaining({ label: "findAlbum", status: "ok" })
    ]);
  });

  it("captures the call arguments and the response payload", async () => {
    const findAlbum = traceStep("findAlbum", async (id: string) => ({ id, title: "Control" }));

    const { trace } = await runWithAdminTrace(true, () => findAlbum("album-1"));

    expect(trace[0].args).toBe(JSON.stringify(["album-1"]));
    expect(trace[0].response).toBe(JSON.stringify({ id: "album-1", title: "Control" }));
  });

  it("truncates very large responses instead of blowing up the card", async () => {
    const bigPayload = { items: Array.from({ length: 200 }, (_, i) => `item-${i}`) };
    const fetchMany = traceStep("fetchMany", async () => bigPayload);

    const { trace } = await runWithAdminTrace(true, () => fetchMany());

    expect(trace[0].response?.length).toBeLessThanOrEqual(401);
    expect(trace[0].response?.endsWith("…")).toBe(true);
  });

  it("records the error and rethrows when a traced step fails", async () => {
    const persistCredits = traceStep("persistCredits", async () => {
      throw new Error("Failed to create source: 23502");
    });

    await expect(runWithAdminTrace(true, () => persistCredits())).rejects.toThrow("Failed to create source");
  });

  it("keeps recording the error entry even though the call rejects", async () => {
    const context: { trace?: unknown } = {};
    const persistCredits = traceStep("persistCredits", async () => {
      throw new Error("boom");
    });

    try {
      await runWithAdminTrace(true, async () => {
        context.trace = "started";
        await persistCredits();
      });
    } catch {
      // expected
    }

    expect(context.trace).toBe("started");
  });

  it("does not record anything when tracing is disabled, even on failure", async () => {
    const failing = traceStep("failing", async () => {
      throw new Error("boom");
    });

    await expect(runWithAdminTrace(false, () => failing())).rejects.toThrow("boom");
  });
});

describe("traceDeps", () => {
  it("wraps only the listed keys, leaving everything else untouched", async () => {
    const deps = {
      findAlbum: async (id: string) => ({ id }),
      dedupeNarrativeTrigger: (id: string) => id.length > 0,
      gptClient: { name: "not-a-function" }
    };

    const traced = traceDeps(deps, ["findAlbum"]);

    expect(traced.dedupeNarrativeTrigger("x")).toBe(true);
    expect(traced.gptClient).toBe(deps.gptClient);

    const { trace } = await runWithAdminTrace(true, () => traced.findAlbum("album-1"));
    expect(trace).toEqual([expect.objectContaining({ label: "findAlbum", status: "ok" })]);
  });
});
