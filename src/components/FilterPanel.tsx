import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { toggleInArray } from "../lib/array";
import { parseDateFilter } from "../lib/dateUtils";
import { useCardExplorerStore } from "../store/cardExplorerStore";

/**
 * Props for the `FilterPanel` component.
 *
 * - The component does not derive these values itself; callers should provide the
 *   current set of available tags and folders (typically computed from the current vault/index).
 * - Selected filter state is sourced from and written to the global card explorer store.
 */
interface FilterPanelProps {
  /** Distinct list of tag names that can be filtered against. */
  availableTags: string[];
  /** Distinct list of folder paths ("" represents the vault root). */
  availableFolders: string[];
}

/**
 * FilterPanel
 *
 * Provides interactive controls to filter card results by filename, date, tags, and folders.
 *
 * Design notes:
 * - Single source of truth: Reads and writes filter state via `useCardExplorerStore` so other
 *   components react to changes consistently.
 * - Input hygiene: Filename updates are debounced to avoid frequent store updates and expensive
 *   downstream recomputations while the user is typing.
 * - Date validation: Date inputs are parsed through `parseDateFilter` and only committed when valid
 *   to keep the store free from invalid or partial values.
 * - Stable options: Available tags/folders are memoized and sorted to produce predictable rendering
 *   and checkbox order independent of incoming array order.
 */
export const FilterPanel: React.FC<FilterPanelProps> = ({ availableTags, availableFolders }) => {
  const { filters, updateFilters, clearFilters, hasActiveFilters } = useCardExplorerStore();

  const [dateInput, setDateInput] = useState("");
  const [dateType, setDateType] = useState<"within" | "after">("within");

  // Sort once per input-change to keep checkbox order stable across renders.
  const sortedTags = useMemo(() => [...availableTags].sort(), [availableTags]);
  const sortedFolders = useMemo(() => [...availableFolders].sort(), [availableFolders]);

  // Debounce filename input to limit store updates while typing.
  const [filenameInput, setFilenameInput] = useState(filters.filename);
  const debouncedFilename = useDebouncedValue(filenameInput, 200);
  // Track initial mount to avoid dispatching a redundant update on first render
  // (we hydrate local state from the store, then begin debounced updates).
  const isInitialRender = useRef(true);

  const handleFolderChange = useCallback(
    (selectedFolders: string[]) => {
      updateFilters({ folders: selectedFolders });
    },
    [updateFilters]
  );

  const handleTagChange = useCallback(
    (selectedTags: string[]) => {
      updateFilters({ tags: selectedTags });
    },
    [updateFilters]
  );

  const toggleFolder = useCallback(
    (folder: string) => {
      const newFolders = toggleInArray(filters.folders, folder);
      handleFolderChange(newFolders);
    },
    [filters.folders, handleFolderChange]
  );

  const toggleTag = useCallback(
    (tag: string) => {
      const newTags = toggleInArray(filters.tags, tag);
      handleTagChange(newTags);
    },
    [filters.tags, handleTagChange]
  );

  const handleDateTypeChange = useCallback(
    (newDateType: "within" | "after") => {
      setDateType(newDateType);

      // If the user already entered a value, re-parse and apply it using the new type.
      // This avoids leaving the store with an outdated interpretation (e.g., number vs date).
      if (dateInput.trim()) {
        const dateValue = parseDateFilter(newDateType, dateInput);
        if (dateValue) {
          updateFilters({
            dateRange: {
              type: newDateType,
              value: dateValue,
            },
          });
        }
      }
    },
    [dateInput, updateFilters]
  );

  const handleDateInputChange = useCallback(
    (value: string) => {
      setDateInput(value);

      // Clear the date filter when the input becomes empty to avoid stale constraints.
      if (!value.trim()) {
        updateFilters({ dateRange: null });
        return;
      }

      // Only commit to the store when the input can be parsed into a valid date constraint.
      const dateValue = parseDateFilter(dateType, value);
      if (dateValue) {
        updateFilters({
          dateRange: {
            type: dateType,
            value: dateValue,
          },
        });
      }
    },
    [dateType, updateFilters]
  );

  useEffect(() => {
    if (!filters.dateRange) {
      setDateInput("");
      setDateType("within");
      return;
    }
    setDateType(filters.dateRange.type);
  }, [filters.dateRange]);

  useEffect(() => {
    setFilenameInput(filters.filename);
  }, [filters.filename]);

  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    // Only push a change when the debounced value actually differs from the store value.
    // This keeps the store as the canonical source and prevents unnecessary re-renders.
    if (debouncedFilename !== filters.filename) {
      updateFilters({ filename: debouncedFilename });
    }
  }, [debouncedFilename, filters.filename, updateFilters]);

  return (
    <div className="filter-panel">
      <div className="filter-panel-header">
        <h3>Filters</h3>
        {hasActiveFilters() && (
          <button
            type="button"
            className="clear-filters-btn"
            onClick={clearFilters}
            title="Clear all filters"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="filter-group">
        <h4>
          <label htmlFor="filter-filename">Filename:</label>
        </h4>
        <input
          id="filter-filename"
          type="text"
          value={filenameInput}
          onChange={(e) => setFilenameInput(e.target.value)}
          placeholder="Type to search filename"
          className="filter-input"
        />
      </div>

      <div className="filter-group">
        <h4>
          <label htmlFor="filter-date">Date:</label>
        </h4>
        <div className="date-filter-container">
          <select
            value={dateType}
            onChange={(e) => handleDateTypeChange(e.target.value as "within" | "after")}
            className="date-type-select"
            title="Date filter type"
          >
            <option value="within">Within last</option>
            <option value="after">After date</option>
          </select>

          <input
            id="filter-date"
            type={dateType === "within" ? "number" : "date"}
            value={dateInput}
            onChange={(e) => handleDateInputChange(e.target.value)}
            placeholder={dateType === "within" ? "days" : ""}
            min={dateType === "within" ? "1" : undefined}
            className="date-input"
          />

          {dateType === "within" && <span className="date-unit">days</span>}
        </div>
      </div>

      <div className="filter-group">
        <h4>Tags:</h4>
        <div className="multi-select-container">
          {sortedTags.length === 0 ? (
            <div className="no-options">No tags available</div>
          ) : (
            <div className="multi-select-options">
              {sortedTags.map((tag) => (
                <label key={tag} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={filters.tags.includes(tag)}
                    onChange={() => toggleTag(tag)}
                  />
                  <span className="tag-name">{tag}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="filter-group">
        <h4>Folders:</h4>
        <div className="multi-select-container">
          {sortedFolders.length === 0 ? (
            <div className="no-options">No folders available</div>
          ) : (
            <div className="multi-select-options">
              {sortedFolders.map((folder) => (
                <label key={folder} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={filters.folders.includes(folder)}
                    onChange={() => toggleFolder(folder)}
                  />
                  <span className="folder-name">{folder || "(Root)"}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
