import type { App, CachedMetadata, TFile } from "obsidian";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type {
  ContentPreview,
  FilterState,
  MarkdownFile,
  NoteData,
  NoteMetadata,
  SortConfig,
} from "../types";

/**
 * Constants - Replace Magic Numbers with Named Constants
 * These constants improve code readability and maintainability
 */

/** Number of milliseconds in a day (24 hours * 60 minutes * 60 seconds * 1000 milliseconds) */
const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;

/** Default sort key for notes when no specific frontmatter field is specified */
const DEFAULT_SORT_KEY = "updated";

/** Default sort order (newest first) */
const DEFAULT_SORT_ORDER = "desc" as const;

/** Special sort key identifier for file modification time */
const MTIME_SORT_KEY = "mtime";

/** Maximum number of lines to extract for note preview */
const PREVIEW_MAX_LINES = 3;

/**
 * Card Explorer Store State Interface
 *
 * Defines the complete state structure and actions for Card Explorer.
 * This interface clearly separates data, UI state, and actions.
 *
 * @interface CardExplorerState
 */
export interface CardExplorerState {
  // Core Data
  /** All notes loaded from Obsidian vault */
  notes: NoteData[];
  /** Notes after applying current filters and sorting (computed state) */
  filteredNotes: NoteData[];
  /** Set of file paths for notes that are pinned to the top */
  pinnedNotes: Set<string>;

  // UI State
  /** Current active filter configuration */
  filters: FilterState;
  /** Current sorting configuration (field and order) */
  sortConfig: SortConfig;
  /** Loading state for async operations (note loading, etc.) */
  isLoading: boolean;
  /** Error message to display to user, null if no error */
  error: string | null;

  // Actions
  /**
   * Set the complete notes array and recompute filtered results
   * @param notes - Array of note data from Obsidian
   */
  setNotes: (notes: NoteData[]) => void;
  /**
   * Update filter configuration (partial update supported)
   * @param filters - Partial filter state to merge with current filters
   */
  updateFilters: (filters: Partial<FilterState>) => void;
  /**
   * Update sort configuration and recompute results
   * @param config - New sort configuration
   */
  updateSortConfig: (config: SortConfig) => void;
  /**
   * Toggle pin state for a specific note
   * @param filePath - Full path to the note file
   */
  togglePin: (filePath: string) => void;
  /**
   * Set loading state for UI feedback
   * @param loading - Whether the store is in loading state
   */
  setLoading: (loading: boolean) => void;
  /**
   * Set error state for user feedback
   * @param error - Error message or null to clear error
   */
  setError: (error: string | null) => void;
  /**
   * Refresh notes from Obsidian APIs
   * @param app - Obsidian App instance for API access
   */
  refreshNotes: (app: App) => Promise<void>;
  /** Clear all active filters and reset to default state */
  clearFilters: () => void;
  /** Reset entire store to initial state */
  reset: () => void;
}

/**
 * Factory Functions for Default Configurations
 * These functions create fresh instances to avoid shared object references
 */

/**
 * Create default filter state with all filters disabled
 *
 * Returns a fresh FilterState object with empty arrays and null values,
 * ensuring no filters are active by default.
 *
 * @returns {FilterState} Fresh default filter configuration
 */
const createDefaultFilters = (): FilterState => ({
  folders: [], // No folder filtering
  tags: [], // No tag filtering
  filename: "", // No filename search
  dateRange: null, // No date filtering
  excludeFolders: [], // No folder exclusions
  excludeTags: [], // No tag exclusions
  excludeFilenames: [], // No filename exclusions
});

/**
 * Create default sort configuration
 *
 * Returns a fresh SortConfig with default sorting by update time
 * in descending order (newest first).
 *
 * @returns {SortConfig} Fresh default sort configuration
 */
const createDefaultSortConfig = (): SortConfig => ({
  key: DEFAULT_SORT_KEY, // Sort by "updated" field
  order: DEFAULT_SORT_ORDER, // Descending order (newest first)
});

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
const matchesFolderCriteria = (note: NoteData, folders: string[]): boolean => {
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
const isExcludedByFolder = (note: NoteData, excludeFolders: string[]): boolean => {
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
const matchesTagCriteria = (note: NoteData, tags: string[]): boolean => {
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
const isExcludedByTag = (note: NoteData, excludeTags: string[]): boolean => {
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
const matchesFilenameCriteria = (note: NoteData, filename: string): boolean => {
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
const isExcludedByFilename = (note: NoteData, excludeFilenames: string[]): boolean => {
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
const calculateDaysDifference = (fromDate: Date, toDate: Date): number => {
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
const matchesDateRangeCriteria = (note: NoteData, dateRange: FilterState["dateRange"]): boolean => {
  // No date filter means include all notes
  if (!dateRange) return true;

  const noteDate = note.lastModified;
  const filterDate = dateRange.value;
  const now = new Date();

  if (dateRange.type === "within") {
    // Check if note was modified within the specified time range
    const noteDaysDiff = calculateDaysDifference(now, noteDate);
    const filterDaysDiff = calculateDaysDifference(now, filterDate);
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
const notePassesFilters = (note: NoteData, filters: FilterState): boolean => {
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
const applyFilters = (notes: NoteData[], filters: FilterState): NoteData[] => {
  return notes.filter((note) => notePassesFilters(note, filters));
};

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
 *
 * @param {NoteData} note - The note to extract sort value from
 * @param {string} sortKey - The field to sort by ("mtime" for modification time)
 * @returns {any} The value to use for sorting comparison
 */
const extractSortValue = (note: NoteData, sortKey: string): any => {
  // Special case: sort by file modification time
  if (sortKey === MTIME_SORT_KEY) {
    return note.lastModified;
  }

  // Try to get value from frontmatter, fallback to modification time
  const frontmatterValue = note.frontmatter?.[sortKey];
  return frontmatterValue ?? note.lastModified; // Nullish coalescing for fallback
};

/**
 * Normalize values to make them comparable for sorting
 *
 * Converts different data types to comparable formats:
 * - Dates to timestamps (numbers)
 * - Strings to lowercase for case-insensitive sorting
 * - Other values remain unchanged
 *
 * @param {any} value - The value to normalize
 * @returns {any} Normalized value suitable for comparison
 */
const normalizeForComparison = (value: any): any => {
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
const compareValues = (a: any, b: any): number => {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
};

/**
 * Create a comparator function for Array.sort()
 *
 * Returns a comparison function that can be used with Array.sort().
 * Handles value extraction, normalization, and sort order application.
 *
 * @param {SortConfig} sortConfig - Configuration specifying field and order
 * @returns {Function} Comparator function for Array.sort()
 */
const createSortComparator = (sortConfig: SortConfig) => {
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
 * @returns {Object} Object with 'pinned' and 'unpinned' arrays
 */
const separateNotesByPinStatus = (notes: NoteData[], pinnedNotes: Set<string>) => {
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
 * appear at the top while maintaining their relative sort order.
 *
 * @param {NoteData[]} notes - Array of notes to sort
 * @param {SortConfig} sortConfig - Sort configuration (field and order)
 * @param {Set<string>} pinnedNotes - Set of pinned note file paths
 * @returns {NoteData[]} New sorted array with pinned notes first
 */
const sortNotes = (
  notes: NoteData[],
  sortConfig: SortConfig,
  pinnedNotes: Set<string>
): NoteData[] => {
  // Create comparator and sort all notes
  const comparator = createSortComparator(sortConfig);
  const sortedNotes = [...notes].sort(comparator); // Create new array to avoid mutation

  // Separate into pinned and unpinned groups
  const { pinned, unpinned } = separateNotesByPinStatus(sortedNotes, pinnedNotes);

  // Return with pinned notes first, maintaining sort order within each group
  return [...pinned, ...unpinned];
};

/**
 * Apply filters and sorting to notes in the correct order
 *
 * This is the main orchestrator function that applies the complete
 * transformation pipeline: filtering → sorting → pinning organization.
 *
 * @param {NoteData[]} notes - Original array of all notes
 * @param {FilterState} filters - Filter configuration to apply
 * @param {SortConfig} sortConfig - Sort configuration to apply
 * @param {Set<string>} pinnedNotes - Set of pinned note file paths
 * @returns {NoteData[]} Final filtered and sorted array
 */
const recomputeFilteredNotes = (
  notes: NoteData[],
  filters: FilterState,
  sortConfig: SortConfig,
  pinnedNotes: Set<string>
): NoteData[] => {
  // Step 1: Apply filters to reduce the dataset
  const filtered = applyFilters(notes, filters);
  // Step 2: Sort and organize with pinned notes first
  return sortNotes(filtered, sortConfig, pinnedNotes);
};

/**
 * Toggle the pin state of a note immutably
 *
 * Creates a new Set with the pin state toggled for the specified file.
 * Uses immutable update pattern to avoid side effects.
 *
 * @param {Set<string>} pinnedNotes - Current set of pinned note paths
 * @param {string} filePath - Path of the note to toggle
 * @returns {Set<string>} New Set with updated pin state
 */
const togglePinState = (pinnedNotes: Set<string>, filePath: string): Set<string> => {
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

/**
 * Data Processing Functions - Note Loading and Transformation
 *
 * These functions handle loading notes from Obsidian APIs and transforming
 * them into the NoteData format used by the Card Explorer.
 */

/**
 * Check if a file is a markdown file
 *
 * Type guard function to ensure we only process markdown files.
 *
 * @param {TFile} file - File to check
 * @returns {file is MarkdownFile} True if file is a markdown file
 */
const isMarkdownFile = (file: TFile): file is MarkdownFile => {
  return file.extension === "md";
};

/**
 * Extract note metadata from Obsidian's metadata cache
 *
 * Safely extracts frontmatter and tags from a note using Obsidian's
 * metadata cache API. Handles cases where metadata is not available.
 *
 * @param {App} app - Obsidian App instance
 * @param {TFile} file - File to extract metadata from
 * @returns {NoteMetadata} Extracted metadata or defaults
 */
const extractNoteMetadata = (app: App, file: TFile): NoteMetadata => {
  try {
    const cached = app.metadataCache.getFileCache(file);

    // Extract frontmatter
    const frontmatter = cached?.frontmatter || null;

    // Extract tags from multiple sources
    const tags: string[] = [];

    // Tags from frontmatter
    if (frontmatter?.tags) {
      if (Array.isArray(frontmatter.tags)) {
        tags.push(...frontmatter.tags.map((tag) => String(tag)));
      } else {
        tags.push(String(frontmatter.tags));
      }
    }

    // Tags from content (hashtags)
    if (cached?.tags) {
      cached.tags.forEach((tagCache) => {
        const tag = tagCache.tag.startsWith("#") ? tagCache.tag.slice(1) : tagCache.tag;
        if (!tags.includes(tag)) {
          tags.push(tag);
        }
      });
    }

    return {
      frontmatter,
      tags,
      cached,
    };
  } catch (error) {
    console.warn(`Failed to extract metadata for ${file.path}:`, error);
    return {
      frontmatter: null,
      tags: [],
      cached: null,
    };
  }
};

/**
 * Extract content preview from a note
 *
 * Reads the note content and extracts the first few lines for preview.
 * Uses Obsidian's vault.cachedRead() for efficient content access.
 *
 * @param {App} app - Obsidian App instance
 * @param {TFile} file - File to extract content from
 * @returns {Promise<ContentPreview>} Preview content or error info
 */
const extractContentPreview = async (app: App, file: TFile): Promise<ContentPreview> => {
  try {
    const content = await app.vault.cachedRead(file);

    // Split content into lines and take first N lines
    const lines = content.split("\n");
    const previewLines = lines.slice(0, PREVIEW_MAX_LINES);

    // Join lines and trim whitespace
    const preview = previewLines.join("\n").trim();

    return {
      preview: preview || file.basename, // Fallback to filename if no content
      success: true,
    };
  } catch (error) {
    console.warn(`Failed to extract content preview for ${file.path}:`, error);
    return {
      preview: file.basename, // Fallback to filename
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Transform a TFile into NoteData
 *
 * Converts an Obsidian TFile into the NoteData format used by Card Explorer.
 * Extracts metadata, content preview, and other required information.
 *
 * @param {App} app - Obsidian App instance
 * @param {TFile} file - File to transform
 * @returns {Promise<NoteData>} Transformed note data
 */
const transformFileToNoteData = async (app: App, file: TFile): Promise<NoteData> => {
  // Extract metadata (frontmatter and tags)
  const metadata = extractNoteMetadata(app, file);

  // Extract content preview
  const contentPreview = await extractContentPreview(app, file);

  // Get folder path (parent folder or empty string for root)
  const folder = file.parent?.path || "";

  // Create NoteData object
  const noteData: NoteData = {
    file,
    title: file.basename, // Filename without extension
    path: file.path, // Full path
    preview: contentPreview.preview,
    lastModified: new Date(file.stat.mtime), // File modification time
    frontmatter: metadata.frontmatter,
    tags: metadata.tags,
    folder,
  };

  return noteData;
};

/**
 * Load all markdown notes from Obsidian vault
 *
 * Queries Obsidian's vault for all markdown files and transforms them
 * into NoteData objects. Handles errors gracefully and filters out
 * non-markdown files.
 *
 * @param {App} app - Obsidian App instance
 * @returns {Promise<NoteData[]>} Array of transformed note data
 */
const loadNotesFromVault = async (app: App): Promise<NoteData[]> => {
  try {
    // Get all files from vault
    const allFiles = app.vault.getMarkdownFiles();

    // Filter to only markdown files (should already be filtered by getMarkdownFiles)
    const markdownFiles = allFiles.filter(isMarkdownFile);

    // Transform each file to NoteData
    const noteDataPromises = markdownFiles.map((file) => transformFileToNoteData(app, file));

    // Wait for all transformations to complete
    const noteDataResults = await Promise.allSettled(noteDataPromises);

    // Extract successful results and log failures
    const notes: NoteData[] = [];
    noteDataResults.forEach((result, index) => {
      if (result.status === "fulfilled") {
        notes.push(result.value);
      } else {
        console.warn(`Failed to process note ${markdownFiles[index].path}:`, result.reason);
      }
    });

    return notes;
  } catch (error) {
    console.error("Failed to load notes from vault:", error);
    throw new Error(
      `Failed to load notes: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
};

/**
 * Card Explorer Zustand Store
 *
 * Main state management store for the Card Explorer plugin.
 * Uses Zustand with subscribeWithSelector middleware for reactive updates.
 *
 * Key Features:
 * - Automatic recomputation of filtered notes when state changes
 * - Immutable updates to prevent side effects
 * - Optimized filtering and sorting pipeline
 * - Support for pinned notes that always appear first
 *
 * @returns {CardExplorerState} Store with state and actions
 */
export const useCardExplorerStore = create<CardExplorerState>()(
  subscribeWithSelector((set, get) => ({
    // Initial State - All empty/default values
    notes: [], // No notes loaded initially
    filteredNotes: [], // No filtered results initially
    pinnedNotes: new Set<string>(), // No pinned notes initially
    filters: createDefaultFilters(), // Default filter state (all disabled)
    sortConfig: createDefaultSortConfig(), // Default sort config (updated desc)
    isLoading: false, // Not loading initially
    error: null, // No error initially

    // Actions - State mutation functions with automatic recomputation

    /**
     * Set the complete notes array from Obsidian
     * Automatically recomputes filtered results with current filters/sort
     */
    setNotes: (notes: NoteData[]) => {
      set({ notes }); // Update raw notes array
      const state = get(); // Get current state for filters/sort
      // Recompute filtered results with new notes
      const filteredNotes = recomputeFilteredNotes(
        notes,
        state.filters,
        state.sortConfig,
        state.pinnedNotes
      );
      set({ filteredNotes }); // Update computed results
    },

    /**
     * Update filter configuration with partial updates
     * Merges new filters with existing ones and recomputes results
     */
    updateFilters: (newFilters: Partial<FilterState>) => {
      const state = get();
      // Merge new filters with existing filters (partial update)
      const updatedFilters = { ...state.filters, ...newFilters };
      set({ filters: updatedFilters });

      // Recompute filtered results with updated filters
      const filteredNotes = recomputeFilteredNotes(
        state.notes,
        updatedFilters,
        state.sortConfig,
        state.pinnedNotes
      );
      set({ filteredNotes });
    },

    /**
     * Update sort configuration and recompute results
     * Replaces entire sort config (not partial like filters)
     */
    updateSortConfig: (config: SortConfig) => {
      set({ sortConfig: config });

      const state = get();
      // Recompute filtered results with new sort configuration
      const filteredNotes = recomputeFilteredNotes(
        state.notes,
        state.filters,
        config,
        state.pinnedNotes
      );
      set({ filteredNotes });
    },

    /**
     * Toggle pin state for a specific note
     * Uses immutable update pattern and recomputes to move pinned notes to top
     */
    togglePin: (filePath: string) => {
      const state = get();
      // Create new Set with toggled pin state (immutable)
      const newPinnedNotes = togglePinState(state.pinnedNotes, filePath);
      set({ pinnedNotes: newPinnedNotes });

      // Recompute to reorganize notes with pinned notes first
      const filteredNotes = recomputeFilteredNotes(
        state.notes,
        state.filters,
        state.sortConfig,
        newPinnedNotes
      );
      set({ filteredNotes });
    },

    /**
     * Set loading state for UI feedback during async operations
     */
    setLoading: (loading: boolean) => set({ isLoading: loading }),

    /**
     * Set error state for user feedback (null to clear error)
     */
    setError: (error: string | null) => set({ error }),

    /**
     * Refresh notes from Obsidian APIs
     * Loads all notes from vault and updates store state
     */
    refreshNotes: async (app: App) => {
      try {
        // Set loading state
        set({ isLoading: true, error: null });

        // Load notes from vault
        const notes = await loadNotesFromVault(app);

        // Update store with new notes (this will trigger recomputation)
        const state = get();
        set({ notes });

        // Recompute filtered results with current filters/sort
        const filteredNotes = recomputeFilteredNotes(
          notes,
          state.filters,
          state.sortConfig,
          state.pinnedNotes
        );
        set({ filteredNotes });

        // Clear loading state
        set({ isLoading: false });
      } catch (error) {
        console.error("Failed to refresh notes:", error);
        set({
          isLoading: false,
          error: error instanceof Error ? error.message : "Failed to load notes",
        });
      }
    },

    /**
     * Clear all active filters and reset to default state
     * Recomputes results to show all notes with current sort
     */
    clearFilters: () => {
      const defaultFilters = createDefaultFilters(); // Fresh default filters
      set({ filters: defaultFilters });

      const state = get();
      // Recompute with cleared filters (should show all notes)
      const filteredNotes = recomputeFilteredNotes(
        state.notes,
        defaultFilters,
        state.sortConfig,
        state.pinnedNotes
      );
      set({ filteredNotes });
    },

    /**
     * Reset entire store to initial state
     * Used for cleanup or when switching contexts
     */
    reset: () => {
      set({
        notes: [], // Clear all notes
        filteredNotes: [], // Clear filtered results
        pinnedNotes: new Set<string>(), // Clear pinned notes
        filters: createDefaultFilters(), // Reset filters to default
        sortConfig: createDefaultSortConfig(), // Reset sort to default
        isLoading: false, // Clear loading state
        error: null, // Clear error state
      });
    },
  }))
);

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
const collectFoldersFromNotes = (notes: NoteData[]): Set<string> => {
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
const collectTagsFromNotes = (notes: NoteData[]): Set<string> => {
  const tags = new Set<string>();

  for (const note of notes) {
    // Add each tag from each note to the set (duplicates automatically handled)
    note.tags.forEach((tag) => tags.add(tag));
  }

  return tags;
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
const hasAnyActiveFilter = (filters: FilterState): boolean => {
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
   * @param {CardExplorerState} state - Current store state
   * @returns {string[]} Sorted array of available folder paths
   */
  getAvailableFolders: (state: CardExplorerState): string[] => {
    const folders = collectFoldersFromNotes(state.notes);
    return Array.from(folders).sort(); // Convert Set to sorted Array
  },

  /**
   * Get all available tags for filter options
   *
   * Returns a sorted array of all unique tags found in the notes.
   * Used to populate tag filter dropdowns and suggestions.
   *
   * @param {CardExplorerState} state - Current store state
   * @returns {string[]} Sorted array of available tag names
   */
  getAvailableTags: (state: CardExplorerState): string[] => {
    const tags = collectTagsFromNotes(state.notes);
    return Array.from(tags).sort(); // Convert Set to sorted Array
  },

  /**
   * Get the count of currently pinned notes
   *
   * Returns the number of notes that are currently pinned.
   * Used for UI indicators and statistics.
   *
   * @param {CardExplorerState} state - Current store state
   * @returns {number} Number of pinned notes
   */
  getPinnedCount: (state: CardExplorerState): number => {
    return state.pinnedNotes.size;
  },

  /**
   * Get the count of notes after filtering
   *
   * Returns the number of notes that pass the current filter criteria.
   * Used for displaying result counts and pagination.
   *
   * @param {CardExplorerState} state - Current store state
   * @returns {number} Number of filtered notes
   */
  getFilteredCount: (state: CardExplorerState): number => {
    return state.filteredNotes.length;
  },

  /**
   * Check if any filters are currently active
   *
   * Returns true if any filter criteria is applied, false if showing all notes.
   * Used to show filter status indicators and enable "clear filters" button.
   *
   * @param {CardExplorerState} state - Current store state
   * @returns {boolean} True if any filters are active
   */
  hasActiveFilters: (state: CardExplorerState): boolean => {
    return hasAnyActiveFilter(state.filters);
  },
};
