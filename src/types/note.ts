import type { CachedMetadata, TFile } from "obsidian";

/**
 * Core data model for a note in the Card View Explorer.
 * Represents all the necessary information about a note for display and filtering.
 */
export interface NoteData {
  /** Obsidian TFile object for the note */
  file: TFile;
  /** Display title of the note (filename without extension) */
  title: string;
  /** Full path to the note file including filename */
  path: string;
  /** First 3 lines of note content for preview display */
  preview: string;
  /** Last modified timestamp of the note */
  lastModified: Date;
  /** Frontmatter metadata extracted from the note, or null if none exists */
  frontmatter: Record<string, any> | null;
  /** Tags extracted from both frontmatter and inline tags */
  tags: string[];
  /** Folder path containing the note (without filename) */
  folder: string;
}

/**
 * Type guard for ensuring a file is specifically a markdown file.
 * Used for filtering non-markdown files from processing.
 */
export type MarkdownFile = TFile & { extension: "md" };

/**
 * Represents values that can be used for sorting notes.
 * Covers all possible frontmatter value types that might be used as sort keys.
 */
export type SortableValue = string | number | Date | null | undefined;

/**
 * Result of metadata extraction process from an Obsidian note.
 * Contains structured data extracted from note's metadata cache.
 */
export interface NoteMetadata {
  /** Parsed frontmatter data from the note */
  frontmatter: Record<string, any> | null;
  /** Combined tags from frontmatter and inline tags */
  tags: string[];
  /** Raw cached metadata from Obsidian's metadataCache */
  cached: CachedMetadata | null;
}

/**
 * Result of content preview extraction process.
 * Contains the preview text and status information about the extraction.
 */
export interface ContentPreview {
  /** Extracted preview text (typically first 3 lines) */
  preview: string;
  /** Whether the extraction was successful */
  success: boolean;
  /** Error message if extraction failed */
  error?: string;
}
