// Tutte le 20 regioni italiane con i capoluoghi di provincia
// Usato da serpApiRegionScan per fare ricerche multi-città
export const regionCities: Record<string, string[]> = {
  Abruzzo: ["L'Aquila", "Teramo", "Pescara", "Chieti"],
  Basilicata: ["Potenza", "Matera"],
  Calabria: ["Catanzaro", "Reggio Calabria", "Cosenza", "Crotone", "Vibo Valentia"],
  Campania: ["Napoli", "Salerno", "Caserta", "Avellino", "Benevento"],
  "Emilia-Romagna": [
    "Bologna",
    "Modena",
    "Parma",
    "Reggio Emilia",
    "Ferrara",
    "Ravenna",
    "Forlì",
    "Rimini",
    "Piacenza",
  ],
  "Friuli-Venezia Giulia": ["Trieste", "Udine", "Pordenone", "Gorizia"],
  Lazio: ["Roma", "Latina", "Frosinone", "Viterbo", "Rieti"],
  Liguria: ["Genova", "La Spezia", "Savona", "Imperia"],
  Lombardia: [
    "Milano",
    "Bergamo",
    "Brescia",
    "Monza",
    "Varese",
    "Como",
    "Lecco",
    "Lodi",
    "Pavia",
    "Cremona",
    "Mantova",
    "Sondrio",
  ],
  Marche: ["Ancona", "Pesaro", "Macerata", "Ascoli Piceno", "Fermo"],
  Molise: ["Campobasso", "Isernia"],
  Piemonte: ["Torino", "Novara", "Cuneo", "Asti", "Alessandria", "Biella", "Vercelli", "Verbania"],
  Puglia: ["Bari", "Taranto", "Foggia", "Brindisi", "Lecce", "Barletta"],
  Sardegna: ["Cagliari", "Sassari", "Nuoro", "Oristano", "Olbia"],
  Sicilia: ["Palermo", "Catania", "Messina", "Siracusa", "Ragusa", "Agrigento", "Caltanissetta", "Enna", "Trapani"],
  Toscana: ["Firenze", "Pisa", "Livorno", "Arezzo", "Siena", "Lucca", "Prato", "Pistoia", "Grosseto", "Massa"],
  "Trentino-Alto Adige": ["Trento", "Bolzano"],
  Umbria: ["Perugia", "Terni"],
  "Valle d'Aosta": ["Aosta"],
  Veneto: ["Venezia", "Verona", "Padova", "Vicenza", "Treviso", "Belluno", "Rovigo"],
}

// Normalizzazione nomi regione (gestisce varianti ortografiche comuni)
const regionAliases: Record<string, string> = {
  "friuli venezia giulia": "Friuli-Venezia Giulia",
  "friuli-venezia-giulia": "Friuli-Venezia Giulia",
  "trentino alto adige": "Trentino-Alto Adige",
  "trentino-alto-adige": "Trentino-Alto Adige",
  "taa": "Trentino-Alto Adige",
  "valle daosta": "Valle d'Aosta",
  "val d'aosta": "Valle d'Aosta",
  "emilia romagna": "Emilia-Romagna",
  "emilia-romagna": "Emilia-Romagna",
}

export function normalizeRegionName(input: string): string {
  const lower = input.trim().toLowerCase()
  if (regionAliases[lower]) return regionAliases[lower]
  // Cerca corrispondenza esatta case-insensitive
  const match = Object.keys(regionCities).find((r) => r.toLowerCase() === lower)
  return match ?? input.trim()
}
