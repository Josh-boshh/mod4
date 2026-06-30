import crypto from 'node:crypto';
import { put, del } from '@vercel/blob';

const IMAGE_MAX_SIZE = 5 * 1024 * 1024; // 5MB
const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);
const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

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

async function uploadFile(file, folder, current, { extensions, maxSize, mimes }) {
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

  const baseName = crypto.randomBytes(8).toString('hex') + '-' + Date.now();
  const pathname = `${folder.replace(/^\/|\/$/g, '')}/${baseName}.${ext}`;

  const blob = await put(pathname, file.buffer, {
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
  });
}

export function uploadDocument(file, folder, current = '') {
  return uploadFile(file, folder, current, {
    extensions: DOC_EXTENSIONS,
    maxSize: DOC_MAX_SIZE,
    mimes: DOC_MIMES,
  });
}
