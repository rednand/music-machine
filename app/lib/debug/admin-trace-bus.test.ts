import { describe, expect, it, vi } from "vitest";
import { publishAdminTraceEvent, subscribeToAdminTrace } from "./admin-trace-bus";

describe("admin-trace-bus", () => {
  it("delivers published events to every active subscriber", () => {
    const first = vi.fn();
    const second = vi.fn();
    const unsubscribeFirst = subscribeToAdminTrace(first);
    const unsubscribeSecond = subscribeToAdminTrace(second);

    publishAdminTraceEvent({ id: "1", label: "findAlbum", status: "pending" });

    expect(first).toHaveBeenCalledWith({ id: "1", label: "findAlbum", status: "pending" });
    expect(second).toHaveBeenCalledWith({ id: "1", label: "findAlbum", status: "pending" });

    unsubscribeFirst();
    unsubscribeSecond();
  });

  it("stops delivering events after unsubscribe", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToAdminTrace(listener);
    unsubscribe();

    publishAdminTraceEvent({ id: "2", label: "persistCredits", status: "ok", durationMs: 12 });

    expect(listener).not.toHaveBeenCalled();
  });

  it("does not throw when publishing with no subscribers", () => {
    expect(() => publishAdminTraceEvent({ id: "3", label: "ghost", status: "ok", durationMs: 1 })).not.toThrow();
  });
});
