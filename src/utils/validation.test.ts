import type { TFile } from "obsidian";
import { describe, expect, it } from "vitest";
import { DEFAULT_DATA, DEFAULT_SETTINGS } from "../types";
import {
  isMarkdownFile,
  isSortableValue,
  isValidFolderPath,
  isValidTag,
  sanitizeFilename,
  validateDateFilter,
  validateFilterState,
  validateNoteData,
  validatePluginData,
  validatePluginSettings,
  validateSortConfig,
} from "./validation";

// Mock TFile for testing
class MockTFile {
  constructor(
    public path: string,
    public extension: string
  ) {}
}

describe("Data Validation Functions", () => {
  describe("isMarkdownFile", () => {
    it("should return true for markdown files", () => {
      const file = new MockTFile("test.md", "md") as unknown as TFile;
      expect(isMarkdownFile(file)).toBe(true);
    });

    it("should return false for non-markdown files", () => {
      const file = new MockTFile("test.txt", "txt") as unknown as TFile;
      expect(isMarkdownFile(file)).toBe(false);
    });
  });

  describe("validateNoteData", () => {
    const validNoteData = {
      file: new MockTFile("test.md", "md") as unknown as TFile,
      title: "Test Note",
      path: "test.md",
      preview: "This is a test note\nWith multiple lines\nFor preview",
      lastModified: new Date(),
      frontmatter: { title: "Test" },
      tags: ["test", "note"],
      folder: "folder",
    };

    it("should validate correct NoteData", () => {
      expect(validateNoteData(validNoteData)).toBe(true);
    });

    it("should reject null or undefined", () => {
      expect(validateNoteData(null)).toBe(false);
      expect(validateNoteData(undefined)).toBe(false);
    });

    it("should reject missing required properties", () => {
      const { file: _file, ...incomplete } = validNoteData;
      expect(validateNoteData(incomplete)).toBe(false);
    });

    it("should reject invalid property types", () => {
      const invalidData = { ...validNoteData, title: 123 };
      expect(validateNoteData(invalidData)).toBe(false);
    });

    it("should accept null frontmatter", () => {
      const dataWithNullFrontmatter = { ...validNoteData, frontmatter: null };
      expect(validateNoteData(dataWithNullFrontmatter)).toBe(true);
    });
  });

  describe("validateFilterState", () => {
    const validFilterState = {
      folders: ["folder1", "folder2"],
      tags: ["tag1", "tag2"],
      filename: "test",
      dateRange: null,
      excludeFolders: [],
      excludeTags: [],
      excludeFilenames: [],
    };

    it("should validate correct FilterState", () => {
      expect(validateFilterState(validFilterState)).toBe(true);
    });

    it("should validate FilterState with date range", () => {
      const withDateRange = {
        ...validFilterState,
        dateRange: { type: "within" as const, value: new Date() },
      };
      expect(validateFilterState(withDateRange)).toBe(true);
    });

    it("should reject invalid array properties", () => {
      const invalidData = { ...validFilterState, folders: "not-array" };
      expect(validateFilterState(invalidData)).toBe(false);
    });

    it("should reject invalid date range type", () => {
      const invalidData = {
        ...validFilterState,
        dateRange: { type: "invalid", value: new Date() },
      };
      expect(validateFilterState(invalidData)).toBe(false);
    });
  });

  describe("validateSortConfig", () => {
    it("should validate correct SortConfig", () => {
      const validConfig = { key: "updated", order: "desc" as const };
      expect(validateSortConfig(validConfig)).toBe(true);
    });

    it("should reject invalid order", () => {
      const invalidConfig = { key: "updated", order: "invalid" };
      expect(validateSortConfig(invalidConfig)).toBe(false);
    });
  });

  describe("validatePluginSettings", () => {
    it("should validate default settings", () => {
      expect(validatePluginSettings(DEFAULT_SETTINGS)).toBe(true);
    });

    it("should reject invalid boolean properties", () => {
      const invalidSettings = { ...DEFAULT_SETTINGS, autoStart: "true" };
      expect(validatePluginSettings(invalidSettings)).toBe(false);
    });
  });

  describe("validatePluginData", () => {
    it("should validate default data", () => {
      expect(validatePluginData(DEFAULT_DATA)).toBe(true);
    });

    it("should reject invalid pinnedNotes array", () => {
      const invalidData = { ...DEFAULT_DATA, pinnedNotes: [123, "valid"] };
      expect(validatePluginData(invalidData)).toBe(false);
    });
  });

  describe("isSortableValue", () => {
    it("should accept valid sortable values", () => {
      expect(isSortableValue("string")).toBe(true);
      expect(isSortableValue(123)).toBe(true);
      expect(isSortableValue(new Date())).toBe(true);
      expect(isSortableValue(null)).toBe(true);
      expect(isSortableValue(undefined)).toBe(true);
    });

    it("should reject invalid sortable values", () => {
      expect(isSortableValue({})).toBe(false);
      expect(isSortableValue([])).toBe(false);
      expect(isSortableValue(true)).toBe(false);
    });
  });

  describe("validateDateFilter", () => {
    it("should validate null date range", () => {
      const result = validateDateFilter(null);
      expect(result.isValid).toBe(true);
    });

    it("should validate valid date range", () => {
      const dateRange = { type: "within" as const, value: new Date() };
      const result = validateDateFilter(dateRange);
      expect(result.isValid).toBe(true);
    });

    it("should reject invalid date", () => {
      const dateRange = { type: "within" as const, value: new Date("invalid") };
      const result = validateDateFilter(dateRange);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("valid date");
    });
  });

  describe("sanitizeFilename", () => {
    it("should remove invalid characters", () => {
      const result = sanitizeFilename('test<>:"/\\|?*file');
      expect(result).toBe("testfile");
    });

    it("should trim whitespace", () => {
      const result = sanitizeFilename("  test file  ");
      expect(result).toBe("test file");
    });

    it("should handle non-string input", () => {
      expect(sanitizeFilename(123 as any)).toBe("");
    });
  });

  describe("isValidFolderPath", () => {
    it("should accept valid folder paths", () => {
      expect(isValidFolderPath("")).toBe(true);
      expect(isValidFolderPath("folder")).toBe(true);
      expect(isValidFolderPath("folder/subfolder")).toBe(true);
    });

    it("should reject invalid characters", () => {
      expect(isValidFolderPath("folder<>")).toBe(false);
      expect(isValidFolderPath("folder|test")).toBe(false);
    });
  });

  describe("isValidTag", () => {
    it("should accept valid tags", () => {
      expect(isValidTag("test")).toBe(true);
      expect(isValidTag("test-tag")).toBe(true);
      expect(isValidTag("test_tag")).toBe(true);
      expect(isValidTag("test123")).toBe(true);
    });

    it("should reject invalid tags", () => {
      expect(isValidTag("")).toBe(false);
      expect(isValidTag("test tag")).toBe(false);
      expect(isValidTag("test@tag")).toBe(false);
      expect(isValidTag(123 as any)).toBe(false);
    });
  });
});
