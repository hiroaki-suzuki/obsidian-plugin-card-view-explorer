# Design Document

## Overview

The Obsidian Card Explorer plugin provides a card-based interface for browsing recently edited notes. The plugin integrates with Obsidian's existing APIs to create a responsive, filterable view that helps users quickly locate and access their notes through visual previews.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Obsidian Application                     │
├─────────────────────────────────────────────────────────────┤
│  Card Explorer Plugin                                       │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │   Main Plugin   │  │   Settings      │  │   View      │ │
│  │   (main.ts)     │  │   (settings.ts) │  │   (view.ts) │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
│           │                     │                   │       │
│           └─────────────────────┼───────────────────┘       │
│                                 │                           │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              React Layer                                │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │            Zustand Store                            │ │ │
│  │  │  • Notes Data    • Filters    • Sort Config        │ │ │
│  │  │  • Pin State     • UI State   • Actions            │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  │                           │                             │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐ │ │
│  │  │  CardView   │  │ FilterPanel │  │   NoteCard      │ │ │
│  │  │   (.tsx)    │  │   (.tsx)    │  │    (.tsx)       │ │ │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘ │ │
│  │           │               │                 │           │ │
│  │           └───────────────┼─────────────────┘           │ │
│  │                           │                             │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │            VirtualList (.tsx)                       │ │ │
│  │  │         (react-virtuoso)                            │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                    Obsidian APIs                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │metadataCache│  │    vault    │  │     workspace       │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Plugin Integration Points

1. **Plugin Registration**: Main plugin class extends Obsidian's Plugin base class
2. **View Registration**: Custom ItemView registered with workspace for tab/pane display
3. **Command Registration**: Commands registered for palette access using addCommand()
4. **Settings Integration**: Plugin settings integrated with Obsidian's settings system
5. **Ribbon Integration**: Optional ribbon icon for quick access
6. **Event Handling**: Subscribe to vault and metadata cache events for real-time updates

## Components and Interfaces

### Core Plugin Components

#### Main Plugin (main.ts)
- **Purpose**: Plugin lifecycle management and Obsidian integration
- **Extends**: Plugin from Obsidian API
- **Responsibilities**:
  - Plugin initialization (onload) and cleanup (onunload)
  - View type registration using registerView()
  - Command registration using addCommand()
  - Settings tab registration using addSettingTab()
  - Event subscription (vault events, metadata cache events)
  - Data persistence coordination using loadData() and saveData()

#### Card Explorer View (view.ts)
- **Purpose**: Obsidian ItemView implementation for the card interface
- **Extends**: ItemView from Obsidian API
- **Responsibilities**:
  - View lifecycle management (onOpen, onClose)
  - React component mounting in containerEl
  - Obsidian workspace integration
  - View state management
  - Handle view type registration and icon

#### Settings Manager (settings.ts)
- **Purpose**: Plugin configuration management
- **Responsibilities**:
  - Settings schema definition
  - Default values management
  - Settings UI integration
  - Configuration persistence

### State Management with Zustand

#### Card Explorer Store
```typescript
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface CardExplorerState {
  // Data
  notes: NoteData[];
  filteredNotes: NoteData[];
  pinnedNotes: Set<string>;

  // UI State
  filters: FilterState;
  sortConfig: SortConfig;
  isLoading: boolean;

  // Actions
  setNotes: (notes: NoteData[]) => void;
  updateFilters: (filters: Partial<FilterState>) => void;
  updateSortConfig: (config: SortConfig) => void;
  togglePin: (filePath: string) => void;
  refreshNotes: () => Promise<void>;
}

const useCardExplorerStore = create<CardExplorerState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    notes: [],
    filteredNotes: [],
    pinnedNotes: new Set(),
    filters: {
      folders: [],
      tags: [],
      filename: '',
      dateRange: null,
      excludeFolders: [],
      excludeTags: [],
      excludeFilenames: []
    },
    sortConfig: { key: 'updated', order: 'desc' },
    isLoading: false,

    // Actions
    setNotes: (notes) => set({ notes }),
    updateFilters: (newFilters) => set((state) => ({
      filters: { ...state.filters, ...newFilters }
    })),
    updateSortConfig: (config) => set({ sortConfig: config }),
    togglePin: (filePath) => set((state) => {
      const newPinned = new Set(state.pinnedNotes);
      if (newPinned.has(filePath)) {
        newPinned.delete(filePath);
      } else {
        newPinned.add(filePath);
      }
      return { pinnedNotes: newPinned };
    }),
    refreshNotes: async () => {
      set({ isLoading: true });
      // Note loading logic will be implemented here
      set({ isLoading: false });
    }
  }))
);
```

### React Components

#### CardView Component
- **Purpose**: Main container component for the card interface
- **Props**:
  ```typescript
  interface CardViewProps {
    plugin: CardExplorerPlugin;
  }
  ```
- **State**: Uses Zustand store for all state management

#### FilterPanel Component
- **Purpose**: Search and filter controls
- **Props**:
  ```typescript
  interface FilterPanelProps {
    availableTags: string[];
    availableFolders: string[];
  }
  ```
- **State**: Uses Zustand store for filters and actions

#### NoteCard Component
- **Purpose**: Individual note card display
- **Props**:
  ```typescript
  interface NoteCardProps {
    note: NoteData;
    plugin: CardExplorerPlugin;
  }
  ```
- **State**: Uses Zustand store for pin state and actions

#### VirtualList Component
- **Purpose**: Performance-optimized list rendering with react-virtuoso
- **Props**:
  ```typescript
  interface VirtualListProps {
    plugin: CardExplorerPlugin;
  }
  ```
- **State**: Uses Zustand store for filtered notes data

## Data Models

### Core Data Types

```typescript
import { TFile, CachedMetadata } from 'obsidian';

interface NoteData {
  file: TFile; // Obsidian TFile object
  title: string;
  path: string;
  preview: string; // First 3 lines of content
  lastModified: Date;
  frontmatter: Record<string, any> | null;
  tags: string[];
  folder: string;
}

interface FilterState {
  folders: string[];
  tags: string[];
  filename: string;
  dateRange: {
    type: 'within' | 'after';
    value: Date;
  } | null;
  excludeFolders: string[];
  excludeTags: string[];
  excludeFilenames: string[];
}

interface SortConfig {
  key: string; // frontmatter key or 'mtime'
  order: 'asc' | 'desc';
}

interface PluginSettings {
  sortKey: string;
  autoStart: boolean;
  showInSidebar: boolean;
}

interface PluginData {
  pinnedNotes: string[]; // Array of file paths
  lastFilters: FilterState;
  sortConfig: SortConfig;
}

// Obsidian-specific types
interface CardExplorerPlugin extends Plugin {
  settings: PluginSettings;
  data: PluginData;
}
```

### Data Flow

1. **Note Loading**: Plugin queries metadataCache.getAllFiles() for all markdown files
2. **Metadata Extraction**: Use metadataCache.getFileCache() to get frontmatter and tags
3. **Content Preview**: Use vault.cachedRead() to extract first 3 lines of content
4. **Data Processing**: Raw note data transformed into NoteData objects
5. **Filtering**: FilterState applied to note collection
6. **Sorting**: Notes sorted according to SortConfig with fallback to file.stat.mtime
7. **Pinning**: Pinned notes moved to top of list
8. **Rendering**: Processed data passed to React components

## Error Handling

### Error Categories

1. **API Errors**: Obsidian API failures (vault access, metadata cache)
2. **Data Errors**: Invalid frontmatter, missing files, corrupted data.json
3. **UI Errors**: React component errors, rendering failures

### Error Handling Strategy

```typescript
// Global error boundary for React components
class CardExplorerErrorBoundary extends React.Component {
  // Handle component errors gracefully
}

// API error handling
async function safeApiCall<T>(operation: () => Promise<T>): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    console.error('Card Explorer API Error:', error);
    new Notice('Card Explorer: Operation failed');
    return null;
  }
}

// Data validation
function validateNoteData(data: any): data is NoteData {
  // Validate required fields and types
}
```

### Fallback Behaviors

- **Missing Frontmatter**: Fall back to file modification time for sorting
- **Invalid Preview**: Show filename if content extraction fails
- **API Failures**: Display error message with retry option
- **Empty Results**: Show helpful empty state with suggestions

## Testing Strategy

### Unit Testing

- **Data Processing**: Test note data transformation and filtering logic
- **Settings Management**: Test configuration persistence and validation
- **Utility Functions**: Test helper functions for date handling, text extraction

### Component Testing

- **React Components**: Test component rendering and user interactions
- **Props Validation**: Test component behavior with various prop combinations
- **Event Handling**: Test user interaction callbacks

### Integration Testing

- **Obsidian API Integration**: Test plugin registration and API usage
- **View Integration**: Test view lifecycle and workspace integration
- **Data Persistence**: Test settings and pin state persistence



### Testing Tools

```typescript
// Vitest for unit testing
describe('NoteDataProcessor', () => {
  test('should extract preview from note content', () => {
    // Test implementation
  });
});

// React Testing Library for component testing
import { render, fireEvent } from '@testing-library/react';

test('NoteCard should handle click events', () => {
  // Component test implementation
});
```

### Mock Strategy

- **Obsidian APIs**: Mock metadataCache, vault, and workspace APIs
- **File System**: Mock file operations for testing
- **React Components**: Mock child components for isolated testing
