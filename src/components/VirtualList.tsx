import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { ErrorCategory, handleError } from "../core/errors/errorHandling";
import { useErrorFallback } from "../hooks";
import type CardExplorerPlugin from "../main";
import { useCardExplorerStore } from "../store/cardExplorerStore";
import { ErrorFallback } from "./ErrorFallback";
import { NoteCard } from "./NoteCard";
import { ObsidianIcon } from "./ObsidianIcon";

interface VirtualListProps {
  plugin: CardExplorerPlugin;
}

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

  const getRowSize = useCallback((width: number) => {
    if (width === 0) return 1;

    const cardMinWidth = 292;
    const maxCards = Math.floor(width / cardMinWidth);

    return Math.max(1, Math.min(maxCards, 5));
  }, []);

  const [rowSize, setRowSize] = useState(() => getRowSize(containerWidth));

  useEffect(() => {
    if (filteredNotes.length > 0 && !hasInitiallyRendered) {
      setHasInitiallyRendered(true);
    }
  }, [filteredNotes.length, hasInitiallyRendered]);

  useEffect(() => {
    if (!hasInitiallyRendered) {
      previousFiltersRef.current = filters;
      return;
    }

    const hasFilterChanged = previousFiltersRef.current !== filters;

    if (!hasFilterChanged) {
      return;
    }

    if (virtuosoRef.current) {
      virtuosoRef.current.scrollToIndex({
        index: 0,
        behavior: "auto",
      });

      const timeouts: NodeJS.Timeout[] = [];

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

      return () => {
        timeouts.forEach(clearTimeout);
      };
    }

    previousFiltersRef.current = filters;
  }, [filters, hasInitiallyRendered]);

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

    const initialWidth = container.getBoundingClientRect().width;
    setContainerWidth(initialWidth);
    setRowSize(getRowSize(initialWidth));

    return () => {
      resizeObserver.disconnect();
    };
  }, [getRowSize]);

  const noteRows = useMemo(() => {
    const rows: Array<Array<(typeof filteredNotes)[0]>> = [];
    for (let i = 0; i < filteredNotes.length; i += rowSize) {
      rows.push(filteredNotes.slice(i, i + rowSize));
    }
    return rows;
  }, [filteredNotes, rowSize]);

  const handleRetry = useCallback(async () => {
    if (isRetrying) return;

    setIsRetrying(true);
    setRetryCount((prev) => prev + 1);

    try {
      resetError();
      setError(null);

      if (retryCount > 0) {
        const delay = Math.min(1000 * 2 ** (retryCount - 1), 5000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      await refreshNotes(plugin.app);

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

  useEffect(() => {
    if (filteredNotes.length > 0 && !error && !componentError) {
      setRetryCount(0);
    }
  }, [filteredNotes.length, error, componentError]);

  const renderNoteRow = React.useCallback(
    (index: number) => {
      const row = noteRows[index];
      if (!row) return null;

      return (
        <div className="virtual-grid-row">
          {}
          {row.map((note) => (
            <div key={note.path} className="virtual-grid-item">
              <NoteCard note={note} plugin={plugin} />
            </div>
          ))}

          {}
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
        overscan={5}
        increaseViewportBy={200}
        defaultItemHeight={192}
      />
    </div>
  );
};
