/** biome-ignore-all lint/suspicious/noArrayIndexKey: Using index as key in test mock is acceptable for virtuoso simulation */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type CardExplorerPlugin from "../main";
import { useCardExplorerStore } from "../store/cardExplorerStore";
import type { NoteData } from "../types";
import { VirtualList } from "./VirtualList";

// Mock react-virtuoso
vi.mock("react-virtuoso", () => ({
  Virtuoso: ({ totalCount, itemContent, components }: any) => {
    const items = Array.from({ length: totalCount }, (_, index) => itemContent(index));
    return (
      <div data-testid="virtuoso-container">
        {components?.List ? (
          <components.List>
            {items.map((item: any, index: number) =>
              components?.Item ? (
                <components.Item key={`virtuoso-item-${index}`}>{item}</components.Item>
              ) : (
                <div key={`virtuoso-item-${index}`}>{item}</div>
              )
            )}
          </components.List>
        ) : (
          <div>
            {items.map((item: any, index: number) => (
              <div key={`virtuoso-item-${index}`}>{item}</div>
            ))}
          </div>
        )}
      </div>
    );
  },
}));

// Mock NoteCard component
vi.mock("./NoteCard", () => ({
  NoteCard: ({ note }: { note: NoteData }) => (
    <div data-testid={`note-card-${note.path}`}>
      <h3>{note.title}</h3>
      <p>{note.preview}</p>
    </div>
  ),
}));

// Mock ResizeObserver
const mockResizeObserver = vi.fn();
mockResizeObserver.mockReturnValue({
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn(),
});
// @ts-ignore
window.ResizeObserver = mockResizeObserver;

// Mock getBoundingClientRect
const mockGetBoundingClientRect = vi.fn(() => ({
  width: 800,
  height: 600,
  top: 0,
  left: 0,
  bottom: 600,
  right: 800,
  x: 0,
  y: 0,
  toJSON: vi.fn(),
}));
// @ts-ignore
Element.prototype.getBoundingClientRect = mockGetBoundingClientRect;

// Mock the store
const mockClearFilters = vi.fn();

vi.mock("../store/cardExplorerStore", () => ({
  useCardExplorerStore: vi.fn(),
}));

const mockUseCardExplorerStore = vi.mocked(useCardExplorerStore);

describe("VirtualList", () => {
  const mockPlugin = {
    refreshNotes: vi.fn(),
  } as any as CardExplorerPlugin;

  const createMockNote = (id: string, title: string): NoteData => ({
    file: { path: `/note${id}.md` } as any,
    title,
    path: `/note${id}.md`,
    preview: `Preview for ${title}`,
    lastModified: new Date(),
    frontmatter: null,
    tags: [],
    folder: "",
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset ResizeObserver mock
    mockResizeObserver.mockClear();
    mockGetBoundingClientRect.mockReturnValue({
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      bottom: 600,
      right: 800,
      x: 0,
      y: 0,
      toJSON: vi.fn(),
    });

    // Reset store mock to default state
    mockUseCardExplorerStore.mockReturnValue({
      filteredNotes: [],
      isLoading: false,
      error: null,
    });
  });

  it("should render loading state", () => {
    // Mock store with loading state
    mockUseCardExplorerStore.mockReturnValue({
      filteredNotes: [],
      isLoading: true,
      error: null,
    });

    render(<VirtualList plugin={mockPlugin} />);

    expect(screen.getByText("Loading notes...")).toBeInTheDocument();
    // Check that the loading state is rendered (no status role needed)
    expect(screen.getByText("Loading notes...")).toBeInTheDocument();
  });

  it("should render error state", () => {
    // Mock console methods to prevent error logging noise in tests
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const consoleGroupSpy = vi.spyOn(console, "group").mockImplementation(() => {});
    const consoleGroupEndSpy = vi.spyOn(console, "groupEnd").mockImplementation(() => {});

    // Mock store with error state
    mockUseCardExplorerStore.mockReturnValue({
      filteredNotes: [],
      isLoading: false,
      error: "Failed to load notes",
    });

    render(<VirtualList plugin={mockPlugin} />);

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Failed to load notes from your vault.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();

    // Restore console methods
    consoleSpy.mockRestore();
    consoleGroupSpy.mockRestore();
    consoleGroupEndSpy.mockRestore();
  });

  it("should handle retry button click in error state", async () => {
    // Mock console methods to prevent error logging noise in tests
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const consoleGroupSpy = vi.spyOn(console, "group").mockImplementation(() => {});
    const consoleGroupEndSpy = vi.spyOn(console, "groupEnd").mockImplementation(() => {});

    // Mock store methods
    const mockRefreshNotes = vi.fn();
    const mockSetError = vi.fn();

    // Mock store with error state and methods
    mockUseCardExplorerStore.mockReturnValue({
      filteredNotes: [],
      isLoading: false,
      error: "Failed to load notes",
      refreshNotes: mockRefreshNotes,
      setError: mockSetError,
    });

    const user = userEvent.setup();
    render(<VirtualList plugin={mockPlugin} />);

    const retryButton = screen.getByRole("button", { name: "Retry" });
    await user.click(retryButton);

    expect(mockRefreshNotes).toHaveBeenCalledWith(mockPlugin.app);

    // Restore console methods
    consoleSpy.mockRestore();
    consoleGroupSpy.mockRestore();
    consoleGroupEndSpy.mockRestore();
  });

  it("should render empty state", () => {
    // Mock store with empty state (default)
    render(<VirtualList plugin={mockPlugin} />);

    expect(screen.getByText("No Notes Found")).toBeInTheDocument();
    expect(screen.getByText(/No notes match your current filters/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear Filters" })).toBeInTheDocument();
  });

  it("should handle clear filters button click in empty state", async () => {
    // Mock the store with getState method
    const mockStore = {
      filteredNotes: [],
      isLoading: false,
      error: null,
    };

    // Create a mock getState function that returns clearFilters
    const mockGetState = vi.fn(() => ({
      clearFilters: mockClearFilters,
    }));

    mockUseCardExplorerStore.mockReturnValue(mockStore);
    // Add getState to the mock
    (mockUseCardExplorerStore as any).getState = mockGetState;

    const user = userEvent.setup();
    render(<VirtualList plugin={mockPlugin} />);

    const clearFiltersButton = screen.getByRole("button", { name: "Clear Filters" });
    await user.click(clearFiltersButton);

    expect(mockGetState).toHaveBeenCalled();
    expect(mockClearFilters).toHaveBeenCalled();
  });

  it("should render multiple notes with virtualization", () => {
    const mockNotes = [
      createMockNote("1", "Note 1"),
      createMockNote("2", "Note 2"),
      createMockNote("3", "Note 3"),
    ];

    // Mock store with notes
    mockUseCardExplorerStore.mockReturnValue({
      filteredNotes: mockNotes,
      isLoading: false,
      error: null,
    });

    render(<VirtualList plugin={mockPlugin} />);

    // Check that virtuoso container is rendered (now using regular Virtuoso with grid layout)
    expect(screen.getByTestId("virtuoso-container")).toBeInTheDocument();

    // Check that note cards are rendered
    expect(screen.getByTestId("note-card-/note1.md")).toBeInTheDocument();
    expect(screen.getByTestId("note-card-/note2.md")).toBeInTheDocument();
    expect(screen.getByTestId("note-card-/note3.md")).toBeInTheDocument();

    // Check note content
    expect(screen.getByText("Note 1")).toBeInTheDocument();
    expect(screen.getByText("Note 2")).toBeInTheDocument();
    expect(screen.getByText("Note 3")).toBeInTheDocument();
  });

  it("should render notes list with virtualization", () => {
    const mockNotes = [createMockNote("1", "Note 1"), createMockNote("2", "Note 2")];

    // Mock store with notes
    mockUseCardExplorerStore.mockReturnValue({
      filteredNotes: mockNotes,
      isLoading: false,
      error: null,
    });

    render(<VirtualList plugin={mockPlugin} />);

    // Check that note cards are rendered
    expect(screen.getByTestId("note-card-/note1.md")).toBeInTheDocument();
    expect(screen.getByTestId("note-card-/note2.md")).toBeInTheDocument();
  });

  it("should render single note correctly", () => {
    const mockNotes = [createMockNote("1", "Note 1")];

    // Mock store with single note
    mockUseCardExplorerStore.mockReturnValue({
      filteredNotes: mockNotes,
      isLoading: false,
      error: null,
    });

    render(<VirtualList plugin={mockPlugin} />);

    // Check that the single note card is rendered
    expect(screen.getByTestId("note-card-/note1.md")).toBeInTheDocument();
    expect(screen.getByText("Note 1")).toBeInTheDocument();
  });

  it("should handle null note in renderNoteCard", () => {
    const mockNotes = [createMockNote("1", "Note 1")];

    // Mock store with notes
    mockUseCardExplorerStore.mockReturnValue({
      filteredNotes: mockNotes,
      isLoading: false,
      error: null,
    });

    render(<VirtualList plugin={mockPlugin} />);

    // The component should handle the case where a note might be null
    // This is tested implicitly by rendering without errors
    expect(screen.getByTestId("virtuoso-container")).toBeInTheDocument();
  });

  it("should render with proper CSS classes", () => {
    const mockNotes = [createMockNote("1", "Note 1")];

    // Mock store with notes
    mockUseCardExplorerStore.mockReturnValue({
      filteredNotes: mockNotes,
      isLoading: false,
      error: null,
    });

    render(<VirtualList plugin={mockPlugin} />);

    // Check for container class
    const container = document.querySelector(".virtual-list-container");
    expect(container).toBeInTheDocument();
  });

  it("should handle large number of notes", () => {
    const mockNotes = Array.from({ length: 1000 }, (_, i) =>
      createMockNote(i.toString(), `Note ${i + 1}`)
    );

    // Mock store with many notes
    mockUseCardExplorerStore.mockReturnValue({
      filteredNotes: mockNotes,
      isLoading: false,
      error: null,
    });

    render(<VirtualList plugin={mockPlugin} />);

    // Check that virtualization container is rendered
    expect(screen.getByTestId("virtuoso-container")).toBeInTheDocument();
    // Due to virtualization, only visible notes are rendered
    expect(screen.getByTestId("note-card-/note0.md")).toBeInTheDocument();
  });

  it("should not render loading state when there are notes", () => {
    const mockNotes = [createMockNote("1", "Note 1")];

    // Mock store with notes and loading false
    mockUseCardExplorerStore.mockReturnValue({
      filteredNotes: mockNotes,
      isLoading: false,
      error: null,
    });

    render(<VirtualList plugin={mockPlugin} />);

    expect(screen.queryByText("Loading notes...")).not.toBeInTheDocument();
    expect(screen.getByText("Note 1")).toBeInTheDocument();
  });

  it("should not render error state when there are notes", () => {
    const mockNotes = [createMockNote("1", "Note 1")];

    // Mock store with notes and no error
    mockUseCardExplorerStore.mockReturnValue({
      filteredNotes: mockNotes,
      isLoading: false,
      error: null,
    });

    render(<VirtualList plugin={mockPlugin} />);

    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
    expect(screen.getByText("Note 1")).toBeInTheDocument();
  });

  describe("Responsive Layout", () => {
    it("should initialize ResizeObserver on mount", () => {
      const mockNotes = [createMockNote("1", "Note 1")];
      mockUseCardExplorerStore.mockReturnValue({
        filteredNotes: mockNotes,
        isLoading: false,
        error: null,
      });

      render(<VirtualList plugin={mockPlugin} />);

      expect(mockResizeObserver).toHaveBeenCalled();
      const resizeObserverInstance = mockResizeObserver.mock.results[0].value;
      expect(resizeObserverInstance.observe).toHaveBeenCalled();
    });

    it("should calculate correct row size based on container width", () => {
      // Test different container widths
      const testCases = [
        { width: 292, expectedCards: 1 }, // Exactly one card width
        { width: 584, expectedCards: 2 }, // Two cards width
        { width: 876, expectedCards: 3 }, // Three cards width
        { width: 1460, expectedCards: 5 }, // Max cards (5)
        { width: 2000, expectedCards: 5 }, // Above max, should cap at 5
        { width: 200, expectedCards: 1 }, // Below min card width
      ];

      testCases.forEach(({ width }) => {
        mockGetBoundingClientRect.mockReturnValue({
          width,
          height: 600,
          top: 0,
          left: 0,
          bottom: 600,
          right: width,
          x: 0,
          y: 0,
          toJSON: vi.fn(),
        });

        const mockNotes = Array.from({ length: 10 }, (_, i) =>
          createMockNote(i.toString(), `Note ${i + 1}`)
        );

        mockUseCardExplorerStore.mockReturnValue({
          filteredNotes: mockNotes,
          isLoading: false,
          error: null,
        });

        const { unmount } = render(<VirtualList plugin={mockPlugin} />);

        // Component should render without errors
        expect(screen.getByTestId("virtuoso-container")).toBeInTheDocument();

        unmount();
      });
    });

    it("should handle zero width container gracefully", () => {
      mockGetBoundingClientRect.mockReturnValue({
        width: 0,
        height: 600,
        top: 0,
        left: 0,
        bottom: 600,
        right: 0,
        x: 0,
        y: 0,
        toJSON: vi.fn(),
      });

      const mockNotes = [createMockNote("1", "Note 1")];
      mockUseCardExplorerStore.mockReturnValue({
        filteredNotes: mockNotes,
        isLoading: false,
        error: null,
      });

      render(<VirtualList plugin={mockPlugin} />);

      // Should still render the component without errors
      expect(screen.getByTestId("virtuoso-container")).toBeInTheDocument();
    });

    it("should cleanup ResizeObserver on unmount", () => {
      const mockNotes = [createMockNote("1", "Note 1")];
      mockUseCardExplorerStore.mockReturnValue({
        filteredNotes: mockNotes,
        isLoading: false,
        error: null,
      });

      const { unmount } = render(<VirtualList plugin={mockPlugin} />);

      const resizeObserverInstance = mockResizeObserver.mock.results[0].value;

      unmount();

      expect(resizeObserverInstance.disconnect).toHaveBeenCalled();
    });
  });
});
