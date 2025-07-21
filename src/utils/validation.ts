import type { FilterState, PluginData, PluginSettings, SortConfig } from "../types";

/**
 * Validates if a value is a non-empty object (not null, not array, not primitive).
 * Used as a foundation check for all complex object validations.
 *
 * @param data - The value to check
 * @returns True if the value is a valid object, false otherwise
 */
function isValidObject(data: any): boolean {
  // Check for null first (typeof null === "object" in JavaScript)
  return data !== null && typeof data === "object" && !Array.isArray(data);
}

/**
 * Type guard that validates if an array contains only strings.
 * Essential for validating filter arrays like tags, folders, etc.
 *
 * @param arr - The array to validate
 * @returns Type predicate confirming the array contains only string values
 */
function isStringArray(arr: any): arr is string[] {
  return Array.isArray(arr) && arr.every((item: any) => typeof item === "string");
}

/**
 * Validates if a date value is valid (Date object or parseable date string).
 * Used for validating date range filters in the filter system.
 *
 * @param value - The value to check (can be Date object or string)
 * @returns True if the value represents a valid date, false otherwise
 */
function isValidDateValue(value: any): boolean {
  // Accept Date objects directly
  if (value instanceof Date) {
    return true;
  }
  // For strings, try to parse them as dates
  if (typeof value === "string") {
    // Date.parse returns NaN for invalid dates
    return !Number.isNaN(Date.parse(value));
  }
  // Reject all other types
  return false;
}

/**
 * Type guard that validates if an object conforms to the FilterState interface.
 * Ensures all filter properties are correctly typed and valid for the filtering system.
 *
 * Validates:
 * - Array properties (folders, tags, excludeFolders, excludeTags, excludeFilenames)
 * - Filename string property
 * - DateRange object with type and value properties
 *
 * @param data - The object to validate
 * @returns Type predicate confirming the object is a valid FilterState
 */
function validateFilterState(data: any): data is FilterState {
  if (!isValidObject(data)) {
    return false;
  }

  // Check required array properties - all must be string arrays
  // These represent the various filter criteria that can be applied
  const arrayProps = [
    "folders",
    "tags",
    "excludeFolders",
    "excludeTags",
    "excludeFilenames",
  ] as const;
  for (const prop of arrayProps) {
    if (!isStringArray(data[prop])) {
      return false;
    }
  }

  // Check filename property - must be a string (can be empty for no filename filter)
  if (typeof data.filename !== "string") {
    return false;
  }

  // Check dateRange property - can be null (no date filter) or a valid date range object
  if (data.dateRange !== null) {
    if (!isValidObject(data.dateRange)) {
      return false;
    }
    // Date range type must be either "within" (within X days) or "after" (after specific date)
    if (!["within", "after"].includes(data.dateRange.type)) {
      return false;
    }
    // Date range value must be a valid date
    if (!isValidDateValue(data.dateRange.value)) {
      return false;
    }
  }

  return true;
}

/**
 * Type guard that validates if an object conforms to the SortConfig interface.
 * Ensures sort configuration has valid key and order for the sorting system.
 *
 * @param data - The object to validate
 * @returns Type predicate confirming the object is a valid SortConfig
 */
function validateSortConfig(data: any): data is SortConfig {
  if (!isValidObject(data)) {
    return false;
  }

  // Sort key must be a string (e.g., "updated", "title", "created", or frontmatter field)
  if (typeof data.key !== "string") {
    return false;
  }

  // Sort order must be either ascending or descending
  if (!["asc", "desc"].includes(data.order)) {
    return false;
  }

  return true;
}

/**
 * Type guard that validates if an object conforms to the PluginSettings interface.
 * Ensures plugin settings have correct types for safe usage throughout the application.
 *
 * @param data - The object to validate
 * @returns Type predicate confirming the object is a valid PluginSettings
 */
export function validatePluginSettings(data: any): data is PluginSettings {
  if (!isValidObject(data)) {
    return false;
  }

  return (
    typeof data.sortKey === "string" && // Default sort field for notes
    typeof data.autoStart === "boolean" && // Whether to auto-open the view on startup
    typeof data.showInSidebar === "boolean" // Whether to display the view in sidebar vs main area
  );
}

/**
 * Validates a backup data object (subset of PluginData without _backups to avoid recursion).
 * Used internally to validate backup entries without infinite recursion.
 *
 * @param data - The backup data object to validate
 * @returns True if the backup data is valid, false otherwise
 *
 * @internal
 * This function validates the core data structure that gets backed up,
 * excluding the _backups array itself to prevent recursive validation
 */
function validateBackupData(data: any): boolean {
  if (!isValidObject(data)) {
    return false;
  }

  return (
    isStringArray(data.pinnedNotes) && // Array of pinned note file paths
    validateFilterState(data.lastFilters) && // Last used filter configuration
    validateSortConfig(data.sortConfig) // Sort configuration
  );
}

/**
 * Validates a single backup object structure.
 * Ensures backup entries have proper metadata and valid data.
 *
 * @param backup - The backup object to validate
 * @returns True if the backup object is valid, false otherwise
 *
 * @internal
 * Each backup contains timestamp, version, and the actual data snapshot
 */
function validateBackup(backup: any): boolean {
  if (!isValidObject(backup)) {
    return false;
  }

  return (
    typeof backup.timestamp === "number" && // Unix timestamp when backup was created
    typeof backup.version === "number" && // Data format version for migration purposes
    validateBackupData(backup.data) // The actual backed up data
  );
}

/**
 * Type guard that validates if an object conforms to the PluginData interface.
 * Validates the complete plugin data structure including backups and metadata.
 * This is the main validation function for data loaded from disk.
 *
 * Validates:
 * - pinnedNotes array (string paths to pinned notes)
 * - lastFilters object (filter configuration)
 * - sortConfig object (sort configuration)
 * - version number (optional, for data migration)
 * - _backups array (optional, historical data snapshots)
 *
 * @param data - The object to validate
 * @returns Type predicate confirming the object is a valid PluginData
 */
export function validatePluginData(data: any): data is PluginData {
  if (!isValidObject(data)) {
    return false;
  }

  // Check required properties that must always be present

  // Array of file paths for notes that are pinned to the top
  if (!isStringArray(data.pinnedNotes)) {
    return false;
  }

  // Last used filter configuration (restored on plugin startup)
  if (!validateFilterState(data.lastFilters)) {
    return false;
  }

  // Current sort configuration
  if (!validateSortConfig(data.sortConfig)) {
    return false;
  }

  // Check optional version property (used for data migration)
  if (data.version !== undefined && typeof data.version !== "number") {
    return false;
  }

  // Check optional _backups property (array of historical data snapshots)
  if (data._backups !== undefined) {
    if (!Array.isArray(data._backups)) {
      return false;
    }
    // Validate each backup entry in the array
    if (!data._backups.every(validateBackup)) {
      return false;
    }
  }

  return true;
}
