# Het Clausement

Puntensysteem/app voor VCH. Dit is de Next.js + Supabase-opvolger van de
Claude-artifact-versie (`clausement.jsx`) — zelfde functionaliteit, met een
echte database, echte trainersauthenticatie en rijbeveiliging (RLS) in
plaats van gedeelde client-side opslag.

## Architectuur

- **Frontend**: Next.js 15 (App Router, client components) — draait volledig
  in de browser, praat rechtstreeks met Supabase via de anon key.
- **Backend/database**: Supabase (Postgres). De puntenlogica (record-
  detectie, cyclusbonus max. 1x per doel-toewijzing, het logboek) draait
  in server-side Postgres-functies (`supabase/migrations/0001_init.sql`),
  niet in de client — dat was het beveiligingslek in de artifact-versie.
- **Rollen**: speelsters loggen in door hun naam te kiezen (lichte,
  anonieme Supabase-sessie — geen wachtwoorddrempel). De trainer heeft een
  echt, serverside geverifieerd account (Supabase Auth, e-mail/wachtwoord).
  Alleen accounts waarvan het e-mailadres in de `trainers`-tabel staat
  krijgen trainersrechten (periode afronden, Beheer, logboek).
- **Hosting**: Vercel of Netlify (statische Next.js-export/SSR, geen eigen
  server nodig).

## Eenmalige Supabase-setup

1. Maak een nieuw project op [supabase.com](https://supabase.com).
2. Voer de migraties uit (SQL-editor in het Supabase-dashboard, of via de
   Supabase CLI: `supabase db push`):
   - `supabase/migrations/0001_init.sql`
   - `supabase/migrations/0002_seed_exercises.sql`
3. Maak het trainersaccount aan: Supabase-dashboard → Authentication →
   Users → "Add user" (e-mail + wachtwoord, "Auto confirm" aanvinken).
4. Geef dat account trainersrechten door het e-mailadres toe te voegen aan
   de allowlist-tabel (SQL-editor):
   ```sql
   insert into trainers (email) values ('trainer@voorbeeld.nl');
   ```
5. Kopieer de Project URL en de `anon` public key (Project instellingen →
   API) naar `.env.local` (zie `.env.example`).

## Lokaal draaien

```bash
npm install
cp .env.example .env.local   # vul de Supabase-waarden in
npm run dev
```

## Bestaande data migreren (vanuit de artifact-versie)

De oude app heeft een backup-export (Beheer → Backup → "Kopieer backup" of
"Download bestand"), een JSON-bestand met alle spelers, trainingen, records,
doelen en instellingen. Zet dat om naar de nieuwe database met:

```bash
SUPABASE_URL=https://xxxx.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # Project instellingen -> API -> service_role
node scripts/import-legacy-backup.mjs pad/naar/clausement-backup.json
```

Dit script gebruikt de service-role key (omzeilt RLS) en is bedoeld voor een
**eenmalige** import op een verse database — geen doorlopend
herstelmechanisme. De trainer-pincode uit het artifact wordt niet
meegenomen; maak in plaats daarvan een echt trainersaccount aan (zie boven).

Voor lopend gebruik vervangen de automatische Supabase-databasebackups het
"noodherstel"-scenario van het artifact. Trainers kunnen daarnaast op elk
moment handmatig een JSON-export downloaden via Beheer → Backup exporteren.

## Huisstijl

- Kleuren: blauw `#2c2b7c`, geel `#ffd400`, zwart `#151515`, lichtblauw
  `#75aadb` (`lib/constants.js`).
- Lettertype: CeraCY (Black/Medium/Regular) is niet vrij als webfont
  beschikbaar; de app valt terug op Archivo (zelfde drie gewichten). Zodra
  de echte CeraCY-bestanden zijn aangeleverd: voeg ze toe aan `public/fonts/`,
  vervang de `@font-face`/Google Fonts-import in `lib/constants.js`
  (`FONT_IMPORT`) en wijs de `cy-black`/`cy-medium`/`cy-regular`
  font-families in `components/shared.js` naar CeraCY.
- Logo: `public/logo.png` bevat op dit moment hetzelfde placeholder-logo als
  de artifact-versie. Vervang dat bestand door het echte VCH-logo zodra
  aangeleverd (zelfde bestandsnaam, dan hoeft er verder niets te wijzigen).

## Wat bewust anders is dan de artifact-versie

- De pincode-gebaseerde trainerslogica is vervangen door een echt account
  (zie "Rollen" hierboven) — dat was de kernreden voor deze migratie.
- Het hele Beheer-tabblad (spelers toevoegen/verwijderen, eigen oefeningen,
  teamdoel, logboek, periode afronden, backup) is nu trainer-only, met
  échte rolcontrole via Postgres RLS — in de artifact-versie kon iedereen
  met de link deze acties client-side uitvoeren.
- Record-detectie en de cyclusbonus worden serverside herberekend bij elke
  opslag (Postgres-functie `submit_training`), zodat een gemanipuleerde
  client geen valse records of dubbele bonuspunten kan wegschrijven.
- Live synchronisatie tussen toestellen loopt via Supabase Realtime in
  plaats van periodiek herladen van gedeelde artifact-opslag.

## Deployen

Voeg dit project toe aan Vercel of Netlify, koppel de GitHub-repo, en zet
`NEXT_PUBLIC_SUPABASE_URL` en `NEXT_PUBLIC_SUPABASE_ANON_KEY` als
environment variables in het platform. Build command: `npm run build`,
output: standaard Next.js-instellingen (geen aanpassingen nodig).
