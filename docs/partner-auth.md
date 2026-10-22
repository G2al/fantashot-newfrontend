# Accesso partner tramite token

Il backend partner crea la sessione con `POST /api/v1/session` e apre la URL restituita. Il frontend riceve esclusivamente il token utente; non contiene credenziali tenant, chiamate a `/session`, `/session/exchange` o refresh del token.

`AuthProvider` blocca i contenuti e i redirect durante l’inizializzazione. Lo store cattura il parametro con `URLSearchParams`, lo rimuove con `history.replaceState` preservando percorso, altri parametri e hash, quindi verifica `getMe(token)`. Il token ricevuto prevale sempre sulla sessione precedente. La generazione dello store impedisce a verifiche, aggiornamenti profilo e logout precedenti di sovrascrivere la nuova sessione. La verifica sopravvive ai rimontaggi senza essere ripetuta.

Al successo, `setAuth({...user, wallets}, token, false)` salva la sessione partner in sessionStorage e la navigazione esistente apre `/dashboard`. Il client API usa `Authorization: Bearer`, senza dipendere dai cookie di terze parti. Il reload verifica nuovamente `/me` prima di mostrare dati. Un 401 relativo al token corrente cancella l’autenticazione e invita a riaprire l’app partner; gli errori di rete/server terminano con un messaggio senza retry automatici.

La durata del token è decisa dal backend (60 minuti per default). La scadenza locale di 30 giorni del Ricordami riguarda soltanto la persistenza e non viene rinnovata al reload. La registrazione conserva il comportamento esistente.

Lo storage può essere bloccato o non scrivibile: le eccezioni sono gestite e l’accesso continua in memoria. Un avviso esplicita che il reload perde la sessione e richiede una nuova apertura dall’app partner oppure un nuovo login. Logout usa `POST /logout` e cancella lo stato frontend anche se la revoca remota fallisce; in quel caso la revoca sul backend non è garantita.

## Hosting e integrazione ancora necessari

- Impostare `NEXT_PUBLIC_API_BASE_URL=https://api.fantashot.live/api/v1` nell’ambiente di **build** produzione. `.env.production` contiene questo valore; verificare che variabili del provider o file locali non lo sovrascrivano. Gli URL locali di sviluppo sono invariati.
- Il controllo HTTP pubblico eseguito il 20 ottobre 2026 ha restituito: preflight `OPTIONS /api/v1/me` e `/api/v1/logout` 204, `Access-Control-Allow-Origin: https://fantashot.live`, rispettivamente metodi GET/POST e header `authorization,content-type` consentiti; `/me` senza token restituisce 401 con lo stesso origin consentito. Per altri domini frontend occorre far autorizzare il loro origin effettivo nel backend: l’origin della richiesta API è quello del frontend, non quello della pagina partner.
- La risposta finale pubblica di `https://fantashot.live` (attualmente `/login`) non esponeva CSP o X-Frame-Options. Questo non verifica tutte le route né eventuali regole del proxy dopo il deploy. Nessuna protezione iframe è stata modificata. Configurare `frame-ancestors` esclusivamente con gli origin partner concordati, quando disponibili, e verificare eventuali X-Frame-Options incompatibili. Gli origin partner non sono stati forniti.
- Verificare il sandbox dell’iframe e le impostazioni WebView: devono permettere l’esecuzione dell’app e un origin compatibile con CORS/storage/history. Un frame con origin opaco (`null`) richiede una revisione della configurazione host, non l’apertura indiscriminata di CORS.
- La richiesta iniziale contiene inevitabilmente il token nella URL: hosting, reverse proxy, CDN, analytics e sistemi di raccolta errori devono escludere/redigere quel parametro e le launch URL. Il frontend non li registra; imposta `no-referrer` sia nel documento sia nelle chiamate API. La pulizia client non può cancellare log già prodotti dall’infrastruttura.
- **Manca il test conclusivo nell’iframe/WebView reale del partner**, non disponibile in questo task. Servono ambiente partner e sessioni reali per verificare accesso, scadenza, revoca backend dopo logout e policy browser effettive. Nessun backend è stato modificato.

## Controlli riproducibili

`node --test tests/auth-store.test.mjs` usa il vero store e il client API con browser/storage e risposte HTTP simulate: cattura e pulizia URL, Sanctum con `|`, inizializzazione ripetuta, precedenza B su A, risposte tardive, logout durante verifica, 401/500/rete, storage bloccato/non scrivibile, reload e Ricordami.

`tests/auth-browser.test.mjs` usa Chrome tramite Playwright con risposte API **simulate**. Verifica dashboard, URL ripulita durante attesa, singola `/me`, assenza di token in console/referrer, reload, logout con revoca simulata, errori, cambio utente, login email/password, registrazione, scadenza attiva e storage bloccato. Non certifica il backend né l’iframe reale.

Per eseguirlo, avviare una build di produzione con l’API configurata sopra sulla porta 3100 (`NODE_ENV=production`, `PORT=3100`, `npm start`), rendere disponibile Playwright e lanciare:

```text
node --test tests/auth-browser.test.mjs
```

Se Playwright è installato fuori dal progetto, `PLAYWRIGHT_MODULE` può indicare il percorso assoluto del suo `index.mjs`; `AUTH_TEST_BASE_URL` permette una porta diversa. Nel task Playwright è stato installato soltanto nella directory temporanea, senza modificare dipendenze o lockfile. Sono stati controllati anche TypeScript, ESLint sui file toccati e build produzione; gli stati di errore e fallback sono stati ispezionati visivamente nel browser locale.
