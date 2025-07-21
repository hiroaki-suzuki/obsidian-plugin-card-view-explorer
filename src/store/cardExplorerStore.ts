import type { App } from "obsidian";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type CardExplorerPlugin from "../main";
import type { FilterState, NoteData, SortConfig } from "../types";
import { applyFilters } from "./filters";
import { loadNotesFromVault } from "./noteProcessing";
import { cardExplorerSelectors } from "./selectors";
import { sortNotes, togglePinState } from "./sorting";
import { DEFAULT_SORT_KEY, DEFAULT_SORT_ORDER } from "./utils";

/**
 * Card View Explorer Store State Interface
 *
 * Defines the complete state structure and actions for Card View Explorer.
 * This interface clearly separates data, UI state, and actions.
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
   * Initialize store from plugin data
   * @param plugin - Plugin instance with data
   */
  initializeFromPluginData: (plugin: CardExplorerPlugin) => void;
  /**
   * Save current pin states to plugin data
   * @param plugin - Plugin instance to save data to
   */
  savePinStatesToPlugin: (plugin: CardExplorerPlugin) => Promise<void>;
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
 */
const createDefaultSortConfig = (): SortConfig => ({
  key: DEFAULT_SORT_KEY, // Sort by "updated" field
  order: DEFAULT_SORT_ORDER, // Descending order (newest first)
});

/**
 * Apply filters and sorting to notes in the correct order
 *
 * This is the main orchestrator function that applies the complete
 * transformation pipeline: filtering → sorting → pinning organization.
 *
 * @param notes - Array of all notes to process
 * @param filters - Current filter configuration to apply
 * @param sortConfig - Current sort configuration to apply
 * @param pinnedNotes - Set of pinned note paths to prioritize
 * @returns Filtered, sorted array of notes with pinned notes at the top
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
 * Card View Explorer Zustand Store
 *
 * Main state management store for the Card View Explorer plugin.
 * Uses Zustand with subscribeWithSelector middleware for reactive updates.
 * This store serves as the central state management system for the entire plugin.
 *
 * Key Features:
 * - Automatic recomputation of filtered notes when state changes
 * - Immutable updates to prevent side effects
 * - Optimized filtering and sorting pipeline
 * - Support for pinned notes that always appear first
 * - Error handling and loading state management
 * - Persistence of user preferences (pins, filters, sort)
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
     *
     * @param notes - Array of note data objects loaded from Obsidian vault
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
     *
     * @param newFilters - Partial filter state to merge with current filters
     *                     Only specified properties will be updated
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
     *
     * @param config - Complete new sort configuration (key and order)
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
     *
     * @param filePath - Full path to the note file to toggle pin state
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
     * Initialize store from plugin data
     * Loads saved pin states, filters, and sort config from plugin data
     *
     * @param plugin - Plugin instance containing persisted user data
     */
    initializeFromPluginData: (plugin: CardExplorerPlugin) => {
      const data = plugin.getData();

      // Initialize pinned notes from plugin data
      // Convert array to Set for O(1) lookup performance
      const pinnedNotes = new Set(data.pinnedNotes || []);

      // Initialize filters from plugin data (use last filters if available)
      // This restores the user's previous filter selections
      const filters = data.lastFilters || createDefaultFilters();

      // Initialize sort config from plugin data
      // This restores the user's preferred sort order
      const sortConfig = data.sortConfig || createDefaultSortConfig();

      // Update store state
      set({
        pinnedNotes,
        filters,
        sortConfig,
      });

      // Recompute filtered notes with loaded state
      const state = get();
      const filteredNotes = recomputeFilteredNotes(state.notes, filters, sortConfig, pinnedNotes);
      set({ filteredNotes });
    },

    /**
     * Save current pin states to plugin data
     * Persists current pin states, filters, and sort config to plugin data file
     *
     * @param plugin - Plugin instance to save data to
     * @returns Promise that resolves when data is saved
     */
    savePinStatesToPlugin: async (plugin: CardExplorerPlugin) => {
      const state = get();

      // Update plugin data with current state
      // This preserves other plugin data while updating only what we need
      const currentData = plugin.getData();
      plugin.updateData({
        ...currentData,
        pinnedNotes: Array.from(state.pinnedNotes), // Convert Set back to array for storage
        lastFilters: state.filters, // Save current filters for next session
        sortConfig: state.sortConfig, // Save current sort config for next session
      });

      // Save to disk
      await plugin.savePluginData();
    },

    /**
     * Set loading state for UI feedback during async operations
     *
     * @param loading - Boolean indicating whether loading is in progress
     */
    setLoading: (loading: boolean) => set({ isLoading: loading }),

    /**
     * Set error state for user feedback
     *
     * @param error - Error message to display or null to clear error state
     */
    setError: (error: string | null) => set({ error }),

    /**
     * Refresh notes from Obsidian APIs
     * Loads all notes from vault and updates store state
     * Includes error handling with retry mechanism for API failures
     *
     * @param app - Obsidian App instance for API access
     * @returns Promise that resolves when notes are refreshed
     */
    refreshNotes: async (app: App) => {
      // Import error handling utilities dynamically
      const { withRetry, handleError, ErrorCategory } = await import("../utils/errorHandling");

      try {
        // Set loading state
        set({ isLoading: true, error: null });

        // Load notes from vault with retry mechanism
        // withRetry will attempt the operation multiple times with exponential backoff
        const notes = await withRetry(() => loadNotesFromVault(app), {
          maxRetries: 3, // Try up to 3 times
          baseDelay: 1000, // Start with 1 second delay
          category: ErrorCategory.API,
          context: { operation: "loadNotesFromVault", notesCount: get().notes.length },
        });

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
        // Handle error with comprehensive error handling
        // This converts technical errors to user-friendly messages
        const errorInfo = handleError(error, ErrorCategory.API, {
          operation: "refreshNotes",
          notesCount: get().notes.length,
          hasExistingNotes: get().notes.length > 0,
        });

        set({
          isLoading: false,
          error: errorInfo.message,
        });
      }
    },

    /**
     * Clear all active filters and reset to default state
     * Recomputes results to show all notes with current sort
     * Maintains pin states and sort configuration
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
     * Clears all data including notes, filters, pins, and errors
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

// Re-export selectors for convenience
export { cardExplorerSelectors };
