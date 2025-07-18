# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Essential Commands
- `bun run dev` - Development build with watch mode (hot reload)
- `bun run build` - Production build for release
- `bun run check` - TypeScript type checking without emitting files
- `bun run lint` - Lint code using Biome
- `bun run format` - Format code using Biome
- `bun run check-all` - Run both linting and formatting checks

### Testing
- `bun run test` - Run test suite once
- `bun run test:watch` - Run tests in watch mode
- `bun run test:coverage` - Generate test coverage report
- `bun run test:coverage:ui` - Test coverage with UI

### Type Checking
Always run `bun run check` before committing changes to ensure TypeScript compilation succeeds.

## Architecture Overview

### Plugin Structure
This is an Obsidian plugin using React for the UI layer with Zustand for state management. The plugin provides a card-based interface for browsing recently edited notes.

**Core Components:**
- `main.ts` - Plugin entry point, handles Obsidian lifecycle and file system events
- `view.tsx` - Obsidian view wrapper that mounts React components
- `store/cardExplorerStore.ts` - Zustand store managing application state
- `components/` - React components for the card interface

### State Management Architecture
The plugin uses a centralized Zustand store (`cardExplorerStore.ts`) that manages:
- Note data loaded from Obsidian vault
- Filter and sort configurations
- Pinned notes state
- UI loading/error states

**Key State Flow:**
1. Plugin loads notes from Obsidian APIs (`noteProcessing/`)
2. Store applies filters (`filters/`) and sorting (`sorting/`)
3. React components consume computed state via selectors (`selectors/`)

### Data Persistence
- Plugin settings stored in Obsidian's settings system
- User data (pinned notes, filters) stored in `data.json`
- Automatic data migration handled in `utils/dataMigration.ts`

### Key Directories
- `src/components/` - React UI components
- `src/store/` - State management (Zustand store and modules)
- `src/utils/` - Utility functions (error handling, validation, data persistence)
- `src/types/` - TypeScript type definitions
- `src/test/` - Test setup and Obsidian mocks

### Technology Stack
- **Obsidian Plugin API** - Core plugin functionality
- **React 18** - UI framework with createRoot API
- **Zustand** - Lightweight state management
- **TypeScript** - Type safety
- **Vitest** - Testing framework with jsdom
- **Biome** - Fast linting and formatting
- **ESBuild** - Fast bundling via esbuild.config.mjs

### Testing Approach
Tests use Vitest with React Testing Library. Obsidian APIs are mocked in `src/test/obsidian-mock.ts`. Coverage reports are generated in the `coverage/` directory.

### Error Handling
Comprehensive error handling system in `utils/errorHandling.ts` with retry mechanisms and categorized error types.

## Implementation Rules & Guidelines

### Core Development Principles

#### Type Safety Requirements
- **No `any` types**: Use proper interfaces or `unknown` instead
- **Runtime validation**: Use type guards for external data (Obsidian APIs)
- **Comprehensive TypeScript**: All code must have proper type definitions
- Always run `bun run check` before committing to ensure TypeScript compilation

#### State Management Rules
- **Immutable updates only**: Never mutate existing arrays/objects directly
- **Action-based mutations**: All state changes through defined store actions
- **Automatic recomputation**: Use the recomputation pattern for derived state
- **Single source of truth**: All application state in Zustand store

```typescript
// ✅ Correct - immutable update
const updateFilters = (newFilters: Partial<FilterState>) => {
  const updatedFilters = { ...state.filters, ...newFilters };
  set({ filters: updatedFilters });
};

// ❌ Incorrect - direct mutation
state.filters.tags.push(newTag);
```

#### Performance Requirements
- **Virtual scrolling mandatory**: For any list >100 items (use react-virtuoso)
- **Memoization**: Cache expensive computations with useMemo/useCallback
- **Selective re-renders**: Optimize React dependency arrays
- **Bundle optimization**: Import only what you need, avoid unnecessary dependencies

### Code Organization Standards

#### File Structure Patterns
- **Store modules**: Each module follows consistent structure (types → defaults → logic → store integration)
- **Component pattern**: Interface → hooks → memoized computations → event handlers → render
- **Barrel exports**: Use index.ts files for clean imports
- **Named exports**: Prefer named exports over default exports

#### Module Boundaries
- **Single responsibility**: Each module handles one specific concern
- **Clear interfaces**: Well-defined inputs and outputs
- **Minimal dependencies**: Reduce coupling between modules
- **No circular imports**: Avoid circular dependencies

### React Development Standards

#### Component Requirements
- **Functional components only**: Use hooks instead of class components
- **Error boundaries**: Wrap components that might fail with ErrorFallback
- **Props interfaces**: Always define TypeScript interfaces for props
- **Cleanup**: Always cleanup effects and subscriptions

#### Performance Patterns
- **Virtual scrolling**: Use react-virtuoso for large note lists
- **Memoization**: useMemo for expensive computations, useCallback for event handlers
- **Loading states**: Consistent loading/error state handling pattern

### Obsidian Integration Standards

#### API Usage Rules
- **Minimal surface area**: Limit direct Obsidian API usage to store methods
- **Abstraction layer**: Wrap APIs in store methods, not components
- **Error handling**: Graceful handling of all API failures
- **Type safety**: Create types for Obsidian data structures

#### Plugin Lifecycle
- **Proper registration**: Register views, commands, and settings in onload
- **Complete cleanup**: Always cleanup resources in onunload
- **Settings management**: Use persistent settings with defaults
- **Auto-start**: Respect user settings for automatic view activation

### Testing Requirements

#### Test Coverage Standards
- **>90% coverage**: Aim for high test coverage on critical paths
- **Unit tests**: Test individual functions and components
- **Integration tests**: Test store interactions and data flow
- **Mock Obsidian APIs**: Use test/obsidian-mock.ts for isolated testing

#### Test Organization
- **Co-location**: Place tests near the code they test (*.test.ts)
- **Descriptive names**: Test names should describe behavior
- **Arrange-Act-Assert**: Clear test structure
- **Edge cases**: Test error conditions and boundary cases

### Security & Data Handling

#### Input Validation
- **Validate external data**: Type guards for Obsidian API responses
- **Sanitize inputs**: Sanitize user inputs and file content
- **Safe defaults**: Use secure defaults for all settings
- **Error information**: Don't expose sensitive information in errors

### Documentation Standards

#### Code Documentation
- **JSDoc comments**: Document all public interfaces
- **Type annotations**: Use descriptive type names
- **Architecture decisions**: Document design patterns and rationale

These implementation rules ensure code quality, maintainability, and performance while following established patterns throughout the codebase.