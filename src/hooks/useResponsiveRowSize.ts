import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Compute a responsive "row size" (columns per row) from a container's width.
 *
 * Design rationale:
 * - Exposes a callback `ref` rather than taking a `RefObject`. This ensures the hook
 *   reacts to element replacement (conditional rendering, key changes) and always
 *   detaches the previous observer before attaching a new one.
 * - Uses `ResizeObserver` when available to update the row size on container resizes.
 *   When unavailable, it still performs an initial synchronous measurement so the
 *   first render is reasonable, but it will not update on subsequent resizes.
 * - The width→columns calculation (including clamping) is delegated to `getRowSize`
 *   to keep this hook focused on measurement/observation concerns.
 *
 * SSR/test notes:
 * - The hook only touches the DOM inside the ref callback, making it safe to import
 *   in non-DOM environments. Attaching the returned ref should happen in the browser.
 *
 * @returns Object with the current `rowSize` and a callback `ref` to attach to the
 * container element whose width should be observed.
 */
export const useResponsiveRowSize = (): {
  rowSize: number;
  ref: (node: HTMLElement | null) => void;
} => {
  const [rowSize, setRowSize] = useState<number>(1);
  const observerRef = useRef<ResizeObserver | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);

  const ref = useCallback((node: HTMLElement | null) => {
    // Disconnect any prior observer when the node changes or on unmount to
    // prevent leaks and avoid observing stale elements after re-mounts.
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    elementRef.current = null;

    if (!node) return;

    elementRef.current = node;

    // Initial synchronous measurement to minimize visual flicker from a default value.
    const width = node.getBoundingClientRect().width; // border-box
    setRowSize((prev) => {
      const next = getRowSize(width);
      return next === prev ? prev : next;
    });

    // Attach ResizeObserver if available. Throttling is intentionally omitted here:
    // `getRowSize` is cheap and ResizeObserver batches notifications.
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setRowSize((prev) => {
            const next = getRowSize(entry.contentRect.width);
            return next === prev ? prev : next;
          });
        }
      });
      observerRef.current = ro;
      ro.observe(node);
    }
  }, []);

  // Ensure observer is disconnected when the component using this hook unmounts.
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      elementRef.current = null;
    };
  }, []);

  return { rowSize, ref };
};

const getRowSize = (width: number, cardMinWidth = 292, maxPerRow = 5): number => {
  if (width <= 0) return 1;
  const maxCards = Math.floor(width / cardMinWidth);
  return Math.max(1, Math.min(maxCards, maxPerRow));
};
