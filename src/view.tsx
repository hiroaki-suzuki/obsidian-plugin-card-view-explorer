import { ItemView, type WorkspaceLeaf } from "obsidian";
import { createRoot, type Root } from "react-dom/client";
import { CardView } from "./components/CardView";
import type CardExplorerPlugin from "./main";

export const VIEW_TYPE_CARD_EXPLORER = "card-explorer-view";

export class CardExplorerView extends ItemView {
  plugin: CardExplorerPlugin;
  private root: Root | null = null;
  private containerElement: HTMLElement | null = null;

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
    // Get the content container (skip the header)
    const container = this.containerEl.children[1];
    container.empty();

    // Create the React mount point
    this.containerElement = container.createEl("div", {
      cls: "card-explorer-container",
    });

    // Set up basic styling for the container
    this.containerElement.style.height = "100%";
    this.containerElement.style.width = "100%";
    this.containerElement.style.display = "flex";
    this.containerElement.style.flexDirection = "column";

    // Create React root and mount the main CardView component
    this.root = createRoot(this.containerElement);

    // Render the main CardView component
    this.root.render(<CardView plugin={this.plugin} />);
  }

  async onClose(): Promise<void> {
    // Cleanup React root
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }

    // Clear container reference
    this.containerElement = null;
  }

  /**
   * Method to re-render the React component tree
   * Used to refresh the CardView component when needed
   */
  refresh(): void {
    if (this.root && this.containerElement) {
      this.root.render(<CardView plugin={this.plugin} />);
    }
  }

  /**
   * Refresh notes data in the store
   * Called by the plugin to trigger note reload
   */
  async refreshNotes(): Promise<void> {
    // Import the store dynamically to avoid circular dependencies
    const { useCardExplorerStore } = await import("./store/cardExplorerStore");
    const store = useCardExplorerStore.getState();

    // Trigger note refresh in the store
    await store.refreshNotes(this.plugin.app);
  }
}
