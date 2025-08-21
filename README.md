# Cursor Quick-Workspace

This extension lets you multi-select directories (like repositories) to quickly open a workspace with these directories enabled. Helpful for AI-use on cross-repositories.

## Features

- Lists all directories from your configured repository directory (defaults to `~/Documents/Repositories/`)
- Toggle-based selection system with visual indicators
- Opens selected directories in Cursor with **Command + Enter**
- Automatically closes Raycast overlay after opening directories
- Requires at least 2 directories to be selected
- Search functionality to filter directories
- Clear visual feedback showing selected directories and shortcut info
- Configurable hidden directory visibility

## Usage

1. Launch the extension from Raycast
2. Browse directories from your configured repository path
3. Press **Enter** on directories to select/deselect them (checkmark icons show selection)
4. Once 2+ directories are selected, the search placeholder will show the shortcut hint
5. Press **Command + Enter** to open selected directories in Cursor
6. Press **Command + Comma** to open extension preferences and configure settings
7. Raycast will automatically close and Cursor will open with all selected directories as a workspace

## Configuration

The extension can be configured through Raycast preferences:

- **Repository Directory**: Set the directory where your repositories are located (defaults to `~/Documents/Repositories`)
- **Show Hidden Directories**: Toggle whether to show directories that start with a dot (.) - unchecked by default

To access preferences, use **⌘ + ,** (Command + Comma) when the extension is open, or go to Raycast Settings > Extensions > Cursor Quick-Workspace.