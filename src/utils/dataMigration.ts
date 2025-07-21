import type { PluginData } from "../types";
import { DEFAULT_DATA } from "../types/plugin";

/**
 * Data migration utilities for Card View Explorer plugin
 *
 * This module provides a framework for migrating plugin data between different versions.
 * It implements the Strategy pattern for version-specific migrations, allowing for
 * maintainable and extensible migration logic as the plugin evolves.
 *
 * The migration system handles:
 * - Automatic detection of data version
 * - Sequential application of migration strategies
 * - Validation of migrated data
 * - Tracking of warnings and issues during migration
 */

/**
 * Current data version for migration handling
 */
export const CURRENT_DATA_VERSION = 1;

/**
 * Versioned plugin data structure for migration support
 */
export interface VersionedPluginData extends PluginData {
  /** Data format version for migration handling */
  version: number;
}

/**
 * Migration result information
 */
export interface MigrationResult {
  /** Whether migration was performed */
  migrated: boolean;
  /** Previous version (if migrated) */
  fromVersion?: number;
  /** Current version after migration */
  toVersion: number;
  /** Any warnings or issues during migration */
  warnings?: string[];
}

/**
 * Migration strategy interface for version-specific migrations
 *
 * Each migration strategy handles the transformation of data from one version to the next.
 * Strategies are registered in the migrationStrategies map and applied sequentially.
 */
export interface MigrationStrategy {
  /** Version this strategy handles (migrates from this version to version+1) */
  version: number;
  /** Description of what this migration does */
  description: string;
  /**
   * Execute the migration from the current version to the next
   *
   * @param data - The data to migrate
   * @returns Object containing the migrated data and any warnings generated during migration
   */
  migrate(data: Partial<VersionedPluginData>): {
    data: Partial<VersionedPluginData>;
    warnings: string[];
  };
}

/**
 * Migration from version 0 (data without version info)
 */
const migrationV0: MigrationStrategy = {
  version: 0,
  description: "Add version info to data format",
  migrate(data: Partial<VersionedPluginData>) {
    const warnings: string[] = [];

    // This handles both:
    // 1. Actual legacy data from older plugin versions
    // 2. Data files that somehow lost version information

    // Ensure all required fields exist with defaults
    const migratedData = {
      pinnedNotes: data.pinnedNotes || DEFAULT_DATA.pinnedNotes,
      lastFilters: data.lastFilters || DEFAULT_DATA.lastFilters,
      sortConfig: data.sortConfig || DEFAULT_DATA.sortConfig,
    };

    // Validate and fix any data issues
    if (!Array.isArray(migratedData.pinnedNotes)) {
      migratedData.pinnedNotes = DEFAULT_DATA.pinnedNotes;
      warnings.push("Fixed invalid pinnedNotes array");
    }

    // Ensure pinned notes are all strings
    migratedData.pinnedNotes = migratedData.pinnedNotes.filter(
      (path: any) => typeof path === "string"
    );

    warnings.push("Added version info to data format");

    return { data: migratedData, warnings };
  },
};

/**
 * Registry of all available migration strategies
 */
const migrationStrategies: Map<number, MigrationStrategy> = new Map([
  [0, migrationV0],
  // Future migrations can be added here:
  // [1, migrationV1],
  // [2, migrationV2],
]);

/**
 * Migrate plugin data from older versions using Strategy pattern
 *
 * @param data - Raw data to migrate
 * @param fromVersion - Current data version
 * @returns Promise resolving to migrated data and migration info
 */
export async function migratePluginData(
  data: Partial<VersionedPluginData>,
  fromVersion: number
): Promise<{ data: PluginData; migration: MigrationResult }> {
  let currentData = { ...data };
  const allWarnings: string[] = [];
  let currentVersion = fromVersion;

  // Apply migrations sequentially from current version to target version
  while (currentVersion < CURRENT_DATA_VERSION) {
    const strategy = migrationStrategies.get(currentVersion);

    if (!strategy) {
      // No migration strategy found for this version
      allWarnings.push(`No migration strategy found for version ${currentVersion}`);
      break;
    }

    try {
      const { data: migratedData, warnings } = strategy.migrate(currentData);
      currentData = migratedData;
      allWarnings.push(...warnings);

      console.log(
        `Card View Explorer: Applied migration from version ${currentVersion}: ${strategy.description}`
      );
      currentVersion++;
    } catch (error) {
      allWarnings.push(`Migration from version ${currentVersion} failed: ${error}`);
      break;
    }
  }

  const migration: MigrationResult = {
    migrated: fromVersion !== currentVersion,
    fromVersion: fromVersion !== currentVersion ? fromVersion : undefined,
    toVersion: currentVersion,
    warnings: allWarnings.length > 0 ? allWarnings : undefined,
  };

  return { data: currentData as PluginData, migration };
}
