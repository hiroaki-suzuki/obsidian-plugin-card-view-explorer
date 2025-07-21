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

/**
 * Props for the CardView component
 */
interface CardViewProps {
  /**
   * Plugin instance for API access and configuration.
   * Provides access to Obsidian's App instance and plugin settings.
   */
  plugin: CardExplorerPlugin;
}

/**
 * Main CardView Container Component
 *
 * This is the primary container component for the Card View Explorer plugin interface.
 * It orchestrates all child components and manages the overall Card View Explorer UI.
 *
 * Features:
 * - Error boundary for React error handling with fallback UI
 * - Loading states and comprehensive error handling UI
 * - Integration of FilterPanel for note filtering and VirtualList for note display
 * - Plugin prop passing and Obsidian API access for data operations
 * - Automatic note loading on mount with error recovery
 * - Computed available tags and folders for filtering options
 * - Debounced pin state persistence to plugin data
 * - Collapsible filter panel for better space utilization
 *
 * @component
 * @example
 * ```tsx
 * <CardView plugin={plugin} />
 * ```
 */
export const CardView: React.FC<CardViewProps> = ({ plugin }) => {
  // Extract state and actions from the centralized Zustand store
  const {
    notes, // All notes loaded from the vault
    filteredNotes, // Notes after applying filters
    isLoading, // Loading state indicator
    error, // Error state for API/data operations
    refreshNotes, // Action to reload notes from vault
    setError, // Action to set/clear error state
    initializeFromPluginData, // Action to load saved settings from plugin
    savePinStatesToPlugin, // Action to save pin states to plugin data
    pinnedNotes, // Set of pinned note IDs
  } = useCardExplorerStore();

  // Local state for filter panel visibility toggle
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  /**
   * Initialize store from plugin data when component mounts.
   *
   * This effect runs once on component mount and loads:
   * - Saved pin states (which notes are pinned)
   * - Filter configuration (tags, folders, date ranges)
   * - Sort configuration (sort field, direction)
   * - Other user preferences from plugin data
   *
   * @effect
   * @dependency plugin - Re-runs if plugin instance changes
   * @dependency initializeFromPluginData - Re-runs if this function reference changes
   */
  useEffect(() => {
    initializeFromPluginData(plugin);
  }, [plugin, initializeFromPluginData]);

  /**
   * Load notes from Obsidian vault when component mounts.
   *
   * This effect:
   * 1. Triggers the initial note loading process from Obsidian's vault
   * 2. Handles errors during the loading process
   * 3. Prevents memory leaks with cleanup function
   * 4. Uses isMounted flag to prevent state updates after unmount
   *
   * The refreshNotes function accesses Obsidian's metadataCache and vault APIs
   * to load all markdown files and extract their metadata.
   *
   * @effect
   * @dependency plugin.app - Obsidian App instance for API access
   * @dependency refreshNotes - Store action to load notes
   * @dependency setError - Store action to update error state
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
   * Auto-save pin states when they change with debouncing.
   *
   * This effect:
   * 1. Watches for changes to pinnedNotes collection
   * 2. Debounces save operations (500ms) to avoid excessive disk writes
   * 3. Persists pin states to plugin data.json
   * 4. Handles errors with dynamic import of error handling utilities
   * 5. Cleans up timeout on component unmount
   *
   * Note: We use pinnedNotes.size as dependency instead of pinnedNotes itself
   * because Set object references don't work well as effect dependencies.
   *
   * @effect
   * @dependency pinnedNotes.size - Number of pinned notes (changes when pins are added/removed)
   * @dependency savePinStatesToPlugin - Store action to persist pin states
   * @dependency plugin - Plugin instance for data persistence
   */
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const saveWithDelay = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        try {
          await savePinStatesToPlugin(plugin);
        } catch (err) {
          // Import error handling utilities dynamically to avoid circular dependencies
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
   * Compute available tags from all notes for filter dropdown options.
   *
   * This memoized computation:
   * 1. Collects all tags from all notes
   * 2. Extracts both full tag paths and parent tags (hierarchical tags)
   *    For example, from "#ai/ml/neural" it extracts ["ai", "ai/ml", "ai/ml/neural"]
   * 3. Returns a sorted, unique list of all available tags
   *
   * The extractAllTagPaths utility handles the hierarchical tag extraction logic.
   *
   * @memoized
   * @dependency notes - Recomputes when notes collection changes
   * @returns {string[]} Array of unique tag paths for filter options
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
   * Compute available folders from all notes for filter dropdown options.
   *
   * This memoized computation:
   * 1. Creates a Set to collect unique folder paths
   * 2. Adds each note's folder to the Set (automatically deduplicates)
   * 3. Converts the Set to a sorted array for the filter dropdown
   *
   * Using a Set ensures we only have unique folder paths before sorting.
   *
   * @memoized
   * @dependency notes - Recomputes when notes collection changes
   * @returns {string[]} Sorted array of unique folder paths
   */
  const availableFolders = useMemo(() => {
    const folderSet = new Set<string>();

    for (const note of notes) {
      folderSet.add(note.folder);
    }

    return Array.from(folderSet).sort();
  }, [notes]);

  /**
   * Handle errors caught by the React error boundary.
   *
   * This function is called when the CardViewErrorBoundary catches an error
   * in any of the child components. It logs the error details and updates
   * the global error state to display a user-friendly error message.
   *
   * @param {Error} error - The error object caught by the boundary
   * @param {React.ErrorInfo} errorInfo - React component stack information
   */
  const handleErrorBoundaryError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error("Card View Explorer Error Boundary:", error, errorInfo);
    setError(`React Error: ${error.message}`);
  };

  /**
   * Handle retry action for errors with error state reset.
   *
   * This memoized callback:
   * 1. Clears the current error state
   * 2. Attempts to reload notes from the vault
   * 3. Handles any errors that occur during retry
   *
   * Used by both the error display component and the refresh button.
   * Memoized to prevent unnecessary re-renders when passed as prop.
   *
   * @memoized
   * @dependency plugin.app - Obsidian App instance
   * @dependency refreshNotes - Store action to reload notes
   * @dependency setError - Store action to update error state
   * @returns {Promise<void>} Promise that resolves when retry completes
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
   * Render global error state for API/data errors (non-React errors).
   *
   * This conditional rendering handles errors from:
   * - Note loading failures
   * - API access issues
   * - Data corruption
   * - Other operational errors
   *
   * The ErrorDisplay component provides retry and dismiss options.
   */
  if (error && !isLoading) {
    return (
      <ErrorDisplay
        error={error}
        onRetry={handleRetry}
        onDismiss={() => setError(null)}
        title="Error Loading Card View Explorer"
        isRetrying={isLoading}
      />
    );
  }

  /**
   * Render global loading state for initial data load.
   *
   * This shows a full-page loading spinner only during the initial load
   * when we have no notes yet. For subsequent refreshes, we use an overlay
   * instead to maintain context.
   */
  if (isLoading && notes.length === 0) {
    return <FullPageLoading title="Loading Card View Explorer" message="Loading your notes..." />;
  }

  /**
   * Render main Card View Explorer interface with all components.
   *
   * The UI structure consists of:
   * 1. Error boundary wrapper for React error handling
   * 2. Header section with title, statistics, and action buttons
   * 3. Collapsible filter panel (conditionally rendered)
   * 4. Main content area with virtual list of note cards
   * 5. Loading overlay for refresh operations
   *
   * The component uses conditional rendering for the filter panel
   * and loading overlay based on component state.
   */
  return (
    <CardViewErrorBoundary onError={handleErrorBoundaryError}>
      <div className="card-view-container">
        {/* Header with title, stats, filter toggle, and refresh button */}
        <div className="card-view-header">
          <h2 className="card-view-title">Card View Explorer</h2>
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

        {/* Collapsible filter panel - only rendered when open */}
        {isFilterPanelOpen && (
          <div className="card-view-filter-panel">
            <FilterPanel availableTags={availableTags} availableFolders={availableFolders} />
          </div>
        )}

        {/* Main content area with virtual list */}
        <div className="card-view-content">
          <div className="card-view-main">
            {/* Loading overlay for refresh operations - shown during refreshes but not initial load */}
            {isLoading && (
              <div className="card-view-loading-overlay">
                <LoadingSpinner
                  title=""
                  message="Refreshing notes..."
                  className="overlay-loading"
                />
              </div>
            )}

            {/* Virtual List of Note Cards - uses react-virtuoso for performance */}
            <VirtualList plugin={plugin} />
          </div>
        </div>
      </div>
    </CardViewErrorBoundary>
  );
};
