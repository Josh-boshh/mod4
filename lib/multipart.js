import Busboy from 'busboy';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB — largest of the image (5MB) / doc (10MB) caps

// Streams a multipart/form-data request and collects text fields and
// uploaded files into memory (no disk buffering — fits Vercel's
// read-only, ephemeral filesystem). Mirrors PHP's $_POST + $_FILES.
export function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({
      headers: req.headers,
      limits: { fileSize: MAX_FILE_SIZE },
    });

    const fields = {};
    const files = {};
    const fileBuffers = new Map();

    busboy.on('field', (name, value) => {
      fields[name] = value;
    });

    busboy.on('file', (name, stream, info) => {
      const { filename, mimeType } = info;
      const chunks = [];
      let truncated = false;

      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('limit', () => {
        truncated = true;
      });
      stream.on('end', () => {
        if (!filename) return; // empty file input — no file selected
        fileBuffers.set(name, {
          filename,
          mimeType,
          buffer: Buffer.concat(chunks),
          truncated,
        });
      });
    });

    busboy.on('error', reject);
    busboy.on('close', () => {
      for (const [name, file] of fileBuffers) {
        if (file.truncated || file.buffer.length === 0) continue;
        files[name] = { filename: file.filename, mimeType: file.mimeType, buffer: file.buffer, size: file.buffer.length };
      }
      resolve({ fields, files });
    });

    req.pipe(busboy);
  });
}
