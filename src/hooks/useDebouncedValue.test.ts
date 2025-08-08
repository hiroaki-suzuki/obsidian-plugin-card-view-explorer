import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useDebouncedValue } from "./useDebouncedValue";

describe("useDebouncedValue", () => {
  it("returns initial value immediately", () => {
    const { result } = renderHook(({ value, delay }) => useDebouncedValue(value, delay), {
      initialProps: { value: "a", delay: 200 },
    });
    expect(result.current).toBe("a");
  });

  it("updates only after the specified delay", async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebouncedValue<string>(value, delay),
      { initialProps: { value: "a", delay: 200 } }
    );

    expect(result.current).toBe("a");

    // Change value
    rerender({ value: "b", delay: 200 });

    // Before delay elapses, debounced value should not update
    await new Promise((r) => setTimeout(r, 150));
    expect(result.current).toBe("a");

    // After full delay, debounced value should update
    await new Promise((r) => setTimeout(r, 60));
    expect(result.current).toBe("b");
  });

  it("cancels previous timer when value changes rapidly", async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebouncedValue<string>(value, delay),
      { initialProps: { value: "a", delay: 200 } }
    );

    expect(result.current).toBe("a");

    // First change
    rerender({ value: "b", delay: 200 });
    await new Promise((r) => setTimeout(r, 100));

    // Change again before the first delay completes
    rerender({ value: "c", delay: 200 });

    // Just before the second delay completes, value should remain the original
    await new Promise((r) => setTimeout(r, 190));
    expect(result.current).toBe("a");

    // After the full delay since the last change elapses, value updates to the latest
    await new Promise((r) => setTimeout(r, 20));
    expect(result.current).toBe("c");
  });
});
