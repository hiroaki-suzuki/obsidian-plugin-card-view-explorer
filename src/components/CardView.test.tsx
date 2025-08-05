import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCardViewInitialization } from "../hooks/useCardViewInitialization";
import { useCardViewState } from "../hooks/useCardViewState";
import type CardExplorerPlugin from "../main";
import { useCardExplorerStore } from "../store/cardExplorerStore";
import type { NoteData } from "../types";
import { CardView } from "./CardView";

// Mock Obsidian's setIcon function
vi.mock("obsidian", () => ({
  setIcon: vi.fn(),
}));

// Mock the hooks
vi.mock("../hooks/useCardViewInitialization", () => ({
  useCardViewInitialization: vi.fn(),
}));

vi.mock("../hooks/useCardViewState", () => ({
  useCardViewState: vi.fn(),
}));

// Mock the store
vi.mock("../store/cardExplorerStore", () => ({
  useCardExplorerStore: vi.fn(),
}));

// Mock child components
vi.mock("./CardViewErrorBoundary", () => ({
  CardViewErrorBoundary: ({ children }: any) => <div data-testid="error-boundary">{children}</div>,
}));

vi.mock("./CardViewHeader", () => ({
  CardViewHeader: ({
    totalNotes,
    filteredNotes,
    isFilterPanelOpen,
    isLoading,
    onToggleFilter,
    onRefresh,
  }: any) => (
    <div data-testid="card-view-header">
      <h2>Card View Explorer</h2>
      <span>
        {totalNotes} total note{totalNotes !== 1 ? "s" : ""}
      </span>
      {filteredNotes !== totalNotes && <span>• {filteredNotes} filtered</span>}
      <button type="button" onClick={onToggleFilter}>
        Filters {isFilterPanelOpen ? "▲" : "▼"}
      </button>
      <button type="button" onClick={onRefresh} disabled={isLoading}>
        {isLoading ? "Refreshing..." : "Refresh Notes"}
      </button>
    </div>
  ),
}));

vi.mock("./ErrorDisplay", () => ({
  ErrorDisplay: ({ error, onRetry, onDismiss, isRetrying }: any) => (
    <div data-testid="error-display">
      <h3>Error Loading Card View Explorer</h3>
      <p>{error}</p>
      <button type="button" onClick={onRetry} disabled={isRetrying}>
        {isRetrying ? "Retrying..." : "Retry"}
      </button>
      <button type="button" onClick={onDismiss} disabled={isRetrying}>
        Dismiss
      </button>
    </div>
  ),
}));

vi.mock("./FilterPanel", () => ({
  FilterPanel: ({ availableTags, availableFolders }: any) => (
    <div data-testid="filter-panel">
      Filter Panel - Tags: {availableTags.length}, Folders: {availableFolders.length}
    </div>
  ),
}));

vi.mock("./LoadingSpinner", () => ({
  LoadingSpinner: ({ title, message, className }: any) => (
    <div data-testid="loading-spinner" className={className}>
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  ),
  FullPageLoading: () => (
    <div className="card-view-container">
      <div className="card-view-loading">
        <div data-testid="full-page-loading">
          <h3>Loading Card View Explorer</h3>
          <p>Loading your notes...</p>
        </div>
      </div>
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
    getData: vi.fn().mockReturnValue({}),
    getSettings: vi.fn().mockReturnValue({ sortKey: "updated" }),
  } as unknown as CardExplorerPlugin;

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

  // Mock functions
  const mockRefreshNotes = vi.fn();
  const mockSetError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock for useCardViewState
    vi.mocked(useCardViewState).mockReturnValue({
      shouldShowError: false,
      shouldShowFullPageLoading: false,
      shouldShowLoadingOverlay: false,
      canShowMainContent: true,
      error: null,
      isLoading: false,
      notes: mockNotes,
    });

    // Default mock for useCardExplorerStore
    vi.mocked(useCardExplorerStore).mockReturnValue({
      filteredNotes: mockNotes,
      availableTags: ["tag1", "tag2", "tag3"],
      availableFolders: ["Folder1", "Folder2"],
      refreshNotes: mockRefreshNotes,
      setError: mockSetError,
    });
  });

  describe("Initialization", () => {
    it("should call useCardViewInitialization hook with plugin", () => {
      render(<CardView plugin={mockPlugin} />);

      expect(useCardViewInitialization).toHaveBeenCalledWith(mockPlugin);
    });

    it("should call useCardViewState hook", () => {
      render(<CardView plugin={mockPlugin} />);

      expect(useCardViewState).toHaveBeenCalled();
    });

    it("should call useCardExplorerStore hook", () => {
      render(<CardView plugin={mockPlugin} />);

      expect(useCardExplorerStore).toHaveBeenCalled();
    });
  });

  describe("Error State", () => {
    it("should render ErrorDisplay when shouldShowError is true", () => {
      const errorMessage = "Failed to load notes";
      vi.mocked(useCardViewState).mockReturnValue({
        shouldShowError: true,
        shouldShowFullPageLoading: false,
        shouldShowLoadingOverlay: false,
        canShowMainContent: false,
        error: errorMessage,
        isLoading: false,
        notes: [],
      });

      render(<CardView plugin={mockPlugin} />);

      expect(screen.getByTestId("error-display")).toBeInTheDocument();
      expect(screen.getByText("Error Loading Card View Explorer")).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByText("Retry")).toBeInTheDocument();
      expect(screen.getByText("Dismiss")).toBeInTheDocument();
    });

    it("should handle retry in error state", async () => {
      const user = userEvent.setup();
      vi.mocked(useCardViewState).mockReturnValue({
        shouldShowError: true,
        shouldShowFullPageLoading: false,
        shouldShowLoadingOverlay: false,
        canShowMainContent: false,
        error: "Failed to load notes",
        isLoading: false,
        notes: [],
      });

      render(<CardView plugin={mockPlugin} />);

      const retryButton = screen.getByText("Retry");
      await user.click(retryButton);

      expect(mockSetError).toHaveBeenCalledWith(null);
      expect(mockRefreshNotes).toHaveBeenCalledWith(mockPlugin.app);
    });

    it("should handle dismiss in error state", async () => {
      const user = userEvent.setup();
      vi.mocked(useCardViewState).mockReturnValue({
        shouldShowError: true,
        shouldShowFullPageLoading: false,
        shouldShowLoadingOverlay: false,
        canShowMainContent: false,
        error: "Failed to load notes",
        isLoading: false,
        notes: [],
      });

      render(<CardView plugin={mockPlugin} />);

      const dismissButton = screen.getByText("Dismiss");
      await user.click(dismissButton);

      expect(mockSetError).toHaveBeenCalledWith(null);
    });

    it("should show retry state when retrying", () => {
      vi.mocked(useCardViewState).mockReturnValue({
        shouldShowError: true,
        shouldShowFullPageLoading: false,
        shouldShowLoadingOverlay: false,
        canShowMainContent: false,
        error: "Failed to load notes",
        isLoading: true, // Loading while in error state
        notes: [],
      });

      render(<CardView plugin={mockPlugin} />);

      expect(screen.getByText("Retrying...")).toBeInTheDocument();
      expect(screen.getByText("Retrying...")).toBeDisabled();
    });
  });

  describe("Loading State", () => {
    it("should show full page loading when shouldShowFullPageLoading is true", () => {
      vi.mocked(useCardViewState).mockReturnValue({
        shouldShowError: false,
        shouldShowFullPageLoading: true,
        shouldShowLoadingOverlay: false,
        canShowMainContent: false,
        error: null,
        isLoading: true,
        notes: [],
      });

      render(<CardView plugin={mockPlugin} />);

      expect(screen.getByTestId("full-page-loading")).toBeInTheDocument();
      expect(screen.getByText("Loading Card View Explorer")).toBeInTheDocument();
      expect(screen.getByText("Loading your notes...")).toBeInTheDocument();
    });
  });

  describe("Main Content", () => {
    it("should render main content when no error or full page loading", () => {
      render(<CardView plugin={mockPlugin} />);

      expect(screen.getByTestId("error-boundary")).toBeInTheDocument();
      expect(screen.getByTestId("card-view-header")).toBeInTheDocument();
      expect(screen.getByTestId("virtual-list")).toBeInTheDocument();
      expect(screen.getByText("Card View Explorer")).toBeInTheDocument();
    });

    it("should display correct note counts in header", () => {
      render(<CardView plugin={mockPlugin} />);

      expect(screen.getByText("2 total notes")).toBeInTheDocument();
      expect(screen.getByText("Filters ▼")).toBeInTheDocument(); // Filter panel closed by default
      expect(screen.getByText("Refresh Notes")).toBeInTheDocument();
    });

    it("should pass plugin to VirtualList", () => {
      render(<CardView plugin={mockPlugin} />);

      expect(screen.getByText("Virtual List - Plugin: present")).toBeInTheDocument();
    });
  });

  describe("Filter Panel", () => {
    it("should not show filter panel by default", () => {
      render(<CardView plugin={mockPlugin} />);

      expect(screen.queryByTestId("filter-panel")).not.toBeInTheDocument();
      expect(screen.getByText("Filters ▼")).toBeInTheDocument();
    });

    it("should toggle filter panel when filter toggle is clicked", async () => {
      const user = userEvent.setup();
      render(<CardView plugin={mockPlugin} />);

      // Initially closed
      expect(screen.queryByTestId("filter-panel")).not.toBeInTheDocument();
      expect(screen.getByText("Filters ▼")).toBeInTheDocument();

      // Click to open
      await user.click(screen.getByText("Filters ▼"));

      expect(screen.getByTestId("filter-panel")).toBeInTheDocument();
      expect(screen.getByText("Filters ▲")).toBeInTheDocument();

      // Click to close
      await user.click(screen.getByText("Filters ▲"));

      expect(screen.queryByTestId("filter-panel")).not.toBeInTheDocument();
      expect(screen.getByText("Filters ▼")).toBeInTheDocument();
    });

    it("should pass availableTags and availableFolders to FilterPanel", async () => {
      const user = userEvent.setup();
      render(<CardView plugin={mockPlugin} />);

      // Open filter panel
      await user.click(screen.getByText("Filters ▼"));

      expect(screen.getByText("Filter Panel - Tags: 3, Folders: 2")).toBeInTheDocument();
    });

    it("should maintain filter panel state across re-renders", async () => {
      const user = userEvent.setup();
      const { rerender } = render(<CardView plugin={mockPlugin} />);

      // Open filter panel
      await user.click(screen.getByText("Filters ▼"));
      expect(screen.getByTestId("filter-panel")).toBeInTheDocument();

      // Re-render with different data
      vi.mocked(useCardExplorerStore).mockReturnValue({
        filteredNotes: [mockNotes[0]],
        availableTags: ["tag1"],
        availableFolders: ["Folder1"],
        refreshNotes: mockRefreshNotes,
        setError: mockSetError,
      });

      rerender(<CardView plugin={mockPlugin} />);

      // Filter panel should still be open
      expect(screen.getByTestId("filter-panel")).toBeInTheDocument();
      expect(screen.getByText("Filter Panel - Tags: 1, Folders: 1")).toBeInTheDocument();
    });
  });

  describe("Loading Overlay", () => {
    it("should show loading overlay when shouldShowLoadingOverlay is true", () => {
      vi.mocked(useCardViewState).mockReturnValue({
        shouldShowError: false,
        shouldShowFullPageLoading: false,
        shouldShowLoadingOverlay: true,
        canShowMainContent: true,
        error: null,
        isLoading: true,
        notes: mockNotes,
      });

      render(<CardView plugin={mockPlugin} />);

      expect(screen.getByText("Refreshing notes...")).toBeInTheDocument();
      expect(screen.getByTestId("loading-spinner")).toHaveClass("overlay-loading");
    });

    it("should not show loading overlay when shouldShowLoadingOverlay is false", () => {
      render(<CardView plugin={mockPlugin} />);

      expect(screen.queryByText("Refreshing notes...")).not.toBeInTheDocument();
    });
  });

  describe("Header Integration", () => {
    it("should show filtered count when different from total", () => {
      vi.mocked(useCardExplorerStore).mockReturnValue({
        filteredNotes: [mockNotes[0]], // Only one filtered note
        availableTags: ["tag1", "tag2", "tag3"],
        availableFolders: ["Folder1", "Folder2"],
        refreshNotes: mockRefreshNotes,
        setError: mockSetError,
      });

      render(<CardView plugin={mockPlugin} />);

      expect(screen.getByText("2 total notes")).toBeInTheDocument();
      expect(screen.getByText("• 1 filtered")).toBeInTheDocument();
    });

    it("should handle singular note count", () => {
      vi.mocked(useCardViewState).mockReturnValue({
        shouldShowError: false,
        shouldShowFullPageLoading: false,
        shouldShowLoadingOverlay: false,
        canShowMainContent: true,
        error: null,
        isLoading: false,
        notes: [mockNotes[0]], // Only one note
      });

      vi.mocked(useCardExplorerStore).mockReturnValue({
        filteredNotes: [mockNotes[0]],
        availableTags: ["tag1"],
        availableFolders: ["Folder1"],
        refreshNotes: mockRefreshNotes,
        setError: mockSetError,
      });

      render(<CardView plugin={mockPlugin} />);

      expect(screen.getByText("1 total note")).toBeInTheDocument();
    });

    it("should handle refresh button click", async () => {
      const user = userEvent.setup();
      render(<CardView plugin={mockPlugin} />);

      const refreshButton = screen.getByText("Refresh Notes");
      await user.click(refreshButton);

      expect(mockSetError).toHaveBeenCalledWith(null);
      expect(mockRefreshNotes).toHaveBeenCalledWith(mockPlugin.app);
    });

    it("should disable refresh button when loading", () => {
      vi.mocked(useCardViewState).mockReturnValue({
        shouldShowError: false,
        shouldShowFullPageLoading: false,
        shouldShowLoadingOverlay: false,
        canShowMainContent: true,
        error: null,
        isLoading: true,
        notes: mockNotes,
      });

      render(<CardView plugin={mockPlugin} />);

      const refreshButton = screen.getByText("Refreshing...");
      expect(refreshButton).toBeDisabled();
    });
  });

  describe("Error Boundary Integration", () => {
    it("should wrap main content in CardViewErrorBoundary", () => {
      render(<CardView plugin={mockPlugin} />);

      expect(screen.getByTestId("error-boundary")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper ARIA attributes for filter panel", async () => {
      const user = userEvent.setup();
      render(<CardView plugin={mockPlugin} />);

      // Open filter panel
      await user.click(screen.getByText("Filters ▼"));

      const filterPanel = screen.getByRole("region", { name: "Note filters" });
      expect(filterPanel).toBeInTheDocument();
      expect(filterPanel).toHaveAttribute("id", "filter-panel");
    });
  });

  describe("Component Structure", () => {
    it("should have correct CSS class structure", () => {
      const { container } = render(<CardView plugin={mockPlugin} />);

      expect(container.querySelector(".card-view-container")).toBeInTheDocument();
      expect(container.querySelector(".card-view-content")).toBeInTheDocument();
      expect(container.querySelector(".card-view-main")).toBeInTheDocument();
    });

    it("should conditionally render filter panel container", async () => {
      const user = userEvent.setup();
      const { container } = render(<CardView plugin={mockPlugin} />);

      // Initially no filter panel container
      expect(container.querySelector(".card-view-filter-panel")).not.toBeInTheDocument();

      // Open filter panel
      await user.click(screen.getByText("Filters ▼"));

      // Now filter panel container should exist
      expect(container.querySelector(".card-view-filter-panel")).toBeInTheDocument();
    });

    it("should conditionally render loading overlay container", () => {
      vi.mocked(useCardViewState).mockReturnValue({
        shouldShowError: false,
        shouldShowFullPageLoading: false,
        shouldShowLoadingOverlay: true,
        canShowMainContent: true,
        error: null,
        isLoading: true,
        notes: mockNotes,
      });

      const { container } = render(<CardView plugin={mockPlugin} />);

      expect(container.querySelector(".card-view-loading-overlay")).toBeInTheDocument();
    });
  });
});
