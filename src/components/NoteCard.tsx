import type React from "react";
import type CardExplorerPlugin from "../main";
import { useCardExplorerStore } from "../store/cardExplorerStore";
import type { NoteData } from "../types";

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
      className={`note-card ${isPinned ? "pinned" : ""}`}
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
        <span className="note-card-date" title={note.lastModified.toLocaleString()}>
          {formatDate(note.lastModified)}
        </span>
      </div>
    </div>
  );
};
