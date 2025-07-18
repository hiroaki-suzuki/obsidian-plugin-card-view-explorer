import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorCategory, handleError, safeSync, withRetry } from "./errorHandling";

// Mock Obsidian Notice
vi.mock("obsidian", () => ({
  Notice: vi.fn(),
}));

describe("Error Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock console methods
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
});
