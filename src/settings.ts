import { type App, PluginSettingTab, Setting } from "obsidian";
import type CardExplorerPlugin from "./main";

/**
 * Interface defining all configurable settings for the Card Explorer plugin
 *
 * These settings can be changed in Obsidian's settings screen and control plugin behavior.
 * Settings are persisted in the data.json file.
 *
 * This interface is used throughout the plugin to ensure type safety.
 */
export interface CardExplorerSettings {
  /**
   * Frontmatter field name used for sorting notes
   *
   * Examples:
   * - "updated": Sort by `updated` field in frontmatter
   * - "created": Sort by `created` field in frontmatter
   * - "priority": Sort by `priority` field in frontmatter
   *
   * Falls back to file modification time if specified field doesn't exist
   *
   * @type {string} Frontmatter field name
   */
  sortKey: string;

  /**
   * Whether to automatically open Card Explorer when Obsidian starts
   *
   * true: Automatically open Card Explorer view on Obsidian startup
   * false: Requires manual opening of Card Explorer
   *
   * @type {boolean} Auto-start enabled/disabled
   */
  autoStart: boolean;

  /**
   * Whether to display Card Explorer in sidebar instead of main area
   *
   * true: Display Card Explorer in right sidebar
   * false: Display Card Explorer in main workspace area
   *
   * @type {boolean} Sidebar display enabled/disabled
   */
  showInSidebar: boolean;
}

/**
 * Default settings used when plugin is first installed or
 * when settings are missing from saved data
 *
 * Default values explanation:
 * - sortKey: "updated" - Sort by `updated` field in frontmatter
 * - autoStart: false - Auto-start disabled (requires manual opening)
 * - showInSidebar: false - Display in main area (not sidebar)
 */
export const DEFAULT_SETTINGS: CardExplorerSettings = {
  sortKey: "updated",
  autoStart: false,
  showInSidebar: false,
};

/**
 * Card Explorer plugin settings tab class
 *
 * Extends Obsidian's PluginSettingTab to provide UI for users
 * to configure plugin behavior.
 *
 * Provided settings:
 * - Sort key configuration (text input)
 * - Auto-start enable/disable (toggle switch)
 * - Sidebar display enable/disable (toggle switch)
 */
export class CardExplorerSettingTab extends PluginSettingTab {
  /** Reference to plugin instance - used for reading and writing settings */
  private readonly plugin: CardExplorerPlugin;

  /**
   * Create new settings tab instance
   *
   * @param app - Obsidian app instance
   * @param plugin - Card Explorer plugin instance
   */
  constructor(app: App, plugin: CardExplorerPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  /**
   * Render settings UI
   *
   * Called when this tab is selected in Obsidian's settings screen.
   * Creates UI elements for each setting and sets up change handlers.
   *
   * Process flow:
   * 1. Clear existing content
   * 2. Display title
   * 3. Create UI elements for each setting
   * 4. Set up event handlers for changes
   */
  display(): void {
    const { containerEl } = this;
    const settings = this.plugin.getSettings();

    containerEl.empty();

    containerEl.createEl("h2", { text: "Card Explorer Settings" });

    // Sort key setting
    // Configure which frontmatter field to use for sorting notes
    this.addSortKeySetting(containerEl, settings);

    // Auto-start setting
    // Configure whether to automatically open Card Explorer when Obsidian starts
    this.addAutoStartSetting(containerEl, settings);

    // Sidebar display setting
    // Configure whether to display Card Explorer in sidebar instead of main area
    this.addSidebarDisplaySetting(containerEl, settings);
  }

  private addSortKeySetting(containerEl: HTMLElement, settings: CardExplorerSettings) {
    new Setting(containerEl)
      .setName("Sort key")
      .setDesc("Frontmatter field to use for sorting (fallback to file modification time)")
      .addText((text) =>
        text
          .setPlaceholder("updated")
          .setValue(settings.sortKey)
          .onChange(async (value) => {
            // Use default value if empty
            // Update setting and save
            this.plugin.updateSetting("sortKey", value || "updated");
            await this.plugin.saveSettings();
          })
      );
  }

  private addAutoStartSetting(containerEl: HTMLElement, settings: CardExplorerSettings) {
    new Setting(containerEl)
      .setName("Auto-start")
      .setDesc("Automatically open Card Explorer when Obsidian starts")
      .addToggle((toggle) =>
        toggle.setValue(settings.autoStart).onChange(async (value) => {
          // Update setting and save
          this.plugin.updateSetting("autoStart", value);
          await this.plugin.saveSettings();
        })
      );
  }

  private addSidebarDisplaySetting(containerEl: HTMLElement, settings: CardExplorerSettings) {
    new Setting(containerEl)
      .setName("Show in sidebar")
      .setDesc("Display Card Explorer in the sidebar instead of main area")
      .addToggle((toggle) =>
        toggle.setValue(settings.showInSidebar).onChange(async (value) => {
          // Update setting and save
          this.plugin.updateSetting("showInSidebar", value);
          await this.plugin.saveSettings();
        })
      );
  }
}
