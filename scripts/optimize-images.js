// One-off pass: recompress existing images in assets/images at their current
// dimensions. No resizing — only re-encoding + metadata stripping, so nothing
// that references these files by pixel size or layout is affected.
import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import sharp from 'sharp';

const ROOT = new URL('../assets/images', import.meta.url).pathname;

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

async function optimize(path) {
  const ext = extname(path).toLowerCase();
  if (!['.jpg', '.jpeg', '.png'].includes(ext)) return null;

  const original = await readFile(path);
  const image = sharp(original).rotate(); // auto-orient, then strip EXIF on encode
  const { hasAlpha } = await sharp(original).metadata();

  // Some files here are PNGs with transparency saved under a .jpg name (the
  // browser sniffs the real signature and renders them fine either way).
  // JPEG has no alpha channel, so encoding one of these as JPEG silently
  // flattens the transparent areas to black. Go by hasAlpha, not extension.
  let output;
  if (hasAlpha) {
    output = await image.png({ compressionLevel: 9, palette: true, quality: 85 }).toBuffer();
  } else if (ext === '.png') {
    output = await image.png({ compressionLevel: 9, palette: true, quality: 85 }).toBuffer();
  } else {
    output = await image.jpeg({ quality: 80, mozjpeg: true }).toBuffer();
  }

  if (output.length >= original.length) return { path, before: original.length, after: original.length, skipped: true };

  await writeFile(path, output);
  return { path, before: original.length, after: output.length, skipped: false };
}

const results = [];
for await (const file of walk(ROOT)) {
  const result = await optimize(file);
  if (result) results.push(result);
}

let totalBefore = 0;
let totalAfter = 0;
for (const r of results) {
  totalBefore += r.before;
  totalAfter += r.after;
  const pct = r.skipped ? 'skipped (already optimal)' : `-${(100 - (r.after / r.before) * 100).toFixed(1)}%`;
  console.log(`${r.path.replace(ROOT, 'assets/images')}  ${(r.before / 1024).toFixed(0)}KB -> ${(r.after / 1024).toFixed(0)}KB  ${pct}`);
}

console.log('---');
console.log(`Total: ${(totalBefore / 1024).toFixed(0)}KB -> ${(totalAfter / 1024).toFixed(0)}KB (-${(100 - (totalAfter / totalBefore) * 100).toFixed(1)}%)`);
