import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ErrorDisplay } from "./ErrorDisplay";

// Mock Obsidian's setIcon function
vi.mock("obsidian", () => ({
  setIcon: vi.fn(),
}));

describe("ErrorDisplay", () => {
  const defaultProps = {
    error: "Test error message",
    onRetry: vi.fn(),
    onDismiss: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render error message and default title", () => {
    render(<ErrorDisplay {...defaultProps} />);

    expect(screen.getByText("Error Loading Card View Explorer")).toBeInTheDocument();
    expect(screen.getByText("Test error message")).toBeInTheDocument();
    expect(document.querySelector(".error-icon")).toBeInTheDocument();
  });

  it("should render default title", () => {
    render(<ErrorDisplay {...defaultProps} />);

    expect(screen.getByText("Error Loading Card View Explorer")).toBeInTheDocument();
    expect(screen.getByText("Test error message")).toBeInTheDocument();
  });

  it("should call onRetry when retry button is clicked", async () => {
    const user = userEvent.setup();
    render(<ErrorDisplay {...defaultProps} />);

    const retryButton = screen.getByRole("button", { name: "Retry" });
    await user.click(retryButton);

    expect(defaultProps.onRetry).toHaveBeenCalledTimes(1);
  });

  it("should call onDismiss when dismiss button is clicked", async () => {
    const user = userEvent.setup();
    render(<ErrorDisplay {...defaultProps} />);

    const dismissButton = screen.getByRole("button", { name: "Dismiss" });
    await user.click(dismissButton);

    expect(defaultProps.onDismiss).toHaveBeenCalledTimes(1);
  });

  it("should show retrying state when isRetrying is true", () => {
    render(<ErrorDisplay {...defaultProps} isRetrying={true} />);

    expect(screen.getByRole("button", { name: "Retrying..." })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).not.toBeInTheDocument();
  });

  it("should disable buttons when isRetrying is true", () => {
    render(<ErrorDisplay {...defaultProps} isRetrying={true} />);

    const retryButton = screen.getByRole("button", { name: "Retrying..." });
    const dismissButton = screen.getByRole("button", { name: "Dismiss" });

    expect(retryButton).toBeDisabled();
    expect(dismissButton).toBeDisabled();
  });

  it("should enable buttons when isRetrying is false", () => {
    render(<ErrorDisplay {...defaultProps} isRetrying={false} />);

    const retryButton = screen.getByRole("button", { name: "Retry" });
    const dismissButton = screen.getByRole("button", { name: "Dismiss" });

    expect(retryButton).not.toBeDisabled();
    expect(dismissButton).not.toBeDisabled();
  });

  it("should have proper CSS classes for styling", () => {
    render(<ErrorDisplay {...defaultProps} />);

    expect(document.querySelector(".card-view-container")).toBeInTheDocument();
    expect(document.querySelector(".card-view-error")).toBeInTheDocument();
    expect(document.querySelector(".error-content")).toBeInTheDocument();
    expect(document.querySelector(".error-icon")).toBeInTheDocument();
    expect(document.querySelector(".error-actions")).toBeInTheDocument();
    expect(document.querySelector(".error-retry-button")).toBeInTheDocument();
    expect(document.querySelector(".error-clear-button")).toBeInTheDocument();
  });
});
