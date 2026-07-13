import fs from "node:fs";

function getWindowsUserDirectories(
  folder: string
): string[] {
  const usersPath = "/mnt/c/Users";

  if (!fs.existsSync(usersPath)) {
    return [];
  }

  const ignoredUsers = [
    "All Users",
    "Default",
    "Default User",
    "Public",
    "desktop.ini",
  ];

  const paths: string[] = [];

  fs
    .readdirSync(usersPath)
    .filter(
      (user) =>
        !ignoredUsers.includes(user)
    )
    .forEach((user) => {
      paths.push(
        `/mnt/c/Users/${user}/${folder}`
      );

      // OneDrive redirected folders
      paths.push(
        `/mnt/c/Users/${user}/OneDrive/${folder}`
      );
    });

  return paths;
}

const SPECIAL_FOLDERS = [
  "desktop",
  "downloads",
  "documents",
  "pictures",
  "music",
  "videos",
];

export function resolveFolder(
  input: string
): string | undefined {
  const normalized =
    input.trim().toLowerCase();

  if (SPECIAL_FOLDERS.includes(normalized)) {
    const folderName =
      normalized.charAt(0).toUpperCase() +
      normalized.slice(1);

    const possiblePaths =
      getWindowsUserDirectories(folderName);

    console.log(
      "Possible paths:",
      possiblePaths
    );

    const existing = possiblePaths.find(
      (folder) =>
        fs.existsSync(folder)
    );

    if (existing) {
      console.log(
        "Resolved Folder:",
        existing
      );

      return existing;
    }
  }

  if (fs.existsSync(input)) {
    return input;
  }

  return undefined;
}