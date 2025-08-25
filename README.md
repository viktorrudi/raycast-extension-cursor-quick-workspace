# Cursor Quick-workspace

Multi-select directories to quickly open them as a workspace in Cursor.

## Usage

1. Launch extension from Raycast
2. Press **Enter** to select/deselect directories (minimum 1 required)
3. Press **⌘ + O** to open selected directories in Cursor
4. Press **⌘ + F** to save current selection as a favorite
5. Press **⌘ + R** to rename any favorite

## Features

- **Git Branch Display**: Each directory that is a git repository shows the current active branch in a green tag on the right side
- **Multi-directory Selection**: Select multiple directories to create workspaces
- **Favorites Management**: Save, rename, and organize frequently used workspace combinations

## Favorites

- **Create Favorite**: Select 1+ directories and press **⌘ + F**
- **Remove Favorite**: Press **⌘ + F** on any favorite to unfavorite it
- **Open Favorite**: Press **Enter** on any favorite (shown with golden ⭐ icon)
- **Rename Favorite**: Press **⌘ + R** on any favorite to give it a custom name
- **Auto-naming**: Favorites are automatically named as comma-separated directory names
- **Visual Organization**: Favorites appear in a dedicated section at the top with clear separation
- **Persistent**: Favorites are saved and persist between sessions

## Configuration

- **Repository Directory**: Directory to scan for repositories
- **Show Hidden Directories**: Show directories starting with `.`

Access preferences with **⌘ + .** or Raycast Settings > Extensions > Cursor Quick-workspace.