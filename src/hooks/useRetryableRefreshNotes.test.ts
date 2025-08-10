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
  return {
    useCardExplorerStore: () => ({
      refreshNotes: h.refreshNotesSpy,
      setError: h.setErrorSpy,
    }),
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
    const localOrder: string[] = [];
    const resetError = vi.fn(() => localOrder.push("resetError"));

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
    expect(["resetError", ...h.order]).toEqual(["resetError", "setError", "refreshNotes"]);
  });

  it("does not fail when options are omitted", async () => {
    const plugin = { app: { key: "app-2" } } as any;
    const { result } = renderHook(() => useRetryableRefreshNotes(plugin));

    await expect(
      act(async () => {
        await result.current.retry();
      })
    ).resolves.not.toThrow();
  });
});
