import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(width, height, isMaskable = false) {
  // CRC32 table
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c;
  }

  function crc32(buf) {
    let crc = -1;
    for (let i = 0; i < buf.length; i++) {
      crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ -1) >>> 0;
  }

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(4 + 4 + len + 4);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const crc = crc32(buf.subarray(4, 8 + len));
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  // Raw image data with row filter 0
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter byte: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      // Normalized coordinates
      const nx = x / width;
      const ny = y / height;

      // Background Gradient: #0284c7 -> #2563eb -> #06b6d4
      const r = Math.round(2 + (37 - 2) * nx + (6 - 37) * ny);
      const g = Math.round(132 + (99 - 132) * nx + (182 - 99) * ny);
      const b = Math.round(199 + (235 - 199) * nx + (212 - 235) * ny);
      let a = 255;

      // Rounded corner for non-maskable icons
      if (!isMaskable) {
        const radius = width * 0.22;
        let dx = 0;
        let dy = 0;
        if (x < radius) dx = radius - x;
        else if (x > width - radius) dx = x - (width - radius);
        if (y < radius) dy = radius - y;
        else if (y > height - radius) dy = y - (height - radius);

        if (dx > 0 && dy > 0) {
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > radius) {
            a = 0;
          } else if (dist > radius - 1.5) {
            a = Math.round(255 * (radius - dist) / 1.5);
          }
        }
      }

      // Drawing Building Silhouette in center
      // Center tower: x from 0.38 to 0.62, y from 0.22 to 0.76
      const inTower = nx >= 0.38 && nx <= 0.62 && ny >= 0.22 && ny <= 0.76;
      // Left wing: x from 0.22 to 0.38, y from 0.38 to 0.76
      const inLeftWing = nx >= 0.22 && nx <= 0.38 && ny >= 0.38 && ny <= 0.76;
      // Right wing: x from 0.62 to 0.78, y from 0.46 to 0.76
      const inRightWing = nx >= 0.62 && nx <= 0.78 && ny >= 0.46 && ny <= 0.76;
      // Base floor: x from 0.16 to 0.84, y from 0.76 to 0.81
      const inBase = nx >= 0.16 && nx <= 0.84 && ny >= 0.76 && ny <= 0.81;

      // Windows
      const inTowerWin1 = nx >= 0.43 && nx <= 0.48 && (ny >= 0.28 && ny <= 0.34 || ny >= 0.38 && ny <= 0.44 || ny >= 0.48 && ny <= 0.54 || ny >= 0.58 && ny <= 0.64);
      const inTowerWin2 = nx >= 0.52 && nx <= 0.57 && (ny >= 0.28 && ny <= 0.34 || ny >= 0.38 && ny <= 0.44 || ny >= 0.48 && ny <= 0.54 || ny >= 0.58 && ny <= 0.64);
      const inLeftWin = nx >= 0.26 && nx <= 0.32 && (ny >= 0.46 && ny <= 0.52 || ny >= 0.55 && ny <= 0.61 || ny >= 0.64 && ny <= 0.70);
      const inRightWin = nx >= 0.68 && nx <= 0.74 && (ny >= 0.53 && ny <= 0.59 || ny >= 0.62 && ny <= 0.68);

      // Checkmark Circle Badge (Green circle bottom right: center cx=0.74, cy=0.74, r=0.14)
      const badgeDist = Math.sqrt((nx - 0.74) ** 2 + (ny - 0.74) ** 2);
      const inBadge = badgeDist <= 0.14;
      const inBadgeBorder = badgeDist <= 0.155 && badgeDist > 0.135;

      if (a > 0) {
        if (inBadge) {
          // Checkmark shape
          const cxCheck = 0.74;
          const cyCheck = 0.74;
          const relX = nx - cxCheck;
          const relY = ny - cyCheck;
          const isCheckLine1 = relX >= -0.07 && relX <= -0.01 && Math.abs(relY - (relX + 0.05)) < 0.02;
          const isCheckLine2 = relX >= -0.01 && relX <= 0.08 && Math.abs(relY - (-relX + 0.03)) < 0.02;

          if (isCheckLine1 || isCheckLine2) {
            rawData[pxOffset] = 255;
            rawData[pxOffset + 1] = 255;
            rawData[pxOffset + 2] = 255;
          } else {
            rawData[pxOffset] = 16;
            rawData[pxOffset + 1] = 185;
            rawData[pxOffset + 2] = 129;
          }
        } else if (inBadgeBorder) {
          rawData[pxOffset] = 255;
          rawData[pxOffset + 1] = 255;
          rawData[pxOffset + 2] = 255;
        } else if (inTowerWin1 || inTowerWin2 || inLeftWin || inRightWin) {
          rawData[pxOffset] = 2;
          rawData[pxOffset + 1] = 132;
          rawData[pxOffset + 2] = 199;
        } else if (inTower || inLeftWing || inRightWing || inBase) {
          rawData[pxOffset] = 255;
          rawData[pxOffset + 1] = 255;
          rawData[pxOffset + 2] = 255;
        } else {
          rawData[pxOffset] = r;
          rawData[pxOffset + 1] = g;
          rawData[pxOffset + 2] = b;
        }
        rawData[pxOffset + 3] = a;
      } else {
        rawData[pxOffset] = 0;
        rawData[pxOffset + 1] = 0;
        rawData[pxOffset + 2] = 0;
        rawData[pxOffset + 3] = 0;
      }
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT
  const idatChunk = makeChunk('IDAT', deflated);

  // IEND
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate PWA icons
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPNG(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPNG(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPNG(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPNG(180, 180, false));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createPNG(64, 64, false));

console.log('Successfully generated all PWA icons!');
