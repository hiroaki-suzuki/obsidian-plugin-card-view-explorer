/**
 * Date utility functions for formatting and displaying dates in the Card View Explorer
 * These utilities help standardize date handling across the application
 */

/**
 * Extracts the most appropriate date to display for a note
 *
 * Prioritizes the frontmatter 'updated' field if available and valid,
 * otherwise falls back to the file's lastModified timestamp.
 *
 * @param note - The note data object containing lastModified date and optional frontmatter
 * @returns The most appropriate Date object to display for this note
 */
export const getDisplayDate = (note: {
  lastModified: Date;
  frontmatter?: Record<string, any> | null;
}): Date => {
  // Check if there's an 'updated' field in frontmatter
  const updatedValue = note.frontmatter?.updated;

  if (updatedValue) {
    // If it's already a Date object, use it directly
    if (updatedValue instanceof Date) {
      return updatedValue;
    }

    // If it's a string, try to parse it as a date
    if (typeof updatedValue === "string") {
      const parsedDate = new Date(updatedValue);
      // Verify the parsed date is valid before using it
      if (!Number.isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }
  }

  // Fallback to file modification time if frontmatter date is missing or invalid
  return note.lastModified;
};

/**
 * Formats a date for display with context-aware formatting
 *
 * Uses different formatting based on how recent the date is:
 * - For dates less than 24 hours old: shows time only (e.g., "14:30")
 * - For all other dates: shows full date with year (e.g., "2024/1/15")
 *
 * @param date - The Date object to format
 * @returns A formatted string representing the date, or "Invalid date" if input is invalid
 */
export const formatRelativeDate = (date: Date): string => {
  // Validate the date is a proper Date object with a valid timestamp
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  const now = new Date();
  // Calculate difference in hours between now and the provided date
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 24) {
    // For recent dates (less than 24 hours), show only the time
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else {
    // For older dates, show the full date with year
    return date.toLocaleDateString([], {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
  }
};
