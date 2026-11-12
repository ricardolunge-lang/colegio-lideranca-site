const { put, list } = require('@vercel/blob');

const KEY = process.env.RESP_KEY || '';
const PATH = `briefing/respostas-${KEY}.json`;

async function load() {
  const { blobs } = await list({ prefix: PATH, limit: 1 });
  if (!blobs.length) return {};
  const r = await fetch(blobs[0].url + '?t=' + Date.now(), { cache: 'no-store' });
  return r.ok ? await r.json() : {};
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!KEY) return res.status(500).json({ error: 'not configured' });

  if (req.method === 'GET') {
    if (req.query.key !== KEY) return res.status(401).json({ error: 'unauthorized' });
    return res.status(200).json(await load());
  }

  if (req.method === 'POST') {
    const campos = req.body && req.body.campos;
    if (!campos || typeof campos !== 'object') return res.status(400).json({ error: 'bad request' });
    const clean = {};
    for (const [k, v] of Object.entries(campos).slice(0, 100)) {
      if (/^[a-z_]{1,40}$/.test(k) && typeof v === 'string') clean[k] = v.slice(0, 5000);
    }
    const atual = await load();
    const novo = { ...atual, ...clean, atualizadoEm: new Date().toISOString() };
    await put(PATH, JSON.stringify(novo), {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
    });
    return res.status(200).json({ ok: true });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'method not allowed' });
};
