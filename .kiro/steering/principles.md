---
inclusion: always
---

# Development Principles

## Non-Negotiable Rules

### Type Safety
- NO `any` types - use interfaces or `unknown`
- Create type guards for Obsidian APIs: `isMarkdownFile(file)`
- Runtime validation: `validatePluginData()` before saves
- All data structures must have TypeScript interfaces

### Immutable State
```typescript
// ✅ CORRECT - Always create new objects
set({ filters: { ...state.filters, ...newFilters } });
// ❌ FORBIDDEN - Never mutate directly
state.filters.tags.push(newTag);
```
- All state changes through store actions only
- Derived state recomputes automatically

### Error Handling
- Wrap components with `CardViewErrorBoundary`
- Use `handleError(error, category)` with categories: API, DATA, UI, GENERAL
- Always: `validatePluginData()` → `createDataBackup()` → save
- Provide fallbacks and retry mechanisms

### Performance
- `react-virtuoso` for lists >100 items
- `useMemo`/`useCallback` for expensive operations
- Debounce file system events with `es-toolkit`

## Required Patterns

### Store Module Structure
```typescript
// Order: Types → Defaults → Logic → Store
interface ModuleState { ... }
const createDefaultState = () => ({ ... });
const processData = (data, config) => { ... };
export const useModuleStore = create<ModuleState & ModuleActions>()(...);
```

### Component Structure
```typescript
export const Component: React.FC<Props> = ({ prop1, prop2 }) => {
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
- Handle failures gracefully

## Code Organization

### File Structure
- `src/store/` - Zustand modules (filters/, noteProcessing/, selectors/, sorting/)
- `src/components/` - React components with co-located .test.tsx
- `src/types/` - TypeScript definitions
- `src/utils/` - errorHandling, dataPersistence, validation

### Module Rules
- Single responsibility per module
- Named exports preferred over default
- Barrel exports via index.ts files
- Avoid circular dependencies

## Testing Requirements
- Co-locate tests: `Component.test.tsx` alongside `Component.tsx`
- Use `src/test/obsidian-mock.ts` for Obsidian APIs
- Clear mocks: `beforeEach(() => vi.clearAllMocks())`
- Test error conditions and recovery

## Data Operations Checklist
1. Validate: `validatePluginData(data)`
2. Backup: `createDataBackup(plugin)`
3. Migrate: `migratePluginData(rawData)`
4. Fallback to defaults on validation failure

## React Standards
- Functional components with hooks only
- TypeScript interfaces for all props
- Explicit dependency arrays in hooks
- Extract reusable logic into custom hooks
