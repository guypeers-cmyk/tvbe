# Belgische Live TV — Cloudflare Pages editie

Dit is de Cloudflare Pages-versie van de "Belgische Live TV"-app: een tv-gids
(EPG, nu/straks) voor 42 Belgische zenders met links om live te kijken via het
officiële platform van elke omroep.

De oorspronkelijke app was een Flask/Python-server (`be-tv-app/`). Cloudflare
Pages draait geen Python, dus deze map bevat een 1:1-conversie naar:

- **Statische assets** (`public/`): CSS, PWA-manifest, iconen, service worker
- **Pages Functions** (`functions/`): JavaScript-equivalenten van elke
  Flask-route, draaiend op de Cloudflare Workers-runtime

Alle functionaliteit is behouden: 42 zenders, 7 categorieën, EPG-gegevens,
favorieten (localStorage), zoeken/filteren, PWA-installatie, SEO
(canonical/OG/JSON-LD/sitemap/robots.txt) en toegankelijkheid.

## Projectstructuur

```
be-tv-cf/
├── public/                  # Statische bestanden (1:1 gekopieerd van static/)
│   ├── static/css/style.css
│   ├── static/icons/*.png
│   ├── static/manifest.json
│   ├── sw.js                # Service worker
│   └── _headers             # Cloudflare Pages headers (Service-Worker-Allowed)
├── functions/                # Pages Functions = de vroegere Flask-routes
│   ├── _data.js              # Auto-gegenereerd: alle zender/EPG-data ingebed als JS
│   ├── _render.js             # HTML-rendering (JS-poort van de Jinja-templates)
│   ├── index.js               # GET /
│   ├── kanaal/[id].js          # GET /kanaal/<id>
│   ├── robots.txt.js
│   ├── sitemap.xml.js
│   └── api/channels/...        # GET /api/channels, /api/channels/<id>, .../schedule
├── data/                      # Brondata (JSON) waaruit _data.js gegenereerd wordt
│   ├── channels.json
│   ├── epg_cache.json
│   └── stream_map.json
├── scripts/build_data.py       # Regenereert functions/_data.js uit data/*.json
├── wrangler.toml
└── package.json
```

## Lokaal draaien

```bash
npm install
npm run dev
```

Dit start `wrangler pages dev public` op `http://localhost:8788` — een exacte
lokale simulatie van de Cloudflare Pages-omgeving (inclusief Functions).

## EPG-data verversen

De EPG-gegevens (`data/epg_cache.json`) zijn een momentopname. Om ze te
verversen:

1. Vervang `data/epg_cache.json` door een nieuwe export (zelfde formaat:
   `{"generated_at": "...", "programmes": {"<epg_id>": [{"start","stop","title",...}]}}`).
2. Regenereer de ingebedde data:
   ```bash
   python3 scripts/build_data.py
   ```
3. Commit en push — Cloudflare Pages bouwt automatisch opnieuw.

## Deployen naar Cloudflare Pages

**Aanbevolen: Git-integratie (geen CLI-login nodig)**

1. Push deze map naar een eigen GitHub/GitLab-repository.
2. Ga naar het Cloudflare-dashboard → **Workers & Pages** → **Create** →
   **Pages** → **Connect to Git**.
3. Kies de repository.
4. Build-instellingen:
   - **Framework preset**: None
   - **Build command**: (leeg laten — er is niets te bouwen)
   - **Build output directory**: `public`
5. Deploy. Cloudflare herkent `functions/` automatisch als Pages Functions.

**Alternatief: Wrangler CLI (lokaal, met eigen account)**

```bash
npm install -g wrangler
wrangler login          # opent een browserscherm voor OAuth-login
npm run deploy          # = wrangler pages deploy public
```

## Belangrijk: geen API-tokens delen

Gebruik nooit een Cloudflare API-token door het in een chat, ticket of commit
te plakken. Gebruik `wrangler login` (interactieve OAuth) of Cloudflare's
Git-integratie — beide hierboven beschreven — zodat er nergens een geheime
sleutel wordt uitgewisseld.
