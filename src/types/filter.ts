/**
 * Filter configuration for note display
 * Supports multiple filter types and exclusions
 */
export interface FilterState {
  /** Selected folders to include (empty array = all folders) */
  folders: string[];
  /** Selected tags to filter by (empty array = all tags) */
  tags: string[];
  /** Filename search string (partial matching) */
  filename: string;
  /** Date range filter configuration */
  dateRange: {
    type: "within" | "after";
    value: Date;
  } | null;
  /** Folders to exclude from results */
  excludeFolders: string[];
  /** Tags to exclude from results */
  excludeTags: string[];
  /** Filename patterns to exclude */
  excludeFilenames: string[];
}

/** Type for date filter validation */
export interface DateFilterValidation {
  isValid: boolean;
  error?: string;
}
