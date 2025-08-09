import type React from "react";
import { useCallback } from "react";
import { ErrorCategory, handleError } from "../core/errors/errorHandling";
import { formatRelativeDate, getDisplayDate } from "../lib/dateUtils";
import type CardExplorerPlugin from "../main";
import { useCardExplorerStore } from "../store/cardExplorerStore";
import type { NoteData } from "../types";

/** Props for {@link NoteCard}. */
interface NoteCardProps {
  /** The note to display. */
  note: NoteData;
  /** Plugin instance for accessing Obsidian APIs. */
  plugin: CardExplorerPlugin;
}

/**
 * Renders a single note as an interactive card.
 *
 * Uses the Obsidian workspace API to open files and Zustand store to persist
 * pinned state across sessions.
 */
export const NoteCard: React.FC<NoteCardProps> = ({ note, plugin }) => {
  const { pinnedNotes, togglePin } = useCardExplorerStore();

  const isPinned = pinnedNotes.has(note.path);

  const handleNoteClick = useCallback(() => {
    try {
      // Open in the active pane to respect the user's workspace layout.
      plugin.app.workspace.getLeaf().openFile(note.file);
    } catch (error) {
      handleError(error, ErrorCategory.API, {
        operation: "openFile",
        notePath: note.path,
        noteTitle: note.title,
      });
    }
  }, [plugin.app.workspace, note.file, note.path, note.title]);

  const handlePinToggle = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation(); // prevent click from also opening the note
      togglePin(note.path);
    },
    [togglePin, note.path]
  );

  const displayDate = getDisplayDate(note);

  const formatDate = useCallback((date: Date): string => {
    return formatRelativeDate(date, new Date());
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault(); // space scrolls the page by default
        handleNoteClick();
      }
    },
    [handleNoteClick]
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
          <span className="pin-icon" />
        </button>
      </div>

      <div className="note-card-preview" title={note.preview}>
        {note.preview}
      </div>

      {note.tags.length > 0 && (
        <div className="note-card-tags">
          {note.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="note-card-tag">
              #{tag}
            </span>
          ))}
          {note.tags.length > 3 && (
            // Display count of remaining tags to avoid cluttering the card.
            <span className="note-card-tag">+{note.tags.length - 3}</span>
          )}
        </div>
      )}

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
