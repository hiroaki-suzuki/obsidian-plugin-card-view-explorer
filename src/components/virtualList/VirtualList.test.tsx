/** biome-ignore-all lint/suspicious/noArrayIndexKey: Using index as key in test mock is acceptable for virtuoso simulation */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type CardExplorerPlugin from "../../main";
import { useCardExplorerStore } from "../../store/cardExplorerStore";
import type { NoteData } from "../../types";
import { VirtualList } from "./VirtualList";

// TEST UTILITIES AND FACTORIES

interface TestState {
  filteredNotes: NoteData[];
  isLoading: boolean;
  error: string | null;
  filters: {
    tags: string[];
    folders: string[];
    filename: string;
    dateRange: null;
    excludeTags: string[];
    excludeFolders: string[];
    excludeFilenames: string[];
  };
}

interface TestHookReturns {
  rowSize: number;
  ref: { current: null };
  noteRows: Array<{ notes: NoteData[]; emptySlots: number }>;
  totalRows: number;
  retry: ReturnType<typeof vi.fn>;
}

/**
 * Factory for creating mock notes with consistent structure
 */
const createMockNote = (id: string, title = `Note ${id}`): NoteData => ({
  file: { path: `/note${id}.md` } as any,
  title,
  path: `/note${id}.md`,
  preview: `Preview for ${title}`,
  lastModified: new Date(),
  frontmatter: null,
  tags: [],
  folder: "",
});

/**
 * Factory for creating multiple mock notes
 */
const createMockNotes = (count: number): NoteData[] =>
  Array.from({ length: count }, (_, i) => createMockNote((i + 1).toString()));

/**
 * Default test state factory
 */
const createTestState = (overrides: Partial<TestState> = {}): TestState => ({
  filteredNotes: [],
  isLoading: false,
  error: null,
  filters: {
    tags: [],
    folders: [],
    filename: "",
    dateRange: null,
    excludeTags: [],
    excludeFolders: [],
    excludeFilenames: [],
  },
  ...overrides,
});

/**
 * Default hook returns factory
 */
const createTestHookReturns = (overrides: Partial<TestHookReturns> = {}): TestHookReturns => ({
  rowSize: 3,
  ref: { current: null },
  noteRows: [],
  totalRows: 0,
  retry: vi.fn(),
  ...overrides,
});

/**
 * Calculate note rows based on notes and row size (mirrors actual hook logic)
 */
const calculateNoteRows = (notes: NoteData[], rowSize: number) => {
  const rows = [];
  for (let i = 0; i < notes.length; i += rowSize) {
    const rowNotes = notes.slice(i, i + rowSize);
    const emptySlots = Math.max(0, rowSize - rowNotes.length);
    rows.push({ notes: rowNotes, emptySlots });
  }
  return rows;
};

/**
 * Test component renderer with default props
 */
const renderVirtualList = (plugin = mockPlugin) => render(<VirtualList plugin={plugin} />);

// MOCKS

// Component mocks
const mockVirtualizedNoteGrid = vi.fn();
vi.mock("./VirtualizedNoteGrid", () => ({
  VirtualizedNoteGrid: (props: any) => {
    mockVirtualizedNoteGrid(props);
    return (
      <div data-testid="virtualized-note-grid">
        VirtualizedNoteGrid with {props.noteRows.length} rows
      </div>
    );
  },
}));

vi.mock("./LoadingState", () => ({
  LoadingState: () => <div data-testid="loading-state">Loading notes...</div>,
}));

vi.mock("./ErrorFallback", () => ({
  ErrorFallback: ({
    onRetry,
    retryText,
    showRetry,
  }: {
    onRetry: () => void;
    retryText: string;
    showRetry: boolean;
  }) => (
    <div data-testid="error-fallback">
      <div>Error occurred</div>
      {showRetry && (
        <button type="button" onClick={onRetry}>
          {retryText}
        </button>
      )}
    </div>
  ),
}));

vi.mock("./EmptyState", () => ({
  EmptyState: () => <div data-testid="empty-state">No notes found</div>,
}));

// Hook mocks
const mockUseNoteGrid = vi.fn();
const mockUseResponsiveRowSize = vi.fn();
const mockUseRetryableRefreshNotes = vi.fn();
const mockUseScrollToTopOnChange = vi.fn();

vi.mock("../../hooks", () => ({
  useNoteGrid: (...args: any[]) => mockUseNoteGrid(...args),
  useResponsiveRowSize: () => mockUseResponsiveRowSize(),
  useRetryableRefreshNotes: (...args: any[]) => mockUseRetryableRefreshNotes(...args),
  useScrollToTopOnChange: (...args: any[]) => mockUseScrollToTopOnChange(...args),
}));

// Store mock
const mockUseCardExplorerStore = vi.mocked(useCardExplorerStore);
vi.mock("../../store/cardExplorerStore", () => ({
  useCardExplorerStore: vi.fn(),
}));

// Mock plugin
const mockPlugin = {
  app: {},
  refreshNotes: vi.fn(),
} as any as CardExplorerPlugin;

describe("VirtualList", () => {
  let testHookReturns: TestHookReturns;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset hook returns with defaults
    testHookReturns = createTestHookReturns();

    mockUseResponsiveRowSize.mockReturnValue({
      rowSize: testHookReturns.rowSize,
      ref: testHookReturns.ref,
    });

    mockUseRetryableRefreshNotes.mockReturnValue({
      retry: testHookReturns.retry,
    });

    mockUseNoteGrid.mockReturnValue({
      noteRows: testHookReturns.noteRows,
      totalRows: testHookReturns.totalRows,
    });

    mockUseScrollToTopOnChange.mockImplementation(() => {});

    // Set default store state
    mockUseCardExplorerStore.mockReturnValue(createTestState());
  });

  describe("State-based rendering", () => {
    interface StateTestCase {
      name: string;
      state: Partial<TestState>;
      expectedTestId: string;
      excludedTestIds: string[];
    }

    const stateTestCases: StateTestCase[] = [
      {
        name: "loading state",
        state: { isLoading: true },
        expectedTestId: "loading-state",
        excludedTestIds: ["error-fallback", "empty-state", "virtualized-note-grid"],
      },
      {
        name: "error state",
        state: { error: "Test error message" },
        expectedTestId: "error-fallback",
        excludedTestIds: ["loading-state", "empty-state", "virtualized-note-grid"],
      },
      {
        name: "empty state",
        state: { filteredNotes: [] },
        expectedTestId: "empty-state",
        excludedTestIds: ["loading-state", "error-fallback", "virtualized-note-grid"],
      },
      {
        name: "data state",
        state: { filteredNotes: createMockNotes(3) },
        expectedTestId: "virtualized-note-grid",
        excludedTestIds: ["loading-state", "error-fallback", "empty-state"],
      },
    ];

    it.each(stateTestCases)(
      "renders $name correctly",
      ({ state, expectedTestId, excludedTestIds }) => {
        // Arrange
        if (state.filteredNotes?.length) {
          testHookReturns.noteRows = calculateNoteRows(
            state.filteredNotes,
            testHookReturns.rowSize
          );
          testHookReturns.totalRows = testHookReturns.noteRows.length;
          mockUseNoteGrid.mockReturnValue({
            noteRows: testHookReturns.noteRows,
            totalRows: testHookReturns.totalRows,
          });
        }
        mockUseCardExplorerStore.mockReturnValue(createTestState(state));

        // Act
        renderVirtualList();

        // Assert
        expect(screen.getByTestId(expectedTestId)).toBeInTheDocument();
        excludedTestIds.forEach((testId) => {
          expect(screen.queryByTestId(testId)).not.toBeInTheDocument();
        });
      }
    );
  });

  describe("Error handling and retry", () => {
    beforeEach(() => {
      mockUseCardExplorerStore.mockReturnValue(createTestState({ error: "Test error" }));
    });

    it("calls retry function when retry button is clicked", async () => {
      // Arrange
      const user = userEvent.setup();
      renderVirtualList();

      // Act
      const retryButton = screen.getByRole("button", { name: "Retry" });
      await user.click(retryButton);

      // Assert
      expect(testHookReturns.retry).toHaveBeenCalledTimes(1);
    });

    it("shows 'Retrying...' text and hides retry button during retry", () => {
      // Arrange
      mockUseCardExplorerStore.mockReturnValue(
        createTestState({ error: "Test error", isLoading: true })
      );

      // Act
      renderVirtualList();

      // Assert
      expect(screen.getByTestId("error-fallback")).toBeInTheDocument();
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
  });

  describe("Hook integration", () => {
    interface HookTestCase {
      name: string;
      setup: () => void;
      expectation: () => void;
    }

    const hookTestCases: HookTestCase[] = [
      {
        name: "calls useResponsiveRowSize hook",
        setup: () => {
          mockUseCardExplorerStore.mockReturnValue(
            createTestState({ filteredNotes: createMockNotes(1) })
          );
        },
        expectation: () => {
          expect(mockUseResponsiveRowSize).toHaveBeenCalled();
        },
      },
      {
        name: "calls useRetryableRefreshNotes with plugin",
        setup: () => {
          mockUseCardExplorerStore.mockReturnValue(
            createTestState({ filteredNotes: createMockNotes(1) })
          );
        },
        expectation: () => {
          expect(mockUseRetryableRefreshNotes).toHaveBeenCalledWith(mockPlugin);
        },
      },
    ];

    it.each(hookTestCases)("$name", ({ setup, expectation }) => {
      // Arrange
      setup();

      // Act
      renderVirtualList();

      // Assert
      expectation();
    });

    it("calls useNoteGrid with correct parameters", () => {
      // Arrange
      const mockNotes = createMockNotes(3);
      const rowSize = 2;

      testHookReturns.rowSize = rowSize;
      mockUseResponsiveRowSize.mockReturnValue({
        rowSize,
        ref: testHookReturns.ref,
      });

      mockUseCardExplorerStore.mockReturnValue(createTestState({ filteredNotes: mockNotes }));

      // Act
      renderVirtualList();

      // Assert
      expect(mockUseNoteGrid).toHaveBeenCalledWith(mockNotes, rowSize);
    });

    it("calls useScrollToTopOnChange with correct parameters", () => {
      // Arrange
      const state = createTestState({ filteredNotes: createMockNotes(1) });
      mockUseCardExplorerStore.mockReturnValue(state);

      // Act
      renderVirtualList();

      // Assert
      expect(mockUseScrollToTopOnChange).toHaveBeenCalledWith(
        expect.objectContaining({ current: null }), // virtuosoRef
        state.filters,
        expect.any(Boolean) // hasInitiallyRendered
      );
    });
  });

  describe("VirtualizedNoteGrid integration", () => {
    interface GridTestCase {
      name: string;
      noteCount: number;
      rowSize: number;
    }

    const gridTestCases: GridTestCase[] = [
      { name: "single row with full capacity", noteCount: 3, rowSize: 3 },
      { name: "single row with partial capacity", noteCount: 2, rowSize: 3 },
      { name: "multiple rows", noteCount: 10, rowSize: 2 },
      { name: "large dataset", noteCount: 50, rowSize: 4 },
    ];

    it.each(gridTestCases)(
      "passes correct props to VirtualizedNoteGrid for $name",
      ({ noteCount, rowSize }) => {
        // Arrange
        const mockNotes = createMockNotes(noteCount);
        const expectedNoteRows = calculateNoteRows(mockNotes, rowSize);

        testHookReturns.rowSize = rowSize;
        testHookReturns.noteRows = expectedNoteRows;
        testHookReturns.totalRows = expectedNoteRows.length;

        mockUseResponsiveRowSize.mockReturnValue({
          rowSize,
          ref: testHookReturns.ref,
        });

        mockUseNoteGrid.mockReturnValue({
          noteRows: expectedNoteRows,
          totalRows: expectedNoteRows.length,
        });

        mockUseCardExplorerStore.mockReturnValue(createTestState({ filteredNotes: mockNotes }));

        // Act
        renderVirtualList();

        // Assert
        expect(screen.getByTestId("virtualized-note-grid")).toBeInTheDocument();
        expect(mockVirtualizedNoteGrid).toHaveBeenCalledWith(
          expect.objectContaining({
            noteRows: expectedNoteRows,
            totalRows: expectedNoteRows.length,
            plugin: mockPlugin,
            virtuosoRef: expect.objectContaining({ current: null }),
            containerRef: expect.objectContaining({ current: null }),
          })
        );
      }
    );
  });

  describe("Initial render tracking", () => {
    it("sets hasInitiallyRendered flag when notes are present", async () => {
      // Arrange
      const mockNotes = createMockNotes(1);
      const state = createTestState({ filteredNotes: mockNotes });
      mockUseCardExplorerStore.mockReturnValue(state);

      // Act
      renderVirtualList();

      // Assert
      await waitFor(() => {
        expect(mockUseScrollToTopOnChange).toHaveBeenLastCalledWith(
          expect.objectContaining({ current: null }),
          state.filters,
          true // hasInitiallyRendered should be true after notes are loaded
        );
      });
    });

    it("does not set hasInitiallyRendered flag when no notes are present", () => {
      // Arrange
      const state = createTestState({ filteredNotes: [] });
      mockUseCardExplorerStore.mockReturnValue(state);

      // Act
      renderVirtualList();

      // Assert
      expect(mockUseScrollToTopOnChange).toHaveBeenCalledWith(
        expect.objectContaining({ current: null }),
        state.filters,
        false // hasInitiallyRendered should remain false when no notes
      );
    });
  });
});
