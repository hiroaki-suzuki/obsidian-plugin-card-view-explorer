import { debounce } from "es-toolkit";
import { type EventRef, Plugin, type TAbstractFile, TFile, type WorkspaceLeaf } from "obsidian";
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
 * Main Card Explorer plugin class
 *
 * This class serves as the core of the Obsidian plugin with the following responsibilities:
 * - Plugin lifecycle management (initialization and cleanup)
 * - User settings loading and saving
 * - File system event monitoring and processing
 * - Card Explorer view management
 */
export default class CardExplorerPlugin extends Plugin {
  /**
   * Plugin settings that control behavior and appearance
   *
   * Settings include:
   * - sortKey: Frontmatter key used for sorting
   * - autoStart: Auto-start flag when Obsidian launches
   * - showInSidebar: Sidebar display flag
   *
   * Initialized with default values and loaded from disk in onload()
   */
  private settings: CardExplorerSettings = DEFAULT_SETTINGS;

  /**
   * Plugin persistent data (pinned notes, user preferences, etc.)
   *
   * Stored data includes:
   * - pinnedNotes: List of paths for pinned notes
   * - lastFilters: Last used filter settings
   * - sortConfig: Sort configuration
   *
   * Saved separately from settings in data.json file
   */
  private data: PluginData = DEFAULT_DATA;

  // Event handling related properties
  /**
   * Array of registered event handler references for cleanup
   * Used to properly remove all event listeners when plugin is unloaded
   */
  private eventRefs: EventRef[] = [];

  /**
   * Debounced function for note updates
   *
   * Prevents excessive update processing when multiple file events
   * (create, delete, modify, rename) occur in a short time period
   * Executed with DEFAULT_REFRESH_DEBOUNCE_DELAY (300ms) delay
   */
  private debouncedRefreshNotes: () => void;

  /**
   * Constructor: Initialize plugin and set up debounced update function
   * @param app - Obsidian app instance
   * @param manifest - Plugin manifest data
   */
  constructor(app: any, manifest: any) {
    super(app, manifest);

    // Initialize debounced update function
    this.debouncedRefreshNotes = debounce(async () => {
      await this.refreshNotes();
    }, DEFAULT_REFRESH_DEBOUNCE_DELAY);
  }

  /**
   * Plugin initialization lifecycle method
   * Sets up views, commands, event handlers, and loads user data
   */
  async onload(): Promise<void> {
    // Load settings and data
    await this.loadSettings();
    await this.loadPluginData();

    // Register Card Explorer view
    this.registerView(VIEW_TYPE_CARD_EXPLORER, (leaf) => new CardExplorerView(leaf, this));

    // Register commands
    this.addCommand({
      id: "open-card-explorer",
      name: "Open Card Explorer",
      callback: () => {
        this.activateView();
      },
    });

    // Add ribbon icon
    this.addRibbonIcon("layout-grid", "Card Explorer", () => {
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
   * Plugin cleanup lifecycle method
   * Removes event handlers and detaches views when plugin is disabled
   */
  async onunload(): Promise<void> {
    // Clean up event handlers
    this.cleanupEventHandlers();

    // Cleanup - detach all Card Explorer views
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_CARD_EXPLORER);
  }

  /**
   * Load plugin settings from disk
   * Called during plugin initialization to restore user settings
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
      console.error("Card Explorer: Failed to save settings");
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
      console.log("Card Explorer: Data migrated", {
        from: migration.fromVersion,
        to: migration.toVersion,
        warnings: migration.warnings,
      });
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
      console.error("Card Explorer: Failed to save plugin data");
    }
  }

  /**
   * Activate or create Card Explorer view in workspace
   * Creates new view if none exists, focuses existing view if found
   * Respects user settings for sidebar vs main workspace placement
   * @returns Promise that resolves when view is activated
   */
  async activateView(): Promise<void> {
    const { workspace } = this.app;

    let leaf: WorkspaceLeaf | null = null;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_CARD_EXPLORER);

    if (leaves.length > 0) {
      // Use existing Card Explorer view if available
      leaf = leaves[0];
    } else {
      // Create new Card Explorer view
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
   * Update notes in all active Card Explorer views
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
          console.warn(`Failed to refresh Card Explorer view ${index}:`, result.reason);
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
    const createRef = (this.app.vault as any).on("create", (file: TFile) => {
      if (this.isMarkdownFile(file)) {
        console.log("Card Explorer: File created:", file.path);
        this.debouncedRefreshNotes();
      }
    });
    this.eventRefs.push(createRef);

    // Handle file deletion
    const deleteRef = (this.app.vault as any).on("delete", (file: TFile) => {
      if (this.isMarkdownFile(file)) {
        console.log("Card Explorer: File deleted:", file.path);
        this.debouncedRefreshNotes();
      }
    });
    this.eventRefs.push(deleteRef);

    // Handle file modification (content changes)
    const modifyRef = (this.app.vault as any).on("modify", (file: TFile) => {
      if (this.isMarkdownFile(file)) {
        console.log("Card Explorer: File modified:", file.path);
        this.debouncedRefreshNotes();
      }
    });
    this.eventRefs.push(modifyRef);

    // Handle file rename/move
    const renameRef = this.app.vault.on("rename", (file: TAbstractFile, oldPath: string) => {
      if (file instanceof TFile && this.isMarkdownFile(file)) {
        console.log("Card Explorer: File renamed:", oldPath, "->", file.path);
        this.debouncedRefreshNotes();
      }
    });
    this.eventRefs.push(renameRef);

    // Subscribe to metadata cache events for frontmatter updates

    // Handle metadata cache changes (frontmatter, tags, etc.)
    const metadataRef = this.app.metadataCache.on("changed", (file: TFile) => {
      if (this.isMarkdownFile(file)) {
        console.log("Card Explorer: Metadata changed:", file.path);
        this.debouncedRefreshNotes();
      }
    });
    this.eventRefs.push(metadataRef);

    // Handle metadata cache resolution (when cache is fully loaded)
    const resolvedRef = this.app.metadataCache.on("resolved", () => {
      console.log("Card Explorer: Metadata cache resolved");
      this.debouncedRefreshNotes();
    });
    this.eventRefs.push(resolvedRef);

    console.log("Card Explorer: Event handlers set up successfully");
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

    console.log("Card Explorer: Event handlers cleaned up");
  }

  /**
   * Check if file is a Markdown file that should trigger updates
   * @param file - File to check
   * @returns true if file is a Markdown file
   */
  private isMarkdownFile(file: TFile): boolean {
    return file.extension === "md";
  }
}
