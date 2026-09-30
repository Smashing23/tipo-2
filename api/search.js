// Tipo — ricerca prodotti con foto.
// 1) Se c'è SERPAPI_API_KEY usa Google Shopping (foto da ASOS, Zalando e tutti i negozi).
// 2) Altrimenti, se ci sono EBAY_CLIENT_ID e EBAY_CLIENT_SECRET, usa eBay.

let cached = { token: null, exp: 0 };

async function getEbayToken() {
  if (cached.token && Date.now() < cached.exp - 60_000) return cached.token;
  const basic = Buffer.from(`${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`).toString('base64');
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

async function searchGoogleShopping(q, condition) {
  const query = condition === 'usato' ? `${q} usato` : q;
  const params = new URLSearchParams({
    engine: 'google_shopping', q: query, gl: 'it', hl: 'it', google_domain: 'google.it',
    api_key: process.env.SERPAPI_API_KEY
  });
  const r = await fetch(`https://serpapi.com/search.json?${params}`);
  const data = await r.json();
  if (data.error && /any results/i.test(data.error)) return [];
  if (!r.ok || data.error) throw new Error(data.error || 'Errore Google Shopping');
  const list = [
    ...(data.shopping_results || []),
    ...(data.inline_shopping_results || []),
    ...((data.categorized_shopping_results || []).flatMap(c => c.shopping_results || []))
  ];
  return list.slice(0, 8).map(it => ({
    title: it.title,
    image: it.thumbnail || it.serpapi_thumbnail || (Array.isArray(it.thumbnails) ? it.thumbnails[0] : null) || null,
    price: it.price || (it.extracted_price ? `${it.extracted_price} €` : null),
    url: it.product_link || it.link || (it.product_id ? `https://www.google.it/shopping/product/${it.product_id}` : null),
    source: it.source || 'Negozio'
  }));
}

async function searchEbay(q, condition) {
  const params = new URLSearchParams({ q, limit: '4' });
  if (condition === 'nuovo') params.set('filter', 'conditions:{NEW}');
  if (condition === 'usato') params.set('filter', 'conditions:{USED}');
  const token = await getEbayToken();
  const r = await fetch(`https://api.ebay.com/buy/browse/v1/item_summary/search?${params}`, {
    headers: { Authorization: `Bearer ${token}`, 'X-EBAY-C-MARKETPLACE-ID': 'EBAY_IT', 'Accept-Language': 'it-IT' }
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.errors?.[0]?.message || 'Errore eBay');
  return (data.itemSummaries || []).map(it => ({
    title: it.title,
    image: it.image?.imageUrl || it.thumbnailImages?.[0]?.imageUrl || null,
    price: it.price ? `${Number(it.price.value).toLocaleString('it-IT', { minimumFractionDigits: 2 })} ${it.price.currency === 'EUR' ? '€' : it.price.currency}` : null,
    url: it.itemAffiliateWebUrl || it.itemWebUrl,
    source: `eBay · ${it.condition || ''}`.trim()
  }));
}

export default async function handler(req, res) {
  const hasSerp = !!process.env.SERPAPI_API_KEY;
  const hasEbay = !!(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET);
  if (!hasSerp && !hasEbay) {
    return res.status(503).json({ error: 'missing_key', message: 'Manca la chiave per le foto dei prodotti nelle impostazioni di Vercel.' });
  }
  const q = String(req.query.q || '').slice(0, 120).trim();
  const condition = String(req.query.condition || 'entrambi');
  if (!q) return res.status(400).json({ error: 'missing_query' });

  try {
    const raw = hasSerp ? await searchGoogleShopping(q, condition) : await searchEbay(q, condition);
    const items = raw.filter(it => it.image && it.url).slice(0, 4);
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).json({ items });
  } catch (e) {
    return res.status(502).json({ error: 'search_error', message: String(e?.message || e) });
  }
}
