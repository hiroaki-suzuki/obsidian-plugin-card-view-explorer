import React, { useCallback, useEffect, useState } from "react";
import { Virtuoso } from "react-virtuoso";
import type CardExplorerPlugin from "../main";
import { useCardExplorerStore } from "../store/cardExplorerStore";
import { ErrorCategory, handleError } from "../utils/errorHandling";
import { ErrorFallback, useErrorFallback } from "./ErrorFallback";
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
 * - Comprehensive error handling with fallback behaviors
 * - Retry mechanisms for failed operations
 *
 * Uses react-virtuoso for efficient rendering of large lists while maintaining
 * smooth scrolling performance.
 */
export const VirtualList: React.FC<VirtualListProps> = ({ plugin }) => {
  const { filteredNotes, isLoading, error, refreshNotes, setError } = useCardExplorerStore();
  const { error: componentError, resetError, captureError } = useErrorFallback();
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  // Enhanced retry function with exponential backoff
  const _handleRetry = useCallback(async () => {
    if (isRetrying) return;

    setIsRetrying(true);
    setRetryCount((prev) => prev + 1);

    try {
      // Clear any existing errors
      resetError();
      setError(null);

      // Add delay for retry attempts (exponential backoff)
      if (retryCount > 0) {
        const delay = Math.min(1000 * 2 ** (retryCount - 1), 5000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      // Attempt to refresh notes
      await refreshNotes(plugin.app);

      // Reset retry count on success
      setRetryCount(0);
    } catch (retryError) {
      handleError(retryError, ErrorCategory.API, {
        component: "VirtualList",
        operation: "retry",
        retryCount: retryCount + 1,
      });

      if (retryError instanceof Error) {
        captureError(retryError);
      }
    } finally {
      setIsRetrying(false);
    }
  }, [isRetrying, retryCount, resetError, setError, refreshNotes, plugin.app, captureError]);

  // Reset retry count when notes successfully load
  useEffect(() => {
    if (filteredNotes.length > 0 && !error && !componentError) {
      setRetryCount(0);
    }
  }, [filteredNotes.length, error, componentError]);

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
   * Handle component error state
   */
  if (componentError) {
    return (
      <div className="virtual-list-container">
        <ErrorFallback
          error={componentError}
          onRetry={_handleRetry}
          category={ErrorCategory.UI}
          context={{
            component: "VirtualList",
            notesCount: filteredNotes.length,
            retryCount,
          }}
          message="Failed to render note list. This may be due to a display issue."
        />
      </div>
    );
  }

  /**
   * Handle store error state
   */
  if (error) {
    return (
      <div className="virtual-list-container">
        <ErrorFallback
          error={new Error(error)}
          onRetry={_handleRetry}
          category={ErrorCategory.API}
          context={{
            component: "VirtualList",
            operation: "loadNotes",
            retryCount,
            isRetrying,
          }}
          message="Failed to load notes from your vault."
          retryText={isRetrying ? "Retrying..." : "Retry"}
          showRetry={!isRetrying}
        />
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
