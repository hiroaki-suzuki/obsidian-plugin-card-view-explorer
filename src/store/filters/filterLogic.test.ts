import { beforeEach, describe, expect, it } from "vitest";
import type { FilterState, NoteData } from "../../types";
import {
  applyFilters,
  calculateDaysDifference,
  hasAnyActiveFilter,
  isExcludedByFilename,
  isExcludedByFolder,
  isExcludedByTag,
  matchesDateRangeCriteria,
  matchesFilenameCriteria,
  matchesFolderCriteria,
  matchesTagCriteria,
  notePassesFilters,
} from "./filterLogic";

// Mock note data for testing
const createMockNote = (
  title: string,
  path: string,
  folder: string = "",
  tags: string[] = [],
  frontmatter: Record<string, any> | null = null,
  lastModified: Date = new Date()
): NoteData => ({
  file: {} as any, // Mock TFile
  title,
  path,
  preview: `Preview for ${title}`,
  lastModified,
  frontmatter,
  tags,
  folder,
});

const createDefaultFilters = (): FilterState => ({
  folders: [],
  tags: [],
  filename: "",
  dateRange: null,
  excludeFolders: [],
  excludeTags: [],
  excludeFilenames: [],
});

describe("Filter Logic", () => {
  describe("matchesFolderCriteria", () => {
    it("should return true when no folders specified", () => {
      const note = createMockNote("Test", "/test.md", "folder1");
      expect(matchesFolderCriteria(note, [])).toBe(true);
    });

    it("should match exact folder", () => {
      const note = createMockNote("Test", "/test.md", "folder1");
      expect(matchesFolderCriteria(note, ["folder1"])).toBe(true);
    });

    it("should match hierarchical folder", () => {
      const note = createMockNote("Test", "/test.md", "folder1/subfolder");
      expect(matchesFolderCriteria(note, ["folder1"])).toBe(true);
    });

    it("should not match different folder", () => {
      const note = createMockNote("Test", "/test.md", "folder1");
      expect(matchesFolderCriteria(note, ["folder2"])).toBe(false);
    });

    it("should handle empty folder", () => {
      const note = createMockNote("Test", "/test.md", "");
      expect(matchesFolderCriteria(note, ["folder1"])).toBe(false);
    });

    it("should match any of multiple folders", () => {
      const note = createMockNote("Test", "/test.md", "folder2");
      expect(matchesFolderCriteria(note, ["folder1", "folder2"])).toBe(true);
    });
  });

  describe("isExcludedByFolder", () => {
    it("should return false when no exclusions specified", () => {
      const note = createMockNote("Test", "/test.md", "folder1");
      expect(isExcludedByFolder(note, [])).toBe(false);
    });

    it("should exclude exact folder match", () => {
      const note = createMockNote("Test", "/test.md", "archive");
      expect(isExcludedByFolder(note, ["archive"])).toBe(true);
    });

    it("should exclude hierarchical folder", () => {
      const note = createMockNote("Test", "/test.md", "archive/old");
      expect(isExcludedByFolder(note, ["archive"])).toBe(true);
    });

    it("should not exclude different folder", () => {
      const note = createMockNote("Test", "/test.md", "folder1");
      expect(isExcludedByFolder(note, ["archive"])).toBe(false);
    });
  });

  describe("matchesTagCriteria", () => {
    it("should return true when no tags specified", () => {
      const note = createMockNote("Test", "/test.md", "", ["tag1"]);
      expect(matchesTagCriteria(note, [])).toBe(true);
    });

    it("should match exact tag", () => {
      const note = createMockNote("Test", "/test.md", "", ["tag1", "tag2"]);
      expect(matchesTagCriteria(note, ["tag1"])).toBe(true);
    });

    it("should match any of multiple tags", () => {
      const note = createMockNote("Test", "/test.md", "", ["tag2"]);
      expect(matchesTagCriteria(note, ["tag1", "tag2"])).toBe(true);
    });

    it("should not match when no matching tags", () => {
      const note = createMockNote("Test", "/test.md", "", ["tag1"]);
      expect(matchesTagCriteria(note, ["tag2", "tag3"])).toBe(false);
    });

    it("should handle notes with no tags", () => {
      const note = createMockNote("Test", "/test.md", "", []);
      expect(matchesTagCriteria(note, ["tag1"])).toBe(false);
    });
  });

  describe("isExcludedByTag", () => {
    it("should return false when no exclusions specified", () => {
      const note = createMockNote("Test", "/test.md", "", ["tag1"]);
      expect(isExcludedByTag(note, [])).toBe(false);
    });

    it("should exclude when note has excluded tag", () => {
      const note = createMockNote("Test", "/test.md", "", ["draft", "tag1"]);
      expect(isExcludedByTag(note, ["draft"])).toBe(true);
    });

    it("should not exclude when note has no excluded tags", () => {
      const note = createMockNote("Test", "/test.md", "", ["tag1", "tag2"]);
      expect(isExcludedByTag(note, ["draft"])).toBe(false);
    });
  });

  describe("matchesFilenameCriteria", () => {
    it("should return true for empty search term", () => {
      const note = createMockNote("Test Note", "/test.md");
      expect(matchesFilenameCriteria(note, "")).toBe(true);
      expect(matchesFilenameCriteria(note, "   ")).toBe(true);
    });

    it("should match case-insensitive partial search", () => {
      const note = createMockNote("Test Note", "/test.md");
      expect(matchesFilenameCriteria(note, "test")).toBe(true);
      expect(matchesFilenameCriteria(note, "TEST")).toBe(true);
      expect(matchesFilenameCriteria(note, "Note")).toBe(true);
    });

    it("should not match when search term not found", () => {
      const note = createMockNote("Test Note", "/test.md");
      expect(matchesFilenameCriteria(note, "xyz")).toBe(false);
    });
  });

  describe("isExcludedByFilename", () => {
    it("should return false when no exclusions specified", () => {
      const note = createMockNote("Test Note", "/test.md");
      expect(isExcludedByFilename(note, [])).toBe(false);
    });

    it("should exclude when filename contains pattern", () => {
      const note = createMockNote("Draft Note", "/draft.md");
      expect(isExcludedByFilename(note, ["draft"])).toBe(true);
      expect(isExcludedByFilename(note, ["DRAFT"])).toBe(true);
    });

    it("should not exclude when filename doesn't contain pattern", () => {
      const note = createMockNote("Final Note", "/final.md");
      expect(isExcludedByFilename(note, ["draft"])).toBe(false);
    });
  });

  describe("calculateDaysDifference", () => {
    it("should calculate positive difference for later date", () => {
      const later = new Date("2024-01-10");
      const earlier = new Date("2024-01-05");
      expect(calculateDaysDifference(later, earlier)).toBe(5);
    });

    it("should calculate zero difference for same date", () => {
      const date = new Date("2024-01-05");
      expect(calculateDaysDifference(date, date)).toBe(0);
    });

    it("should calculate negative difference for earlier date", () => {
      const earlier = new Date("2024-01-05");
      const later = new Date("2024-01-10");
      expect(calculateDaysDifference(earlier, later)).toBe(-5);
    });
  });

  describe("matchesDateRangeCriteria", () => {
    const now = new Date("2024-01-10T12:00:00Z");
    const recent = new Date("2024-01-08T12:00:00Z"); // 2 days ago
    const old = new Date("2024-01-01T12:00:00Z"); // 9 days ago

    beforeEach(() => {
      // Mock Date.now() to return consistent time
      vi.useFakeTimers();
      vi.setSystemTime(now);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should return true when no date filter specified", () => {
      const note = createMockNote("Test", "/test.md", "", [], null, recent);
      expect(matchesDateRangeCriteria(note, null)).toBe(true);
    });

    it("should match 'within' date range", () => {
      const note = createMockNote("Test", "/test.md", "", [], null, recent);
      const fiveDaysAgo = new Date("2024-01-05T12:00:00Z");

      expect(
        matchesDateRangeCriteria(note, {
          type: "within",
          value: fiveDaysAgo,
        })
      ).toBe(true);
    });

    it("should not match 'within' date range when too old", () => {
      const note = createMockNote("Test", "/test.md", "", [], null, old);
      const fiveDaysAgo = new Date("2024-01-05T12:00:00Z");

      expect(
        matchesDateRangeCriteria(note, {
          type: "within",
          value: fiveDaysAgo,
        })
      ).toBe(false);
    });

    it("should match 'after' date range", () => {
      const note = createMockNote("Test", "/test.md", "", [], null, recent);
      const threeDaysAgo = new Date("2024-01-07T12:00:00Z");

      expect(
        matchesDateRangeCriteria(note, {
          type: "after",
          value: threeDaysAgo,
        })
      ).toBe(true);
    });

    it("should not match 'after' date range when too old", () => {
      const note = createMockNote("Test", "/test.md", "", [], null, old);
      const threeDaysAgo = new Date("2024-01-07T12:00:00Z");

      expect(
        matchesDateRangeCriteria(note, {
          type: "after",
          value: threeDaysAgo,
        })
      ).toBe(false);
    });
  });

  describe("notePassesFilters", () => {
    it("should pass all filters when no filters active", () => {
      const note = createMockNote("Test", "/test.md", "folder1", ["tag1"]);
      const filters = createDefaultFilters();
      expect(notePassesFilters(note, filters)).toBe(true);
    });

    it("should fail when folder doesn't match", () => {
      const note = createMockNote("Test", "/test.md", "folder1", ["tag1"]);
      const filters = { ...createDefaultFilters(), folders: ["folder2"] };
      expect(notePassesFilters(note, filters)).toBe(false);
    });

    it("should fail when folder is excluded", () => {
      const note = createMockNote("Test", "/test.md", "archive", ["tag1"]);
      const filters = { ...createDefaultFilters(), excludeFolders: ["archive"] };
      expect(notePassesFilters(note, filters)).toBe(false);
    });

    it("should pass complex filter combination", () => {
      const note = createMockNote("Test Note", "/test.md", "folder1", ["tag1", "tag2"]);
      const filters: FilterState = {
        ...createDefaultFilters(),
        folders: ["folder1"],
        tags: ["tag1"],
        filename: "test",
        excludeTags: ["draft"],
        excludeFilenames: ["temp"],
      };
      expect(notePassesFilters(note, filters)).toBe(true);
    });
  });

  describe("applyFilters", () => {
    const mockNotes = [
      createMockNote("Note 1", "/note1.md", "folder1", ["tag1"]),
      createMockNote("Note 2", "/note2.md", "folder2", ["tag2"]),
      createMockNote("Draft Note", "/draft.md", "folder1", ["draft"]),
    ];

    it("should return all notes when no filters active", () => {
      const filters = createDefaultFilters();
      const result = applyFilters(mockNotes, filters);
      expect(result).toHaveLength(3);
    });

    it("should filter by folder", () => {
      const filters = { ...createDefaultFilters(), folders: ["folder1"] };
      const result = applyFilters(mockNotes, filters);
      expect(result).toHaveLength(2);
      expect(result.every((note) => note.folder === "folder1")).toBe(true);
    });

    it("should filter by tag", () => {
      const filters = { ...createDefaultFilters(), tags: ["tag1"] };
      const result = applyFilters(mockNotes, filters);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Note 1");
    });

    it("should exclude by filename", () => {
      const filters = { ...createDefaultFilters(), excludeFilenames: ["draft"] };
      const result = applyFilters(mockNotes, filters);
      expect(result).toHaveLength(2);
      expect(result.every((note) => !note.title.toLowerCase().includes("draft"))).toBe(true);
    });

    it("should apply multiple filters", () => {
      const filters: FilterState = {
        ...createDefaultFilters(),
        folders: ["folder1"],
        excludeFilenames: ["draft"],
      };
      const result = applyFilters(mockNotes, filters);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Note 1");
    });
  });

  describe("hasAnyActiveFilter", () => {
    it("should return false for default filters", () => {
      const filters = createDefaultFilters();
      expect(hasAnyActiveFilter(filters)).toBe(false);
    });

    it("should return true when folders filter is active", () => {
      const filters = { ...createDefaultFilters(), folders: ["folder1"] };
      expect(hasAnyActiveFilter(filters)).toBe(true);
    });

    it("should return true when tags filter is active", () => {
      const filters = { ...createDefaultFilters(), tags: ["tag1"] };
      expect(hasAnyActiveFilter(filters)).toBe(true);
    });

    it("should return true when filename filter is active", () => {
      const filters = { ...createDefaultFilters(), filename: "test" };
      expect(hasAnyActiveFilter(filters)).toBe(true);
    });

    it("should return false when filename is only whitespace", () => {
      const filters = { ...createDefaultFilters(), filename: "   " };
      expect(hasAnyActiveFilter(filters)).toBe(false);
    });

    it("should return true when date range filter is active", () => {
      const filters = {
        ...createDefaultFilters(),
        dateRange: { type: "within" as const, value: new Date() },
      };
      expect(hasAnyActiveFilter(filters)).toBe(true);
    });

    it("should return true when exclude filters are active", () => {
      const filters1 = { ...createDefaultFilters(), excludeFolders: ["archive"] };
      const filters2 = { ...createDefaultFilters(), excludeTags: ["draft"] };
      const filters3 = { ...createDefaultFilters(), excludeFilenames: ["temp"] };

      expect(hasAnyActiveFilter(filters1)).toBe(true);
      expect(hasAnyActiveFilter(filters2)).toBe(true);
      expect(hasAnyActiveFilter(filters3)).toBe(true);
    });
  });
});
