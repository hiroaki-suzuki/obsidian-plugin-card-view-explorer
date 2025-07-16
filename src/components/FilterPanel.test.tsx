import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCardExplorerStore } from "../store/cardExplorerStore";
import { FilterPanel } from "./FilterPanel";

// Mock the store
const mockUpdateFilters = vi.fn();
const mockClearFilters = vi.fn();

vi.mock("../store/cardExplorerStore", () => ({
  useCardExplorerStore: vi.fn(),
}));

const mockUseCardExplorerStore = vi.mocked(useCardExplorerStore);

describe("FilterPanel", () => {
  const defaultProps = {
    availableTags: ["tag1", "tag2", "tag3"],
    availableFolders: ["folder1", "folder2", "subfolder/nested"],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Set default mock return value
    mockUseCardExplorerStore.mockReturnValue({
      filters: {
        folders: [],
        tags: [],
        filename: "",
        dateRange: null,
        excludeFolders: [],
        excludeTags: [],
        excludeFilenames: [],
      },
      updateFilters: mockUpdateFilters,
      clearFilters: mockClearFilters,
    });
  });

  it("renders filter panel structure", () => {
    render(<FilterPanel {...defaultProps} />);

    expect(screen.getByText("Filters")).toBeInTheDocument();
    expect(screen.getByLabelText("Search filename:")).toBeInTheDocument();
    expect(screen.getByText("Folders:")).toBeInTheDocument();
    expect(screen.getByText("Tags:")).toBeInTheDocument();
    expect(screen.getByText("Date filter:")).toBeInTheDocument();
  });

  it("handles filename search input", async () => {
    // Create a mock that tracks the filename state
    let currentFilename = "";
    mockUpdateFilters.mockImplementation(({ filename }) => {
      if (filename !== undefined) {
        currentFilename = filename;
        // Update the mock store to return the new filename
        mockUseCardExplorerStore.mockReturnValue({
          filters: {
            folders: [],
            tags: [],
            filename: currentFilename,
            dateRange: null,
            excludeFolders: [],
            excludeTags: [],
            excludeFilenames: [],
          },
          updateFilters: mockUpdateFilters,
          clearFilters: mockClearFilters,
        });
      }
    });

    const user = userEvent.setup();
    const { rerender } = render(<FilterPanel {...defaultProps} />);

    const filenameInput = screen.getByLabelText("Search filename:");
    await user.type(filenameInput, "test");

    // Force a re-render to pick up the updated mock state
    rerender(<FilterPanel {...defaultProps} />);

    // Check that updateFilters was called
    expect(mockUpdateFilters).toHaveBeenCalled();
    expect(mockUpdateFilters).toHaveBeenCalledWith({ filename: "t" });
  });

  it("handles folder selection", async () => {
    const user = userEvent.setup();
    render(<FilterPanel {...defaultProps} />);

    const folder1Checkbox = screen.getByRole("checkbox", { name: /folder1/ });
    await user.click(folder1Checkbox);

    expect(mockUpdateFilters).toHaveBeenCalledWith({ folders: ["folder1"] });
  });

  it("handles tag selection", async () => {
    const user = userEvent.setup();
    render(<FilterPanel {...defaultProps} />);

    const tag1Checkbox = screen.getByRole("checkbox", { name: /#tag1/ });
    await user.click(tag1Checkbox);

    expect(mockUpdateFilters).toHaveBeenCalledWith({ tags: ["tag1"] });
  });

  it("handles empty available options", () => {
    render(<FilterPanel availableTags={[]} availableFolders={[]} />);

    expect(screen.getByText("No folders available")).toBeInTheDocument();
    expect(screen.getByText("No tags available")).toBeInTheDocument();
  });

  it("shows clear filters button when filters are active", () => {
    // Mock store with active filters
    mockUseCardExplorerStore.mockReturnValue({
      filters: {
        folders: ["folder1"],
        tags: [],
        filename: "test",
        dateRange: null,
        excludeFolders: [],
        excludeTags: [],
        excludeFilenames: [],
      },
      updateFilters: mockUpdateFilters,
      clearFilters: mockClearFilters,
    });

    render(<FilterPanel {...defaultProps} />);

    const clearButton = screen.getByRole("button", { name: "Clear All" });
    expect(clearButton).toBeInTheDocument();
  });

  it("handles clear filters button click", async () => {
    // Mock store with active filters
    mockUseCardExplorerStore.mockReturnValue({
      filters: {
        folders: ["folder1"],
        tags: [],
        filename: "test",
        dateRange: null,
        excludeFolders: [],
        excludeTags: [],
        excludeFilenames: [],
      },
      updateFilters: mockUpdateFilters,
      clearFilters: mockClearFilters,
    });

    const user = userEvent.setup();
    render(<FilterPanel {...defaultProps} />);

    const clearButton = screen.getByRole("button", { name: "Clear All" });
    await user.click(clearButton);

    expect(mockClearFilters).toHaveBeenCalled();
  });

  it("handles date filter - within days", async () => {
    const user = userEvent.setup();
    render(<FilterPanel {...defaultProps} />);

    const dateTypeSelect = screen.getByDisplayValue("Within last");
    const dateInput = screen.getByRole("spinbutton");
    const applyButton = screen.getByRole("button", { name: "Apply" });

    await user.selectOptions(dateTypeSelect, "within");
    await user.type(dateInput, "7");
    await user.click(applyButton);

    expect(mockUpdateFilters).toHaveBeenCalledWith({
      dateRange: {
        type: "within",
        value: expect.any(Date),
      },
    });
  });

  it("handles date filter - after date", async () => {
    const user = userEvent.setup();
    render(<FilterPanel {...defaultProps} />);

    const dateTypeSelect = screen.getByDisplayValue("Within last");
    await user.selectOptions(dateTypeSelect, "after");

    const dateInput = screen
      .getAllByDisplayValue("")
      .find((input) => (input as HTMLInputElement).type === "date") as HTMLInputElement;
    const applyButton = screen.getByRole("button", { name: "Apply" });

    await user.type(dateInput, "2024-01-01");
    await user.click(applyButton);

    expect(mockUpdateFilters).toHaveBeenCalledWith({
      dateRange: {
        type: "after",
        value: expect.any(Date),
      },
    });
  });

  it("disables apply button when date input is empty", () => {
    render(<FilterPanel {...defaultProps} />);

    const applyButton = screen.getByRole("button", { name: "Apply" });
    expect(applyButton).toBeDisabled();
  });

  it("shows active date filter with remove option", () => {
    // Mock store with active date filter
    mockUseCardExplorerStore.mockReturnValue({
      filters: {
        folders: [],
        tags: [],
        filename: "",
        dateRange: {
          type: "within",
          value: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        },
        excludeFolders: [],
        excludeTags: [],
        excludeFilenames: [],
      },
      updateFilters: mockUpdateFilters,
      clearFilters: mockClearFilters,
    });

    render(<FilterPanel {...defaultProps} />);

    expect(screen.getByText(/Active:/)).toBeInTheDocument();
    expect(screen.getByText(/Within \d+ days/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "×" })).toBeInTheDocument();
  });

  it("shows filter summary when filters are active", () => {
    // Mock store with multiple active filters
    mockUseCardExplorerStore.mockReturnValue({
      filters: {
        folders: ["folder1", "folder2"],
        tags: ["tag1"],
        filename: "test",
        dateRange: {
          type: "within",
          value: new Date(),
        },
        excludeFolders: [],
        excludeTags: [],
        excludeFilenames: [],
      },
      updateFilters: mockUpdateFilters,
      clearFilters: mockClearFilters,
    });

    render(<FilterPanel {...defaultProps} />);

    expect(screen.getByText("Active filters:")).toBeInTheDocument();
    expect(screen.getByText('Filename: "test"')).toBeInTheDocument();
    expect(screen.getByText("Folders: 2 selected")).toBeInTheDocument();
    expect(screen.getByText("Tags: 1 selected")).toBeInTheDocument();
    expect(screen.getByText("Date: within filter active")).toBeInTheDocument();
  });

  it("shows selected folders and tags", () => {
    // Mock store with selected items
    mockUseCardExplorerStore.mockReturnValue({
      filters: {
        folders: ["folder1"],
        tags: ["tag1", "tag2"],
        filename: "",
        dateRange: null,
        excludeFolders: [],
        excludeTags: [],
        excludeFilenames: [],
      },
      updateFilters: mockUpdateFilters,
      clearFilters: mockClearFilters,
    });

    render(<FilterPanel {...defaultProps} />);

    expect(screen.getByText("Selected: folder1")).toBeInTheDocument();
    expect(screen.getByText("Selected: #tag1, #tag2")).toBeInTheDocument();
  });

  it("handles multiple folder selection", async () => {
    // Mock store with one folder already selected
    mockUseCardExplorerStore.mockReturnValue({
      filters: {
        folders: ["folder1"],
        tags: [],
        filename: "",
        dateRange: null,
        excludeFolders: [],
        excludeTags: [],
        excludeFilenames: [],
      },
      updateFilters: mockUpdateFilters,
      clearFilters: mockClearFilters,
    });

    const user = userEvent.setup();
    render(<FilterPanel {...defaultProps} />);

    const folder2Checkbox = screen.getByRole("checkbox", { name: /folder2/ });
    await user.click(folder2Checkbox);

    expect(mockUpdateFilters).toHaveBeenCalledWith({ folders: ["folder1", "folder2"] });
  });

  it("handles folder deselection", async () => {
    // Mock store with folder already selected
    mockUseCardExplorerStore.mockReturnValue({
      filters: {
        folders: ["folder1", "folder2"],
        tags: [],
        filename: "",
        dateRange: null,
        excludeFolders: [],
        excludeTags: [],
        excludeFilenames: [],
      },
      updateFilters: mockUpdateFilters,
      clearFilters: mockClearFilters,
    });

    const user = userEvent.setup();
    render(<FilterPanel {...defaultProps} />);

    const folder1Checkbox = screen.getByRole("checkbox", { name: /folder1/ });
    await user.click(folder1Checkbox);

    expect(mockUpdateFilters).toHaveBeenCalledWith({ folders: ["folder2"] });
  });

  it("handles invalid date input gracefully", async () => {
    const user = userEvent.setup();
    render(<FilterPanel {...defaultProps} />);

    const dateInput = screen.getByRole("spinbutton");
    const applyButton = screen.getByRole("button", { name: "Apply" });

    await user.type(dateInput, "invalid");
    await user.click(applyButton);

    // Should not call updateFilters with invalid date
    expect(mockUpdateFilters).not.toHaveBeenCalled();
  });

  it("clears date filter when input is empty", async () => {
    const user = userEvent.setup();
    render(<FilterPanel {...defaultProps} />);

    const dateInput = screen.getByRole("spinbutton");
    const applyButton = screen.getByRole("button", { name: "Apply" });

    // First add some text then clear it
    await user.type(dateInput, "7");
    await user.clear(dateInput);

    // The apply button should be disabled when input is empty, so this test
    // should verify that the button is disabled rather than clicking it
    expect(applyButton).toBeDisabled();
  });
});
