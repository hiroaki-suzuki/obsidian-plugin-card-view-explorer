import type { TFile } from "obsidian";
import type {
  DateFilterValidation,
  FilterState,
  MarkdownFile,
  NoteData,
  PluginData,
  PluginSettings,
  SortableValue,
  SortConfig,
} from "../types";

/**
 * Type guard to check if a TFile is a markdown file
 */
export function isMarkdownFile(file: TFile): file is MarkdownFile {
  return file.extension === "md";
}

/**
 * Validates if an object conforms to the NoteData interface
 */
export function validateNoteData(data: any): data is NoteData {
  if (!data || typeof data !== "object") {
    return false;
  }

  // Check required properties
  const requiredProps = ["file", "title", "path", "preview", "lastModified"];
  for (const prop of requiredProps) {
    if (!(prop in data)) {
      return false;
    }
  }

  // Validate property types
  // Check if file has the basic TFile properties (path and extension)
  if (
    !data.file ||
    typeof data.file !== "object" ||
    typeof data.file.path !== "string" ||
    typeof data.file.extension !== "string"
  ) {
    return false;
  }

  if (typeof data.title !== "string" || typeof data.path !== "string") {
    return false;
  }

  if (typeof data.preview !== "string") {
    return false;
  }

  if (!(data.lastModified instanceof Date)) {
    return false;
  }

  // Validate optional properties
  if (data.frontmatter !== null && typeof data.frontmatter !== "object") {
    return false;
  }

  if (!Array.isArray(data.tags)) {
    return false;
  }

  if (typeof data.folder !== "string") {
    return false;
  }

  return true;
}

/**
 * Validates if an object conforms to the FilterState interface
 */
export function validateFilterState(data: any): data is FilterState {
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
    if (!(data.dateRange.value instanceof Date)) {
      return false;
    }
  }

  return true;
}

/**
 * Validates if an object conforms to the SortConfig interface
 */
export function validateSortConfig(data: any): data is SortConfig {
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

  return true;
}

/**
 * Validates if a value can be used for sorting
 */
export function isSortableValue(value: any): value is SortableValue {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    value instanceof Date ||
    value === null ||
    value === undefined
  );
}

/**
 * Validates date filter configuration
 */
export function validateDateFilter(dateRange: FilterState["dateRange"]): DateFilterValidation {
  if (dateRange === null) {
    return { isValid: true };
  }

  if (!dateRange || typeof dateRange !== "object") {
    return { isValid: false, error: "Date range must be an object or null" };
  }

  if (!["within", "after"].includes(dateRange.type)) {
    return {
      isValid: false,
      error: 'Date range type must be "within" or "after"',
    };
  }

  if (!(dateRange.value instanceof Date)) {
    return { isValid: false, error: "Date range value must be a Date object" };
  }

  if (Number.isNaN(dateRange.value.getTime())) {
    return { isValid: false, error: "Date range value must be a valid date" };
  }

  return { isValid: true };
}

/**
 * Sanitizes and validates a filename for filtering
 */
export function sanitizeFilename(filename: string): string {
  if (typeof filename !== "string") {
    return "";
  }

  // Remove potentially problematic characters and trim
  return filename.trim().replace(/[<>:"/\\|?*]/g, "");
}

/**
 * Validates if a folder path is valid
 */
export function isValidFolderPath(path: string): boolean {
  if (typeof path !== "string") {
    return false;
  }

  // Empty string is valid (root folder)
  if (path === "") {
    return true;
  }

  // Check for invalid characters (allow forward slashes for folder separators)
  if (/[<>:"\\|?*]/.test(path)) {
    return false;
  }

  return true;
}

/**
 * Validates if a tag is properly formatted
 */
export function isValidTag(tag: string): boolean {
  if (typeof tag !== "string") {
    return false;
  }

  // Tags should not be empty and should not contain spaces or special characters
  return tag.length > 0 && /^[a-zA-Z0-9_-]+$/.test(tag);
}
