# Obsidian Plugin Card View Explorer

A card-based interface for browsing recently edited notes in Obsidian with filtering and search capabilities.

## Features

- **Card-based View**: Display recently edited notes in an intuitive tile/card format
- **Rich Previews**: Show note title, first 3 lines of content, and last modified date
- **Advanced Filtering**: Filter and search by tags, file names, frontmatter, and folders
- **Pin Notes**: Pin important notes to keep them at the top of the list
- **Virtual Scrolling**: High-performance rendering for large note collections
- **Customizable Sorting**: Sort by frontmatter fields or file modification time

## Installation

### From Obsidian Community Plugins (Coming Soon)

1. Open Obsidian Settings
2. Go to Community Plugins and disable Safe Mode
3. Click Browse and search for "Card View Explorer"
4. Install and enable the plugin

### Manual Installation

1. Download the latest release from the [releases page](../../releases)
2. Extract the files to your vault's `.obsidian/plugins/obsidian-card-view-explorer/` directory
3. Reload Obsidian and enable the plugin in Settings > Community Plugins

### Development Installation

1. Clone this repository into your vault's plugins folder:
   ```bash
   cd /path/to/your/vault/.obsidian/plugins
   git clone https://github.com/hiroaki-suzuki/obsidian-plugin-card-view-explorer.git
   cd obsidian-plugin-card-view-explorer
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Build the plugin:
   ```bash
   bun run build
   ```

4. Enable the plugin in Obsidian Settings > Community Plugins

## Usage

1. Open the Card View Explorer view from the command palette: `Card View Explorer: Open Card View`
2. Browse your recently edited notes in card format
3. Use the search and filter options to find specific notes
4. Click on any card to open the note
5. Pin important notes using the pin icon to keep them at the top

## Development

### Prerequisites

- [Bun](https://bun.sh/) - Fast JavaScript runtime and package manager
- Node.js 18+ (for Obsidian compatibility)

### Setup

```bash
# Clone the repository
git clone https://github.com/your-username/obsidian-card-view-explorer.git
cd obsidian-card-view-explorer

# Install dependencies
bun install

# Start development build with watch mode
bun run dev
```

### Available Scripts

```bash
# Development build with watch mode
bun run dev

# Production build
bun run build

# Type checking
bun run check

# Linting
bun run lint

# Format code
bun run format

# Run all checks (lint + format)
bun run check-all

# Run tests
bun run test

# Run tests in watch mode
bun run test:watch
```

### Technology Stack

- **TypeScript** - Type-safe JavaScript
- **React** - UI framework
- **Zustand** - Lightweight state management
- **react-virtuoso** - Virtual scrolling for performance
- **Vitest** - Testing framework
- **Biome** - Linting and formatting
- **ESBuild** - Fast bundling

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Run the test suite: `bun run test`
5. Lint and format your code: `bun run check-all`
6. Commit your changes: `git commit -m 'Add amazing feature'`
7. Push to the branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you find this plugin helpful, consider:

- ⭐ Starring the repository
- 🐛 Reporting bugs via [GitHub Issues](../../issues)
- 💡 Suggesting features via [GitHub Discussions](../../discussions)
- 📖 Contributing to the documentation

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes in each version.

---

Made with ❤️ for the Obsidian community
