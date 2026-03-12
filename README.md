FoodLead Engine è una web app interna per la ricerca e gestione lead nel settore food (Sud Italia). Tech: Next.js (App Router, TS), Tailwind, shadcn/ui, PostgreSQL, Prisma, Zod, NextAuth (credenziali). Provider-based con mock incluso.

## Requisiti
- Node.js LTS
- Docker (per il DB locale)

## Setup rapido
1) Copia l’example env e personalizza:

```bash
cp .env.example .env.local
```

2) Avvia PostgreSQL via Docker Compose:

```bash
docker compose up -d
```

3) Installa dipendenze:

```bash
npm ci
```

4) Applica schema Prisma e genera client:

```bash
npm run db:push
npm run db:generate
```

5) Seed admin e configurazioni di default:

```bash
ADMIN_EMAIL=admin@local.test ADMIN_PASSWORD=password123 npm run db:seed
```

6) Avvia in sviluppo:

```bash
npm run dev
```

Apri http://localhost:3000 e accedi con le credenziali seed.

## Flusso minimo per provare
- Vai su Leads.
- Usa “Ricerca lead (provider-based)”.
- Lancia una ricerca con il provider “Mock Provider (demo)”.
- Seleziona/lascia preselezionati i risultati e clicca “Importa”.
- Vedi i lead in lista, KPI, filtri e accedi al dettaglio.

## Test e typecheck
```bash
npm run typecheck
npm test
```

## Variabili d’ambiente principali
- DATABASE_URL: connessione PostgreSQL.
- NEXTAUTH_URL, NEXTAUTH_SECRET: auth (JWT).
- ADMIN_EMAIL, ADMIN_PASSWORD: credenziali seed iniziale.

## Dockerfile e Nginx (esempio)
- Dockerfile per build/avvio app (porta 3000).
- Esempio di configurazione Nginx in deploy/nginx.conf per reverse proxy.
