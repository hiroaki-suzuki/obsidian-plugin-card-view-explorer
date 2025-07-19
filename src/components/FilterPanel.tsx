import type React from "react";
import { useCallback, useState } from "react";
import { useCardExplorerStore } from "../store/cardExplorerStore";

interface FilterPanelProps {
  /** Available tags from all notes for tag filter dropdown */
  availableTags: string[];
  /** Available folders from all notes for folder filter dropdown */
  availableFolders: string[];
}

/**
 * FilterPanel Component
 *
 * Provides comprehensive filtering controls for the Card Explorer:
 * - Filename search with partial matching
 * - Multi-select folder filtering
 * - Tag filtering with available tags
 * - Date range filtering (within X days or after specific date)
 * - Clear filters functionality
 *
 * Integrates with Zustand store for filter state management.
 */
export const FilterPanel: React.FC<FilterPanelProps> = ({ availableTags, availableFolders }) => {
  const { filters, updateFilters, clearFilters } = useCardExplorerStore();

  // Local state for date filter input
  const [dateInput, setDateInput] = useState("");
  const [dateType, setDateType] = useState<"within" | "after">("within");

  /**
   * Handle filename search input changes
   */
  const handleFilenameChange = useCallback(
    (value: string) => {
      updateFilters({ filename: value });
    },
    [updateFilters]
  );

  /**
   * Handle folder selection changes (multi-select)
   */
  const handleFolderChange = useCallback(
    (selectedFolders: string[]) => {
      updateFilters({ folders: selectedFolders });
    },
    [updateFilters]
  );

  /**
   * Handle tag selection changes (multi-select)
   */
  const handleTagChange = useCallback(
    (selectedTags: string[]) => {
      updateFilters({ tags: selectedTags });
    },
    [updateFilters]
  );

  /**
   * Handle date range filter changes
   */
  const handleDateRangeChange = useCallback(() => {
    if (!dateInput.trim()) {
      updateFilters({ dateRange: null });
      return;
    }

    let dateValue: Date;

    if (dateType === "within") {
      // Parse as number of days
      const days = parseInt(dateInput, 10);
      if (Number.isNaN(days) || days <= 0) return;

      dateValue = new Date();
      dateValue.setDate(dateValue.getDate() - days);
    } else {
      // Parse as specific date
      dateValue = new Date(dateInput);
      if (Number.isNaN(dateValue.getTime())) return;
    }

    updateFilters({
      dateRange: {
        type: dateType,
        value: dateValue,
      },
    });
  }, [dateInput, dateType, updateFilters]);

  /**
   * Toggle folder selection in multi-select
   */
  const toggleFolder = useCallback(
    (folder: string) => {
      const newFolders = filters.folders.includes(folder)
        ? filters.folders.filter((f) => f !== folder)
        : [...filters.folders, folder];
      handleFolderChange(newFolders);
    },
    [filters.folders, handleFolderChange]
  );

  /**
   * Toggle tag selection in multi-select
   */
  const toggleTag = useCallback(
    (tag: string) => {
      const newTags = filters.tags.includes(tag)
        ? filters.tags.filter((t) => t !== tag)
        : [...filters.tags, tag];
      handleTagChange(newTags);
    },
    [filters.tags, handleTagChange]
  );

  /**
   * Check if any filters are active
   */
  const hasActiveFilters =
    filters.filename.length > 0 ||
    filters.folders.length > 0 ||
    filters.tags.length > 0 ||
    filters.dateRange !== null;

  return (
    <div className="filter-panel">
      <div className="filter-panel-header">
        <h3>Filters</h3>
        {hasActiveFilters && (
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

      {/* Filename Search */}
      <div className="filter-group">
        <label htmlFor="filename-search">Search filename:</label>
        <input
          id="filename-search"
          type="text"
          value={filters.filename}
          onChange={(e) => handleFilenameChange(e.target.value)}
          placeholder="Type to search filenames..."
          className="filter-input"
        />
      </div>

      {/* Folder Filter */}
      <div className="filter-group">
        <h4>Folders:</h4>
        <div className="multi-select-container">
          {availableFolders.length === 0 ? (
            <div className="no-options">No folders available</div>
          ) : (
            <div className="multi-select-options">
              {availableFolders.map((folder) => (
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
        {filters.folders.length > 0 && (
          <div className="selected-items">Selected: {filters.folders.join(", ")}</div>
        )}
      </div>

      {/* Tag Filter */}
      <div className="filter-group">
        <h4>Tags:</h4>
        <div className="multi-select-container">
          {availableTags.length === 0 ? (
            <div className="no-options">No tags available</div>
          ) : (
            <div className="multi-select-options">
              {availableTags.map((tag) => (
                <label key={tag} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={filters.tags.includes(tag)}
                    onChange={() => toggleTag(tag)}
                  />
                  <span className="tag-name">#{tag}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        {filters.tags.length > 0 && (
          <div className="selected-items">
            Selected: {filters.tags.map((tag) => `#${tag}`).join(", ")}
          </div>
        )}
      </div>

      {/* Date Range Filter */}
      <div className="filter-group">
        <h4>Date filter:</h4>
        <div className="date-filter-container">
          <select
            value={dateType}
            onChange={(e) => setDateType(e.target.value as "within" | "after")}
            className="date-type-select"
          >
            <option value="within">Within last</option>
            <option value="after">After date</option>
          </select>

          <input
            type={dateType === "within" ? "number" : "date"}
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            placeholder={dateType === "within" ? "days" : ""}
            min={dateType === "within" ? "1" : undefined}
            className="date-input"
          />

          {dateType === "within" && <span className="date-unit">days</span>}

          <button
            type="button"
            onClick={handleDateRangeChange}
            disabled={!dateInput.trim()}
            className="apply-date-btn"
          >
            Apply
          </button>
        </div>

        {filters.dateRange && (
          <div className="active-date-filter">
            Active:{" "}
            {filters.dateRange.type === "within"
              ? `Within ${Math.ceil((Date.now() - (filters.dateRange.value instanceof Date ? filters.dateRange.value.getTime() : new Date(filters.dateRange.value).getTime())) / (1000 * 60 * 60 * 24))} days`
              : `After ${(filters.dateRange.value instanceof Date ? filters.dateRange.value : new Date(filters.dateRange.value)).toLocaleDateString()}`}
            <button
              type="button"
              onClick={() => updateFilters({ dateRange: null })}
              className="remove-date-filter"
              title="Remove date filter"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* Filter Summary */}
      {hasActiveFilters && (
        <div className="filter-summary">
          <strong>Active filters:</strong>
          <ul>
            {filters.filename && <li>Filename: "{filters.filename}"</li>}
            {filters.folders.length > 0 && <li>Folders: {filters.folders.length} selected</li>}
            {filters.tags.length > 0 && <li>Tags: {filters.tags.length} selected</li>}
            {filters.dateRange && <li>Date: {filters.dateRange.type} filter active</li>}
          </ul>
        </div>
      )}
    </div>
  );
};
