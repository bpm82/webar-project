'use strict';

/**
 * generate-qr.js
 *
 * Scans the assets/ directory for subdirectories and generates a QR code
 * (qrcode.svg) in each one.  The QR code encodes the URL:
 *   https://github.com/bpm82/webar-project/blob/+autoqr/index.html?id={folder-name}
 *
 * Usage:
 *   node scripts/generate-qr.js
 *
 * Requires: qrcode  (npm install qrcode)
 */

const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

const ASSETS_DIR = path.join(process.cwd(), 'assets');
const BASE_URL =
  'https://github.com/bpm82/webar-project/blob/+autoqr/index.html';
const QR_FILENAME = 'qrcode.svg';

async function main() {
  if (!fs.existsSync(ASSETS_DIR)) {
    console.log('No assets/ directory found, nothing to do.');
    return;
  }

  const entries = fs.readdirSync(ASSETS_DIR, { withFileTypes: true });
  const folders = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  if (folders.length === 0) {
    console.log('No subdirectories found in assets/, nothing to do.');
    return;
  }

  console.log(`Found ${folders.length} folder(s) in assets/.`);

  let generated = 0;

  for (const folder of folders) {
    const folderPath = path.join(ASSETS_DIR, folder);
    const qrPath = path.join(folderPath, QR_FILENAME);
    const url = `${BASE_URL}?id=${encodeURIComponent(folder)}`;

    try {
      const svg = await QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'M' });
      fs.writeFileSync(qrPath, svg, 'utf8');
      console.log(`  ✓ ${folder}  →  ${QR_FILENAME}  (${url})`);
      generated++;
    } catch (err) {
      console.error(`  ✗ Failed to generate QR for "${folder}": ${err.message}`);
    }
  }

  console.log(`\nDone. Generated ${generated}/${folders.length} QR code(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
