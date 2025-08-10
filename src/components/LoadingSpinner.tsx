import type React from "react";

/**
 * Props for the LoadingSpinner component
 */
interface LoadingSpinnerProps {
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
 * The spinner animation is always shown and styled via CSS.
 *
 * @component
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  title = "Loading",
  message = "Loading your notes...",
}) => {
  return (
    <div
      className="loading-content"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-describedby="loading-message"
    >
      {/* CSS-animated spinner - styled via .loading-spinner class */}
      <div className="loading-spinner" aria-hidden="true" />
      <h3>{title}</h3>
      <p id="loading-message">{message}</p>
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
 * @returns Full page loading component with proper Card View Explorer layout structure
 * @see LoadingSpinner - The underlying component used for the actual loading UI
 */
export const FullPageLoading: React.FC = () => {
  return (
    <div className="card-view-container">
      <div className="card-view-loading">
        <LoadingSpinner title="Loading Card View Explorer" />
      </div>
    </div>
  );
};
