import { useEffect, useState } from "react";

/**
 * React hook that returns a debounced version of the given value.
 *
 * The returned value updates only after the input `value` has remained
 * unchanged for the specified `delay` in milliseconds.
 *
 * Design rationale:
 * - Uses a timeout + effect cleanup to cancel in-flight updates when `value`
 *   or `delay` changes, preventing stale updates and race conditions.
 * - Includes `delay` in the dependency list so changing the debounce interval
 *   immediately resets the pending timer and takes effect.
 *
 * Caveats:
 * - The initial returned value equals the initial `value` (no leading delay).
 * - This is debounce-only (trailing). If you need leading-edge or throttling
 *   behavior, prefer a dedicated hook.
 *
 * @typeParam T - Value type to debounce.
 * @param value - The input value to debounce.
 * @param delay - Debounce duration in milliseconds.
 * @returns The debounced value that lags behind `value` by `delay` ms.
 */
export const useDebouncedValue = <T>(value: T, delay: number): T => {
  // Keep debounced value in state; initialize to the current value to avoid
  // an extra undefined/empty render and to satisfy tests expecting immediate echo.
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    // Schedule an update to the debounced value; if `value` or `delay` changes
    // before the timer fires, cleanup will cancel this timer to avoid stale updates.
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
};
