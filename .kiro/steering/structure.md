# Project Structure

## Actual Implementation Structure
```
obsidian-plugin-card-explorer/
├── .git/                           # Git repository
├── .kiro/                          # Kiro AI assistant configuration
│   ├── specs/                      # Feature specifications
│   │   └── obsidian-card-explorer/ # Card View Explorer feature spec
│   └── steering/                   # AI guidance documents
├── docs/                           # Documentation
│   ├── 001-requirements.md         # Project requirements (Japanese)
│   └── ja/                         # Japanese documentation
├── coverage/                       # Test coverage reports
├── src/                            # Source code (implemented)
│   ├── main.ts                     # Plugin entry point
│   ├── settings.ts                 # Plugin settings interface
│   ├── view.tsx                    # Card View Explorer React view
│   ├── components/                 # React components
│   │   ├── CardView.tsx            # Main container component
│   │   ├── CardView.test.tsx       # CardView component tests
│   │   ├── CardViewErrorBoundary.tsx # Error boundary wrapper
│   │   ├── CardViewErrorBoundary.test.tsx # Error boundary tests
│   │   ├── ErrorFallback.tsx       # Error display component
│   │   ├── FilterPanel.tsx         # Filter controls
│   │   ├── FilterPanel.test.tsx    # FilterPanel component tests
│   │   ├── NoteCard.tsx            # Individual note card
│   │   ├── NoteCard.test.tsx       # NoteCard component tests
│   │   ├── VirtualList.tsx         # Virtualized list wrapper
│   │   └── VirtualList.test.tsx    # VirtualList component tests
│   ├── store/                      # State management (Zustand)
│   │   ├── cardExplorerStore.ts    # Main store
│   │   ├── cardExplorerStore.test.ts # Store tests
│   │   ├── filters/                # Filter logic
│   │   ├── noteProcessing/         # Note loading & metadata
│   │   ├── selectors/              # State selectors
│   │   ├── sorting/                # Sort logic
│   │   └── utils/                  # Store utilities
│   ├── types/                      # TypeScript type definitions
│   │   ├── index.ts                # Type exports
│   │   ├── note.ts                 # Note data models
│   │   ├── filter.ts               # Filter types
│   │   ├── sort.ts                 # Sort configuration
│   │   └── plugin.ts               # Plugin interfaces
│   ├── utils/                      # Utility functions
│   │   ├── dataBackup.ts           # Data backup system
│   │   ├── dataBackup.test.ts      # Backup system tests
│   │   ├── dataMigration.ts        # Data migration utilities
│   │   ├── dataMigration.test.ts   # Migration tests
│   │   ├── dataPersistence.ts      # Data loading/saving
│   │   ├── dataPersistence.test.ts # Persistence tests
│   │   ├── dateUtils.ts            # Date formatting utilities
│   │   ├── dateUtils.test.ts       # Date utility tests
│   │   ├── errorHandling.ts        # Error handling system
│   │   ├── errorHandling.test.ts   # Error handling tests
│   │   ├── validation.ts           # Data validation
│   │   └── validation.test.ts      # Validation tests
│   ├── test/                       # Test utilities
│   │   ├── obsidian-mock.ts        # Obsidian API mocks
│   │   └── setup.ts                # Test setup configuration
│   ├── integration.test.ts         # Integration tests
│   ├── main.test.ts                # Main plugin tests
│   ├── settings.test.ts            # Settings tests
│   └── view.test.ts                # View tests
├── .gitignore                      # Git ignore rules
├── LICENSE                         # MIT License
├── README.md                       # Project overview
├── package.json                    # Dependencies and scripts
├── tsconfig.json                   # TypeScript configuration
├── manifest.json                   # Obsidian plugin manifest
├── versions.json                   # Plugin version history
├── esbuild.config.mjs              # Build configuration
├── vitest.config.ts                # Test configuration
├── biome.json                      # Code formatting/linting
└── styles.css                      # Plugin styles
```

## Architecture Overview

### Plugin Entry Point
- `main.ts` - Main plugin class extending Obsidian's Plugin
- `view.tsx` - React view integration with Obsidian's ItemView
- `settings.ts` - Plugin configuration interface

### State Management Architecture
- **Store Pattern**: Zustand with subscribeWithSelector middleware
- **Reactive Updates**: Automatic recomputation of filtered/sorted results
- **Immutable State**: All state updates create new objects
- **Centralized Logic**: All business logic contained in store modules

### Component Architecture
- **Container Pattern**: CardView orchestrates all child components
- **Error Boundaries**: React error handling with fallback UI
- **Memoization**: Performance optimization with useMemo/useCallback
- **Virtual Scrolling**: react-virtuoso for large note lists

### Data Flow
1. **Note Loading**: Obsidian APIs → noteProcessing → store
2. **Filtering**: Raw notes → filter logic → filtered results
3. **Sorting**: Filtered notes → sort logic → final display order
4. **UI Updates**: Store changes → React re-renders → DOM updates

## Key Design Patterns

### Store Modules
- **Separation of Concerns**: Each module handles specific functionality
- **Composable Logic**: Modules can be combined and reused
- **Testable Units**: Each module can be tested independently

### Type Safety
- **Comprehensive Types**: All data structures have TypeScript interfaces
- **Type Guards**: Runtime type checking for external data
- **Generic Utilities**: Reusable type-safe utility functions

### Performance Optimizations
- **Virtual Scrolling**: Only render visible note cards
- **Memoized Computations**: Cache expensive filter/sort operations
- **Selective Re-renders**: Minimize React component updates

## Testing Strategy
- **Unit Tests**: Individual functions and components (all major modules have .test.ts files)
- **Integration Tests**: Store interactions and data flow (integration.test.ts)
- **Component Tests**: React component testing with @testing-library/react
- **Coverage Reports**: Comprehensive test coverage tracking with v8 provider
- **Mock Obsidian APIs**: Test utilities for Obsidian integration (obsidian-mock.ts)
- **Test Setup**: Centralized test configuration (setup.ts) with jsdom environment
