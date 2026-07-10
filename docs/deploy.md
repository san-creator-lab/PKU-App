# Hero Fuel live zetten — Supabase + Vercel (±15 min)

Dit is het enige handwerk dat de repo niet voor je kan doen: twee gratis
accounts en wat kopieer-plakwerk. Alles hieronder is voorbereid — de
database-SQL staat klaar als één plakbaar bestand en de Vercel-configuratie
(`vercel.json`) zit in de repo.

> **Kosten:** de gratis tiers van Supabase en Vercel zijn ruim voldoende
> voor een gezin. Let op: een gratis Supabase-project **pauzeert na ±7 dagen
> zonder gebruik**; bij dagelijks loggen gebeurt dat niet, en anders klik je
> in het dashboard op "Restore".

---

## Deel 1 — Supabase (database, accounts, realtime)

### Stap 1: project aanmaken

1. Ga naar [supabase.com](https://supabase.com) → **Start your project** →
   log in met GitHub.
2. **New project** → naam `hero-fuel`, regio **West EU (Frankfurt/Ireland)**,
   kies een sterk database-wachtwoord (bewaar het, maar de app gebruikt het
   niet). Wacht ±2 minuten tot het project klaar is.

### Stap 2: database inrichten (zonder CLI — aanbevolen)

1. Open in het dashboard **SQL Editor** → **New query**.
2. Plak de volledige inhoud van
   [`docs/setup/all-migrations.sql`](setup/all-migrations.sql) uit deze repo
   en klik **Run**.
3. Verwacht resultaat: `Success. No rows returned` (eventuele *NOTICE*s over
   storage policies zijn onschuldig — zie Troubleshooting).

<details>
<summary>Alternatief: met de Supabase CLI (voor wie lokaal ontwikkelt)</summary>

```bash
npx supabase login
npx supabase link --project-ref <jouw-project-ref>   # ref staat in de project-URL
npx supabase db push                                  # draait supabase/migrations/
```
</details>

### Stap 3: e-mailbevestiging uitzetten

De gezinsapparaten loggen in met e-mail + wachtwoord, zonder mailtjes:

1. **Authentication → Sign In / Providers → Email**
2. Zet **Confirm email** **UIT** → **Save**.

*(Sla je dit over, dan faalt aanmelden in de app met een duidelijke melding.)*

### Stap 4: keys kopiëren

1. **Project Settings → API**
2. Kopieer **Project URL** en de **anon public** key — die heb je zo nodig
   bij Vercel (en eventueel in je lokale `.env`).

De anon key is veilig om in de frontend te zitten: alle toegang wordt
afgedwongen door Row Level Security (zie `docs/rls-proof.md`).

---

## Deel 2 — Vercel (hosting + automatische deploys)

### Stap 5: project importeren

1. Ga naar [vercel.com](https://vercel.com) → log in met GitHub.
2. **Add New… → Project** → importeer `san-creator-lab/PKU-App`.
3. Framework wordt automatisch **Vite**; build/output staan al in
   `vercel.json` — niets aanpassen.

### Stap 6: environment variables (vóór de eerste deploy!)

Bij **Environment Variables** voeg je toe (uit stap 4):

| Naam | Waarde |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://<jouw-ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | de anon public key |

Klik daarna **Deploy**. (Deze variabelen worden tijdens de build in de app
gebakken — voeg je ze later toe, doe dan een **Redeploy**.)

### Stap 7: juiste branch

De app staat op branch `claude/hero-fuel-pku-app-kogjf6`. Kies één van:

- **Aanbevolen:** merge die branch naar `main` op GitHub (Compare & pull
  request → Merge) — Vercel deployt daarna elke push naar `main`
  automatisch; of
- Zet in Vercel **Settings → Git → Production Branch** op
  `claude/hero-fuel-pku-app-kogjf6`.

### Stap 8 (netjes): Site URL terugzetten in Supabase

**Authentication → URL Configuration → Site URL** = je Vercel-URL
(bijv. `https://hero-fuel.vercel.app`).

---

## Deel 3 — Gezin aansluiten (het leuke deel 🦸)

1. Open de Vercel-URL op **jouw telefoon** → *Nieuw team starten* → je
   krijgt de 6-cijferige **teamcode**.
2. Telefoon van je held: zelfde URL → *Join met teamcode* → rol **held** →
   eigen naam + e-mail + wachtwoord. Hij blijft daarna permanent ingelogd.
3. Tweede ouder: idem, rol **sidekick**.
4. Op elke telefoon: **Zet op beginscherm / Add to Home Screen** → de app
   opent voortaan fullscreen als echte app, met offline-ondersteuning.

### Controlelijstje

- [ ] Log iets op telefoon A → verschijnt binnen een seconde op telefoon B
- [ ] Scanner: fotografeer een etiket → waarde gevonden (of nette fallback)
- [ ] Vliegtuigmodus aan → loggen werkt → modus uit → alles gesynct
- [ ] Supabase dashboard → **Table Editor → food_entries** → je ziet de data

---

## Optioneel: OCR via Claude (Anthropic)

De standaard-scanner (Tesseract, op het toestel zelf) heeft geen keys nodig.
Wil je de nauwkeurigere Claude-variant, dan is de Supabase CLI nodig:

```bash
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
npx supabase functions deploy ocr-label
```

Zet daarna in Vercel `VITE_OCR_PROVIDER=anthropic` en redeploy.

---

## Troubleshooting

| Probleem | Oplossing |
| --- | --- |
| Aanmelden faalt met melding over e-mailbevestiging | Stap 3 vergeten: zet **Confirm email** uit |
| Build faalt op Vercel | Check of beide `VITE_…`-variabelen bestonden vóór de build; Node ≥ 20 (staat in `package.json` engines) |
| Realtime werkt niet (telefoon B ziet niks) | Dashboard → **Database → Publications**: `supabase_realtime` moet `food_entries`, `profiles`, `badges` bevatten (doet de SQL uit stap 2) |
| *NOTICE: storage policies skipped* bij stap 2 | Alleen relevant voor etiketfoto's. Voeg de drie policies toe via **Storage → label-photos → Policies**, of laat het — de app werkt gewoon door (foto wordt dan niet bewaard) |
| App opende eerder in demo-modus op dezelfde URL | Gewoon opnieuw aanmelden; demo-data stond alleen lokaal in die browser |
| Supabase-project "paused" | Gratis tier na ±7 dagen inactiviteit — klik **Restore project** in het dashboard |

## Lokaal ontwikkelen tegen het hosted project

```bash
cp .env.example .env       # vul de URL + anon key uit stap 4 in
npm install && npm run dev
```

Schema aanpassen? Alleen via nieuwe migraties in `supabase/migrations/`,
daarna `npx supabase db push` (en `npm run gen:sql` om het plakbestand te
verversen).
