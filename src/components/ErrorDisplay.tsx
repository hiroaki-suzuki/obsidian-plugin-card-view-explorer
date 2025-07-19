import { setIcon } from "obsidian";
import type React from "react";
import { useEffect, useRef } from "react";

/**
 * Props for the ErrorDisplay component.
 * Defines the interface for error presentation and user interaction options.
 */
interface ErrorDisplayProps {
  /** Error message to display */
  error: string;
  /** Callback for retry action */
  onRetry: () => void;
  /** Callback for dismiss action */
  onDismiss: () => void;
  /** Optional title for the error display */
  title?: string;
  /** Whether retry action is in progress */
  isRetrying?: boolean;
}

/**
 * ErrorDisplay Component
 *
 * Displays global error states with retry and dismiss actions.
 * Used for non-React errors that occur during data loading or API operations.
 * Features:
 * - User-friendly error presentation
 * - Retry and dismiss action buttons
 * - Customizable title and loading states
 * - Consistent error UI styling
 */
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
  title = "Error Loading Card Explorer",
  isRetrying = false,
}) => {
  const iconRef = useRef<HTMLDivElement>(null);

  // Use Obsidian's native icon system for consistent visual design
  // setIcon provides proper theming support and accessibility
  useEffect(() => {
    if (iconRef.current) {
      setIcon(iconRef.current, "alert-triangle");
    }
  }, []);

  return (
    <div className="card-view-container">
      <div className="card-view-error">
        <div className="error-content">
          <div className="error-icon" ref={iconRef}></div>
          <h3>{title}</h3>
          <p>{error}</p>
          <div className="error-actions">
            <button
              type="button"
              className="error-retry-button"
              onClick={onRetry}
              disabled={isRetrying}
            >
              {isRetrying ? "Retrying..." : "Retry"}
            </button>
            <button
              type="button"
              className="error-clear-button"
              onClick={onDismiss}
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
