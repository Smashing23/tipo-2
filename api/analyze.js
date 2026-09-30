// Tipo — style analysis with Gemini (Google AI Studio, free tier)
// Environment variables: GEMINI_API_KEY (required), GEMINI_MODEL (optional)

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

function buildPrompt({ desc, budget, size, condition, hasImages }) {
  const cond = { nuovo: 'new only', usato: 'second-hand only' }[condition] || 'new and second-hand';
  return `You are the stylist of the app "Tipo". The user describes a style they want to achieve${hasImages ? ' and attaches reference photos' : ''}.
Description: """${String(desc || '').slice(0, 1500)}"""
Indicative total budget: ${budget || 'not given'} euros. Sizes: ${size || 'not given'}. Preference: ${cond}.

Reply ONLY with a JSON object in this shape. Write styleName, description, name, why and tip in ENGLISH. Write query, ebay and vinted in ITALIAN, because they are used to search Italian online stores:
{"styleName": "evocative style name, 2-4 words", "description": "two sentences on what defines it", "palette": ["#hex", 5 colours], "pieces": [{"name": "name of the piece", "category": "giacca|pantaloni|scarpe|maglia|accessorio", "why": "one sentence on why it works", "query": "Italian search keywords for Italian online stores (cut, material, colour, uomo/donna)", "ebay": "short Italian keywords for eBay, 3-5 words, brands that fit the budget are fine", "vinted": "Italian keywords for Vinted", "photo": "3-5 English words to find a stock photo of the piece alone, very descriptive (e.g. black leather biker jacket)"}], "tip": "a short, concrete styling tip"}
Keep category exactly one of the Italian values listed. 4 to 6 pieces, the most important ones to get the look. No invented prices.
Keyword rule: these are FASHION pieces, not technical or sports gear. Never use words like "biker", "moto", "motociclista", "rider" in the Italian keywords (they bring up motorcycle jackets with armour): for a rock-style leather jacket write for example "giubbotto pelle nera uomo chiodo slim". Always add "uomo" or "donna" when the context makes it clear.`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(503).json({ error: 'missing_key', message: 'GEMINI_API_KEY is missing in the Vercel settings.' });

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
      return res.status(status).json({ error: status === 429 ? 'rate_limited' : 'ai_error', message: data?.error?.message || 'Model error' });
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
