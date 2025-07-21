---
inclusion: always
---

# Architecture & Design Principles

## Core Architecture

**Plugin Structure**: Obsidian Plugin → React View → Zustand Store → Obsidian APIs

**State Management**: Centralized Zustand store with automatic recomputation
- Raw data (notes) separate from computed state (filteredNotes)
- All state changes create new objects/arrays (immutable)
- State changes only through defined store actions
- Filtered/sorted results update automatically when dependencies change

**Component Pattern**: Container-Presenter with Error Boundaries
- `CardView`: Container managing state orchestration
- `FilterPanel`, `VirtualList`, `NoteCard`: Presenter components
- React Error Boundaries for component isolation
- Virtual scrolling (react-virtuoso) for performance

## Data Flow

**Note Loading**: Vault → Raw TFiles → Metadata Extraction → NoteData → Store → Filtered Results → UI
**State Updates**: User Action → Store Action → Recomputation → React Re-render

## Module Organization

**Store Modules** (`src/store/`):
- `cardExplorerStore.ts`: Main store with automatic recomputation
- `filters/`: Multi-criteria filtering logic
- `noteProcessing/`: Note loading and metadata extraction
- `selectors/`: Computed state selectors
- `sorting/`: Sort logic with pin management
- `utils/`: Store constants and utilities

**Components** (`src/components/`):
- `CardView.tsx`: Main container with error boundaries
- `CardViewErrorBoundary.tsx`: React error boundary
- `ErrorFallback.tsx`: Error display with retry
- `FilterPanel.tsx`: Filter controls
- `VirtualList.tsx`: Virtualized list wrapper
- `NoteCard.tsx`: Individual note display

**Utilities** (`src/utils/`):
- `errorHandling.ts`: Categorized error handling with retry logic
- `dataPersistence.ts`: Data loading/saving with validation
- `dataBackup.ts`: Automatic backup system
- `dataMigration.ts`: Versioned data migration
- `validation.ts`: Runtime data validation

## Key Principles

**Immutability**: Always create new objects for state updates
```typescript
// ✅ Correct
const updateFilters = (newFilters) => {
  set({ filters: { ...state.filters, ...newFilters } });
};

// ❌ Wrong
state.filters.tags.push(newTag);
```

**Error Resilience**: Multiple error handling layers
- React Error Boundaries for UI errors
- Store error state for API/data errors
- Categorized error handling (API, DATA, UI, GENERAL)
- Automatic retry with exponential backoff
- Backup and recovery systems

**Performance**: Virtual scrolling + memoization
- Use `react-virtuoso` for lists >100 items
- Memoize expensive computations with `useMemo`/`useCallback`
- Optimize React dependency arrays

**Type Safety**: Comprehensive TypeScript
- All data structures typed with interfaces
- Type guards for external data (Obsidian APIs)
- Runtime validation for plugin data

## Integration Patterns

**Obsidian APIs**: Wrap in store methods, handle failures gracefully
**React**: Functional components with hooks, error boundaries
**Testing**: Unit tests for all modules, integration tests for data flow, mock Obsidian APIs

## Extension Patterns

**New Filters**: Update `FilterState` type → Add logic in `filters/` → Update `FilterPanel` UI → Add tests
**New Components**: Create in `components/` → Add to `CardView` → Update types → Add tests
**New Sort Options**: Update `SortConfig` type → Add logic in `sorting/` → Add tests
