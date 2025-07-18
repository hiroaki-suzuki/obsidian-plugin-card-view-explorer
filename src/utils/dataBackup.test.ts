import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PluginData } from "../types";
import { DEFAULT_DATA } from "../types/plugin";
import {
  attemptDataRecovery,
  type BackupPlugin,
  createDataBackup,
  type DataBackup,
  MAX_BACKUPS,
} from "./dataBackup";

describe("dataBackup", () => {
  let mockPlugin: BackupPlugin & { saveData: vi.Mock; loadData: vi.Mock };
  let validPluginData: PluginData;
  let invalidPluginData: any;

  beforeEach(() => {
    mockPlugin = {
      loadData: vi.fn().mockResolvedValue({}),
      saveData: vi.fn().mockResolvedValue(undefined),
    };

    validPluginData = {
      ...DEFAULT_DATA,
      pinnedNotes: ["note1.md", "note2.md"],
    };

    invalidPluginData = {
      // Missing required properties
      invalidField: "test",
    };

    vi.clearAllMocks();
  });

  describe("createDataBackup", () => {
    it("should create backup when existing data is valid", async () => {
      const existingData = {
        ...validPluginData,
        version: 1,
      };
      mockPlugin.loadData.mockResolvedValue(existingData);

      const backup = await createDataBackup(mockPlugin);

      expect(backup).toBeTruthy();
      expect(backup?.timestamp).toBeTypeOf("number");
      expect(backup?.version).toBe(1);
      expect(backup?.data).toEqual(existingData);
    });

    it("should return null when no existing data", async () => {
      mockPlugin.loadData.mockResolvedValue(null);

      const backup = await createDataBackup(mockPlugin);

      expect(backup).toBeNull();
    });

    it("should return null when existing data is empty", async () => {
      mockPlugin.loadData.mockResolvedValue({});

      const backup = await createDataBackup(mockPlugin);

      expect(backup).toBeNull();
    });

    it("should return null when existing data is invalid", async () => {
      mockPlugin.loadData.mockResolvedValue(invalidPluginData);

      const backup = await createDataBackup(mockPlugin);

      expect(backup).toBeNull();
    });

    it("should handle loadData errors gracefully", async () => {
      mockPlugin.loadData.mockRejectedValue(new Error("Load failed"));

      const backup = await createDataBackup(mockPlugin);

      expect(backup).toBeNull();
    });

    it("should maintain backup array and limit to MAX_BACKUPS", async () => {
      const existingBackups: DataBackup[] = [
        { timestamp: 1000, version: 1, data: validPluginData },
        { timestamp: 2000, version: 1, data: validPluginData },
        { timestamp: 3000, version: 1, data: validPluginData },
      ];

      const existingData = {
        ...validPluginData,
        version: 1,
        _backups: existingBackups,
      };

      mockPlugin.loadData.mockResolvedValue(existingData);

      await createDataBackup(mockPlugin);

      // Check that the existing data was modified to include the new backup
      expect(existingData._backups).toHaveLength(MAX_BACKUPS);
      expect(existingData._backups[0].timestamp).toBeGreaterThan(3000);
    });
  });

  describe("attemptDataRecovery", () => {
    it("should recover from most recent valid backup", async () => {
      const backups: DataBackup[] = [
        { timestamp: 3000, version: 1, data: validPluginData },
        { timestamp: 2000, version: 1, data: validPluginData },
        { timestamp: 1000, version: 1, data: invalidPluginData },
      ];

      mockPlugin.loadData.mockResolvedValue({ _backups: backups });

      const recoveredData = await attemptDataRecovery(mockPlugin);

      expect(recoveredData).toEqual(validPluginData);
    });

    it("should return null when no backups available", async () => {
      mockPlugin.loadData.mockResolvedValue({});

      const recoveredData = await attemptDataRecovery(mockPlugin);

      expect(recoveredData).toBeNull();
    });

    it("should return null when backups array is empty", async () => {
      mockPlugin.loadData.mockResolvedValue({ _backups: [] });

      const recoveredData = await attemptDataRecovery(mockPlugin);

      expect(recoveredData).toBeNull();
    });

    it("should return null when all backups are invalid", async () => {
      const backups: DataBackup[] = [
        { timestamp: 3000, version: 1, data: invalidPluginData },
        { timestamp: 2000, version: 1, data: invalidPluginData },
      ];

      mockPlugin.loadData.mockResolvedValue({ _backups: backups });

      const recoveredData = await attemptDataRecovery(mockPlugin);

      expect(recoveredData).toBeNull();
    });

    it("should handle loadData errors gracefully", async () => {
      mockPlugin.loadData.mockRejectedValue(new Error("Load failed"));

      const recoveredData = await attemptDataRecovery(mockPlugin);

      expect(recoveredData).toBeNull();
    });

    it("should skip invalid backup entries", async () => {
      const backups = [
        { timestamp: 3000, version: 1, data: invalidPluginData },
        { timestamp: 2000, version: 1, data: validPluginData },
        null, // Invalid backup entry
        { timestamp: 1000, version: 1, data: validPluginData },
      ];

      mockPlugin.loadData.mockResolvedValue({ _backups: backups });

      const recoveredData = await attemptDataRecovery(mockPlugin);

      expect(recoveredData).toEqual(validPluginData);
    });
  });

  describe("integration scenarios", () => {
    it("should handle complete backup lifecycle", async () => {
      // Start with no data
      mockPlugin.loadData.mockResolvedValue({});

      // First backup creation should return null (no existing data)
      let backup = await createDataBackup(mockPlugin);
      expect(backup).toBeNull();

      // Simulate data exists now
      const existingData = { ...validPluginData, version: 1 };
      mockPlugin.loadData.mockResolvedValue(existingData);

      // Create backup should work now
      backup = await createDataBackup(mockPlugin);
      expect(backup).toBeTruthy();

      // Simulate data corruption
      mockPlugin.loadData.mockResolvedValue({
        _backups: [backup],
        corruptedData: "invalid",
      });

      // Recovery should work
      const recovered = await attemptDataRecovery(mockPlugin);
      expect(recovered).toEqual(existingData);
    });

    it("should handle multiple backup operations", async () => {
      const data1 = { ...validPluginData, pinnedNotes: ["note1.md"] };
      const data2 = { ...validPluginData, pinnedNotes: ["note1.md", "note2.md"] };

      // First backup
      mockPlugin.loadData.mockResolvedValue({ ...data1, version: 1 });
      const backup1 = await createDataBackup(mockPlugin);
      expect(backup1).toBeTruthy();

      // Second backup - simulate existing backup in data
      mockPlugin.loadData.mockResolvedValue({
        ...data2,
        version: 1,
        _backups: [{ timestamp: 1000, version: 1, data: data1 }],
      });
      const backup2 = await createDataBackup(mockPlugin);
      expect(backup2).toBeTruthy();
    });
  });
});
