import type React from "react";
import { useCallback, useEffect, useState } from "react";
import type CardExplorerPlugin from "../main";
import { useCardExplorerStore } from "../store/cardExplorerStore";
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
 */
export const CardView: React.FC<CardViewProps> = ({ plugin }) => {
  // Extract state and actions from the centralized Zustand store
  const {
    notes, // All notes loaded from the vault
    filteredNotes, // Notes after applying filters
    availableTags, // Available tags for filter options (computed)
    availableFolders, // Available folders for filter options (computed)
    isLoading, // Loading state indicator
    error, // Error state for API/data operations
    refreshNotes, // Action to reload notes from vault
    setError, // Action to set/clear error state
    initializeFromPluginData, // Action to load saved settings from plugin
  } = useCardExplorerStore();

  // Local state for filter panel visibility toggle
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  useEffect(() => {
    const data = plugin.getData();
    const settings = plugin.getSettings();
    initializeFromPluginData(data, settings);
  }, [plugin, initializeFromPluginData]);

  useEffect(() => {
    const loadInitialNotes = async () => {
      await refreshNotes(plugin.app);
    };

    loadInitialNotes();
  }, [plugin.app, refreshNotes]);

  const handleRetry = useCallback(async () => {
    setError(null);
    await refreshNotes(plugin.app);
  }, [plugin.app, refreshNotes, setError]);

  if (error && !isLoading) {
    return (
      <ErrorDisplay
        error={error}
        onRetry={handleRetry}
        onDismiss={() => setError(null)}
        isRetrying={isLoading}
      />
    );
  }

  if (isLoading && notes.length === 0) {
    return <FullPageLoading />;
  }

  return (
    <CardViewErrorBoundary>
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
