require('dotenv').config();
const chokidar = require('chokidar');
const fs = require('fs-extra');
const path = require('path');

const SOURCE_DIR = process.env.SOURCE_DIR;
const DESTINATION_DIR = process.env.DESTINATION_DIR;
const MAX_VERSIONS = 4;

// Ensure destination directory exists
fs.ensureDirSync(DESTINATION_DIR);

// Function to get versioned directory name
const getVersionedDirName = (dirPath, version) => {
  return `${dirPath}_v${version}`;
};

// Function to get all versions of a directory
const getDirVersions = (dirPath) => {
  const baseName = path.basename(dirPath);
  const parentDir = path.dirname(path.join(DESTINATION_DIR, dirPath));
  const dirs = fs.readdirSync(parentDir).filter(dir => dir.startsWith(baseName) && dir.includes('_v'));
  return dirs.sort((a, b) => {
    const versionA = parseInt(a.split('_v')[1]);
    const versionB = parseInt(b.split('_v')[1]);
    return versionB - versionA;
  });
};

// Function to copy directories with versioning
const copyDir = (dirPath) => {
  const relativePath = path.relative(SOURCE_DIR, dirPath);
  const destDir = path.join(DESTINATION_DIR, path.dirname(relativePath));
  fs.ensureDirSync(destDir);

  const versions = getDirVersions(dirPath);
  const newVersion = versions.length > 0 ? parseInt(versions[0].split('_v')[1]) + 1 : 1;
  const destPath = path.join(destDir, getVersionedDirName(path.basename(dirPath), newVersion));

  fs.copy(dirPath, destPath)
    .then(() => {
      console.log(`Copied: ${dirPath} to ${destPath}`);
      // Remove old versions if exceeding MAX_VERSIONS
      if (versions.length >= MAX_VERSIONS) {
        const oldVersions = versions.slice(MAX_VERSIONS - 1);
        oldVersions.forEach(oldVersion => {
          fs.removeSync(path.join(destDir, oldVersion));
          console.log(`Removed old version: ${oldVersion}`);
        });
      }
    })
    .catch(err => console.error(`Error copying ${dirPath}:`, err));
};

// Initialize watcher
const watcher = chokidar.watch(SOURCE_DIR, {
  persistent: true,
  ignoreInitial: true,
  depth: 0, // Watch only the top-level directories
});

// Add event listeners
watcher
  .on('addDir', copyDir)
  .on('changeDir', copyDir)
  .on('error', error => console.error(`Watcher error: ${error}`));

console.log(`Watching for changes in ${SOURCE_DIR}`);