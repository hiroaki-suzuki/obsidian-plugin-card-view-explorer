import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, expect, it, vi } from "vitest";
import { ObsidianIcon } from "./ObsidianIcon";

// Mock Obsidian's setIcon function
vi.mock("obsidian", () => ({
  setIcon: vi.fn(),
}));

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

  describe("基本的なレンダリング", () => {
    it("デフォルトのアイコンが正しくレンダリングされる", () => {
      renderObsidianIcon();

      const iconElement = assertIconElement();
      expect(iconElement).toHaveClass(CSS_CLASSES.OBSIDIAN_ICON);
      expect(mockSetIcon).toHaveBeenCalledWith(iconElement, DEFAULT_ICON_NAME);
      expect(mockSetIcon).toHaveBeenCalledTimes(1);
    });

    it("カスタムアイコン名で正しくレンダリングされる", () => {
      const customIconName = "database";
      renderObsidianIcon({ iconName: customIconName });

      const iconElement = assertIconElement();
      expect(mockSetIcon).toHaveBeenCalledWith(iconElement, customIconName);
    });

    it("カスタムクラス名が適用される", () => {
      const customClassName = CSS_CLASSES.CUSTOM_CLASS;
      renderObsidianIcon({ className: customClassName });

      assertIconElement([CSS_CLASSES.OBSIDIAN_ICON, customClassName]);
    });

    it("複数のクラス名が適用される", () => {
      const multipleClasses = "class1 class2 class3";
      renderObsidianIcon({ className: multipleClasses });

      const iconElement = assertIconElement();
      expect(iconElement.className).toBe(`${CSS_CLASSES.OBSIDIAN_ICON} ${multipleClasses}`);
    });
  });

  describe("setIcon API呼び出し", () => {
    it("コンポーネントマウント時にsetIconが呼び出される", () => {
      renderObsidianIcon({ iconName: "plug" });

      expect(mockSetIcon).toHaveBeenCalledTimes(1);
      const iconElement = screen.getByTestId("obsidian-icon");
      expect(mockSetIcon).toHaveBeenCalledWith(iconElement, "plug");
    });

    it("iconName変更時にsetIconが再呼び出しされる", () => {
      const { rerender } = renderObsidianIcon({ iconName: "alert-triangle" });
      expect(mockSetIcon).toHaveBeenCalledTimes(1);

      rerender(<ObsidianIcon iconName="database" />);
      expect(mockSetIcon).toHaveBeenCalledTimes(2);

      const iconElement = screen.getByTestId("obsidian-icon");
      expect(mockSetIcon).toHaveBeenLastCalledWith(iconElement, "database");
    });

    it("className変更時はsetIconが再呼び出しされない", () => {
      const { rerender } = renderObsidianIcon({
        iconName: "alert-triangle",
        className: "original-class",
      });
      expect(mockSetIcon).toHaveBeenCalledTimes(1);

      rerender(<ObsidianIcon iconName="alert-triangle" className="new-class" />);
      expect(mockSetIcon).toHaveBeenCalledTimes(1); // 変更されない
    });

    it("同じiconNameで再レンダリング時はsetIconが再呼び出しされない", () => {
      const { rerender } = renderObsidianIcon({ iconName: "monitor" });
      expect(mockSetIcon).toHaveBeenCalledTimes(1);

      rerender(<ObsidianIcon iconName="monitor" />);
      expect(mockSetIcon).toHaveBeenCalledTimes(1); // 変更されない
    });
  });

  describe("エッジケース", () => {
    it("空文字のiconNameでも正常に動作する", () => {
      renderObsidianIcon({ iconName: "" });

      const iconElement = assertIconElement();
      expect(mockSetIcon).toHaveBeenCalledWith(iconElement, "");
    });

    it("空文字のclassNameでも正常に動作する", () => {
      renderObsidianIcon({ className: "" });

      const iconElement = assertIconElement();
      expect(iconElement.className).toBe(`${CSS_CLASSES.OBSIDIAN_ICON} `);
    });

    it("特殊文字を含むiconNameでも正常に動作する", () => {
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
});
