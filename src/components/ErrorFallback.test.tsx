import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorCategory } from "../core/errors/errorHandling";
import { ErrorFallback, useErrorFallback } from "./ErrorFallback";

// Mock console methods for testing
const mockConsoleGroup = vi.spyOn(console, "group").mockImplementation(() => {});
const mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});
const mockConsoleGroupEnd = vi.spyOn(console, "groupEnd").mockImplementation(() => {});

describe("ErrorFallback", () => {
  const mockError = new Error("Test error message");
  const mockOnRetry = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic rendering", () => {
    it("should render error title and default message", () => {
      render(<ErrorFallback error={mockError} />);

      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      expect(screen.getByText("An unexpected error occurred.")).toBeInTheDocument();
    });

    it("should render custom message when provided", () => {
      const customMessage = "Custom error message";
      render(<ErrorFallback error={mockError} message={customMessage} />);

      expect(screen.getByText(customMessage)).toBeInTheDocument();
    });

    it("should render with appropriate CSS classes", () => {
      const { container } = render(
        <ErrorFallback error={mockError} category={ErrorCategory.API} />
      );

      expect(container.firstChild).toHaveClass("error-fallback", "error-api");
    });
  });

  describe("Error categories", () => {
    it("should display DATA category message", () => {
      render(<ErrorFallback error={mockError} category={ErrorCategory.DATA} />);

      expect(
        screen.getByText(
          "Failed to load note data. Your information may be temporarily unavailable."
        )
      ).toBeInTheDocument();
      expect(
        screen.getByText("Try refreshing your notes or restart the plugin.")
      ).toBeInTheDocument();
    });

    it("should display API category message", () => {
      render(<ErrorFallback error={mockError} category={ErrorCategory.API} />);

      expect(
        screen.getByText("Failed to communicate with Obsidian. Please try refreshing.")
      ).toBeInTheDocument();
      expect(screen.getByText("Try refreshing the view or restart Obsidian.")).toBeInTheDocument();
    });

    it("should display UI category message", () => {
      render(<ErrorFallback error={mockError} category={ErrorCategory.UI} />);

      expect(
        screen.getByText("Interface error occurred. Please try refreshing the view.")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Try refreshing the view or restart the plugin.")
      ).toBeInTheDocument();
    });

    it("should display GENERAL category message", () => {
      render(<ErrorFallback error={mockError} category={ErrorCategory.GENERAL} />);

      expect(screen.getByText("An unexpected error occurred.")).toBeInTheDocument();
      expect(
        screen.getByText("Try refreshing the view or restart the plugin.")
      ).toBeInTheDocument();
    });
  });

  describe("Retry functionality", () => {
    it("should render retry button when onRetry is provided", () => {
      render(<ErrorFallback error={mockError} onRetry={mockOnRetry} />);

      expect(screen.getByRole("button", { name: "Try Again" })).toBeInTheDocument();
    });

    it("should render custom retry text", () => {
      render(<ErrorFallback error={mockError} onRetry={mockOnRetry} retryText="Retry Now" />);

      expect(screen.getByRole("button", { name: "Retry Now" })).toBeInTheDocument();
    });

    it("should call onRetry when retry button is clicked", async () => {
      const user = userEvent.setup();
      render(<ErrorFallback error={mockError} onRetry={mockOnRetry} />);

      const retryButton = screen.getByRole("button", { name: "Try Again" });
      await user.click(retryButton);

      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    it("should not render retry button when showRetry is false", () => {
      render(<ErrorFallback error={mockError} onRetry={mockOnRetry} showRetry={false} />);

      expect(screen.queryByRole("button", { name: "Try Again" })).not.toBeInTheDocument();
    });

    it("should not render retry button when onRetry is not provided", () => {
      render(<ErrorFallback error={mockError} />);

      expect(screen.queryByRole("button", { name: "Try Again" })).not.toBeInTheDocument();
    });
  });

  describe("Icon rendering", () => {
    it("should render icon with correct data-icon attribute for DATA category", () => {
      const { container } = render(
        <ErrorFallback error={mockError} category={ErrorCategory.DATA} />
      );

      const icon = container.querySelector('[data-icon="database"]');
      expect(icon).toBeInTheDocument();
    });

    it("should render icon with correct data-icon attribute for API category", () => {
      const { container } = render(
        <ErrorFallback error={mockError} category={ErrorCategory.API} />
      );

      const icon = container.querySelector('[data-icon="plug"]');
      expect(icon).toBeInTheDocument();
    });

    it("should render icon with correct data-icon attribute for UI category", () => {
      const { container } = render(<ErrorFallback error={mockError} category={ErrorCategory.UI} />);

      const icon = container.querySelector('[data-icon="monitor"]');
      expect(icon).toBeInTheDocument();
    });

    it("should render default icon for GENERAL category", () => {
      const { container } = render(
        <ErrorFallback error={mockError} category={ErrorCategory.GENERAL} />
      );

      const icon = container.querySelector('[data-icon="alert-triangle"]');
      expect(icon).toBeInTheDocument();
    });
  });

  describe("Console logging", () => {
    it("should log error details to console", () => {
      const context = { operation: "test", component: "TestComponent" };
      render(<ErrorFallback error={mockError} category={ErrorCategory.API} context={context} />);

      expect(mockConsoleGroup).toHaveBeenCalledWith("🛑 Card View Explorer Error");
      expect(mockConsoleError).toHaveBeenCalledWith("Error:", mockError);
      expect(mockConsoleError).toHaveBeenCalledWith("Category:", ErrorCategory.API);
      expect(mockConsoleError).toHaveBeenCalledWith("Context:", context);
      expect(mockConsoleError).toHaveBeenCalledWith("Stack:", mockError.stack);
      expect(mockConsoleError).toHaveBeenCalledWith("Timestamp:", expect.any(String));
      expect(mockConsoleGroupEnd).toHaveBeenCalled();
    });

    it("should log with null context when not provided", () => {
      render(<ErrorFallback error={mockError} />);

      expect(mockConsoleError).toHaveBeenCalledWith("Context:", undefined);
    });
  });

  describe("Accessibility", () => {
    it("should have proper button attributes", () => {
      render(<ErrorFallback error={mockError} onRetry={mockOnRetry} />);

      const retryButton = screen.getByRole("button", { name: "Try Again" });
      expect(retryButton).toHaveAttribute("type", "button");
      expect(retryButton).toHaveClass("error-action-button", "error-retry-button");
    });

    it("should have proper heading structure", () => {
      render(<ErrorFallback error={mockError} />);

      const heading = screen.getByRole("heading", { level: 3 });
      expect(heading).toHaveTextContent("Something went wrong");
      expect(heading).toHaveClass("error-title");
    });
  });
});

describe("useErrorFallback", () => {
  // Helper component to test the hook
  const TestComponent = () => {
    const { error, resetError, captureError, hasError } = useErrorFallback();

    return (
      <div>
        <div data-testid="has-error">{hasError.toString()}</div>
        <div data-testid="error-message">{error?.message || "No error"}</div>
        <button type="button" onClick={() => captureError(new Error("Test error"))}>
          Capture Error
        </button>
        <button type="button" onClick={resetError}>
          Reset Error
        </button>
      </div>
    );
  };

  it("should initialize with no error", () => {
    render(<TestComponent />);

    expect(screen.getByTestId("has-error")).toHaveTextContent("false");
    expect(screen.getByTestId("error-message")).toHaveTextContent("No error");
  });

  it("should capture and store error", async () => {
    const user = userEvent.setup();
    render(<TestComponent />);

    const captureButton = screen.getByRole("button", { name: "Capture Error" });
    await user.click(captureButton);

    expect(screen.getByTestId("has-error")).toHaveTextContent("true");
    expect(screen.getByTestId("error-message")).toHaveTextContent("Test error");
  });

  it("should reset error state", async () => {
    const user = userEvent.setup();
    render(<TestComponent />);

    // First capture an error
    const captureButton = screen.getByRole("button", { name: "Capture Error" });
    await user.click(captureButton);

    expect(screen.getByTestId("has-error")).toHaveTextContent("true");

    // Then reset it
    const resetButton = screen.getByRole("button", { name: "Reset Error" });
    await user.click(resetButton);

    expect(screen.getByTestId("has-error")).toHaveTextContent("false");
    expect(screen.getByTestId("error-message")).toHaveTextContent("No error");
  });

  it("should update error when captureError is called multiple times", async () => {
    const user = userEvent.setup();

    // Component with multiple error scenarios
    const MultiErrorComponent = () => {
      const { error, captureError } = useErrorFallback();

      return (
        <div>
          <div data-testid="error-message">{error?.message || "No error"}</div>
          <button type="button" onClick={() => captureError(new Error("First error"))}>
            First Error
          </button>
          <button type="button" onClick={() => captureError(new Error("Second error"))}>
            Second Error
          </button>
        </div>
      );
    };

    render(<MultiErrorComponent />);

    // Capture first error
    const firstErrorButton = screen.getByRole("button", { name: "First Error" });
    await user.click(firstErrorButton);
    expect(screen.getByTestId("error-message")).toHaveTextContent("First error");

    // Capture second error (should replace first)
    const secondErrorButton = screen.getByRole("button", { name: "Second Error" });
    await user.click(secondErrorButton);
    expect(screen.getByTestId("error-message")).toHaveTextContent("Second error");
  });
});
