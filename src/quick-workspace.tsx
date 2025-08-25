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
  LocalStorage,
  Form,
  useNavigation,
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

interface Favorite {
  id: string;
  name: string;
  directories: string[];
}

interface DirectoryInfo {
  name: string;
  gitBranch?: string;
}

// Helper function to check if a directory is a git repository
function isGitRepository(dirPath: string): boolean {
  try {
    return existsSync(path.join(dirPath, ".git"));
  } catch {
    return false;
  }
}

// Helper function to get current git branch
function getGitBranch(dirPath: string): Promise<string | null> {
  return new Promise((resolve) => {
    exec("git branch --show-current", { cwd: dirPath }, (error, stdout) => {
      if (error || !stdout.trim()) {
        resolve(null);
      } else {
        resolve(stdout.trim());
      }
    });
  });
}

function RenameFavoriteForm({
  favorite,
  onRename,
}: {
  favorite: Favorite;
  onRename: (id: string, newName: string) => void;
}) {
  const { pop } = useNavigation();

  const handleSubmit = (values: { name: string }) => {
    if (values.name.trim()) {
      onRename(favorite.id, values.name.trim());
      pop();
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename Favorite" onSubmit={handleSubmit} icon={Icon.Pencil} />
          <Action title="Cancel" onAction={pop} icon={Icon.XMarkCircle} shortcut={{ modifiers: ["cmd"], key: "w" }} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Favorite Name"
        defaultValue={favorite.name}
        placeholder="Enter new name for favorite"
      />
    </Form>
  );
}

export default function Command() {
  const [directories, setDirectories] = useState<DirectoryInfo[]>([]);
  const [selectedDirs, setSelectedDirs] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [directoryError, setDirectoryError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Favorite[]>([]);

  const preferences = getPreferenceValues<Preferences>();
  const repositoryPath = preferences.repositoryDirectory?.replace("~", homedir()) || "";

  // Load favorites from LocalStorage
  useEffect(() => {
    async function loadFavorites() {
      try {
        const favoritesData = await LocalStorage.getItem<string>("favorites");
        if (favoritesData) {
          const parsedFavorites = JSON.parse(favoritesData) as Favorite[];
          setFavorites(parsedFavorites);
        }
      } catch (error) {
        console.error("Failed to load favorites:", error);
      }
    }
    loadFavorites();
  }, []);

  // Save favorites to LocalStorage
  const saveFavorites = async (newFavorites: Favorite[]) => {
    try {
      await LocalStorage.setItem("favorites", JSON.stringify(newFavorites));
      setFavorites(newFavorites);
    } catch (error) {
      console.error("Failed to save favorites:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to save favorite",
        message: "Could not save favorite to storage",
      });
    }
  };

  // Create favorite from current selection
  const createFavorite = () => {
    if (selectedDirs.size < 1) {
      showToast({
        style: Toast.Style.Failure,
        title: "Please Select At Least One Directory",
      });
      return;
    }

    const selectedArray = Array.from(selectedDirs).sort();
    const name = selectedArray.join(", ");
    const id = Date.now().toString();

    const newFavorite: Favorite = {
      id,
      name,
      directories: selectedArray,
    };

    const newFavorites = [...favorites, newFavorite];
    saveFavorites(newFavorites);

    showToast({
      style: Toast.Style.Success,
      title: "Favorite Created",
      message: name,
    });
  };

  // Remove favorite
  const removeFavorite = (favoriteId: string) => {
    const newFavorites = favorites.filter((fav) => fav.id !== favoriteId);
    saveFavorites(newFavorites);

    showToast({
      style: Toast.Style.Success,
      title: "Favorite Removed",
    });
  };

  // Rename favorite
  const renameFavorite = (favoriteId: string, newName: string) => {
    const newFavorites = favorites.map((fav) => (fav.id === favoriteId ? { ...fav, name: newName } : fav));
    saveFavorites(newFavorites);

    showToast({
      style: Toast.Style.Success,
      title: "Favorite Renamed",
      message: newName,
    });
  };

  // Open favorite in Cursor
  const openFavoriteInCursor = (favorite: Favorite) => {
    const dirPaths = favorite.directories.map((dir) => `"${path.join(repositoryPath, dir)}"`);
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
          title: `Opened ${favorite.name} In Cursor`,
        });
        closeMainWindow();
      }
    });
  };

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
        const dirNames = files.filter((file) => {
          const fullPath = path.join(repositoryPath, file);
          try {
            const isDirectory = statSync(fullPath).isDirectory();
            const isHidden = file.startsWith(".");
            return isDirectory && (preferences.showHiddenDirectories || !isHidden);
          } catch {
            return false;
          }
        });

        // Get git branch information for each directory
        const directoriesWithGitInfo = await Promise.all(
          dirNames.map(async (dirName): Promise<DirectoryInfo> => {
            const fullPath = path.join(repositoryPath, dirName);
            const isGitRepo = isGitRepository(fullPath);

            if (isGitRepo) {
              const gitBranch = await getGitBranch(fullPath);
              return { name: dirName, gitBranch: gitBranch || undefined };
            }

            return { name: dirName };
          }),
        );

        // Sort directories: git repositories first, then alphabetically within each group
        const sortedDirectories = directoriesWithGitInfo.sort((a, b) => {
          const aHasGit = a.gitBranch !== undefined;
          const bHasGit = b.gitBranch !== undefined;
          
          // If one has git and the other doesn't, prioritize git repo
          if (aHasGit && !bHasGit) return -1;
          if (!aHasGit && bHasGit) return 1;
          
          // If both have same git status, sort alphabetically by name
          return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        });

        setDirectories(sortedDirectories);
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

  const toggleSelection = (dirName: string) => {
    const newSelection = new Set(selectedDirs);
    if (newSelection.has(dirName)) {
      newSelection.delete(dirName);
    } else {
      newSelection.add(dirName);
    }
    setSelectedDirs(newSelection);
  };

  const openInCursor = () => {
    if (selectedDirs.size < 1) {
      showToast({
        style: Toast.Style.Failure,
        title: "Please Select At Least One Directory",
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

  const getSelectionIcon = (dirName: string) => {
    return selectedDirs.has(dirName) ? Icon.CheckCircle : Icon.Circle;
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
        selectedDirs.size >= 1
          ? `Search directories... (${selectedDirs.size} selected • ⌘O to open • ⌘F to favorite)`
          : "Search directories... (⌘R to rename favorites)"
      }
    >
      {/* Favorites Section */}
      {favorites.length > 0 && (
        <List.Section
          title="⭐ Favorites"
          subtitle={`${favorites.length} saved workspace${favorites.length !== 1 ? "s" : ""}`}
        >
          {favorites.map((favorite) => (
            <List.Item
              key={`fav-${favorite.id}`}
              title={favorite.name}
              icon={{ source: Icon.Star, tintColor: "#FFD700" }}
              subtitle={`${favorite.directories.join(", ")}`}
              accessories={[{ text: "★", tooltip: "Favorite workspace" }]}
              actions={
                <ActionPanel>
                  <Action title="Open in Cursor" onAction={() => openFavoriteInCursor(favorite)} icon={Icon.Terminal} />
                  <Action
                    title="Remove Favorite"
                    onAction={() => removeFavorite(favorite.id)}
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "f" }}
                  />
                  <Action.Push
                    title="Rename Favorite"
                    target={<RenameFavoriteForm favorite={favorite} onRename={renameFavorite} />}
                    icon={Icon.Pencil}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
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
        </List.Section>
      )}

      {/* Directories Section */}
      <List.Section title="📁 Directories" subtitle="Select multiple directories to create workspace">
        {directories.map((dir) => {
          const accessories = [];

          // Add git branch tag if available
          if (dir.gitBranch) {
            accessories.push({
              tag: { value: dir.gitBranch, color: "#22c55e" },
              tooltip: `Git branch: ${dir.gitBranch}`,
            });
          }

          // Add selection checkmark
          if (selectedDirs.has(dir.name)) {
            accessories.push({ text: "✓", tooltip: "Selected" });
          }

          return (
            <List.Item
              key={dir.name}
              title={dir.name}
              icon={getSelectionIcon(dir.name)}
              subtitle={path.join(repositoryPath, dir.name)}
              accessories={accessories.length > 0 ? accessories : undefined}
              actions={
                <ActionPanel>
                  <Action
                    title={selectedDirs.has(dir.name) ? "Deselect Directory" : "Select Directory"}
                    onAction={() => toggleSelection(dir.name)}
                    icon={selectedDirs.has(dir.name) ? Icon.XMarkCircle : Icon.CheckCircle}
                  />
                  {selectedDirs.size >= 1 && (
                    <Action
                      title={`Open ${selectedDirs.size} ${selectedDirs.size === 1 ? 'Directory' : 'Directories'} in Cursor`}
                      onAction={openInCursor}
                      shortcut={{ modifiers: ["cmd"], key: "o" }}
                      icon={Icon.Terminal}
                    />
                  )}
                  {selectedDirs.size >= 1 && (
                    <Action
                      title="Create Favorite"
                      onAction={createFavorite}
                      shortcut={{ modifiers: ["cmd"], key: "f" }}
                      icon={Icon.Star}
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
          );
        })}
      </List.Section>
    </List>
  );
}
