import type React from "react";
import type CardExplorerPlugin from "../main";
import { useCardExplorerStore } from "../store/cardExplorerStore";
import type { NoteData } from "../types";
import * as styles from "./NoteCard.css";

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
  const handleNoteClick = () => {
    // Open the note in the active pane using Obsidian's workspace API
    plugin.app.workspace.getLeaf().openFile(note.file);
  };

  /**
   * Handle pin toggle button click
   * Prevents event bubbling to avoid opening the note
   */
  const handlePinToggle = (event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent note click event
    togglePin(note.path);
  };

  /**
   * Format the last modified date for display
   */
  const formatDate = (date: Date): string => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      // Show time for today
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffInHours < 24 * 7) {
      // Show day of week for this week
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      // Show date for older notes
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  return (
    <div
      className={isPinned ? styles.noteCardPinned : styles.noteCard}
      onClick={handleNoteClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleNoteClick();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Open note: ${note.title}`}
    >
      {/* Pin toggle button */}
      <button
        type="button"
        className={`${styles.pinButtonVariants[isPinned ? "active" : "default"]} pin-button`}
        onClick={handlePinToggle}
        title={isPinned ? "Unpin note" : "Pin note"}
        aria-label={isPinned ? "Unpin note" : "Pin note"}
      >
        <div className={styles.pinIcon} />
      </button>

      {/* Note content */}
      <div className={styles.content}>
        {/* Title */}
        <h3 className={styles.title} title={note.title}>
          {note.title}
        </h3>

        {/* Preview text */}
        <div className={styles.preview} title={note.preview}>
          {note.preview}
        </div>

        {/* Footer with date and folder */}
        <div className={styles.footer}>
          <span className={styles.date} title={note.lastModified.toLocaleString()}>
            {formatDate(note.lastModified)}
          </span>
          {note.folder && (
            <span className={styles.folder} title={note.folder}>
              {note.folder}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
