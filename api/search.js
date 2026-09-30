// Tipo — ricerca prodotti con foto tramite eBay Browse API (gratuita, uso autorizzato delle immagini)
// Variabili d'ambiente: EBAY_CLIENT_ID, EBAY_CLIENT_SECRET (chiavi "Production" dal programma sviluppatori eBay)

let cached = { token: null, exp: 0 };

async function getToken() {
  if (cached.token && Date.now() < cached.exp - 60_000) return cached.token;
  const id = process.env.EBAY_CLIENT_ID, secret = process.env.EBAY_CLIENT_SECRET;
  const basic = Buffer.from(`${id}:${secret}`).toString('base64');
  const r = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${basic}` },
    body: 'grant_type=client_credentials&scope=' + encodeURIComponent('https://api.ebay.com/oauth/api_scope')
  });
  const data = await r.json();
  if (!r.ok || !data.access_token) throw new Error(data.error_description || 'Token eBay non ottenuto');
  cached = { token: data.access_token, exp: Date.now() + (data.expires_in || 7200) * 1000 };
  return cached.token;
}

export default async function handler(req, res) {
  if (!process.env.EBAY_CLIENT_ID || !process.env.EBAY_CLIENT_SECRET) {
    return res.status(503).json({ error: 'missing_key', message: 'Mancano le chiavi eBay nelle impostazioni di Vercel.' });
  }
  const q = String(req.query.q || '').slice(0, 120).trim();
  const condition = String(req.query.condition || 'entrambi');
  if (!q) return res.status(400).json({ error: 'missing_query' });

  const params = new URLSearchParams({ q, limit: '4' });
  if (condition === 'nuovo') params.set('filter', 'conditions:{NEW}');
  if (condition === 'usato') params.set('filter', 'conditions:{USED}');

  try {
    const token = await getToken();
    const r = await fetch(`https://api.ebay.com/buy/browse/v1/item_summary/search?${params}`, {
      headers: { Authorization: `Bearer ${token}`, 'X-EBAY-C-MARKETPLACE-ID': 'EBAY_IT', 'Accept-Language': 'it-IT' }
    });
    const data = await r.json();
    if (!r.ok) return res.status(502).json({ error: 'ebay_error', message: data?.errors?.[0]?.message || 'Errore eBay' });
    const items = (data.itemSummaries || [])
      .map(it => ({
        title: it.title,
        image: it.image?.imageUrl || it.thumbnailImages?.[0]?.imageUrl || null,
        price: it.price ? `${Number(it.price.value).toLocaleString('it-IT', { minimumFractionDigits: 2 })} ${it.price.currency === 'EUR' ? '€' : it.price.currency}` : null,
        url: it.itemAffiliateWebUrl || it.itemWebUrl,
        condition: it.condition || null
      }))
      .filter(it => it.image && it.url);
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({ items });
  } catch (e) {
    return res.status(502).json({ error: 'ebay_error', message: String(e?.message || e) });
  }
}
