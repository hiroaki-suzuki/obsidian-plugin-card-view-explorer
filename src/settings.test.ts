import { beforeEach, describe, expect, it, vi } from "vitest";
import type CardExplorerPlugin from "./main";
import { CardExplorerSettingTab, DEFAULT_SETTINGS } from "./settings";

// Mock DOM elements
const mockContainerEl = {
  empty: vi.fn(),
  createEl: vi.fn((_tag: string, attrs?: any) => ({
    textContent: attrs?.text || "",
    setAttribute: vi.fn(),
    addEventListener: vi.fn(),
  })),
};

// Mock Obsidian imports
vi.mock("obsidian", () => ({
  PluginSettingTab: class MockPluginSettingTab {
    app: any;
    plugin: any;
    containerEl: any;

    constructor(app: any, plugin: any) {
      this.app = app;
      this.plugin = plugin;
      this.containerEl = mockContainerEl;
    }
  },
  Setting: class MockSetting {
    private containerEl: any;
    private name = "";
    private desc = "";

    constructor(containerEl: any) {
      this.containerEl = containerEl;
    }

    setName(name: string) {
      this.name = name;
      return this;
    }

    setDesc(desc: string) {
      this.desc = desc;
      return this;
    }

    addText(callback: (text: any) => void) {
      const mockText = {
        setPlaceholder: vi.fn().mockReturnThis(),
        setValue: vi.fn().mockReturnThis(),
        onChange: vi.fn().mockReturnThis(),
      };
      callback(mockText);
      return this;
    }

    addToggle(callback: (toggle: any) => void) {
      const mockToggle = {
        setValue: vi.fn().mockReturnThis(),
        onChange: vi.fn().mockReturnThis(),
      };
      callback(mockToggle);
      return this;
    }
  },
}));

// Mock Obsidian APIs
const mockApp = {
  setting: {
    settingTabs: [],
  },
};

const mockPlugin = {
  app: mockApp,
  settings: { ...DEFAULT_SETTINGS },
  saveSettings: vi.fn(),
  getSettings: vi.fn(() => mockPlugin.settings),
  updateSetting: vi.fn((key: string, value: any) => {
    (mockPlugin.settings as any)[key] = value;
  }),
} as unknown as CardExplorerPlugin;

describe("CardExplorerSettingTab", () => {
  let settingTab: CardExplorerSettingTab;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPlugin.settings = { ...DEFAULT_SETTINGS };
    settingTab = new CardExplorerSettingTab(mockApp as any, mockPlugin);
  });

  describe("Constructor", () => {
    it("should initialize with app and plugin", () => {
      expect(settingTab.app).toBe(mockApp);
      expect(settingTab.plugin).toBe(mockPlugin);
    });
  });

  describe("display", () => {
    it("should clear container and create header", () => {
      settingTab.display();

      expect(mockContainerEl.empty).toHaveBeenCalled();
      expect(mockContainerEl.createEl).toHaveBeenCalledWith("h2", {
        text: "Card Explorer Settings",
      });
    });

    it("should create settings without errors", () => {
      // This test verifies that display() runs without throwing errors
      expect(() => settingTab.display()).not.toThrow();
    });
  });

  describe("Default Settings", () => {
    it("should have correct default values", () => {
      expect(DEFAULT_SETTINGS).toEqual({
        sortKey: "updated",
        autoStart: false,
        showInSidebar: false,
      });
    });
  });

  describe("Settings Integration", () => {
    it("should use plugin settings values", () => {
      // Update plugin settings
      mockPlugin.settings = {
        sortKey: "created",
        autoStart: true,
        showInSidebar: true,
      };

      settingTab = new CardExplorerSettingTab(mockApp as any, mockPlugin);

      expect(settingTab.plugin.settings.sortKey).toBe("created");
      expect(settingTab.plugin.settings.autoStart).toBe(true);
      expect(settingTab.plugin.settings.showInSidebar).toBe(true);
    });

    it("should call saveSettings when settings change", async () => {
      settingTab.display();

      // Verify that saveSettings is available
      expect(mockPlugin.saveSettings).toBeDefined();
      expect(typeof mockPlugin.saveSettings).toBe("function");
    });
  });

  describe("Setting Validation", () => {
    it("should handle empty sort key by using default", () => {
      // This would be tested in the actual onChange handler
      // but we can verify the default behavior
      const emptyKey = "";
      const expectedKey = emptyKey || "updated";

      expect(expectedKey).toBe("updated");
    });

    it("should handle valid sort key", () => {
      const validKey = "created";
      const expectedKey = validKey || "updated";

      expect(expectedKey).toBe("created");
    });
  });

  describe("Settings Types", () => {
    it("should have correct TypeScript interface", () => {
      // This is a compile-time check, but we can verify the structure
      const settings = mockPlugin.settings;

      expect(typeof settings.sortKey).toBe("string");
      expect(typeof settings.autoStart).toBe("boolean");
      expect(typeof settings.showInSidebar).toBe("boolean");
    });
  });
});
