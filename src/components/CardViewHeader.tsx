import type React from "react";
import { useMemo } from "react";

/**
 * Props for the CardViewHeader component
 */
interface CardViewHeaderProps {
  /**
   * Total number of notes in the vault
   */
  totalNotes: number;
  /**
   * Number of filtered notes currently displayed
   */
  filteredNotes: number;
  /**
   * Whether the filter panel is currently open
   */
  isFilterPanelOpen: boolean;
  /**
   * Whether the application is currently loading/refreshing
   */
  isLoading: boolean;
  /**
   * Callback function to toggle filter panel visibility
   */
  onToggleFilter: () => void;
  /**
   * Callback function to refresh notes from vault
   */
  onRefresh: () => void;
}

/**
 * CardView Header Component
 *
 * Displays the title, note statistics, and action buttons for the Card View Explorer.
 * Includes filter toggle and refresh functionality with appropriate accessibility attributes.
 */
export const CardViewHeader: React.FC<CardViewHeaderProps> = ({
  totalNotes,
  filteredNotes,
  isFilterPanelOpen,
  isLoading,
  onToggleFilter,
  onRefresh,
}) => {
  // Memoize calculated values for performance optimization
  const statsDisplay = useMemo(
    () => ({
      totalNotesText: `${totalNotes} total note${totalNotes !== 1 ? "s" : ""}`,
      shouldShowFilteredCount: filteredNotes !== totalNotes,
      filteredNotesText: `• ${filteredNotes} filtered`,
    }),
    [totalNotes, filteredNotes]
  );

  const buttonLabels = useMemo(
    () => ({
      filterButton: isFilterPanelOpen ? "Hide filters" : "Show filters",
      refreshButton: isLoading ? "Refreshing..." : "Refresh Notes",
    }),
    [isFilterPanelOpen, isLoading]
  );

  return (
    <div className="card-view-header">
      <h2 className="card-view-title">Card View Explorer</h2>

      <div className="card-view-stats">
        <span className="total-notes">{statsDisplay.totalNotesText}</span>
        {statsDisplay.shouldShowFilteredCount && (
          <span className="filtered-notes">{statsDisplay.filteredNotesText}</span>
        )}
      </div>

      <div className="card-view-actions">
        <button
          type="button"
          className={`filter-toggle-button ${isFilterPanelOpen ? "active" : ""}`}
          onClick={onToggleFilter}
          title={buttonLabels.filterButton}
          aria-expanded={isFilterPanelOpen}
          aria-controls="filter-panel"
        >
          Filters {isFilterPanelOpen ? "▲" : "▼"}
        </button>

        <button
          type="button"
          className="refresh-button"
          onClick={onRefresh}
          disabled={isLoading}
          title="Refresh notes from vault"
          aria-busy={isLoading}
        >
          {buttonLabels.refreshButton}
        </button>
      </div>
    </div>
  );
};
