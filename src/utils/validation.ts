import type { FilterState, PluginData, PluginSettings, SortConfig } from "../types";

/**
 * Validates if a value is a non-empty object
 */
function isValidObject(data: any): boolean {
  return data !== null && typeof data === "object" && !Array.isArray(data);
}

/**
 * Validates if an array contains only strings
 */
function isStringArray(arr: any): arr is string[] {
  return Array.isArray(arr) && arr.every((item: any) => typeof item === "string");
}

/**
 * Validates if a date value is valid (Date object or valid date string)
 */
function isValidDateValue(value: any): boolean {
  if (value instanceof Date) {
    return true;
  }
  if (typeof value === "string") {
    return !Number.isNaN(Date.parse(value));
  }
  return false;
}

/**
 * Validates if an object conforms to the FilterState interface
 */
function validateFilterState(data: any): data is FilterState {
  if (!isValidObject(data)) {
    return false;
  }

  // Check required array properties
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

  // Check filename property
  if (typeof data.filename !== "string") {
    return false;
  }

  // Check dateRange property
  if (data.dateRange !== null) {
    if (!isValidObject(data.dateRange)) {
      return false;
    }
    if (!["within", "after"].includes(data.dateRange.type)) {
      return false;
    }
    if (!isValidDateValue(data.dateRange.value)) {
      return false;
    }
  }

  return true;
}

/**
 * Validates if an object conforms to the SortConfig interface
 */
function validateSortConfig(data: any): data is SortConfig {
  if (!isValidObject(data)) {
    return false;
  }

  if (typeof data.key !== "string") {
    return false;
  }

  if (!["asc", "desc"].includes(data.order)) {
    return false;
  }

  return true;
}

/**
 * Validates if an object conforms to the PluginSettings interface
 */
export function validatePluginSettings(data: any): data is PluginSettings {
  if (!isValidObject(data)) {
    return false;
  }

  return (
    typeof data.sortKey === "string" &&
    typeof data.autoStart === "boolean" &&
    typeof data.showInSidebar === "boolean"
  );
}

/**
 * Validates a backup data object (subset of PluginData without _backups to avoid recursion)
 */
function validateBackupData(data: any): boolean {
  if (!isValidObject(data)) {
    return false;
  }

  return (
    isStringArray(data.pinnedNotes) &&
    validateFilterState(data.lastFilters) &&
    validateSortConfig(data.sortConfig)
  );
}

/**
 * Validates a single backup object
 */
function validateBackup(backup: any): boolean {
  if (!isValidObject(backup)) {
    return false;
  }

  return (
    typeof backup.timestamp === "number" &&
    typeof backup.version === "number" &&
    validateBackupData(backup.data)
  );
}

/**
 * Validates if an object conforms to the PluginData interface
 */
export function validatePluginData(data: any): data is PluginData {
  if (!isValidObject(data)) {
    return false;
  }

  // Check required properties
  if (!isStringArray(data.pinnedNotes)) {
    return false;
  }

  if (!validateFilterState(data.lastFilters)) {
    return false;
  }

  if (!validateSortConfig(data.sortConfig)) {
    return false;
  }

  // Check optional version property
  if (data.version !== undefined && typeof data.version !== "number") {
    return false;
  }

  // Check optional _backups property
  if (data._backups !== undefined) {
    if (!Array.isArray(data._backups)) {
      return false;
    }
    if (!data._backups.every(validateBackup)) {
      return false;
    }
  }

  return true;
}
