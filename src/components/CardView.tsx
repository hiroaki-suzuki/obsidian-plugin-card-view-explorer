import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type CardExplorerPlugin from "../main";
import { useCardExplorerStore } from "../store/cardExplorerStore";
import { extractAllTagPaths } from "../utils/tagUtils";
import { CardViewErrorBoundary } from "./CardViewErrorBoundary";
import { ErrorDisplay } from "./ErrorDisplay";
import { FilterPanel } from "./FilterPanel";
import { FullPageLoading, LoadingSpinner } from "./LoadingSpinner";
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

  // Filter panel collapse state
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

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
   * Includes both parent and full tag paths (e.g., "ai" and "ai/code")
   * Memoized to avoid recomputation on every render
   */
  const availableTags = useMemo(() => {
    const allNoteTags: string[] = [];

    for (const note of notes) {
      allNoteTags.push(...note.tags);
    }

    // Extract all possible tag paths including parent tags
    return extractAllTagPaths(allNoteTags);
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
      <ErrorDisplay
        error={error}
        onRetry={handleRetry}
        onDismiss={() => setError(null)}
        title="Error Loading Card Explorer"
        isRetrying={isLoading}
      />
    );
  }

  /**
   * Render global loading state
   */
  if (isLoading && notes.length === 0) {
    return <FullPageLoading title="Loading Card Explorer" message="Loading your notes..." />;
  }

  /**
   * Render main Card Explorer interface
   */
  return (
    <CardViewErrorBoundary onError={handleErrorBoundaryError}>
      <div className="card-view-container">
        {/* Header with title, stats, filter toggle, and refresh button */}
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
          <div className="card-view-actions">
            <button
              type="button"
              className={`filter-toggle-button ${isFilterPanelOpen ? "active" : ""}`}
              onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              title={isFilterPanelOpen ? "Hide filters" : "Show filters"}
            >
              Filters {isFilterPanelOpen ? "▲" : "▼"}
            </button>
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

        {/* Collapsible filter panel */}
        {isFilterPanelOpen && (
          <div className="card-view-filter-panel">
            <FilterPanel availableTags={availableTags} availableFolders={availableFolders} />
          </div>
        )}

        {/* Main content area - now full width */}
        <div className="card-view-content">
          <div className="card-view-main">
            {/* Loading overlay for refresh operations */}
            {isLoading && (
              <div className="card-view-loading-overlay">
                <LoadingSpinner
                  title=""
                  message="Refreshing notes..."
                  className="overlay-loading"
                />
              </div>
            )}

            {/* Virtual List of Note Cards */}
            <VirtualList plugin={plugin} />
          </div>
        </div>
      </div>
    </CardViewErrorBoundary>
  );
};
