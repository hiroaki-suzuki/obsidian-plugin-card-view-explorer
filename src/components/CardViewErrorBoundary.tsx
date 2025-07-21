import React from "react";

/**
 * Maximum number of retry attempts before showing permanent error state.
 * After this many retries, the user will be prompted to restart the plugin.
 */
const MAX_RETRIES = 3;

/**
 * Props for the CardViewErrorBoundary component.
 * @interface ErrorBoundaryProps
 */
interface ErrorBoundaryProps {
  /** Child components to be wrapped by the error boundary */
  children: React.ReactNode;
  /**
   * Optional callback function called when an error is caught.
   * Useful for reporting errors to a monitoring service or parent component.
   */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * Internal state for the error boundary component.
 * @interface ErrorBoundaryState
 */
interface ErrorBoundaryState {
  /** Whether an error has been caught */
  hasError: boolean;
  /** The caught error object, if any */
  error: Error | null;
  /**
   * Unique identifier for the error instance.
   * Used to distinguish between different error occurrences.
   */
  errorId: string | null;
  /** Number of retry attempts made for the current error */
  retryCount: number;
}

/**
 * Error Boundary Component for React Error Handling
 *
 * A React error boundary that catches JavaScript errors anywhere in the child component tree,
 * logs those errors with detailed information, and displays a fallback UI instead of crashing.
 *
 * Features:
 * - Automatic retry mechanism with configurable maximum attempts
 * - Detailed error logging with component stack traces
 * - Integration with plugin's error handling utilities
 * - User-friendly error UI with actionable options
 *
 * This component follows the React Error Boundary pattern and is specifically designed
 * for the Card View Explorer plugin's needs, including plugin restart functionality.
 */
export class CardViewErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
      retryCount: 0,
    };
  }

  /**
   * React lifecycle method called when an error is thrown during rendering.
   * Updates component state to trigger fallback UI rendering.
   *
   * @param error - The error that was thrown
   * @returns Updated state object to trigger error UI
   */
  static getDerivedStateFromError(error: Error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  /**
   * React lifecycle method called after an error has been thrown by a descendant component.
   * Handles error logging, reporting, and integration with plugin error handling utilities.
   *
   * @param error - The error that was thrown
   * @param errorInfo - Additional information about the error including component stack
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log detailed error information for debugging (console only)
    console.group("🛑 CardViewErrorBoundary - Error Details");
    console.error("Error:", error);
    console.error("Error Info:", errorInfo);
    console.error("Component Stack:", errorInfo.componentStack);
    console.error("Retry Count:", this.state.retryCount);
    console.error("Timestamp:", new Date().toISOString());
    console.groupEnd();

    // Import error handling utilities for internal processing
    // Dynamic import prevents circular dependencies and ensures error handling
    // utilities are available even if there are issues with static imports
    import("../utils/errorHandling")
      .then(({ handleError, ErrorCategory }) => {
        handleError(error, ErrorCategory.UI, {
          componentStack: errorInfo.componentStack || "No component stack available",
          errorBoundary: "CardViewErrorBoundary",
          retryCount: this.state.retryCount,
        });
      })
      .catch((importError) => {
        console.error("Failed to import error handling utilities:", importError);
      });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  /**
   * Renders either the error UI when an error is caught or the children components when no error exists.
   * The error UI includes retry functionality and helpful information for users.
   *
   * @returns React elements representing either the error UI or the wrapped children
   */
  render() {
    if (this.state.hasError && this.state.error) {
      // Simple user-friendly error UI
      // Check if retry is still possible based on current retry count
      const canRetry = this.state.retryCount < MAX_RETRIES;

      return (
        <div className="card-view-error-boundary">
          <div className="error-content">
            <div className="error-icon">⚠️</div>
            <h3>Loading Error</h3>
            <p>An error occurred while loading Card View Explorer.</p>

            {/* Display retry counter information when retries have been attempted */}
            {this.state.retryCount > 0 && (
              <p className="retry-info">
                Retrying... ({this.state.retryCount}/{MAX_RETRIES})
              </p>
            )}

            <div className="error-actions">
              {/*
                Conditional rendering based on retry count:
                - Show "Retry" button if under MAX_RETRIES
                - Show "Restart Plugin" button if max retries reached
              */}
              {canRetry ? (
                <button
                  type="button"
                  className="error-retry-button"
                  onClick={this.handleRetry}
                  aria-label="Retry loading"
                >
                  Retry
                </button>
              ) : (
                <button
                  type="button"
                  className="error-reload-button"
                  onClick={() => window.location.reload()}
                  aria-label="Restart plugin"
                >
                  Restart Plugin
                </button>
              )}
            </div>

            {/* Help text with link to GitHub repository for issue reporting */}
            <p className="error-help-text">
              If the problem persists, please report it on GitHub.
              <br />
              <a
                href="https://github.com/hiroaki-suzuki/obsidian-plugin-card-view-explorer"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Link to GitHub repository for issue reporting"
              >
                https://github.com/hiroaki-suzuki/obsidian-plugin-card-view-explorer
              </a>
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }

  /**
   * Handles retry attempts when the user clicks the retry button.
   * Resets error state and increments retry count, or shows permanent error if max retries exceeded.
   *
   * This is implemented as an arrow function to preserve the correct 'this' context
   * when used as an event handler in the JSX.
   */
  handleRetry = () => {
    if (this.state.retryCount < MAX_RETRIES) {
      // Reset error state but increment retry counter to track attempts
      this.setState({
        hasError: false,
        error: null,
        errorId: null,
        retryCount: this.state.retryCount + 1,
      });
    } else {
      // Max retries reached, show permanent error state
      // This code path should rarely execute since the UI shows a restart button instead
      console.error("Card View Explorer: Max retries reached for error boundary");
    }
  };
}
