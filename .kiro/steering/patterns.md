# Development Patterns & Best Practices

## Code Organization Patterns

### Store Module Pattern
Each store module follows a consistent structure:

```typescript
// 1. Type definitions
interface ModuleState { ... }
interface ModuleActions { ... }

// 2. Default/factory functions
const createDefaultState = () => ({ ... });

// 3. Core logic functions
const processData = (data, config) => { ... };

// 4. Store integration
export const useModuleStore = create<ModuleState & ModuleActions>()(...);
```

### Component Pattern
React components follow a consistent structure:

```typescript
// 1. Interface definition
interface ComponentProps { ... }

// 2. Component implementation
export const Component: React.FC<ComponentProps> = ({ prop1, prop2 }) => {
  // 3. Hooks (state, effects, etc.)
  const storeData = useStore();

  // 4. Memoized computations
  const computedValue = useMemo(() => { ... }, [dependencies]);

  // 5. Event handlers
  const handleAction = useCallback(() => { ... }, [dependencies]);

  // 6. Render
  return <div>...</div>;
};
```

### Type Definition Pattern
Types are organized by domain with clear separation:

```typescript
// Core data models
export interface NoteData { ... }

// Configuration types
export interface FilterState { ... }

// Utility types
export type SortableValue = string | number | Date | null | undefined;

// Type guards
export const isMarkdownFile = (file: TFile): file is MarkdownFile => { ... };
```

## State Management Patterns

### Immutable Updates
Always create new objects/arrays for state updates:

```typescript
// ✅ Correct - immutable update
const updateFilters = (newFilters: Partial<FilterState>) => {
  const updatedFilters = { ...state.filters, ...newFilters };
  set({ filters: updatedFilters });
};

// ❌ Incorrect - direct mutation
const updateFilters = (newFilters: Partial<FilterState>) => {
  state.filters.tags.push(newTag); // Mutates existing array
  set({ filters: state.filters });
};
```

### Automatic Recomputation
Use the recomputation pattern for derived state:

```typescript
const updateSomething = (newValue) => {
  set({ someValue: newValue });

  const state = get();
  const recomputedData = processData(
    state.rawData,
    state.config,
    newValue
  );
  set({ processedData: recomputedData });
};
```

### Store Action Pattern
All store actions follow this pattern:

```typescript
const actionName = (params) => {
  // 1. Update primary state
  set({ primaryField: newValue });

  // 2. Get current state for recomputation
  const state = get();

  // 3. Recompute derived state
  const derivedData = computeFunction(
    state.data,
    state.config,
    newValue
  );

  // 4. Update derived state
  set({ derivedField: derivedData });
};
```

## React Patterns

### Error Boundary Pattern
Always wrap components that might fail:

```typescript
class ComponentErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Component Error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onRetry={...} />;
    }
    return this.props.children;
  }
}
```

### Memoization Pattern
Use memoization for expensive computations:

```typescript
const Component = ({ data, config }) => {
  // Memoize expensive computations
  const processedData = useMemo(() => {
    return expensiveProcessing(data, config);
  }, [data, config]);

  // Memoize event handlers
  const handleClick = useCallback((id) => {
    onItemClick(id);
  }, [onItemClick]);

  return <div>...</div>;
};
```

### Loading State Pattern
Handle loading states consistently:

```typescript
const Component = () => {
  const { data, isLoading, error } = useStore();

  // Error state
  if (error && !isLoading) {
    return <ErrorDisplay error={error} onRetry={...} />;
  }

  // Initial loading state
  if (isLoading && !data.length) {
    return <LoadingSpinner message="Loading..." />;
  }

  // Loading overlay for refresh
  return (
    <div className="container">
      {isLoading && <LoadingOverlay />}
      <MainContent data={data} />
    </div>
  );
};
```

## Obsidian Integration Patterns

### API Wrapper Pattern
Wrap Obsidian APIs in store methods:

```typescript
// Store method
const refreshNotes = async (app: App) => {
  try {
    set({ isLoading: true, error: null });

    // Use Obsidian APIs
    const notes = await loadNotesFromVault(app);

    // Update store state
    set({ notes, isLoading: false });
  } catch (error) {
    set({
      isLoading: false,
      error: error.message
    });
  }
};
```

### Plugin Lifecycle Pattern
Handle plugin lifecycle properly:

```typescript
export default class Plugin extends ObsidianPlugin {
  async onload() {
    // 1. Load settings
    await this.loadSettings();

    // 2. Register views
    this.registerView(VIEW_TYPE, (leaf) => new View(leaf, this));

    // 3. Register commands
    this.addCommand({ ... });

    // 4. Setup auto-start if enabled
    if (this.settings.autoStart) {
      this.app.workspace.onLayoutReady(() => {
        this.activateView();
      });
    }
  }

  async onunload() {
    // Cleanup views
    this.app.workspace.detachLeavesOfType(VIEW_TYPE);
  }
}
```

## Testing Patterns

### Store Testing Pattern
Test store actions and state changes:

```typescript
describe('Store Actions', () => {
  beforeEach(() => {
    useStore.getState().reset();
  });

  it('should update state correctly', () => {
    const { updateFilters } = useStore.getState();

    updateFilters({ tags: ['tag1'] });

    const state = useStore.getState();
    expect(state.filters.tags).toEqual(['tag1']);
    expect(state.filteredNotes).toHaveLength(expectedLength);
  });
});
```

### Component Testing Pattern
Test component behavior and interactions:

```typescript
describe('Component', () => {
  it('should render correctly', () => {
    render(<Component prop1="value" />);

    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('should handle user interactions', async () => {
    const mockHandler = vi.fn();
    render(<Component onAction={mockHandler} />);

    await user.click(screen.getByRole('button'));

    expect(mockHandler).toHaveBeenCalledWith(expectedArgs);
  });
});
```

### Mock Pattern for Obsidian APIs
Create consistent mocks for Obsidian APIs:

```typescript
// test/obsidian-mock.ts
export const mockApp = {
  vault: {
    getMarkdownFiles: vi.fn(() => []),
    cachedRead: vi.fn(() => Promise.resolve('')),
  },
  metadataCache: {
    getFileCache: vi.fn(() => null),
  },
};

// In tests
beforeEach(() => {
  vi.clearAllMocks();
});
```

## Performance Patterns

### Virtual Scrolling Pattern
Use virtual scrolling for large lists:

```typescript
import { Virtuoso } from 'react-virtuoso';

const VirtualList = ({ items }) => {
  return (
    <Virtuoso
      data={items}
      itemContent={(index, item) => (
        <ItemComponent key={item.id} item={item} />
      )}
      style={{ height: '100%' }}
    />
  );
};
```

### Debouncing Pattern
Debounce expensive operations:

```typescript
const useDebounced = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};
```

## Error Handling Patterns

### Graceful Degradation
Always provide fallbacks for failures:

```typescript
const loadData = async () => {
  try {
    const data = await fetchData();
    return data;
  } catch (error) {
    console.error('Failed to load data:', error);
    // Return empty/default data instead of throwing
    return [];
  }
};
```

### User-Friendly Error Messages
Convert technical errors to user-friendly messages:

```typescript
const handleError = (error: unknown) => {
  let message = 'An unexpected error occurred';

  if (error instanceof Error) {
    if (error.message.includes('network')) {
      message = 'Network connection failed. Please check your connection.';
    } else if (error.message.includes('permission')) {
      message = 'Permission denied. Please check file permissions.';
    }
  }

  setError(message);
};
```

These patterns ensure consistency, maintainability, and reliability across the entire codebase.
