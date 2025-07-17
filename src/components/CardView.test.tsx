import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type CardExplorerPlugin from "../main";
import { useCardExplorerStore } from "../store/cardExplorerStore";
import type { NoteData } from "../types";
import { CardView } from "./CardView";

// Mock the store
const mockRefreshNotes = vi.fn();
const mockSetError = vi.fn();
const mockInitializeFromPluginData = vi.fn();
const mockSavePinStatesToPlugin = vi.fn();

vi.mock("../store/cardExplorerStore", () => ({
  useCardExplorerStore: vi.fn(),
}));

const mockUseCardExplorerStore = vi.mocked(useCardExplorerStore);

// Mock child components
vi.mock("./FilterPanel", () => ({
  FilterPanel: ({ availableTags, availableFolders }: any) => (
    <div data-testid="filter-panel">
      Filter Panel - Tags: {availableTags.length}, Folders: {availableFolders.length}
    </div>
  ),
}));

vi.mock("./VirtualList", () => ({
  VirtualList: ({ plugin }: any) => (
    <div data-testid="virtual-list">Virtual List - Plugin: {plugin ? "present" : "missing"}</div>
  ),
}));

describe("CardView", () => {
  const mockPlugin = {
    app: {
      vault: {},
      metadataCache: {},
    },
  } as CardExplorerPlugin;

  const mockNotes: NoteData[] = [
    {
      file: { path: "note1.md" } as any,
      title: "Note 1",
      path: "note1.md",
      preview: "Preview 1",
      lastModified: new Date("2024-01-01"),
      frontmatter: null,
      tags: ["tag1", "tag2"],
      folder: "Folder1",
    },
    {
      file: { path: "note2.md" } as any,
      title: "Note 2",
      path: "note2.md",
      preview: "Preview 2",
      lastModified: new Date("2024-01-02"),
      frontmatter: null,
      tags: ["tag2", "tag3"],
      folder: "Folder2",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock return value
    mockUseCardExplorerStore.mockReturnValue({
      notes: mockNotes,
      filteredNotes: mockNotes,
      isLoading: false,
      error: null,
      refreshNotes: mockRefreshNotes,
      setError: mockSetError,
      initializeFromPluginData: mockInitializeFromPluginData,
      savePinStatesToPlugin: mockSavePinStatesToPlugin,
      pinnedNotes: new Set(),
    });
  });

  it("should render CardView with header, filter panel, and virtual list", async () => {
    render(<CardView plugin={mockPlugin} />);

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText("Card Explorer")).toBeInTheDocument();
    });

    // Check header
    expect(screen.getByText("Card Explorer")).toBeInTheDocument();
    expect(screen.getByText("2 total notes")).toBeInTheDocument();

    // Check child components
    expect(screen.getByTestId("filter-panel")).toBeInTheDocument();
    expect(screen.getByTestId("virtual-list")).toBeInTheDocument();

    // Check refresh button
    expect(screen.getByText("Refresh Notes")).toBeInTheDocument();
  });

  it("should show loading state when loading", () => {
    mockUseCardExplorerStore.mockReturnValue({
      notes: [],
      filteredNotes: [],
      isLoading: true,
      error: null,
      refreshNotes: mockRefreshNotes,
      setError: mockSetError,
      initializeFromPluginData: mockInitializeFromPluginData,
      savePinStatesToPlugin: mockSavePinStatesToPlugin,
      pinnedNotes: new Set(),
    });

    render(<CardView plugin={mockPlugin} />);

    expect(screen.getByText("Loading Card Explorer")).toBeInTheDocument();
    expect(screen.getByText("Loading your notes...")).toBeInTheDocument();
  });

  it("should show error state when there is an error", () => {
    mockUseCardExplorerStore.mockReturnValue({
      notes: [],
      filteredNotes: [],
      isLoading: false,
      error: "Failed to load notes",
      refreshNotes: mockRefreshNotes,
      setError: mockSetError,
      initializeFromPluginData: mockInitializeFromPluginData,
      savePinStatesToPlugin: mockSavePinStatesToPlugin,
      pinnedNotes: new Set(),
    });

    render(<CardView plugin={mockPlugin} />);

    expect(screen.getByText("Error Loading Card Explorer")).toBeInTheDocument();
    expect(screen.getByText("Failed to load notes")).toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();
    expect(screen.getByText("Dismiss")).toBeInTheDocument();
  });

  it("should compute available tags correctly", async () => {
    render(<CardView plugin={mockPlugin} />);

    await waitFor(() => {
      expect(screen.getByTestId("filter-panel")).toBeInTheDocument();
    });

    // Should show 3 unique tags (tag1, tag2, tag3)
    expect(screen.getByText(/Tags: 3/)).toBeInTheDocument();
  });

  it("should compute available folders correctly", async () => {
    render(<CardView plugin={mockPlugin} />);

    await waitFor(() => {
      expect(screen.getByTestId("filter-panel")).toBeInTheDocument();
    });

    // Should show 2 unique folders (Folder1, Folder2)
    expect(screen.getByText(/Folders: 2/)).toBeInTheDocument();
  });

  it("should show filtered count when different from total", async () => {
    mockUseCardExplorerStore.mockReturnValue({
      notes: mockNotes,
      filteredNotes: [mockNotes[0]], // Only one filtered note
      isLoading: false,
      error: null,
      refreshNotes: mockRefreshNotes,
      setError: mockSetError,
      initializeFromPluginData: mockInitializeFromPluginData,
      savePinStatesToPlugin: mockSavePinStatesToPlugin,
      pinnedNotes: new Set(),
    });

    render(<CardView plugin={mockPlugin} />);

    await waitFor(() => {
      expect(screen.getByText("2 total notes")).toBeInTheDocument();
    });

    expect(screen.getByText("• 1 filtered")).toBeInTheDocument();
  });

  it("should call refreshNotes on mount", async () => {
    render(<CardView plugin={mockPlugin} />);

    await waitFor(() => {
      expect(mockRefreshNotes).toHaveBeenCalledWith(mockPlugin.app);
    });
  });

  it("should handle refreshNotes error on mount", async () => {
    mockRefreshNotes.mockRejectedValueOnce(new Error("Network error"));

    render(<CardView plugin={mockPlugin} />);

    await waitFor(() => {
      expect(mockSetError).toHaveBeenCalledWith("Network error");
    });
  });

  it("should show loading overlay when refreshing with existing notes", () => {
    mockUseCardExplorerStore.mockReturnValue({
      notes: mockNotes,
      filteredNotes: mockNotes,
      isLoading: true, // Loading while notes exist
      error: null,
      refreshNotes: mockRefreshNotes,
      setError: mockSetError,
      initializeFromPluginData: mockInitializeFromPluginData,
      savePinStatesToPlugin: mockSavePinStatesToPlugin,
      pinnedNotes: new Set(),
    });

    render(<CardView plugin={mockPlugin} />);

    expect(screen.getByText("Refreshing notes...")).toBeInTheDocument();
  });

  it("should handle singular note count", async () => {
    mockUseCardExplorerStore.mockReturnValue({
      notes: [mockNotes[0]], // Only one note
      filteredNotes: [mockNotes[0]],
      isLoading: false,
      error: null,
      refreshNotes: mockRefreshNotes,
      setError: mockSetError,
      initializeFromPluginData: mockInitializeFromPluginData,
      savePinStatesToPlugin: mockSavePinStatesToPlugin,
      pinnedNotes: new Set(),
    });

    render(<CardView plugin={mockPlugin} />);

    await waitFor(() => {
      expect(screen.getByText("1 total note")).toBeInTheDocument();
    });
  });
});
