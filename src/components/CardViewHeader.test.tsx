import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { describe, expect, it, vi } from "vitest";
import { CardViewHeader } from "./CardViewHeader";

describe("CardViewHeader", () => {
  const defaultProps = {
    totalNotes: 10,
    filteredNotes: 8,
    isFilterPanelOpen: false,
    isLoading: false,
    onToggleFilter: vi.fn(),
    onRefresh: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("should render the title", () => {
      render(<CardViewHeader {...defaultProps} />);
      expect(screen.getByRole("heading", { name: "Card View Explorer" })).toBeInTheDocument();
    });

    it("should display total notes count with correct pluralization", () => {
      render(<CardViewHeader {...defaultProps} totalNotes={1} filteredNotes={1} />);
      expect(screen.getByText("1 total note")).toBeInTheDocument();

      render(<CardViewHeader {...defaultProps} totalNotes={5} filteredNotes={5} />);
      expect(screen.getByText("5 total notes")).toBeInTheDocument();
    });

    it("should show filtered count when different from total", () => {
      render(<CardViewHeader {...defaultProps} totalNotes={10} filteredNotes={8} />);
      expect(screen.getByText("10 total notes")).toBeInTheDocument();
      expect(screen.getByText("• 8 filtered")).toBeInTheDocument();
    });

    it("should not show filtered count when same as total", () => {
      render(<CardViewHeader {...defaultProps} totalNotes={10} filteredNotes={10} />);
      expect(screen.getByText("10 total notes")).toBeInTheDocument();
      expect(screen.queryByText("• 10 filtered")).not.toBeInTheDocument();
    });

    it("should render filter toggle button with correct text", () => {
      render(<CardViewHeader {...defaultProps} isFilterPanelOpen={false} />);
      expect(screen.getByRole("button", { name: /filters ▼/i })).toBeInTheDocument();

      render(<CardViewHeader {...defaultProps} isFilterPanelOpen={true} />);
      expect(screen.getByRole("button", { name: /filters ▲/i })).toBeInTheDocument();
    });

    it("should render refresh button with correct text", () => {
      render(<CardViewHeader {...defaultProps} isLoading={false} />);
      expect(screen.getByRole("button", { name: "Refresh Notes" })).toBeInTheDocument();

      render(<CardViewHeader {...defaultProps} isLoading={true} />);
      expect(screen.getByRole("button", { name: "Refreshing..." })).toBeInTheDocument();
    });
  });

  describe("Filter Toggle Button", () => {
    it("should have correct accessibility attributes when closed", () => {
      render(<CardViewHeader {...defaultProps} isFilterPanelOpen={false} />);
      const button = screen.getByRole("button", { name: /filters/i });

      expect(button).toHaveAttribute("aria-expanded", "false");
      expect(button).toHaveAttribute("aria-controls", "filter-panel");
      expect(button).toHaveAttribute("title", "Show filters");
      expect(button).not.toHaveClass("active");
    });

    it("should have correct accessibility attributes when open", () => {
      render(<CardViewHeader {...defaultProps} isFilterPanelOpen={true} />);
      const button = screen.getByRole("button", { name: /filters/i });

      expect(button).toHaveAttribute("aria-expanded", "true");
      expect(button).toHaveAttribute("aria-controls", "filter-panel");
      expect(button).toHaveAttribute("title", "Hide filters");
      expect(button).toHaveClass("active");
    });

    it("should call onToggleFilter when clicked", async () => {
      const user = userEvent.setup();
      const mockToggle = vi.fn();

      render(<CardViewHeader {...defaultProps} onToggleFilter={mockToggle} />);
      const button = screen.getByRole("button", { name: /filters/i });

      await user.click(button);
      expect(mockToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe("Refresh Button", () => {
    it("should have correct accessibility attributes when not loading", () => {
      render(<CardViewHeader {...defaultProps} isLoading={false} />);
      const button = screen.getByRole("button", { name: "Refresh Notes" });

      expect(button).toHaveAttribute("title", "Refresh notes from vault");
      expect(button).toHaveAttribute("aria-busy", "false");
      expect(button).not.toBeDisabled();
    });

    it("should have correct accessibility attributes when loading", () => {
      render(<CardViewHeader {...defaultProps} isLoading={true} />);
      const button = screen.getByRole("button", { name: "Refreshing..." });

      expect(button).toHaveAttribute("title", "Refresh notes from vault");
      expect(button).toHaveAttribute("aria-busy", "true");
      expect(button).toBeDisabled();
    });

    it("should call onRefresh when clicked and not loading", async () => {
      const user = userEvent.setup();
      const mockRefresh = vi.fn();

      render(<CardViewHeader {...defaultProps} onRefresh={mockRefresh} isLoading={false} />);
      const button = screen.getByRole("button", { name: "Refresh Notes" });

      await user.click(button);
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it("should not call onRefresh when clicked and loading", async () => {
      const user = userEvent.setup();
      const mockRefresh = vi.fn();

      render(<CardViewHeader {...defaultProps} onRefresh={mockRefresh} isLoading={true} />);
      const button = screen.getByRole("button", { name: "Refreshing..." });

      // Button should be disabled, but let's try clicking anyway
      await user.click(button);
      expect(mockRefresh).not.toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero notes correctly", () => {
      render(<CardViewHeader {...defaultProps} totalNotes={0} filteredNotes={0} />);
      expect(screen.getByText("0 total notes")).toBeInTheDocument();
      expect(screen.queryByText("• 0 filtered")).not.toBeInTheDocument();
    });

    it("should handle large numbers correctly", () => {
      render(<CardViewHeader {...defaultProps} totalNotes={1000} filteredNotes={500} />);
      expect(screen.getByText("1000 total notes")).toBeInTheDocument();
      expect(screen.getByText("• 500 filtered")).toBeInTheDocument();
    });

    it("should handle filtered count being zero", () => {
      render(<CardViewHeader {...defaultProps} totalNotes={10} filteredNotes={0} />);
      expect(screen.getByText("10 total notes")).toBeInTheDocument();
      expect(screen.getByText("• 0 filtered")).toBeInTheDocument();
    });
  });

  describe("CSS Classes", () => {
    it("should apply correct CSS classes to elements", () => {
      render(<CardViewHeader {...defaultProps} />);

      expect(screen.getByRole("heading")).toHaveClass("card-view-title");
      expect(screen.getByText("10 total notes").parentElement).toHaveClass("card-view-stats");
      expect(screen.getByText("10 total notes")).toHaveClass("total-notes");
      expect(screen.getByText("• 8 filtered")).toHaveClass("filtered-notes");

      const actionsContainer = screen.getByRole("button", { name: /filters/i }).parentElement;
      expect(actionsContainer).toHaveClass("card-view-actions");

      expect(screen.getByRole("button", { name: /filters/i })).toHaveClass("filter-toggle-button");
      expect(screen.getByRole("button", { name: "Refresh Notes" })).toHaveClass("refresh-button");
    });

    it("should apply active class to filter button when panel is open", () => {
      render(<CardViewHeader {...defaultProps} isFilterPanelOpen={true} />);
      expect(screen.getByRole("button", { name: /filters/i })).toHaveClass(
        "filter-toggle-button",
        "active"
      );
    });
  });
});
