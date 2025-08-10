import React from "react";
import type { GridRow } from "../../hooks/useNoteGrid";
import type CardExplorerPlugin from "../../main";
import { NoteCard } from "./NoteCard";

/**
 * Props for NoteGridRow component
 */
export interface NoteGridRowProps {
  /** Grid row data containing notes and layout information */
  row: GridRow;
  /** Index of this row in the virtual list for key generation */
  rowIndex: number;
  /** Plugin instance for note operations and state management */
  plugin: CardExplorerPlugin;
}

/**
 * Renders a single row in the virtualized note grid layout
 *
 * This component handles the rendering of a row containing multiple note cards
 * in a grid layout. It fills partial rows with empty slots to maintain consistent
 * grid alignment across all rows.
 */
export const NoteGridRow: React.FC<NoteGridRowProps> = React.memo(({ row, rowIndex, plugin }) => {
  return (
    <div className="virtual-grid-row">
      {row.notes.map((note) => (
        <div key={note.path} className="virtual-grid-item">
          <NoteCard note={note} plugin={plugin} />
        </div>
      ))}

      {/* Fill remaining slots with empty placeholders to maintain grid alignment */}
      {row.emptySlots > 0 &&
        Array.from({ length: row.emptySlots }).map((_, emptyIndex) => (
          <div
            key={`empty-row-${rowIndex}-slot-${row.notes.length + emptyIndex}`}
            className="virtual-grid-item-empty"
            aria-hidden="true"
          />
        ))}
    </div>
  );
});
