---
inclusion: always
---

# Obsidian Card View Explorer - Development Guide

**Plugin Identity**: Visual note browser with advanced filtering for recently edited notes.

## Technology Stack

- **Platform**: Obsidian Plugin (TypeScript ≥0.15.0)
- **UI**: React 19.1.1 (functional components + hooks only)
- **State**: Zustand 5.0.7 with immutable updates
- **Build**: Bun + ESBuild → `main.js`
- **Testing**: Vitest + @testing-library/react + jsdom

## Critical Rules (Non-Negotiable)

### State Management - IMMUTABLE ONLY
```typescript
// ✅ CORRECT - Always create new objects
set({ filters: { ...state.filters, ...newFilters } });
// ❌ FORBIDDEN - Never mutate directly
state.filters.tags.push(newTag);
```
- Use `useCardExplorerStore` for ALL state access
- All state changes through store actions only
- Derived state recomputes automatically

### Error Handling - MANDATORY
- Wrap ALL components with `CardViewErrorBoundary`
- Use `handleError(error, category)` with categories: API, DATA, UI, GENERAL
- Always: `validatePluginData()` → save with fallback to defaults
- Provide fallbacks and retry mechanisms for all operations

### Type Safety - NO EXCEPTIONS
- NO `any` types - use interfaces or `unknown`
- Create type guards for Obsidian APIs: `isMarkdownFile(file)`
- Runtime validation for all plugin data
- Comprehensive TypeScript interfaces for all data structures

### Performance - REQUIRED
- `react-virtuoso` for lists >100 items (MANDATORY)
- `useMemo`/`useCallback` for expensive operations
- Debounce file system events with `es-toolkit` (minimum 300ms)

## File Structure & Organization

```
src/
├── main.ts                    # Plugin entry point (extends Obsidian Plugin)
├── settings.ts                # Plugin settings interface
├── view.tsx                   # React view (extends ItemView)
├── components/                # React components + co-located tests
├── store/                     # Zustand modules by domain
│   ├── cardExplorerStore.ts   # Main store with automatic recomputation
│   ├── filters/               # Filter logic module
│   ├── noteProcessing/        # Note loading & metadata extraction
│   ├── selectors/             # Computed state selectors
│   ├── sorting/               # Sort logic with pin management
│   └── constants.ts           # Store constants
├── types/                     # TypeScript definitions by domain
├── core/                      # Cross-cutting utilities
│   ├── errors/                # Error handling system
│   └── storage/               # Data persistence & validation
├── hooks/                     # Custom React hooks
└── test/                      # Test utilities (obsidian-mock.ts, setup.ts)
```

### Naming Conventions
- Components: `ComponentName.tsx` + `ComponentName.test.tsx`
- Store modules: `moduleName.ts` + `moduleName.test.ts`
- Types: Domain-based files (`note.ts`, `filter.ts`, `sort.ts`)
- Utilities: Function-based names (`errorHandling.ts`, `dataPersistence.ts`)

## Required Code Patterns

### Store Module Pattern
```typescript
// Order: Types → Defaults → Logic → Store
interface ModuleState { ... }
const createDefaultState = () => ({ ... });
const processData = (data, config) => { ... };
export const useModuleStore = create<ModuleState & ModuleActions>()(...);
```

### Component Structure
```typescript
interface ComponentProps { ... }
export const Component: React.FC<ComponentProps> = ({ prop1, prop2 }) => {
  const storeData = useStore();
  const memoized = useMemo(() => computation, [deps]);
  const handler = useCallback(() => action, [deps]);

  if (error && !isLoading) return <ErrorDisplay error={error} onRetry={...} />;
  if (isLoading && !data.length) return <LoadingSpinner />;
  return <div>{isLoading && <LoadingOverlay />}<MainContent /></div>;
};
```

### Obsidian Integration
- Wrap ALL Obsidian APIs in store methods with error handling
- NO direct API usage outside store
- Handle failures gracefully with fallbacks

## Core Features & Implementation

### Card Display System
- **Structure**: Title + 3-line preview + metadata (tags, folder, modified date)
- **Pin System**: Pinned notes ALWAYS appear first, persist via `dataPersistence.ts`
- **Virtual Scrolling**: Use `VirtualizedNoteGrid` with `react-virtuoso`
- **Real-Time Updates**: Auto-refresh on vault changes (debounced 300ms)

### Filter System
- **Multi-Criteria**: Tags (include/exclude), folders, filename patterns, date ranges
- **State Management**: All filters in `FilterState` interface
- **Validation**: Use `validatePluginData()` for all inputs

### Sort System
- **Default**: Modified date (most recent first)
- **Pin Priority**: Pinned notes ALWAYS sort first
- **Options**: Modified date, frontmatter fields, filename

## Data Flow Architecture
1. **Obsidian APIs** → Store actions (with error handling)
2. **Raw data** → Processing modules → Normalized state
3. **State changes** → Automatic recomputation → UI updates
4. **User actions** → Store actions → State updates

## Testing Requirements
- Co-locate tests: `Component.test.tsx` alongside `Component.tsx`
- Use `src/test/obsidian-mock.ts` for Obsidian APIs
- Clear mocks: `beforeEach(() => vi.clearAllMocks())`
- Test error conditions and recovery paths

## Extension Guidelines
- **New Components**: Add to `components/` with co-located test
- **New Store Logic**: Create module in appropriate `store/` subfolder
- **New Types**: Add to domain-specific file in `types/`
- **New Utilities**: Add to `core/` with descriptive filename
