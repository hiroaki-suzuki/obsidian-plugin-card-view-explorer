import type { CachedMetadata, TFile } from "obsidian";
import { describe, expect, it, vi } from "vitest";
import { extractContentPreview, extractNoteMetadata } from "./metadataExtractor";

// Mock TFile
const createMockTFile = (path: string, basename: string, extension: string = "md"): TFile =>
  ({
    path,
    basename,
    extension,
    stat: { mtime: Date.now(), ctime: Date.now(), size: 1000 },
    parent: null,
    vault: {} as any,
    name: `${basename}.${extension}`,
  }) as TFile;

// Mock CachedMetadata
const createMockCachedMetadata = (
  frontmatter?: Record<string, any>,
  tags?: Array<{ tag: string; position: any }>
): CachedMetadata =>
  ({
    frontmatter: frontmatter || undefined,
    tags: tags || undefined,
  }) as CachedMetadata;

describe("Metadata Extractor", () => {
  describe("extractNoteMetadata", () => {
    const mockFile = createMockTFile("/test.md", "test");

    it("should extract frontmatter and tags successfully", () => {
      const mockCached = createMockCachedMetadata(
        { title: "Test Note", priority: 1, tags: ["frontmatter-tag"] },
        [
          { tag: "#content-tag", position: {} as any },
          { tag: "another-tag", position: {} as any },
        ]
      );

      const mockApp = {
        metadataCache: {
          getFileCache: vi.fn().mockReturnValue(mockCached),
        },
      } as any;

      const result = extractNoteMetadata(mockApp, mockFile);

      expect(result).toEqual({
        frontmatter: { title: "Test Note", priority: 1, tags: ["frontmatter-tag"] },
        tags: ["frontmatter-tag", "content-tag", "another-tag"],
        cached: mockCached,
      });

      expect(mockApp.metadataCache.getFileCache).toHaveBeenCalledWith(mockFile);
    });

    it("should handle frontmatter tags as array", () => {
      const mockCached = createMockCachedMetadata({
        tags: ["tag1", "tag2", "tag3"],
      });

      const mockApp = {
        metadataCache: {
          getFileCache: vi.fn().mockReturnValue(mockCached),
        },
      } as any;

      const result = extractNoteMetadata(mockApp, mockFile);

      expect(result.tags).toEqual(["tag1", "tag2", "tag3"]);
    });

    it("should handle frontmatter tags as single string", () => {
      const mockCached = createMockCachedMetadata({
        tags: "single-tag",
      });

      const mockApp = {
        metadataCache: {
          getFileCache: vi.fn().mockReturnValue(mockCached),
        },
      } as any;

      const result = extractNoteMetadata(mockApp, mockFile);

      expect(result.tags).toEqual(["single-tag"]);
    });

    it("should handle content tags with # prefix", () => {
      const mockCached = createMockCachedMetadata(undefined, [
        { tag: "#with-hash", position: {} as any },
        { tag: "without-hash", position: {} as any },
      ]);

      const mockApp = {
        metadataCache: {
          getFileCache: vi.fn().mockReturnValue(mockCached),
        },
      } as any;

      const result = extractNoteMetadata(mockApp, mockFile);

      expect(result.tags).toEqual(["with-hash", "without-hash"]);
    });

    it("should deduplicate tags from frontmatter and content", () => {
      const mockCached = createMockCachedMetadata(
        { tags: ["duplicate-tag", "unique-frontmatter"] },
        [
          { tag: "#duplicate-tag", position: {} as any },
          { tag: "unique-content", position: {} as any },
        ]
      );

      const mockApp = {
        metadataCache: {
          getFileCache: vi.fn().mockReturnValue(mockCached),
        },
      } as any;

      const result = extractNoteMetadata(mockApp, mockFile);

      expect(result.tags).toEqual(["duplicate-tag", "unique-frontmatter", "unique-content"]);
    });

    it("should handle no metadata available", () => {
      const mockApp = {
        metadataCache: {
          getFileCache: vi.fn().mockReturnValue(null),
        },
      } as any;

      const result = extractNoteMetadata(mockApp, mockFile);

      expect(result).toEqual({
        frontmatter: null,
        tags: [],
        cached: null,
      });
    });

    it("should handle empty frontmatter and no content tags", () => {
      const mockCached = createMockCachedMetadata();

      const mockApp = {
        metadataCache: {
          getFileCache: vi.fn().mockReturnValue(mockCached),
        },
      } as any;

      const result = extractNoteMetadata(mockApp, mockFile);

      expect(result).toEqual({
        frontmatter: null,
        tags: [],
        cached: mockCached,
      });
    });

    it("should handle metadata extraction errors gracefully", () => {
      const mockApp = {
        metadataCache: {
          getFileCache: vi.fn().mockImplementation(() => {
            throw new Error("Metadata cache error");
          }),
        },
      } as any;

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = extractNoteMetadata(mockApp, mockFile);

      expect(result).toEqual({
        frontmatter: null,
        tags: [],
        cached: null,
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to extract metadata for /test.md:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it("should convert non-string frontmatter tags to strings", () => {
      const mockCached = createMockCachedMetadata({
        tags: [123, true, "string-tag"],
      });

      const mockApp = {
        metadataCache: {
          getFileCache: vi.fn().mockReturnValue(mockCached),
        },
      } as any;

      const result = extractNoteMetadata(mockApp, mockFile);

      expect(result.tags).toEqual(["123", "true", "string-tag"]);
    });
  });

  describe("extractContentPreview", () => {
    const mockFile = createMockTFile("/test.md", "test");

    it("should extract content preview successfully", async () => {
      const mockContent = "Line 1\nLine 2\nLine 3\nLine 4\nLine 5";
      const mockApp = {
        vault: {
          cachedRead: vi.fn().mockResolvedValue(mockContent),
        },
      } as any;

      const result = await extractContentPreview(mockApp, mockFile);

      expect(result).toEqual({
        preview: "Line 1\nLine 2\nLine 3",
        success: true,
      });

      expect(mockApp.vault.cachedRead).toHaveBeenCalledWith(mockFile);
    });

    it("should handle content with fewer than max lines", async () => {
      const mockContent = "Line 1\nLine 2";
      const mockApp = {
        vault: {
          cachedRead: vi.fn().mockResolvedValue(mockContent),
        },
      } as any;

      const result = await extractContentPreview(mockApp, mockFile);

      expect(result).toEqual({
        preview: "Line 1\nLine 2",
        success: true,
      });
    });

    it("should handle empty content", async () => {
      const mockApp = {
        vault: {
          cachedRead: vi.fn().mockResolvedValue(""),
        },
      } as any;

      const result = await extractContentPreview(mockApp, mockFile);

      expect(result).toEqual({
        preview: "test", // Falls back to filename
        success: true,
      });
    });

    it("should handle whitespace-only content", async () => {
      const mockContent = "   \n  \n   ";
      const mockApp = {
        vault: {
          cachedRead: vi.fn().mockResolvedValue(mockContent),
        },
      } as any;

      const result = await extractContentPreview(mockApp, mockFile);

      expect(result).toEqual({
        preview: "test", // Falls back to filename after trimming
        success: true,
      });
    });

    it("should handle single line content", async () => {
      const mockContent = "Single line content";
      const mockApp = {
        vault: {
          cachedRead: vi.fn().mockResolvedValue(mockContent),
        },
      } as any;

      const result = await extractContentPreview(mockApp, mockFile);

      expect(result).toEqual({
        preview: "Single line content",
        success: true,
      });
    });

    it("should handle content with extra whitespace", async () => {
      const mockContent = "  Line 1  \n  Line 2  \n  Line 3  \n";
      const mockApp = {
        vault: {
          cachedRead: vi.fn().mockResolvedValue(mockContent),
        },
      } as any;

      const result = await extractContentPreview(mockApp, mockFile);

      expect(result).toEqual({
        preview: "Line 1  \n  Line 2  \n  Line 3",
        success: true,
      });
    });

    it("should handle vault read errors gracefully", async () => {
      const mockApp = {
        vault: {
          cachedRead: vi.fn().mockRejectedValue(new Error("File read error")),
        },
      } as any;

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = await extractContentPreview(mockApp, mockFile);

      expect(result).toEqual({
        preview: "test", // Falls back to filename
        success: false,
        error: "File read error",
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to extract content preview for /test.md:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it("should handle non-Error exceptions", async () => {
      const mockApp = {
        vault: {
          cachedRead: vi.fn().mockRejectedValue("String error"),
        },
      } as any;

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = await extractContentPreview(mockApp, mockFile);

      expect(result).toEqual({
        preview: "test",
        success: false,
        error: "Unknown error",
      });

      consoleSpy.mockRestore();
    });

    it("should handle content with mixed line endings", async () => {
      const mockContent = "Line 1\r\nLine 2\nLine 3\r\nLine 4";
      const mockApp = {
        vault: {
          cachedRead: vi.fn().mockResolvedValue(mockContent),
        },
      } as any;

      const result = await extractContentPreview(mockApp, mockFile);

      expect(result).toEqual({
        preview: "Line 1\r\nLine 2\nLine 3",
        success: true,
      });
    });

    it("should exclude frontmatter from preview", async () => {
      const mockContent = `---
title: My Note
tags: [test, example]
date: 2023-01-01
---

This is the actual content
This is the second line
More content here`;

      const mockApp = {
        vault: {
          cachedRead: vi.fn().mockResolvedValue(mockContent),
        },
      } as any;

      const result = await extractContentPreview(mockApp, mockFile);

      expect(result).toEqual({
        preview: "This is the actual content\nThis is the second line",
        success: true,
      });
    });

    it("should handle content without frontmatter", async () => {
      const mockContent = "No frontmatter here\nJust regular content\nMore lines";

      const mockApp = {
        vault: {
          cachedRead: vi.fn().mockResolvedValue(mockContent),
        },
      } as any;

      const result = await extractContentPreview(mockApp, mockFile);

      expect(result).toEqual({
        preview: mockContent,
        success: true,
      });
    });

    it("should handle incomplete frontmatter (no closing delimiter)", async () => {
      const mockContent = `---
title: Incomplete frontmatter
This content should be returned as-is
Since there's no closing delimiter`;

      const mockApp = {
        vault: {
          cachedRead: vi.fn().mockResolvedValue(mockContent),
        },
      } as any;

      const result = await extractContentPreview(mockApp, mockFile);

      expect(result).toEqual({
        preview: "---\ntitle: Incomplete frontmatter\nThis content should be returned as-is",
        success: true,
      });
    });

    it("should handle empty content after frontmatter removal", async () => {
      const mockContent = `---
title: Empty content
---

`;

      const mockApp = {
        vault: {
          cachedRead: vi.fn().mockResolvedValue(mockContent),
        },
      } as any;

      const result = await extractContentPreview(mockApp, mockFile);

      expect(result).toEqual({
        preview: "test", // Falls back to filename when content is empty after frontmatter removal
        success: true,
      });
    });
  });
});
