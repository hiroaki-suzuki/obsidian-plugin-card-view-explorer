import { fireEvent, render, screen } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CardViewErrorBoundary } from "./CardViewErrorBoundary";

// Mock the error handling utilities
vi.mock("../core/errors/errorHandling", () => ({
  handleError: vi.fn((error, _category, _context) => ({
    details: "mocked-error-id",
    message: error.message,
  })),
  ErrorCategory: {
    UI: "ui",
  },
}));

// Component that throws an error for testing
const ThrowError: React.FC<{ shouldThrow: boolean; errorMessage?: string }> = ({
  shouldThrow,
  errorMessage = "Test error",
}) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>No error</div>;
};

describe("CardViewErrorBoundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console.error to avoid noise in test output
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  describe("Normal rendering", () => {
    it("renders child components normally when no error occurs", () => {
      render(
        <CardViewErrorBoundary>
          <div>Normal content</div>
        </CardViewErrorBoundary>
      );

      expect(screen.getByText("Normal content")).toBeInTheDocument();
    });
  });

  describe("Error handling", () => {
    it("displays default fallback UI when an error occurs", () => {
      render(
        <CardViewErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Test error" />
        </CardViewErrorBoundary>
      );

      expect(screen.getByText("Loading Error")).toBeInTheDocument();
      expect(
        screen.getByText("An error occurred while loading Card View Explorer.")
      ).toBeInTheDocument();
    });

    it("calls onError callback when error occurs and callback is provided", () => {
      const onError = vi.fn();

      render(
        <CardViewErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} errorMessage="Callback test" />
        </CardViewErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });
  });

  describe("Retry functionality", () => {
    it("resets error state when retry button is clicked", async () => {
      let shouldThrow = true;
      const TestComponent = () => (
        <ThrowError shouldThrow={shouldThrow} errorMessage="Retry test" />
      );

      const { rerender } = render(
        <CardViewErrorBoundary>
          <TestComponent />
        </CardViewErrorBoundary>
      );

      // Check error state
      expect(screen.getByText("Loading Error")).toBeInTheDocument();

      // Click retry button
      const retryButton = screen.getByRole("button", { name: /Retry/ });
      expect(retryButton).toBeInTheDocument();

      // Fix error and retry
      shouldThrow = false;
      fireEvent.click(retryButton);

      // Re-render
      rerender(
        <CardViewErrorBoundary>
          <ThrowError shouldThrow={false} />
        </CardViewErrorBoundary>
      );

      expect(screen.getByText("No error")).toBeInTheDocument();
    });

    it("shows plugin restart button when max retries reached", () => {
      const maxRetries = 3;

      render(
        <CardViewErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Max retry test" />
        </CardViewErrorBoundary>
      );

      // Click retry button maximum times
      for (let i = 0; i < maxRetries; i++) {
        const retryButton = screen.getByRole("button", { name: /Retry/ });
        fireEvent.click(retryButton);
      }

      // Verify plugin restart button is displayed
      expect(screen.getByRole("button", { name: /Restart plugin/ })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Retry/ })).not.toBeInTheDocument();
    });

    it("displays retry count", () => {
      render(
        <CardViewErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Retry count test" />
        </CardViewErrorBoundary>
      );

      // First retry
      const retryButton = screen.getByRole("button", { name: /Retry/ });
      fireEvent.click(retryButton);

      // Verify retry info is displayed
      expect(screen.getByText("Retrying... (1/3)")).toBeInTheDocument();
    });
  });

  describe("User help", () => {
    it("displays help text referencing GitHub reporting", () => {
      render(
        <CardViewErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Help test" />
        </CardViewErrorBoundary>
      );

      expect(
        screen.getByText("If the problem persists, please report it on GitHub.")
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", {
          name: "Link to GitHub repository for issue reporting",
        })
      ).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("sets aria-label attribute on buttons", () => {
      render(
        <CardViewErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Accessibility test" />
        </CardViewErrorBoundary>
      );

      const retryButton = screen.getByRole("button", { name: /Retry/ });
      expect(retryButton).toHaveAttribute("aria-label");
    });

    it("sets aria-label attribute on plugin restart button too", () => {
      const maxRetries = 3;

      render(
        <CardViewErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Reload button test" />
        </CardViewErrorBoundary>
      );

      // Retry maximum times
      for (let i = 0; i < maxRetries; i++) {
        const retryButton = screen.getByRole("button", { name: /Retry/ });
        fireEvent.click(retryButton);
      }

      const reloadButton = screen.getByRole("button", { name: /Restart plugin/ });
      expect(reloadButton).toHaveAttribute("aria-label");
    });
  });

  describe("Console log output", () => {
    it("outputs detailed logs to console when error occurs", async () => {
      render(
        <CardViewErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Log test" />
        </CardViewErrorBoundary>
      );

      // Verify console error is called with new log format
      expect(console.error).toHaveBeenCalledWith("Error:", expect.any(Error));
      expect(console.error).toHaveBeenCalledWith("Error Info:", expect.any(Object));
      expect(console.error).toHaveBeenCalledWith("Component Stack:", expect.any(String));
      expect(console.error).toHaveBeenCalledWith("Retry Count:", expect.any(Number));
      expect(console.error).toHaveBeenCalledWith("Timestamp:", expect.any(String));
    });
  });
});
