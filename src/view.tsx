import { ItemView, type WorkspaceLeaf } from "obsidian";
import { createRoot, type Root } from "react-dom/client";
import { CardView } from "./components/CardView";
import type CardExplorerPlugin from "./main";

/**
 * Card View Explorer view identifier - used to identify the view within Obsidian workspace
 * This constant is used by Obsidian to register and manage the view type
 */
export const VIEW_TYPE_CARD_EXPLORER = "card-view-explorer-view";

/**
 * Card View Explorer Obsidian view class
 *
 * This class extends Obsidian's ItemView and serves as the bridge between
 * the React component tree and Obsidian's workspace system.
 *
 * Key responsibilities:
 * - Mount and unmount React application
 * - Manage Obsidian view lifecycle
 * - Bridge between plugin and React components
 * - Handle view refresh and note data updates
 */
export class CardExplorerView extends ItemView {
  /** Reference to the plugin instance - provides access to settings and Obsidian app APIs */
  private readonly plugin: CardExplorerPlugin;

  /** React root DOM element - created using React 18's createRoot API for concurrent features */
  private root: Root | null = null;

  /** Container element where React components are mounted - serves as the React app's DOM root */
  private containerElement: HTMLElement | null = null;

  /**
   * CardExplorerView constructor
   *
   * Initializes the view with the workspace leaf and plugin instance.
   * The leaf represents the view's position in Obsidian's workspace layout.
   *
   * @param leaf - Obsidian workspace leaf that will contain this view
   * @param plugin - Card View Explorer plugin instance for accessing app APIs and settings
   */
  constructor(leaf: WorkspaceLeaf, plugin: CardExplorerPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  /**
   * Returns the view type identifier
   *
   * This identifier is used by Obsidian to distinguish this view type
   * from other views in the workspace system.
   *
   * @returns The unique view type identifier string
   */
  getViewType(): string {
    return VIEW_TYPE_CARD_EXPLORER;
  }

  /**
   * Returns the display name of the view
   *
   * This name appears in Obsidian's UI elements like tabs, command palette,
   * and view switcher menus.
   *
   * @returns The human-readable view title
   */
  getDisplayText(): string {
    return "Card View Explorer";
  }

  /**
   * Returns the icon for the view
   *
   * Uses Obsidian's built-in icon system. The "layout-grid" icon
   * represents the card-based layout of this view.
   *
   * @returns The icon identifier from Obsidian's icon set
   */
  getIcon(): string {
    return "layout-grid";
  }

  /**
   * Initialization process when the view is opened
   *
   * This method is called by Obsidian when the view becomes active.
   * It sets up the DOM structure and mounts the React application.
   *
   * The process:
   * 1. Clear any existing content from the container
   * 2. Create a dedicated div for React mounting
   * 3. Initialize React 18's concurrent root
   * 4. Render the main CardView component
   */
  async onOpen(): Promise<void> {
    // Get content container (skip header) - containerEl.children[1] is the main content area
    const container = this.containerEl.children[1];
    container.empty();

    // Create React mount point with CSS class for styling
    this.containerElement = container.createEl("div", {
      cls: "card-view-explorer-container",
    });

    // Create React root using React 18's createRoot API for concurrent features
    this.root = createRoot(this.containerElement);

    // Render main CardView component with plugin instance for API access
    this.root.render(<CardView plugin={this.plugin} />);
  }

  /**
   * Cleanup process when the view is closed
   *
   * This method is called by Obsidian when the view is being destroyed.
   * It properly unmounts the React application and clears all references
   * to prevent memory leaks.
   */
  async onClose(): Promise<void> {
    // Clean up React root to prevent memory leaks
    if (this.root) {
      this.root.unmount();
      this.root = null;
    }

    // Clear container reference
    this.containerElement = null;
  }

  /**
   * Re-renders the React component tree
   *
   * This method can be called to force a complete re-render of the
   * React application, useful when plugin settings change or when
   * manual refresh is needed.
   */
  refresh(): void {
    if (this.root && this.containerElement) {
      this.root.render(<CardView plugin={this.plugin} />);
    }
  }

  /**
   * Updates note data in the store
   *
   * This method is called by the plugin to trigger a refresh of note data
   * from the Obsidian vault. It uses dynamic import to avoid circular
   * dependencies between the view and store modules.
   *
   * @throws Will handle errors gracefully through the store's error handling system
   */
  async refreshNotes(): Promise<void> {
    // Dynamically import store to avoid circular dependencies
    const { useCardExplorerStore } = await import("./store/cardExplorerStore");
    const store = useCardExplorerStore.getState();

    // Trigger note update in store - this will reload all notes from the vault
    await store.refreshNotes(this.plugin.app);
  }
}
