import { Plugin, type WorkspaceLeaf } from "obsidian";
import { type CardExplorerSettings, CardExplorerSettingTab, DEFAULT_SETTINGS } from "./settings";
import { CardExplorerView, VIEW_TYPE_CARD_EXPLORER } from "./view";

export default class CardExplorerPlugin extends Plugin {
  settings: CardExplorerSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    // Load settings
    await this.loadSettings();

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

    // Auto-start if enabled
    if (this.settings.autoStart) {
      // Delay to ensure workspace is ready
      this.app.workspace.onLayoutReady(() => {
        this.activateView();
      });
    }
  }

  async onunload(): Promise<void> {
    // Cleanup - detach all Card Explorer views
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_CARD_EXPLORER);
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
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
}
