/**
 * Date utility functions for formatting and display
 */

/**
 * Format a date for display based on how long ago it was
 *
 * @param date - The date to format
 * @returns A formatted string representing the date
 *
 * Rules:
 * - Less than 24 hours ago: show time (e.g., "14:30")
 * - Less than 7 days ago: show day of week (e.g., "Mon")
 * - Older: show month and day (e.g., "Jan 15")
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
  } else if (diffInHours < 24 * 7) {
    // Show day of week for this week
    return date.toLocaleDateString([], { weekday: "short" });
  } else {
    // Show date for older notes
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  }
};
