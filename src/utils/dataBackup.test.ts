import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PluginData } from "../types";
import { DEFAULT_DATA } from "../types/plugin";
import { attemptDataRecovery, createDataBackup, type DataBackup, MAX_BACKUPS } from "./dataBackup";
import * as errorHandling from "./errorHandling";

/**
 * Test constants to eliminate magic numbers and improve test readability.
 * These constants represent realistic timestamp and version scenarios.
 */
const TEST_TIMESTAMPS = {
  OLDEST: 1000,
  MIDDLE: 2000,
  NEWEST: 3000,
} as const;

const TEST_VERSIONS = {
  DEFAULT: 0,
  FIRST: 1,
  SECOND: 2,
  THIRD: 3,
} as const;

const UNIQUE_IDENTIFIERS = {
  NEW_NOTE: ["new-note.md"] as string[],
  RECOVERED_NOTE: ["recovered-note.md"] as string[],
  THIRD_BACKUP_NOTE: ["third-backup-note.md"] as string[],
} as const;

/**
 * Factory function for creating test plugin data with consistent defaults.
 * Uses the builder pattern to allow selective property overrides.
 *
 * @param overrides - Partial PluginData to override default values
 * @returns Complete PluginData object for testing
 */
const createTestData = (overrides: Partial<PluginData> = {}): PluginData => ({
  ...DEFAULT_DATA,
  pinnedNotes: ["note1.md", "note2.md"],
  ...overrides,
});

/**
 * Factory function for creating DataBackup objects with explicit parameters.
 * Ensures consistent backup structure across all tests.
 *
 * @param timestamp - Unix timestamp for the backup
 * @param version - Data version number
 * @param data - Plugin data to backup
 * @returns Properly structured DataBackup object
 */
const createBackup = (timestamp: number, version: number, data: PluginData): DataBackup => ({
  timestamp,
  version,
  data,
});

/**
 * Creates test data with non-cloneable properties to trigger structuredClone errors.
 * This simulates real-world scenarios where data contains functions, symbols, or other
 * non-serializable values that would cause backup operations to fail.
 *
 * @param baseData - Valid PluginData as the foundation
 * @param nonCloneableProperty - Name of the property that will cause cloning to fail
 * @param nonCloneableValue - Non-cloneable value (function, symbol, etc.)
 * @returns Object that will trigger structuredClone errors
 */
const createNonCloneableData = (
  baseData: PluginData,
  nonCloneableProperty: string,
  nonCloneableValue: any
): any => ({
  ...baseData,
  [nonCloneableProperty]: nonCloneableValue,
});

/**
 * Sets up a spy on the error handling system to verify error reporting.
 * This allows tests to verify that errors are properly categorized and reported
 * without actually triggering console output during test runs.
 *
 * @returns Vitest spy on the handleError function
 */
const setupErrorHandlingSpy = () => vi.spyOn(errorHandling, "handleError");

/**
 * Asserts that error handling was called with the expected parameters.
 * Validates that errors are properly categorized and include relevant context.
 *
 * @param spy - The error handling spy to check
 * @param operation - Expected operation name that triggered the error
 * @param additionalContext - Additional context that should be included in the error
 */
const expectErrorHandlingCall = (
  spy: ReturnType<typeof setupErrorHandlingSpy>,
  operation: string,
  additionalContext: Record<string, any> = {}
) => {
  expect(spy).toHaveBeenCalledWith(
    expect.any(Error),
    errorHandling.ErrorCategory.DATA,
    expect.objectContaining({
      operation,
      ...additionalContext,
    })
  );
};

/**
 * Validates that a recovery operation returned a proper failure result.
 * Ensures consistent failure response structure across all error scenarios.
 *
 * @param result - The recovery result to validate
 */
const expectFailureResult = (result: { success: boolean; data: any }) => {
  expect(result.success).toBe(false);
  expect(result.data).toBeNull();
};

describe("dataBackup", () => {
  let validPluginData: PluginData;
  let invalidPluginData: any;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    validPluginData = createTestData();
    invalidPluginData = { invalidField: "test" };

    vi.clearAllMocks();
    // Suppress console.error output during tests to keep test output clean
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("createDataBackup", () => {
    it("should create backup and return updated array when data is valid", () => {
      const data = createTestData({ version: TEST_VERSIONS.FIRST });

      const backups = createDataBackup(data);

      expect(backups).toHaveLength(1);
      expect(backups[0].timestamp).toBeTypeOf("number");
      expect(backups[0].version).toBe(TEST_VERSIONS.FIRST);
      expect(backups[0].data).toEqual(data);
    });

    it("should preserve existing backups when creating new one", () => {
      const existingBackup = createBackup(
        TEST_TIMESTAMPS.OLDEST,
        TEST_VERSIONS.DEFAULT,
        validPluginData
      );
      const data = createTestData({
        pinnedNotes: UNIQUE_IDENTIFIERS.NEW_NOTE,
        version: TEST_VERSIONS.FIRST,
        _backups: [existingBackup],
      });

      const backups = createDataBackup(data);

      expect(backups).toHaveLength(2);
      expect(backups[0].data).toEqual(data);
      expect(backups[1]).toEqual(existingBackup);
    });

    it("should limit backups to MAX_BACKUPS", () => {
      const existingBackups = [
        createBackup(TEST_TIMESTAMPS.OLDEST, TEST_VERSIONS.FIRST, validPluginData),
        createBackup(TEST_TIMESTAMPS.MIDDLE, TEST_VERSIONS.SECOND, validPluginData),
        createBackup(TEST_TIMESTAMPS.NEWEST, TEST_VERSIONS.THIRD, validPluginData),
      ];

      const data = createTestData({
        pinnedNotes: UNIQUE_IDENTIFIERS.NEW_NOTE,
        version: TEST_VERSIONS.FIRST,
        _backups: existingBackups,
      });

      const backups = createDataBackup(data);

      expect(backups).toHaveLength(MAX_BACKUPS);
      expect(backups[0].data).toEqual(data);
      expect(backups[1]).toEqual(existingBackups[0]);
      expect(backups[2]).toEqual(existingBackups[1]);
    });

    it("should use version 0 when data has no version", () => {
      const data = createTestData();
      delete data.version;

      const backups = createDataBackup(data);

      expect(backups).toHaveLength(1);
      expect(backups[0].version).toBe(TEST_VERSIONS.DEFAULT);
    });

    it("should handle structuredClone errors and return existing backups", () => {
      const handleErrorSpy = setupErrorHandlingSpy();
      const existingBackup = createBackup(
        TEST_TIMESTAMPS.OLDEST,
        TEST_VERSIONS.DEFAULT,
        validPluginData
      );
      // Function properties cannot be cloned by structuredClone, simulating real-world edge cases
      const dataWithFunction = createNonCloneableData(
        createTestData({ version: TEST_VERSIONS.FIRST, _backups: [existingBackup] }),
        "nonCloneableFunction",
        () => "test"
      );

      const backups = createDataBackup(dataWithFunction);

      expect(backups).toHaveLength(1);
      expect(backups[0]).toEqual(existingBackup);
      expectErrorHandlingCall(handleErrorSpy, "createDataBackup", {
        dataVersion: TEST_VERSIONS.FIRST,
        existingBackupsCount: 1,
      });
    });

    it("should return empty array when data has no existing backups and structuredClone fails", () => {
      const handleErrorSpy = setupErrorHandlingSpy();
      // Symbol properties cannot be cloned by structuredClone
      const dataWithSymbol = createNonCloneableData(
        createTestData({ version: TEST_VERSIONS.FIRST }),
        "nonCloneableSymbol",
        Symbol("test")
      );

      const backups = createDataBackup(dataWithSymbol);

      expect(backups).toHaveLength(0);
      expectErrorHandlingCall(handleErrorSpy, "createDataBackup", {
        dataVersion: TEST_VERSIONS.FIRST,
        existingBackupsCount: 0,
      });
    });
  });

  describe("attemptDataRecovery", () => {
    it("should recover from most recent valid backup", () => {
      const recoveredData = createTestData({ pinnedNotes: UNIQUE_IDENTIFIERS.RECOVERED_NOTE });
      const backups: DataBackup[] = [
        createBackup(TEST_TIMESTAMPS.NEWEST, TEST_VERSIONS.FIRST, invalidPluginData as any),
        createBackup(TEST_TIMESTAMPS.MIDDLE, TEST_VERSIONS.FIRST, recoveredData),
        createBackup(TEST_TIMESTAMPS.OLDEST, TEST_VERSIONS.FIRST, validPluginData),
      ];

      const mockData = createTestData({ _backups: backups });
      const result = attemptDataRecovery(mockData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(recoveredData);
      expect(result.data?.pinnedNotes).toEqual(UNIQUE_IDENTIFIERS.RECOVERED_NOTE);
    });

    it("should skip invalid backup entries", () => {
      const thirdBackupData = createTestData({ pinnedNotes: UNIQUE_IDENTIFIERS.THIRD_BACKUP_NOTE });
      const backups = [
        null, // Simulates corrupted backup entry
        createBackup(TEST_TIMESTAMPS.NEWEST, TEST_VERSIONS.FIRST, invalidPluginData as any),
        createBackup(TEST_TIMESTAMPS.MIDDLE, TEST_VERSIONS.FIRST, thirdBackupData),
        createBackup(TEST_TIMESTAMPS.OLDEST, TEST_VERSIONS.FIRST, validPluginData),
      ] as any;

      const mockData = createTestData({ _backups: backups });
      const result = attemptDataRecovery(mockData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(thirdBackupData);
      expect(result.data?.pinnedNotes).toEqual(UNIQUE_IDENTIFIERS.THIRD_BACKUP_NOTE);
    });

    /**
     * Parameterized tests for various failure scenarios in data recovery.
     * This approach reduces code duplication while ensuring comprehensive
     * coverage of all failure modes.
     */
    describe.each([
      {
        scenario: "no backups available",
        mockData: {},
        description: "should return failure when no _backups property exists",
      },
      {
        scenario: "backups array is empty",
        mockData: { _backups: [] },
        description: "should return failure when _backups is empty array",
      },
      {
        scenario: "all backups are invalid",
        mockData: {
          _backups: [
            createBackup(TEST_TIMESTAMPS.NEWEST, TEST_VERSIONS.FIRST, invalidPluginData as any),
            createBackup(TEST_TIMESTAMPS.MIDDLE, TEST_VERSIONS.FIRST, invalidPluginData as any),
          ],
        },
        description: "should return failure when all backup data is invalid",
      },
      {
        scenario: "loadData errors gracefully",
        mockData: null,
        description: "should return failure when input data is null",
      },
    ])("failure scenarios", ({ mockData, description }) => {
      it(`${description}`, () => {
        const result = attemptDataRecovery(mockData);
        expectFailureResult(result);
      });
    });

    it("should handle structuredClone errors in recovery result creation", () => {
      const handleErrorSpy = setupErrorHandlingSpy();
      const backupDataWithFunction = createNonCloneableData(
        validPluginData,
        "nonCloneableFunction",
        () => "test"
      );

      const backups = [
        createBackup(TEST_TIMESTAMPS.MIDDLE, TEST_VERSIONS.FIRST, backupDataWithFunction),
      ];
      const mockData = { _backups: backups };
      const result = attemptDataRecovery(mockData);

      expectFailureResult(result);
      expectErrorHandlingCall(handleErrorSpy, "attemptDataRecovery", {
        backupsCount: 1,
      });
    });
  });
});
