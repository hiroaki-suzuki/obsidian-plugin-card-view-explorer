import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PluginData, PluginSettings } from "../../types";
import { DEFAULT_DATA, DEFAULT_SETTINGS } from "../../types/plugin";
import {
  loadPluginData,
  loadPluginSettings,
  savePluginData,
  savePluginSettings,
} from "./dataPersistence";

// Mock the handleError function to verify error handling behavior
vi.mock("../errors/errorHandling", () => ({
  handleError: vi.fn(),
  ErrorCategory: {
    DATA: "data",
    API: "api",
    UI: "ui",
    GENERAL: "general",
  },
}));

import { handleError } from "../errors/errorHandling";

const TEST_DATA = {
  VALID_PLUGIN_DATA: {
    ...DEFAULT_DATA,
    pinnedNotes: ["note1.md", "note2.md"],
  } as PluginData,

  COMPLETE_PLUGIN_DATA: {
    pinnedNotes: ["custom1.md", "custom2.md", "custom3.md"],
    lastFilters: {
      folders: ["work", "personal"],
      tags: ["important", "todo"],
      filename: "search-term",
      dateRange: { type: "within", value: "2024-01-01" },
    },
    sortConfig: {
      key: "created",
      order: "asc",
    },
    version: 2,
  } as PluginData,

  VALID_SETTINGS: {
    sortKey: "created",
    autoStart: true,
    showInSidebar: false,
  } as PluginSettings,

  INVALID_PLUGIN_DATA: {
    pinnedNotes: "not an array", // Invalid: should be array
    lastFilters: null, // Invalid: should be object
    sortConfig: "invalid", // Invalid: should be object
  },

  INVALID_SETTINGS: {
    sortKey: 123, // Should be string
    autoStart: "yes", // Should be boolean
    showInSidebar: null, // Should be boolean
  },
} as const;

/**
 * Creates a mock Obsidian plugin with configurable data loading behavior.
 * Simulates the plugin's loadData/saveData methods for testing persistence operations.
 *
 * @param initialData - Optional data to return from loadData calls
 * @returns Mock plugin object with spied loadData and saveData methods
 */
const createMockPlugin = (initialData?: any) => {
  const plugin = {
    loadData: vi.fn(),
    saveData: vi.fn(),
  };

  if (initialData !== undefined) {
    plugin.loadData.mockResolvedValue(initialData);
  }

  return plugin;
};

/**
 * Verifies that handleError was called with expected parameters for a given operation.
 *
 * @param operation - The operation name that should appear in error context
 * @param additionalContext - Optional additional context properties to verify
 */
const expectErrorHandled = (operation: string, additionalContext?: Record<string, any>) => {
  expect(handleError).toHaveBeenCalledWith(
    expect.anything(),
    expect.anything(),
    expect.objectContaining({
      operation,
      ...additionalContext,
    })
  );
};

/**
 * Verifies that a validation error was properly handled and logged.
 *
 * @param operation - The operation that failed validation
 * @param dataField - The data field that caused validation to fail
 */
const expectValidationError = (operation: string, dataField: string) => {
  const calls = vi.mocked(handleError).mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  const [firstArg] = calls[calls.length - 1] ?? [];

  // Verify the actual argument type, then assert flexibly
  const firstArgMatcher = firstArg instanceof Error ? expect.any(Error) : expect.anything();

  expect(handleError).toHaveBeenCalledWith(
    firstArgMatcher,
    expect.anything(),
    expect.objectContaining({
      operation,
      data: expect.stringContaining(dataField),
    })
  );
};

/**
 * Verifies that a save operation error was properly handled.
 *
 * @param operation - The save operation that failed
 */
const expectSaveError = (operation: string) => {
  const calls = vi.mocked(handleError).mock.calls;
  expect(calls.length).toBeGreaterThan(0);
  const [firstArg] = calls[calls.length - 1] ?? [];

  // Verify the actual argument type, then assert flexibly
  const firstArgMatcher = firstArg instanceof Error ? expect.any(Error) : expect.anything();

  expect(handleError).toHaveBeenCalledWith(
    firstArgMatcher,
    expect.anything(),
    expect.objectContaining({
      operation,
    })
  );
};

describe("dataPersistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(handleError).mockClear();
  });

  describe("loadPluginData", () => {
    it.each([
      {
        name: "should load valid data successfully",
        mockData: TEST_DATA.VALID_PLUGIN_DATA,
        expected: TEST_DATA.VALID_PLUGIN_DATA,
      },
      {
        name: "should load data with all default fields overridden",
        mockData: TEST_DATA.COMPLETE_PLUGIN_DATA,
        expected: TEST_DATA.COMPLETE_PLUGIN_DATA,
      },
    ])("$name", async ({ mockData, expected }) => {
      const mockPlugin = createMockPlugin(mockData);

      const result = await loadPluginData(mockPlugin);

      expect(result).toEqual(expected);
    });

    it.each([
      { name: "null data", mockData: null },
      { name: "empty object", mockData: {} },
    ])("should return default data when $name exists", async ({ mockData }) => {
      const mockPlugin = createMockPlugin(mockData);

      const result = await loadPluginData(mockPlugin);

      expect(result).toEqual(DEFAULT_DATA);
    });

    it("should handle validation failure and return default data", async () => {
      const mockPlugin = createMockPlugin(TEST_DATA.INVALID_PLUGIN_DATA);

      const result = await loadPluginData(mockPlugin);

      expect(result).toEqual(DEFAULT_DATA);
      expectValidationError("loadPluginData", "pinnedNotes");
    });

    it("should handle load errors gracefully with fallback to defaults", async () => {
      const mockPlugin = createMockPlugin();
      mockPlugin.loadData.mockRejectedValue(new Error("Load failed"));

      const result = await loadPluginData(mockPlugin);

      expect(result).toEqual(DEFAULT_DATA);
      expectErrorHandled("loadPluginData", { hasExistingData: false });
    });
  });

  describe("savePluginData", () => {
    it.each([
      {
        name: "should save valid data successfully",
        testData: TEST_DATA.VALID_PLUGIN_DATA,
      },
      {
        name: "should save data with all default fields overridden",
        testData: TEST_DATA.COMPLETE_PLUGIN_DATA,
      },
    ])("$name", async ({ testData }) => {
      const mockPlugin = createMockPlugin();
      mockPlugin.saveData.mockResolvedValue(undefined);

      const result = await savePluginData(mockPlugin, testData);

      expect(result).toBe(true);
      expect(mockPlugin.saveData).toHaveBeenCalledWith(testData);
    });

    it("should reject invalid data and call handleError", async () => {
      const mockPlugin = createMockPlugin();

      const result = await savePluginData(mockPlugin, TEST_DATA.INVALID_PLUGIN_DATA as any);

      expect(result).toBe(false);
      expect(mockPlugin.saveData).not.toHaveBeenCalled();
      expectSaveError("savePluginData");
    });

    it("should handle save errors gracefully and call handleError", async () => {
      const mockPlugin = createMockPlugin({});
      mockPlugin.saveData.mockRejectedValue(new Error("Save failed"));

      const result = await savePluginData(mockPlugin, DEFAULT_DATA);

      expect(result).toBe(false);
      expectErrorHandled("savePluginData", {
        data: expect.stringContaining("pinnedNotes"),
      });
    });
  });

  describe("loadPluginSettings", () => {
    it.each([
      {
        name: "should load valid settings from settings property",
        mockData: { settings: TEST_DATA.VALID_SETTINGS },
        expected: TEST_DATA.VALID_SETTINGS,
      },
      {
        name: "should merge settings with defaults when partial settings provided",
        mockData: { settings: { sortKey: "created", autoStart: true, showInSidebar: false } },
        expected: { ...DEFAULT_SETTINGS, sortKey: "created", autoStart: true },
      },
    ])("$name", async ({ mockData, expected }) => {
      const mockPlugin = createMockPlugin(mockData);

      const result = await loadPluginSettings(mockPlugin);

      expect(result).toEqual(expected);
    });

    it.each([
      { name: "no data", mockData: null },
      { name: "empty data", mockData: {} },
      { name: "null settings", mockData: { settings: null } },
      { name: "empty settings", mockData: { settings: {} } },
    ])("should return default settings when $name exists", async ({ mockData }) => {
      const mockPlugin = createMockPlugin(mockData);

      const result = await loadPluginSettings(mockPlugin);

      expect(result).toEqual(DEFAULT_SETTINGS);
    });

    it("should handle validation failure and return default settings", async () => {
      const mockPlugin = createMockPlugin({ settings: TEST_DATA.INVALID_SETTINGS });

      const result = await loadPluginSettings(mockPlugin);

      expect(result).toEqual(DEFAULT_SETTINGS);
      expectValidationError("loadPluginSettings", "sortKey");
    });

    it("should fallback to defaults when settings at root level are invalid", async () => {
      const mockPlugin = createMockPlugin({
        sortKey: "modified",
        autoStart: false,
        showInSidebar: true,
      });

      const result = await loadPluginSettings(mockPlugin);

      expect(result).toEqual(DEFAULT_SETTINGS);
      expectValidationError("loadPluginSettings", "{}");
    });

    it("should handle load errors gracefully with fallback to defaults", async () => {
      const mockPlugin = createMockPlugin();
      mockPlugin.loadData.mockRejectedValue(new Error("Load failed"));

      const result = await loadPluginSettings(mockPlugin);

      expect(result).toEqual(DEFAULT_SETTINGS);
      expectErrorHandled("loadPluginSettings", { hasExistingData: false });
    });
  });

  describe("savePluginSettings", () => {
    it.each([
      {
        name: "should save valid settings successfully",
        existingData: {},
        expectedSaveData: { settings: TEST_DATA.VALID_SETTINGS },
      },
      {
        name: "should preserve existing data when saving settings",
        existingData: { pinnedNotes: ["note1.md"], otherField: "value" },
        expectedSaveData: {
          pinnedNotes: ["note1.md"],
          otherField: "value",
          settings: TEST_DATA.VALID_SETTINGS,
        },
      },
      {
        name: "should handle null existing data when saving settings",
        existingData: null,
        expectedSaveData: { settings: TEST_DATA.VALID_SETTINGS },
      },
    ])("$name", async ({ existingData, expectedSaveData }) => {
      const mockPlugin = createMockPlugin(existingData);
      mockPlugin.saveData.mockResolvedValue(undefined);

      const result = await savePluginSettings(mockPlugin, TEST_DATA.VALID_SETTINGS);

      expect(result).toBe(true);
      expect(mockPlugin.saveData).toHaveBeenCalledWith(expectedSaveData);
    });

    it("should reject invalid settings and call handleError", async () => {
      const mockPlugin = createMockPlugin();

      const result = await savePluginSettings(mockPlugin, TEST_DATA.INVALID_SETTINGS as any);

      expect(result).toBe(false);
      expect(mockPlugin.saveData).not.toHaveBeenCalled();
      expectSaveError("savePluginSettings");
    });

    it("should handle save errors gracefully and call handleError", async () => {
      const mockPlugin = createMockPlugin({});
      mockPlugin.saveData.mockRejectedValue(new Error("Save failed"));

      const result = await savePluginSettings(mockPlugin, DEFAULT_SETTINGS);

      expect(result).toBe(false);
      expectErrorHandled("savePluginSettings", {
        data: expect.stringContaining("sortKey"),
      });
    });
  });

  describe("Integration Tests", () => {
    /**
     * Creates a mock plugin that maintains state between save/load operations.
     * This simulates real plugin behavior where saved data persists and can be loaded back.
     *
     * @returns Mock plugin with persistent storage simulation
     */
    const createPersistentMockPlugin = () => {
      let storage: any = null;

      return {
        loadData: vi.fn(() => Promise.resolve(storage)),
        saveData: vi.fn((data) => {
          storage = data;
          return Promise.resolve();
        }),
      };
    };

    it("should handle data save/load cycle", async () => {
      const mockPlugin = createPersistentMockPlugin();

      const saveResult = await savePluginData(mockPlugin, TEST_DATA.VALID_PLUGIN_DATA);
      expect(saveResult).toBe(true);

      const loadResult = await loadPluginData(mockPlugin);
      expect(loadResult).toEqual(TEST_DATA.VALID_PLUGIN_DATA);
    });

    it("should handle settings save/load cycle", async () => {
      const mockPlugin = createPersistentMockPlugin();

      const saveResult = await savePluginSettings(mockPlugin, TEST_DATA.VALID_SETTINGS);
      expect(saveResult).toBe(true);

      const loadResult = await loadPluginSettings(mockPlugin);
      expect(loadResult).toEqual(TEST_DATA.VALID_SETTINGS);
    });
  });
});
