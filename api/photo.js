// Tipo — foto esemplificativa del capo da Pexels (gratis, licenza libera per uso commerciale)
// Variabile d'ambiente: PEXELS_API_KEY

export default async function handler(req, res) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return res.status(503).json({ error: 'missing_key' });
  const q = String(req.query.q || '').slice(0, 100).trim();
  if (!q) return res.status(400).json({ error: 'missing_query' });

  try {
    const params = new URLSearchParams({ query: q, per_page: '1', orientation: 'portrait' });
    const r = await fetch(`https://api.pexels.com/v1/search?${params}`, { headers: { Authorization: key } });
    const data = await r.json();
    if (!r.ok) return res.status(502).json({ error: 'photo_error' });
    const p = data.photos?.[0];
    if (!p) return res.status(404).json({ error: 'no_photo' });
    res.setHeader('Cache-Control', 's-maxage=604800, stale-while-revalidate=2592000');
    return res.status(200).json({
      image: p.src?.portrait || p.src?.large || p.src?.medium,
      photographer: p.photographer,
      pageUrl: p.url
    });
  } catch (e) {
    return res.status(502).json({ error: 'photo_error' });
  }
}
