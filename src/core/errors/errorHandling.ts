/**
 * Error handling utilities for Card View Explorer plugin
 *
 * This module provides centralized error handling functionality including:
 * - Categorized error processing with user-friendly messages
 * - Exponential backoff retry mechanism for transient failures
 * - Safe execution wrappers with fallback values
 * - Structured error information with context and timestamps
 *
 * All errors are logged to console and optionally displayed as Obsidian notifications,
 * with different handling strategies based on error category (API, Data, UI, General).
 */
import { Notice } from "obsidian";

/**
 * Categorizes errors for appropriate handling and user messaging.
 * Used to determine retry behavior and notification display.
 */
export enum ErrorCategory {
  /** Obsidian API related errors (vault access, metadata, etc.) */
  API = "api",
  /** Data processing and validation errors */
  DATA = "data",
  /** User interface rendering and interaction errors */
  UI = "ui",
  /** General application errors without specific category */
  GENERAL = "general",
}

/**
 * Structured error information with context and categorization.
 * Provides comprehensive error data for logging and user feedback.
 */
interface ErrorInfo {
  /** User-friendly error message */
  message: string;
  /** Technical details including stack trace */
  details?: string;
  /** Error category for handling strategy */
  category: ErrorCategory;
  /** When the error occurred (Unix timestamp) */
  timestamp: number;
  /** Additional context data for debugging */
  context?: Record<string, any>;
}

/**
 * Configuration for error handling behavior.
 * Controls notification display and console logging.
 */
interface ErrorConfig {
  /** Whether to show Obsidian notifications to user */
  showNotifications: boolean;
  /** Whether to log errors to browser console */
  logToConsole: boolean;
}

/**
 * Options for retry mechanism configuration.
 * Implements exponential backoff with configurable limits.
 */
interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in milliseconds (default: 1000) */
  baseDelay?: number;
  /** Maximum delay cap in milliseconds (default: 10000) */
  maxDelay?: number;
  /** Error category for context (default: GENERAL) */
  category?: ErrorCategory;
  /** Additional context for error tracking */
  context?: Record<string, any>;
}

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
 * Centralized error handling with categorization and user feedback.
 * Converts technical errors into user-friendly messages and provides
 * structured logging with contextual information.
 *
 * @param error - The error to handle (Error, string, or unknown object)
 * @param category - Error category for appropriate handling strategy
 * @param context - Additional debugging context
 * @param config - Override default notification and logging behavior
 * @returns Structured error information for further processing
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

  if (finalConfig.logToConsole) {
    console.error(
      `Card View Explorer Error:`,
      {
        message: errorInfo.message,
        details: errorInfo.details,
        category: errorInfo.category,
        timestamp: errorInfo.timestamp,
        context: errorInfo.context,
      },
      // Provide the raw error for native stack rendering/click-through
      error
    );
  }

  // UI errors are handled by React error boundaries, no need for notifications
  if (finalConfig.showNotifications && category !== ErrorCategory.UI) {
    new Notice(`Card View Explorer: ${errorInfo.message}`, 5000);
  }

  return errorInfo;
}

/**
 * Executes an async operation with exponential backoff retry mechanism.
 * Automatically retries transient failures while avoiding permanent errors
 * like permission denials or data corruption.
 *
 * @param operation - The async operation to execute
 * @param options - Retry configuration options
 * @returns Result of the successful operation
 * @throws The last error if all retry attempts fail
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

      if (attempt === config.maxRetries) {
        break;
      }

      const { message } = extractErrorInfo(error);
      if (!isRetryable(message)) {
        break;
      }

      // Exponential backoff: baseDelay * 2^attempt, capped at maxDelay
      const delay = Math.min(config.baseDelay * 2 ** attempt, config.maxDelay);

      console.warn(
        `Card View Explorer: Retry attempt ${attempt + 1}/${config.maxRetries} after ${delay}ms`
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Executes a synchronous operation with error handling and fallback.
 * Provides safe execution for operations that might fail, ensuring
 * the application continues with a reasonable fallback value.
 *
 * @param operation - The synchronous operation to execute
 * @param fallback - Value to return if operation fails
 * @param category - Error category for proper handling
 * @param context - Additional context for error tracking
 * @returns Result of operation or fallback value on error
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

// Private Functions

/**
 * Extracts error information from unknown error types.
 * Handles various error formats including Error objects, strings,
 * and plain objects, providing consistent error information structure.
 */
function extractErrorInfo(error: unknown): { message: string; details?: string } {
  const MAX_DETAILS_LEN = 10_000; // ~10KB cap

  if (error instanceof Error) {
    const cause =
      // TS 4.6+ Error has optional cause; guard for runtime
      (error as any).cause ? `\nCaused by: ${(error as any).cause}` : "";
    const details = (error.stack || error.toString()) + cause;
    return {
      message: error.message,
      details: details.slice(0, MAX_DETAILS_LEN),
    };
  }

  if (typeof error === "string") {
    return { message: error.slice(0, MAX_DETAILS_LEN) };
  }

  if (error && typeof error === "object") {
    const message = (error as any).message || "Unknown error";
    let details: string;
    try {
      details = JSON.stringify(error);
    } catch {
      // Handle circular references in error objects
      details = "[Object with circular reference]";
    }
    return { message, details: details.slice(0, MAX_DETAILS_LEN) };
  }

  return { message: "An unexpected error occurred" };
}

/**
 * Converts technical error messages into user-friendly messages.
 * Categorizes errors and provides contextual guidance for resolution.
 * Falls back to original message for uncategorized errors.
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
 * Determines if an error is worth retrying based on its message.
 * Permanent errors like permission denials or data corruption should not be retried,
 * while transient network or resource errors are suitable for retry.
 */
function isRetryable(message: string): boolean {
  const lowerMessage = message.toLowerCase();

  // Permanent errors that should not be retried
  if (lowerMessage.includes("permission") && lowerMessage.includes("denied")) {
    return false;
  }
  if (lowerMessage.includes("corrupt")) {
    return false;
  }

  // Default to retryable for unknown errors (likely transient)
  return true;
}
