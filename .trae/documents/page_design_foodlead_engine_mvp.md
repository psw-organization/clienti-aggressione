# Page Design — FoodLead Engine (MVP)
Approccio **desktop-first** con adattamento responsive (tablet/mobile) per operazioni rapide in tabella.

## Global Styles (Design tokens)
- Background: `#0B1220` (app shell) / `#0F172A` (surface) / cards `#111C33`
- Text: primary `#E5E7EB`, secondary `#94A3B8`, muted `#64748B`
- Accent/Primary: `#22C55E` (azioni positive/import), Secondary: `#38BDF8` (link/azioni)
- Danger: `#EF4444`
- Border: `rgba(148,163,184,0.2)`
- Radius: 10px cards, 8px inputs
- Typography: base 14px; H1 24px; H2 18px; label 12px; monospace per ID esterni
- Buttons:
  - Primary: bg accent, text scuro, hover +8% brightness
  - Secondary: outline border, hover background semi-trasparente
  - Danger: bg danger, hover darken
- Inputs: background scuro, focus ring accent, error state con bordo danger + helper text
- Table: header sticky, zebra rows leggere, highlight su hover e su selezione

## Layout system (responsiveness)
- Layout principale: **CSS Grid** per app shell (sidebar + content), **Flexbox** per toolbar e modali.
- Breakpoint:
  - ≥1200px: sidebar fissa 260px + content fluido.
  - 768–1199px: sidebar collassabile (icona) + content.
  - <768px: navigazione come drawer; tabella diventa lista “card” con campi chiave.

---

## Page: Login
### Meta Information
- Title: "FoodLead Engine — Login"
- Description: "Accedi per cercare e gestire lead food con scoring e deduplica."
- Open Graph: title/description coerenti; `og:type=website`

### Page Structure
- Centered single-column layout (max-width 420px) su background app.

### Sections & Components
1. **Brand header**
   - Logo + nome prodotto.
2. **Login Card**
   - Campi: Email, Password.
   - CTA: "Accedi" (primary).
   - Link: "Password dimenticata?" apre view inline di reset.
3. **Reset password (inline)**
   - Campo email + CTA "Invia link".
   - Stato: success (messaggio), error (testo chiaro).
4. **Footer minimale**
   - Versione app / contatto supporto (testo). 

Interaction states
- Submit loading: spinner nel bottone, disabilita input.
- Error: banner top card + error inline sul campo.

---

## Page: Dashboard Lead (/leads)
### Meta Information
- Title: "FoodLead Engine — Dashboard Lead"
- Description: "Ricerca e importa lead dai provider, filtra, deduplica e prioritizza con scoring."
- Open Graph: title/description; `og:type=website`

### Page Structure
- **App shell**: sidebar sinistra + topbar + area contenuti.
- Contenuto: stack verticale con 3 blocchi principali: Provider Search, Toolbar/Filters, Lead Table.

### Sections & Components
1. **Sidebar (nav)**
   - Voce attiva: "Lead".
   - (Admin) accesso a "Provider & Regole" come **sezione interna** della Dashboard (tab/drawer/modal), senza una pagina separata.
   - User menu: nome + logout.

2. **Topbar**
   - Breadcrumb: "Lead".
   - Search globale (testo libero) che filtra company/contact/email/website.
   - Azioni: "Nuovo lead" (secondary), "Import" (primary se ci sono risultati provider).

3. **Provider Search panel (card)**
   - Select provider (dropdown) + stato (enabled/disabled).
   - Form query: keyword, categoria, paese/città.
   - CTA: "Cerca".
   - Risultati preview (tabella compatta) con checkbox per selezione e colonna "Possibile duplicato".
   - Import options: toggle "Deduplica automatica" + tooltip.

4. **Filter bar (sticky sotto topbar)**
   - Filtri rapidi: Status, Provider, Has email, Has phone, Range score.
   - Sort: Score desc, Updated desc.
   - Pulsante: "Salva filtro" (solo utente) e "Reset".

5. **Lead Table (primary content)**
   - Colonne: Score, Company, Contact, Email, Phone, Category, Country/City, Provider, Updated, Actions.
   - Row actions: Apri, Archivia, Elimina.
   - Selezione multipla: azione bulk (archivia).
   - Indicators:
     - Badge score (color scale).
     - Badge duplicato (se in gruppo dedup).
     - Tooltip reasons (top 2 motivazioni score).

6. **Dedup drawer/modal**
   - Lista gruppi duplicati (master suggerito).
   - Compare side-by-side (master vs duplicate) con scelta campo-per-campo.
   - CTA: "Esegui merge" + audit minimale (mostra user/time).

7. **Sezione Admin: Provider & Regole (solo Admin)**
   - Tab/drawer dalla dashboard.
   - Provider list: toggle enabled, campi credenziali (mascherati), limiti operativi.
   - Regole scoring: pesi semplici e soglie minime (UI a slider/input numerici).
   - Regole deduplica: campi chiave (email/telefono/dominio) e priorità di merge.
   - CTA: "Salva regole" con conferma e gestione errori.

---

## Page: Scheda Lead (/leads/:id)
### Meta Information
- Title: "FoodLead Engine — Scheda Lead"
- Description: "Dettaglio lead con modifica, tracciabilità sorgenti e merge duplicati."
- Open Graph: title/description; `og:type=website`

### Page Structure
- Layout a due colonne (desktop):
  - Colonna sinistra (60%): form dettagli + note.
  - Colonna destra (40%): scoring, duplicati, sorgenti.
- Su tablet/mobile: stack verticale con accordions.

### Sections & Components
1. **Header + actions**
   - Titolo: Company name.
   - Back to list.
   - CTA: "Salva" (primary), "Ricalcola score" (secondary), "Archivia" (secondary), "Elimina" (danger).

2. **Dettagli lead (form)**
   - Company: nome, website.
   - Contact: nome, email, telefono.
   - Geografia e categoria: paese, città, categoria.
   - Tags: input con chips.
   - Validazioni: email/telefono/URL; warning su campi mancanti.

3. **Note e attività minima**
   - Textarea note.
   - Timeline minimale (opzionale ma utile): creato, importato da provider, merge eseguiti.

4. **Scoring card**
   - Score grande (0–100) + barra.
   - Lista reasons (max 6) con icone (completezza, match, freschezza).

5. **Duplicati card**
   - Lista potenziali duplicati con confidenza (alta/media/bassa).
   - CTA: "Confronta e merge" apre modal compare.

6. **Sorgenti (Lead sources)**
   - Tabella: provider, external_id, data import.
   - CTA: "Refresh" (se supportato) con stato loading.

Interaction/animation guidelines
- Transizioni: 150–200ms (opacity/translate) su drawer/modal.
- Autosave disabilitato in MVP: usare salvataggio esplicito con toast.
