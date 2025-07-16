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
 */
export interface CardExplorerSelectorState {
  notes: NoteData[];
  filteredNotes: NoteData[];
  pinnedNotes: Set<string>;
  filters: FilterState;
}

/**
 * Computed State Selectors
 *
 * These selectors provide computed/derived state from the main store state.
 * They are pure functions that can be used to get processed data without
 * storing it in the main state (avoiding duplication and sync issues).
 *
 * Usage: cardExplorerSelectors.getAvailableFolders(store.getState())
 */
export const cardExplorerSelectors = {
  /**
   * Get all available folder paths for filter options
   *
   * Returns a sorted array of all unique folder paths found in the notes,
   * including parent folders for hierarchical filtering support.
   *
   * @param {CardExplorerSelectorState} state - Current store state
   * @returns {string[]} Sorted array of available folder paths
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
   */
  getAvailableTags: (state: CardExplorerSelectorState): string[] => {
    const tags = collectTagsFromNotes(state.notes);
    return Array.from(tags).sort(); // Convert Set to sorted Array
  },

  /**
   * Get the count of currently pinned notes
   *
   * Returns the number of notes that are currently pinned.
   * Used for UI indicators and statistics.
   *
   * @param {CardExplorerSelectorState} state - Current store state
   * @returns {number} Number of pinned notes
   */
  getPinnedCount: (state: CardExplorerSelectorState): number => {
    return state.pinnedNotes.size;
  },

  /**
   * Get the count of notes after filtering
   *
   * Returns the number of notes that pass the current filter criteria.
   * Used for displaying result counts and pagination.
   *
   * @param {CardExplorerSelectorState} state - Current store state
   * @returns {number} Number of filtered notes
   */
  getFilteredCount: (state: CardExplorerSelectorState): number => {
    return state.filteredNotes.length;
  },

  /**
   * Check if any filters are currently active
   *
   * Returns true if any filter criteria is applied, false if showing all notes.
   * Used to show filter status indicators and enable "clear filters" button.
   *
   * @param {CardExplorerSelectorState} state - Current store state
   * @returns {boolean} True if any filters are active
   */
  hasActiveFilters: (state: CardExplorerSelectorState): boolean => {
    return hasAnyActiveFilter(state.filters);
  },
};
