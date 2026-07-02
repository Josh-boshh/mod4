import crypto from 'node:crypto';
import { put, del } from '@vercel/blob';
import sharp from 'sharp';

const IMAGE_MAX_SIZE = 5 * 1024 * 1024; // 5MB
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);
const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

// gif is excluded — re-encoding through sharp would collapse animated frames
// to a single static image, which is a correctness regression, not an optimization.
const COMPRESSIBLE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);

// Re-encodes at the image's existing dimensions (no resizing) — strips EXIF/
// metadata and applies format-appropriate compression. Falls back to the
// original buffer if re-encoding fails or doesn't actually shrink the file.
async function compressImage(buffer, ext) {
  try {
    const image = sharp(buffer).rotate();
    const compressed = await (ext === 'png'
      ? image.png({ compressionLevel: 9, palette: true, quality: 85 })
      : ext === 'webp'
      ? image.webp({ quality: 80 })
      : image.jpeg({ quality: 80, mozjpeg: true })
    ).toBuffer();

    return compressed.length < buffer.length ? compressed : buffer;
  } catch (e) {
    console.error('[MOD upload] image compression failed, using original:', e.message);
    return buffer;
  }
}

const DOC_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const DOC_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'zip']);
const DOC_MIMES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed',
  'application/octet-stream',
]);

function extensionOf(filename) {
  const parts = String(filename || '').split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

async function uploadFile(file, folder, current, { extensions, maxSize, mimes, compress }) {
  if (!file) return current;

  const ext = extensionOf(file.filename);
  if (!extensions.has(ext)) return current;
  if (file.size > maxSize) {
    console.error('[MOD upload] file too large:', file.size);
    return current;
  }
  if (!mimes.has(file.mimeType)) {
    console.error('[MOD upload] MIME mismatch:', file.mimeType);
    return current;
  }

  const buffer = compress && COMPRESSIBLE_EXTENSIONS.has(ext)
    ? await compressImage(file.buffer, ext)
    : file.buffer;

  const baseName = crypto.randomBytes(8).toString('hex') + '-' + Date.now();
  const pathname = `${folder.replace(/^\/|\/$/g, '')}/${baseName}.${ext}`;

  const blob = await put(pathname, buffer, {
    access: 'public',
    addRandomSuffix: true,
    contentType: file.mimeType,
  });

  if (current && current.includes('blob.vercel-storage.com')) {
    deleteOldBlob(current);
  }

  return blob.url;
}

function deleteOldBlob(url) {
  del(url).catch((e) => console.error('[MOD upload] failed to delete old blob:', e.message));
}

export function uploadImage(file, folder, current = '') {
  return uploadFile(file, folder, current, {
    extensions: IMAGE_EXTENSIONS,
    maxSize: IMAGE_MAX_SIZE,
    mimes: IMAGE_MIMES,
    compress: true,
  });
}

export function uploadDocument(file, folder, current = '') {
  return uploadFile(file, folder, current, {
    extensions: DOC_EXTENSIONS,
    maxSize: DOC_MAX_SIZE,
    mimes: DOC_MIMES,
  });
}
