import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCardExplorerStore } from "../store/cardExplorerStore";
import type { FilterState } from "../types";
import { FilterPanel } from "./FilterPanel";

// Mock functions (typed to match store API)
const mockUpdateFilters = vi.fn<(filters: Partial<FilterState>) => void>();
const mockClearFilters = vi.fn<() => void>();
const mockHasActiveFilters = vi.fn<() => boolean>();

vi.mock("../store/cardExplorerStore", () => ({
  useCardExplorerStore: vi.fn(),
}));

const mockUseCardExplorerStore = vi.mocked(useCardExplorerStore);

// Test data factories
// Minimal slice of the store consumed by FilterPanel
type MockStoreSlice = {
  filters: FilterState;
  updateFilters: (filters: Partial<FilterState>) => void;
  clearFilters: () => void;
  hasActiveFilters: () => boolean;
};

// Allow tests to override parts of the slice
interface MockStoreOverrides {
  filters?: Partial<FilterState>;
  updateFilters?: (filters: Partial<FilterState>) => void;
  clearFilters?: () => void;
  hasActiveFilters?: () => boolean;
}

const createMockStoreData = (overrides: MockStoreOverrides = {}): MockStoreSlice => {
  const defaultFilters: FilterState = {
    folders: [],
    tags: [],
    filename: "",
    dateRange: null,
  };

  const slice: MockStoreSlice = {
    filters: { ...defaultFilters, ...(overrides.filters ?? {}) },
    updateFilters: overrides.updateFilters ?? mockUpdateFilters,
    clearFilters: overrides.clearFilters ?? mockClearFilters,
    hasActiveFilters: overrides.hasActiveFilters ?? mockHasActiveFilters,
  };
  return slice;
};

// Test fixtures
const TEST_PROPS = {
  default: {
    availableTags: ["tag1", "tag2", "tag3"],
    availableFolders: ["folder1", "folder2", "subfolder/nested"],
  },
  empty: {
    availableTags: [] as string[],
    availableFolders: [] as string[],
  },
  withRoot: {
    availableTags: ["tag1", "tag2", "tag3"],
    availableFolders: ["", "folder1"],
  },
};

// Test helper class
class FilterPanelTestHelper {
  public user = userEvent.setup();

  async renderWithMockStore(
    props: typeof TEST_PROPS.default,
    storeOverrides: MockStoreOverrides = {}
  ) {
    mockUseCardExplorerStore.mockReturnValue(createMockStoreData(storeOverrides));
    render(<FilterPanel {...props} />);
  }

  // Element getters
  getFilenameInput() {
    return screen.getByLabelText("Filename:");
  }

  getFolderCheckbox(folderName: string) {
    return screen.getByRole("checkbox", { name: folderName });
  }

  getTagCheckbox(tagName: string) {
    return screen.getByRole("checkbox", { name: new RegExp(tagName) });
  }

  getClearAllButton() {
    return screen.getByRole("button", { name: "Clear All" });
  }

  getDateTypeSelect() {
    return screen.getByTitle("Date filter type");
  }

  getDateInput() {
    return screen.getByLabelText("Date:");
  }

  getDateInputByType() {
    // Both types use the same element with id="filter-date"
    return this.getDateInput() as HTMLInputElement;
  }

  // Action methods
  async typeFilename(text: string) {
    const input = this.getFilenameInput();
    await this.user.type(input, text);
  }

  async selectFolder(folderName: string) {
    const checkbox = this.getFolderCheckbox(folderName);
    await this.user.click(checkbox);
  }

  async selectTag(tagName: string) {
    const checkbox = this.getTagCheckbox(tagName);
    await this.user.click(checkbox);
  }

  async clickClearAll() {
    const button = this.getClearAllButton();
    await this.user.click(button);
  }

  async changeDateType(dateType: "within" | "after") {
    const select = this.getDateTypeSelect();
    await this.user.selectOptions(select, dateType);
  }

  async typeDateInput(value: string) {
    const input = this.getDateInputByType();
    await this.user.type(input, value);
  }

  // Assertion methods
  expectUpdateFiltersCalledWith(expectedFilters: any) {
    expect(mockUpdateFilters).toHaveBeenCalledWith(expectedFilters);
  }

  expectClearFiltersCalled() {
    expect(mockClearFilters).toHaveBeenCalled();
  }

  async waitForFilenameUpdate(expectedFilename: string) {
    await waitFor(
      () => {
        this.expectUpdateFiltersCalledWith({ filename: expectedFilename });
      },
      { timeout: 300 }
    );
  }
}

describe("FilterPanel", () => {
  let helper: FilterPanelTestHelper;

  beforeEach(() => {
    vi.resetAllMocks();
    helper = new FilterPanelTestHelper();
    // Explicit default for "no active filters" unless a test overrides it
    mockHasActiveFilters.mockReturnValue(false);
    mockUseCardExplorerStore.mockReturnValue(createMockStoreData());
  });

  // Rendering tests
  describe("Rendering", () => {
    it("renders filter panel structure", async () => {
      await helper.renderWithMockStore(TEST_PROPS.default);

      expect(screen.getByText("Filters")).toBeInTheDocument();
      expect(screen.getByLabelText("Filename:")).toBeInTheDocument();
      expect(screen.getByText("Folders:")).toBeInTheDocument();
      expect(screen.getByText("Tags:")).toBeInTheDocument();
      expect(screen.getByText("Date:")).toBeInTheDocument();
    });

    it("handles empty available options", async () => {
      await helper.renderWithMockStore(TEST_PROPS.empty);

      expect(screen.getByText("No folders available")).toBeInTheDocument();
      expect(screen.getByText("No tags available")).toBeInTheDocument();
    });
  });

  // Filename filtering tests
  describe("Filename Filtering", () => {
    it("handles filename search input with debounce", async () => {
      await helper.renderWithMockStore(TEST_PROPS.default);

      await helper.typeFilename("test");
      await helper.waitForFilenameUpdate("test");
    });
  });

  // Folder filtering tests with parameterized tests
  describe("Folder Filtering", () => {
    const folderTestCases = [
      {
        description: "handles folder selection",
        initialState: {},
        action: "folder1",
        expected: { folders: ["folder1"] },
      },
      {
        description: "handles multiple folder selection",
        initialState: { filters: { folders: ["folder1"] } },
        action: "folder2",
        expected: { folders: ["folder1", "folder2"] },
      },
      {
        description: "handles folder deselection",
        initialState: { filters: { folders: ["folder1", "folder2"] } },
        action: "folder1",
        expected: { folders: ["folder2"] },
      },
    ];

    folderTestCases.forEach(({ description, initialState, action, expected }) => {
      it(description, async () => {
        await helper.renderWithMockStore(TEST_PROPS.default, initialState);
        await helper.selectFolder(action);
        helper.expectUpdateFiltersCalledWith(expected);
      });
    });

    it("displays (Root) for empty folder and toggles selection", async () => {
      await helper.renderWithMockStore(TEST_PROPS.withRoot);

      const rootLabel = screen.getByText("(Root)");
      expect(rootLabel).toBeInTheDocument();

      const rootCheckbox = rootLabel.previousElementSibling as HTMLInputElement;
      await helper.user.click(rootCheckbox);

      helper.expectUpdateFiltersCalledWith({ folders: [""] });
    });
  });

  // Tag filtering tests with parameterized tests
  describe("Tag Filtering", () => {
    const tagTestCases = [
      {
        description: "handles tag selection",
        initialState: {},
        action: "tag1",
        expected: { tags: ["tag1"] },
      },
      {
        description: "toggles selected tag off",
        initialState: { filters: { tags: ["tag1"] } },
        action: "tag1",
        expected: { tags: [] },
      },
    ];

    tagTestCases.forEach(({ description, initialState, action, expected }) => {
      it(description, async () => {
        await helper.renderWithMockStore(TEST_PROPS.default, initialState);
        await helper.selectTag(action);
        helper.expectUpdateFiltersCalledWith(expected);
      });
    });
  });

  // Clear filters tests
  describe("Clear Filters", () => {
    const clearFilterTestCases = [
      {
        description: "shows clear filters button when filters are active",
        setupAction: async () => {
          mockHasActiveFilters.mockReturnValue(true);
          await helper.renderWithMockStore(TEST_PROPS.default, {
            filters: { folders: ["folder1"], filename: "test" },
            hasActiveFilters: mockHasActiveFilters,
          });
        },
        assertion: () => {
          const clearButton = screen.getByRole("button", { name: "Clear All" });
          expect(clearButton).toBeInTheDocument();
        },
      },
      {
        description: "handles clear filters button click",
        setupAction: async () => {
          mockHasActiveFilters.mockReturnValue(true);
          await helper.renderWithMockStore(TEST_PROPS.default, {
            filters: { folders: ["folder1"], tags: ["tag1"], filename: "test" },
            hasActiveFilters: mockHasActiveFilters,
          });
        },
        action: async () => {
          await helper.clickClearAll();
        },
        assertion: () => {
          helper.expectClearFiltersCalled();
        },
      },
    ];

    clearFilterTestCases.forEach(({ description, setupAction, action, assertion }) => {
      it(description, async () => {
        await setupAction();
        if (action) await action();
        assertion();
      });
    });
  });

  // Date filtering tests
  describe("Date Filtering", () => {
    it("handles date filter - within days", async () => {
      await helper.renderWithMockStore(TEST_PROPS.default);

      await helper.typeDateInput("7");

      helper.expectUpdateFiltersCalledWith({
        dateRange: {
          type: "within",
          value: expect.any(Date),
        },
      });
    });

    it("prefills within-days input from store value (numeric/stringable)", async () => {
      await helper.renderWithMockStore(TEST_PROPS.default, {
        // value provided as a number via any-cast to exercise String(value ?? "") path
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        filters: { dateRange: { type: "within", value: 7 } as any },
      });

      const input = helper.getDateInputByType();
      expect(input.getAttribute("type")).toBe("number");
      expect(input.value).toBe("7");
    });

    it("shows empty within-days input when store value is undefined/empty", async () => {
      await helper.renderWithMockStore(TEST_PROPS.default, {
        // Explicit undefined to validate nullish coalescing to ""
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        filters: { dateRange: { type: "within", value: undefined } as any },
      });

      const input = helper.getDateInputByType();
      expect(input.getAttribute("type")).toBe("number");
      expect(input.value).toBe("");
    });

    it("handles date filter - after date", async () => {
      await helper.renderWithMockStore(TEST_PROPS.default);

      await helper.changeDateType("after");
      await helper.typeDateInput("2024-01-01");

      helper.expectUpdateFiltersCalledWith({
        dateRange: {
          type: "after",
          value: expect.any(Date),
        },
      });
    });

    describe("handleDateTypeChange functionality", () => {
      it("syncs date type from store when dateRange exists", async () => {
        await helper.renderWithMockStore(TEST_PROPS.default, {
          filters: {
            dateRange: { type: "after", value: new Date("2024-01-01") },
          },
        });

        // The select should reflect the store-provided type "after"
        expect(screen.getByDisplayValue("After date")).toBeInTheDocument();
      });

      it("reapplies date filter on type change when input exists", async () => {
        await helper.renderWithMockStore(TEST_PROPS.default);

        // First, switch to "after" and input a valid date
        await helper.changeDateType("after");
        await helper.typeDateInput("2024-01-01");
        // Wait for the input to be processed and updateFilters to be called for 'after'
        await waitFor(() => {
          helper.expectUpdateFiltersCalledWith({
            dateRange: {
              type: "after",
              value: expect.any(Date),
            },
          });
        });

        // Clear the mock calls to focus on the next change
        mockUpdateFilters.mockClear();

        // Now change the type back to "within" - this should trigger handleDateTypeChange
        await helper.changeDateType("within");
        await helper.typeDateInput("3");

        // Wait for the handleDateTypeChange effect to trigger updateFilters for 'within'
        await waitFor(() => {
          helper.expectUpdateFiltersCalledWith({
            dateRange: {
              type: "within",
              value: expect.any(Date),
            },
          });
        });

        // Expect an update triggered by handleDateTypeChange using existing input
        helper.expectUpdateFiltersCalledWith({
          dateRange: {
            type: "within",
            value: expect.any(Date),
          },
        });
      });

      it("reapplies date filter when switching back to 'after' with existing input", async () => {
        await helper.renderWithMockStore(TEST_PROPS.default);

        // Switch to 'after' and enter a valid date
        await helper.changeDateType("after");
        await helper.typeDateInput("2024-01-02");

        // Switch to 'within' (will trigger handleDateTypeChange once)
        await helper.changeDateType("within");
        await helper.typeDateInput("10");
        // Wait for the 'within' update to be applied
        await waitFor(() => {
          helper.expectUpdateFiltersCalledWith({
            dateRange: {
              type: "within",
              value: expect.any(Date),
            },
          });
        });

        // Clear mock calls to focus on the next change
        mockUpdateFilters.mockClear();

        // Switch back to 'after' with existing dateInput still present
        await helper.changeDateType("after");

        // Wait for the handleDateTypeChange effect to trigger update for 'after'
        await waitFor(() => {
          helper.expectUpdateFiltersCalledWith({
            dateRange: {
              type: "after",
              value: expect.any(Date),
            },
          });
        });

        // Expect an update triggered by handleDateTypeChange using existing date string
        helper.expectUpdateFiltersCalledWith({
          dateRange: {
            type: "after",
            value: expect.any(Date),
          },
        });
      });

      it("does not call updateFilters when switching types with empty input", async () => {
        await helper.renderWithMockStore(TEST_PROPS.default);

        // Clear any previous calls
        mockUpdateFilters.mockClear();

        // Change type without any input - should not trigger updateFilters
        await helper.changeDateType("after");
        await helper.changeDateType("within");

        // updateFilters should not have been called for type changes without input
        expect(mockUpdateFilters).not.toHaveBeenCalled();
      });
    });

    it("prefills after-date input from store when value is ISO string", async () => {
      await helper.renderWithMockStore(TEST_PROPS.default, {
        filters: { dateRange: { type: "after", value: "2024-01-11" } },
      });

      const input = helper.getDateInputByType();
      expect(input.getAttribute("type")).toBe("date");
      expect(input.value).toBe("2024-01-11");
    });

    it("prefills after-date input from store when value is Date object", async () => {
      await helper.renderWithMockStore(TEST_PROPS.default, {
        filters: { dateRange: { type: "after", value: new Date("2024-01-12T00:00:00Z") } },
      });

      const input = helper.getDateInputByType();
      expect(input.getAttribute("type")).toBe("date");
      expect(input.value).toBe("2024-01-12");
    });

    it("clears date filter when input is empty", async () => {
      await helper.renderWithMockStore(TEST_PROPS.default);

      await helper.typeDateInput("7");
      const dateInput = helper.getDateInput();
      await helper.user.clear(dateInput);

      expect(mockUpdateFilters).toHaveBeenLastCalledWith({ dateRange: null });
    });

    it("handles invalid date input gracefully", async () => {
      await helper.renderWithMockStore(TEST_PROPS.default);

      await helper.typeDateInput("invalid");

      expect(mockUpdateFilters).not.toHaveBeenCalled();
    });
  });

  // Visual state tests
  describe("Visual State", () => {
    it("shows selected folders and tags as checked", async () => {
      await helper.renderWithMockStore(TEST_PROPS.default, {
        filters: {
          folders: ["folder1"],
          tags: ["tag1", "tag2"],
        },
      });

      // Check that the checkboxes are checked for selected items
      const folder1Checkbox = screen.getByText("folder1")
        .previousElementSibling as HTMLInputElement;
      const tag1Checkbox = screen.getByText("tag1").previousElementSibling as HTMLInputElement;
      const tag2Checkbox = screen.getByText("tag2").previousElementSibling as HTMLInputElement;

      expect(folder1Checkbox?.checked).toBe(true);
      expect(tag1Checkbox?.checked).toBe(true);
      expect(tag2Checkbox?.checked).toBe(true);
    });
  });
});
