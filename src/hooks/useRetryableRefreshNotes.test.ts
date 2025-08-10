import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Hoisted spies to avoid top-level variable access issues
const h = vi.hoisted(() => {
  const order: string[] = [];
  const refreshNotesSpy = vi.fn(async (_app?: unknown) => {
    order.push("refreshNotes");
  });
  const setErrorSpy = vi.fn((_err: unknown) => {
    order.push("setError");
  });
  return { order, refreshNotesSpy, setErrorSpy };
});

vi.mock("../store/cardExplorerStore", () => {
  const store = {
    refreshNotes: h.refreshNotesSpy,
    setError: h.setErrorSpy,
  };
  return {
    // Support both direct usage and selector usage
    useCardExplorerStore: (selector?: (s: typeof store) => unknown) =>
      typeof selector === "function" ? selector(store) : store,
  };
});

import { useRetryableRefreshNotes } from "./useRetryableRefreshNotes";

describe("useRetryableRefreshNotes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.order.length = 0;
  });

  it("exposes retry API and delegates to refreshNotes", async () => {
    const plugin = { app: {} } as any;
    const { result } = renderHook(() => useRetryableRefreshNotes(plugin));

    expect(typeof result.current.retry).toBe("function");

    await act(async () => {
      await result.current.retry();
    });

    expect(h.refreshNotesSpy).toHaveBeenCalledTimes(1);
    expect(h.refreshNotesSpy).toHaveBeenCalledWith(plugin.app);
    expect(h.setErrorSpy).toHaveBeenCalledTimes(1);
    expect(h.setErrorSpy).toHaveBeenCalledWith(null);
  });

  it("clears local UI error before store error and refresh", async () => {
    const plugin = { app: { id: "app-1" } } as any;
    const resetError = vi.fn(() => h.order.push("resetError"));

    const { result } = renderHook(() => useRetryableRefreshNotes(plugin, { resetError }));

    await act(async () => {
      await result.current.retry();
    });

    // Verify individual calls
    expect(resetError).toHaveBeenCalledTimes(1);
    expect(h.setErrorSpy).toHaveBeenCalledWith(null);
    expect(h.refreshNotesSpy).toHaveBeenCalledWith(plugin.app);

    // Verify overall call order across hook/store
    // Expected: resetError -> setError -> refreshNotes
    expect(h.order).toEqual(["resetError", "setError", "refreshNotes"]);
  });

  it("does not fail when options are omitted", async () => {
    const plugin = { app: { key: "app-2" } } as any;
    const { result } = renderHook(() => useRetryableRefreshNotes(plugin));

    // retry returns a Promise<void>; ensure it resolves without rejection
    await expect(result.current.retry()).resolves.toBeUndefined();
  });
});
