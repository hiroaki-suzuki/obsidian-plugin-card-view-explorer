import type { App, TFile, Vault } from "obsidian";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadNotesFromVault } from "./noteLoader";

/**
 * Test constants for consistent timestamp values across tests.
 * Using fixed timestamps ensures deterministic test behavior.
 */
const TEST_TIMESTAMPS = {
  JANUARY_2024: 1704067200000,
  JANUARY_2024_NEXT_DAY: 1704153600000,
  NOW: 1704067200000, // Use fixed timestamp for deterministic tests
} as const;

/**
 * Utility function to suppress console.error output during tests that intentionally trigger errors.
 * This prevents test output pollution while still allowing the error handling logic to be tested.
 *
 * @param testFn - The test function that may produce console errors
 * @returns Wrapped test function with error suppression
 */
const withSuppressedConsoleErrors = (testFn: () => Promise<void> | void) => {
  return async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await testFn();
    } finally {
      consoleSpy.mockRestore();
    }
  };
};

/**
 * Test content samples for various scenarios including frontmatter handling,
 * line limits, and edge cases like empty content.
 */
const TEST_CONTENT = {
  SIMPLE: "Content",
  MULTILINE: "Content of note 1\nWith multiple lines\nAnd more content",
  FIVE_LINES: "Line 1\nLine 2\nLine 3\nLine 4\nLine 5",
  WITH_FRONTMATTER: `---
title: My Note
tags: [test, example]
date: 2023-01-01
---

This is the actual content
This is the second line
More content here`,
  INCOMPLETE_FRONTMATTER: `---
title: Incomplete frontmatter
This content should be returned as-is
Since there's no closing delimiter`,
  EMPTY: "",
} as const;

/**
 * Builder pattern for creating mock TFile objects with fluent API.
 * Provides a clean way to construct test files with various properties.
 */
class MockTFileBuilder {
  private path: string = "/test.md";
  private basename: string = "test";
  private extension: string = "md";
  private mtime: number = TEST_TIMESTAMPS.NOW;
  private parentPath?: string;

  /**
   * Sets the file path for the mock TFile.
   */
  withPath(path: string): this {
    this.path = path;
    return this;
  }

  /**
   * Sets the basename (filename without extension) for the mock TFile.
   */
  withBasename(basename: string): this {
    this.basename = basename;
    return this;
  }

  /**
   * Sets the file extension for the mock TFile.
   */
  withExtension(extension: string): this {
    this.extension = extension;
    return this;
  }

  /**
   * Sets the modification time for the mock TFile.
   */
  withModifiedTime(mtime: number): this {
    this.mtime = mtime;
    return this;
  }

  /**
   * Sets the parent folder path for the mock TFile.
   */
  withParent(parentPath: string): this {
    this.parentPath = parentPath;
    return this;
  }

  /**
   * Builds the mock TFile object with all configured properties.
   * Creates a minimal TFile structure suitable for testing.
   */
  build(): TFile {
    return {
      path: this.path,
      basename: this.basename,
      extension: this.extension,
      stat: { mtime: this.mtime, ctime: this.mtime, size: 1000 },
      parent: this.parentPath ? { path: this.parentPath } : null,
      vault: {} as Vault,
      name: `${this.basename}.${this.extension}`,
    } as any;
  }
}

/**
 * Convenience function to create a mock TFile with common parameters.
 * Wraps the MockTFileBuilder for simpler test setup.
 *
 * @param path - File path
 * @param basename - Filename without extension
 * @param extension - File extension
 * @param mtime - Modification time (defaults to current time)
 * @param parentPath - Optional parent folder path
 * @returns Mock File object
 */
const createMockFile = (
  path: string,
  basename: string,
  extension: string,
  mtime: number = TEST_TIMESTAMPS.NOW,
  parentPath?: string
): TFile => {
  const builder = new MockTFileBuilder()
    .withPath(path)
    .withBasename(basename)
    .withExtension(extension)
    .withModifiedTime(mtime);

  if (parentPath) {
    builder.withParent(parentPath);
  }

  return builder.build();
};

/**
 * Builder pattern for creating mock Obsidian App objects.
 * Provides fluent API for configuring vault behavior, metadata cache, and file operations.
 */
class MockAppBuilder {
  private files: TFile[] = [];
  private metadataCache: any = { getFileCache: vi.fn() };
  private vaultRead: any = vi.fn();

  /**
   * Sets the files that the vault should return.
   */
  withFiles(files: TFile[]): this {
    this.files = files;
    return this;
  }

  /**
   * Sets a custom metadata cache implementation.
   */
  withMetadataCache(cache: any): this {
    this.metadataCache = cache;
    return this;
  }

  /**
   * Sets a custom vault read function.
   */
  withVaultRead(readFn: any): this {
    this.vaultRead = readFn;
    return this;
  }

  /**
   * Configures the metadata cache to return empty metadata for all files.
   * Useful for testing basic file processing without frontmatter/tags.
   */
  withEmptyMetadata(): this {
    this.metadataCache = {
      getFileCache: vi.fn().mockReturnValue({
        frontmatter: null,
        tags: undefined,
      }),
    };
    return this;
  }

  /**
   * Configures the vault to return the same content for all file reads.
   */
  withContentRead(content: string): this {
    this.vaultRead = vi.fn().mockResolvedValue(content);
    return this;
  }

  /**
   * Configures the vault to throw an error when accessing files.
   * Used for testing error handling scenarios.
   */
  withFailingVault(error: any = new Error("Vault access failed")): this {
    return this.withFiles([]).withCustomVault({
      getMarkdownFiles: vi.fn().mockImplementation(() => {
        throw error;
      }),
    });
  }

  private withCustomVault(vault: any): this {
    this.customVault = vault;
    return this;
  }

  private customVault?: any;

  /**
   * Builds the mock App object with configured vault and metadata cache.
   * Creates minimal App structure required for note loading tests.
   */
  build(): App {
    const vault = this.customVault || {
      getMarkdownFiles: vi.fn().mockReturnValue(this.files),
      cachedRead: this.vaultRead,
    };

    return {
      vault,
      metadataCache: this.metadataCache,
    } as any;
  }
}

/**
 * Factory functions for creating common test file scenarios.
 * Provides reusable file configurations for different test cases.
 */
const createMarkdownFiles = () => ({
  note1: () => createMockFile("/note1.md", "note1", "md"),
  note2: () => createMockFile("/note2.md", "note2", "md"),
  noteInFolder: () =>
    createMockFile("/folder/note1.md", "note1", "md", TEST_TIMESTAMPS.JANUARY_2024, "folder"),
  rootNote: () => createMockFile("/note2.md", "note2", "md", TEST_TIMESTAMPS.JANUARY_2024_NEXT_DAY),
});

/**
 * Factory functions for creating non-markdown files to test file filtering.
 */
const createNonMarkdownFiles = () => ({
  image: () => createMockFile("/image.png", "image", "png") as any,
  textFile: () => createMockFile("/document.txt", "document", "txt") as any,
});

/**
 * Factory functions for creating various metadata scenarios.
 * Tests different combinations of frontmatter and tag configurations
 * to ensure robust metadata extraction.
 */
const createMetadataScenarios = () => ({
  withFrontmatterAndTags: () => ({
    frontmatter: { title: "Note 1", priority: 1 },
    tags: [
      { tag: "#tag1", position: {} },
      { tag: "tag2", position: {} },
    ],
  }),
  withTagsOnly: () => ({
    frontmatter: null,
    tags: [{ tag: "tag3", position: {} }],
  }),
  withArrayTags: () => ({
    frontmatter: { tags: ["tag1", "tag2", "tag3"] },
  }),
  withStringTag: () => ({
    frontmatter: { tags: "single-tag" },
  }),
  withMixedTypeTags: () => ({
    frontmatter: { tags: [123, true, "string-tag"] },
  }),
  withDuplicateTags: () => ({
    frontmatter: { tags: ["duplicate-tag", "unique-frontmatter"] },
    tags: [
      { tag: "#duplicate-tag", position: {} },
      { tag: "unique-content", position: {} },
    ],
  }),
  empty: () => ({ frontmatter: null, tags: undefined }),
});

describe("noteLoader", () => {
  describe("loadNotesFromVault", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should filter out non-markdown files and process only markdown files", async () => {
      const markdownFiles = createMarkdownFiles();
      const nonMarkdownFiles = createNonMarkdownFiles();
      // Mix markdown and non-markdown files to test filtering
      const mockFiles = [
        markdownFiles.note1(),
        nonMarkdownFiles.image(),
        markdownFiles.note2(),
        nonMarkdownFiles.textFile(),
      ];

      const mockApp = new MockAppBuilder()
        .withFiles(mockFiles)
        .withEmptyMetadata()
        .withContentRead(TEST_CONTENT.SIMPLE)
        .build();

      const result = await loadNotesFromVault(mockApp);

      // Should only process the 2 markdown files
      expect(result).toHaveLength(2);
      expect(result.every((note) => note.file.extension === "md")).toBe(true);
      expect(result[0].title).toBe("note1");
      expect(result[1].title).toBe("note2");
      // Verify metadata and content were only fetched for markdown files
      expect(mockApp.metadataCache.getFileCache).toHaveBeenCalledTimes(2);
      expect(mockApp.vault.cachedRead).toHaveBeenCalledTimes(2);
    });

    it("should transform files correctly with metadata and folder paths", async () => {
      const markdownFiles = createMarkdownFiles();
      const mockFiles = [markdownFiles.noteInFolder(), markdownFiles.rootNote()];
      const metadataScenarios = createMetadataScenarios();

      const mockApp = new MockAppBuilder()
        .withFiles(mockFiles)
        .withMetadataCache({
          getFileCache: vi
            .fn()
            .mockReturnValueOnce(metadataScenarios.withFrontmatterAndTags())
            .mockReturnValueOnce(metadataScenarios.withTagsOnly()),
        })
        .withVaultRead(
          vi
            .fn()
            .mockResolvedValueOnce(TEST_CONTENT.MULTILINE)
            .mockResolvedValueOnce("Root note content")
        )
        .build();

      const result = await loadNotesFromVault(mockApp);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        file: mockFiles[0],
        title: "note1",
        path: "/folder/note1.md",
        preview: TEST_CONTENT.MULTILINE,
        lastModified: new Date(TEST_TIMESTAMPS.JANUARY_2024),
        frontmatter: { title: "Note 1", priority: 1 },
        tags: ["tag1", "tag2"],
        folder: "folder",
      });
      expect(result[1]).toMatchObject({
        file: mockFiles[1],
        title: "note2",
        path: "/note2.md",
        preview: "Root note content",
        lastModified: new Date(TEST_TIMESTAMPS.JANUARY_2024_NEXT_DAY),
        frontmatter: null,
        tags: ["tag3"],
        folder: "",
      });
    });

    it("should handle empty vault", async () => {
      const mockApp = new MockAppBuilder().withFiles([]).build();
      const result = await loadNotesFromVault(mockApp);

      expect(result).toHaveLength(0);
      expect(mockApp.vault.getMarkdownFiles).toHaveBeenCalledOnce();
    });

    describe("tag handling", () => {
      // Test cases covering various tag formats and edge cases
      // Tests the tag normalization and deduplication logic
      const tagTestCases = [
        {
          name: "array tags",
          metadata: { frontmatter: { tags: ["tag1", "tag2", "tag3"] } },
          expectedTags: ["tag1", "tag2", "tag3"],
        },
        {
          name: "string tag",
          metadata: { frontmatter: { tags: "single-tag" } },
          expectedTags: ["single-tag"],
        },
        {
          name: "mixed type tags converted to strings",
          metadata: { frontmatter: { tags: [123, true, "string-tag"] } },
          expectedTags: ["123", "true", "string-tag"],
        },
        {
          name: "duplicate tags from frontmatter and content",
          metadata: {
            frontmatter: { tags: ["duplicate-tag", "unique-frontmatter"] },
            tags: [
              { tag: "#duplicate-tag", position: {} },
              { tag: "unique-content", position: {} },
            ],
          },
          expectedTags: ["duplicate-tag", "unique-frontmatter", "unique-content"],
        },
      ];

      tagTestCases.forEach(({ name, metadata, expectedTags }) => {
        it(`should handle ${name}`, async () => {
          const mockFile = createMockFile("/test.md", "test", "md");
          const mockApp = new MockAppBuilder()
            .withFiles([mockFile])
            .withMetadataCache({ getFileCache: vi.fn().mockReturnValue(metadata) })
            .withContentRead(TEST_CONTENT.SIMPLE)
            .build();

          const result = await loadNotesFromVault(mockApp);

          expect(result).toHaveLength(1);
          expect(result[0].tags).toEqual(expectedTags);
        });
      });
    });

    it("should extract frontmatter and tags from notes", async () => {
      const mockFile = createMockFile("/test.md", "test", "md");
      const mockApp = new MockAppBuilder()
        .withFiles([mockFile])
        .withMetadataCache({
          getFileCache: vi.fn().mockReturnValue({
            frontmatter: { title: "Test Note", priority: 1, tags: ["frontmatter-tag"] },
            tags: [
              { tag: "#content-tag", position: {} },
              { tag: "another-tag", position: {} },
            ],
          }),
        })
        .withContentRead("Test content")
        .build();

      const result = await loadNotesFromVault(mockApp);

      expect(result).toHaveLength(1);
      expect(result[0].frontmatter).toEqual({
        title: "Test Note",
        priority: 1,
        tags: ["frontmatter-tag"],
      });
      expect(result[0].tags).toEqual(["frontmatter-tag", "content-tag", "another-tag"]);
    });

    describe("content preview extraction", () => {
      // Test cases for preview generation logic including frontmatter handling
      // and line limit enforcement (max 3 lines for preview)
      const previewTestCases = [
        {
          name: "max lines limit",
          content: TEST_CONTENT.FIVE_LINES,
          expectedPreview: "Line 1\nLine 2\nLine 3", // Should truncate to 3 lines
        },
        {
          name: "empty content fallback to filename",
          content: TEST_CONTENT.EMPTY,
          expectedPreview: "test", // Falls back to basename when content is empty
        },
        {
          name: "frontmatter exclusion",
          content: TEST_CONTENT.WITH_FRONTMATTER,
          expectedPreview: "This is the actual content\nThis is the second line\nMore content here",
        },
        {
          name: "incomplete frontmatter",
          content: TEST_CONTENT.INCOMPLETE_FRONTMATTER,
          expectedPreview:
            "---\ntitle: Incomplete frontmatter\nThis content should be returned as-is",
        },
      ];

      previewTestCases.forEach(({ name, content, expectedPreview }) => {
        it(`should handle ${name}`, async () => {
          const mockFile = createMockFile("/test.md", "test", "md");
          const mockApp = new MockAppBuilder()
            .withFiles([mockFile])
            .withEmptyMetadata()
            .withContentRead(content)
            .build();

          const result = await loadNotesFromVault(mockApp);

          expect(result).toHaveLength(1);
          expect(result[0].preview).toBe(expectedPreview);
        });
      });
    });

    describe("error handling", () => {
      // Test cases for vault-level errors that should propagate up
      // These are critical failures that prevent any note loading
      const errorTestCases = [
        {
          name: "vault access failure with Error object",
          error: new Error("Vault access failed"),
        },
        {
          name: "unknown error types",
          error: "String error", // Non-Error objects should still be handled
        },
      ];

      errorTestCases.forEach(({ name, error }) => {
        it(
          `should handle ${name}`,
          withSuppressedConsoleErrors(async () => {
            const mockApp = new MockAppBuilder().withFailingVault(error).build();
            await expect(loadNotesFromVault(mockApp)).rejects.toThrow();
          })
        );
      });
    });

    describe("individual file processing failures", () => {
      it(
        "should handle graceful failure with Error objects",
        withSuppressedConsoleErrors(async () => {
          const mockFiles = [
            createMockFile("/note1.md", "note1", "md"),
            createMockFile("/note2.md", "note2", "md"),
            createMockFile("/note3.md", "note3", "md"),
          ];

          // Simulate failure on the second file only
          const mockApp = new MockAppBuilder()
            .withFiles(mockFiles)
            .withEmptyMetadata()
            .withVaultRead(
              vi
                .fn()
                .mockResolvedValueOnce("Content 1")
                .mockRejectedValueOnce(new Error("Failed to process note2"))
                .mockResolvedValueOnce("Content 3")
            )
            .build();

          const result = await loadNotesFromVault(mockApp);

          // Should still return all files, with fallback for the failed one
          expect(result).toHaveLength(3);
          expect(result[0].title).toBe("note1");
          expect(result[0].preview).toBe("Content 1");
          expect(result[1].title).toBe("note2");
          expect(result[1].preview).toBe("note2"); // Fallback to filename when content read fails
          expect(result[2].title).toBe("note3");
          expect(result[2].preview).toBe("Content 3");
        })
      );

      it(
        "should handle unknown error types in file processing",
        withSuppressedConsoleErrors(async () => {
          const mockFiles = [
            createMockFile("/note1.md", "note1", "md"),
            createMockFile("/note2.md", "note2", "md"),
          ];

          const mockApp = new MockAppBuilder()
            .withFiles(mockFiles)
            .withEmptyMetadata()
            .withVaultRead(
              vi
                .fn()
                .mockResolvedValueOnce("Content 1")
                .mockRejectedValueOnce("String error") // Non-Error object to test error handling robustness
            )
            .build();

          const result = await loadNotesFromVault(mockApp);

          expect(result).toHaveLength(2);
          expect(result[0].title).toBe("note1");
          expect(result[0].preview).toBe("Content 1");
          expect(result[1].title).toBe("note2");
          expect(result[1].preview).toBe("note2"); // Should still fallback gracefully
        })
      );
    });
  });
});
