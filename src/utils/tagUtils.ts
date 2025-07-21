/**
 * Tag processing utilities for Obsidian hierarchical tags
 */

export interface HierarchicalTag {
  tag: string;
  displayName: string;
  level: number;
  parentTag?: string;
  children: string[];
}

/**
 * Parse a hierarchical tag and extract its components
 * @param tag - Tag string (e.g., "project/frontend/react")
 * @returns Parsed tag information
 */
export const parseHierarchicalTag = (tag: string): HierarchicalTag => {
  const parts = tag.split("/");
  const level = parts.length - 1;
  const displayName = parts[parts.length - 1];
  const parentTag = level > 0 ? parts.slice(0, -1).join("/") : undefined;

  return {
    tag,
    displayName,
    level,
    parentTag,
    children: [],
  };
};

/**
 * Build hierarchical tag structure from flat tag list
 * @param tags - Array of tag strings
 * @returns Map of tag strings to HierarchicalTag objects with children populated
 */
export const buildTagHierarchy = (tags: string[]): Map<string, HierarchicalTag> => {
  const tagMap = new Map<string, HierarchicalTag>();

  // First pass: create all tag objects
  for (const tag of tags) {
    if (!tagMap.has(tag)) {
      tagMap.set(tag, parseHierarchicalTag(tag));
    }
  }

  // Second pass: build parent-child relationships
  for (const [tagString, tagObj] of tagMap) {
    if (tagObj.parentTag && tagMap.has(tagObj.parentTag)) {
      const parent = tagMap.get(tagObj.parentTag)!;
      if (!parent.children.includes(tagString)) {
        parent.children.push(tagString);
      }
    }
  }

  return tagMap;
};

/**
 * Extract all possible tags from hierarchical tag paths
 * For example: "ai/code" becomes ["ai", "ai/code"]
 * @param tags - Array of tag strings from notes
 * @returns Array of all possible tag paths (parent + full paths)
 */
export const extractAllTagPaths = (tags: string[]): string[] => {
  const allPaths = new Set<string>();

  for (const tag of tags) {
    const parts = tag.split("/");

    // Add all possible paths from root to full tag
    for (let i = 1; i <= parts.length; i++) {
      const path = parts.slice(0, i).join("/");
      allPaths.add(path);
    }
  }

  return Array.from(allPaths).sort();
};

/**
 * Get all descendant tags for a given tag
 * @param tag - Tag to get descendants for
 * @param tagHierarchy - Map from buildTagHierarchy
 * @returns Array of descendant tag strings (including the tag itself)
 */
export const getTagDescendants = (
  tag: string,
  tagHierarchy: Map<string, HierarchicalTag>
): string[] => {
  const result = [tag];
  const tagObj = tagHierarchy.get(tag);

  if (tagObj) {
    for (const child of tagObj.children) {
      result.push(...getTagDescendants(child, tagHierarchy));
    }
  }

  return result;
};

/**
 * Check if a tag matches a hierarchical filter
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
