import { describe, expect, it, vi } from "vitest";

// Ensure the mock is defined before importing the component (ESM import order)
vi.mock("obsidian", async () => {
  // Preserve all other exports and override only what's needed
  const actual = await vi.importActual<typeof import("obsidian")>("obsidian");
  return {
    ...actual,
    setIcon: vi.fn(),
  };
});

import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ObsidianIcon } from "./ObsidianIcon";

// === Test Constants ===
const DEFAULT_ICON_NAME = "alert-triangle";
const CSS_CLASSES = {
  OBSIDIAN_ICON: "obsidian-icon",
  CUSTOM_CLASS: "custom-icon-class",
  ERROR_ICON: "error-icon",
} as const;

// === Test Data Factory ===
interface ObsidianIconTestData {
  iconName?: string;
  className?: string;
}

const createObsidianIconProps = (
  overrides: ObsidianIconTestData = {}
): Required<ObsidianIconTestData> => ({
  iconName: DEFAULT_ICON_NAME,
  className: "",
  ...overrides,
});

// === Test Helpers ===
const renderObsidianIcon = (props: ObsidianIconTestData = {}) => {
  const finalProps = createObsidianIconProps(props);
  return render(<ObsidianIcon {...finalProps} />);
};

const assertIconElement = (expectedClasses: string[] = [CSS_CLASSES.OBSIDIAN_ICON]) => {
  const iconElement = screen.getByTestId("obsidian-icon");
  expect(iconElement).toBeInTheDocument();
  expect(iconElement.tagName).toBe("SPAN");

  expectedClasses.forEach((className) => {
    expect(iconElement).toHaveClass(className);
  });

  return iconElement;
};

describe("ObsidianIcon", () => {
  let mockSetIcon: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { setIcon } = await import("obsidian");
    mockSetIcon = vi.mocked(setIcon);
  });

  describe("Basic Rendering", () => {
    it("renders default icon correctly", () => {
      renderObsidianIcon();

      const iconElement = assertIconElement();
      expect(iconElement).toHaveClass(CSS_CLASSES.OBSIDIAN_ICON);
      expect(mockSetIcon).toHaveBeenCalledWith(iconElement, DEFAULT_ICON_NAME);
      expect(mockSetIcon).toHaveBeenCalledTimes(1);
    });

    it("renders with custom icon name", () => {
      const customIconName = "database";
      renderObsidianIcon({ iconName: customIconName });

      const iconElement = assertIconElement();
      expect(mockSetIcon).toHaveBeenCalledWith(iconElement, customIconName);
    });

    it("applies custom class name", () => {
      const customClassName = CSS_CLASSES.CUSTOM_CLASS;
      renderObsidianIcon({ className: customClassName });

      assertIconElement([CSS_CLASSES.OBSIDIAN_ICON, customClassName]);
    });

    it("applies multiple class names", () => {
      const multipleClasses = "class1 class2 class3";
      renderObsidianIcon({ className: multipleClasses });

      const iconElement = assertIconElement();
      expect(iconElement.className).toBe(`${CSS_CLASSES.OBSIDIAN_ICON} ${multipleClasses}`);
    });
  });

  describe("setIcon API calls", () => {
    it("calls setIcon on mount", () => {
      renderObsidianIcon({ iconName: "plug" });

      expect(mockSetIcon).toHaveBeenCalledTimes(1);
      const iconElement = screen.getByTestId("obsidian-icon");
      expect(mockSetIcon).toHaveBeenCalledWith(iconElement, "plug");
    });

    it("re-calls setIcon when iconName changes", () => {
      const { rerender } = renderObsidianIcon({ iconName: "alert-triangle" });
      expect(mockSetIcon).toHaveBeenCalledTimes(1);

      rerender(<ObsidianIcon iconName="database" />);
      expect(mockSetIcon).toHaveBeenCalledTimes(2);

      const iconElement = screen.getByTestId("obsidian-icon");
      expect(mockSetIcon).toHaveBeenLastCalledWith(iconElement, "database");
    });

    it("does not re-call setIcon on className change", () => {
      const { rerender } = renderObsidianIcon({
        iconName: "alert-triangle",
        className: "original-class",
      });
      expect(mockSetIcon).toHaveBeenCalledTimes(1);

      rerender(<ObsidianIcon iconName="alert-triangle" className="new-class" />);
      expect(mockSetIcon).toHaveBeenCalledTimes(1); // unchanged
    });

    it("does not re-call setIcon on same iconName rerender", () => {
      const { rerender } = renderObsidianIcon({ iconName: "monitor" });
      expect(mockSetIcon).toHaveBeenCalledTimes(1);

      rerender(<ObsidianIcon iconName="monitor" />);
      expect(mockSetIcon).toHaveBeenCalledTimes(1); // unchanged
    });
  });

  describe("Edge Cases", () => {
    it("works with empty className", () => {
      renderObsidianIcon({ className: "" });

      const iconElement = assertIconElement();
      // Base class should be present; ignore whitespace/order.
      expect(iconElement).toHaveClass(CSS_CLASSES.OBSIDIAN_ICON);
      // Optionally ensure no extra non-empty classes
      expect(iconElement.className.trim()).toBe(CSS_CLASSES.OBSIDIAN_ICON);
    });

    it("works with empty className", () => {
      renderObsidianIcon({ className: "" });

      const iconElement = assertIconElement();
      expect(iconElement.className).toBe(`${CSS_CLASSES.OBSIDIAN_ICON} `);
    });

    it("works with special-character iconName", () => {
      const specialIconName = "icon-with-123_special-chars";
      renderObsidianIcon({ iconName: specialIconName });

      const iconElement = assertIconElement();
      expect(mockSetIcon).toHaveBeenCalledWith(iconElement, specialIconName);
    });

    it("should work with long iconName strings", () => {
      const longIconName = "very-long-icon-name-that-might-cause-issues-in-some-edge-cases";
      renderObsidianIcon({ iconName: longIconName });

      const iconElement = assertIconElement();
      expect(mockSetIcon).toHaveBeenCalledWith(iconElement, longIconName);
    });
  });

  describe("Accessibility", () => {
    it("should render as a span element", () => {
      renderObsidianIcon();

      const iconElement = screen.getByTestId("obsidian-icon");
      expect(iconElement.tagName).toBe("SPAN");
      expect(iconElement).toHaveAttribute("class");
    });

    it("should have proper CSS class structure", () => {
      renderObsidianIcon({ className: CSS_CLASSES.ERROR_ICON });

      const iconElement = screen.getByTestId("obsidian-icon");
      expect(iconElement).toHaveClass(CSS_CLASSES.OBSIDIAN_ICON);
      expect(iconElement).toHaveClass(CSS_CLASSES.ERROR_ICON);
    });

    it("uses aria-label and role when ariaLabel is provided", () => {
      const ariaLabel = "Obsidian icon for test";
      render(<ObsidianIcon iconName={DEFAULT_ICON_NAME} ariaLabel={ariaLabel} />);

      const iconElement = screen.getByTestId("obsidian-icon");
      expect(iconElement).toHaveAttribute("aria-label", ariaLabel);
      expect(iconElement).toHaveAttribute("role", "img");
      expect(iconElement).not.toHaveAttribute("aria-hidden");
    });
  });

  describe("Performance", () => {
    it("should optimize setIcon calls with same iconName rerenders", () => {
      const { rerender } = renderObsidianIcon({ iconName: "star" });
      expect(mockSetIcon).toHaveBeenCalledTimes(1);

      // Rerender 3 times with same iconName
      rerender(<ObsidianIcon iconName="star" />);
      rerender(<ObsidianIcon iconName="star" />);
      rerender(<ObsidianIcon iconName="star" />);

      // Should be optimized by useEffect dependency array
      expect(mockSetIcon).toHaveBeenCalledTimes(1);
    });
  });

  describe("Ref Safety", () => {
    it("returns early when ref is not yet assigned", async () => {
      // Recreate module graph with a mocked React.useEffect that runs immediately
      vi.resetModules();

      vi.doMock("react", async () => {
        const actual = await vi.importActual<typeof import("react")>("react");
        return {
          ...actual,
          useEffect: ((fn: () => void) => {
            // Invoke effect during render phase where ref isn't attached yet
            fn();
          }) as unknown as typeof actual.useEffect,
        };
      });

      // Fresh mock for obsidian.setIcon in this isolated module graph
      vi.doMock("obsidian", async () => {
        const actual = await vi.importActual<typeof import("obsidian")>("obsidian");
        return {
          ...actual,
          setIcon: vi.fn(),
        };
      });

      const { ObsidianIcon: IsolatedObsidianIcon } = await import("./ObsidianIcon");
      const { setIcon: isolatedSetIcon } = await import("obsidian");
      const isolatedMockSetIcon = vi.mocked(isolatedSetIcon);

      render(<IsolatedObsidianIcon iconName="bolt" />);

      // Since ref was null when effect ran, setIcon should not be called
      expect(isolatedMockSetIcon).not.toHaveBeenCalled();

      // Cleanup mocks for subsequent tests (though this test runs last here)
      vi.doUnmock("react");
      vi.doUnmock("obsidian");
    });
  });
});
