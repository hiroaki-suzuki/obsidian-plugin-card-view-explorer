import type React from "react";
import { useCardExplorerStore } from "../../store/cardExplorerStore";
import { ObsidianIcon } from "../ObsidianIcon";

/**
 * Component displayed when filter results are empty
 * Provides users with a way to clear filters
 */
export const EmptyState: React.FC = () => {
  /**
   * Clears all filters and resets note display
   */
  const handleClearFilters = () => {
    useCardExplorerStore.getState().clearFilters();
  };

  return (
    <div className="virtual-list-container">
      <div className="virtual-list-empty">
        <div className="empty-icon">
          <ObsidianIcon iconName="file-search" />
        </div>
        <h3>No Notes Found</h3>
        <p>
          No notes match your current filters. Try adjusting your search criteria or clearing
          filters to see more notes.
        </p>
        <button type="button" className="clear-filters-button" onClick={handleClearFilters}>
          Clear Filters
        </button>
      </div>
    </div>
  );
};
