import { describe, expect, it } from "vitest";
import { extractAllTagPaths, tagMatchesFilter } from "./tagUtils";

describe("tagUtils", () => {
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
});
