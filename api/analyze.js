// Tipo — analisi dello stile con Gemini (Google AI Studio, piano gratuito)
// Variabili d'ambiente: GEMINI_API_KEY (obbligatoria), GEMINI_MODEL (facoltativa)

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

function buildPrompt({ desc, budget, size, condition, hasImages }) {
  return `Sei lo stylist dell'app "Tipo". L'utente descrive uno stile che vuole ottenere${hasImages ? ' e allega foto di riferimento' : ''}.
Descrizione: """${String(desc || '').slice(0, 1500)}"""
Budget totale indicativo: ${budget || 'non indicato'} euro. Taglie: ${size || 'non indicate'}. Preferenza: ${condition || 'entrambi'} (nuovo/usato).

Rispondi SOLO con un oggetto JSON, in italiano, con questa forma:
{"styleName": "nome evocativo dello stile, 2-4 parole", "description": "due frasi su cosa lo caratterizza", "palette": ["#hex", 5 colori], "pieces": [{"name": "nome del capo", "category": "giacca|pantaloni|scarpe|maglia|accessorio", "why": "una frase sul perché funziona", "query": "parole chiave di ricerca per negozi online italiani (taglio, materiale, colore, uomo/donna)", "ebay": "parole chiave brevi per eBay, 3-5 parole, anche brand adatti al budget", "vinted": "parole chiave per Vinted", "photo": "3-5 parole IN INGLESE per trovare una foto stock del solo capo, molto descrittive (es. black leather biker jacket)"}], "tip": "un consiglio di stile breve e concreto"}
Da 4 a 6 capi, i più importanti per ottenere il look. Niente prezzi inventati.`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(503).json({ error: 'missing_key', message: 'Manca GEMINI_API_KEY nelle impostazioni di Vercel.' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const images = Array.isArray(body.images) ? body.images.slice(0, 3) : [];

  const parts = [{ text: buildPrompt({ ...body, hasImages: images.length > 0 }) }];
  for (const img of images) {
    const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(img || '');
    if (m) parts.push({ inline_data: { mime_type: m[1], data: m[2] } });
  }

  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.7 }
      })
    });
    const data = await r.json();
    if (!r.ok) {
      const status = r.status === 429 ? 429 : 502;
      return res.status(status).json({ error: status === 429 ? 'rate_limited' : 'ai_error', message: data?.error?.message || 'Errore del modello' });
    }
    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
    let out;
    try { out = JSON.parse(text); }
    catch { const m = text.match(/\{[\s\S]*\}/); out = m ? JSON.parse(m[0]) : null; }
    if (!out || !Array.isArray(out.pieces)) return res.status(502).json({ error: 'bad_output' });
    out.pieces = out.pieces.slice(0, 6);
    return res.status(200).json(out);
  } catch (e) {
    return res.status(502).json({ error: 'ai_error', message: String(e?.message || e) });
  }
}
