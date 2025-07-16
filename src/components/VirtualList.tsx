import React from "react";
import { Virtuoso } from "react-virtuoso";
import type CardExplorerPlugin from "../main";
import { useCardExplorerStore } from "../store/cardExplorerStore";
import { NoteCard } from "./NoteCard";

interface VirtualListProps {
  /** Plugin instance for passing to NoteCard components */
  plugin: CardExplorerPlugin;
}

/**
 * VirtualList Component
 *
 * Provides performance-optimized rendering of note cards using react-virtuoso.
 * Features:
 * - Virtual scrolling for large note collections
 * - Dynamic item heights for variable card content
 * - Loading states and empty state handling
 * - Integration with Zustand store for filtered and sorted notes
 *
 * Uses react-virtuoso for efficient rendering of large lists while maintaining
 * smooth scrolling performance.
 */
export const VirtualList: React.FC<VirtualListProps> = ({ plugin }) => {
  const { filteredNotes, isLoading, error } = useCardExplorerStore();

  /**
   * Render individual note card item
   * Called by Virtuoso for each visible item
   */
  const renderNoteCard = React.useCallback(
    (index: number) => {
      const note = filteredNotes[index];
      if (!note) return null;

      return (
        <div className="virtual-list-item" key={note.file.path}>
          <NoteCard note={note} plugin={plugin} />
        </div>
      );
    },
    [filteredNotes, plugin]
  );

  /**
   * Handle loading state
   */
  if (isLoading) {
    return (
      <div className="virtual-list-container">
        <div className="virtual-list-loading">
          <div className="loading-spinner" />
          <p>Loading notes...</p>
        </div>
      </div>
    );
  }

  /**
   * Handle error state
   */
  if (error) {
    return (
      <div className="virtual-list-container">
        <div className="virtual-list-error">
          <div className="error-icon">⚠️</div>
          <h3>Error Loading Notes</h3>
          <p>{error}</p>
          <button type="button" className="retry-button" onClick={() => plugin.refreshNotes()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  /**
   * Handle empty state
   */
  if (filteredNotes.length === 0) {
    return (
      <div className="virtual-list-container">
        <div className="virtual-list-empty">
          <div className="empty-icon">📝</div>
          <h3>No Notes Found</h3>
          <p>
            No notes match your current filters. Try adjusting your search criteria or clearing
            filters to see more notes.
          </p>
          <button
            type="button"
            className="clear-filters-button"
            onClick={() => useCardExplorerStore.getState().clearFilters()}
          >
            Clear Filters
          </button>
        </div>
      </div>
    );
  }

  /**
   * Render virtualized list of note cards
   */
  return (
    <div className="virtual-list-container">
      <Virtuoso
        totalCount={filteredNotes.length}
        itemContent={renderNoteCard}
        className="virtual-list"
        style={{ height: "100%" }}
        components={{
          // Custom components for better styling control
          List: React.forwardRef<HTMLDivElement>((props, ref) => (
            <div ref={ref} {...props} className="virtual-list-content" />
          )),
          Item: ({ children, ...props }) => (
            <div {...props} className="virtual-list-item-wrapper">
              {children}
            </div>
          ),
        }}
        // Performance optimizations
        overscan={5} // Render 5 extra items outside viewport
        increaseViewportBy={200} // Increase viewport by 200px for smoother scrolling
        // Handle dynamic heights
        defaultItemHeight={120} // Estimated item height for better initial rendering
        // Scroll behavior
        followOutput="smooth" // Smooth scrolling when new items are added
      />

      {/* Results summary */}
      <div className="virtual-list-footer">
        <span className="results-count">
          {filteredNotes.length} note{filteredNotes.length !== 1 ? "s" : ""} found
        </span>
      </div>
    </div>
  );
};
