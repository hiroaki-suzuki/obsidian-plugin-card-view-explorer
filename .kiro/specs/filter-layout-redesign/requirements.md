# Requirements Document

## Introduction

This feature redesigns the Card Explorer's filter interface by moving the filter panel from the sidebar to the top of the interface and improving the overall filter UI experience. This change will provide better space utilization and a more intuitive layout for users to access filtering controls.

## Requirements

### Requirement 1

**User Story:** As a user, I want the filter controls to be positioned at the top of the Card Explorer interface, so that I have more horizontal space for viewing note cards and a more natural top-to-bottom workflow.

#### Acceptance Criteria

1. WHEN the Card Explorer view is opened THEN the filter panel SHALL be positioned at the top of the interface above the note cards
2. WHEN the filter panel is at the top THEN the note cards area SHALL utilize the full width of the available space
3. WHEN the layout changes THEN the existing filter functionality SHALL remain unchanged
4. WHEN the filter panel is repositioned THEN the visual hierarchy SHALL clearly separate filters from content

### Requirement 2

**User Story:** As a user, I want an improved filter UI that is more compact and efficient, so that I can access all filtering options without taking up excessive vertical space.

#### Acceptance Criteria

1. WHEN the filter panel is displayed THEN it SHALL use a horizontal layout that maximizes space efficiency
2. WHEN multiple filter controls are present THEN they SHALL be organized in a logical, scannable arrangement
3. WHEN the filter panel is collapsed or expanded THEN the transition SHALL be smooth and preserve user context
4. WHEN filter controls are active THEN their state SHALL be clearly visible to the user
5. WHEN folder filtering is available THEN it SHALL use text input format instead of checkbox selection
6. WHEN folder text input is used THEN it SHALL support autocomplete or suggestions based on available folders

### Requirement 3

**User Story:** As a user, I want the ability to collapse/expand the filter panel, so that I can maximize the space available for viewing note cards when filters are not needed.

#### Acceptance Criteria

1. WHEN the filter panel is displayed THEN there SHALL be a toggle control to collapse/expand the panel
2. WHEN the filter panel is collapsed THEN only essential filter indicators SHALL remain visible
3. WHEN the filter panel is expanded THEN all filter controls SHALL be accessible
4. WHEN the panel state changes THEN the user's preference SHALL be remembered across sessions

### Requirement 4

**User Story:** As a user, I want responsive filter controls that adapt to different window sizes, so that the interface remains usable regardless of the available space.

#### Acceptance Criteria

1. WHEN the window width is reduced THEN filter controls SHALL adapt their layout appropriately
2. WHEN space is limited THEN less critical filter options SHALL be moved to secondary positions or dropdowns
3. WHEN the interface is very narrow THEN the filter panel SHALL maintain basic functionality
4. WHEN the layout adapts THEN no filter functionality SHALL be lost or become inaccessible
