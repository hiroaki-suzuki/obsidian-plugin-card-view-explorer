/**
 * Filter configuration for note display in Card View Explorer
 *
 * Supports multiple filter types for comprehensive note filtering:
 * - Folder inclusion filtering with hierarchical matching
 * - Tag inclusion filtering with hierarchical matching
 * - Filename partial matching (case-insensitive)
 * - Date range filtering with two modes
 */
export interface FilterState {
  /**
   * Selected folders to include in results
   *
   * Uses hierarchical matching - selecting "projects" will include
   * notes in "projects/work" and other subfolders.
   * Empty array means all folders are included.
   */
  folders: string[];

  /**
   * Selected tags to filter by
   *
   * Uses hierarchical matching - selecting "project" will include
   * notes tagged with "project/frontend" and other child tags.
   * Empty array means all tags are included.
   */
  tags: string[];

  /**
   * Filename search string for partial matching
   *
   * Performs case-insensitive search within note titles.
   * Empty string means no filename filtering.
   */
  filename: string;

  /**
   * Date range filter configuration
   *
   * Two modes available:
   * - "within": Show notes modified within X days from the filter date
   * - "after": Show notes modified after the specified date
   *
   * Set to null to disable date filtering.
   */
  dateRange: {
    /** Type of date filter to apply */
    type: "within" | "after";
    /**
     * Date value for filtering
     * - For "within" mode: Date object representing X days ago from now
     * - For "after" mode: Date object or ISO string of the cutoff date
     */
    value: Date | string;
  } | null;
}
