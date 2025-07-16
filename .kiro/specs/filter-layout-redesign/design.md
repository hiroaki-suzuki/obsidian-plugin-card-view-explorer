# Design Document

## Overview

This design document outlines the redesign of the Card Explorer's filter interface, moving from a sidebar-based layout to a top-positioned, horizontal filter panel. The new design will provide better space utilization, improved user experience, and a more modern interface that adapts to different screen sizes.

## Architecture

### Layout Architecture Changes

**Current Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│                    Header (Title + Stats)                   │
├─────────────────┬───────────────────────────────────────────┤
│   Filter Panel  │           Note Cards Area                 │
│   (Sidebar)     │         (Virtual List)                    │
│                 │                                           │
│                 │                                           │
├─────────────────┴───────────────────────────────────────────┤
│                    Footer (Refresh)                         │
└─────────────────────────────────────────────────────────────┘
```

**New Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│          Header (Title + Stats + Refresh Button)            │
├─────────────────────────────────────────────────────────────┤
│              Filter Panel (Top, Horizontal)                 │
│  [Search] [Folders] [Tags] [Date] [Toggle] [Clear]         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│              Note Cards Area (Full Width)                   │
│                    (Virtual List)                           │
│                                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Component Architecture

#### Updated CardView Structure
```typescript
<CardView>
  <CardViewErrorBoundary>
    <div className="card-view-container">
      <div className="card-view-header">
        <div className="header-left">
          <h2 className="card-view-title">Card Explorer</h2>
          <div className="card-view-stats">
            {/* Stats display */}
          </div>
        </div>
        <div className="header-right">
          <button className="refresh-button">
            Refresh Notes
          </button>
        </div>
      </div>

      <div className="card-view-filter-area">
        <FilterPanel
          availableTags={availableTags}
          availableFolders={availableFolders}
          layout="horizontal"
          collapsible={true}
        />
      </div>

      <div className="card-view-content">
        {/* Full-width note cards area */}
        <div className="card-view-main">
          <VirtualList plugin={plugin} />
        </div>
      </div>
    </div>
  </CardViewErrorBoundary>
</CardView>
```

## Components and Interfaces

### Enhanced FilterPanel Component

#### New Props Interface
```typescript
interface FilterPanelProps {
  /** Available tags from all notes for tag filter dropdown */
  availableTags: string[];
  /** Available folders from all notes for folder filter dropdown */
  availableFolders: string[];
  /** Layout mode for the filter panel */
  layout?: 'horizontal' | 'vertical';
  /** Whether the panel can be collapsed */
  collapsible?: boolean;
  /** Initial collapsed state */
  initialCollapsed?: boolean;
}
```

#### Enhanced State Management
```typescript
interface FilterPanelState {
  // Existing filter state
  filters: FilterState;

  // New UI state
  isCollapsed: boolean;
  showAdvancedFilters: boolean;
  folderInputValue: string;
  folderSuggestions: string[];
}

// New actions
interface FilterPanelActions {
  toggleCollapsed: () => void;
  toggleAdvancedFilters: () => void;
  updateFolderInput: (value: string) => void;
  selectFolderSuggestion: (folder: string) => void;
}
```

### Horizontal Filter Layout Design

#### Primary Filter Row
```typescript
<div className="filter-panel-primary">
  <div className="filter-group-inline">
    <label>Search:</label>
    <input
      type="text"
      placeholder="Search filenames..."
      className="filter-input-compact"
    />
  </div>

  <div className="filter-group-inline">
    <label>Folders:</label>
    <input
      type="text"
      placeholder="Type folder name..."
      className="filter-input-compact"
      list="folder-suggestions"
    />
    <datalist id="folder-suggestions">
      {availableFolders.map(folder =>
        <option key={folder} value={folder} />
      )}
    </datalist>
  </div>

  <div className="filter-group-inline">
    <label>Tags:</label>
    <select multiple className="filter-select-compact">
      {availableTags.map(tag =>
        <option key={tag} value={tag}>#{tag}</option>
      )}
    </select>
  </div>

  <div className="filter-actions">
    <button className="filter-toggle-btn">
      {isCollapsed ? 'Show Filters' : 'Hide Filters'}
    </button>
    <button className="clear-filters-btn">Clear All</button>
  </div>
</div>
```

#### Secondary Filter Row (Collapsible)
```typescript
{!isCollapsed && (
  <div className="filter-panel-secondary">
    <div className="filter-group-inline">
      <label>Date:</label>
      <select className="date-type-select-compact">
        <option value="within">Within last</option>
        <option value="after">After date</option>
      </select>
      <input
        type={dateType === "within" ? "number" : "date"}
        className="date-input-compact"
      />
      <button className="apply-date-btn-compact">Apply</button>
    </div>

    <div className="filter-group-inline">
      <label>Advanced:</label>
      <button
        className="advanced-filters-btn"
        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
      >
        {showAdvancedFilters ? 'Hide Advanced' : 'Show Advanced'}
      </button>
    </div>
  </div>
)}
```

#### Advanced Filters (Expandable)
```typescript
{showAdvancedFilters && (
  <div className="filter-panel-advanced">
    <div className="filter-group-inline">
      <label>Exclude Folders:</label>
      <input
        type="text"
        placeholder="Folders to exclude..."
        className="filter-input-compact"
      />
    </div>

    <div className="filter-group-inline">
      <label>Exclude Tags:</label>
      <select multiple className="filter-select-compact">
        {availableTags.map(tag =>
          <option key={tag} value={tag}>#{tag}</option>
        )}
      </select>
    </div>
  </div>
)}
```

### Folder Input with Autocomplete

#### Implementation Strategy
```typescript
const FolderInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  onSelect: (folder: string) => void;
}> = ({ value, onChange, suggestions, onSelect }) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);

  const handleInputChange = (inputValue: string) => {
    onChange(inputValue);

    // Filter suggestions based on input
    const filtered = suggestions.filter(folder =>
      folder.toLowerCase().includes(inputValue.toLowerCase())
    );
    setFilteredSuggestions(filtered);
    setShowSuggestions(inputValue.length > 0 && filtered.length > 0);
  };

  const handleSuggestionClick = (folder: string) => {
    onSelect(folder);
    setShowSuggestions(false);
  };

  return (
    <div className="folder-input-container">
      <input
        type="text"
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        placeholder="Type folder name..."
        className="folder-input"
        onFocus={() => setShowSuggestions(filteredSuggestions.length > 0)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
      />

      {showSuggestions && (
        <div className="folder-suggestions">
          {filteredSuggestions.map(folder => (
            <div
              key={folder}
              className="folder-suggestion"
              onClick={() => handleSuggestionClick(folder)}
            >
              {folder || "(Root)"}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

## Data Models

### Enhanced Filter State
```typescript
interface FilterState {
  // Existing filters
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

  // New UI state
  folderInput: string;
  isCollapsed: boolean;
  showAdvanced: boolean;
}
```

### Filter Panel Configuration
```typescript
interface FilterPanelConfig {
  layout: 'horizontal' | 'vertical';
  collapsible: boolean;
  showAdvanced: boolean;
  compactMode: boolean;
  responsiveBreakpoint: number;
}
```

## Error Handling

### Input Validation
```typescript
// Folder input validation
const validateFolderInput = (input: string): boolean => {
  // Check for valid folder path characters
  const invalidChars = /[<>:"|?*]/;
  return !invalidChars.test(input);
};

// Date input validation
const validateDateInput = (input: string, type: 'within' | 'after'): boolean => {
  if (type === 'within') {
    const days = parseInt(input, 10);
    return !isNaN(days) && days > 0 && days <= 365;
  } else {
    const date = new Date(input);
    return !isNaN(date.getTime());
  }
};
```

### Error States
```typescript
interface FilterErrorState {
  folderInputError: string | null;
  dateInputError: string | null;
  generalError: string | null;
}

// Error handling in component
const [errors, setErrors] = useState<FilterErrorState>({
  folderInputError: null,
  dateInputError: null,
  generalError: null
});
```

## Testing Strategy

### Component Testing
```typescript
describe('FilterPanel Horizontal Layout', () => {
  test('should render in horizontal layout mode', () => {
    render(<FilterPanel layout="horizontal" {...props} />);
    expect(screen.getByTestId('filter-panel-horizontal')).toBeInTheDocument();
  });

  test('should toggle collapsed state', async () => {
    render(<FilterPanel collapsible={true} {...props} />);

    const toggleButton = screen.getByText('Hide Filters');
    await user.click(toggleButton);

    expect(screen.getByText('Show Filters')).toBeInTheDocument();
    expect(screen.queryByTestId('filter-panel-secondary')).not.toBeInTheDocument();
  });

  test('should handle folder input with autocomplete', async () => {
    render(<FilterPanel {...props} />);

    const folderInput = screen.getByPlaceholderText('Type folder name...');
    await user.type(folderInput, 'test');

    expect(screen.getByTestId('folder-suggestions')).toBeInTheDocument();
  });
});
```

### Layout Testing
```typescript
describe('Responsive Filter Layout', () => {
  test('should adapt to narrow screens', () => {
    // Mock narrow viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 600,
    });

    render(<FilterPanel {...props} />);

    expect(screen.getByTestId('filter-panel-stacked')).toBeInTheDocument();
  });

  test('should maintain functionality in compact mode', async () => {
    render(<FilterPanel compactMode={true} {...props} />);

    // Test that all filter functions still work
    const searchInput = screen.getByPlaceholderText('Search filenames...');
    await user.type(searchInput, 'test');

    expect(mockUpdateFilters).toHaveBeenCalledWith({ filename: 'test' });
  });
});
```

### Integration Testing
```typescript
describe('Filter Panel Integration', () => {
  test('should integrate with CardView layout', () => {
    render(<CardView plugin={mockPlugin} />);

    const filterArea = screen.getByTestId('card-view-filter-area');
    const mainArea = screen.getByTestId('card-view-main');

    expect(filterArea).toBeInTheDocument();
    expect(mainArea).toHaveClass('full-width');
  });

  test('should preserve filter state when toggling layout', async () => {
    const { rerender } = render(<FilterPanel layout="horizontal" {...props} />);

    // Set some filters
    await user.type(screen.getByPlaceholderText('Search filenames...'), 'test');

    // Change layout
    rerender(<FilterPanel layout="vertical" {...props} />);

    // Verify filters are preserved
    expect(screen.getByDisplayValue('test')).toBeInTheDocument();
  });
});
```

## Performance Considerations

### Optimization Strategies

#### Debounced Input Handling
```typescript
const useDebouncedFilterUpdate = (delay: number = 300) => {
  const { updateFilters } = useCardExplorerStore();

  return useCallback(
    debounce((filters: Partial<FilterState>) => {
      updateFilters(filters);
    }, delay),
    [updateFilters]
  );
};
```

#### Memoized Suggestions
```typescript
const folderSuggestions = useMemo(() => {
  return availableFolders
    .filter(folder =>
      folder.toLowerCase().includes(folderInput.toLowerCase())
    )
    .slice(0, 10); // Limit suggestions for performance
}, [availableFolders, folderInput]);
```

#### Virtual Scrolling for Large Tag Lists
```typescript
const TagSelector: React.FC<{ tags: string[] }> = ({ tags }) => {
  if (tags.length > 100) {
    return (
      <VirtualizedSelect
        options={tags.map(tag => ({ value: tag, label: `#${tag}` }))}
        maxHeight={200}
        itemHeight={32}
      />
    );
  }

  return <StandardSelect options={tags} />;
};
```

## Accessibility Features

### Keyboard Navigation
```typescript
const handleKeyDown = (event: KeyboardEvent) => {
  switch (event.key) {
    case 'Tab':
      // Handle tab navigation between filter controls
      break;
    case 'Escape':
      // Close suggestions or collapse panel
      if (showSuggestions) {
        setShowSuggestions(false);
      } else if (!isCollapsed) {
        toggleCollapsed();
      }
      break;
    case 'Enter':
      // Apply current filter or select suggestion
      break;
  }
};
```

### ARIA Labels and Roles
```typescript
<div
  className="filter-panel-horizontal"
  role="search"
  aria-label="Filter controls for note cards"
>
  <div
    className="filter-panel-primary"
    role="toolbar"
    aria-label="Primary filters"
  >
    <input
      aria-label="Search note filenames"
      aria-describedby="filename-help"
    />
    <div id="filename-help" className="sr-only">
      Type to search note filenames
    </div>
  </div>
</div>
```

### Screen Reader Support
```typescript
// Announce filter changes
const announceFilterChange = (filterType: string, value: string) => {
  const announcement = `${filterType} filter ${value ? 'applied' : 'cleared'}`;

  // Use live region for announcements
  const liveRegion = document.getElementById('filter-announcements');
  if (liveRegion) {
    liveRegion.textContent = announcement;
  }
};
```

This design provides a comprehensive approach to redesigning the filter interface with improved usability, better space utilization, and enhanced user experience while maintaining all existing functionality.
