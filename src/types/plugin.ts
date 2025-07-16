import type { Plugin } from "obsidian";
import type { FilterState } from "./filter";
import type { SortConfig } from "./sort";

/**
 * Plugin settings stored in Obsidian's settings system
 */
export interface PluginSettings {
  /** Frontmatter key used for default sorting */
  sortKey: string;
  /** Whether to auto-start Card Explorer on Obsidian startup */
  autoStart: boolean;
  /** Whether to show Card Explorer in sidebar by default */
  showInSidebar: boolean;
}

/**
 * Plugin data stored in data.json file
 * Contains user state that persists between sessions
 */
export interface PluginData {
  /** Array of file paths for pinned notes */
  pinnedNotes: string[];
  /** Last used filter configuration */
  lastFilters: FilterState;
  /** Last used sort configuration */
  sortConfig: SortConfig;
}

/**
 * Extended plugin interface with Card Explorer specific properties
 */
export interface CardExplorerPlugin extends Plugin {
  /** Plugin settings */
  settings: PluginSettings;
  /** Plugin persistent data */
  data: PluginData;
}

/**
 * Default plugin settings
 */
export const DEFAULT_SETTINGS: PluginSettings = {
  sortKey: "updated",
  autoStart: false,
  showInSidebar: false,
};

/**
 * Default plugin data
 */
export const DEFAULT_DATA: PluginData = {
  pinnedNotes: [],
  lastFilters: {
    folders: [],
    tags: [],
    filename: "",
    dateRange: null,
    excludeFolders: [],
    excludeTags: [],
    excludeFilenames: [],
  },
  sortConfig: {
    key: "updated",
    order: "desc",
  },
};
