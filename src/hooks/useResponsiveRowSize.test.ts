import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useResponsiveRowSize } from "./useResponsiveRowSize";

describe("useResponsiveRowSize", () => {
  const originalResizeObserver = globalThis.ResizeObserver;

  // Domain constants mirrored from implementation for clarity of expectations
  const CARD_MIN_WIDTH = 292;
  const MAX_PER_ROW = 5;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    // Restore any mocked ResizeObserver after each test
    globalThis.ResizeObserver = originalResizeObserver as any;
  });

  const createElWithWidth = (width: number) => {
    const el = document.createElement("div");
    // jsdom returns 0 for getBoundingClientRect by default; mock it per element
    Object.defineProperty(el, "getBoundingClientRect", {
      value: () => ({ width }) as DOMRect,
      configurable: true,
    });
    return el as HTMLElement;
  };

  /**
   * Test helper to mock ResizeObserver with instance tracking and manual trigger.
   */
  const withMockResizeObserver = () => {
    const instances: any[] = [];
    class MockResizeObserver {
      cb: ResizeObserverCallback;
      // capture last observed element (helps when generating realistic entries)
      private _target?: Element;
      observe = vi.fn((el: Element) => {
        this._target = el;
      });
      unobserve = vi.fn((_el: Element) => {});
      disconnect = vi.fn(() => {});
      constructor(cb: ResizeObserverCallback) {
        this.cb = cb;
        instances.push(this);
      }
      trigger(width: number) {
        this.cb(
          [
            {
              target: this._target,
              // minimal shape used by the hook; include width explicitly
              contentRect: { width },
            } as unknown as ResizeObserverEntry,
          ],
          this as unknown as ResizeObserver
        );
      }
    }
    globalThis.ResizeObserver = MockResizeObserver;
    return { instances, MockResizeObserver };
  };

  it("returns early when node is null (no observer, rowSize unchanged)", () => {
    const { instances } = withMockResizeObserver();

    const { result } = renderHook(() => useResponsiveRowSize());
    expect(result.current.rowSize).toBe(1);

    act(() => {
      result.current.ref(null);
    });

    expect(result.current.rowSize).toBe(1);
    expect(instances.length).toBe(0);
  });

  it("handles null node by disconnecting and keeping last rowSize", () => {
    const { instances } = withMockResizeObserver();

    const { result } = renderHook(() => useResponsiveRowSize());
    const el = createElWithWidth(900); // -> 3

    act(() => {
      result.current.ref(el);
    });
    expect(result.current.rowSize).toBe(3);
    const ro = instances[0] as ResizeObserver;
    expect(ro).toBeDefined();

    act(() => {
      result.current.ref(null);
    });

    // should have disconnected the previous observer and not change rowSize
    expect((ro as any).disconnect).toHaveBeenCalledTimes(1);
    expect(result.current.rowSize).toBe(3);
    // should not create a new observer instance when passing null
    expect(instances.length).toBe(1);
  });

  it("computes rowSize from initial element width without ResizeObserver", () => {
    // Simulate environment without ResizeObserver
    // @ts-expect-error force undefined for this test
    globalThis.ResizeObserver = undefined;

    const { result } = renderHook(() => useResponsiveRowSize());
    expect(result.current.rowSize).toBe(1); // default before ref attachment

    const el = createElWithWidth(600); // floor(600/CARD_MIN_WIDTH) = 2
    act(() => {
      result.current.ref(el);
    });
    expect(result.current.rowSize).toBe(2);

    // Changing window size should not affect rowSize without ResizeObserver
    window.dispatchEvent(new Event("resize"));
    expect(result.current.rowSize).toBe(2);
  });

  it("updates rowSize on ResizeObserver notifications", () => {
    const { instances, MockResizeObserver } = withMockResizeObserver();

    const { result } = renderHook(() => useResponsiveRowSize());
    const el = createElWithWidth(600); // -> 2

    act(() => {
      result.current.ref(el);
    });
    expect(result.current.rowSize).toBe(2);

    const ro = instances[0] as InstanceType<typeof MockResizeObserver>;
    expect(ro).toBeDefined();
    expect(ro.observe).toHaveBeenCalledTimes(1);

    // Grow width to ~900 -> 3
    act(() => {
      ro.trigger(900);
    });
    expect(result.current.rowSize).toBe(3);

    // Large width should clamp to maxPerRow (5)
    act(() => {
      ro.trigger(2000); // floor(2000/CARD_MIN_WIDTH) ~= 6, clamped to MAX_PER_ROW
    });
    expect(result.current.rowSize).toBe(5);

    // Very small width clamps to 1
    act(() => {
      ro.trigger(50);
    });
    expect(result.current.rowSize).toBe(1);
  });

  it("disconnects previous observer when ref changes", () => {
    const { instances } = withMockResizeObserver();

    const { result } = renderHook(() => useResponsiveRowSize());

    const el1 = createElWithWidth(600); // -> 2
    const el2 = createElWithWidth(1200); // -> 4

    act(() => {
      result.current.ref(el1);
    });
    const firstRO = instances[0] as InstanceType<typeof ResizeObserver>;
    expect(result.current.rowSize).toBe(2);

    // Attach to a different element; should disconnect previous observer and re-measure
    act(() => {
      result.current.ref(el2);
    });

    expect(firstRO.disconnect).toHaveBeenCalledTimes(1);
    expect(result.current.rowSize).toBe(4);
  });

  it("disconnects observer on unmount", () => {
    const { instances } = withMockResizeObserver();
    const { result, unmount } = renderHook(() => useResponsiveRowSize());
    const el = createElWithWidth(600);
    act(() => {
      result.current.ref(el);
    });
    const ro = instances[0] as InstanceType<typeof ResizeObserver>;
    expect(ro).toBeDefined();
    unmount();
    expect((ro as any).disconnect).toHaveBeenCalledTimes(1);
  });

  describe("width to rowSize mapping (no ResizeObserver)", () => {
    it.each([
      { width: 50, expected: 1, case: "tiny width clamps to 1" },
      { width: CARD_MIN_WIDTH - 1, expected: 1, case: "below 1 card still 1" },
      { width: CARD_MIN_WIDTH * 2, expected: 2, case: "exact 2 cards" },
      { width: CARD_MIN_WIDTH * 3 + 10, expected: 3, case: "rounds down to 3" },
      {
        width: CARD_MIN_WIDTH * (MAX_PER_ROW + 2),
        expected: MAX_PER_ROW,
        case: "clamps to MAX_PER_ROW",
      },
      { width: 0, expected: 1, case: "zero width returns 1" },
      { width: -100, expected: 1, case: "negative width returns 1" },
    ])("$case (width=$width)", ({ width, expected }) => {
      // @ts-expect-error force undefined ResizeObserver
      globalThis.ResizeObserver = undefined;

      const { result } = renderHook(() => useResponsiveRowSize());
      const el = createElWithWidth(width as number);
      act(() => {
        result.current.ref(el);
      });
      expect(result.current.rowSize).toBe(expected);
    });
  });
});
