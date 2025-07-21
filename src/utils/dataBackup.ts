import type { PluginData } from "../types";
import { validatePluginData } from "./validation";

/**
 * Data backup and restore utilities for Card View Explorer plugin
 *
 * Handles creating backups before data changes and recovering from backups
 * when data corruption or loading errors occur.
 */

/**
 * Backup entry for data recovery
 */
export interface DataBackup {
  /** Timestamp when backup was created */
  timestamp: number;
  /** Data version at time of backup */
  version: number;
  /** Backed up data */
  data: PluginData;
}

/**
 * Plugin interface for backup operations
 *
 * This interface abstracts the plugin's data persistence methods to enable:
 * 1. Testability - Easy mocking for unit tests without full Obsidian Plugin dependency
 * 2. Dependency Inversion - Backup utilities depend on abstraction, not concrete Plugin class
 * 3. Interface Segregation - Only exposes methods needed for backup operations
 * 4. Flexibility - Can be implemented by different plugin systems or contexts
 */
export interface BackupPlugin {
  /** Load plugin data from storage */
  loadData(): Promise<any>;
  /** Save plugin data to storage (optional for read-only operations) */
  saveData?(data: any): Promise<void>;
}

/**
 * Maximum number of backups to keep
 */
export const MAX_BACKUPS = 3;

/**
 * Create a backup of current data before making changes
 *
 * @param plugin - Plugin instance with loadData method
 * @returns Promise resolving to the created backup or null if no backup was needed
 */
export async function createDataBackup(plugin: BackupPlugin): Promise<DataBackup | null> {
  try {
    const existingData = await plugin.loadData();

    // Don't create backup if no existing data
    if (!existingData || Object.keys(existingData).length === 0) {
      return null;
    }

    // Don't create backup if existing data is invalid
    if (!validatePluginData(existingData)) {
      console.warn("Card View Explorer: Existing data is invalid, skipping backup creation");
      return null;
    }

    const backup: DataBackup = {
      timestamp: Date.now(),
      version: existingData.version || 0,
      data: existingData,
    };

    // Add backup to existing backups array
    const backups = existingData._backups || [];
    backups.unshift(backup);

    // Keep only the most recent backups
    if (backups.length > MAX_BACKUPS) {
      backups.splice(MAX_BACKUPS);
    }

    // Store updated backups array in the data
    // Note: This will be saved with the next data save operation
    existingData._backups = backups;

    return backup;
  } catch (error) {
    console.warn("Card View Explorer: Failed to create data backup:", error);
    return null;
  }
}

/**
 * Attempt to recover data from the most recent valid backup
 *
 * @param plugin - Plugin instance with loadData method
 * @returns Promise resolving to recovered data or null if no valid backup found
 */
export async function attemptDataRecovery(plugin: BackupPlugin): Promise<PluginData | null> {
  try {
    const rawData = await plugin.loadData();
    const backups = rawData?._backups as DataBackup[] | undefined;

    if (!backups || !Array.isArray(backups) || backups.length === 0) {
      console.log("Card View Explorer: No backups available for recovery");
      return null;
    }

    // Try to recover from the most recent valid backup
    for (const backup of backups) {
      if (backup.data && validatePluginData(backup.data)) {
        console.log(
          `Card View Explorer: Recovered data from backup created at ${new Date(backup.timestamp).toISOString()}`
        );
        return backup.data;
      }
    }

    console.warn("Card View Explorer: No valid backups found for recovery");
    return null;
  } catch (error) {
    console.error("Card View Explorer: Failed to recover from backup:", error);
    return null;
  }
}
