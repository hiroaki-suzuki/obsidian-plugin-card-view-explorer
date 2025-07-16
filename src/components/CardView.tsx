import React, { useCallback, useEffect, useMemo } from "react";
import type CardExplorerPlugin from "../main";
import { useCardExplorerStore } from "../store/cardExplorerStore";
import { FilterPanel } from "./FilterPanel";
import { VirtualList } from "./VirtualList";

interface CardViewProps {
  /** Plugin instance for API access and configuration */
  plugin: CardExplorerPlugin;
}

/**
 * Error Boundary Component for React Error Handling
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing.
 */
class CardViewErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error, errorInfo: React.ErrorInfo) => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: {
    children: React.ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error for debugging
    console.error("Card Explorer Error Boundary caught an error:", error, errorInfo);

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="card-view-error-boundary">
          <div className="error-content">
            <div className="error-icon">⚠️</div>
            <h3>Something went wrong</h3>
            <p>The Card Explorer encountered an unexpected error.</p>
            <details className="error-details">
              <summary>Error Details</summary>
              <pre>{this.state.error?.message}</pre>
              <pre>{this.state.error?.stack}</pre>
            </details>
            <button
              type="button"
              className="error-retry-button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
              }}
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Main CardView Container Component
 *
 * Orchestrates all child components and manages the overall Card Explorer interface.
 * Features:
 * - Error boundary for React error handling
 * - Loading states and error handling UI
 * - Integration of FilterPanel and VirtualList components
 * - Plugin prop passing and Obsidian API access
 * - Automatic note loading on mount
 * - Computed available tags and folders for filtering
 */
export const CardView: React.FC<CardViewProps> = ({ plugin }) => {
  const { notes, filteredNotes, isLoading, error, refreshNotes, setError } = useCardExplorerStore();

  /**
   * Load notes when component mounts
   * Includes cleanup to prevent memory leaks
   */
  useEffect(() => {
    let isMounted = true;

    const loadInitialNotes = async () => {
      try {
        await refreshNotes(plugin.app);
      } catch (err) {
        if (isMounted) {
          console.error("Failed to load initial notes:", err);
          setError(err instanceof Error ? err.message : "Failed to load notes");
        }
      }
    };

    loadInitialNotes();

    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false;
    };
  }, [plugin.app, refreshNotes, setError]);

  /**
   * Compute available tags from all notes for filter dropdown
   * Memoized to avoid recomputation on every render
   */
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();

    for (const note of notes) {
      for (const tag of note.tags) {
        tagSet.add(tag);
      }
    }

    return Array.from(tagSet).sort();
  }, [notes]);

  /**
   * Compute available folders from all notes for filter dropdown
   * Memoized to avoid recomputation on every render
   */
  const availableFolders = useMemo(() => {
    const folderSet = new Set<string>();

    for (const note of notes) {
      folderSet.add(note.folder);
    }

    return Array.from(folderSet).sort();
  }, [notes]);

  /**
   * Handle error boundary errors
   */
  const handleErrorBoundaryError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error("Card Explorer Error Boundary:", error, errorInfo);
    setError(`React Error: ${error.message}`);
  };

  /**
   * Handle retry action for errors
   * Memoized to prevent unnecessary re-renders
   */
  const handleRetry = useCallback(async () => {
    setError(null);
    try {
      await refreshNotes(plugin.app);
    } catch (err) {
      console.error("Retry failed:", err);
      setError(err instanceof Error ? err.message : "Retry failed");
    }
  }, [plugin.app, refreshNotes, setError]);

  /**
   * Render global error state (non-React errors)
   */
  if (error && !isLoading) {
    return (
      <div className="card-view-container">
        <div className="card-view-error">
          <div className="error-content">
            <div className="error-icon">⚠️</div>
            <h3>Error Loading Card Explorer</h3>
            <p>{error}</p>
            <div className="error-actions">
              <button type="button" className="error-retry-button" onClick={handleRetry}>
                Retry
              </button>
              <button type="button" className="error-clear-button" onClick={() => setError(null)}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Render global loading state
   */
  if (isLoading && notes.length === 0) {
    return (
      <div className="card-view-container">
        <div className="card-view-loading">
          <div className="loading-content">
            <div className="loading-spinner" />
            <h3>Loading Card Explorer</h3>
            <p>Loading your notes...</p>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Render main Card Explorer interface
   */
  return (
    <CardViewErrorBoundary onError={handleErrorBoundaryError}>
      <div className="card-view-container">
        {/* Header with title and stats */}
        <div className="card-view-header">
          <h2 className="card-view-title">Card Explorer</h2>
          <div className="card-view-stats">
            <span className="total-notes">
              {notes.length} total note{notes.length !== 1 ? "s" : ""}
            </span>
            {filteredNotes.length !== notes.length && (
              <span className="filtered-notes">• {filteredNotes.length} filtered</span>
            )}
          </div>
        </div>

        {/* Main content area with filter panel and note list */}
        <div className="card-view-content">
          {/* Filter Panel */}
          <div className="card-view-sidebar">
            <FilterPanel availableTags={availableTags} availableFolders={availableFolders} />
          </div>

          {/* Note List */}
          <div className="card-view-main">
            {/* Loading overlay for refresh operations */}
            {isLoading && (
              <div className="card-view-loading-overlay">
                <div className="loading-spinner" />
                <span>Refreshing notes...</span>
              </div>
            )}

            {/* Virtual List of Note Cards */}
            <VirtualList plugin={plugin} />
          </div>
        </div>

        {/* Footer with refresh button */}
        <div className="card-view-footer">
          <button
            type="button"
            className="refresh-button"
            onClick={handleRetry}
            disabled={isLoading}
            title="Refresh notes from vault"
          >
            {isLoading ? "Refreshing..." : "Refresh Notes"}
          </button>
        </div>
      </div>
    </CardViewErrorBoundary>
  );
};
