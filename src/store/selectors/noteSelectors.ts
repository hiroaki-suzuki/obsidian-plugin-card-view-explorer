import type { FilterState, NoteData } from "../../types";
import { hasAnyActiveFilter } from "../filters";

/**
 * Selector Helper Functions
 *
 * These pure functions support the main selectors by extracting
 * and processing data from the notes collection.
 */

/**
 * Extract all parent folder paths from a nested folder path
 *
 * For a path like "projects/work/notes", this will return:
 * ["projects", "projects/work"]
 * This enables hierarchical folder filtering.
 *
 * @param {string} folderPath - The full folder path to process
 * @returns {string[]} Array of parent folder paths
 * @example
 * // Returns ["projects", "projects/work"]
 * extractParentFolders("projects/work/notes")
 */
const extractParentFolders = (folderPath: string): string[] => {
  const parts = folderPath.split("/");
  const parentFolders: string[] = [];

  // Start from index 1 to skip the first part (it's not a parent)
  // Build cumulative paths: ["a", "a/b", "a/b/c"]
  for (let i = 1; i < parts.length; i++) {
    parentFolders.push(parts.slice(0, i).join("/"));
  }

  return parentFolders;
};

/**
 * Collect all unique folder paths from notes collection
 *
 * Extracts both direct folder paths and all parent folder paths
 * to support hierarchical folder filtering. For example, a note in
 * "projects/work/notes" will contribute "projects", "projects/work",
 * and "projects/work/notes" to the available folders.
 *
 * @param {NoteData[]} notes - Array of notes to process
 * @returns {Set<string>} Set of unique folder paths
 * @example
 * // For notes with folders ["projects/work/notes", "personal/journal"]
 * // Returns Set with ["projects", "projects/work", "projects/work/notes", "personal", "personal/journal"]
 * collectFoldersFromNotes(notes)
 */
export const collectFoldersFromNotes = (notes: NoteData[]): Set<string> => {
  const folders = new Set<string>();

  for (const note of notes) {
    if (note.folder) {
      // Add the note's direct folder
      folders.add(note.folder);
      // Add all parent folders for hierarchical filtering
      const parentFolders = extractParentFolders(note.folder);
      parentFolders.forEach((folder) => folders.add(folder));
    }
  }

  return folders;
};

/**
 * Collect all unique tags from notes collection
 *
 * Extracts all tags from all notes and returns them as a unique set.
 * This is used to populate tag filter options in the UI.
 *
 * @param {NoteData[]} notes - Array of notes to process
 * @returns {Set<string>} Set of unique tag names
 * @example
 * // For notes with tags [["work", "project"], ["personal", "project"]]
 * // Returns Set with ["work", "project", "personal"]
 * collectTagsFromNotes(notes)
 */
export const collectTagsFromNotes = (notes: NoteData[]): Set<string> => {
  const tags = new Set<string>();

  for (const note of notes) {
    // Add each tag from each note to the set (duplicates automatically handled)
    note.tags.forEach((tag) => tags.add(tag));
  }

  return tags;
};

/**
 * Store State Interface for Selectors
 *
 * This interface defines the subset of store state required by the selectors.
 * It allows selectors to work with just the necessary state properties without
 * depending on the entire store structure.
 */
export interface CardExplorerSelectorState {
  /** Complete collection of all notes */
  notes: NoteData[];
  /** Notes that match the current filter criteria */
  filteredNotes: NoteData[];
  /** Set of note IDs that are currently pinned */
  pinnedNotes: Set<string>;
  /** Current filter configuration */
  filters: FilterState;
}

/**
 * Computed State Selectors
 *
 * These selectors provide computed/derived state from the main store state.
 * They are pure functions that can be used to get processed data without
 * storing it in the main state (avoiding duplication and sync issues).
 *
 * Selectors help maintain the single source of truth principle by deriving
 * data from the store state rather than duplicating it.
 *
 * @example
 * // Usage with Zustand store
 * const availableFolders = cardExplorerSelectors.getAvailableFolders(store.getState())
 */
export const cardExplorerSelectors = {
  /**
   * Get all available folder paths for filter options
   *
   * Returns a sorted array of all unique folder paths found in the notes,
   * including parent folders for hierarchical filtering support.
   * Used to populate folder filter dropdowns in the UI.
   *
   * @param {CardExplorerSelectorState} state - Current store state
   * @returns {string[]} Sorted array of available folder paths
   * @example
   * // Returns ["personal", "projects", "projects/work"]
   * cardExplorerSelectors.getAvailableFolders(state)
   */
  getAvailableFolders: (state: CardExplorerSelectorState): string[] => {
    const folders = collectFoldersFromNotes(state.notes);
    return Array.from(folders).sort(); // Convert Set to sorted Array
  },

  /**
   * Get all available tags for filter options
   *
   * Returns a sorted array of all unique tags found in the notes.
   * Used to populate tag filter dropdowns and suggestions.
   *
   * @param {CardExplorerSelectorState} state - Current store state
   * @returns {string[]} Sorted array of available tag names
   * @example
   * // Returns ["personal", "project", "work"]
   * cardExplorerSelectors.getAvailableTags(state)
   */
  getAvailableTags: (state: CardExplorerSelectorState): string[] => {
    const tags = collectTagsFromNotes(state.notes);
    return Array.from(tags).sort(); // Convert Set to sorted Array
  },

  /**
   * Get the count of currently pinned notes
   *
   * Returns the number of notes that are currently pinned.
   * Used for UI indicators and statistics, such as displaying a badge
   * with the pinned count or enabling/disabling "clear pins" functionality.
   *
   * @param {CardExplorerSelectorState} state - Current store state
   * @returns {number} Number of pinned notes
   * @example
   * // If 3 notes are pinned, returns 3
   * cardExplorerSelectors.getPinnedCount(state)
   */
  getPinnedCount: (state: CardExplorerSelectorState): number => {
    return state.pinnedNotes.size;
  },

  /**
   * Get the count of notes after filtering
   *
   * Returns the number of notes that pass the current filter criteria.
   * Used for displaying result counts, pagination controls, and empty state messages
   * when no notes match the current filters.
   *
   * @param {CardExplorerSelectorState} state - Current store state
   * @returns {number} Number of filtered notes
   * @example
   * // If 42 notes match the current filters, returns 42
   * cardExplorerSelectors.getFilteredCount(state)
   */
  getFilteredCount: (state: CardExplorerSelectorState): number => {
    return state.filteredNotes.length;
  },

  /**
   * Check if any filters are currently active
   *
   * Returns true if any filter criteria is applied, false if showing all notes.
   * Used to show filter status indicators, enable "clear filters" button,
   * and display different UI states based on whether filters are active.
   *
   * @param {CardExplorerSelectorState} state - Current store state
   * @returns {boolean} True if any filters are active
   * @example
   * // If tag filter is set to ["work"] but no other filters are active
   * // Returns true
   * cardExplorerSelectors.hasActiveFilters(state)
   */
  hasActiveFilters: (state: CardExplorerSelectorState): boolean => {
    return hasAnyActiveFilter(state.filters);
  },
};
