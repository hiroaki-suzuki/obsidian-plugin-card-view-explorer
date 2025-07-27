/**
 * Data backup and recovery utilities for the Card View Explorer plugin.
 *
 * This module implements a robust backup system that maintains a rolling history
 * of plugin data states. The backup system follows a defensive approach where
 * corrupted or invalid data can be automatically recovered from the most recent
 * valid backup entry.
 */

import type { PluginData } from "../types";
import { ErrorCategory, handleError } from "./errorHandling";
import { validatePluginData } from "./validation";

/**
 * Represents a single backup entry containing plugin data at a specific point in time.
 */
export interface DataBackup {
  /** Unix timestamp when the backup was created */
  timestamp: number;
  /** Data version at the time of backup creation */
  version: number;
  /** Deep clone of the plugin data at backup time */
  data: PluginData;
}

/**
 * Result object returned by data recovery operations.
 */
export interface RecoveryResult {
  /** Whether the recovery operation succeeded */
  success: boolean;
  /** Recovered plugin data, or null if recovery failed */
  data: PluginData | null;
}

/**
 * Maximum number of backup entries to maintain.
 */
export const MAX_BACKUPS = 3;

/**
 * Creates a new backup of the plugin data and returns the updated backup array.
 *
 * This function creates a timestamped backup entry and maintains a rolling
 * history of backups up to MAX_BACKUPS entries. If backup creation fails,
 * it gracefully returns the existing backups array to prevent data loss.
 *
 * @param data - The plugin data to backup
 * @returns Array of backup entries with the new backup added at the beginning
 */
export function createDataBackup(data: PluginData): DataBackup[] {
  try {
    return tryCreateDataBackup(data);
  } catch (error) {
    handleError(error, ErrorCategory.DATA, {
      operation: "createDataBackup",
      dataVersion: data.version,
      existingBackupsCount: data._backups?.length || 0,
    });
    // Return existing backups as fallback to prevent complete data loss
    return getExistingBackups(data);
  }
}

/**
 * Attempts to recover valid plugin data from backup entries.
 *
 * This function searches through available backups to find the most recent
 * valid data that passes validation. It's designed to handle scenarios where
 * the main plugin data becomes corrupted or invalid.
 *
 * @param rawData - Raw data object that may contain backup entries
 * @returns Recovery result indicating success/failure and recovered data
 */
export function attemptDataRecovery(rawData: any): RecoveryResult {
  try {
    return tryAttemptDataRecovery(rawData);
  } catch (error) {
    handleError(error, ErrorCategory.DATA, {
      operation: "attemptDataRecovery",
      backupsCount: rawData?._backups?.length,
    });
    return createFailureResult();
  }
}

/**
 * Core backup creation logic.
 */
function tryCreateDataBackup(data: PluginData): DataBackup[] {
  const backup = createBackupEntry(data);
  const existingBackups = getExistingBackups(data);

  // Create new array with new backup at the beginning (most recent first)
  const updatedBackups = [backup, ...existingBackups];
  return limitBackupsSize(updatedBackups);
}

/**
 * Creates a new backup entry from the current plugin data.
 */
function createBackupEntry(data: PluginData): DataBackup {
  return {
    timestamp: Date.now(),
    version: data.version || 0,
    data: structuredClone(data), // Deep clone prevents mutations affecting backup
  };
}

/**
 * Safely extracts existing backups from plugin data.
 * Returns empty array if no backups exist to handle initialization gracefully.
 */
function getExistingBackups(data: PluginData): DataBackup[] {
  return data._backups ? structuredClone(data._backups) : [];
}

/**
 * Enforces the maximum backup limit by returning a new array with only the most recent entries.
 */
function limitBackupsSize(backups: DataBackup[]): DataBackup[] {
  if (backups.length > MAX_BACKUPS) {
    return backups.slice(0, MAX_BACKUPS); // Return new array with only allowed entries
  }
  return backups;
}

/**
 * Core recovery logic.
 */
function tryAttemptDataRecovery(rawData: any): RecoveryResult {
  if (!hasValidBackupsArray(rawData)) {
    return createFailureResult();
  }

  const validData = findFirstValidBackup(rawData._backups);
  return validData ? createSuccessResult(validData) : createFailureResult();
}

/**
 * Validates that rawData contains a non-empty, valid backups array.
 */
function hasValidBackupsArray(rawData: any): boolean {
  return (
    rawData &&
    typeof rawData === "object" &&
    "_backups" in rawData &&
    Array.isArray(rawData._backups) &&
    rawData._backups.length > 0
  );
}

/**
 * Searches for the first valid backup entry in chronological order.
 * Returns null if no valid backups are found, allowing caller to handle gracefully.
 */
function findFirstValidBackup(backups: any[]): PluginData | null {
  for (const backup of backups) {
    if (isValidBackupEntry(backup)) {
      return backup.data;
    }
  }
  return null;
}

/**
 * Validates a single backup entry structure and data integrity.
 * Uses optional chaining to handle potentially corrupt backup entries.
 */
function isValidBackupEntry(backup: any): boolean {
  return backup?.data && validatePluginData(backup.data);
}

/**
 * Returns the failure result object.
 */
function createFailureResult(): RecoveryResult {
  return {
    success: false,
    data: null,
  };
}

/**
 * Creates a successful recovery result with the recovered data.
 */
function createSuccessResult(data: PluginData): RecoveryResult {
  return { success: true, data: structuredClone(data) };
}
