/**
 * Error Handling Utilities
 *
 * Provides essential error handling functionality for the Card Explorer plugin.
 */

import { Notice } from "obsidian";

/**
 * Error categories for classification and handling behavior
 *
 * Categories determine user notification behavior and retry strategies:
 * - API: Obsidian API communication errors, typically retriable
 * - DATA: Data processing/validation failures, may require user intervention
 * - UI: Interface rendering errors, notifications suppressed to avoid spam
 * - GENERAL: Uncategorized errors, default handling
 */
export enum ErrorCategory {
  API = "api",
  DATA = "data",
  UI = "ui",
  GENERAL = "general",
}

/**
 * Error information structure
 */
export interface ErrorInfo {
  /** User-friendly error message */
  message: string;
  /** Technical details for debugging */
  details?: string;
  /** Error category */
  category: ErrorCategory;
  /** Timestamp when error occurred */
  timestamp: number;
  /** Context information */
  context?: Record<string, any>;
}

/**
 * Configuration for error handling behavior
 *
 * Controls how errors are presented to users and logged for debugging
 */
interface ErrorConfig {
  /** Show user notifications via Obsidian Notice */
  showNotifications: boolean;
  /** Log detailed error information to console */
  logToConsole: boolean;
}

/**
 * Retry operation options with exponential backoff configuration
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in milliseconds before first retry (default: 1000) */
  baseDelay?: number;
  /** Maximum delay in milliseconds to prevent excessive waits (default: 10000) */
  maxDelay?: number;
  /** Error category for proper handling behavior */
  category?: ErrorCategory;
  /** Additional context for error reporting */
  context?: Record<string, any>;
}

// Default configurations
const DEFAULT_CONFIG: ErrorConfig = {
  showNotifications: true,
  logToConsole: true,
};

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  category: ErrorCategory.GENERAL,
  context: {},
};

/**
 * Extract basic error information from various error types
 *
 * Handles Error objects, strings, generic objects, and unknown types safely.
 * Protects against circular reference issues in object serialization.
 */
function extractErrorInfo(error: unknown): { message: string; details?: string } {
  if (error instanceof Error) {
    return {
      message: error.message,
      details: error.stack || error.toString(),
    };
  }

  if (typeof error === "string") {
    return { message: error };
  }

  if (error && typeof error === "object") {
    try {
      const message = (error as any).message || "Unknown error";
      let details: string;
      try {
        details = JSON.stringify(error);
      } catch {
        // Handle circular references or non-serializable objects
        details = "[Object with circular reference]";
      }
      return { message, details };
    } catch {
      return { message: "Unknown error" };
    }
  }

  return { message: "An unexpected error occurred" };
}

/**
 * Convert technical error messages to user-friendly messages
 *
 * Transforms technical API errors into actionable user guidance based on
 * error category and common Obsidian API failure patterns.
 */
function getUserFriendlyMessage(message: string, category: ErrorCategory): string {
  const lowerMessage = message.toLowerCase();

  switch (category) {
    case ErrorCategory.API:
      if (lowerMessage.includes("vault")) {
        return "Failed to access vault. Please ensure Obsidian is running properly.";
      }
      if (lowerMessage.includes("metadata")) {
        return "Failed to read note metadata. Some notes may not display correctly.";
      }
      return "Failed to communicate with Obsidian. Please try refreshing.";

    case ErrorCategory.DATA:
      return "Data processing failed. Please try refreshing your notes.";

    case ErrorCategory.UI:
      return "Interface error occurred. Please try refreshing the view.";

    default:
      return message;
  }
}

/**
 * Check if an error should be retried
 *
 * Determines retry eligibility based on error patterns. Permanent failures
 * like permission errors and data corruption are excluded from retry attempts.
 */
function isRetryable(message: string): boolean {
  const lowerMessage = message.toLowerCase();

  // Don't retry permission errors or corruption issues
  if (lowerMessage.includes("permission") && lowerMessage.includes("denied")) {
    return false;
  }
  if (lowerMessage.includes("corrupt")) {
    return false;
  }

  return true;
}

/**
 * Main error handler with configurable notification and logging behavior
 *
 * Processes errors consistently across the plugin with category-specific handling:
 * - Extracts and transforms error information
 * - Provides user-friendly messages based on error patterns
 * - Logs technical details for debugging
 * - Shows notifications (suppressed for UI errors to prevent spam)
 *
 * @param error - The error to handle (any type)
 * @param category - Error category for specialized handling
 * @param context - Additional context for debugging
 * @param config - Override default notification/logging behavior
 * @returns Structured error information
 */
export function handleError(
  error: unknown,
  category: ErrorCategory = ErrorCategory.GENERAL,
  context?: Record<string, any>,
  config: Partial<ErrorConfig> = {}
): ErrorInfo {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const { message, details } = extractErrorInfo(error);

  const errorInfo: ErrorInfo = {
    message: getUserFriendlyMessage(message, category),
    details,
    category,
    timestamp: Date.now(),
    context,
  };

  // Console logging
  if (finalConfig.logToConsole) {
    console.error(`Card Explorer Error:`, {
      message: errorInfo.message,
      details: errorInfo.details,
      category: errorInfo.category,
      context: errorInfo.context,
    });
  }

  // User notifications (suppressed for UI errors to avoid notification spam)
  if (finalConfig.showNotifications && category !== ErrorCategory.UI) {
    new Notice(`Card Explorer: ${errorInfo.message}`, 5000);
  }

  return errorInfo;
}

/**
 * Retry mechanism with exponential backoff for transient failures
 *
 * Implements intelligent retry logic for operations that may fail temporarily:
 * - Uses exponential backoff: delay = baseDelay * 2^attempt
 * - Respects maximum delay to prevent excessive waiting
 * - Skips retry for permanent failures (permissions, corruption)
 * - Provides retry attempt logging for debugging
 *
 * @param operation - Async operation to retry on failure
 * @param options - Retry configuration options
 * @returns Promise that resolves with operation result or rejects with final error
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry on last attempt
      if (attempt === config.maxRetries) {
        break;
      }

      // Check if error should be retried
      const { message } = extractErrorInfo(error);
      if (!isRetryable(message)) {
        break;
      }

      // Calculate delay with exponential backoff: baseDelay * 2^attempt, capped at maxDelay
      const delay = Math.min(config.baseDelay * 2 ** attempt, config.maxDelay);

      console.warn(
        `Card Explorer: Retry attempt ${attempt + 1}/${config.maxRetries} after ${delay}ms`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Safe wrapper for synchronous operations with fallback handling
 *
 * Executes synchronous operations safely and returns fallback value on error.
 * Automatically handles errors through the main error handler.
 *
 * @param operation - Synchronous operation to execute safely
 * @param fallback - Value to return if operation fails
 * @param category - Error category for proper handling
 * @param context - Additional error context
 * @returns Operation result or fallback value
 */
export function safeSync<T>(
  operation: () => T,
  fallback: T,
  category: ErrorCategory = ErrorCategory.GENERAL,
  context?: Record<string, any>
): T {
  try {
    return operation();
  } catch (error) {
    handleError(error, category, context);
    return fallback;
  }
}
