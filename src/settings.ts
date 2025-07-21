import { type App, PluginSettingTab, Setting } from "obsidian";
import type CardExplorerPlugin from "./main";

/**
 * Interface defining all configurable settings for the Card View Explorer plugin
 *
 * These settings can be changed in Obsidian's settings screen and control plugin behavior.
 * Settings are persisted in the plugin's data.json file and loaded on plugin startup.
 *
 * This interface is used throughout the plugin to ensure type safety when accessing settings.
 */
export interface CardExplorerSettings {
  /**
   * Frontmatter field name used for sorting notes
   *
   * When sorting notes, the plugin will look for this field in each note's frontmatter.
   * If the field doesn't exist in a note, it falls back to the file's modification time.
   *
   * @example
   * ```yaml
   * # In note frontmatter:
   * ---
   * updated: 2024-01-15
   * created: 2024-01-01
   * priority: high
   * ---
   * ```
   *
   * Common values:
   * - "updated": Sort by `updated` field in frontmatter
   * - "created": Sort by `created` field in frontmatter
   * - "priority": Sort by `priority` field in frontmatter
   *
   * @default "updated"
   */
  sortKey: string;

  /**
   * Whether to automatically open Card View Explorer when Obsidian starts
   *
   * When enabled, the Card View Explorer view will be automatically opened
   * when Obsidian finishes loading the workspace layout.
   *
   * @default false
   */
  autoStart: boolean;

  /**
   * Whether to display Card View Explorer in sidebar instead of main area
   *
   * Controls the default location where Card View Explorer opens:
   * - `true`: Opens in the right sidebar as a side panel
   * - `false`: Opens in the main workspace area as a tab
   *
   * Users can still move the view between sidebar and main area manually.
   *
   * @default false
   */
  showInSidebar: boolean;
}

/**
 * Default settings used when plugin is first installed or when settings are missing from saved data
 *
 * These values are used as fallbacks when:
 * - Plugin is installed for the first time
 * - Settings file is corrupted or missing
 * - Individual setting values are invalid or missing
 *
 * @constant
 * @type {CardExplorerSettings}
 */
export const DEFAULT_SETTINGS: CardExplorerSettings = {
  /** Sort by `updated` field in frontmatter, fallback to file modification time */
  sortKey: "updated",
  /** Auto-start disabled - requires manual opening via command or ribbon */
  autoStart: false,
  /** Display in main workspace area, not in sidebar */
  showInSidebar: false,
};

/**
 * Card View Explorer plugin settings tab class
 *
 * Extends Obsidian's PluginSettingTab to provide a user interface for configuring
 * plugin behavior. This tab appears in Obsidian's settings screen under the
 * "Community plugins" section.
 *
 * The settings tab provides controls for:
 * - Sort key configuration (text input field)
 * - Auto-start enable/disable (toggle switch)
 * - Sidebar display enable/disable (toggle switch)
 *
 * All setting changes are automatically saved to the plugin's data.json file.
 *
 * @extends PluginSettingTab
 */
export class CardExplorerSettingTab extends PluginSettingTab {
  /** Reference to plugin instance - used for reading current settings and saving changes */
  private readonly plugin: CardExplorerPlugin;

  /**
   * Create new settings tab instance
   *
   * @param app - Obsidian app instance for accessing workspace and vault APIs
   * @param plugin - Card View Explorer plugin instance for settings access
   */
  constructor(app: App, plugin: CardExplorerPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  /**
   * Render settings UI elements
   *
   * Called by Obsidian when this tab is selected in the settings screen.
   * Creates interactive UI elements for each configurable setting and sets up
   * event handlers to save changes immediately when users modify values.
   *
   * The method rebuilds the entire UI each time it's called, ensuring the
   * displayed values always reflect the current settings state.
   *
   * @public
   * @returns {void}
   */
  display(): void {
    const { containerEl } = this;
    const settings = this.plugin.getSettings();

    // Clear any existing content from previous renders
    containerEl.empty();

    // Add main heading for the settings section
    containerEl.createEl("h2", { text: "Card View Explorer Settings" });

    // Sort key setting - Configure which frontmatter field to use for sorting notes
    this.addSortKeySetting(containerEl, settings);

    // Auto-start setting - Configure whether to automatically open Card View Explorer when Obsidian starts
    this.addAutoStartSetting(containerEl, settings);

    // Sidebar display setting - Configure whether to display Card View Explorer in sidebar instead of main area
    this.addSidebarDisplaySetting(containerEl, settings);
  }

  /**
   * Add sort key setting control
   *
   * Creates a text input field for users to specify which frontmatter field
   * should be used for sorting notes. If the field is empty, defaults to "updated".
   *
   * @param containerEl - HTML element to add the setting to
   * @param settings - Current plugin settings
   */
  private addSortKeySetting(containerEl: HTMLElement, settings: CardExplorerSettings) {
    new Setting(containerEl)
      .setName("Sort key")
      .setDesc("Frontmatter field to use for sorting (fallback to file modification time)")
      .addText((text) =>
        text
          .setPlaceholder("updated")
          .setValue(settings.sortKey)
          .onChange(async (value) => {
            // Use default value if user clears the field
            const sortKey = value.trim() || "updated";
            this.plugin.updateSetting("sortKey", sortKey);
            await this.plugin.saveSettings();
          })
      );
  }

  /**
   * Add auto-start setting control
   *
   * Creates a toggle switch for users to enable/disable automatic opening
   * of Card View Explorer when Obsidian starts up.
   *
   * @param containerEl - HTML element to add the setting to
   * @param settings - Current plugin settings
   */
  private addAutoStartSetting(containerEl: HTMLElement, settings: CardExplorerSettings) {
    new Setting(containerEl)
      .setName("Auto-start")
      .setDesc("Automatically open Card View Explorer when Obsidian starts")
      .addToggle((toggle) =>
        toggle.setValue(settings.autoStart).onChange(async (value) => {
          this.plugin.updateSetting("autoStart", value);
          await this.plugin.saveSettings();
        })
      );
  }

  /**
   * Add sidebar display setting control
   *
   * Creates a toggle switch for users to choose whether Card View Explorer
   * should open in the sidebar or main workspace area by default.
   *
   * @param containerEl - HTML element to add the setting to
   * @param settings - Current plugin settings
   */
  private addSidebarDisplaySetting(containerEl: HTMLElement, settings: CardExplorerSettings) {
    new Setting(containerEl)
      .setName("Show in sidebar")
      .setDesc("Display Card View Explorer in the sidebar instead of main area")
      .addToggle((toggle) =>
        toggle.setValue(settings.showInSidebar).onChange(async (value) => {
          this.plugin.updateSetting("showInSidebar", value);
          await this.plugin.saveSettings();
        })
      );
  }
}
