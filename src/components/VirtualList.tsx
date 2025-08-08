import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { ErrorCategory, handleError } from "../core/errors/errorHandling";
import type CardExplorerPlugin from "../main";
import { useCardExplorerStore } from "../store/cardExplorerStore";
import { ErrorFallback, useErrorFallback } from "./ErrorFallback";
import { NoteCard } from "./NoteCard";
import { ObsidianIcon } from "./ObsidianIcon";

/**
 * Props for the VirtualList component
 */
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
  // Access store state and actions for notes, loading state, and error handling
  const { filteredNotes, isLoading, error, refreshNotes, setError, filters } =
    useCardExplorerStore();

  // Component-level error handling using the useErrorFallback hook
  const { error: componentError, resetError, captureError } = useErrorFallback();

  // State for retry mechanism with exponential backoff
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  // Refs for container measurements and virtuoso list control
  const containerRef = useRef<HTMLDivElement>(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  // State for responsive grid layout calculations
  const [containerWidth, setContainerWidth] = useState(0);

  // State to track initial render for scroll position management
  const [hasInitiallyRendered, setHasInitiallyRendered] = useState(false);

  // Ref to track previous filters for change detection
  const previousFiltersRef = useRef<any>(null);

  /**
   * Calculates the optimal number of cards to display per row based on container width
   *
   * This function determines how many cards should be shown in each row of the grid
   * based on the available container width. It ensures responsive layout by:
   * - Using a minimum card width of 292px (280px card + 12px gap)
   * - Ensuring at least 1 card is shown even in very narrow containers
   * - Limiting to a maximum of 5 cards per row to maintain readability
   *
   * @param width - The current width of the container element in pixels
   * @returns The number of cards to display per row (between 1 and 5)
   */
  const getRowSize = useCallback((width: number) => {
    if (width === 0) return 1;

    // Card minimum width: 280px + 12px gap = 292px per card
    const cardMinWidth = 292;
    const maxCards = Math.floor(width / cardMinWidth);

    // Ensure at least 1 card, maximum 5 cards per row
    return Math.max(1, Math.min(maxCards, 5));
  }, []);

  const [rowSize, setRowSize] = useState(() => getRowSize(containerWidth));

  /**
   * Track initial render to avoid unnecessary scroll resets
   */
  useEffect(() => {
    if (filteredNotes.length > 0 && !hasInitiallyRendered) {
      setHasInitiallyRendered(true);
    }
  }, [filteredNotes.length, hasInitiallyRendered]);

  /**
   * Resets scroll position to top when filters change (but not on initial render)
   *
   * This effect handles scrolling behavior when filters are changed:
   * 1. Skips scroll reset on initial render to prevent jarring UX
   * 2. Uses object reference comparison to detect actual filter changes
   * 3. Implements multiple scroll attempts at different intervals to ensure
   *    the scroll position is reliably reset even with async rendering
   *
   * The multiple scroll attempts are necessary because virtualized lists can
   * sometimes fail to scroll properly on the first attempt due to async rendering
   * and content height recalculations.
   */
  useEffect(() => {
    // Skip if this is the initial render
    if (!hasInitiallyRendered) {
      previousFiltersRef.current = filters;
      return;
    }

    // Check if filters object reference has actually changed (Zustand creates new objects)
    const hasFilterChanged = previousFiltersRef.current !== filters;

    // Skip if filters haven't changed
    if (!hasFilterChanged) {
      return;
    }

    // Always scroll to top when filters change, regardless of result count
    if (virtuosoRef.current) {
      // Use immediate scroll with behavior "auto" for more reliable results
      virtuosoRef.current.scrollToIndex({
        index: 0,
        behavior: "auto",
      });

      // Multiple delayed attempts to ensure scroll persistence
      const timeouts: NodeJS.Timeout[] = [];

      // Aggressive scroll attempts at different intervals
      [100, 200, 300, 500].forEach((delay) => {
        const timeoutId = setTimeout(() => {
          if (virtuosoRef.current) {
            virtuosoRef.current.scrollToIndex({
              index: 0,
              behavior: "auto",
            });
          }
        }, delay);
        timeouts.push(timeoutId);
      });

      // Cleanup all timeouts
      return () => {
        timeouts.forEach(clearTimeout);
      };
    }

    // Update the reference after processing
    previousFiltersRef.current = filters;
  }, [filters, hasInitiallyRendered]);

  /**
   * Monitors container size changes and updates the grid layout accordingly
   *
   * Uses ResizeObserver to detect container width changes and recalculate
   * the optimal number of cards per row. This ensures the grid layout remains
   * responsive as the user resizes the window or panel.
   *
   * The effect:
   * 1. Creates a ResizeObserver to monitor container width changes
   * 2. Takes initial measurements immediately on mount
   * 3. Updates containerWidth and rowSize state when changes occur
   * 4. Properly cleans up the observer on unmount
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newWidth = entry.contentRect.width;
        setContainerWidth(newWidth);
        setRowSize(getRowSize(newWidth));
      }
    });

    resizeObserver.observe(container);

    // Initial measurement
    const initialWidth = container.getBoundingClientRect().width;
    setContainerWidth(initialWidth);
    setRowSize(getRowSize(initialWidth));

    return () => {
      resizeObserver.disconnect();
    };
  }, [getRowSize]);

  /**
   * Groups notes into rows for grid layout based on the current row size
   *
   * This memoized computation transforms the flat list of filtered notes into
   * a two-dimensional array where each inner array represents a row in the grid.
   * The number of notes per row is determined by the rowSize state, which is
   * calculated based on container width.
   *
   * @returns A two-dimensional array where each inner array contains notes for one row
   */
  const noteRows = useMemo(() => {
    const rows: Array<Array<(typeof filteredNotes)[0]>> = [];
    for (let i = 0; i < filteredNotes.length; i += rowSize) {
      rows.push(filteredNotes.slice(i, i + rowSize));
    }
    return rows;
  }, [filteredNotes, rowSize]);

  /**
   * Handles retry attempts with exponential backoff for failed operations
   *
   * This function implements a sophisticated retry mechanism that:
   * 1. Prevents multiple simultaneous retry attempts
   * 2. Uses exponential backoff to avoid overwhelming failed services
   * 3. Implements progressive delays: 0ms → 1s → 2s → 4s → 5s (capped)
   * 4. Properly manages error states across both component and store
   * 5. Captures and logs detailed error information for debugging
   *
   * The exponential backoff strategy is particularly important for handling
   * transient failures that might resolve themselves after a short delay,
   * while preventing excessive retries that could worsen the situation.
   *
   * @returns A Promise that resolves when the retry attempt completes
   */
  const handleRetry = useCallback(async () => {
    if (isRetrying) return;

    setIsRetrying(true);
    setRetryCount((prev) => prev + 1);

    try {
      // Clear any existing errors before retry attempt
      resetError();
      setError(null);

      // Exponential backoff prevents overwhelming failed services
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

  /**
   * Reset retry count when notes successfully load to prevent unnecessary delays on future retries.
   */
  useEffect(() => {
    if (filteredNotes.length > 0 && !error && !componentError) {
      setRetryCount(0);
    }
  }, [filteredNotes.length, error, componentError]);

  /**
   * Renders a row of note cards with dynamic sizing and empty slot placeholders
   *
   * This callback function is used by react-virtuoso to render each row in the
   * virtualized grid. It:
   * 1. Renders actual note cards for available notes in the row
   * 2. Fills remaining slots with empty placeholders to maintain grid alignment
   * 3. Ensures proper key assignment for React's reconciliation algorithm
   *
   * The empty placeholders are important for maintaining consistent grid layout
   * when rows aren't completely filled (e.g., the last row of notes).
   *
   * @param index - The index of the row to render
   * @returns A React element representing a row of note cards or null if row doesn't exist
   */
  const renderNoteRow = React.useCallback(
    (index: number) => {
      const row = noteRows[index];
      if (!row) return null;

      return (
        <div className="virtual-grid-row">
          {/* Render actual note cards */}
          {row.map((note) => (
            <div key={note.path} className="virtual-grid-item">
              <NoteCard note={note} plugin={plugin} />
            </div>
          ))}

          {/* Fill empty slots only if needed to maintain layout */}
          {row.length < rowSize &&
            Array.from({ length: rowSize - row.length }).map((_, emptyIndex) => (
              <div
                key={`empty-row-${index}-slot-${row.length + emptyIndex}`}
                className="virtual-grid-item-empty"
              />
            ))}
        </div>
      );
    },
    [noteRows, plugin, rowSize]
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
          onRetry={handleRetry}
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
          onRetry={handleRetry}
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
   * Renders an empty state UI when no notes match the current filters
   *
   * This provides a user-friendly message and clear action when filters
   * result in no matching notes, helping users understand why they're
   * not seeing any content and how to resolve it.
   */
  if (filteredNotes.length === 0) {
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
   * Renders the virtualized grid of note cards using react-virtuoso
   *
   * This is the main render output when notes are successfully loaded and filtered.
   * It configures react-virtuoso with:
   * 1. Custom components for proper grid layout styling
   * 2. Performance optimizations (overscan, viewport increase)
   * 3. Fixed row height for consistent virtualization
   * 4. References for container measurements and scroll control
   */
  return (
    <div className="virtual-list-container" ref={containerRef}>
      <Virtuoso
        ref={virtuosoRef}
        totalCount={noteRows.length}
        itemContent={renderNoteRow}
        className="virtual-grid"
        style={{ height: "100%" }}
        components={{
          // Custom List component for grid styling
          List: React.forwardRef<HTMLDivElement>((props, ref) => (
            <div ref={ref} {...props} className="virtual-grid-list" />
          )),
          // Custom Item component for row wrapper styling
          Item: ({ children, ...props }) => (
            <div {...props} className="virtual-grid-row-wrapper">
              {children}
            </div>
          ),
        }}
        // Performance optimizations
        overscan={5} // Render extra items outside viewport
        increaseViewportBy={200} // Expand rendering area for smoother scrolling
        // Fixed row height for consistent virtualization
        // 180px (card) + 12px (margin) = 192px
        defaultItemHeight={192} // Row height including margins
      />
    </div>
  );
};
