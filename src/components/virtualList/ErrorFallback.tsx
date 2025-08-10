import type React from "react";
import { useCallback, useEffect } from "react";
import { ErrorCategory, handleError } from "../../core/errors/errorHandling";

// Configuration for error messages and suggestions by category
/**
 * Immutable mapping of {@link ErrorCategory} to user-facing copy.
 *
 * Design notes:
 * - Centralizes messages so UI copy stays consistent across the app and is easy to localize later.
 * - Keeps presentation concerns (human-friendly message/suggestion) separate from error objects.
 */
const ERROR_CONFIG = {
  [ErrorCategory.DATA]: {
    message: "Failed to load note data. Your information may be temporarily unavailable.",
    suggestion: "Try refreshing your notes or restart the plugin.",
  },
  [ErrorCategory.API]: {
    message: "Failed to communicate with Obsidian. Please try refreshing.",
    suggestion: "Try refreshing the view or restart Obsidian.",
  },
  [ErrorCategory.UI]: {
    message: "Interface error occurred. Please try refreshing the view.",
    suggestion: "Try refreshing the view or restart the plugin.",
  },
  [ErrorCategory.GENERAL]: {
    message: "An unexpected error occurred.",
    suggestion: "Try refreshing the view or restart the plugin.",
  },
} as const;

/**
 * Props for {@link ErrorFallback}.
 *
 * The component shows a safe, user-friendly error message and (optionally) a retry action
 * while the raw error details are reported via {@link handleError} for diagnostics.
 */
interface ErrorFallbackProps {
  /** The error instance that triggered the fallback UI. */
  error: Error;
  /**
   * Optional retry handler. When provided and {@link showRetry} is true, a button is shown.
   * Keep the handler idempotent and fast; it should be safe to invoke multiple times.
   */
  onRetry?: () => void;
  /** Optional message override; when provided it replaces the category default. */
  message?: string;
  /** Controls whether the retry button is rendered (only if {@link onRetry} exists). Defaults to true. */
  showRetry?: boolean;
  /** Label for the retry button. Defaults to "Try Again". */
  retryText?: string;
  /**
   * Error category to tailor the message/suggestion and to classify telemetry.
   * Defaults to {@link ErrorCategory.GENERAL}.
   */
  category?: ErrorCategory;
  /**
   * Additional structured context included in error reporting (non-sensitive metadata only).
   * Example: { view: 'card', operation: 'loadNotes' }
   */
  context?: Record<string, any>;
}

/**
 * Presentational error boundary fallback for Card View Explorer.
 *
 * Responsibilities:
 * - Renders a human-friendly error state based on an {@link ErrorCategory}.
 * - Reports the underlying error once via {@link handleError} with optional context for diagnostics.
 * - Optionally exposes a retry affordance supplied by the parent.
 *
 * Design rationale:
 * - Keep user-facing messages decoupled from error objects to avoid leaking technical details.
 * - Log in a side-effect (useEffect) so render remains pure and error reporting integrates with app telemetry.
 * - Configuration-driven copy (see ERROR_CONFIG) simplifies future localization and consistency.
 *
 * @public
 */
export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  onRetry,
  message,
  showRetry = true,
  retryText = "Try Again",
  category = ErrorCategory.GENERAL,
  context,
}) => {
  // Report the error as a side-effect to avoid coupling render with I/O.
  // Note: including `context` in the dependency array means new object identities will trigger re-reporting.
  // If the parent constructs `context` inline and it changes each render, consider memoizing at the call site.
  useEffect(() => {
    handleError(error, category, {
      ...context,
      component: "ErrorFallback",
      timestamp: new Date().toISOString(),
    });
  }, [error, category, context]);

  const displayMessage = message || ERROR_CONFIG[category].message;
  const suggestionText = ERROR_CONFIG[category].suggestion;

  const handleRetry = useCallback(() => {
    if (onRetry) {
      onRetry();
    }
  }, [onRetry]);

  return (
    <div className="virtual-list-container">
      <div className={`error-fallback error-${category}`}>
        <div className="error-content">
          <div className="error-header">
            <h3 className="error-title">Something went wrong</h3>
          </div>

          <div className="error-message">
            <p>{displayMessage}</p>
          </div>

          {showRetry && onRetry && (
            <div className="error-actions">
              <button
                type="button"
                className="error-action-button error-retry-button"
                onClick={handleRetry}
              >
                {retryText}
              </button>
            </div>
          )}

          <div className="error-suggestions">
            <p className="suggestion-text">{suggestionText}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
