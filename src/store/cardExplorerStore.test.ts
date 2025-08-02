import type { App } from "obsidian";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type CardExplorerPlugin from "../main";
import type { NoteData } from "../types";
import { useCardExplorerStore } from "./cardExplorerStore";

// Mock note data for testing
const createMockNote = (
  title: string,
  path: string,
  folder: string = "",
  tags: string[] = [],
  frontmatter: Record<string, any> | null = null,
  lastModified: Date = new Date()
): NoteData => ({
  file: {} as any, // Mock TFile
  title,
  path,
  preview: `Preview for ${title}`,
  lastModified,
  frontmatter,
  tags,
  folder,
});

// Mock plugin instance for testing
const createMockPlugin = (data?: Partial<any>): CardExplorerPlugin => {
  let currentData = {
    pinnedNotes: [],
    lastFilters: null,
    sortConfig: null,
    ...data,
  };

  const mockPlugin = {
    getData: () => currentData,
    updateData: vi.fn((newData: any) => {
      currentData = { ...currentData, ...newData };
    }),
    savePluginData: vi.fn(async () => {}),
  } as any;

  return mockPlugin;
};

// Mock loadNotesFromVault function
vi.mock("./noteProcessing", () => ({
  loadNotesFromVault: vi.fn(),
}));

// Mock error handling utilities
vi.mock("../utils/errorHandling", () => ({
  withRetry: vi.fn(),
  handleError: vi.fn(),
  ErrorCategory: {
    API: "API",
    DATA: "DATA",
    UI: "UI",
    GENERAL: "GENERAL",
  },
}));

describe("CardExplorerStore", () => {
  beforeEach(() => {
    // Reset store before each test
    useCardExplorerStore.getState().reset();
    // Clear all mocks
    vi.clearAllMocks();
  });

  describe("Initial State", () => {
    it("should have correct initial state", () => {
      const state = useCardExplorerStore.getState();

      expect(state.notes).toEqual([]);
      expect(state.filteredNotes).toEqual([]);
      expect(state.pinnedNotes).toEqual(new Set());
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe(null);
      expect(state.filters.folders).toEqual([]);
      expect(state.filters.tags).toEqual([]);
      expect(state.filters.filename).toBe("");
      expect(state.sortConfig.key).toBe("updated");
      expect(state.sortConfig.order).toBe("desc");
    });
  });

  describe("setNotes", () => {
    it("should set notes and update filtered notes", () => {
      const mockNotes = [
        createMockNote("Note 1", "/note1.md"),
        createMockNote("Note 2", "/note2.md"),
      ];

      useCardExplorerStore.getState().setNotes(mockNotes);
      const state = useCardExplorerStore.getState();

      expect(state.notes).toEqual(mockNotes);
      expect(state.filteredNotes).toEqual(mockNotes);
    });
  });

  describe("updateFilters", () => {
    it("should update filters and recompute filtered notes", () => {
      const mockNotes = [
        createMockNote("Test Note", "/test.md", "folder1", ["tag1"]),
        createMockNote("Other Note", "/other.md", "folder2", ["tag2"]),
      ];

      useCardExplorerStore.getState().setNotes(mockNotes);
      useCardExplorerStore.getState().updateFilters({ filename: "Test" });

      const state = useCardExplorerStore.getState();
      expect(state.filters.filename).toBe("Test");
      expect(state.filteredNotes).toHaveLength(1);
      expect(state.filteredNotes[0].title).toBe("Test Note");
    });

    it("should filter by folders", () => {
      const mockNotes = [
        createMockNote("Note 1", "/note1.md", "folder1"),
        createMockNote("Note 2", "/note2.md", "folder2"),
      ];

      useCardExplorerStore.getState().setNotes(mockNotes);
      useCardExplorerStore.getState().updateFilters({ folders: ["folder1"] });

      const state = useCardExplorerStore.getState();
      expect(state.filteredNotes).toHaveLength(1);
      expect(state.filteredNotes[0].folder).toBe("folder1");
    });

    it("should filter by tags", () => {
      const mockNotes = [
        createMockNote("Note 1", "/note1.md", "", ["tag1", "tag2"]),
        createMockNote("Note 2", "/note2.md", "", ["tag3"]),
      ];

      useCardExplorerStore.getState().setNotes(mockNotes);
      useCardExplorerStore.getState().updateFilters({ tags: ["tag1"] });

      const state = useCardExplorerStore.getState();
      expect(state.filteredNotes).toHaveLength(1);
      expect(state.filteredNotes[0].tags).toContain("tag1");
    });

    it("should filter by date range - within", () => {
      const now = new Date();
      const recent = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
      const old = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago

      const mockNotes = [
        createMockNote("Recent Note", "/recent.md", "", [], null, recent),
        createMockNote("Old Note", "/old.md", "", [], null, old),
      ];

      useCardExplorerStore.getState().setNotes(mockNotes);
      useCardExplorerStore.getState().updateFilters({
        dateRange: {
          type: "within",
          value: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        },
      });

      const state = useCardExplorerStore.getState();
      expect(state.filteredNotes).toHaveLength(1);
      expect(state.filteredNotes[0].title).toBe("Recent Note");
    });

    it("should filter by date range - after", () => {
      const now = new Date();
      const recent = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
      const old = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago

      const mockNotes = [
        createMockNote("Recent Note", "/recent.md", "", [], null, recent),
        createMockNote("Old Note", "/old.md", "", [], null, old),
      ];

      useCardExplorerStore.getState().setNotes(mockNotes);
      useCardExplorerStore.getState().updateFilters({
        dateRange: {
          type: "after",
          value: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        },
      });

      const state = useCardExplorerStore.getState();
      expect(state.filteredNotes).toHaveLength(1);
      expect(state.filteredNotes[0].title).toBe("Recent Note");
    });
  });

  describe("updateSortConfig", () => {
    it("should update sort configuration and recompute filtered notes", () => {
      const now = new Date();
      const earlier = new Date(now.getTime() - 1000 * 60 * 60); // 1 hour earlier

      const mockNotes = [
        createMockNote("Note 1", "/note1.md", "", [], null, earlier),
        createMockNote("Note 2", "/note2.md", "", [], null, now),
      ];

      useCardExplorerStore.getState().setNotes(mockNotes);
      useCardExplorerStore.getState().updateSortConfig({ key: "mtime", order: "asc" });

      const state = useCardExplorerStore.getState();
      expect(state.sortConfig.key).toBe("mtime");
      expect(state.sortConfig.order).toBe("asc");
      expect(state.filteredNotes[0].title).toBe("Note 1"); // Earlier note first
    });

    it("should sort by frontmatter field", () => {
      const mockNotes = [
        createMockNote("Note 1", "/note1.md", "", [], { priority: 1 }),
        createMockNote("Note 2", "/note2.md", "", [], { priority: 3 }),
        createMockNote("Note 3", "/note3.md", "", [], { priority: 2 }),
      ];

      useCardExplorerStore.getState().setNotes(mockNotes);
      useCardExplorerStore.getState().updateSortConfig({ key: "priority", order: "asc" });

      const state = useCardExplorerStore.getState();
      expect(state.filteredNotes[0].frontmatter?.priority).toBe(1);
      expect(state.filteredNotes[1].frontmatter?.priority).toBe(2);
      expect(state.filteredNotes[2].frontmatter?.priority).toBe(3);
    });
  });

  describe("togglePin", () => {
    it("should toggle pin state", () => {
      const mockNotes = [
        createMockNote("Note 1", "/note1.md"),
        createMockNote("Note 2", "/note2.md"),
      ];

      useCardExplorerStore.getState().setNotes(mockNotes);
      useCardExplorerStore.getState().togglePin("/note1.md");

      const state = useCardExplorerStore.getState();
      expect(state.pinnedNotes.has("/note1.md")).toBe(true);
      expect(state.pinnedNotes.has("/note2.md")).toBe(false);
    });

    it("should move pinned notes to top", () => {
      const mockNotes = [
        createMockNote("Note 1", "/note1.md"),
        createMockNote("Note 2", "/note2.md"),
      ];

      useCardExplorerStore.getState().setNotes(mockNotes);
      useCardExplorerStore.getState().togglePin("/note2.md");

      const state = useCardExplorerStore.getState();
      expect(state.filteredNotes[0].path).toBe("/note2.md"); // Pinned note first
      expect(state.filteredNotes[1].path).toBe("/note1.md");
    });

    it("should unpin notes when toggled again", () => {
      const mockNotes = [createMockNote("Note 1", "/note1.md")];

      useCardExplorerStore.getState().setNotes(mockNotes);
      useCardExplorerStore.getState().togglePin("/note1.md");
      useCardExplorerStore.getState().togglePin("/note1.md");

      const state = useCardExplorerStore.getState();
      expect(state.pinnedNotes.has("/note1.md")).toBe(false);
    });
  });

  describe("clearFilters", () => {
    it("should reset filters to default state", () => {
      useCardExplorerStore.getState().updateFilters({
        filename: "test",
        tags: ["tag1"],
        folders: ["folder1"],
      });

      useCardExplorerStore.getState().clearFilters();

      const state = useCardExplorerStore.getState();
      expect(state.filters.filename).toBe("");
      expect(state.filters.tags).toEqual([]);
      expect(state.filters.folders).toEqual([]);
    });
  });

  describe("Selectors", () => {
    it("should get available folders", () => {
      const mockNotes = [
        createMockNote("Note 1", "/note1.md", "folder1/subfolder"),
        createMockNote("Note 2", "/note2.md", "folder2"),
      ];

      useCardExplorerStore.getState().setNotes(mockNotes);
      const state = useCardExplorerStore.getState();
      const folders = state.availableFolders;

      expect(folders).toContain("folder1");
      expect(folders).toContain("folder1/subfolder");
      expect(folders).toContain("folder2");
    });

    it("should get available tags", () => {
      const mockNotes = [
        createMockNote("Note 1", "/note1.md", "", ["tag1", "tag2"]),
        createMockNote("Note 2", "/note2.md", "", ["tag2", "tag3"]),
      ];

      useCardExplorerStore.getState().setNotes(mockNotes);
      const state = useCardExplorerStore.getState();
      const tags = state.availableTags;

      expect(tags).toEqual(["tag1", "tag2", "tag3"]);
    });

    it("should detect active filters", () => {
      const store = useCardExplorerStore.getState();
      expect(store.hasActiveFilters()).toBe(false);

      store.updateFilters({ filename: "test" });
      expect(store.hasActiveFilters()).toBe(true);
    });

    it("should count pinned notes", () => {
      const mockNotes = [
        createMockNote("Note 1", "/note1.md"),
        createMockNote("Note 2", "/note2.md"),
      ];

      const store = useCardExplorerStore.getState();
      store.setNotes(mockNotes);
      store.togglePin("/note1.md");

      expect(store.getPinnedCount()).toBe(1);
    });
  });

  describe("initializeFromPluginData", () => {
    it("should initialize with default values when plugin data is empty", () => {
      const plugin = createMockPlugin();

      useCardExplorerStore.getState().initializeFromPluginData(plugin);
      const state = useCardExplorerStore.getState();

      expect(state.pinnedNotes.size).toBe(0);
      expect(state.filters.folders).toEqual([]);
      expect(state.filters.tags).toEqual([]);
      expect(state.filters.filename).toBe("");
      expect(state.sortConfig.key).toBe("updated");
      expect(state.sortConfig.order).toBe("desc");
    });

    it("should initialize pinned notes from plugin data", () => {
      const plugin = createMockPlugin({
        pinnedNotes: ["/note1.md", "/note2.md"],
      });

      useCardExplorerStore.getState().initializeFromPluginData(plugin);
      const state = useCardExplorerStore.getState();

      expect(state.pinnedNotes.has("/note1.md")).toBe(true);
      expect(state.pinnedNotes.has("/note2.md")).toBe(true);
      expect(state.pinnedNotes.size).toBe(2);
    });

    it("should initialize filters from plugin data", () => {
      const lastFilters = {
        folders: ["work", "personal"],
        tags: ["important", "todo"],
        filename: "project",
        dateRange: {
          type: "within" as const,
          value: new Date("2024-01-01"),
        },
      };

      const plugin = createMockPlugin({
        lastFilters,
      });

      useCardExplorerStore.getState().initializeFromPluginData(plugin);
      const state = useCardExplorerStore.getState();

      expect(state.filters.folders).toEqual(["work", "personal"]);
      expect(state.filters.tags).toEqual(["important", "todo"]);
      expect(state.filters.filename).toBe("project");
      expect(state.filters.dateRange).toEqual({
        type: "within",
        value: new Date("2024-01-01"),
      });
    });

    it("should initialize sort config from plugin data", () => {
      const sortConfig = {
        key: "priority",
        order: "asc" as const,
      };

      const plugin = createMockPlugin({
        sortConfig,
      });

      useCardExplorerStore.getState().initializeFromPluginData(plugin);
      const state = useCardExplorerStore.getState();

      expect(state.sortConfig.key).toBe("priority");
      expect(state.sortConfig.order).toBe("asc");
    });

    it("should recompute filtered notes after initialization", () => {
      const mockNotes = [
        createMockNote("Work Note", "/work/note.md", "work", ["important"]),
        createMockNote("Personal Note", "/personal/note.md", "personal", ["todo"]),
        createMockNote("Archive Note", "/archive/note.md", "archive", ["old"]),
      ];

      // Set up notes first
      useCardExplorerStore.getState().setNotes(mockNotes);

      const plugin = createMockPlugin({
        pinnedNotes: ["/personal/note.md"],
        lastFilters: {
          folders: ["work", "personal"],
          tags: [],
          filename: "",
          dateRange: null,
        },
        sortConfig: {
          key: "updated",
          order: "desc",
        },
      });

      useCardExplorerStore.getState().initializeFromPluginData(plugin);
      const state = useCardExplorerStore.getState();

      // Should filter out archive folder and pin personal note to top
      expect(state.filteredNotes).toHaveLength(2);
      expect(state.filteredNotes[0].path).toBe("/personal/note.md"); // Pinned note first
      expect(state.filteredNotes[1].path).toBe("/work/note.md");
      expect(state.filteredNotes.some((note) => note.folder === "archive")).toBe(false);
    });

    it("should handle partial plugin data gracefully", () => {
      const plugin = createMockPlugin({
        pinnedNotes: ["/note1.md"],
        // lastFilters and sortConfig are null/undefined
      });

      useCardExplorerStore.getState().initializeFromPluginData(plugin);
      const state = useCardExplorerStore.getState();

      // Should use defaults for missing data
      expect(state.pinnedNotes.has("/note1.md")).toBe(true);
      expect(state.filters.folders).toEqual([]);
      expect(state.sortConfig.key).toBe("updated");
      expect(state.sortConfig.order).toBe("desc");
    });

    it("should preserve existing notes when initializing", () => {
      const mockNotes = [createMockNote("Existing Note", "/existing.md")];

      useCardExplorerStore.getState().setNotes(mockNotes);

      const plugin = createMockPlugin({
        pinnedNotes: ["/existing.md"],
      });

      useCardExplorerStore.getState().initializeFromPluginData(plugin);
      const state = useCardExplorerStore.getState();

      // Notes should be preserved
      expect(state.notes).toEqual(mockNotes);
      expect(state.filteredNotes).toEqual(mockNotes);
      expect(state.pinnedNotes.has("/existing.md")).toBe(true);
    });
  });

  describe("savePinStatesToPlugin", () => {
    it("should save pinned notes to plugin data", async () => {
      const plugin = createMockPlugin();

      // Set up store state with pinned notes
      useCardExplorerStore.getState().togglePin("/note1.md");
      useCardExplorerStore.getState().togglePin("/note2.md");

      await useCardExplorerStore.getState().savePinStatesToPlugin(plugin);

      // Verify updateData was called with correct pinned notes
      expect(plugin.updateData).toHaveBeenCalledWith(
        expect.objectContaining({
          pinnedNotes: ["/note1.md", "/note2.md"],
        })
      );

      // Verify savePluginData was called
      expect(plugin.savePluginData).toHaveBeenCalledOnce();
    });

    it("should save current filters to plugin data", async () => {
      const plugin = createMockPlugin();

      // Set up store state with filters
      useCardExplorerStore.getState().updateFilters({
        folders: ["work", "personal"],
        tags: ["important"],
        filename: "project",
      });

      await useCardExplorerStore.getState().savePinStatesToPlugin(plugin);

      // Verify updateData was called with correct filters
      expect(plugin.updateData).toHaveBeenCalledWith(
        expect.objectContaining({
          lastFilters: expect.objectContaining({
            folders: ["work", "personal"],
            tags: ["important"],
            filename: "project",
          }),
        })
      );

      expect(plugin.savePluginData).toHaveBeenCalledOnce();
    });

    it("should save current sort config to plugin data", async () => {
      const plugin = createMockPlugin();

      // Set up store state with sort config
      useCardExplorerStore.getState().updateSortConfig({
        key: "priority",
        order: "asc",
      });

      await useCardExplorerStore.getState().savePinStatesToPlugin(plugin);

      // Verify updateData was called with correct sort config
      expect(plugin.updateData).toHaveBeenCalledWith(
        expect.objectContaining({
          sortConfig: {
            key: "priority",
            order: "asc",
          },
        })
      );

      expect(plugin.savePluginData).toHaveBeenCalledOnce();
    });

    it("should preserve existing plugin data when saving", async () => {
      const existingData = {
        version: 1,
        customField: "custom_value",
      };

      const plugin = createMockPlugin(existingData);

      // Set up some store state
      useCardExplorerStore.getState().togglePin("/note1.md");

      await useCardExplorerStore.getState().savePinStatesToPlugin(plugin);

      // Verify existing data is preserved
      expect(plugin.updateData).toHaveBeenCalledWith(
        expect.objectContaining({
          version: 1,
          customField: "custom_value",
          pinnedNotes: ["/note1.md"],
        })
      );
    });

    it("should convert Set to Array for pinned notes", async () => {
      const plugin = createMockPlugin();

      // Manually set pinned notes as Set
      const state = useCardExplorerStore.getState();
      state.togglePin("/note1.md");
      state.togglePin("/note2.md");
      state.togglePin("/note3.md");

      await state.savePinStatesToPlugin(plugin);

      // Verify Set is converted to Array
      const updateCall = (plugin.updateData as any).mock.calls[0][0];
      expect(Array.isArray(updateCall.pinnedNotes)).toBe(true);
      expect(updateCall.pinnedNotes).toEqual(
        expect.arrayContaining(["/note1.md", "/note2.md", "/note3.md"])
      );
    });

    it("should save empty pinned notes array when no notes are pinned", async () => {
      const plugin = createMockPlugin();

      // Store has no pinned notes by default
      await useCardExplorerStore.getState().savePinStatesToPlugin(plugin);

      expect(plugin.updateData).toHaveBeenCalledWith(
        expect.objectContaining({
          pinnedNotes: [],
        })
      );
    });

    it("should handle all state properties in a single save operation", async () => {
      const plugin = createMockPlugin();

      // Set up comprehensive store state
      const state = useCardExplorerStore.getState();

      // Add pinned notes
      state.togglePin("/pinned1.md");
      state.togglePin("/pinned2.md");

      // Set filters
      state.updateFilters({
        folders: ["work"],
        tags: ["urgent", "todo"],
        filename: "meeting",
      });

      // Set sort config
      state.updateSortConfig({
        key: "created",
        order: "asc",
      });

      await state.savePinStatesToPlugin(plugin);

      // Verify all state is saved in one call
      expect(plugin.updateData).toHaveBeenCalledOnce();
      expect(plugin.updateData).toHaveBeenCalledWith(
        expect.objectContaining({
          pinnedNotes: expect.arrayContaining(["/pinned1.md", "/pinned2.md"]),
          lastFilters: expect.objectContaining({
            folders: ["work"],
            tags: ["urgent", "todo"],
            filename: "meeting",
          }),
          sortConfig: {
            key: "created",
            order: "asc",
          },
        })
      );

      expect(plugin.savePluginData).toHaveBeenCalledOnce();
    });

    it("should handle savePluginData errors gracefully", async () => {
      const plugin = createMockPlugin();

      // Mock savePluginData to throw an error
      (plugin.savePluginData as any).mockRejectedValueOnce(new Error("Save failed"));

      useCardExplorerStore.getState().togglePin("/note1.md");

      // Should not throw, but let the error propagate
      await expect(useCardExplorerStore.getState().savePinStatesToPlugin(plugin)).rejects.toThrow(
        "Save failed"
      );

      // Verify updateData was still called
      expect(plugin.updateData).toHaveBeenCalledOnce();
    });
  });

  describe("setLoading", () => {
    it("should set loading state to true", () => {
      const initialState = useCardExplorerStore.getState();
      expect(initialState.isLoading).toBe(false);

      useCardExplorerStore.getState().setLoading(true);
      const state = useCardExplorerStore.getState();

      expect(state.isLoading).toBe(true);
    });

    it("should set loading state to false", () => {
      // First set loading to true
      useCardExplorerStore.getState().setLoading(true);
      expect(useCardExplorerStore.getState().isLoading).toBe(true);

      // Then set it to false
      useCardExplorerStore.getState().setLoading(false);
      const state = useCardExplorerStore.getState();

      expect(state.isLoading).toBe(false);
    });

    it("should not affect other state properties when setting loading", () => {
      // Set up some initial state
      const mockNotes = [createMockNote("Test Note", "/test.md", "folder1", ["tag1"])];

      useCardExplorerStore.getState().setNotes(mockNotes);
      useCardExplorerStore.getState().togglePin("/test.md");
      useCardExplorerStore.getState().updateFilters({ filename: "test" });
      useCardExplorerStore.getState().setError("Some error");

      const beforeState = useCardExplorerStore.getState();

      // Change loading state
      useCardExplorerStore.getState().setLoading(true);
      const afterState = useCardExplorerStore.getState();

      // Verify only isLoading changed
      expect(afterState.isLoading).toBe(true);
      expect(afterState.notes).toEqual(beforeState.notes);
      expect(afterState.filteredNotes).toEqual(beforeState.filteredNotes);
      expect(afterState.pinnedNotes).toEqual(beforeState.pinnedNotes);
      expect(afterState.filters).toEqual(beforeState.filters);
      expect(afterState.sortConfig).toEqual(beforeState.sortConfig);
      expect(afterState.error).toBe(beforeState.error);
    });

    it("should allow multiple loading state changes", () => {
      const state = useCardExplorerStore.getState();

      // Initial state
      expect(state.isLoading).toBe(false);

      // Change to true
      state.setLoading(true);
      expect(useCardExplorerStore.getState().isLoading).toBe(true);

      // Change back to false
      state.setLoading(false);
      expect(useCardExplorerStore.getState().isLoading).toBe(false);

      // Change to true again
      state.setLoading(true);
      expect(useCardExplorerStore.getState().isLoading).toBe(true);
    });

    it("should maintain loading state when set to same value", () => {
      // Set to true
      useCardExplorerStore.getState().setLoading(true);
      expect(useCardExplorerStore.getState().isLoading).toBe(true);

      // Set to true again
      useCardExplorerStore.getState().setLoading(true);
      expect(useCardExplorerStore.getState().isLoading).toBe(true);

      // Set to false
      useCardExplorerStore.getState().setLoading(false);
      expect(useCardExplorerStore.getState().isLoading).toBe(false);

      // Set to false again
      useCardExplorerStore.getState().setLoading(false);
      expect(useCardExplorerStore.getState().isLoading).toBe(false);
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

    it("should not affect other state properties when setting error", () => {
      // Set up some initial state
      const mockNotes = [createMockNote("Test Note", "/test.md", "folder1", ["tag1"])];

      useCardExplorerStore.getState().setNotes(mockNotes);
      useCardExplorerStore.getState().togglePin("/test.md");
      useCardExplorerStore.getState().updateFilters({ filename: "test" });
      useCardExplorerStore.getState().setLoading(true);

      const beforeState = useCardExplorerStore.getState();

      // Change error state
      useCardExplorerStore.getState().setError("New error");
      const afterState = useCardExplorerStore.getState();

      // Verify only error changed
      expect(afterState.error).toBe("New error");
      expect(afterState.isLoading).toBe(beforeState.isLoading);
      expect(afterState.notes).toEqual(beforeState.notes);
      expect(afterState.filteredNotes).toEqual(beforeState.filteredNotes);
      expect(afterState.pinnedNotes).toEqual(beforeState.pinnedNotes);
      expect(afterState.filters).toEqual(beforeState.filters);
      expect(afterState.sortConfig).toEqual(beforeState.sortConfig);
    });

    it("should handle empty string error message", () => {
      useCardExplorerStore.getState().setError("");
      const state = useCardExplorerStore.getState();

      expect(state.error).toBe("");
    });

    it("should handle long error messages", () => {
      const longError =
        "This is a very long error message that might contain detailed information about what went wrong during the operation and should be handled properly by the store.";

      useCardExplorerStore.getState().setError(longError);
      const state = useCardExplorerStore.getState();

      expect(state.error).toBe(longError);
    });
  });

  describe("refreshNotes", () => {
    const mockApp = {} as App;

    it("should successfully load and update notes", async () => {
      const mockNotes = [
        createMockNote("Note 1", "/note1.md", "folder1", ["tag1"]),
        createMockNote("Note 2", "/note2.md", "folder2", ["tag2"]),
      ];

      // Mock successful withRetry call
      const { withRetry } = await import("../utils/errorHandling");
      (withRetry as any).mockResolvedValueOnce(mockNotes);

      // Set up some initial filters and pins to test recomputation
      useCardExplorerStore.getState().updateFilters({ folders: ["folder1"] });
      useCardExplorerStore.getState().togglePin("/note1.md");

      await useCardExplorerStore.getState().refreshNotes(mockApp);
      const state = useCardExplorerStore.getState();

      // Verify loading state was managed correctly
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe(null);

      // Verify notes were updated
      expect(state.notes).toEqual(mockNotes);

      // Verify filtered notes were recomputed with existing filters
      expect(state.filteredNotes).toHaveLength(1);
      expect(state.filteredNotes[0].path).toBe("/note1.md"); // Pinned and filtered
    });

    it("should set loading state during operation", async () => {
      let resolveLoadNotes: (notes: NoteData[]) => void;
      const loadNotesPromise = new Promise<NoteData[]>((resolve) => {
        resolveLoadNotes = resolve;
      });

      const { withRetry } = await import("../utils/errorHandling");
      (withRetry as any).mockImplementationOnce(() => {
        // Set loading immediately when withRetry is called
        return loadNotesPromise;
      });

      // Start refresh (don't await yet)
      const refreshPromise = useCardExplorerStore.getState().refreshNotes(mockApp);

      // Wait a bit for async operations to start
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Check loading state is set
      expect(useCardExplorerStore.getState().isLoading).toBe(true);
      expect(useCardExplorerStore.getState().error).toBe(null);

      // Resolve the promise
      resolveLoadNotes!([createMockNote("Test", "/test.md")]);
      await refreshPromise;

      // Verify loading state is cleared
      expect(useCardExplorerStore.getState().isLoading).toBe(false);
    });

    it("should handle errors and set error state", async () => {
      const testError = new Error("Failed to load notes");
      const mockErrorInfo = {
        message: "User-friendly error message",
        id: "error-123",
        timestamp: new Date(),
      };

      const { withRetry, handleError } = await import("../utils/errorHandling");
      (withRetry as any).mockRejectedValueOnce(testError);
      (handleError as any).mockReturnValueOnce(mockErrorInfo);

      await useCardExplorerStore.getState().refreshNotes(mockApp);
      const state = useCardExplorerStore.getState();

      // Verify error handling
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe(mockErrorInfo.message);

      // Verify handleError was called correctly
      expect(handleError).toHaveBeenCalledWith(testError, "API", {
        operation: "refreshNotes",
        notesCount: 0,
        hasExistingNotes: false,
      });
    });

    it("should call withRetry with correct parameters", async () => {
      const mockNotes = [createMockNote("Test", "/test.md")];

      const { withRetry } = await import("../utils/errorHandling");
      (withRetry as any).mockResolvedValueOnce(mockNotes);

      // Set up some existing notes to test context
      useCardExplorerStore.getState().setNotes([createMockNote("Existing", "/existing.md")]);

      await useCardExplorerStore.getState().refreshNotes(mockApp);

      // Verify withRetry was called with correct options
      expect(withRetry).toHaveBeenCalledWith(
        expect.any(Function), // loadNotesFromVault function
        {
          maxRetries: 3,
          baseDelay: 1000,
          category: "API",
          context: {
            operation: "loadNotesFromVault",
            notesCount: 1,
          },
        }
      );
    });

    it("should preserve existing state on successful refresh", async () => {
      const newMockNotes = [createMockNote("New Note", "/new.md", "folder1")];

      // Set up initial state
      useCardExplorerStore.getState().togglePin("/new.md");
      useCardExplorerStore.getState().updateFilters({ filename: "New" });
      useCardExplorerStore.getState().updateSortConfig({ key: "title", order: "asc" });

      const beforeState = useCardExplorerStore.getState();

      const { withRetry } = await import("../utils/errorHandling");
      (withRetry as any).mockResolvedValueOnce(newMockNotes);

      await useCardExplorerStore.getState().refreshNotes(mockApp);
      const afterState = useCardExplorerStore.getState();

      // Verify non-note state was preserved
      expect(afterState.pinnedNotes).toEqual(beforeState.pinnedNotes);
      expect(afterState.filters).toEqual(beforeState.filters);
      expect(afterState.sortConfig).toEqual(beforeState.sortConfig);

      // Verify notes were updated
      expect(afterState.notes).toEqual(newMockNotes);
    });

    it("should clear previous error on successful refresh", async () => {
      // Set initial error state
      useCardExplorerStore.getState().setError("Previous error");
      expect(useCardExplorerStore.getState().error).toBe("Previous error");

      const mockNotes = [createMockNote("Test", "/test.md")];

      const { withRetry } = await import("../utils/errorHandling");
      (withRetry as any).mockResolvedValueOnce(mockNotes);

      await useCardExplorerStore.getState().refreshNotes(mockApp);
      const state = useCardExplorerStore.getState();

      // Verify error was cleared
      expect(state.error).toBe(null);
      expect(state.isLoading).toBe(false);
    });

    it("should handle empty notes array", async () => {
      const { withRetry } = await import("../utils/errorHandling");
      (withRetry as any).mockResolvedValueOnce([]);

      await useCardExplorerStore.getState().refreshNotes(mockApp);
      const state = useCardExplorerStore.getState();

      expect(state.notes).toEqual([]);
      expect(state.filteredNotes).toEqual([]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe(null);
    });

    it("should provide correct context for error handling with existing notes", async () => {
      const existingNotes = [
        createMockNote("Existing 1", "/existing1.md"),
        createMockNote("Existing 2", "/existing2.md"),
      ];
      useCardExplorerStore.getState().setNotes(existingNotes);

      const testError = new Error("API Error");
      const mockErrorInfo = { message: "Error occurred" };

      const { withRetry, handleError } = await import("../utils/errorHandling");
      (withRetry as any).mockRejectedValueOnce(testError);
      (handleError as any).mockReturnValueOnce(mockErrorInfo);

      await useCardExplorerStore.getState().refreshNotes(mockApp);

      // Verify handleError was called with context about existing notes
      expect(handleError).toHaveBeenCalledWith(testError, "API", {
        operation: "refreshNotes",
        notesCount: 2,
        hasExistingNotes: true,
      });
    });
  });
});
