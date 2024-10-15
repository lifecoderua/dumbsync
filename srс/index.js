require('dotenv').config();
const chokidar = require('chokidar');
const fs = require('fs-extra');
const path = require('path');

const SOURCE_DIR = process.env.SOURCE_DIR;
const DESTINATION_DIR = process.env.DESTINATION_DIR;
const MAX_VERSIONS = 8;

// Ensure destination directory exists
fs.ensureDirSync(DESTINATION_DIR);

// Function to get versioned directory name
const getVersionedDirName = (dirPath, version) => {
  return `${dirPath}_v${version}`;
};

// Function to get all versions of a directory
const getDirVersions = (dirPath) => {
  const baseName = path.basename(dirPath);
  const parentDir = path.dirname(path.join(DESTINATION_DIR, baseName));
  const dirs = fs.readdirSync(parentDir).filter(dir => dir.startsWith(baseName) && dir.includes('_v'));
  return dirs.sort((a, b) => {
    const versionA = parseInt(a.split('_v')[1]);
    const versionB = parseInt(b.split('_v')[1]);
    return versionB - versionA;
  });
};

// Function to create a backup of the directory
const backupDirectory = (dirPath) => {
  const dirName = path.basename(dirPath);
  const versions = getDirVersions(dirPath);
  const newVersion = versions.length > 0 ? parseInt(versions[0].split('_v')[1]) + 1 : 1;
  const versionedDirName = getVersionedDirName(dirName, newVersion);
  const destinationPath = path.join(DESTINATION_DIR, versionedDirName);

  fs.copySync(dirPath, destinationPath);
  console.log(`Backup created: ${destinationPath}`);

  // Remove old versions if exceeding MAX_VERSIONS
  if (versions.length >= MAX_VERSIONS) {
    const oldVersion = versions[versions.length - 1];
    const oldVersionPath = path.join(DESTINATION_DIR, oldVersion);
    fs.removeSync(oldVersionPath);
    console.log(`Old version removed: ${oldVersionPath}`);
  }
};

// TODO: if multiple files updated in a folder - causes multiple events and backups.
//       Not critical but a fix candidate.
// Initialize watcher
const watcher = chokidar.watch(SOURCE_DIR, { persistent: true, ignoreInitial: true, depth: 1 });

// Event listeners
watcher
  .on('addDir', (dirPath) => {
    console.log(`Directory added: ${dirPath}`);
    backupDirectory(dirPath);
  })
  .on('change', (filePath) => {
    const dirPath = path.dirname(filePath);
    console.log(`File changed: ${filePath}`);
    backupDirectory(dirPath);
  })
  .on('unlinkDir', (dirPath) => {
    console.log(`Directory removed: ${dirPath}`);
  });

console.log(`Watching for changes in ${SOURCE_DIR}`);