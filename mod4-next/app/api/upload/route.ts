import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import sharp from 'sharp';
import { createClient } from '@/lib/supabase/server';

// Vercel serverless functions cap request bodies well under 5MB — stay clear of that.
const MAX_SIZE = 4 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

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
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json({ error: 'Unsupported file type — use JPEG, PNG, WebP or GIF' }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 4MB)' }, { status: 400 });
  }

  try {
    const original = Buffer.from(await file.arrayBuffer());
    const { buffer, ext, mime } = await compressImage(original, file.type);

    const blob = await put(`admin-uploads/${randomUUID()}.${ext}`, buffer, {
      access: 'public',
      contentType: mime,
    });

    return NextResponse.json({ url: blob.url });
  } catch (e) {
    console.error('[upload] failed:', e);
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 });
  }
}
