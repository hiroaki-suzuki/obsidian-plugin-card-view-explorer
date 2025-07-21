import { setIcon } from "obsidian";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
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
  const { filteredNotes, isLoading, error, refreshNotes, setError, filters } =
    useCardExplorerStore();
  const { error: componentError, resetError, captureError } = useErrorFallback();
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [hasInitiallyRendered, setHasInitiallyRendered] = useState(false);
  const previousFiltersRef = useRef<any>(null);

  /**
   * Calculate dynamic row size based on actual container width.
   * Uses the actual available space instead of viewport width.
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
   * Reset scroll position to top when filters change (but not on initial render)
   * Uses object reference comparison for more reliable change detection
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
   * Handle container resize using ResizeObserver for accurate measurements
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
   * Group notes into rows based on dynamic row size
   */
  const noteRows = useMemo(() => {
    const rows: Array<Array<(typeof filteredNotes)[0]>> = [];
    for (let i = 0; i < filteredNotes.length; i += rowSize) {
      rows.push(filteredNotes.slice(i, i + rowSize));
    }
    return rows;
  }, [filteredNotes, rowSize]);

  /**
   * Enhanced retry mechanism with exponential backoff to prevent overwhelming failed services.
   * Implements progressive delays: 0ms → 1s → 2s → 4s → 5s (capped).
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
   * Renders a row of note cards with dynamic sizing.
   * Each row contains the appropriate number of cards for the current viewport.
   */
  const renderNoteRow = React.useCallback(
    (index: number) => {
      const row = noteRows[index];
      if (!row) return null;

      return (
        <div className="virtual-grid-row">
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
   * Handle empty state
   */
  if (filteredNotes.length === 0) {
    /**
     * Empty state icon using Obsidian's setIcon
     */
    const EmptyStateIcon: React.FC = () => {
      const iconRef = useRef<HTMLDivElement>(null);

      useEffect(() => {
        if (iconRef.current) {
          setIcon(iconRef.current, "file-search");
        }
      }, []);

      return <div ref={iconRef} className="empty-icon" />;
    };

    return (
      <div className="virtual-list-container">
        <div className="virtual-list-empty">
          <EmptyStateIcon />
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
   * Render virtualized grid of note cards as rows
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
          List: React.forwardRef<HTMLDivElement>((props, ref) => (
            <div ref={ref} {...props} className="virtual-grid-list" />
          )),
          Item: ({ children, ...props }) => (
            <div {...props} className="virtual-grid-row-wrapper">
              {children}
            </div>
          ),
        }}
        // Performance optimizations
        overscan={5}
        increaseViewportBy={200}
        // Fixed row height for consistent virtualization
        // 180px (card) + 12px (margin) = 192px
        defaultItemHeight={192} // Row height including margins
      />
    </div>
  );
};
