import type React from "react";
import { useCallback } from "react";
import type CardExplorerPlugin from "../main";
import { useCardExplorerStore } from "../store/cardExplorerStore";
import type { NoteData } from "../types";
import { formatRelativeDate, getDisplayDate } from "../utils/dateUtils";
import { ErrorCategory, handleError, safeSync } from "../utils/errorHandling";

interface NoteCardProps {
  note: NoteData;
  plugin: CardExplorerPlugin;
}

/**
 * Individual note card component
 *
 * Displays a single note with title, preview, date, and pin toggle.
 * Handles click events to open notes and integrates with Zustand store for pin state.
 */
export const NoteCard: React.FC<NoteCardProps> = ({ note, plugin }) => {
  const { pinnedNotes, togglePin } = useCardExplorerStore();

  const isPinned = pinnedNotes.has(note.path);

  /**
   * Handle clicking on the note card to open it in the active pane
   */
  const handleNoteClick = useCallback(() => {
    try {
      // Open the note in the active pane using Obsidian's workspace API
      plugin.app.workspace.getLeaf().openFile(note.file);
    } catch (error) {
      handleError(error, ErrorCategory.API, {
        operation: "openFile",
        notePath: note.path,
        noteTitle: note.title,
      });
    }
  }, [plugin.app.workspace, note.file, note.path, note.title]);

  /**
   * Handle pin toggle button click
   * Prevents event bubbling to avoid opening the note
   */
  const handlePinToggle = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation(); // Prevent note click event

      try {
        togglePin(note.path);
      } catch (error) {
        handleError(error, ErrorCategory.DATA, {
          operation: "togglePin",
          notePath: note.path,
          noteTitle: note.title,
          currentPinState: isPinned,
        });
      }
    },
    [togglePin, note.path, note.title, isPinned]
  );

  /**
   * Get the display date for this note (frontmatter 'updated' field or file modification time)
   */
  const displayDate = getDisplayDate(note);

  /**
   * Format the display date for display with error handling
   */
  const formatDate = useCallback(
    (date: Date): string => {
      return safeSync(
        () => formatRelativeDate(date),
        "Invalid date", // Fallback value
        ErrorCategory.DATA,
        {
          operation: "formatDate",
          date: date.toString(),
          notePath: note.path,
        }
      );
    },
    [note.path]
  );

  /**
   * Safe keyboard event handler
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      try {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleNoteClick();
        }
      } catch (error) {
        handleError(error, ErrorCategory.UI, {
          operation: "handleKeyDown",
          key: e.key,
          notePath: note.path,
        });
      }
    },
    [handleNoteClick, note.path]
  );

  return (
    <div
      className={`note-card ${isPinned ? "pinned" : ""}`}
      onClick={handleNoteClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Open note: ${note.title}`}
    >
      {/* Note header with title and pin button */}
      <div className="note-card-header">
        <h3 className="note-card-title" title={note.title}>
          {note.title}
        </h3>

        <button
          type="button"
          className={`pin-button ${isPinned ? "pinned" : ""}`}
          onClick={handlePinToggle}
          title={isPinned ? "Unpin note" : "Pin note"}
          aria-label={isPinned ? "Unpin note" : "Pin note"}
        >
          {isPinned ? "📌" : "📍"}
        </button>
      </div>

      {/* Preview text */}
      <div className="note-card-preview" title={note.preview}>
        {note.preview}
      </div>

      {/* Tags if available */}
      {note.tags.length > 0 && (
        <div className="note-card-tags">
          {note.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="note-card-tag">
              #{tag}
            </span>
          ))}
          {note.tags.length > 3 && <span className="note-card-tag">+{note.tags.length - 3}</span>}
        </div>
      )}

      {/* Footer with folder and date */}
      <div className="note-card-footer">
        {note.folder && (
          <span className="note-card-folder" title={note.folder}>
            {note.folder}
          </span>
        )}
        <span className="note-card-date" title={displayDate.toLocaleString()}>
          {formatDate(displayDate)}
        </span>
      </div>
    </div>
  );
};
