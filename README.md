# Magazzino · Lorenzo Pazzaglia Parfum

Applicazione web interna per gestire il magazzino di profumi e materiali.
Stack: **React (Vite) + Supabase (database PostgreSQL + login) + Vercel (hosting)** — tutto gratuito per un team di 10 persone.

## Cosa fa
- Login personale (email + password), ruoli **admin** e **operatore**
- Profumi con varianti 28 / 50 / 75 ml (ogni capacità = SKU con giacenza propria) e materiali (scatole, tappi, campioni, altro)
- Carichi e scarichi con causale, data, note, utente e orario registrati in automatico
- Giacenza aggiornata dal database; gli scarichi sotto zero vengono rifiutati
- Dashboard (SKU, sotto scorta, ultimi movimenti, grafico 30 giorni), storico filtrabile, export CSV (si apre con Excel)
- Scansione barcode/QR con la fotocamera del telefono (codice = codice SKU / codice materiale)
- Evidenza rossa e badge "sotto scorta" quando giacenza < soglia minima

## Struttura cartelle
```
magazzino-lpp/
├─ supabase/schema.sql      ← tabelle, trigger, viste, permessi (da eseguire su Supabase)
├─ src/
│  ├─ main.jsx · App.jsx · styles.css
│  ├─ lib/ (supabase.js, utils.js)
│  ├─ components/Scanner.jsx
│  └─ pages/ (Login, Dashboard, Articoli, Movimenti, Storico, Utenti)
├─ index.html · package.json · vite.config.js · .env.example
```

## Database (riassunto)
`profili` (utente, nome, ruolo) · `profumi` (modello) → `varianti` (SKU, capacità, quantità, ubicazione, soglia, note) ·
`materiali` (codice, descrizione, categoria, quantità, ubicazione, soglia, note) · `movimenti` (articolo, tipo, quantità, data, causale, note, utente, creato_il).
Viste: `v_articoli`, `v_movimenti`. Lo storico non si può modificare né cancellare; la quantità si cambia solo con i movimenti.

## Logo e immagini dei profumi
- **Logo**: salva il file come `public/logo.png` (sfondo trasparente, meglio se chiaro su fondo scuro). Se manca, compare solo il nome del marchio.
- **Foto flaconi**: copia i file in `public/prodotti/` (es. `public/prodotti/pax.png`), poi in Articoli → Modifica del profumo scrivi nel campo Immagine `/prodotti/pax.png`. Va bene anche il link a un'immagine online.
- **Colori**: sono tutti nelle prime righe di `src/styles.css`.
- **Se avevi già installato la versione precedente**: esegui UNA volta `supabase/migrazione_immagini.sql` nel SQL Editor di Supabase.

## 1. Configurare Supabase (10 minuti)
1. Crea un account su https://supabase.com → **New project** (scegli regione EU, annota la password del database).
2. **SQL Editor → New query**: incolla tutto `supabase/schema.sql` → **Run**. Deve finire senza errori.
3. **Authentication → Providers → Email**: lascia attivo l'accesso con email, **disattiva "Allow new users to sign up"** (così solo tu crei gli utenti). Per comodità disattiva anche "Confirm email".
4. **Project Settings → API**: copia *Project URL* e *anon public key*.

## 2. Creare gli utenti
- **Authentication → Users → Add user → Create new user**: inserisci email e password, spunta *Auto Confirm User*. Ripeti per tutti e 10.
- Ogni utente nasce come **operatore** (il nome è la parte prima della @).
- Il **primo admin**: nel SQL Editor esegui (con la tua email):
  ```sql
  update profili set ruolo = 'admin' where id = (select id from auth.users where email = 'tua@email.it');
  ```
- Poi, dalla pagina **Utenti** dell'app, l'admin può rinominare le persone e promuovere altri admin.

## 3. Avvio in locale
```bash
npm install
cp .env.example .env     # inserisci URL e anon key di Supabase
npm run dev              # http://localhost:5173
```
(Serve Node.js 18+ da https://nodejs.org.)

## 4. Deploy gratuito su Vercel
1. Metti la cartella su un repository GitHub **privato**.
2. https://vercel.com → **Add New → Project** → importa il repository (framework: Vite, rilevato da solo).
3. In **Environment Variables** aggiungi `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
4. **Deploy**. Ottieni un indirizzo `https://…vercel.app` (HTTPS, necessario per la fotocamera). Su telefono: *Aggiungi a schermata Home*.

## 5. Inserire i primi articoli (inventario da carta)
1. Accedi come admin → **Articoli → Nuovo articolo**.
2. Profumo: nome, codice SKU, capacità, ubicazione, soglia minima e **giacenza iniziale** (viene registrata come carico "inventario"). Per un'altra capacità dello stesso profumo inserisci lo stesso nome con un nuovo SKU: il profumo viene riusato.
3. Materiali: scegli "Materiale", categoria (scatola, tappo, campione, altro), codice, descrizione, giacenza.
4. Consiglio: fai l'inventario scaffale per scaffale, usando il campo *Ubicazione*, e imposta la soglia minima subito.
5. Codici a barre: stampa etichette (QR o Code128) con il **codice SKU**; la scansione cerca quel codice.

## Note importanti
- **Backup**: il piano gratuito di Supabase non include backup automatici. Esporta ogni mese giacenze e movimenti in CSV (pulsanti "Esporta CSV").
- Un progetto Supabase gratuito va in pausa dopo ~7 giorni senza attività: con uso quotidiano non succede; se capita, riattivalo dalla dashboard.
- La *anon key* è pubblica per natura: la sicurezza è garantita dalle regole del database (RLS) nello schema.
