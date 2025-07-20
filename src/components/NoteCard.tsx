import type React from "react";
import { useCallback } from "react";
import type CardExplorerPlugin from "../main";
import { useCardExplorerStore } from "../store/cardExplorerStore";
import type { NoteData } from "../types";
import { formatRelativeDate, getDisplayDate } from "../utils/dateUtils";
import { ErrorCategory, handleError, safeSync } from "../utils/errorHandling";

interface NoteCardProps {
  /** Note data to display in the card */
  note: NoteData;
  /** Plugin instance for accessing Obsidian APIs */
  plugin: CardExplorerPlugin;
}

/**
 * NoteCard Component
 *
 * Displays an individual note as an interactive card with comprehensive metadata.
 * Provides one-click access to notes and pin management functionality.
 *
 * Features:
 * - Click to open note in Obsidian workspace
 * - Pin/unpin notes with visual indicators
 * - Display tags (maximum 3 visible + count)
 * - Show relative dates with fallback to absolute dates
 * - Keyboard accessibility (Enter/Space to open)
 * - Comprehensive error handling for all interactions
 *
 * Design decisions:
 * - Uses Obsidian's workspace API for seamless note opening
 * - Integrates with Zustand store for pin state management
 * - Implements defensive error handling for all user interactions
 */
export const NoteCard: React.FC<NoteCardProps> = ({ note, plugin }) => {
  const { pinnedNotes, togglePin } = useCardExplorerStore();

  const isPinned = pinnedNotes.has(note.path);

  /**
   * Handles note card click to open the note in Obsidian's active pane.
   * Uses getLeaf() to respect user's current workspace layout.
   */
  const handleNoteClick = useCallback(() => {
    try {
      // getLeaf() returns the active leaf to maintain user's workspace context
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
   * Handles pin toggle button click while preventing event bubbling.
   * Event propagation must be stopped to avoid triggering note opening.
   */
  const handlePinToggle = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation(); // Essential to prevent handleNoteClick from firing

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
   * Get the display date prioritizing frontmatter 'updated' field over file modification time.
   */
  const displayDate = getDisplayDate(note);

  /**
   * Formats display date with defensive error handling to prevent UI crashes.
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
   * Handles keyboard accessibility for note opening.
   * Supports standard accessibility patterns (Enter and Space keys).
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      try {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault(); // Prevent default scrolling behavior for Space
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
          <span className="pin-icon" />
        </button>
      </div>

      {/* Preview text */}
      <div className="note-card-preview" title={note.preview}>
        {note.preview}
      </div>

      {/* Tags with overflow handling - show max 3 tags + count indicator */}
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
