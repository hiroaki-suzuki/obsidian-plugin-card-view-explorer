/**
 * Tag processing utilities for Obsidian hierarchical tags
 *
 * This module provides utilities for working with Obsidian's hierarchical tag system,
 * where tags can have parent-child relationships using the "/" separator.
 * For example: "project/frontend/react" represents a 3-level deep tag hierarchy.
 */

/**
 * Extract all possible tags from hierarchical tag paths
 *
 * For each tag, generates all parent paths in the hierarchy.
 * Example: "ai/code" becomes ["ai", "ai/code"]
 *
 * @param tags - Array of tag strings from notes
 * @returns Array of all possible tag paths (parent + full paths) sorted alphabetically
 */
export const extractAllTagPaths = (tags: string[]): string[] => {
  const allPaths = new Set<string>();

  for (const tag of tags) {
    const parts = tag.split("/");

    // Generate all possible hierarchical paths from root to full tag
    // e.g., "a/b/c" creates: "a", "a/b", "a/b/c"
    for (let i = 1; i <= parts.length; i++) {
      const path = parts.slice(0, i).join("/");
      allPaths.add(path);
    }
  }

  return Array.from(allPaths).sort();
};

/**
 * Check if a note's tag matches a hierarchical filter tag
 *
 * Handles hierarchical matching where a note with tag "project/frontend/react"
 * should match a filter for "project/frontend" (parent tag matches children),
 * but a note with tag "project" should NOT match a filter for "project/frontend"
 * (child tag doesn't match parent).
 *
 * @param noteTag - Tag from a note
 * @param filterTag - Tag selected in filter
 * @returns True if noteTag matches the filter (exact match or noteTag is descendant of filterTag)
 */
export const tagMatchesFilter = (noteTag: string, filterTag: string): boolean => {
  // Exact match
  if (noteTag === filterTag) {
    return true;
  }

  // Check if noteTag is a descendant of filterTag (parent selected, child should match)
  // But NOT the reverse (child selected, parent should NOT match)
  return noteTag.startsWith(`${filterTag}/`);
};
