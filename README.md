# Tipo — prototipo

Descrivi uno stile (o carica foto di riferimento): Tipo ti dice il tuo "tipo" e ti mostra i capi da cercare, con foto reali da eBay (nuovo e usato) e ricerche pronte su Zalando, ASOS, Google Shopping e Vinted.

## Cosa c'è nella cartella

- `index.html` — il sito
- `api/analyze.js` — analisi dello stile con Gemini (Google)
- `api/search.js` — prodotti con foto dall'API ufficiale di eBay
- `package.json` — impostazioni del progetto

Senza chiavi il sito funziona lo stesso in modalità esempio.

## Guida passo passo (gratis, niente terminale)

### 1. Metti il progetto su GitHub
1. Crea un account su github.com.
2. In alto a destra: **+ → New repository**. Nome: `tipo`. Lascialo **Private**. Clicca **Create repository**.
3. Nella pagina che si apre clicca **uploading an existing file**.
4. Trascina dentro `index.html`, `package.json`, `README.md` e la cartella `api` intera.
5. In fondo clicca **Commit changes**.

### 2. Prendi la chiave Gemini (analisi AI)
1. Vai su aistudio.google.com e accedi con il tuo account Google.
2. Clicca **Get API key → Create API key**.
3. Copia la chiave e tienila da parte. È gratuita entro i limiti del piano free.

Nota: sul piano gratuito Google può usare i dati inviati per migliorare i suoi servizi. Per un prototipo va bene; non caricare foto private di altre persone.

### 3. Prendi le chiavi eBay (foto dei prodotti)
1. Vai su developer.ebay.com e clicca **Join**. Iscriviti con un account eBay (anche quello personale).
2. Vai su **Application Keys** e crea un'applicazione (nome: `tipo`).
3. Nella colonna **Production** crea il keyset.
4. eBay ti chiede delle notifiche "Marketplace Account Deletion": scegli l'esenzione, perché Tipo **non salva** dati degli utenti eBay.
5. Copia **App ID (Client ID)** e **Cert ID (Client Secret)**.

### 4. Pubblica su Vercel
1. Vai su vercel.com e registrati con **Continue with GitHub** (piano **Hobby**, gratuito).
2. **Add New → Project** e importa il repository `tipo`.
3. Prima di pubblicare apri **Environment Variables** e aggiungi:
   - `GEMINI_API_KEY` → la chiave di Google
   - `EBAY_CLIENT_ID` → App ID di eBay
   - `EBAY_CLIENT_SECRET` → Cert ID di eBay
4. Clicca **Deploy**. Dopo un minuto hai un indirizzo tipo `tipo-xxxx.vercel.app`.

### 5. Prova
Apri il sito, scrivi uno stile e premi **Trova il mio tipo**.

## Se qualcosa non va

- **"Analisi AI non attiva"**: manca `GEMINI_API_KEY`, oppure l'hai aggiunta dopo il deploy. Su Vercel: **Deployments → … → Redeploy**.
- **Errore sul modello Gemini**: aggiungi la variabile `GEMINI_MODEL` con un modello del piano gratuito che vedi su AI Studio (es. `gemini-3.5-flash-lite`) e rifai il deploy.
- **"Foto prodotti non attive"**: mancano o sono sbagliate le chiavi eBay (usa quelle **Production**, non Sandbox).
- **Modifiche al sito**: carichi il file nuovo su GitHub e Vercel ripubblica da solo.

## Da sapere

- Il piano Hobby di Vercel è per uso non commerciale: quando Tipo diventa un'attività, si passa al piano a pagamento.
- Per guadagnare dai click su eBay puoi iscriverti a eBay Partner Network; poi si aggiunge il tuo ID nella ricerca.
- Vinted non ha un'API pubblica: per l'usato ci sono le foto eBay e il link di ricerca a Vinted.
