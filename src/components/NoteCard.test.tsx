import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
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
    // Test with a recent date (today)
    const recentNote = {
      ...mockNote,
      lastModified: new Date(),
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
    };

    render(<NoteCard note={thisWeekNote} plugin={mockPlugin} />);

    // Should show day of week for this week
    const dayRegex = /(Mon|Tue|Wed|Thu|Fri|Sat|Sun)/;
    expect(screen.getByText(dayRegex)).toBeInTheDocument();
  });

  it("should format date for older notes", () => {
    const oldNote = {
      ...mockNote,
      lastModified: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    };

    render(<NoteCard note={oldNote} plugin={mockPlugin} />);

    // Should show month and day for older notes
    const dateRegex = /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{1,2}/;
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
    render(<NoteCard note={mockNote} plugin={mockPlugin} />);

    const dateElement = screen.getByTitle(mockNote.lastModified.toLocaleString());
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
});
