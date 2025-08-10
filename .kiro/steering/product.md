---
inclusion: always
---

# Product Specifications & UI Patterns

## User Experience Requirements

### Loading & Error States
- **Progressive Loading**: Show skeleton cards during initial load
- **Loading Indicators**: Visual feedback for all async operations
- **Empty States**: Helpful messages when no notes match filters
- **Overlay Pattern**: Show loading overlay for refresh operations
- **Error Recovery**: Always provide retry mechanisms, no technical details in UI

### Card Display Behavior
- **Card Content**: Title + 3-line preview + metadata (tags, folder, modified date)
- **Pin System**: Pinned notes ALWAYS appear first regardless of sort criteria
- **Real-Time Updates**: Auto-refresh on vault changes (debounced 300ms)
- **Virtual Scrolling**: MANDATORY for >100 notes using `VirtualizedNoteGrid`

### Filter & Sort UX
- **Multi-Criteria Filtering**: Tags (include/exclude), folders, filename patterns, date ranges
- **Date Filtering**: "Within X days" and "After specific date" options
- **Default Sort**: Modified date (most recent first)
- **Sort Options**: Modified date, frontmatter fields, filename
- **State Persistence**: Save filter and sort configuration

## Technical Constraints & Boundaries

### Obsidian Integration
- **Minimum Version**: Obsidian 0.15.0+
- **View Pattern**: Extend `ItemView`, implement workspace leaf management
- **Settings Integration**: Use Obsidian's settings tab system

### Feature Scope
- **Read-Only**: No inline note editing capabilities
- **Markdown Only**: Process only `.md` files from vault
- **No Link Analysis**: Does not process note relationships or backlinks
- **No Export**: Does not provide note export functionality
- **Fixed Styling**: No user customization of CSS

### Data Processing
- **Recent Focus**: Default to notes modified within 30 days
- **Metadata Extraction**: Process frontmatter and basic file properties only
- **Memory Management**: Limit cached note previews, implement cleanup
- **Lazy Loading**: Only process notes in viewport

## Extension Guidelines

### Adding New Features
- **Filter Types**: Must integrate with existing `FilterState` interface
- **Sort Criteria**: Must respect pin priority system
- **UI Components**: Follow error boundary and loading state patterns
- **Data Fields**: Require validation functions and default values

### Performance Requirements
- **Debouncing**: File system events MUST be debounced (minimum 300ms)
- **Virtual Scrolling**: Use `react-virtuoso` for any list >100 items
- **Graceful Degradation**: Show partial results if some notes fail
- **Fallback States**: Always provide defaults when data unavailable
