import fs from 'fs';
import archiver from 'archiver';
import chromeWebstoreUpload from 'chrome-webstore-upload';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const EXTENSION_ID = process.env.EXTENSION_ID;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

const ZIP_NAME = 'extension.zip';

// Files to include in the zip
const INCLUDED_FILES = [
  'manifest.json',
  'content.js',
  'lodash.min.js',
  'popup.html',
  'DeleteShortsIcon128.png',
  'DeleteShortsIcon48.png',
  'DeleteShortsIcon16.png',
  'LICENSE',
  'README.md'
];

if (!EXTENSION_ID || !CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
  console.error('❌ Error: Missing credentials in .env file.');
  console.log('Please copy .env.example to .env and fill in your Chrome Web Store credentials.');
  process.exit(1);
}

const store = chromeWebstoreUpload({
  extensionId: EXTENSION_ID,
  clientId: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
  refreshToken: REFRESH_TOKEN,
});

async function createZip() {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(path.join(__dirname, ZIP_NAME));
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`📦 Zip created: ${ZIP_NAME} (${archive.pointer()} total bytes)`);
      resolve();
    });

    archive.on('warning', (err) => {
        if (err.code === 'ENOENT') {
            console.warn(err);
        } else {
            reject(err);
        }
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);

    INCLUDED_FILES.forEach(file => {
      if (fs.existsSync(file)) {
          archive.file(file, { name: file });
      } else {
          console.warn(`⚠️ Warning: File not found: ${file}`);
      }
    });

    archive.finalize();
  });
}

async function uploadExtension() {
  try {
    const myZipFile = fs.createReadStream(path.join(__dirname, ZIP_NAME));
    const token = await store.fetchToken();

    console.log('🚀 Uploading to Chrome Web Store...');
    const resource = await store.uploadExisting(myZipFile, token);

    // Check for upload errors
    if (resource.uploadState === 'FAILURE') {
        if (resource.itemError && resource.itemError.some(e => e.error_code === ' version_number_modification_required')) {
             console.error('\n❌ UPLOAD FAILED: Version Number Error');
             console.error('You must increase the "version" number in manifest.json before uploading.');
             console.error(`Current version provided: ${require('./manifest.json').version}`); // This prompt might fail due to ES modules, let's keep it simple
        } else {
            console.error('\n❌ UPLOAD FAILED');
            console.error(JSON.stringify(resource, null, 2));
        }
        process.exit(1);
    }
    
    console.log('\n✅ Upload Successful!');
    console.log(`Item ID: ${resource.id}`);
    console.log(`Upload State: ${resource.uploadState}`);
    
    // Optional: Publish the item
    // await store.publish('default', token); 
    // console.log('✅ Published!');

  } catch (error) {
    if (error.response && error.response.data && error.response.data.error) {
         // Handle Google API errors
         const apiError = error.response.data.error;
         console.error('\n❌ Google API Error:');
         console.error(`Code: ${apiError.code}`);
         console.error(`Message: ${apiError.message}`);
         
         // Try to detect version error from message if possible
         if (apiError.message.includes('version')) {
             console.error('👉 Tip: Check your manifest.json version number.');
         }
    } else {
        console.error('❌ Unexpected Error:', error);
    }
    process.exit(1);
  }
}

// Main execution
(async () => {
  try {
    await createZip();
    await uploadExtension();
  } catch (err) {
    console.error('❌ Script failed:', err);
  }
})();
