import { renderHook } from "@testing-library/react";
import type { TFile } from "obsidian";
import { describe, expect, it } from "vitest";
import type { NoteData } from "../types/note";
import { type UseNoteGridReturn, useNoteGrid } from "./useNoteGrid";

// Constants
const DEFAULT_ROW_SIZE = 3;

// Helpers
const makeNote = (id: string): NoteData => ({
  file: {
    path: `${id}.md`,
    name: `${id}.md`,
    basename: id,
    extension: "md",
  } as TFile,
  path: `${id}.md`,
  title: `Note ${id}`,
  preview: `Preview of ${id}`,
  lastModified: new Date(),
  tags: [],
  frontmatter: null,
  folder: "",
});

const makeNotes = (ids: readonly string[]): NoteData[] => ids.map(makeNote);

const renderGrid = (notes: NoteData[], rowSize = DEFAULT_ROW_SIZE) =>
  renderHook(() => useNoteGrid(notes, rowSize));

const expectEmptyGrid = (noteGrid: ReturnType<typeof renderHook>["result"]) => {
  expect((noteGrid.current as UseNoteGridReturn).noteRows).toEqual([]);
  expect((noteGrid.current as UseNoteGridReturn).totalRows).toBe(0);
};

describe("useNoteGrid", () => {
  describe("returns empty array", () => {
    it.each([
      {
        name: "empty notes with valid rowSize",
        notes: [] as NoteData[],
        rowSize: DEFAULT_ROW_SIZE,
      },
      {
        name: "non-empty notes with rowSize 0",
        notes: makeNotes(["1", "2"]),
        rowSize: 0,
      },
      {
        name: "non-empty notes with negative rowSize",
        notes: makeNotes(["1", "2"]),
        rowSize: -1,
      },
      {
        name: "empty notes with rowSize 0",
        notes: [] as NoteData[],
        rowSize: 0,
      },
    ])("$name", ({ notes, rowSize }) => {
      const { result } = renderGrid(notes, rowSize);
      expectEmptyGrid(result);
    });
  });

  describe("layout calculation", () => {
    it("returns single row grid when notes are less than row size", () => {
      const notes = makeNotes(["1", "2"]);
      const { result } = renderGrid(notes, DEFAULT_ROW_SIZE);

      const rows = result.current.noteRows;
      expect(rows).toHaveLength(1);
      expect(rows[0].notes).toHaveLength(2);
      expect(rows[0].emptySlots).toBe(1);
      expect(result.current.totalRows).toBe(1);
    });

    it("returns complete row when notes match exact row size", () => {
      const notes = makeNotes(["1", "2", "3"]);
      const { result } = renderGrid(notes, DEFAULT_ROW_SIZE);

      const rows = result.current.noteRows;
      expect(rows).toHaveLength(1);
      expect(rows[0].notes).toHaveLength(3);
      expect(rows[0].emptySlots).toBe(0);
      expect(result.current.totalRows).toBe(1);
    });

    it("returns multiple row grid when notes span multiple rows", () => {
      const notes = makeNotes(["1", "2", "3", "4", "5"]);
      const { result } = renderGrid(notes, DEFAULT_ROW_SIZE);

      const rows = result.current.noteRows;
      expect(rows).toHaveLength(2);

      // First row
      expect(rows[0].notes).toHaveLength(3);
      expect(rows[0].emptySlots).toBe(0);

      // Second row
      expect(rows[1].notes).toHaveLength(2);
      expect(rows[1].emptySlots).toBe(1);

      expect(result.current.totalRows).toBe(2);
    });
  });

  describe("memoization", () => {
    it("returns same reference when re-rendering with same arguments", () => {
      const notes = makeNotes(["1", "2"]);
      const { result, rerender } = renderHook(({ n, r }) => useNoteGrid(n, r), {
        initialProps: { n: notes, r: DEFAULT_ROW_SIZE },
      });

      const first = result.current.noteRows;
      rerender({ n: notes, r: DEFAULT_ROW_SIZE });
      const second = result.current.noteRows;

      expect(first).toBe(second);
    });

    it("returns new reference when arguments change", () => {
      const notes1 = makeNotes(["1", "2"]);
      const notes2 = makeNotes(["3", "4"]);

      const { result, rerender } = renderHook(({ n, r }) => useNoteGrid(n, r), {
        initialProps: { n: notes1, r: DEFAULT_ROW_SIZE },
      });

      const first = result.current.noteRows;
      rerender({ n: notes2, r: DEFAULT_ROW_SIZE });
      const second = result.current.noteRows;

      expect(first).not.toBe(second);
    });
  });
});
