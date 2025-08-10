---
inclusion: always
---

# Architectural Principles & Design Philosophy

## Core Design Principles

### Reliability First
- **Fail Gracefully**: Every operation must have fallback behavior
- **Data Integrity**: Validate all data before persistence, use defaults on failure
- **Error Recovery**: Provide retry mechanisms for all user-facing errors
- **Defensive Programming**: Assume external data is invalid until proven otherwise

### Performance by Design
- **Virtual Scrolling**: MANDATORY for any list >100 items
- **Lazy Loading**: Only process data when needed
- **Debounced Events**: Minimum 300ms debounce for file system events
- **Memory Management**: Implement cleanup for cached data

### Predictable State Management
- **Immutable Updates**: Never mutate state directly, always create new objects
- **Single Source of Truth**: All state flows through Zustand store
- **Automatic Recomputation**: Derived state updates automatically
- **Action-Based Changes**: All state modifications through store actions

### Type-Safe Development
- **No Any Types**: Use interfaces or `unknown` for all data
- **Runtime Validation**: Validate external data with type guards
- **Comprehensive Interfaces**: Define types for all data structures
- **API Safety**: Wrap all Obsidian APIs with type-safe store methods

## Architectural Patterns

### Data Flow Architecture
```
Obsidian APIs → Store Actions → Validated Data → Normalized State → UI Updates
```

### Error Handling Strategy
- **Categorized Errors**: API, DATA, UI, GENERAL categories
- **Component Boundaries**: Wrap all components with error boundaries
- **User-Friendly Messages**: No technical details in UI
- **Graceful Degradation**: Show partial results when possible

### Component Architecture
- **Container/Presenter Pattern**: Separate data logic from presentation
- **Error Boundaries**: Isolate component failures
- **Loading States**: Progressive loading with skeleton UI
- **Memoization**: Optimize expensive computations

### Store Organization
- **Domain-Based Modules**: Organize by business domain (filters, sorting, etc.)
- **Centralized Logic**: All business logic in store modules
- **No Direct API Calls**: Obsidian APIs only accessed through store
- **Automatic Recomputation**: State changes trigger UI updates

## Development Philosophy

### Maintainability
- **Single Responsibility**: Each module handles one concern
- **Co-located Tests**: Tests alongside source files
- **Clear Interfaces**: Well-defined boundaries between modules
- **Documentation**: Code should be self-documenting

### Extensibility
- **Plugin Architecture**: Easy to add new filters, sorts, and features
- **Consistent Patterns**: Follow established patterns for new code
- **Backward Compatibility**: Changes should not break existing functionality
- **Configuration**: Make behavior configurable where appropriate

### User Experience
- **Responsive UI**: Immediate feedback for all user actions
- **Progressive Enhancement**: Core functionality works, enhancements improve experience
- **Accessibility**: Follow web accessibility standards
- **Performance**: Sub-second response times for all interactions
