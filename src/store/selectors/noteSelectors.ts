import type { FilterState, NoteData } from "../../types";
import { hasAnyActiveFilter } from "../filters";

/**
 * Selector Helper Functions
 *
 * These pure functions support the main selectors by extracting
 * and processing data from the notes collection.
 */

/**
 * State interface for note selectors containing the minimum required state
 * for selector operations. This ensures selectors remain pure and testable
 * by only depending on the specific state slices they need.
 */
export interface CardExplorerSelectorState {
  /** All notes loaded from the vault */
  notes: NoteData[];
  /** Notes after applying filters and sorting */
  filteredNotes: NoteData[];
  /** Set of note paths that are pinned by the user */
  pinnedNotes: Set<string>;
  /** Current filter configuration */
  filters: FilterState;
}

/**
 * Collection of pure selector functions for deriving computed state from the store.
 * These selectors enable efficient data derivation and support reactive UI updates
 * without triggering unnecessary re-renders.
 */
export const cardExplorerSelectors = {
  /**
   * Extracts all unique folder paths from the notes collection, including parent folders.
   * This enables hierarchical folder filtering where selecting a parent folder includes all child folders.
   *
   * @param state - The current state containing notes data
   * @returns Sorted array of unique folder paths
   */
  getAvailableFolders: (state: CardExplorerSelectorState): string[] => {
    const folders = collectFoldersFromNotes(state.notes);
    return Array.from(folders).sort(); // Convert Set to sorted Array for consistent UI ordering
  },

  /**
   * Extracts all unique tags from the notes collection for filter options.
   *
   * @param state - The current state containing notes data
   * @returns Sorted array of unique tag names
   */
  getAvailableTags: (state: CardExplorerSelectorState): string[] => {
    const tags = collectTagsFromNotes(state.notes);
    return Array.from(tags).sort(); // Convert Set to sorted Array for consistent UI ordering
  },

  /**
   * Returns the count of currently pinned notes for UI display.
   *
   * @param state - The current state containing pinned notes set
   * @returns Number of pinned notes
   */
  getPinnedCount: (state: CardExplorerSelectorState): number => {
    return state.pinnedNotes.size;
  },

  /**
   * Returns the count of notes after filtering for UI display and statistics.
   *
   * @param state - The current state containing filtered notes
   * @returns Number of filtered notes
   */
  getFilteredCount: (state: CardExplorerSelectorState): number => {
    return state.filteredNotes.length;
  },

  /**
   * Determines if any filters are currently active to control UI state and display.
   *
   * @param state - The current state containing filter configuration
   * @returns True if any filters are active, false otherwise
   */
  hasActiveFilters: (state: CardExplorerSelectorState): boolean => {
    return hasAnyActiveFilter(state.filters);
  },
};

/**
 * Collects all unique folder paths from notes, including hierarchical parent folders.
 * This supports hierarchical filtering where selecting "projects" includes "projects/web".
 *
 * @param notes - Array of note data to extract folders from
 * @returns Set of unique folder paths including parent folders
 */
const collectFoldersFromNotes = (notes: NoteData[]): Set<string> => {
  const folders = new Set<string>();

  for (const note of notes) {
    if (note.folder) {
      folders.add(note.folder);
      // Include all parent folders for hierarchical filtering support
      const parentFolders = extractParentFolders(note.folder);
      parentFolders.forEach((folder) => folders.add(folder));
    }
  }

  return folders;
};

/**
 * Extracts all parent folder paths from a given folder path.
 * For "projects/web/frontend", returns ["projects", "projects/web"].
 * This enables hierarchical folder filtering in the UI.
 *
 * @param folderPath - Full folder path to extract parents from
 * @returns Array of parent folder paths from root to immediate parent
 */
const extractParentFolders = (folderPath: string): string[] => {
  const parts = folderPath.split("/");
  const parentFolders: string[] = [];

  // Build parent paths incrementally: projects -> projects/web -> projects/web/frontend
  for (let i = 1; i < parts.length; i++) {
    parentFolders.push(parts.slice(0, i).join("/"));
  }

  return parentFolders;
};

/**
 * Collects all unique tags from the notes collection for filter options.
 * Tags are extracted from both frontmatter and inline tag references.
 *
 * @param notes - Array of note data to extract tags from
 * @returns Set of unique tag names
 */
const collectTagsFromNotes = (notes: NoteData[]): Set<string> => {
  const tags = new Set<string>();

  for (const note of notes) {
    note.tags.forEach((tag) => tags.add(tag));
  }

  return tags;
};
