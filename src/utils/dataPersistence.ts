import type { PluginData, PluginSettings } from "../types";
import { DEFAULT_DATA, DEFAULT_SETTINGS } from "../types/plugin";
import { attemptDataRecovery, createDataBackup } from "./dataBackup";
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
 * Handles saving/loading of plugin data and settings with validation
 * and migration. Backup and recovery functionality is handled by
 * the dataBackup module.
 */

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
    // Try to use error handling utilities if available
    try {
      const { handleError, ErrorCategory } = await import("./errorHandling");
      handleError(error, ErrorCategory.DATA, {
        operation: "loadPluginData",
        hasExistingData: false,
      });
    } catch (_importError) {
      // Fallback for test environments where error handling might not be available
      console.error("Card Explorer: Failed to load plugin data:", error);
    }

    // Try to recover from backup
    try {
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
    } catch (recoveryError) {
      console.warn("Card Explorer: Failed to recover from backup:", recoveryError);
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
    await createDataBackup(plugin);

    // Add version info and save
    const versionedData: VersionedPluginData = {
      ...data,
      version: CURRENT_DATA_VERSION,
    };

    await plugin.saveData(versionedData);
    return true;
  } catch (error) {
    // Try to use error handling utilities if available
    try {
      const { handleError, ErrorCategory } = await import("./errorHandling");
      handleError(error, ErrorCategory.DATA, {
        operation: "savePluginData",
        dataSize: JSON.stringify(data).length,
      });
    } catch (_importError) {
      // Fallback for test environments where error handling might not be available
      console.error("Card Explorer: Failed to save plugin data:", error);
    }
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
