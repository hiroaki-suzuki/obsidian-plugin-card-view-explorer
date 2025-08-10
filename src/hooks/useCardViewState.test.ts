import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCardViewState } from "./useCardViewState";

// Mock the store
vi.mock("../store/cardExplorerStore", () => ({
  useCardExplorerStore: vi.fn(),
}));

import { useCardExplorerStore } from "../store/cardExplorerStore";

const mockUseCardExplorerStore = vi.mocked(useCardExplorerStore);

describe("useCardViewState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("shouldShowError", () => {
    it("should return true when error exists and not loading", () => {
      mockUseCardExplorerStore.mockReturnValue({
        error: "Test error",
        isLoading: false,
        notes: [],
      });

      const { result } = renderHook(() => useCardViewState());

      expect(result.current.shouldShowError).toBe(true);
    });

    it("should return false when error exists but is loading", () => {
      mockUseCardExplorerStore.mockReturnValue({
        error: "Test error",
        isLoading: true,
        notes: [],
      });

      const { result } = renderHook(() => useCardViewState());

      expect(result.current.shouldShowError).toBe(false);
    });

    it("should return false when no error", () => {
      mockUseCardExplorerStore.mockReturnValue({
        error: null,
        isLoading: false,
        notes: [],
      });

      const { result } = renderHook(() => useCardViewState());

      expect(result.current.shouldShowError).toBe(false);
    });
  });

  describe("shouldShowFullPageLoading", () => {
    it("should return true when loading and no notes", () => {
      mockUseCardExplorerStore.mockReturnValue({
        error: null,
        isLoading: true,
        notes: [],
      });

      const { result } = renderHook(() => useCardViewState());

      expect(result.current.shouldShowFullPageLoading).toBe(true);
    });

    it("should return false when loading but notes exist", () => {
      mockUseCardExplorerStore.mockReturnValue({
        error: null,
        isLoading: true,
        notes: [{ path: "test.md" }],
      });

      const { result } = renderHook(() => useCardViewState());

      expect(result.current.shouldShowFullPageLoading).toBe(false);
    });

    it("should return false when not loading", () => {
      mockUseCardExplorerStore.mockReturnValue({
        error: null,
        isLoading: false,
        notes: [],
      });

      const { result } = renderHook(() => useCardViewState());

      expect(result.current.shouldShowFullPageLoading).toBe(false);
    });
  });

  describe("shouldShowLoadingOverlay", () => {
    it("should return true when loading and notes exist", () => {
      mockUseCardExplorerStore.mockReturnValue({
        error: null,
        isLoading: true,
        notes: [{ path: "test.md" }],
      });

      const { result } = renderHook(() => useCardViewState());

      expect(result.current.shouldShowLoadingOverlay).toBe(true);
    });

    it("should return false when loading but no notes", () => {
      mockUseCardExplorerStore.mockReturnValue({
        error: null,
        isLoading: true,
        notes: [],
      });

      const { result } = renderHook(() => useCardViewState());

      expect(result.current.shouldShowLoadingOverlay).toBe(false);
    });

    it("should return false when not loading", () => {
      mockUseCardExplorerStore.mockReturnValue({
        error: null,
        isLoading: false,
        notes: [{ path: "test.md" }],
      });

      const { result } = renderHook(() => useCardViewState());

      expect(result.current.shouldShowLoadingOverlay).toBe(false);
    });
  });

  describe("canShowMainContent", () => {
    it("should return true when no error and not full page loading", () => {
      mockUseCardExplorerStore.mockReturnValue({
        error: null,
        isLoading: false,
        notes: [{ path: "test.md" }],
      });

      const { result } = renderHook(() => useCardViewState());

      expect(result.current.canShowMainContent).toBe(true);
    });

    it("should return true when loading overlay should show", () => {
      mockUseCardExplorerStore.mockReturnValue({
        error: null,
        isLoading: true,
        notes: [{ path: "test.md" }],
      });

      const { result } = renderHook(() => useCardViewState());

      expect(result.current.canShowMainContent).toBe(true);
    });

    it("should return false when error should show", () => {
      mockUseCardExplorerStore.mockReturnValue({
        error: "Test error",
        isLoading: false,
        notes: [],
      });

      const { result } = renderHook(() => useCardViewState());

      expect(result.current.canShowMainContent).toBe(false);
    });

    it("should return false when full page loading should show", () => {
      mockUseCardExplorerStore.mockReturnValue({
        error: null,
        isLoading: true,
        notes: [],
      });

      const { result } = renderHook(() => useCardViewState());

      expect(result.current.canShowMainContent).toBe(false);
    });
  });

  describe("returned values", () => {
    it("should return all store values and computed states", () => {
      const mockStoreValues = {
        error: "Test error",
        isLoading: true,
        notes: [{ path: "test1.md" }, { path: "test2.md" }],
      };

      mockUseCardExplorerStore.mockReturnValue(mockStoreValues);

      const { result } = renderHook(() => useCardViewState());

      expect(result.current.error).toBe(mockStoreValues.error);
      expect(result.current.isLoading).toBe(mockStoreValues.isLoading);
      expect(result.current.notes).toBe(mockStoreValues.notes);
      expect(result.current.shouldShowError).toBeDefined();
      expect(result.current.shouldShowFullPageLoading).toBeDefined();
      expect(result.current.shouldShowLoadingOverlay).toBeDefined();
      expect(result.current.canShowMainContent).toBeDefined();
    });
  });

  describe("comprehensive state combination patterns", () => {
    const testCases = [
      {
        name: "idle state with no data",
        input: { error: null, isLoading: false, notes: [] },
        expected: {
          shouldShowError: false,
          shouldShowFullPageLoading: false,
          shouldShowLoadingOverlay: false,
          canShowMainContent: true,
        },
      },
      {
        name: "initial loading with no data",
        input: { error: null, isLoading: true, notes: [] },
        expected: {
          shouldShowError: false,
          shouldShowFullPageLoading: true,
          shouldShowLoadingOverlay: false,
          canShowMainContent: false,
        },
      },
      {
        name: "refresh loading with existing data",
        input: { error: null, isLoading: true, notes: [{ path: "test.md" }] },
        expected: {
          shouldShowError: false,
          shouldShowFullPageLoading: false,
          shouldShowLoadingOverlay: true,
          canShowMainContent: true,
        },
      },
      {
        name: "error state with data",
        input: { error: "Network error", isLoading: false, notes: [{ path: "test.md" }] },
        expected: {
          shouldShowError: true,
          shouldShowFullPageLoading: false,
          shouldShowLoadingOverlay: false,
          canShowMainContent: false,
        },
      },
      {
        name: "error during loading - error should be hidden",
        input: { error: "Network error", isLoading: true, notes: [{ path: "test.md" }] },
        expected: {
          shouldShowError: false,
          shouldShowFullPageLoading: false,
          shouldShowLoadingOverlay: true,
          canShowMainContent: true,
        },
      },
      {
        name: "successful state with data",
        input: { error: null, isLoading: false, notes: [{ path: "test.md" }] },
        expected: {
          shouldShowError: false,
          shouldShowFullPageLoading: false,
          shouldShowLoadingOverlay: false,
          canShowMainContent: true,
        },
      },
      {
        name: "error during initial loading",
        input: { error: "Load failed", isLoading: true, notes: [] },
        expected: {
          shouldShowError: false,
          shouldShowFullPageLoading: true,
          shouldShowLoadingOverlay: false,
          canShowMainContent: false,
        },
      },
    ];

    testCases.forEach(({ name, input, expected }) => {
      it(name, () => {
        mockUseCardExplorerStore.mockReturnValue(input);

        const { result } = renderHook(() => useCardViewState());

        expect(result.current.shouldShowError).toBe(expected.shouldShowError);
        expect(result.current.shouldShowFullPageLoading).toBe(expected.shouldShowFullPageLoading);
        expect(result.current.shouldShowLoadingOverlay).toBe(expected.shouldShowLoadingOverlay);
        expect(result.current.canShowMainContent).toBe(expected.canShowMainContent);
      });
    });
  });
});
