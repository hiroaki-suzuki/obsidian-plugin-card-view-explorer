import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PluginData, PluginSettings } from "../types";
import { DEFAULT_DATA, DEFAULT_SETTINGS } from "../types/plugin";
import {
  CURRENT_DATA_VERSION,
  clearPluginData,
  getDataMigrationStatus,
  loadPluginData,
  loadPluginSettings,
  savePluginData,
  savePluginSettings,
} from "./dataPersistence";

describe("Data Persistence", () => {
  // Mock plugin interface
  const createMockPlugin = () => ({
    loadData: vi.fn(),
    saveData: vi.fn(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("loadPluginData", () => {
    it("should return default data when no data exists", async () => {
      const mockPlugin = createMockPlugin();
      mockPlugin.loadData.mockResolvedValue(null);

      const result = await loadPluginData(mockPlugin);

      expect(result.data).toEqual(DEFAULT_DATA);
      expect(result.migration.migrated).toBe(false);
      expect(result.migration.toVersion).toBe(CURRENT_DATA_VERSION);
    });

    it("should return default data when empty data exists", async () => {
      const mockPlugin = createMockPlugin();
      mockPlugin.loadData.mockResolvedValue({});

      const result = await loadPluginData(mockPlugin);

      expect(result.data).toEqual(DEFAULT_DATA);
      expect(result.migration.migrated).toBe(false);
      expect(result.migration.toVersion).toBe(CURRENT_DATA_VERSION);
    });

    it("should load valid data without migration", async () => {
      const mockPlugin = createMockPlugin();
      const validData = {
        ...DEFAULT_DATA,
        pinnedNotes: ["note1.md", "note2.md"],
        version: CURRENT_DATA_VERSION,
      };
      mockPlugin.loadData.mockResolvedValue(validData);

      const result = await loadPluginData(mockPlugin);

      expect(result.data.pinnedNotes).toEqual(["note1.md", "note2.md"]);
      expect(result.migration.migrated).toBe(false);
    });

    it("should migrate legacy data (version 0)", async () => {
      const mockPlugin = createMockPlugin();
      const legacyData = {
        pinnedNotes: ["note1.md"],
        // Missing version field indicates version 0
      };
      mockPlugin.loadData.mockResolvedValue(legacyData);

      const result = await loadPluginData(mockPlugin);

      expect(result.data.pinnedNotes).toEqual(["note1.md"]);
      expect(result.migration.migrated).toBe(true);
      expect(result.migration.fromVersion).toBe(0);
      expect(result.migration.toVersion).toBe(CURRENT_DATA_VERSION);
      expect(result.migration.warnings).toContain("Migrated from legacy data format");
    });

    it("should handle invalid pinnedNotes in legacy data", async () => {
      const mockPlugin = createMockPlugin();
      const legacyData = {
        pinnedNotes: "invalid", // Should be array
      };
      mockPlugin.loadData.mockResolvedValue(legacyData);

      const result = await loadPluginData(mockPlugin);

      expect(result.data.pinnedNotes).toEqual(DEFAULT_DATA.pinnedNotes);
      expect(result.migration.warnings).toContain("Fixed invalid pinnedNotes array");
    });

    it("should filter non-string values from pinnedNotes", async () => {
      const mockPlugin = createMockPlugin();
      const legacyData = {
        pinnedNotes: ["note1.md", 123, "note2.md", null, "note3.md"],
      };
      mockPlugin.loadData.mockResolvedValue(legacyData);

      const result = await loadPluginData(mockPlugin);

      expect(result.data.pinnedNotes).toEqual(["note1.md", "note2.md", "note3.md"]);
    });

    it("should handle load errors gracefully", async () => {
      const mockPlugin = createMockPlugin();
      mockPlugin.loadData.mockRejectedValue(new Error("Load failed"));

      const result = await loadPluginData(mockPlugin);

      expect(result.data).toEqual(DEFAULT_DATA);
      expect(result.migration.warnings).toContain("Failed to load data, using defaults");
    });
  });

  describe("savePluginData", () => {
    it("should save valid data successfully", async () => {
      const mockPlugin = createMockPlugin();
      mockPlugin.loadData.mockResolvedValue({});
      mockPlugin.saveData.mockResolvedValue(undefined);

      const testData: PluginData = {
        ...DEFAULT_DATA,
        pinnedNotes: ["note1.md", "note2.md"],
      };

      const result = await savePluginData(mockPlugin, testData);

      expect(result).toBe(true);
      expect(mockPlugin.saveData).toHaveBeenCalledWith({
        ...testData,
        version: CURRENT_DATA_VERSION,
      });
    });

    it("should reject invalid data", async () => {
      const mockPlugin = createMockPlugin();

      const invalidData = {
        pinnedNotes: "invalid", // Should be array
        lastFilters: null,
        sortConfig: null,
      } as any;

      const result = await savePluginData(mockPlugin, invalidData);

      expect(result).toBe(false);
      expect(mockPlugin.saveData).not.toHaveBeenCalled();
    });

    it("should handle save errors gracefully", async () => {
      const mockPlugin = createMockPlugin();
      mockPlugin.loadData.mockResolvedValue({});
      mockPlugin.saveData.mockRejectedValue(new Error("Save failed"));

      const result = await savePluginData(mockPlugin, DEFAULT_DATA);

      expect(result).toBe(false);
    });
  });

  describe("loadPluginSettings", () => {
    it("should return default settings when no data exists", async () => {
      const mockPlugin = createMockPlugin();
      mockPlugin.loadData.mockResolvedValue(null);

      const result = await loadPluginSettings(mockPlugin);

      expect(result).toEqual(DEFAULT_SETTINGS);
    });

    it("should load valid settings", async () => {
      const mockPlugin = createMockPlugin();
      const testSettings: PluginSettings = {
        sortKey: "created",
        autoStart: true,
        showInSidebar: true,
      };
      mockPlugin.loadData.mockResolvedValue({ settings: testSettings });

      const result = await loadPluginSettings(mockPlugin);

      expect(result).toEqual(testSettings);
    });

    it("should merge settings with defaults", async () => {
      const mockPlugin = createMockPlugin();
      const partialSettings = {
        sortKey: "created",
        autoStart: true,
        showInSidebar: false,
      };
      mockPlugin.loadData.mockResolvedValue({ settings: partialSettings });

      const result = await loadPluginSettings(mockPlugin);

      expect(result).toEqual({
        sortKey: "created",
        autoStart: true,
        showInSidebar: false,
      });
    });

    it("should handle invalid settings gracefully", async () => {
      const mockPlugin = createMockPlugin();
      const invalidSettings = {
        sortKey: 123, // Should be string
        autoStart: "yes", // Should be boolean
      };
      mockPlugin.loadData.mockResolvedValue({ settings: invalidSettings });

      const result = await loadPluginSettings(mockPlugin);

      expect(result).toEqual(DEFAULT_SETTINGS);
    });

    it("should handle load errors gracefully", async () => {
      const mockPlugin = createMockPlugin();
      mockPlugin.loadData.mockRejectedValue(new Error("Load failed"));

      const result = await loadPluginSettings(mockPlugin);

      expect(result).toEqual(DEFAULT_SETTINGS);
    });
  });

  describe("savePluginSettings", () => {
    it("should save valid settings successfully", async () => {
      const mockPlugin = createMockPlugin();
      mockPlugin.loadData.mockResolvedValue({});
      mockPlugin.saveData.mockResolvedValue(undefined);

      const testSettings: PluginSettings = {
        sortKey: "created",
        autoStart: true,
        showInSidebar: false,
      };

      const result = await savePluginSettings(mockPlugin, testSettings);

      expect(result).toBe(true);
      expect(mockPlugin.saveData).toHaveBeenCalledWith({
        settings: testSettings,
      });
    });

    it("should preserve existing data when saving settings", async () => {
      const mockPlugin = createMockPlugin();
      const existingData = {
        pinnedNotes: ["note1.md"],
        otherField: "value",
      };
      mockPlugin.loadData.mockResolvedValue(existingData);
      mockPlugin.saveData.mockResolvedValue(undefined);

      const testSettings: PluginSettings = {
        sortKey: "created",
        autoStart: true,
        showInSidebar: false,
      };

      const result = await savePluginSettings(mockPlugin, testSettings);

      expect(result).toBe(true);
      expect(mockPlugin.saveData).toHaveBeenCalledWith({
        ...existingData,
        settings: testSettings,
      });
    });

    it("should reject invalid settings", async () => {
      const mockPlugin = createMockPlugin();

      const invalidSettings = {
        sortKey: 123, // Should be string
        autoStart: "yes", // Should be boolean
        showInSidebar: null, // Should be boolean
      } as any;

      const result = await savePluginSettings(mockPlugin, invalidSettings);

      expect(result).toBe(false);
      expect(mockPlugin.saveData).not.toHaveBeenCalled();
    });

    it("should handle save errors gracefully", async () => {
      const mockPlugin = createMockPlugin();
      mockPlugin.loadData.mockResolvedValue({});
      mockPlugin.saveData.mockRejectedValue(new Error("Save failed"));

      const result = await savePluginSettings(mockPlugin, DEFAULT_SETTINGS);

      expect(result).toBe(false);
    });
  });

  describe("getDataMigrationStatus", () => {
    it("should detect no migration needed for current version", async () => {
      const mockPlugin = createMockPlugin();
      mockPlugin.loadData.mockResolvedValue({ version: CURRENT_DATA_VERSION });

      const result = await getDataMigrationStatus(mockPlugin);

      expect(result.needsMigration).toBe(false);
      expect(result.currentVersion).toBe(CURRENT_DATA_VERSION);
      expect(result.targetVersion).toBe(CURRENT_DATA_VERSION);
    });

    it("should detect migration needed for legacy data", async () => {
      const mockPlugin = createMockPlugin();
      mockPlugin.loadData.mockResolvedValue({}); // No version = version 0

      const result = await getDataMigrationStatus(mockPlugin);

      expect(result.needsMigration).toBe(true);
      expect(result.currentVersion).toBe(0);
      expect(result.targetVersion).toBe(CURRENT_DATA_VERSION);
    });

    it("should handle load errors gracefully", async () => {
      const mockPlugin = createMockPlugin();
      mockPlugin.loadData.mockRejectedValue(new Error("Load failed"));

      const result = await getDataMigrationStatus(mockPlugin);

      expect(result.needsMigration).toBe(true);
      expect(result.currentVersion).toBe(0);
      expect(result.targetVersion).toBe(CURRENT_DATA_VERSION);
    });
  });

  describe("clearPluginData", () => {
    it("should clear data successfully", async () => {
      const mockPlugin = createMockPlugin();
      mockPlugin.saveData.mockResolvedValue(undefined);

      const result = await clearPluginData(mockPlugin);

      expect(result).toBe(true);
      expect(mockPlugin.saveData).toHaveBeenCalledWith({});
    });

    it("should handle clear errors gracefully", async () => {
      const mockPlugin = createMockPlugin();
      mockPlugin.saveData.mockRejectedValue(new Error("Clear failed"));

      const result = await clearPluginData(mockPlugin);

      expect(result).toBe(false);
    });
  });

  describe("Integration Tests", () => {
    it("should handle complete save/load cycle", async () => {
      const mockPlugin = createMockPlugin();
      let savedData: any = null;

      // Mock saveData to capture what's saved
      mockPlugin.saveData.mockImplementation((data) => {
        savedData = data;
        return Promise.resolve();
      });

      // Mock loadData to return what was saved
      mockPlugin.loadData.mockImplementation(() => Promise.resolve(savedData));

      // Save test data
      const testData: PluginData = {
        pinnedNotes: ["note1.md", "note2.md"],
        lastFilters: {
          folders: ["folder1"],
          tags: ["tag1"],
          filename: "test",
          dateRange: null,
          excludeFolders: [],
          excludeTags: [],
          excludeFilenames: [],
        },
        sortConfig: {
          key: "created",
          order: "asc",
        },
      };

      const saveResult = await savePluginData(mockPlugin, testData);
      expect(saveResult).toBe(true);

      // Load data back
      const loadResult = await loadPluginData(mockPlugin);
      expect(loadResult.data.pinnedNotes).toEqual(testData.pinnedNotes);
      expect(loadResult.data.lastFilters).toEqual(testData.lastFilters);
      expect(loadResult.data.sortConfig).toEqual(testData.sortConfig);
    });

    it("should handle settings save/load cycle", async () => {
      const mockPlugin = createMockPlugin();
      let savedData: any = {};

      // Mock saveData to capture what's saved
      mockPlugin.saveData.mockImplementation((data) => {
        savedData = { ...savedData, ...data };
        return Promise.resolve();
      });

      // Mock loadData to return what was saved
      mockPlugin.loadData.mockImplementation(() => Promise.resolve(savedData));

      // Save test settings
      const testSettings: PluginSettings = {
        sortKey: "created",
        autoStart: true,
        showInSidebar: false,
      };

      const saveResult = await savePluginSettings(mockPlugin, testSettings);
      expect(saveResult).toBe(true);

      // Load settings back
      const loadResult = await loadPluginSettings(mockPlugin);
      expect(loadResult).toEqual(testSettings);
    });
  });
});
