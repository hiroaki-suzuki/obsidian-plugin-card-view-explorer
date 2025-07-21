# Technology Stack

## Platform
- **Target**: Obsidian Plugin
- **Language**: TypeScript
- **Runtime**: Node.js environment within Obsidian
- **Minimum Obsidian Version**: 0.15.0

## Frontend Framework
- **UI Library**: React 18.2.0 (functional components, hooks)
- **State Management**: Zustand 4.4.7 with subscribeWithSelector middleware
- **Virtual Scrolling**: react-virtuoso 4.6.2 (for performance with large note lists)
- **Styling**: CSS (fixed design, no customization)
- **Utility Library**: es-toolkit 1.39.7 (for debouncing and utilities)

## Data & Storage
- **Note Metadata**: Obsidian's metadataCache API
- **Plugin Settings**: Obsidian's plugin settings system (settings tab)
- **Plugin Data**: data.json file (for pin states and user preferences)
- **Configuration**: Persistent settings with defaults
- **Data Migration**: Versioned data with automatic migration system
- **Backup System**: Automatic backup creation before data saves

## Build System
- **Package Manager**: Bun (lockfile: bun.lock)
- **Bundler**: ESBuild (configuration: esbuild.config.mjs)
- **Build Output**: `main.js` in root directory
- **TypeScript**: 5.3.3 with .tsbuildinfo cache
- **Code Quality**: Biome 2.1.1 (linting and formatting)

## Testing Framework
- **Test Runner**: Vitest 3.2.4
- **Testing Library**: @testing-library/react 14.1.2
- **Coverage**: @vitest/coverage-v8 3.2.4
- **DOM Environment**: jsdom 23.0.1
- **Mocking**: Built-in Vitest mocking

## Development Commands
```bash
# Install dependencies
bun install

# Development build with watch
bun run dev

# Production build
bun run build

# Type checking
bun run check

# Linting
bun run lint

# Code formatting
bun run format

# Run tests
bun run test

# Run tests with watch mode
bun run test:watch

# Generate coverage report
bun run test:coverage

# Coverage with UI
bun run test:coverage:ui
```

## Obsidian Plugin APIs Used

### Core APIs
- **Plugin**: Base plugin class for lifecycle management
- **ItemView**: Custom view integration with workspace
- **WorkspaceLeaf**: View container management
- **TFile**: File system integration

### Data APIs
- **metadataCache**: Accessing note metadata and frontmatter
- **vault**: File operations and note content reading
- **workspace**: UI integration and view management

### Settings APIs
- **PluginSettingTab**: Settings interface
- **loadData/saveData**: Persistent data storage

## State Management Architecture

### Zustand Store Pattern
- **Single Store**: Centralized state with `useCardExplorerStore`
- **Middleware**: `subscribeWithSelector` for reactive updates
- **Immutable Updates**: All state changes create new objects
- **Automatic Recomputation**: Derived state updates automatically

### Store Modules
- **cardExplorerStore.ts**: Main store with state and actions
- **filters/**: Filter logic and application
- **noteProcessing/**: Note loading and metadata extraction
- **selectors/**: Computed state selectors
- **sorting/**: Sort logic and pin management
- **utils/**: Shared constants and utilities

## Component Architecture

### React Patterns
- **Functional Components**: All components use hooks
- **Error Boundaries**: React error handling with fallback UI
- **Memoization**: Performance optimization with useMemo/useCallback
- **Virtual Scrolling**: react-virtuoso for large datasets

### Component Structure
- **CardView**: Main container component with error boundaries
- **CardViewErrorBoundary**: React error boundary wrapper
- **ErrorFallback**: Error display component with retry functionality
- **FilterPanel**: Filter controls and UI
- **VirtualList**: Virtualized note list wrapper
- **NoteCard**: Individual note display with pin functionality

## Type System

### TypeScript Configuration
- **Strict Mode**: Full type checking enabled
- **Module System**: ES modules with proper imports/exports
- **Type Definitions**: Comprehensive interfaces for all data structures

### Type Organization
- **Domain Types**: Separate files for different concerns (note.ts, filter.ts, etc.)
- **Type Guards**: Runtime validation for external data
- **Generic Utilities**: Reusable type-safe functions

## Error Handling & Reliability

### Error Management
- **Comprehensive Error Handling**: Centralized error handling with categories (API, DATA, UI, GENERAL)
- **Retry Mechanisms**: Exponential backoff for transient failures
- **User-Friendly Messages**: Technical errors converted to actionable user guidance
- **Error Boundaries**: React error boundaries for component isolation
- **Graceful Degradation**: Fallback values and recovery mechanisms

### Data Reliability
- **Data Validation**: Runtime validation for all plugin data and settings
- **Automatic Backups**: Backup creation before data modifications
- **Data Migration**: Versioned data with automatic migration between versions
- **Recovery System**: Automatic recovery from backup on data corruption

## Performance Optimizations

### Virtual Scrolling
- **react-virtuoso**: Handles large note lists efficiently
- **Dynamic Heights**: Supports variable card heights
- **Smooth Scrolling**: Optimized scroll performance

### React Optimizations
- **Memoization**: Expensive computations cached with useMemo/useCallback
- **Selective Re-renders**: Minimized component updates through proper dependency arrays
- **Efficient State Updates**: Batched state changes with automatic recomputation
- **Debounced Operations**: File system events and auto-save operations debounced

### Data Processing
- **Immutable Operations**: Functional data transformations
- **Cached Computations**: Memoized filter and sort results
- **Automatic Recomputation**: Derived state updates automatically when dependencies change
- **Optimized Filtering**: Multi-stage filtering pipeline with early exits

This technology stack provides a modern, performant, and maintainable foundation for the Card View Explorer plugin with comprehensive error handling and data reliability.
