import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type CardExplorerPlugin from "../main";
import type { NoteData } from "../types";
import { NoteCard } from "./NoteCard";

// Mock the store
vi.mock("../store/cardExplorerStore", () => ({
  useCardExplorerStore: vi.fn(() => ({
    pinnedNotes: new Set<string>(),
    togglePin: vi.fn(),
  })),
}));

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
});
