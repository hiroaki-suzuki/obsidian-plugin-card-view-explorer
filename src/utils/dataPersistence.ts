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
 * Data persistence utilities for Card View Explorer plugin
 *
 * This module provides functions for saving and loading plugin data and settings
 * with comprehensive validation, automatic migration between versions, and
 * backup/recovery functionality. It ensures data integrity through validation
 * and provides fallback mechanisms when data is corrupted or invalid.
 *
 * The backup and recovery functionality is handled by the dataBackup module,
 * while data migration is handled by the dataMigration module.
 */

/**
 * Plugin interface for data operations
 *
 * Represents an Obsidian plugin instance with both read and write capabilities
 * for plugin data. Used for operations that need to both read and write data.
 */
interface PluginDataOperations {
  loadData(): Promise<any>;
  saveData(data: any): Promise<void>;
}

/**
 * Plugin interface for read-only operations
 *
 * Represents an Obsidian plugin instance with only read capabilities
 * for plugin data. Used for operations that only need to read data.
 */
interface PluginReadOnlyOperations {
  loadData(): Promise<any>;
}

/**
 * Error messages for consistent logging
 *
 * Centralized error messages to ensure consistency in error reporting
 * throughout the data persistence operations. Using a const object
 * helps maintain consistency and makes it easier to update messages.
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
 *
 * This function provides a consistent way to handle errors in data operations.
 * It attempts to use the centralized error handling system, but falls back to
 * basic console logging if that's not available (e.g., in test environments).
 *
 * @param error - The error that occurred
 * @param operation - Name of the operation that failed (for logging)
 * @param context - Optional additional context information about the error
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
    console.error(`Card View Explorer: ${operation} failed:`, error);
  }
}

/**
 * Loads plugin data with validation and automatic migration between versions
 *
 * This function handles the complete data loading process including:
 * - Loading raw data from Obsidian storage
 * - Handling first-time plugin usage (empty data)
 * - Automatic version detection and migration
 * - Data validation after migration
 * - Fallback to defaults if validation fails
 * - Automatic recovery from backup if loading fails
 *
 * @param plugin - Plugin instance with loadData method
 * @returns Promise resolving to validated plugin data and detailed migration info
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
      console.warn(`Card View Explorer: ${ERROR_MESSAGES.VALIDATION_FAILED}`);
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
      console.warn(`Card View Explorer: ${ERROR_MESSAGES.RECOVERY_FAILED}:`, recoveryError);
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
 * Saves plugin data with automatic backup creation and validation
 *
 * This function ensures data integrity through:
 * - Validation of data structure before saving
 * - Automatic backup creation before modifying existing data
 * - Version tagging to support future migrations
 * - Error handling with detailed context information
 *
 * @param plugin - Plugin instance with saveData method
 * @param data - Plugin data to save
 * @returns Promise resolving to boolean indicating success (true) or failure (false)
 */
export async function savePluginData(
  plugin: PluginDataOperations,
  data: PluginData
): Promise<boolean> {
  try {
    // Validate data before saving
    if (!validatePluginData(data)) {
      console.error(`Card View Explorer: ${ERROR_MESSAGES.INVALID_DATA}`);
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
 * Loads plugin settings with validation and default value merging
 *
 * This function handles settings loading with:
 * - Extraction of settings from the plugin data file
 * - Validation of settings structure and values
 * - Merging with default settings to ensure all fields exist
 * - Fallback to default settings if validation fails
 *
 * @param plugin - Plugin instance with loadData method
 * @returns Promise resolving to validated plugin settings (merged with defaults)
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
      console.warn(`Card View Explorer: ${ERROR_MESSAGES.SETTINGS_INVALID}`);
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
      console.error(`Card View Explorer: ${ERROR_MESSAGES.INVALID_SETTINGS}`);
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
