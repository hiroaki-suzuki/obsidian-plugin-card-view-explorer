/**
 * Date utility functions for formatting and displaying dates in the Card View Explorer
 * These utilities help standardize date handling across the application
 */

/**
 * Interface for note frontmatter with optional updated field
 * Supports both string and Date formats for the updated field to handle
 * various frontmatter formats from different note-taking workflows
 */
interface NoteFrontmatter {
  /** Updated date in string format (ISO string) or Date object */
  updated?: string | Date;
  /** Allow any other frontmatter properties */
  [key: string]: unknown;
}

/**
 * Interface for note data used in date calculations
 * Represents the minimal data structure required for date operations
 */
interface NoteData {
  /** File system modification timestamp */
  lastModified: Date;
  /** Optional frontmatter data containing user-defined metadata */
  frontmatter?: NoteFrontmatter | null;
}

/**
 * Constants for date calculations and formatting
 * Centralized constants to avoid magic numbers and improve maintainability
 */
const DATE_CONSTANTS = {
  /** Standard hours in a 24-hour day */
  HOURS_IN_DAY: 24,
  /** Conversion factor from milliseconds to hours (ms * 60 * 60) */
  MS_TO_HOURS: 1000 * 60 * 60,
} as const;

/**
 * Pre-configured date format options for consistent formatting
 * Uses Intl.DateTimeFormat options for locale-aware date formatting
 */
const DATE_FORMAT_OPTIONS = {
  /** Format for showing time only (e.g., "14:30") */
  TIME_ONLY: { hour: "2-digit", minute: "2-digit" } as const,
  /** Format for showing full date (e.g., "2024/1/15") */
  FULL_DATE: {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  } as const,
} as const;

/**
 * Formats a date for display with context-aware formatting
 *
 * Uses different formatting strategies based on recency:
 * - For dates less than 24 hours old: shows time only (e.g., "14:30")
 * - For all other dates: shows full date with year (e.g., "2024/1/15")
 *
 * This provides users with the most relevant information at a glance:
 * recent changes show precise timing, while older changes show the date.
 *
 * @param date - The Date object to format
 * @param referenceTime - The reference time to compare against
 * @returns A formatted string representing the date, or "Invalid date" if input is invalid
 */
export const formatRelativeDate = (date: Date, referenceTime: Date): string => {
  // Guard clause: validate input early to avoid runtime errors
  if (!isValidDate(date)) {
    return "Invalid date";
  }

  if (!isValidDate(referenceTime)) {
    return "Invalid date";
  }

  const diffInHours = (referenceTime.getTime() - date.getTime()) / DATE_CONSTANTS.MS_TO_HOURS;

  // Use time-only format for recent updates (within last 24 hours)
  if (diffInHours < DATE_CONSTANTS.HOURS_IN_DAY) {
    return date.toLocaleTimeString([], DATE_FORMAT_OPTIONS.TIME_ONLY);
  }

  // Use full date format for older updates
  return date.toLocaleDateString([], DATE_FORMAT_OPTIONS.FULL_DATE);
};

/**
 * Extracts the most appropriate date to display for a note
 *
 * Prioritizes the frontmatter 'updated' field if available and valid,
 * otherwise falls back to the file's lastModified timestamp. This allows
 * users to override file system dates with custom update dates in frontmatter.
 *
 * @param note - The note data object containing lastModified date and optional frontmatter
 * @returns The most appropriate Date object to display for this note
 */
export const getDisplayDate = (note: NoteData): Date => {
  // Try to use user-defined updated date from frontmatter first
  const updatedDate = parseUpdatedDate(note.frontmatter?.updated);

  // Fallback to file system modification time using nullish coalescing
  return updatedDate ?? note.lastModified;
};

/**
 * Parses a frontmatter updated value into a Date object if possible
 * Handles both Date objects and string representations gracefully
 *
 * @param updatedValue - The updated value from frontmatter (Date, string, or any other type)
 * @returns A valid Date object or null if parsing fails
 */
const parseUpdatedDate = (updatedValue: unknown): Date | null => {
  // Early return for already valid Date objects
  if (isValidDate(updatedValue)) {
    return updatedValue;
  }

  // Parse string values, but only if they contain actual content
  if (typeof updatedValue === "string" && updatedValue.trim()) {
    const parsedDate = new Date(updatedValue);
    return isValidDate(parsedDate) ? parsedDate : null;
  }

  return null;
};

/**
 * Validates if a value is a valid Date object
 * Uses type predicate to provide type safety for subsequent operations
 *
 * @param date - The value to validate
 * @returns True if the value is a valid Date object with a valid timestamp
 */
const isValidDate = (date: unknown): date is Date => {
  return date instanceof Date && !Number.isNaN(date.getTime());
};
