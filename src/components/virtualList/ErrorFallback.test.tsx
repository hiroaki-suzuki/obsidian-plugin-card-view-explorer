import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorCategory, handleError } from "../../core/errors/errorHandling";
import { ErrorFallback } from "./ErrorFallback";

// Mock only handleError while preserving actual ErrorCategory and other exports
vi.mock("../../core/errors/errorHandling", async () => {
  const actual = await vi.importActual<typeof import("../../core/errors/errorHandling")>(
    "../../core/errors/errorHandling"
  );
  return {
    ...actual,
    handleError: vi.fn(),
  };
});

describe("ErrorFallback", () => {
  const mockError = new Error("Test error message");

  const makeProps = (overrides: Partial<React.ComponentProps<typeof ErrorFallback>> = {}) => ({
    error: mockError,
    ...overrides,
  });

  const renderErrorFallback = (overrides?: Partial<React.ComponentProps<typeof ErrorFallback>>) =>
    render(<ErrorFallback {...makeProps(overrides)} />);

  const setupUser = () => userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic rendering", () => {
    it("renders title and default (GENERAL) message", () => {
      renderErrorFallback();

      expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();
      expect(screen.getByText("An unexpected error occurred.")).toBeInTheDocument();
    });

    it("renders custom message when provided", () => {
      const customMessage = "Custom error message";
      renderErrorFallback({ message: customMessage });

      expect(screen.getByText(customMessage)).toBeInTheDocument();
    });
  });

  describe("Error categories", () => {
    type Case = {
      category: ErrorCategory;
      main: string;
      sub: string;
      className: string;
    };

    const cases: Case[] = [
      {
        category: ErrorCategory.DATA,
        main: "Failed to load note data. Your information may be temporarily unavailable.",
        sub: "Try refreshing your notes or restart the plugin.",
        className: "error-data",
      },
      {
        category: ErrorCategory.API,
        main: "Failed to communicate with Obsidian. Please try refreshing.",
        sub: "Try refreshing the view or restart Obsidian.",
        className: "error-api",
      },
      {
        category: ErrorCategory.UI,
        main: "Interface error occurred. Please try refreshing the view.",
        sub: "Try refreshing the view or restart the plugin.",
        className: "error-ui",
      },
      {
        category: ErrorCategory.GENERAL,
        main: "An unexpected error occurred.",
        sub: "Try refreshing the view or restart the plugin.",
        className: "error-general",
      },
    ];

    describe.each(cases)("category: %s", ({ category, main, sub, className }) => {
      it("displays expected messages and classes with container wrapper", () => {
        const { container } = renderErrorFallback({ category });
        // Outer container for VirtualList integration
        const wrapper = container.querySelector(".virtual-list-container");
        expect(wrapper).toBeInTheDocument();

        // Inner error container retains category classes
        const errorRoot = container.querySelector(".error-fallback");
        expect(errorRoot).toBeInTheDocument();
        expect(errorRoot).toHaveClass(className);

        expect(screen.getByText(main)).toBeInTheDocument();
        expect(screen.getByText(sub)).toBeInTheDocument();
      });
    });
  });

  describe("Retry functionality", () => {
    type RetryCase = {
      name: string;
      onRetry?: ReturnType<typeof vi.fn>;
      showRetry?: boolean;
      buttonName?: string;
      expectedPresent: boolean;
      expectedCalls: number;
    };

    const retryCases: RetryCase[] = [
      {
        name: "renders button when onRetry is provided (default text)",
        onRetry: vi.fn(),
        expectedPresent: true,
        expectedCalls: 1,
      },
      {
        name: "renders custom retry text",
        onRetry: vi.fn(),
        buttonName: "Retry Now",
        expectedPresent: true,
        expectedCalls: 1,
      },
      {
        name: "does not render button when showRetry=false",
        onRetry: vi.fn(),
        showRetry: false,
        expectedPresent: false,
        expectedCalls: 0,
      },
      {
        name: "does not render button when onRetry is not provided",
        expectedPresent: false,
        expectedCalls: 0,
      },
    ];

    describe.each(retryCases)("%s", (tc) => {
      it("behaves as expected", async () => {
        const user = setupUser();
        renderErrorFallback({
          onRetry: tc.onRetry,
          showRetry: tc.showRetry,
          retryText: tc.buttonName,
        });

        const name = tc.buttonName ?? "Try Again";
        const btn = screen.queryByRole("button", { name });

        if (tc.expectedPresent) {
          expect(btn).toBeInTheDocument();
          if (tc.onRetry) {
            await user.click(btn!);
            expect(tc.onRetry).toHaveBeenCalledTimes(tc.expectedCalls);
          }
        } else {
          expect(btn).not.toBeInTheDocument();
        }
      });
    });
  });

  describe("Error reporting", () => {
    it("calls handleError on mount with error, category, and context", () => {
      const context = { operation: "render", extra: 123 };

      renderErrorFallback({ category: ErrorCategory.DATA, context });

      expect(handleError).toHaveBeenCalledTimes(1);
      expect(handleError).toHaveBeenCalledWith(
        mockError,
        ErrorCategory.DATA,
        expect.objectContaining({
          operation: "render",
          extra: 123,
          component: "ErrorFallback",
          timestamp: expect.any(String),
        })
      );
    });
  });
});
