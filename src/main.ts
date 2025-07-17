import { type EventRef, Plugin, type TAbstractFile, TFile, type WorkspaceLeaf } from "obsidian";
import { type CardExplorerSettings, CardExplorerSettingTab, DEFAULT_SETTINGS } from "./settings";
import { DEFAULT_DATA, type PluginData } from "./types/plugin";
import {
  loadPluginData,
  loadPluginSettings,
  savePluginData,
  savePluginSettings,
} from "./utils/dataPersistence";
import { DEFAULT_REFRESH_DEBOUNCE_DELAY, debounceAsync } from "./utils/debounce";
import { CardExplorerView, VIEW_TYPE_CARD_EXPLORER } from "./view";

export default class CardExplorerPlugin extends Plugin {
  settings: CardExplorerSettings = DEFAULT_SETTINGS;
  data: PluginData = DEFAULT_DATA;

  // Event handling
  private eventRefs: EventRef[] = [];
  private debouncedRefreshNotes: () => Promise<void>;

  constructor(app: any, manifest: any) {
    super(app, manifest);

    // Initialize debounced refresh function
    this.debouncedRefreshNotes = debounceAsync(async () => {
      await this.refreshNotes();
    }, DEFAULT_REFRESH_DEBOUNCE_DELAY) as unknown as () => Promise<void>;
  }

  async onload(): Promise<void> {
    // Load settings and data
    await this.loadSettings();
    await this.loadPluginData();

    // Register the Card Explorer view
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

    // Set up real-time event handling
    this.setupEventHandlers();

    // Auto-start if enabled
    if (this.settings.autoStart) {
      // Delay to ensure workspace is ready
      this.app.workspace.onLayoutReady(() => {
        this.activateView();
      });
    }
  }

  async onunload(): Promise<void> {
    // Cleanup event handlers
    this.cleanupEventHandlers();

    // Cleanup - detach all Card Explorer views
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_CARD_EXPLORER);
  }

  async loadSettings(): Promise<void> {
    this.settings = await loadPluginSettings(this);
  }

  async saveSettings(): Promise<void> {
    const success = await savePluginSettings(this, this.settings);
    if (!success) {
      console.error("Card Explorer: Failed to save settings");
    }
  }

  async loadPluginData(): Promise<void> {
    const { data, migration } = await loadPluginData(this);
    this.data = data;

    // Log migration information if migration occurred
    if (migration.migrated) {
      console.log("Card Explorer: Data migrated", {
        from: migration.fromVersion,
        to: migration.toVersion,
        warnings: migration.warnings,
      });
    }
  }

  async savePluginData(): Promise<void> {
    const success = await savePluginData(this, this.data);
    if (!success) {
      console.error("Card Explorer: Failed to save plugin data");
    }
  }

  async activateView(): Promise<void> {
    const { workspace } = this.app;

    let leaf: WorkspaceLeaf | null = null;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_CARD_EXPLORER);

    if (leaves.length > 0) {
      // A Card Explorer view already exists, use it
      leaf = leaves[0];
    } else {
      // Create new Card Explorer view
      if (this.settings.showInSidebar) {
        leaf = workspace.getRightLeaf(false);
      } else {
        leaf = workspace.getLeaf(true);
      }

      if (leaf) {
        await leaf.setViewState({
          type: VIEW_TYPE_CARD_EXPLORER,
          active: true,
        });
      }
    }

    // Reveal the leaf
    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }

  /**
   * Refresh notes in all active Card Explorer views
   * Used by components to trigger note reload
   */
  async refreshNotes(): Promise<void> {
    try {
      const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_CARD_EXPLORER);

      // Use Promise.allSettled to handle individual view failures gracefully
      const refreshPromises = leaves.map(async (leaf) => {
        const view = leaf.view as CardExplorerView;
        if (view && typeof view.refreshNotes === "function") {
          return await view.refreshNotes();
        }
      });

      const results = await Promise.allSettled(refreshPromises);

      // Log any failures but don't throw
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          console.warn(`Failed to refresh Card Explorer view ${index}:`, result.reason);
        }
      });
    } catch (error) {
      // Import error handling utilities dynamically
      const { handleError, ErrorCategory } = await import("./utils/errorHandling");

      handleError(error, ErrorCategory.API, {
        operation: "refreshNotes",
        viewCount: this.app.workspace.getLeavesOfType(VIEW_TYPE_CARD_EXPLORER).length,
      });
    }
  }

  /**
   * Set up event handlers for real-time updates
   * Subscribes to vault and metadata cache events to keep notes up-to-date
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
   * Unsubscribes from all vault and metadata cache events
   */
  private cleanupEventHandlers(): void {
    // Unsubscribe from all event handlers
    this.eventRefs.forEach((ref) => {
      this.app.vault.offref(ref);
    });

    // Clear the event references array
    this.eventRefs = [];

    console.log("Card Explorer: Event handlers cleaned up");
  }

  /**
   * Check if a file is a markdown file that should trigger updates
   * @param file - The file to check
   * @returns true if the file is a markdown file
   */
  private isMarkdownFile(file: TFile): boolean {
    return file.extension === "md";
  }
}
