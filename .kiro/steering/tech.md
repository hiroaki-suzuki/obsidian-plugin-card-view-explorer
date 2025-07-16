# Technology Stack

## Platform
- **Target**: Obsidian Plugin
- **Language**: TypeScript
- **Runtime**: Node.js environment within Obsidian

## Frontend Framework
- **UI Library**: React
- **State Management**: Zustand (lightweight state management)
- **Virtual Scrolling**: react-virtuoso (for performance with large note lists)
- **Styling**: CSS (fixed design, no customization)

## Data & Storage
- **Note Metadata**: Obsidian's metadataCache API
- **Plugin State**: data.json file (for pin states and user preferences)
- **Configuration**: Obsidian's plugin settings system

## Build System
- **Package Manager**: Bun
- **Bundler**: ESBuild
- **Build Output**: `dist/` directory
- **TypeScript**: Compilation with .tsbuildinfo cache

## Common Commands
```bash
# Install dependencies
bun install

# Development build with watch
bun run dev

# Production build
bun run build

# Type checking
bun run check

# Linting
bun run lint
```

## Obsidian Plugin APIs
- `metadataCache` - For accessing note metadata and frontmatter
- `vault` - For file operations and note content
- `workspace` - For UI integration and view management
- Plugin settings API for user configuration