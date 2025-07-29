---
inclusion: always
---

# Development Patterns & Best Practices

## Core Patterns

### Store Module Structure
```typescript
// 1. Types → 2. Defaults → 3. Logic → 4. Store integration
interface ModuleState { ... }
const createDefaultState = () => ({ ... });
const processData = (data, config) => { ... };
export const useModuleStore = create<ModuleState & ModuleActions>()(...);
```

### React Component Structure
```typescript
interface ComponentProps { ... }
export const Component: React.FC<ComponentProps> = ({ prop1, prop2 }) => {
  const storeData = useStore();
  const computedValue = useMemo(() => { ... }, [dependencies]);
  const handleAction = useCallback(() => { ... }, [dependencies]);
  return <div>...</div>;
};
```

## State Management Rules

### Immutable Updates (Required)
```typescript
// ✅ Correct
const updateFilters = (newFilters: Partial<FilterState>) => {
  set({ filters: { ...state.filters, ...newFilters } });
};

// ❌ Wrong - Never mutate directly
state.filters.tags.push(newTag);
```

### Store Action Pattern
```typescript
const actionName = (params) => {
  set({ primaryField: newValue });           // 1. Update primary
  const state = get();                       // 2. Get current state
  const derived = computeFunction(state);    // 3. Recompute derived
  set({ derivedField: derived });           // 4. Update derived
};
```

## React Requirements

### Error Boundaries (Required)
Wrap all components that might fail with `CardViewErrorBoundary`:
```typescript
<CardViewErrorBoundary onError={handleError}>
  <YourComponent />
</CardViewErrorBoundary>
```

### Performance Patterns
- Use `react-virtuoso` for lists >100 items
- Memoize expensive computations with `useMemo`
- Memoize event handlers with `useCallback`
- Follow loading state pattern: error → loading → content

### Loading State Pattern
```typescript
if (error && !isLoading) return <ErrorDisplay error={error} onRetry={...} />;
if (isLoading && !data.length) return <LoadingSpinner />;
return <div>{isLoading && <LoadingOverlay />}<MainContent /></div>;
```

## Obsidian Integration

### API Wrapper Pattern (Required)
Always wrap Obsidian APIs in store methods with error handling:
```typescript
const refreshNotes = async (app: App) => {
  try {
    set({ isLoading: true, error: null });
    const notes = await loadNotesFromVault(app);
    set({ notes, isLoading: false });
  } catch (error) {
    set({ isLoading: false, error: error.message });
  }
};
```

### Plugin Lifecycle
```typescript
async onload() {
  await this.loadSettings();
  this.registerView(VIEW_TYPE, (leaf) => new View(leaf, this));
  this.addCommand({ ... });
}
async onunload() {
  this.app.workspace.detachLeavesOfType(VIEW_TYPE);
}
```

## Error Handling (Critical)

### Use Categorized Error Handling
```typescript
import { handleError, ErrorCategory } from '../utils/errorHandling';

// In components/store actions
try {
  // operation
} catch (error) {
  handleError(error, ErrorCategory.API, { context: 'operation name' });
}
```

### Data Operations Must Include Validation
- Always validate data before saving: `validatePluginData(data)`
- Load data with defaults: `loadPluginData(rawData)`
- Provide fallback to defaults on failure

## Testing Requirements

### Store Tests
```typescript
describe('Store Actions', () => {
  beforeEach(() => useStore.getState().reset());
  it('should update state correctly', () => {
    const { updateFilters } = useStore.getState();
    updateFilters({ tags: ['tag1'] });
    expect(useStore.getState().filters.tags).toEqual(['tag1']);
  });
});
```

### Component Tests
```typescript
it('should handle user interactions', async () => {
  const mockHandler = vi.fn();
  render(<Component onAction={mockHandler} />);
  await user.click(screen.getByRole('button'));
  expect(mockHandler).toHaveBeenCalledWith(expectedArgs);
});
```

### Mock Obsidian APIs
Use `src/test/obsidian-mock.ts` and clear mocks in `beforeEach(() => vi.clearAllMocks())`

## Performance Requirements

### Virtual Scrolling (Required for lists >100)
```typescript
import { Virtuoso } from 'react-virtuoso';
<Virtuoso data={items} itemContent={(index, item) => <Item item={item} />} />
```

### Debouncing
```typescript
const debouncedValue = useDebounced(value, delay);
```

## Type Safety Rules

- No `any` types - use proper interfaces or `unknown`
- Create type guards for external data: `isMarkdownFile(file)`
- Organize types by domain in `src/types/`
- Use runtime validation for plugin data

## File Organization

- Store modules: `src/store/[module]/`
- Components: `src/components/`
- Types: `src/types/`
- Utils: `src/utils/`
- Tests: Co-located `.test.ts` files
