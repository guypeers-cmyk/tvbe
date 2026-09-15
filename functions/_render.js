// Shared render helpers — JS port of the Flask/Jinja templates (base.html + index.html + 404.html)
// Kept as string templates so the exact markup matches the original app 1:1.
import { CATEGORIES, CHANNELS, EPG_GENERATED_AT, PROGRAMMES, STREAM_MAP } from "./_data.js";

const CAT_COLORS = {
  vrt: "var(--cat-vrt)",
  dpg: "var(--cat-dpg)",
  play: "var(--cat-play)",
  rtbf: "var(--cat-rtbf)",
  rtl: "var(--cat-rtl)",
  regionaal: "var(--cat-regionaal)",
  overig: "var(--cat-overig)",
};

export function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function escapeAttr(str) {
  return escapeHtml(str);
}

// Mirrors app.py:now_and_next()
export function nowAndNext(epgId) {
  if (!epgId) return { now: null, next: null };
  const programmes = PROGRAMMES[epgId] || [];
  const now = new Date();
  let current = null;
  let upcoming = null;
  for (let i = 0; i < programmes.length; i++) {
    const p = programmes[i];
    const start = new Date(p.start);
    const stop = new Date(p.stop);
    if (start <= now && now < stop) {
      current = p;
      if (i + 1 < programmes.length) upcoming = programmes[i + 1];
      break;
    }
    if (start > now && upcoming === null) upcoming = p;
  }
  return { now: current, next: upcoming };
}

// Mirrors app.py:enrich_channel()
export function enrichChannel(ch) {
  const { now, next } = nowAndNext(ch.epg_id);
  const streamUrls = ch.iptv_id ? STREAM_MAP[ch.iptv_id] || [] : [];
  return {
    ...ch,
    now,
    next,
    has_epg: now !== null || next !== null,
    direct_stream_url: streamUrls.length ? streamUrls[0] : null,
  };
}

export function enrichAllChannels() {
  return CHANNELS.map(enrichChannel);
}

export function groupByCategory(enriched) {
  const byCat = {};
  for (const c of enriched) {
    if (!byCat[c.category]) byCat[c.category] = [];
    byCat[c.category].push(c);
  }
  return byCat;
}

function formatGeneratedAt(iso) {
  if (!iso) return "";
  return iso.slice(0, 16).replace("T", " ");
}

function renderStructuredData(canonicalUrl, allChansFlat) {
  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Belgische Live TV",
    description: "Actuele tv-gids van alle Belgische live TV-zenders.",
    url: canonicalUrl,
    inLanguage: "nl-BE",
  };

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Belgische live TV-zenders",
    numberOfItems: allChansFlat.length,
    itemListElement: allChansFlat.map((ch, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "TelevisionStation",
        name: ch.name,
        url: ch.watch_url,
        inLanguage: ch.language,
      },
    })),
  };

  return `<script type="application/ld+json">\n${JSON.stringify(website, null, 2)}\n</script>\n<script type="application/ld+json">\n${JSON.stringify(itemList, null, 2)}\n</script>`;
}

function renderHead({ title, description, canonicalUrl, ogImage, structuredData }) {
  return `<!DOCTYPE html>
<html lang="nl-BE">
<head>
<meta charset="UTF-8">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0">
<meta name="color-scheme" content="light">
<meta name="theme-color" content="#4f46e5">

<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeAttr(description)}">
${canonicalUrl ? `<link rel="canonical" href="${escapeAttr(canonicalUrl)}">` : ""}
<meta name="robots" content="index, follow">
<meta name="author" content="Belgische Live TV">
<meta name="keywords" content="belgische tv, live tv gids, vrt, vtm, play4, rtbf, rtl tvi, tv programma, wat is er nu op tv">

<meta property="og:type" content="website">
<meta property="og:site_name" content="Belgische Live TV">
<meta property="og:title" content="${escapeAttr(title)}">
<meta property="og:description" content="${escapeAttr(description)}">
<meta property="og:locale" content="nl_BE">
${canonicalUrl ? `<meta property="og:url" content="${escapeAttr(canonicalUrl)}">` : ""}
<meta property="og:image" content="${escapeAttr(ogImage)}">
<meta name="twitter:card" content="summary">

<link rel="manifest" href="/static/manifest.json">

<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="BE Live TV">
<link rel="apple-touch-icon" href="/static/icons/apple-touch-icon.png">

<link rel="icon" type="image/png" sizes="32x32" href="/static/icons/icon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/static/icons/icon-16.png">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" href="/static/css/style.css" as="style">
<link rel="stylesheet" href="/static/css/style.css">

${structuredData}
</head>`;
}

function renderInstallBannerAndScripts() {
  return `<aside id="installBanner" class="install-banner" hidden role="complementary" aria-label="App installeren">
  <div class="install-banner-icon" aria-hidden="true">📺</div>
  <div class="install-banner-text">
    <strong>Installeer BE Live TV</strong>
    <span>Snellere toegang, volledig scherm, werkt als een echte app.</span>
  </div>
  <button id="installBtn" class="install-banner-btn" type="button">Installeren</button>
  <button id="installDismiss" class="install-banner-close" type="button" aria-label="Melding sluiten">✕</button>
</aside>

<script>
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
  });
}

(function () {
  const banner = document.getElementById('installBanner');
  const btn = document.getElementById('installBtn');
  const dismiss = document.getElementById('installDismiss');
  let deferredPrompt = null;

  if (localStorage.getItem('betv_install_dismissed') === '1') return;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
  if (isStandalone) return;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    banner.hidden = false;
  });

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (isIOS && !isStandalone) {
    banner.hidden = false;
    btn.textContent = 'Hoe?';
    btn.addEventListener('click', () => {
      alert('Tik op het deel-icoon onderaan Safari, en kies "Zet op beginscherm".');
    });
  } else {
    btn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      banner.hidden = true;
    });
  }

  dismiss.addEventListener('click', () => {
    banner.hidden = true;
    localStorage.setItem('betv_install_dismissed', '1');
  });
})();
</script>`;
}

function renderTileMarkup(ch, catId) {
  const color = CAT_COLORS[catId] || "#888";
  const logoHtml = ch.logo
    ? `<img src="${escapeAttr(ch.logo)}" alt="" loading="lazy" width="46" height="46" onerror="this.style.display='none'; this.parentElement.textContent='📺';">`
    : `<span aria-hidden="true">📺</span>`;
  const nowLabel = ch.now ? `, nu: ${escapeAttr(ch.now.title)}` : "";

  let nowBlock;
  if (ch.now) {
    let nextBlock = "";
    if (ch.next) {
      nextBlock = `
            <span class="next-line">
              <span class="tag tag-next">Straks</span>
              <span class="prog-title">${escapeHtml(ch.next.title)}</span>
            </span>`;
    }
    nowBlock = `
          <div class="tile-now-wrap">
            <span class="now-line">
              <span class="tag tag-live"><span class="live-dot" aria-hidden="true"></span>Nu</span>
              <span class="prog-title">${escapeHtml(ch.now.title)}</span>
            </span>${nextBlock}
          </div>`;
  } else {
    nowBlock = `
          <div class="tile-now-wrap">
            <span class="tile-empty">Geen tv-gids — klik voor live kijken</span>
          </div>`;
  }

  return `        <li class="tile" data-id="${escapeAttr(ch.id)}" data-name="${escapeAttr(ch.name.toLowerCase())}" tabindex="0"
            aria-label="Open details voor ${escapeAttr(ch.name)}${nowLabel}"
            style="--cat-color:${color};">
          <span class="tile-band" aria-hidden="true"></span>
          <div class="tile-top">
            <span class="tile-logo">${logoHtml}</span>
            <span class="tile-heading">
              <span class="tile-name">${escapeHtml(ch.name)}</span>
              <span class="tile-lang" aria-label="Taal: ${escapeAttr(ch.language)}">${escapeHtml(ch.language)}</span>
            </span>
            <button class="fav-btn" data-fav-id="${escapeAttr(ch.id)}" type="button"
                    aria-label="${escapeAttr(ch.name)} toevoegen aan favorieten" aria-pressed="false" title="Favoriet">☆</button>
          </div>${nowBlock}
        </li>`;
}

function renderCategorySections(channelsByCategory) {
  const sections = [];
  for (const [catId, catLabel] of Object.entries(CATEGORIES)) {
    const chans = channelsByCategory[catId] || [];
    if (!chans.length) continue;
    const color = CAT_COLORS[catId] || "#888";
    const tiles = chans.map((ch) => renderTileMarkup(ch, catId)).join("\n");
    sections.push(`    <section class="cat-section" data-cat="${escapeAttr(catId)}" aria-labelledby="cat-heading-${escapeAttr(catId)}">
      <h3 class="cat-title" id="cat-heading-${escapeAttr(catId)}">
        <span class="cat-dot" style="background:${color};" aria-hidden="true"></span>
        ${escapeHtml(catLabel)}
        <span class="cat-count" aria-hidden="true">(${chans.length})</span>
      </h3>
      <ul class="tile-grid" role="list">
${tiles}
      </ul>
    </section>`);
  }
  return sections.join("\n");
}

function renderFilterBar(channelsByCategory, totalChannels) {
  const pills = [
    `<button class="filter-pill active" data-cat="all" type="button" aria-pressed="true">Alles <span class="count">${totalChannels}</span></button>`,
    `<button class="filter-pill" data-cat="__favorites" type="button" aria-pressed="false">⭐ Favorieten <span class="count" id="favCount">0</span></button>`,
  ];
  for (const [catId, catLabel] of Object.entries(CATEGORIES)) {
    const chans = channelsByCategory[catId] || [];
    if (!chans.length) continue;
    const color = CAT_COLORS[catId] || "#888";
    const shortLabel = catLabel.split("(")[0].trim();
    pills.push(`<button class="filter-pill" data-cat="${escapeAttr(catId)}" type="button" aria-pressed="false">
        <span class="dot" style="background:${color};" aria-hidden="true"></span>${escapeHtml(shortLabel)}
        <span class="count">${chans.length}</span>
      </button>`);
  }
  return pills.join("\n    ");
}

function renderIndexBodyScript(channelsByCategory, openChannelId) {
  return `<script>
const CHANNEL_DATA = ${JSON.stringify(channelsByCategory)};
const ALL_CHANNELS = Object.values(CHANNEL_DATA).flat();
const OPEN_ON_LOAD = ${JSON.stringify(openChannelId || "")};

const modalOverlay = document.getElementById('modalOverlay');
const modalBox = document.getElementById('modalBox');
let lastFocusedEl = null;

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function renderModalSkeleton(ch) {
  const logoHtml = ch.logo
    ? \`<img src="\${ch.logo}" alt="" onerror="this.style.display='none'; this.parentElement.textContent='📺';">\`
    : '📺';
  const noteBadge = ch.note ? \`<span class="badge">\${escapeHtml(ch.note)}</span>\` : '';
  modalBox.innerHTML = \`
    <span class="modal-band" aria-hidden="true"></span>
    <div class="modal-header">
      <button class="modal-close" id="modalCloseBtn" type="button" aria-label="Venster sluiten">✕</button>
      <div class="tile-logo" aria-hidden="true">\${logoHtml}</div>
      <div>
        <h2 id="modalTitle">\${escapeHtml(ch.name)} \${noteBadge}</h2>
        <p class="meta">Taal: \${escapeHtml(ch.language || '')}</p>
      </div>
    </div>
    <div class="modal-body">
      <a class="watch-btn" href="\${ch.watch_url}" target="_blank" rel="noopener noreferrer">▶ Live kijken via officiële site</a>
      <div id="scheduleArea" aria-live="polite">
        <div class="loading-spinner" role="status" aria-label="Programma laden..."></div>
      </div>
      <p class="info-note">
        ℹ️ Om auteursrechtelijke en licentie-redenen embedden we geen live streams rechtstreeks.
        De knop hierboven brengt je naar het officiële, legale platform van de omroep zelf
        (VRT MAX, VTM GO, GoPlay, Auvio, RTL Play, ...).
      </p>
    </div>
  \`;
  document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
}

function renderSchedule(ch, schedule) {
  const area = document.getElementById('scheduleArea');
  if (!area) return;
  let html = '';
  if (ch.now) {
    html += \`<h3 class="section-label">📡 Nu</h3>\`;
    html += \`<div class="now-row"><div class="now-time">NU</div><div>
      <p class="now-title">\${escapeHtml(ch.now.title)}</p>
      \${ch.now.subtitle ? \`<p class="now-sub">\${escapeHtml(ch.now.subtitle)}</p>\` : ''}
      \${ch.now.desc ? \`<p class="now-desc">\${escapeHtml(ch.now.desc)}</p>\` : ''}
    </div></div>\`;
  }
  if (schedule && schedule.length) {
    html += \`<h3 class="section-label">Programma-overzicht</h3>\`;
    schedule.forEach(p => {
      const time = p.start.slice(11, 16);
      html += \`<div class="now-row"><div class="now-time">\${time}</div><div>
        <p class="now-title">\${escapeHtml(p.title)}</p>
        \${p.subtitle ? \`<p class="now-sub">\${escapeHtml(p.subtitle)}</p>\` : ''}
      </div></div>\`;
    });
  } else if (!ch.now) {
    html += \`<p class="empty-note">Voor deze zender hebben we (nog) geen tv-gids beschikbaar. Klik hierboven om rechtstreeks live te kijken via de officiële site.</p>\`;
  }
  area.innerHTML = html;
}

function openChannel(id) {
  const ch = ALL_CHANNELS.find(c => c.id === id);
  if (!ch) return;
  lastFocusedEl = document.activeElement;
  renderModalSkeleton(ch);
  modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  history.replaceState(null, '', \`/kanaal/\${id}\`);
  document.getElementById('modalCloseBtn').focus();

  fetch(\`/api/channels/\${id}/schedule\`)
    .then(r => r.json())
    .then(schedule => renderSchedule(ch, schedule))
    .catch(() => renderSchedule(ch, []));
}

function closeModal() {
  modalOverlay.classList.remove('open');
  document.body.style.overflow = '';
  history.replaceState(null, '', '/');
  if (lastFocusedEl) lastFocusedEl.focus();
}

modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalOverlay.classList.contains('open')) closeModal();
  if (e.key === 'Tab' && modalOverlay.classList.contains('open')) {
    const focusables = modalBox.querySelectorAll('a, button, input');
    if (!focusables.length) return;
    const first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

document.querySelectorAll('.tile').forEach(card => {
  card.addEventListener('click', () => openChannel(card.dataset.id));
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openChannel(card.dataset.id); }
  });
});

if (OPEN_ON_LOAD) {
  openChannel(OPEN_ON_LOAD);
}

const searchBox = document.getElementById('searchBox');
const searchStatus = document.getElementById('searchStatus');
searchBox.addEventListener('input', () => {
  const q = searchBox.value.trim().toLowerCase();
  applyFilters(q, currentCategory);
});

let currentCategory = 'all';
let showOnlyFavorites = false;
const filterBar = document.getElementById('filterBar');

function selectFilter(cat) {
  currentCategory = cat;
  showOnlyFavorites = (cat === '__favorites');
  filterBar.querySelectorAll('.filter-pill').forEach(b => {
    const active = b.dataset.cat === cat;
    b.classList.toggle('active', active);
    b.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
  document.querySelectorAll('.nav-tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-pressed', 'false'); });
  const tab = cat === '__favorites' ? 'favorites' : 'all';
  const navBtn = document.querySelector(\`.nav-tab[data-tab="\${tab}"]\`);
  if (navBtn) { navBtn.classList.add('active'); navBtn.setAttribute('aria-pressed', 'true'); }
  applyFilters(searchBox.value.trim().toLowerCase(), currentCategory);
}

filterBar.addEventListener('click', (e) => {
  const btn = e.target.closest('.filter-pill');
  if (btn) selectFilter(btn.dataset.cat);
});

const FAV_KEY = 'betv_favorites';
function getFavorites() {
  try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch (e) { return []; }
}
function setFavorites(list) {
  localStorage.setItem(FAV_KEY, JSON.stringify(list));
}
function toggleFavorite(id) {
  let favs = getFavorites();
  if (favs.includes(id)) favs = favs.filter(f => f !== id);
  else favs.push(id);
  setFavorites(favs);
  syncFavButtons();
  if (showOnlyFavorites) applyFilters(searchBox.value.trim().toLowerCase(), currentCategory);
}
function syncFavButtons() {
  const favs = getFavorites();
  document.querySelectorAll('.fav-btn').forEach(btn => {
    const on = favs.includes(btn.dataset.favId);
    btn.textContent = on ? '★' : '☆';
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  document.getElementById('favCount').textContent = favs.length;
  document.getElementById('statFavs').textContent = favs.length;
}
document.querySelectorAll('.fav-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFavorite(btn.dataset.favId);
  });
});
syncFavButtons();

const bottomNav = document.getElementById('bottomNav');
bottomNav.addEventListener('click', (e) => {
  const btn = e.target.closest('.nav-tab');
  if (!btn) return;
  const tab = btn.dataset.tab;
  if (tab === 'search') {
    searchBox.focus();
    searchBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  selectFilter(tab === 'favorites' ? '__favorites' : 'all');
});

function applyFilters(q, cat) {
  const favs = getFavorites();
  const sections = document.querySelectorAll('.cat-section');
  let anyVisible = false;
  let visibleCount = 0;
  sections.forEach(sec => {
    const secCat = sec.dataset.cat;
    const catMatches = (cat === 'all' || cat === '__favorites' || cat === secCat);
    let sectionHasVisible = false;
    sec.querySelectorAll('.tile').forEach(card => {
      const nameMatches = card.dataset.name.includes(q);
      const favMatches = !showOnlyFavorites || favs.includes(card.dataset.id);
      const visible = catMatches && nameMatches && favMatches;
      card.style.display = visible ? '' : 'none';
      if (visible) { sectionHasVisible = true; visibleCount++; }
    });
    sec.style.display = (catMatches && sectionHasVisible) ? '' : 'none';
    if (sectionHasVisible && catMatches) anyVisible = true;
  });
  const noRes = document.getElementById('noResults');
  const noResText = noRes.querySelector('p');
  if (!anyVisible && showOnlyFavorites) {
    noResText.textContent = 'Nog geen favorieten. Tik op de ster bij een zender.';
    noRes.querySelector('.emoji').textContent = '⭐';
    noRes.style.display = 'block';
  } else {
    noResText.textContent = 'Geen zenders gevonden.';
    noRes.querySelector('.emoji').textContent = '📡';
    noRes.style.display = anyVisible ? 'none' : 'block';
  }
  searchStatus.textContent = \`\${visibleCount} zender\${visibleCount === 1 ? '' : 's'} gevonden\`;
}

(function () {
  const liveCards = document.querySelectorAll('.tag-live').length;
  document.getElementById('statLive').textContent = liveCards;
})();
</script>`;
}

export function renderIndexPage({ origin, openChannelId }) {
  const enriched = enrichAllChannels();
  const channelsByCategory = groupByCategory(enriched);
  const totalChannels = CHANNELS.length;
  const canonicalUrl = openChannelId ? `${origin}/kanaal/${openChannelId}` : `${origin}/`;
  const title = `Belgische Live TV — TV-gids van ${totalChannels} zenders`;
  let description = `Overzicht van ${totalChannels} Belgische live TV-zenders (VRT, VTM, Play, RTBF, RTL en regionale zenders) met actuele tv-gids en links om live te kijken.`;
  if (openChannelId) {
    const ch = CHANNELS.find((c) => c.id === openChannelId);
    if (ch) description = `Bekijk de tv-gids van ${ch.name} en ga live kijken via het officiële platform.`;
  }
  const ogImage = `${origin}/static/icons/icon-512.png`;
  const structuredData = renderStructuredData(canonicalUrl, enriched);

  const head = renderHead({ title, description, canonicalUrl, ogImage, structuredData });
  const generatedAtHtml = EPG_GENERATED_AT
    ? `<span aria-hidden="true"> · </span><span>gids bijgewerkt <time datetime="${escapeAttr(EPG_GENERATED_AT)}">${escapeHtml(formatGeneratedAt(EPG_GENERATED_AT))} UTC</time></span>`
    : "";

  const body = `<body>
<a class="skip-link" href="#main-content">Ga naar de inhoud</a>
<header class="site" role="banner">
  <div class="header-inner">
    <h1>
      <a href="/" aria-label="Belgische Live TV — terug naar overzicht">
        <span class="brand-badge" aria-hidden="true">📺</span>
        <span>Belgische Live<span class="hl">TV</span></span>
      </a>
    </h1>
    <p class="header-meta">
      <span>${totalChannels} zenders</span>
      ${generatedAtHtml}
    </p>
    <search class="search-wrap" role="search">
      <div class="search-box">
        <label for="searchBox" class="visually-hidden">Zoek een zender op naam</label>
        <input id="searchBox" type="search" placeholder="Zoek een zender..." autocomplete="off"
               aria-controls="channelRoot" aria-describedby="searchStatus">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
          <circle cx="11" cy="11" r="7"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </div>
      <span id="searchStatus" class="visually-hidden" role="status" aria-live="polite"></span>
    </search>
  </div>
</header>

<div class="filter-rail-wrap">
  <nav class="filter-bar" id="filterBar" aria-label="Filter zenders op categorie">
    ${renderFilterBar(channelsByCategory, totalChannels)}
  </nav>
</div>

<main id="main-content">
  <h2 class="visually-hidden">Overzicht van Belgische live TV-zenders</h2>

  <div class="stat-strip">
    <div class="stat-card accent">
      <div class="stat-value">${totalChannels}</div>
      <div class="stat-label">Zenders totaal</div>
    </div>
    <div class="stat-card live">
      <div class="stat-value" id="statLive">–</div>
      <div class="stat-label">Nu live met gids</div>
    </div>
    <div class="stat-card gold">
      <div class="stat-value" id="statFavs">0</div>
      <div class="stat-label">Favorieten</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${Object.keys(CATEGORIES).length}</div>
      <div class="stat-label">Categorieën</div>
    </div>
  </div>

  <div id="channelRoot">
${renderCategorySections(channelsByCategory)}
  </div>

  <div id="noResults" class="no-results" role="status" aria-live="polite">
    <span class="emoji" aria-hidden="true">📡</span>
    <p>Geen zenders gevonden.</p>
  </div>
</main>

<footer class="site-footer" role="contentinfo">
  <p>
    Gegevens: <a href="https://iptv-org.github.io/" target="_blank" rel="noopener noreferrer">iptv-org</a> &amp;
    <a href="https://epgshare01.online/" target="_blank" rel="noopener noreferrer">epgshare01</a> ·
    Live kijken gebeurt altijd via het officiële, legale platform van de zender zelf.
  </p>
</footer>

<nav class="bottom-nav" id="bottomNav" aria-label="Mobiele navigatie">
  <button class="nav-tab active" data-tab="all" type="button" aria-pressed="true"><span class="icon" aria-hidden="true">📺</span>Alles</button>
  <button class="nav-tab" data-tab="favorites" type="button" aria-pressed="false"><span class="icon" aria-hidden="true">⭐</span>Favorieten</button>
  <button class="nav-tab" data-tab="search" type="button" aria-pressed="false"><span class="icon" aria-hidden="true">🔍</span>Zoeken</button>
</nav>

<div class="modal-overlay" id="modalOverlay">
  <div class="modal-box" id="modalBox" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
  </div>
</div>

${renderInstallBannerAndScripts()}

${renderIndexBodyScript(channelsByCategory, openChannelId)}
</body>
</html>`;

  return `${head}\n${body}`;
}

export function renderNotFoundPage({ origin }) {
  const title = "Pagina niet gevonden — Belgische Live TV";
  const description = "Deze pagina of zender bestaat niet (meer). Ga terug naar het overzicht van alle Belgische live TV-zenders.";
  const ogImage = `${origin}/static/icons/icon-512.png`;
  const structuredData = renderStructuredData(`${origin}/`, []);
  const head = renderHead({ title, description, canonicalUrl: null, ogImage, structuredData });
  const body = `<body>
<a class="skip-link" href="#main-content">Ga naar de inhoud</a>
<main class="error-page" id="main-content">
  <p class="code" aria-hidden="true">404</p>
  <h1>Zender niet gevonden</h1>
  <p><a href="/" style="color:var(--accent); font-weight:700; text-decoration:none;">&larr; Terug naar het overzicht</a></p>
</main>

${renderInstallBannerAndScripts()}
</body>
</html>`;
  return `${head}\n${body}`;
}
