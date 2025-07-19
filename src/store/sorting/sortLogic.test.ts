import { describe, expect, it } from "vitest";
import type { NoteData, SortConfig } from "../../types";
import {
  compareValues,
  createSortComparator,
  extractSortValue,
  normalizeForComparison,
  separateNotesByPinStatus,
  sortNotes,
  togglePinState,
} from "./sortLogic";

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

describe("Sort Logic", () => {
  describe("extractSortValue", () => {
    const baseDate = new Date("2024-01-01");
    const note = createMockNote(
      "Test",
      "/test.md",
      "",
      [],
      { priority: 5, status: "active" },
      baseDate
    );

    it("should return lastModified for mtime key", () => {
      expect(extractSortValue(note, "mtime")).toBe(baseDate);
    });

    it("should return frontmatter value when available", () => {
      expect(extractSortValue(note, "priority")).toBe(5);
      expect(extractSortValue(note, "status")).toBe("active");
    });

    it("should fallback to lastModified when frontmatter key doesn't exist", () => {
      expect(extractSortValue(note, "nonexistent")).toBe(baseDate);
    });

    it("should fallback to lastModified when frontmatter value is null", () => {
      const noteWithNull = createMockNote("Test", "/test.md", "", [], { priority: null }, baseDate);
      expect(extractSortValue(noteWithNull, "priority")).toBe(baseDate);
    });

    it("should fallback to lastModified when no frontmatter", () => {
      const noteWithoutFrontmatter = createMockNote("Test", "/test.md", "", [], null, baseDate);
      expect(extractSortValue(noteWithoutFrontmatter, "priority")).toBe(baseDate);
    });

    it("should parse date strings from frontmatter", () => {
      const noteWithDateString = createMockNote(
        "Test",
        "/test.md",
        "",
        [],
        { updated: "2024-01-15" },
        baseDate
      );
      const result = extractSortValue(noteWithDateString, "updated");

      expect(result).toBeInstanceOf(Date);
      expect((result as Date).getFullYear()).toBe(2024);
      expect((result as Date).getMonth()).toBe(0); // January is 0
      expect((result as Date).getDate()).toBe(15);
    });

    it("should handle invalid date strings in frontmatter", () => {
      const noteWithInvalidDate = createMockNote(
        "Test",
        "/test.md",
        "",
        [],
        { updated: "not-a-date" },
        baseDate
      );
      const result = extractSortValue(noteWithInvalidDate, "updated");

      // Should return the original string value, not a Date
      expect(result).toBe("not-a-date");
      expect(result).not.toBeInstanceOf(Date);
    });

    it("should handle Date objects in frontmatter", () => {
      const frontmatterDate = new Date("2024-01-15");
      const noteWithDateObject = createMockNote(
        "Test",
        "/test.md",
        "",
        [],
        { updated: frontmatterDate },
        baseDate
      );
      const result = extractSortValue(noteWithDateObject, "updated");

      expect(result).toBe(frontmatterDate);
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe("normalizeForComparison", () => {
    it("should convert Date to timestamp", () => {
      const date = new Date("2024-01-01T12:00:00Z");
      expect(normalizeForComparison(date)).toBe(date.getTime());
    });

    it("should convert string to lowercase", () => {
      expect(normalizeForComparison("Hello World")).toBe("hello world");
      expect(normalizeForComparison("TEST")).toBe("test");
    });

    it("should leave numbers unchanged", () => {
      expect(normalizeForComparison(42)).toBe(42);
      expect(normalizeForComparison(3.14)).toBe(3.14);
    });

    it("should leave booleans unchanged", () => {
      expect(normalizeForComparison(true)).toBe(true);
      expect(normalizeForComparison(false)).toBe(false);
    });

    it("should leave null and undefined unchanged", () => {
      expect(normalizeForComparison(null)).toBe(null);
      expect(normalizeForComparison(undefined)).toBe(undefined);
    });
  });

  describe("compareValues", () => {
    it("should return -1 when a < b", () => {
      expect(compareValues(1, 2)).toBe(-1);
      expect(compareValues("a", "b")).toBe(-1);
    });

    it("should return 1 when a > b", () => {
      expect(compareValues(2, 1)).toBe(1);
      expect(compareValues("b", "a")).toBe(1);
    });

    it("should return 0 when a === b", () => {
      expect(compareValues(1, 1)).toBe(0);
      expect(compareValues("a", "a")).toBe(0);
    });
  });

  describe("createSortComparator", () => {
    const date1 = new Date("2024-01-01");
    const date2 = new Date("2024-01-02");
    const date3 = new Date("2024-01-03");

    const notes = [
      createMockNote("Note 1", "/note1.md", "", [], { priority: 3 }, date1),
      createMockNote("Note 2", "/note2.md", "", [], { priority: 1 }, date2),
      createMockNote("Note 3", "/note3.md", "", [], { priority: 2 }, date3),
    ];

    it("should sort by mtime in ascending order", () => {
      const config: SortConfig = { key: "mtime", order: "asc" };
      const comparator = createSortComparator(config);
      const sorted = [...notes].sort(comparator);

      expect(sorted[0].title).toBe("Note 1"); // Earliest date
      expect(sorted[1].title).toBe("Note 2");
      expect(sorted[2].title).toBe("Note 3"); // Latest date
    });

    it("should sort by mtime in descending order", () => {
      const config: SortConfig = { key: "mtime", order: "desc" };
      const comparator = createSortComparator(config);
      const sorted = [...notes].sort(comparator);

      expect(sorted[0].title).toBe("Note 3"); // Latest date
      expect(sorted[1].title).toBe("Note 2");
      expect(sorted[2].title).toBe("Note 1"); // Earliest date
    });

    it("should sort by frontmatter field in ascending order", () => {
      const config: SortConfig = { key: "priority", order: "asc" };
      const comparator = createSortComparator(config);
      const sorted = [...notes].sort(comparator);

      expect(sorted[0].frontmatter?.priority).toBe(1);
      expect(sorted[1].frontmatter?.priority).toBe(2);
      expect(sorted[2].frontmatter?.priority).toBe(3);
    });

    it("should sort by frontmatter field in descending order", () => {
      const config: SortConfig = { key: "priority", order: "desc" };
      const comparator = createSortComparator(config);
      const sorted = [...notes].sort(comparator);

      expect(sorted[0].frontmatter?.priority).toBe(3);
      expect(sorted[1].frontmatter?.priority).toBe(2);
      expect(sorted[2].frontmatter?.priority).toBe(1);
    });

    it("should handle string sorting case-insensitively", () => {
      const stringNotes = [
        createMockNote("Note 1", "/note1.md", "", [], { status: "Completed" }),
        createMockNote("Note 2", "/note2.md", "", [], { status: "active" }),
        createMockNote("Note 3", "/note3.md", "", [], { status: "Blocked" }),
      ];

      const config: SortConfig = { key: "status", order: "asc" };
      const comparator = createSortComparator(config);
      const sorted = [...stringNotes].sort(comparator);

      expect(sorted[0].frontmatter?.status).toBe("active");
      expect(sorted[1].frontmatter?.status).toBe("Blocked");
      expect(sorted[2].frontmatter?.status).toBe("Completed");
    });
  });

  describe("separateNotesByPinStatus", () => {
    const notes = [
      createMockNote("Note 1", "/note1.md"),
      createMockNote("Note 2", "/note2.md"),
      createMockNote("Note 3", "/note3.md"),
      createMockNote("Note 4", "/note4.md"),
    ];

    it("should separate pinned and unpinned notes", () => {
      const pinnedNotes = new Set(["/note2.md", "/note4.md"]);
      const result = separateNotesByPinStatus(notes, pinnedNotes);

      expect(result.pinned).toHaveLength(2);
      expect(result.unpinned).toHaveLength(2);
      expect(result.pinned.map((n) => n.path)).toEqual(["/note2.md", "/note4.md"]);
      expect(result.unpinned.map((n) => n.path)).toEqual(["/note1.md", "/note3.md"]);
    });

    it("should handle no pinned notes", () => {
      const pinnedNotes = new Set<string>();
      const result = separateNotesByPinStatus(notes, pinnedNotes);

      expect(result.pinned).toHaveLength(0);
      expect(result.unpinned).toHaveLength(4);
    });

    it("should handle all notes pinned", () => {
      const pinnedNotes = new Set(["/note1.md", "/note2.md", "/note3.md", "/note4.md"]);
      const result = separateNotesByPinStatus(notes, pinnedNotes);

      expect(result.pinned).toHaveLength(4);
      expect(result.unpinned).toHaveLength(0);
    });

    it("should handle empty notes array", () => {
      const pinnedNotes = new Set(["/note1.md"]);
      const result = separateNotesByPinStatus([], pinnedNotes);

      expect(result.pinned).toHaveLength(0);
      expect(result.unpinned).toHaveLength(0);
    });
  });

  describe("sortNotes", () => {
    const date1 = new Date("2024-01-01");
    const date2 = new Date("2024-01-02");
    const date3 = new Date("2024-01-03");

    const notes = [
      createMockNote("Note 1", "/note1.md", "", [], null, date1),
      createMockNote("Note 2", "/note2.md", "", [], null, date2),
      createMockNote("Note 3", "/note3.md", "", [], null, date3),
    ];

    it("should sort notes without pins", () => {
      const sortConfig: SortConfig = { key: "mtime", order: "asc" };
      const pinnedNotes = new Set<string>();
      const result = sortNotes(notes, sortConfig, pinnedNotes);

      expect(result.map((n) => n.title)).toEqual(["Note 1", "Note 2", "Note 3"]);
    });

    it("should place pinned notes first while maintaining sort order", () => {
      const sortConfig: SortConfig = { key: "mtime", order: "asc" };
      const pinnedNotes = new Set(["/note3.md", "/note1.md"]);
      const result = sortNotes(notes, sortConfig, pinnedNotes);

      // Pinned notes should come first, but still sorted among themselves
      expect(result.map((n) => n.title)).toEqual(["Note 1", "Note 3", "Note 2"]);
    });

    it("should handle descending sort with pins", () => {
      const sortConfig: SortConfig = { key: "mtime", order: "desc" };
      const pinnedNotes = new Set(["/note1.md"]);
      const result = sortNotes(notes, sortConfig, pinnedNotes);

      // Note 1 should be first (pinned), then Note 3, Note 2 (desc order)
      expect(result.map((n) => n.title)).toEqual(["Note 1", "Note 3", "Note 2"]);
    });

    it("should not mutate original array", () => {
      const originalOrder = notes.map((n) => n.title);
      const sortConfig: SortConfig = { key: "mtime", order: "desc" };
      const pinnedNotes = new Set<string>();

      sortNotes(notes, sortConfig, pinnedNotes);

      expect(notes.map((n) => n.title)).toEqual(originalOrder);
    });
  });

  describe("togglePinState", () => {
    it("should add note to empty pin set", () => {
      const pinnedNotes = new Set<string>();
      const result = togglePinState(pinnedNotes, "/note1.md");

      expect(result.has("/note1.md")).toBe(true);
      expect(result.size).toBe(1);
    });

    it("should add note to existing pin set", () => {
      const pinnedNotes = new Set(["/note1.md"]);
      const result = togglePinState(pinnedNotes, "/note2.md");

      expect(result.has("/note1.md")).toBe(true);
      expect(result.has("/note2.md")).toBe(true);
      expect(result.size).toBe(2);
    });

    it("should remove note from pin set", () => {
      const pinnedNotes = new Set(["/note1.md", "/note2.md"]);
      const result = togglePinState(pinnedNotes, "/note1.md");

      expect(result.has("/note1.md")).toBe(false);
      expect(result.has("/note2.md")).toBe(true);
      expect(result.size).toBe(1);
    });

    it("should not mutate original set", () => {
      const pinnedNotes = new Set(["/note1.md"]);
      const result = togglePinState(pinnedNotes, "/note2.md");

      expect(pinnedNotes.size).toBe(1);
      expect(pinnedNotes.has("/note2.md")).toBe(false);
      expect(result.size).toBe(2);
      expect(result.has("/note2.md")).toBe(true);
    });

    it("should handle toggle on same note multiple times", () => {
      let pinnedNotes = new Set<string>();

      // Add
      pinnedNotes = togglePinState(pinnedNotes, "/note1.md");
      expect(pinnedNotes.has("/note1.md")).toBe(true);

      // Remove
      pinnedNotes = togglePinState(pinnedNotes, "/note1.md");
      expect(pinnedNotes.has("/note1.md")).toBe(false);

      // Add again
      pinnedNotes = togglePinState(pinnedNotes, "/note1.md");
      expect(pinnedNotes.has("/note1.md")).toBe(true);
    });
  });

  describe("Integration: Frontmatter Date Sorting", () => {
    it("should sort notes by frontmatter date strings correctly", () => {
      const note1 = createMockNote(
        "Note 1",
        "/note1.md",
        "",
        [],
        { updated: "2024-01-15" }, // Newer date string
        new Date("2024-01-01") // Older file modification time
      );
      const note2 = createMockNote(
        "Note 2",
        "/note2.md",
        "",
        [],
        { updated: "2024-01-10" }, // Older date string
        new Date("2024-01-02") // Newer file modification time
      );
      const note3 = createMockNote(
        "Note 3",
        "/note3.md",
        "",
        [],
        null, // No frontmatter, should use lastModified
        new Date("2024-01-05")
      );

      const notes = [note2, note1, note3]; // Intentionally out of order
      const sortConfig: SortConfig = { key: "updated", order: "desc" };
      const result = sortNotes(notes, sortConfig, new Set());

      // Should be sorted by frontmatter 'updated' field descending (newest first)
      // Note 1: 2024-01-15 (from frontmatter)
      // Note 2: 2024-01-10 (from frontmatter)
      // Note 3: 2024-01-05 (from lastModified, no frontmatter)
      expect(result[0].path).toBe("/note1.md");
      expect(result[1].path).toBe("/note2.md");
      expect(result[2].path).toBe("/note3.md");
    });

    it("should handle mixed frontmatter date formats", () => {
      const note1 = createMockNote("Note 1", "/note1.md", "", [], {
        updated: "2024-01-15T10:30:00Z",
      }); // ISO string
      const note2 = createMockNote("Note 2", "/note2.md", "", [], { updated: "2024-01-10" }); // Date only
      const note3 = createMockNote("Note 3", "/note3.md", "", [], {
        updated: new Date("2024-01-20"),
      }); // Date object

      const notes = [note1, note2, note3];
      const sortConfig: SortConfig = { key: "updated", order: "desc" };
      const result = sortNotes(notes, sortConfig, new Set());

      // Should be sorted correctly regardless of date format
      expect(result[0].path).toBe("/note3.md"); // 2024-01-20
      expect(result[1].path).toBe("/note1.md"); // 2024-01-15
      expect(result[2].path).toBe("/note2.md"); // 2024-01-10
    });
  });
});
