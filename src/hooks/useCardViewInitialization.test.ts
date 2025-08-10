import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type CardExplorerPlugin from "../main";
import { useCardViewInitialization } from "./useCardViewInitialization";

// Hoisted spies to match selector-based store usage
const h = vi.hoisted(() => ({
  initializeFromPluginDataSpy: vi.fn(),
  refreshNotesSpy: vi.fn(),
}));

vi.mock("../store/cardExplorerStore", () => {
  const store = {
    initializeFromPluginData: h.initializeFromPluginDataSpy,
    refreshNotes: h.refreshNotesSpy,
  };
  return {
    // Support both direct usage and selector usage
    useCardExplorerStore: (selector?: (s: typeof store) => unknown) =>
      typeof selector === "function" ? selector(store) : store,
  };
});

describe("useCardViewInitialization", () => {
  const mockPluginData = {
    pinnedNotes: ["note1.md", "note2.md"],
    version: "1.0.0",
  };

  const mockSettings = {
    sortKey: "updated",
    sortOrder: "desc",
    showPreview: true,
  };

  const mockPlugin = {
    app: {
      vault: {},
      metadataCache: {},
    },
    getData: vi.fn().mockReturnValue(mockPluginData),
    getSettings: vi.fn().mockReturnValue(mockSettings),
  } as unknown as CardExplorerPlugin;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should call initializeFromPluginData with plugin data and settings on mount", () => {
    renderHook(() => useCardViewInitialization(mockPlugin));

    expect(mockPlugin.getData).toHaveBeenCalledTimes(1);
    expect(mockPlugin.getSettings).toHaveBeenCalledTimes(1);
    expect(h.initializeFromPluginDataSpy).toHaveBeenCalledWith(mockPluginData, mockSettings);
  });

  it("should call refreshNotes with plugin.app on mount", () => {
    renderHook(() => useCardViewInitialization(mockPlugin));

    expect(h.refreshNotesSpy).toHaveBeenCalledWith(mockPlugin.app);
  });

  it("should re-initialize when plugin instance changes", () => {
    const { rerender } = renderHook(({ plugin }) => useCardViewInitialization(plugin), {
      initialProps: { plugin: mockPlugin },
    });

    // Initial calls
    expect(h.initializeFromPluginDataSpy).toHaveBeenCalledTimes(1);
    expect(h.refreshNotesSpy).toHaveBeenCalledTimes(1);

    // Create a new plugin instance
    const newApp = { vault: {}, metadataCache: {}, fileManager: {} };
    const newMockPlugin = {
      ...mockPlugin,
      app: newApp,
      getData: vi.fn().mockReturnValue({ ...mockPluginData, version: "2.0.0" }),
      getSettings: vi.fn().mockReturnValue({ ...mockSettings, sortKey: "title" }),
    } as unknown as CardExplorerPlugin;

    // Rerender with new plugin
    rerender({ plugin: newMockPlugin });

    // Should be called again with new plugin
    expect(h.initializeFromPluginDataSpy).toHaveBeenCalledTimes(2);
    expect(h.refreshNotesSpy).toHaveBeenCalledTimes(2);
    expect(h.initializeFromPluginDataSpy).toHaveBeenLastCalledWith(
      { ...mockPluginData, version: "2.0.0" },
      { ...mockSettings, sortKey: "title" }
    );
  });
});
