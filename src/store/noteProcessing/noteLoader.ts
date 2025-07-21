import type { App, TFile } from "obsidian";
import type { MarkdownFile, NoteData } from "../../types";
import { extractContentPreview, extractNoteMetadata } from "./metadataExtractor";

/**
 * Data Processing Functions - Note Loading and Transformation
 *
 * These functions handle loading notes from Obsidian APIs and transforming
 * them into the NoteData format used by the Card View Explorer. This module serves
 * as the bridge between Obsidian's file system and the plugin's data model.
 */

/**
 * Check if a file is a markdown file
 *
 * Type guard function to ensure we only process markdown files.
 * This is used as a TypeScript type guard to narrow the type from TFile to MarkdownFile.
 *
 * @param {TFile} file - Obsidian file object to check
 * @returns {file is MarkdownFile} True if file is a markdown file (extension is "md")
 */
export const isMarkdownFile = (file: TFile): file is MarkdownFile => {
  return file.extension === "md";
};

/**
 * Transform a TFile into NoteData
 *
 * Converts an Obsidian TFile into the NoteData format used by Card View Explorer.
 * Extracts metadata, content preview, and other required information from the file.
 * This function is asynchronous because it needs to read file content for the preview.
 *
 * @param {App} app - Obsidian App instance for accessing vault and metadata cache
 * @param {TFile} file - Obsidian file object to transform into NoteData
 * @returns {Promise<NoteData>} Transformed note data with metadata and preview
 */
export const transformFileToNoteData = async (app: App, file: TFile): Promise<NoteData> => {
  // Extract metadata (frontmatter and tags)
  const metadata = extractNoteMetadata(app, file);

  // Extract content preview
  const contentPreview = await extractContentPreview(app, file);

  // Get folder path (parent folder or empty string for root)
  const folder = file.parent?.path || "";

  // Create NoteData object
  const noteData: NoteData = {
    file,
    title: file.basename, // Filename without extension
    path: file.path, // Full path
    preview: contentPreview.preview,
    lastModified: new Date(file.stat.mtime), // File modification time
    frontmatter: metadata.frontmatter,
    tags: metadata.tags,
    folder,
  };

  return noteData;
};

/**
 * Load all markdown notes from Obsidian vault
 *
 * Queries Obsidian's vault for all markdown files and transforms them
 * into NoteData objects. Handles errors gracefully and filters out
 * non-markdown files. Uses Promise.allSettled to process files in parallel
 * while ensuring that failures with individual files don't cause the entire
 * operation to fail.
 *
 * @param {App} app - Obsidian App instance for accessing vault and metadata cache
 * @returns {Promise<NoteData[]>} Array of successfully transformed note data objects
 * @throws {Error} If the overall loading operation fails (with error handling applied)
 */
export const loadNotesFromVault = async (app: App): Promise<NoteData[]> => {
  try {
    // Get all files from vault
    const allFiles = app.vault.getMarkdownFiles();

    // Filter to only markdown files (redundant safety check as getMarkdownFiles should already filter)
    // This ensures type safety through the isMarkdownFile type guard
    const markdownFiles = allFiles.filter(isMarkdownFile);

    // Transform each file to NoteData
    const noteDataPromises = markdownFiles.map((file) => transformFileToNoteData(app, file));

    // Wait for all transformations to complete - using Promise.allSettled ensures
    // that failures with individual files don't cause the entire operation to fail
    const noteDataResults = await Promise.allSettled(noteDataPromises);

    // Extract successful results and log failures
    // This approach ensures we get as many valid notes as possible even if some fail
    const notes: NoteData[] = [];
    noteDataResults.forEach((result, index) => {
      if (result.status === "fulfilled") {
        notes.push(result.value);
      } else {
        console.warn(`Failed to process note ${markdownFiles[index].path}:`, result.reason);
      }
    });

    return notes;
  } catch (error) {
    // Import error handling utilities dynamically to avoid circular dependencies
    // This is necessary because errorHandling.ts might import from this module
    const { handleError, ErrorCategory } = await import("../../utils/errorHandling");

    // Log and handle the error with proper categorization and context
    handleError(error, ErrorCategory.API, {
      operation: "loadNotesFromVault",
      fileCount: 0,
    });

    // Throw original error message format for tests
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to load notes: ${errorMessage}`);
  }
};
