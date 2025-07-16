# Obsidian Plugin Requirements: "Card-Style Note View"

## 🎯 Purpose & Goals

- Display recently edited notes in a card format (tile + preview).
- Allow quick access to notes and make it easy to find the target note by viewing the title and beginning of the content.
- Enable filtering/searching by tags, filenames, frontmatter, etc.
- Note relationships (links or Graph) are not handled.

---

## 📄 Display Specifications

- **Display format**: Tile view (card-style)
- **Display elements**:
  - Title
  - Beginning of the content (up to 3 lines)
  - Last updated date
- **Excerpt method**: Extract the first 3 lines of the content (without Markdown rendering)
- **Sort conditions**:
  - Frontmatter key `updated` (default)
  - Any frontmatter key (user-configurable)
  - Actual file modification time (`file.mtime`)
- **Sort order**: Ascending / Descending (default: Descending)
- **Pinning**: Pinned notes are always shown at the top
- **Virtual scrolling**: Enabled (e.g., using `react-virtuoso`)

---

## 🔍 Search & Filter

- **Filter options**:
  - Specify folders (multiple allowed)
  - Specify tags
  - Filename search (partial match)
  - Updated date condition (within or after X days)
  - Exclusion settings (by folder, tag, or filename)

---

## ⚙️ Behavior & Launch

- **How to display**:
  - Launch from the command palette
  - Open as a new tab (dedicated view)
  - Optionally show in a side pane
  - Optionally auto-display on Obsidian startup
- **Behavior when clicking a note**:
  - Open the note in the active pane
- **Pinning**:
  - Toggle using a pin icon on the card
  - Status is saved in `data.json`

---

## ⚙️ Customization

- **Appearance**: Fixed design (no CSS customization)
- **Updated date key**: Can specify any key from frontmatter (default: `updated`)

---

## 🧱 Technical Policy & Dependencies

- **UI library**: React + react-virtuoso (for virtual scrolling)
- **Storage**: `data.json` (for managing states like pinned notes)
- **Note metadata access**: Via `metadataCache`

---