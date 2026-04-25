/**
 * generate-ar-markers.js
 *
 * Scans the assets/ folder for QR code images (.qr, .png, .jpg, .jpeg),
 * generates AR.js pattern files (pattern.patt) and marker images (marker.png)
 * in the same folder as the source image.
 *
 * Pattern generation logic is based on AR.js's threex-arpatternfile.js
 * (https://github.com/jeromeetienne/AR.js):
 *   - Resize image to 16x16
 *   - Generate 4 rotations (0°, 90°, 180°, 270°)
 *   - Encode pixel values in BGR order
 */

'use strict';

const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');

const ASSETS_DIR = path.join(process.cwd(), 'assets');
const IMAGE_EXTENSIONS = new Set(['.qr', '.png', '.jpg', '.jpeg']);
const PATTERN_FILENAME = 'pattern.patt';
const MARKER_FILENAME = 'marker.png';
const BYTES_PER_PIXEL = 4;
const WHITE_COLOR = 0xffffffff;
const BLACK_COLOR = 0x000000ff;

// ---------------------------------------------------------------------------
// Pattern file generation (AR.js encodeImage logic, ported to Node/Jimp)
// ---------------------------------------------------------------------------

/**
 * Rotate raw RGBA pixel data (width x height) by a given angle in radians
 * around the center of the image.
 *
 * @param {Buffer} data   - RGBA pixel buffer (4 bytes per pixel)
 * @param {number} width
 * @param {number} height
 * @param {number} angle  - Rotation angle in radians (counter-clockwise)
 * @returns {Buffer}      - New RGBA pixel buffer after rotation
 */
function rotatePixels(data, width, height, angle) {
  const out = Buffer.alloc(data.length, 0);
  const cx = width / 2;
  const cy = height / 2;
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Map destination pixel back to source
      const dx = x - cx;
      const dy = y - cy;
      const sx = cos * dx - sin * dy + cx;
      const sy = sin * dx + cos * dy + cy;

      const srcX = Math.round(sx);
      const srcY = Math.round(sy);

      const dstIdx = (y * width + x) * BYTES_PER_PIXEL;

      if (srcX >= 0 && srcX < width && srcY >= 0 && srcY < height) {
        const srcIdx = (srcY * width + srcX) * BYTES_PER_PIXEL;
        out[dstIdx] = data[srcIdx];
        out[dstIdx + 1] = data[srcIdx + 1];
        out[dstIdx + 2] = data[srcIdx + 2];
        out[dstIdx + 3] = data[srcIdx + 3];
      }
    }
  }

  return out;
}

/**
 * Encode a Jimp image into an AR.js .patt file string.
 * Mirrors THREEx.ArPatternFile.encodeImage() from threex-arpatternfile.js.
 *
 * @param {Jimp} image - Source Jimp image
 * @returns {string}   - Contents of the .patt file
 */
async function encodeImage(image) {
  // Resize to 16x16 (the AR.js standard)
  const resized = image.clone().resize(16, 16);
  const width = 16;
  const height = 16;

  const rawData = resized.bitmap.data; // RGBA Buffer

  let patternFileString = '';

  // 4 orientations: 0°, -90°, -180°, -270° (matching the JS loop)
  const orientations = [0, -Math.PI / 2, -Math.PI, -Math.PI * 1.5];

  for (let i = 0; i < orientations.length; i++) {
    const orientation = orientations[i];
    const pixels =
      orientation === 0 ? rawData : rotatePixels(rawData, width, height, orientation);

    if (i !== 0) patternFileString += '\n';

    // NOTE: BGR order (channelOffset 2 → 1 → 0), matching AR.js source
    for (let channelOffset = 2; channelOffset >= 0; channelOffset--) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (x !== 0) patternFileString += ' ';
          const offset = (y * width * BYTES_PER_PIXEL) + (x * BYTES_PER_PIXEL) + channelOffset;
          const value = pixels[offset];
          patternFileString += String(value).padStart(3);
        }
        patternFileString += '\n';
      }
    }
  }

  return patternFileString;
}

// ---------------------------------------------------------------------------
// Marker image generation (AR.js buildFullMarker logic, ported to Node/Jimp)
// ---------------------------------------------------------------------------

/**
 * Build an AR.js full marker image (white border → black border → QR image).
 * Mirrors THREEx.ArPatternFile.buildFullMarker() from threex-arpatternfile.js.
 *
 * @param {Jimp}   qrImage  - Source QR code Jimp image
 * @param {number} size     - Output canvas size in pixels (default: 512)
 * @param {number} pattRatio - Ratio of inner pattern area (default: 0.5)
 * @returns {Jimp}          - Resulting marker Jimp image
 */
async function buildFullMarker(qrImage, size = 512, pattRatio = 0.5) {
  const whiteMargin = 0.1;
  const blackMargin = (1 - 2 * whiteMargin) * ((1 - pattRatio) / 2);
  const innerMargin = whiteMargin + blackMargin;

  // Create white background
  const marker = await Jimp.create(size, size, WHITE_COLOR);

  // Draw black border area using scan() for efficiency
  const blackX = Math.round(whiteMargin * size);
  const blackY = Math.round(whiteMargin * size);
  const blackW = Math.round(size * (1 - 2 * whiteMargin));
  const blackH = Math.round(size * (1 - 2 * whiteMargin));

  marker.scan(blackX, blackY, blackW, blackH, function (x, y, idx) {
    this.bitmap.data.writeUInt32BE(BLACK_COLOR, idx);
  });

  // Draw white inner area (to clear before placing QR)
  const innerX = Math.round(innerMargin * size);
  const innerY = Math.round(innerMargin * size);
  const innerW = Math.round(size * (1 - 2 * innerMargin));
  const innerH = Math.round(size * (1 - 2 * innerMargin));

  marker.scan(innerX, innerY, innerW, innerH, function (x, y, idx) {
    this.bitmap.data.writeUInt32BE(WHITE_COLOR, idx);
  });

  // Resize and composite QR image into the inner area
  const qrResized = qrImage.clone().resize(innerW, innerH);
  marker.composite(qrResized, innerX, innerY);

  return marker;
}

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

/**
 * Recursively find all image files under a directory,
 * excluding pattern.patt and marker.png (which we generate).
 *
 * @param {string} dir
 * @returns {string[]} Absolute file paths
 */
function findImageFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findImageFiles(fullPath));
    } else if (IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      // Skip already-generated marker images
      if (entry.name !== MARKER_FILENAME) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!fs.existsSync(ASSETS_DIR)) {
    console.log('No assets/ directory found, nothing to do.');
    return;
  }

  const imageFiles = findImageFiles(ASSETS_DIR);

  if (imageFiles.length === 0) {
    console.log('No image files found in assets/, nothing to do.');
    return;
  }

  console.log(`Found ${imageFiles.length} image file(s) to process.`);

  for (const imagePath of imageFiles) {
    const folder = path.dirname(imagePath);
    const pattPath = path.join(folder, PATTERN_FILENAME);
    const markerPath = path.join(folder, MARKER_FILENAME);

    console.log(`\nProcessing: ${path.relative(process.cwd(), imagePath)}`);

    try {
      const image = await Jimp.read(imagePath);

      // Generate pattern.patt
      const patternContent = await encodeImage(image);
      fs.writeFileSync(pattPath, patternContent, 'utf8');
      console.log(`  ✓ Generated: ${path.relative(process.cwd(), pattPath)}`);

      // Generate marker.png
      const markerImage = await buildFullMarker(image);
      await markerImage.writeAsync(markerPath);
      console.log(`  ✓ Generated: ${path.relative(process.cwd(), markerPath)}`);
    } catch (err) {
      console.error(`  ✗ Failed to process ${imagePath}: ${err.message}`);
    }
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
