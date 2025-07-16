/**
 * Sort configuration for note ordering
 * Supports frontmatter fields with fallback to file modification time
 */
export interface SortConfig {
  /** Frontmatter key to sort by, or 'mtime' for file modification time */
  key: string;
  /** Sort order - descending by default */
  order: "asc" | "desc";
}
