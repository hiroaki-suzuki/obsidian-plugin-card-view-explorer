import { setIcon } from "obsidian";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ErrorCategory } from "../utils/errorHandling";

/**
 * Props for the ErrorFallback component
 *
 * This interface defines all possible configuration options for the error display,
 * allowing customization of messages, retry behavior, and styling based on error category.
 */
interface ErrorFallbackProps {
  /** The Error object that was caught */
  error: Error;
  /** Callback function to retry the failed operation */
  onRetry?: () => void;
  /** Custom error message to display instead of the default category-based message */
  message?: string;
  /** Whether to show the retry button (defaults to true) */
  showRetry?: boolean;
  /** Custom text for the retry button (defaults to "Try Again") */
  retryText?: string;
  /** Error category that determines styling and default messages */
  category?: ErrorCategory;
  /** Additional context information for debugging (logged to console only) */
  context?: Record<string, any>;
}

/**
 * User-Friendly Error Fallback Component
 *
 * Displays a user-friendly error message with appropriate icon and recovery suggestions
 * based on the error category. Provides retry functionality and logs detailed error
 * information to the console for debugging purposes.
 *
 * This component is designed to be used:
 * 1. Within React error boundaries to catch rendering errors
 * 2. For explicit error states in components (e.g., API failures)
 * 3. As a fallback UI when operations fail
 *
 * @example
 * // Within an error boundary
 * <CardViewErrorBoundary>
 *   <YourComponent />
 * </CardViewErrorBoundary>
 *
 * // For explicit error states
 * {error ? (
 *   <ErrorFallback
 *     error={error}
 *     onRetry={handleRetry}
 *     category={ErrorCategory.API}
 *   />
 * ) : (
 *   <YourComponent />
 * )}
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
  /**
   * Log detailed error information to console for debugging purposes
   * This effect runs when the component mounts or when error/category/context changes
   */
  useEffect(() => {
    // Use console.group to organize error information in collapsible sections
    console.group("🛑 Card View Explorer Error");
    console.error("Error:", error);
    console.error("Category:", category);
    console.error("Context:", context);
    console.error("Stack:", error.stack);
    console.error("Timestamp:", new Date().toISOString());
    console.groupEnd();
  }, [error, category, context]);

  /**
   * Get appropriate icon name for the current error category
   *
   * Maps error categories to relevant Obsidian icons:
   * - DATA: database icon (for data loading/processing errors)
   * - API: plug icon (for API communication errors)
   * - UI: monitor icon (for interface rendering errors)
   * - GENERAL: alert-triangle icon (for uncategorized errors)
   *
   * @returns Icon name string from Obsidian's icon library
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
   * Internal Icon component that renders Obsidian icons using the setIcon API
   *
   * This component creates a span element and uses Obsidian's setIcon function
   * to render SVG icons from Obsidian's icon library. The icon is updated
   * whenever the iconName prop changes.
   *
   * @param iconName - Name of the Obsidian icon to render
   * @param className - Additional CSS class names to apply to the icon container
   */
  const ObsidianIcon: React.FC<{ iconName: string; className?: string }> = ({
    iconName,
    className = "",
  }) => {
    // Reference to the DOM element where the icon will be rendered
    const iconRef = useRef<HTMLSpanElement>(null);

    // Set or update the icon when the component mounts or iconName changes
    useEffect(() => {
      if (iconRef.current) {
        // Clear any existing content before setting the new icon
        iconRef.current.innerHTML = "";
        // Use Obsidian's setIcon API to render the SVG icon
        setIcon(iconRef.current, iconName);
      }
    }, [iconName]);

    return <span ref={iconRef} className={`obsidian-icon ${className}`} />;
  };

  /**
   * Get CSS class name based on the error category
   *
   * Creates a category-specific CSS class for styling the error component
   * differently based on the error type (e.g., different colors or borders)
   *
   * @returns CSS class name string
   */
  const getCategoryClass = useCallback(() => {
    return `error-${category}`;
  }, [category]);

  /**
   * Get user-friendly error message based on category or custom message
   *
   * Returns either the custom message provided in props or a default
   * user-friendly message based on the error category. Each category
   * has a specific message that guides the user toward appropriate action.
   *
   * @returns A user-friendly error message string
   */
  const getDisplayMessage = useCallback(() => {
    // If a custom message is provided, use it instead of category-based messages
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
 * Custom hook for managing error states in functional components
 *
 * This hook provides a simple way to capture, display, and reset errors
 * in React components without using class-based error boundaries.
 *
 * @example
 * const MyComponent = () => {
 *   const { error, captureError, resetError, hasError } = useErrorFallback();
 *
 *   const handleAction = async () => {
 *     try {
 *       await someOperation();
 *     } catch (err) {
 *       captureError(err);
 *     }
 *   };
 *
 *   if (hasError) {
 *     return (
 *       <ErrorFallback
 *         error={error}
 *         onRetry={resetError}
 *         category={ErrorCategory.API}
 *       />
 *     );
 *   }
 *
 *   return <div>Normal component content</div>;
 * };
 *
 * @returns Object containing error state and management functions
 */
export const useErrorFallback = () => {
  // State to track the current error (null when no error)
  const [error, setError] = useState<Error | null>(null);

  /**
   * Reset the error state back to null
   * Used to clear errors or as a retry callback
   */
  const resetError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Capture and store an error
   * @param error - The error to capture
   */
  const captureError = useCallback((error: Error) => {
    setError(error);
  }, []);

  return {
    error, // The current error object or null
    resetError, // Function to clear the error state
    captureError, // Function to set a new error
    hasError: error !== null, // Boolean flag indicating if an error exists
  };
};
