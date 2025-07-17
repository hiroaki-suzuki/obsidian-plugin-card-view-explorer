import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearErrorLog,
  ErrorCategory,
  ErrorSeverity,
  getErrorLog,
  getErrorStats,
  handleError,
  normalizeError,
  safeAsync,
  safeSync,
  withRetry,
} from "./errorHandling";

// Mock Obsidian Notice
vi.mock("obsidian", () => ({
  Notice: vi.fn(),
}));

describe("Error Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearErrorLog();
    // Mock console methods
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("normalizeError", () => {
    it("should normalize Error objects", () => {
      const error = new Error("Test error");
      const result = normalizeError(error, ErrorCategory.API);

      expect(result.message).toBe("Failed to communicate with Obsidian. Please try refreshing.");
      expect(result.details).toBe("Error: Test error");
      expect(result.category).toBe(ErrorCategory.API);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
      expect(result.stack).toBe(error.stack);
    });

    it("should normalize string errors", () => {
      const error = "String error message";
      const result = normalizeError(error, ErrorCategory.DATA);

      expect(result.message).toBe("Data processing failed. Please try refreshing your notes.");
      expect(result.details).toBe(error);
      expect(result.category).toBe(ErrorCategory.DATA);
    });

    it("should normalize unknown errors", () => {
      const error = { custom: "object" };
      const result = normalizeError(error, ErrorCategory.UNKNOWN);

      expect(result.message).toBe("Unknown error");
      expect(result.details).toBe(JSON.stringify(error));
      expect(result.category).toBe(ErrorCategory.UNKNOWN);
    });

    it("should categorize network errors", () => {
      const error = new Error("Network connection failed");
      const result = normalizeError(error);

      expect(result.category).toBe(ErrorCategory.NETWORK);
      expect(result.severity).toBe(ErrorSeverity.HIGH);
      expect(result.message).toBe(
        "Network connection failed. Please check your connection and try again."
      );
    });

    it("should categorize permission errors", () => {
      const error = new Error("Permission denied");
      const result = normalizeError(error);

      expect(result.category).toBe(ErrorCategory.PERMISSION);
      expect(result.severity).toBe(ErrorSeverity.HIGH);
      expect(result.message).toBe(
        "Permission denied. Please check file permissions and try again."
      );
    });
  });

  describe("handleError", () => {
    it("should handle errors with default config", () => {
      const error = new Error("Test error");
      const result = handleError(error, ErrorCategory.API);

      expect(result.category).toBe(ErrorCategory.API);
      expect(console.warn).toHaveBeenCalled();
    });

    it("should handle errors with custom config", () => {
      const error = new Error("Test error");
      const result = handleError(error, ErrorCategory.API, {}, { logToConsole: false });

      expect(result.category).toBe(ErrorCategory.API);
      expect(console.warn).not.toHaveBeenCalled();
    });

    it("should add errors to log", () => {
      const error = new Error("Test error");
      handleError(error, ErrorCategory.API);

      const log = getErrorLog();
      expect(log).toHaveLength(1);
      expect(log[0].message).toBe("Failed to communicate with Obsidian. Please try refreshing.");
    });

    it("should use appropriate log level for severity", () => {
      // Create an error that will be categorized as high severity
      const criticalError = new Error("Permission denied access");
      handleError(criticalError, ErrorCategory.PERMISSION, {}, { showNotifications: false });

      // Should use error level for high severity permission errors
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("withRetry", () => {
    it("should succeed on first attempt", async () => {
      const operation = vi.fn().mockResolvedValue("success");
      const result = await withRetry(operation);

      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("should retry on failure", async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error("First failure"))
        .mockResolvedValue("success");

      const result = await withRetry(operation, { maxRetries: 2, baseDelay: 10 });

      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it("should fail after max retries", async () => {
      const operation = vi.fn().mockRejectedValue(new Error("Persistent failure"));

      await expect(withRetry(operation, { maxRetries: 2, baseDelay: 10 })).rejects.toThrow(
        "Persistent failure"
      );
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it("should not retry non-recoverable errors", async () => {
      const operation = vi.fn().mockRejectedValue(new Error("Permission denied"));

      await expect(withRetry(operation, { maxRetries: 2, baseDelay: 10 })).rejects.toThrow(
        "Permission denied"
      );
      expect(operation).toHaveBeenCalledTimes(1); // No retries for permission errors
    });
  });

  describe("safeAsync", () => {
    it("should return result on success", async () => {
      const operation = vi.fn().mockResolvedValue("success");
      const result = await safeAsync(operation, "fallback");

      expect(result).toBe("success");
    });

    it("should return fallback on error", async () => {
      const operation = vi.fn().mockRejectedValue(new Error("Failure"));
      const result = await safeAsync(operation, "fallback");

      expect(result).toBe("fallback");
    });
  });

  describe("safeSync", () => {
    it("should return result on success", () => {
      const operation = vi.fn().mockReturnValue("success");
      const result = safeSync(operation, "fallback");

      expect(result).toBe("success");
    });

    it("should return fallback on error", () => {
      const operation = vi.fn().mockImplementation(() => {
        throw new Error("Failure");
      });
      const result = safeSync(operation, "fallback");

      expect(result).toBe("fallback");
    });
  });

  describe("error log management", () => {
    it("should maintain error log", () => {
      handleError(new Error("Error 1"), ErrorCategory.API);
      handleError(new Error("Error 2"), ErrorCategory.DATA);

      const log = getErrorLog();
      expect(log).toHaveLength(2);
      expect(log[0].category).toBe(ErrorCategory.DATA); // Most recent first
      expect(log[1].category).toBe(ErrorCategory.API);
    });

    it("should clear error log", () => {
      handleError(new Error("Error 1"), ErrorCategory.API);
      clearErrorLog();

      const log = getErrorLog();
      expect(log).toHaveLength(0);
    });

    it("should provide error statistics", () => {
      handleError(new Error("API Error"), ErrorCategory.API);
      handleError(new Error("Data Error"), ErrorCategory.DATA);
      handleError(new Error("Another API Error"), ErrorCategory.API);

      const stats = getErrorStats();
      expect(stats.total).toBe(3);
      expect(stats.byCategory[ErrorCategory.API]).toBe(2);
      expect(stats.byCategory[ErrorCategory.DATA]).toBe(1);
      expect(stats.recent).toBe(3); // All recent
    });
  });
});
