const fetch = require('node-fetch');
const unzipper = require('unzipper');
const fs = require('fs').promises;
const path = require('path');

const GITLAB_API_URL = 'https://gitlab.com/api/v4';
const PROJECT_ID = 'Shinobi-Systems/shinobi-plugins';
const BRANCH = 'master';

async function fetchAndDownloadFolder(folderName) {
  const url = `${GITLAB_API_URL}/projects/${encodeURIComponent(PROJECT_ID)}/repository/archive.zip?path=plugins/${folderName}&ref=${BRANCH}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/zip',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download folder: ${response.statusText}`);
    }

    // Create a temporary path for extraction
    const tempExtractPath = path.join(process.cwd(), 'temp_extracted');
    await fs.mkdir(tempExtractPath, { recursive: true });

    // Extract the ZIP using unzipper
    await response.body
      .pipe(unzipper.Extract({ path: tempExtractPath }))
      .promise();

    // Find the folder ending with the target name
    const extractedFolder = (await fs.readdir(tempExtractPath)).find(dir => dir.endsWith(folderName));
    if (!extractedFolder) {
      throw new Error(`Folder ${folderName} not found in the extracted ZIP`);
    }

    // Move the contents to the specified output path
    const sourcePath = path.join(tempExtractPath, extractedFolder, 'plugins', folderName);
    const targetPath = path.join(process.cwd(), 'plugins', `dl_${folderName}`);

    // Ensure target path exists
    await fs.mkdir(targetPath, { recursive: true });

    // Copy files from source to target
    const files = await fs.readdir(sourcePath);
    await Promise.all(files.map(async file => {
      const srcFile = path.join(sourcePath, file);
      const destFile = path.join(targetPath, file);
      await fs.rename(srcFile, destFile);
    }));

    // Clean up temporary extraction directory
    await fs.rm(tempExtractPath, { recursive: true });

    console.log(`Folder ${folderName} extracted to ${targetPath}`);
  } catch (error) {
    console.error('Error fetching and extracting folder:', error);
  }
}

// Parse command-line arguments
const [folderName] = process.argv.slice(2);

if (!folderName) {
  console.error('Usage: node script.js <folderName>');
  process.exit(1);
}

fetchAndDownloadFolder(folderName);
