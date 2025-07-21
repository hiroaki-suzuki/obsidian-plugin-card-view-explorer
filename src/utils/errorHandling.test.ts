import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorCategory, handleError, safeSync, withRetry } from "./errorHandling";

// Mock Obsidian Notice
vi.mock("obsidian", () => ({
  Notice: vi.fn(),
}));

describe("Error Handling - Simplified", () => {
  let mockNotice: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Get the mocked Notice
    const obsidianModule = await import("obsidian");
    mockNotice = obsidianModule.Notice;

    // Mock console methods
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("handleError", () => {
    it("should handle errors with default config", () => {
      const error = new Error("Test error");
      const result = handleError(error, ErrorCategory.API);

      expect(result.message).toBe("Failed to communicate with Obsidian. Please try refreshing.");
      expect(result.category).toBe(ErrorCategory.API);
      expect(result.timestamp).toBeTypeOf("number");
      expect(console.error).toHaveBeenCalled();
      expect(mockNotice).toHaveBeenCalledWith(
        "Card View Explorer: Failed to communicate with Obsidian. Please try refreshing.",
        5000
      );
    });

    it("should handle string errors", () => {
      const error = "String error message";
      const result = handleError(error, ErrorCategory.DATA);

      expect(result.message).toBe("Data processing failed. Please try refreshing your notes.");
      expect(result.category).toBe(ErrorCategory.DATA);
    });

    it("should handle object errors", () => {
      const errorObj = { message: "Object error", code: 500 };
      const result = handleError(errorObj, ErrorCategory.API);

      expect(result.message).toBe("Failed to communicate with Obsidian. Please try refreshing.");
      expect(result.category).toBe(ErrorCategory.API);
    });

    it("should provide specific messages for API errors", () => {
      const vaultError = new Error("vault access failed");
      const metadataError = new Error("metadata read error");

      const result1 = handleError(vaultError, ErrorCategory.API);
      const result2 = handleError(metadataError, ErrorCategory.API);

      expect(result1.message).toBe(
        "Failed to access vault. Please ensure Obsidian is running properly."
      );
      expect(result2.message).toBe(
        "Failed to read note metadata. Some notes may not display correctly."
      );
    });

    it("should not show notifications for UI errors", () => {
      const error = new Error("UI error");
      handleError(error, ErrorCategory.UI);

      expect(mockNotice).not.toHaveBeenCalled();
    });

    it("should include context information", () => {
      const error = new Error("Test error");
      const context = { operation: "test", id: "123" };
      const result = handleError(error, ErrorCategory.API, context);

      expect(result.context).toEqual(context);
    });

    it("should use GENERAL category as default", () => {
      const error = new Error("Test error");
      const result = handleError(error);

      expect(result.category).toBe(ErrorCategory.GENERAL);
    });
  });

  describe("withRetry", () => {
    it("should succeed on first attempt", async () => {
      const operation = vi.fn().mockResolvedValue("success");
      const result = await withRetry(operation);

      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("should retry on failure and succeed", async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error("Temporary failure"))
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
      expect(operation).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it("should not retry non-retryable errors", async () => {
      const operation = vi.fn().mockRejectedValue(new Error("Permission denied"));

      await expect(withRetry(operation, { maxRetries: 2, baseDelay: 10 })).rejects.toThrow(
        "Permission denied"
      );
      expect(operation).toHaveBeenCalledTimes(1); // no retries
    });

    it("should not retry corruption errors", async () => {
      const operation = vi.fn().mockRejectedValue(new Error("Data is corrupt"));

      await expect(withRetry(operation, { maxRetries: 2, baseDelay: 10 })).rejects.toThrow(
        "Data is corrupt"
      );
      expect(operation).toHaveBeenCalledTimes(1); // no retries
    });

    it("should use exponential backoff", async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error("Temp error"))
        .mockRejectedValueOnce(new Error("Temp error"))
        .mockResolvedValue("success");

      const startTime = Date.now();
      const result = await withRetry(operation, {
        maxRetries: 2,
        baseDelay: 100,
        maxDelay: 500,
      });
      const duration = Date.now() - startTime;

      expect(result).toBe("success");
      expect(duration).toBeGreaterThan(100); // At least one delay
      expect(operation).toHaveBeenCalledTimes(3);
    });
  });

  describe("safeSync", () => {
    it("should return result on success", () => {
      const operation = () => "success";
      const result = safeSync(operation, "fallback");

      expect(result).toBe("success");
    });

    it("should return fallback on error", () => {
      const operation = () => {
        throw new Error("Test error");
      };
      const result = safeSync(operation, "fallback");

      expect(result).toBe("fallback");
      expect(console.error).toHaveBeenCalled();
    });

    it("should use specified error category", () => {
      const operation = () => {
        throw new Error("Test error");
      };
      safeSync(operation, "fallback", ErrorCategory.DATA);

      expect(console.error).toHaveBeenCalledWith(
        "Card View Explorer Error:",
        expect.objectContaining({
          category: ErrorCategory.DATA,
        })
      );
    });

    it("should include context in error handling", () => {
      const operation = () => {
        throw new Error("Test error");
      };
      const context = { operation: "test" };
      safeSync(operation, "fallback", ErrorCategory.API, context);

      expect(console.error).toHaveBeenCalledWith(
        "Card View Explorer Error:",
        expect.objectContaining({
          context,
        })
      );
    });
  });

  describe("ErrorCategory enum", () => {
    it("should export all expected categories", () => {
      expect(ErrorCategory.API).toBe("api");
      expect(ErrorCategory.DATA).toBe("data");
      expect(ErrorCategory.UI).toBe("ui");
      expect(ErrorCategory.GENERAL).toBe("general");
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined errors", () => {
      const result = handleError(undefined);
      expect(result.message).toBe("An unexpected error occurred");
    });

    it("should handle null errors", () => {
      const result = handleError(null);
      expect(result.message).toBe("An unexpected error occurred");
    });

    it("should handle number errors", () => {
      const result = handleError(42);
      expect(result.message).toBe("An unexpected error occurred");
    });

    it("should handle circular reference in error objects", () => {
      const circularError: any = { message: "Circular error" };
      circularError.self = circularError;

      const result = handleError(circularError);
      expect(result.message).toBe("Circular error");
    });
  });
});
