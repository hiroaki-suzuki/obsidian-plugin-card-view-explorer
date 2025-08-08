import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useErrorFallback } from "./useErrorFallback";

describe("useErrorFallback", () => {
  it("should initialize with no error", () => {
    const { result } = renderHook(() => useErrorFallback());

    expect(result.current.error).toBeNull();
    expect(result.current.hasError).toBe(false);
  });

  it("should capture and store error", () => {
    const { result } = renderHook(() => useErrorFallback());
    const testError = new Error("Test error");

    act(() => {
      result.current.captureError(testError);
    });

    expect(result.current.error).toBe(testError);
    expect(result.current.hasError).toBe(true);
  });

  it("should reset error state", () => {
    const { result } = renderHook(() => useErrorFallback());
    const testError = new Error("Test error");

    // First capture an error
    act(() => {
      result.current.captureError(testError);
    });

    expect(result.current.hasError).toBe(true);

    // Then reset it
    act(() => {
      result.current.resetError();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.hasError).toBe(false);
  });

  it("should update error when captureError is called multiple times", () => {
    const { result } = renderHook(() => useErrorFallback());
    const firstError = new Error("First error");
    const secondError = new Error("Second error");

    // Capture first error
    act(() => {
      result.current.captureError(firstError);
    });

    expect(result.current.error).toBe(firstError);

    // Capture second error (should replace first)
    act(() => {
      result.current.captureError(secondError);
    });

    expect(result.current.error).toBe(secondError);
    expect(result.current.error?.message).toBe("Second error");
  });

  it("should maintain stable function references", () => {
    const { result, rerender } = renderHook(() => useErrorFallback());

    const initialResetError = result.current.resetError;
    const initialCaptureError = result.current.captureError;

    rerender();

    expect(result.current.resetError).toBe(initialResetError);
    expect(result.current.captureError).toBe(initialCaptureError);
  });
});
