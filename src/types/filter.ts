/**
 * Filter configuration for note display in Card View Explorer
 * Supports multiple filter types and exclusions for comprehensive note filtering
 */
export interface FilterState {
  /**
   * Selected folders to include in results
   * Empty array means all folders are included
   */
  folders: string[];

  /**
   * Selected tags to filter by
   * Empty array means all tags are included
   */
  tags: string[];

  /**
   * Filename search string for partial matching
   * Case-insensitive search within filenames
   */
  filename: string;

  /**
   * Date range filter configuration
   * - "within": Show notes modified within X days
   * - "after": Show notes modified after specific date
   * - null: No date filtering applied
   */
  dateRange: {
    /** Type of date filter to apply */
    type: "within" | "after";
    /**
     * Date value for filtering
     * - For "within": number of days as string
     * - For "after": Date object or ISO string
     */
    value: Date | string;
  } | null;

  /**
   * Folders to exclude from results
   * Takes precedence over included folders
   */
  excludeFolders: string[];

  /**
   * Tags to exclude from results
   * Takes precedence over included tags
   */
  excludeTags: string[];

  /**
   * Filename patterns to exclude
   * Supports partial matching for exclusion
   */
  excludeFilenames: string[];
}

/**
 * Validation result for date filter inputs
 * Used to validate user input for date filters
 */
export interface DateFilterValidation {
  /** Whether the date filter input is valid */
  isValid: boolean;
  /** Optional error message when validation fails */
  error?: string;
}
