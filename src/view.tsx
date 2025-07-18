import { ItemView, type WorkspaceLeaf } from "obsidian";
import { createRoot, type Root } from "react-dom/client";
import { CardView } from "./components/CardView";
import type CardExplorerPlugin from "./main";

/** Card Explorer view identifier - used to identify the view within Obsidian workspace */
export const VIEW_TYPE_CARD_EXPLORER = "card-explorer-view";

/**
 * Card Explorer Obsidian view class
 *
 * This class extends Obsidian's ItemView and serves as the bridge between
 * the React component tree and Obsidian's workspace system.
 *
 * Key responsibilities:
 * - Mount and unmount React application
 * - Manage Obsidian view lifecycle
 * - Bridge between plugin and React components
 */
export class CardExplorerView extends ItemView {
  /** Reference to the plugin instance - used for settings and API access */
  private readonly plugin: CardExplorerPlugin;

  /** React root DOM element - created using React 18's createRoot API */
  private root: Root | null = null;

  /** Container element where React components are mounted - base point for DOM operations */
  private containerElement: HTMLElement | null = null;

  /**
   * CardExplorerView constructor
   * @param leaf - Obsidian workspace leaf
   * @param plugin - Card Explorer plugin instance
   */
  constructor(leaf: WorkspaceLeaf, plugin: CardExplorerPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  /**
   * Returns the view type identifier
   * @returns View identifier string
   */
  getViewType(): string {
    return VIEW_TYPE_CARD_EXPLORER;
  }

  /**
   * Returns the display name of the view
   * @returns View title string
   */
  getDisplayText(): string {
    return "Card Explorer";
  }

  /**
   * Returns the icon for the view
   * @returns Icon name string
   */
  getIcon(): string {
    return "layout-grid";
  }

  /**
   * Initialization process when the view is opened
   * Mounts React components and sets up basic styling
   */
  async onOpen(): Promise<void> {
    // Get content container (skip header)
    const container = this.containerEl.children[1];
    container.empty();

    // Create React mount point
    this.containerElement = container.createEl("div", {
      cls: "card-explorer-container",
    });

    // Create React root and mount main CardView component
    this.root = createRoot(this.containerElement);

    // Render main CardView component
    // Pass plugin instance as props
    this.root.render(<CardView plugin={this.plugin} />);
  }

  /**
   * Cleanup process when the view is closed
   * Unmounts React root and clears references
   */
  async onClose(): Promise<void> {
    // Clean up React root
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }

    // Clear container reference
    this.containerElement = null;
  }

  /**
   * Method to re-render the React component tree
   * Used to update CardView component when necessary
   */
  refresh(): void {
    if (this.root && this.containerElement) {
      this.root.render(<CardView plugin={this.plugin} />);
    }
  }

  /**
   * Updates note data in the store
   * Called by the plugin to trigger note reloading
   */
  async refreshNotes(): Promise<void> {
    // Dynamically import store to avoid circular dependencies
    const { useCardExplorerStore } = await import("./store/cardExplorerStore");
    const store = useCardExplorerStore.getState();

    // Trigger note update in store
    await store.refreshNotes(this.plugin.app);
  }
}
