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
export interface ErrorHandlerConfig {
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
 * Default error handler configuration
 */
const DEFAULT_ERROR_CONFIG: ErrorHandlerConfig = {
  showNotifications: true,
  logToConsole: true,
  maxRetries: 3,
  retryDelay: 1000,
};

/**
 * Error log entry for debugging
 */
interface ErrorLogEntry extends ErrorInfo {
  /** Unique error ID */
  id: string;
}

/**
 * In-memory error log (last 100 errors)
 */
const errorLog: ErrorLogEntry[] = [];
const MAX_ERROR_LOG_SIZE = 100;

/**
 * Generate unique error ID
 */
function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Add error to log
 */
function addToErrorLog(error: ErrorInfo): string {
  const id = generateErrorId();
  const entry: ErrorLogEntry = { ...error, id };

  errorLog.unshift(entry);

  // Keep only the most recent errors
  if (errorLog.length > MAX_ERROR_LOG_SIZE) {
    errorLog.splice(MAX_ERROR_LOG_SIZE);
  }

  return id;
}

/**
 * Convert unknown error to structured ErrorInfo
 */
function normalizeError(
  error: unknown,
  category: ErrorCategory = ErrorCategory.UNKNOWN,
  context?: Record<string, any>
): ErrorInfo {
  let message = "An unexpected error occurred";
  let details: string | undefined;
  let stack: string | undefined;
  let severity = ErrorSeverity.MEDIUM;

  if (error instanceof Error) {
    message = error.message;
    details = error.toString();
    stack = error.stack;

    // Categorize based on error message
    if (error.message.toLowerCase().includes("network")) {
      category = ErrorCategory.NETWORK;
      severity = ErrorSeverity.HIGH;
    } else if (error.message.toLowerCase().includes("permission")) {
      category = ErrorCategory.PERMISSION;
      severity = ErrorSeverity.HIGH;
    } else if (error.message.toLowerCase().includes("validation")) {
      category = ErrorCategory.VALIDATION;
      severity = ErrorSeverity.MEDIUM;
    }
  } else if (typeof error === "string") {
    message = error;
    details = error;
  } else if (error && typeof error === "object") {
    try {
      message = (error as any).message || "Unknown error";
    } catch (_accessError) {
      message = "Unknown error";
    }
    try {
      details = JSON.stringify(error);
    } catch (_jsonError) {
      // Handle circular references or other JSON.stringify errors
      details = "[Object with circular reference or non-serializable content]";
    }
  }

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
 * Convert technical error messages to user-friendly messages
 */
function getUserFriendlyMessage(message: string, category: ErrorCategory): string {
  const lowerMessage = message.toLowerCase();

  // Network errors
  if (category === ErrorCategory.NETWORK || lowerMessage.includes("network")) {
    return "Network connection failed. Please check your connection and try again.";
  }

  // Permission errors
  if (category === ErrorCategory.PERMISSION || lowerMessage.includes("permission")) {
    return "Permission denied. Please check file permissions and try again.";
  }

  // API errors
  if (category === ErrorCategory.API) {
    if (lowerMessage.includes("vault")) {
      return "Failed to access vault. Please ensure Obsidian is running properly.";
    }
    if (lowerMessage.includes("metadata")) {
      return "Failed to read note metadata. Some notes may not display correctly.";
    }
    return "Failed to communicate with Obsidian. Please try refreshing.";
  }

  // Data errors
  if (category === ErrorCategory.DATA) {
    if (lowerMessage.includes("corrupt")) {
      return "Data corruption detected. Attempting to recover from backup.";
    }
    if (lowerMessage.includes("validation")) {
      return "Invalid data detected. Using default values.";
    }
    return "Data processing failed. Please try refreshing your notes.";
  }

  // UI errors
  if (category === ErrorCategory.UI) {
    return "Interface error occurred. Please try refreshing the view.";
  }

  // Validation errors
  if (category === ErrorCategory.VALIDATION) {
    return "Invalid input detected. Please check your settings and try again.";
  }

  // Return original message if no specific handling
  return message;
}

/**
 * Determine if an error is recoverable
 */
function isRecoverableError(category: ErrorCategory, message: string): boolean {
  const lowerMessage = message.toLowerCase();

  // Non-recoverable errors
  if (lowerMessage.includes("corrupt") && lowerMessage.includes("backup")) {
    return false; // Corruption with no backup
  }

  if (category === ErrorCategory.PERMISSION && lowerMessage.includes("denied")) {
    return false; // Permission denied usually requires manual intervention
  }

  // Most other errors are recoverable
  return true;
}

/**
 * Main error handler function
 */
export function handleError(
  error: unknown,
  category: ErrorCategory = ErrorCategory.UNKNOWN,
  context?: Record<string, any>,
  config: Partial<ErrorHandlerConfig> = {}
): ErrorInfo {
  const finalConfig = { ...DEFAULT_ERROR_CONFIG, ...config };
  const errorInfo = normalizeError(error, category, context);

  // Add to error log
  const errorId = addToErrorLog(errorInfo);

  // Console logging
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

  // User notifications
  if (finalConfig.showNotifications && shouldShowNotification(errorInfo)) {
    showErrorNotification(errorInfo);
  }

  return errorInfo;
}

/**
 * Get appropriate console log level for error severity
 */
function getLogLevel(severity: ErrorSeverity): "error" | "warn" | "info" {
  switch (severity) {
    case ErrorSeverity.CRITICAL:
    case ErrorSeverity.HIGH:
      return "error";
    case ErrorSeverity.MEDIUM:
      return "warn";
    case ErrorSeverity.LOW:
      return "info";
    default:
      return "warn";
  }
}

/**
 * Determine if error should show user notification
 */
function shouldShowNotification(errorInfo: ErrorInfo): boolean {
  // Don't show notifications for low severity errors
  if (errorInfo.severity === ErrorSeverity.LOW) {
    return false;
  }

  // Don't show notifications for validation errors (usually handled in UI)
  if (errorInfo.category === ErrorCategory.VALIDATION) {
    return false;
  }

  return true;
}

/**
 * Show error notification to user
 */
function showErrorNotification(errorInfo: ErrorInfo): void {
  const duration = getNotificationDuration(errorInfo.severity);
  new Notice(`Card Explorer: ${errorInfo.message}`, duration);
}

/**
 * Get notification duration based on severity
 */
function getNotificationDuration(severity: ErrorSeverity): number {
  switch (severity) {
    case ErrorSeverity.CRITICAL:
      return 10000; // 10 seconds
    case ErrorSeverity.HIGH:
      return 7000; // 7 seconds
    case ErrorSeverity.MEDIUM:
      return 5000; // 5 seconds
    case ErrorSeverity.LOW:
      return 3000; // 3 seconds
    default:
      return 5000;
  }
}

/**
 * Retry mechanism with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    category?: ErrorCategory;
    context?: Record<string, any>;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    category = ErrorCategory.UNKNOWN,
    context,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Don't retry non-recoverable errors
      const errorInfo = normalizeError(error, category, context);
      if (!errorInfo.recoverable) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelay * 2 ** attempt, maxDelay);

      // Log retry attempt
      console.warn(`Card Explorer: Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`, {
        error: errorInfo.message,
        context,
      });

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // All retries failed, handle the error
  throw lastError;
}

/**
 * Safe sync operation wrapper
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
