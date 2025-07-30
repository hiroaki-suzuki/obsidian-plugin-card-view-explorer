import { describe, expect, it } from "vitest";
import type { FilterState, NoteData } from "../../types";
import { applyFilters, hasAnyActiveFilter } from "./filterLogic";

// Test Constants
const TEST_DATES = {
  NOW: new Date("2024-01-10T12:00:00Z"),
  RECENT: new Date("2024-01-08T12:00:00Z"), // 2 days ago
  MEDIUM: new Date("2024-01-05T12:00:00Z"), // 5 days ago
  OLD: new Date("2024-01-01T12:00:00Z"), // 9 days ago
} as const;

const EXPECTED_COUNTS = {
  ALL_NOTES: 5,
  PROJECT_NOTES: 2,
  WORK_TAGGED: 2,
  NOTE_TITLED: 4,
} as const;

// Test Data Builders
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

const createFiltersWith = (overrides: Partial<FilterState>): FilterState => ({
  folders: [],
  tags: [],
  filename: "",
  dateRange: null,
  ...overrides,
});

const createDateRangeFilter = (type: "within" | "after", value: Date | string) => ({
  type,
  value,
});

// Test Data Sets
const notes = [
  createMockNote("Project Note", "/project.md", "projects", ["work", "important"]),
  createMockNote("Personal Note", "/personal.md", "personal", ["diary", "private"]),
  createMockNote(
    "Meeting Notes",
    "/meetings.md",
    "projects/meetings",
    ["work"],
    null,
    TEST_DATES.RECENT
  ),
  createMockNote("Old Document", "/old.md", "archive", ["old"], null, TEST_DATES.OLD),
  createMockNote("Root Note", "/root.md", "", ["root"], null, TEST_DATES.MEDIUM),
];

const dateTestNotes = [
  createMockNote("Recent", "/recent.md", "", [], null, TEST_DATES.RECENT),
  createMockNote("Old", "/old.md", "", [], null, TEST_DATES.OLD),
];

// Helper Functions
const expectNoteTitles = (result: NoteData[], expectedTitles: string[]) => {
  const actualTitles = result.map((n) => n.title);
  expectedTitles.forEach((title) => {
    expect(actualTitles).toContain(title);
  });
};

const expectNoteCount = (result: NoteData[], expectedCount: number) => {
  expect(result).toHaveLength(expectedCount);
};

describe("filterLogic", () => {
  describe("hasAnyActiveFilter", () => {
    const testCases = [
      {
        description: "no filters are active",
        filters: createFiltersWith({}),
        expected: false,
      },
      {
        description: "folder filter is active",
        filters: createFiltersWith({ folders: ["projects"] }),
        expected: true,
      },
      {
        description: "tag filter is active",
        filters: createFiltersWith({ tags: ["work"] }),
        expected: true,
      },
      {
        description: "filename filter is active",
        filters: createFiltersWith({ filename: "test" }),
        expected: true,
      },
      {
        description: "filename filter is whitespace only",
        filters: createFiltersWith({ filename: "   " }),
        expected: false,
      },
      {
        description: "date range filter is active",
        filters: createFiltersWith({
          dateRange: createDateRangeFilter("within", new Date()),
        }),
        expected: true,
      },
      {
        description: "multiple filters are active",
        filters: createFiltersWith({
          folders: ["projects"],
          tags: ["work"],
          filename: "test",
          dateRange: createDateRangeFilter("after", new Date()),
        }),
        expected: true,
      },
    ];

    testCases.forEach(({ description, filters, expected }) => {
      it(`should return ${expected} when ${description}`, () => {
        expect(hasAnyActiveFilter(filters)).toBe(expected);
      });
    });
  });

  describe("applyFilters", () => {
    it("should return all notes when no filters are applied", () => {
      const filters = createFiltersWith({});
      const result = applyFilters(notes, filters, TEST_DATES.NOW);
      expectNoteCount(result, EXPECTED_COUNTS.ALL_NOTES);
      expect(result).toEqual(notes);
    });

    describe("folder filtering", () => {
      const folderTestCases = [
        {
          description: "exact folder match",
          folders: ["projects"],
          expectedCount: EXPECTED_COUNTS.PROJECT_NOTES,
          expectedTitles: ["Project Note", "Meeting Notes"],
          excludedTitles: ["Root Note"],
        },
        {
          description: "hierarchical folder match",
          folders: ["projects/meetings"],
          expectedCount: 1,
          expectedTitles: ["Meeting Notes"],
          excludedTitles: ["Project Note", "Root Note"],
        },
        {
          description: "multiple folders",
          folders: ["personal", "archive"],
          expectedCount: 2,
          expectedTitles: ["Personal Note", "Old Document"],
          excludedTitles: ["Root Note"],
        },
        {
          description: "nonexistent folder",
          folders: ["nonexistent"],
          expectedCount: 0,
          expectedTitles: [],
          excludedTitles: ["Root Note"],
        },
      ];

      folderTestCases.forEach(
        ({ description, folders, expectedCount, expectedTitles, excludedTitles }) => {
          it(`should filter notes by ${description}`, () => {
            const filters = createFiltersWith({ folders });
            const result = applyFilters(notes, filters, TEST_DATES.NOW);

            expectNoteCount(result, expectedCount);
            expectNoteTitles(result, expectedTitles);

            const actualTitles = result.map((n) => n.title);
            excludedTitles.forEach((title) => {
              expect(actualTitles).not.toContain(title);
            });
          });
        }
      );

      it("should include notes with empty folder when no folder filter is applied", () => {
        const filters = createFiltersWith({});
        const result = applyFilters(notes, filters, TEST_DATES.NOW);
        expectNoteTitles(result, ["Root Note"]);
      });
    });

    describe("tag filtering", () => {
      const tagTestCases = [
        {
          description: "single tag",
          tags: ["work"],
          expectedCount: EXPECTED_COUNTS.WORK_TAGGED,
          expectedTitles: ["Project Note", "Meeting Notes"],
        },
        {
          description: "multiple tags (OR logic)",
          tags: ["diary", "old"],
          expectedCount: 2,
          expectedTitles: ["Personal Note", "Old Document"],
        },
        {
          description: "nonexistent tag",
          tags: ["nonexistent"],
          expectedCount: 0,
          expectedTitles: [],
        },
      ];

      tagTestCases.forEach(({ description, tags, expectedCount, expectedTitles }) => {
        it(`should filter notes by ${description}`, () => {
          const filters = createFiltersWith({ tags });
          const result = applyFilters(notes, filters, TEST_DATES.NOW);
          expectNoteCount(result, expectedCount);
          expectNoteTitles(result, expectedTitles);
        });
      });
    });

    describe("filename filtering", () => {
      const filenameTestCases = [
        {
          description: "case-insensitive filename search",
          filename: "project",
          expectedCount: 1,
          expectedTitle: "Project Note",
        },
        {
          description: "partial filename match",
          filename: "Note",
          expectedCount: EXPECTED_COUNTS.NOTE_TITLED,
        },
        {
          description: "empty filename filter",
          filename: "",
          expectedCount: EXPECTED_COUNTS.ALL_NOTES,
        },
        {
          description: "whitespace-only filename filter",
          filename: "   ",
          expectedCount: EXPECTED_COUNTS.ALL_NOTES,
        },
      ];

      filenameTestCases.forEach(({ description, filename, expectedCount, expectedTitle }) => {
        it(`should handle ${description}`, () => {
          const filters = createFiltersWith({ filename });
          const result = applyFilters(notes, filters, TEST_DATES.NOW);
          expectNoteCount(result, expectedCount);

          if (expectedTitle) {
            expect(result[0].title).toBe(expectedTitle);
          }
        });
      });
    });

    describe("date range filtering", () => {
      const validDateTestCases = [
        {
          description: "no date filter specified",
          dateRange: null,
          expectedCount: 2,
          expectedTitle: undefined,
        },
        {
          description: "notes within date range",
          dateRange: createDateRangeFilter("within", TEST_DATES.MEDIUM),
          expectedCount: 1,
          expectedTitle: "Recent",
        },
        {
          description: "notes after specific date",
          dateRange: createDateRangeFilter("after", new Date("2024-01-07T12:00:00Z")),
          expectedCount: 1,
          expectedTitle: "Recent",
        },
        {
          description: "string date values in within filter",
          dateRange: createDateRangeFilter("within", "2024-01-05T12:00:00Z"),
          expectedCount: 1,
          expectedTitle: "Recent",
        },
        {
          description: "string date values in after filter",
          dateRange: createDateRangeFilter("after", "2024-01-07T12:00:00Z"),
          expectedCount: 1,
          expectedTitle: "Recent",
        },
      ];

      validDateTestCases.forEach(({ description, dateRange, expectedCount, expectedTitle }) => {
        it(`should handle ${description}`, () => {
          const filters = createFiltersWith({ dateRange });
          const result = applyFilters(dateTestNotes, filters, TEST_DATES.NOW);
          expectNoteCount(result, expectedCount);

          if (expectedTitle) {
            expect(result[0].title).toBe(expectedTitle);
          }
        });
      });

      const edgeCaseTestCases = [
        {
          description: "invalid string date values",
          dateRange: createDateRangeFilter("after", "invalid-date-string"),
          shouldNotThrow: true,
        },
        {
          description: "unknown date range types",
          dateRange: { type: "before" as any, value: new Date("2024-01-07T12:00:00Z") },
          expectedCount: 2,
        },
        {
          description: "empty string as date range type",
          dateRange: { type: "" as any, value: new Date("2024-01-07T12:00:00Z") },
          expectedCount: 2,
        },
        {
          description: "null as date range type",
          dateRange: { type: null as any, value: new Date("2024-01-07T12:00:00Z") },
          expectedCount: 2,
        },
      ];

      edgeCaseTestCases.forEach(({ description, dateRange, shouldNotThrow, expectedCount }) => {
        it(`should handle ${description} gracefully`, () => {
          const filters = createFiltersWith({ dateRange });

          if (shouldNotThrow) {
            expect(() => applyFilters(dateTestNotes, filters, TEST_DATES.NOW)).not.toThrow();
          } else {
            const result = applyFilters(dateTestNotes, filters, TEST_DATES.NOW);
            expectNoteCount(result, expectedCount!);
          }
        });
      });
    });

    describe("combined filtering", () => {
      const combinedTestCases = [
        {
          description: "multiple filters with AND logic",
          filters: createFiltersWith({
            folders: ["projects"],
            tags: ["work"],
            filename: "Project",
          }),
          expectedCount: 1,
          expectedTitle: "Project Note",
        },
        {
          description: "no notes match all criteria",
          filters: createFiltersWith({
            folders: ["projects"],
            tags: ["diary"], // Project notes don't have 'diary' tag
          }),
          expectedCount: 0,
        },
      ];

      combinedTestCases.forEach(({ description, filters, expectedCount, expectedTitle }) => {
        it(`should ${description}`, () => {
          const result = applyFilters(notes, filters, TEST_DATES.NOW);
          expectNoteCount(result, expectedCount);

          if (expectedTitle) {
            expect(result[0].title).toBe(expectedTitle);
          }
        });
      });
    });
  });
});
