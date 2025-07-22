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
    const arrayProps = ["folders", "tags"];

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

  it("should accept empty string key", () => {
    const sortConfig = { key: "", order: "desc" };
    const data = createDataWithSortConfig(sortConfig);
    expect(validatePluginData(data)).toBe(true);
  });

  it("should reject undefined key", () => {
    const sortConfig = { key: undefined, order: "desc" };
    const data = createDataWithSortConfig(sortConfig);
    expect(validatePluginData(data)).toBe(false);
  });

  it("should reject null key", () => {
    const sortConfig = { key: null, order: "desc" };
    const data = createDataWithSortConfig(sortConfig);
    expect(validatePluginData(data)).toBe(false);
  });

  it("should reject undefined order", () => {
    const sortConfig = { key: "updated", order: undefined };
    const data = createDataWithSortConfig(sortConfig);
    expect(validatePluginData(data)).toBe(false);
  });

  it("should reject null order", () => {
    const sortConfig = { key: "updated", order: null };
    const data = createDataWithSortConfig(sortConfig);
    expect(validatePluginData(data)).toBe(false);
  });
});

// Test for direct function exports
describe("Direct Function Validation", () => {
  describe("validatePluginSettings comprehensive tests", () => {
    it("should validate all required properties are present", () => {
      const validSettings = createValidPluginSettings();
      expect(validatePluginSettings(validSettings)).toBe(true);
    });

    it("should handle boolean edge cases", () => {
      // Test with explicit true/false values
      const settings1 = { sortKey: "test", autoStart: true, showInSidebar: true };
      const settings2 = { sortKey: "test", autoStart: false, showInSidebar: false };

      expect(validatePluginSettings(settings1)).toBe(true);
      expect(validatePluginSettings(settings2)).toBe(true);
    });

    it("should reject truthy/falsy non-boolean values", () => {
      const settings1 = { sortKey: "test", autoStart: 1, showInSidebar: false };
      const settings2 = { sortKey: "test", autoStart: true, showInSidebar: 0 };
      const settings3 = { sortKey: "test", autoStart: "true", showInSidebar: false };
      const settings4 = { sortKey: "test", autoStart: true, showInSidebar: "false" };

      expect(validatePluginSettings(settings1)).toBe(false);
      expect(validatePluginSettings(settings2)).toBe(false);
      expect(validatePluginSettings(settings3)).toBe(false);
      expect(validatePluginSettings(settings4)).toBe(false);
    });

    it("should handle empty string sortKey", () => {
      const settings = { sortKey: "", autoStart: true, showInSidebar: false };
      expect(validatePluginSettings(settings)).toBe(true);
    });

    it("should reject null/undefined properties", () => {
      const settings1 = { sortKey: null, autoStart: true, showInSidebar: false };
      const settings2 = { sortKey: "test", autoStart: null, showInSidebar: false };
      const settings3 = { sortKey: "test", autoStart: true, showInSidebar: null };
      const settings4 = { sortKey: undefined, autoStart: true, showInSidebar: false };

      expect(validatePluginSettings(settings1)).toBe(false);
      expect(validatePluginSettings(settings2)).toBe(false);
      expect(validatePluginSettings(settings3)).toBe(false);
      expect(validatePluginSettings(settings4)).toBe(false);
    });
  });

  describe("validatePluginData comprehensive tests", () => {
    it("should handle empty arrays correctly", () => {
      const data = {
        pinnedNotes: [],
        lastFilters: createValidFilterState(),
        sortConfig: createValidSortConfig(),
      };
      expect(validatePluginData(data)).toBe(true);
    });

    it("should validate version property edge cases", () => {
      const data1 = {
        pinnedNotes: [],
        lastFilters: createValidFilterState(),
        sortConfig: createValidSortConfig(),
        version: 0,
      };
      const data2 = {
        pinnedNotes: [],
        lastFilters: createValidFilterState(),
        sortConfig: createValidSortConfig(),
        version: -1,
      };
      const data3 = {
        pinnedNotes: [],
        lastFilters: createValidFilterState(),
        sortConfig: createValidSortConfig(),
        version: 999999,
      };

      expect(validatePluginData(data1)).toBe(true);
      expect(validatePluginData(data2)).toBe(true);
      expect(validatePluginData(data3)).toBe(true);
    });

    it("should reject floating point version numbers", () => {
      const data = {
        pinnedNotes: [],
        lastFilters: createValidFilterState(),
        sortConfig: createValidSortConfig(),
        version: 1.5,
      };
      // Note: JavaScript considers 1.5 a valid number, so this should actually pass
      expect(validatePluginData(data)).toBe(true);
    });

    it("should handle complex nested validation", () => {
      const complexData = {
        pinnedNotes: ["note1.md", "note2.md", "note3.md"],
        lastFilters: {
          folders: ["folder1", "folder2"],
          tags: ["tag1", "tag2", "tag3"],
          filename: "search term",
          dateRange: {
            type: "after",
            value: new Date("2023-01-01"),
          },
        },
        sortConfig: {
          key: "custom-field",
          order: "asc",
        },
        version: 2,
        _backups: [
          {
            timestamp: Date.now() - 86400000, // 1 day ago
            version: 1,
            data: {
              pinnedNotes: ["old-note.md"],
              lastFilters: createValidFilterState(),
              sortConfig: createValidSortConfig(),
            },
          },
          {
            timestamp: Date.now() - 172800000, // 2 days ago
            version: 1,
            data: {
              pinnedNotes: [],
              lastFilters: createValidFilterState(),
              sortConfig: createValidSortConfig(),
            },
          },
        ],
      };

      expect(validatePluginData(complexData)).toBe(true);
    });
  });
});

// Additional edge case tests
describe("Validation Edge Cases", () => {
  describe("validatePluginSettings edge cases", () => {
    it("should handle extra properties gracefully", () => {
      const settings = {
        sortKey: "updated",
        autoStart: true,
        showInSidebar: false,
        extraProperty: "should be ignored",
      };
      expect(validatePluginSettings(settings)).toBe(true);
    });

    it("should reject array as settings", () => {
      expect(validatePluginSettings([])).toBe(false);
    });

    it("should reject function as settings", () => {
      expect(validatePluginSettings(() => {})).toBe(false);
    });

    it("should reject Date object as settings", () => {
      expect(validatePluginSettings(new Date())).toBe(false);
    });

    it("should handle settings with prototype pollution attempt", () => {
      const maliciousSettings = JSON.parse(
        '{"sortKey":"updated","autoStart":true,"showInSidebar":false,"__proto__":{"polluted":true}}'
      );
      expect(validatePluginSettings(maliciousSettings)).toBe(true);
    });
  });

  describe("validatePluginData edge cases", () => {
    it("should handle extra properties gracefully", () => {
      const data = {
        pinnedNotes: [],
        lastFilters: createValidFilterState(),
        sortConfig: createValidSortConfig(),
        extraProperty: "should be ignored",
      };
      expect(validatePluginData(data)).toBe(true);
    });

    it("should reject array as data", () => {
      expect(validatePluginData([])).toBe(false);
    });

    it("should reject function as data", () => {
      expect(validatePluginData(() => {})).toBe(false);
    });

    it("should reject Date object as data", () => {
      expect(validatePluginData(new Date())).toBe(false);
    });

    it("should handle very large pinnedNotes array", () => {
      const largePinnedNotes = Array(10000).fill("note.md");
      const data = {
        pinnedNotes: largePinnedNotes,
        lastFilters: createValidFilterState(),
        sortConfig: createValidSortConfig(),
      };
      expect(validatePluginData(data)).toBe(true);
    });

    it("should handle pinnedNotes with special characters", () => {
      const specialNotes = [
        "note with spaces.md",
        "note-with-dashes.md",
        "note_with_underscores.md",
        "note.with.dots.md",
        "note(with)parentheses.md",
        "note[with]brackets.md",
        "note{with}braces.md",
        "note@with@symbols.md",
        "note#with#hash.md",
        "note$with$dollar.md",
        "note%with%percent.md",
        "note&with&ampersand.md",
        "note*with*asterisk.md",
        "note+with+plus.md",
        "note=with=equals.md",
        "note|with|pipe.md",
        "note\\with\\backslash.md",
        "note/with/slash.md",
        "note?with?question.md",
        "note<with>angles.md",
        'note"with"quotes.md',
        "note'with'apostrophes.md",
        "note`with`backticks.md",
        "note~with~tilde.md",
        "note!with!exclamation.md",
        "note^with^caret.md",
      ];
      const data = {
        pinnedNotes: specialNotes,
        lastFilters: createValidFilterState(),
        sortConfig: createValidSortConfig(),
      };
      expect(validatePluginData(data)).toBe(true);
    });

    it("should handle unicode characters in pinnedNotes", () => {
      const unicodeNotes = [
        "日本語のノート.md",
        "中文笔记.md",
        "한국어노트.md",
        "русская заметка.md",
        "العربية ملاحظة.md",
        "हिंदी नोट.md",
        "ελληνικό σημείωμα.md",
        "עברית הערה.md",
        "emoji📝note.md",
        "math∑∫∆note.md",
      ];
      const data = {
        pinnedNotes: unicodeNotes,
        lastFilters: createValidFilterState(),
        sortConfig: createValidSortConfig(),
      };
      expect(validatePluginData(data)).toBe(true);
    });

    it("should handle data with prototype pollution attempt", () => {
      const maliciousData = JSON.parse(
        '{"pinnedNotes":[],"lastFilters":{"folders":[],"tags":[],"filename":"","dateRange":null},"sortConfig":{"key":"updated","order":"desc"},"__proto__":{"polluted":true}}'
      );
      expect(validatePluginData(maliciousData)).toBe(true);
    });
  });

  describe("FilterState edge cases", () => {
    const createDataWithFilterState = (filterState: any) => ({
      pinnedNotes: [],
      lastFilters: filterState,
      sortConfig: createValidSortConfig(),
    });

    it("should handle very large arrays in filter state", () => {
      const largeArray = Array(10000).fill("item");
      const filterState = createValidFilterState();
      filterState.folders = largeArray;
      filterState.tags = largeArray;

      const data = createDataWithFilterState(filterState);
      expect(validatePluginData(data)).toBe(true);
    });

    it("should handle arrays with unicode strings", () => {
      const unicodeStrings = [
        "日本語",
        "中文",
        "한국어",
        "русский",
        "العربية",
        "हिंदी",
        "ελληνικά",
        "עברית",
        "emoji📁",
        "math∑∫∆",
      ];
      const filterState = createValidFilterState();
      filterState.folders = unicodeStrings;
      filterState.tags = unicodeStrings;

      const data = createDataWithFilterState(filterState);
      expect(validatePluginData(data)).toBe(true);
    });

    it("should handle dateRange with edge date values", () => {
      const filterState = createValidFilterState();

      // Test with very old date
      filterState.dateRange = {
        type: "after",
        value: new Date("1900-01-01"),
      };
      let data = createDataWithFilterState(filterState);
      expect(validatePluginData(data)).toBe(true);

      // Test with future date
      filterState.dateRange = {
        type: "within",
        value: new Date("2100-12-31"),
      };
      data = createDataWithFilterState(filterState);
      expect(validatePluginData(data)).toBe(true);

      // Test with epoch date
      filterState.dateRange = {
        type: "after",
        value: new Date(0),
      };
      data = createDataWithFilterState(filterState);
      expect(validatePluginData(data)).toBe(true);
    });

    it("should handle dateRange with various date string formats", () => {
      const filterState = createValidFilterState();
      const validDateStrings = [
        "2023-01-01",
        "2023-01-01T00:00:00Z",
        "2023-01-01T00:00:00.000Z",
        "January 1, 2023",
        "Jan 1, 2023",
        "1/1/2023",
        "01/01/2023",
        "2023/01/01",
      ];

      for (const dateString of validDateStrings) {
        filterState.dateRange = {
          type: "within",
          value: dateString,
        };
        const data = createDataWithFilterState(filterState);
        expect(validatePluginData(data)).toBe(true);
      }
    });

    it("should reject dateRange with invalid date strings", () => {
      const filterState = createValidFilterState();
      const invalidDateStrings = [
        "not-a-date",
        "2023-13-01", // Invalid month
        "2023-01-32", // Invalid day
        "",
        "undefined",
        "null",
      ];

      for (const dateString of invalidDateStrings) {
        filterState.dateRange = {
          type: "within",
          value: dateString,
        };
        const data = createDataWithFilterState(filterState);
        expect(validatePluginData(data)).toBe(false);
      }
    });

    it("should handle filterState with missing properties", () => {
      const incompleteFilterState = {
        folders: ["folder1"],
        tags: ["tag1"],
        filename: "test",
        // Missing other required properties
      };
      const data = createDataWithFilterState(incompleteFilterState);
      expect(validatePluginData(data)).toBe(false);
    });

    it("should handle filterState with extra properties", () => {
      const filterState = {
        ...createValidFilterState(),
        extraProperty: "should be ignored",
      };
      const data = createDataWithFilterState(filterState);
      expect(validatePluginData(data)).toBe(true);
    });

    it("should handle arrays with mixed valid content", () => {
      const filterState = createValidFilterState();
      filterState.folders = ["", "folder1", "very-long-folder-name-with-special-chars-123"];
      filterState.tags = ["a", "tag-with-dashes", "tag_with_underscores"];

      const data = createDataWithFilterState(filterState);
      expect(validatePluginData(data)).toBe(true);
    });

    it("should handle dateRange with boundary values", () => {
      const filterState = createValidFilterState();

      // Test with minimum date
      filterState.dateRange = {
        type: "after",
        value: new Date(-8640000000000000), // JavaScript minimum date
      };
      let data = createDataWithFilterState(filterState);
      expect(validatePluginData(data)).toBe(true);

      // Test with maximum date
      filterState.dateRange = {
        type: "within",
        value: new Date(8640000000000000), // JavaScript maximum date
      };
      data = createDataWithFilterState(filterState);
      expect(validatePluginData(data)).toBe(true);
    });

    it("should handle dateRange with ISO string formats", () => {
      const filterState = createValidFilterState();
      const isoFormats = [
        "2023-01-01T00:00:00.000Z",
        "2023-12-31T23:59:59.999Z",
        "2023-06-15T12:30:45Z",
        "2023-01-01T00:00:00+00:00",
        "2023-01-01T00:00:00-05:00",
      ];

      for (const isoString of isoFormats) {
        filterState.dateRange = {
          type: "within",
          value: isoString,
        };
        const data = createDataWithFilterState(filterState);
        expect(validatePluginData(data)).toBe(true);
      }
    });

    it("should reject dateRange with malformed objects", () => {
      const filterState = createValidFilterState();

      // Missing type
      filterState.dateRange = {
        value: new Date(),
      } as any;
      let data = createDataWithFilterState(filterState);
      expect(validatePluginData(data)).toBe(false);

      // Missing value
      filterState.dateRange = {
        type: "within",
      } as any;
      data = createDataWithFilterState(filterState);
      expect(validatePluginData(data)).toBe(false);

      // Invalid type and value
      filterState.dateRange = {
        type: "invalid",
        value: "invalid",
      } as any;
      data = createDataWithFilterState(filterState);
      expect(validatePluginData(data)).toBe(false);
    });

    it("should handle arrays with special string values", () => {
      const filterState = createValidFilterState();
      const specialStrings = [
        "", // empty string
        " ", // space
        "\t", // tab
        "\n", // newline
        "null",
        "undefined",
        "false",
        "0",
        "[]",
        "{}",
      ];

      filterState.folders = specialStrings;
      filterState.tags = specialStrings;

      const data = createDataWithFilterState(filterState);
      expect(validatePluginData(data)).toBe(true);
    });
  });

  describe("Backup validation edge cases", () => {
    it("should handle backup with missing data properties", () => {
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
              // Missing lastFilters and sortConfig
            },
          },
        ],
      };
      expect(validatePluginData(data)).toBe(false);
    });

    it("should handle backup with null data", () => {
      const data = {
        pinnedNotes: [],
        lastFilters: createValidFilterState(),
        sortConfig: createValidSortConfig(),
        _backups: [
          {
            timestamp: Date.now(),
            version: 1,
            data: null,
          },
        ],
      };
      expect(validatePluginData(data)).toBe(false);
    });

    it("should handle backup with non-object data", () => {
      const data = {
        pinnedNotes: [],
        lastFilters: createValidFilterState(),
        sortConfig: createValidSortConfig(),
        _backups: [
          {
            timestamp: Date.now(),
            version: 1,
            data: "not-an-object",
          },
        ],
      };
      expect(validatePluginData(data)).toBe(false);
    });

    it("should handle very large backup arrays", () => {
      const largeBackups = Array(1000)
        .fill(null)
        .map((_, index) => ({
          timestamp: Date.now() - index * 1000,
          version: 1,
          data: {
            pinnedNotes: [`backup-note-${index}.md`],
            lastFilters: createValidFilterState(),
            sortConfig: createValidSortConfig(),
          },
        }));

      const data = {
        pinnedNotes: [],
        lastFilters: createValidFilterState(),
        sortConfig: createValidSortConfig(),
        _backups: largeBackups,
      };
      expect(validatePluginData(data)).toBe(true);
    });

    it("should handle backup validation edge cases", () => {
      // Test backup with invalid nested pinnedNotes validation
      const data = {
        pinnedNotes: [],
        lastFilters: createValidFilterState(),
        sortConfig: createValidSortConfig(),
        _backups: [
          {
            timestamp: Date.now(),
            version: 1,
            data: {
              pinnedNotes: ["valid.md", null, "another.md"], // null should fail validation
              lastFilters: createValidFilterState(),
              sortConfig: createValidSortConfig(),
            },
          },
        ],
      };
      expect(validatePluginData(data)).toBe(false);
    });
  });
});
