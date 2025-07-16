# Architecture & Design Principles

## Core Architecture

### Plugin Architecture Pattern
The Card Explorer follows Obsidian's standard plugin architecture with React integration:

```
Obsidian Plugin API
    ↓
CardExplorerPlugin (main.ts)
    ↓
CardExplorerView (view.tsx)
    ↓
React Component Tree
    ↓
Zustand State Management
    ↓
Obsidian Vault APIs
```

### State Management Philosophy

**Centralized State with Zustand**
- Single source of truth for all application state
- Reactive updates with automatic recomputation
- Immutable state updates to prevent side effects
- Modular store organization for maintainability

**Key State Management Principles:**
1. **Separation of Data and UI State**: Raw data (notes) separate from computed state (filteredNotes)
2. **Automatic Recomputation**: Filtered/sorted results update automatically when dependencies change
3. **Immutable Updates**: All state changes create new objects/arrays
4. **Action-Based Mutations**: State changes only through defined actions

### Component Architecture

**Container-Presenter Pattern**
- `CardView`: Container component managing state and orchestration
- `FilterPanel`, `VirtualList`, `NoteCard`: Presenter components focused on UI

**Error Handling Strategy**
- React Error Boundaries for component-level error isolation
- Global error state in store for API/data errors
- Graceful degradation with retry mechanisms

**Performance Optimizations**
- Virtual scrolling for large note lists (react-virtuoso)
- Memoized computations (useMemo, useCallback)
- Selective re-renders through proper dependency arrays

## Data Flow Architecture

### Note Loading Pipeline
```
Obsidian Vault
    ↓ (loadNotesFromVault)
Raw TFile Objects
    ↓ (metadataExtractor)
Note Metadata Extraction
    ↓ (noteLoader)
NoteData Objects
    ↓ (store.setNotes)
Store State Update
    ↓ (recomputeFilteredNotes)
Filtered & Sorted Results
    ↓ (React re-render)
UI Update
```

### Filter & Sort Pipeline
```
Raw Notes Array
    ↓ (applyFilters)
Filtered Notes
    ↓ (sortNotes)
Sorted Notes
    ↓ (pin organization)
Final Display Order
```

### State Update Flow
```
User Action
    ↓ (store action)
State Mutation
    ↓ (automatic trigger)
Recomputation
    ↓ (Zustand subscription)
React Re-render
    ↓
DOM Update
```

## Module Organization

### Store Modules
- **cardExplorerStore.ts**: Main store with state and actions
- **filters/**: Filter logic and utilities
- **noteProcessing/**: Note loading and metadata extraction
- **selectors/**: Computed state selectors
- **sorting/**: Sort logic and pin management
- **utils/**: Shared constants and utilities

### Component Modules
- **CardView.tsx**: Main container with error boundaries
- **FilterPanel.tsx**: Filter controls and UI
- **VirtualList.tsx**: Virtualized note list
- **NoteCard.tsx**: Individual note display

### Type System
- **Comprehensive TypeScript**: All data structures typed
- **Domain-Specific Types**: Separate types for different concerns
- **Type Guards**: Runtime validation for external data
- **Generic Utilities**: Reusable type-safe functions

## Design Principles

### 1. Separation of Concerns
- **Data Layer**: Store handles all business logic
- **UI Layer**: Components focus on presentation
- **Integration Layer**: View handles Obsidian API integration

### 2. Immutability
- All state updates create new objects
- No direct mutation of arrays or objects
- Predictable state changes and easier debugging

### 3. Reactive Programming
- State changes automatically trigger dependent updates
- Declarative data transformations
- Minimal manual state synchronization

### 4. Performance First
- Virtual scrolling for large datasets
- Memoized expensive computations
- Optimized React rendering patterns

### 5. Error Resilience
- Multiple layers of error handling
- Graceful degradation on failures
- User-friendly error messages with retry options

### 6. Type Safety
- Comprehensive TypeScript coverage
- Runtime type validation where needed
- Clear interfaces between modules

## Integration Patterns

### Obsidian API Integration
- **Minimal Surface Area**: Limited API usage points
- **Abstraction Layer**: Store methods wrap Obsidian APIs
- **Error Handling**: Graceful handling of API failures

### React Integration
- **Standard Patterns**: Hooks, functional components, error boundaries
- **Performance**: Memoization and virtual scrolling
- **State Management**: Zustand integration with React

### Plugin Lifecycle
- **Initialization**: Async setup with proper cleanup
- **Settings**: Persistent configuration with defaults
- **View Management**: Proper view registration and cleanup

## Testing Architecture

### Test Organization
- **Unit Tests**: Individual functions and components
- **Integration Tests**: Store interactions and data flow
- **Mock Strategy**: Obsidian API mocking for isolated testing

### Coverage Strategy
- **Comprehensive Coverage**: All critical paths tested
- **Edge Cases**: Error conditions and boundary cases
- **Performance Tests**: Virtual scrolling and large datasets

## Extensibility Patterns

### Adding New Filters
1. Update `FilterState` type
2. Add filter logic in `filters/` module
3. Update `FilterPanel` UI
4. Add tests for new filter

### Adding New Sort Options
1. Update `SortConfig` type
2. Add sort logic in `sorting/` module
3. Update settings UI if needed
4. Add tests for new sort

### Adding New Components
1. Create component in `components/` directory
2. Add to `CardView` if needed
3. Update types if new props needed
4. Add component tests

This architecture provides a solid foundation for maintainability, performance, and extensibility while following React and Obsidian plugin best practices.
