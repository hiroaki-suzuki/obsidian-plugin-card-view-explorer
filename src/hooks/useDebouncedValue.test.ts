import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useDebouncedValue } from "./useDebouncedValue";

describe("useDebouncedValue", () => {
  it("returns initial value immediately", () => {
    const { result } = renderHook(({ value, delay }) => useDebouncedValue(value, delay), {
      initialProps: { value: "a", delay: 200 },
    });
    expect(result.current).toBe("a");
  });

  it("updates only after the specified delay", () => {
    vi.useFakeTimers();
    try {
      const delay = 200;
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebouncedValue<string>(value, delay),
        { initialProps: { value: "a", delay } }
      );

      expect(result.current).toBe("a");

      // Change value
      rerender({ value: "b", delay });

      // Before delay elapses, debounced value should not update
      act(() => {
        vi.advanceTimersByTime(delay - 10);
      });
      expect(result.current).toBe("a");

      // After full delay, debounced value should update
      act(() => {
        vi.advanceTimersByTime(20); // completes remaining time with buffer
      });
      expect(result.current).toBe("b");
    } finally {
      vi.useRealTimers();
    }
  });

  it("cancels previous timer when value changes rapidly", () => {
    vi.useFakeTimers();
    try {
      const delay = 200;
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebouncedValue<string>(value, delay),
        { initialProps: { value: "a", delay } }
      );

      expect(result.current).toBe("a");

      // First change
      rerender({ value: "b", delay });
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Change again before the first delay completes
      rerender({ value: "c", delay });

      // Just before the second delay completes, value should remain the original
      act(() => {
        vi.advanceTimersByTime(delay - 10);
      });
      expect(result.current).toBe("a");

      // After the full delay since the last change elapses, value updates to the latest
      act(() => {
        vi.advanceTimersByTime(20); // completes remaining time
      });
      expect(result.current).toBe("c");
    } finally {
      vi.useRealTimers();
    }
  });

  it("uses 0ms when delay is non-positive or non-finite (immediate debounce)", () => {
    vi.useFakeTimers();
    try {
      const invalidDelays = [-10, 0, Number.NaN, Number.POSITIVE_INFINITY];

      for (const delay of invalidDelays) {
        const { result, rerender, unmount } = renderHook(
          ({ value, delay }) => useDebouncedValue<string>(value, delay),
          { initialProps: { value: "a", delay } }
        );

        // initial echo
        expect(result.current).toBe("a");

        // change value; since ms resolves to 0, it should flush on next tick
        rerender({ value: "b", delay });

        // before timers flush, still old value
        expect(result.current).toBe("a");

        act(() => {
          vi.runAllTimers();
        });
        expect(result.current).toBe("b");

        unmount();
      }
    } finally {
      vi.useRealTimers();
    }
  });
});
