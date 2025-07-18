import type { PluginData, PluginSettings } from "../types";
import { DEFAULT_DATA, DEFAULT_SETTINGS } from "../types/plugin";
import {
  CURRENT_DATA_VERSION,
  type MigrationResult,
  migratePluginData,
  type VersionedPluginData,
} from "./dataMigration";
import { validatePluginData, validatePluginSettings } from "./validation";

/**
 * Data persistence utilities for Card Explorer plugin
 *
 * Handles saving/loading of plugin data and settings with validation,
 * migration, backup, and recovery mechanisms.
 */

/**
 * Backup entry for data recovery
 */
export interface DataBackup {
  /** Timestamp when backup was created */
  timestamp: number;
  /** Data version at time of backup */
  version: number;
  /** Backed up data */
  data: PluginData;
}

/**
 * Load plugin data with validation and migration
 *
 * @param plugin - Plugin instance with loadData method
 * @returns Promise resolving to validated plugin data and migration info
 */
export async function loadPluginData(plugin: {
  loadData(): Promise<any>;
}): Promise<{ data: PluginData; migration: MigrationResult }> {
  try {
    const rawData = await plugin.loadData();

    // Handle first-time load (no data file exists)
    if (!rawData || Object.keys(rawData).length === 0) {
      return {
        data: DEFAULT_DATA,
        migration: {
          migrated: false,
          toVersion: CURRENT_DATA_VERSION,
        },
      };
    }

    // Check if data has version info
    const versionedData = rawData as Partial<VersionedPluginData>;
    const dataVersion = versionedData.version || 0; // Default to 0 for data without version info

    // Perform migration if needed
    const { data: migratedData, migration } = await migratePluginData(versionedData, dataVersion);

    // Validate migrated data
    if (!validatePluginData(migratedData)) {
      console.warn("Card Explorer: Migrated data failed validation, using defaults");
      return {
        data: DEFAULT_DATA,
        migration: {
          migrated: true,
          fromVersion: dataVersion,
          toVersion: CURRENT_DATA_VERSION,
          warnings: ["Data validation failed after migration, using defaults"],
        },
      };
    }

    return { data: migratedData, migration };
  } catch (error) {
    // Import error handling utilities dynamically
    const { handleError, ErrorCategory } = await import("./errorHandling");

    handleError(error, ErrorCategory.DATA, {
      operation: "loadPluginData",
      hasExistingData: false,
    });

    // Try to recover from backup
    const recoveredData = await attemptDataRecovery(plugin);
    if (recoveredData) {
      return {
        data: recoveredData,
        migration: {
          migrated: true,
          fromVersion: 0,
          toVersion: CURRENT_DATA_VERSION,
          warnings: ["Recovered from backup due to data loading error"],
        },
      };
    }

    // Fall back to defaults
    return {
      data: DEFAULT_DATA,
      migration: {
        migrated: false,
        toVersion: CURRENT_DATA_VERSION,
        warnings: ["Failed to load data, using defaults"],
      },
    };
  }
}

/**
 * Save plugin data with backup and validation
 *
 * @param plugin - Plugin instance with saveData method
 * @param data - Plugin data to save
 * @returns Promise resolving to success status
 */
export async function savePluginData(
  plugin: { saveData(data: any): Promise<void>; loadData(): Promise<any> },
  data: PluginData
): Promise<boolean> {
  try {
    // Validate data before saving
    if (!validatePluginData(data)) {
      console.error("Card Explorer: Cannot save invalid plugin data");
      return false;
    }

    // Create backup before saving new data
    await createDataBackup(plugin, data);

    // Add version info and save
    const versionedData: VersionedPluginData = {
      ...data,
      version: CURRENT_DATA_VERSION,
    };

    await plugin.saveData(versionedData);
    return true;
  } catch (error) {
    // Import error handling utilities dynamically
    const { handleError, ErrorCategory } = await import("./errorHandling");

    handleError(error, ErrorCategory.DATA, {
      operation: "savePluginData",
      dataSize: JSON.stringify(data).length,
    });
    return false;
  }
}

/**
 * Load plugin settings with validation
 *
 * @param plugin - Plugin instance with loadData method
 * @returns Promise resolving to validated plugin settings
 */
export async function loadPluginSettings(plugin: {
  loadData(): Promise<any>;
}): Promise<PluginSettings> {
  try {
    const rawData = await plugin.loadData();

    // Extract settings from data (settings are stored in the same file)
    const settings = rawData?.settings || rawData || {};

    // Validate and merge with defaults
    if (validatePluginSettings(settings)) {
      return { ...DEFAULT_SETTINGS, ...settings };
    } else {
      console.warn("Card Explorer: Invalid settings data, using defaults");
      return DEFAULT_SETTINGS;
    }
  } catch (error) {
    console.error("Card Explorer: Failed to load plugin settings:", error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save plugin settings with validation
 *
 * @param plugin - Plugin instance with saveData method
 * @param settings - Plugin settings to save
 * @returns Promise resolving to success status
 */
export async function savePluginSettings(
  plugin: { saveData(data: any): Promise<void>; loadData(): Promise<any> },
  settings: PluginSettings
): Promise<boolean> {
  try {
    // Validate settings before saving
    if (!validatePluginSettings(settings)) {
      console.error("Card Explorer: Cannot save invalid plugin settings");
      return false;
    }

    // Load existing data to preserve other fields
    const existingData = (await plugin.loadData()) || {};

    // Merge settings with existing data
    const updatedData = {
      ...existingData,
      settings,
    };

    await plugin.saveData(updatedData);
    return true;
  } catch (error) {
    console.error("Card Explorer: Failed to save plugin settings:", error);
    return false;
  }
}

/**
 * Create a backup of current data before making changes
 *
 * @param plugin - Plugin instance
 * @param newData - New data that will be saved
 */
async function createDataBackup(
  plugin: { loadData(): Promise<any> },
  _newData: PluginData
): Promise<void> {
  try {
    const existingData = await plugin.loadData();

    if (existingData && Object.keys(existingData).length > 0) {
      const backup: DataBackup = {
        timestamp: Date.now(),
        version: existingData.version || 0,
        data: existingData,
      };

      // Store backup in a separate field (we'll keep last 3 backups)
      const backups = existingData._backups || [];
      backups.unshift(backup);

      // Keep only the 3 most recent backups
      if (backups.length > 3) {
        backups.splice(3);
      }

      // Note: We don't save backups immediately to avoid infinite recursion
      // They'll be saved with the next data save operation
    }
  } catch (error) {
    console.warn("Card Explorer: Failed to create data backup:", error);
  }
}

/**
 * Attempt to recover data from backup
 *
 * @param plugin - Plugin instance
 * @returns Promise resolving to recovered data or null
 */
async function attemptDataRecovery(plugin: {
  loadData(): Promise<any>;
}): Promise<PluginData | null> {
  try {
    const rawData = await plugin.loadData();
    const backups = rawData?._backups as DataBackup[] | undefined;

    if (!backups || !Array.isArray(backups) || backups.length === 0) {
      return null;
    }

    // Try to recover from the most recent valid backup
    for (const backup of backups) {
      if (backup.data && validatePluginData(backup.data)) {
        console.log("Card Explorer: Recovered data from backup", new Date(backup.timestamp));
        return backup.data;
      }
    }

    return null;
  } catch (error) {
    console.error("Card Explorer: Failed to recover from backup:", error);
    return null;
  }
}

/**
 * Clear all plugin data (for testing or reset purposes)
 *
 * @param plugin - Plugin instance
 * @returns Promise resolving to success status
 */
export async function clearPluginData(plugin: {
  saveData(data: any): Promise<void>;
}): Promise<boolean> {
  try {
    await plugin.saveData({});
    return true;
  } catch (error) {
    console.error("Card Explorer: Failed to clear plugin data:", error);
    return false;
  }
}
