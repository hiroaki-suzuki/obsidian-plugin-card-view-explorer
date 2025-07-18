import type { FilterState, PluginData, PluginSettings, SortConfig } from "../types";

/**
 * Validates if an object conforms to the FilterState interface
 */
function validateFilterState(data: any): data is FilterState {
  if (!data || typeof data !== "object") {
    return false;
  }

  // Check array properties
  const arrayProps = ["folders", "tags", "excludeFolders", "excludeTags", "excludeFilenames"];
  for (const prop of arrayProps) {
    if (!Array.isArray(data[prop])) {
      return false;
    }
    // Ensure all array elements are strings
    if (!data[prop].every((item: any) => typeof item === "string")) {
      return false;
    }
  }

  // Check filename property
  if (typeof data.filename !== "string") {
    return false;
  }

  // Check dateRange property
  if (data.dateRange !== null) {
    if (typeof data.dateRange !== "object") {
      return false;
    }
    if (!["within", "after"].includes(data.dateRange.type)) {
      return false;
    }
    // Validate date value - can be Date object or valid date string
    const dateValue = data.dateRange.value;
    if (!(dateValue instanceof Date) && typeof dateValue !== "string") {
      return false;
    }
    // If it's a string, check if it's a valid date string
    if (typeof dateValue === "string" && Number.isNaN(Date.parse(dateValue))) {
      return false;
    }
  }

  return true;
}

/**
 * Validates if an object conforms to the SortConfig interface
 */
function validateSortConfig(data: any): data is SortConfig {
  if (!data || typeof data !== "object") {
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
  if (!data || typeof data !== "object") {
    return false;
  }

  if (typeof data.sortKey !== "string") {
    return false;
  }

  if (typeof data.autoStart !== "boolean") {
    return false;
  }

  if (typeof data.showInSidebar !== "boolean") {
    return false;
  }

  return true;
}

/**
 * Validates if an object conforms to the PluginData interface
 */
export function validatePluginData(data: any): data is PluginData {
  if (!data || typeof data !== "object") {
    return false;
  }

  // Check pinnedNotes array
  if (!Array.isArray(data.pinnedNotes)) {
    return false;
  }
  if (!data.pinnedNotes.every((item: any) => typeof item === "string")) {
    return false;
  }

  // Check lastFilters
  if (!validateFilterState(data.lastFilters)) {
    return false;
  }

  // Check sortConfig
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
    // Validate backup objects according to DataBackup interface
    for (const backup of data._backups) {
      if (!backup || typeof backup !== "object") {
        return false;
      }
      // timestamp should be a number
      if (typeof backup.timestamp !== "number") {
        return false;
      }
      // version should be a number
      if (typeof backup.version !== "number") {
        return false;
      }
      // data should be a valid PluginData object (but skip _backups to avoid recursion)
      if (!backup.data || typeof backup.data !== "object") {
        return false;
      }
      // Validate core PluginData properties without _backups
      if (
        !Array.isArray(backup.data.pinnedNotes) ||
        !backup.data.pinnedNotes.every((item: any) => typeof item === "string") ||
        !validateFilterState(backup.data.lastFilters) ||
        !validateSortConfig(backup.data.sortConfig)
      ) {
        return false;
      }
    }
  }

  return true;
}
