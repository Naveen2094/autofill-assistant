const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Helper to compute CRC32 for PNG chunks
function createCRC32Table() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    table[n] = c;
  }
  return table;
}

const crcTable = createCRC32Table();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(4 + 4 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  
  const typeAndData = buf.subarray(4, 8 + len);
  const crcVal = crc32(typeAndData);
  buf.writeUInt32BE(crcVal, 8 + len);
  return buf;
}

function generatePNG(width, height, pixelFn) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = writeChunk('IHDR', ihdr);

  // IDAT raw scanlines (1 filter byte 0 + RGBA per pixel)
  const rawData = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;

  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // filter type 0
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = pixelFn(x, y, width, height);
      rawData[offset++] = Math.max(0, Math.min(255, Math.round(r)));
      rawData[offset++] = Math.max(0, Math.min(255, Math.round(g)));
      rawData[offset++] = Math.max(0, Math.min(255, Math.round(b)));
      rawData[offset++] = Math.max(0, Math.min(255, Math.round(a)));
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = writeChunk('IDAT', compressedData);

  // IEND
  const iendChunk = writeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Icon Drawer logic: Golden Temple/Vibrant Saffron background with a glowing lightning bolt
function drawIconPixel(x, y, size) {
  const nx = x / (size - 1); // 0 to 1
  const ny = y / (size - 1); // 0 to 1
  
  // Rounded corner mask
  const cx = nx - 0.5;
  const cy = ny - 0.5;
  const cornerRadius = 0.2;
  const distCorner = Math.max(Math.abs(cx) - (0.5 - cornerRadius), 0) ** 2 +
                     Math.max(Math.abs(cy) - (0.5 - cornerRadius), 0) ** 2;
  if (distCorner > cornerRadius ** 2) {
    return [0, 0, 0, 0]; // Transparent
  }

  // Deep Royal Blue to Golden Gradient Background
  const grad = ny;
  let r = 240 * (1 - grad) + 218 * grad; // Vibrant gold/orange gradient
  let g = 110 * (1 - grad) + 165 * grad;
  let b = 15 * (1 - grad) + 32 * grad;
  let a = 255;

  // Outer border / glow
  if (nx < 0.05 || nx > 0.95 || ny < 0.05 || ny > 0.95) {
    return [255, 223, 128, 255]; // Soft gold border
  }

  // Lightning Bolt shape
  // Points (in normalized coordinates 0 to 1):
  // Top: (0.55, 0.18), Mid-right: (0.35, 0.48), Center-right: (0.55, 0.48)
  // Bottom: (0.42, 0.82), Mid-left: (0.62, 0.52), Center-left: (0.45, 0.52)
  // Simplified distance checking for lightning polygon:
  const isLightning = pointInPolygon(nx, ny, [
    [0.54, 0.16],
    [0.32, 0.50],
    [0.50, 0.50],
    [0.42, 0.84],
    [0.66, 0.46],
    [0.48, 0.46]
  ]);

  if (isLightning) {
    // Glowing white to bright cyan-gold bolt
    return [255, 255, 255, 255];
  }

  // Add subtle diagonal highlight stripe
  if (Math.abs(nx + ny - 0.6) < 0.08) {
    r = Math.min(255, r + 45);
    g = Math.min(255, g + 45);
    b = Math.min(255, b + 45);
  }

  return [r, g, b, a];
}

function pointInPolygon(px, py, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect = ((yi > py) !== (yj > py)) &&
      (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

const outputDir = path.join(__dirname, 'icons');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

[16, 48, 128].forEach(size => {
  const pngBuffer = generatePNG(size, size, (x, y) => drawIconPixel(x, y, size));
  const filename = path.join(outputDir, `icon${size}.png`);
  fs.writeFileSync(filename, pngBuffer);
  console.log(`Generated ${filename} (${size}x${size})`);
});
