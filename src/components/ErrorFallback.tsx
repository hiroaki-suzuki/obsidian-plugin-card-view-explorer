import type React from "react";
import { useCallback, useState } from "react";
import { ErrorCategory } from "../utils/errorHandling";

/**
 * Props for ErrorFallback component
 */
interface ErrorFallbackProps {
  /** Error that occurred */
  error: Error;
  /** Function to retry the failed operation */
  onRetry?: () => void;
  /** Custom error message to display */
  message?: string;
  /** Whether to show detailed error information */
  showDetails?: boolean;
  /** Whether to show retry button */
  showRetry?: boolean;
  /** Custom retry button text */
  retryText?: string;
  /** Error category for styling and behavior */
  category?: ErrorCategory;
  /** Additional context information */
  context?: Record<string, any>;
}

/**
 * Comprehensive Error Fallback Component
 *
 * Provides a consistent error display with retry functionality,
 * error reporting, and debugging information.
 */
export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  onRetry,
  message,
  showDetails = true,
  showRetry = true,
  retryText = "Try Again",
  category = ErrorCategory.GENERAL,
  context,
}) => {
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [reportCopied, setReportCopied] = useState(false);

  /**
   * Get appropriate icon for error category
   */
  const getErrorIcon = useCallback(() => {
    switch (category) {
      case ErrorCategory.DATA:
        return "💾";
      case ErrorCategory.API:
        return "🔌";
      case ErrorCategory.UI:
        return "🖥️";
      default:
        return "⚠️";
    }
  }, [category]);

  /**
   * Get CSS class for error category
   */
  const getCategoryClass = useCallback(() => {
    return `error-${category}`;
  }, [category]);

  /**
   * Copy error report to clipboard
   */
  const copyErrorReport = useCallback(async () => {
    const report = {
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      context,
      category,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      setReportCopied(true);
      setTimeout(() => setReportCopied(false), 3000);
    } catch (clipboardError) {
      console.error("Failed to copy error report:", clipboardError);
      // Fallback: log the report to console
      console.log("Error Report:", report);
    }
  }, [error, context, category]);

  /**
   * Get user-friendly error message
   */
  const getDisplayMessage = useCallback(() => {
    if (message) return message;

    // Provide category-specific default messages
    switch (category) {
      case ErrorCategory.DATA:
        return "Data processing failed. Your information may be temporarily unavailable.";
      case ErrorCategory.API:
        return "Failed to communicate with Obsidian. Please try refreshing.";
      case ErrorCategory.UI:
        return "Interface error occurred. Please try refreshing the view.";
      default:
        return error.message || "An unexpected error occurred.";
    }
  }, [message, category, error.message]);

  return (
    <div className={`error-fallback ${getCategoryClass()}`}>
      <div className="error-content">
        {/* Error Icon and Title */}
        <div className="error-header">
          <div className="error-icon">{getErrorIcon()}</div>
          <h3 className="error-title">Something went wrong</h3>
        </div>

        {/* Error Message */}
        <div className="error-message">
          <p>{getDisplayMessage()}</p>
        </div>

        {/* Error Actions */}
        <div className="error-actions">
          {showRetry && onRetry && (
            <button
              type="button"
              className="error-action-button error-retry-button"
              onClick={onRetry}
            >
              {retryText}
            </button>
          )}

          <button
            type="button"
            className="error-action-button error-report-button"
            onClick={copyErrorReport}
            disabled={reportCopied}
          >
            {reportCopied ? "✓ Copied" : "Copy Error Report"}
          </button>

          {showDetails && (
            <button
              type="button"
              className="error-action-button error-details-button"
              onClick={() => setShowDebugInfo(!showDebugInfo)}
            >
              {showDebugInfo ? "Hide Details" : "Show Details"}
            </button>
          )}
        </div>

        {/* Detailed Error Information */}
        {showDetails && showDebugInfo && (
          <div className="error-details">
            <div className="error-info-section">
              <h4>Error Information</h4>
              <div className="error-info-grid">
                <div className="error-info-item">
                  <strong>Type:</strong> {error.name}
                </div>
                <div className="error-info-item">
                  <strong>Category:</strong> {category}
                </div>
                <div className="error-info-item">
                  <strong>Time:</strong> {new Date().toLocaleString()}
                </div>
              </div>
            </div>

            {context && Object.keys(context).length > 0 && (
              <div className="error-info-section">
                <h4>Context</h4>
                <pre className="error-context">{JSON.stringify(context, null, 2)}</pre>
              </div>
            )}

            <div className="error-info-section">
              <h4>Stack Trace</h4>
              <pre className="error-stack">{error.stack || "No stack trace available"}</pre>
            </div>
          </div>
        )}

        {/* Recovery Suggestions */}
        <div className="error-suggestions">
          <h4>Suggested Actions:</h4>
          <ul>
            {category === ErrorCategory.DATA && (
              <>
                <li>Try refreshing your notes</li>
                <li>Check if your vault files are accessible</li>
                <li>Consider restarting the plugin</li>
              </>
            )}
            {category === ErrorCategory.API && (
              <>
                <li>Try refreshing the Card Explorer view</li>
                <li>Restart Obsidian if the problem persists</li>
                <li>Check if other plugins are interfering</li>
              </>
            )}
            {(category === ErrorCategory.GENERAL || category === ErrorCategory.UI) && (
              <>
                <li>Try refreshing the view</li>
                <li>Restart the plugin if the problem persists</li>
                <li>Report the issue if it continues</li>
              </>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

/**
 * Simple Error Fallback for minimal error display
 */
export const SimpleErrorFallback: React.FC<{
  error: Error;
  onRetry?: () => void;
  message?: string;
}> = ({ error, onRetry, message }) => (
  <div className="simple-error-fallback">
    <div className="error-content">
      <div className="error-icon">⚠️</div>
      <p>{message || error.message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="retry-button">
          Try Again
        </button>
      )}
    </div>
  </div>
);

/**
 * Hook for using error fallback in components
 */
export const useErrorFallback = () => {
  const [error, setError] = useState<Error | null>(null);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  const captureError = useCallback((error: Error) => {
    setError(error);
  }, []);

  return {
    error,
    resetError,
    captureError,
    hasError: error !== null,
  };
};
