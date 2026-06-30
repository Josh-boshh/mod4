import { rejectForbiddenOrigin, setJsonHeaders } from '../lib/cors.js';
import { getHeroSlides, getPressItems, getLeadership, getSetting } from '../lib/content.js';

export default async function handler(req, res) {
  setJsonHeaders(res);
  if (rejectForbiddenOrigin(req, res)) return;

  try {
    const slides = await getHeroSlides(true);
    const pressItems = await getPressItems(true);
    const leadership = await getLeadership(true);
    const settings = {
      hero_eyebrow: await getSetting('hero_eyebrow', 'Federal Republic of Nigeria'),
      hero_headline: await getSetting('hero_headline', 'Defending the sovereignty of Nigeria.'),
      hero_body: await getSetting('hero_body', 'The Federal Ministry of Defence — the apex policy authority overseeing the Nigerian Armed Forces — provides strategic leadership for a modern, professional, mission-ready military in the service of more than 220 million citizens of the Federal Republic.'),
      last_reviewed: await getSetting('last_reviewed', 'June 2026'),
      ministry_name: await getSetting('ministry_name', 'Federal Ministry of Defence'),
      country: await getSetting('country', 'Federal Republic of Nigeria'),
    };

    const leadershipMap = { minister: {}, ministerOfState: {}, permSec: {} };
    for (const item of leadership) {
      if (item.position_key in leadershipMap) {
        leadershipMap[item.position_key] = {
          title: item.title,
          name: item.name,
          bio: item.bio,
          photo: item.photo_url,
          profile_link: item.profile_link,
        };
      }
    }

    const payload = {
      hero: {
        eyebrow: settings.hero_eyebrow,
        headline: settings.hero_headline,
        body: settings.hero_body,
      },
      slides: slides.map((slide) => ({
        img: slide.image_url,
        alt: slide.alt_text,
        role: slide.role_text,
        name: slide.caption_text,
      })),
      press: pressItems.map((item) => {
        let date = item.published_at || '';
        if (date) {
          const ts = Date.parse(date);
          if (!Number.isNaN(ts)) {
            date = new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
          }
        }
        return {
          title: item.title,
          excerpt: item.excerpt,
          body: item.body || '',
          category: item.category,
          date,
          img: item.image_url,
          url: 'press-release.html?slug=' + encodeURIComponent(item.slug),
          slug: item.slug,
        };
      }),
      leadership: leadershipMap,
      settings,
    };

    res.status(200).json(payload);
  } catch (e) {
    console.error('[MOD content]', e);
    res.status(500).json({ error: 'Unable to load content.' });
  }
}
