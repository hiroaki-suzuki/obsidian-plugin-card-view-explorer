import { describe, expect, it, test } from "vitest";
import type { FilterState, PluginData, PluginSettings, SortConfig } from "../types";
import { validatePluginData, validatePluginSettings } from "./validation";

/**
 * Test helper function - Creates a valid PluginSettings object
 * Returns default values for plugin settings (sort key, auto start, sidebar display)
 */
const createValidPluginSettings = (): PluginSettings => ({
  sortKey: "updated",
  autoStart: true,
  showInSidebar: false,
});

/**
 * Test helper function - Creates a valid PluginData object
 * Contains plugin persistent data (pinned notes, filter state, sort config)
 */
const createValidPluginData = (): PluginData => ({
  pinnedNotes: ["note1.md", "note2.md"],
  lastFilters: createValidFilterState(),
  sortConfig: createValidSortConfig(),
  version: 1,
});

/**
 * Test helper function - Creates a valid FilterState object
 * Contains filter state (folders, tags, filename, date range)
 */
const createValidFilterState = (): FilterState => ({
  folders: ["folder1", "folder2"],
  tags: ["tag1", "tag2"],
  filename: "test",
  dateRange: {
    type: "within",
    value: new Date("2023-01-01"),
  },
});

/**
 * Helper function to create PluginData with specific filter state
 * Used in validation tests to test different filter configurations
 */
const createDataWithFilterState = (filterState: any) => ({
  pinnedNotes: [],
  lastFilters: filterState,
  sortConfig: createValidSortConfig(),
});

/**
 * Test helper function - Creates a valid SortConfig object
 * Returns default values for sort configuration (key, order)
 */
const createValidSortConfig = (): SortConfig => ({
  key: "updated",
  order: "desc",
});

/**
 * Helper function to create PluginData with specific sort configuration
 * Used in validation tests to test different sort configurations
 */
const createDataWithSortConfig = (sortConfig: any) => ({
  pinnedNotes: [],
  lastFilters: createValidFilterState(),
  sortConfig: sortConfig,
});

describe("validation", () => {
  describe("validatePluginSettings", () => {
    it("should validate correct PluginSettings", () => {
      const validSettings = createValidPluginSettings();
      expect(validatePluginSettings(validSettings)).toBe(true);
    });

    // Basic type check - all non-object values are invalid
    test.each([
      ["null", null],
      ["undefined", undefined],
      ["string", "string"],
      ["number", 123],
      ["array", []],
    ])("should reject %s values", (_, value) => {
      expect(validatePluginSettings(value)).toBe(false);
    });

    // sortKey property validation - must be present and of string type
    test.each([
      ["missing", { autoStart: true, showInSidebar: false }],
      ["non-string", { sortKey: 123, autoStart: true, showInSidebar: false }],
    ])("should reject %s sortKey", (_, settings) => {
      expect(validatePluginSettings(settings)).toBe(false);
    });

    test.each([
      ["missing", { sortKey: "updated", showInSidebar: false }],
      ["non-boolean", { sortKey: "updated", autoStart: "true", showInSidebar: false }],
    ])("should reject %s autoStart", (_, settings) => {
      expect(validatePluginSettings(settings)).toBe(false);
    });

    test.each([
      ["missing", { sortKey: "updated", autoStart: true }],
      ["non-boolean", { sortKey: "updated", autoStart: true, showInSidebar: "false" }],
    ])("should reject %s showInSidebar", (_, settings) => {
      expect(validatePluginSettings(settings)).toBe(false);
    });
  });

  describe("validatePluginData", () => {
    it("should validate correct PluginData", () => {
      const validData = createValidPluginData();
      expect(validatePluginData(validData)).toBe(true);
    });

    test.each([
      ["null", null],
      ["undefined", undefined],
      ["string", "string"],
      ["number", 123],
      ["array", []],
    ])("should reject %s values", (_, value) => {
      expect(validatePluginData(value)).toBe(false);
    });

    describe("lastFilters validation", () => {
      it("should reject missing lastFilters", () => {
        const data = {
          pinnedNotes: [],
          sortConfig: createValidSortConfig(),
        };
        expect(validatePluginData(data)).toBe(false);
      });

      test.each([
        ["null", null],
        ["undefined", undefined],
        ["non-object", "not-object"],
      ])("should reject %s lastFilters", (_, filterState) => {
        const data = createDataWithFilterState(filterState);
        expect(validatePluginData(data)).toBe(false);
      });

      it("should reject invalid lastFilters", () => {
        const data = createDataWithFilterState({ invalid: "filter" });
        expect(validatePluginData(data)).toBe(false);
      });

      describe("array properties validation", () => {
        test.each(["folders", "tags"])("%s should accept empty array", (prop) => {
          const filterState = createValidFilterState();
          (filterState as any)[prop] = [];
          const data = createDataWithFilterState(filterState);
          expect(validatePluginData(data)).toBe(true);
        });

        // Detailed property validation - tests required properties and their types
        test.each([
          [
            "folders",
            "missing",
            (fs: any) => {
              delete fs.folders;
            },
          ],
          [
            "folders",
            "null",
            (fs: any) => {
              fs.folders = null;
            },
          ],
          [
            "folders",
            "undefined",
            (fs: any) => {
              fs.folders = undefined;
            },
          ],
          [
            "folders",
            "non-array",
            (fs: any) => {
              fs.folders = "not-array";
            },
          ],
          [
            "folders",
            "non-string elements",
            (fs: any) => {
              fs.folders = ["valid", 123, "another"];
            },
          ],
          [
            "tags",
            "missing",
            (fs: any) => {
              delete fs.tags;
            },
          ],
          [
            "tags",
            "null",
            (fs: any) => {
              fs.tags = null;
            },
          ],
          [
            "tags",
            "undefined",
            (fs: any) => {
              fs.tags = undefined;
            },
          ],
          [
            "tags",
            "non-array",
            (fs: any) => {
              fs.tags = "not-array";
            },
          ],
          [
            "tags",
            "non-string elements",
            (fs: any) => {
              fs.tags = ["valid", 123, "another"];
            },
          ],
        ])("should reject %s with %s", (_prop, _description, modifier) => {
          const filterState = createValidFilterState();
          modifier(filterState); // Execute function to modify to invalid state
          const data = createDataWithFilterState(filterState);
          expect(validatePluginData(data)).toBe(false);
        });
      });

      describe("filename validation", () => {
        it("should accept empty string filename", () => {
          const filterState = createValidFilterState();
          filterState.filename = "";
          const data = createDataWithFilterState(filterState);
          expect(validatePluginData(data)).toBe(true);
        });

        test.each([
          [
            "missing",
            (fs: any) => {
              delete fs.filename;
            },
          ],
          [
            "null",
            (fs: any) => {
              fs.filename = null;
            },
          ],
          [
            "undefined",
            (fs: any) => {
              fs.filename = undefined;
            },
          ],
          [
            "non-string",
            (fs: any) => {
              fs.filename = 123;
            },
          ],
        ])("should reject %s filename", (_description, modifier) => {
          const filterState = createValidFilterState();
          modifier(filterState);
          const data = createDataWithFilterState(filterState);
          expect(validatePluginData(data)).toBe(false);
        });
      });

      describe("dateRange validation", () => {
        it("should accept null dateRange", () => {
          const filterState = createValidFilterState();
          filterState.dateRange = null;
          const data = createDataWithFilterState(filterState);
          expect(validatePluginData(data)).toBe(true);
        });

        // Test valid dateRange formats - supports two types "within" and "after", both Date objects and ISO strings
        test.each([
          ["'within' type with Date", { type: "within", value: new Date() }],
          ["'after' type with Date", { type: "after", value: new Date() }],
          ["Date object value", { type: "within", value: new Date("2023-01-01") }],
          ["valid date string value", { type: "within", value: "2023-01-01" }],
        ])("should accept dateRange with %s", (_description, dateRange) => {
          const filterState = createValidFilterState();
          (filterState as any).dateRange = dateRange;
          const data = createDataWithFilterState(filterState);
          expect(validatePluginData(data)).toBe(true);
        });

        test.each([
          ["non-object", "not-object"],
          ["invalid type", { type: "invalid", value: new Date() }],
          ["invalid date string value", { type: "within", value: "invalid-date" }],
          ["non-Date, non-string value", { type: "within", value: 123 }],
        ])("should reject dateRange with %s", (_description, dateRange) => {
          const filterState = createValidFilterState();
          (filterState as any).dateRange = dateRange;
          const data = createDataWithFilterState(filterState);
          expect(validatePluginData(data)).toBe(false);
        });
      });
    });

    describe("pinnedNotes validation", () => {
      it("should accept empty pinnedNotes array", () => {
        const data = {
          pinnedNotes: [],
          lastFilters: createValidFilterState(),
          sortConfig: createValidSortConfig(),
        };
        expect(validatePluginData(data)).toBe(true);
      });

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
    });

    describe("sortConfig validation", () => {
      it("should accept empty string key", () => {
        const sortConfig = { key: "", order: "desc" };
        const data = createDataWithSortConfig(sortConfig);
        expect(validatePluginData(data)).toBe(true);
      });

      test.each([
        ["'asc' order", "asc"],
        ["'desc' order", "desc"],
      ])("should accept %s", (_description, order) => {
        const sortConfig = { key: "updated", order };
        const data = createDataWithSortConfig(sortConfig);
        expect(validatePluginData(data)).toBe(true);
      });

      it("should reject missing sortConfig", () => {
        const data = {
          pinnedNotes: [],
          lastFilters: createValidFilterState(),
        };
        expect(validatePluginData(data)).toBe(false);
      });

      test.each([
        ["null", null],
        ["undefined", undefined],
        ["non-object", "not-object"],
      ])("should reject %s sortConfig", (_description, sortConfig) => {
        const data = createDataWithSortConfig(sortConfig);
        expect(validatePluginData(data)).toBe(false);
      });

      it("should reject invalid sortConfig", () => {
        const data = createDataWithSortConfig({ invalid: "config" });
        expect(validatePluginData(data)).toBe(false);
      });

      it("should reject missing key", () => {
        const sortConfig = { order: "desc" };
        const data = createDataWithSortConfig(sortConfig);
        expect(validatePluginData(data)).toBe(false);
      });

      test.each([
        ["non-string", 123],
        ["undefined", undefined],
        ["null", null],
      ])("should reject %s key", (_description, key) => {
        const sortConfig = { key, order: "desc" };
        const data = createDataWithSortConfig(sortConfig);
        expect(validatePluginData(data)).toBe(false);
      });

      it("should reject missing order", () => {
        const sortConfig = { key: "updated" };
        const data = createDataWithSortConfig(sortConfig);
        expect(validatePluginData(data)).toBe(false);
      });

      test.each([
        ["undefined", undefined],
        ["null", null],
        ["invalid", "invalid"],
      ])("should reject %s order", (_description, order) => {
        const sortConfig = { key: "updated", order };
        const data = createDataWithSortConfig(sortConfig);
        expect(validatePluginData(data)).toBe(false);
      });
    });

    describe("version validation", () => {
      /**
       * Helper function to create PluginData with specific version number
       * Used in version management validation tests
       */
      const createDataWithVersion = (version: any) => ({
        pinnedNotes: [],
        lastFilters: createValidFilterState(),
        sortConfig: createValidSortConfig(),
        version: version,
      });

      it("should accept valid version number", () => {
        const data = createDataWithVersion(1);
        expect(validatePluginData(data)).toBe(true);
      });

      it("should reject non-number version", () => {
        const data = createDataWithVersion("1");
        expect(validatePluginData(data)).toBe(false);
      });

      it("should accept valid version numbers (non-negative integers or undefined)", () => {
        const data1 = createDataWithVersion(undefined); // undefined is valid (optional)
        const data2 = createDataWithVersion(0); // Zero is valid
        const data3 = createDataWithVersion(1); // Positive integers are valid
        const data4 = createDataWithVersion(999999); // Large positive integers are valid
        expect(validatePluginData(data1)).toBe(true);
        expect(validatePluginData(data2)).toBe(true);
        expect(validatePluginData(data3)).toBe(true);
        expect(validatePluginData(data4)).toBe(true);
      });

      it("should reject invalid version numbers (negative or decimal)", () => {
        const data1 = createDataWithVersion(-1); // Negative values are invalid
        const data2 = createDataWithVersion(-1.5); // Negative decimal values are invalid
        const data3 = createDataWithVersion(1.5); // Positive decimal values are invalid
        const data4 = createDataWithVersion(Number.NaN); // NaN is invalid
        const data5 = createDataWithVersion(Number.POSITIVE_INFINITY); // Infinity is invalid
        expect(validatePluginData(data1)).toBe(false);
        expect(validatePluginData(data2)).toBe(false);
        expect(validatePluginData(data3)).toBe(false);
        expect(validatePluginData(data4)).toBe(false);
        expect(validatePluginData(data5)).toBe(false);
      });
    });
  });
});
