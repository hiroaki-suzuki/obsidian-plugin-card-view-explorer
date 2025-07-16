# Development Principles & Guidelines

## Core Development Principles

### 1. Type Safety First
- **Comprehensive TypeScript**: All code must have proper type definitions
- **Runtime Validation**: Use type guards for external data (Obsidian APIs)
- **No `any` Types**: Avoid `any` - use proper interfaces or `unknown`
- **Generic Utilities**: Create reusable type-safe utility functions

```typescript
// ✅ Good - proper typing
interface NoteData {
  file: TFile;
  title: string;
  tags: string[];
}

// ❌ Bad - using any
const processNote = (note: any) => { ... }
```

### 2. Immutable State Management
- **No Direct Mutations**: Always create new objects/arrays for state updates
- **Functional Updates**: Use spread operators and array methods
- **Predictable Changes**: State updates should be pure functions
- **Automatic Recomputation**: Derived state updates automatically

```typescript
// ✅ Good - immutable update
const updateFilters = (newFilters: Partial<FilterState>) => {
  const updatedFilters = { ...state.filters, ...newFilters };
  set({ filters: updatedFilters });
};

// ❌ Bad - direct mutation
state.filters.tags.push(newTag);
```

### 3. Performance by Design
- **Virtual Scrolling**: Always use for large lists (>100 items)
- **Memoization**: Cache expensive computations with useMemo/useCallback
- **Selective Re-renders**: Optimize React dependency arrays
- **Lazy Loading**: Load data on demand when possible

### 4. Error Resilience
- **Multiple Error Boundaries**: Component-level and global error handling
- **Graceful Degradation**: Provide fallbacks for all failure modes
- **User-Friendly Messages**: Convert technical errors to actionable messages
- **Retry Mechanisms**: Allow users to recover from errors

### 5. Testability
- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test store interactions and data flow
- **Mock External Dependencies**: Mock Obsidian APIs for isolated testing
- **High Coverage**: Aim for >90% test coverage on critical paths

## Code Organization Principles

### Module Boundaries
- **Single Responsibility**: Each module handles one specific concern
- **Clear Interfaces**: Well-defined inputs and outputs
- **Minimal Dependencies**: Reduce coupling between modules
- **Composable Design**: Modules can be combined and reused

### File Organization
```
src/
├── main.ts                 # Plugin entry point
├── view.tsx               # React integration
├── settings.ts            # Plugin configuration
├── components/            # UI components
├── store/                 # State management
│   ├── cardExplorerStore.ts
│   ├── filters/           # Filter logic
│   ├── noteProcessing/    # Data loading
│   ├── selectors/         # Computed state
│   ├── sorting/           # Sort logic
│   └── utils/             # Shared utilities
├── types/                 # Type definitions
└── utils/                 # General utilities
```

### Import/Export Patterns
- **Barrel Exports**: Use index.ts files for clean imports
- **Named Exports**: Prefer named exports over default exports
- **Explicit Dependencies**: Import only what you need
- **Circular Dependencies**: Avoid circular imports

```typescript
// ✅ Good - barrel export
export * from "./note";
export * from "./filter";
export * from "./sort";

// ✅ Good - named imports
import { NoteData, FilterState } from "../types";

// ❌ Bad - default export with unclear name
import Thing from "./module";
```

## React Development Guidelines

### Component Design
- **Functional Components**: Use hooks instead of class components
- **Single Responsibility**: Each component has one clear purpose
- **Props Interface**: Always define TypeScript interfaces for props
- **Error Boundaries**: Wrap components that might fail

### Hook Usage
- **Custom Hooks**: Extract reusable logic into custom hooks
- **Dependency Arrays**: Be explicit about hook dependencies
- **Cleanup**: Always cleanup effects and subscriptions
- **Memoization**: Use useMemo/useCallback for expensive operations

```typescript
// ✅ Good - proper hook usage
const Component = ({ data, onAction }) => {
  const processedData = useMemo(() => {
    return expensiveProcessing(data);
  }, [data]);

  const handleClick = useCallback((id) => {
    onAction(id);
  }, [onAction]);

  useEffect(() => {
    const cleanup = setupSomething();
    return cleanup;
  }, []);

  return <div>...</div>;
};
```

### State Management
- **Zustand Store**: Use centralized store for shared state
- **Local State**: Use useState for component-specific state
- **Computed State**: Derive state instead of storing duplicates
- **Action Pattern**: All state changes through defined actions

## Obsidian Integration Guidelines

### API Usage
- **Minimal Surface Area**: Limit direct Obsidian API usage
- **Abstraction Layer**: Wrap APIs in store methods
- **Error Handling**: Handle API failures gracefully
- **Type Safety**: Create types for Obsidian data structures

### Plugin Lifecycle
- **Proper Registration**: Register views, commands, and settings
- **Cleanup**: Always cleanup resources in onunload
- **Settings Management**: Use persistent settings with defaults
- **View Management**: Handle view creation and destruction properly

```typescript
// ✅ Good - proper plugin structure
export default class Plugin extends ObsidianPlugin {
  async onload() {
    await this.loadSettings();
    this.registerView(VIEW_TYPE, (leaf) => new View(leaf, this));
    this.addCommand({ ... });
  }

  async onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE);
  }
}
```

## Testing Guidelines

### Test Organization
- **Co-location**: Place tests near the code they test
- **Descriptive Names**: Test names should describe behavior
- **Arrange-Act-Assert**: Structure tests clearly
- **Mock External Dependencies**: Mock Obsidian APIs and external services

### Test Coverage
- **Critical Paths**: Ensure all critical functionality is tested
- **Edge Cases**: Test error conditions and boundary cases
- **Integration**: Test component interactions and data flow
- **Performance**: Test virtual scrolling and large datasets

```typescript
// ✅ Good - descriptive test
describe('FilterPanel', () => {
  it('should update store when tag filter is changed', async () => {
    // Arrange
    const mockStore = createMockStore();
    render(<FilterPanel />, { store: mockStore });

    // Act
    await user.selectOptions(screen.getByRole('combobox'), 'tag1');

    // Assert
    expect(mockStore.updateFilters).toHaveBeenCalledWith({
      tags: ['tag1']
    });
  });
});
```

## Performance Guidelines

### React Performance
- **Virtual Scrolling**: Required for lists >100 items
- **Memoization**: Cache expensive computations
- **Component Splitting**: Split large components into smaller ones
- **Lazy Loading**: Load components and data on demand

### Data Processing
- **Immutable Operations**: Use functional programming patterns
- **Batch Updates**: Group related state changes
- **Efficient Algorithms**: Use appropriate data structures and algorithms
- **Memory Management**: Avoid memory leaks in effects and subscriptions

### Bundle Size
- **Tree Shaking**: Import only what you need
- **Code Splitting**: Split large modules when beneficial
- **Dependency Audit**: Regularly review and minimize dependencies
- **Build Optimization**: Use ESBuild optimizations

## Security Guidelines

### Data Handling
- **Input Validation**: Validate all external data
- **Sanitization**: Sanitize user inputs and file content
- **Error Information**: Don't expose sensitive information in errors
- **File Access**: Respect Obsidian's file access patterns

### Plugin Security
- **Minimal Permissions**: Request only necessary permissions
- **Safe Defaults**: Use secure defaults for all settings
- **User Consent**: Get user consent for data operations
- **Privacy**: Don't collect or transmit user data

## Documentation Guidelines

### Code Documentation
- **JSDoc Comments**: Document all public interfaces
- **Type Annotations**: Use descriptive type names
- **README Files**: Maintain up-to-date documentation
- **Architecture Docs**: Document design decisions and patterns

### User Documentation
- **Clear Instructions**: Provide step-by-step guides
- **Screenshots**: Include visual aids where helpful
- **Troubleshooting**: Document common issues and solutions
- **Changelog**: Maintain version history and breaking changes

These principles ensure the codebase remains maintainable, performant, and reliable as it grows and evolves.
