import type React from "react";
import { useCallback, useEffect, useMemo } from "react";
import type CardExplorerPlugin from "../main";
import { useCardExplorerStore } from "../store/cardExplorerStore";
import { CardViewErrorBoundary } from "./CardViewErrorBoundary";
import { FilterPanel } from "./FilterPanel";
import { VirtualList } from "./VirtualList";

interface CardViewProps {
  /** Plugin instance for API access and configuration */
  plugin: CardExplorerPlugin;
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
