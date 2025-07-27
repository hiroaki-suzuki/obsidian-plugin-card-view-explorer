import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PluginData, PluginSettings } from "../types";
import { DEFAULT_DATA, DEFAULT_SETTINGS } from "../types/plugin";
import { CURRENT_DATA_VERSION } from "./dataMigration";
import {
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

    it("should load valid current version data without migration", async () => {
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

    it("should handle data without version info and migrate from version 0", async () => {
      const mockPlugin = createMockPlugin();
      const dataWithoutVersion = {
        pinnedNotes: ["note1.md"],
        lastFilters: DEFAULT_DATA.lastFilters,
        sortConfig: DEFAULT_DATA.sortConfig,
        // No version field - should default to 0 and migrate
      };
      mockPlugin.loadData.mockResolvedValue(dataWithoutVersion);

      const result = await loadPluginData(mockPlugin);

      expect(result.data.pinnedNotes).toEqual(["note1.md"]);
      expect(result.migration.migrated).toBe(true);
      expect(result.migration.fromVersion).toBe(0);
      expect(result.migration.toVersion).toBe(CURRENT_DATA_VERSION);
    });

    it("should handle load errors gracefully with fallback to defaults", async () => {
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
      mockPlugin.saveData.mockResolvedValue(undefined);

      const testData: PluginData = {
        ...DEFAULT_DATA,
        pinnedNotes: ["note1.md", "note2.md"],
      };

      const result = await savePluginData(mockPlugin, testData);

      expect(result).toBe(true);

      // Check that saveData was called with backup included
      const savedData = mockPlugin.saveData.mock.calls[0][0];
      expect(savedData.version).toBe(CURRENT_DATA_VERSION);
      expect(savedData._backups).toHaveLength(1);
      expect(savedData._backups[0].data).toEqual(testData);
      expect(savedData._backups[0].timestamp).toBeTypeOf("number");
    });

    it("should create backup when saving data", async () => {
      const mockPlugin = createMockPlugin();
      mockPlugin.saveData.mockResolvedValue(undefined);

      const newData: PluginData = {
        ...DEFAULT_DATA,
        pinnedNotes: ["note1.md", "note2.md"],
      };

      const result = await savePluginData(mockPlugin, newData);

      expect(result).toBe(true);

      // Check that saveData was called with backup included
      const savedData = mockPlugin.saveData.mock.calls[0][0];
      expect(savedData.version).toBe(CURRENT_DATA_VERSION);
      expect(savedData._backups).toHaveLength(1);
      expect(savedData._backups[0].data).toEqual(newData); // Backup of the data being saved
      expect(savedData._backups[0].timestamp).toBeTypeOf("number");
    });

    it("should preserve existing backups when saving", async () => {
      const mockPlugin = createMockPlugin();
      mockPlugin.saveData.mockResolvedValue(undefined);

      const oldBackup = {
        timestamp: 1000,
        version: 1,
        data: { ...DEFAULT_DATA, pinnedNotes: ["very-old-note.md"] },
      };

      const newData: PluginData = {
        ...DEFAULT_DATA,
        pinnedNotes: ["note1.md", "note2.md"],
        _backups: [oldBackup], // Include existing backups in the data
      } as any;

      const result = await savePluginData(mockPlugin, newData);

      expect(result).toBe(true);

      // Check that both old and new backups are preserved
      const savedData = mockPlugin.saveData.mock.calls[0][0];
      expect(savedData._backups).toHaveLength(2);
      expect(savedData._backups[0].data).toEqual(newData); // New backup first (backup of newData)
      expect(savedData._backups[1]).toEqual(oldBackup); // Old backup preserved
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

    it("should load valid settings from settings property", async () => {
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

    it("should merge partial settings with defaults", async () => {
      const mockPlugin = createMockPlugin();
      const partialSettings = {
        sortKey: "created",
        autoStart: true,
        showInSidebar: false, // Include all required fields for validation to pass
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

    it("should load settings from root level when no settings property exists", async () => {
      const mockPlugin = createMockPlugin();
      const rootLevelSettings: PluginSettings = {
        sortKey: "modified",
        autoStart: false,
        showInSidebar: true,
      };
      mockPlugin.loadData.mockResolvedValue(rootLevelSettings);

      const result = await loadPluginSettings(mockPlugin);

      expect(result).toEqual(rootLevelSettings);
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

  describe("Edge Cases and Error Scenarios", () => {
    it("should handle corrupted data that fails validation after migration", async () => {
      const mockPlugin = createMockPlugin();

      // Create data that will migrate but then fail validation
      const corruptedData = {
        pinnedNotes: ["note1.md"],
        lastFilters: {
          folders: [],
          tags: [],
          filename: "",
          dateRange: null,
        },
        sortConfig: {
          key: "invalid-key", // This will cause validation to fail
          order: "invalid-order", // This will cause validation to fail
        },
        version: 0, // Old version to trigger migration
      };

      mockPlugin.loadData.mockResolvedValue(corruptedData);

      const result = await loadPluginData(mockPlugin);

      // Should fall back to defaults when validation fails
      expect(result.data).toEqual(DEFAULT_DATA);
      expect(result.migration.migrated).toBe(true);
      expect(result.migration.warnings).toContain(
        "Data validation failed after migration, using defaults"
      );
    });

    it("should handle plugin with existing backup data", async () => {
      const mockPlugin = createMockPlugin();

      // Create data with existing backups
      const dataWithBackups = {
        ...DEFAULT_DATA,
        pinnedNotes: ["note1.md"],
        version: CURRENT_DATA_VERSION,
        _backups: [
          {
            timestamp: Date.now() - 1000,
            version: 0,
            data: { ...DEFAULT_DATA, pinnedNotes: ["old-note.md"] },
          },
        ],
      };

      mockPlugin.loadData.mockResolvedValue(dataWithBackups);

      const result = await loadPluginData(mockPlugin);

      expect(result.data.pinnedNotes).toEqual(["note1.md"]);
      expect(result.migration.migrated).toBe(false);
    });

    it("should handle empty settings object gracefully", async () => {
      const mockPlugin = createMockPlugin();
      mockPlugin.loadData.mockResolvedValue({ settings: {} });

      const result = await loadPluginSettings(mockPlugin);

      // Should return defaults when settings object is empty
      expect(result).toEqual(DEFAULT_SETTINGS);
    });

    it("should handle null settings gracefully", async () => {
      const mockPlugin = createMockPlugin();
      mockPlugin.loadData.mockResolvedValue({ settings: null });

      const result = await loadPluginSettings(mockPlugin);

      // Should return defaults when settings is null
      expect(result).toEqual(DEFAULT_SETTINGS);
    });

    it("should handle backup creation failure during save", async () => {
      const mockPlugin = createMockPlugin();
      mockPlugin.saveData.mockResolvedValue(undefined);

      // Use data that will cause backup creation to fail (invalid data)
      const invalidData = {
        // Missing required fields to make validatePluginData fail
        invalidField: "test",
      } as any;

      const result = await savePluginData(mockPlugin, invalidData);

      // Should fail due to data validation, not backup creation
      expect(result).toBe(false);
      expect(mockPlugin.saveData).not.toHaveBeenCalled();
    });

    it("should handle console fallback when error handling module fails to import", async () => {
      const mockPlugin = createMockPlugin();
      mockPlugin.loadData.mockRejectedValue(new Error("Load failed"));

      // Spy on console.error to verify fallback behavior
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await loadPluginData(mockPlugin);

      expect(result.data).toEqual(DEFAULT_DATA);
      expect(result.migration.warnings).toContain("Failed to load data, using defaults");

      consoleSpy.mockRestore();
    });

    it("should handle console fallback when error handling module fails to import during save", async () => {
      const mockPlugin = createMockPlugin();
      mockPlugin.loadData.mockResolvedValue({});
      mockPlugin.saveData.mockRejectedValue(new Error("Save failed"));

      // Spy on console.error to verify fallback behavior
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await savePluginData(mockPlugin, DEFAULT_DATA);

      expect(result).toBe(false);

      consoleSpy.mockRestore();
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
