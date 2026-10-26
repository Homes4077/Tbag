/* =========================================================
   TBAG HYBRID MOTORS SPECIALIST: inventory script
   Loads data/vehicles.json, renders cards, filters, search,
   sort, gallery, technical specs and zoom.
   ========================================================= */

const DATA_URL = 'data/vehicles.json';
const PAGE_SIZE = 12;
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
const PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="100%" height="100%" fill="#14141a"/><text x="50%" y="50%" fill="#777" font-family="sans-serif" font-size="28" text-anchor="middle">Photo unavailable</text></svg>'
  );

const state = { all: [], status: 'available', fuel: 'all', query: '', sort: 'default' };
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const scrollBehavior = reduceMotion ? 'auto' : 'smooth';

/* ---------- DOM helper (no innerHTML, so no injection) ---------- */
function el(tag, props = {}, ...kids) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) node.append(kid);
  return node;
}

/* ---------- formatting ---------- */
const money = n => 'KES ' + Number(n).toLocaleString('en-KE');
const isSold = v => v.status === 'sold';
const fuelOf = v => (v.fuel || 'Petrol').toLowerCase();

/* ---------- spec tiles (text labels) ---------- */
function specsFor(v) {
  const rows = [
    ['📅', 'Year', v.year],
    ['🔧', 'Engine', v.engine_cc && v.engine_cc.toLocaleString('en-KE') + ' cc'],
    ['🛣️', 'Mileage', v.mileage_km && v.mileage_km.toLocaleString('en-KE') + ' km'],
    ['⚙️', 'Gearbox', v.transmission],
    ['⛽', 'Fuel', v.fuel],
    ['🚙', 'Body', v.body],
    ['⭐', 'Condition', v.condition],
  ];
  return rows.filter(r => r[1]);
}

function buildSpecs(v) {
  return el('dl', { class: 'spec-grid' },
    specsFor(v).map(([label, value]) =>
      el('div', { class: 'spec' },
        el('dt', { class: 'spec-label', text: label }),
        el('dd', { class: 'spec-value', text: String(value) }))));
}

/* ---------- feature chips (first 4 visible, rest expandable) ---------- */
const FEATURES_VISIBLE = 4;

function buildFeatures(v) {
  const feats = v.features || [];
  if (!feats.length) return null;
  const list = el('ul', { class: 'feature-list' });
  feats.forEach((f, i) => {
    list.append(el('li', { class: 'feature-chip', hidden: i >= FEATURES_VISIBLE, text: f }));
  });
  const block = el('div', { class: 'feature-block' },
    el('div', { class: 'feature-title' },
      el('span', { text: 'Key features' }),
      el('span', { class: 'feature-total', text: String(feats.length) })),
    list);
  if (feats.length > FEATURES_VISIBLE) {
    block.append(el('button', {
      type: 'button', class: 'feature-toggle',
      'data-more': feats.length - FEATURES_VISIBLE,
      'aria-expanded': 'false',
      text: `Show ${feats.length - FEATURES_VISIBLE} more`,
    }));
  }
  return block;
}

/* ---------- technical specs (collapsible key/value list) ---------- */
function buildTech(v) {
  const entries = Object.entries(v.specs || {});
  if (!entries.length) return null;
  return el('details', { class: 'tech-specs' },
    el('summary', { text: 'Technical specs' }),
    el('dl', {}, entries.map(([k, val]) =>
      el('div', { class: 'tech-row' }, el('dt', { text: k }), el('dd', { text: String(val) })))));
}

/* ---------- gallery (card shows small thumbnail; zoom shows full photo) ---------- */
const thumbOf = src => src.replace(/^images\//, 'thumbs/').replace(/\.[a-z]+$/i, '.webp');

function buildGallery(v) {
  const imgs = v.images || [];
  const multi = imgs.length > 1;
  const track = el('div', { class: 'vehicle-images', 'data-vehicle-id': v.id, tabindex: '0',
    'aria-label': `${v.name} photos` },
    imgs.map((src, i) => el('img', {
      src, alt: `${v.name} – photo ${i + 1} of ${imgs.length}`, class: 'zoomable',
      loading: 'lazy', decoding: 'async', 'data-index': i,
    })));
  const gallery = el('div', { class: 'vehicle-gallery' },
    el('span', { class: `fuel-badge fuel-${fuelOf(v)}`, text: v.fuel }),
    multi && el('span', { class: 'photo-count', text: `1 / ${imgs.length}` }),
    track);
  if (multi) {
    gallery.append(
      el('button', { type: 'button', class: 'gallery-arrow prev', 'aria-label': 'Previous photo', text: '<' }),
      el('button', { type: 'button', class: 'gallery-arrow next', 'aria-label': 'Next photo', text: '>' }));
    if (imgs.length <= 8) {
      gallery.append(el('div', { class: 'image-nav' },
        imgs.map((_, i) => el('button', {
          type: 'button', class: 'dot-btn' + (i === 0 ? ' active' : ''), 'data-index': i,
          'aria-label': `Show photo ${i + 1}`,
        }))));
    }
  }
  return gallery;
}

/* ---------- actions ---------- */
function buildActions(v) {
  const phone = (v.contact_phone || '').replace(/\D/g, '');
  const sold = isSold(v);
  const msg = sold
    ? `Hello TBAG, I saw the ${v.name} is sold. Do you have something similar?`
    : `Hello TBAG, I'm interested in the ${v.name}${v.price ? ' (' + money(v.price) + ')' : ''}. Is it still available?`;
  return el('div', { class: 'vehicle-actions' },
    el('a', { class: 'action-btn whatsapp', target: '_blank', rel: 'noopener',
      href: `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,
      text: sold ? 'Ask for similar' : 'Chat on WhatsApp' }),
    !sold && el('a', { class: 'action-btn call', href: `tel:+${phone}`, text: 'Call' }));
}

/* ---------- card ---------- */
function buildCard(v) {
  const sold = isSold(v);
  const priceBlock = sold
    ? el('div', { class: 'sold-container' }, el('div', { class: 'sold-label', text: 'Sold' }))
    : el('div', { class: 'vehicle-price' },
        el('span', { class: 'price-amount', text: v.price ? money(v.price) : 'Call for price' }),
        v.negotiable && el('span', { class: 'pill-negotiable', text: 'Negotiable' }));

  return el('article', { class: 'vehicle-card' + (sold ? ' is-sold' : ''), 'data-id': v.id },
    buildGallery(v),
    el('div', { class: 'vehicle-details' },
      el('h3', { text: v.name }),
      priceBlock,
      buildSpecs(v),
      buildFeatures(v),
      buildActions(v)));
}

/* ---------- filtering / sorting ---------- */
function visibleVehicles() {
  const q = state.query.trim().toLowerCase();
  const list = state.all.filter(v => {
    if (state.status === 'available' && isSold(v)) return false;
    if (state.status === 'sold' && !isSold(v)) return false;
    if (state.fuel !== 'all' && fuelOf(v) !== state.fuel) return false;
    if (q) {
      const hay = [v.name, v.make, v.model, v.fuel, v.body, v.condition, ...(v.features || [])]
        .join(' ').toLowerCase();
      if (!q.split(/\s+/).every(w => hay.includes(w))) return false;
    }
    return true;
  });
  const price = v => (v.price == null ? Infinity : v.price);
  const idx = new Map(state.all.map((v, i) => [v.id, i]));
  list.sort((a, b) => {
    if (state.sort === 'price-asc') return price(a) - price(b) || idx.get(a.id) - idx.get(b.id);
    if (state.sort === 'price-desc') {
      const pa = price(a) === Infinity ? -1 : price(a);
      const pb = price(b) === Infinity ? -1 : price(b);
      return pb - pa || idx.get(a.id) - idx.get(b.id);
    }
    return (isSold(a) - isSold(b)) || idx.get(a.id) - idx.get(b.id);
  });
  return list;
}

function hydrate(track) {
  track.querySelectorAll('img[data-src]').forEach(img => {
    img.src = img.dataset.src;
    img.removeAttribute('data-src');
  });
}

function resetAndRender() { state.limit = PAGE_SIZE; render(); }

function render() {
  const container = document.getElementById('vehicle-cards-container');
  if (!container) return;
  const list = visibleVehicles();
  container.replaceChildren();
  if (!list.length) {
    container.append(el('div', { class: 'empty-state' },
      el('p', { text: 'No vehicles match your search.' }),
      el('button', { type: 'button', class: 'button', id: 'reset-filters', text: 'Reset filters' })));
  } else {
    const frag = document.createDocumentFragment();
    list.slice(0, state.limit).forEach(v => frag.append(buildCard(v)));
    if (list.length > state.limit) {
      frag.append(el('div', { class: 'load-more-wrap' },
        el('button', { type: 'button', class: 'button', id: 'load-more',
          text: `Show more (${list.length - state.limit} left)` })));
    }
    container.append(frag);
  }
  const count = document.getElementById('results-count');
  if (count) count.textContent = `Showing ${list.length} vehicle${list.length === 1 ? '' : 's'}`;
}

function updateStats() {
  const total = state.all.length;
  const sold = state.all.filter(isSold).length;
  const set = (id, n) => { const e = document.getElementById(id); if (e) e.textContent = n; };
  set('total-count', total);
  set('available-count', total - sold);
  set('sold-count', sold);
}

function updateFilterButtons() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    const { group, value } = btn.dataset;
    const active = state[group] === value;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', active);
    const n = group === 'status'
      ? state.all.filter(v => value === 'all' || (value === 'sold') === isSold(v)).length
      : state.all.filter(v => value === 'all' || fuelOf(v) === value).length;
    let badge = btn.querySelector('.filter-count');
    if (!badge) { badge = el('span', { class: 'filter-count' }); btn.append(badge); }
    badge.textContent = n;
  });
}

function setupControls() {
  document.querySelectorAll('.filter-btn').forEach(btn =>
    btn.addEventListener('click', () => {
      state[btn.dataset.group] = btn.dataset.value;
      updateFilterButtons();
      resetAndRender();
    }));

  const search = document.getElementById('vehicle-search');
  if (search) {
    let t;
    search.addEventListener('input', () => {
      clearTimeout(t);
      t = setTimeout(() => { state.query = search.value; resetAndRender(); }, 150);
    });
  }
  const sort = document.getElementById('vehicle-sort');
  if (sort) sort.addEventListener('change', () => { state.sort = sort.value; resetAndRender(); });

  const container = document.getElementById('vehicle-cards-container');

  container.addEventListener('click', e => {
    const t = e.target;
    if (t.closest('#reset-filters')) {
      Object.assign(state, { status: 'all', fuel: 'all', query: '', sort: 'default' });
      if (search) search.value = '';
      if (sort) sort.value = 'default';
      updateFilterButtons(); render(); return;
    }
    const toggle = t.closest('.feature-toggle');
    if (toggle) {
      const block = toggle.closest('.feature-block');
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      block.querySelectorAll('.feature-chip').forEach((c, i) => { c.hidden = !open && i >= FEATURES_VISIBLE; });
      toggle.setAttribute('aria-expanded', open);
      toggle.textContent = open ? 'Show less' : `Show ${toggle.dataset.more} more`;
      return;
    }

    const gallery = t.closest('.vehicle-gallery');
    if (!gallery) return;
    const track = gallery.querySelector('.vehicle-images');
    const w = track.clientWidth;
    const current = Math.round(track.scrollLeft / w);

    if (t.closest('.gallery-arrow')) {
      hydrate(track);
      const dir = t.closest('.gallery-arrow').classList.contains('next') ? 1 : -1;
      const next = Math.min(track.children.length - 1, Math.max(0, current + dir));
      track.scrollTo({ left: next * w, behavior: scrollBehavior });
    } else if (t.closest('.dot-btn')) {
      hydrate(track);
      track.scrollTo({ left: Number(t.closest('.dot-btn').dataset.index) * w, behavior: scrollBehavior });
    } else if (t.matches('img.zoomable')) {
      openZoom([...track.children].map(i => i.getAttribute('src')), Number(t.dataset.index));
    }
  });

  // First touch / hover / focus on a gallery loads that card's remaining photos
  const wake = e => {
    const g = e.target.closest && e.target.closest('.vehicle-gallery');
    if (g) hydrate(g.querySelector('.vehicle-images'));
  };
  ['pointerover', 'touchstart', 'focusin'].forEach(ev =>
    container.addEventListener(ev, wake, { passive: true }));

  // Keep the photo counter and dots in sync while scrolling
  let raf;
  container.addEventListener('scroll', e => {
    const track = e.target;
    if (!track.classList || !track.classList.contains('vehicle-images')) return;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const i = Math.round(track.scrollLeft / track.clientWidth);
      const gallery = track.closest('.vehicle-gallery');
      const counter = gallery.querySelector('.photo-count');
      if (counter) counter.textContent = `${i + 1} / ${track.children.length}`;
      gallery.querySelectorAll('.dot-btn').forEach((d, n) => d.classList.toggle('active', n === i));
    });
  }, true);

  container.addEventListener('error', e => {
    if (e.target.tagName === 'IMG' && e.target.src !== PLACEHOLDER) e.target.src = PLACEHOLDER;
  }, true);
}

/* ---------- zoom overlay ---------- */
const zoom = { imgs: [], i: 0 };

function openZoom(imgs, i) {
  const overlay = document.getElementById('image-zoom-overlay');
  if (!overlay) return;
  zoom.imgs = imgs;
  zoom.i = i;
  if (!overlay.querySelector('.zoom-close')) {
    overlay.append(
      el('button', { type: 'button', class: 'zoom-close', 'aria-label': 'Close', text: 'Close' }),
      el('button', { type: 'button', class: 'zoom-nav zoom-prev', 'aria-label': 'Previous photo', text: '<' }),
      el('button', { type: 'button', class: 'zoom-nav zoom-next', 'aria-label': 'Next photo', text: '>' }),
      el('span', { class: 'zoom-counter' }));
  }
  showZoom();
  overlay.style.display = 'flex';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  document.body.style.overflow = 'hidden';
}

function showZoom() {
  const overlay = document.getElementById('image-zoom-overlay');
  overlay.querySelector('img').src = zoom.imgs[zoom.i];
  overlay.querySelector('.zoom-counter').textContent = `${zoom.i + 1} / ${zoom.imgs.length}`;
  const single = zoom.imgs.length < 2;
  overlay.querySelectorAll('.zoom-nav').forEach(b => { b.hidden = single; });
}

function stepZoom(d) {
  const n = zoom.imgs.length;
  zoom.i = (zoom.i + d + n) % n;
  showZoom();
}

function closeZoom() {
  const overlay = document.getElementById('image-zoom-overlay');
  if (!overlay) return;
  overlay.style.display = 'none';
  document.body.style.overflow = '';
}

function setupZoom() {
  const overlay = document.getElementById('image-zoom-overlay');
  if (!overlay) return;
  overlay.addEventListener('click', e => {
    if (e.target.closest('.zoom-prev')) return stepZoom(-1);
    if (e.target.closest('.zoom-next')) return stepZoom(1);
    closeZoom();
  });
  document.addEventListener('keydown', e => {
    if (overlay.style.display !== 'flex') return;
    if (e.key === 'Escape') closeZoom();
    if (e.key === 'ArrowLeft') stepZoom(-1);
    if (e.key === 'ArrowRight') stepZoom(1);
  });
}

/* ---------- boot ---------- */
async function loadVehicles() {
  const container = document.getElementById('vehicle-cards-container');
  try {
    const res = await fetch(DATA_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.all = await res.json();
    updateStats();
    updateFilterButtons();
    render();
  } catch (err) {
    console.error('Could not load vehicles:', err);
    container.replaceChildren(el('div', { class: 'empty-state' },
      el('p', { text: "We couldn't load the inventory. Please check your connection and try again." }),
      el('button', { type: 'button', class: 'button', id: 'retry-load', text: 'Try again' })));
    document.getElementById('retry-load').addEventListener('click', loadVehicles);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setupControls();
  setupZoom();
  loadVehicles();
});