# Implementation Plan

- [ ] 1. Update CardView component layout structure
  - Modify CardView.tsx to remove footer and move refresh button to header
  - Update header layout to include left and right sections
  - Remove card-view-footer div and associated logic
  - Move refresh button and handleRetry logic to header-right section
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 2. Create horizontal filter panel layout
  - Add layout prop to FilterPanel component interface
  - Implement horizontal layout mode in FilterPanel.tsx
  - Create primary filter row with inline filter groups
  - Add collapsible secondary filter row for advanced options
  - _Requirements: 2.1, 2.2, 3.1, 3.2_

- [ ] 3. Implement folder text input with autocomplete
  - Replace folder checkbox selection with text input
  - Create FolderInput component with autocomplete functionality
  - Add datalist or custom dropdown for folder suggestions
  - Implement input filtering and suggestion selection logic
  - _Requirements: 2.5, 2.6_

- [ ] 4. Add filter panel collapse/expand functionality
  - Add isCollapsed state to FilterPanel component
  - Implement toggle button for collapsing/expanding panel
  - Create smooth transition animations for panel state changes
  - Persist collapsed state in component or store
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 5. Update CSS styles for horizontal layout
  - Create new CSS classes for horizontal filter layout
  - Add styles for filter-panel-primary and filter-panel-secondary
  - Implement compact filter input and select styles
  - Add responsive breakpoints for narrow screens
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 6. Implement responsive filter behavior
  - Add media queries for different screen sizes
  - Create stacked layout for narrow screens
  - Implement adaptive filter control positioning
  - Ensure all filter functionality remains accessible on small screens
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 7. Update header layout and styling
  - Modify card-view-header CSS to support left/right layout
  - Style header-left and header-right sections
  - Ensure proper alignment and spacing of header elements
  - Update refresh button positioning and styling
  - _Requirements: 1.1, 1.4_

- [ ] 8. Add advanced filters expandable section
  - Create advanced filters section with exclude options
  - Implement show/hide toggle for advanced filters
  - Add exclude folders and exclude tags functionality
  - Style advanced filters section consistently
  - _Requirements: 2.2, 2.3_

- [ ] 9. Implement filter state management updates
  - Update store to handle new folder input state
  - Add actions for folder autocomplete and selection
  - Implement collapsed state persistence
  - Update filter clearing logic for new layout
  - _Requirements: 2.5, 3.4_

- [ ] 10. Add accessibility features
  - Implement keyboard navigation for horizontal layout
  - Add ARIA labels and roles for filter controls
  - Create screen reader announcements for filter changes
  - Ensure tab order is logical in horizontal layout
  - _Requirements: 2.2, 4.4_

- [ ] 11. Create comprehensive tests for new layout
  - Write unit tests for horizontal FilterPanel component
  - Test folder input autocomplete functionality
  - Test collapse/expand behavior and state persistence
  - Add responsive layout tests for different screen sizes
  - _Requirements: 1.3, 2.4, 3.3, 4.4_

- [ ] 12. Update existing tests for layout changes
  - Modify CardView tests to reflect new header structure
  - Update FilterPanel tests for horizontal layout mode
  - Fix any broken tests due to removed footer
  - Ensure all existing functionality tests still pass
  - _Requirements: 1.3, 2.4_
