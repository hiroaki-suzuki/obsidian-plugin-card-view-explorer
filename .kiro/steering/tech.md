---
inclusion: fileMatch
fileMatchPattern: ['**/*.ts', '**/*.tsx']
---

# Technical Standards & Code Patterns

## Mandatory Code Patterns

### React Component Structure
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

### Store Module Pattern
```typescript
// Order: Types → Defaults → Logic → Store
interface ModuleState { ... }
const createDefaultState = () => ({ ... });
const processData = (data, config) => { ... };
export const useModuleStore = create<ModuleState & ModuleActions>()(...);
```

### Immutable State Updates
```typescript
// ✅ CORRECT - Always create new objects
set({ filters: { ...state.filters, ...newFilters } });
// ❌ FORBIDDEN - Never mutate directly
state.filters.tags.push(newTag);
```

## Non-Negotiable Rules

### Type Safety
- **NO `any` types** - use interfaces or `unknown`
- Create type guards for Obsidian APIs: `isMarkdownFile(file)`
- Runtime validation with `validatePluginData()` before saves
- TypeScript interfaces for all data structures

### Error Handling
- Wrap ALL components with `CardViewErrorBoundary`
- Use `handleError(error, category)` - categories: API, DATA, UI, GENERAL
- Always validate → save with fallback to defaults
- Provide retry mechanisms for all user-facing errors

### Performance Requirements
- **MANDATORY**: `react-virtuoso` for lists >100 items
- `useMemo`/`useCallback` for expensive operations
- Debounce file system events (minimum 300ms) with `es-toolkit`

### Obsidian API Integration
- **NO direct API calls** outside store methods
- Wrap ALL Obsidian APIs with error handling
- Graceful fallbacks for API failures

## Code Organization

### File Structure
- Single responsibility per module
- Named exports over default exports
- Barrel exports via `index.ts`
- Co-locate tests: `Component.test.tsx` alongside `Component.tsx`

### Testing Requirements
- Use `src/test/obsidian-mock.ts` for Obsidian APIs
- Clear mocks: `beforeEach(() => vi.clearAllMocks())`
- Test error conditions and recovery paths
- Test all user interaction flows

### Data Operations Pattern
1. **Validate**: `validatePluginData(data)`
2. **Load**: `loadPluginData(rawData)` with defaults
3. **Fallback**: Use defaults on validation failure

## React Standards
- Functional components with hooks only
- TypeScript interfaces for all props
- Explicit dependency arrays in all hooks
- Extract reusable logic into custom hooks
- Use `useCardExplorerStore` for ALL state access
