const fs = require('fs').promises;
const { spawn } = require('child_process');
const path = require('path');

const languagesDir = path.join(__dirname, '../languages/');

async function translateFiles() {
  try {
    const files = await fs.readdir(languagesDir);
    for (const file of files) {
      if (path.extname(file) === '.json' && file !== 'en_CA.json') {
        const languageCode = path.basename(file, '.json');
        await translateLanguageFile('en_CA', 'en', languageCode);
      }
    }
  } catch (err) {
    console.error('Error reading language files:', err);
  }
}

function translateLanguageFile(sourceLang, targetLang, languageCode) {
  return new Promise((resolve, reject) => {
    const command = 'node';
    const args = [`${__dirname}/translateLanguageFile.js`, sourceLang, targetLang, languageCode];
    const process = spawn(command, args);

    process.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
    });

    process.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });

    process.on('close', (code) => {
      if (code === 0) {
        console.log(`Successfully translated ${languageCode}`);
        resolve();
      } else {
        console.error(`Translation process for ${languageCode} exited with code ${code}`);
        reject(new Error(`Process exited with code ${code}`));
      }
    });
  });
}

translateFiles();
