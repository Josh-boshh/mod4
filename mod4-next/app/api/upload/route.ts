import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import sharp from 'sharp';
import { createClient } from '@/lib/supabase/server';

// Vercel serverless functions cap request bodies well under 5MB — stay clear of that.
const MAX_IMAGE_SIZE = 4 * 1024 * 1024;
const MAX_DOC_SIZE = 10 * 1024 * 1024;

const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const DOC_EXT_BY_MIME: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/zip': 'zip',
  'application/x-zip-compressed': 'zip',
};

// Node's Buffer.from()/allocUnsafe() below ~8KB (Buffer.poolSize) carve the
// buffer out of a shared internal memory pool for efficiency — including,
// it turns out, Buffer.from(new Uint8Array(...)), which still copies its
// *destination* buffer from that same pool. Under Node 24 that pool's
// backing ArrayBuffer can itself be a SharedArrayBuffer, which
// @vercel/blob's internal fetch() call then rejects outright regardless of
// how many times the bytes get copied. allocUnsafeSlow() is the one Buffer
// API documented to always allocate its own dedicated, non-pooled
// ArrayBuffer, so it's used here as the final step right before anything
// gets handed to put().
function toSafeBuffer(input: Buffer): Buffer {
  const safe = Buffer.allocUnsafeSlow(input.length);
  input.copy(safe);
  return safe;
}

// Re-encodes at the image's existing dimensions (no resizing), strips EXIF,
// and picks the output format from actual pixel data (hasAlpha) rather than
// trusting the upload's declared MIME type — a mislabelled PNG-with-alpha
// saved as .jpg would otherwise get its transparency flattened to black.
async function compressImage(buffer: Buffer, mime: string): Promise<{ buffer: Buffer; ext: string; mime: string }> {
  if (mime === 'image/gif') {
    // Re-encoding through sharp collapses animated GIFs to a single frame.
    return { buffer, ext: 'gif', mime };
  }

  try {
    const image = sharp(buffer).rotate();
    const meta = await image.metadata();

    if (meta.hasAlpha) {
      const out = await image.png({ compressionLevel: 9, palette: true, quality: 85 }).toBuffer();
      return { buffer: out.length < buffer.length ? out : buffer, ext: 'png', mime: 'image/png' };
    }

    if (mime === 'image/webp') {
      const out = await image.webp({ quality: 80 }).toBuffer();
      return { buffer: out.length < buffer.length ? out : buffer, ext: 'webp', mime };
    }

    const out = await image.jpeg({ quality: 80, mozjpeg: true }).toBuffer();
    return { buffer: out.length < buffer.length ? out : buffer, ext: 'jpg', mime: 'image/jpeg' };
  } catch (e) {
    console.error('[upload] compression failed, using original:', (e as Error).message);
    const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
    return { buffer, ext, mime };
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const isImage = ALLOWED_IMAGE_MIME.has(file.type);
  const docExt = DOC_EXT_BY_MIME[file.type];

  if (!isImage && !docExt) {
    return NextResponse.json(
      { error: 'Unsupported file type — use JPEG/PNG/WebP/GIF for images or PDF/DOC/DOCX/XLS/XLSX/ZIP for documents' },
      { status: 400 }
    );
  }

  const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_DOC_SIZE;
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: `File too large (max ${isImage ? '4MB' : '10MB'})` },
      { status: 400 }
    );
  }

  try {
    const original = toSafeBuffer(Buffer.from(await file.arrayBuffer()));

    let finalBuffer: Buffer;
    let ext: string;
    let mime: string;
    if (isImage) {
      ({ buffer: finalBuffer, ext, mime } = await compressImage(original, file.type));
    } else {
      finalBuffer = original;
      ext = docExt;
      mime = file.type;
    }

    const blob = await put(`admin-uploads/${randomUUID()}.${ext}`, toSafeBuffer(finalBuffer), {
      access: 'public',
      contentType: mime,
    });

    return NextResponse.json({ url: blob.url });
  } catch (e) {
    console.error('[upload] failed:', e);
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 });
  }
}
