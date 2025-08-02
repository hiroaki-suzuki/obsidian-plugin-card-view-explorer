/**
 * Constants - Replace Magic Numbers with Named Constants
 * These constants improve code readability and maintainability
 */

/** Number of milliseconds in a day (24 hours * 60 minutes * 60 seconds * 1000 milliseconds) */
export const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;

/** Default sort key for notes when no specific frontmatter field is specified */
export const DEFAULT_SORT_KEY = "updated";

/** Default sort order (newest first) */
export const DEFAULT_SORT_ORDER = "desc" as const;

/** Special sort key identifier for file modification time */
export const MTIME_SORT_KEY = "mtime";

/** Maximum number of lines to extract for note preview */
export const PREVIEW_MAX_LINES = 3;
