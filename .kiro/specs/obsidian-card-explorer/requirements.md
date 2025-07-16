# Requirements Document

## Introduction

Obsidian Card Explorer is an Obsidian plugin that provides a visual card-based interface for browsing recently edited notes, enabling users to efficiently view, search, and access their notes. This plugin focuses on individual note content and metadata rather than note relationships, offering an intuitive interface for note discovery.

## Requirements

### Requirement 1

**User Story:** As an Obsidian user, I want to view my recently edited notes in a card format, so that I can quickly identify and access the notes I need.

#### Acceptance Criteria

1. WHEN the user opens the Card Explorer view THEN the system SHALL display notes in a tile/card layout
2. WHEN displaying each card THEN the system SHALL show the note title, first 3 lines of content, and last modified date
3. WHEN extracting content preview THEN the system SHALL use the first 3 lines of text without markdown interpretation
4. WHEN no notes are available THEN the system SHALL display an appropriate empty state message

### Requirement 2

**User Story:** As an Obsidian user, I want to sort and organize the card view, so that I can find notes based on different criteria.

#### Acceptance Criteria

1. WHEN displaying cards THEN the system SHALL sort by frontmatter 'updated' field by default
2. WHEN user configures custom sort key THEN the system SHALL allow sorting by any frontmatter field
3. WHEN frontmatter sort key is unavailable THEN the system SHALL fallback to file modification time (file.mtime)
4. WHEN user selects sort order THEN the system SHALL support both ascending and descending order with descending as default
5. WHEN notes are pinned THEN the system SHALL always display pinned notes at the top regardless of sort order

### Requirement 3

**User Story:** As an Obsidian user, I want to filter and search through my notes, so that I can narrow down the displayed cards to find specific content.

#### Acceptance Criteria

1. WHEN user applies folder filter THEN the system SHALL allow selection of multiple folders
2. WHEN user applies tag filter THEN the system SHALL filter notes containing specified tags
3. WHEN user searches by filename THEN the system SHALL support partial matching
4. WHEN user sets date filter THEN the system SHALL support "within X days" and "after X date" conditions
5. WHEN user configures exclusions THEN the system SHALL allow excluding specific folders, tags, or filenames

### Requirement 4

**User Story:** As an Obsidian user, I want to pin important notes, so that they remain easily accessible at the top of the view.

#### Acceptance Criteria

1. WHEN user clicks pin icon on a card THEN the system SHALL toggle the pin state
2. WHEN a note is pinned THEN the system SHALL save the pin state to data.json
3. WHEN the view loads THEN the system SHALL restore pin states from data.json
4. WHEN notes are pinned THEN the system SHALL display them above unpinned notes

### Requirement 5

**User Story:** As an Obsidian user, I want to access the Card Explorer through multiple methods, so that I can integrate it into my workflow.

#### Acceptance Criteria

1. WHEN user searches command palette THEN the system SHALL provide a command to open Card Explorer
2. WHEN user opens Card Explorer THEN the system SHALL display it as a new tab
3. WHEN user configures side pane display THEN the system SHALL optionally show in side pane
4. WHEN user enables auto-start THEN the system SHALL optionally open Card Explorer on Obsidian startup
5. WHEN user clicks on a card THEN the system SHALL open the note in the active pane

### Requirement 6

**User Story:** As an Obsidian user, I want the Card Explorer to perform well with large numbers of notes, so that the interface remains responsive.

#### Acceptance Criteria

1. WHEN displaying large numbers of cards THEN the system SHALL implement virtual scrolling using react-virtuoso
2. WHEN loading note metadata THEN the system SHALL use Obsidian's metadataCache for efficient access
3. WHEN the view updates THEN the system SHALL maintain smooth scrolling performance

### Requirement 7

**User Story:** As an Obsidian user, I want to customize certain aspects of the Card Explorer, so that it fits my workflow preferences.

#### Acceptance Criteria

1. WHEN user accesses settings THEN the system SHALL allow configuration of the frontmatter key for sorting
2. WHEN user configures auto-start THEN the system SHALL provide a setting to open on Obsidian startup
3. WHEN user sets preferences THEN the system SHALL save settings using Obsidian's plugin settings system
4. WHEN displaying cards THEN the system SHALL use a fixed design without CSS customization options