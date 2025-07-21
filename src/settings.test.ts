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

// Store references to mock settings for testing
const mockSettings: any[] = [];

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
    private textOnChange: ((value: string) => void) | null = null;
    private toggleOnChange: ((value: boolean) => void) | null = null;

    constructor(containerEl: any) {
      this.containerEl = containerEl;
      // Store this setting instance for testing
      mockSettings.push(this);
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
        onChange: vi.fn().mockImplementation((handler) => {
          this.textOnChange = handler;
          return mockText;
        }),
      };
      callback(mockText);
      return this;
    }

    addToggle(callback: (toggle: any) => void) {
      const mockToggle = {
        setValue: vi.fn().mockReturnThis(),
        onChange: vi.fn().mockImplementation((handler) => {
          this.toggleOnChange = handler;
          return mockToggle;
        }),
      };
      callback(mockToggle);
      return this;
    }

    // Helper methods to trigger onChange callbacks in tests
    triggerTextChange(value: string) {
      if (this.textOnChange) {
        return this.textOnChange(value);
      }
    }

    triggerToggleChange(value: boolean) {
      if (this.toggleOnChange) {
        return this.toggleOnChange(value);
      }
    }
  },
}));

// Mock Obsidian APIs
const mockApp = {
  setting: {
    settingTabs: [],
  },
};

const defaultSettings = { ...DEFAULT_SETTINGS };

const mockPlugin = {
  app: mockApp,
  settings: { ...DEFAULT_SETTINGS },
  saveSettings: vi.fn(),
  getSettings: vi.fn(() => defaultSettings),
  updateSetting: vi.fn((key: string, value: any) => {
    (defaultSettings as any)[key] = value;
  }),
} as unknown as CardExplorerPlugin;

describe("CardExplorerSettingTab", () => {
  let settingTab: CardExplorerSettingTab;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSettings.length = 0; // Clear mock settings array
    settingTab = new CardExplorerSettingTab(mockApp as any, mockPlugin);
  });

  describe("display", () => {
    it("should clear container and create header", () => {
      settingTab.display();

      expect(mockContainerEl.empty).toHaveBeenCalled();
      expect(mockContainerEl.createEl).toHaveBeenCalledWith("h2", {
        text: "Card View Explorer Settings",
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
    it("should call plugin.updateSetting and plugin.saveSettings when sort key changes", async () => {
      // Mock updateSetting method
      mockPlugin.updateSetting = vi.fn();

      settingTab.display();

      // Find the sort key setting (first setting created)
      const sortKeySetting = mockSettings[0];
      expect(sortKeySetting).toBeDefined();

      // Simulate user changing sort key
      await sortKeySetting.triggerTextChange("created");

      // Verify that updateSetting and saveSettings were called
      expect(mockPlugin.updateSetting).toHaveBeenCalledWith("sortKey", "created");
      expect(mockPlugin.saveSettings).toHaveBeenCalled();
    });

    it("should call plugin.updateSetting and plugin.saveSettings when auto-start changes", async () => {
      // Mock updateSetting method
      mockPlugin.updateSetting = vi.fn();

      settingTab.display();

      // Find the auto-start setting (second setting created)
      const autoStartSetting = mockSettings[1];
      expect(autoStartSetting).toBeDefined();

      // Simulate user changing auto-start toggle
      await autoStartSetting.triggerToggleChange(true);

      // Verify that updateSetting and saveSettings were called
      expect(mockPlugin.updateSetting).toHaveBeenCalledWith("autoStart", true);
      expect(mockPlugin.saveSettings).toHaveBeenCalled();
    });

    it("should use default value when sort key is empty", async () => {
      // Mock updateSetting method
      mockPlugin.updateSetting = vi.fn();

      settingTab.display();

      // Find the sort key setting (first setting created)
      const sortKeySetting = mockSettings[0];
      expect(sortKeySetting).toBeDefined();

      // Simulate user entering empty sort key
      await sortKeySetting.triggerTextChange("");

      // Verify that updateSetting was called with default value
      expect(mockPlugin.updateSetting).toHaveBeenCalledWith("sortKey", "updated");
      expect(mockPlugin.saveSettings).toHaveBeenCalled();
    });
  });
});
