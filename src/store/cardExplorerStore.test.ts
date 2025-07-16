import { beforeEach, describe, expect, it } from "vitest";
import type { NoteData } from "../types";
import { cardExplorerSelectors, useCardExplorerStore } from "./cardExplorerStore";

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

describe("CardExplorerStore", () => {
  beforeEach(() => {
    // Reset store before each test
    useCardExplorerStore.getState().reset();
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

    it("should exclude folders", () => {
      const mockNotes = [
        createMockNote("Note 1", "/note1.md", "folder1"),
        createMockNote("Note 2", "/note2.md", "folder2"),
      ];

      useCardExplorerStore.getState().setNotes(mockNotes);
      useCardExplorerStore.getState().updateFilters({ excludeFolders: ["folder1"] });

      const state = useCardExplorerStore.getState();
      expect(state.filteredNotes).toHaveLength(1);
      expect(state.filteredNotes[0].folder).toBe("folder2");
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

    it("should exclude by filename patterns", () => {
      const mockNotes = [
        createMockNote("Draft Note", "/draft.md"),
        createMockNote("Final Note", "/final.md"),
      ];

      useCardExplorerStore.getState().setNotes(mockNotes);
      useCardExplorerStore.getState().updateFilters({ excludeFilenames: ["draft"] });

      const state = useCardExplorerStore.getState();
      expect(state.filteredNotes).toHaveLength(1);
      expect(state.filteredNotes[0].title).toBe("Final Note");
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
      const folders = cardExplorerSelectors.getAvailableFolders(state);

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
      const tags = cardExplorerSelectors.getAvailableTags(state);

      expect(tags).toEqual(["tag1", "tag2", "tag3"]);
    });

    it("should detect active filters", () => {
      const state1 = useCardExplorerStore.getState();
      expect(cardExplorerSelectors.hasActiveFilters(state1)).toBe(false);

      useCardExplorerStore.getState().updateFilters({ filename: "test" });
      const state2 = useCardExplorerStore.getState();
      expect(cardExplorerSelectors.hasActiveFilters(state2)).toBe(true);
    });

    it("should count pinned notes", () => {
      const mockNotes = [
        createMockNote("Note 1", "/note1.md"),
        createMockNote("Note 2", "/note2.md"),
      ];

      useCardExplorerStore.getState().setNotes(mockNotes);
      useCardExplorerStore.getState().togglePin("/note1.md");

      const state = useCardExplorerStore.getState();
      expect(cardExplorerSelectors.getPinnedCount(state)).toBe(1);
    });
  });
});
