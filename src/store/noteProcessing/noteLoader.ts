import type { App, CachedMetadata, FrontMatterCache, TagCache, TFile } from "obsidian";
import { ErrorCategory, handleError } from "../../core/errors/errorHandling";
import type { ContentPreview, MarkdownFile, NoteData, NoteMetadata } from "../../types";
import { PREVIEW_MAX_LINES } from "../constants";

/**
 * Note Loading and Transformation Module
 *
 * This module handles loading notes from Obsidian's vault and transforming them
 * into the NoteData format used by the Card View Explorer. It serves as the
 * primary bridge between Obsidian's file system and the plugin's data model.
 */

/**
 * Loads all markdown notes from the Obsidian vault and transforms them into NoteData objects.
 *
 * This function serves as the main entry point for note loading, handling the complete pipeline
 * from raw TFile objects to processed NoteData with metadata and content previews. It implements
 * error resilience by continuing to process other notes even if individual notes fail.
 *
 * @param app - The Obsidian App instance providing access to vault and metadata cache
 * @returns Promise resolving to array of successfully processed NoteData objects
 * @throws Error if the entire loading operation fails (e.g., vault access issues)
 */
export const loadNotesFromVault = async (app: App): Promise<NoteData[]> => {
  try {
    const allFiles = app.vault.getMarkdownFiles();
    const markdownFiles = filterMarkdownFiles(allFiles);

    const noteDataResults = await processFilesWithErrorHandling(app, markdownFiles);

    return extractSuccessfulResults(noteDataResults);
  } catch (error) {
    handleError(error, ErrorCategory.API, {
      operation: "loadNotesFromVault",
      fileCount: 0,
    });

    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to load notes: ${errorMessage}`);
  }
};

/**
 * Filters TFile array to only include markdown files with proper type narrowing.
 *
 * @param files - Array of TFile objects from Obsidian vault
 * @returns Array of files confirmed to be markdown files
 */
const filterMarkdownFiles = (files: TFile[]): MarkdownFile[] => {
  const isMarkdownFile = (file: TFile): file is MarkdownFile => {
    return file.extension === "md";
  };

  return files.filter(isMarkdownFile);
};

/**
 * Processes multiple files concurrently with individual error handling.
 *
 * Uses Promise.allSettled to ensure that failures in individual files don't
 * prevent processing of other files, maintaining system resilience.
 *
 * @param app - Obsidian App instance
 * @param files - Array of markdown files to process
 * @returns Promise resolving to settled results for each file transformation
 */
const processFilesWithErrorHandling = async (
  app: App,
  files: MarkdownFile[]
): Promise<PromiseSettledResult<NoteData>[]> => {
  const noteDataPromises = files.map((file) => transformFileToNoteData(app, file));
  return Promise.allSettled(noteDataPromises);
};

/**
 * Transforms a single TFile into a NoteData object with metadata and content preview.
 *
 * This function handles the complete transformation pipeline for individual files,
 * including metadata extraction and content preview generation. If any step fails,
 * it gracefully falls back to default values to ensure the note is still included.
 *
 * @param app - Obsidian App instance for accessing vault and metadata
 * @param file - The TFile to transform
 * @returns Promise resolving to NoteData object (never rejects, uses fallbacks)
 */
const transformFileToNoteData = async (app: App, file: TFile): Promise<NoteData> => {
  try {
    const cached = app.metadataCache.getFileCache(file);
    const metadata = extractNoteMetadata(cached);

    const content = await app.vault.cachedRead(file);
    const contentPreview = extractContentPreview(content, file.basename);

    return createNoteDataObject(file, metadata, contentPreview);
  } catch (error) {
    // Graceful degradation: ensure note is still included even if processing fails
    // This prevents individual file errors from breaking the entire note loading process
    const defaultMetadata = createDefaultMetadata();
    const errorPreview = createErrorPreview(file, error);

    return createNoteDataObject(file, defaultMetadata, errorPreview);
  }
};

/**
 * Extracts and consolidates metadata from Obsidian's cached metadata.
 *
 * Combines tags from both frontmatter and inline sources, deduplicating them
 * to provide a unified tag list for filtering and display purposes.
 *
 * @param cached - Obsidian's cached metadata for the file (may be null)
 * @returns Consolidated metadata object with frontmatter, tags, and raw cache
 */
const extractNoteMetadata = (cached: CachedMetadata | null): NoteMetadata => {
  const frontmatter = cached?.frontmatter || null;
  const frontmatterTags = extractFrontmatterTags(frontmatter);

  const inlineTags = cached?.tags || null;
  const inlineTagsArray = extractInlineTags(inlineTags);

  // Deduplicate tags from both sources using Set
  const tags = [...new Set([...frontmatterTags, ...inlineTagsArray])];

  return { frontmatter, tags, cached };
};

/**
 * Extracts tags from frontmatter, handling both array and single value formats.
 *
 * Obsidian frontmatter tags can be either a single value or an array, so this
 * function normalizes both formats into a consistent string array.
 *
 * @param frontmatter - Frontmatter cache object from Obsidian
 * @returns Array of tag strings from frontmatter
 */
const extractFrontmatterTags = (frontmatter: FrontMatterCache | null): string[] => {
  if (!frontmatter?.tags) return [];

  // Handle both single tag and array of tags in frontmatter
  if (Array.isArray(frontmatter.tags)) {
    // Convert all array elements to strings (handles mixed types like numbers, booleans)
    return frontmatter.tags.map(String);
  } else {
    // Convert single value to string and wrap in array
    return [String(frontmatter.tags)];
  }
};

/**
 * Extracts and normalizes inline tags from Obsidian's tag cache.
 *
 * @param inlineTags - Array of TagCache objects from Obsidian metadata
 * @returns Array of normalized tag strings without duplicates
 */
const extractInlineTags = (inlineTags?: TagCache[] | null): string[] => {
  if (!inlineTags) return [];

  return inlineTags
    .map((tagCache) => normalizeTagName(tagCache.tag))
    .filter((tag, index, array) => array.indexOf(tag) === index); // Remove duplicates within inline tags
};

/**
 * Normalizes tag names by removing the leading '#' character.
 *
 * Obsidian inline tags include the '#' prefix, but for consistency with
 * frontmatter tags and filtering logic, we store tags without the prefix.
 *
 * @param tag - Raw tag string from Obsidian (may include '#' prefix)
 * @returns Normalized tag string without '#' prefix
 */
const normalizeTagName = (tag: string): string => {
  return tag.startsWith("#") ? tag.slice(1) : tag;
};

/**
 * Extracts a content preview from the note content, excluding frontmatter.
 *
 * @param content - Full content of the markdown file
 * @param filename - Filename to use as fallback if content is empty
 * @returns ContentPreview object with preview text and success status
 */
const extractContentPreview = (content: string, filename: string): ContentPreview => {
  const cleanContent = removeFrontmatter(content);
  const preview = generatePreview(cleanContent, filename);

  return { preview, success: true };
};

/**
 * Removes YAML frontmatter from content to get clean preview text.
 *
 * Frontmatter is enclosed between '---' delimiters and should be excluded
 * from content previews to show actual note content to users.
 *
 * @param content - Full markdown content including potential frontmatter
 * @returns Content with frontmatter removed, or original if no frontmatter
 */
const removeFrontmatter = (content: string): string => {
  if (!hasFrontmatter(content)) {
    return content;
  }

  const lines = content.split("\n");
  const endIndex = findFrontmatterEndIndex(lines);

  return endIndex === -1 ? content : lines.slice(endIndex + 1).join("\n");
};

/**
 * Finds the line index where frontmatter ends (second '---' delimiter).
 *
 * @param lines - Array of content lines
 * @returns Index of closing frontmatter delimiter, or -1 if not found
 */
const findFrontmatterEndIndex = (lines: string[]): number => {
  // Start from index 1 since index 0 should be the opening '---'
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      return i;
    }
  }
  return -1;
};

/**
 * Checks if content has YAML frontmatter by looking for opening delimiter.
 *
 * @param content - Full markdown content
 * @returns True if content starts with frontmatter delimiter
 */
const hasFrontmatter = (content: string): boolean => {
  return content.startsWith("---");
};

/**
 * Generates a preview from content by taking the first few non-empty lines.
 *
 * @param content - Clean content without frontmatter
 * @param fallbackTitle - Filename to use if content is empty
 * @returns Preview text limited to PREVIEW_MAX_LINES, or fallback title
 */
const generatePreview = (content: string, fallbackTitle: string): string => {
  const lines = content.split("\n");
  const nonEmptyLines = lines.filter((line) => line.trim() !== "");
  const preview = nonEmptyLines.slice(0, PREVIEW_MAX_LINES).join("\n").trim();

  // Use filename as fallback if no meaningful content is found
  return preview || fallbackTitle;
};

/**
 * Creates default metadata object for files that fail to process.
 *
 * @returns Default NoteMetadata with null/empty values
 */
const createDefaultMetadata = (): NoteMetadata => ({
  frontmatter: null,
  tags: [],
  cached: null,
});

/**
 * Creates an error preview object when content extraction fails.
 *
 * @param file - The TFile that failed to process
 * @param error - The error that occurred during processing
 * @returns ContentPreview with error information and filename as fallback
 */
const createErrorPreview = (file: TFile, error: unknown): ContentPreview => ({
  preview: file.basename,
  success: false,
  error: error instanceof Error ? error.message : "Unknown error",
});

/**
 * Creates the final NoteData object by combining file info, metadata, and preview.
 *
 * @param file - The source TFile from Obsidian
 * @param metadata - Extracted metadata including tags and frontmatter
 * @param contentPreview - Generated content preview
 * @returns Complete NoteData object for use in the card view
 */
const createNoteDataObject = (
  file: TFile,
  metadata: NoteMetadata,
  contentPreview: ContentPreview
): NoteData => {
  return {
    file,
    title: file.basename,
    path: file.path,
    preview: contentPreview.preview,
    lastModified: new Date(file.stat.mtime),
    frontmatter: metadata.frontmatter,
    tags: metadata.tags,
    folder: file.parent?.path || "", // Handle root folder files
  };
};

/**
 * Extracts successfully processed NoteData objects from Promise.allSettled results.
 *
 * Filters out rejected promises to ensure only valid NoteData objects are returned,
 * implementing the error resilience pattern where individual file failures don't
 * prevent the overall loading operation from succeeding.
 *
 * @param results - Array of settled promise results from file processing
 * @returns Array of successfully processed NoteData objects
 */
const extractSuccessfulResults = (results: PromiseSettledResult<NoteData>[]): NoteData[] => {
  const isPromiseFulfilled = (
    result: PromiseSettledResult<NoteData>
  ): result is PromiseFulfilledResult<NoteData> => {
    return result.status === "fulfilled";
  };

  return results.filter(isPromiseFulfilled).map((result) => result.value);
};
