/**
 * Comprehensive Error Handling Utilities
 *
 * Provides centralized error handling, logging, and recovery mechanisms
 * for the Card Explorer plugin.
 */

import { Notice } from "obsidian";

/**
 * Error severity levels for logging and user feedback
 */
export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

/**
 * Error categories for better error classification
 */
export enum ErrorCategory {
  API = "api",
  DATA = "data",
  UI = "ui",
  NETWORK = "network",
  PERMISSION = "permission",
  VALIDATION = "validation",
  UNKNOWN = "unknown",
}

/**
 * Structured error information
 */
export interface ErrorInfo {
  /** Error message for users */
  message: string;
  /** Technical error details for debugging */
  details?: string;
  /** Error category */
  category: ErrorCategory;
  /** Error severity level */
  severity: ErrorSeverity;
  /** Timestamp when error occurred */
  timestamp: number;
  /** Stack trace if available */
  stack?: string;
  /** Context information */
  context?: Record<string, any>;
  /** Whether error is recoverable */
  recoverable: boolean;
}

/**
 * Error handler configuration
 */
interface ErrorHandlerConfig {
  /** Whether to show user notifications */
  showNotifications: boolean;
  /** Whether to log to console */
  logToConsole: boolean;
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Retry delay in milliseconds */
  retryDelay: number;
}

/**
 * Retry operation options
 */
export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  category?: ErrorCategory;
  context?: Record<string, any>;
}

// Constants
const DEFAULT_ERROR_CONFIG: ErrorHandlerConfig = {
  showNotifications: true,
  logToConsole: true,
  maxRetries: 3,
  retryDelay: 1000,
};

const MAX_ERROR_LOG_SIZE = 100;
const NOTIFICATION_DURATIONS = {
  [ErrorSeverity.CRITICAL]: 10000,
  [ErrorSeverity.HIGH]: 7000,
  [ErrorSeverity.MEDIUM]: 5000,
  [ErrorSeverity.LOW]: 3000,
} as const;

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  category: ErrorCategory.UNKNOWN,
  context: {},
};

// Internal types
interface ErrorLogEntry extends ErrorInfo {
  id: string;
}

// Internal state
const errorLog: ErrorLogEntry[] = [];

// Internal utility functions

/**
 * Generates a unique error identifier for tracking purposes
 *
 * @returns A unique error ID string with timestamp and random component
 */
function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Adds an error to the internal error log with automatic size management
 *
 * @param error - The error information to log
 * @returns The generated error ID for tracking
 */
function addToErrorLog(error: ErrorInfo): string {
  const id = generateErrorId();
  const entry: ErrorLogEntry = { ...error, id };

  // Add to beginning of array (most recent first)
  errorLog.unshift(entry);

  // Maintain maximum log size by removing oldest entries
  if (errorLog.length > MAX_ERROR_LOG_SIZE) {
    errorLog.splice(MAX_ERROR_LOG_SIZE);
  }

  return id;
}

/**
 * Automatically categorizes and assigns severity to errors based on message content
 * Uses pattern matching to identify common error types
 *
 * @param message - The error message to analyze
 * @returns Object containing the determined category and severity
 */
function categorizeErrorByMessage(message: string): {
  category: ErrorCategory;
  severity: ErrorSeverity;
} {
  const lowerMessage = message.toLowerCase();

  // Network-related errors are typically high severity
  if (lowerMessage.includes("network")) {
    return { category: ErrorCategory.NETWORK, severity: ErrorSeverity.HIGH };
  }
  // Permission errors prevent functionality and are high severity
  if (lowerMessage.includes("permission")) {
    return { category: ErrorCategory.PERMISSION, severity: ErrorSeverity.HIGH };
  }
  // Validation errors are usually user-fixable and medium severity
  if (lowerMessage.includes("validation")) {
    return { category: ErrorCategory.VALIDATION, severity: ErrorSeverity.MEDIUM };
  }

  // Default to unknown category with medium severity
  return { category: ErrorCategory.UNKNOWN, severity: ErrorSeverity.MEDIUM };
}

/**
 * Extracts error information from various error types (Error objects, strings, objects)
 * Handles edge cases like circular references and non-serializable objects
 *
 * @param error - The error value to extract information from
 * @returns Object containing extracted message, details, and stack trace
 */
function extractErrorDetails(error: unknown): {
  message: string;
  details?: string;
  stack?: string;
} {
  // Standard Error objects have message, stack, and toString() method
  if (error instanceof Error) {
    return {
      message: error.message,
      details: error.toString(),
      stack: error.stack,
    };
  }

  // String errors are used as-is
  if (typeof error === "string") {
    return {
      message: error,
      details: error,
    };
  }

  // Handle object-like errors (may come from APIs or custom error objects)
  if (error && typeof error === "object") {
    try {
      const message = (error as any).message || "Unknown error";
      let details: string;
      try {
        // Attempt to serialize the object for debugging
        details = JSON.stringify(error);
      } catch {
        // Handle circular references or non-serializable content
        details = "[Object with circular reference or non-serializable content]";
      }
      return { message, details };
    } catch {
      // Fallback if object access fails
      return { message: "Unknown error" };
    }
  }

  // Fallback for all other types (null, undefined, numbers, etc.)
  return { message: "An unexpected error occurred" };
}

/**
 * Normalizes any error type into a structured ErrorInfo object
 * Applies automatic categorization and creates user-friendly messages
 *
 * @param error - The error to normalize
 * @param category - Optional category override (auto-detection takes precedence)
 * @param context - Additional context information for debugging
 * @returns Structured ErrorInfo object
 */
function normalizeError(
  error: unknown,
  category: ErrorCategory = ErrorCategory.UNKNOWN,
  context?: Record<string, any>
): ErrorInfo {
  const { message, details, stack } = extractErrorDetails(error);

  // Auto-categorize based on message content
  // Auto-detection takes precedence over provided category
  const autoCategory = categorizeErrorByMessage(message);
  if (autoCategory.category !== ErrorCategory.UNKNOWN) {
    category = autoCategory.category;
  } else if (category === ErrorCategory.UNKNOWN) {
    // Use auto-detected category even if it's UNKNOWN
    category = autoCategory.category;
  }

  const severity = autoCategory.severity;

  return {
    message: getUserFriendlyMessage(message, category),
    details,
    category,
    severity,
    timestamp: Date.now(),
    stack,
    context,
    recoverable: isRecoverableError(category, message),
  };
}

/**
 * Converts technical error messages into user-friendly explanations
 * Provides actionable guidance based on error category and content
 *
 * @param message - The original technical error message
 * @param category - The categorized error type
 * @returns User-friendly error message with actionable guidance
 */
function getUserFriendlyMessage(message: string, category: ErrorCategory): string {
  const lowerMessage = message.toLowerCase();

  switch (category) {
    case ErrorCategory.NETWORK:
      return "Network connection failed. Please check your connection and try again.";

    case ErrorCategory.PERMISSION:
      return "Permission denied. Please check file permissions and try again.";

    case ErrorCategory.API:
      // Provide specific guidance for different API failures
      if (lowerMessage.includes("vault")) {
        return "Failed to access vault. Please ensure Obsidian is running properly.";
      }
      if (lowerMessage.includes("metadata")) {
        return "Failed to read note metadata. Some notes may not display correctly.";
      }
      return "Failed to communicate with Obsidian. Please try refreshing.";

    case ErrorCategory.DATA:
      // Different messages for different data issues
      if (lowerMessage.includes("corrupt")) {
        return "Data corruption detected. Attempting to recover from backup.";
      }
      if (lowerMessage.includes("validation")) {
        return "Invalid input detected. Please check your settings and try again.";
      }
      return "Data processing failed. Please try refreshing your notes.";

    case ErrorCategory.UI:
      return "Interface error occurred. Please try refreshing the view.";

    case ErrorCategory.VALIDATION:
      return "Invalid input detected. Please check your settings and try again.";

    default:
      // Fallback pattern matching for uncategorized errors
      if (lowerMessage.includes("network")) {
        return "Network connection failed. Please check your connection and try again.";
      }
      if (lowerMessage.includes("permission")) {
        return "Permission denied. Please check file permissions and try again.";
      }
      // Return original message if no user-friendly alternative exists
      return message;
  }
}

/**
 * Determines if an error is recoverable through retry mechanisms
 * Some errors (like corrupted backups or permanent permission denials) should not be retried
 *
 * @param category - The error category
 * @param message - The error message to analyze
 * @returns True if the error might be recoverable through retry, false otherwise
 */
function isRecoverableError(category: ErrorCategory, message: string): boolean {
  const lowerMessage = message.toLowerCase();

  // Define patterns for non-recoverable errors that should not be retried
  const nonRecoverablePatterns = [
    // Corrupted backup files cannot be recovered through retry
    () => lowerMessage.includes("corrupt") && lowerMessage.includes("backup"),
    // Permission denied errors typically require user intervention
    () => category === ErrorCategory.PERMISSION && lowerMessage.includes("denied"),
  ];

  // Error is recoverable if it doesn't match any non-recoverable patterns
  return !nonRecoverablePatterns.some((pattern) => pattern());
}

/**
 * Maps error severity to appropriate console log level
 *
 * @param severity - The error severity level
 * @returns Console log method name to use
 */
function getLogLevel(severity: ErrorSeverity): "error" | "warn" | "info" {
  switch (severity) {
    case ErrorSeverity.CRITICAL:
    case ErrorSeverity.HIGH:
      return "error"; // Use console.error for high-priority issues
    case ErrorSeverity.MEDIUM:
      return "warn"; // Use console.warn for medium-priority issues
    case ErrorSeverity.LOW:
      return "info"; // Use console.info for low-priority issues
    default:
      return "warn"; // Default to warning level
  }
}

/**
 * Determines whether an error should trigger a user notification
 * Filters out low-severity and validation errors to avoid notification spam
 *
 * @param errorInfo - The error information
 * @returns True if a notification should be shown to the user
 */
function shouldShowNotification(errorInfo: ErrorInfo): boolean {
  return (
    errorInfo.severity !== ErrorSeverity.LOW && // Don't show notifications for low-severity issues
    errorInfo.category !== ErrorCategory.VALIDATION // Don't show notifications for validation errors
  );
}

/**
 * Displays an error notification to the user using Obsidian's Notice system
 * Duration is based on error severity (more severe errors stay visible longer)
 *
 * @param errorInfo - The error information to display
 */
function showErrorNotification(errorInfo: ErrorInfo): void {
  // Get duration based on severity, with fallback to medium duration
  const duration =
    NOTIFICATION_DURATIONS[errorInfo.severity] || NOTIFICATION_DURATIONS[ErrorSeverity.MEDIUM];
  new Notice(`Card Explorer: ${errorInfo.message}`, duration);
}

/**
 * Main error handler function that processes, logs, and displays errors
 * Provides centralized error handling with automatic categorization and user notifications
 *
 * @param error - The error to handle (can be Error object, string, or any value)
 * @param category - Optional error category (auto-detection takes precedence)
 * @param context - Additional context information for debugging
 * @param config - Configuration overrides for error handling behavior
 * @returns Structured ErrorInfo object with processed error details
 */
export function handleError(
  error: unknown,
  category: ErrorCategory = ErrorCategory.UNKNOWN,
  context?: Record<string, any>,
  config: Partial<ErrorHandlerConfig> = {}
): ErrorInfo {
  // Merge provided config with defaults
  const finalConfig = { ...DEFAULT_ERROR_CONFIG, ...config };
  const errorInfo = normalizeError(error, category, context);
  const errorId = addToErrorLog(errorInfo);

  // Console logging with appropriate log level
  if (finalConfig.logToConsole) {
    const logLevel = getLogLevel(errorInfo.severity);
    console[logLevel](`Card Explorer Error [${errorId}]:`, {
      message: errorInfo.message,
      details: errorInfo.details,
      category: errorInfo.category,
      severity: errorInfo.severity,
      context: errorInfo.context,
      stack: errorInfo.stack,
    });
  }

  // Show user notifications based on severity and category
  if (finalConfig.showNotifications && shouldShowNotification(errorInfo)) {
    showErrorNotification(errorInfo);
  }

  return errorInfo;
}

/**
 * Retry mechanism with exponential backoff for failed operations
 * Automatically retries recoverable errors with increasing delays
 *
 * @param operation - The async operation to retry
 * @param options - Retry configuration options
 * @returns The result of the successful operation
 * @throws The last error if all retry attempts fail
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: unknown;

  // Attempt operation up to maxRetries + 1 times (initial attempt + retries)
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry on the last attempt
      if (attempt === config.maxRetries) {
        break;
      }

      // Check if error is recoverable before retrying
      const errorInfo = normalizeError(error, config.category, config.context);
      if (!errorInfo.recoverable) {
        break; // Exit early for non-recoverable errors
      }

      // Calculate exponential backoff delay with maximum cap
      const delay = Math.min(config.baseDelay * 2 ** attempt, config.maxDelay);

      console.warn(
        `Card Explorer: Retry attempt ${attempt + 1}/${config.maxRetries} after ${delay}ms`,
        {
          error: errorInfo.message,
          context: config.context,
        }
      );

      // Wait before next retry attempt
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // All retry attempts failed, throw the last error
  throw lastError;
}

/**
 * Safe wrapper for synchronous operations that provides error handling with fallback
 * Prevents crashes by catching errors and returning a fallback value
 *
 * @param operation - The synchronous operation to execute safely
 * @param fallback - Value to return if the operation fails
 * @param category - Error category for proper handling and logging
 * @param context - Additional context for error debugging
 * @returns The operation result on success, or fallback value on error
 */
export function safeSync<T>(
  operation: () => T,
  fallback: T,
  category: ErrorCategory = ErrorCategory.UNKNOWN,
  context?: Record<string, any>
): T {
  try {
    return operation();
  } catch (error) {
    handleError(error, category, context);
    return fallback;
  }
}

/**
 * Safe wrapper for asynchronous operations that provides error handling with fallback
 * Prevents promise rejections by catching errors and returning a fallback value
 *
 * @param operation - The asynchronous operation to execute safely
 * @param fallback - Value to return if the operation fails
 * @param category - Error category for proper handling and logging
 * @param context - Additional context for error debugging
 * @returns The operation result on success, or fallback value on error
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  fallback: T,
  category: ErrorCategory = ErrorCategory.UNKNOWN,
  context?: Record<string, any>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    handleError(error, category, context);
    return fallback;
  }
}

/**
 * Retrieves recent error logs for debugging purposes
 * Returns errors in chronological order (most recent first)
 *
 * @param limit - Maximum number of errors to return (default: 10)
 * @returns Array of recent ErrorInfo objects without internal IDs
 */
export function getErrorLogs(limit = 10): ErrorInfo[] {
  return errorLog.slice(0, limit).map(({ id, ...errorInfo }) => errorInfo);
}

/**
 * Clears all stored error logs from memory
 * Useful for resetting error history during testing or maintenance
 */
export function clearErrorLogs(): void {
  errorLog.length = 0;
}
