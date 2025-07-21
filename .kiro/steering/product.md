---
inclusion: always
---

# Card View Explorer - Product Requirements

**Plugin Identity**: Obsidian Card View Explorer - Visual note browser with advanced filtering for recently edited notes.

## Feature Requirements

### Core Display Features
- **Card Format**: Title + 3-line preview + metadata (tags, folder, modified date)
- **Pin System**: Pinned notes always appear at top, maintain pin state across sessions
- **Virtual Scrolling**: REQUIRED for lists >100 notes using react-virtuoso
- **Real-Time Updates**: Auto-refresh on vault changes (create/modify/delete/rename)

### Filtering Requirements
- **Multi-Criteria**: Tags (include/exclude), folders (include/exclude), filename patterns, date ranges
- **Date Filtering**: "Within X days" and "After specific date" options
- **Persistent Filters**: Save filter state between sessions
- **Filter Validation**: Validate filter inputs, show clear error messages

### Sorting Requirements
- **Sort Options**: Modified date (default), frontmatter fields, filename
- **Pin Priority**: Pinned notes always sort first regardless of other criteria
- **Sort Persistence**: Remember sort configuration across sessions

### Performance Requirements
- **Debounced Updates**: File system events must be debounced (300ms minimum)
- **Lazy Loading**: Only process visible notes in viewport
- **Memory Management**: Limit cached note previews to prevent memory leaks

## User Experience Rules

### Error Handling Standards
- **Graceful Degradation**: Show partial results if some notes fail to load
- **User-Friendly Messages**: No technical error details in UI
- **Retry Mechanisms**: Allow users to retry failed operations
- **Fallback States**: Always provide fallback when data unavailable

### Loading States
- **Progressive Loading**: Show skeleton cards while loading
- **Loading Indicators**: Clear visual feedback for all async operations
- **Empty States**: Helpful messages when no notes match filters

### Data Integrity
- **Auto-Backup**: Create backups before any data modifications
- **Migration Support**: Handle plugin data format changes automatically
- **Validation**: Validate all user data before persistence

## Technical Constraints

### Obsidian Integration
- **Minimum Version**: Obsidian 0.15.0+
- **View Integration**: Must extend ItemView, support workspace leaf management
- **Settings Integration**: Use Obsidian's settings tab system
- **Command Integration**: Register plugin commands for common actions

### Feature Limitations
- **No Link Analysis**: Does not process note relationships or backlinks
- **No Custom Styling**: Fixed CSS design, no user customization
- **No Export**: Does not provide note export functionality
- **No Editing**: Read-only view, no inline note editing

### Data Scope
- **Markdown Only**: Only processes .md files from vault
- **Recent Focus**: Optimized for recently modified notes (default 30 days)
- **Metadata Only**: Extracts frontmatter and basic file properties

## Extension Guidelines

### Adding New Features
- **Filter Types**: New filters must integrate with existing FilterState interface
- **Sort Options**: New sort criteria must work with pin priority system
- **UI Components**: Must follow existing error boundary and loading state patterns
- **Data Fields**: New metadata fields require migration strategy

### Compatibility Rules
- **Backward Compatibility**: Plugin data must migrate forward, never break existing installations
- **API Stability**: Store interface changes require deprecation period
- **Settings Migration**: Settings format changes need automatic migration
