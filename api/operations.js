import { rejectForbiddenOrigin, setJsonHeaders } from '../lib/cors.js';
import { getOperations } from '../lib/content.js';
import { defaultOperations } from '../lib/defaultData.js';

export default async function handler(req, res) {
  setJsonHeaders(res);
  if (rejectForbiddenOrigin(req, res)) return;

  try {
    let ops = await getOperations(true);
    if (!ops.length) ops = defaultOperations();
    const payload = ops.map((op) => ({
      id: Number(op.id ?? 0),
      region: op.region,
      name: op.name,
      description: op.description,
    }));
    res.status(200).json({ operations: payload });
  } catch (e) {
    console.error('[MOD operations]', e);
    res.status(500).json({ error: 'Unable to load operations.' });
  }
}
