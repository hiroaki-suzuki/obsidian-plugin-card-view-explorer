# Project Structure

## Current Organization
```
obsidian-plugin-card-explorer/
├── .git/                    # Git repository
├── .kiro/                   # Kiro AI assistant configuration
│   └── steering/            # AI guidance documents
├── docs/                    # Documentation
│   └── 001-requirements.md  # Project requirements (Japanese)
├── .gitignore              # Git ignore rules (Node.js/TypeScript)
├── LICENSE                 # MIT License
└── README.md               # Project overview
```

## Expected Plugin Structure
Based on Obsidian plugin conventions, the project should follow this structure:

```
src/                        # Source code
├── main.ts                 # Plugin entry point
├── settings.ts             # Plugin settings interface
├── view.ts                 # Card explorer view implementation
├── components/             # React components
│   ├── CardView.tsx        # Main card container
│   ├── NoteCard.tsx        # Individual note card
│   ├── FilterPanel.tsx     # Search/filter controls
│   └── VirtualList.tsx     # Virtualized list wrapper
├── types/                  # TypeScript type definitions
├── utils/                  # Utility functions
└── styles/                 # CSS stylesheets
```

## Build Artifacts
- `dist/` - Compiled plugin files
- `node_modules/` - Dependencies
- `*.tsbuildinfo` - TypeScript build cache

## Configuration Files
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration
- `manifest.json` - Obsidian plugin manifest
- `versions.json` - Plugin version history

## Documentation Language
Requirements and documentation are written in Japanese, indicating the primary development context.