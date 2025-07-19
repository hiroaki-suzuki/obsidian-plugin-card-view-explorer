import type React from "react";

interface LoadingSpinnerProps {
  /** Main title to display */
  title?: string;
  /** Subtitle or description text */
  message?: string;
  /** Whether to show the spinner animation */
  showSpinner?: boolean;
  /** Additional CSS class name */
  className?: string;
}

interface FullPageLoadingProps {
  /** Main title to display */
  title?: string;
  /** Subtitle or description text */
  message?: string;
}

/**
 * LoadingSpinner Component
 *
 * Displays a loading state with spinner animation, title, and message.
 * Used for overlay loading indicators and inline loading states.
 *
 * Features:
 * - Customizable title and message
 * - Optional spinner animation
 * - Flexible styling with className prop
 * - Consistent loading UI across the application
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  title = "Loading",
  message = "Please wait...",
  showSpinner = true,
  className = "",
}) => {
  return (
    <div className={`loading-content ${className}`}>
      {showSpinner && <div className="loading-spinner" />}
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  );
};

/**
 * FullPageLoading Component
 *
 * Displays a full-page loading state with card-view-container wrapper.
 * Used for global loading states that need to fill the entire Card Explorer view.
 *
 * Features:
 * - Includes card-view-container wrapper for consistent styling
 * - Centered loading content with spinner
 * - Customizable title and message
 * - Consistent with Card Explorer layout structure
 */
export const FullPageLoading: React.FC<FullPageLoadingProps> = ({
  title = "Loading Card Explorer",
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
