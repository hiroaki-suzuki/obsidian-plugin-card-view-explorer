# Implementation Plan

## Progress Status
- Created: 2025-07-20T10:20:00.000Z
- Status: Ready for implementation  
- Total tasks: 37
- Completed: 0
- Remaining: 37

## Task Overview

- [ ] **0. File Renaming**
  - [ ] 0.1 Rename view.tsx → CardExplorerView.tsx
  
- [ ] **1. Type Definitions and Store Extension**
  - [ ] 1.1 Add layout-related type definitions
  - [ ] 1.2 Extend CardExplorerSettings type
  - [ ] 1.3 Add layout state to cardExplorerStore
  - [ ] 1.4 Implement layout-related actions
  - [ ] 1.5 Define view data save/restore interfaces

- [ ] **2. CSS Grid Responsive System**
  - [ ] 2.1 Add responsive grid CSS to styles.css
  - [ ] 2.2 Implement layout mode CSS classes
  - [ ] 2.3 Add collapsible panel CSS
  - [ ] 2.4 Set breakpoints with media queries

- [ ] **3. Workspace Integration and Plugin Control**
  - [ ] 3.1 Implement setLayoutMode method in main.ts
  - [ ] 3.2 Implement view state save/restore functionality
  - [ ] 3.3 Implement workspace error handling
  - [ ] 3.4 Implement workspace integration tests

- [ ] **4. New Component Implementation**
  - [ ] 4.1 Create LayoutManager component
  - [ ] 4.2 Create CollapsiblePanel component
  - [ ] 4.3 Create FilterPanelView component
  - [ ] 4.4 Implement LayoutManager tests
  - [ ] 4.5 Implement CollapsiblePanel tests
  - [ ] 4.6 Implement FilterPanelView tests

- [ ] **5. Existing Component Updates**
  - [ ] 5.1 VirtualList component CSS Grid support
  - [ ] 5.2 Add state preservation features to CardExplorerView
  - [ ] 5.3 Integrate FilterPanel component with CollapsiblePanel
  - [ ] 5.4 Fix tests for updated components

- [ ] **6. Settings System Extension**
  - [ ] 6.1 Add layout setting options to settings.ts
  - [ ] 6.2 Extend data persistence system
  - [ ] 6.3 Implement settings data migration functionality
  - [ ] 6.4 Implement settings-related tests

- [ ] **7. Integration and Testing**
  - [ ] 7.1 Workspace integration tests
  - [ ] 7.2 Responsive layout integration tests
  - [ ] 7.3 Compatibility tests with existing features
  - [ ] 7.4 Error handling and fallback implementation
  - [ ] 7.5 E2E test updates

## Detailed Implementation Tasks

### 0. File Renaming

#### - [ ] 0.1 Rename view.tsx → CardExplorerView.tsx
- Rename existing src/view.tsx to src/CardExplorerView.tsx
- Update import path in main.ts
- Rename test file view.test.tsx to CardExplorerView.test.tsx
- Update references in other files
- _Requirements: Maintainability improvement_

### 1. Type Definitions and Store Extension

#### - [ ] 1.1 Add layout-related type definitions
- Create new src/types/layout.ts file
- Define LayoutMode type ('main-area' | 'sidebar')
- Define ResponsiveConfig interface
- Define LayoutState and LayoutActions interfaces
- _Requirements: Requirement 3, Requirement 4_

#### - [ ] 1.2 Extend CardExplorerSettings type
- Add new fields to CardExplorerSettings in src/types/plugin.ts
- Add layoutMode, filterPanelCollapsed, responsiveConfig fields
- Define and set default values
- _Requirements: Requirement 5_

#### - [ ] 1.3 Add layout state to cardExplorerStore
- Integrate LayoutState into src/store/cardExplorerStore.ts
- Set initial state (mode: 'main-area', filterPanelCollapsed: false)
- Ensure consistency with existing store structure
- _Requirements: Requirement 3, Requirement 4_

#### - [ ] 1.4 Implement layout-related actions
- Implement setLayoutMode action
- Implement toggleFilterPanel action
- Implement persistence trigger on state changes
- _Requirements: Requirement 3, Requirement 4, Requirement 5_

#### - [ ] 1.5 Define view data save/restore interfaces
- Define ViewData interface
- Define type definitions for view state save/restore methods
- Specify data preservation during workspace movement
- _Requirements: Requirement 3, Requirement 7_

### 2. CSS Grid Responsive System

#### - [ ] 2.1 Add responsive grid CSS to styles.css
- Implement .responsive-card-grid class
- Apply CSS Grid repeat(auto-fit, minmax()) pattern
- Set basic grid layout (gap, padding)
- _Requirements: Requirement 1_

#### - [ ] 2.2 Implement layout mode CSS classes
- Implement .layout-main-area and .layout-sidebar classes
- Distinguish between main area and sidebar layouts
- Control container placement with flex layout
- _Requirements: Requirement 2, Requirement 3_

#### - [ ] 2.3 Add collapsible panel CSS
- Implement .collapsible-panel related classes
- Implement collapse/expand animations
- Style toggle buttons
- _Requirements: Requirement 4_

#### - [ ] 2.4 Set breakpoints with media queries
- Large screens (>1200px): Implement fixed 5 columns
- Medium screens (768-1200px): Auto-adjust 3-4 columns
- Small screens (<768px): Optimize 1-2 columns
- _Requirements: Requirement 1_

### 3. Workspace Integration and Plugin Control

#### - [ ] 3.1 Implement setLayoutMode method in main.ts
- Workspace leaf acquisition and switching control
- Proper use of workspace.getLeaf() and workspace.getRightLeaf()
- Separate placement of card view and filter panel in main-area mode
- Add VIEW_TYPE_FILTER_PANEL view type
- Implement FilterPanelView class
- View detach and recreation processing
- Error handling and rollback functionality
- _Requirements: Requirement 2, Requirement 3_

#### - [ ] 3.2 Implement view state save/restore functionality
- Add getViewData/restoreViewData methods to CardExplorerView.tsx
- Add restoreFilterState method to FilterPanelView
- Save scroll position, filter state, sort settings
- State synchronization between separate views in main-area mode
- State synchronization during workspace movement
- Integration with Zustand store
- _Requirements: Requirement 3, Requirement 7_

#### - [ ] 3.3 Implement workspace error handling
- Fallback for workspace leaf creation failures
- Apply default values for view state restoration failures
- User-friendly error messages
- Automatic recovery to previous state
- _Requirements: Requirement 3, Requirement 5_

#### - [ ] 3.4 Implement workspace integration tests
- Test setLayoutMode method in main.test.ts
- Implement FilterPanelView class tests
- Mock workspace APIs
- Test separate views in main-area mode
- Integration tests for view movement scenarios
- Error case testing
- _Requirements: Requirement 2, Requirement 3_

### 4. New Component Implementation

#### - [ ] 4.1 Create LayoutManager component
- Create new src/components/LayoutManager.tsx
- CSS class application logic based on mode prop
- Control placement of children and filterPanel
- Set appropriate data-testid attributes
- _Requirements: Requirement 2, Requirement 3_

#### - [ ] 4.2 Create CollapsiblePanel component
- Create new src/components/CollapsiblePanel.tsx
- Show/hide control based on isCollapsed state
- Implement onToggle callback
- Implement summary display functionality
- _Requirements: Requirement 4_

#### - [ ] 4.3 Create FilterPanelView component  
- Create new src/FilterPanelView.tsx
- Independent filter panel inheriting from Obsidian ItemView
- Filter panel display dedicated to main-area mode
- Integration with Zustand store
- _Requirements: Requirement 2, Requirement 3_

#### - [ ] 4.4 Implement LayoutManager tests
- Create src/components/LayoutManager.test.tsx
- Test CSS class application verification
- Test layout mode switching
- Verify correct child element placement
- _Requirements: Requirement 2, Requirement 3_

#### - [ ] 4.5 Implement CollapsiblePanel tests
- Create src/components/CollapsiblePanel.test.tsx
- Test collapse/expand state switching
- Verify onToggle callback operation
- Test summary display
- _Requirements: Requirement 4_

#### - [ ] 4.6 Implement FilterPanelView tests
- Create src/FilterPanelView.test.tsx
- Obsidian ItemView integration tests
- Test filter state save/restore
- Verify store integration operation
- _Requirements: Requirement 2, Requirement 3_

### 5. Existing Component Updates

#### - [ ] 5.1 VirtualList component CSS Grid support
- Update src/components/VirtualList.tsx
- Customize react-virtuoso List component
- Implement GridList forwardRef component
- Apply .responsive-card-grid class
- _Requirements: Requirement 1, Requirement 6_

#### - [ ] 5.2 Add state preservation features to CardExplorerView
- Update src/CardExplorerView.tsx
- Implement getViewData/restoreViewData methods
- State preservation during workspace movement
- Integration with CardView component
- Maintain integration with existing error boundaries
- _Requirements: Requirement 2, Requirement 3, Requirement 7_

#### - [ ] 5.3 Integrate FilterPanel component with CollapsiblePanel
- Update src/components/FilterPanel.tsx
- Wrap with CollapsiblePanel
- Store integration for collapse state
- Implement filter summary display
- _Requirements: Requirement 4_

#### - [ ] 5.4 Fix tests for updated components
- Add grid layout support tests to VirtualList.test.tsx
- Add state preservation feature tests to CardExplorerView.test.tsx
- Add collapse functionality tests to FilterPanel.test.tsx
- _Requirements: Requirement 1, Requirement 4, Requirement 6_

### 6. Settings System Extension

#### - [ ] 6.1 Add layout setting options to settings.ts
- Update PluginSettingTab in src/settings.ts
- Add layout mode selection UI (dropdown)
- Add responsive settings adjustment UI (sliders)
- Immediate reflection functionality on settings changes
- _Requirements: Requirement 3, Requirement 5_

#### - [ ] 6.2 Extend data persistence system
- Update src/utils/dataPersistence.ts
- Add persistence support for new layout setting fields
- Add settings save error handling
- Integration with automatic backup system
- _Requirements: Requirement 5_

#### - [ ] 6.3 Implement settings data migration functionality
- Update src/utils/dataMigration.ts
- Migration functionality from old to new settings
- Fallback functionality with default values
- Corrupted data detection and recovery functionality
- _Requirements: Requirement 5_

#### - [ ] 6.4 Implement settings-related tests
- Update settings.test.tsx
- Test layout settings save/load
- Test data migration functionality
- Test error handling
- _Requirements: Requirement 5_

### 7. Integration and Testing

#### - [ ] 7.1 Workspace integration tests
- Add workspace integration tests to main.test.ts
- Test state preservation during view movement
- Integration tests for workspace leaf creation/deletion
- Test rollback behavior on errors
- _Requirements: Requirement 2, Requirement 3_

#### - [ ] 7.2 Responsive layout integration tests
- Update src/integration.test.ts
- Integration tests for layout mode switching
- Verify responsive breakpoint behavior
- Integration tests for filter panel collapse
- _Requirements: Requirement 1, Requirement 3, Requirement 4_

#### - [ ] 7.3 Compatibility tests with existing features
- Compatibility tests for pin functionality and grid layout
- Verify proper operation of sort functionality
- Test continuity of filtering functionality
- Verify note click behavior
- _Requirements: Requirement 7_

#### - [ ] 7.4 Error handling and fallback implementation
- Fallback for layout mode switching failures
- Recovery functionality for workspace errors
- Error notifications for settings save failures
- Normal scroll fallback for virtual scroll errors
- _Requirements: Requirement 5, Requirement 6_

#### - [ ] 7.5 E2E test updates
- Adapt existing E2E tests for responsive layout
- Add E2E scenarios for workspace movement
- Add E2E scenarios for layout switching
- Add E2E tests for filter panel operations
- Performance tests (1000+ notes)
- _Requirements: Requirement 1, Requirement 2, Requirement 3, Requirement 4, Requirement 6_

## Implementation Notes

### CSS Grid Utilization Points
- Avoid dynamic JavaScript calculations, leverage CSS `auto-fit` and `minmax()`
- Prioritize automatic responsive handling via media queries
- Maximize browser native optimization

### Workspace Integration Points
- Proper view placement control using Obsidian's workspace API
- Ensure reliable implementation of state preservation and data synchronization during view movement
- Guarantee stability with rollback functionality on errors

### Integration with Existing Architecture
- Minimize new components
- Inherit existing Zustand store patterns
- Maintain react-virtuoso performance characteristics

### Testing Strategy
- Focus on workspace API mocking and view movement tests
- Since CSS Grid operation is browser standard functionality, focus on CSS class application verification
- Test design focused on component integration behavior
- Cover new functionality while maintaining existing test coverage