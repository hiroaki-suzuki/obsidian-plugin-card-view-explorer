import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type CardExplorerPlugin from "../main";
import { useCardExplorerStore } from "../store/cardExplorerStore";
import type { NoteData } from "../types";
import { NoteCard } from "./NoteCard";

vi.mock("../store/cardExplorerStore", () => ({
  useCardExplorerStore: vi.fn(),
}));

const mockTogglePin = vi.fn();
const mockUseCardExplorerStore = vi.mocked(useCardExplorerStore);

const createNote = (overrides: Partial<NoteData> = {}): NoteData => ({
  file: {
    path: "test-note.md",
    name: "test-note.md",
    basename: "test-note",
  } as any,
  title: "Test Note",
  path: "test-note.md",
  preview: "This is a test note\nwith multiple lines\nof content",
  lastModified: new Date("2024-01-15T10:30:00Z"),
  frontmatter: { updated: "2024-01-15" },
  tags: ["test", "example"],
  folder: "Notes",
  ...overrides,
});

const createPlugin = (openFile = vi.fn()): CardExplorerPlugin =>
  ({
    app: {
      workspace: {
        getLeaf: vi.fn(() => ({ openFile })),
      },
    },
  }) as unknown as CardExplorerPlugin;

describe("NoteCard", () => {
  const user = userEvent.setup();
  const note = createNote();
  const plugin = createPlugin();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCardExplorerStore.mockReturnValue({
      pinnedNotes: new Set<string>(),
      togglePin: mockTogglePin,
    });
  });

  describe("Rendering", () => {
    it("shows title, preview, folder and pin button", () => {
      render(<NoteCard note={note} plugin={plugin} />);

      expect(screen.getByText("Test Note")).toBeInTheDocument();
      expect(screen.getByText(/This is a test note/)).toBeInTheDocument();
      expect(screen.getByText("Notes")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Pin note" })).toBeInTheDocument();
    });

    it("omits folder when not provided", () => {
      const noteWithoutFolder = createNote({ folder: "" });
      render(<NoteCard note={noteWithoutFolder} plugin={plugin} />);

      expect(screen.getByText("Test Note")).toBeInTheDocument();
      expect(screen.queryByText("Notes")).not.toBeInTheDocument();
    });

    it("renders pinned state", () => {
      mockUseCardExplorerStore.mockReturnValue({
        pinnedNotes: new Set([note.path]),
        togglePin: mockTogglePin,
      });

      render(<NoteCard note={note} plugin={plugin} />);
      expect(screen.getByRole("button", { name: "Unpin note" })).toBeInTheDocument();
    });

    it("shows long text in tooltip", () => {
      const longNote = createNote({
        title: "This is a very long note title that should appear in full in tooltip",
        preview:
          "This is a very long preview text that might be truncated in the card but shown in tooltip",
      });

      render(<NoteCard note={longNote} plugin={plugin} />);

      expect(screen.getByText(longNote.title)).toHaveAttribute("title", longNote.title);
      expect(screen.getByText(longNote.preview)).toHaveAttribute("title", longNote.preview);
    });
  });

  describe("Interactions", () => {
    it("opens file on click", async () => {
      const openFile = vi.fn();
      const clickPlugin = createPlugin(openFile);

      render(<NoteCard note={note} plugin={clickPlugin} />);
      await user.click(screen.getByRole("button", { name: /Open note/ }));

      expect(openFile).toHaveBeenCalledWith(note.file);
    });

    it("opens file with keyboard", async () => {
      const openFile = vi.fn();
      const keyboardPlugin = createPlugin(openFile);

      render(<NoteCard note={note} plugin={keyboardPlugin} />);
      const card = screen.getByRole("button", { name: /Open note/ });

      card.focus();
      await user.keyboard("{Enter}");
      await user.keyboard("[Space]");

      expect(openFile).toHaveBeenCalledTimes(2);
      expect(openFile).toHaveBeenLastCalledWith(note.file);
    });

    it("ignores other keys", async () => {
      const openFile = vi.fn();
      const keyboardPlugin = createPlugin(openFile);

      render(<NoteCard note={note} plugin={keyboardPlugin} />);
      const card = screen.getByRole("button", { name: /Open note/ });

      card.focus();
      await user.keyboard("a{Tab}{Escape}");

      expect(openFile).not.toHaveBeenCalled();
    });

    it("toggles pin without opening note", async () => {
      const openFile = vi.fn();
      const pinPlugin = createPlugin(openFile);

      render(<NoteCard note={note} plugin={pinPlugin} />);
      await user.click(screen.getByRole("button", { name: "Pin note" }));

      expect(mockTogglePin).toHaveBeenCalledWith(note.path);
      expect(openFile).not.toHaveBeenCalled();
    });
  });

  describe("Tags", () => {
    it("shows first three tags and overflow count", () => {
      const tagNote = createNote({ tags: ["tag1", "tag2", "tag3", "tag4", "tag5"] });
      render(<NoteCard note={tagNote} plugin={plugin} />);

      expect(screen.getByText("#tag1")).toBeInTheDocument();
      expect(screen.getByText("#tag2")).toBeInTheDocument();
      expect(screen.getByText("#tag3")).toBeInTheDocument();
      expect(screen.getByText("+2")).toBeInTheDocument();
      expect(screen.queryByText("#tag4")).not.toBeInTheDocument();
      expect(screen.queryByText("#tag5")).not.toBeInTheDocument();
    });
  });

  describe("Dates", () => {
    it("shows time for today's notes", () => {
      const today = createNote({ lastModified: new Date(), frontmatter: null });
      render(<NoteCard note={today} plugin={plugin} />);

      const timeRegex = /\d{1,2}:\d{2}/;
      expect(screen.getByText(timeRegex)).toBeInTheDocument();
    });

    it("uses frontmatter date with tooltip", () => {
      render(<NoteCard note={note} plugin={plugin} />);
      const expected = new Date("2024-01-15");
      expect(screen.getByTitle(expected.toLocaleString())).toBeInTheDocument();
    });

    it("falls back to lastModified when frontmatter invalid", () => {
      const invalid = createNote({
        lastModified: new Date("2024-01-20T10:30:00Z"),
        frontmatter: { updated: "invalid" },
      });
      render(<NoteCard note={invalid} plugin={plugin} />);

      expect(screen.getByTitle(invalid.lastModified.toLocaleString())).toBeInTheDocument();
    });

    it("handles invalid date gracefully", () => {
      const invalidDate = createNote({ lastModified: new Date("invalid"), frontmatter: null });
      render(<NoteCard note={invalidDate} plugin={plugin} />);

      expect(screen.getByText("Invalid date")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has expected ARIA attributes", () => {
      render(<NoteCard note={note} plugin={plugin} />);

      const card = screen.getByRole("button", { name: /Open note/ });
      expect(card).toHaveAttribute("tabIndex", "0");
      expect(card).toHaveAttribute("aria-label", "Open note: Test Note");
      expect(screen.getByRole("button", { name: "Pin note" })).toHaveAttribute(
        "aria-label",
        "Pin note"
      );
    });
  });

  describe("Error handling", () => {
    it("handles openFile errors", async () => {
      const openFile = vi.fn(() => {
        throw new Error("Failed to open file");
      });
      const errorPlugin = createPlugin(openFile);
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      render(<NoteCard note={note} plugin={errorPlugin} />);
      await user.click(screen.getByRole("button", { name: /Open note/ }));

      expect(openFile).toHaveBeenCalledWith(note.file);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("handles keyboard errors", async () => {
      const openFile = vi.fn(() => {
        throw new Error("Failed to open file via keyboard");
      });
      const errorPlugin = createPlugin(openFile);
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      render(<NoteCard note={note} plugin={errorPlugin} />);
      const card = screen.getByRole("button", { name: /Open note/ });
      card.focus();
      await user.keyboard("{Enter}");

      expect(openFile).toHaveBeenCalledWith(note.file);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
