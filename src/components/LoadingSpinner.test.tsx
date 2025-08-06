import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, expect, it } from "vitest";
import { FullPageLoading, LoadingSpinner } from "./LoadingSpinner";

// === Test Constants ===
const DEFAULT_TITLE = "Loading";
const DEFAULT_MESSAGE = "Loading your notes...";
const FULL_PAGE_TITLE = "Loading Card View Explorer";

const CSS_CLASSES = {
  LOADING_CONTENT: "loading-content",
  LOADING_SPINNER: "loading-spinner",
  CARD_VIEW_CONTAINER: "card-view-container",
  CARD_VIEW_LOADING: "card-view-loading",
} as const;

// === Test Data Factory ===
interface LoadingSpinnerTestData {
  title?: string;
  message?: string;
}

const createLoadingSpinnerProps = (
  overrides: LoadingSpinnerTestData = {}
): LoadingSpinnerTestData => ({
  title: DEFAULT_TITLE,
  message: DEFAULT_MESSAGE,
  ...overrides,
});

// === Test Helpers ===
const renderLoadingSpinner = (props: LoadingSpinnerTestData = {}) => {
  return render(<LoadingSpinner {...props} />);
};

const assertLoadingSpinnerStructure = (title: string, message: string) => {
  // Structure assertions using semantic queries
  const titleElement = screen.getByRole("heading", { level: 3 });
  expect(titleElement).toBeInTheDocument();
  expect(titleElement).toHaveTextContent(title);

  // Message element (next sibling of title)
  const messageElement = titleElement.nextElementSibling;
  expect(messageElement).toBeInTheDocument();
  expect(messageElement).toHaveTextContent(message);

  // Container structure
  const container = document.querySelector(`.${CSS_CLASSES.LOADING_CONTENT}`) as HTMLElement;
  expect(container).toBeInTheDocument();
  expect(within(container).getByRole("heading", { level: 3 })).toBeTruthy();

  // Spinner presence
  const spinner = document.querySelector(`.${CSS_CLASSES.LOADING_SPINNER}`) as HTMLElement;
  expect(spinner).toBeInTheDocument();
  expect(container).toContainElement(spinner);
};

const assertAccessibilityCompliance = () => {
  const titleElement = screen.getByRole("heading", { level: 3 });

  // Heading hierarchy compliance
  expect(titleElement.tagName).toBe("H3");

  // Content structure for screen readers
  const container = document.querySelector(`.${CSS_CLASSES.LOADING_CONTENT}`);
  expect(container).toBeInTheDocument();

  // Ensure loading state is perceivable
  const spinner = document.querySelector(`.${CSS_CLASSES.LOADING_SPINNER}`);
  expect(spinner).toBeInTheDocument();
};

// === Test Suites ===
describe("LoadingSpinner Components", () => {
  describe("LoadingSpinner", () => {
    describe("Default Behavior", () => {
      it("renders with default props", () => {
        renderLoadingSpinner();

        expect(screen.getByText(DEFAULT_TITLE)).toBeInTheDocument();
        expect(screen.getByText(DEFAULT_MESSAGE)).toBeInTheDocument();
        assertLoadingSpinnerStructure(DEFAULT_TITLE, DEFAULT_MESSAGE);
      });

      it("maintains proper HTML structure", () => {
        renderLoadingSpinner(
          createLoadingSpinnerProps({ title: "Test Title", message: "Test Message" })
        );

        assertLoadingSpinnerStructure("Test Title", "Test Message");
        assertAccessibilityCompliance();
      });
    });

    describe("Custom Props", () => {
      it("renders with custom title and message", () => {
        const customProps = createLoadingSpinnerProps({
          title: "Custom Loading Title",
          message: "Custom loading message",
        });

        renderLoadingSpinner(customProps);

        expect(screen.getByText("Custom Loading Title")).toBeInTheDocument();
        expect(screen.getByText("Custom loading message")).toBeInTheDocument();
        assertLoadingSpinnerStructure("Custom Loading Title", "Custom loading message");
      });
    });

    describe("Empty Value Handling", () => {
      const EMPTY_VALUE_SCENARIOS = [
        {
          name: "empty string title",
          props: { title: "", message: "Just a message" },
          expectedTitle: "",
          expectedMessage: "Just a message",
        },
        {
          name: "empty string message",
          props: { title: "Just a title", message: "" },
          expectedTitle: "Just a title",
          expectedMessage: "",
        },
        {
          name: "undefined values",
          props: { title: undefined, message: undefined },
          expectedTitle: DEFAULT_TITLE,
          expectedMessage: DEFAULT_MESSAGE,
        },
      ] as const;

      it.each(EMPTY_VALUE_SCENARIOS)(
        "handles $name gracefully",
        ({ props, expectedTitle, expectedMessage }) => {
          renderLoadingSpinner(props);

          const titleElement = screen.getByRole("heading", { level: 3 });
          expect(titleElement).toHaveTextContent(expectedTitle);

          const messageElement = titleElement.nextElementSibling;
          expect(messageElement).toHaveTextContent(expectedMessage);

          assertLoadingSpinnerStructure(expectedTitle, expectedMessage);
        }
      );
    });

    describe("Edge Cases", () => {
      const EDGE_CASE_SCENARIOS = [
        {
          name: "very long title and message",
          props: createLoadingSpinnerProps({
            title:
              "Loading a very long title that might overflow the container and cause layout issues",
            message:
              "This is an extremely long message that simulates real-world scenarios where users might provide lengthy descriptions of what is being loaded in the application",
          }),
        },
        {
          name: "special characters and Unicode",
          props: createLoadingSpinnerProps({
            title: "Loading... 🚀 50% (10/20) files",
            message: "処理中... @#$%^&*() 특수문자 测试",
          }),
        },
        {
          name: "HTML-like strings (potential XSS)",
          props: createLoadingSpinnerProps({
            title: "<script>alert('xss')</script>",
            message: "<img src=x onerror=alert(1)>",
          }),
        },
      ] as const;

      it.each(EDGE_CASE_SCENARIOS)("handles $name correctly", ({ props }) => {
        renderLoadingSpinner(props);

        // Verify content is rendered as text (not executed as HTML)
        expect(screen.getByText(props.title!)).toBeInTheDocument();
        expect(screen.getByText(props.message!)).toBeInTheDocument();

        // Ensure no script execution or HTML injection
        expect(document.querySelector("script")).not.toBeInTheDocument();
        expect(document.querySelector("img[src='x']")).not.toBeInTheDocument();

        assertLoadingSpinnerStructure(props.title!, props.message!);
      });

      it("renders multiple instances independently", () => {
        render(
          <div>
            <LoadingSpinner title="First Loader" message="First message" />
            <LoadingSpinner title="Second Loader" message="Second message" />
          </div>
        );

        // Verify both instances exist
        expect(screen.getByText("First Loader")).toBeInTheDocument();
        expect(screen.getByText("First message")).toBeInTheDocument();
        expect(screen.getByText("Second Loader")).toBeInTheDocument();
        expect(screen.getByText("Second message")).toBeInTheDocument();

        // Verify structural independence
        const loadingContainers = document.querySelectorAll(`.${CSS_CLASSES.LOADING_CONTENT}`);
        expect(loadingContainers).toHaveLength(2);

        // Each container should have its own spinner
        loadingContainers.forEach((container) => {
          const spinner = container.querySelector(`.${CSS_CLASSES.LOADING_SPINNER}`);
          expect(spinner).toBeInTheDocument();
        });
      });
    });

    describe("Accessibility", () => {
      it("maintains proper heading hierarchy", () => {
        renderLoadingSpinner();

        const heading = screen.getByRole("heading", { level: 3 });
        expect(heading.tagName).toBe("H3");
        expect(heading).toHaveAccessibleName(DEFAULT_TITLE);
      });

      it("provides meaningful content for screen readers", () => {
        const props = createLoadingSpinnerProps({
          title: "Loading Files",
          message: "Processing 5 of 10 documents",
        });

        renderLoadingSpinner(props);

        const heading = screen.getByRole("heading", { level: 3 });
        expect(heading).toHaveAccessibleName("Loading Files");

        // Message content should be discoverable
        expect(screen.getByText("Processing 5 of 10 documents")).toBeInTheDocument();
      });
    });
  });

  describe("FullPageLoading", () => {
    const renderFullPageLoading = () => render(<FullPageLoading />);

    it("renders with proper structure and content", () => {
      renderFullPageLoading();

      expect(screen.getByText(FULL_PAGE_TITLE)).toBeInTheDocument();

      // Container structure
      const cardViewContainer = document.querySelector(
        `.${CSS_CLASSES.CARD_VIEW_CONTAINER}`
      ) as HTMLElement;
      const cardViewLoading = document.querySelector(
        `.${CSS_CLASSES.CARD_VIEW_LOADING}`
      ) as HTMLElement;

      expect(cardViewContainer).toBeInTheDocument();
      expect(cardViewLoading).toBeInTheDocument();
      expect(cardViewContainer).toContainElement(cardViewLoading);
    });

    it("uses LoadingSpinner internally", () => {
      renderFullPageLoading();

      // Verify LoadingSpinner is rendered with correct props
      assertLoadingSpinnerStructure(FULL_PAGE_TITLE, DEFAULT_MESSAGE);

      // Verify it's wrapped in the card view structure
      const container = document.querySelector(
        `.${CSS_CLASSES.CARD_VIEW_CONTAINER}`
      ) as HTMLElement;
      const spinner = document.querySelector(`.${CSS_CLASSES.LOADING_SPINNER}`) as HTMLElement;
      expect(container).toContainElement(spinner);
    });

    it("maintains accessibility standards", () => {
      renderFullPageLoading();

      const heading = screen.getByRole("heading", { level: 3 });
      expect(heading).toHaveAccessibleName(FULL_PAGE_TITLE);
      expect(heading.tagName).toBe("H3");
    });
  });
});
