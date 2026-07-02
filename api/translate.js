import { rejectForbiddenOrigin, setJsonHeaders } from '../lib/cors.js';

const ENDPOINT = 'https://api.cognitive.microsofttranslator.com/translate?api-version=3.0';

function getAzureConfig() {
  return {
    key: process.env.AZURE_TRANSLATE_KEY || '',
    region: process.env.AZURE_TRANSLATE_REGION || 'westeurope',
  };
}

function normalizeTexts(body) {
  if (!Array.isArray(body)) return [];
  return body
    .map((item) => (item && typeof item.Text === 'string' ? { Text: item.Text } : null))
    .filter(Boolean);
}

export default async function handler(req, res) {
  setJsonHeaders(res);
  if (rejectForbiddenOrigin(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const target = String(req.query.to || req.body?.to || 'en');
  const texts = normalizeTexts(req.body);

  if (!texts.length) {
    return res.status(400).json({ error: 'No text supplied.' });
  }

  const { key, region } = getAzureConfig();
  if (!key) {
    return res.status(503).json({ error: 'Translation is not configured.' });
  }

  try {
    const response = await fetch(`${ENDPOINT}&to=${encodeURIComponent(target)}`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Ocp-Apim-Subscription-Region': region,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(texts),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Azure HTTP ${response.status}: ${details}`);
    }

    const data = await response.json();
    return res.status(200).json(Array.isArray(data) ? data : []);
  } catch (error) {
    console.error('[MOD translate]', error);
    return res.status(502).json({ error: 'Unable to translate text.' });
  }
}