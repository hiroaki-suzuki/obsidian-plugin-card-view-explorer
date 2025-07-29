---
inclusion: always
---

# Technology Stack & Development Guidelines

## Stack
- **Platform**: Obsidian Plugin (TypeScript ≥0.15.0)
- **UI**: React 18.2.0 (functional components + hooks only)
- **State**: Zustand 4.4.7 with subscribeWithSelector
- **Build**: Bun + ESBuild → `main.js`
- **Testing**: Vitest + @testing-library/react + jsdom

## Non-Negotiable Rules

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

### Error Handling - CRITICAL
- Wrap components with `CardViewErrorBoundary`
- Use `handleError(error, category)` with categories: API, DATA, UI, GENERAL
- Data operations: `validatePluginData()` → save with fallback to defaults
- Always provide fallbacks and retry mechanisms

### Type Safety - NO EXCEPTIONS
- NO `any` types - use interfaces or `unknown`
- Create type guards for Obsidian APIs: `isMarkdownFile(file)`
- Runtime validation for all plugin data
- Comprehensive TypeScript interfaces

### Performance - REQUIRED
- `react-virtuoso` for lists >100 items
- `useMemo`/`useCallback` for expensive operations
- `es-toolkit` debounce for file system events

## Required Code Patterns

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

### Store Module Pattern
```typescript
// Order: Types → Defaults → Logic → Store
interface ModuleState { ... }
const createDefaultState = () => ({ ... });
const processData = (data, config) => { ... };
export const useModuleStore = create<ModuleState & ModuleActions>()(...);
```

### Obsidian Integration
- Wrap ALL Obsidian APIs in store methods with error handling
- NO direct API usage outside store
- Handle failures gracefully with fallbacks

## File Organization
```
src/
├── store/          # Zustand modules (filters/, noteProcessing/, selectors/, sorting/)
├── components/     # React components with co-located .test.tsx
├── types/          # TypeScript definitions
└── utils/          # errorHandling, dataPersistence, validation
```

## Testing Requirements
- Co-locate tests: `Component.test.tsx` alongside `Component.tsx`
- Use `src/test/obsidian-mock.ts` for Obsidian APIs
- Clear mocks: `beforeEach(() => vi.clearAllMocks())`
- Test error conditions and recovery paths

## Build Commands
```bash
bun run dev     # Development with watch
bun run build   # Production build
bun run test    # Run all tests
```
