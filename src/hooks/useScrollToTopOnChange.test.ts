import { renderHook } from "@testing-library/react";
import type { RefObject } from "react";
import type { VirtuosoHandle } from "react-virtuoso";
import { describe, expect, it, vi } from "vitest";
import { useScrollToTopOnChange } from "./useScrollToTopOnChange";

// Constants to avoid magic numbers/strings and clarify intent
const SCROLL_TOP = { index: 0, behavior: "auto" } as const;
const EXPECTED_REAPPLY_COUNT = 4; // 100/200/300/500ms

// Helpers for DRY and clarity
const createRefWithSpy = (): {
  ref: RefObject<VirtuosoHandle | null>;
  spy: ReturnType<typeof vi.fn>;
} => {
  const spy = vi.fn();
  const ref: RefObject<VirtuosoHandle | null> = {
    // We only need scrollToIndex for these tests; cast to VirtuosoHandle for compatibility
    current: { scrollToIndex: spy } as unknown as VirtuosoHandle,
  };
  return { ref, spy };
};

const withFakeTimers = (fn: () => void) => {
  vi.useFakeTimers();
  try {
    fn();
  } finally {
    vi.useRealTimers();
  }
};

const newValue = () => ({ t: Math.random() });

describe("useScrollToTopOnChange", () => {
  it("respects ready gate and reference-change sequence", () =>
    withFakeTimers(() => {
      const { ref, spy } = createRefWithSpy();

      const first = newValue();
      const secondSameRef = newValue();
      // Start not ready
      const { rerender } = renderHook(
        ({ value, ready }) => useScrollToTopOnChange(ref, value, ready),
        { initialProps: { value: first, ready: false } }
      );

      expect(spy).not.toHaveBeenCalled();

      // Change value while not ready — still no scroll
      rerender({ value: secondSameRef, ready: false });
      expect(spy).not.toHaveBeenCalled();

      // Flip to ready with same ref — still no scroll
      rerender({ value: secondSameRef, ready: true });
      expect(spy).not.toHaveBeenCalled();

      // Now change the value reference after ready — triggers immediate scroll
      rerender({ value: newValue(), ready: true });
      expect(spy).toHaveBeenCalledWith(SCROLL_TOP);
    }));

  it("scrolls on ready mount and re-applies (less brittle)", () =>
    withFakeTimers(() => {
      const { ref, spy } = createRefWithSpy();

      renderHook(({ value, ready }) => useScrollToTopOnChange(ref, value, ready), {
        initialProps: { value: newValue(), ready: true },
      });

      // Immediate scroll on mount
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenLastCalledWith(SCROLL_TOP);

      // Consume all scheduled re-applies
      vi.runOnlyPendingTimers();
      expect(spy).toHaveBeenCalledTimes(1 + EXPECTED_REAPPLY_COUNT);
    }));

  it("cleans up timers on value change (cleanup)", () =>
    withFakeTimers(() => {
      const { ref, spy } = createRefWithSpy();

      const { rerender } = renderHook(({ value }) => useScrollToTopOnChange(ref, value, true), {
        initialProps: { value: newValue() },
      });

      // Initial immediate call
      expect(spy).toHaveBeenCalledTimes(1);

      // Change value before timers fire — previous timeouts should be cleared
      rerender({ value: newValue() });

      // Immediate call from second render
      expect(spy).toHaveBeenCalledTimes(2);

      // Only the latest batch of scheduled calls should execute
      vi.runOnlyPendingTimers();
      expect(spy).toHaveBeenCalledTimes(2 + EXPECTED_REAPPLY_COUNT);
    }));

  it("does not scroll when value reference is unchanged", () =>
    withFakeTimers(() => {
      const { ref, spy } = createRefWithSpy();

      const same = newValue();
      const { rerender } = renderHook(({ value }) => useScrollToTopOnChange(ref, value, true), {
        initialProps: { value: same },
      });

      // Initial mount triggers once
      expect(spy).toHaveBeenCalledTimes(1);

      // Rerender with the same reference — no new immediate call
      rerender({ value: same });
      expect(spy).toHaveBeenCalledTimes(1);

      // Scheduled timers from initial render
      vi.runOnlyPendingTimers();
      expect(spy).toHaveBeenCalledTimes(1 + EXPECTED_REAPPLY_COUNT);
    }));

  it("skips when ref is null and schedules no timers", () =>
    withFakeTimers(() => {
      const spy = vi.fn();
      const ref: RefObject<VirtuosoHandle | null> = { current: null };

      renderHook(({ value, ready }) => useScrollToTopOnChange(ref, value, ready), {
        initialProps: { value: newValue(), ready: true },
      });

      // No immediate calls because ref is null
      expect(spy).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0); // no timeouts were scheduled

      // Attaching a handle later shouldn't retroactively invoke
      ref.current = { scrollToIndex: spy } as unknown as VirtuosoHandle;
      vi.runOnlyPendingTimers();
      expect(spy).not.toHaveBeenCalled();
    }));

  // Decision table: ready transitions x reference changes
  type Case = {
    name: string;
    initialReady: boolean;
    nextReady: boolean;
    refChange: boolean;
    expectedImmediate: number; // 0 or 1
  };

  const cases: Case[] = [
    {
      name: "not ready → ready, same ref",
      initialReady: false,
      nextReady: true,
      refChange: false,
      expectedImmediate: 0,
    },
    {
      name: "not ready → ready, new ref",
      initialReady: false,
      nextReady: true,
      refChange: true,
      expectedImmediate: 1,
    },
    {
      name: "ready → ready, same ref",
      initialReady: true,
      nextReady: true,
      refChange: false,
      expectedImmediate: 0,
    },
    {
      name: "ready → ready, new ref",
      initialReady: true,
      nextReady: true,
      refChange: true,
      expectedImmediate: 1,
    },
  ];

  describe.each<Case>(cases)(
    "guard behavior: $name",
    ({ initialReady, nextReady, refChange, expectedImmediate }: Case) => {
      it("applies immediate scroll expectation", () =>
        withFakeTimers(() => {
          const { ref, spy } = createRefWithSpy();
          const stable = newValue();
          const { rerender } = renderHook(
            ({ value, ready }) => useScrollToTopOnChange(ref, value, ready),
            { initialProps: { value: stable, ready: initialReady } }
          );

          const next = refChange ? newValue() : stable;
          const before = spy.mock.calls.length;
          rerender({ value: next, ready: nextReady });

          const after = spy.mock.calls.length;
          expect(after - before).toBe(expectedImmediate);
          if (expectedImmediate) expect(spy).toHaveBeenLastCalledWith(SCROLL_TOP);
        }));
    }
  );
});
