import { type App, PluginSettingTab, Setting } from "obsidian";
import type CardExplorerPlugin from "./main";

export interface CardExplorerSettings {
  sortKey: string;
  autoStart: boolean;
  showInSidebar: boolean;
}

export const DEFAULT_SETTINGS: CardExplorerSettings = {
  sortKey: "updated",
  autoStart: false,
  showInSidebar: false,
};

export class CardExplorerSettingTab extends PluginSettingTab {
  plugin: CardExplorerPlugin;

  constructor(app: App, plugin: CardExplorerPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    containerEl.createEl("h2", { text: "Card Explorer Settings" });

    new Setting(containerEl)
      .setName("Sort key")
      .setDesc("Frontmatter field to use for sorting (fallback to file modification time)")
      .addText((text) =>
        text
          .setPlaceholder("updated")
          .setValue(this.plugin.settings.sortKey)
          .onChange(async (value) => {
            this.plugin.settings.sortKey = value || "updated";
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Auto-start")
      .setDesc("Automatically open Card Explorer when Obsidian starts")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.autoStart).onChange(async (value) => {
          this.plugin.settings.autoStart = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("Show in sidebar")
      .setDesc("Display Card Explorer in the sidebar instead of main area")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.showInSidebar).onChange(async (value) => {
          this.plugin.settings.showInSidebar = value;
          await this.plugin.saveSettings();
        })
      );
  }
}
