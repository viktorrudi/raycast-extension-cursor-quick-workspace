import {
  ActionPanel,
  List,
  Action,
  Icon,
  showToast,
  Toast,
  closeMainWindow,
  getPreferenceValues,
  openCommandPreferences,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { readdir } from "fs/promises";
import { statSync, existsSync } from "fs";
import { exec } from "child_process";
import { homedir } from "os";
import path from "path";

interface Preferences {
  repositoryDirectory: string;
  showHiddenDirectories: boolean;
}

export default function Command() {
  const [directories, setDirectories] = useState<string[]>([]);
  const [selectedDirs, setSelectedDirs] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [directoryError, setDirectoryError] = useState<string | null>(null);

  const preferences = getPreferenceValues<Preferences>();
  const repositoryPath = preferences.repositoryDirectory?.replace("~", homedir()) || "";

  useEffect(() => {
    async function fetchDirectories() {
      setDirectoryError(null);

      if (!repositoryPath || repositoryPath.trim() === "") {
        setDirectoryError("Repository directory not configured");
        setIsLoading(false);
        return;
      }

      if (!existsSync(repositoryPath)) {
        setDirectoryError(`Directory does not exist: ${repositoryPath}`);
        setIsLoading(false);
        return;
      }

      try {
        const files = await readdir(repositoryPath);
        const dirs = files.filter((file) => {
          const fullPath = path.join(repositoryPath, file);
          try {
            const isDirectory = statSync(fullPath).isDirectory();
            const isHidden = file.startsWith(".");
            return isDirectory && (preferences.showHiddenDirectories || !isHidden);
          } catch {
            return false;
          }
        });
        setDirectories(dirs);
      } catch {
        setDirectoryError(`Failed to read directory: ${repositoryPath}`);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to load directories",
          message: `Could not read ${repositoryPath}`,
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchDirectories();
  }, [repositoryPath, preferences.showHiddenDirectories]);

  const toggleSelection = (dir: string) => {
    const newSelection = new Set(selectedDirs);
    if (newSelection.has(dir)) {
      newSelection.delete(dir);
    } else {
      newSelection.add(dir);
    }
    setSelectedDirs(newSelection);
  };

  const openInCursor = () => {
    if (selectedDirs.size < 2) {
      showToast({
        style: Toast.Style.Failure,
        title: "Please Select At Least Two Directories",
      });
      return;
    }

    const dirPaths = Array.from(selectedDirs).map((dir) => `"${path.join(repositoryPath, dir)}"`);
    const command = `cursor ${dirPaths.join(" ")}`;

    exec(command, (error) => {
      if (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed To Open In Cursor",
          message: error.message,
        });
      } else {
        showToast({
          style: Toast.Style.Success,
          title: `Opened ${selectedDirs.size} Directories In Cursor`,
        });
        setSelectedDirs(new Set()); // Clear selection after opening
        closeMainWindow(); // Close Raycast overlay
      }
    });
  };

  const getSelectionIcon = (dir: string) => {
    return selectedDirs.has(dir) ? Icon.CheckCircle : Icon.Circle;
  };

  if (directoryError) {
    return (
      <List>
        <List.Item
          title="Configuration Required"
          subtitle={directoryError}
          icon={Icon.ExclamationMark}
          actions={
            <ActionPanel>
              <Action title="Open Command Preferences" onAction={openCommandPreferences} icon={Icon.Gear} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={
        selectedDirs.size >= 2
          ? `Search directories... (${selectedDirs.size} selected • ⌘O to open)`
          : "Search directories..."
      }
    >
      {directories.map((dir) => (
        <List.Item
          key={dir}
          title={dir}
          icon={getSelectionIcon(dir)}
          subtitle={`${path.join(repositoryPath, dir)} ${selectedDirs.has(dir) ? "✓ Selected" : ""}`}
          actions={
            <ActionPanel>
              <Action
                title={selectedDirs.has(dir) ? "Deselect Directory" : "Select Directory"}
                onAction={() => toggleSelection(dir)}
                icon={selectedDirs.has(dir) ? Icon.XMarkCircle : Icon.CheckCircle}
              />
              {selectedDirs.size >= 2 && (
                <Action
                  title={`Open ${selectedDirs.size} Directories in Cursor`}
                  onAction={openInCursor}
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                  icon={Icon.Terminal}
                />
              )}
              <Action
                title="Open Extension Preferences"
                onAction={openCommandPreferences}
                shortcut={{ modifiers: ["cmd"], key: "." }}
                icon={Icon.Gear}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
