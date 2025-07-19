import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatRelativeDate, getDisplayDate } from "./dateUtils";

describe("dateUtils", () => {
  let mockNow: Date;

  beforeEach(() => {
    // Mock current date to 2024-01-15 12:00:00
    mockNow = new Date("2024-01-15T12:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(mockNow);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("formatRelativeDate", () => {
    it("should format dates from today with time", () => {
      // 2 hours ago
      const date = new Date("2024-01-15T10:00:00.000Z");
      const result = formatRelativeDate(date);
      // Should match time format (either HH:MM or HH:MM AM/PM)
      expect(result).toMatch(/^\d{1,2}:\d{2}(\s?(AM|PM))?$/);
    });

    it("should format dates older than 24 hours with full date including year", () => {
      // 2 days ago
      const date = new Date("2024-01-13T12:00:00.000Z");
      const result = formatRelativeDate(date);
      expect(result).toMatch(/^2024\/1\/13$|^1\/13\/2024$/); // Different locales may format differently
    });

    it("should handle exactly 24 hours ago with full date", () => {
      // Exactly 24 hours ago - should show date, not time
      const date = new Date("2024-01-14T12:00:00.000Z");
      const result = formatRelativeDate(date);
      expect(result).toMatch(/^2024\/1\/14$|^1\/14\/2024$/); // Should show full date with year, not time
    });

    it("should format dates from different years with full date", () => {
      // From previous year
      const date = new Date("2023-01-08T12:00:00.000Z");
      const result = formatRelativeDate(date);
      expect(result).toMatch(/^2023\/1\/8$|^1\/8\/2023$/); // Different locales may format differently
    });

    it("should handle invalid dates", () => {
      const invalidDate = new Date("invalid");
      const result = formatRelativeDate(invalidDate);
      expect(result).toBe("Invalid date");
    });

    it("should handle non-Date objects", () => {
      const result = formatRelativeDate("not a date" as any);
      expect(result).toBe("Invalid date");
    });

    it("should handle future dates", () => {
      // 2 hours in the future
      const futureDate = new Date("2024-01-15T14:00:00.000Z");
      const result = formatRelativeDate(futureDate);
      // Should still format as time (either HH:MM or HH:MM AM/PM)
      expect(result).toMatch(/^\d{1,2}:\d{2}(\s?(AM|PM))?$/);
    });
  });

  describe("edge cases", () => {
    it("should handle daylight saving time transitions", () => {
      // Mock DST transition date
      vi.setSystemTime(new Date("2024-03-10T12:00:00.000Z")); // During DST change
      const date = new Date("2024-03-09T12:00:00.000Z");
      const result = formatRelativeDate(date);
      expect(result).toMatch(/^2024\/3\/9$|^3\/9\/2024$/); // Should show full date with year
    });

    it("should handle leap year dates correctly", () => {
      vi.setSystemTime(new Date("2024-02-29T12:00:00.000Z")); // Leap year
      const date = new Date("2024-02-28T12:00:00.000Z");
      const result = formatRelativeDate(date);
      expect(result).toMatch(/^2024\/2\/28$|^2\/28\/2024$/); // Should show full date with year
    });

    it("should handle cross-year date boundaries correctly", () => {
      vi.setSystemTime(new Date("2024-01-01T12:00:00.000Z")); // New Year's Day
      const date = new Date("2023-12-31T12:00:00.000Z"); // Yesterday, previous year
      const result = formatRelativeDate(date);
      // Should show full date with correct year
      expect(result).toMatch(/^2023\/12\/31$|^12\/31\/2023$/); // Different locales may format differently
    });

    it("should handle very old dates consistently", () => {
      vi.setSystemTime(new Date("2024-01-15T12:00:00.000Z"));
      const date = new Date("2020-05-10T12:00:00.000Z"); // 4 years ago
      const result = formatRelativeDate(date);
      expect(result).toMatch(/^2020\/5\/10$|^5\/10\/2020$/); // Should show full date with year
    });
  });

  describe("getDisplayDate", () => {
    const baseDate = new Date("2024-01-01T12:00:00.000Z");

    it("should return frontmatter updated date when available as string", () => {
      const note = {
        lastModified: baseDate,
        frontmatter: { updated: "2024-01-15" },
      };

      const result = getDisplayDate(note);
      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0); // January is 0
      expect(result.getDate()).toBe(15);
    });

    it("should return frontmatter updated date when available as Date object", () => {
      const frontmatterDate = new Date("2024-01-15T10:30:00.000Z");
      const note = {
        lastModified: baseDate,
        frontmatter: { updated: frontmatterDate },
      };

      const result = getDisplayDate(note);
      expect(result).toBe(frontmatterDate);
    });

    it("should fallback to lastModified when frontmatter updated is invalid", () => {
      const note = {
        lastModified: baseDate,
        frontmatter: { updated: "not-a-date" },
      };

      const result = getDisplayDate(note);
      expect(result).toBe(baseDate);
    });

    it("should fallback to lastModified when frontmatter updated is null", () => {
      const note = {
        lastModified: baseDate,
        frontmatter: { updated: null },
      };

      const result = getDisplayDate(note);
      expect(result).toBe(baseDate);
    });

    it("should fallback to lastModified when no frontmatter", () => {
      const note = {
        lastModified: baseDate,
        frontmatter: null,
      };

      const result = getDisplayDate(note);
      expect(result).toBe(baseDate);
    });

    it("should fallback to lastModified when frontmatter exists but no updated field", () => {
      const note = {
        lastModified: baseDate,
        frontmatter: { title: "Test Note", tags: ["test"] },
      };

      const result = getDisplayDate(note);
      expect(result).toBe(baseDate);
    });

    it("should handle ISO date strings in frontmatter", () => {
      const note = {
        lastModified: baseDate,
        frontmatter: { updated: "2024-01-15T10:30:00.000Z" },
      };

      const result = getDisplayDate(note);
      expect(result).toBeInstanceOf(Date);
      expect(result.getTime()).toBe(new Date("2024-01-15T10:30:00.000Z").getTime());
    });
  });
});
