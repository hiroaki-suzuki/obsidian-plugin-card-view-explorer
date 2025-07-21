import { describe, expect, it } from "vitest";
import {
  buildTagHierarchy,
  extractAllTagPaths,
  getTagDescendants,
  parseHierarchicalTag,
  tagMatchesFilter,
} from "./tagUtils";

describe("tagUtils", () => {
  describe("parseHierarchicalTag", () => {
    it("should parse root tag correctly", () => {
      const result = parseHierarchicalTag("project");
      expect(result).toEqual({
        tag: "project",
        displayName: "project",
        level: 0,
        parentTag: undefined,
        children: [],
      });
    });

    it("should parse nested tag correctly", () => {
      const result = parseHierarchicalTag("project/frontend/react");
      expect(result).toEqual({
        tag: "project/frontend/react",
        displayName: "react",
        level: 2,
        parentTag: "project/frontend",
        children: [],
      });
    });
  });

  describe("buildTagHierarchy", () => {
    it("should build hierarchy from flat tags", () => {
      const tags = ["project", "project/frontend", "project/frontend/react", "work"];
      const hierarchy = buildTagHierarchy(tags);

      expect(hierarchy.size).toBe(4);
      expect(hierarchy.get("project")?.children).toEqual(["project/frontend"]);
      expect(hierarchy.get("project/frontend")?.children).toEqual(["project/frontend/react"]);
      expect(hierarchy.get("project/frontend/react")?.children).toEqual([]);
      expect(hierarchy.get("work")?.children).toEqual([]);
    });

    it("should handle single tags", () => {
      const tags = ["tag1", "tag2"];
      const hierarchy = buildTagHierarchy(tags);

      expect(hierarchy.size).toBe(2);
      expect(hierarchy.get("tag1")?.level).toBe(0);
      expect(hierarchy.get("tag2")?.level).toBe(0);
    });
  });

  describe("getTagDescendants", () => {
    it("should return all descendants including self", () => {
      const tags = ["project", "project/frontend", "project/frontend/react", "project/backend"];
      const hierarchy = buildTagHierarchy(tags);
      const descendants = getTagDescendants("project", hierarchy);

      expect(descendants).toEqual([
        "project",
        "project/frontend",
        "project/frontend/react",
        "project/backend",
      ]);
    });

    it("should return only self for leaf tags", () => {
      const tags = ["project", "project/frontend", "project/frontend/react"];
      const hierarchy = buildTagHierarchy(tags);
      const descendants = getTagDescendants("project/frontend/react", hierarchy);

      expect(descendants).toEqual(["project/frontend/react"]);
    });
  });

  describe("tagMatchesFilter", () => {
    it("should match exact tag", () => {
      expect(tagMatchesFilter("project", "project")).toBe(true);
      expect(tagMatchesFilter("project/frontend", "project/frontend")).toBe(true);
    });

    it("should match parent-child relationship (parent selected, child matches)", () => {
      expect(tagMatchesFilter("project/frontend", "project")).toBe(true);
      expect(tagMatchesFilter("project/frontend/react", "project")).toBe(true);
      expect(tagMatchesFilter("project/frontend/react", "project/frontend")).toBe(true);
    });

    it("should not match unrelated tags", () => {
      expect(tagMatchesFilter("work", "project")).toBe(false);
      expect(tagMatchesFilter("project", "work")).toBe(false);
      expect(tagMatchesFilter("work/meeting", "project")).toBe(false);
    });

    it("should not match reverse hierarchy (child selected, parent should NOT match)", () => {
      // Parent should not match child filter
      expect(tagMatchesFilter("project", "project/frontend")).toBe(false);
      expect(tagMatchesFilter("project/frontend", "project/frontend/react")).toBe(false);
    });

    it("should handle edge cases", () => {
      // Similar prefix but not hierarchical
      expect(tagMatchesFilter("projectile", "project")).toBe(false);
      expect(tagMatchesFilter("project_test", "project")).toBe(false);

      // Empty strings
      expect(tagMatchesFilter("", "")).toBe(true);
      expect(tagMatchesFilter("project", "")).toBe(false);
      expect(tagMatchesFilter("", "project")).toBe(false);
    });
  });

  describe("extractAllTagPaths", () => {
    it("should extract all possible tag paths", () => {
      const tags = ["ai/code", "aws/ec2", "simple"];
      const result = extractAllTagPaths(tags);

      expect(result).toEqual(["ai", "ai/code", "aws", "aws/ec2", "simple"]);
    });

    it("should handle deeply nested tags", () => {
      const tags = ["project/frontend/react/hooks"];
      const result = extractAllTagPaths(tags);

      expect(result).toEqual([
        "project",
        "project/frontend",
        "project/frontend/react",
        "project/frontend/react/hooks",
      ]);
    });

    it("should handle duplicate parent paths", () => {
      const tags = ["ai/code", "ai/ml"];
      const result = extractAllTagPaths(tags);

      expect(result).toEqual(["ai", "ai/code", "ai/ml"]);
    });

    it("should return empty array for empty input", () => {
      const result = extractAllTagPaths([]);
      expect(result).toEqual([]);
    });

    it("should sort results alphabetically", () => {
      const tags = ["z/tag", "a/tag"];
      const result = extractAllTagPaths(tags);

      expect(result).toEqual(["a", "a/tag", "z", "z/tag"]);
    });
  });
});
