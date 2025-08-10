import type { App, WorkspaceLeaf } from "obsidian";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CardExplorerPlugin from "./main";
import { VIEW_TYPE_CARD_EXPLORER } from "./view";

// Test data constants for better maintainability
const TEST_DATA = {
  MOCK_SETTINGS: { autoStart: false, showInSidebar: false, sortKey: "updated" },
  MOCK_SETTINGS_WITH_AUTOSTART: { autoStart: true, showInSidebar: false, sortKey: "updated" },
  MOCK_PLUGIN_DATA: {
    pinnedNotes: [],
    lastFilters: { folders: [], tags: [], filename: "", dateRange: null },
    sortConfig: { key: "updated", order: "desc" },
    version: 1,
  },
  MOCK_STORE_DATA: {
    pinnedNotes: ["a.md", "b.md"],
    lastFilters: { folders: [], tags: ["tag"], filename: "", dateRange: null },
  },
  MD_FILE: { extension: "md", path: "note.md" },
  OTHER_FILE: { extension: "txt", path: "note.txt" },
} as const;

// Helper function to create mock app with workspace, vault, and metadata cache
const createMockApp = () => {
  const mockWorkspace = {
    getLeavesOfType: vi.fn().mockReturnValue([]),
    revealLeaf: vi.fn(),
    getLeaf: vi.fn(),
    getRightLeaf: vi.fn(),
    detachLeavesOfType: vi.fn(),
    onLayoutReady: vi.fn(),
  };
  const mockVault = {
    on: vi.fn(),
    offref: vi.fn(),
  };
  const mockMetadataCache = {
    on: vi.fn(),
    offref: vi.fn(),
  };

  return {
    workspace: mockWorkspace,
    vault: mockVault,
    metadataCache: mockMetadataCache,
  } as unknown as App;
};

// Test helper utilities for common patterns
const TestHelpers = {
  async withFakeTimers<T>(fn: () => T | Promise<T>): Promise<T> {
    vi.useFakeTimers();
    try {
      const result = fn();
      if (result instanceof Promise) {
        return result.finally(() => vi.useRealTimers());
      }
      vi.useRealTimers();
      return Promise.resolve(result);
    } catch (error) {
      vi.useRealTimers();
      throw error;
    }
  },

  async mockDataPersistenceModule(
    settings: any = TEST_DATA.MOCK_SETTINGS,
    data: any = TEST_DATA.MOCK_PLUGIN_DATA
  ) {
    const dp = await import("./core/storage/dataPersistence");
    vi.spyOn(dp, "loadPluginSettings").mockResolvedValue(settings as any);
    vi.spyOn(dp, "loadPluginData").mockResolvedValue(data as any);
    return dp;
  },

  async mockErrorHandlingModule() {
    const eh = await import("./core/errors/errorHandling");
    const errorSpy = vi.spyOn(eh, "handleError").mockImplementation(() => undefined as any);
    return { module: eh, spy: errorSpy };
  },

  getEventHandler(calls: Array<[string, (...args: unknown[]) => unknown]>, eventName: string) {
    const found = calls.find(([evt]: [string, unknown]) => evt === eventName);
    expect(found, `${eventName} handler not registered`).toBeTruthy();
    return found![1];
  },

  createMockLeaf(overrides: Partial<WorkspaceLeaf> = {}) {
    return {
      setViewState: vi.fn(),
      view: {},
      ...overrides,
    } as unknown as WorkspaceLeaf;
  },
};

describe("CardExplorerPlugin (unit)", () => {
  let app: App;
  let plugin: CardExplorerPlugin;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createMockApp();
    plugin = new CardExplorerPlugin(app, { id: "card-view-explorer", name: "Card View Explorer" });
  });

  describe("Debounced Functions", () => {
    describe("debouncedRefreshNotes", () => {
      it("invokes refreshNotes after debounce delay", async () => {
        await TestHelpers.withFakeTimers(async () => {
          const spy = vi.spyOn(plugin, "refreshNotes").mockResolvedValue(undefined);

          // Call the debounced function directly
          (plugin as any).debouncedRefreshNotes();

          // Should not execute immediately
          expect(spy).not.toHaveBeenCalled();

          // Should execute after timer advancement
          await vi.runAllTimersAsync();
          expect(spy).toHaveBeenCalledTimes(1);
        });
      });
    });

    describe("debouncedSaveStoreState", () => {
      it("invokes saveStoreState after debounce delay", async () => {
        await TestHelpers.withFakeTimers(async () => {
          const spy = vi.spyOn(plugin as any, "saveStoreState").mockResolvedValue(undefined);

          // Call the debounced function directly
          (plugin as any).debouncedSaveStoreState();

          // Should not execute immediately
          expect(spy).not.toHaveBeenCalled();

          // Should execute after timer advancement
          await vi.runAllTimersAsync();
          expect(spy).toHaveBeenCalledTimes(1);
        });
      });
    });
  });

  describe("Event Handlers Setup", () => {
    const VAULT_EVENTS = ["create", "delete", "modify", "rename"] as const;
    const METADATA_EVENTS = ["changed", "resolved"] as const;

    describe("file system event registration", () => {
      it("registers all required event handlers", () => {
        (plugin as any).setupEventHandlers();

        const vaultCalls = (app as any).vault.on.mock.calls;
        const metaCalls = (app as any).metadataCache.on.mock.calls;

        // Verify all vault events are registered
        VAULT_EVENTS.forEach((eventName) => {
          expect(vaultCalls.some(([evt]: [string, unknown]) => evt === eventName)).toBe(true);
        });

        // Verify all metadata events are registered
        METADATA_EVENTS.forEach((eventName) => {
          expect(metaCalls.some(([evt]: [string, unknown]) => evt === eventName)).toBe(true);
        });
      });
    });

    describe("markdown file event handling", () => {
      it("triggers refreshNotes for markdown file events", async () => {
        await TestHelpers.withFakeTimers(async () => {
          const refreshSpy = vi.spyOn(plugin, "refreshNotes").mockResolvedValue(undefined);

          (plugin as any).setupEventHandlers();

          const vaultCalls = (app as any).vault.on.mock.calls;
          const metaCalls = (app as any).metadataCache.on.mock.calls;

          // Trigger all vault events with markdown file
          VAULT_EVENTS.forEach((eventName) => {
            const handler = TestHelpers.getEventHandler(vaultCalls, eventName);
            handler(TEST_DATA.MD_FILE);
          });

          // Trigger metadata events
          TestHelpers.getEventHandler(metaCalls, "changed")(TEST_DATA.MD_FILE);
          TestHelpers.getEventHandler(metaCalls, "resolved")();

          // All debounced calls should coalesce into a single refresh
          await vi.runAllTimersAsync();
          expect(refreshSpy).toHaveBeenCalledTimes(1);
        });
      });
    });

    describe("non-markdown file filtering", () => {
      it("ignores non-markdown files except for resolved events", async () => {
        await TestHelpers.withFakeTimers(async () => {
          const refreshSpy = vi.spyOn(plugin, "refreshNotes").mockResolvedValue(undefined);

          (plugin as any).setupEventHandlers();

          const vaultCalls = (app as any).vault.on.mock.calls;
          const metaCalls = (app as any).metadataCache.on.mock.calls;

          // Trigger vault events with non-markdown file (should be ignored)
          VAULT_EVENTS.forEach((eventName) => {
            const handler = TestHelpers.getEventHandler(vaultCalls, eventName);
            handler(TEST_DATA.OTHER_FILE);
          });

          // Trigger metadata changed with non-markdown file (should be ignored)
          TestHelpers.getEventHandler(metaCalls, "changed")(TEST_DATA.OTHER_FILE);

          // Trigger resolved event (should always trigger regardless of file type)
          TestHelpers.getEventHandler(metaCalls, "resolved")();

          await vi.runAllTimersAsync();

          // Only one refresh from the resolved event
          expect(refreshSpy).toHaveBeenCalledTimes(1);
        });
      });
    });
  });

  describe("Plugin Lifecycle", () => {
    describe("onload", () => {
      it("initializes plugin with default settings (autoStart disabled)", async () => {
        // Setup: Mock persistence layer
        await TestHelpers.mockDataPersistenceModule();

        // Setup: Mock plugin registration methods
        const registrationMocks = {
          registerView: vi.fn(),
          addCommand: vi.fn(),
          addRibbonIcon: vi.fn(),
          addSettingTab: vi.fn(),
        };
        Object.assign(plugin, registrationMocks);

        vi.spyOn(plugin as any, "setupPinnedNotesAutoSave").mockResolvedValue(undefined);

        // Execute
        await plugin.onload();

        // Verify: Settings and data are loaded
        expect(plugin.getSettings()).toEqual(TEST_DATA.MOCK_SETTINGS);

        // Verify: Plugin components are registered
        expect(registrationMocks.registerView).toHaveBeenCalledWith(
          VIEW_TYPE_CARD_EXPLORER,
          expect.any(Function)
        );
        expect(registrationMocks.addCommand).toHaveBeenCalledWith({
          id: "open-card-view-explorer",
          name: "Open Card View Explorer",
          callback: expect.any(Function),
        });
        expect(registrationMocks.addRibbonIcon).toHaveBeenCalledWith(
          "layout-grid",
          "Card View Explorer",
          expect.any(Function)
        );
        expect(registrationMocks.addSettingTab).toHaveBeenCalled();

        // Verify: onLayoutReady callback is registered for setupEventHandlers
        expect((app as any).workspace.onLayoutReady).toHaveBeenCalledTimes(1);

        // Execute the layout ready callback to set up event handlers
        const setupEventHandlersCallback = (app as any).workspace.onLayoutReady.mock.calls[0][0];
        setupEventHandlersCallback();

        // Verify: Event handlers are set up after layout ready
        expect((app as any).vault.on).toHaveBeenCalledTimes(4); // create, delete, modify, rename
        expect((app as any).metadataCache.on).toHaveBeenCalledTimes(2); // changed, resolved

        // Verify: Store auto-save is configured
        expect((plugin as any).setupPinnedNotesAutoSave).toHaveBeenCalled();
      });

      it("activates view on layout ready when autoStart is enabled", async () => {
        // Setup: Mock with autoStart enabled
        await TestHelpers.mockDataPersistenceModule(TEST_DATA.MOCK_SETTINGS_WITH_AUTOSTART);

        const mockActivateView = vi.fn();
        plugin.activateView = mockActivateView;
        vi.spyOn(plugin as any, "setupPinnedNotesAutoSave").mockResolvedValue(undefined);

        // Execute
        await plugin.onload();

        // Verify: Layout ready callback is registered twice (setupEventHandlers + autoStart)
        expect((app as any).workspace.onLayoutReady).toHaveBeenCalledTimes(2);

        // Execute: Simulate layout ready
        // Note: onLayoutReady is called twice - once for setupEventHandlers and once for autoStart
        const autoStartCallback = (app as any).workspace.onLayoutReady.mock.calls[1][0];
        autoStartCallback();

        // Verify: View is activated
        expect(mockActivateView).toHaveBeenCalled();
      });
    });

    describe("onunload", () => {
      it("cleans up all subscriptions and detaches view", async () => {
        // Setup: Add event references and auto-save subscription
        const mockEventRefs = [{ id: "r1" } as any, { id: "r2" } as any];
        const mockUnsubscribe = vi.fn();

        (plugin as any).eventRefs = mockEventRefs;
        (plugin as any).unsubscribePinnedNotesAutoSave = mockUnsubscribe;

        // Execute
        await plugin.onunload();

        // Verify: Event references are cleaned up
        expect((app as any).vault.offref).toHaveBeenCalledTimes(2);
        expect((plugin as any).eventRefs).toHaveLength(0);

        // Verify: Auto-save subscription is cleaned up
        expect(mockUnsubscribe).toHaveBeenCalled();
        expect((plugin as any).unsubscribePinnedNotesAutoSave).toBeUndefined();

        // Verify: View is detached
        expect((app as any).workspace.detachLeavesOfType).toHaveBeenCalledWith(
          VIEW_TYPE_CARD_EXPLORER
        );
      });

      it("handles cleanup gracefully when no subscriptions exist", async () => {
        // Setup: No event references or auto-save subscription
        (plugin as any).eventRefs = [];
        (plugin as any).unsubscribePinnedNotesAutoSave = undefined;

        // Execute and verify no errors
        await expect(plugin.onunload()).resolves.toBeUndefined();

        // Verify: No event cleanup calls made
        expect((app as any).vault.offref).not.toHaveBeenCalled();

        // Verify: View is still detached
        expect((app as any).workspace.detachLeavesOfType).toHaveBeenCalledWith(
          VIEW_TYPE_CARD_EXPLORER
        );
      });
    });
  });

  describe("User Interface Integration", () => {
    describe("command registration", () => {
      it("registers command that activates the view", async () => {
        // Setup: Mock command registration and view activation
        const mockAddCommand = vi.fn();
        const mockActivateView = vi.fn();

        plugin.addCommand = mockAddCommand;
        plugin.activateView = mockActivateView;

        await plugin.onload();

        // Verify: Command is registered with correct properties
        const commandCalls = mockAddCommand.mock.calls;
        expect(commandCalls.length).toBeGreaterThan(0);

        const [commandConfig] = commandCalls[0];
        expect(commandConfig).toEqual({
          id: "open-card-view-explorer",
          name: "Open Card View Explorer",
          callback: expect.any(Function),
        });

        // Execute: Trigger command callback
        commandConfig.callback?.();

        // Verify: View is activated
        expect(mockActivateView).toHaveBeenCalled();
      });
    });

    describe("ribbon icon", () => {
      it("creates ribbon icon that activates the view", async () => {
        // Setup: Mock ribbon registration and view activation
        const mockAddRibbonIcon = vi.fn();
        const mockActivateView = vi.fn();

        plugin.addRibbonIcon = mockAddRibbonIcon;
        plugin.activateView = mockActivateView;

        await plugin.onload();

        // Verify: Ribbon icon is registered with correct properties
        const ribbonCalls = mockAddRibbonIcon.mock.calls;
        expect(ribbonCalls.length).toBeGreaterThan(0);

        const [icon, title, callback] = ribbonCalls[0];
        expect(icon).toBe("layout-grid");
        expect(title).toBe("Card View Explorer");
        expect(callback).toBeTypeOf("function");

        // Execute: Simulate click event
        callback(new MouseEvent("click"));

        // Verify: View is activated
        expect(mockActivateView).toHaveBeenCalled();
      });
    });
  });

  describe("Data Persistence", () => {
    describe("settings management", () => {
      it("saves modified settings successfully", async () => {
        const dp = await import("./core/storage/dataPersistence");
        const saveSpy = vi.spyOn(dp, "savePluginSettings").mockResolvedValue(true);

        // Setup: Modify settings
        plugin.updateSetting("autoStart", true);
        plugin.updateSetting("sortKey", "created");

        // Execute
        await plugin.saveSettings();

        // Verify: Correct settings are saved
        expect(saveSpy).toHaveBeenCalledWith(plugin, {
          autoStart: true,
          showInSidebar: false,
          sortKey: "created",
        });
      });

      it("handles settings save failure with error handling", async () => {
        const dp = await import("./core/storage/dataPersistence");
        const { module: eh, spy: errorSpy } = await TestHelpers.mockErrorHandlingModule();

        vi.spyOn(dp, "savePluginSettings").mockResolvedValue(false);

        // Execute
        await plugin.saveSettings();

        // Verify: Error is handled correctly
        expect(errorSpy).toHaveBeenCalled();
        const [message, category, context] = errorSpy.mock.calls[0];
        expect(String(message)).toContain("Failed to save settings");
        expect(category).toBe(eh.ErrorCategory.DATA);
        expect(context).toMatchObject({ operation: "saveSettings" });
      });
    });

    describe("plugin data management", () => {
      it("saves plugin data successfully", async () => {
        const dp = await import("./core/storage/dataPersistence");
        const saveSpy = vi.spyOn(dp, "savePluginData").mockResolvedValue(true);

        const testData = {
          pinnedNotes: ["test.md"],
          lastFilters: { folders: [], tags: ["test"], filename: "", dateRange: null },
          sortConfig: { key: "updated", order: "desc" },
          version: 1,
        } as any;

        // Setup: Update plugin data
        plugin.updateData(testData);

        // Execute
        await plugin.savePluginData();

        // Verify: Correct data is saved
        expect(saveSpy).toHaveBeenCalledWith(plugin, testData);
      });

      it("handles plugin data save failure with error handling", async () => {
        const dp = await import("./core/storage/dataPersistence");
        const { module: eh, spy: errorSpy } = await TestHelpers.mockErrorHandlingModule();

        vi.spyOn(dp, "savePluginData").mockResolvedValue(false);

        // Execute
        await plugin.savePluginData();

        // Verify: Error is handled correctly
        expect(errorSpy).toHaveBeenCalled();
        const [message, category, context] = errorSpy.mock.calls[0];
        expect(String(message)).toContain("Failed to save plugin data");
        expect(category).toBe(eh.ErrorCategory.DATA);
        expect(context).toMatchObject({ operation: "savePluginData" });
      });
    });
  });

  describe("Store State Management", () => {
    describe("saveStoreState", () => {
      it("merges and saves serialized store data", async () => {
        // Setup: Mock store with serializable data
        vi.doMock("./store/cardExplorerStore", () => ({
          useCardExplorerStore: {
            getState: () => ({
              getSerializableData: () => TEST_DATA.MOCK_STORE_DATA,
            }),
          },
        }));

        // Setup: Existing plugin data to merge with
        (plugin as any).data = {
          version: 1,
          pinnedNotes: [],
          lastFilters: { folders: [], tags: [], filename: "", dateRange: null },
          sortConfig: { key: "updated", order: "desc" },
        };

        // Setup: Mock save method
        const saveMethodSpy = vi
          .spyOn(plugin as any, "savePluginData")
          .mockResolvedValue(undefined);

        // Execute
        await (plugin as any).saveStoreState();

        // Verify: Save method is called and data is merged correctly
        expect(saveMethodSpy).toHaveBeenCalled();
        expect((plugin as any).data).toEqual({
          version: 1,
          pinnedNotes: ["a.md", "b.md"],
          lastFilters: { folders: [], tags: ["tag"], filename: "", dateRange: null },
          sortConfig: { key: "updated", order: "desc" },
        });
      });

      it("handles store import errors gracefully", async () => {
        const { module: eh, spy: errorSpy } = await TestHelpers.mockErrorHandlingModule();

        // Setup: Mock failing store import
        vi.doMock("./store/cardExplorerStore", () => {
          throw new Error("store import failed");
        });

        // Execute
        await (plugin as any).saveStoreState();

        // Verify: Error is handled correctly
        expect(errorSpy).toHaveBeenCalled();
        const [, category, context] = errorSpy.mock.calls[0];
        expect(category).toBe(eh.ErrorCategory.DATA);
        expect(context).toMatchObject({ operation: "saveStoreState" });
      });
    });

    describe("refreshNotes", () => {
      it("refreshes all active views successfully", async () => {
        const mockView = {
          refreshNotes: vi.fn().mockResolvedValue(undefined),
        } as any;
        const mockLeaf = TestHelpers.createMockLeaf({ view: mockView });

        (app.workspace.getLeavesOfType as any).mockReturnValue([mockLeaf]);

        // Execute
        await plugin.refreshNotes();

        // Verify: View refresh is called
        expect(mockView.refreshNotes).toHaveBeenCalled();
      });

      it("handles workspace errors gracefully", async () => {
        const { module: eh, spy: errorSpy } = await TestHelpers.mockErrorHandlingModule();

        // Setup: Mock failing workspace call
        let callCount = 0;
        (app as any).workspace.getLeavesOfType.mockImplementation(() => {
          callCount++;
          if (callCount === 1) throw new Error("workspace failed");
          return [];
        });

        // Execute (should not throw)
        await expect(plugin.refreshNotes()).resolves.toBeUndefined();

        // Verify: Error is handled correctly
        expect(errorSpy).toHaveBeenCalled();
        const [, category, context] = errorSpy.mock.calls[0];
        expect(category).toBe(eh.ErrorCategory.API);
        expect(context).toMatchObject({ operation: "refreshNotes", viewCount: 0 });
      });
    });
  });

  describe("Settings Integration", () => {
    describe("updateSetting", () => {
      it("triggers sort key update when sortKey setting changes", () => {
        const updateSortSpy = vi
          .spyOn(plugin as any, "updateSortKeyInViews")
          .mockResolvedValue(undefined);

        // Execute: Change sortKey setting
        (plugin as any).updateSetting("sortKey", "created");

        // Verify: Sort key update is triggered
        expect(updateSortSpy).toHaveBeenCalledWith("created");

        // Verify: Other setting changes don't trigger sort update
        updateSortSpy.mockClear();
        (plugin as any).updateSetting("autoStart", true);
        expect(updateSortSpy).not.toHaveBeenCalled();
      });
    });
  });

  describe("Auto-Save Subscription Management", () => {
    describe("setupPinnedNotesAutoSave", () => {
      it("establishes store subscription with proper equality checking", async () => {
        const debouncedSpy = vi.fn();
        (plugin as any).debouncedSaveStoreState = debouncedSpy;

        const unsubscribeMock = vi.fn();
        const subscribeMock = vi.fn((_selector, listener, options) => {
          // Test the equality function with different Set combinations
          const equalityFn = options?.equalityFn as (a: Set<string>, b: Set<string>) => boolean;

          // Equal sets
          expect(equalityFn(new Set(["a"]), new Set(["a"]))).toBe(true);
          expect(equalityFn(new Set(["a", "b"]), new Set(["b", "a"]))).toBe(true);

          // Different sets
          expect(equalityFn(new Set(["a"]), new Set(["b"]))).toBe(false);

          // Trigger listener to test debounced save
          listener();
          return unsubscribeMock;
        });

        vi.doMock("./store/cardExplorerStore", () => ({
          useCardExplorerStore: { subscribe: subscribeMock },
        }));

        // Execute
        await (plugin as any).setupPinnedNotesAutoSave();

        // Verify: Subscription is established and listener triggers save
        expect(subscribeMock).toHaveBeenCalled();
        expect(debouncedSpy).toHaveBeenCalled();

        // Verify: Cleanup works properly
        (plugin as any).cleanupPinnedNotesAutoSave();
        expect(unsubscribeMock).toHaveBeenCalled();
      });

      it("handles edge cases in set equality comparison", async () => {
        const subscribeMock = vi.fn((_selector, _listener, options) => {
          const equalityFn = options?.equalityFn as (a?: Set<string>, b?: Set<string>) => boolean;

          // Test undefined cases
          expect(equalityFn(undefined as any, new Set())).toBe(false);
          expect(equalityFn(new Set(), undefined as any)).toBe(false);

          // Test size mismatch
          expect(equalityFn(new Set(["a"]), new Set(["a", "b"]))).toBe(false);

          return vi.fn();
        });

        vi.doMock("./store/cardExplorerStore", () => ({
          useCardExplorerStore: { subscribe: subscribeMock },
        }));

        await (plugin as any).setupPinnedNotesAutoSave();
        expect(subscribeMock).toHaveBeenCalled();
      });

      it("handles store import failures with error handling", async () => {
        const { module: eh, spy: errorSpy } = await TestHelpers.mockErrorHandlingModule();

        vi.doMock("./store/cardExplorerStore", () => {
          throw new Error("subscribe import failed");
        });

        // Execute
        await (plugin as any).setupPinnedNotesAutoSave();

        // Verify: Error is handled correctly
        expect(errorSpy).toHaveBeenCalled();
        const [, category, context] = errorSpy.mock.calls[0];
        expect(category).toBe(eh.ErrorCategory.DATA);
        expect(context).toMatchObject({ operation: "setupPinnedNotesAutoSave" });
      });
    });
  });

  describe("Utility Functions", () => {
    describe("isMarkdownFile", () => {
      const testCases = [
        {
          file: { extension: "md", path: "note.md" },
          expected: true,
          description: "markdown file",
        },
        { file: { extension: "txt", path: "note.txt" }, expected: false, description: "text file" },
        { file: { path: "note" }, expected: false, description: "file without extension" },
        {
          file: { extension: "MD", path: "note.MD" },
          expected: false,
          description: "uppercase extension",
        },
      ];

      testCases.forEach(({ file, expected, description }) => {
        it(`returns ${expected} for ${description}`, () => {
          expect((plugin as any).isMarkdownFile(file as any)).toBe(expected);
        });
      });
    });

    describe("updateSortKeyInViews", () => {
      it("updates sort key in store successfully", async () => {
        const updateSortFromSettingsMock = vi.fn();
        vi.doMock("./store/cardExplorerStore", () => ({
          useCardExplorerStore: {
            getState: () => ({ updateSortFromSettings: updateSortFromSettingsMock }),
          },
        }));

        // Execute
        await (plugin as any).updateSortKeyInViews("created");

        // Verify
        expect(updateSortFromSettingsMock).toHaveBeenCalledWith("created");
      });

      it("handles store import errors", async () => {
        const { module: eh, spy: errorSpy } = await TestHelpers.mockErrorHandlingModule();

        vi.doMock("./store/cardExplorerStore", () => {
          throw new Error("store import failed");
        });

        // Execute
        await (plugin as any).updateSortKeyInViews("created");

        // Verify: Error is handled correctly
        expect(errorSpy).toHaveBeenCalled();
        const [, category, context] = errorSpy.mock.calls[0];
        expect(category).toBe(eh.ErrorCategory.GENERAL);
        expect(context).toMatchObject({ operation: "updateSortKeyInViews", sortKey: "created" });
      });
    });
  });

  describe("View Management", () => {
    const VIEW_PLACEMENT_TEST_CASES = [
      {
        setting: "showInSidebar",
        value: false,
        expectedMethod: "getLeaf",
        expectedArgs: [true],
        description: "main workspace when showInSidebar is false",
      },
      {
        setting: "showInSidebar",
        value: true,
        expectedMethod: "getRightLeaf",
        expectedArgs: [false],
        description: "right sidebar when showInSidebar is true",
      },
    ];

    describe("activateView", () => {
      VIEW_PLACEMENT_TEST_CASES.forEach(
        ({ setting, value, expectedMethod, expectedArgs, description }) => {
          it(`creates view in ${description}`, async () => {
            // Setup: Configure setting and mock leaf
            (plugin as any).updateSetting(setting, value);
            const mockLeaf = TestHelpers.createMockLeaf();

            (app.workspace.getLeavesOfType as any).mockReturnValue([]);
            (app.workspace as any)[expectedMethod].mockReturnValue(mockLeaf);

            // Execute
            await plugin.activateView();

            // Verify: Correct placement method is called
            expect((app.workspace as any)[expectedMethod]).toHaveBeenCalledWith(...expectedArgs);
            expect(mockLeaf.setViewState).toHaveBeenCalledWith({
              type: VIEW_TYPE_CARD_EXPLORER,
              active: true,
            });
          });
        }
      );

      it("reveals existing view instead of creating new one", async () => {
        const existingLeaf = TestHelpers.createMockLeaf();
        (app.workspace.getLeavesOfType as any).mockReturnValue([existingLeaf]);

        // Execute
        await plugin.activateView();

        // Verify: Existing view is revealed, not recreated
        expect(app.workspace.getLeaf).not.toHaveBeenCalled();
        expect(app.workspace.getRightLeaf).not.toHaveBeenCalled();
        expect(app.workspace.revealLeaf).toHaveBeenCalledWith(existingLeaf);
        expect((existingLeaf as any).setViewState).not.toHaveBeenCalled();
      });
    });
  });
});
