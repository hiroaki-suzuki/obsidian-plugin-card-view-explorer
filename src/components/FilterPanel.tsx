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
   * Toggle folder selection in multi-select
   */
  const toggleFolder = useCallback(
    (folder: string) => {
      const isSelected = filters.folders.includes(folder);
      const newFolders = isSelected
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
      const isSelected = filters.tags.includes(tag);
      const newTags = isSelected ? filters.tags.filter((t) => t !== tag) : [...filters.tags, tag];
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
        <h4>
          <label htmlFor="filter-filename">Filename:</label>
        </h4>
        <input
          id="filter-filename"
          type="text"
          value={filters.filename}
          onChange={(e) => handleFilenameChange(e.target.value)}
          placeholder="Type to search filename"
          className="filter-input"
        />
      </div>

      {/* Date Range Filter */}
      <div className="filter-group">
        <h4>
          <label htmlFor="filter-date">Date:</label>
        </h4>
        <div className="date-filter-container">
          <select
            value={dateType}
            onChange={(e) => {
              // TODO: 関数化
              const newDateType = e.target.value as "within" | "after";
              setDateType(newDateType);

              // Re-apply filter with new date type if there's input
              if (dateInput.trim()) {
                let dateValue: Date;

                if (newDateType === "within") {
                  const days = parseInt(dateInput, 10);
                  if (Number.isNaN(days) || days <= 0) return;

                  dateValue = new Date();
                  dateValue.setDate(dateValue.getDate() - days);
                } else {
                  dateValue = new Date(dateInput);
                  if (Number.isNaN(dateValue.getTime())) return;
                }

                updateFilters({
                  dateRange: {
                    type: newDateType,
                    value: dateValue,
                  },
                });
              }
            }}
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
            onChange={(e) => {
              // TODO: 関数化
              const value = e.target.value;
              setDateInput(value);

              if (!value.trim()) {
                updateFilters({ dateRange: null });
                return;
              }

              let dateValue: Date;

              if (dateType === "within") {
                const days = parseInt(value, 10);
                if (Number.isNaN(days) || days <= 0) return;

                dateValue = new Date();
                dateValue.setDate(dateValue.getDate() - days);
              } else {
                dateValue = new Date(value);
                if (Number.isNaN(dateValue.getTime())) return;
              }

              updateFilters({
                dateRange: {
                  type: dateType,
                  value: dateValue,
                },
              });
            }}
            placeholder={dateType === "within" ? "days" : ""}
            min={dateType === "within" ? "1" : undefined}
            className="date-input"
          />

          {dateType === "within" && <span className="date-unit">days</span>}
        </div>
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
                  <span className="tag-name">{tag}</span>
                </label>
              ))}
            </div>
          )}
        </div>
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
      </div>
    </div>
  );
};
