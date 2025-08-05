import type { App } from "obsidian";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type CardExplorerPlugin from "../main";
import type { NoteData } from "../types";
import { useCardExplorerStore } from "./cardExplorerStore";

// Mock loadNotesFromVault function
vi.mock("./noteProcessing", () => ({
  loadNotesFromVault: vi.fn(),
}));

// Import the mocked function for type safety
import { loadNotesFromVault } from "./noteProcessing";

const mockLoadNotesFromVault = vi.mocked(loadNotesFromVault);

// Mock error handling utilities
vi.mock("../core/errors/errorHandling", () => ({
  withRetry: vi.fn(),
  handleError: vi.fn(),
  ErrorCategory: {
    API: "API",
    DATA: "DATA",
    UI: "UI",
    GENERAL: "GENERAL",
  },
}));

// Import the mocked error handling utilities
import { handleError, withRetry } from "../core/errors/errorHandling";

const mockWithRetry = vi.mocked(withRetry);
const mockHandleError = vi.mocked(handleError);

/**
 * Test constants for consistent timestamp values across tests.
 * Using fixed timestamps ensures deterministic test behavior.
 */
const TEST_TIMESTAMPS = {
  RECENT: Date.now() - 24 * 60 * 60 * 1000, // 1日前
  OLD: Date.now() - 10 * 24 * 60 * 60 * 1000, // 10日前
  BASE_DATE: new Date("2024-01-01").getTime(),
} as const;

/**
 * Factory functions for creating common test note scenarios.
 * Provides reusable note configurations for different test cases.
 */
const createTestNotes = () => ({
  basic: (count: number = 2) =>
    Array.from({ length: count }, (_, i) => createMockNote(`Note ${i + 1}`, `/note${i + 1}.md`)),

  withFolders: (folders: string[]) =>
    folders.map((folder, i) => createMockNote(`${folder} Note`, `/${folder}/note${i}.md`, folder)),

  withTags: (tags: string[]) =>
    tags.map((tag, i) => createMockNote(`${tag} Note`, `/${tag}/note${i}.md`, "", [tag])),

  withDates: (daysAgoList: number[]) =>
    daysAgoList.map((daysAgo, i) =>
      createMockNote(
        `Note ${i + 1}`,
        `/note${i + 1}.md`,
        "",
        [],
        new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
      )
    ),

  withPriorities: (priorities: number[]) =>
    priorities.map((priority, i) => ({
      ...createMockNote(`Note ${i + 1}`, `/note${i + 1}.md`),
      frontmatter: { priority },
    })),
});

/**
 * Mock setup scenarios for common test patterns.
 * Provides consistent mock configurations for different test scenarios.
 */
const createMockScenarios = () => ({
  successfulRefresh: (notes: NoteData[]) => {
    mockLoadNotesFromVault.mockResolvedValueOnce(notes);
    mockWithRetry.mockImplementation(async (fn) => await fn());
  },

  failedRefresh: (error: Error, errorMessage: string) => {
    mockWithRetry.mockRejectedValueOnce(error);
    mockHandleError.mockReturnValueOnce({
      message: errorMessage,
      category: "API" as any,
      timestamp: Date.now(),
    });
  },
});

/**
 * State expectation helpers for consistent assertion patterns.
 * Provides reusable assertion functions for common state validations.
 */
const expectState = {
  initial: (state: any) => {
    expect(state.notes).toEqual([]);
    expect(state.filteredNotes).toEqual([]);
    expect(state.pinnedNotes).toEqual(new Set());
    expect(state.availableTags).toEqual([]);
    expect(state.availableFolders).toEqual([]);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe(null);
  },

  filteredResults: (state: any, expectedCount: number, validator?: (notes: NoteData[]) => void) => {
    expect(state.filteredNotes).toHaveLength(expectedCount);
    if (validator) validator(state.filteredNotes);
  },

  error: (state: any, errorMessage: string | null) => {
    expect(state.error).toBe(errorMessage);
    expect(state.isLoading).toBe(false);
  },

  loading: (state: any, isLoading: boolean) => {
    expect(state.isLoading).toBe(isLoading);
  },
};

// Mock App object for testing
const createMockApp = (): App => ({}) as App;

// Mock note data for testing
const createMockNote = (
  title: string,
  path: string,
  folder: string = "",
  tags: string[] = [],
  lastModified: Date = new Date()
): NoteData => ({
  title,
  path,
  folder,
  tags,
  lastModified,
  preview: `Preview for ${title}`,
  file: { path } as any,
  frontmatter: {},
});

const createMockPlugin = (data?: Partial<any>, settings?: Partial<any>): CardExplorerPlugin => {
  let currentData = {
    pinnedNotes: [],
    lastFilters: null,
    ...data,
  };

  const currentSettings = {
    sortKey: "updated",
    autoStart: false,
    showInSidebar: true,
    ...settings,
  };

  return {
    getData: vi.fn(() => currentData),
    getSettings: vi.fn(() => currentSettings),
    updateData: vi.fn((newData) => {
      currentData = { ...currentData, ...newData };
    }),
    savePluginData: vi.fn().mockResolvedValue(undefined),
  } as any;
};

// Helper function to set up notes using refreshNotes
const setupNotesWithRefresh = async (notes: NoteData[]) => {
  mockLoadNotesFromVault.mockResolvedValueOnce(notes);
  mockWithRetry.mockImplementation(async (fn) => await fn());
  await useCardExplorerStore.getState().refreshNotes(createMockApp());
};

describe("cardExplorerStore", () => {
  beforeEach(() => {
    // Reset store before each test
    useCardExplorerStore.getState().reset();
    // Clear all mocks
    vi.clearAllMocks();
    // Reset the mock function
    mockLoadNotesFromVault.mockReset();
  });

  describe("Initial State", () => {
    it("should have correct initial state", () => {
      const state = useCardExplorerStore.getState();

      expectState.initial(state);
    });
  });

  describe("refreshNotes", () => {
    it("should load notes and update state", async () => {
      // Arrange
      const mockNotes = createTestNotes().basic(2);
      createMockScenarios().successfulRefresh(mockNotes);
      const mockApp = createMockApp();

      // Act
      await useCardExplorerStore.getState().refreshNotes(mockApp);

      // Assert
      const state = useCardExplorerStore.getState();
      expect(state.notes).toEqual(mockNotes);
      expect(state.filteredNotes).toEqual(mockNotes);
      expectState.loading(state, false);
      expectState.error(state, null);
    });

    it("should set loading state during operation", async () => {
      let resolveLoadNotes: (notes: NoteData[]) => void;
      const loadNotesPromise = new Promise<NoteData[]>((resolve) => {
        resolveLoadNotes = resolve;
      });

      mockWithRetry.mockImplementation(async (fn) => {
        return await fn();
      });
      mockLoadNotesFromVault.mockReturnValueOnce(loadNotesPromise);

      const mockApp = createMockApp();
      const refreshPromise = useCardExplorerStore.getState().refreshNotes(mockApp);

      // Wait a bit for the async operation to start
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Should be loading
      expect(useCardExplorerStore.getState().isLoading).toBe(true);

      // Resolve the promise
      resolveLoadNotes!([createMockNote("Test", "/test.md")]);
      await refreshPromise;

      // Should no longer be loading
      expect(useCardExplorerStore.getState().isLoading).toBe(false);
    });

    it("should clear previous error on successful refresh", async () => {
      // Set initial error state
      useCardExplorerStore.getState().setError("Previous error");
      expect(useCardExplorerStore.getState().error).toBe("Previous error");

      const mockNotes = [createMockNote("Note", "/note.md")];
      mockLoadNotesFromVault.mockResolvedValueOnce(mockNotes);
      mockWithRetry.mockImplementation(async (fn) => await fn());

      await useCardExplorerStore.getState().refreshNotes(createMockApp());

      const state = useCardExplorerStore.getState();
      expect(state.error).toBe(null);
      expect(state.notes).toEqual(mockNotes);
    });

    // Parameterized tests for error handling scenarios
    const errorTestCases = [
      {
        name: "without existing notes",
        existingNotes: [],
        expectedContext: { notesCount: 0, hasExistingNotes: false },
      },
      {
        name: "with existing notes",
        existingNotes: createTestNotes().basic(2),
        expectedContext: { notesCount: 2, hasExistingNotes: true },
      },
    ];

    errorTestCases.forEach(({ name, existingNotes, expectedContext }) => {
      it(`should handle refresh errors ${name}`, async () => {
        // Arrange
        if (existingNotes.length > 0) {
          await setupNotesWithRefresh(existingNotes);
          // Reset mocks after setup
          mockWithRetry.mockReset();
          mockHandleError.mockReset();
        }

        const testError = new Error("API Error");
        createMockScenarios().failedRefresh(testError, "Failed to refresh notes");

        // Act
        await useCardExplorerStore.getState().refreshNotes(createMockApp());

        // Assert
        const state = useCardExplorerStore.getState();
        expectState.loading(state, false);
        expectState.error(state, "Failed to refresh notes");

        expect(mockHandleError).toHaveBeenCalledWith(testError, "API", {
          operation: "refreshNotes",
          ...expectedContext,
        });
      });
    });
  });

  describe("updateFilters", () => {
    // Parameterized tests for common filtering scenarios
    const filterTestCases = [
      {
        name: "filename filtering",
        setupNotes: () => [
          createMockNote("Test Note", "/test.md"),
          createMockNote("Other Note", "/other.md"),
        ],
        filter: { filename: "Test" },
        expectedCount: 1,
        validator: (notes: NoteData[]) => {
          expect(notes[0].title).toBe("Test Note");
        },
      },
      {
        name: "folder filtering",
        setupNotes: () => createTestNotes().withFolders(["folder1", "folder2"]),
        filter: { folders: ["folder1"] },
        expectedCount: 1,
        validator: (notes: NoteData[]) => {
          expect(notes[0].folder).toBe("folder1");
        },
      },
      {
        name: "tag filtering",
        setupNotes: () => createTestNotes().withTags(["tag1", "tag2"]),
        filter: { tags: ["tag1"] },
        expectedCount: 1,
        validator: (notes: NoteData[]) => {
          expect(notes[0].tags).toContain("tag1");
        },
      },
    ];

    filterTestCases.forEach(({ name, setupNotes, filter, expectedCount, validator }) => {
      it(`should apply ${name} correctly`, async () => {
        // Arrange
        const notes = setupNotes();
        await setupNotesWithRefresh(notes);

        // Act
        useCardExplorerStore.getState().updateFilters(filter);

        // Assert
        const state = useCardExplorerStore.getState();
        expectState.filteredResults(state, expectedCount, validator);

        // Verify filter state is updated
        Object.entries(filter).forEach(([key, value]) => {
          expect(state.filters[key as keyof typeof state.filters]).toEqual(value);
        });
      });
    });

    it("should update filtered notes when date filters are applied", async () => {
      // Arrange
      const mockNotes = createTestNotes().withDates([1, 10]); // 1 day ago, 10 days ago
      await setupNotesWithRefresh(mockNotes);

      // Act
      useCardExplorerStore.getState().updateFilters({
        dateRange: {
          type: "within",
          value: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        },
      });

      // Assert
      const state = useCardExplorerStore.getState();
      expectState.filteredResults(state, 1, (notes) => {
        expect(notes[0].title).toBe("Note 1"); // Recent note
      });
    });

    it("should update filtered notes when after date filters are applied", async () => {
      // Arrange
      const mockNotes = createTestNotes().withDates([1, 10]); // 1 day ago, 10 days ago
      await setupNotesWithRefresh(mockNotes);

      // Act
      useCardExplorerStore.getState().updateFilters({
        dateRange: {
          type: "after",
          value: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        },
      });

      // Assert
      const state = useCardExplorerStore.getState();
      expectState.filteredResults(state, 1, (notes) => {
        expect(notes[0].title).toBe("Note 1"); // Recent note
      });
    });
  });

  describe("clearFilters", () => {
    it("should reset filters to default state and restore filtered notes", async () => {
      // Arrange
      const mockNotes = [
        createMockNote("Matching Note", "/matching.md", "work", ["important"]),
        createMockNote("Other Note", "/other.md", "personal", ["casual"]),
        createMockNote("Another Note", "/another.md", "archive", ["old"]),
      ];
      await setupNotesWithRefresh(mockNotes);

      // Apply filters to reduce the visible notes
      useCardExplorerStore.getState().updateFilters({
        folders: ["work"],
        tags: ["important"],
        filename: "Matching",
      });

      // Verify filters are applied and filteredNotes is reduced
      let state = useCardExplorerStore.getState();
      expectState.filteredResults(state, 1, (notes) => {
        expect(notes[0].title).toBe("Matching Note");
      });

      // Act
      useCardExplorerStore.getState().clearFilters();

      // Assert - Verify filters are cleared and all notes are now visible
      state = useCardExplorerStore.getState();
      expect(state.filters.filename).toBe("");
      expect(state.filters.tags).toEqual([]);
      expect(state.filters.folders).toEqual([]);
      expect(state.filters.dateRange).toBe(null);

      // Verify that filteredNotes now shows all notes (filtering has been reset)
      expectState.filteredResults(state, 3, (notes) => {
        expect(notes.map((note) => note.title)).toEqual(
          expect.arrayContaining(["Matching Note", "Other Note", "Another Note"])
        );
      });
    });
  });

  describe("updateSortFromSettings", () => {
    it("should update sort configuration with new sort key", async () => {
      const mockNotes = [
        createMockNote("A Note", "/a.md"),
        createMockNote("B Note", "/b.md"),
        createMockNote("C Note", "/c.md"),
      ];

      // Set up initial state
      await setupNotesWithRefresh(mockNotes);

      // Update sort key to priority
      useCardExplorerStore.getState().updateSortFromSettings("priority");
      const state = useCardExplorerStore.getState();

      expect(state.sortConfig.key).toBe("priority");
      expect(state.sortConfig.order).toBe("desc"); // Should maintain default order
    });

    it("should recompute filtered notes with new sort configuration", async () => {
      const mockNotes = [
        createMockNote("Note 1", "/note1.md"),
        createMockNote("Note 2", "/note2.md"),
      ];

      // Set up initial state with filters
      await setupNotesWithRefresh(mockNotes);
      useCardExplorerStore.getState().updateFilters({ folders: ["folder1"] });

      // Update sort key
      useCardExplorerStore.getState().updateSortFromSettings("created");
      const state = useCardExplorerStore.getState();

      // Should maintain filters but update sort
      expect(state.sortConfig.key).toBe("created");
      expect(state.filters.folders).toEqual(["folder1"]);
    });

    // Parameterized tests for common sorting scenarios
    const sortTestCases = [
      {
        name: "priority field sorting",
        notes: createTestNotes().withPriorities([3, 1, 2]),
        sortKey: "priority",
        expectedOrder: ["Note 1", "Note 3", "Note 2"], // priority: 3, 2, 1 (descending)
      },
      {
        name: "category field sorting with case-insensitive",
        notes: [
          { ...createMockNote("Note 1", "/note1.md"), frontmatter: { category: "zebra" } },
          { ...createMockNote("Note 2", "/note2.md"), frontmatter: { category: "Apple" } },
          { ...createMockNote("Note 3", "/note3.md"), frontmatter: { category: "banana" } },
        ],
        sortKey: "category",
        expectedOrder: ["Note 1", "Note 3", "Note 2"], // zebra, banana, Apple (descending, case-insensitive)
      },
    ];

    sortTestCases.forEach(({ name, notes, sortKey, expectedOrder }) => {
      it(`should handle ${name}`, async () => {
        // Arrange
        await setupNotesWithRefresh(notes);

        // Act
        useCardExplorerStore.getState().updateSortFromSettings(sortKey);

        // Assert
        const state = useCardExplorerStore.getState();
        const actualOrder = state.filteredNotes.map((note) => note.title);
        expect(actualOrder).toEqual(expectedOrder);
        expect(state.sortConfig.key).toBe(sortKey);
      });
    });

    it("should sort notes by frontmatter field when sort key is updated", async () => {
      // Arrange
      const baseDate = new Date(TEST_TIMESTAMPS.BASE_DATE);
      const mockNotes = [
        {
          ...createMockNote("Note A", "/a.md", "", [], baseDate),
          frontmatter: { priority: 3, created: "2024-01-03" },
        },
        {
          ...createMockNote("Note B", "/b.md", "", [], baseDate),
          frontmatter: { priority: 1, created: "2024-01-04" },
        },
        {
          ...createMockNote("Note C", "/c.md", "", [], baseDate),
          frontmatter: { priority: 2, created: "2024-01-02" },
        },
      ];
      await setupNotesWithRefresh(mockNotes);

      // Act & Assert - Sort by priority
      useCardExplorerStore.getState().updateSortFromSettings("priority");
      let state = useCardExplorerStore.getState();
      expect(state.filteredNotes[0].title).toBe("Note A"); // priority: 3
      expect(state.filteredNotes[1].title).toBe("Note C"); // priority: 2
      expect(state.filteredNotes[2].title).toBe("Note B"); // priority: 1

      // Act & Assert - Switch to sort by created date
      useCardExplorerStore.getState().updateSortFromSettings("created");
      state = useCardExplorerStore.getState();
      expect(state.filteredNotes[0].title).toBe("Note B"); // 2024-01-04
      expect(state.filteredNotes[1].title).toBe("Note A"); // 2024-01-03
      expect(state.filteredNotes[2].title).toBe("Note C"); // 2024-01-02
    });

    it("should fallback to file modification time when frontmatter field is missing", async () => {
      // Arrange
      const mockNotes = createTestNotes().withDates([2, 1]); // 2 days ago, 1 day ago (older, newer)
      const notesWithFrontmatter = mockNotes.map((note, i) => ({
        ...note,
        title: i === 0 ? "Old Note" : "New Note",
        frontmatter: { title: i === 0 ? "Old Note" : "New Note" }, // No 'nonexistent' field
      }));
      await setupNotesWithRefresh(notesWithFrontmatter);

      // Act
      useCardExplorerStore.getState().updateSortFromSettings("nonexistent");

      // Assert - Should fallback to lastModified (descending - newer first)
      const state = useCardExplorerStore.getState();
      expect(state.filteredNotes[0].title).toBe("New Note"); // newer date
      expect(state.filteredNotes[1].title).toBe("Old Note"); // older date
    });

    it("should maintain pinned notes at top with new sort", async () => {
      const mockNotes = [
        {
          ...createMockNote("A Note", "/a.md"),
          frontmatter: { priority: 1 },
        },
        {
          ...createMockNote("B Note", "/b.md"),
          frontmatter: { priority: 2 },
        },
        {
          ...createMockNote("C Note", "/c.md"),
          frontmatter: { priority: 3 },
        },
      ];

      // Set up initial state with pinned note
      await setupNotesWithRefresh(mockNotes);
      useCardExplorerStore.getState().togglePin("/a.md"); // Pin note with lowest priority

      // Update sort key to priority
      useCardExplorerStore.getState().updateSortFromSettings("priority");
      const state = useCardExplorerStore.getState();

      // Pinned note should still be first, despite having lowest priority
      expect(state.filteredNotes[0].path).toBe("/a.md");
      // Other notes should be sorted by priority (descending)
      expect(state.filteredNotes[1].title).toBe("C Note"); // priority: 3
      expect(state.filteredNotes[2].title).toBe("B Note"); // priority: 2
    });
  });

  describe("togglePin", () => {
    it("should update pinned notes order", async () => {
      // Arrange
      const mockNotes = createTestNotes().basic(2);
      await setupNotesWithRefresh(mockNotes);

      // Act
      useCardExplorerStore.getState().togglePin("/note1.md");

      // Assert
      const state = useCardExplorerStore.getState();
      expect(state.pinnedNotes.has("/note1.md")).toBe(true);
      expect(state.pinnedNotes.has("/note2.md")).toBe(false);
    });

    it("should maintain pinned notes at top after setting notes", async () => {
      // Arrange
      const mockNotes = createTestNotes().basic(2);
      await setupNotesWithRefresh(mockNotes);

      // Act
      useCardExplorerStore.getState().togglePin("/note2.md");

      // Assert
      const state = useCardExplorerStore.getState();
      expect(state.filteredNotes[0].path).toBe("/note2.md"); // Pinned note first
      expect(state.filteredNotes[1].path).toBe("/note1.md");
    });

    it("should handle toggling pin state", async () => {
      // Arrange
      const mockNotes = createTestNotes().basic(1);
      await setupNotesWithRefresh(mockNotes);

      // Act
      useCardExplorerStore.getState().togglePin("/note1.md");
      useCardExplorerStore.getState().togglePin("/note1.md");

      // Assert
      const state = useCardExplorerStore.getState();
      expect(state.pinnedNotes.has("/note1.md")).toBe(false);
    });
  });

  describe("initializeFromPluginData", () => {
    it("should initialize with default values when plugin data is empty", () => {
      const plugin = createMockPlugin();

      const data = plugin.getData();
      const settings = plugin.getSettings();
      useCardExplorerStore.getState().initializeFromPluginData(data, settings);
      const state = useCardExplorerStore.getState();

      expect(state.pinnedNotes.size).toBe(0);
      expect(state.filters.filename).toBe("");
      expect(state.sortConfig.key).toBe("updated");
    });

    it("should initialize pinned notes from plugin data", () => {
      const plugin = createMockPlugin({
        pinnedNotes: ["/note1.md", "/note2.md"],
      });

      const data = plugin.getData();
      const settings = plugin.getSettings();
      useCardExplorerStore.getState().initializeFromPluginData(data, settings);
      const state = useCardExplorerStore.getState();

      expect(state.pinnedNotes.size).toBe(2);
      expect(state.pinnedNotes.has("/note1.md")).toBe(true);
      expect(state.pinnedNotes.has("/note2.md")).toBe(true);
    });

    it("should initialize filters from plugin data", () => {
      const plugin = createMockPlugin({
        lastFilters: {
          folders: ["work", "personal"],
          tags: ["important"],
          filename: "meeting",
          dateRange: null,
        },
      });

      const data = plugin.getData();
      const settings = plugin.getSettings();
      useCardExplorerStore.getState().initializeFromPluginData(data, settings);
      const state = useCardExplorerStore.getState();

      expect(state.filters.folders).toEqual(["work", "personal"]);
      expect(state.filters.tags).toEqual(["important"]);
      expect(state.filters.filename).toBe("meeting");
      expect(state.filters.dateRange).toBe(null);
    });

    it("should initialize and apply filters with notes", async () => {
      const mockNotes = [
        createMockNote("Work Note", "/work/note.md", "work", ["important"]),
        createMockNote("Personal Note", "/personal/note.md", "personal", ["casual"]),
        createMockNote("Archive Note", "/archive/note.md", "archive", ["old"]),
      ];

      // Set up notes first
      await setupNotesWithRefresh(mockNotes);

      const plugin = createMockPlugin({
        pinnedNotes: ["/personal/note.md"],
        lastFilters: {
          folders: ["work", "personal"],
          tags: [],
          filename: "",
          dateRange: null,
        },
      });

      const data = plugin.getData();
      const settings = plugin.getSettings();
      useCardExplorerStore.getState().initializeFromPluginData(data, settings);
      const state = useCardExplorerStore.getState();

      // Should filter out archive folder and pin personal note to top
      expect(state.filteredNotes).toHaveLength(2);
      expect(state.filteredNotes[0].path).toBe("/personal/note.md"); // Pinned first
      expect(state.filteredNotes[1].path).toBe("/work/note.md");
    });

    it("should handle partial plugin data gracefully", () => {
      const plugin = createMockPlugin({
        pinnedNotes: ["/note1.md"],
        // lastFilters and sortConfig are null/undefined
      });

      const data = plugin.getData();
      const settings = plugin.getSettings();
      useCardExplorerStore.getState().initializeFromPluginData(data, settings);
      const state = useCardExplorerStore.getState();

      // Should use defaults for missing data
      expect(state.pinnedNotes.has("/note1.md")).toBe(true);
      expect(state.filters.filename).toBe("");
      expect(state.sortConfig.key).toBe("updated");
    });

    it("should handle null pinnedNotes gracefully", () => {
      const plugin = createMockPlugin({
        pinnedNotes: null, // Explicitly null
        lastFilters: {
          folders: ["work"],
          tags: ["important"],
          filename: "test",
          dateRange: null,
        },
      });

      const data = plugin.getData();
      const settings = plugin.getSettings();
      useCardExplorerStore.getState().initializeFromPluginData(data, settings);
      const state = useCardExplorerStore.getState();

      // Should handle null pinnedNotes and initialize with empty Set
      expect(state.pinnedNotes.size).toBe(0);
      expect(state.pinnedNotes).toEqual(new Set());

      // Other data should be initialized correctly
      expect(state.filters.filename).toBe("test");
      expect(state.filters.folders).toEqual(["work"]);
      expect(state.filters.tags).toEqual(["important"]);
      expect(state.sortConfig.key).toBe("updated");
    });

    it("should handle undefined pinnedNotes gracefully", () => {
      const plugin = createMockPlugin({
        pinnedNotes: undefined,
        lastFilters: {
          folders: ["personal"],
          tags: [],
          filename: "meeting",
          dateRange: null,
        },
      });

      const data = plugin.getData();
      const settings = plugin.getSettings();
      useCardExplorerStore.getState().initializeFromPluginData(data, settings);
      const state = useCardExplorerStore.getState();

      // Should handle undefined pinnedNotes and initialize with empty Set
      expect(state.pinnedNotes.size).toBe(0);
      expect(state.pinnedNotes).toEqual(new Set());

      // Other data should be initialized correctly
      expect(state.filters.filename).toBe("meeting");
      expect(state.filters.folders).toEqual(["personal"]);
      expect(state.filters.tags).toEqual([]);
    });
  });

  describe("reset", () => {
    it("should reset all state to initial values", async () => {
      // Arrange - Set up some state
      const testNote = createTestNotes().basic(1)[0];
      await setupNotesWithRefresh([testNote]);
      useCardExplorerStore.getState().updateFilters({ filename: "test" });
      useCardExplorerStore.getState().togglePin("/test.md");
      useCardExplorerStore.getState().setError("Some error");

      // Verify state has been modified
      const beforeState = useCardExplorerStore.getState();
      expect(beforeState.notes).toHaveLength(1);
      expect(beforeState.pinnedNotes.size).toBe(1);
      expect(beforeState.filters.filename).toBe("test");
      expect(beforeState.error).toBe("Some error");

      // Act
      useCardExplorerStore.getState().reset();

      // Assert - Should be back to initial state
      const afterState = useCardExplorerStore.getState();
      expectState.initial(afterState);
      expect(afterState.sortConfig.key).toBe("updated");
      expect(afterState.sortConfig.order).toBe("desc");
    });
  });

  describe("setError", () => {
    it("should set error message", () => {
      const initialState = useCardExplorerStore.getState();
      expect(initialState.error).toBe(null);

      useCardExplorerStore.getState().setError("Test error message");
      const state = useCardExplorerStore.getState();

      expect(state.error).toBe("Test error message");
    });

    it("should clear error message when set to null", () => {
      // First set an error
      useCardExplorerStore.getState().setError("Some error");
      expect(useCardExplorerStore.getState().error).toBe("Some error");

      // Then clear it
      useCardExplorerStore.getState().setError(null);
      const state = useCardExplorerStore.getState();

      expect(state.error).toBe(null);
    });

    it("should replace existing error message", () => {
      useCardExplorerStore.getState().setError("First error");
      expect(useCardExplorerStore.getState().error).toBe("First error");

      useCardExplorerStore.getState().setError("Second error");
      const state = useCardExplorerStore.getState();

      expect(state.error).toBe("Second error");
    });

    it("should not affect other state when setting error", async () => {
      await setupNotesWithRefresh([createMockNote("Test", "/test.md")]);

      const beforeState = useCardExplorerStore.getState();
      const initialNotes = beforeState.notes;
      const initialLoading = beforeState.isLoading;

      // Change error state
      useCardExplorerStore.getState().setError("New error");
      const afterState = useCardExplorerStore.getState();

      // Other state should remain unchanged
      expect(afterState.notes).toBe(initialNotes);
      expect(afterState.isLoading).toBe(initialLoading);
      expect(afterState.error).toBe("New error");
    });

    it("should handle empty string error message", () => {
      useCardExplorerStore.getState().setError("");
      const state = useCardExplorerStore.getState();

      expect(state.error).toBe("");
    });
  });

  describe("hasActiveFilters", () => {
    it("should detect active filters", async () => {
      await setupNotesWithRefresh([createMockNote("Test", "/test.md")]);
      const store = useCardExplorerStore.getState();
      expect(store.hasActiveFilters()).toBe(false);

      store.updateFilters({ filename: "test" });
      expect(store.hasActiveFilters()).toBe(true);
    });
  });

  describe("Available Options", () => {
    it("should compute available folders from notes", async () => {
      // Arrange
      const mockNotes = createTestNotes().withFolders(["folder1", "folder2"]);
      await setupNotesWithRefresh(mockNotes);

      // Act & Assert
      const state = useCardExplorerStore.getState();
      const folders = state.availableFolders;
      expect(folders).toContain("folder1");
      expect(folders).toContain("folder2");
    });

    it("should compute available tags from notes", async () => {
      // Arrange
      const mockNotes = [
        createMockNote("Note 1", "/note1.md", "folder1", ["tag1", "tag2"]),
        createMockNote("Note 2", "/note2.md", "folder2", ["tag2", "tag3"]),
      ];
      await setupNotesWithRefresh(mockNotes);

      // Act & Assert
      const state = useCardExplorerStore.getState();
      const tags = state.availableTags;
      expect(tags).toEqual(["tag1", "tag2", "tag3"]);
    });
  });

  describe("getSerializableData", () => {
    it("should return current pin states and filters", () => {
      const state = useCardExplorerStore.getState();

      // Set up some test data
      state.togglePin("/note1.md");
      state.togglePin("/note2.md");
      state.updateFilters({
        folders: ["work"],
        tags: ["important"],
        filename: "test",
      });

      const result = state.getSerializableData();

      expect(result.pinnedNotes).toEqual(expect.arrayContaining(["/note1.md", "/note2.md"]));
      expect(result.lastFilters).toEqual(
        expect.objectContaining({
          folders: ["work"],
          tags: ["important"],
          filename: "test",
        })
      );
    });

    it("should convert Set to Array for pinnedNotes", () => {
      const state = useCardExplorerStore.getState();

      state.togglePin("/note1.md");
      state.togglePin("/note2.md");

      const result = state.getSerializableData();

      expect(Array.isArray(result.pinnedNotes)).toBe(true);
      expect(result.pinnedNotes).toHaveLength(2);
    });

    it("should return empty array for no pinned notes", () => {
      const result = useCardExplorerStore.getState().getSerializableData();

      expect(result.pinnedNotes).toEqual([]);
      expect(result.lastFilters).toBeDefined();
    });

    it("should include current filter state", () => {
      const state = useCardExplorerStore.getState();

      const testFilters = {
        folders: ["projects", "archive"],
        tags: ["urgent", "meeting"],
        filename: "daily",
        dateRange: {
          type: "within" as const,
          value: "7",
        },
      };

      state.updateFilters(testFilters);
      const result = state.getSerializableData();

      expect(result.lastFilters).toEqual(testFilters);
    });
  });
});
