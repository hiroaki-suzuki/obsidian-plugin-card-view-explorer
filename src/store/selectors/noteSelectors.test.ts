import { describe, expect, it } from "vitest";
import type { NoteData } from "../../types";
import { type CardExplorerSelectorState, cardExplorerSelectors } from "./noteSelectors";

// Test data builders for better test maintainability
class TestNoteBuilder {
  private note: Partial<NoteData> = {
    file: {} as any,
    preview: "",
    lastModified: new Date(),
    frontmatter: null,
    tags: [],
    folder: "",
  };

  withTitle(title: string): this {
    this.note.title = title;
    this.note.preview = `Preview for ${title}`;
    return this;
  }

  withPath(path: string): this {
    this.note.path = path;
    return this;
  }

  inFolder(folder: string): this {
    this.note.folder = folder;
    return this;
  }

  withTags(...tags: string[]): this {
    this.note.tags = tags;
    return this;
  }

  modifiedAt(date: Date): this {
    this.note.lastModified = date;
    return this;
  }

  build(): NoteData {
    if (!this.note.title || !this.note.path) {
      throw new Error("Note must have title and path");
    }
    return this.note as NoteData;
  }
}

// Factory functions for common test data patterns
const createNote = (title: string, path: string) =>
  new TestNoteBuilder().withTitle(title).withPath(path);

// Common test data sets
const SAMPLE_NOTES = {
  alphabetic: [
    createNote("Alpha Note", "/alpha.md").inFolder("alpha").build(),
    createNote("Beta Note", "/beta.md").inFolder("beta").build(),
    createNote("Gamma Note", "/gamma.md").inFolder("gamma").build(),
  ],
  hierarchical: [
    createNote("Current Project", "/current.md").inFolder("projects/work/current").build(),
    createNote("Old Archive", "/old.md").inFolder("archive/old").build(),
  ],
  tagged: [
    createNote("Tagged Note 1", "/tagged1.md").withTags("alpha", "zebra").build(),
    createNote("Tagged Note 2", "/tagged2.md").withTags("beta", "gamma").build(),
  ],
};

describe("noteSelectors", () => {
  describe("cardExplorerSelectors", () => {
    describe("getAvailableFolders", () => {
      const testCases = [
        {
          name: "should return empty array for empty notes",
          notes: [],
          expected: [],
        },
        {
          name: "should return sorted array of available folders",
          notes: [
            createNote("Note 1", "/note1.md").inFolder("zebra").build(),
            createNote("Note 2", "/note2.md").inFolder("alpha/beta").build(),
            createNote("Note 3", "/note3.md").inFolder("gamma").build(),
          ],
          expected: ["alpha", "alpha/beta", "gamma", "zebra"],
        },
        {
          name: "should include parent folders in sorted order",
          notes: SAMPLE_NOTES.hierarchical,
          expected: [
            "archive",
            "archive/old",
            "projects",
            "projects/work",
            "projects/work/current",
          ],
        },
      ];

      testCases.forEach(({ name, notes, expected }) => {
        it(name, () => {
          const result = cardExplorerSelectors.getAvailableFolders(notes);
          expect(result).toEqual(expected);
        });
      });

      it("should ignore empty folder and not add parents for root-like folders", () => {
        const notes = [
          // empty string folder is ignored entirely
          createNote("Empty Folder", "/empty.md")
            .inFolder("")
            .build(),
          // root-like paths are kept as-is; no parent expansion should occur
          createNote("Root Slash", "/root-slash.md")
            .inFolder("/")
            .build(),
          createNote("Root Backslash", "/root-backslash.md").inFolder("\\").build(),
        ];

        const result = cardExplorerSelectors.getAvailableFolders(notes);
        // Expect only the raw root-like entries, sorted lexicographically
        expect(result).toEqual(["/", "\\"]);
      });
    });

    describe("getAvailableTags", () => {
      const testCases = [
        {
          name: "should return empty array for empty notes",
          notes: [],
          expected: [],
        },
        {
          name: "should return empty array for notes with no tags",
          notes: [
            createNote("Note 1", "/note1.md").build(),
            createNote("Note 2", "/note2.md").build(),
          ],
          expected: [],
        },
        {
          name: "should return sorted array of available tags",
          notes: SAMPLE_NOTES.tagged,
          expected: ["alpha", "beta", "gamma", "zebra"],
        },
      ];

      testCases.forEach(({ name, notes, expected }) => {
        it(name, () => {
          const result = cardExplorerSelectors.getAvailableTags(notes);
          expect(result).toEqual(expected);
        });
      });

      it("should return empty array when a note has undefined/null tags (defensive guard)", () => {
        const base = createNote("No Tags", "/no-tags.md").build();
        // Simulate unexpected undefined/null tags to exercise `n.tags ?? []` path
        const noteWithUndefined = {
          ...base,
          tags: undefined as unknown as string[],
        } as unknown as NoteData;
        const noteWithNull = {
          ...base,
          path: "/no-tags-2.md",
          tags: null as unknown as string[],
        } as unknown as NoteData;
        const result = cardExplorerSelectors.getAvailableTags([noteWithUndefined, noteWithNull]);
        expect(result).toEqual([]);
      });
    });
  });
});
