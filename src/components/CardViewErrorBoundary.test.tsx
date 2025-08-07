import { fireEvent, render, screen } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleError } from "../core/errors/errorHandling";
import { CardViewErrorBoundary } from "./CardViewErrorBoundary";

// Constants
const MAX_RETRIES = 3;
const ERROR_MESSAGES = {
  LOADING: "Loading Error",
  DESCRIPTION: "An error occurred while loading Card View Explorer.",
  HELP_TEXT: "If the problem persists, please report it on GitHub.",
  NO_ERROR: "No error",
  COMPONENT_STACK_FALLBACK: "No component stack available",
  MAX_RETRIES_REACHED: "Max retries reached",
} as const;

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

// Test helper component
const ThrowError: React.FC<{ shouldThrow: boolean; errorMessage?: string }> = ({
  shouldThrow,
  errorMessage = "Test error",
}) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>{ERROR_MESSAGES.NO_ERROR}</div>;
};

// Test helper functions
const renderErrorBoundary = (children: React.ReactNode, onError?: ReturnType<typeof vi.fn>) => {
  return render(<CardViewErrorBoundary onError={onError}>{children}</CardViewErrorBoundary>);
};

const triggerError = (errorMessage = "Test error") => {
  return renderErrorBoundary(<ThrowError shouldThrow={true} errorMessage={errorMessage} />);
};

const exhaustRetries = (errorMessage = "Max retry test") => {
  renderErrorBoundary(<ThrowError shouldThrow={true} errorMessage={errorMessage} />);

  for (let i = 0; i < MAX_RETRIES; i++) {
    const retryButton = screen.getByRole("button", { name: /Retry/ });
    fireEvent.click(retryButton);
  }
};

describe("CardViewErrorBoundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    Object.defineProperty(window, "location", {
      value: { reload: vi.fn() },
      writable: true,
    });
  });

  describe("Normal rendering", () => {
    it("renders child components normally when no error occurs", () => {
      renderErrorBoundary(<div>Normal content</div>);
      expect(screen.getByText("Normal content")).toBeInTheDocument();
    });
  });

  describe("Error rendering", () => {
    it.each([
      { errorMessage: "Test error", description: "displays default fallback UI" },
      {
        errorMessage: "Help test",
        description: "displays consistent UI regardless of error message",
      },
    ])("$description when error message is '$errorMessage'", ({ errorMessage }) => {
      triggerError(errorMessage);
      expect(screen.getByText(ERROR_MESSAGES.LOADING)).toBeInTheDocument();
      expect(screen.getByText(ERROR_MESSAGES.DESCRIPTION)).toBeInTheDocument();
    });

    it("displays help text and GitHub link", () => {
      triggerError("Help test");
      expect(screen.getByText(ERROR_MESSAGES.HELP_TEXT)).toBeInTheDocument();
      expect(
        screen.getByRole("link", {
          name: "Link to GitHub repository for issue reporting",
        })
      ).toBeInTheDocument();
    });
  });

  describe("Error handling", () => {
    it("calls onError callback when error occurs and callback is provided", () => {
      const onError = vi.fn();
      renderErrorBoundary(<ThrowError shouldThrow={true} errorMessage="Callback test" />, onError);

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });

    it("handles missing componentStack gracefully in componentDidCatch", () => {
      const onError = vi.fn();
      const originalComponentDidCatch = CardViewErrorBoundary.prototype.componentDidCatch;

      vi.spyOn(CardViewErrorBoundary.prototype, "componentDidCatch").mockImplementation(function (
        this: CardViewErrorBoundary,
        error: Error,
        errorInfo: React.ErrorInfo
      ) {
        const errorInfoWithoutStack = {
          ...errorInfo,
          componentStack: undefined,
        } as React.ErrorInfo;
        originalComponentDidCatch.call(this, error, errorInfoWithoutStack);
      });

      renderErrorBoundary(
        <ThrowError shouldThrow={true} errorMessage="Missing componentStack test" />,
        onError
      );

      expect(handleError).toHaveBeenCalledWith(
        expect.any(Error),
        "ui",
        expect.objectContaining({
          componentStack: ERROR_MESSAGES.COMPONENT_STACK_FALLBACK,
          errorBoundary: "CardViewErrorBoundary",
          retryCount: 0,
        })
      );

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: undefined,
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

      const { rerender } = renderErrorBoundary(<TestComponent />);
      expect(screen.getByText(ERROR_MESSAGES.LOADING)).toBeInTheDocument();

      const retryButton = screen.getByRole("button", { name: /Retry/ });
      expect(retryButton).toBeInTheDocument();

      shouldThrow = false;
      fireEvent.click(retryButton);

      rerender(
        <CardViewErrorBoundary>
          <ThrowError shouldThrow={false} />
        </CardViewErrorBoundary>
      );

      expect(screen.getByText(ERROR_MESSAGES.NO_ERROR)).toBeInTheDocument();
    });

    it("shows plugin restart button when max retries reached", () => {
      exhaustRetries();
      expect(screen.getByRole("button", { name: /Restart plugin/ })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Retry/ })).not.toBeInTheDocument();
    });

    it.each([
      { retryAttempt: 1, expectedText: "Retrying... (1/3)" },
      { retryAttempt: 2, expectedText: "Retrying... (2/3)" },
      { retryAttempt: 3, expectedText: "Retrying... (3/3)" },
    ])(
      "displays retry count correctly: attempt $retryAttempt",
      ({ retryAttempt, expectedText }) => {
        renderErrorBoundary(<ThrowError shouldThrow={true} errorMessage="Retry count test" />);

        for (let i = 0; i < retryAttempt; i++) {
          const retryButton = screen.getByRole("button", { name: /Retry/ });
          fireEvent.click(retryButton);
        }

        expect(screen.getByText(expectedText)).toBeInTheDocument();
      }
    );

    it("logs error when max retries are exceeded", () => {
      const errorBoundary = new CardViewErrorBoundary({ children: <div>test</div> });
      errorBoundary.state = {
        hasError: true,
        error: new Error("Test error"),
        retryCount: MAX_RETRIES,
      };

      vi.clearAllMocks();
      errorBoundary.handleRetry();

      expect(handleError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: ERROR_MESSAGES.MAX_RETRIES_REACHED,
        }),
        "ui",
        expect.objectContaining({
          componentStack: "CardViewErrorBoundary",
          errorBoundary: "CardViewErrorBoundary",
          retryCount: MAX_RETRIES,
        })
      );
    });

    it("does not increment retry count beyond max retries", () => {
      exhaustRetries("Retry count limit test");

      expect(screen.getByText(`Retrying... (${MAX_RETRIES}/${MAX_RETRIES})`)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Restart plugin/ })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Retry/ })).not.toBeInTheDocument();
    });
  });

  describe("Restart plugin functionality", () => {
    it("calls window.location.reload when restart plugin button is clicked", () => {
      exhaustRetries("Restart plugin click test");

      const restartButton = screen.getByRole("button", { name: /Restart plugin/ });
      fireEvent.click(restartButton);

      expect(window.location.reload).toHaveBeenCalledTimes(1);
    });
  });

  describe("Accessibility", () => {
    it.each([
      {
        buttonType: "retry",
        setup: () => triggerError("Accessibility test"),
        selector: { name: /Retry/ },
      },
      {
        buttonType: "restart",
        setup: () => exhaustRetries("Reload button test"),
        selector: { name: /Restart plugin/ },
      },
    ])("sets aria-label attribute on $buttonType button", ({ setup, selector }) => {
      setup();
      const button = screen.getByRole("button", selector);
      expect(button).toHaveAttribute("aria-label");
    });
  });
});
