import { AlertTriangle } from "lucide-react";
import type React from "react";
import { useCallback } from "react";

/**
 * Props for the ErrorDisplay component.
 * Defines the interface for error presentation and user interaction options.
 */
interface ErrorDisplayProps {
  /** Error message to display */
  error: string;
  /** Callback function triggered when user clicks the retry button */
  onRetry: () => void;
  /** Callback function triggered when user clicks the dismiss button */
  onDismiss: () => void;
  /** Whether retry action is in progress. Controls button disabled state and text */
  isRetrying?: boolean;
}

/**
 * ErrorDisplay Component
 *
 * Displays global error states with retry and dismiss actions.
 * Used for non-React errors that occur during data loading or API operations.
 *
 * This component is designed to be used in two scenarios:
 * 1. As a fallback UI for React error boundaries
 * 2. For displaying API/data loading errors outside the React component tree
 *
 * @example
 * // Basic usage
 * <ErrorDisplay
 *   error="Failed to load notes from vault"
 *   onRetry={() => loadNotes()}
 *   onDismiss={() => setError(null)}
 * />
 *
 * @example
 * // With custom title and retry state
 * <ErrorDisplay
 *   error={errorMessage}
 *   title="Connection Error"
 *   isRetrying={isLoading}
 *   onRetry={handleRetry}
 *   onDismiss={handleDismiss}
 * />
 */
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
  isRetrying = false,
}) => {
  const handleRetry = useCallback(() => {
    onRetry();
  }, [onRetry]);

  const handleDismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  return (
    <div className="card-view-container">
      <div className="card-view-error">
        <div className="error-content">
          <div className="error-icon" aria-hidden="true">
            <AlertTriangle size={24} />
          </div>
          {/* Error title */}
          <h3>Error Loading Card View Explorer</h3>
          {/* Error message text */}
          <p>{error}</p>
          {/* Action buttons for user interaction */}
          <div className="error-actions">
            <button
              type="button"
              className="error-retry-button"
              onClick={handleRetry}
              disabled={isRetrying}
              aria-busy={isRetrying}
            >
              {isRetrying ? "Retrying..." : "Retry"}
            </button>
            <button
              type="button"
              className="error-clear-button"
              onClick={handleDismiss}
              disabled={isRetrying}
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
