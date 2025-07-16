import { describe, expect, it } from "vitest";
import type { FilterState, NoteData } from "../../types";
import {
  type CardExplorerSelectorState,
  cardExplorerSelectors,
  collectFoldersFromNotes,
  collectTagsFromNotes,
} from "./noteSelectors";

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

const createMockState = (
  notes: NoteData[] = [],
  filteredNotes: NoteData[] = [],
  pinnedNotes: Set<string> = new Set(),
  filters: FilterState = {
    folders: [],
    tags: [],
    filename: "",
    dateRange: null,
    excludeFolders: [],
    excludeTags: [],
    excludeFilenames: [],
  }
): CardExplorerSelectorState => ({
  notes,
  filteredNotes,
  pinnedNotes,
  filters,
});

describe("Note Selectors", () => {
  describe("collectFoldersFromNotes", () => {
    it("should collect unique folder paths", () => {
      const notes = [
        createMockNote("Note 1", "/note1.md", "folder1"),
        createMockNote("Note 2", "/note2.md", "folder2"),
        createMockNote("Note 3", "/note3.md", "folder1"),
        createMockNote("Note 4", "/note4.md", "folder3/subfolder"),
      ];

      const result = collectFoldersFromNotes(notes);

      expect(result).toEqual(new Set(["folder1", "folder2", "folder3", "folder3/subfolder"]));
    });

    it("should include parent folders for hierarchical paths", () => {
      const notes = [
        createMockNote("Note 1", "/note1.md", "projects/work/notes"),
        createMockNote("Note 2", "/note2.md", "archive/2024/january"),
      ];

      const result = collectFoldersFromNotes(notes);

      expect(result).toEqual(
        new Set([
          "projects/work/notes",
          "projects",
          "projects/work",
          "archive/2024/january",
          "archive",
          "archive/2024",
        ])
      );
    });

    it("should handle notes with empty folders", () => {
      const notes = [
        createMockNote("Note 1", "/note1.md", ""),
        createMockNote("Note 2", "/note2.md", "folder1"),
        createMockNote("Note 3", "/note3.md", ""),
      ];

      const result = collectFoldersFromNotes(notes);

      expect(result).toEqual(new Set(["folder1"]));
    });

    it("should handle empty notes array", () => {
      const result = collectFoldersFromNotes([]);
      expect(result).toEqual(new Set());
    });

    it("should handle complex nested folder structures", () => {
      const notes = [
        createMockNote("Note 1", "/note1.md", "a/b/c/d"),
        createMockNote("Note 2", "/note2.md", "a/b/e"),
        createMockNote("Note 3", "/note3.md", "x/y"),
      ];

      const result = collectFoldersFromNotes(notes);

      expect(result).toEqual(new Set(["a/b/c/d", "a", "a/b", "a/b/c", "a/b/e", "x/y", "x"]));
    });
  });

  describe("collectTagsFromNotes", () => {
    it("should collect unique tags from all notes", () => {
      const notes = [
        createMockNote("Note 1", "/note1.md", "", ["tag1", "tag2"]),
        createMockNote("Note 2", "/note2.md", "", ["tag2", "tag3"]),
        createMockNote("Note 3", "/note3.md", "", ["tag1", "tag4"]),
      ];

      const result = collectTagsFromNotes(notes);

      expect(result).toEqual(new Set(["tag1", "tag2", "tag3", "tag4"]));
    });

    it("should handle notes with no tags", () => {
      const notes = [
        createMockNote("Note 1", "/note1.md", "", []),
        createMockNote("Note 2", "/note2.md", "", ["tag1"]),
        createMockNote("Note 3", "/note3.md", "", []),
      ];

      const result = collectTagsFromNotes(notes);

      expect(result).toEqual(new Set(["tag1"]));
    });

    it("should handle empty notes array", () => {
      const result = collectTagsFromNotes([]);
      expect(result).toEqual(new Set());
    });

    it("should handle duplicate tags within same note", () => {
      const notes = [createMockNote("Note 1", "/note1.md", "", ["tag1", "tag1", "tag2"])];

      const result = collectTagsFromNotes(notes);

      expect(result).toEqual(new Set(["tag1", "tag2"]));
    });
  });

  describe("cardExplorerSelectors", () => {
    describe("getAvailableFolders", () => {
      it("should return sorted array of available folders", () => {
        const notes = [
          createMockNote("Note 1", "/note1.md", "zebra"),
          createMockNote("Note 2", "/note2.md", "alpha/beta"),
          createMockNote("Note 3", "/note3.md", "gamma"),
        ];

        const state = createMockState(notes);
        const result = cardExplorerSelectors.getAvailableFolders(state);

        expect(result).toEqual(["alpha", "alpha/beta", "gamma", "zebra"]);
      });

      it("should handle empty notes", () => {
        const state = createMockState([]);
        const result = cardExplorerSelectors.getAvailableFolders(state);

        expect(result).toEqual([]);
      });

      it("should include parent folders in sorted order", () => {
        const notes = [
          createMockNote("Note 1", "/note1.md", "projects/work/current"),
          createMockNote("Note 2", "/note2.md", "archive/old"),
        ];

        const state = createMockState(notes);
        const result = cardExplorerSelectors.getAvailableFolders(state);

        expect(result).toEqual([
          "archive",
          "archive/old",
          "projects",
          "projects/work",
          "projects/work/current",
        ]);
      });
    });

    describe("getAvailableTags", () => {
      it("should return sorted array of available tags", () => {
        const notes = [
          createMockNote("Note 1", "/note1.md", "", ["zebra", "alpha"]),
          createMockNote("Note 2", "/note2.md", "", ["beta", "gamma"]),
        ];

        const state = createMockState(notes);
        const result = cardExplorerSelectors.getAvailableTags(state);

        expect(result).toEqual(["alpha", "beta", "gamma", "zebra"]);
      });

      it("should handle empty notes", () => {
        const state = createMockState([]);
        const result = cardExplorerSelectors.getAvailableTags(state);

        expect(result).toEqual([]);
      });

      it("should handle notes with no tags", () => {
        const notes = [
          createMockNote("Note 1", "/note1.md", "", []),
          createMockNote("Note 2", "/note2.md", "", []),
        ];

        const state = createMockState(notes);
        const result = cardExplorerSelectors.getAvailableTags(state);

        expect(result).toEqual([]);
      });
    });

    describe("getPinnedCount", () => {
      it("should return count of pinned notes", () => {
        const pinnedNotes = new Set(["/note1.md", "/note3.md", "/note5.md"]);
        const state = createMockState([], [], pinnedNotes);
        const result = cardExplorerSelectors.getPinnedCount(state);

        expect(result).toBe(3);
      });

      it("should return 0 for no pinned notes", () => {
        const state = createMockState([], [], new Set());
        const result = cardExplorerSelectors.getPinnedCount(state);

        expect(result).toBe(0);
      });
    });

    describe("getFilteredCount", () => {
      it("should return count of filtered notes", () => {
        const filteredNotes = [
          createMockNote("Note 1", "/note1.md"),
          createMockNote("Note 2", "/note2.md"),
        ];

        const state = createMockState([], filteredNotes);
        const result = cardExplorerSelectors.getFilteredCount(state);

        expect(result).toBe(2);
      });

      it("should return 0 for no filtered notes", () => {
        const state = createMockState([], []);
        const result = cardExplorerSelectors.getFilteredCount(state);

        expect(result).toBe(0);
      });
    });

    describe("hasActiveFilters", () => {
      it("should return false for default filters", () => {
        const filters: FilterState = {
          folders: [],
          tags: [],
          filename: "",
          dateRange: null,
          excludeFolders: [],
          excludeTags: [],
          excludeFilenames: [],
        };

        const state = createMockState([], [], new Set(), filters);
        const result = cardExplorerSelectors.hasActiveFilters(state);

        expect(result).toBe(false);
      });

      it("should return true when folders filter is active", () => {
        const filters: FilterState = {
          folders: ["folder1"],
          tags: [],
          filename: "",
          dateRange: null,
          excludeFolders: [],
          excludeTags: [],
          excludeFilenames: [],
        };

        const state = createMockState([], [], new Set(), filters);
        const result = cardExplorerSelectors.hasActiveFilters(state);

        expect(result).toBe(true);
      });

      it("should return true when tags filter is active", () => {
        const filters: FilterState = {
          folders: [],
          tags: ["tag1"],
          filename: "",
          dateRange: null,
          excludeFolders: [],
          excludeTags: [],
          excludeFilenames: [],
        };

        const state = createMockState([], [], new Set(), filters);
        const result = cardExplorerSelectors.hasActiveFilters(state);

        expect(result).toBe(true);
      });

      it("should return true when filename filter is active", () => {
        const filters: FilterState = {
          folders: [],
          tags: [],
          filename: "search term",
          dateRange: null,
          excludeFolders: [],
          excludeTags: [],
          excludeFilenames: [],
        };

        const state = createMockState([], [], new Set(), filters);
        const result = cardExplorerSelectors.hasActiveFilters(state);

        expect(result).toBe(true);
      });

      it("should return false when filename is only whitespace", () => {
        const filters: FilterState = {
          folders: [],
          tags: [],
          filename: "   ",
          dateRange: null,
          excludeFolders: [],
          excludeTags: [],
          excludeFilenames: [],
        };

        const state = createMockState([], [], new Set(), filters);
        const result = cardExplorerSelectors.hasActiveFilters(state);

        expect(result).toBe(false);
      });

      it("should return true when date range filter is active", () => {
        const filters: FilterState = {
          folders: [],
          tags: [],
          filename: "",
          dateRange: { type: "within", value: new Date() },
          excludeFolders: [],
          excludeTags: [],
          excludeFilenames: [],
        };

        const state = createMockState([], [], new Set(), filters);
        const result = cardExplorerSelectors.hasActiveFilters(state);

        expect(result).toBe(true);
      });

      it("should return true when exclude filters are active", () => {
        const filters1: FilterState = {
          folders: [],
          tags: [],
          filename: "",
          dateRange: null,
          excludeFolders: ["archive"],
          excludeTags: [],
          excludeFilenames: [],
        };

        const filters2: FilterState = {
          folders: [],
          tags: [],
          filename: "",
          dateRange: null,
          excludeFolders: [],
          excludeTags: ["draft"],
          excludeFilenames: [],
        };

        const filters3: FilterState = {
          folders: [],
          tags: [],
          filename: "",
          dateRange: null,
          excludeFolders: [],
          excludeTags: [],
          excludeFilenames: ["temp"],
        };

        const state1 = createMockState([], [], new Set(), filters1);
        const state2 = createMockState([], [], new Set(), filters2);
        const state3 = createMockState([], [], new Set(), filters3);

        expect(cardExplorerSelectors.hasActiveFilters(state1)).toBe(true);
        expect(cardExplorerSelectors.hasActiveFilters(state2)).toBe(true);
        expect(cardExplorerSelectors.hasActiveFilters(state3)).toBe(true);
      });

      it("should return true when multiple filters are active", () => {
        const filters: FilterState = {
          folders: ["folder1"],
          tags: ["tag1"],
          filename: "search",
          dateRange: { type: "after", value: new Date() },
          excludeFolders: ["archive"],
          excludeTags: ["draft"],
          excludeFilenames: ["temp"],
        };

        const state = createMockState([], [], new Set(), filters);
        const result = cardExplorerSelectors.hasActiveFilters(state);

        expect(result).toBe(true);
      });
    });
  });
});
