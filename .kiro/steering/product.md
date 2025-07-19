# Product Overview

This is an Obsidian plugin called "Card Explorer" that provides a card-based view for recently edited notes with comprehensive filtering and management capabilities.

## Core Features
- **Card-Based Display**: Visual tile/card format showing note title, preview (first 3 lines), and metadata
- **Comprehensive Filtering**: Multi-criteria filtering by tags, folders, filenames, and date ranges
- **Pin Management**: Pin important notes to keep them at the top of the list
- **Virtual Scrolling**: High-performance rendering for large note collections
- **Customizable Sorting**: Sort by frontmatter fields or file modification time
- **Real-Time Updates**: Automatic refresh when notes are created, modified, or deleted
- **Error Recovery**: Robust error handling with retry mechanisms and user-friendly messages
- **Data Reliability**: Automatic backup and recovery system for user data

## Advanced Features
- **Date Range Filtering**: Filter notes by "within X days" or "after specific date"
- **Exclusion Filters**: Exclude specific folders, tags, or filename patterns
- **Auto-Start Option**: Automatically open Card Explorer when Obsidian starts
- **Sidebar Integration**: Option to display in sidebar or main workspace area
- **Debounced Operations**: Optimized performance with debounced file system events
- **Persistent State**: Remembers filter settings, pin states, and sort configuration

## Target Users
Obsidian users who want to quickly browse and access their recently modified notes in a visual card format, with powerful filtering capabilities for large note collections. Particularly useful for users with extensive vaults who need efficient note discovery and management.

## Technical Highlights
- **React 18**: Modern React with hooks and functional components
- **Zustand State Management**: Centralized state with automatic recomputation
- **TypeScript**: Full type safety with comprehensive interfaces
- **Comprehensive Testing**: Unit, integration, and component tests with high coverage
- **Error Boundaries**: React error boundaries for component isolation
- **Data Migration**: Versioned data with automatic migration between plugin versions

## Key Constraints
- Does not handle note relationships (links or graph)
- Fixed design with no CSS customization
- Requires Obsidian 0.15.0 or higher
