import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type CardExplorerPlugin from "../main";
import { useCardExplorerStore } from "../store/cardExplorerStore";
import type { NoteData } from "../types";
import { NoteCard } from "./NoteCard";

// Mock the store
const mockTogglePin = vi.fn();

vi.mock("../store/cardExplorerStore", () => ({
  useCardExplorerStore: vi.fn(),
}));

const mockUseCardExplorerStore = vi.mocked(useCardExplorerStore);

describe("NoteCard", () => {
  const mockNote: NoteData = {
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
  };

  const mockPlugin = {
    app: {
      workspace: {
        getLeaf: vi.fn(() => ({
          openFile: vi.fn(),
        })),
      },
    },
  } as any as CardExplorerPlugin;

  beforeEach(() => {
    vi.clearAllMocks();
    // Set default mock return value
    mockUseCardExplorerStore.mockReturnValue({
      pinnedNotes: new Set<string>(),
      togglePin: mockTogglePin,
    });
  });

  it("should render note card with title, preview, and date", () => {
    render(<NoteCard note={mockNote} plugin={mockPlugin} />);

    expect(screen.getByText("Test Note")).toBeInTheDocument();
    expect(screen.getByText(/This is a test note/)).toBeInTheDocument();
    expect(screen.getByText("Notes")).toBeInTheDocument();
  });

  it("should handle note click to open file", () => {
    const mockOpenFile = vi.fn();
    const mockGetLeaf = vi.fn(() => ({ openFile: mockOpenFile }));
    const pluginWithMock = {
      ...mockPlugin,
      app: {
        workspace: {
          getLeaf: mockGetLeaf,
        },
      },
    } as any;

    render(<NoteCard note={mockNote} plugin={pluginWithMock} />);

    const noteCard = screen.getByRole("button", { name: /Open note: Test Note/ });
    fireEvent.click(noteCard);

    expect(mockGetLeaf).toHaveBeenCalled();
    expect(mockOpenFile).toHaveBeenCalledWith(mockNote.file);
  });

  it("should render pin button", () => {
    render(<NoteCard note={mockNote} plugin={mockPlugin} />);

    const pinButton = screen.getByRole("button", { name: "Pin note" });
    expect(pinButton).toBeInTheDocument();
  });

  it("should format dates correctly", () => {
    // Test with a recent date (today) and no frontmatter updated field
    const recentNote = {
      ...mockNote,
      lastModified: new Date(),
      frontmatter: null, // No frontmatter, should use lastModified
    };

    render(<NoteCard note={recentNote} plugin={mockPlugin} />);

    // Should show time for today's notes
    const timeRegex = /\d{1,2}:\d{2}/;
    expect(screen.getByText(timeRegex)).toBeInTheDocument();
  });

  it("should handle keyboard navigation", () => {
    const mockOpenFile = vi.fn();
    const mockGetLeaf = vi.fn(() => ({ openFile: mockOpenFile }));
    const pluginWithMock = {
      ...mockPlugin,
      app: {
        workspace: {
          getLeaf: mockGetLeaf,
        },
      },
    } as any;

    render(<NoteCard note={mockNote} plugin={pluginWithMock} />);

    const noteCard = screen.getByRole("button", { name: /Open note: Test Note/ });

    // Test Enter key
    fireEvent.keyDown(noteCard, { key: "Enter" });
    expect(mockOpenFile).toHaveBeenCalledWith(mockNote.file);

    // Test Space key
    fireEvent.keyDown(noteCard, { key: " " });
    expect(mockOpenFile).toHaveBeenCalledTimes(2);
  });

  it("should handle pin button click", () => {
    render(<NoteCard note={mockNote} plugin={mockPlugin} />);

    const pinButton = screen.getByRole("button", { name: "Pin note" });
    fireEvent.click(pinButton);

    expect(mockTogglePin).toHaveBeenCalledWith(mockNote.path);
  });

  it("should prevent note opening when pin button is clicked", () => {
    const mockOpenFile = vi.fn();
    const mockGetLeaf = vi.fn(() => ({ openFile: mockOpenFile }));
    const pluginWithMock = {
      ...mockPlugin,
      app: {
        workspace: {
          getLeaf: mockGetLeaf,
        },
      },
    } as any;

    render(<NoteCard note={mockNote} plugin={pluginWithMock} />);

    const pinButton = screen.getByRole("button", { name: "Pin note" });
    fireEvent.click(pinButton);

    // Pin toggle should be called but note should not open
    expect(mockTogglePin).toHaveBeenCalledWith(mockNote.path);
    expect(mockOpenFile).not.toHaveBeenCalled();
  });

  it("should show pinned state when note is pinned", () => {
    // Mock store with pinned note
    mockUseCardExplorerStore.mockReturnValue({
      pinnedNotes: new Set([mockNote.path]),
      togglePin: mockTogglePin,
    });

    render(<NoteCard note={mockNote} plugin={mockPlugin} />);

    const pinButton = screen.getByRole("button", { name: "Unpin note" });
    expect(pinButton).toBeInTheDocument();
  });

  it("should handle note without folder", () => {
    const noteWithoutFolder = {
      ...mockNote,
      folder: "",
    };

    render(<NoteCard note={noteWithoutFolder} plugin={mockPlugin} />);

    expect(screen.getByText("Test Note")).toBeInTheDocument();
    expect(screen.queryByText("Notes")).not.toBeInTheDocument();
  });

  it("should format date for this week", () => {
    const thisWeekNote = {
      ...mockNote,
      lastModified: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      frontmatter: null, // No frontmatter, should use lastModified
    };

    render(<NoteCard note={thisWeekNote} plugin={mockPlugin} />);

    // Should show full date with year (no longer showing day of week)
    const dateRegex = /\d{1,2}\/\d{1,2}\/\d{4}|\d{4}\/\d{1,2}\/\d{1,2}/;
    expect(screen.getByText(dateRegex)).toBeInTheDocument();
  });

  it("should format date for older notes", () => {
    const oldNote = {
      ...mockNote,
      lastModified: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    };

    render(<NoteCard note={oldNote} plugin={mockPlugin} />);

    // Should show full date with year (no longer showing month/day only)
    const dateRegex = /\d{1,2}\/\d{1,2}\/\d{4}|\d{4}\/\d{1,2}\/\d{1,2}/;
    expect(screen.getByText(dateRegex)).toBeInTheDocument();
  });

  it("should handle long titles with tooltip", () => {
    const longTitleNote = {
      ...mockNote,
      title:
        "This is a very long note title that should be truncated in the display but shown in full in the tooltip",
    };

    render(<NoteCard note={longTitleNote} plugin={mockPlugin} />);

    const titleElement = screen.getByText(longTitleNote.title);
    expect(titleElement).toHaveAttribute("title", longTitleNote.title);
  });

  it("should handle long preview with tooltip", () => {
    const longPreviewNote = {
      ...mockNote,
      preview:
        "This is a very long preview text that might be truncated in the display but should be shown in full in the tooltip when hovered",
    };

    render(<NoteCard note={longPreviewNote} plugin={mockPlugin} />);

    const previewElement = screen.getByText(longPreviewNote.preview);
    expect(previewElement).toHaveAttribute("title", longPreviewNote.preview);
  });

  it("should show full date in tooltip", () => {
    // Since mockNote has frontmatter.updated, it will use that instead of lastModified
    const expectedDate = new Date("2024-01-15"); // From frontmatter.updated
    render(<NoteCard note={mockNote} plugin={mockPlugin} />);

    const dateElement = screen.getByTitle(expectedDate.toLocaleString());
    expect(dateElement).toBeInTheDocument();
  });

  it("should handle keyboard navigation ignoring other keys", () => {
    const mockOpenFile = vi.fn();
    const mockGetLeaf = vi.fn(() => ({ openFile: mockOpenFile }));
    const pluginWithMock = {
      ...mockPlugin,
      app: {
        workspace: {
          getLeaf: mockGetLeaf,
        },
      },
    } as any;

    render(<NoteCard note={mockNote} plugin={pluginWithMock} />);

    const noteCard = screen.getByRole("button", { name: /Open note: Test Note/ });

    // Test other keys that should not trigger opening
    fireEvent.keyDown(noteCard, { key: "Tab" });
    fireEvent.keyDown(noteCard, { key: "Escape" });
    fireEvent.keyDown(noteCard, { key: "a" });

    expect(mockOpenFile).not.toHaveBeenCalled();
  });

  it("should have proper accessibility attributes", () => {
    render(<NoteCard note={mockNote} plugin={mockPlugin} />);

    const noteCard = screen.getByRole("button", { name: /Open note: Test Note/ });
    expect(noteCard).toHaveAttribute("tabIndex", "0");
    expect(noteCard).toHaveAttribute("aria-label", "Open note: Test Note");

    const pinButton = screen.getByRole("button", { name: "Pin note" });
    expect(pinButton).toHaveAttribute("aria-label", "Pin note");
  });

  it("should display tags with overflow indicator when more than 3 tags", () => {
    const noteWithManyTags = {
      ...mockNote,
      tags: ["tag1", "tag2", "tag3", "tag4", "tag5"],
    };

    render(<NoteCard note={noteWithManyTags} plugin={mockPlugin} />);

    // Should show first 3 tags
    expect(screen.getByText("#tag1")).toBeInTheDocument();
    expect(screen.getByText("#tag2")).toBeInTheDocument();
    expect(screen.getByText("#tag3")).toBeInTheDocument();

    // Should show overflow indicator
    expect(screen.getByText("+2")).toBeInTheDocument();

    // Should not show 4th and 5th tags directly
    expect(screen.queryByText("#tag4")).not.toBeInTheDocument();
    expect(screen.queryByText("#tag5")).not.toBeInTheDocument();
  });

  it("should handle openFile error gracefully", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const mockOpenFile = vi.fn(() => {
      throw new Error("Failed to open file");
    });
    const mockGetLeaf = vi.fn(() => ({ openFile: mockOpenFile }));
    const pluginWithError = {
      ...mockPlugin,
      app: {
        workspace: {
          getLeaf: mockGetLeaf,
        },
      },
    } as any;

    render(<NoteCard note={mockNote} plugin={pluginWithError} />);

    const noteCard = screen.getByRole("button", { name: /Open note: Test Note/ });
    fireEvent.click(noteCard);

    expect(mockOpenFile).toHaveBeenCalledWith(mockNote.file);
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("should handle togglePin error gracefully", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const mockTogglePinWithError = vi.fn(() => {
      throw new Error("Failed to toggle pin");
    });

    mockUseCardExplorerStore.mockReturnValue({
      pinnedNotes: new Set<string>(),
      togglePin: mockTogglePinWithError,
    });

    render(<NoteCard note={mockNote} plugin={mockPlugin} />);

    const pinButton = screen.getByRole("button", { name: "Pin note" });
    fireEvent.click(pinButton);

    expect(mockTogglePinWithError).toHaveBeenCalledWith(mockNote.path);
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("should handle keyboard event error gracefully", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Mock handleNoteClick to throw an error
    const mockOpenFile = vi.fn(() => {
      throw new Error("Failed to open file via keyboard");
    });
    const mockGetLeaf = vi.fn(() => ({ openFile: mockOpenFile }));
    const pluginWithError = {
      ...mockPlugin,
      app: {
        workspace: {
          getLeaf: mockGetLeaf,
        },
      },
    } as any;

    render(<NoteCard note={mockNote} plugin={pluginWithError} />);

    const noteCard = screen.getByRole("button", { name: /Open note: Test Note/ });

    // Test both Enter and Space keys to cover the keyboard event handler
    fireEvent.keyDown(noteCard, { key: "Enter" });
    expect(mockOpenFile).toHaveBeenCalledWith(mockNote.file);
    expect(consoleErrorSpy).toHaveBeenCalled();

    // Reset mocks to test space key
    mockOpenFile.mockClear();
    consoleErrorSpy.mockClear();

    fireEvent.keyDown(noteCard, { key: " " });
    expect(mockOpenFile).toHaveBeenCalledWith(mockNote.file);
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("should handle invalid date gracefully", () => {
    const noteWithInvalidDate = {
      ...mockNote,
      lastModified: new Date("invalid-date"),
      frontmatter: null, // No frontmatter, should use lastModified
    };

    render(<NoteCard note={noteWithInvalidDate} plugin={mockPlugin} />);

    // Should fallback to "Invalid date" text
    expect(screen.getByText("Invalid date")).toBeInTheDocument();
  });

  it("should use frontmatter updated date when available", () => {
    // mockNote already has frontmatter.updated = "2024-01-15"
    render(<NoteCard note={mockNote} plugin={mockPlugin} />);

    // Should show formatted date with year from frontmatter, not lastModified
    const dateRegex = /\d{1,2}\/\d{1,2}\/\d{4}|\d{4}\/\d{1,2}\/\d{1,2}/;
    expect(screen.getByText(dateRegex)).toBeInTheDocument();

    // Tooltip should show the frontmatter date
    const expectedDate = new Date("2024-01-15");
    const dateElement = screen.getByTitle(expectedDate.toLocaleString());
    expect(dateElement).toBeInTheDocument();
  });

  it("should fallback to lastModified when frontmatter updated is invalid", () => {
    const noteWithInvalidFrontmatterDate = {
      ...mockNote,
      lastModified: new Date("2024-01-20T10:30:00Z"),
      frontmatter: { updated: "invalid-date-string" },
    };

    render(<NoteCard note={noteWithInvalidFrontmatterDate} plugin={mockPlugin} />);

    // Should use lastModified date since frontmatter date is invalid
    const expectedDate = noteWithInvalidFrontmatterDate.lastModified;
    const dateElement = screen.getByTitle(expectedDate.toLocaleString());
    expect(dateElement).toBeInTheDocument();
  });
});
