/**
 * CSS Styles for FilterPanel Component
 *
 * Provides clean, functional styling for all filter controls
 * with proper spacing, visual hierarchy, and interactive states.
 */

export const filterPanelStyles = `
.filter-panel {
  padding: 16px;
  border-bottom: 1px solid var(--background-modifier-border);
  background: var(--background-primary);
}

.filter-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.filter-panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-normal);
}

.clear-filters-btn {
  padding: 4px 8px;
  font-size: 12px;
  background: var(--interactive-accent);
  color: var(--text-on-accent);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.clear-filters-btn:hover {
  background: var(--interactive-accent-hover);
}

.filter-group {
  margin-bottom: 16px;
}

.filter-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-normal);
}

.filter-input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 4px;
  background: var(--background-primary);
  color: var(--text-normal);
  font-size: 13px;
}

.filter-input:focus {
  outline: none;
  border-color: var(--interactive-accent);
  box-shadow: 0 0 0 2px var(--interactive-accent-hover);
}

.filter-input::placeholder {
  color: var(--text-muted);
}

/* Multi-select containers */
.multi-select-container {
  border: 1px solid var(--background-modifier-border);
  border-radius: 4px;
  background: var(--background-primary);
  max-height: 120px;
  overflow-y: auto;
}

.multi-select-options {
  padding: 4px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  padding: 4px 6px;
  margin: 0;
  font-size: 12px;
  cursor: pointer;
  border-radius: 3px;
  transition: background-color 0.2s;
}

.checkbox-label:hover {
  background: var(--background-modifier-hover);
}

.checkbox-label input[type="checkbox"] {
  margin-right: 6px;
  margin-top: 0;
  margin-bottom: 0;
}

.folder-name,
.tag-name {
  color: var(--text-normal);
  font-family: var(--font-monospace);
}

.tag-name {
  color: var(--text-accent);
}

.no-options {
  padding: 8px;
  text-align: center;
  color: var(--text-muted);
  font-size: 12px;
  font-style: italic;
}

.selected-items {
  margin-top: 6px;
  padding: 4px 6px;
  background: var(--background-secondary);
  border-radius: 3px;
  font-size: 11px;
  color: var(--text-muted);
  max-height: 40px;
  overflow-y: auto;
}

/* Date filter controls */
.date-filter-container {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.date-type-select {
  padding: 4px 6px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 3px;
  background: var(--background-primary);
  color: var(--text-normal);
  font-size: 12px;
  min-width: 100px;
}

.date-input {
  padding: 4px 6px;
  border: 1px solid var(--background-modifier-border);
  border-radius: 3px;
  background: var(--background-primary);
  color: var(--text-normal);
  font-size: 12px;
  width: 80px;
}

.date-input:focus {
  outline: none;
  border-color: var(--interactive-accent);
}

.date-unit {
  font-size: 12px;
  color: var(--text-muted);
}

.apply-date-btn {
  padding: 4px 8px;
  font-size: 12px;
  background: var(--interactive-normal);
  color: var(--text-normal);
  border: 1px solid var(--background-modifier-border);
  border-radius: 3px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.apply-date-btn:hover:not(:disabled) {
  background: var(--interactive-hover);
}

.apply-date-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.active-date-filter {
  margin-top: 6px;
  padding: 4px 6px;
  background: var(--background-modifier-success);
  border-radius: 3px;
  font-size: 11px;
  color: var(--text-normal);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.remove-date-filter {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 14px;
  padding: 0;
  margin-left: 6px;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
  transition: background-color 0.2s;
}

.remove-date-filter:hover {
  background: var(--background-modifier-error);
  color: var(--text-on-accent);
}

/* Filter summary */
.filter-summary {
  margin-top: 12px;
  padding: 8px;
  background: var(--background-secondary);
  border-radius: 4px;
  border-left: 3px solid var(--interactive-accent);
}

.filter-summary strong {
  color: var(--text-normal);
  font-size: 12px;
}

.filter-summary ul {
  margin: 4px 0 0 0;
  padding-left: 16px;
}

.filter-summary li {
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 2px;
}

/* Responsive adjustments */
@media (max-width: 400px) {
  .date-filter-container {
    flex-direction: column;
    align-items: stretch;
  }

  .date-type-select,
  .date-input {
    width: 100%;
  }
}

/* Scrollbar styling for multi-select */
.multi-select-container::-webkit-scrollbar {
  width: 6px;
}

.multi-select-container::-webkit-scrollbar-track {
  background: var(--background-secondary);
}

.multi-select-container::-webkit-scrollbar-thumb {
  background: var(--background-modifier-border);
  border-radius: 3px;
}

.multi-select-container::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}
`;
