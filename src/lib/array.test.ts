import { describe, expect, it } from "vitest";
import { toggleInArray } from "./array";

describe("toggleInArray", () => {
  describe("adds when not present", () => {
    it.each([
      { base: ["a", "b"], item: "c", expected: ["a", "b", "c"] },
      { base: [1, 2], item: 3, expected: [1, 2, 3] },
      { base: [0], item: 1, expected: [0, 1] },
      { base: [""], item: "x", expected: ["", "x"] },
      { base: [false], item: true, expected: [false, true] },
    ])("$base + $item -> $expected", ({ base, item, expected }) => {
      const result = toggleInArray(base as readonly unknown[], item as unknown);
      expect(result).not.toBe(base);
      expect(result).toEqual(expected);
    });

    it("adds to empty array", () => {
      const base: number[] = [];
      const result = toggleInArray(base, 1);
      expect(result).not.toBe(base);
      expect(result).toEqual([1]);
    });
  });

  describe("removes when present", () => {
    it.each([
      { base: ["a", "b", "c"], item: "b", expected: ["a", "c"] },
      { base: [1, 2, 3], item: 2, expected: [1, 3] },
      { base: [0, 1], item: 0, expected: [1] },
      { base: ["", "x"], item: "", expected: ["x"] },
      { base: [false, true], item: false, expected: [true] },
    ])("$base - $item -> $expected", ({ base, item, expected }) => {
      const result = toggleInArray(base as readonly unknown[], item as unknown);
      expect(result).not.toBe(base);
      expect(result).toEqual(expected);
    });

    it.each([
      { base: [1, 2, 2, 3], item: 2, expected: [1, 3] },
      { base: ["x", "x", "y"], item: "x", expected: ["y"] },
    ])("removes all duplicates of $item", ({ base, item, expected }) => {
      const result = toggleInArray(base as readonly unknown[], item as unknown);
      expect(result).toEqual(expected);
    });
  });

  describe("immutability", () => {
    it("does not mutate the original array", () => {
      const base = [1, 2, 3];
      const copy = [...base];
      const result = toggleInArray(base, 4);
      expect(result).not.toBe(base);
      expect(base).toEqual(copy);
      expect(result).toEqual([1, 2, 3, 4]);
    });

    it("works with readonly arrays", () => {
      const base = [1, 2] as const;
      const result = toggleInArray(base, 3);
      expect(result).not.toBe(base);
      expect(result).toEqual([1, 2, 3]);
      expect(base).toEqual([1, 2]);
    });

    it("does not mutate frozen arrays", () => {
      const base = Object.freeze([1, 2, 3]);
      const result = toggleInArray(base, 4);
      expect(result).not.toBe(base);
      expect(base).toEqual([1, 2, 3]);
      expect(result).toEqual([1, 2, 3, 4]);
    });
  });

  describe("object/reference semantics", () => {
    it("removes when the same object reference is present", () => {
      const obj = { a: 1 };
      const base = [obj] as const;
      const result = toggleInArray(base, obj);
      expect(result).not.toBe(base);
      expect(result).toEqual([]);
    });

    it("adds when a different object reference is provided", () => {
      const obj = { a: 1 };
      const base = [obj] as const;
      const another = { a: 1 };
      const result = toggleInArray(base, another);
      expect(result).not.toBe(base);
      expect(result).toHaveLength(2);
      expect(result[0]).toBe(obj);
      expect(result[1]).toBe(another);
    });
  });

  describe("special values", () => {
    it("removes NaN when present", () => {
      const base = [Number.NaN, 1, 2];
      const result = toggleInArray(base, Number.NaN);
      expect(result).toEqual([1, 2]);
    });
  });
});
