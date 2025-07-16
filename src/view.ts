import { ItemView, type WorkspaceLeaf } from "obsidian";
import type CardExplorerPlugin from "./main";

export const VIEW_TYPE_CARD_EXPLORER = "card-explorer-view";

export class CardExplorerView extends ItemView {
  plugin: CardExplorerPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: CardExplorerPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_CARD_EXPLORER;
  }

  getDisplayText(): string {
    return "Card Explorer";
  }

  getIcon(): string {
    return "layout-grid";
  }

  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1];
    container.empty();

    // Create a placeholder for now - React components will be mounted here in later tasks
    const placeholder = container.createEl("div", {
      cls: "card-explorer-placeholder",
      text: "Card Explorer will be implemented here",
    });

    // Add some basic styling
    placeholder.style.padding = "20px";
    placeholder.style.textAlign = "center";
    placeholder.style.color = "var(--text-muted)";
  }

  async onClose(): Promise<void> {
    // Cleanup will be implemented when React components are added
  }
}
