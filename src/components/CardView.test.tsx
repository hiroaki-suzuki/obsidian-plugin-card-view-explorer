import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type CardExplorerPlugin from "../main";
import type { NoteData } from "../types";
import { CardView } from "./CardView";

vi.mock("../hooks/useCardViewInitialization", () => ({
  useCardViewInitialization: vi.fn(),
}));

vi.mock("../hooks/useCardViewState", () => ({
  useCardViewState: vi.fn(),
}));

// Hoisted store mock to support selector pattern and per-test overrides
const h = vi.hoisted(() => {
  const store = {
    filteredNotes: [] as any[],
    availableTags: [] as string[],
    availableFolders: [] as string[],
    refreshNotes: vi.fn(),
    setError: vi.fn(),
  };
  return { store };
});

vi.mock("../store/cardExplorerStore", () => {
  const useCardExplorerStore = vi.fn((selector?: (s: typeof h.store) => unknown) =>
    typeof selector === "function" ? selector(h.store) : h.store
  );
  return { useCardExplorerStore };
});

vi.mock("./CardViewErrorBoundary", () => ({
  CardViewErrorBoundary: vi.fn(({ children }: any) => {
    return children;
  }),
}));

vi.mock("./CardViewHeader", () => ({
  CardViewHeader: vi.fn((_props) => {
    return <div data-testid="card-view-header" />;
  }),
}));

vi.mock("./ErrorDisplay", () => ({
  ErrorDisplay: vi.fn((_props) => {
    return <div data-testid="error-display" />;
  }),
}));

vi.mock("./FilterPanel", () => ({
  FilterPanel: vi.fn((_props) => {
    return <div data-testid="filter-panel" />;
  }),
}));

vi.mock("./LoadingSpinner", () => ({
  LoadingSpinner: vi.fn((_props) => {
    return <div data-testid="loading-spinner" />;
  }),
  FullPageLoading: vi.fn((_props) => {
    return <div data-testid="full-page-loading" />;
  }),
}));

vi.mock("./virtualList", () => ({
  VirtualList: vi.fn((_props) => {
    return <div data-testid="virtual-list" />;
  }),
}));

import { useCardViewInitialization } from "../hooks/useCardViewInitialization";
import { useCardViewState } from "../hooks/useCardViewState";
import { useCardExplorerStore } from "../store/cardExplorerStore";
import { CardViewHeader } from "./CardViewHeader";
import { ErrorDisplay } from "./ErrorDisplay";
import { FilterPanel } from "./FilterPanel";
import { LoadingSpinner } from "./LoadingSpinner";
import { VirtualList } from "./virtualList";

// Test Data Factories and Builders
const createMockPlugin = (): CardExplorerPlugin =>
  ({
    app: {
      vault: {},
      metadataCache: {},
    },
    getData: vi.fn().mockReturnValue({}),
    getSettings: vi.fn().mockReturnValue({ sortKey: "updated" }),
  }) as unknown as CardExplorerPlugin;

const createMockNote = (id: number, overrides: Partial<NoteData> = {}): NoteData => ({
  file: { path: `note${id}.md` } as any,
  title: `Note ${id}`,
  path: `note${id}.md`,
  preview: `Preview ${id}`,
  lastModified: new Date(`2024-01-${String(id).padStart(2, "0")}`),
  frontmatter: null,
  tags: [`tag${id}`, `tag${id + 1}`],
  folder: `Folder${id}`,
  ...overrides,
});

const createMockNotes = (count: number = 2): NoteData[] =>
  Array.from({ length: count }, (_, i) => createMockNote(i + 1));

const createCardViewState = (overrides = {}) => ({
  shouldShowError: false,
  shouldShowFullPageLoading: false,
  shouldShowLoadingOverlay: false,
  canShowMainContent: true,
  error: null,
  isLoading: false,
  notes: createMockNotes(),
  ...overrides,
});

const createStoreState = (overrides = {}) => ({
  filteredNotes: createMockNotes(),
  availableTags: ["tag1", "tag2", "tag3"],
  availableFolders: ["Folder1", "Folder2"],
  refreshNotes: vi.fn(),
  setError: vi.fn(),
  ...overrides,
});

// Mock Helper Functions
const getLastComponentCall = <T extends (...args: any[]) => any>(component: T) => {
  const mockCalls = (component as unknown as { mock: { calls: any[][] } }).mock.calls;
  return mockCalls[mockCalls.length - 1]?.[0];
};

const mockHooks = {
  setupCardViewState: (state = {}) => {
    vi.mocked(useCardViewState).mockReturnValue(createCardViewState(state));
  },
  setupStoreState: (state = {}) => {
    Object.assign(h.store, createStoreState(state));
  },
};

// Test Helper Functions
const setupErrorState = (errorMessage = ERROR_MESSAGE, isRetrying = false) => {
  mockHooks.setupCardViewState({
    shouldShowError: true,
    shouldShowFullPageLoading: false,
    shouldShowLoadingOverlay: false,
    canShowMainContent: false,
    error: errorMessage,
    isLoading: isRetrying,
    notes: [],
  });
};

const expectHeaderProps = (expectedProps: any) => {
  const headerProps = getLastComponentCall(CardViewHeader);
  expect(headerProps).toEqual({
    onToggleFilter: expect.any(Function),
    onRefresh: expect.any(Function),
    ...expectedProps,
  });
};

const toggleFilterPanel = () => {
  const headerProps = getLastComponentCall(CardViewHeader);
  headerProps.onToggleFilter();
};

// Constants
const ERROR_MESSAGE = "Failed to load notes";

describe("CardView", () => {
  let mockPlugin: CardExplorerPlugin;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPlugin = createMockPlugin();
    mockHooks.setupCardViewState();
    mockHooks.setupStoreState();
  });

  describe("Initialization and Hook Integration", () => {
    it("should initialize all required hooks with correct parameters", () => {
      render(<CardView plugin={mockPlugin} />);

      expect(useCardViewInitialization).toHaveBeenCalledWith(mockPlugin);
      expect(useCardViewState).toHaveBeenCalled();
      expect(useCardExplorerStore).toHaveBeenCalled();
    });
  });

  describe("ErrorDisplay", () => {
    it("should render ErrorDisplay with correct props when error occurs", () => {
      setupErrorState();
      render(<CardView plugin={mockPlugin} />);

      expect(screen.getByTestId("error-display")).toBeInTheDocument();
      const errorProps = getLastComponentCall(ErrorDisplay);
      expect(errorProps).toEqual({
        error: ERROR_MESSAGE,
        onRetry: expect.any(Function),
        onDismiss: expect.any(Function),
        isRetrying: false,
      });
    });

    it.each([
      { description: "not retrying", isRetrying: false },
      { description: "retrying", isRetrying: true },
    ])("should handle error retry state when $description", ({ isRetrying }) => {
      setupErrorState(ERROR_MESSAGE, isRetrying);
      render(<CardView plugin={mockPlugin} />);

      const errorProps = getLastComponentCall(ErrorDisplay);
      expect(errorProps.isRetrying).toBe(isRetrying);
    });

    it("should execute retry operation correctly", async () => {
      const mockRefreshNotes = vi.fn();
      const mockSetError = vi.fn();

      setupErrorState();
      mockHooks.setupStoreState({ refreshNotes: mockRefreshNotes, setError: mockSetError });
      render(<CardView plugin={mockPlugin} />);

      const errorProps = getLastComponentCall(ErrorDisplay);
      await errorProps.onRetry();

      expect(mockSetError).toHaveBeenCalledWith(null);
      expect(mockRefreshNotes).toHaveBeenCalledWith(mockPlugin.app);
    });

    it("should dismiss error correctly", async () => {
      const mockSetError = vi.fn();
      setupErrorState();
      mockHooks.setupStoreState({ setError: mockSetError });
      render(<CardView plugin={mockPlugin} />);

      const errorProps = getLastComponentCall(ErrorDisplay);
      await errorProps.onDismiss();

      expect(mockSetError).toHaveBeenCalledWith(null);
    });
  });

  describe("FullPageLoading", () => {
    it("should show full page loading when required", () => {
      mockHooks.setupCardViewState({
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
    });
  });

  describe("CardViewErrorBoundary", () => {
    it("should render main content without error boundary fallback", () => {
      render(<CardView plugin={mockPlugin} />);

      expect(screen.queryByTestId("error-boundary-fallback")).not.toBeInTheDocument();
      expect(screen.getByTestId("card-view-header")).toBeInTheDocument();
      expect(screen.getByTestId("virtual-list")).toBeInTheDocument();
    });
  });

  describe("CardViewHeader", () => {
    it.each([
      {
        description: "equal total and filtered counts",
        totalNotes: 2,
        filteredCount: 2,
        isLoading: false,
      },
      {
        description: "different total and filtered counts",
        totalNotes: 2,
        filteredCount: 1,
        isLoading: false,
      },
      {
        description: "loading state",
        totalNotes: 2,
        filteredCount: 2,
        isLoading: true,
      },
      {
        description: "single note",
        totalNotes: 1,
        filteredCount: 1,
        isLoading: false,
      },
    ])("should display $description correctly", ({ totalNotes, filteredCount, isLoading }) => {
      const notes = createMockNotes(totalNotes);
      const filteredNotes = notes.slice(0, filteredCount);

      mockHooks.setupCardViewState({ notes, isLoading });
      mockHooks.setupStoreState({ filteredNotes });

      render(<CardView plugin={mockPlugin} />);

      expectHeaderProps({
        totalNotes,
        filteredNotes: filteredCount,
        isFilterPanelOpen: false,
        isLoading,
      });
    });

    it("should handle refresh action correctly", async () => {
      const mockRefreshNotes = vi.fn();
      const mockSetError = vi.fn();

      mockHooks.setupStoreState({ refreshNotes: mockRefreshNotes, setError: mockSetError });
      render(<CardView plugin={mockPlugin} />);

      const headerProps = getLastComponentCall(CardViewHeader);
      await headerProps.onRefresh();

      expect(mockSetError).toHaveBeenCalledWith(null);
      expect(mockRefreshNotes).toHaveBeenCalledWith(mockPlugin.app);
    });
  });

  describe("FilterPanel", () => {
    it("should toggle filter panel visibility", () => {
      const { rerender } = render(<CardView plugin={mockPlugin} />);

      // Initially closed
      expect(screen.queryByTestId("filter-panel")).not.toBeInTheDocument();
      expectHeaderProps({
        isFilterPanelOpen: false,
        filteredNotes: 2,
        totalNotes: 2,
        isLoading: false,
      });

      // Toggle to open
      act(() => {
        toggleFilterPanel();
      });
      rerender(<CardView plugin={mockPlugin} />);
      expect(screen.getByTestId("filter-panel")).toBeInTheDocument();
    });

    it("should pass available tags and folders to filter panel", () => {
      const availableTags = ["tag1", "tag2"];
      const availableFolders = ["Folder1"];

      mockHooks.setupStoreState({ availableTags, availableFolders });
      mockHooks.setupStoreState({ availableTags, availableFolders });
      const { rerender } = render(<CardView plugin={mockPlugin} />);

      act(() => {
        toggleFilterPanel();
      });
      rerender(<CardView plugin={mockPlugin} />);
      const filterProps = getLastComponentCall(FilterPanel);
      expect(filterProps).toEqual({
        availableTags,
        availableFolders,
      });
    });

    it("should maintain filter panel state across re-renders", () => {
      const { rerender } = render(<CardView plugin={mockPlugin} />);

      // Toggle to open
      act(() => {
        toggleFilterPanel();
      });

      // Re-render with different data
      mockHooks.setupStoreState({
        filteredNotes: [createMockNote(1)],
        availableTags: ["tag1"],
        availableFolders: ["Folder1"],
      });
      rerender(<CardView plugin={mockPlugin} />);

      // Filter panel should still be open
      expect(screen.getByTestId("filter-panel")).toBeInTheDocument();
    });
  });

  describe("LoadingSpinner", () => {
    it("should show loading overlay with correct props", () => {
      mockHooks.setupCardViewState({
        shouldShowLoadingOverlay: true,
        canShowMainContent: true,
        isLoading: true,
      });

      render(<CardView plugin={mockPlugin} />);

      const loadingProps = getLastComponentCall(LoadingSpinner);
      expect(loadingProps).toEqual({
        message: "Refreshing notes...",
      });
    });

    it("should not show loading overlay when not required", () => {
      render(<CardView plugin={mockPlugin} />);

      expect((LoadingSpinner as unknown as { mock: { calls: any[][] } }).mock.calls).toHaveLength(
        0
      );
    });
  });

  describe("VirtualList", () => {
    it("should pass plugin to VirtualList", () => {
      render(<CardView plugin={mockPlugin} />);

      const virtualListProps = getLastComponentCall(VirtualList);
      expect(virtualListProps).toEqual({
        plugin: mockPlugin,
      });
    });
  });
});
