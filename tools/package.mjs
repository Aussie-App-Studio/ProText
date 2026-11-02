import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

/**
 * Creates a standard POSIX-compliant ZIP archive without external dependencies.
 * Guarantees all entry paths use forward slashes '/' for 100% Chrome Web Store compatibility.
 */
function createZip(sourceDir, outPath) {
  const files = [];

  function walk(dir, relPath = '') {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      const rel = relPath ? `${relPath}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(full, rel);
      } else {
        files.push({ full, rel: rel.replace(/\\/g, '/') });
      }
    }
  }
  walk(sourceDir);

  const localHeaders = [];
  const centralDirHeaders = [];
  let offset = 0;

  // CRC-32 calculation
  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[i] = c >>> 0;
  }

  function crc32(buf) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  const chunks = [];

  for (const f of files) {
    const rawData = fs.readFileSync(f.full);
    const uncompressedSize = rawData.length;
    const fileCrc = crc32(rawData);

    // Deflate
    const compressedData = zlib.deflateRawSync(rawData, { level: 9 });
    const compressedSize = compressedData.length;

    const nameBuf = Buffer.from(f.rel, 'utf8');

    // Local file header (30 bytes + name length)
    const localHeader = Buffer.alloc(30 + nameBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // signature
    localHeader.writeUInt16LE(20, 4);         // version needed (2.0)
    localHeader.writeUInt16LE(0x0800, 6);     // flags (UTF-8)
    localHeader.writeUInt16LE(8, 8);          // compression method (deflate)
    localHeader.writeUInt16LE(0, 10);         // mod time
    localHeader.writeUInt16LE(0, 12);         // mod date
    localHeader.writeUInt32LE(fileCrc, 14);   // crc32
    localHeader.writeUInt32LE(compressedSize, 18); // compressed size
    localHeader.writeUInt32LE(uncompressedSize, 22); // uncompressed size
    localHeader.writeUInt16LE(nameBuf.length, 26); // file name length
    localHeader.writeUInt16LE(0, 28);         // extra field length
    nameBuf.copy(localHeader, 30);

    chunks.push(localHeader);
    chunks.push(compressedData);

    // Central directory header (46 bytes + name length)
    const cdHeader = Buffer.alloc(46 + nameBuf.length);
    cdHeader.writeUInt32LE(0x02014b50, 0);   // signature
    cdHeader.writeUInt16LE(20, 4);           // version made by
    cdHeader.writeUInt16LE(20, 6);           // version needed
    cdHeader.writeUInt16LE(0x0800, 8);       // flags (UTF-8)
    cdHeader.writeUInt16LE(8, 10);           // compression method (deflate)
    cdHeader.writeUInt16LE(0, 12);           // mod time
    cdHeader.writeUInt16LE(0, 14);           // mod date
    cdHeader.writeUInt32LE(fileCrc, 16);     // crc32
    cdHeader.writeUInt32LE(compressedSize, 20); // compressed size
    cdHeader.writeUInt32LE(uncompressedSize, 24); // uncompressed size
    cdHeader.writeUInt16LE(nameBuf.length, 28); // file name length
    cdHeader.writeUInt16LE(0, 30);           // extra length
    cdHeader.writeUInt16LE(0, 32);           // comment length
    cdHeader.writeUInt16LE(0, 34);           // disk number start
    cdHeader.writeUInt16LE(0, 36);           // internal file attributes
    cdHeader.writeUInt32LE(0, 38);           // external file attributes
    cdHeader.writeUInt32LE(offset, 42);      // relative offset of local header
    nameBuf.copy(cdHeader, 46);

    centralDirHeaders.push(cdHeader);
    offset += localHeader.length + compressedData.length;
  }

  const centralDirOffset = offset;
  let centralDirSize = 0;
  for (const cdh of centralDirHeaders) {
    chunks.push(cdh);
    centralDirSize += cdh.length;
  }

  // End of central directory record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);         // signature
  eocd.writeUInt16LE(0, 4);                  // disk number
  eocd.writeUInt16LE(0, 6);                  // disk with central dir
  eocd.writeUInt16LE(files.length, 8);       // entries on this disk
  eocd.writeUInt16LE(files.length, 10);      // total entries
  eocd.writeUInt32LE(centralDirSize, 12);    // size of central directory
  eocd.writeUInt32LE(centralDirOffset, 16);  // offset of central directory
  eocd.writeUInt16LE(0, 20);                 // comment length

  chunks.push(eocd);

  fs.writeFileSync(outPath, Buffer.concat(chunks));
  console.log(`Created Chrome Web Store package: ${outPath} (${fs.statSync(outPath).size} bytes)`);
  files.forEach(f => console.log(`  ✓ ${f.rel}`));
}

createZip('dist', 'protext-v0.1.0.zip');
