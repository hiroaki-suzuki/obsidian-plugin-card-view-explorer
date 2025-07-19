/**
 * Date utility functions for formatting and display
 */

/**
 * Get the display date for a note, preferring frontmatter 'updated' field over file modification time
 *
 * @param note - The note data to get display date from
 * @returns The date to display for this note
 */
export const getDisplayDate = (note: {
  lastModified: Date;
  frontmatter?: Record<string, any> | null;
}): Date => {
  // Check if there's an 'updated' field in frontmatter
  const updatedValue = note.frontmatter?.updated;

  if (updatedValue) {
    // If it's already a Date object, use it
    if (updatedValue instanceof Date) {
      return updatedValue;
    }

    // If it's a string, try to parse it as a date
    if (typeof updatedValue === "string") {
      const parsedDate = new Date(updatedValue);
      if (!Number.isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }
  }

  // Fallback to file modification time
  return note.lastModified;
};

/**
 * Format a date for display with year always shown
 *
 * @param date - The date to format
 * @returns A formatted string representing the date
 *
 * Rules:
 * - Less than 24 hours ago: show time (e.g., "14:30")
 * - All other dates: show full date with year (e.g., "2024/1/15")
 */
export const formatRelativeDate = (date: Date): string => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 24) {
    // Show time for today
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } else {
    // Always show full date with year
    return date.toLocaleDateString([], {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    });
  }
};
