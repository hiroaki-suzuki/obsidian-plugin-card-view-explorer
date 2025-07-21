/** biome-ignore-all lint/complexity/noUselessConstructor: test mocking requires constructor */
import type { WorkspaceLeaf } from "obsidian";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type CardExplorerPlugin from "./main";
import { CardExplorerView, VIEW_TYPE_CARD_EXPLORER } from "./view";

vi.mock("react-dom/client", () => {
  // Mock React DOM
  const mockRender = vi.fn();
  const mockUnmount = vi.fn();
  const mockCreateRoot = vi.fn(() => ({
    render: mockRender,
    unmount: mockUnmount,
  }));

  return {
    createRoot: mockCreateRoot,
  };
});

describe("CardExplorerView", () => {
  let mockLeaf: WorkspaceLeaf;
  let mockPlugin: CardExplorerPlugin;
  let view: CardExplorerView;
  let mockContainer: HTMLElement;
  let mockContainerElement: HTMLElement;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock DOM elements
    mockContainerElement = {
      style: {} as CSSStyleDeclaration,
    } as HTMLElement;

    mockContainer = {
      empty: vi.fn(),
      createEl: vi.fn().mockReturnValue(mockContainerElement),
    } as unknown as HTMLElement;

    // Mock WorkspaceLeaf
    mockLeaf = {
      // Mock containerEl with children array
      containerEl: {
        children: [
          {}, // Header element (index 0)
          mockContainer, // Content container (index 1)
        ],
      },
    } as unknown as WorkspaceLeaf;

    // Mock CardExplorerPlugin
    mockPlugin = {
      settings: {
        autoStart: false,
        showInSidebar: false,
        sortKey: "updated",
      },
    } as unknown as CardExplorerPlugin;

    view = new CardExplorerView(mockLeaf, mockPlugin);
  });

  it("should have correct view type", () => {
    expect(view.getViewType()).toBe(VIEW_TYPE_CARD_EXPLORER);
  });

  it("should have correct display text", () => {
    expect(view.getDisplayText()).toBe("Card View Explorer");
  });

  it("should have correct icon", () => {
    expect(view.getIcon()).toBe("layout-grid");
  });

  describe("onOpen", () => {
    it("should handle missing container gracefully", async () => {
      // Mock scenario where container doesn't exist
      const mockLeafWithoutContainer = {
        containerEl: {
          children: [], // No children
        },
      } as unknown as WorkspaceLeaf;

      const viewWithoutContainer = new CardExplorerView(mockLeafWithoutContainer, mockPlugin);

      // Should not throw an error
      await expect(viewWithoutContainer.onOpen()).resolves.toBeUndefined();
    });
  });

  describe("onClose", () => {
    it("should unmount React root and clear references", async () => {
      // Mock root with unmount method
      const mockUnmount = vi.fn();
      (view as any).root = { unmount: mockUnmount } as any;
      (view as any).containerElement = mockContainerElement;

      // Call onClose
      await view.onClose();

      // Verify that unmount was called
      expect(mockUnmount).toHaveBeenCalled();
      expect((view as any).root).toBeNull();
      expect((view as any).containerElement).toBeNull();
    });

    it("should handle null root gracefully", async () => {
      // Set root to null
      (view as any).root = null;
      (view as any).containerElement = mockContainerElement;

      // Call onClose (should not throw error)
      await expect(view.onClose()).resolves.toBeUndefined();
      expect((view as any).containerElement).toBeNull();
    });
  });

  describe("refreshNotes", () => {
    it("should call store refreshNotes method", async () => {
      // Mock the cardExplorerStore
      const mockRefreshNotes = vi.fn().mockResolvedValue(undefined);
      const mockStore = {
        refreshNotes: mockRefreshNotes,
      };
      const mockUseCardExplorerStore = {
        getState: vi.fn().mockReturnValue(mockStore),
      };

      // Mock the dynamic import
      vi.doMock("./store/cardExplorerStore", () => ({
        useCardExplorerStore: mockUseCardExplorerStore,
      }));

      // Mock app object
      const mockApp = { vault: { adapter: {} } };
      mockPlugin.app = mockApp as any;

      // Call refreshNotes
      await view.refreshNotes();

      // Verify that store.refreshNotes was called with the correct app
      expect(mockUseCardExplorerStore.getState).toHaveBeenCalled();
      expect(mockRefreshNotes).toHaveBeenCalledWith(mockApp);
    });

    it("should handle errors gracefully", async () => {
      // Mock the cardExplorerStore to throw an error
      const mockError = new Error("Store error");
      const mockRefreshNotes = vi.fn().mockRejectedValue(mockError);
      const mockStore = {
        refreshNotes: mockRefreshNotes,
      };
      const mockUseCardExplorerStore = {
        getState: vi.fn().mockReturnValue(mockStore),
      };

      // Mock the dynamic import
      vi.doMock("./store/cardExplorerStore", () => ({
        useCardExplorerStore: mockUseCardExplorerStore,
      }));

      // Mock app object
      const mockApp = { vault: { adapter: {} } };
      mockPlugin.app = mockApp as any;

      // Call refreshNotes and expect it to reject
      await expect(view.refreshNotes()).rejects.toThrow("Store error");
    });
  });

  describe("refresh", () => {
    it("should re-render React component when root and container exist", () => {
      // Mock root and container
      const mockRender = vi.fn();
      (view as any).root = { render: mockRender } as any;
      (view as any).containerElement = mockContainerElement;

      // Call refresh
      view.refresh();

      // Verify that render was called with CardView component
      expect(mockRender).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.any(Function), // CardView component
          props: { plugin: mockPlugin },
        })
      );
    });

    it("should not render when root is null", () => {
      // Set root to null
      (view as any).root = null;
      (view as any).containerElement = mockContainerElement;

      // Call refresh (should not throw error)
      expect(() => view.refresh()).not.toThrow();
    });

    it("should not render when container is null", () => {
      // Mock root but set container to null
      const mockRender = vi.fn();
      (view as any).root = { render: mockRender } as any;
      (view as any).containerElement = null;

      // Call refresh (should not throw error)
      expect(() => view.refresh()).not.toThrow();
      expect(mockRender).not.toHaveBeenCalled();
    });
  });
});
