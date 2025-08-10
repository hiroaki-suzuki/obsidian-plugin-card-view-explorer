import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorCategory, handleError, safeSync, withRetry } from "./errorHandling";

// Mock Obsidian Notice
vi.mock("obsidian", () => ({
  Notice: vi.fn(),
}));

// Test constants for commonly repeated values
const TEST_CONSTANTS = {
  NOTICE_TIMEOUT: 5000,
  API_ERROR_MESSAGE: "Failed to communicate with Obsidian. Please try refreshing.",
  NOTICE_PREFIX: "Card View Explorer: ",
  RETRY_CONFIG: { maxRetries: 2, baseDelay: 10 },
  EXPONENTIAL_BACKOFF_CONFIG: {
    maxRetries: 2,
    baseDelay: 100,
    maxDelay: 500,
  },
} as const;

describe("errorHandling", () => {
  let mockNotice: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Get the mocked Notice
    const obsidianModule = await import("obsidian");
    mockNotice = obsidianModule.Notice;

    // Mock console methods to suppress log output during tests
    // This prevents error messages from cluttering test output while still allowing
    // us to verify that console.error/warn are called correctly
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

      expect(result.message).toBe(TEST_CONSTANTS.API_ERROR_MESSAGE);
      expect(result.category).toBe(ErrorCategory.API);
      expect(result.timestamp).toBeTypeOf("number");
      expect(console.error).toHaveBeenCalled();
      expect(mockNotice).toHaveBeenCalledWith(
        `${TEST_CONSTANTS.NOTICE_PREFIX}${TEST_CONSTANTS.API_ERROR_MESSAGE}`,
        TEST_CONSTANTS.NOTICE_TIMEOUT
      );
    });

    it("should include context information", () => {
      const error = new Error("Test error");
      const context = { operation: "test", id: "123" };
      const result = handleError(error, ErrorCategory.API, context);

      expect(result.context).toEqual(context);
    });

    it("should not log to console when logToConsole is false", () => {
      const error = new Error("Test error");
      const result = handleError(error, ErrorCategory.API, undefined, { logToConsole: false });

      expect(result.message).toBe(TEST_CONSTANTS.API_ERROR_MESSAGE);
      expect(result.category).toBe(ErrorCategory.API);
      expect(console.error).not.toHaveBeenCalled();
      expect(mockNotice).toHaveBeenCalledWith(
        `${TEST_CONSTANTS.NOTICE_PREFIX}${TEST_CONSTANTS.API_ERROR_MESSAGE}`,
        TEST_CONSTANTS.NOTICE_TIMEOUT
      );
    });

    it("should not show notifications when showNotifications is false", () => {
      const error = new Error("Test error");
      const result = handleError(error, ErrorCategory.API, undefined, { showNotifications: false });

      expect(result.message).toBe(TEST_CONSTANTS.API_ERROR_MESSAGE);
      expect(result.category).toBe(ErrorCategory.API);
      expect(console.error).toHaveBeenCalled();
      expect(mockNotice).not.toHaveBeenCalled();
    });

    it("should not show notifications for UI errors", () => {
      const error = new Error("UI error");
      const result = handleError(error, ErrorCategory.UI);

      expect(mockNotice).not.toHaveBeenCalled();
      expect(result.message).toBe("Interface error occurred. Please try refreshing the view.");
    });

    it("should handle both showNotifications and logToConsole being false", () => {
      const error = new Error("Test error");
      const result = handleError(error, ErrorCategory.API, undefined, {
        showNotifications: false,
        logToConsole: false,
      });

      expect(result.message).toBe(TEST_CONSTANTS.API_ERROR_MESSAGE);
      expect(result.category).toBe(ErrorCategory.API);
      expect(console.error).not.toHaveBeenCalled();
      expect(mockNotice).not.toHaveBeenCalled();
    });

    it("should include stack trace in details when Error has stack", () => {
      const error = new Error("Test error with stack");
      // Create a mock stack trace
      error.stack =
        "Error: Test error with stack\n    at testFunction (test.js:10:5)\n    at Object.<anonymous> (test.js:15:3)";

      const result = handleError(error, ErrorCategory.GENERAL);

      expect(result.message).toBe("Test error with stack");
      expect(result.details).toBe(error.stack);
      expect(result.category).toBe(ErrorCategory.GENERAL);
      expect(result.timestamp).toBeTypeOf("number");
    });

    it("should fallback to toString when Error has no stack", () => {
      const error = new Error("Test error without stack");
      // Remove stack property to simulate error without stack trace
      delete (error as any).stack;

      const result = handleError(error, ErrorCategory.GENERAL);

      expect(result.message).toBe("Test error without stack");
      expect(result.details).toBe(error.toString());
      expect(result.category).toBe(ErrorCategory.GENERAL);
    });

    it("should handle Error with empty stack", () => {
      const error = new Error("Test error with empty stack");
      error.stack = "";

      const result = handleError(error, ErrorCategory.GENERAL);

      expect(result.message).toBe("Test error with empty stack");
      expect(result.details).toBe(error.toString());
      expect(result.category).toBe(ErrorCategory.GENERAL);
    });

    it("should append cause info when Error has cause (TS 4.6+)", () => {
      const inner = new Error("Inner cause");
      const outer: any = new Error("Outer error");
      outer.stack =
        "Error: Outer error\n    at outerFn (file.js:1:1)\n    at Object.<anonymous> (file.js:2:2)";
      outer.cause = inner;

      const result = handleError(outer, ErrorCategory.GENERAL);

      expect(result.message).toBe("Outer error");
      expect(result.details).toBe(`${outer.stack}\nCaused by: ${String(inner)}`);
      expect(result.category).toBe(ErrorCategory.GENERAL);
    });

    it("should include cause even when stack is missing", () => {
      const outer: any = new Error("No stack error");
      delete outer.stack; // simulate runtime without stack
      outer.cause = "string cause";

      const result = handleError(outer, ErrorCategory.GENERAL);

      expect(result.message).toBe("No stack error");
      expect(result.details).toBe(`${outer.toString()}\nCaused by: string cause`);
      expect(result.category).toBe(ErrorCategory.GENERAL);
    });

    describe.each([
      [
        "String error message",
        ErrorCategory.DATA,
        "Data processing failed. Please try refreshing your notes.",
      ],
      [undefined, ErrorCategory.GENERAL, "An unexpected error occurred"],
      [null, ErrorCategory.GENERAL, "An unexpected error occurred"],
      [42, ErrorCategory.GENERAL, "An unexpected error occurred"],
    ])("handleError with non-Error inputs", (error, category, expectedMessage) => {
      it(`should handle ${typeof error} errors`, () => {
        const result = handleError(error, category);
        expect(result.message).toBe(expectedMessage);
        expect(result.category).toBe(category);
      });
    });

    it("should handle object errors", () => {
      const errorObj = { message: "Object error", code: 500 };
      const result = handleError(errorObj, ErrorCategory.API);

      expect(result.message).toBe(TEST_CONSTANTS.API_ERROR_MESSAGE);
      expect(result.category).toBe(ErrorCategory.API);
    });

    it("should handle object errors without message property", () => {
      const errorObj = { code: 500, status: "Internal Server Error" };
      const result = handleError(errorObj, ErrorCategory.API);

      expect(result.message).toBe(TEST_CONSTANTS.API_ERROR_MESSAGE);
      expect(result.category).toBe(ErrorCategory.API);
      expect(result.details).toBe(JSON.stringify(errorObj));
    });

    describe.each([
      [
        { message: "", code: 500 },
        ErrorCategory.DATA,
        "Data processing failed. Please try refreshing your notes.",
      ],
      [{ message: null, code: 500 }, ErrorCategory.GENERAL, "Unknown error"],
      [{ message: undefined, code: 500 }, ErrorCategory.GENERAL, "Unknown error"],
    ])(
      "handleError with object errors with invalid message",
      (errorObj, category, expectedMessage) => {
        it(`should handle object with ${errorObj.message === "" ? "empty" : String(errorObj.message)} message`, () => {
          const result = handleError(errorObj, category);
          expect(result.message).toBe(expectedMessage);
          expect(result.category).toBe(category);
          expect(result.details).toBe(JSON.stringify(errorObj));
        });
      }
    );

    it("should handle circular reference in error objects", () => {
      const circularError: any = { message: "Circular error" };
      circularError.self = circularError;

      const result = handleError(circularError, ErrorCategory.DATA);

      expect(result.message).toBe("Data processing failed. Please try refreshing your notes.");
      expect(result.category).toBe(ErrorCategory.DATA);
      expect(result.details).toBe("[Object with circular reference]");
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

    it("should use GENERAL category as default", () => {
      const error = new Error("Test error");
      const result = handleError(error);

      expect(result.category).toBe(ErrorCategory.GENERAL);
      expect(result.message).toBe("Test error");
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
      const result = await withRetry(operation, TEST_CONSTANTS.RETRY_CONFIG);
      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it("should fail after max retries", async () => {
      const operation = vi.fn().mockRejectedValue(new Error("Persistent failure"));
      await expect(withRetry(operation, TEST_CONSTANTS.RETRY_CONFIG)).rejects.toThrow(
        "Persistent failure"
      );
      expect(operation).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    describe.each(["Permission denied", "Data is corrupt"])(
      "withRetry should not retry non-retryable errors",
      (errorMessage) => {
        it(`should not retry ${errorMessage} errors`, async () => {
          const operation = vi.fn().mockRejectedValue(new Error(errorMessage));
          await expect(withRetry(operation, TEST_CONSTANTS.RETRY_CONFIG)).rejects.toThrow(
            errorMessage
          );
          expect(operation).toHaveBeenCalledTimes(1); // no retries
        });
      }
    );

    it("should use exponential backoff", async () => {
      const operation = vi
        .fn()
        .mockRejectedValueOnce(new Error("Temp error"))
        .mockRejectedValueOnce(new Error("Temp error"))
        .mockResolvedValue("success");
      vi.useFakeTimers();
      const resultPromise = withRetry(operation, TEST_CONSTANTS.EXPONENTIAL_BACKOFF_CONFIG);
      // For baseDelay=100 and exponential backoff, expect 100 + 200 = 300ms total delay before success.
      await vi.advanceTimersByTimeAsync(300);
      const result = await resultPromise;
      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(3);
      vi.useRealTimers();
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
      const firstCall = vi.mocked(console.error).mock.calls[0];
      expect(firstCall?.[0]).toBe("Card View Explorer Error:");
      expect(firstCall?.[1]).toEqual(expect.objectContaining({ category: ErrorCategory.DATA }));
    });

    it("should include context in error handling", () => {
      const operation = () => {
        throw new Error("Test error");
      };
      const context = { operation: "test" };
      safeSync(operation, "fallback", ErrorCategory.API, context);
      const firstCall = vi.mocked(console.error).mock.calls[0];
      expect(firstCall?.[0]).toBe("Card View Explorer Error:");
      expect(firstCall?.[1]).toEqual(expect.objectContaining({ context }));
    });
  });
});
