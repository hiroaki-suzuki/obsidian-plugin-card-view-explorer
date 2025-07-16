import type { WorkspaceLeaf } from "obsidian";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type CardExplorerPlugin from "./main";
import { CardExplorerView, VIEW_TYPE_CARD_EXPLORER } from "./view";

// Mock React DOM
vi.mock("react-dom/client", () => ({
  createRoot: vi.fn(() => ({
    render: vi.fn(),
    unmount: vi.fn(),
  })),
}));

// Mock React
vi.mock("react", () => ({
  default: {
    createElement: vi.fn(),
  },
  createElement: vi.fn(),
}));

describe("CardExplorerView", () => {
  let mockLeaf: WorkspaceLeaf;
  let mockPlugin: CardExplorerPlugin;
  let view: CardExplorerView;

  beforeEach(() => {
    // Mock WorkspaceLeaf
    mockLeaf = {} as WorkspaceLeaf;

    // Mock CardExplorerPlugin
    mockPlugin = {
      settings: {
        autoStart: false,
        showInSidebar: false,
        sortKey: "updated",
      },
    } as CardExplorerPlugin;

    view = new CardExplorerView(mockLeaf, mockPlugin);
  });

  it("should have correct view type", () => {
    expect(view.getViewType()).toBe(VIEW_TYPE_CARD_EXPLORER);
  });

  it("should have correct display text", () => {
    expect(view.getDisplayText()).toBe("Card Explorer");
  });

  it("should have correct icon", () => {
    expect(view.getIcon()).toBe("layout-grid");
  });

  it("should store plugin reference", () => {
    expect(view.plugin).toBe(mockPlugin);
  });

  it("should have refresh method", () => {
    expect(typeof view.refresh).toBe("function");
  });
});
