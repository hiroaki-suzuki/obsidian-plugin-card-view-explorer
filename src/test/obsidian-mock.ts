// Mock implementation of Obsidian API for testing

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

export class Plugin {
  app: any;
  manifest: any;

  constructor(app: any, manifest: any) {
    this.app = app;
    this.manifest = manifest;
  }

  async onload() {}
  async onunload() {}
  async loadData() {
    return {};
  }
  async saveData(_data: any) {}
  addCommand(_command: any) {}
  addRibbonIcon(_icon: string, _title: string, _callback: () => void) {}
  addSettingTab(_tab: any) {}
  registerView(_type: string, _viewCreator: (leaf: WorkspaceLeaf) => ItemView) {}
}

export type WorkspaceLeaf = Record<string, unknown>;

export class PluginSettingTab {
  display() {}
}

export class Setting {
  setName(_name: string) {
    return this;
  }
  setDesc(_desc: string) {
    return this;
  }
  addToggle(_cb: (toggle: any) => void) {
    return this;
  }
  addDropdown(_cb: (dropdown: any) => void) {
    return this;
  }
  addText(_cb: (text: any) => void) {
    return this;
  }
}

export class Notice {}
