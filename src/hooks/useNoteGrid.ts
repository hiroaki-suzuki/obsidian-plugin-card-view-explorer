import { useMemo } from "react";
import type { NoteData } from "../types/note";

/**
 * Represents a single row in the note grid layout.
 */
export interface GridRow {
  /** Array of notes in this row */
  notes: NoteData[];
  /** Number of empty slots in this row (0 when row is full) */
  emptySlots: number;
}

/**
 * Return type for the useNoteGrid hook.
 */
export interface UseNoteGridReturn {
  /** Array of grid rows containing notes and layout information */
  noteRows: GridRow[];
  /** Total number of rows in the grid */
  totalRows: number;
}

/**
 * Custom hook that transforms a flat array of notes into a grid layout structure.
 *
 * This hook is designed for use with react-virtuoso to efficiently render large
 * collections of notes in a responsive grid format. It automatically calculates
 * empty slots for proper grid alignment and provides memoized results for performance.
 *
 * @param filteredNotes - Array of notes to be arranged in grid format
 * @param rowSize - Number of notes per row (must be positive integer)
 * @returns Object containing grid rows and metadata
 */
export const useNoteGrid = (filteredNotes: NoteData[], rowSize: number): UseNoteGridReturn => {
  const noteRows = useMemo<GridRow[]>(() => {
    // Early return for invalid inputs to avoid unnecessary computation
    if (!filteredNotes.length || !Number.isInteger(rowSize) || rowSize <= 0) {
      return [];
    }

    const rows: GridRow[] = [];

    // Process notes in chunks of rowSize to create grid rows
    for (let i = 0; i < filteredNotes.length; i += rowSize) {
      const rowNotes = filteredNotes.slice(i, i + rowSize);
      // Calculate empty slots for grid alignment (last row may be incomplete)
      const emptySlots = Math.max(0, rowSize - rowNotes.length);

      rows.push({
        notes: rowNotes,
        emptySlots,
      });
    }

    return rows;
  }, [filteredNotes, rowSize]);

  return {
    noteRows,
    totalRows: noteRows.length,
  };
};
