'use strict';

/**
 * validate-assets.js
 *
 * Validates the assets/ directory against index.html expectations:
 *   - Each subdirectory must contain model.glb
 *   - Each subdirectory must contain pattern.patt
 *   - Each subdirectory must contain qrcode.svg
 *
 * Exits with code 1 if any inconsistency is found.
 *
 * Usage:
 *   node scripts/validate-assets.js
 */

const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(process.cwd(), 'assets');
const REQUIRED_FILES = ['model.glb', 'pattern.patt', 'qrcode.svg'];

function main() {
  if (!fs.existsSync(ASSETS_DIR)) {
    console.error('ERROR: assets/ directory does not exist.');
    process.exit(1);
  }

  const entries = fs.readdirSync(ASSETS_DIR, { withFileTypes: true });
  const folders = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  if (folders.length === 0) {
    console.log('No subdirectories found in assets/. Nothing to validate.');
    return;
  }

  console.log(`Validating ${folders.length} folder(s) in assets/...\n`);

  let hasErrors = false;

  for (const folder of folders) {
    const folderPath = path.join(ASSETS_DIR, folder);
    const missing = [];

    for (const required of REQUIRED_FILES) {
      const filePath = path.join(folderPath, required);
      if (!fs.existsSync(filePath)) {
        missing.push(required);
      }
    }

    if (missing.length > 0) {
      console.error(`  ✗ assets/${folder}/  — missing: ${missing.join(', ')}`);
      hasErrors = true;
    } else {
      console.log(`  ✓ assets/${folder}/`);
    }
  }

  console.log('');

  if (hasErrors) {
    console.error('Validation FAILED. Please fix the errors above.');
    process.exit(1);
  } else {
    console.log('Validation PASSED. All assets are consistent with index.html.');
  }
}

main();
