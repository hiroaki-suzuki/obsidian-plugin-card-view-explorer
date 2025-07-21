# Requirements Document

## Introduction

This feature adds file-based logging functionality to the Obsidian Card View Explorer plugin. Currently, the plugin logs information to the console using `console.log`, `console.error`, `console.warn`, and `console.info`. This enhancement will extend the existing logging system to also write logs to files with automatic rotation and cleanup.

The logging system will maintain the current console logging behavior while adding persistent file logging with daily rotation and automatic cleanup to prevent disk space issues.

## Requirements

### Requirement 1

**User Story:** As a plugin developer, I want all console logs to be automatically written to files, so that I can debug issues that occur when the console is not accessible.

#### Acceptance Criteria

1. WHEN the plugin logs any message to console THEN the system SHALL also write the same message to a log file
2. WHEN writing to log files THEN the system SHALL preserve the original log level (info, warn, error)
3. WHEN writing to log files THEN the system SHALL include timestamp information in ISO format
4. WHEN writing to log files THEN the system SHALL include the plugin prefix "Card View Explorer" for consistency

### Requirement 2

**User Story:** As a plugin user, I want log files to be rotated daily, so that individual log files don't become too large and are organized by date.

#### Acceptance Criteria

1. WHEN a new day begins THEN the system SHALL create a new log file with the current date
2. WHEN creating log files THEN the system SHALL use the naming pattern `card-view-explorer-YYYY-MM-DD.log`
3. WHEN the plugin starts THEN the system SHALL determine the correct log file based on the current date
4. WHEN writing logs THEN the system SHALL always write to the current day's log file

### Requirement 3

**User Story:** As a plugin user, I want old log files to be automatically cleaned up, so that they don't consume excessive disk space over time.

#### Acceptance Criteria

1. WHEN the plugin starts THEN the system SHALL check for log files older than 10 days
2. WHEN log files older than 10 days are found THEN the system SHALL delete them automatically
3. WHEN cleaning up log files THEN the system SHALL keep exactly 10 most recent log files
4. WHEN cleanup fails for any file THEN the system SHALL continue with other files and not interrupt normal operation

### Requirement 4

**User Story:** As a plugin developer, I want the file logging to be robust and not interfere with normal plugin operation, so that logging issues don't break the plugin functionality.

#### Acceptance Criteria

1. WHEN file logging encounters an error THEN the system SHALL continue normal console logging without interruption
2. WHEN log directory creation fails THEN the system SHALL gracefully disable file logging and continue operation
3. WHEN writing to log files fails THEN the system SHALL not throw exceptions that could crash the plugin
4. WHEN file system operations fail THEN the system SHALL log the error to console but not retry file operations

### Requirement 5

**User Story:** As a plugin user, I want log files to be stored in an appropriate location within the Obsidian vault, so that they are easily accessible but don't interfere with my notes.

#### Acceptance Criteria

1. WHEN creating log files THEN the system SHALL store them in `.obsidian/plugins/obsidian-card-view-explorer/logs/` directory
2. WHEN the logs directory doesn't exist THEN the system SHALL create it automatically
3. WHEN the plugin is uninstalled THEN the log files SHALL be contained within the plugin directory for easy cleanup
4. WHEN accessing log files THEN users SHALL be able to find them in the standard plugin data location
