import type { Plugin } from "obsidian";
import type { DataBackup } from "../utils/dataBackup";
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
   * Data version for migration and backup purposes
   * Used by the migration system to determine if data needs to be upgraded
   */
  version?: number;

  /**
   * Internal backup storage (managed by backup system)
   * Contains previous versions of plugin data for recovery purposes
   * @internal This property is managed by the backup system and should not be modified directly
   */
  _backups?: DataBackup[];
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
 * Default plugin data
 * Used when the plugin is first installed or when data is corrupted/missing
 * Provides safe initial values for all data properties
 */
export const DEFAULT_DATA: PluginData = {
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
