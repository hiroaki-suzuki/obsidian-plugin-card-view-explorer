import type { NoteData, SortConfig } from "../../types";
import { MTIME_SORT_KEY } from "../utils";

/**
 * Pure Functions - Sorting Logic
 *
 * These functions handle the complex sorting logic with support for
 * frontmatter fields, fallback values, and different data types.
 */

/**
 * Extract the sortable value from a note for comparison
 *
 * Supports sorting by frontmatter fields with automatic fallback to
 * file modification time if the field doesn't exist or is null.
 * Automatically parses date strings from frontmatter into Date objects.
 *
 * @param {NoteData} note - The note to extract sort value from
 * @param {string} sortKey - The field to sort by ("mtime" for modification time or frontmatter key)
 * @returns {any} The extracted value to use for sorting comparison (Date, string, number, etc.)
 */
export const extractSortValue = (note: NoteData, sortKey: string): any => {
  // Special case: sort by file modification time
  if (sortKey === MTIME_SORT_KEY) {
    return note.lastModified;
  }

  // Try to get value from frontmatter, fallback to modification time
  const frontmatterValue = note.frontmatter?.[sortKey];

  if (frontmatterValue !== null && frontmatterValue !== undefined) {
    // If it's a string that looks like a date, try to parse it
    if (typeof frontmatterValue === "string") {
      const parsedDate = new Date(frontmatterValue);
      // Check if it's a valid date
      if (!Number.isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }
    // Return the original value if it's not a parseable date string
    return frontmatterValue;
  }

  // Fallback to file modification time
  return note.lastModified;
};

/**
 * Normalize values to make them comparable for sorting
 *
 * Converts different data types to comparable formats:
 * - Dates to timestamps (numbers)
 * - Strings to lowercase for case-insensitive sorting
 * - Other values (numbers, booleans, etc.) remain unchanged
 *
 * @param {any} value - The value to normalize for comparison
 * @returns {string|number|boolean|null|undefined} Normalized value suitable for comparison
 */
export const normalizeForComparison = (value: any): any => {
  if (value instanceof Date) return value.getTime(); // Convert to timestamp
  if (typeof value === "string") return value.toLowerCase(); // Case-insensitive
  return value; // Numbers, booleans, etc. remain unchanged
};

/**
 * Compare two normalized values for sorting
 *
 * Returns standard comparison result:
 * -1 if a < b, 1 if a > b, 0 if equal
 *
 * @param {any} a - First value to compare
 * @param {any} b - Second value to compare
 * @returns {number} Comparison result (-1, 0, or 1)
 */
export const compareValues = (a: any, b: any): number => {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
};

/**
 * Create a comparator function for Array.sort()
 *
 * Returns a comparison function that can be used with Array.sort().
 * Handles value extraction, normalization, and sort order application.
 * The returned function maintains immutability by not modifying the original notes.
 *
 * @param {SortConfig} sortConfig - Configuration specifying sort field and order
 * @returns {(a: NoteData, b: NoteData) => number} Comparator function for Array.sort()
 */
export const createSortComparator = (sortConfig: SortConfig) => {
  return (a: NoteData, b: NoteData): number => {
    // Extract and normalize values for comparison
    const aValue = normalizeForComparison(extractSortValue(a, sortConfig.key));
    const bValue = normalizeForComparison(extractSortValue(b, sortConfig.key));

    const comparison = compareValues(aValue, bValue);
    // Apply sort order: desc reverses the comparison result
    return sortConfig.order === "desc" ? -comparison : comparison;
  };
};

/**
 * Separate notes into pinned and unpinned groups
 *
 * Efficiently separates notes based on their pin status using a single pass.
 * This avoids multiple array filtering operations for better performance.
 *
 * @param {NoteData[]} notes - Array of notes to separate
 * @param {Set<string>} pinnedNotes - Set of pinned note file paths
 * @returns {{ pinned: NoteData[], unpinned: NoteData[] }} Object with 'pinned' and 'unpinned' arrays
 */
export const separateNotesByPinStatus = (notes: NoteData[], pinnedNotes: Set<string>) => {
  const pinned: NoteData[] = [];
  const unpinned: NoteData[] = [];

  // Single pass through notes for efficiency
  for (const note of notes) {
    if (pinnedNotes.has(note.path)) {
      pinned.push(note);
    } else {
      unpinned.push(note);
    }
  }

  return { pinned, unpinned };
};

/**
 * Sort notes with pinned notes appearing first
 *
 * Applies the sort configuration to all notes, then ensures pinned notes
 * appear at the top while maintaining their relative sort order within each group.
 * Creates a new array to maintain immutability.
 *
 * @param {NoteData[]} notes - Array of notes to sort
 * @param {SortConfig} sortConfig - Sort configuration (field and order)
 * @param {Set<string>} pinnedNotes - Set of pinned note file paths
 * @returns {NoteData[]} New sorted array with pinned notes first, followed by unpinned notes
 */
export const sortNotes = (
  notes: NoteData[],
  sortConfig: SortConfig,
  pinnedNotes: Set<string>
): NoteData[] => {
  // Create comparator and sort all notes
  const comparator = createSortComparator(sortConfig);
  // Create new array to avoid mutating the original notes array
  const sortedNotes = [...notes].sort(comparator);

  // Separate into pinned and unpinned groups
  const { pinned, unpinned } = separateNotesByPinStatus(sortedNotes, pinnedNotes);

  // Return with pinned notes first, maintaining sort order within each group
  return [...pinned, ...unpinned];
};

/**
 * Toggle the pin state of a note immutably
 *
 * Creates a new Set with the pin state toggled for the specified file.
 * Uses immutable update pattern to avoid side effects.
 * If the note is currently pinned, it will be unpinned, and vice versa.
 *
 * @param {Set<string>} pinnedNotes - Current set of pinned note paths
 * @param {string} filePath - Path of the note to toggle pin state
 * @returns {Set<string>} New Set with updated pin state (original Set is not modified)
 */
export const togglePinState = (pinnedNotes: Set<string>, filePath: string): Set<string> => {
  // Create new Set to avoid mutating the original
  const newPinnedNotes = new Set(pinnedNotes);

  // Toggle: remove if present, add if not present
  if (newPinnedNotes.has(filePath)) {
    newPinnedNotes.delete(filePath);
  } else {
    newPinnedNotes.add(filePath);
  }

  return newPinnedNotes;
};
