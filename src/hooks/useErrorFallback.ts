import { useCallback, useState } from "react";

/**
 * Custom hook for managing error state in React components.
 * Provides error capture, reset functionality, and derived state.
 */
export const useErrorFallback = () => {
  const [error, setError] = useState<Error | null>(null);

  const resetError = useCallback(() => setError(null), []);
  const captureError = useCallback((newError: Error) => setError(newError), []);

  return {
    error,
    resetError,
    captureError,
    hasError: error !== null,
  };
};
