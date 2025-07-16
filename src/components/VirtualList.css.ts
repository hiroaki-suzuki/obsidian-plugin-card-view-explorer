/**
 * CSS Styles for VirtualList Component
 *
 * Provides styling for the virtualized list container, loading states,
 * error states, empty states, and performance optimizations.
 */

export const virtualListStyles = `
.virtual-list-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--background-primary);
}

.virtual-list {
  flex: 1;
  width: 100%;
  height: 100%;
}

.virtual-list-content {
  padding: 8px;
  gap: 8px;
}

.virtual-list-item {
  margin-bottom: 8px;
}

.virtual-list-item:last-child {
  margin-bottom: 0;
}

.virtual-list-item-wrapper {
  padding: 0;
}

/* Loading State */
.virtual-list-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  padding: 32px;
  text-align: center;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--background-modifier-border);
  border-top: 3px solid var(--interactive-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.virtual-list-loading p {
  margin: 0;
  color: var(--text-muted);
  font-size: 14px;
}

/* Error State */
.virtual-list-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  padding: 32px;
  text-align: center;
}

.error-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.virtual-list-error h3 {
  margin: 0 0 8px 0;
  color: var(--text-normal);
  font-size: 18px;
  font-weight: 600;
}

.virtual-list-error p {
  margin: 0 0 16px 0;
  color: var(--text-muted);
  font-size: 14px;
  max-width: 300px;
  line-height: 1.4;
}

.retry-button {
  padding: 8px 16px;
  background: var(--interactive-accent);
  color: var(--text-on-accent);
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.retry-button:hover {
  background: var(--interactive-accent-hover);
}

/* Empty State */
.virtual-list-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  padding: 32px;
  text-align: center;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.virtual-list-empty h3 {
  margin: 0 0 8px 0;
  color: var(--text-normal);
  font-size: 20px;
  font-weight: 600;
}

.virtual-list-empty p {
  margin: 0 0 20px 0;
  color: var(--text-muted);
  font-size: 14px;
  max-width: 400px;
  line-height: 1.5;
}

.clear-filters-button {
  padding: 8px 16px;
  background: var(--interactive-normal);
  color: var(--text-normal);
  border: 1px solid var(--background-modifier-border);
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.clear-filters-button:hover {
  background: var(--interactive-hover);
}

/* Footer */
.virtual-list-footer {
  padding: 8px 16px;
  border-top: 1px solid var(--background-modifier-border);
  background: var(--background-secondary);
  text-align: center;
}

.results-count {
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 500;
}

/* Performance optimizations */
.virtual-list-container * {
  /* Optimize rendering performance */
  will-change: transform;
}

/* Smooth scrolling */
.virtual-list {
  scroll-behavior: smooth;
}

/* Custom scrollbar for virtual list */
.virtual-list::-webkit-scrollbar {
  width: 8px;
}

.virtual-list::-webkit-scrollbar-track {
  background: var(--background-secondary);
}

.virtual-list::-webkit-scrollbar-thumb {
  background: var(--background-modifier-border);
  border-radius: 4px;
}

.virtual-list::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}

/* Responsive adjustments */
@media (max-width: 600px) {
  .virtual-list-content {
    padding: 4px;
  }

  .virtual-list-item {
    margin-bottom: 4px;
  }

  .virtual-list-empty,
  .virtual-list-loading,
  .virtual-list-error {
    padding: 16px;
    height: 250px;
  }

  .empty-icon {
    font-size: 48px;
  }

  .virtual-list-empty h3 {
    font-size: 18px;
  }

  .virtual-list-empty p {
    font-size: 13px;
  }
}

/* Focus management for accessibility */
.virtual-list-item-wrapper:focus-within {
  outline: 2px solid var(--interactive-accent);
  outline-offset: 2px;
  border-radius: 4px;
}

/* Ensure proper spacing in virtual list */
.virtual-list [data-virtuoso-scroller] {
  padding: 0;
}

.virtual-list [data-virtuoso-item-list] {
  padding: 8px;
}
`;
