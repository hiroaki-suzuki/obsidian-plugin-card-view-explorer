import { describe, expect, it } from "vitest";
import type { NoteData, SortConfig } from "../../types";
import { sortNotes, togglePinState } from "./sortLogic";

// Enhanced test data builder
class MockNoteBuilder {
  private note: Partial<NoteData> = {};

  static create(title: string, path: string): MockNoteBuilder {
    return new MockNoteBuilder().withTitle(title).withPath(path);
  }

  withTitle(title: string): MockNoteBuilder {
    this.note.title = title;
    this.note.preview = `Preview for ${title}`;
    return this;
  }

  withPath(path: string): MockNoteBuilder {
    this.note.path = path;
    return this;
  }

  withFolder(folder: string): MockNoteBuilder {
    this.note.folder = folder;
    return this;
  }

  withTags(tags: string[]): MockNoteBuilder {
    this.note.tags = tags;
    return this;
  }

  withFrontmatter(frontmatter: Record<string, any>): MockNoteBuilder {
    this.note.frontmatter = frontmatter;
    return this;
  }

  withDate(date: Date): MockNoteBuilder {
    this.note.lastModified = date;
    return this;
  }

  build(): NoteData {
    return {
      file: {} as any,
      title: this.note.title || "",
      path: this.note.path || "",
      preview: this.note.preview || "",
      // Use a fixed timestamp to avoid time-based flakiness
      lastModified: this.note.lastModified || new Date("2000-01-01T00:00:00.000Z"),
      frontmatter: this.note.frontmatter || null,
      tags: this.note.tags || [],
      folder: this.note.folder || "",
    };
  }
}

// Test data constants
const TEST_DATES = {
  EARLY: new Date("2024-01-01"),
  MIDDLE: new Date("2024-01-02"),
  LATE: new Date("2024-01-03"),
  SPECIFIC: new Date("2024-01-15T10:00:00Z"),
} as const;

const TEST_PATHS = {
  NOTE1: "/note1.md",
  NOTE2: "/note2.md",
  NOTE3: "/note3.md",
};

const SAMPLE_NOTES = {
  BASIC: [
    MockNoteBuilder.create("Note 1", TEST_PATHS.NOTE1).withDate(TEST_DATES.EARLY).build(),
    MockNoteBuilder.create("Note 2", TEST_PATHS.NOTE2).withDate(TEST_DATES.MIDDLE).build(),
    MockNoteBuilder.create("Note 3", TEST_PATHS.NOTE3).withDate(TEST_DATES.LATE).build(),
  ],
  WITH_PRIORITY: [
    MockNoteBuilder.create("Note 1", TEST_PATHS.NOTE1)
      .withFrontmatter({ priority: 3 })
      .withDate(TEST_DATES.EARLY)
      .build(),
    MockNoteBuilder.create("Note 2", TEST_PATHS.NOTE2)
      .withFrontmatter({ priority: 1 })
      .withDate(TEST_DATES.MIDDLE)
      .build(),
    MockNoteBuilder.create("Note 3", TEST_PATHS.NOTE3)
      .withFrontmatter({ priority: 2 })
      .withDate(TEST_DATES.LATE)
      .build(),
  ],
};

// Custom assertion helpers
const expectTitleOrder = (notes: NoteData[], expectedTitles: string[]) => {
  expect(notes.map((n) => n.title)).toEqual(expectedTitles);
};

const expectPathOrder = (notes: NoteData[], expectedPaths: string[]) => {
  expect(notes.map((n) => n.path)).toEqual(expectedPaths);
};

const expectSortedByField = (notes: NoteData[], field: string, expectedValues: any[]) => {
  const actualValues = notes.map((n) =>
    field === "mtime" ? n.lastModified : n.frontmatter?.[field]
  );
  expect(actualValues).toEqual(expectedValues);
};

describe("sortLogic", () => {
  describe("togglePinState", () => {
    it.each([
      {
        scenario: "empty pin set",
        initialPins: [],
        targetPath: TEST_PATHS.NOTE1,
        expectedHas: true,
        expectedSize: 1,
      },
      {
        scenario: "existing pin set",
        initialPins: [TEST_PATHS.NOTE1],
        targetPath: TEST_PATHS.NOTE2,
        expectedHas: true,
        expectedSize: 2,
      },
      {
        scenario: "removing from pin set",
        initialPins: [TEST_PATHS.NOTE1, TEST_PATHS.NOTE2],
        targetPath: TEST_PATHS.NOTE1,
        expectedHas: false,
        expectedSize: 1,
      },
    ])("should handle $scenario", ({ initialPins, targetPath, expectedHas, expectedSize }) => {
      const pinnedNotes = new Set(initialPins);
      const result = togglePinState(pinnedNotes, targetPath);

      expect(result.has(targetPath)).toBe(expectedHas);
      expect(result.size).toBe(expectedSize);
    });

    it("should not mutate original set", () => {
      const originalPins = new Set([TEST_PATHS.NOTE1]);
      const originalSize = originalPins.size;

      const result = togglePinState(originalPins, TEST_PATHS.NOTE2);

      expect(originalPins.size).toBe(originalSize);
      expect(originalPins.has(TEST_PATHS.NOTE2)).toBe(false);
      expect(result.has(TEST_PATHS.NOTE2)).toBe(true);
    });

    it("should handle toggle on same note multiple times", () => {
      let pinnedNotes = new Set<string>();

      // Add
      pinnedNotes = togglePinState(pinnedNotes, TEST_PATHS.NOTE1);
      expect(pinnedNotes.has(TEST_PATHS.NOTE1)).toBe(true);

      // Remove
      pinnedNotes = togglePinState(pinnedNotes, TEST_PATHS.NOTE1);
      expect(pinnedNotes.has(TEST_PATHS.NOTE1)).toBe(false);

      // Add again
      pinnedNotes = togglePinState(pinnedNotes, TEST_PATHS.NOTE1);
      expect(pinnedNotes.has(TEST_PATHS.NOTE1)).toBe(true);
    });
  });

  describe("sortNotes", () => {
    describe("basic mtime sorting", () => {
      it.each([
        {
          order: "asc" as const,
          expectedTitles: ["Note 1", "Note 2", "Note 3"],
        },
        {
          order: "desc" as const,
          expectedTitles: ["Note 3", "Note 2", "Note 1"],
        },
      ])("should sort by mtime in $order order", ({ order, expectedTitles }) => {
        const sortConfig: SortConfig = { key: "mtime", order };
        const result = sortNotes(SAMPLE_NOTES.BASIC, sortConfig, new Set());
        expectTitleOrder(result, expectedTitles);
      });
    });

    describe("frontmatter field sorting", () => {
      it.each([
        {
          field: "priority",
          order: "asc" as const,
          expectedValues: [1, 2, 3],
        },
        {
          field: "priority",
          order: "desc" as const,
          expectedValues: [3, 2, 1],
        },
      ])("should sort by $field in $order order", ({ field, order, expectedValues }) => {
        const sortConfig: SortConfig = { key: field, order };
        const result = sortNotes(SAMPLE_NOTES.WITH_PRIORITY, sortConfig, new Set());
        expectSortedByField(result, field, expectedValues);
      });
    });

    it("should handle string sorting case-insensitively", () => {
      const stringNotes = [
        MockNoteBuilder.create("Note 1", "/note1.md")
          .withFrontmatter({ status: "Completed" })
          .build(),
        MockNoteBuilder.create("Note 2", "/note2.md").withFrontmatter({ status: "active" }).build(),
        MockNoteBuilder.create("Note 3", "/note3.md")
          .withFrontmatter({ status: "Blocked" })
          .build(),
      ];

      const sortConfig: SortConfig = { key: "status", order: "asc" };
      const result = sortNotes(stringNotes, sortConfig, new Set());

      expectSortedByField(result, "status", ["active", "Blocked", "Completed"]);
    });

    it("should fallback to modification time when frontmatter field doesn't exist", () => {
      const notesWithMissingField = [
        MockNoteBuilder.create("Note 1", TEST_PATHS.NOTE1)
          .withFrontmatter({ priority: 5 })
          .withDate(TEST_DATES.LATE)
          .build(), // Has priority, latest date
        MockNoteBuilder.create("Note 2", TEST_PATHS.NOTE2)
          .withDate(TEST_DATES.EARLY)
          .build(), // No frontmatter, earliest date
        MockNoteBuilder.create("Note 3", TEST_PATHS.NOTE3)
          .withFrontmatter({ other: "value" })
          .withDate(TEST_DATES.MIDDLE)
          .build(), // No priority field, middle date
      ];

      const sortConfig: SortConfig = { key: "priority", order: "asc" };
      const result = sortNotes(notesWithMissingField, sortConfig, new Set());

      // Note 1 has priority 5, Note 2 and Note 3 fallback to mtime
      // Timestamps are much larger numbers than 5, so 5 comes first
      expectPathOrder(result, [TEST_PATHS.NOTE1, TEST_PATHS.NOTE2, TEST_PATHS.NOTE3]);
    });

    describe("date handling", () => {
      it.each([
        {
          scenario: "valid date strings",
          notes: [
            MockNoteBuilder.create("Note 1", "/note1.md")
              .withFrontmatter({ updated: "2024-01-15" })
              .withDate(TEST_DATES.EARLY)
              .build(),
            MockNoteBuilder.create("Note 2", "/note2.md")
              .withFrontmatter({ updated: "2024-01-10" })
              .withDate(TEST_DATES.MIDDLE)
              .build(),
            MockNoteBuilder.create("Note 3", "/note3.md")
              .withDate(TEST_DATES.LATE)
              .build(), // Should use mtime
          ],
          expectedOrder: ["/note1.md", "/note2.md", "/note3.md"], // desc order
        },
        {
          scenario: "mixed date formats",
          notes: [
            MockNoteBuilder.create("Note 1", "/note1.md")
              .withFrontmatter({ updated: "2024-01-15T10:30:00Z" })
              .build(), // ISO string
            MockNoteBuilder.create("Note 2", "/note2.md")
              .withFrontmatter({ updated: "2024-01-10" })
              .build(), // Date only
            MockNoteBuilder.create("Note 3", "/note3.md")
              .withFrontmatter({ updated: new Date("2024-01-20") })
              .build(), // Date object
          ],
          expectedOrder: ["/note3.md", "/note1.md", "/note2.md"],
        },
      ])("should handle $scenario", ({ notes, expectedOrder }) => {
        const sortConfig: SortConfig = { key: "updated", order: "desc" };
        const result = sortNotes(notes, sortConfig, new Set());
        expectPathOrder(result, expectedOrder);
      });

      it("should handle multiple invalid date strings and sort alphabetically", () => {
        const notesWithInvalidDates = [
          MockNoteBuilder.create("Note 1", "/note1.md")
            .withFrontmatter({ updated: "not-a-date" })
            .build(),
          MockNoteBuilder.create("Note 2", "/note2.md")
            .withFrontmatter({ updated: "also-invalid" })
            .build(),
          MockNoteBuilder.create("Note 3", "/note3.md").withFrontmatter({ updated: "x" }).build(),
          MockNoteBuilder.create("Note 4", "/note4.md")
            .withFrontmatter({ updated: "1800-01-01" })
            .build(),
        ];

        const sortConfig: SortConfig = { key: "updated", order: "asc" };
        const result = sortNotes(notesWithInvalidDates, sortConfig, new Set());

        // All invalid dates should be treated as strings and sorted alphabetically
        expectSortedByField(result, "updated", ["1800-01-01", "also-invalid", "not-a-date", "x"]);
      });

      it("should handle invalid date strings that pass initial validation", () => {
        const notesWithInvalidButPlausibleDates = [
          MockNoteBuilder.create("Note 1", "/note1.md")
            .withFrontmatter({ updated: "2024-13-45" })
            .build(), // Invalid month/day
          MockNoteBuilder.create("Note 2", "/note2.md")
            .withFrontmatter({ updated: "invalid 2024 date" })
            .build(), // Contains year but invalid
          MockNoteBuilder.create("Note 3", "/note3.md")
            .withFrontmatter({ updated: "abc 2024 xyz" })
            .build(), // Contains year but invalid format
        ];

        const sortConfig: SortConfig = { key: "updated", order: "asc" };
        const result = sortNotes(notesWithInvalidButPlausibleDates, sortConfig, new Set());

        // Should sort alphabetically as strings since all dates are invalid
        expectSortedByField(result, "updated", ["2024-13-45", "abc 2024 xyz", "invalid 2024 date"]);
      });
    });

    describe("pin integration", () => {
      it.each([
        {
          scenario: "ascending sort with multiple pins",
          order: "asc" as const,
          pins: [TEST_PATHS.NOTE3, TEST_PATHS.NOTE1],
          expectedTitles: ["Note 1", "Note 3", "Note 2"],
        },
        {
          scenario: "descending sort with single pin",
          order: "desc" as const,
          pins: [TEST_PATHS.NOTE1],
          expectedTitles: ["Note 1", "Note 3", "Note 2"],
        },
        {
          scenario: "all notes pinned",
          order: "asc" as const,
          pins: [TEST_PATHS.NOTE1, TEST_PATHS.NOTE2, TEST_PATHS.NOTE3],
          expectedTitles: ["Note 1", "Note 2", "Note 3"],
        },
      ])("should handle $scenario", ({ order, pins, expectedTitles }) => {
        const sortConfig: SortConfig = { key: "mtime", order };
        const pinnedNotes = new Set(pins);
        const result = sortNotes(SAMPLE_NOTES.BASIC, sortConfig, pinnedNotes);
        expectTitleOrder(result, expectedTitles);
      });
    });

    describe("edge cases", () => {
      it("should handle empty notes array", () => {
        const sortConfig: SortConfig = { key: "mtime", order: "asc" };
        const pinnedNotes = new Set([TEST_PATHS.NOTE1]);
        const result = sortNotes([], sortConfig, pinnedNotes);

        expect(result).toHaveLength(0);
      });

      it("should handle mixed equal and different values", () => {
        const mixedNotes = [
          MockNoteBuilder.create("Priority 1", "/p1.md").withFrontmatter({ priority: 1 }).build(),
          MockNoteBuilder.create("Priority 3 First", "/p3a.md")
            .withFrontmatter({ priority: 3 })
            .build(),
          MockNoteBuilder.create("Priority 3 Second", "/p3b.md")
            .withFrontmatter({ priority: 3 })
            .build(),
          MockNoteBuilder.create("Priority 2", "/p2.md").withFrontmatter({ priority: 2 }).build(),
          MockNoteBuilder.create("Priority 3 Third", "/p3c.md")
            .withFrontmatter({ priority: 3 })
            .build(),
        ];

        const sortConfig: SortConfig = { key: "priority", order: "asc" };
        const result = sortNotes(mixedNotes, sortConfig, new Set());

        // Should sort by priority: 1, 2, then three 3's in original order
        expectSortedByField(result, "priority", [1, 2, 3, 3, 3]);

        // Check that priority 3 notes maintain original order
        const priority3Notes = result.slice(2, 5);
        expectTitleOrder(priority3Notes, [
          "Priority 3 First",
          "Priority 3 Second",
          "Priority 3 Third",
        ]);
      });

      it("should handle notes with identical mtime fallback values", () => {
        const notesWithSameMtime = [
          MockNoteBuilder.create("Note X", "/noteX.md").withDate(TEST_DATES.SPECIFIC).build(),
          MockNoteBuilder.create("Note Y", "/noteY.md").withDate(TEST_DATES.SPECIFIC).build(),
          MockNoteBuilder.create("Note Z", "/noteZ.md").withDate(TEST_DATES.SPECIFIC).build(),
        ];

        const sortConfig: SortConfig = { key: "nonexistent", order: "asc" };
        const result = sortNotes(notesWithSameMtime, sortConfig, new Set());

        // All notes fall back to same mtime - original order should be maintained
        expectTitleOrder(result, ["Note X", "Note Y", "Note Z"]);

        // Verify all have same lastModified
        result.forEach((note) => {
          expect(note.lastModified.getTime()).toBe(TEST_DATES.SPECIFIC.getTime());
        });
      });
    });
  });
});
