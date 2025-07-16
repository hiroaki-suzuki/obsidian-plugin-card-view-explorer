import type { App, TFile } from "obsidian";
import { describe, expect, it, vi } from "vitest";
import * as metadataExtractor from "./metadataExtractor";
import { isMarkdownFile, loadNotesFromVault, transformFileToNoteData } from "./noteLoader";

// Mock the metadata extractor module
vi.mock("./metadataExtractor", () => ({
  extractNoteMetadata: vi.fn(),
  extractContentPreview: vi.fn(),
}));

// Mock TFile
const createMockTFile = (
  path: string,
  basename: string,
  extension: string,
  mtime: number = Date.now(),
  parentPath?: string
): TFile =>
  ({
    path,
    basename,
    extension,
    stat: { mtime, ctime: mtime, size: 1000 },
    parent: parentPath ? { path: parentPath } : null,
    vault: {} as any,
    name: `${basename}.${extension}`,
  }) as TFile;

// Mock App
const createMockApp = (files: TFile[] = []): App =>
  ({
    vault: {
      getMarkdownFiles: vi.fn().mockReturnValue(files),
    },
  }) as any;

describe("Note Loader", () => {
  describe("isMarkdownFile", () => {
    it("should return true for markdown files", () => {
      const mdFile = createMockTFile("/test.md", "test", "md");
      expect(isMarkdownFile(mdFile)).toBe(true);
    });

    it("should return false for non-markdown files", () => {
      const txtFile = createMockTFile("/test.txt", "test", "txt");
      const pdfFile = createMockTFile("/test.pdf", "test", "pdf");
      const jsFile = createMockTFile("/test.js", "test", "js");

      expect(isMarkdownFile(txtFile)).toBe(false);
      expect(isMarkdownFile(pdfFile)).toBe(false);
      expect(isMarkdownFile(jsFile)).toBe(false);
    });

    it("should handle empty extension", () => {
      const noExtFile = createMockTFile("/test", "test", "");
      expect(isMarkdownFile(noExtFile)).toBe(false);
    });
  });

  describe("transformFileToNoteData", () => {
    const mockApp = createMockApp();
    const mockFile = createMockTFile("/folder/test.md", "test", "md", 1704067200000, "folder");

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should transform TFile to NoteData successfully", async () => {
      // Mock the metadata extractor functions
      vi.mocked(metadataExtractor.extractNoteMetadata).mockReturnValue({
        frontmatter: { title: "Test Note", priority: 1 },
        tags: ["tag1", "tag2"],
        cached: null,
      });

      vi.mocked(metadataExtractor.extractContentPreview).mockResolvedValue({
        preview: "This is a test note\nWith some content\nAnd more lines",
        success: true,
      });

      const result = await transformFileToNoteData(mockApp, mockFile);

      expect(result).toEqual({
        file: mockFile,
        title: "test",
        path: "/folder/test.md",
        preview: "This is a test note\nWith some content\nAnd more lines",
        lastModified: new Date(1704067200000),
        frontmatter: { title: "Test Note", priority: 1 },
        tags: ["tag1", "tag2"],
        folder: "folder",
      });

      expect(metadataExtractor.extractNoteMetadata).toHaveBeenCalledWith(mockApp, mockFile);
      expect(metadataExtractor.extractContentPreview).toHaveBeenCalledWith(mockApp, mockFile);
    });

    it("should handle file in root folder", async () => {
      const rootFile = createMockTFile("/test.md", "test", "md", 1704067200000);

      vi.mocked(metadataExtractor.extractNoteMetadata).mockReturnValue({
        frontmatter: null,
        tags: [],
        cached: null,
      });

      vi.mocked(metadataExtractor.extractContentPreview).mockResolvedValue({
        preview: "Root file content",
        success: true,
      });

      const result = await transformFileToNoteData(mockApp, rootFile);

      expect(result.folder).toBe("");
      expect(result.path).toBe("/test.md");
    });

    it("should handle metadata extraction failure", async () => {
      vi.mocked(metadataExtractor.extractNoteMetadata).mockReturnValue({
        frontmatter: null,
        tags: [],
        cached: null,
      });

      vi.mocked(metadataExtractor.extractContentPreview).mockResolvedValue({
        preview: "test", // Fallback to filename
        success: false,
        error: "Failed to read content",
      });

      const result = await transformFileToNoteData(mockApp, mockFile);

      expect(result.frontmatter).toBe(null);
      expect(result.tags).toEqual([]);
      expect(result.preview).toBe("test");
    });

    it("should handle content preview failure", async () => {
      vi.mocked(metadataExtractor.extractNoteMetadata).mockReturnValue({
        frontmatter: { title: "Test" },
        tags: ["tag1"],
        cached: null,
      });

      vi.mocked(metadataExtractor.extractContentPreview).mockResolvedValue({
        preview: "test", // Fallback to filename
        success: false,
        error: "Content read failed",
      });

      const result = await transformFileToNoteData(mockApp, mockFile);

      expect(result.preview).toBe("test");
      expect(result.frontmatter).toEqual({ title: "Test" });
      expect(result.tags).toEqual(["tag1"]);
    });
  });

  describe("loadNotesFromVault", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should load and transform all markdown files", async () => {
      const mockFiles = [
        createMockTFile("/note1.md", "note1", "md"),
        createMockTFile("/note2.md", "note2", "md"),
        createMockTFile("/folder/note3.md", "note3", "md", Date.now(), "folder"),
      ];

      const mockApp = createMockApp(mockFiles);

      // Mock metadata extraction for all files
      vi.mocked(metadataExtractor.extractNoteMetadata)
        .mockReturnValueOnce({
          frontmatter: { title: "Note 1" },
          tags: ["tag1"],
          cached: null,
        })
        .mockReturnValueOnce({
          frontmatter: null,
          tags: ["tag2"],
          cached: null,
        })
        .mockReturnValueOnce({
          frontmatter: { priority: 1 },
          tags: [],
          cached: null,
        });

      // Mock content preview for all files
      vi.mocked(metadataExtractor.extractContentPreview)
        .mockResolvedValueOnce({
          preview: "Content 1",
          success: true,
        })
        .mockResolvedValueOnce({
          preview: "Content 2",
          success: true,
        })
        .mockResolvedValueOnce({
          preview: "Content 3",
          success: true,
        });

      const result = await loadNotesFromVault(mockApp);

      expect(result).toHaveLength(3);
      expect(result[0].title).toBe("note1");
      expect(result[1].title).toBe("note2");
      expect(result[2].title).toBe("note3");
      expect(result[2].folder).toBe("folder");

      expect(mockApp.vault.getMarkdownFiles).toHaveBeenCalledOnce();
    });

    it("should filter out non-markdown files", async () => {
      const mockFiles = [
        createMockTFile("/note1.md", "note1", "md"),
        createMockTFile("/image.png", "image", "png") as any, // Non-markdown file
        createMockTFile("/note2.md", "note2", "md"),
      ];

      const mockApp = createMockApp(mockFiles);

      // Mock metadata extraction only for markdown files
      vi.mocked(metadataExtractor.extractNoteMetadata).mockReturnValue({
        frontmatter: null,
        tags: [],
        cached: null,
      });

      vi.mocked(metadataExtractor.extractContentPreview).mockResolvedValue({
        preview: "Content",
        success: true,
      });

      const result = await loadNotesFromVault(mockApp);

      expect(result).toHaveLength(2);
      expect(result.every((note) => note.file.extension === "md")).toBe(true);
    });

    it("should handle individual file processing failures gracefully", async () => {
      const mockFiles = [
        createMockTFile("/note1.md", "note1", "md"),
        createMockTFile("/note2.md", "note2", "md"),
        createMockTFile("/note3.md", "note3", "md"),
      ];

      const mockApp = createMockApp(mockFiles);

      // Mock successful processing for first and third files
      vi.mocked(metadataExtractor.extractNoteMetadata)
        .mockReturnValueOnce({
          frontmatter: null,
          tags: [],
          cached: null,
        })
        .mockReturnValueOnce({
          frontmatter: null,
          tags: [],
          cached: null,
        })
        .mockReturnValueOnce({
          frontmatter: null,
          tags: [],
          cached: null,
        });

      // Mock content preview - second one fails
      vi.mocked(metadataExtractor.extractContentPreview)
        .mockResolvedValueOnce({
          preview: "Content 1",
          success: true,
        })
        .mockRejectedValueOnce(new Error("Failed to process note2"))
        .mockResolvedValueOnce({
          preview: "Content 3",
          success: true,
        });

      // Mock console.warn to avoid test output noise
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = await loadNotesFromVault(mockApp);

      expect(result).toHaveLength(2); // Only successful ones
      expect(result[0].title).toBe("note1");
      expect(result[1].title).toBe("note3");
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to process note /note2.md:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it("should handle vault.getMarkdownFiles failure", async () => {
      const mockApp = {
        vault: {
          getMarkdownFiles: vi.fn().mockImplementation(() => {
            throw new Error("Vault access failed");
          }),
        },
      } as any;

      await expect(loadNotesFromVault(mockApp)).rejects.toThrow(
        "Failed to load notes: Vault access failed"
      );
    });

    it("should handle empty vault", async () => {
      const mockApp = createMockApp([]);

      const result = await loadNotesFromVault(mockApp);

      expect(result).toHaveLength(0);
      expect(mockApp.vault.getMarkdownFiles).toHaveBeenCalledOnce();
    });

    it("should handle unknown error types", async () => {
      const mockApp = {
        vault: {
          getMarkdownFiles: vi.fn().mockImplementation(() => {
            throw "String error"; // Non-Error object
          }),
        },
      } as any;

      await expect(loadNotesFromVault(mockApp)).rejects.toThrow(
        "Failed to load notes: Unknown error"
      );
    });
  });
});
