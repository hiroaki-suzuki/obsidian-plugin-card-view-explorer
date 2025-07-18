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
 * Plugin interface for data operations
 */
interface PluginDataOperations {
  loadData(): Promise<any>;
  saveData(data: any): Promise<void>;
}

/**
 * Plugin interface for read-only operations
 */
interface PluginReadOnlyOperations {
  loadData(): Promise<any>;
}

/**
 * Error messages for consistent logging
 */
const ERROR_MESSAGES = {
  LOAD_FAILED: "Failed to load plugin data",
  SAVE_FAILED: "Failed to save plugin data",
  INVALID_DATA: "Cannot save invalid plugin data",
  INVALID_SETTINGS: "Cannot save invalid plugin settings",
  VALIDATION_FAILED: "Data validation failed after migration, using defaults",
  SETTINGS_INVALID: "Invalid settings data, using defaults",
  RECOVERY_FAILED: "Failed to recover from backup",
  BACKUP_RECOVERY: "Recovered from backup due to data loading error",
  FALLBACK_DEFAULTS: "Failed to load data, using defaults",
  SETTINGS_LOAD_FAILED: "Failed to load plugin settings",
  SETTINGS_SAVE_FAILED: "Failed to save plugin settings",
} as const;

/**
 * Handle errors with consistent logging and optional error handling utilities
 */
async function handleDataError(
  error: unknown,
  operation: string,
  context?: Record<string, any>
): Promise<void> {
  try {
    const { handleError, ErrorCategory } = await import("./errorHandling");
    handleError(error, ErrorCategory.DATA, {
      operation,
      ...context,
    });
  } catch {
    // Fallback for test environments where error handling might not be available
    console.error(`Card Explorer: ${operation} failed:`, error);
  }
}

/**
 * Load plugin data with validation and migration
 *
 * @param plugin - Plugin instance with loadData method
 * @returns Promise resolving to validated plugin data and migration info
 */
export async function loadPluginData(
  plugin: PluginReadOnlyOperations
): Promise<{ data: PluginData; migration: MigrationResult }> {
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
      console.warn(`Card Explorer: ${ERROR_MESSAGES.VALIDATION_FAILED}`);
      return {
        data: DEFAULT_DATA,
        migration: {
          migrated: true,
          fromVersion: dataVersion,
          toVersion: CURRENT_DATA_VERSION,
          warnings: [ERROR_MESSAGES.VALIDATION_FAILED],
        },
      };
    }

    return { data: migratedData, migration };
  } catch (error) {
    await handleDataError(error, "loadPluginData", { hasExistingData: false });

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
            warnings: [ERROR_MESSAGES.BACKUP_RECOVERY],
          },
        };
      }
    } catch (recoveryError) {
      console.warn(`Card Explorer: ${ERROR_MESSAGES.RECOVERY_FAILED}:`, recoveryError);
    }

    // Fall back to defaults
    return {
      data: DEFAULT_DATA,
      migration: {
        migrated: false,
        toVersion: CURRENT_DATA_VERSION,
        warnings: [ERROR_MESSAGES.FALLBACK_DEFAULTS],
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
  plugin: PluginDataOperations,
  data: PluginData
): Promise<boolean> {
  try {
    // Validate data before saving
    if (!validatePluginData(data)) {
      console.error(`Card Explorer: ${ERROR_MESSAGES.INVALID_DATA}`);
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
    await handleDataError(error, "savePluginData", {
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
export async function loadPluginSettings(
  plugin: PluginReadOnlyOperations
): Promise<PluginSettings> {
  try {
    const rawData = await plugin.loadData();

    // Extract settings from data (settings are stored in the same file)
    const settings = rawData?.settings || rawData || {};

    // Validate and merge with defaults
    if (validatePluginSettings(settings)) {
      return { ...DEFAULT_SETTINGS, ...settings };
    } else {
      console.warn(`Card Explorer: ${ERROR_MESSAGES.SETTINGS_INVALID}`);
      return DEFAULT_SETTINGS;
    }
  } catch (error) {
    await handleDataError(error, "loadPluginSettings");
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
  plugin: PluginDataOperations,
  settings: PluginSettings
): Promise<boolean> {
  try {
    // Validate settings before saving
    if (!validatePluginSettings(settings)) {
      console.error(`Card Explorer: ${ERROR_MESSAGES.INVALID_SETTINGS}`);
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
    await handleDataError(error, "savePluginSettings");
    return false;
  }
}
