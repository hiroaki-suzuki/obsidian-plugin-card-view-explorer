/**
 * Type-safe validation utilities for plugin data structures.
 *
 * This module provides runtime validation functions that serve as type guards,
 * ensuring data integrity when loading persisted state from Obsidian's data.json.
 * All validators use defensive programming to handle potentially malformed user data.
 */

import { isDate } from "es-toolkit";
import { every, isArray, isPlainObject, isString } from "es-toolkit/compat";
import type { FilterState, PluginData, PluginSettings, SortConfig } from "../../types";

/**
 * Validates plugin settings structure loaded from Obsidian settings.
 * @param data - The settings data to validate
 * @returns True if data conforms to PluginSettings interface
 */
export function validatePluginSettings(data: any): data is PluginSettings {
  if (!isPlainObject(data)) {
    return false;
  }

  return (
    typeof data.sortKey === "string" &&
    typeof data.autoStart === "boolean" &&
    typeof data.showInSidebar === "boolean"
  );
}

/**
 * Validates the complete plugin data structure loaded from data.json.
 * This is the main validation function for persisted plugin state.
 * @param data - The plugin data to validate
 * @returns True if data conforms to PluginData interface
 */
export function validatePluginData(data: any): data is PluginData {
  if (!isPlainObject(data)) {
    return false;
  }

  if (!validateFilterState(data.lastFilters)) {
    return false;
  }

  if (!isStringArray(data.pinnedNotes)) {
    return false;
  }

  if (!validateSortConfig(data.sortConfig)) {
    return false;
  }

  // Version is optional but must be a valid version number if present
  if (!isValidOptionalVersion(data.version)) {
    return false;
  }

  return true;
}

/**
 * Validates filter state structure used for note filtering.
 * @param data - The data to validate
 * @returns True if data conforms to FilterState interface
 */
function validateFilterState(data: any): data is FilterState {
  if (!isPlainObject(data)) {
    return false;
  }

  // Validate array properties (folders and tags must be string arrays)
  const arrayProps = ["folders", "tags"] as const;
  for (const prop of arrayProps) {
    if (!isStringArray(data[prop])) {
      return false;
    }
  }

  if (typeof data.filename !== "string") {
    return false;
  }

  // Date range is optional; validate only when not null/undefined
  if (data.dateRange != null) {
    if (!isPlainObject(data.dateRange)) {
      return false;
    }
    const { type, value } = data.dateRange as { type?: unknown; value?: unknown };
    if (typeof type !== "string" || !["within", "after"].includes(type)) {
      return false;
    }
    if (!isValidDateValue(value)) {
      return false;
    }
  }

  return true;
}

/**
 * Validates sort configuration structure.
 * @param data - The data to validate
 * @returns True if data conforms to SortConfig interface
 */
function validateSortConfig(data: any): data is SortConfig {
  if (!isPlainObject(data)) {
    return false;
  }

  if (typeof data.key !== "string") {
    return false;
  }

  // Only allow ascending or descending sort orders
  if (!["asc", "desc"].includes(data.order)) {
    return false;
  }

  return true;
}

/**
 * Validates whether a value is a valid optional version number.
 * Version numbers must be non-negative integers (0, 1, 2, ...) or undefined (optional).
 * @param version - The value to validate as an optional version number
 * @returns True if the value is a valid version number or undefined
 */
function isValidOptionalVersion(version: any): boolean {
  return (
    version === undefined ||
    (typeof version === "number" && Number.isInteger(version) && version >= 0)
  );
}

/**
 * Validates whether a value can be converted to a valid Date.
 * Accepts both Date objects and parseable date strings.
 * @param value - The value to validate as a date
 * @returns True if the value represents a valid date
 */
function isValidDateValue(value: any): boolean {
  if (isDate(value)) {
    return true;
  }

  if (isString(value)) {
    // Use Date.parse to check if string is a valid date format
    return !Number.isNaN(Date.parse(value));
  }

  return false;
}

/**
 * Type guard to validate an array of strings.
 * @param arr - The value to validate
 * @returns True if the value is an array containing only strings
 */
function isStringArray(arr: any): arr is string[] {
  return isArray(arr) && every(arr, isString);
}
