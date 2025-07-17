import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_REFRESH_DEBOUNCE_DELAY, debounce, debounceAsync } from "./debounce";

describe("debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should delay function execution", () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn("test");
    expect(mockFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(mockFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(mockFn).toHaveBeenCalledWith("test");
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it("should cancel previous calls when called multiple times", () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn("first");
    vi.advanceTimersByTime(50);

    debouncedFn("second");
    vi.advanceTimersByTime(50);
    expect(mockFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(50);
    expect(mockFn).toHaveBeenCalledWith("second");
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it("should handle multiple arguments", () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn("arg1", "arg2", "arg3");
    vi.advanceTimersByTime(100);

    expect(mockFn).toHaveBeenCalledWith("arg1", "arg2", "arg3");
  });

  it("should work with no arguments", () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn();
    vi.advanceTimersByTime(100);

    expect(mockFn).toHaveBeenCalledWith();
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});

describe("debounceAsync", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should delay async function execution", async () => {
    const mockAsyncFn = vi.fn().mockResolvedValue("result");
    const debouncedFn = debounceAsync(mockAsyncFn, 100);

    const promise = debouncedFn("test");
    expect(mockAsyncFn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    const result = await promise;

    expect(mockAsyncFn).toHaveBeenCalledWith("test");
    expect(result).toBe("result");
  });

  it("should cancel previous calls and reject their promises", async () => {
    const mockAsyncFn = vi.fn().mockResolvedValue("result");
    const debouncedFn = debounceAsync(mockAsyncFn, 100);

    const firstPromise = debouncedFn("first");
    vi.advanceTimersByTime(50);

    const secondPromise = debouncedFn("second");

    // First promise should be rejected
    await expect(firstPromise).rejects.toThrow("Debounced function call canceled");

    vi.advanceTimersByTime(100);
    const result = await secondPromise;

    expect(mockAsyncFn).toHaveBeenCalledWith("second");
    expect(mockAsyncFn).toHaveBeenCalledTimes(1);
    expect(result).toBe("result");
  });

  it("should handle async function errors", async () => {
    const error = new Error("Test error");
    const mockAsyncFn = vi.fn().mockRejectedValue(error);
    const debouncedFn = debounceAsync(mockAsyncFn, 100);

    const promise = debouncedFn("test");
    vi.advanceTimersByTime(100);

    await expect(promise).rejects.toThrow("Test error");
    expect(mockAsyncFn).toHaveBeenCalledWith("test");
  });

  it("should handle multiple arguments in async function", async () => {
    const mockAsyncFn = vi.fn().mockResolvedValue("result");
    const debouncedFn = debounceAsync(mockAsyncFn, 100);

    const promise = debouncedFn("arg1", "arg2", "arg3");
    vi.advanceTimersByTime(100);
    await promise;

    expect(mockAsyncFn).toHaveBeenCalledWith("arg1", "arg2", "arg3");
  });
});

describe("DEFAULT_REFRESH_DEBOUNCE_DELAY", () => {
  it("should have a reasonable default value", () => {
    expect(DEFAULT_REFRESH_DEBOUNCE_DELAY).toBe(300);
    expect(typeof DEFAULT_REFRESH_DEBOUNCE_DELAY).toBe("number");
    expect(DEFAULT_REFRESH_DEBOUNCE_DELAY).toBeGreaterThan(0);
  });
});
