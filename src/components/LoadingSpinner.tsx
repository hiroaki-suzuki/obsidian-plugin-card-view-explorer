import type React from "react";

/**
 * Props for the LoadingSpinner component
 */
interface LoadingSpinnerProps {
  /** Main title to display above the loading message */
  title?: string;
  /** Subtitle or description text explaining what's loading */
  message?: string;
  /** Whether to show the spinner animation (true) or hide it (false) */
  showSpinner?: boolean;
  /** Additional CSS class name for custom styling */
  className?: string;
}

/**
 * Props for the FullPageLoading component
 */
interface FullPageLoadingProps {
  /** Main title to display above the loading message */
  title?: string;
  /** Subtitle or description text explaining what's loading */
  message?: string;
}

/**
 * LoadingSpinner Component
 *
 * Displays a loading state with spinner animation, title, and message.
 * Used for both overlay loading indicators and inline loading states.
 *
 * @component
 * @example
 * ```tsx
 * // Basic usage
 * <LoadingSpinner />
 *
 * // Custom messages
 * <LoadingSpinner
 *   title="Processing Notes"
 *   message="Applying filters..."
 * />
 *
 * // Without spinner animation
 * <LoadingSpinner
 *   showSpinner={false}
 *   title="Please wait"
 * />
 *
 * // With custom styling
 * <LoadingSpinner className="custom-loader" />
 * ```
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  title = "Loading",
  message = "Please wait...",
  showSpinner = true,
  className = "",
}) => {
  return (
    <div className={`loading-content ${className}`}>
      {/* Spinner animation element, conditionally rendered based on showSpinner prop */}
      {showSpinner && <div className="loading-spinner" />}
      {/* Title element - always rendered, but only with content if title is provided */}
      <h3>{title}</h3>
      {/* Message element - always rendered, but only with content if message is provided */}
      <p>{message}</p>
    </div>
  );
};

/**
 * FullPageLoading Component
 *
 * Displays a full-page loading state that fills the entire Card View Explorer view.
 * Wraps the LoadingSpinner component with the card-view-container structure
 * for consistent styling with the rest of the application.
 *
 * Used for initial loading states when no content is available yet.
 *
 * @component
 * @example
 * ```tsx
 * // Basic usage with default title and message
 * <FullPageLoading />
 *
 * // Custom loading message
 * <FullPageLoading
 *   title="Initializing"
 *   message="Setting up Card View Explorer..."
 * />
 * ```
 *
 * @param props - Component props
 * @param props.title - Main loading title (defaults to "Loading Card View Explorer")
 * @param props.message - Loading description message (defaults to "Loading your notes...")
 * @returns Full page loading component with proper Card View Explorer layout structure
 * @see LoadingSpinner - The underlying component used for the actual loading UI
 */
export const FullPageLoading: React.FC<FullPageLoadingProps> = ({
  title = "Loading Card View Explorer",
  message = "Loading your notes...",
}) => {
  return (
    <div className="card-view-container">
      <div className="card-view-loading">
        <LoadingSpinner title={title} message={message} />
      </div>
    </div>
  );
};
