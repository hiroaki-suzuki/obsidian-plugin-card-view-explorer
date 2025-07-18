import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatRelativeDate } from "./dateUtils";

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

    it("should format dates from this week with day of week", () => {
      // 2 days ago (Saturday)
      const date = new Date("2024-01-13T12:00:00.000Z");
      const result = formatRelativeDate(date);
      expect(result).toBe("Sat");
    });

    it("should format older dates with month and day", () => {
      // 10 days ago
      const date = new Date("2024-01-05T12:00:00.000Z");
      const result = formatRelativeDate(date);
      expect(result).toBe("Jan 5");
    });

    it("should handle exactly 24 hours ago", () => {
      // Exactly 24 hours ago
      const date = new Date("2024-01-14T12:00:00.000Z");
      const result = formatRelativeDate(date);
      expect(result).toBe("Sun"); // Should show day of week, not time
    });

    it("should handle exactly 7 days ago", () => {
      // Exactly 7 days ago
      const date = new Date("2024-01-08T12:00:00.000Z");
      const result = formatRelativeDate(date);
      expect(result).toBe("Jan 8"); // Should show month and day
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
      expect(result).toBe("Sat"); // Should still work correctly
    });

    it("should handle leap year dates", () => {
      vi.setSystemTime(new Date("2024-02-29T12:00:00.000Z")); // Leap year
      const date = new Date("2024-02-28T12:00:00.000Z");
      const result = formatRelativeDate(date);
      expect(result).toBe("Wed");
    });

    it("should handle year boundaries", () => {
      vi.setSystemTime(new Date("2024-01-01T12:00:00.000Z")); // New Year's Day
      const date = new Date("2023-12-31T12:00:00.000Z"); // Yesterday, previous year
      const result = formatRelativeDate(date);
      // This is exactly 24 hours ago, so should show day of week, not month/day
      expect(result).toBe("Sun");
    });
  });
});
