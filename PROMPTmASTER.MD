Devi agire come un senior full-stack engineer, product architect e DevOps engineer.

Obiettivo:
costruire da zero un micro-SaaS interno per Providence Studio Web, pensato per la lead generation commerciale nel settore food in Sud Italia.

Nome progetto:
FoodLead Engine

Scopo del prodotto:
trovare attività food locali che siano ottimi lead commerciali per un’offerta Providence Studio Web da 769,99€, che include:
- sito web professionale
- menu digitale

Il sistema deve aiutare il team a individuare attività che:
- non hanno un sito web ufficiale
- hanno recensioni buone o ottime
- hanno abbastanza recensioni o altri segnali di affluenza reale
- sono attive e reali
- non appartengono a grandi catene o franchising

Target geografico:
Sud Italia, con priorità per:
- Campania
- Puglia
- Calabria
- Basilicata
- Sicilia
- Sardegna
- Molise
- Abruzzo

Categorie target:
- ristoranti
- pizzerie
- pub
- trattorie
- bistrot
- hamburgerie
- rosticcerie
- gastronomie
- bar con cucina
- bracerie
- sushi / locali food indipendenti

Obiettivo MVP:
realizzare una web app interna funzionante che permetta di:
1. lanciare ricerche lead per area geografica e categoria
2. raccogliere dati da provider/API o fonti configurabili
3. verificare se l’attività ha un sito ufficiale oppure no
4. filtrare i risultati per rating, numero recensioni e assenza sito
5. assegnare un punteggio lead score
6. visualizzare i lead in dashboard
7. salvare i lead in database
8. aggiornare lo stato commerciale del lead
9. esportare i lead in CSV
10. predisporre il deploy su VPS OVH con Docker

Vincoli tecnici obbligatori:
- usare Next.js con TypeScript
- usare App Router
- usare Tailwind CSS
- usare shadcn/ui per i componenti base
- usare PostgreSQL
- usare Prisma ORM
- usare Zod per validazione
- usare Docker e Docker Compose
- predisporre Nginx per reverse proxy
- codice organizzato, pulito e realmente eseguibile
- niente placeholder spacciati come feature completate
- niente chiavi API hardcoded
- niente mock non dichiarati
- niente dipendenze inutili o ridondanti

Architettura richiesta:
Costruisci il progetto con struttura chiara:
- frontend dashboard in Next.js
- API routes o server actions dove ha senso
- layer separato per servizi esterni/provider
- layer separato per lead scoring
- layer separato per lead normalization e deduplica
- layer separato per export CSV
- gestione configurazioni tramite file .env
- predisposizione per job batch o scansioni ripetibili

Provider/data layer:
Il sistema NON deve dipendere rigidamente da una sola fonte.
Costruisci un’architettura provider-based.

Crea interfacce e moduli per provider esterni con possibilità di aggiungere in futuro:
- Google Places API
- SerpAPI
- Outscraper
- Apify
- scraping custom controllato

Per il MVP:
- implementa una struttura provider astratta
- se non puoi usare API reali subito, crea un provider mock BEN SEGNALATO
- il codice deve essere pronto per sostituire facilmente il mock con provider reali

Regole fondamentali per il concetto di “sito ufficiale”:
Un’attività conta come “senza sito” solo se non possiede un vero dominio o sito ufficiale.
NON considerare come sito ufficiale:
- Instagram
- Facebook
- TripAdvisor
- TheFork
- Just Eat
- Glovo
- Deliveroo
- directory varie
- marketplace o portali terzi

Il sistema deve prevedere una funzione di website detection che distingua:
- sito ufficiale vero
- solo social
- solo directory / portali
- nessuna presenza web propria

Lead scoring:
Implementa un sistema di punteggio configurabile.
Esempio iniziale:
- nessun sito ufficiale: +40
- rating >= 4.3: +20
- numero recensioni >= 100: +20
- profilo social presente ma niente sito: +10
- categoria altamente vendibile (es. pizzeria, ristorante, pub): +10

Il punteggio deve essere facilmente modificabile tramite configurazione.

Campi dati richiesti per ogni lead:
- id
- nome attività
- slug
- categoria
- indirizzo
- città
- provincia
- regione
- paese
- latitudine
- longitudine
- telefono
- email se disponibile
- rating
- numero recensioni
- range recensioni classificato
- sito ufficiale presente (boolean)
- url sito ufficiale
- instagram_url
- facebook_url
- google_maps_url o source_url
- provider origine
- note raw provider
- attività verificata attiva (boolean o stato)
- chain_detected (boolean)
- lead_score
- priority_level
- stato lead (new, reviewed, contacted, qualified, discarded)
- note interne team
- created_at
- updated_at

Funzionalità minime UI:
1. Login semplice admin
2. Dashboard con KPI:
   - totale lead
   - lead nuovi
   - lead alta priorità
   - lead senza sito
   - lead per regione
3. Pagina ricerca lead con filtri:
   - regione
   - provincia
   - città
   - categoria
   - rating minimo
   - recensioni minime
   - solo senza sito
   - escludi catene
4. Tabella lead con:
   - nome
   - località
   - categoria
   - rating
   - recensioni
   - sito assente sì/no
   - social sì/no
   - lead score
   - priorità
   - stato
5. Pagina dettaglio lead
6. Possibilità di modificare stato lead e note interne
7. Export CSV dei lead filtrati
8. Pagina settings base per:
   - soglie scoring
   - blacklist domini
   - blacklist catene
   - provider attivo

Admin / Auth:
Per il MVP implementa auth semplice ma reale.
Puoi usare una di queste opzioni:
- NextAuth semplice con credenziali
oppure
- auth custom minimale con sessione server-side

Non creare sistemi auth complessi inutili. Deve essere semplice ma funzionante.

Deduplica:
Implementa deduplica dei lead basata su combinazione di:
- nome attività normalizzato
- città
- indirizzo
- telefono
- coordinate se disponibili

Database:
Definisci schema Prisma completo.
Prevedi almeno queste entità:
- User
- Lead
- SearchJob
- ProviderConfig
- ScoringConfig
- LeadNote o note integrate in Lead
- BlacklistDomain
- BlacklistChain

Ricerca / job:
Il sistema deve permettere di lanciare una ricerca e salvarne lo storico.
Ogni ricerca deve salvare:
- parametri usati
- timestamp
- provider
- numero risultati grezzi
- numero risultati validi
- eventuali errori

UI/UX:
- interfaccia pulita, professionale, moderna
- stile dashboard elegante, minimal, leggibile
- niente design giocattolo
- uso serio di spaziature, card, badge, tabelle e filtri
- tutto deve sembrare un tool interno professionale per Providence Studio Web

Brand context:
Questo strumento è interno a Providence Studio Web, studio digitale che vende:
- siti web
- PWA
- automazioni
- strumenti digitali per PMI e attività locali

Quindi l’interfaccia e il copy devono comunicare:
- ordine
- efficienza
- ricerca commerciale intelligente
- approccio business

Deploy target:
Il progetto deve essere predisposto per deploy su VPS OVH Ubuntu usando:
- Docker Compose
- Nginx reverse proxy
- container app
- container postgres
- volumi persistenti
- file .env.example completi
- istruzioni README chiare

Output richiesto da te:
Non limitarti a descrivere il progetto.
Devi GENERARE concretamente:
1. struttura completa del progetto
2. file principali
3. schema Prisma
4. API e servizi
5. pagine UI principali
6. componenti base
7. mock provider pronto da sostituire
8. seed iniziale facoltativo
9. docker-compose.yml
10. Dockerfile
11. configurazione Nginx di esempio
12. README completo con istruzioni setup locale e deploy VPS

Importantissimo:
- lavora per fasi logiche
- implementa prima l’ossatura funzionante
- poi collega le feature
- evita di lasciare parti spezzate
- ogni file deve essere coerente con gli altri
- se una parte non è realmente implementabile senza API key, crea un mock provider chiaro, tipizzato e sostituibile
- segnala con TODO espliciti solo i punti che richiedono integrazioni esterne reali
- non inventare integrazioni già funzionanti se non lo sono davvero

Ordine di esecuzione richiesto:
Fase 1:
inizializza progetto, dipendenze, struttura cartelle, UI base, schema DB

Fase 2:
implementa CRUD lead, dashboard, filtri, detail page, stato lead, note

Fase 3:
implementa provider abstraction, mock provider, ricerca, scoring, deduplica, search jobs

Fase 4:
implementa export CSV, settings, blacklist, configurazioni scoring

Fase 5:
predisponi Docker, Docker Compose, Nginx e README deploy su OVH

Fase 6:
rifinisci il progetto e verifica coerenza complessiva

Regole severe di qualità:
- niente pseudo-codice nei file finali
- niente “da implementare” ovunque
- niente UI scollegata dal backend
- niente incoerenze tra schema DB e codice
- niente import errati
- niente file mancanti rispetto a quanto dichiarato
- niente feature dichiarate ma non collegate

Prima di generare il codice, produci un mini piano tecnico sintetico.
Poi genera il progetto completo in modo ordinato.

Nota aggiuntiva:
preferisco una prima versione realmente funzionante e coerente, anche se più semplice, piuttosto che una versione più ambiziosa ma fragile o incompleta.
Se devi scegliere, privilegia stabilità, chiarezza architetturale e facilità di estensione futura.