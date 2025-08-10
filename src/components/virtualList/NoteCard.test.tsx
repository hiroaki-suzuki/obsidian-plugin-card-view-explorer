import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorCategory, handleError } from "../../core/errors/errorHandling";
import type CardExplorerPlugin from "../../main";
import * as Store from "../../store/cardExplorerStore";
import type { NoteData } from "../../types";
import { NoteCard } from "./NoteCard";

// Do not statically mock the store module to avoid leaking to other suites

// Mock only handleError while preserving actual ErrorCategory and other exports
vi.mock("../../core/errors/errorHandling", async () => {
  const actual = await vi.importActual<typeof import("../../core/errors/errorHandling")>(
    "../../core/errors/errorHandling"
  );
  return {
    ...actual,
    handleError: vi.fn(),
  };
});

const mockTogglePin = vi.fn();

const makeNote = (overrides: Partial<NoteData> = {}): NoteData => ({
  file: {
    path: "test-note.md",
    name: "test-note.md",
    basename: "test-note",
  } as any,
  title: "Test Note",
  path: "test-note.md",
  preview: "This is a test note\nwith multiple lines\nof content",
  lastModified: new Date("2024-01-15T10:30:00Z"),
  frontmatter: { updated: "2024-01-15" },
  tags: ["test", "example"],
  folder: "Notes",
  ...overrides,
});

const makePlugin = (openFile: (...args: any[]) => any = vi.fn()): CardExplorerPlugin =>
  ({
    app: {
      workspace: {
        getLeaf: vi.fn(() => ({ openFile })),
      },
    },
  }) as unknown as CardExplorerPlugin;

// Support components that use subscribeWithSelector-style selectors
const mockStore = (overrides?: {
  pinnedNotes?: Set<string>;
  togglePin?: (...args: any[]) => any;
}) => {
  const baseState = {
    pinnedNotes: new Set<string>(),
    togglePin: mockTogglePin,
  };
  const state = { ...baseState, ...(overrides ?? {}) } as const;

  return vi.spyOn(Store, "useCardExplorerStore").mockImplementation(((selector?: any) => {
    if (typeof selector === "function") {
      return selector(state);
    }
    // Fallback for usages that read the whole store
    return state;
  }) as any);
};

const setupNoteCard = (note: NoteData, plugin: CardExplorerPlugin) => {
  const utils = render(<NoteCard note={note} plugin={plugin} />);
  const user = userEvent.setup();
  const getOpenButton = () => utils.getByRole("button", { name: /Open note/i });
  const getPinButton = () => utils.getByRole("button", { name: /Pin note|Unpin note/i });

  return { ...utils, user, getOpenButton, getPinButton };
};

describe("NoteCard", () => {
  const baseNote = makeNote();

  beforeEach(() => {
    vi.clearAllMocks();
    mockStore({ togglePin: mockTogglePin });
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Rendering", () => {
    it("shows title, preview, folder and pin button", () => {
      render(<NoteCard note={baseNote} plugin={makePlugin()} />);

      expect(screen.getByText("Test Note")).toBeInTheDocument();
      expect(screen.getByText(/This is a test note/)).toBeInTheDocument();
      expect(screen.getByText("Notes")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Pin note" })).toBeInTheDocument();
    });

    it("omits folder when not provided", () => {
      const noteWithoutFolder = makeNote({ folder: "" });
      render(<NoteCard note={noteWithoutFolder} plugin={makePlugin()} />);

      expect(screen.getByText("Test Note")).toBeInTheDocument();
      expect(screen.queryByText("Notes")).not.toBeInTheDocument();
    });

    it("renders pinned state", () => {
      mockStore({ pinnedNotes: new Set([baseNote.path]), togglePin: mockTogglePin } as any);
      render(<NoteCard note={baseNote} plugin={makePlugin()} />);
      expect(screen.getByRole("button", { name: "Unpin note" })).toBeInTheDocument();
    });

    it("shows long text in tooltip", () => {
      const longNote = makeNote({
        title: "This is a very long note title that should appear in full in tooltip",
        preview:
          "This is a very long preview text that might be truncated in the card but shown in tooltip",
      });

      render(<NoteCard note={longNote} plugin={makePlugin()} />);

      expect(screen.getByText(longNote.title)).toHaveAttribute("title", longNote.title);
      expect(screen.getByText(longNote.preview)).toHaveAttribute("title", longNote.preview);
    });
  });

  describe("Interactions", () => {
    it.each([
      {
        name: "click",
        trigger: async ({ user, getOpenButton }: any) => user.click(getOpenButton()),
      },
      {
        name: "keyboard Enter",
        trigger: async ({ user, getOpenButton }: any) => {
          const btn = getOpenButton();
          btn.focus();
          await user.keyboard("{Enter}");
        },
      },
      {
        name: "keyboard Space",
        trigger: async ({ user, getOpenButton }: any) => {
          const btn = getOpenButton();
          btn.focus();
          await user.keyboard("{Space}");
        },
      },
    ])("opens file via %s", async ({ trigger }) => {
      const note = makeNote();
      const openFile = vi.fn();
      const plugin = makePlugin(openFile);

      const ctx = setupNoteCard(note, plugin);
      await trigger(ctx);

      expect(openFile).toHaveBeenCalledWith(note.file);
    });

    // Covered by parameterized test above

    it("ignores other keys", async () => {
      const openFile = vi.fn();
      const keyboardPlugin = makePlugin(openFile);

      render(<NoteCard note={baseNote} plugin={keyboardPlugin} />);
      const card = screen.getByRole("button", { name: /Open note/ });

      card.focus();
      const user = userEvent.setup();
      await user.keyboard("a{Tab}{Escape}");

      expect(openFile).not.toHaveBeenCalled();
    });

    it("toggles pin without opening note", async () => {
      const note = makeNote();
      const openFile = vi.fn();
      const plugin = makePlugin(openFile);
      mockStore({ togglePin: mockTogglePin } as any);

      const { user, getPinButton } = setupNoteCard(note, plugin);
      await user.click(getPinButton());

      expect(mockTogglePin).toHaveBeenCalledWith(note.path);
      expect(openFile).not.toHaveBeenCalled();
    });

    it.each([
      { name: "Enter", seq: "{Enter}" },
      { name: "Space", seq: "[Space]" },
    ])("toggles pin via keyboard %s without opening note", async ({ seq }) => {
      const note = makeNote();
      const openFile = vi.fn();
      const plugin = makePlugin(openFile);
      mockStore({ togglePin: mockTogglePin } as any);

      render(<NoteCard note={note} plugin={plugin} />);
      const pinButton = screen.getByRole("button", { name: /Pin note|Unpin note/ });

      pinButton.focus();
      const user = userEvent.setup();
      await user.keyboard(seq);

      expect(mockTogglePin).toHaveBeenCalledWith(note.path);
      expect(openFile).not.toHaveBeenCalled();
    });

    it("ignores other keys on pin button", async () => {
      const note = makeNote();
      const openFile = vi.fn();
      const plugin = makePlugin(openFile);
      mockStore({ togglePin: mockTogglePin } as any);

      render(<NoteCard note={note} plugin={plugin} />);
      const pinButton = screen.getByRole("button", { name: /Pin note|Unpin note/ });

      pinButton.focus();
      const user = userEvent.setup();
      await user.keyboard("a{Tab}{Escape}");

      expect(mockTogglePin).not.toHaveBeenCalled();
      expect(openFile).not.toHaveBeenCalled();
    });
  });

  describe("Tags", () => {
    it.each([
      { tags: ["tag1"], shown: ["#tag1"], overflow: null },
      { tags: ["tag1", "tag2", "tag3"], shown: ["#tag1", "#tag2", "#tag3"], overflow: null },
      {
        tags: ["tag1", "tag2", "tag3", "tag4"],
        shown: ["#tag1", "#tag2", "#tag3"],
        overflow: "+1",
      },
      {
        tags: ["tag1", "tag2", "tag3", "tag4", "tag5"],
        shown: ["#tag1", "#tag2", "#tag3"],
        overflow: "+2",
      },
    ])("renders tags correctly: %o", ({ tags, shown, overflow }) => {
      const note = makeNote({ tags });
      const plugin = makePlugin();
      const { getByText, queryByText } = setupNoteCard(note, plugin);

      shown.forEach((t) => expect(getByText(t)).toBeInTheDocument());
      if (overflow) expect(getByText(overflow)).toBeInTheDocument();
      else expect(queryByText(/\+\d+/)).not.toBeInTheDocument();
    });
  });

  describe("Dates", () => {
    const FIXED_NOW = new Date("2024-05-01T10:30:00Z");

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(FIXED_NOW);
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("shows time for today's notes", () => {
      const today = makeNote({ lastModified: FIXED_NOW, frontmatter: null });
      render(<NoteCard note={today} plugin={makePlugin()} />);

      const timeRegex = /\d{1,2}:\d{2}/;
      expect(screen.getByText(timeRegex)).toBeInTheDocument();
    });

    it.each([
      {
        name: "uses frontmatter date with tooltip",
        note: makeNote({ frontmatter: { updated: "2024-01-15" } }),
        expectTitle: new Date("2024-01-15T00:00:00Z").toLocaleString(),
      },
      {
        name: "falls back to lastModified when frontmatter invalid",
        note: makeNote({ frontmatter: { updated: "invalid" }, lastModified: FIXED_NOW }),
        expectTitle: FIXED_NOW.toLocaleString(),
      },
      {
        name: "handles invalid lastModified",
        note: makeNote({ lastModified: new Date("invalid"), frontmatter: null }),
        expectText: "Invalid date",
      },
    ])("$name", ({ note, expectTitle, expectText }) => {
      render(<NoteCard note={note} plugin={makePlugin()} />);
      if (expectTitle) expect(screen.getByTitle(expectTitle)).toBeInTheDocument();
      if (expectText) expect(screen.getByText(expectText)).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("has expected ARIA attributes", () => {
      render(<NoteCard note={baseNote} plugin={makePlugin()} />);

      const card = screen.getByRole("button", { name: /Open note/ });
      expect(card).toHaveAttribute("tabindex", "0");
      expect(card).toHaveAttribute("aria-label", "Open note: Test Note");
      expect(screen.getByRole("button", { name: "Pin note" })).toHaveAttribute(
        "aria-label",
        "Pin note"
      );
    });
  });

  describe("Error handling", () => {
    it("handles openFile errors", async () => {
      const openFile = vi.fn(() => {
        throw new Error("Failed to open file");
      });
      const errorPlugin = makePlugin(openFile);
      const note = makeNote();
      const { user, getOpenButton } = setupNoteCard(note, errorPlugin);
      await user.click(getOpenButton());

      expect(openFile).toHaveBeenCalledWith(note.file);
      expect(handleError).toHaveBeenCalledTimes(1);
      expect(handleError).toHaveBeenCalledWith(
        expect.any(Error),
        ErrorCategory.API,
        expect.objectContaining({
          operation: "openFile",
          notePath: note.path,
          noteTitle: note.title,
        })
      );
    });

    it("handles keyboard errors", async () => {
      const openFile = vi.fn(() => {
        throw new Error("Failed to open file via keyboard");
      });
      const errorPlugin = makePlugin(openFile);
      const note = makeNote();

      render(<NoteCard note={note} plugin={errorPlugin} />);
      const card = screen.getByRole("button", { name: /Open note/ });
      card.focus();
      const user = userEvent.setup();
      await user.keyboard("{Enter}");

      expect(openFile).toHaveBeenCalledWith(note.file);
      expect(handleError).toHaveBeenCalledTimes(1);
      expect(handleError).toHaveBeenCalledWith(
        expect.any(Error),
        ErrorCategory.API,
        expect.objectContaining({
          operation: "openFile",
          notePath: note.path,
          noteTitle: note.title,
        })
      );
    });
  });
});
