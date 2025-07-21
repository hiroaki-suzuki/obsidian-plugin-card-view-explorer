import { debounce } from "es-toolkit";
import {
  type EventRef,
  Plugin,
  type TAbstractFile,
  type TFile,
  type WorkspaceLeaf,
} from "obsidian";
import { type CardExplorerSettings, CardExplorerSettingTab, DEFAULT_SETTINGS } from "./settings";
import { DEFAULT_DATA, type PluginData } from "./types/plugin";
import {
  loadPluginData,
  loadPluginSettings,
  savePluginData,
  savePluginSettings,
} from "./utils/dataPersistence";
import { CardExplorerView, VIEW_TYPE_CARD_EXPLORER } from "./view";

/**
 * Default debounce delay for note refresh operations (in milliseconds)
 * This prevents excessive refreshes when multiple files change rapidly
 */
const DEFAULT_REFRESH_DEBOUNCE_DELAY = 300;

/**
 * Main Card View Explorer plugin class
 *
 * This class serves as the core of the Obsidian plugin, extending Obsidian's Plugin base class.
 * It manages the complete plugin lifecycle and coordinates all major subsystems:
 *
 * - Plugin lifecycle management (initialization and cleanup)
 * - User settings and persistent data management
 * - Real-time file system event monitoring and processing
 * - Card View Explorer view creation and management
 * - Command registration and ribbon icon setup
 */
export default class CardExplorerPlugin extends Plugin {
  /**
   * Plugin settings that control behavior and appearance
   *
   * These settings are persisted in Obsidian's plugin settings system and include:
   * - sortKey: Frontmatter field name used for sorting notes (e.g., "created", "modified")
   * - autoStart: Whether to automatically open Card View Explorer when Obsidian starts
   * - showInSidebar: Whether to display the view in the sidebar or main workspace
   *
   * Initialized with DEFAULT_SETTINGS and loaded from disk during onload()
   */
  private settings: CardExplorerSettings = DEFAULT_SETTINGS;

  /**
   * Plugin persistent data stored in data.json file
   *
   * This data is separate from settings and includes user-specific state:
   * - pinnedNotes: Array of file paths for notes pinned to the top of the list
   * - lastFilters: Previously applied filter criteria (tags, folders, date ranges)
   * - sortConfig: Current sort configuration and preferences
   * - version: Data format version for migration purposes
   *
   * Managed through loadPluginData() and savePluginData() methods with automatic
   * backup creation and data migration between plugin versions
   */
  private data: PluginData = DEFAULT_DATA;

  // Event handling related properties
  /**
   * Array of registered event handler references for proper cleanup
   *
   * Stores EventRef objects returned by Obsidian's event system to ensure
   * all event listeners are properly removed when the plugin is unloaded,
   * preventing memory leaks and unexpected behavior
   */
  private eventRefs: EventRef[] = [];

  /**
   * Debounced function for note refresh operations
   *
   * Prevents excessive UI updates when multiple file system events
   * (create, delete, modify, rename) occur rapidly. Uses es-toolkit's
   * debounce with a 300ms delay to batch updates efficiently.
   *
   * This is crucial for performance when users perform bulk operations
   * like importing many files or using find-and-replace across multiple notes.
   */
  private readonly debouncedRefreshNotes: () => void;

  /**
   * Initialize the Card View Explorer plugin
   *
   * Sets up the debounced refresh function during construction to ensure
   * it's available throughout the plugin lifecycle.
   *
   * @param app - Obsidian application instance providing access to vault, workspace, and APIs
   * @param manifest - Plugin manifest containing metadata like version, name, and description
   */
  constructor(app: any, manifest: any) {
    super(app, manifest);

    // Initialize debounced update function
    this.debouncedRefreshNotes = debounce(async () => {
      await this.refreshNotes();
    }, DEFAULT_REFRESH_DEBOUNCE_DELAY);
  }

  /**
   * Plugin initialization lifecycle method called by Obsidian
   *
   * Performs complete plugin setup in the following order:
   * 1. Load user settings and persistent data from disk
   * 2. Register the Card View Explorer view type with Obsidian
   * 3. Add commands and ribbon icon for user interaction
   * 4. Set up real-time file system event monitoring
   * 5. Auto-start the view if enabled in settings
   *
   * @returns Promise that resolves when initialization is complete
   */
  async onload(): Promise<void> {
    // Load settings and data
    await this.loadSettings();
    await this.loadPluginData();

    // Register Card View Explorer view
    this.registerView(VIEW_TYPE_CARD_EXPLORER, (leaf) => new CardExplorerView(leaf, this));

    // Register commands
    this.addCommand({
      id: "open-card-view-explorer",
      name: "Open Card View Explorer",
      callback: () => {
        this.activateView();
      },
    });

    // Add ribbon icon
    this.addRibbonIcon("layout-grid", "Card View Explorer", () => {
      this.activateView();
    });

    // Register settings tab
    this.addSettingTab(new CardExplorerSettingTab(this.app, this));

    // Set up real-time event processing
    this.setupEventHandlers();

    // If auto-start is enabled
    if (this.settings.autoStart) {
      // Wait for workspace to be ready
      this.app.workspace.onLayoutReady(() => {
        this.activateView();
      });
    }
  }

  /**
   * Plugin cleanup lifecycle method called by Obsidian
   *
   * Performs proper cleanup when the plugin is disabled or Obsidian shuts down:
   * - Removes all registered event handlers to prevent memory leaks
   * - Detaches all Card View Explorer views from the workspace
   *
   * @returns Promise that resolves when cleanup is complete
   */
  async onunload(): Promise<void> {
    // Clean up event handlers
    this.cleanupEventHandlers();

    // Cleanup - detach all Card View Explorer views
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_CARD_EXPLORER);
  }

  /**
   * Load plugin settings from Obsidian's settings system
   *
   * Restores user preferences from disk, merging with default values
   * for any missing settings. Called during plugin initialization.
   *
   * @returns Promise that resolves when settings are loaded
   */
  async loadSettings(): Promise<void> {
    this.settings = await loadPluginSettings(this);
  }

  /**
   * Save current plugin settings to disk
   * Called when user changes settings
   */
  async saveSettings(): Promise<void> {
    const success = await savePluginSettings(this, this.settings);
    if (!success) {
      console.error("Card View Explorer: Failed to save settings");
    }
  }

  /**
   * Get current plugin settings
   * Provides controlled access to private settings property
   * @returns Current plugin settings object
   */
  getSettings(): CardExplorerSettings {
    return this.settings;
  }

  /**
   * Update specific setting value
   * @param key - Setting key to update
   * @param value - New value for the setting
   */
  updateSetting<K extends keyof CardExplorerSettings>(
    key: K,
    value: CardExplorerSettings[K]
  ): void {
    this.settings[key] = value;
  }

  /**
   * Get current plugin data
   * Provides controlled access to private data property
   * @returns Current plugin data object
   */
  getData(): PluginData {
    return this.data;
  }

  /**
   * Update plugin data
   * Provides controlled access to update private data property
   * @param data - New plugin data
   */
  updateData(data: PluginData): void {
    this.data = data;
  }

  /**
   * Load plugin data from disk
   * Handles migration when data format changes between versions
   * @returns Promise that resolves when data is loaded
   */
  async loadPluginData(): Promise<void> {
    const { data, migration } = await loadPluginData(this);
    this.data = data;

    // Log migration if it occurred
    if (migration.migrated) {
      console.log("Card View Explorer: Data migrated", {
        from: migration.fromVersion,
        to: migration.toVersion,
        warnings: migration.warnings || [],
      });

      // Also log warnings if any
      if (migration.warnings?.length) {
        console.warn(
          "Card View Explorer: Data migration completed with warnings",
          migration.warnings
        );
      }
    }
  }

  /**
   * Save plugin data to disk
   * Used to persist user settings and pinned notes
   * @returns Promise that resolves when data is saved
   */
  async savePluginData(): Promise<void> {
    const success = await savePluginData(this, this.data);
    if (!success) {
      console.error("Card View Explorer: Failed to save plugin data");
    }
  }

  /**
   * Activate or create Card View Explorer view in workspace
   * Creates new view if none exists, focuses existing view if found
   * Respects user settings for sidebar vs main workspace placement
   * @returns Promise that resolves when view is activated
   */
  async activateView(): Promise<void> {
    const { workspace } = this.app;

    let leaf: WorkspaceLeaf | null = null;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_CARD_EXPLORER);

    if (leaves.length > 0) {
      // Use existing Card View Explorer view if available
      leaf = leaves[0];
    } else {
      // Create new Card View Explorer view
      if (this.settings.showInSidebar) {
        // Place in right sidebar if user setting is configured for sidebar display
        leaf = workspace.getRightLeaf(false);
      } else {
        // Otherwise create in main workspace area
        leaf = workspace.getLeaf(true);
      }

      if (leaf) {
        await leaf.setViewState({
          type: VIEW_TYPE_CARD_EXPLORER,
          active: true,
        });
      }
    }

    // Reveal leaf (give it focus)
    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }

  /**
   * Update notes in all active Card View Explorer views
   * Used by components to trigger note reloading
   */
  async refreshNotes(): Promise<void> {
    try {
      const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_CARD_EXPLORER);

      // Use Promise.allSettled to properly handle individual view failures
      const refreshPromises = leaves.map(async (leaf) => {
        const view = leaf.view as CardExplorerView;
        if (view && typeof view.refreshNotes === "function") {
          return await view.refreshNotes();
        }
      });

      const results = await Promise.allSettled(refreshPromises);

      // Log failures but don't throw exceptions
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          console.warn(`Failed to refresh Card View Explorer view ${index}:`, result.reason);
        }
      });
    } catch (error) {
      // Dynamically import error handling utility
      const { handleError, ErrorCategory } = await import("./utils/errorHandling");

      handleError(error, ErrorCategory.API, {
        operation: "refreshNotes",
        viewCount: this.app.workspace.getLeavesOfType(VIEW_TYPE_CARD_EXPLORER).length,
      });
    }
  }

  /**
   * Set up event handlers for real-time updates
   * Subscribe to vault and metadata cache events to keep notes up to date
   */
  private setupEventHandlers(): void {
    // Subscribe to vault events for file changes

    // Handle file creation
    const createRef = this.app.vault.on("create", (file: TAbstractFile) => {
      if (this.isMarkdownFile(file)) {
        this.debouncedRefreshNotes();
      }
    });
    this.eventRefs.push(createRef);

    // Handle file deletion
    const deleteRef = this.app.vault.on("delete", (file: TAbstractFile) => {
      if (this.isMarkdownFile(file)) {
        this.debouncedRefreshNotes();
      }
    });
    this.eventRefs.push(deleteRef);

    // Handle file modification (content changes)
    const modifyRef = this.app.vault.on("modify", (file: TAbstractFile) => {
      if (this.isMarkdownFile(file)) {
        this.debouncedRefreshNotes();
      }
    });
    this.eventRefs.push(modifyRef);

    // Handle file rename/move
    const renameRef = this.app.vault.on("rename", (file: TAbstractFile) => {
      if (this.isMarkdownFile(file)) {
        this.debouncedRefreshNotes();
      }
    });
    this.eventRefs.push(renameRef);

    // Subscribe to metadata cache events for frontmatter updates

    // Handle metadata cache changes (frontmatter, tags, etc.)
    const metadataRef = this.app.metadataCache.on("changed", (file: TFile) => {
      if (this.isMarkdownFile(file)) {
        this.debouncedRefreshNotes();
      }
    });
    this.eventRefs.push(metadataRef);

    // Handle metadata cache resolution (when cache is fully loaded)
    const resolvedRef = this.app.metadataCache.on("resolved", () => {
      this.debouncedRefreshNotes();
    });
    this.eventRefs.push(resolvedRef);
  }

  /**
   * Clean up event handlers
   * Unsubscribe from all vault and metadata cache events
   */
  private cleanupEventHandlers(): void {
    // Unsubscribe from all event handlers
    this.eventRefs.forEach((ref) => {
      this.app.vault.offref(ref);
    });

    // Clear event reference array
    this.eventRefs = [];
  }

  /**
   * Check if file is a Markdown file that should trigger updates
   * @param file - File to check
   * @returns true if file is a Markdown file
   */
  private isMarkdownFile(file: TAbstractFile): boolean {
    return "extension" in file && file.extension === "md";
  }
}
