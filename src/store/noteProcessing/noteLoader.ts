import type { App, TFile } from "obsidian";
import type { MarkdownFile, NoteData } from "../../types";
import { extractContentPreview, extractNoteMetadata } from "./metadataExtractor";

/**
 * Data Processing Functions - Note Loading and Transformation
 *
 * These functions handle loading notes from Obsidian APIs and transforming
 * them into the NoteData format used by the Card Explorer.
 */

/**
 * Check if a file is a markdown file
 *
 * Type guard function to ensure we only process markdown files.
 *
 * @param {TFile} file - File to check
 * @returns {file is MarkdownFile} True if file is a markdown file
 */
export const isMarkdownFile = (file: TFile): file is MarkdownFile => {
  return file.extension === "md";
};

/**
 * Transform a TFile into NoteData
 *
 * Converts an Obsidian TFile into the NoteData format used by Card Explorer.
 * Extracts metadata, content preview, and other required information.
 *
 * @param {App} app - Obsidian App instance
 * @param {TFile} file - File to transform
 * @returns {Promise<NoteData>} Transformed note data
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
 * non-markdown files.
 *
 * @param {App} app - Obsidian App instance
 * @returns {Promise<NoteData[]>} Array of transformed note data
 */
export const loadNotesFromVault = async (app: App): Promise<NoteData[]> => {
  try {
    // Get all files from vault
    const allFiles = app.vault.getMarkdownFiles();

    // Filter to only markdown files (should already be filtered by getMarkdownFiles)
    const markdownFiles = allFiles.filter(isMarkdownFile);

    // Transform each file to NoteData
    const noteDataPromises = markdownFiles.map((file) => transformFileToNoteData(app, file));

    // Wait for all transformations to complete
    const noteDataResults = await Promise.allSettled(noteDataPromises);

    // Extract successful results and log failures
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
    // Import error handling utilities dynamically
    const { handleError, ErrorCategory } = await import("../../utils/errorHandling");

    const errorInfo = handleError(error, ErrorCategory.API, {
      operation: "loadNotesFromVault",
      fileCount: 0,
    });

    throw new Error(errorInfo.message);
  }
};
