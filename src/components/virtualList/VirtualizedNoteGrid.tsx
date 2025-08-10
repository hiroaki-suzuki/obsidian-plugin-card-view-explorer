import React, { useCallback } from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import type { GridRow } from "../../hooks/useNoteGrid";
import type CardExplorerPlugin from "../../main";
import { NoteGridRow } from "./NoteGridRow";

/**
 * Props for VirtualizedNoteGrid component
 */
export interface VirtualizedNoteGridProps {
  /** Array of grid rows containing notes and layout information */
  noteRows: GridRow[];
  /** Total number of rows in the grid for virtualization */
  totalRows: number;
  /** Plugin instance for note operations and state management */
  plugin: CardExplorerPlugin;
  /** Ref to the Virtuoso instance for programmatic control */
  virtuosoRef: React.Ref<VirtuosoHandle>;
  /** Ref to the container element for measuring and positioning */
  containerRef: React.Ref<HTMLDivElement>;
}

/**
 * High-performance virtualized grid component for displaying note cards
 *
 * This component uses react-virtuoso to efficiently render large collections of notes
 * in a responsive grid layout. It only renders visible rows plus a small buffer,
 * providing excellent performance even with thousands of notes.
 *
 * Key optimizations:
 * - Virtual scrolling with configurable overscan for smooth scrolling
 * - Memoized row rendering to prevent unnecessary re-renders
 * - Responsive height calculation and viewport management
 */
export const VirtualizedNoteGrid: React.FC<VirtualizedNoteGridProps> = ({
  noteRows,
  totalRows,
  plugin,
  virtuosoRef,
  containerRef,
}) => {
  /**
   * Renders a single row of the virtual grid
   * Memoized to prevent unnecessary re-renders when other props change
   */
  const renderNoteRow = useCallback(
    (index: number) => {
      const row = noteRows[index];
      return <NoteGridRow row={row} rowIndex={index} plugin={plugin} />;
    },
    [noteRows, plugin]
  );

  return (
    <div className="virtual-list-container" ref={containerRef}>
      <Virtuoso
        ref={virtuosoRef}
        totalCount={totalRows}
        itemContent={renderNoteRow}
        className="virtual-grid"
        style={{ height: "100%" }}
        components={{
          // Custom List component for additional CSS styling
          List: React.forwardRef<HTMLDivElement>((props, ref) => (
            <div ref={ref} {...props} className="virtual-grid-list" />
          )),

          // Custom Item wrapper for row-level styling
          Item: ({ children, ...props }) => (
            <div {...props} className="virtual-grid-row-wrapper">
              {children}
            </div>
          ),
        }}
        // Performance optimizations for smooth scrolling
        overscan={5} // Pre-render 5 items above and below viewport
        increaseViewportBy={200} // Extend virtual viewport by 200px
        defaultItemHeight={192} // Estimated row height for initial render
      />
    </div>
  );
};
