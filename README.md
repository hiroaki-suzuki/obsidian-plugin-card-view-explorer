# Card View Explorer

A visual note browser for Obsidian that displays your recently edited notes in an intuitive card-based interface with powerful filtering and search capabilities.

[日本語版 README](README.ja.md)

## Features

- **Visual Card Interface**: Browse your notes as cards showing title, preview, and metadata
- **Smart Filtering**: Filter by tags, folders, filenames, and date ranges
- **Pin Important Notes**: Keep frequently accessed notes at the top
- **Real-time Updates**: Automatically refreshes when you edit notes
- **Flexible Sorting**: Sort by modification date or custom frontmatter fields

## Installation

### From Obsidian Community Plugins (Coming Soon)

1. Open Obsidian Settings
2. Navigate to Community Plugins and disable Safe Mode
3. Click Browse and search for "Card View Explorer"
4. Install and enable the plugin

### Manual Installation

1. Download the latest release from the [releases page](../../releases)
2. Extract the files to your vault's `.obsidian/plugins/obsidian-plugin-card-view-explorer/` directory
3. Reload Obsidian and enable the plugin in Settings > Community Plugins

## Usage

1. **Open the View**: Use the command palette (`Ctrl/Cmd + P`) and search for "Card View Explorer: Open Card View Explorer"
2. **Browse Notes**: Your recently edited notes appear as cards with previews
3. **Filter & Search**: Use the toolbar to filter by tags, folders, or search by filename
4. **Open Notes**: Click any card to open the note in your editor
5. **Pin Notes**: Click the pin icon on important notes to keep them at the top
6. **Customize**: Adjust sorting options and date ranges in the filter panel

## Requirements

- Obsidian 0.15.0 or higher
- Works on desktop and mobile devices

## Development

This plugin is built with TypeScript and React. To contribute:

```bash
# Clone and setup
git clone https://github.com/hiroaki-suzuki/obsidian-plugin-card-view-explorer.git
cd obsidian-plugin-card-view-explorer
bun install

# Development
bun run dev    # Watch mode
bun run build  # Production build
bun run test   # Run tests
```

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes and add tests
4. Submit a pull request

For bug reports and feature requests, please use [GitHub Issues](../../issues).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you find this plugin helpful:

- ⭐ Star the repository
- 🐛 Report bugs via [GitHub Issues](../../issues)
- 💡 Request features via [GitHub Issues](../../issues)
- 🤝 Contribute improvements

---

Made with ❤️ for the Obsidian community
