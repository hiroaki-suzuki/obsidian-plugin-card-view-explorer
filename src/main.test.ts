import type { App, EventRef, TAbstractFile, TFile } from "obsidian";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CardExplorerPlugin from "./main";
import type { FilterState, PluginData, SortConfig } from "./types";

vi.mock("./view", () => ({
  CardExplorerView: vi.fn(),
  VIEW_TYPE_CARD_EXPLORER: "card-view-explorer-view",
}));

vi.mock("./settings", () => ({
  CardExplorerSettingTab: vi.fn(),
  DEFAULT_SETTINGS: { autoStart: false, showInSidebar: false, sortKey: "updated" },
}));

vi.mock("./types/plugin", () => ({
  DEFAULT_DATA: { pinnedNotes: [], lastFilters: null, sortConfig: null },
}));

vi.mock("./utils/dataPersistence", () => ({
  loadPluginData: vi.fn().mockResolvedValue({
    pinnedNotes: [],
    lastFilters: null,
    sortConfig: null,
  }),
  loadPluginSettings: vi
    .fn()
    .mockResolvedValue({ autoStart: false, showInSidebar: false, sortKey: "updated" }),
  savePluginData: vi.fn().mockResolvedValue(true),
  savePluginSettings: vi.fn().mockResolvedValue(true),
}));

describe("CardExplorerPlugin", () => {
  let plugin: CardExplorerPlugin;
  let mockApp: Partial<App>;
  let mockVault: any;
  let mockMetadataCache: any;
  let mockWorkspace: any;

  beforeEach(() => {
    // Create mock event references
    const mockEventRef = { id: "mock-event" } as EventRef;

    // Mock vault with event handling
    mockVault = {
      on: vi.fn().mockReturnValue(mockEventRef),
      offref: vi.fn(),
      getMarkdownFiles: vi.fn().mockReturnValue([]),
    };

    // Mock metadata cache with event handling
    mockMetadataCache = {
      on: vi.fn().mockReturnValue(mockEventRef),
      offref: vi.fn(),
    };

    // Mock workspace
    mockWorkspace = {
      getLeavesOfType: vi.fn().mockReturnValue([]),
      detachLeavesOfType: vi.fn(),
      onLayoutReady: vi.fn(),
      revealLeaf: vi.fn(),
      getLeaf: vi.fn(),
      getRightLeaf: vi.fn(),
    };

    // Mock app
    mockApp = {
      vault: mockVault,
      metadataCache: mockMetadataCache,
      workspace: mockWorkspace,
    };

    // Create plugin instance
    plugin = new CardExplorerPlugin(mockApp, { id: "test", name: "Test" });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("event handling setup", () => {
    it("should set up event handlers on load", async () => {
      await plugin.onload();

      // Verify vault event subscriptions
      expect(mockVault.on).toHaveBeenCalledWith("create", expect.any(Function));
      expect(mockVault.on).toHaveBeenCalledWith("delete", expect.any(Function));
      expect(mockVault.on).toHaveBeenCalledWith("modify", expect.any(Function));
      expect(mockVault.on).toHaveBeenCalledWith("rename", expect.any(Function));

      // Verify metadata cache event subscriptions
      expect(mockMetadataCache.on).toHaveBeenCalledWith("changed", expect.any(Function));
      expect(mockMetadataCache.on).toHaveBeenCalledWith("resolved", expect.any(Function));

      // Should have 6 event handlers registered
      expect((plugin as any).eventRefs).toHaveLength(6);
    });

    it("should clean up event handlers on unload", async () => {
      await plugin.onload();
      const eventRefs = [...(plugin as any).eventRefs];

      await plugin.onunload();

      // Verify all event handlers were cleaned up
      expect(mockVault.offref).toHaveBeenCalledTimes(eventRefs.length);
      eventRefs.forEach((ref) => {
        expect(mockVault.offref).toHaveBeenCalledWith(ref);
      });

      // Event refs array should be cleared
      expect((plugin as any).eventRefs).toHaveLength(0);
    });
  });

  describe("file type checking", () => {
    it("should identify markdown files correctly", () => {
      const markdownFile = { extension: "md" } as TFile;
      const textFile = { extension: "txt" } as TFile;

      expect((plugin as any).isMarkdownFile(markdownFile)).toBe(true);
      expect((plugin as any).isMarkdownFile(textFile)).toBe(false);
    });
  });

  describe("event handlers", () => {
    let createHandler: (...args: any[]) => void;
    let deleteHandler: (...args: any[]) => void;
    let modifyHandler: (...args: any[]) => void;
    let renameHandler: (...args: any[]) => void;
    let metadataHandler: (...args: any[]) => void;
    let resolvedHandler: (...args: any[]) => void;

    beforeEach(async () => {
      // Mock the debounced refresh function
      (plugin as any).debouncedRefreshNotes = vi.fn();

      await plugin.onload();

      // Extract the event handlers from the mock calls
      const vaultCalls = mockVault.on.mock.calls;
      const metadataCalls = mockMetadataCache.on.mock.calls;

      createHandler = vaultCalls.find((call: any) => call[0] === "create")[1];
      deleteHandler = vaultCalls.find((call: any) => call[0] === "delete")[1];
      modifyHandler = vaultCalls.find((call: any) => call[0] === "modify")[1];
      renameHandler = vaultCalls.find((call: any) => call[0] === "rename")[1];
      metadataHandler = metadataCalls.find((call: any) => call[0] === "changed")[1];
      resolvedHandler = metadataCalls.find((call: any) => call[0] === "resolved")[1];
    });

    it("should trigger refresh on markdown file creation", () => {
      const markdownFile = { extension: "md", path: "test.md" } as TFile;

      createHandler(markdownFile);

      expect((plugin as any).debouncedRefreshNotes).toHaveBeenCalled();
    });

    it("should not trigger refresh on non-markdown file creation", () => {
      const textFile = { extension: "txt", path: "test.txt" } as TFile;

      createHandler(textFile);

      expect((plugin as any).debouncedRefreshNotes).not.toHaveBeenCalled();
    });

    it("should trigger refresh on markdown file deletion", () => {
      const markdownFile = { extension: "md", path: "test.md" } as TFile;

      deleteHandler(markdownFile);

      expect((plugin as any).debouncedRefreshNotes).toHaveBeenCalled();
    });

    it("should trigger refresh on markdown file modification", () => {
      const markdownFile = { extension: "md", path: "test.md" } as TFile;

      modifyHandler(markdownFile as TAbstractFile);

      expect((plugin as any).debouncedRefreshNotes).toHaveBeenCalled();
    });

    it("should trigger refresh on markdown file rename", () => {
      const markdownFile = {
        extension: "md",
        path: "test.md",
        name: "test.md",
      } as unknown as TAbstractFile;

      renameHandler(markdownFile);

      expect((plugin as any).debouncedRefreshNotes).toHaveBeenCalled();
    });

    it("should not trigger refresh on rename for non-markdown files", () => {
      const textFile = {
        extension: "txt",
        path: "test.txt",
        name: "test.txt",
      } as unknown as TAbstractFile;

      renameHandler(textFile);

      expect((plugin as any).debouncedRefreshNotes).not.toHaveBeenCalled();
    });

    it("should trigger refresh on metadata changes", () => {
      const markdownFile = { extension: "md", path: "test.md" } as TFile;

      metadataHandler(markdownFile);

      expect((plugin as any).debouncedRefreshNotes).toHaveBeenCalled();
    });

    it("should trigger refresh on metadata cache resolution", () => {
      resolvedHandler();

      expect((plugin as any).debouncedRefreshNotes).toHaveBeenCalled();
    });
  });

  describe("settings and data management", () => {
    it("should load settings on initialization", async () => {
      await plugin.onload();

      expect(plugin.getSettings()).toEqual({
        autoStart: false,
        showInSidebar: false,
        sortKey: "updated",
      });
    });

    it("should save settings successfully", async () => {
      await plugin.saveSettings();

      const { savePluginSettings } = await import("./utils/dataPersistence");
      expect(savePluginSettings).toHaveBeenCalledWith(plugin, plugin.getSettings());
    });

    it("should handle settings save failures", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Mock savePluginSettings to fail
      const { savePluginSettings } = await import("./utils/dataPersistence");
      vi.mocked(savePluginSettings).mockResolvedValueOnce(false);

      await plugin.saveSettings();

      expect(consoleSpy).toHaveBeenCalledWith("Card View Explorer: Failed to save settings");
      consoleSpy.mockRestore();
    });

    it("should update specific settings", () => {
      plugin.updateSetting("autoStart", true);
      plugin.updateSetting("sortKey", "created");

      expect(plugin.getSettings().autoStart).toBe(true);
      expect(plugin.getSettings().sortKey).toBe("created");
    });

    it("should get and update plugin data", () => {
      const testData = {
        pinnedNotes: ["note1.md", "note2.md"],
        lastFilters: undefined,
        sortConfig: undefined,
        version: 1,
      } as unknown as PluginData;

      plugin.updateData(testData);

      expect(plugin.getData()).toEqual(testData);
    });

    it("should save plugin data successfully", async () => {
      await plugin.savePluginData();

      const { savePluginData } = await import("./utils/dataPersistence");
      expect(savePluginData).toHaveBeenCalledWith(plugin, plugin.getData());
    });

    it("should handle plugin data save failures", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Mock savePluginData to fail
      const { savePluginData } = await import("./utils/dataPersistence");
      vi.mocked(savePluginData).mockResolvedValueOnce(false);

      await plugin.savePluginData();

      expect(consoleSpy).toHaveBeenCalledWith("Card View Explorer: Failed to save plugin data");
      consoleSpy.mockRestore();
    });
  });

  describe("view management", () => {
    it("should activate existing view if available", async () => {
      const mockLeaf = { view: {} };
      mockWorkspace.getLeavesOfType.mockReturnValue([mockLeaf]);
      mockWorkspace.revealLeaf = vi.fn();

      await plugin.activateView();

      expect(mockWorkspace.getLeavesOfType).toHaveBeenCalledWith("card-view-explorer-view");
      expect(mockWorkspace.revealLeaf).toHaveBeenCalledWith(mockLeaf);
    });

    it("should create new view in main workspace when showInSidebar is false", async () => {
      plugin.updateSetting("showInSidebar", false);

      const mockLeaf = { setViewState: vi.fn() };
      mockWorkspace.getLeavesOfType.mockReturnValue([]);
      mockWorkspace.getLeaf = vi.fn().mockReturnValue(mockLeaf);
      mockWorkspace.revealLeaf = vi.fn();

      await plugin.activateView();

      expect(mockWorkspace.getLeaf).toHaveBeenCalledWith(true);
      expect(mockLeaf.setViewState).toHaveBeenCalledWith({
        type: "card-view-explorer-view",
        active: true,
      });
      expect(mockWorkspace.revealLeaf).toHaveBeenCalledWith(mockLeaf);
    });

    it("should create new view in right sidebar when showInSidebar is true", async () => {
      plugin.updateSetting("showInSidebar", true);

      const mockLeaf = { setViewState: vi.fn() };
      mockWorkspace.getLeavesOfType.mockReturnValue([]);
      mockWorkspace.getRightLeaf = vi.fn().mockReturnValue(mockLeaf);
      mockWorkspace.revealLeaf = vi.fn();

      await plugin.activateView();

      expect(mockWorkspace.getRightLeaf).toHaveBeenCalledWith(false);
      expect(mockLeaf.setViewState).toHaveBeenCalledWith({
        type: "card-view-explorer-view",
        active: true,
      });
      expect(mockWorkspace.revealLeaf).toHaveBeenCalledWith(mockLeaf);
    });

    it("should handle null leaf gracefully", async () => {
      mockWorkspace.getLeavesOfType.mockReturnValue([]);
      mockWorkspace.getLeaf = vi.fn().mockReturnValue(null);

      // Should not throw an error
      await expect(plugin.activateView()).resolves.toBeUndefined();
    });
  });

  describe("plugin lifecycle", () => {
    it("should register view, commands, and settings on load", async () => {
      // Mock plugin methods
      plugin.registerView = vi.fn();
      plugin.addCommand = vi.fn();
      plugin.addRibbonIcon = vi.fn();
      plugin.addSettingTab = vi.fn();

      await plugin.onload();

      expect(plugin.registerView).toHaveBeenCalledWith(
        "card-view-explorer-view",
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
      expect(plugin.addSettingTab).toHaveBeenCalledWith(expect.any(Object));
    });

    it("should update autoStart setting correctly", () => {
      plugin.updateSetting("autoStart", true);

      expect(plugin.getSettings().autoStart).toBe(true);
    });

    it("should not activate view on auto-start when disabled", async () => {
      plugin.updateSetting("autoStart", false);
      plugin.activateView = vi.fn();

      await plugin.onload();

      expect(plugin.activateView).not.toHaveBeenCalled();
    });

    it("should detach views on unload", async () => {
      await plugin.onunload();

      expect(mockWorkspace.detachLeavesOfType).toHaveBeenCalledWith("card-view-explorer-view");
    });
  });

  describe("refreshNotes", () => {
    it("should refresh notes in all active views", async () => {
      const mockView = {
        refreshNotes: vi.fn(),
      };
      const mockLeaf = {
        view: mockView,
      };

      mockWorkspace.getLeavesOfType.mockReturnValue([mockLeaf]);

      await plugin.refreshNotes();

      expect(mockWorkspace.getLeavesOfType).toHaveBeenCalledWith("card-view-explorer-view");
      expect(mockView.refreshNotes).toHaveBeenCalled();
    });

    it("should handle views without refreshNotes method", async () => {
      const mockView = {}; // No refreshNotes method
      const mockLeaf = {
        view: mockView,
      };

      mockWorkspace.getLeavesOfType.mockReturnValue([mockLeaf]);

      // Should not throw an error
      await expect(plugin.refreshNotes()).resolves.toBeUndefined();
    });

    it("should handle refresh errors gracefully", async () => {
      const mockView = {
        refreshNotes: vi.fn().mockRejectedValue(new Error("Refresh failed")),
      };
      const mockLeaf = {
        view: mockView,
      };

      mockWorkspace.getLeavesOfType.mockReturnValue([mockLeaf]);

      // Should not throw an error despite view refresh failure
      await expect(plugin.refreshNotes()).resolves.toBeUndefined();
    });

    it("should query workspace for Card View Explorer views during refresh", async () => {
      await plugin.refreshNotes();

      expect(mockWorkspace.getLeavesOfType).toHaveBeenCalledWith("card-view-explorer-view");
    });
  });
});
