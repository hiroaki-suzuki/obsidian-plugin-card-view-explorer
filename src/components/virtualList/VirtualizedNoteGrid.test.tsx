import "@testing-library/jest-dom";
import { render } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GridRow } from "../../hooks/useNoteGrid";
import type CardExplorerPlugin from "../../main";
import type { NoteData } from "../../types";
import { VirtualizedNoteGrid } from "./VirtualizedNoteGrid";

// Mock for capturing Virtuoso props
let capturedVirtuosoProps: any = {};
let capturedRef: any = {};

// Mock react-virtuoso to capture props and actually use custom components
vi.mock("react-virtuoso", () => ({
  Virtuoso: React.forwardRef((props: any, ref: any) => {
    // Capture all props for testing
    capturedVirtuosoProps = { ...props };
    capturedRef = ref;

    // Actually use the provided components
    const ListComponent = props.components.List;
    const ItemComponent = props.components.Item;

    const mockListProps = {
      "data-testid": "virtuoso-list",
      style: { width: "100%", height: "100%" },
    };

    const listContent = Array.from({ length: Math.min(3, props.totalCount) }, (_, index) => {
      const content = props.itemContent?.(index);
      const mockItemProps = {
        "data-testid": `virtuoso-item-${index}`,
        style: { minHeight: "192px" },
      };

      return (
        // biome-ignore lint/suspicious/noArrayIndexKey: Using index for testing purposes
        <ItemComponent key={`item-${index}`} {...mockItemProps}>
          {content}
        </ItemComponent>
      );
    });

    return (
      <div data-testid="virtuoso-component">
        <ListComponent ref={vi.fn()} {...mockListProps}>
          {listContent}
        </ListComponent>
      </div>
    );
  }),
}));

// Mock NoteGridRow component
vi.mock("./NoteGridRow", () => ({
  NoteGridRow: ({ row, rowIndex }: { row: GridRow; rowIndex: number }) => (
    <div data-testid={`note-grid-row-${rowIndex}`}>
      {row.notes.map((note, noteIndex) => (
        <div key={note.path} data-testid={`note-${noteIndex}`}>
          {note.title}
        </div>
      ))}
    </div>
  ),
}));

// Helper function to create mock grid rows
const createMockGridRows = (noteCount: number, rowSize: number = 3): GridRow[] => {
  const notes = Array.from({ length: noteCount }, (_, i) =>
    createMockNote(i.toString(), `Note ${i + 1}`)
  );

  const rows: GridRow[] = [];
  for (let i = 0; i < notes.length; i += rowSize) {
    const rowNotes = notes.slice(i, i + rowSize);
    const emptySlots = Math.max(0, rowSize - rowNotes.length);
    rows.push({ notes: rowNotes, emptySlots });
  }

  return rows;
};

// Helper function to create mock note data
const createMockNote = (id: string, title: string): NoteData => ({
  file: { path: `/note${id}.md` } as any,
  title,
  path: `/note${id}.md`,
  preview: `Preview for ${title}`,
  lastModified: new Date(),
  frontmatter: null,
  tags: [],
  folder: "",
});

describe("VirtualizedNoteGrid", () => {
  const mockPlugin = {} as CardExplorerPlugin;
  const mockVirtuosoRef = { current: null };
  const mockContainerRef = { current: null };

  beforeEach(() => {
    vi.clearAllMocks();
    capturedVirtuosoProps = {};
  });

  describe("Virtuoso Props Validation", () => {
    it("should pass all expected props to Virtuoso", () => {
      const noteRows = createMockGridRows(10, 3); // 4 rows
      const totalRows = 4;

      render(
        <VirtualizedNoteGrid
          noteRows={noteRows}
          totalRows={totalRows}
          plugin={mockPlugin}
          virtuosoRef={mockVirtuosoRef}
          containerRef={mockContainerRef}
        />
      );

      expect(capturedVirtuosoProps.totalCount).toBe(totalRows);
      expect(capturedVirtuosoProps.overscan).toBe(5);
      expect(capturedVirtuosoProps.increaseViewportBy).toBe(200);
      expect(capturedVirtuosoProps.defaultItemHeight).toBe(192);
      expect(capturedVirtuosoProps.className).toBe("virtual-grid");
      expect(capturedVirtuosoProps.style).toEqual({ height: "100%" });
      expect(capturedVirtuosoProps.itemContent).toBeTypeOf("function");
      expect(capturedVirtuosoProps.components).toEqual({
        List: expect.any(Object),
        Item: expect.any(Function),
      });
      expect(capturedRef).toBe(mockVirtuosoRef);
    });

    it("should pass all expected props when totalRows is 0", () => {
      const noteRows: GridRow[] = [];
      const totalRows = 0;

      render(
        <VirtualizedNoteGrid
          noteRows={noteRows}
          totalRows={totalRows}
          plugin={mockPlugin}
          virtuosoRef={mockVirtuosoRef}
          containerRef={mockContainerRef}
        />
      );

      // Verify all expected props are still passed even with empty data
      expect(capturedVirtuosoProps.totalCount).toBe(0);
      expect(capturedVirtuosoProps.overscan).toBe(5);
      expect(capturedVirtuosoProps.increaseViewportBy).toBe(200);
      expect(capturedVirtuosoProps.defaultItemHeight).toBe(192);
      expect(capturedVirtuosoProps.className).toBe("virtual-grid");
      expect(capturedVirtuosoProps.style).toEqual({ height: "100%" });
      expect(capturedVirtuosoProps.itemContent).toBeTypeOf("function");
      expect(capturedVirtuosoProps.components).toEqual({
        List: expect.any(Object),
        Item: expect.any(Function),
      });
      expect(capturedRef).toBe(mockVirtuosoRef);
    });

    it("should pass all expected props with large dataset", () => {
      const noteRows = createMockGridRows(1000, 5); // 200 rows with 5 notes each
      const totalRows = 200;

      render(
        <VirtualizedNoteGrid
          noteRows={noteRows}
          totalRows={totalRows}
          plugin={mockPlugin}
          virtuosoRef={mockVirtuosoRef}
          containerRef={mockContainerRef}
        />
      );

      // Verify all expected props are correctly passed with large dataset
      expect(capturedVirtuosoProps.totalCount).toBe(totalRows);
      expect(capturedVirtuosoProps.overscan).toBe(5);
      expect(capturedVirtuosoProps.increaseViewportBy).toBe(200);
      expect(capturedVirtuosoProps.defaultItemHeight).toBe(192);
      expect(capturedVirtuosoProps.className).toBe("virtual-grid");
      expect(capturedVirtuosoProps.style).toEqual({ height: "100%" });
      expect(capturedVirtuosoProps.itemContent).toBeTypeOf("function");
      expect(capturedVirtuosoProps.components).toEqual({
        List: expect.any(Object),
        Item: expect.any(Function),
      });
      expect(capturedRef).toBe(mockVirtuosoRef);
    });

    it("should actually render using custom List and Item components", () => {
      const noteRows = createMockGridRows(6, 2); // 3 rows with 2 notes each
      const totalRows = 3;

      const { getByTestId, getAllByTestId } = render(
        <VirtualizedNoteGrid
          noteRows={noteRows}
          totalRows={totalRows}
          plugin={mockPlugin}
          virtuosoRef={mockVirtuosoRef}
          containerRef={mockContainerRef}
        />
      );

      // Verify that our mock actually uses the custom components
      expect(getByTestId("virtuoso-list")).toBeInTheDocument();
      expect(getByTestId("virtuoso-list")).toHaveClass("virtual-grid-list");

      // Verify Item components are rendered
      const items = getAllByTestId(/^virtuoso-item-/);
      expect(items).toHaveLength(3); // Should render 3 items (min of 3 and totalRows)

      // Each item should have the virtual-grid-row-wrapper class from our custom Item component
      items.forEach((item) => {
        expect(item).toHaveClass("virtual-grid-row-wrapper");
      });

      // Verify that the content (NoteGridRow) is rendered inside items
      expect(getByTestId("note-grid-row-0")).toBeInTheDocument();
      expect(getByTestId("note-grid-row-1")).toBeInTheDocument();
      expect(getByTestId("note-grid-row-2")).toBeInTheDocument();
    });
  });
});
