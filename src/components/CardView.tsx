import type React from "react";
import { useCallback, useState } from "react";
import { useCardViewInitialization } from "../hooks/useCardViewInitialization";
import { useCardViewState } from "../hooks/useCardViewState";
import type CardExplorerPlugin from "../main";
import { useCardExplorerStore } from "../store/cardExplorerStore";
import { CardViewErrorBoundary } from "./CardViewErrorBoundary";
import { CardViewHeader } from "./CardViewHeader";
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
  // Initialize CardView with plugin data and initial notes loading
  useCardViewInitialization(plugin);

  // Determine which UI state to display based on error, loading, and notes data
  const {
    shouldShowError,
    shouldShowFullPageLoading,
    shouldShowLoadingOverlay,
    error,
    isLoading,
    notes,
  } = useCardViewState();

  // Extract additional state and actions from the centralized Zustand store
  const {
    filteredNotes, // Notes after applying filters
    availableTags, // Available tags for filter options (computed)
    availableFolders, // Available folders for filter options (computed)
    refreshNotes, // Action to reload notes from vault
    setError, // Action to set/clear error state
  } = useCardExplorerStore();

  // Local state for filter panel visibility toggle
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  const handleRetry = useCallback(async () => {
    setError(null);
    await refreshNotes(plugin.app);
  }, [plugin.app, refreshNotes, setError]);

  if (shouldShowError) {
    return (
      <ErrorDisplay
        error={error!}
        onRetry={handleRetry}
        onDismiss={() => setError(null)}
        isRetrying={isLoading}
      />
    );
  }

  if (shouldShowFullPageLoading) {
    return <FullPageLoading />;
  }

  return (
    <CardViewErrorBoundary>
      <div className="card-view-container">
        {/* Header with title, stats, filter toggle, and refresh button */}
        <CardViewHeader
          totalNotes={notes.length}
          filteredNotes={filteredNotes.length}
          isFilterPanelOpen={isFilterPanelOpen}
          isLoading={isLoading}
          onToggleFilter={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
          onRefresh={handleRetry}
        />

        {/* Collapsible filter panel - only rendered when open */}
        {isFilterPanelOpen && (
          <div
            className="card-view-filter-panel"
            id="filter-panel"
            role="region"
            aria-label="Note filters"
          >
            <FilterPanel availableTags={availableTags} availableFolders={availableFolders} />
          </div>
        )}

        {/* Main content area with virtual list */}
        <div className="card-view-content">
          <div className="card-view-main">
            {/* Loading overlay for refresh operations - shown during refreshes but not initial load */}
            {shouldShowLoadingOverlay && (
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
