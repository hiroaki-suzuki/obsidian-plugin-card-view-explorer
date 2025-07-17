/**
 * Debounce utility for limiting function execution frequency
 *
 * This utility helps prevent excessive API calls when multiple events
 * fire in quick succession (e.g., multiple file changes).
 */

/**
 * Creates a debounced version of a function that delays execution
 * until after the specified delay has passed since the last invocation.
 *
 * @param func - The function to debounce
 * @param delay - The delay in milliseconds
 * @returns A debounced version of the function
 */
export /**
 * Debounce utility function
 *
 * Creates a debounced version of a function that delays execution until after
 * the specified delay has elapsed since the last time it was invoked.
 * Useful for limiting the rate of function calls, especially for expensive
 * operations like API calls or DOM updates.
 *
 * @template T - The type of the function to debounce
 * @param func - The function to debounce
 * @param delay - The delay in milliseconds to wait before executing
 * @returns A debounced version of the input function
 *
 * @example
 * ```typescript
 * const debouncedSearch = debounce((query: string) => {
 *   performSearch(query);
 * }, 300);
 *
 * // Will only execute once after 300ms of no calls
 * debouncedSearch("hello");
 * debouncedSearch("hello world"); // Cancels previous call
 * ```
 */
function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    // Clear existing timeout if it exists
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    // Set new timeout
    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Creates a debounced async function that ensures only the latest
 * invocation is executed, canceling previous pending executions.
 *
 * @param func - The async function to debounce
 * @param delay - The delay in milliseconds
 * @returns A debounced version of the async function
 */
export function debounceAsync<T extends (...args: any[]) => Promise<any>>(
  func: T,
  delay: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeoutId: NodeJS.Timeout | null = null;
  let latestResolve: ((value: ReturnType<T>) => void) | null = null;
  let latestReject: ((reason: any) => void) | null = null;

  return (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return new Promise<ReturnType<T>>((resolve, reject) => {
      // Clear existing timeout if it exists
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        // Reject the previous promise since it's being canceled
        if (latestReject) {
          latestReject(new Error("Debounced function call canceled"));
        }
      }

      // Store the latest resolve/reject functions
      latestResolve = resolve;
      latestReject = reject;

      // Set new timeout
      timeoutId = setTimeout(async () => {
        try {
          const result = await func(...args);
          if (latestResolve) {
            latestResolve(result);
          }
        } catch (error) {
          if (latestReject) {
            latestReject(error);
          }
        } finally {
          timeoutId = null;
          latestResolve = null;
          latestReject = null;
        }
      }, delay);
    });
  };
}

/**
 * Default debounce delay for note refresh operations (in milliseconds)
 * This prevents excessive refreshes when multiple files change rapidly
 */
export const DEFAULT_REFRESH_DEBOUNCE_DELAY = 300;
