import type { Plugin } from "obsidian";
import type { FilterState } from "./filter";
import type { SortConfig } from "./sort";

/**
 * Plugin settings stored in Obsidian's settings system
 * These settings are configurable through the plugin settings tab
 */
export interface PluginSettings {
  /**
   * Frontmatter key used for default sorting
   * Can be any frontmatter property or special value "updated" for file modification time
   */
  sortKey: string;

  /**
   * Whether to auto-start Card View Explorer on Obsidian startup
   * When true, the view will be automatically opened when Obsidian launches
   */
  autoStart: boolean;

  /**
   * Whether to show Card View Explorer in sidebar by default
   * When true, opens in sidebar; when false, opens in main workspace area
   */
  showInSidebar: boolean;
}

/**
 * Plugin data stored in data.json file
 * Contains user state that persists between sessions
 * This data is automatically saved and loaded by the plugin
 */
export interface PluginData {
  /**
   * Array of file paths for pinned notes
   * Pinned notes always appear at the top of the list regardless of sort order
   */
  pinnedNotes: string[];

  /**
   * Last used filter configuration
   * Persisted between sessions to maintain user's filter preferences
   */
  lastFilters: FilterState;

  /**
   * Last used sort configuration
   * Persisted between sessions to maintain user's sort preferences
   */
  sortConfig: SortConfig;

  /**
   * Data format version for compatibility tracking
   * Used to identify the data structure version for future compatibility checks.
   *
   * Version bump policy (single source of truth is DATA_VERSION below):
   * - Increase by 1 whenever the persisted data schema changes in a way that
   *   requires a migration (e.g., rename/remove fields, type changes, semantic changes).
   * - Adding strictly optional fields that older code can ignore does NOT require a bump,
   *   but prefer bumping if there is any ambiguity for consumers.
   * - Any code that reads/writes PluginData MUST check this version and migrate when needed.
   * - Migrations should handle forward/backward compatibility gracefully where possible.
   */
  version: number;
}

/**
 * Extended plugin interface with Card View Explorer specific properties
 * Extends the base Obsidian Plugin interface with our custom properties
 */
export interface CardExplorerPlugin extends Plugin {
  /**
   * Plugin settings
   * Configured through the settings tab and persisted by Obsidian
   */
  settings: PluginSettings;

  /**
   * Plugin persistent data
   * Stored in data.json and managed by the plugin's data persistence system
   */
  data: PluginData;
}

/**
 * Default plugin settings
 * Used when the plugin is first installed or when settings are reset
 */
export const DEFAULT_SETTINGS: PluginSettings = {
  sortKey: "updated",
  autoStart: false,
  showInSidebar: false,
};

/**
 * Single source of truth for the current persisted data schema version.
 *
 * Bump this number by 1 when making breaking changes to PluginData.
 * Examples that require a bump:
 * - Renaming/removing properties (e.g., pinnedNotes -> starredNotes)
 * - Changing property types (e.g., string[] to Set<string>)
 * - Repurposing semantics of existing fields
 *
 * When bumping:
 * - Update migration logic to transform older data to the new shape
 * - Update related tests and fixtures
 */
export const DATA_VERSION = 1 as const;

/**
 * Default plugin data
 * Used when the plugin is first installed or when data is corrupted/missing
 * Provides safe initial values for all data properties
 */
export const DEFAULT_DATA: PluginData = {
  version: DATA_VERSION,
  pinnedNotes: [],
  lastFilters: {
    folders: [],
    tags: [],
    filename: "",
    dateRange: null,
  },
  sortConfig: {
    key: "updated",
    order: "desc",
  },
};
