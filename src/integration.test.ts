/**
 * Integration tests for Obsidian API usage
 *
 * These tests focus on the integration between the Card View Explorer plugin
 * and Obsidian's APIs, testing the complete workflows and interactions.
 */

import type { App, EventRef, TFile, WorkspaceLeaf } from "obsidian";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CardExplorerPlugin from "./main";
import { CardExplorerSettingTab } from "./settings";
import { CardExplorerView, VIEW_TYPE_CARD_EXPLORER } from "./view";

// Mock the store to avoid circular dependencies
vi.mock("./store/cardExplorerStore", () => ({
  useCardExplorerStore: {
    getState: () => ({
      refreshNotes: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

// Mock React DOM for view testing
vi.mock("react-dom/client", () => ({
  createRoot: vi.fn(() => ({
    render: vi.fn(),
    unmount: vi.fn(),
  })),
}));

// Mock data persistence utilities
vi.mock("./utils/dataPersistence", () => ({
  loadPluginData: vi.fn().mockResolvedValue({
    data: {
      pinnedNotes: [],
      lastFilters: {
        folders: [],
        tags: [],
        filename: "",
        dateRange: null,
      },
      sortConfig: {
        key: "updated",
        order: "desc",
      },
      version: 1,
    },
    migration: { migrated: false },
  }),
  loadPluginSettings: vi.fn().mockResolvedValue({
    autoStart: false,
    showInSidebar: false,
    sortKey: "updated",
  }),
  savePluginData: vi.fn().mockResolvedValue(true),
  savePluginSettings: vi.fn().mockResolvedValue(true),
}));

describe("Obsidian API Integration Tests", () => {
  let plugin: CardExplorerPlugin;
  let mockApp: Partial<App>;
  let mockVault: any;
  let mockMetadataCache: any;
  let mockWorkspace: any;
  let mockEventRef: EventRef;

  beforeEach(() => {
    // Create mock event reference
    mockEventRef = { id: "mock-event" } as EventRef;

    // Mock vault with comprehensive API
    mockVault = {
      on: vi.fn().mockReturnValue(mockEventRef),
      offref: vi.fn(),
      getMarkdownFiles: vi.fn().mockReturnValue([]),
      cachedRead: vi.fn().mockResolvedValue("# Test Note\nContent line 1\nContent line 2"),
      adapter: {
        exists: vi.fn().mockResolvedValue(true),
        read: vi.fn().mockResolvedValue("{}"),
        write: vi.fn().mockResolvedValue(undefined),
      },
    };

    // Mock metadata cache with comprehensive API
    mockMetadataCache = {
      on: vi.fn().mockReturnValue(mockEventRef),
      offref: vi.fn(),
      getFileCache: vi.fn().mockReturnValue({
        frontmatter: { updated: "2024-01-01", tags: ["test"] },
        tags: [{ tag: "#test", position: { start: { line: 0 } } }],
      }),
    };

    // Mock workspace with comprehensive API
    mockWorkspace = {
      getLeavesOfType: vi.fn().mockReturnValue([]),
      detachLeavesOfType: vi.fn(),
      onLayoutReady: vi.fn(),
      revealLeaf: vi.fn(),
      getLeaf: vi.fn(),
      getRightLeaf: vi.fn(),
      registerViewType: vi.fn(),
      unregisterViewType: vi.fn(),
    };

    // Mock app with all required APIs
    mockApp = {
      vault: mockVault,
      metadataCache: mockMetadataCache,
      workspace: mockWorkspace,
    };

    // Create plugin instance
    plugin = new CardExplorerPlugin(mockApp, {
      id: "card-view-explorer",
      name: "Card View Explorer",
    });
  });

  describe("Plugin Registration and Lifecycle", () => {
    it("should complete full plugin registration lifecycle", async () => {
      // Mock plugin methods to track registration calls
      plugin.registerView = vi.fn();
      plugin.addCommand = vi.fn();
      plugin.addRibbonIcon = vi.fn();
      plugin.addSettingTab = vi.fn();

      // Test plugin load
      await plugin.onload();

      // Verify all registration methods were called
      expect(plugin.registerView).toHaveBeenCalledWith(
        VIEW_TYPE_CARD_EXPLORER,
        expect.any(Function)
      );
      expect(plugin.addCommand).toHaveBeenCalledWith({
        id: "open-card-view-explorer",
        name: "Open Card View Explorer",
        callback: expect.any(Function),
      });
      expect(plugin.addRibbonIcon).toHaveBeenCalledWith(
        "layout-grid",
        "Card View Explorer",
        expect.any(Function)
      );
      expect(plugin.addSettingTab).toHaveBeenCalledWith(expect.any(CardExplorerSettingTab));

      // Verify event handlers were set up
      expect(mockVault.on).toHaveBeenCalledTimes(4); // create, delete, modify, rename
      expect(mockMetadataCache.on).toHaveBeenCalledTimes(2); // changed, resolved

      // Test plugin unload
      await plugin.onunload();

      // Verify cleanup was performed
      expect(mockVault.offref).toHaveBeenCalledTimes(6); // All event handlers
      expect(mockWorkspace.detachLeavesOfType).toHaveBeenCalledWith(VIEW_TYPE_CARD_EXPLORER);
    });

    it("should handle auto-start functionality correctly", async () => {
      // Mock the loadPluginSettings to return autoStart: true
      const { loadPluginSettings } = await import("./utils/dataPersistence");
      vi.mocked(loadPluginSettings).mockResolvedValueOnce({
        autoStart: true,
        showInSidebar: false,
        sortKey: "updated",
      });

      plugin.activateView = vi.fn();

      await plugin.onload();

      // Verify onLayoutReady was called
      expect(mockWorkspace.onLayoutReady).toHaveBeenCalled();

      // Get the callback that was passed to onLayoutReady
      const onLayoutReadyCallback = mockWorkspace.onLayoutReady.mock.calls[0][0];

      // Execute the callback to simulate layout ready
      onLayoutReadyCallback();

      // Verify activateView was triggered
      expect(plugin.activateView).toHaveBeenCalled();
    });

    it("should register view creator function that returns CardExplorerView", async () => {
      plugin.registerView = vi.fn();

      await plugin.onload();

      // Get the view creator function
      const registerViewCall = vi.mocked(plugin.registerView).mock.calls[0];
      const viewCreator = registerViewCall[1];

      // Test that view creator returns CardExplorerView instance
      const mockLeaf = {} as WorkspaceLeaf;
      const view = viewCreator(mockLeaf);

      expect(view).toBeInstanceOf(CardExplorerView);
      expect(view.getViewType()).toBe(VIEW_TYPE_CARD_EXPLORER);
    });
  });

  describe("View Integration with Workspace", () => {
    let view: CardExplorerView;
    let mockLeaf: WorkspaceLeaf;

    beforeEach(() => {
      // Create mock leaf with proper container structure
      mockLeaf = {
        containerEl: {
          children: [
            {}, // Header element
            {
              empty: vi.fn(),
              createEl: vi.fn().mockReturnValue({
                style: {} as CSSStyleDeclaration,
              }),
            }, // Content container
          ],
        },
      } as unknown as WorkspaceLeaf;

      view = new CardExplorerView(mockLeaf, plugin);
    });

    it("should integrate properly with workspace leaf lifecycle", async () => {
      // Test view opening
      await view.onOpen();

      // Verify that the view attempted to access the container structure
      // The actual DOM manipulation is mocked, so we verify the view doesn't throw errors
      expect((view as any).containerElement).toBeDefined();
      expect((view as any).root).toBeDefined();

      // Test view closing
      await view.onClose();

      // Verify cleanup was performed (root should be null)
      expect((view as any).root).toBeNull();
      expect((view as any).containerElement).toBeNull();
    });

    it("should handle view activation in different workspace locations", async () => {
      // Test main workspace activation
      plugin.updateSetting("showInSidebar", false);
      const mockMainLeaf = { setViewState: vi.fn() };
      mockWorkspace.getLeavesOfType.mockReturnValue([]);
      mockWorkspace.getLeaf.mockReturnValue(mockMainLeaf);

      await plugin.activateView();

      expect(mockWorkspace.getLeaf).toHaveBeenCalledWith(true);
      expect(mockMainLeaf.setViewState).toHaveBeenCalledWith({
        type: VIEW_TYPE_CARD_EXPLORER,
        active: true,
      });

      // Test sidebar activation
      plugin.updateSetting("showInSidebar", true);
      const mockSidebarLeaf = { setViewState: vi.fn() };
      mockWorkspace.getRightLeaf.mockReturnValue(mockSidebarLeaf);

      await plugin.activateView();

      expect(mockWorkspace.getRightLeaf).toHaveBeenCalledWith(false);
      expect(mockSidebarLeaf.setViewState).toHaveBeenCalledWith({
        type: VIEW_TYPE_CARD_EXPLORER,
        active: true,
      });
    });

    it("should handle existing view reactivation", async () => {
      const existingView = new CardExplorerView(mockLeaf, plugin);
      const existingLeaf = { view: existingView };
      mockWorkspace.getLeavesOfType.mockReturnValue([existingLeaf]);

      await plugin.activateView();

      // Should not create new view, just reveal existing one
      expect(mockWorkspace.getLeaf).not.toHaveBeenCalled();
      expect(mockWorkspace.getRightLeaf).not.toHaveBeenCalled();
      expect(mockWorkspace.revealLeaf).toHaveBeenCalledWith(existingLeaf);
    });
  });

  describe("Settings Persistence and Loading", () => {
    it("should complete full settings lifecycle", async () => {
      const { loadPluginSettings, savePluginSettings } = await import("./utils/dataPersistence");

      // Test settings loading during plugin initialization
      await plugin.onload();

      expect(loadPluginSettings).toHaveBeenCalledWith(plugin);
      expect(plugin.getSettings()).toEqual({
        autoStart: false,
        showInSidebar: false,
        sortKey: "updated",
      });

      // Test settings modification and saving
      plugin.updateSetting("autoStart", true);
      plugin.updateSetting("sortKey", "created");

      await plugin.saveSettings();

      expect(savePluginSettings).toHaveBeenCalledWith(plugin, {
        autoStart: true,
        showInSidebar: false,
        sortKey: "created",
      });
    });

    it("should handle settings persistence failures gracefully", async () => {
      const { savePluginSettings } = await import("./utils/dataPersistence");
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Mock save failure
      vi.mocked(savePluginSettings).mockResolvedValueOnce(false);

      await plugin.saveSettings();

      expect(consoleSpy).toHaveBeenCalledWith("Card View Explorer: Failed to save settings");
      consoleSpy.mockRestore();
    });

    it("should complete full plugin data lifecycle", async () => {
      const { loadPluginData, savePluginData } = await import("./utils/dataPersistence");

      // Test data loading during plugin initialization
      await plugin.onload();

      expect(loadPluginData).toHaveBeenCalledWith(plugin);

      // Test data modification and saving
      const testData = {
        pinnedNotes: ["test.md"],
        lastFilters: {
          folders: [],
          tags: [],
          filename: "",
          dateRange: null,
        },
        sortConfig: {
          key: "updated",
          order: "desc",
        },
        version: 1,
        _backups: [],
      };
      plugin.updateData(testData as any);

      await plugin.savePluginData();

      expect(savePluginData).toHaveBeenCalledWith(plugin, testData);
    });

    it("should handle data migration during loading", async () => {
      const { loadPluginData } = await import("./utils/dataPersistence");
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      // Mock migration scenario
      vi.mocked(loadPluginData).mockResolvedValueOnce({
        data: {
          pinnedNotes: ["migrated.md"],
          lastFilters: {
            folders: [],
            tags: [],
            filename: "",
            dateRange: null,
          },
          sortConfig: {
            key: "updated",
            order: "desc",
          },
          version: 1,
        },
        migration: { migrated: true, fromVersion: 0, toVersion: 1, warnings: [] },
      });

      await plugin.loadPluginData();

      expect(consoleSpy).toHaveBeenCalledWith("Card View Explorer: Data migrated", {
        from: 0,
        to: 1,
        warnings: [],
      });

      consoleSpy.mockRestore();
    });
  });

  describe("Event Subscription and Handling", () => {
    let eventHandlers: Map<string, (...args: any[]) => void>;

    beforeEach(async () => {
      eventHandlers = new Map();

      // Capture event handlers during registration
      mockVault.on.mockImplementation((event: string, handler: (...args: any[]) => void) => {
        eventHandlers.set(`vault.${event}`, handler);
        return mockEventRef;
      });

      mockMetadataCache.on.mockImplementation(
        (event: string, handler: (...args: any[]) => void) => {
          eventHandlers.set(`metadata.${event}`, handler);
          return mockEventRef;
        }
      );

      // Mock debounced refresh function
      (plugin as any).debouncedRefreshNotes = vi.fn();

      await plugin.onload();
    });

    it("should set up all required event subscriptions", () => {
      // Verify all vault events are subscribed
      expect(eventHandlers.has("vault.create")).toBe(true);
      expect(eventHandlers.has("vault.delete")).toBe(true);
      expect(eventHandlers.has("vault.modify")).toBe(true);
      expect(eventHandlers.has("vault.rename")).toBe(true);

      // Verify all metadata cache events are subscribed
      expect(eventHandlers.has("metadata.changed")).toBe(true);
      expect(eventHandlers.has("metadata.resolved")).toBe(true);
    });

    it("should handle vault file events correctly", () => {
      const markdownFile = { extension: "md", path: "test.md" } as TFile;
      const nonMarkdownFile = { extension: "txt", path: "test.txt" } as TFile;

      // Test create event
      eventHandlers.get("vault.create")!(markdownFile);
      expect((plugin as any).debouncedRefreshNotes).toHaveBeenCalled();

      vi.clearAllMocks();
      eventHandlers.get("vault.create")!(nonMarkdownFile);
      expect((plugin as any).debouncedRefreshNotes).not.toHaveBeenCalled();

      // Test delete event
      vi.clearAllMocks();
      eventHandlers.get("vault.delete")!(markdownFile);
      expect((plugin as any).debouncedRefreshNotes).toHaveBeenCalled();

      // Test modify event
      vi.clearAllMocks();
      eventHandlers.get("vault.modify")!(markdownFile);
      expect((plugin as any).debouncedRefreshNotes).toHaveBeenCalled();

      // Test rename event
      vi.clearAllMocks();
      eventHandlers.get("vault.rename")!(markdownFile);
      expect((plugin as any).debouncedRefreshNotes).toHaveBeenCalled();
    });

    it("should handle metadata cache events correctly", () => {
      const markdownFile = { extension: "md", path: "test.md" } as TFile;

      // Test metadata changed event
      eventHandlers.get("metadata.changed")!(markdownFile);
      expect((plugin as any).debouncedRefreshNotes).toHaveBeenCalled();

      // Test metadata resolved event
      vi.clearAllMocks();
      eventHandlers.get("metadata.resolved")!();
      expect((plugin as any).debouncedRefreshNotes).toHaveBeenCalled();
    });

    it("should properly clean up event subscriptions on unload", async () => {
      // Verify events were registered
      expect(mockVault.on).toHaveBeenCalledTimes(4);
      expect(mockMetadataCache.on).toHaveBeenCalledTimes(2);

      await plugin.onunload();

      // Verify all event handlers were cleaned up
      expect(mockVault.offref).toHaveBeenCalledTimes(6);
      expect((plugin as any).eventRefs).toHaveLength(0);
    });
  });

  describe("Cross-Component Integration", () => {
    it("should integrate plugin, view, and store for note refresh", async () => {
      // Create view and set up integration
      const mockLeaf = {
        containerEl: {
          children: [{}, { empty: vi.fn(), createEl: vi.fn().mockReturnValue({}) }],
        },
      } as unknown as WorkspaceLeaf;

      const view = new CardExplorerView(mockLeaf, plugin);
      const mockViewLeaf = { view };
      mockWorkspace.getLeavesOfType.mockReturnValue([mockViewLeaf]);

      // Test full refresh integration
      await plugin.refreshNotes();

      // Verify workspace was queried and view refresh was attempted
      expect(mockWorkspace.getLeavesOfType).toHaveBeenCalledWith(VIEW_TYPE_CARD_EXPLORER);
    });

    it("should handle command execution integration", async () => {
      plugin.addCommand = vi.fn();
      plugin.activateView = vi.fn();

      await plugin.onload();

      // Get the command callback
      const commandCall = vi.mocked(plugin.addCommand).mock.calls[0];
      const command = commandCall[0];

      // Execute the command callback
      expect(command.callback).toBeDefined();
      command.callback!();

      expect(plugin.activateView).toHaveBeenCalled();
    });

    it("should handle ribbon icon integration", async () => {
      plugin.addRibbonIcon = vi.fn();
      plugin.activateView = vi.fn();

      await plugin.onload();

      // Get the ribbon icon callback
      const ribbonCall = vi.mocked(plugin.addRibbonIcon).mock.calls[0];
      const callback = ribbonCall[2];

      // Execute the ribbon callback
      expect(callback).toBeDefined();
      callback!(new MouseEvent("click"));

      expect(plugin.activateView).toHaveBeenCalled();
    });
  });

  describe("Error Handling Integration", () => {
    it("should handle view refresh errors gracefully", async () => {
      const mockView = {
        refreshNotes: vi.fn().mockRejectedValue(new Error("View refresh failed")),
      };
      const mockLeaf = { view: mockView };
      mockWorkspace.getLeavesOfType.mockReturnValue([mockLeaf]);

      // Should not throw despite view refresh failure
      await expect(plugin.refreshNotes()).resolves.toBeUndefined();
    });

    it("should handle missing view methods gracefully", async () => {
      const mockView = {}; // No refreshNotes method
      const mockLeaf = { view: mockView };
      mockWorkspace.getLeavesOfType.mockReturnValue([mockLeaf]);

      // Should not throw despite missing method
      await expect(plugin.refreshNotes()).resolves.toBeUndefined();
    });

    it("should handle workspace API failures gracefully", async () => {
      // Mock workspace method to throw error only on first call, then succeed
      let callCount = 0;
      mockWorkspace.getLeavesOfType.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error("Workspace error");
        }
        return []; // Return empty array on subsequent calls
      });

      // Mock the error handling utility
      vi.doMock("./utils/errorHandling", () => ({
        handleError: vi.fn(),
        ErrorCategory: { API: "API" },
      }));

      // The refreshNotes method should catch and handle the error
      await expect(plugin.refreshNotes()).resolves.toBeUndefined();
    });
  });
});
