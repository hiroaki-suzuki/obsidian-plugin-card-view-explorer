import { describe, expect, it } from "vitest";
import type { FilterState, PluginData, PluginSettings, SortConfig } from "../types";
import { validatePluginData, validatePluginSettings } from "./validation";

// Helper function to create valid FilterState
const createValidFilterState = (): FilterState => ({
  folders: ["folder1", "folder2"],
  tags: ["tag1", "tag2"],
  filename: "test",
  dateRange: {
    type: "within",
    value: new Date("2023-01-01"),
  },
  excludeFolders: ["exclude1"],
  excludeTags: ["excludeTag1"],
  excludeFilenames: ["exclude.md"],
});

// Helper function to create valid SortConfig
const createValidSortConfig = (): SortConfig => ({
  key: "updated",
  order: "desc",
});

// Helper function to create valid PluginSettings
const createValidPluginSettings = (): PluginSettings => ({
  sortKey: "updated",
  autoStart: true,
  showInSidebar: false,
});

// Helper function to create valid PluginData
const createValidPluginData = (): PluginData => ({
  pinnedNotes: ["note1.md", "note2.md"],
  lastFilters: createValidFilterState(),
  sortConfig: createValidSortConfig(),
  version: 1,
  _backups: [
    {
      timestamp: Date.now(),
      version: 1,
      data: {
        pinnedNotes: ["backup-note.md"],
        lastFilters: createValidFilterState(),
        sortConfig: createValidSortConfig(),
      },
    },
  ],
});

describe("validatePluginSettings", () => {
  it("should validate correct PluginSettings", () => {
    const validSettings = createValidPluginSettings();
    expect(validatePluginSettings(validSettings)).toBe(true);
  });

  it("should reject null or undefined", () => {
    expect(validatePluginSettings(null)).toBe(false);
    expect(validatePluginSettings(undefined)).toBe(false);
  });

  it("should reject non-object values", () => {
    expect(validatePluginSettings("string")).toBe(false);
    expect(validatePluginSettings(123)).toBe(false);
    expect(validatePluginSettings([])).toBe(false);
  });

  it("should reject missing sortKey", () => {
    const settings = { autoStart: true, showInSidebar: false };
    expect(validatePluginSettings(settings)).toBe(false);
  });

  it("should reject non-string sortKey", () => {
    const settings = { sortKey: 123, autoStart: true, showInSidebar: false };
    expect(validatePluginSettings(settings)).toBe(false);
  });

  it("should reject missing autoStart", () => {
    const settings = { sortKey: "updated", showInSidebar: false };
    expect(validatePluginSettings(settings)).toBe(false);
  });

  it("should reject non-boolean autoStart", () => {
    const settings = { sortKey: "updated", autoStart: "true", showInSidebar: false };
    expect(validatePluginSettings(settings)).toBe(false);
  });

  it("should reject missing showInSidebar", () => {
    const settings = { sortKey: "updated", autoStart: true };
    expect(validatePluginSettings(settings)).toBe(false);
  });

  it("should reject non-boolean showInSidebar", () => {
    const settings = { sortKey: "updated", autoStart: true, showInSidebar: "false" };
    expect(validatePluginSettings(settings)).toBe(false);
  });
});

describe("validatePluginData", () => {
  it("should validate correct PluginData", () => {
    const validData = createValidPluginData();
    expect(validatePluginData(validData)).toBe(true);
  });

  it("should validate PluginData without optional properties", () => {
    const minimalData = {
      pinnedNotes: [],
      lastFilters: createValidFilterState(),
      sortConfig: createValidSortConfig(),
    };
    expect(validatePluginData(minimalData)).toBe(true);
  });

  it("should reject null or undefined", () => {
    expect(validatePluginData(null)).toBe(false);
    expect(validatePluginData(undefined)).toBe(false);
  });

  it("should reject non-object values", () => {
    expect(validatePluginData("string")).toBe(false);
    expect(validatePluginData(123)).toBe(false);
    expect(validatePluginData([])).toBe(false);
  });

  describe("pinnedNotes validation", () => {
    it("should reject missing pinnedNotes", () => {
      const data = {
        lastFilters: createValidFilterState(),
        sortConfig: createValidSortConfig(),
      };
      expect(validatePluginData(data)).toBe(false);
    });

    it("should reject non-array pinnedNotes", () => {
      const data = {
        pinnedNotes: "not-array",
        lastFilters: createValidFilterState(),
        sortConfig: createValidSortConfig(),
      };
      expect(validatePluginData(data)).toBe(false);
    });

    it("should reject pinnedNotes with non-string elements", () => {
      const data = {
        pinnedNotes: ["valid.md", 123, "another.md"],
        lastFilters: createValidFilterState(),
        sortConfig: createValidSortConfig(),
      };
      expect(validatePluginData(data)).toBe(false);
    });

    it("should accept empty pinnedNotes array", () => {
      const data = {
        pinnedNotes: [],
        lastFilters: createValidFilterState(),
        sortConfig: createValidSortConfig(),
      };
      expect(validatePluginData(data)).toBe(true);
    });
  });

  describe("lastFilters validation", () => {
    it("should reject missing lastFilters", () => {
      const data = {
        pinnedNotes: [],
        sortConfig: createValidSortConfig(),
      };
      expect(validatePluginData(data)).toBe(false);
    });

    it("should reject invalid lastFilters", () => {
      const data = {
        pinnedNotes: [],
        lastFilters: { invalid: "filter" },
        sortConfig: createValidSortConfig(),
      };
      expect(validatePluginData(data)).toBe(false);
    });
  });

  describe("sortConfig validation", () => {
    it("should reject missing sortConfig", () => {
      const data = {
        pinnedNotes: [],
        lastFilters: createValidFilterState(),
      };
      expect(validatePluginData(data)).toBe(false);
    });

    it("should reject invalid sortConfig", () => {
      const data = {
        pinnedNotes: [],
        lastFilters: createValidFilterState(),
        sortConfig: { invalid: "config" },
      };
      expect(validatePluginData(data)).toBe(false);
    });
  });

  describe("version validation", () => {
    it("should accept valid version number", () => {
      const data = {
        pinnedNotes: [],
        lastFilters: createValidFilterState(),
        sortConfig: createValidSortConfig(),
        version: 2,
      };
      expect(validatePluginData(data)).toBe(true);
    });

    it("should reject non-number version", () => {
      const data = {
        pinnedNotes: [],
        lastFilters: createValidFilterState(),
        sortConfig: createValidSortConfig(),
        version: "1",
      };
      expect(validatePluginData(data)).toBe(false);
    });
  });

  describe("_backups validation", () => {
    it("should accept valid backups array", () => {
      const data = createValidPluginData();
      expect(validatePluginData(data)).toBe(true);
    });

    it("should accept empty backups array", () => {
      const data = {
        pinnedNotes: [],
        lastFilters: createValidFilterState(),
        sortConfig: createValidSortConfig(),
        _backups: [],
      };
      expect(validatePluginData(data)).toBe(true);
    });

    it("should reject non-array _backups", () => {
      const data = {
        pinnedNotes: [],
        lastFilters: createValidFilterState(),
        sortConfig: createValidSortConfig(),
        _backups: "not-array",
      };
      expect(validatePluginData(data)).toBe(false);
    });

    it("should reject backup with missing timestamp", () => {
      const data = {
        pinnedNotes: [],
        lastFilters: createValidFilterState(),
        sortConfig: createValidSortConfig(),
        _backups: [
          {
            version: 1,
            data: {
              pinnedNotes: [],
              lastFilters: createValidFilterState(),
              sortConfig: createValidSortConfig(),
            },
          },
        ],
      };
      expect(validatePluginData(data)).toBe(false);
    });

    it("should reject backup with non-number timestamp", () => {
      const data = {
        pinnedNotes: [],
        lastFilters: createValidFilterState(),
        sortConfig: createValidSortConfig(),
        _backups: [
          {
            timestamp: "not-number",
            version: 1,
            data: {
              pinnedNotes: [],
              lastFilters: createValidFilterState(),
              sortConfig: createValidSortConfig(),
            },
          },
        ],
      };
      expect(validatePluginData(data)).toBe(false);
    });

    it("should reject backup with missing version", () => {
      const data = {
        pinnedNotes: [],
        lastFilters: createValidFilterState(),
        sortConfig: createValidSortConfig(),
        _backups: [
          {
            timestamp: Date.now(),
            data: {
              pinnedNotes: [],
              lastFilters: createValidFilterState(),
              sortConfig: createValidSortConfig(),
            },
          },
        ],
      };
      expect(validatePluginData(data)).toBe(false);
    });

    it("should reject backup with non-number version", () => {
      const data = {
        pinnedNotes: [],
        lastFilters: createValidFilterState(),
        sortConfig: createValidSortConfig(),
        _backups: [
          {
            timestamp: Date.now(),
            version: "1",
            data: {
              pinnedNotes: [],
              lastFilters: createValidFilterState(),
              sortConfig: createValidSortConfig(),
            },
          },
        ],
      };
      expect(validatePluginData(data)).toBe(false);
    });

    it("should reject backup with missing data", () => {
      const data = {
        pinnedNotes: [],
        lastFilters: createValidFilterState(),
        sortConfig: createValidSortConfig(),
        _backups: [
          {
            timestamp: Date.now(),
            version: 1,
          },
        ],
      };
      expect(validatePluginData(data)).toBe(false);
    });

    it("should reject backup with invalid data.pinnedNotes", () => {
      const data = {
        pinnedNotes: [],
        lastFilters: createValidFilterState(),
        sortConfig: createValidSortConfig(),
        _backups: [
          {
            timestamp: Date.now(),
            version: 1,
            data: {
              pinnedNotes: "not-array",
              lastFilters: createValidFilterState(),
              sortConfig: createValidSortConfig(),
            },
          },
        ],
      };
      expect(validatePluginData(data)).toBe(false);
    });

    it("should reject backup with invalid data.lastFilters", () => {
      const data = {
        pinnedNotes: [],
        lastFilters: createValidFilterState(),
        sortConfig: createValidSortConfig(),
        _backups: [
          {
            timestamp: Date.now(),
            version: 1,
            data: {
              pinnedNotes: [],
              lastFilters: { invalid: "filter" },
              sortConfig: createValidSortConfig(),
            },
          },
        ],
      };
      expect(validatePluginData(data)).toBe(false);
    });

    it("should reject backup with invalid data.sortConfig", () => {
      const data = {
        pinnedNotes: [],
        lastFilters: createValidFilterState(),
        sortConfig: createValidSortConfig(),
        _backups: [
          {
            timestamp: Date.now(),
            version: 1,
            data: {
              pinnedNotes: [],
              lastFilters: createValidFilterState(),
              sortConfig: { invalid: "config" },
            },
          },
        ],
      };
      expect(validatePluginData(data)).toBe(false);
    });
  });
});

// Tests for internal validateFilterState function (through validatePluginData)
describe("FilterState validation (via validatePluginData)", () => {
  const createDataWithFilterState = (filterState: any) => ({
    pinnedNotes: [],
    lastFilters: filterState,
    sortConfig: createValidSortConfig(),
  });

  it("should reject null filterState", () => {
    const data = createDataWithFilterState(null);
    expect(validatePluginData(data)).toBe(false);
  });

  it("should reject non-object filterState", () => {
    const data = createDataWithFilterState("not-object");
    expect(validatePluginData(data)).toBe(false);
  });

  describe("array properties validation", () => {
    const arrayProps = ["folders", "tags", "excludeFolders", "excludeTags", "excludeFilenames"];

    arrayProps.forEach((prop) => {
      it(`should reject missing ${prop}`, () => {
        const filterState = createValidFilterState();
        delete (filterState as any)[prop];
        const data = createDataWithFilterState(filterState);
        expect(validatePluginData(data)).toBe(false);
      });

      it(`should reject non-array ${prop}`, () => {
        const filterState = createValidFilterState();
        (filterState as any)[prop] = "not-array";
        const data = createDataWithFilterState(filterState);
        expect(validatePluginData(data)).toBe(false);
      });

      it(`should reject ${prop} with non-string elements`, () => {
        const filterState = createValidFilterState();
        (filterState as any)[prop] = ["valid", 123, "another"];
        const data = createDataWithFilterState(filterState);
        expect(validatePluginData(data)).toBe(false);
      });

      it(`should accept empty ${prop} array`, () => {
        const filterState = createValidFilterState();
        (filterState as any)[prop] = [];
        const data = createDataWithFilterState(filterState);
        expect(validatePluginData(data)).toBe(true);
      });
    });
  });

  describe("filename validation", () => {
    it("should reject missing filename", () => {
      const filterState = createValidFilterState();
      delete (filterState as any).filename;
      const data = createDataWithFilterState(filterState);
      expect(validatePluginData(data)).toBe(false);
    });

    it("should reject non-string filename", () => {
      const filterState = createValidFilterState();
      (filterState as any).filename = 123;
      const data = createDataWithFilterState(filterState);
      expect(validatePluginData(data)).toBe(false);
    });

    it("should accept empty string filename", () => {
      const filterState = createValidFilterState();
      filterState.filename = "";
      const data = createDataWithFilterState(filterState);
      expect(validatePluginData(data)).toBe(true);
    });
  });

  describe("dateRange validation", () => {
    it("should accept null dateRange", () => {
      const filterState = createValidFilterState();
      filterState.dateRange = null;
      const data = createDataWithFilterState(filterState);
      expect(validatePluginData(data)).toBe(true);
    });

    it("should reject non-object dateRange (when not null)", () => {
      const filterState = createValidFilterState();
      (filterState as any).dateRange = "not-object";
      const data = createDataWithFilterState(filterState);
      expect(validatePluginData(data)).toBe(false);
    });

    it("should reject dateRange with invalid type", () => {
      const filterState = createValidFilterState();
      (filterState as any).dateRange = {
        type: "invalid",
        value: new Date(),
      };
      const data = createDataWithFilterState(filterState);
      expect(validatePluginData(data)).toBe(false);
    });

    it("should accept dateRange with 'within' type", () => {
      const filterState = createValidFilterState();
      filterState.dateRange = {
        type: "within",
        value: new Date(),
      };
      const data = createDataWithFilterState(filterState);
      expect(validatePluginData(data)).toBe(true);
    });

    it("should accept dateRange with 'after' type", () => {
      const filterState = createValidFilterState();
      filterState.dateRange = {
        type: "after",
        value: new Date(),
      };
      const data = createDataWithFilterState(filterState);
      expect(validatePluginData(data)).toBe(true);
    });

    it("should accept dateRange with Date object value", () => {
      const filterState = createValidFilterState();
      filterState.dateRange = {
        type: "within",
        value: new Date("2023-01-01"),
      };
      const data = createDataWithFilterState(filterState);
      expect(validatePluginData(data)).toBe(true);
    });

    it("should accept dateRange with valid date string value", () => {
      const filterState = createValidFilterState();
      (filterState as any).dateRange = {
        type: "within",
        value: "2023-01-01",
      };
      const data = createDataWithFilterState(filterState);
      expect(validatePluginData(data)).toBe(true);
    });

    it("should reject dateRange with invalid date string value", () => {
      const filterState = createValidFilterState();
      (filterState as any).dateRange = {
        type: "within",
        value: "invalid-date",
      };
      const data = createDataWithFilterState(filterState);
      expect(validatePluginData(data)).toBe(false);
    });

    it("should reject dateRange with non-Date, non-string value", () => {
      const filterState = createValidFilterState();
      (filterState as any).dateRange = {
        type: "within",
        value: 123,
      };
      const data = createDataWithFilterState(filterState);
      expect(validatePluginData(data)).toBe(false);
    });
  });
});

// Tests for internal validateSortConfig function (through validatePluginData)
describe("SortConfig validation (via validatePluginData)", () => {
  const createDataWithSortConfig = (sortConfig: any) => ({
    pinnedNotes: [],
    lastFilters: createValidFilterState(),
    sortConfig,
  });

  it("should reject null sortConfig", () => {
    const data = createDataWithSortConfig(null);
    expect(validatePluginData(data)).toBe(false);
  });

  it("should reject non-object sortConfig", () => {
    const data = createDataWithSortConfig("not-object");
    expect(validatePluginData(data)).toBe(false);
  });

  it("should reject missing key", () => {
    const sortConfig = { order: "desc" };
    const data = createDataWithSortConfig(sortConfig);
    expect(validatePluginData(data)).toBe(false);
  });

  it("should reject non-string key", () => {
    const sortConfig = { key: 123, order: "desc" };
    const data = createDataWithSortConfig(sortConfig);
    expect(validatePluginData(data)).toBe(false);
  });

  it("should reject missing order", () => {
    const sortConfig = { key: "updated" };
    const data = createDataWithSortConfig(sortConfig);
    expect(validatePluginData(data)).toBe(false);
  });

  it("should reject invalid order", () => {
    const sortConfig = { key: "updated", order: "invalid" };
    const data = createDataWithSortConfig(sortConfig);
    expect(validatePluginData(data)).toBe(false);
  });

  it("should accept 'asc' order", () => {
    const sortConfig = { key: "updated", order: "asc" };
    const data = createDataWithSortConfig(sortConfig);
    expect(validatePluginData(data)).toBe(true);
  });

  it("should accept 'desc' order", () => {
    const sortConfig = { key: "updated", order: "desc" };
    const data = createDataWithSortConfig(sortConfig);
    expect(validatePluginData(data)).toBe(true);
  });
});
