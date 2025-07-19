import { setIcon } from "obsidian";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
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
  /** Whether to show retry button */
  showRetry?: boolean;
  /** Custom retry button text */
  retryText?: string;
  /** Error category for styling and behavior */
  category?: ErrorCategory;
  /** Additional context information (for logging only) */
  context?: Record<string, any>;
}

/**
 * User-Friendly Error Fallback Component
 *
 * Provides a simple, user-friendly error display with retry functionality.
 * Logs detailed error information to console for debugging purposes.
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
  // Log detailed error information to console for debugging
  useEffect(() => {
    console.group("🛑 Card Explorer Error");
    console.error("Error:", error);
    console.error("Category:", category);
    console.error("Context:", context);
    console.error("Stack:", error.stack);
    console.error("Timestamp:", new Date().toISOString());
    console.groupEnd();
  }, [error, category, context]);

  /**
   * Get appropriate icon name for error category
   */
  const getErrorIconName = useCallback(() => {
    switch (category) {
      case ErrorCategory.DATA:
        return "database";
      case ErrorCategory.API:
        return "plug";
      case ErrorCategory.UI:
        return "monitor";
      default:
        return "alert-triangle";
    }
  }, [category]);

  /**
   * Icon component using Obsidian's setIcon function
   */
  const ObsidianIcon: React.FC<{ iconName: string; className?: string }> = ({
    iconName,
    className = "",
  }) => {
    const iconRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
      if (iconRef.current) {
        iconRef.current.innerHTML = "";
        setIcon(iconRef.current, iconName);
      }
    }, [iconName]);

    return <span ref={iconRef} className={`obsidian-icon ${className}`} />;
  };

  /**
   * Get CSS class for error category
   */
  const getCategoryClass = useCallback(() => {
    return `error-${category}`;
  }, [category]);

  /**
   * Get user-friendly error message
   */
  const getDisplayMessage = useCallback(() => {
    if (message) return message;

    // Provide category-specific user-friendly messages
    switch (category) {
      case ErrorCategory.DATA:
        return "Failed to load note data. Your information may be temporarily unavailable.";
      case ErrorCategory.API:
        return "Failed to communicate with Obsidian. Please try refreshing.";
      case ErrorCategory.UI:
        return "Interface error occurred. Please try refreshing the view.";
      default:
        return "An unexpected error occurred.";
    }
  }, [message, category]);

  return (
    <div className={`error-fallback ${getCategoryClass()}`}>
      <div className="error-content">
        {/* Error Icon and Title */}
        <div className="error-header">
          <div className="error-icon">
            <ObsidianIcon iconName={getErrorIconName()} className="error-icon-element" />
          </div>
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
        </div>

        {/* Simple Recovery Suggestions */}
        <div className="error-suggestions">
          <p className="suggestion-text">
            {category === ErrorCategory.DATA && "Try refreshing your notes or restart the plugin."}
            {category === ErrorCategory.API && "Try refreshing the view or restart Obsidian."}
            {(category === ErrorCategory.UI || category === ErrorCategory.GENERAL) &&
              "Try refreshing the view or restart the plugin."}
          </p>
        </div>
      </div>
    </div>
  );
};

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
