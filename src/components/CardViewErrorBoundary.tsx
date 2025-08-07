import React from "react";
import { ErrorCategory, handleError } from "../core/errors/errorHandling";

/** Maximum number of automatic retry attempts before requiring manual intervention */
const MAX_RETRIES = 3;

/**
 * Props for the CardViewErrorBoundary component
 */
interface CardViewErrorBoundaryProps {
  /** Child components to render when no error has occurred */
  children: React.ReactNode;
  /** Optional callback invoked when an error is caught by the boundary */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * Internal state management for the error boundary component
 */
interface CardViewErrorBoundaryState {
  /** Whether an error has been caught */
  hasError: boolean;
  /** The caught error instance, if any */
  error: Error | null;
  /** Number of retry attempts made */
  retryCount: number;
}

/**
 * Error boundary component that catches React rendering errors and provides user-friendly error handling
 * with automatic retry functionality for the Card View Explorer plugin.
 *
 * This component implements React's error boundary pattern to gracefully handle errors that occur
 * during component rendering, lifecycle methods, and constructors of the whole component tree below them.
 * It provides automatic retry attempts up to MAX_RETRIES before requiring manual intervention.
 *
 * @example
 * ```tsx
 * <CardViewErrorBoundary onError={(error, errorInfo) => console.log(error)}>
 *   <CardView plugin={plugin} />
 * </CardViewErrorBoundary>
 * ```
 */
export class CardViewErrorBoundary extends React.Component<
  CardViewErrorBoundaryProps,
  CardViewErrorBoundaryState
> {
  constructor(props: CardViewErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      retryCount: 0,
    };
  }

  /**
   * Static method called when an error is thrown during rendering.
   * Updates component state to trigger error UI rendering.
   *
   * @param error - The error that was thrown
   * @returns Partial state update to trigger error display
   */
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  /**
   * Called when an error is caught by this boundary.
   * Logs the error through the centralized error handling system and calls the optional onError callback.
   *
   * @param error - The error that was thrown
   * @param errorInfo - Additional information about the error (component stack, etc.)
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    handleError(error, ErrorCategory.UI, {
      componentStack: errorInfo.componentStack || "No component stack available",
      errorBoundary: "CardViewErrorBoundary",
      retryCount: this.state.retryCount,
    });

    this.props.onError?.(error, errorInfo);
  }

  /**
   * Renders either the error UI (when an error has occurred) or the children components.
   * The error UI includes retry functionality and helpful user guidance.
   */
  render() {
    if (this.state.hasError && this.state.error) {
      const canRetry = this.state.retryCount < MAX_RETRIES;

      return (
        <div className="card-view-error-boundary">
          <div className="error-content">
            <div className="error-icon">⚠️</div>
            <h3>Loading Error</h3>
            <p>An error occurred while loading Card View Explorer.</p>

            {this.state.retryCount > 0 && (
              <p className="retry-info">
                Retrying... ({this.state.retryCount}/{MAX_RETRIES})
              </p>
            )}

            <div className="error-actions">
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
                  onClick={() => window.location.reload()} // Force page reload when max retries exceeded
                  aria-label="Restart plugin"
                >
                  Restart Plugin
                </button>
              )}
            </div>

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
   * Resets the error state to allow re-rendering of children components.
   * If max retries have been reached, logs this as an error for debugging purposes.
   */
  handleRetry = () => {
    if (this.state.retryCount < MAX_RETRIES) {
      // Reset error state and increment retry count to attempt re-rendering
      this.setState({
        hasError: false,
        error: null,
        retryCount: this.state.retryCount + 1,
      });
    } else {
      // Log when user attempts to retry beyond the maximum allowed attempts
      handleError(new Error("Max retries reached"), ErrorCategory.UI, {
        componentStack: "CardViewErrorBoundary",
        errorBoundary: "CardViewErrorBoundary",
        retryCount: this.state.retryCount,
      });
    }
  };
}
