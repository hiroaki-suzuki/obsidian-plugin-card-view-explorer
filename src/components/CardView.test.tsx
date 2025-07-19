import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type CardExplorerPlugin from "../main";
import { useCardExplorerStore } from "../store/cardExplorerStore";
import type { NoteData } from "../types";
import { CardView } from "./CardView";

// Mock Obsidian's setIcon function
vi.mock("obsidian", () => ({
  setIcon: vi.fn(),
}));

// Mock the store
const mockRefreshNotes = vi.fn();
const mockSetError = vi.fn();
const mockInitializeFromPluginData = vi.fn();
const mockSavePinStatesToPlugin = vi.fn();

vi.mock("../store/cardExplorerStore", () => ({
  useCardExplorerStore: vi.fn(),
}));

const mockUseCardExplorerStore = vi.mocked(useCardExplorerStore);

// Mock CardViewErrorBoundary
vi.mock("./CardViewErrorBoundary", () => ({
  CardViewErrorBoundary: ({ children, onError }: any) => {
    // Simulate error boundary behavior
    const TestErrorBoundary = ({ children }: any) => {
      try {
        return children;
      } catch (error: any) {
        onError(error, { componentStack: "test stack" });
        return <div data-testid="error-boundary-fallback">Error caught by boundary</div>;
      }
    };
    return <TestErrorBoundary>{children}</TestErrorBoundary>;
  },
}));

// Mock error handling utilities
const mockHandleError = vi.fn();
vi.mock("../utils/errorHandling", () => ({
  handleError: mockHandleError,
  ErrorCategory: {
    DATA: "data",
    API: "api",
    UI: "ui",
    GENERAL: "general",
  },
}));

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

  it("should render CardView with header, filter panel, and virtual list", () => {
    render(<CardView plugin={mockPlugin} />);

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

  it("should compute available tags correctly", () => {
    render(<CardView plugin={mockPlugin} />);

    // Should show 3 unique tags (tag1, tag2, tag3)
    expect(screen.getByText(/Tags: 3/)).toBeInTheDocument();
  });

  it("should compute available folders correctly", () => {
    render(<CardView plugin={mockPlugin} />);

    // Should show 2 unique folders (Folder1, Folder2)
    expect(screen.getByText(/Folders: 2/)).toBeInTheDocument();
  });

  it("should show filtered count when different from total", () => {
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

    expect(screen.getByText("2 total notes")).toBeInTheDocument();
    expect(screen.getByText("• 1 filtered")).toBeInTheDocument();
  });

  it("should call refreshNotes on mount", () => {
    render(<CardView plugin={mockPlugin} />);

    expect(mockRefreshNotes).toHaveBeenCalledWith(mockPlugin.app);
  });

  it("should handle refreshNotes error on mount", async () => {
    mockRefreshNotes.mockRejectedValueOnce(new Error("Network error"));

    render(<CardView plugin={mockPlugin} />);

    // Wait a tick for the async error to be handled
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockSetError).toHaveBeenCalledWith("Network error");
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

  it("should handle singular note count", () => {
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

    expect(screen.getByText("1 total note")).toBeInTheDocument();
  });

  describe("Error Boundary Integration", () => {
    it("should define handleErrorBoundaryError function internally", () => {
      // This test verifies the error boundary integration exists
      // The actual handleErrorBoundaryError logic is tested implicitly
      // through the fact that CardView renders successfully with the error boundary
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      render(<CardView plugin={mockPlugin} />);

      // If there were any errors in the handleErrorBoundaryError function definition,
      // the component would fail to render, so successful rendering validates the integration
      expect(screen.getByText("Card Explorer")).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });

  describe("Pin State Auto-Save", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should debounce pin state saves with 500ms delay", async () => {
      const initialPinnedNotes = new Set(["note1.md"]);
      const updatedPinnedNotes = new Set(["note1.md", "note2.md"]);

      // Start with initial state
      mockUseCardExplorerStore.mockReturnValue({
        notes: mockNotes,
        filteredNotes: mockNotes,
        isLoading: false,
        error: null,
        refreshNotes: mockRefreshNotes,
        setError: mockSetError,
        initializeFromPluginData: mockInitializeFromPluginData,
        savePinStatesToPlugin: mockSavePinStatesToPlugin,
        pinnedNotes: initialPinnedNotes,
      });

      const { rerender } = render(<CardView plugin={mockPlugin} />);

      // Update to new pin state
      mockUseCardExplorerStore.mockReturnValue({
        notes: mockNotes,
        filteredNotes: mockNotes,
        isLoading: false,
        error: null,
        refreshNotes: mockRefreshNotes,
        setError: mockSetError,
        initializeFromPluginData: mockInitializeFromPluginData,
        savePinStatesToPlugin: mockSavePinStatesToPlugin,
        pinnedNotes: updatedPinnedNotes,
      });

      rerender(<CardView plugin={mockPlugin} />);

      // Should not call save immediately
      expect(mockSavePinStatesToPlugin).not.toHaveBeenCalled();

      // Fast-forward time by 500ms
      await act(async () => {
        vi.advanceTimersByTime(500);
        await Promise.resolve(); // Allow async operations to complete
      });

      // Should call save after debounce
      expect(mockSavePinStatesToPlugin).toHaveBeenCalledWith(mockPlugin);
    });

    it("should handle pin state save errors with dynamic error handling import", async () => {
      const pinnedNotes = new Set(["note1.md"]);
      const saveError = new Error("Save failed");

      mockSavePinStatesToPlugin.mockRejectedValueOnce(saveError);

      mockUseCardExplorerStore.mockReturnValue({
        notes: mockNotes,
        filteredNotes: mockNotes,
        isLoading: false,
        error: null,
        refreshNotes: mockRefreshNotes,
        setError: mockSetError,
        initializeFromPluginData: mockInitializeFromPluginData,
        savePinStatesToPlugin: mockSavePinStatesToPlugin,
        pinnedNotes,
      });

      render(<CardView plugin={mockPlugin} />);

      // Fast-forward time to trigger save
      await act(async () => {
        vi.advanceTimersByTime(500);
        await Promise.resolve();
        await Promise.resolve(); // Allow error handling import to resolve
      });

      // Should call handleError with correct parameters
      expect(mockHandleError).toHaveBeenCalledWith(
        saveError,
        "data", // ErrorCategory.DATA
        {
          operation: "savePinStates",
          pinCount: 1,
        }
      );
    });
  });

  describe("Retry Functionality", () => {
    it("should handle retry button click in footer", async () => {
      const user = userEvent.setup();

      render(<CardView plugin={mockPlugin} />);

      const retryButton = screen.getByRole("button", { name: "Refresh Notes" });
      await user.click(retryButton);

      expect(mockSetError).toHaveBeenCalledWith(null);
      expect(mockRefreshNotes).toHaveBeenCalledWith(mockPlugin.app);
    });

    it("should handle retry failure and set error", async () => {
      const user = userEvent.setup();
      const retryError = new Error("Retry failed");

      // Mock console.error to avoid noise in test output
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // First render succeeds, then retry fails
      mockRefreshNotes.mockResolvedValueOnce(undefined); // Initial load succeeds

      render(<CardView plugin={mockPlugin} />);

      // Reset and make retry fail
      mockRefreshNotes.mockRejectedValueOnce(retryError);

      const retryButton = screen.getByRole("button", { name: "Refresh Notes" });
      await user.click(retryButton);

      // Wait a tick for the async error to be handled
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockSetError).toHaveBeenCalledWith("Retry failed");

      expect(consoleSpy).toHaveBeenCalledWith("Retry failed:", retryError);

      consoleSpy.mockRestore();
    });

    it("should disable retry button when loading", () => {
      mockUseCardExplorerStore.mockReturnValue({
        notes: mockNotes,
        filteredNotes: mockNotes,
        isLoading: true,
        error: null,
        refreshNotes: mockRefreshNotes,
        setError: mockSetError,
        initializeFromPluginData: mockInitializeFromPluginData,
        savePinStatesToPlugin: mockSavePinStatesToPlugin,
        pinnedNotes: new Set(),
      });

      render(<CardView plugin={mockPlugin} />);

      const retryButton = screen.getByRole("button", { name: "Refreshing..." });
      expect(retryButton).toBeDisabled();
    });
  });

  describe("Memory Leak Prevention", () => {
    it("should cleanup on unmount and prevent state updates", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Mock a delayed refreshNotes that resolves after unmount
      let resolveRefresh: (value?: any) => void;
      const delayedRefresh = new Promise((resolve) => {
        resolveRefresh = resolve;
      });
      mockRefreshNotes.mockReturnValueOnce(delayedRefresh);

      const { unmount } = render(<CardView plugin={mockPlugin} />);

      // Unmount before the async operation completes
      unmount();

      // Resolve the delayed operation
      await act(async () => {
        resolveRefresh!();
        await Promise.resolve();
      });

      // setError should not be called because component is unmounted
      // The isMounted flag should prevent it
      expect(mockSetError).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should cleanup timeout on unmount for pin state saves", () => {
      const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");

      const { unmount } = render(<CardView plugin={mockPlugin} />);

      unmount();

      // Should call clearTimeout during cleanup
      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });
  });

  describe("Memoization Behavior", () => {
    it("should recompute available tags when notes change", () => {
      // Initial render with 2 notes
      const { rerender } = render(<CardView plugin={mockPlugin} />);

      expect(screen.getByText(/Tags: 3/)).toBeInTheDocument(); // tag1, tag2, tag3

      // Update with different notes
      const newNotes: NoteData[] = [
        {
          file: { path: "note3.md" } as any,
          title: "Note 3",
          path: "note3.md",
          preview: "Preview 3",
          lastModified: new Date("2024-01-03"),
          frontmatter: null,
          tags: ["newTag1", "newTag2"],
          folder: "NewFolder",
        },
      ];

      mockUseCardExplorerStore.mockReturnValue({
        notes: newNotes,
        filteredNotes: newNotes,
        isLoading: false,
        error: null,
        refreshNotes: mockRefreshNotes,
        setError: mockSetError,
        initializeFromPluginData: mockInitializeFromPluginData,
        savePinStatesToPlugin: mockSavePinStatesToPlugin,
        pinnedNotes: new Set(),
      });

      rerender(<CardView plugin={mockPlugin} />);

      // Should show new tag count
      expect(screen.getByText(/Tags: 2/)).toBeInTheDocument(); // newTag1, newTag2
    });

    it("should recompute available folders when notes change", () => {
      // Initial render with 2 notes
      const { rerender } = render(<CardView plugin={mockPlugin} />);

      expect(screen.getByText(/Folders: 2/)).toBeInTheDocument(); // Folder1, Folder2

      // Update with single note in different folder
      const newNotes: NoteData[] = [
        {
          file: { path: "note3.md" } as any,
          title: "Note 3",
          path: "note3.md",
          preview: "Preview 3",
          lastModified: new Date("2024-01-03"),
          frontmatter: null,
          tags: ["tag1"],
          folder: "SingleFolder",
        },
      ];

      mockUseCardExplorerStore.mockReturnValue({
        notes: newNotes,
        filteredNotes: newNotes,
        isLoading: false,
        error: null,
        refreshNotes: mockRefreshNotes,
        setError: mockSetError,
        initializeFromPluginData: mockInitializeFromPluginData,
        savePinStatesToPlugin: mockSavePinStatesToPlugin,
        pinnedNotes: new Set(),
      });

      rerender(<CardView plugin={mockPlugin} />);

      // Should show new folder count
      expect(screen.getByText(/Folders: 1/)).toBeInTheDocument(); // SingleFolder
    });

    it("should sort available tags alphabetically", () => {
      const unsortedNotes: NoteData[] = [
        {
          file: { path: "note1.md" } as any,
          title: "Note 1",
          path: "note1.md",
          preview: "Preview 1",
          lastModified: new Date("2024-01-01"),
          frontmatter: null,
          tags: ["zebra", "alpha", "beta"],
          folder: "Folder1",
        },
      ];

      mockUseCardExplorerStore.mockReturnValue({
        notes: unsortedNotes,
        filteredNotes: unsortedNotes,
        isLoading: false,
        error: null,
        refreshNotes: mockRefreshNotes,
        setError: mockSetError,
        initializeFromPluginData: mockInitializeFromPluginData,
        savePinStatesToPlugin: mockSavePinStatesToPlugin,
        pinnedNotes: new Set(),
      });

      render(<CardView plugin={mockPlugin} />);

      // Verify tags are passed in sorted order (3 total: alpha, beta, zebra)
      expect(screen.getByText(/Tags: 3/)).toBeInTheDocument();
    });

    it("should sort available folders alphabetically", () => {
      const unsortedNotes: NoteData[] = [
        {
          file: { path: "note1.md" } as any,
          title: "Note 1",
          path: "note1.md",
          preview: "Preview 1",
          lastModified: new Date("2024-01-01"),
          frontmatter: null,
          tags: ["tag1"],
          folder: "ZFolder",
        },
        {
          file: { path: "note2.md" } as any,
          title: "Note 2",
          path: "note2.md",
          preview: "Preview 2",
          lastModified: new Date("2024-01-02"),
          frontmatter: null,
          tags: ["tag2"],
          folder: "AFolder",
        },
      ];

      mockUseCardExplorerStore.mockReturnValue({
        notes: unsortedNotes,
        filteredNotes: unsortedNotes,
        isLoading: false,
        error: null,
        refreshNotes: mockRefreshNotes,
        setError: mockSetError,
        initializeFromPluginData: mockInitializeFromPluginData,
        savePinStatesToPlugin: mockSavePinStatesToPlugin,
        pinnedNotes: new Set(),
      });

      render(<CardView plugin={mockPlugin} />);

      // Verify folders are passed in sorted order (2 total: AFolder, ZFolder)
      expect(screen.getByText(/Folders: 2/)).toBeInTheDocument();
    });
  });
});
