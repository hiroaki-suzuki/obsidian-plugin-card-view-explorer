/**
 * Mock implementation of Obsidian API for testing
 *
 * Provides minimal mock implementations of Obsidian classes and interfaces
 * to enable unit testing without requiring the full Obsidian environment.
 */

/**
 * Mock implementation of Obsidian's ItemView class
 * Used for testing view-related functionality
 */
export class ItemView {
  containerEl = {
    children: [
      null, // Header element
      {
        empty: () => {},
        createEl: (_tag: string, attrs?: any) => ({
          style: {} as CSSStyleDeclaration,
          classList: {
            add: () => {},
            remove: () => {},
          },
          setAttribute: () => {},
          textContent: attrs?.text || "",
        }),
      },
    ],
  };
}

/**
 * Mock implementation of Obsidian's Plugin class
 * Provides basic plugin lifecycle methods for testing
 */
export class Plugin {
  app: any;
  manifest: any;

  constructor(app: any, manifest: any) {
    this.app = app;
    this.manifest = manifest;
  }

  /** Mock plugin initialization */
  async onload() {}
  /** Mock plugin cleanup */
  async onunload() {}
  /** Mock data loading - returns empty object by default */
  async loadData() {
    return {};
  }
  /** Mock data saving - no-op implementation */
  async saveData(_data: any) {}
  /** Mock command registration */
  addCommand(_command: any) {}
  /** Mock ribbon icon registration */
  addRibbonIcon(_icon: string, _title: string, _callback: () => void) {}
  /** Mock settings tab registration */
  addSettingTab(_tab: any) {}
  /** Mock view registration */
  registerView(_type: string, _viewCreator: (leaf: WorkspaceLeaf) => ItemView) {}
}

/** Mock type for Obsidian's WorkspaceLeaf */
export type WorkspaceLeaf = Record<string, unknown>;

/**
 * Mock implementation of Obsidian's PluginSettingTab class
 * Used for testing settings-related functionality
 */
export class PluginSettingTab {
  /** Mock settings display method */
  display() {}
}

/**
 * Mock implementation of Obsidian's Setting class
 * Provides fluent API for building settings UI in tests
 */
export class Setting {
  /** Mock setting name configuration */
  setName(_name: string) {
    return this;
  }
  /** Mock setting description configuration */
  setDesc(_desc: string) {
    return this;
  }
  /** Mock toggle control addition */
  addToggle(_cb: (toggle: any) => void) {
    return this;
  }
  /** Mock dropdown control addition */
  addDropdown(_cb: (dropdown: any) => void) {
    return this;
  }
  /** Mock text input control addition */
  addText(_cb: (text: any) => void) {
    return this;
  }
}

/**
 * Mock implementation of Obsidian's Notice class
 * Used for testing notification functionality
 */
export class Notice {}

/**
 * Mock implementation of Obsidian's TFile class
 * Used for testing file operations
 */
export class TFile {
  extension: string;
  path: string;
  name: string;

  constructor(extension: string, path: string, name?: string) {
    this.extension = extension;
    this.path = path;
    this.name = name || path.split('/').pop() || '';
  }
}

/**
 * Mock implementation of Obsidian's TAbstractFile class
 * Base class for file system objects
 */
export class TAbstractFile {
  path: string;
  name: string;

  constructor(path: string, name?: string) {
    this.path = path;
    this.name = name || path.split('/').pop() || '';
  }
}
