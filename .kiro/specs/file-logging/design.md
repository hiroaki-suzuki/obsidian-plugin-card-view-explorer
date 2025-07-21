# Design Document

## Overview

The file logging feature extends the existing console logging system in the Card View Explorer plugin to also write logs to persistent files. The design integrates seamlessly with the current error handling architecture while adding file-based persistence with automatic rotation and cleanup.

The system will intercept existing console logging calls and duplicate them to log files, maintaining the current logging behavior while adding persistent storage. Log files will be stored in the plugin's data directory with daily rotation and automatic cleanup of files older than 10 days.

## Architecture

### High-Level Architecture

```
Console Logging (Existing)
    ↓
Enhanced Logger (New)
    ├── Console Output (Unchanged)
    └── File Output (New)
        ├── Log File Writer
        ├── Daily Rotation
        └── Cleanup Manager
```

### Integration Points

The file logging system integrates with existing components:

1. **Error Handling System** (`src/utils/errorHandling.ts`): Extend existing console logging
2. **Plugin Main** (`src/main.ts`): Initialize logging system during plugin startup
3. **All Logging Points**: Transparent integration with existing `console.log/error/warn/info` calls

### File System Integration

The system uses Obsidian's file system APIs:
- `app.vault.adapter.exists()` - Check if directories/files exist
- `app.vault.adapter.mkdir()` - Create log directory
- `app.vault.adapter.write()` - Write log entries
- `app.vault.adapter.list()` - List existing log files for cleanup
- `app.vault.adapter.remove()` - Delete old log files

## Components and Interfaces

### Core Components

#### 1. FileLogger Class

```typescript
interface FileLoggerConfig {
  logDirectory: string;
  maxLogFiles: number;
  dateFormat: string;
}

class FileLogger {
  private app: App;
  private config: FileLoggerConfig;
  private currentLogFile: string | null;
  private isEnabled: boolean;

  constructor(app: App, config: FileLoggerConfig);

  // Core logging methods
  async log(level: LogLevel, message: string, ...args: any[]): Promise<void>;
  async info(message: string, ...args: any[]): Promise<void>;
  async warn(message: string, ...args: any[]): Promise<void>;
  async error(message: string, ...args: any[]): Promise<void>;

  // Lifecycle methods
  async initialize(): Promise<void>;
  async cleanup(): Promise<void>;

  // Internal methods
  private async ensureLogDirectory(): Promise<boolean>;
  private async getCurrentLogFile(): Promise<string>;
  private async writeToFile(content: string): Promise<void>;
  private async rotateLogsIfNeeded(): Promise<void>;
  private async cleanupOldLogs(): Promise<void>;
}
```

#### 2. Console Logger Wrapper

```typescript
interface ConsoleWrapper {
  originalConsole: Console;
  fileLogger: FileLogger;

  log(...args: any[]): void;
  info(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
}
```

#### 3. Log Entry Formatter

```typescript
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  args?: any[];
}

class LogFormatter {
  static formatEntry(level: LogLevel, message: string, args: any[]): string;
  static formatTimestamp(date: Date): string;
  static serializeArgs(args: any[]): string;
}
```

### Type Definitions

```typescript
enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  LOG = 'LOG'
}

interface LoggingSystem {
  fileLogger: FileLogger;
  consoleWrapper: ConsoleWrapper;
  isInitialized: boolean;
}
```

## Data Models

### Log File Structure

Log files follow a structured format for easy parsing:

```
[2024-01-15T10:30:45.123Z] INFO Card View Explorer: Plugin initialized
[2024-01-15T10:30:46.456Z] WARN Card View Explorer: Failed to extract metadata for note.md: Error details
[2024-01-15T10:30:47.789Z] ERROR Card View Explorer Error: {"message":"API failure","details":"..."}
```

### File Naming Convention

- **Pattern**: `card-view-explorer-YYYY-MM-DD.log`
- **Examples**:
  - `card-view-explorer-2024-01-15.log`
  - `card-view-explorer-2024-01-16.log`

### Directory Structure

```
.obsidian/
└── plugins/
    └── card-view-explorer/
        ├── data.json (existing)
        ├── main.js (existing)
        └── logs/ (new)
            ├── card-view-explorer-2024-01-15.log
            ├── card-view-explorer-2024-01-16.log
            └── ...
```

## Error Handling

### Graceful Degradation Strategy

The file logging system is designed to never interfere with normal plugin operation:

1. **Initialization Failures**: If log directory creation fails, disable file logging but continue console logging
2. **Write Failures**: If individual log writes fail, continue with console logging only
3. **Cleanup Failures**: If old log cleanup fails, continue operation and retry on next startup
4. **File System Errors**: All file operations are wrapped in try-catch blocks with fallback behavior

### Error Recovery

```typescript
class FileLogger {
  private async safeFileOperation<T>(
    operation: () => Promise<T>,
    fallback: T,
    context: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      console.warn(`Card View Explorer: File logging ${context} failed:`, error);
      return fallback;
    }
  }
}
```

## Testing Strategy

### Unit Tests

1. **FileLogger Class**
   - Log file creation and writing
   - Date-based file rotation
   - Old file cleanup logic
   - Error handling and graceful degradation

2. **LogFormatter Class**
   - Timestamp formatting
   - Message serialization
   - Argument handling

3. **ConsoleWrapper**
   - Console method interception
   - Dual output (console + file)
   - Error isolation

### Integration Tests

1. **Plugin Integration**
   - Logging system initialization during plugin startup
   - Integration with existing error handling
   - File system operations with Obsidian APIs

2. **End-to-End Scenarios**
   - Full logging lifecycle (create, rotate, cleanup)
   - Error scenarios and recovery
   - Performance with high-volume logging

### Mock Strategy

- **Obsidian APIs**: Mock `app.vault.adapter` methods for file operations
- **File System**: Mock file system operations for predictable testing
- **Date/Time**: Mock date functions for testing rotation logic

## Performance Considerations

### Asynchronous Operations

All file operations are asynchronous to prevent blocking the main thread:

```typescript
// Non-blocking log writing
async log(level: LogLevel, message: string, ...args: any[]): Promise<void> {
  // Console logging (synchronous, immediate)
  this.originalConsole[level.toLowerCase()](message, ...args);

  // File logging (asynchronous, non-blocking)
  this.writeToFileAsync(level, message, args).catch(error => {
    // Silent failure - don't interrupt normal operation
    console.warn('File logging failed:', error);
  });
}
```

### Memory Management

- **Buffering**: No log buffering to prevent memory accumulation
- **Immediate Writes**: Each log entry is written immediately to prevent data loss
- **Resource Cleanup**: Proper cleanup of file handles and resources

### File Size Management

- **Daily Rotation**: Prevents individual files from becoming too large
- **Automatic Cleanup**: Limits total disk usage by removing old files
- **Configurable Limits**: Maximum 10 files retained (configurable in future)

## Security Considerations

### File System Access

- **Restricted Path**: Logs only written to plugin's designated directory
- **Path Validation**: Prevent directory traversal attacks
- **Permission Handling**: Graceful handling of file permission errors

### Data Privacy

- **No Sensitive Data**: Avoid logging user content or sensitive information
- **Error Sanitization**: Sanitize error messages to prevent information leakage
- **Local Storage Only**: All logs remain local to user's vault

## Implementation Phases

### Phase 1: Core Infrastructure
- FileLogger class implementation
- Basic file writing and rotation
- Integration with plugin initialization

### Phase 2: Console Integration
- Console wrapper implementation
- Transparent logging interception
- Error handling integration

### Phase 3: Cleanup and Optimization
- Automatic log cleanup
- Performance optimization
- Comprehensive testing

This design provides a robust, non-intrusive logging system that enhances debugging capabilities while maintaining the plugin's reliability and performance.
