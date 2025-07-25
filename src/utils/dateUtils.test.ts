import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NoteData } from "../types";
import { formatRelativeDate, getDisplayDate } from "./dateUtils";

/**
 * Test data constants for consistent date testing.
 * All dates are in UTC to avoid timezone-related test flakiness.
 */
const TEST_DATES = {
  BASE_DATE: new Date("2024-01-01T12:00:00.000Z"),
  MOCK_NOW: new Date("2024-01-15T12:00:00.000Z"),
  FRONTMATTER_DATE: new Date("2024-01-15T10:30:00.000Z"),
  HOURS_AGO_2: new Date("2024-01-15T10:00:00.000Z"),
  DAYS_AGO_2: new Date("2024-01-13T12:00:00.000Z"),
  HOURS_AGO_24: new Date("2024-01-14T12:00:00.000Z"),
  PREVIOUS_YEAR: new Date("2023-01-08T12:00:00.000Z"),
  FUTURE_DATE: new Date("2024-01-15T14:00:00.000Z"),
} as const;

/**
 * Regex patterns for validating date format outputs.
 * Accounts for different locale formatting (US vs. international formats).
 */
const REGEX_PATTERNS = {
  TIME_FORMAT: /^\d{1,2}:\d{2}(\s?(AM|PM))?$/,
  DATE_FORMAT_2024_1_13: /^2024\/1\/13$|^1\/13\/2024$/,
  DATE_FORMAT_2024_1_14: /^2024\/1\/14$|^1\/14\/2024$/,
  DATE_FORMAT_2023_1_8: /^2023\/1\/8$|^1\/8\/2023$/,
  DATE_FORMAT_2024_3_9: /^2024\/3\/9$|^3\/9\/2024$/,
  DATE_FORMAT_2024_2_28: /^2024\/2\/28$|^2\/28\/2024$/,
  DATE_FORMAT_2023_12_31: /^2023\/12\/31$|^12\/31\/2023$/,
} as const;

/**
 * Factory function to create test notes with frontmatter containing an updated field.
 * @param updated - The value to set in frontmatter.updated (can be any type for testing)
 * @param lastModified - The file's last modified date (defaults to BASE_DATE)
 * @returns A note-like object for testing
 */
const createNoteWithFrontmatter = (updated: unknown, lastModified = TEST_DATES.BASE_DATE) => ({
  lastModified,
  frontmatter: { updated },
});

/**
 * Factory function to create test notes without frontmatter.
 * @param lastModified - The file's last modified date (defaults to BASE_DATE)
 * @returns A note-like object for testing
 */
const createNoteWithoutFrontmatter = (lastModified = TEST_DATES.BASE_DATE) => ({
  lastModified,
  frontmatter: null,
});

describe("dateUtils", () => {
  let mockNow: Date;

  beforeEach(() => {
    // Set up deterministic time for consistent test results
    mockNow = TEST_DATES.MOCK_NOW;
    vi.useFakeTimers();
    vi.setSystemTime(mockNow);
  });

  afterEach(() => {
    // Clean up fake timers to prevent test interference
    vi.useRealTimers();
  });

  describe("getDisplayDate", () => {
    describe("when frontmatter contains valid updated dates", () => {
      // Test cases covering different valid date formats that should be parsed successfully
      const validDateTestCases = [
        {
          description: "string date",
          value: "2024-01-15",
          expectedYear: 2024,
          expectedMonth: 0, // January is 0 in JavaScript Date
          expectedDay: 15,
        },
        {
          description: "Date object",
          value: TEST_DATES.FRONTMATTER_DATE,
          expectedDate: TEST_DATES.FRONTMATTER_DATE,
        },
        {
          description: "ISO string",
          value: "2024-01-15T10:30:00.000Z",
          expectedTime: new Date("2024-01-15T10:30:00.000Z").getTime(),
        },
      ];

      it.each(validDateTestCases)(
        "should return frontmatter updated date when available as $description",
        ({ value, expectedYear, expectedMonth, expectedDay, expectedDate, expectedTime }) => {
          const note = createNoteWithFrontmatter(value);
          const result = getDisplayDate(note as any);

          expect(result).toBeInstanceOf(Date);

          if (expectedDate) {
            expect(result).toBe(expectedDate);
          } else if (expectedTime) {
            expect(result.getTime()).toBe(expectedTime);
          } else if (expectedYear && expectedMonth !== undefined && expectedDay) {
            expect(result.getFullYear()).toBe(expectedYear);
            expect(result.getMonth()).toBe(expectedMonth);
            expect(result.getDate()).toBe(expectedDay);
          }
        }
      );
    });

    describe("when frontmatter contains invalid updated values", () => {
      // Test cases for values that should trigger fallback to lastModified
      const fallbackTestCases = [
        { description: "invalid string", value: "not-a-date" },
        { description: "empty string", value: "" },
        { description: "whitespace only", value: "   " },
        { description: "impossible date", value: "2024-13-45" }, // 13th month, 45th day
        { description: "number", value: 123456 as any },
        { description: "null", value: null as any },
        { description: "undefined", value: undefined },
      ];

      it.each(fallbackTestCases)(
        "should fallback to lastModified when frontmatter updated is $description",
        ({ value }) => {
          const note = createNoteWithFrontmatter(value);
          const result = getDisplayDate(note as any);
          expect(result).toBe(note.lastModified);
        }
      );
    });

    describe("when frontmatter is missing or empty", () => {
      it("should fallback to lastModified when no frontmatter", () => {
        const note = createNoteWithoutFrontmatter();
        const result = getDisplayDate(note as any);
        expect(result).toBe(note.lastModified);
      });

      it("should fallback to lastModified when frontmatter exists but no updated field", () => {
        const note = {
          lastModified: TEST_DATES.BASE_DATE,
          frontmatter: { title: "Test Note", tags: ["test"] },
        };
        const result = getDisplayDate(note as any);
        expect(result).toBe(note.lastModified);
      });
    });
  });

  describe("formatRelativeDate", () => {
    describe("input validation", () => {
      const invalidInputTestCases = [
        { description: "invalid Date object", value: new Date("invalid") },
        { description: "non-Date object", value: "not a date" as any },
      ];

      it.each(invalidInputTestCases)(
        "should return 'Invalid date' for $description",
        ({ value }) => {
          const result = formatRelativeDate(value);
          expect(result).toBe("Invalid date");
        }
      );
    });

    describe("time-based formatting (< 24 hours)", () => {
      const recentDateTestCases = [
        { description: "2 hours ago", date: TEST_DATES.HOURS_AGO_2 },
        { description: "future date", date: TEST_DATES.FUTURE_DATE },
      ];

      it.each(recentDateTestCases)("should format $description with time format", ({ date }) => {
        const result = formatRelativeDate(date);
        expect(result).toMatch(REGEX_PATTERNS.TIME_FORMAT);
      });
    });

    describe("date-based formatting (>= 24 hours)", () => {
      const olderDateTestCases = [
        {
          description: "2 days ago",
          date: TEST_DATES.DAYS_AGO_2,
          expectedPattern: REGEX_PATTERNS.DATE_FORMAT_2024_1_13,
        },
        {
          description: "exactly 24 hours ago",
          date: TEST_DATES.HOURS_AGO_24,
          expectedPattern: REGEX_PATTERNS.DATE_FORMAT_2024_1_14,
        },
        {
          description: "previous year",
          date: TEST_DATES.PREVIOUS_YEAR,
          expectedPattern: REGEX_PATTERNS.DATE_FORMAT_2023_1_8,
        },
      ];

      it.each(olderDateTestCases)(
        "should format $description with full date including year",
        ({ date, expectedPattern }) => {
          const result = formatRelativeDate(date);
          expect(result).toMatch(expectedPattern);
        }
      );
    });

    describe("edge cases", () => {
      // Critical edge cases that could cause formatting issues in real-world usage
      const edgeCaseTestCases = [
        {
          description: "daylight saving time transitions",
          mockSystemTime: new Date("2024-03-10T12:00:00.000Z"), // DST transition period
          testDate: new Date("2024-03-09T12:00:00.000Z"),
          expectedPattern: REGEX_PATTERNS.DATE_FORMAT_2024_3_9,
        },
        {
          description: "leap year dates",
          mockSystemTime: new Date("2024-02-29T12:00:00.000Z"), // Valid leap year date
          testDate: new Date("2024-02-28T12:00:00.000Z"),
          expectedPattern: REGEX_PATTERNS.DATE_FORMAT_2024_2_28,
        },
        {
          description: "cross-year date boundaries",
          mockSystemTime: new Date("2024-01-01T12:00:00.000Z"), // New Year's Day
          testDate: new Date("2023-12-31T12:00:00.000Z"), // Previous year
          expectedPattern: REGEX_PATTERNS.DATE_FORMAT_2023_12_31,
        },
      ];

      it.each(edgeCaseTestCases)(
        "should handle $description correctly",
        ({ mockSystemTime, testDate, expectedPattern }) => {
          // Temporarily override system time for this specific test case
          vi.setSystemTime(mockSystemTime);
          const result = formatRelativeDate(testDate);
          expect(result).toMatch(expectedPattern);
        }
      );
    });
  });
});
