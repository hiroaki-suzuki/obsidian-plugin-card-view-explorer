import { useEffect, useRef } from "react";
import type { VirtuosoHandle } from "react-virtuoso";

/**
 * Scrolls a react-virtuoso list back to the top when a sentinel value changes.
 *
 * Design rationale:
 * - Reference-change trigger: The hook compares the previous `value` reference with the
 *   current one to decide whether to scroll. This is intentional to avoid expensive deep
 *   comparisons while still catching meaningful data set swaps (e.g., filter changes).
 * - Deferred re-application: The scroll command is issued immediately and then re-issued
 *   several times on short timeouts. Virtualized lists (react-virtuoso) often perform
 *   asynchronous measurements and range recalculations; initial scroll commands can be
 *   ignored or overridden by those internal adjustments or by external layout shifts
 *   (e.g., Obsidian workspace resize, CSS transitions, image/font loads). Re-applying the
 *   command across a short window increases the chance the final layout “sticks” at index 0.
 * - Ready gate: The `ready` flag prevents premature scrolling during initialization when
 *   the list or its container isn’t yet mounted/resolved.
 *
 * External dependency notes:
 * - `react-virtuoso` exposes an imperative handle whose `scrollToIndex` can be sensitive to
 *   timing around internal re-layout. The staggered timeouts (100–500ms) are a pragmatic
 *   workaround observed to be reliable across environments.
 *
 * @typeParam T - Arbitrary value type whose reference change indicates “reset to top”.
 * @param virtuosoRef - Ref to the Virtuoso handle used to perform the scroll.
 * @param value - Sentinel value; when its reference changes and `ready` is true, scroll to top.
 * @param ready - Whether the consumer deems the list fully ready for scrolling.
 * @returns void
 */
export const useScrollToTopOnChange = <T>(
  virtuosoRef: React.RefObject<VirtuosoHandle | null>,
  value: T,
  ready: boolean
): void => {
  const prevRef = useRef<T | null>(null);

  useEffect(() => {
    if (!ready) {
      prevRef.current = value;
      return;
    }

    // Reference equality check by design: we only care about high-level swaps
    // (e.g., new dataset after filters change), not granular mutations.
    const hasChanged = prevRef.current !== value;
    if (!hasChanged) return;

    prevRef.current = value;

    if (!virtuosoRef.current) return;

    virtuosoRef.current.scrollToIndex({ index: 0, behavior: "auto" });

    const timeouts: Array<ReturnType<typeof setTimeout>> = [];
    // Re-issue the scroll a few times to survive react-virtuoso re-measurements,
    // browser scroll restoration, and Obsidian layout shifts. These delays are
    // short enough to be imperceptible but broad enough to cover common races.
    [100, 200, 300, 500].forEach((delay) => {
      const id = setTimeout(() => {
        if (virtuosoRef.current) {
          virtuosoRef.current.scrollToIndex({ index: 0, behavior: "auto" });
        }
      }, delay);
      timeouts.push(id);
    });

    return () => {
      // Ensure no stray timers survive unmount or re-run to avoid redundant work
      // or acting on a stale/changed ref.
      timeouts.forEach(clearTimeout);
    };
  }, [value, ready, virtuosoRef]);
};
