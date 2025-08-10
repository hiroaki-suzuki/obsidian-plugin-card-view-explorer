import { useCallback, useEffect, useRef, useState } from "react";
import type { VirtuosoHandle } from "react-virtuoso";
import { ErrorCategory } from "../../core/errors/errorHandling";
import {
  useNoteGrid,
  useResponsiveRowSize,
  useRetryableRefreshNotes,
  useScrollToTopOnChange,
} from "../../hooks";
import type CardExplorerPlugin from "../../main";
import { useCardExplorerStore } from "../../store/cardExplorerStore";
import { EmptyState } from "./EmptyState";
import { ErrorFallback } from "./ErrorFallback";
import { LoadingState } from "./LoadingState";
import { VirtualizedNoteGrid } from "./VirtualizedNoteGrid";

/**
 * Props for VirtualList component
 */
interface VirtualListProps {
  /** Plugin instance for note operations and state management */
  plugin: CardExplorerPlugin;
}

/**
 * Main virtual list component for displaying notes in a responsive grid
 *
 * This component orchestrates the entire note display system, handling different states
 * (loading, error, empty, data) and integrating various hooks for responsive design,
 * virtualization, and user interactions. It serves as the primary interface between
 * the note data management system and the virtualized grid display.
 *
 * Key features:
 * - State-based rendering (loading, error, empty, grid)
 * - Responsive grid sizing based on container width
 * - Virtual scrolling for performance with large datasets
 * - Auto-scroll to top on filter changes
 * - Error handling with retry functionality
 * - Initial render tracking for UX optimizations
 */
export const VirtualList: React.FC<VirtualListProps> = ({ plugin }) => {
  const { filteredNotes, isLoading, error, filters } = useCardExplorerStore();

  const virtuosoRef = useRef<VirtuosoHandle>(null);
  // Track initial render to prevent unwanted scroll-to-top on component mount
  const [hasInitiallyRendered, setHasInitiallyRendered] = useState(false);
  const { rowSize, ref: containerRef } = useResponsiveRowSize();
  const { noteRows, totalRows } = useNoteGrid(filteredNotes, rowSize);

  // Set initial render flag only after first data load to avoid scroll interference
  useEffect(() => {
    if (filteredNotes.length > 0 && !hasInitiallyRendered) {
      setHasInitiallyRendered(true);
    }
  }, [filteredNotes.length, hasInitiallyRendered]);

  // Auto-scroll to top when filters change, but only after initial render
  useScrollToTopOnChange(virtuosoRef, filters, hasInitiallyRendered);

  const { retry } = useRetryableRefreshNotes(plugin);
  const handleRetry = useCallback(async () => {
    await retry();
  }, [retry]);

  // Render error state with retry functionality
  if (error) {
    return (
      <ErrorFallback
        error={new Error(error)}
        onRetry={handleRetry}
        category={ErrorCategory.API}
        context={{
          component: "VirtualList",
          operation: "loadNotes",
          isLoading,
        }}
        message="Failed to load notes from your vault."
        retryText={isLoading ? "Retrying..." : "Retry"}
        showRetry={!isLoading}
      />
    );
  }

  // Render loading state during data fetching
  if (isLoading) {
    return <LoadingState />;
  }

  // Render empty state when no notes match current filters
  if (filteredNotes.length === 0) {
    return <EmptyState />;
  }

  // Render the main virtualized grid with notes
  return (
    <VirtualizedNoteGrid
      noteRows={noteRows}
      totalRows={totalRows}
      plugin={plugin}
      virtuosoRef={virtuosoRef}
      containerRef={containerRef}
    />
  );
};
