/**
 * Safe data persistence utilities for Obsidian plugin storage operations.
 *
 * Provides type-safe wrappers around Obsidian's storage API with validation,
 * error handling, and automatic fallback to default values on failures.
 */

import type { PluginData, PluginSettings } from "../../types";
import { DEFAULT_DATA, DEFAULT_SETTINGS } from "../../types/plugin";
import { ErrorCategory, handleError } from "../errors/errorHandling";
import { validatePluginData, validatePluginSettings } from "./validation";

/**
 * Interface for data storage operations with both read and write capabilities.
 * Abstracts over Obsidian's Plugin.loadData() and Plugin.saveData() methods.
 *
 * @template T - The type of data being stored (may include null for initial state)
 */
interface DataStorage<T = unknown> extends ReadOnlyStorage<T> {
  saveData(data: T): Promise<void>;
}

/**
 * Interface for read-only data storage operations.
 * Used when only data loading is required, promoting type safety.
 *
 * @template T - The type of data being loaded (may include null for initial state)
 */
interface ReadOnlyStorage<T = unknown> {
  loadData(): Promise<T>;
}

/**
 * Safely loads plugin data from storage with validation and fallback to defaults.
 * Handles corrupted data, missing files, and validation failures gracefully.
 *
 * @param plugin - Storage interface providing loadData capability
 * @returns Promise resolving to valid PluginData (never null due to defaults)
 * @throws Never throws - all errors are handled internally with fallback to defaults
 */
export async function loadPluginData(
  plugin: ReadOnlyStorage<PluginData | null>
): Promise<PluginData> {
  return safeLoadData(plugin, validatePluginData, DEFAULT_DATA, "loadPluginData");
}

/**
 * Safely saves plugin data to storage with validation.
 * Validates data before saving and handles storage errors gracefully.
 *
 * @param plugin - Storage interface providing loadData and saveData capabilities
 * @param data - Valid PluginData to save
 * @returns Promise resolving to true if save succeeded, false if validation failed or save error occurred
 */
export async function savePluginData(
  plugin: DataStorage<PluginData | null>,
  data: PluginData
): Promise<boolean> {
  return safeSaveData(plugin, data, validatePluginData, "savePluginData");
}

/**
 * Safely loads plugin settings from storage with validation and fallback to defaults.
 * Extracts settings from nested data structure (rawData.settings) and handles missing or invalid settings.
 *
 * @param plugin - Storage interface providing loadData capability
 * @returns Promise resolving to valid PluginSettings (never null due to defaults)
 * @throws Never throws - all errors are handled internally with fallback to defaults
 */
export async function loadPluginSettings(
  plugin: ReadOnlyStorage<PluginData | null>
): Promise<PluginSettings> {
  return safeLoadData(
    plugin,
    validatePluginSettings,
    DEFAULT_SETTINGS,
    "loadPluginSettings",
    (rawData) => rawData?.settings || {}
  );
}

/**
 * Safely saves plugin settings to storage with validation and data merging.
 * Merges new settings with existing data to preserve other stored information.
 *
 * @param plugin - Storage interface providing loadData and saveData capabilities
 * @param settings - Valid PluginSettings to save
 * @returns Promise resolving to true if save succeeded, false if validation failed or save error occurred
 */
export async function savePluginSettings(
  plugin: DataStorage<any>,
  settings: PluginSettings
): Promise<boolean> {
  return safeSaveData(
    plugin,
    settings,
    validatePluginSettings,
    "savePluginSettings",
    // Merge settings into existing data structure to preserve other fields
    async (settings, existingData) => ({
      ...(existingData || {}),
      settings,
    })
  );
}

/**
 * Generic safe save operation with validation and optional data transformation.
 * Validates data before saving and optionally merges with existing data.
 *
 * @template T - Type of data being saved
 * @param plugin - Storage interface providing loadData and saveData capabilities
 * @param data - Data to validate and save
 * @param validator - Function to validate data before saving
 * @param operation - Operation name for error reporting
 * @param dataTransformer - Optional function to transform data before saving (e.g., merge with existing)
 * @returns Promise resolving to true if successful, false if validation failed or save error occurred
 */
async function safeSaveData<T>(
  plugin: DataStorage,
  data: T,
  validator: (data: T) => boolean,
  operation: string,
  dataTransformer?: (data: T, existing?: any) => Promise<any>
): Promise<boolean> {
  try {
    if (!validator(data)) {
      const errorType = operation.replace("save", "").toLowerCase();
      handlePersistentError(`Cannot save invalid ${errorType} data`, operation, {
        data: JSON.stringify(data),
      });
      return false;
    }

    // Apply transformation if provided, otherwise use data as-is
    const finalData = dataTransformer ? await dataTransformer(data, await plugin.loadData()) : data;

    await plugin.saveData(finalData);
    return true;
  } catch (error) {
    handlePersistentError(error, operation, { data: JSON.stringify(data) });
    return false;
  }
}

/**
 * Generic safe load operation with validation, extraction, and fallback to defaults.
 * Handles missing data, corrupted data, and validation failures gracefully.
 *
 * @template T - Type of data being loaded
 * @param plugin - Storage interface providing loadData capability
 * @param validator - TypeScript type guard function to validate loaded data
 * @param defaultValue - Fallback value to use if data is missing, invalid, or load fails
 * @param operation - Operation name for error reporting
 * @param dataExtractor - Optional function to extract specific data from raw loaded data
 * @returns Promise resolving to valid data of type T (never null due to fallback)
 */
async function safeLoadData<T>(
  plugin: ReadOnlyStorage,
  validator: (data: any) => data is T,
  defaultValue: T,
  operation: string,
  dataExtractor?: (rawData: any) => any
): Promise<T> {
  let rawData: any;
  try {
    rawData = await plugin.loadData();

    if (isEmptyOrMissingData(rawData)) {
      return defaultValue;
    }

    // Extract specific data if extractor provided, otherwise use raw data
    const targetData = dataExtractor ? dataExtractor(rawData) : rawData;

    if (!validator(targetData)) {
      handlePersistentError(`Invalid ${operation} data, using defaults`, operation, {
        data: JSON.stringify(targetData),
      });
      return defaultValue;
    }

    // Merge with defaults if extraction was used to ensure all required fields are present
    return dataExtractor ? { ...defaultValue, ...targetData } : (targetData as T);
  } catch (error) {
    handlePersistentError(error, operation, { hasExistingData: !!rawData });
    return defaultValue;
  }
}

/**
 * Checks if data is empty, null, undefined, or an empty object.
 * Used to determine if default values should be used instead of loaded data.
 *
 * @param data - Data to check for emptiness
 * @returns True if data is falsy or an empty object, false otherwise
 */
function isEmptyOrMissingData(data: any): boolean {
  return !data || (typeof data === "object" && Object.keys(data).length === 0);
}

/**
 * Handles persistent data errors by categorizing them as DATA errors.
 * Wraps the general error handler with DATA category and operation context.
 *
 * @param error - The error that occurred during data operation
 * @param operation - Name of the operation that failed (for debugging)
 * @param context - Additional context information for error reporting
 */
function handlePersistentError(
  error: unknown,
  operation: string,
  context?: Record<string, any>
): void {
  handleError(error, ErrorCategory.DATA, {
    operation,
    ...context,
  });
}
