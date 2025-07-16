import type { CachedMetadata, TFile } from "obsidian";

/**
 * Core data model for a note in the Card Explorer
 * Integrates with Obsidian's TFile system
 */
export interface NoteData {
  /** Obsidian TFile object for the note */
  file: TFile;
  /** Display title of the note (filename without extension) */
  title: string;
  /** Full path to the note file */
  path: string;
  /** First 3 lines of note content for preview */
  preview: string;
  /** Last modified date of the note */
  lastModified: Date;
  /** Frontmatter metadata from the note */
  frontmatter: Record<string, any> | null;
  /** Tags extracted from the note */
  tags: string[];
  /** Folder path containing the note */
  folder: string;
}

/** Type guard for checking if a file is a markdown file */
export type MarkdownFile = TFile & { extension: "md" };

/** Type for frontmatter values that can be used for sorting */
export type SortableValue = string | number | Date | null | undefined;

/** Type for note metadata extraction result */
export interface NoteMetadata {
  frontmatter: Record<string, any> | null;
  tags: string[];
  cached: CachedMetadata | null;
}

/** Type for content extraction result */
export interface ContentPreview {
  preview: string;
  success: boolean;
  error?: string;
}
