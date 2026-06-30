import { rejectForbiddenOrigin, setJsonHeaders } from '../lib/cors.js';
import { getGalleryImages } from '../lib/content.js';
import { defaultGalleryImages } from '../lib/defaultData.js';

export default async function handler(req, res) {
  setJsonHeaders(res);
  if (rejectForbiddenOrigin(req, res)) return;

  try {
    let images = await getGalleryImages(true);
    if (!images.length) images = defaultGalleryImages();

    const payload = images.map((img) => {
      let dateFormatted = '';
      if (img.event_date) {
        const ts = Date.parse(img.event_date);
        if (!Number.isNaN(ts)) {
          dateFormatted = new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        }
      }
      return {
        id: Number(img.id ?? 0),
        image_url: img.image_url,
        alt_text: img.alt_text,
        caption: img.caption,
        event_date: dateFormatted,
        category: img.category,
      };
    });

    res.status(200).json({ images: payload });
  } catch (e) {
    console.error('[MOD gallery]', e);
    res.status(500).json({ error: 'Unable to load gallery images.' });
  }
}
