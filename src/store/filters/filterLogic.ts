import type { FilterState, NoteData } from "../../types";
import { MILLISECONDS_PER_DAY } from "../utils";

/**
 * Pure Functions - Filter Logic
 *
 * These functions implement the Extract Method pattern to break down
 * complex filtering logic into small, testable, pure functions.
 * Each function has a single responsibility and no side effects.
 */

/**
 * Check if note matches folder inclusion criteria
 *
 * Uses startsWith matching to support hierarchical folder filtering.
 * For example, filtering by "projects" will include notes in "projects/work".
 *
 * @param {NoteData} note - The note to check
 * @param {string[]} folders - Array of folder paths to include
 * @returns {boolean} True if note matches criteria or no folders specified
 */
export const matchesFolderCriteria = (note: NoteData, folders: string[]): boolean => {
  // No folder filter means include all notes
  if (folders.length === 0) return true;

  const noteFolder = note.folder || "";
  // Check if note's folder starts with any of the filter folders
  return folders.some((folder) => noteFolder.startsWith(folder));
};

/**
 * Check if note should be excluded by folder criteria
 *
 * Uses startsWith matching for hierarchical exclusion.
 * For example, excluding "archive" will exclude "archive/old" as well.
 *
 * @param {NoteData} note - The note to check
 * @param {string[]} excludeFolders - Array of folder paths to exclude
 * @returns {boolean} True if note should be excluded
 */
export const isExcludedByFolder = (note: NoteData, excludeFolders: string[]): boolean => {
  // No exclusion filter means don't exclude any notes
  if (excludeFolders.length === 0) return false;

  const noteFolder = note.folder || "";
  // Check if note's folder starts with any excluded folder
  return excludeFolders.some((folder) => noteFolder.startsWith(folder));
};

/**
 * Check if note matches tag inclusion criteria
 *
 * Uses exact tag matching. Note must have at least one of the specified tags.
 *
 * @param {NoteData} note - The note to check
 * @param {string[]} tags - Array of tags to filter by
 * @returns {boolean} True if note has matching tags or no tags specified
 */
export const matchesTagCriteria = (note: NoteData, tags: string[]): boolean => {
  // No tag filter means include all notes
  if (tags.length === 0) return true;

  // Check if note has any of the filter tags
  return tags.some((filterTag) => note.tags.includes(filterTag));
};

/**
 * Check if note should be excluded by tag criteria
 *
 * Uses exact tag matching. Note is excluded if it has any excluded tag.
 *
 * @param {NoteData} note - The note to check
 * @param {string[]} excludeTags - Array of tags to exclude
 * @returns {boolean} True if note should be excluded
 */
export const isExcludedByTag = (note: NoteData, excludeTags: string[]): boolean => {
  // No exclusion filter means don't exclude any notes
  if (excludeTags.length === 0) return false;

  // Check if note has any excluded tags
  return excludeTags.some((excludeTag) => note.tags.includes(excludeTag));
};

/**
 * Check if note matches filename search criteria
 *
 * Performs case-insensitive partial matching on note title.
 * Empty search term matches all notes.
 *
 * @param {NoteData} note - The note to check
 * @param {string} filename - Search term for filename filtering
 * @returns {boolean} True if note title contains search term or search is empty
 */
export const matchesFilenameCriteria = (note: NoteData, filename: string): boolean => {
  const searchTerm = filename.trim();
  // Empty search term means include all notes
  if (!searchTerm) return true;

  // Case-insensitive partial matching
  return note.title.toLowerCase().includes(searchTerm.toLowerCase());
};

/**
 * Check if note should be excluded by filename criteria
 *
 * Performs case-insensitive partial matching for exclusion patterns.
 * Note is excluded if title contains any of the exclusion patterns.
 *
 * @param {NoteData} note - The note to check
 * @param {string[]} excludeFilenames - Array of filename patterns to exclude
 * @returns {boolean} True if note should be excluded
 */
export const isExcludedByFilename = (note: NoteData, excludeFilenames: string[]): boolean => {
  // No exclusion patterns means don't exclude any notes
  if (excludeFilenames.length === 0) return false;

  const noteTitle = note.title.toLowerCase();
  // Check if note title contains any exclusion pattern
  return excludeFilenames.some((pattern) => noteTitle.includes(pattern.toLowerCase()));
};

/**
 * Calculate the difference in days between two dates
 *
 * Calculates the number of full days between two dates.
 * Positive result means fromDate is later than toDate.
 *
 * @param {Date} fromDate - The later date (e.g., current time)
 * @param {Date} toDate - The earlier date (e.g., note modification time)
 * @returns {number} Number of full days between the dates
 */
export const calculateDaysDifference = (fromDate: Date, toDate: Date): number => {
  return Math.floor((fromDate.getTime() - toDate.getTime()) / MILLISECONDS_PER_DAY);
};

/**
 * Check if note matches date range filtering criteria
 *
 * Supports two types of date filtering:
 * - "within": Note was modified within X days from the filter date
 * - "after": Note was modified after the filter date
 *
 * @param {NoteData} note - The note to check
 * @param {FilterState["dateRange"]} dateRange - Date range filter configuration or null
 * @returns {boolean} True if note matches date criteria or no date filter specified
 */
export const matchesDateRangeCriteria = (
  note: NoteData,
  dateRange: FilterState["dateRange"]
): boolean => {
  // No date filter means include all notes
  if (!dateRange) return true;

  const noteDate = note.lastModified;
  const filterDate = dateRange.value instanceof Date ? dateRange.value : new Date(dateRange.value);
  const now = new Date();

  if (dateRange.type === "within") {
    // Check if note was modified within the specified time range
    // Calculate how many days ago the note was last modified
    const noteDaysDiff = calculateDaysDifference(now, noteDate);
    // Calculate how many days ago the filter date was set
    const filterDaysDiff = calculateDaysDifference(now, filterDate);
    // Note passes filter if it was modified more recently than (or equal to) the filter date
    // Example: If filter is "within 3 days" and note was modified 2 days ago, it passes
    return noteDaysDiff <= filterDaysDiff;
  }

  if (dateRange.type === "after") {
    // Check if note was modified after the specified date
    return noteDate >= filterDate;
  }

  return true;
};

/**
 * Check if a note passes all active filter criteria
 *
 * This is the main filter orchestrator that combines all individual
 * filter checks. A note must pass ALL criteria to be included.
 * Uses short-circuit evaluation for performance optimization.
 *
 * @param {NoteData} note - The note to evaluate
 * @param {FilterState} filters - Complete filter configuration
 * @returns {boolean} True if note passes all active filters
 */
export const notePassesFilters = (note: NoteData, filters: FilterState): boolean => {
  return (
    matchesFolderCriteria(note, filters.folders) && // Must be in included folders
    !isExcludedByFolder(note, filters.excludeFolders) && // Must not be in excluded folders
    matchesTagCriteria(note, filters.tags) && // Must have required tags
    !isExcludedByTag(note, filters.excludeTags) && // Must not have excluded tags
    matchesFilenameCriteria(note, filters.filename) && // Must match filename search
    !isExcludedByFilename(note, filters.excludeFilenames) && // Must not match excluded patterns
    matchesDateRangeCriteria(note, filters.dateRange) // Must match date criteria
  );
};

/**
 * Apply all active filters to a collection of notes
 *
 * Filters the input array to only include notes that pass all
 * active filter criteria. Returns a new array without modifying the original.
 *
 * @param {NoteData[]} notes - Array of notes to filter
 * @param {FilterState} filters - Filter configuration to apply
 * @returns {NoteData[]} New array containing only notes that pass filters
 */
export const applyFilters = (notes: NoteData[], filters: FilterState): NoteData[] => {
  return notes.filter((note) => notePassesFilters(note, filters));
};

/**
 * Check if any filter criteria is currently active
 *
 * Determines whether any filters are applied by checking all filter
 * properties for non-empty/non-null values. Used to show filter
 * status in the UI and enable "clear filters" functionality.
 *
 * @param {FilterState} filters - Current filter configuration
 * @returns {boolean} True if any filter is active
 */
export const hasAnyActiveFilter = (filters: FilterState): boolean => {
  return (
    filters.folders.length > 0 || // Folder inclusion filters
    filters.tags.length > 0 || // Tag inclusion filters
    filters.filename.trim() !== "" || // Filename search
    filters.dateRange !== null || // Date range filter
    filters.excludeFolders.length > 0 || // Folder exclusion filters
    filters.excludeTags.length > 0 || // Tag exclusion filters
    filters.excludeFilenames.length > 0 // Filename exclusion filters
  );
};
