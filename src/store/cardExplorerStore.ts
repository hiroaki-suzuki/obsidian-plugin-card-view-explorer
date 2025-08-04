/**
 * Main Zustand Store - Card Explorer State Management
 *
 * This is the central state management hub for the Card View Explorer plugin.
 * It implements a reactive architecture where raw data (notes) is processed
 * through filters and sorting to produce derived state (filteredNotes) that
 * automatically updates when dependencies change.
 *
 * Key architectural patterns:
 * - Immutable state updates: All state changes create new objects/arrays
 * - Automatic recomputation: Filtered results update when raw data or filters change
 * - Separation of concerns: Raw data, user configuration, and UI state are distinct
 * - Error resilience: Comprehensive error handling with retry mechanisms
 *
 * The store uses subscribeWithSelector middleware to enable fine-grained
 * subscriptions for performance optimization in React components.
 */

import type { App } from "obsidian";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { ErrorCategory, handleError, withRetry } from "../core/errors/errorHandling";
import type { CardExplorerSettings } from "../settings";
import type { FilterState, NoteData, PluginData, SortConfig } from "../types";
import { DEFAULT_SORT_KEY, DEFAULT_SORT_ORDER } from "./constants";
import { applyFilters, hasAnyActiveFilter } from "./filters";
import { loadNotesFromVault } from "./noteProcessing";
import { cardExplorerSelectors } from "./selectors";
import { sortNotes, togglePinState } from "./sorting";

/**
 * Complete state interface for the Card Explorer store
 *
 * Organizes state into logical groups:
 * - Raw Data: Source data loaded from Obsidian vault
 * - Computed Data: Derived state that updates automatically
 * - User Configuration: Filter and sort preferences
 * - UI State: Loading indicators and error messages
 * - Actions: Functions to modify state
 */
export interface CardExplorerState {
  // === Raw Data ===
  /** All notes loaded from the Obsidian vault */
  notes: NoteData[];
  /** Set of file paths for notes that are pinned by the user */
  pinnedNotes: Set<string>;

  // === Computed Data (automatically derived from raw data) ===
  /** Notes after applying all active filters and sorting */
  filteredNotes: NoteData[];
  /** All unique tags available across all notes for filter options */
  availableTags: string[];
  /** All unique folder paths available across all notes for filter options */
  availableFolders: string[];

  // === User Configuration ===
  /** Current filter configuration applied to notes */
  filters: FilterState;
  /** Current sort configuration for note ordering */
  sortConfig: SortConfig;

  // === UI State ===
  /** Whether a data loading operation is in progress */
  isLoading: boolean;
  /** Current error message to display to user, null if no error */
  error: string | null;

  // === Actions ===

  // === Core Data Operations ===
  /**
   * Refresh notes from the Obsidian vault
   *
   * Loads all markdown files from the vault, extracts metadata,
   * and updates the store with fresh data. Includes retry logic
   * for handling temporary failures.
   */
  refreshNotes: (app: App) => Promise<void>;

  // === User Interaction Actions ===
  /**
   * Update filter configuration with partial changes
   *
   * Merges new filter settings with existing ones and triggers
   * automatic recomputation of filtered results.
   */
  updateFilters: (filters: Partial<FilterState>) => void;

  /**
   * Reset all filters to their default empty state
   *
   * Clears all active filters and recomputes the filtered results
   * to show all notes.
   */
  clearFilters: () => void;

  /**
   * Update sort configuration from plugin settings
   *
   * Updates the sort key while maintaining the default sort order,
   * then recomputes filtered results with new sorting.
   */
  updateSortFromSettings: (sortKey: string) => void;

  /**
   * Toggle the pin state of a specific note
   *
   * Adds or removes a note from the pinned set and recomputes
   * filtered results to reflect the new pin state.
   */
  togglePin: (filePath: string) => void;

  // === Lifecycle & Persistence ===
  /**
   * Initialize store state from saved plugin data
   *
   * Loads previously saved pin states and filter preferences
   * from the plugin's data file.
   */
  initializeFromPluginData: (data: PluginData, settings: CardExplorerSettings) => void;

  /**
   * Reset store to initial empty state
   *
   * Clears all data and resets to default configuration.
   * Used for cleanup and testing.
   */
  reset: () => void;

  // === UI State Management ===
  /**
   * Set or clear the current error message
   *
   * Updates the error state for display in the UI.
   * Pass null to clear the error.
   */
  setError: (error: string | null) => void;

  // === Computed State Getters ===
  /**
   * Check if any filters are currently active
   *
   * Returns true if any filter criteria are applied,
   * used to show filter status in the UI.
   */
  hasActiveFilters: () => boolean;

  /**
   * Get serializable data for persistence
   *
   * Returns a simplified object containing only the necessary
   * state for saving to the plugin's data file.
   */
  getSerializableData: () => {
    pinnedNotes: string[];
    lastFilters: FilterState;
  };
}

/**
 * Create default filter state with all filters disabled
 *
 * Returns a fresh FilterState object with empty arrays and null values,
 * representing no active filters (show all notes).
 */
const createDefaultFilters = (): FilterState => ({
  folders: [],
  tags: [],
  filename: "",
  dateRange: null,
});

/**
 * Create default sort configuration with optional custom sort key
 *
 * Uses the provided sort key or falls back to the application default.
 * Always uses the default sort order (descending).
 */
const createDefaultSortConfig = (sortKey?: string): SortConfig => ({
  key: sortKey || DEFAULT_SORT_KEY,
  order: DEFAULT_SORT_ORDER,
});

/**
 * Recompute filtered and sorted notes from raw data
 *
 * This is the core data transformation pipeline that:
 * 1. Applies all active filters to the raw notes
 * 2. Sorts the filtered results according to sort configuration
 * 3. Ensures pinned notes appear first while maintaining sort order
 *
 * Used whenever raw data, filters, sort config, or pin states change.
 */
const recomputeFilteredNotes = (
  notes: NoteData[],
  filters: FilterState,
  sortConfig: SortConfig,
  pinnedNotes: Set<string>
): NoteData[] => {
  const filtered = applyFilters(notes, filters, new Date());
  return sortNotes(filtered, sortConfig, pinnedNotes);
};

/**
 * Compute available filter options from the current notes collection
 *
 * Extracts all unique tags and folders from the notes to populate
 * filter dropdown options. Uses selectors to ensure consistent
 * hierarchical processing.
 */
const computeAvailableOptions = (
  notes: NoteData[]
): { availableTags: string[]; availableFolders: string[] } => {
  return {
    availableTags: cardExplorerSelectors.getAvailableTags(notes),
    availableFolders: cardExplorerSelectors.getAvailableFolders(notes),
  };
};

/**
 * Main Zustand store instance for Card Explorer state management
 *
 * Creates a reactive store with subscribeWithSelector middleware for
 * fine-grained subscriptions. The store follows immutable update patterns
 * and automatically recomputes derived state when dependencies change.
 *
 * Usage example:
 * ```typescript
 * const { notes, filteredNotes, updateFilters } = useCardExplorerStore();
 * const isLoading = useCardExplorerStore(state => state.isLoading);
 * ```
 */
export const useCardExplorerStore = create<CardExplorerState>()(
  subscribeWithSelector((set, get) => ({
    // === Initial State ===
    notes: [],
    filteredNotes: [],
    pinnedNotes: new Set<string>(),
    availableTags: [],
    availableFolders: [],
    filters: createDefaultFilters(),
    sortConfig: createDefaultSortConfig(),
    isLoading: false,
    error: null,

    // === Actions - State mutation functions with automatic recomputation ===

    // === Core Data Operations ===

    refreshNotes: async (app: App) => {
      try {
        set({ isLoading: true, error: null });

        // Load notes with retry logic for resilience against temporary failures
        const notes = await withRetry(() => loadNotesFromVault(app), {
          maxRetries: 3, // Try up to 3 times
          baseDelay: 1000, // Start with 1 second delay
          category: ErrorCategory.API,
          context: { operation: "loadNotesFromVault", notesCount: get().notes.length },
        });

        // Compute filter options from the new notes data
        const { availableTags, availableFolders } = computeAvailableOptions(notes);

        const state = get();

        // Apply current filters and sorting to the new notes
        const filteredNotes = recomputeFilteredNotes(
          notes,
          state.filters,
          state.sortConfig,
          state.pinnedNotes
        );

        // Update all derived state in a single operation
        set({ notes, availableTags, availableFolders, filteredNotes });

        set({ isLoading: false });
      } catch (error) {
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

    // === User Interaction Actions ===

    updateFilters: (newFilters: Partial<FilterState>) => {
      const state = get();
      // Immutable update: merge new filters with existing ones
      const updatedFilters = { ...state.filters, ...newFilters };
      set({ filters: updatedFilters });

      // Recompute filtered results with the new filter configuration
      const filteredNotes = recomputeFilteredNotes(
        state.notes,
        updatedFilters,
        state.sortConfig,
        state.pinnedNotes
      );
      set({ filteredNotes });
    },

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

    updateSortFromSettings: (sortKey: string) => {
      const state = get();
      const newSortConfig = createDefaultSortConfig(sortKey);
      set({ sortConfig: newSortConfig });

      // Recompute with new sort configuration
      const filteredNotes = recomputeFilteredNotes(
        state.notes,
        state.filters,
        newSortConfig,
        state.pinnedNotes
      );
      set({ filteredNotes });
    },

    togglePin: (filePath: string) => {
      const state = get();
      // Immutable toggle: creates new Set with updated pin state
      const newPinnedNotes = togglePinState(state.pinnedNotes, filePath);
      set({ pinnedNotes: newPinnedNotes });

      // Recompute to reflect new pin state in sort order
      const filteredNotes = recomputeFilteredNotes(
        state.notes,
        state.filters,
        state.sortConfig,
        newPinnedNotes
      );
      set({ filteredNotes });
    },

    // === Lifecycle & Persistence ===

    initializeFromPluginData: (data: PluginData, settings: CardExplorerSettings) => {
      // Restore pinned notes from saved data
      const pinnedNotes = new Set(data.pinnedNotes || []);

      // Restore last used filters or use defaults
      const filters = data.lastFilters || createDefaultFilters();

      // Use sort key from settings (user preference)
      const sortConfig = createDefaultSortConfig(settings.sortKey);

      set({
        pinnedNotes,
        filters,
        sortConfig,
      });

      // Recompute filtered results with restored configuration
      const state = get();
      const filteredNotes = recomputeFilteredNotes(state.notes, filters, sortConfig, pinnedNotes);
      set({ filteredNotes });
    },

    reset: () => {
      // Reset all state to initial values - used for cleanup and testing
      set({
        notes: [],
        filteredNotes: [],
        pinnedNotes: new Set<string>(),
        availableTags: [],
        availableFolders: [],
        filters: createDefaultFilters(),
        sortConfig: createDefaultSortConfig(),
        isLoading: false,
        error: null,
      });
    },

    // === UI State Management ===

    setError: (error: string | null) => set({ error }),

    // === Computed State Getters - Direct access to computed values ===

    hasActiveFilters: () => {
      // Delegate to pure function for consistency and testability
      return hasAnyActiveFilter(get().filters);
    },

    getSerializableData: () => {
      const state = get();
      return {
        pinnedNotes: Array.from(state.pinnedNotes),
        lastFilters: state.filters,
      };
    },
  }))
);
