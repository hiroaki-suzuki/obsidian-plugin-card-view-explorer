import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_DATA } from "../types/plugin";
import { CURRENT_DATA_VERSION, migratePluginData, type VersionedPluginData } from "./dataMigration";

describe("Data Migration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("migratePluginData", () => {
    it("should not migrate when data is already current version", async () => {
      const currentVersionData: Partial<VersionedPluginData> = {
        ...DEFAULT_DATA,
        version: CURRENT_DATA_VERSION,
      };

      const result = await migratePluginData(currentVersionData, CURRENT_DATA_VERSION);

      expect(result.migration.migrated).toBe(false);
      expect(result.migration.fromVersion).toBeUndefined();
      expect(result.migration.toVersion).toBe(CURRENT_DATA_VERSION);
      expect(result.migration.warnings).toBeUndefined();
      expect(result.data).toEqual(currentVersionData);
    });

    it("should migrate from version 0 (data without version info)", async () => {
      const legacyData: Partial<VersionedPluginData> = {
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
          key: "modified",
          order: "desc",
        },
      };

      const result = await migratePluginData(legacyData, 0);

      expect(result.migration.migrated).toBe(true);
      expect(result.migration.fromVersion).toBe(0);
      expect(result.migration.toVersion).toBe(CURRENT_DATA_VERSION);
      expect(result.migration.warnings).toContain("Added version info to data format");
      expect(result.data.pinnedNotes).toEqual(["note1.md", "note2.md"]);
      expect(result.data.lastFilters).toEqual(legacyData.lastFilters);
      expect(result.data.sortConfig).toEqual(legacyData.sortConfig);
    });

    it("should handle missing fields in legacy data", async () => {
      const incompleteData: Partial<VersionedPluginData> = {
        pinnedNotes: ["note1.md"],
        // Missing lastFilters and sortConfig
      };

      const result = await migratePluginData(incompleteData, 0);

      expect(result.migration.migrated).toBe(true);
      expect(result.data.pinnedNotes).toEqual(["note1.md"]);
      expect(result.data.lastFilters).toEqual(DEFAULT_DATA.lastFilters);
      expect(result.data.sortConfig).toEqual(DEFAULT_DATA.sortConfig);
    });

    it("should fix invalid pinnedNotes array", async () => {
      const invalidData: Partial<VersionedPluginData> = {
        pinnedNotes: "invalid" as any, // Should be array
        lastFilters: DEFAULT_DATA.lastFilters,
        sortConfig: DEFAULT_DATA.sortConfig,
      };

      const result = await migratePluginData(invalidData, 0);

      expect(result.migration.migrated).toBe(true);
      expect(result.migration.warnings).toContain("Fixed invalid pinnedNotes array");
      expect(result.data.pinnedNotes).toEqual(DEFAULT_DATA.pinnedNotes);
    });

    it("should filter non-string values from pinnedNotes", async () => {
      const dataWithInvalidPins: Partial<VersionedPluginData> = {
        pinnedNotes: ["note1.md", 123, "note2.md", null, "note3.md"] as any,
        lastFilters: DEFAULT_DATA.lastFilters,
        sortConfig: DEFAULT_DATA.sortConfig,
      };

      const result = await migratePluginData(dataWithInvalidPins, 0);

      expect(result.migration.migrated).toBe(true);
      expect(result.data.pinnedNotes).toEqual(["note1.md", "note2.md", "note3.md"]);
    });

    it("should handle empty data gracefully", async () => {
      const emptyData: Partial<VersionedPluginData> = {};

      const result = await migratePluginData(emptyData, 0);

      expect(result.migration.migrated).toBe(true);
      expect(result.data.pinnedNotes).toEqual(DEFAULT_DATA.pinnedNotes);
      expect(result.data.lastFilters).toEqual(DEFAULT_DATA.lastFilters);
      expect(result.data.sortConfig).toEqual(DEFAULT_DATA.sortConfig);
    });

    it("should handle future version data (no migration needed)", async () => {
      const futureVersionData: Partial<VersionedPluginData> = {
        ...DEFAULT_DATA,
      };

      // Test case where fromVersion > CURRENT_DATA_VERSION
      // This represents data from a future version of the plugin
      const result = await migratePluginData(futureVersionData, 99);

      expect(result.migration.migrated).toBe(false); // No migration needed when fromVersion > current
      expect(result.migration.fromVersion).toBeUndefined();
      expect(result.migration.toVersion).toBe(99);
      expect(result.migration.warnings).toBeUndefined(); // No warnings when no migration attempted
    });

    it("should apply multiple migrations sequentially", async () => {
      // This test is more theoretical since we only have one migration currently
      // But it tests the sequential migration logic
      const legacyData: Partial<VersionedPluginData> = {
        pinnedNotes: ["note1.md"],
      };

      const result = await migratePluginData(legacyData, 0);

      expect(result.migration.migrated).toBe(true);
      expect(result.migration.fromVersion).toBe(0);
      expect(result.migration.toVersion).toBe(CURRENT_DATA_VERSION);

      // Should have applied the v0 migration
      expect(result.migration.warnings).toContain("Added version info to data format");
    });

    it("should preserve existing valid data during migration", async () => {
      const validLegacyData: Partial<VersionedPluginData> = {
        pinnedNotes: ["important-note.md", "project-readme.md"],
        lastFilters: {
          folders: ["Projects", "Archive"],
          tags: ["important", "work"],
          filename: "project",
          dateRange: {
            type: "after",
            value: new Date("2024-01-01"),
          },
          excludeFolders: ["Trash"],
          excludeTags: ["deleted"],
          excludeFilenames: ["temp"],
        },
        sortConfig: {
          key: "created",
          order: "asc",
        },
      };

      const result = await migratePluginData(validLegacyData, 0);

      expect(result.migration.migrated).toBe(true);
      expect(result.data.pinnedNotes).toEqual(validLegacyData.pinnedNotes);
      expect(result.data.lastFilters).toEqual(validLegacyData.lastFilters);
      expect(result.data.sortConfig).toEqual(validLegacyData.sortConfig);
    });
  });

  describe("CURRENT_DATA_VERSION", () => {
    it("should be defined as a number", () => {
      expect(typeof CURRENT_DATA_VERSION).toBe("number");
      expect(CURRENT_DATA_VERSION).toBeGreaterThan(0);
    });
  });
});
