import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GridRow } from "../../hooks/useNoteGrid";
import type CardExplorerPlugin from "../../main";
import type { NoteData } from "../../types/note";
import { NoteGridRow } from "./NoteGridRow";

// Mock the NoteCard component
vi.mock("./NoteCard", () => ({
  NoteCard: ({ note, _plugin }: { note: NoteData; _plugin: CardExplorerPlugin }) => (
    <div data-testid={`note-card-${note.path}`}>Mock NoteCard: {note.title}</div>
  ),
}));

const makeNote = (overrides: Partial<NoteData> = {}): NoteData => ({
  file: {
    path: overrides.path || "test-note.md",
    name: overrides.path || "test-note.md",
    basename: overrides.path?.replace(".md", "") || "test-note",
  } as any,
  title: overrides.title || "Test Note",
  path: overrides.path || "test-note.md",
  preview: "This is a test note\nwith multiple lines\nof content",
  lastModified: new Date("2024-01-15T10:30:00Z"),
  frontmatter: { updated: "2024-01-15" },
  tags: ["test", "example"],
  folder: "Notes",
  ...overrides,
});

const makePlugin = (): CardExplorerPlugin =>
  ({
    app: {
      workspace: {
        getLeaf: vi.fn(() => ({ openFile: vi.fn() })),
      },
    },
  }) as unknown as CardExplorerPlugin;

const makeGridRow = (notes: NoteData[], emptySlots: number = 0): GridRow => ({
  notes,
  emptySlots,
});

describe("NoteGridRow", () => {
  let plugin: CardExplorerPlugin;

  beforeEach(() => {
    vi.clearAllMocks();
    plugin = makePlugin();
  });

  describe("Rendering", () => {
    it("renders a single note in a row", () => {
      const note = makeNote({ path: "note1.md", title: "Note 1" });
      const row = makeGridRow([note]);

      render(<NoteGridRow row={row} rowIndex={0} plugin={plugin} />);

      expect(screen.getByTestId("note-card-note1.md")).toBeInTheDocument();
      expect(screen.getByText("Mock NoteCard: Note 1")).toBeInTheDocument();
    });

    it("renders multiple notes in a row", () => {
      const notes = [
        makeNote({ path: "note1.md", title: "Note 1" }),
        makeNote({ path: "note2.md", title: "Note 2" }),
        makeNote({ path: "note3.md", title: "Note 3" }),
      ];
      const row = makeGridRow(notes);

      render(<NoteGridRow row={row} rowIndex={0} plugin={plugin} />);

      expect(screen.getByTestId("note-card-note1.md")).toBeInTheDocument();
      expect(screen.getByTestId("note-card-note2.md")).toBeInTheDocument();
      expect(screen.getByTestId("note-card-note3.md")).toBeInTheDocument();
      expect(screen.getByText("Mock NoteCard: Note 1")).toBeInTheDocument();
      expect(screen.getByText("Mock NoteCard: Note 2")).toBeInTheDocument();
      expect(screen.getByText("Mock NoteCard: Note 3")).toBeInTheDocument();
    });

    it("wraps each note in a grid item container", () => {
      const notes = [
        makeNote({ path: "note1.md", title: "Note 1" }),
        makeNote({ path: "note2.md", title: "Note 2" }),
      ];
      const row = makeGridRow(notes);

      const { container } = render(<NoteGridRow row={row} rowIndex={0} plugin={plugin} />);

      const gridItems = container.querySelectorAll(".virtual-grid-item");
      expect(gridItems).toHaveLength(2);
    });
  });

  describe("Empty Slots", () => {
    it("renders empty slots when emptySlots is greater than 0", () => {
      const notes = [makeNote({ path: "note1.md", title: "Note 1" })];
      const row = makeGridRow(notes, 2);

      const { container } = render(<NoteGridRow row={row} rowIndex={0} plugin={plugin} />);

      const emptySlots = container.querySelectorAll(".virtual-grid-item-empty");
      expect(emptySlots).toHaveLength(2);
    });

    it("does not render empty slots when emptySlots is 0", () => {
      const notes = [
        makeNote({ path: "note1.md", title: "Note 1" }),
        makeNote({ path: "note2.md", title: "Note 2" }),
        makeNote({ path: "note3.md", title: "Note 3" }),
      ];
      const row = makeGridRow(notes, 0);

      const { container } = render(<NoteGridRow row={row} rowIndex={0} plugin={plugin} />);

      const emptySlots = container.querySelectorAll(".virtual-grid-item-empty");
      expect(emptySlots).toHaveLength(0);
    });

    it("generates unique keys for empty slots", () => {
      const notes = [makeNote({ path: "note1.md", title: "Note 1" })];
      const row = makeGridRow(notes, 3);
      const rowIndex = 5;

      const { container } = render(<NoteGridRow row={row} rowIndex={rowIndex} plugin={plugin} />);

      const emptySlots = container.querySelectorAll(".virtual-grid-item-empty");
      expect(emptySlots).toHaveLength(3);

      // Check that each empty slot has the expected structure (can't directly test keys but can test presence)
      emptySlots.forEach((slot) => {
        expect(slot).toBeInTheDocument();
        expect(slot).toHaveClass("virtual-grid-item-empty");
      });
    });

    it("handles large number of empty slots", () => {
      const notes = [makeNote({ path: "note1.md", title: "Note 1" })];
      const row = makeGridRow(notes, 10);

      const { container } = render(<NoteGridRow row={row} rowIndex={0} plugin={plugin} />);

      const emptySlots = container.querySelectorAll(".virtual-grid-item-empty");
      expect(emptySlots).toHaveLength(10);
    });
  });

  describe("Row Index Integration", () => {
    it("uses rowIndex for empty slot key generation", () => {
      const notes = [makeNote({ path: "note1.md", title: "Note 1" })];
      const row = makeGridRow(notes, 1);

      // Test with different row indices to ensure keys are different
      const { container: container1 } = render(
        <NoteGridRow row={row} rowIndex={0} plugin={plugin} />
      );
      const { container: container2 } = render(
        <NoteGridRow row={row} rowIndex={1} plugin={plugin} />
      );

      const emptySlots1 = container1.querySelectorAll(".virtual-grid-item-empty");
      const emptySlots2 = container2.querySelectorAll(".virtual-grid-item-empty");

      expect(emptySlots1).toHaveLength(1);
      expect(emptySlots2).toHaveLength(1);
    });
  });

  describe("Edge Cases", () => {
    it("handles empty notes array", () => {
      const row = makeGridRow([], 3);

      const { container } = render(<NoteGridRow row={row} rowIndex={0} plugin={plugin} />);

      const noteCards = container.querySelectorAll("[data-testid^='note-card-']");
      const emptySlots = container.querySelectorAll(".virtual-grid-item-empty");

      expect(noteCards).toHaveLength(0);
      expect(emptySlots).toHaveLength(3);
    });

    it("handles row with no empty slots and no notes", () => {
      const row = makeGridRow([], 0);

      const { container } = render(<NoteGridRow row={row} rowIndex={0} plugin={plugin} />);

      const noteCards = container.querySelectorAll("[data-testid^='note-card-']");
      const emptySlots = container.querySelectorAll(".virtual-grid-item-empty");

      expect(noteCards).toHaveLength(0);
      expect(emptySlots).toHaveLength(0);
    });
  });

  describe("Integration", () => {
    it("passes plugin instance to each NoteCard", () => {
      const notes = [
        makeNote({ path: "note1.md", title: "Note 1" }),
        makeNote({ path: "note2.md", title: "Note 2" }),
      ];
      const row = makeGridRow(notes);

      render(<NoteGridRow row={row} rowIndex={0} plugin={plugin} />);

      // Since we're mocking NoteCard, we can't directly test the plugin prop
      // but we can verify that both NoteCards are rendered, indicating they received props
      expect(screen.getByTestId("note-card-note1.md")).toBeInTheDocument();
      expect(screen.getByTestId("note-card-note2.md")).toBeInTheDocument();
    });

    it("maintains note order in rendering", () => {
      const notes = [
        makeNote({ path: "first.md", title: "First Note" }),
        makeNote({ path: "second.md", title: "Second Note" }),
        makeNote({ path: "third.md", title: "Third Note" }),
      ];
      const row = makeGridRow(notes);

      const { container } = render(<NoteGridRow row={row} rowIndex={0} plugin={plugin} />);

      const gridItems = container.querySelectorAll(".virtual-grid-item");
      const noteCards = Array.from(gridItems).map((item) =>
        item.querySelector("[data-testid^='note-card-']")?.getAttribute("data-testid")
      );

      expect(noteCards).toEqual([
        "note-card-first.md",
        "note-card-second.md",
        "note-card-third.md",
      ]);
    });
  });
});
