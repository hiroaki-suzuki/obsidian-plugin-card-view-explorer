/**
 * Sort configuration for note ordering in Card View Explorer
 *
 * This interface defines how notes should be sorted in the card view.
 * It supports sorting by frontmatter fields with automatic fallback to
 * file modification time if the specified field doesn't exist in a note.
 */
export interface SortConfig {
  /**
   * Key to sort by - can be:
   * - 'mtime' for file modification time (special case)
   * - Any frontmatter field name (e.g., 'title', 'date', 'priority')
   *
   * If a note doesn't have the specified frontmatter field,
   * sorting will automatically fall back to file modification time.
   */
  key: string;

  /**
   * Sort direction:
   * - 'asc': ascending order (A→Z, oldest→newest, smallest→largest)
   * - 'desc': descending order (Z→A, newest→oldest, largest→smallest)
   *
   * Default is 'desc' in the application.
   */
  order: "asc" | "desc";
}
