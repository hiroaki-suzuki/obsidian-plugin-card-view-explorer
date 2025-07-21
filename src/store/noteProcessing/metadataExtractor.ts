import type { App, TFile } from "obsidian";
import type { ContentPreview, NoteMetadata } from "../../types";
import { PREVIEW_MAX_LINES } from "../utils";

/**
 * Removes frontmatter from note content
 *
 * Frontmatter is YAML content between triple-dash delimiters (---) at the start of the file.
 * This function identifies and removes the frontmatter section if present.
 *
 * @param content - Raw note content as a string
 * @returns Content with frontmatter section removed
 */
const removeFrontmatter = (content: string): string => {
  // Check if content starts with frontmatter delimiter
  if (!content.startsWith("---")) {
    return content;
  }

  // Find the closing delimiter
  const lines = content.split("\n");
  let endIndex = -1;

  // Start from line 1 (skip the opening ---)
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      endIndex = i;
      break;
    }
  }

  // If no closing delimiter found, return original content
  if (endIndex === -1) {
    return content;
  }

  // Return content after the frontmatter
  return lines.slice(endIndex + 1).join("\n");
};

/**
 * Extracts note metadata from Obsidian's metadata cache
 *
 * Safely extracts frontmatter and tags from a note using Obsidian's
 * metadata cache API. Handles cases where metadata is not available.
 * Tags are collected from both frontmatter and inline hashtags in the content.
 *
 * Error handling:
 * - Logs warnings to console
 * - Uses error handling utility for proper categorization
 * - Returns default values if extraction fails
 *
 * @param app - Obsidian App instance providing access to metadata cache
 * @param file - Obsidian TFile object representing the note file
 * @returns NoteMetadata object containing frontmatter, tags, and cached metadata
 */
export const extractNoteMetadata = (app: App, file: TFile): NoteMetadata => {
  try {
    const cached = app.metadataCache.getFileCache(file);

    // Extract frontmatter
    const frontmatter = cached?.frontmatter || null;

    // Extract tags from multiple sources
    const tags: string[] = [];

    // Tags from frontmatter - handles both array and string formats
    // Converts all tag values to strings for consistency
    if (frontmatter?.tags) {
      if (Array.isArray(frontmatter.tags)) {
        tags.push(...frontmatter.tags.map((tag) => String(tag)));
      } else {
        tags.push(String(frontmatter.tags));
      }
    }

    // Tags from content (inline hashtags)
    // Removes the # prefix and ensures no duplicates with frontmatter tags
    if (cached?.tags) {
      cached.tags.forEach((tagCache) => {
        const tag = tagCache.tag.startsWith("#") ? tagCache.tag.slice(1) : tagCache.tag;
        if (!tags.includes(tag)) {
          tags.push(tag);
        }
      });
    }

    return {
      frontmatter,
      tags,
      cached,
    };
  } catch (error) {
    console.warn(`Failed to extract metadata for ${file.path}:`, error);

    // Import error handling utilities dynamically
    import("../../utils/errorHandling").then(({ handleError, ErrorCategory }) => {
      handleError(
        error,
        ErrorCategory.API,
        {
          operation: "extractNoteMetadata",
          filePath: file.path,
          fileName: file.basename,
        },
        { showNotifications: false }
      ); // Don't show notifications for metadata errors
    });

    return {
      frontmatter: null,
      tags: [],
      cached: null,
    };
  }
};

/**
 * Extracts content preview from a note
 *
 * Reads the note content and extracts the first few lines (defined by PREVIEW_MAX_LINES, currently 3)
 * for display in the card view. Excludes frontmatter from the preview content.
 * Uses Obsidian's vault.cachedRead() for efficient content access with caching.
 *
 * Error handling:
 * - Falls back to using the filename as preview if content extraction fails
 * - Logs warnings to console
 * - Uses error handling utility for proper categorization
 * - Returns success status and error information if applicable
 *
 * @param app - Obsidian App instance providing access to vault
 * @param file - Obsidian TFile object representing the note file
 * @returns Promise resolving to ContentPreview object with preview text and status
 */
export const extractContentPreview = async (app: App, file: TFile): Promise<ContentPreview> => {
  try {
    const content = await app.vault.cachedRead(file);

    // Remove frontmatter if present
    const contentWithoutFrontmatter = removeFrontmatter(content);

    // Split content into lines and take first N lines (defined by PREVIEW_MAX_LINES)
    const lines = contentWithoutFrontmatter.split("\n");
    const previewLines = lines.slice(0, PREVIEW_MAX_LINES);

    // Join lines and trim whitespace for clean preview display
    const preview = previewLines.join("\n").trim();

    return {
      preview: preview || file.basename, // Fallback to filename if no content
      success: true,
    };
  } catch (error) {
    console.warn(`Failed to extract content preview for ${file.path}:`, error);

    // Import error handling utilities dynamically
    import("../../utils/errorHandling").then(({ handleError, ErrorCategory }) => {
      handleError(
        error,
        ErrorCategory.API,
        {
          operation: "extractContentPreview",
          filePath: file.path,
          fileName: file.basename,
        },
        { showNotifications: false }
      ); // Don't show notifications for preview errors
    });

    return {
      preview: file.basename, // Fallback to filename
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
