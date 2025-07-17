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
  {
    children: React.ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
    fallbackComponent?: React.ComponentType<{ error: Error; retry: () => void }>;
  },
  {
    hasError: boolean;
    error: Error | null;
    errorId: string | null;
    retryCount: number;
  }
> {
  private maxRetries = 3;

  constructor(props: {
    children: React.ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
    fallbackComponent?: React.ComponentType<{ error: Error; retry: () => void }>;
  }) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Import error handling utilities dynamically to avoid circular dependencies
    import("../utils/errorHandling").then(({ handleError, ErrorCategory }) => {
      const handledError = handleError(error, ErrorCategory.UI, {
        componentStack: (errorInfo as any).componentStack || "No component stack available",
        errorBoundary: "CardViewErrorBoundary",
        retryCount: this.state.retryCount,
      });

      this.setState({ errorId: handledError.details || "unknown" });
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState({
        hasError: false,
        error: null,
        errorId: null,
        retryCount: this.state.retryCount + 1,
      });
    } else {
      // Max retries reached, show permanent error state
      console.error("Card Explorer: Max retries reached for error boundary");
    }
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback component if provided
      if (this.props.fallbackComponent) {
        const FallbackComponent = this.props.fallbackComponent;
        return <FallbackComponent error={this.state.error} retry={this.handleRetry} />;
      }

      // Default fallback UI
      const canRetry = this.state.retryCount < this.maxRetries;

      return (
        <div className="card-view-error-boundary">
          <div className="error-content">
            <div className="error-icon">⚠️</div>
            <h3>Something went wrong</h3>
            <p>The Card Explorer encountered an unexpected error.</p>

            {this.state.retryCount > 0 && (
              <p className="retry-info">
                Retry attempt {this.state.retryCount} of {this.maxRetries}
              </p>
            )}

            <details className="error-details">
              <summary>Error Details</summary>
              <div className="error-info">
                <p>
                  <strong>Message:</strong> {this.state.error.message}
                </p>
                {this.state.errorId && (
                  <p>
                    <strong>Error ID:</strong> {this.state.errorId}
                  </p>
                )}
                <p>
                  <strong>Timestamp:</strong> {new Date().toLocaleString()}
                </p>
              </div>
              <pre className="error-stack">{this.state.error.stack}</pre>
            </details>

            <div className="error-actions">
              {canRetry ? (
                <button type="button" className="error-retry-button" onClick={this.handleRetry}>
                  Try Again ({this.maxRetries - this.state.retryCount} attempts left)
                </button>
              ) : (
                <button
                  type="button"
                  className="error-reload-button"
                  onClick={() => window.location.reload()}
                >
                  Reload Plugin
                </button>
              )}

              <button
                type="button"
                className="error-report-button"
                onClick={() => {
                  // Copy error details to clipboard for reporting
                  const errorReport = {
                    message: this.state.error?.message,
                    stack: this.state.error?.stack,
                    errorId: this.state.errorId,
                    timestamp: new Date().toISOString(),
                    retryCount: this.state.retryCount,
                  };
                  navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2));
                  console.log("Error report copied to clipboard");
                }}
              >
                Copy Error Report
              </button>
            </div>
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
  const {
    notes,
    filteredNotes,
    isLoading,
    error,
    refreshNotes,
    setError,
    initializeFromPluginData,
    savePinStatesToPlugin,
    pinnedNotes,
  } = useCardExplorerStore();

  /**
   * Initialize store from plugin data when component mounts
   * This loads saved pin states, filters, and sort configuration
   */
  useEffect(() => {
    initializeFromPluginData(plugin);
  }, [plugin, initializeFromPluginData]);

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
   * Auto-save pin states when they change
   * Debounced to avoid excessive saves during rapid changes
   */
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const saveWithDelay = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        try {
          await savePinStatesToPlugin(plugin);
        } catch (err) {
          // Import error handling utilities dynamically
          import("../utils/errorHandling").then(({ handleError, ErrorCategory }) => {
            handleError(err, ErrorCategory.DATA, {
              operation: "savePinStates",
              pinCount: pinnedNotes.size,
            });
          });
        }
      }, 500); // 500ms debounce
    };

    saveWithDelay();

    return () => {
      clearTimeout(timeoutId);
    };
  }, [pinnedNotes.size, savePinStatesToPlugin, plugin]); // Use pinnedNotes.size to avoid Set reference issues

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
