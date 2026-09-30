// Tipo — passa le miniature dei prodotti dal nostro dominio (solo host di immagini fidati)
const ALLOWED = [/\.gstatic\.com$/, /^images\.pexels\.com$/, /^i\.ebayimg\.com$/];

export default async function handler(req, res) {
  let u;
  try { u = new URL(String(req.query.u || '')); } catch { return res.status(400).end(); }
  if (u.protocol !== 'https:' || !ALLOWED.some(r => r.test(u.hostname))) return res.status(400).end();
  try {
    const r = await fetch(u.toString());
    const type = r.headers.get('content-type') || '';
    if (!r.ok || !type.startsWith('image/')) return res.status(502).end();
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 2_000_000) return res.status(413).end();
    res.setHeader('Content-Type', type);
    res.setHeader('Cache-Control', 's-maxage=604800, stale-while-revalidate=2592000');
    return res.status(200).send(buf);
  } catch {
    return res.status(502).end();
  }
}
