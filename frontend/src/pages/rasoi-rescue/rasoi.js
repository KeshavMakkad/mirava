/**
 * Rasoi Rescue — imperative engine ported from legacy rasoi-rescue.html.
 * A small hash-routed app (#/, #/cookbook[/id], #/cook/id, #/record, #/vault)
 * rendered into the `main#app` element inside `root`. The header, footer and
 * toast markup are React (see index.tsx).
 *
 * Storage: bookmarks / cooked marks / last page → account state `rasoiFavourites`
 * (via ctx.loadState/saveState). Family recipes with their audio & photo blobs
 * stay in this browser's IndexedDB (binary media is too large for the state API).
 */
import { SEED } from './data.js'

/**
 * @param {HTMLElement} root
 * @param {import('../../lib/legacy').LegacyContext} ctx
 */
export function initRasoi(root, ctx) {
/** @type {Array<() => void>} */
const cleanups = [];

// ----------------------------------------------------------
// DATA LAYER
// ----------------------------------------------------------
let disposed = false;
const $ = (s, scope = root) => scope.querySelector(s);
const $$ = (s, scope = root) => Array.from(scope.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

let toastTimer = 0;
const toast = t => {
  if (disposed) return;
  const el = $('#toast');
  el.textContent = t;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
};

let db = null;
const memory = { recipes: {}, blobs: {} };
let cache = [];
let urls = [];
const regions = [...new Set(SEED.map(r => r.region))].sort();
let filters = { q: '', region: '', category: '', kind: 'all' };

const state = {
  recorder: null,
  stream: null,
  chunks: [],
  blob: null,
  recordURL: null,
  ctx: null,
  analyser: null,
  raf: 0,
  started: 0,
  acc: 0,
  mode: 'idle',
  cook: null,
  index: 0,
  checked: new Set()
};

// IndexedDB helpers
function openDB() {
  return new Promise(resolve => {
    try {
      const req = indexedDB.open('rasoi_rescue', 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains('recipes'))
          req.result.createObjectStore('recipes', { keyPath: 'id' });
        if (!req.result.objectStoreNames.contains('blobs'))
          req.result.createObjectStore('blobs', { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch (e) { resolve(null); }
  });
}

function op(store, mode, action) {
  if (!db) {
    const m = memory[store];
    if (action.type === 'all') return Promise.resolve(Object.values(m));
    if (action.type === 'get') return Promise.resolve(m[action.key]);
    if (action.type === 'put') { m[action.value.id] = action.value; return Promise.resolve(); }
    if (action.type === 'delete') { delete m[action.key]; return Promise.resolve(); }
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const obj = tx.objectStore(store);
    let req;
    if (action.type === 'all') req = obj.getAll();
    if (action.type === 'get') req = obj.get(action.key);
    if (action.type === 'put') req = obj.put(action.value);
    if (action.type === 'delete') req = obj.delete(action.key);
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
  });
}

const all = s => op(s, 'readonly', { type: 'all' });
const get = (s, key) => op(s, 'readonly', { type: 'get', key });
const put = (s, value) => op(s, 'readwrite', { type: 'put', value });
const remove = (s, key) => op(s, 'readwrite', { type: 'delete', key });

async function blobURL(id) {
  if (!id) return '';
  const v = await get('blobs', id);
  if (!v) return '';
  const url = URL.createObjectURL(v.blob);
  urls.push(url);
  return url;
}

async function refresh() {
  const mine = (await all('recipes')).sort((a, b) => b.created - a.created);
  cache = [...mine, ...SEED];
  for (const r of cache) {
    if (r.photoId) r.photoURL = await blobURL(r.photoId);
  }
}

// ----------------------------------------------------------
// PHOTO LIBRARY
// ----------------------------------------------------------
const photoFor = r => {
  const pics = {
    'Dessert': 'photo-1488477181946-6428a0291777',
    'Breakfast': 'photo-1533089860892-a7c6f0a88666',
    'Snack': 'photo-1601050690597-df0568f70950',
    'Bread': 'photo-1509440159596-0249088772ff',
    'Drink': 'photo-1544787219-7f47ccb76574',
    'Side': 'photo-1547592180-85f173990554',
    'Main Course': 'photo-1546833999-b9f581a1996d'
  };
  return 'https://images.unsplash.com/' + (pics[r.category] || pics['Main Course']) + '?auto=format&fit=crop&w=650&q=75';
};

// ----------------------------------------------------------
// RENDER: HOME
// ----------------------------------------------------------
function hero() {
  return `
    <section class="hero">
      <div class="wrap hero-grid">
        <div>
          <div class="eyebrow">A Mirava heritage initiative</div>
          <h1>Every recipe<br>has a <em>story.</em></h1>
          <p class="hero-copy">Save the dishes you grew up with. Keep the original voice, the handwritten wisdom, and the memories behind every family meal.</p>
          <div class="actions">
            <a class="btn primary" href="#/cookbook">${bookIcon('book')} Open the recipe book &rarr;</a>
            <a class="btn secondary" href="#/record">Preserve a family recipe &rarr;</a>
          </div>
          <div class="hero-stats">
            <div><strong>${SEED.length}+</strong><span>regional dishes to explore</span></div>
            <div><strong>${regions.length}</strong><span>culinary regions</span></div>
            <div><strong>∞</strong><span>memories worth keeping</span></div>
          </div>
        </div>
        <div class="hero-art" aria-hidden="true">
          <div class="photo-card"><img src="https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=700&q=85" alt=""></div>
          <div class="photo-card"><img src="https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=700&q=85" alt=""></div>
          <div class="photo-card"><img src="https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=700&q=85" alt=""></div>
        </div>
      </div>
    </section>

  `;
}

function card(r) {
  return `
    <article class="recipe-card">
      <div class="recipe-image">
        <img loading="lazy" src="${esc(r.photoURL || photoFor(r))}" alt="Food photograph representing ${esc(r.name)}">
        <span class="tag">${r.demo ? '✦ Regional collection' : '♥ Family recipe'}</span>
      </div>
      <div class="recipe-body">
        <div class="eyebrow" style="font-size:9px">${esc(r.region)}</div>
        <h3>${esc(r.name)}</h3>
        <p>${esc(r.category || 'Family recipe')} · ${esc(r.by)}</p>
        <div class="card-foot">
          <span>◷ ${r.mins || '?'} min</span>
          <span>${r.audioId ? '♫ Voice saved' : '✧ ' + (r.demo ? 'Sample' : 'No voice')}</span>
        </div>
        <a href="#/cookbook/${encodeURIComponent(r.id)}" class="btn dark small">Read in the book &rarr;</a>
      </div>
    </article>
  `;
}

function home() {
  return hero() + `
    <section class="section">
      <div class="wrap">
        <div class="eyebrow">How it works</div>
        <div class="section-head">
          <h2>From their kitchen<br>to your forever.</h2>
          <p>One small recording today can become a family heirloom tomorrow. Your recordings stay private in this browser.</p>
        </div>
        <div class="feature-grid">
          <div class="feature">
            <div class="num">01</div>
            <h3>Capture their voice</h3>
            <p>Record a loved one sharing a recipe, or upload an existing audio recording.</p>
          </div>
          <div class="feature">
            <div class="num">02</div>
            <h3>Write the details</h3>
            <p>Listen and preserve the actual ingredients, steps, special tips and family story.</p>
          </div>
          <div class="feature">
            <div class="num">03</div>
            <h3>Cook with memories</h3>
            <p>Follow each step while their voice plays beside you. Keep it in your private vault.</p>
          </div>
        </div>
      </div>
    </section>
    <section class="story-band">
      <div class="wrap story-grid">
        <div>
          <div class="eyebrow" style="color:#ffd69a">More than food</div>
          <h2>Some voices deserve to be <em style="color:#ffce83">heard forever.</em></h2>
          <p>It was never just about how much salt to add. It was the way she said “just a little more,” and the stories she told while the pot simmered.</p>
          <blockquote>“A recipe is a memory you can make again.”</blockquote>
          <a href="#/record" class="btn primary">Start your family collection →</a>
        </div>
        <div class="story-note">
          <span class="tag">An illustrative family memory</span>
          <h3>Nani's Sunday kitchen</h3>
          <p>“The secret was always patience. Let the onions turn golden, and let everyone gather around the table.”</p>
          <span class="muted">— A fictional example of a memory you could preserve</span>
        </div>
      </div>
    </section>
    <section class="section">
      <div class="wrap">
        ${bookInvitation()}
      </div>
    </section>
  `;
}

// ----------------------------------------------------------
// RENDER: COOKBOOK
// ----------------------------------------------------------
// ----------------------------------------------------------
// THE LIVING RECIPE BOOK
// A dependency-free reader over the EXISTING recipe cache.
// Bookmarks/cooked marks/reading position: Mirava account state
// (key `rasoiFavourites`). Family recipes and their media: IndexedDB.
// ----------------------------------------------------------
const STATE_KEY = 'rasoiFavourites';
let saveTimer = 0;
// Debounced write of bookmarks, cooked marks and the last open page.
function bookPersist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    ctx.saveState(STATE_KEY, { bookmarks: [...book.saved], cooked: [...book.cooked], last: book.activeId || '' });
  }, 600);
  return !!ctx.me;
}
async function bookLoadState() {
  const v = await ctx.loadState(STATE_KEY);
  if (!v || typeof v !== 'object') return;
  const strings = a => Array.isArray(a) ? a.filter(x => typeof x === 'string') : [];
  book.saved = new Set(strings(v.bookmarks));
  book.cooked = new Set(strings(v.cooked));
  if (typeof v.last === 'string') book.activeId = v.last;
}
const book = {
  found: [], index: 0, activeId: '',
  saved: new Set(),
  cooked: new Set(),
  checked: new Map(), cover: false, animation: null, controller: null,
  mediaURL: '', mediaToken: 0, previousOverflow: '', touch: null
};
const bookCategories = [
  ['', 'All pages'], ['Main Course', 'Mains'], ['Breakfast', 'Breakfast'],
  ['Bread', 'Breads'], ['Snack', 'Snacks'], ['Dessert', 'Sweets'],
  ['Side', 'Sides'], ['Drink', 'Drinks']
];
const bookIcons = {
  book: '<path d="M12 5c-3-2-7-2-10-1v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1Z"/><path d="M12 5v15M5 8h4M15 8h4M5 11h4M15 11h4"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  bookmark: '<path d="M6 3h12v19l-6-4-6 4Z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  left: '<path d="m14 6-6 6 6 6M8 12h13"/>',
  right: '<path d="m10 6 6 6-6 6M3 12h13"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  list: '<path d="M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01"/>',
  pot: '<path d="M5 10h14v6a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5ZM3 10h18M2 12v3h3M19 12h3v3h-3M8 6c-3-2 2-3 0-5M13 7c-3-2 2-3 0-5M17 6c-2-1 2-2 0-4"/>',
  star: '<path d="m12 2 2.6 6.9L22 12l-7.4 3.1L12 22l-2.6-6.9L2 12l7.4-3.1Z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  voice: '<path d="M4 9v6M8 5v14M12 2v20M16 6v12M20 9v6"/>',
  leaf: '<path d="M19 3c-8 0-14 3-14 10a6 6 0 0 0 6 6c7 0 8-8 8-16ZM4 21 15 9M9 16V9M9 16h6"/>'
};
const bookIcon = name => `<svg class="rrb-icon" viewBox="0 0 24 24" aria-hidden="true">${bookIcons[name] || bookIcons.book}</svg>`;
const bookNumber = n => String(n).padStart(3, '0');
const bookPage = r => Math.max(0, cache.findIndex(x => x.id === r.id)) * 2 + 1;
const bookSearchText = r => [r.name, r.region, r.category, r.by, ...(r.ingredients || []).map(i => i.n)].join(' ').toLowerCase();

function bookCover(home = false) {
  const opening = home
    ? '<a class="rrb-cover" href="#/cookbook" aria-label="Open the Rasoi Rescue recipe book">'
    : '<button type="button" class="rrb-cover" data-book-action="open" aria-label="Open the Rasoi Rescue recipe book">';
  return `${opening}
    <span class="rrb-cover-edition">The living cookbook &middot; Vol. I</span>
    <span class="rrb-cover-title">Rasoi<em>Rescue</em></span>
    <span class="rrb-cover-subtitle">Recipes that remember.</span>
    <svg class="rrb-cover-ornament" viewBox="0 0 100 90" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true">
      <path d="M50 83V15M50 68C29 69 21 54 19 44c21 0 29 13 31 24ZM50 68c21 1 29-14 31-24-21 0-29 13-31 24ZM50 48C34 46 28 32 28 23c17 3 22 17 22 25ZM50 48c16-2 22-16 22-25-17 3-22 17-22 25ZM50 29c-12-9-8-21 0-27 8 6 12 18 0 27ZM32 82h36"/>
      <path d="m10 23 3 5 5 3-5 3-3 5-3-5-5-3 5-3Zm78 42 2 4 5 2-5 2-2 4-2-4-4-2 4-2Z" stroke-width=".8"/>
    </svg>
    <span class="rrb-cover-line"></span>
    <span class="rrb-cover-bottom">${SEED.length} regional recipes<br>A lifetime of family stories</span>
    <span class="rrb-cover-open">Open the book ${bookIcon('right')}</span>
  ${home ? '</a>' : '</button>'}`;
}

function bookInvitation() {
  return `<div class="rrb-invitation">
    <div>
      <div class="eyebrow">A new chapter for old favourites</div>
      <h2>Not just recipes.<br>A book of <em>memories.</em></h2>
      <p>Turn a page and find your next family favourite. Ingredients on one side, the method on the other &mdash; just like the cookbook in your kitchen.</p>
      <a class="btn dark" href="#/cookbook">${bookIcon('book')} Open the recipe book &rarr;</a>
      <div class="rrb-invitation-meta">
        <div><b>${SEED.length}</b><span>Regional recipes</span></div>
        <div><b>${regions.length}</b><span>Culinary regions</span></div>
        <div><b>Yours</b><span>Family pages</span></div>
      </div>
    </div>
    <div class="rrb-cover-scene">${bookCover(true)}</div>
  </div>`;
}

function cookbook() {
  const allRegions = [...new Set(cache.map(r => r.region))].sort();
  return `
    <section class="rrb-book-section" aria-labelledby="rrb-heading">
      <div class="wrap">
        <div class="rrb-heading">
          <div>
            <div class="eyebrow">The living cookbook</div>
            <h2 id="rrb-heading">A little taste of <em>home.</em></h2>
            <p>Turn the pages. Rediscover a favourite. Keep the story alive.</p>
          </div>
          <div class="rrb-volume">${bookIcon('book')}<div><b>Recipes that remember.</b><span>${SEED.length} regional recipes &middot; ${regions.length} regions</span></div></div>
        </div>
        <div class="rrb-toolbar" role="search" aria-label="Search and filter the recipe book">
          <button class="rrb-tool rrb-contents-toggle" type="button" data-book-action="contents" aria-haspopup="dialog">${bookIcon('list')} Contents</button>
          <label class="rrb-search">${bookIcon('search')}<span class="rrb-sr">Search recipes, ingredients or regions</span><input id="rrb-search" type="search" autocomplete="off" placeholder="Find a recipe or ingredient..." value="${esc(filters.q)}"></label>
          <label class="rrb-region-label"><span class="rrb-sr">Filter by region</span><select class="rrb-select" id="rrb-region"><option value="">Every region</option>${allRegions.map(r => `<option value="${esc(r)}" ${filters.region === r ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select></label>
          <label class="rrb-collection-label"><span class="rrb-sr">Choose a recipe collection</span><select class="rrb-select" id="rrb-collection">${[['all','The whole collection'],['sample','Regional recipes'],['mine','My family pages'],['bookmarked','My bookmarks'],['voice','With original voice']].map(([v,t]) => `<option value="${v}" ${filters.kind === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
          <button class="rrb-tool rrb-cover-toggle" type="button" data-book-action="cover" aria-label="Show the book cover" title="Show the book cover">${bookIcon('book')}<span>Cover</span></button>
        </div>
        <div class="rrb-statusbar">
          <span id="rrb-count" class="rrb-count"></span>
          <div class="rrb-status-right"><span id="rrb-saved-count"></span><button class="rrb-quiet" type="button" id="rrb-clear" data-book-action="clear" hidden>Clear filters</button></div>
        </div>
        <div class="rrb-tabs" role="group" aria-label="Recipe chapters">
          ${bookCategories.map(([v,t]) => `<button class="rrb-tab ${filters.category === v ? 'active' : ''}" type="button" data-book-category="${v}" aria-pressed="${filters.category === v}">${t}</button>`).join('')}
        </div>
        <div class="rrb-desk" id="rrb-desk">
          <div id="rrb-host" style="scroll-margin-top:92px"></div>
          <div class="rrb-controls" id="rrb-controls" aria-label="Turn cookbook pages">
            <button class="rrb-turn-button" type="button" id="rrb-prev" data-book-action="previous" aria-label="Previous recipe">${bookIcon('left')}<span><small>Previous recipe</small><b id="rrb-prev-title"></b></span></button>
            <div class="rrb-pagination">
              <label for="rrb-page-input">Recipe <input id="rrb-page-input" type="number" min="1" step="1" inputmode="numeric" aria-label="Jump to recipe number"> of <span id="rrb-total"></span></label>
              <div class="rrb-progress-track" aria-hidden="true"><div id="rrb-reading-progress"></div></div>
              <p id="rrb-folios"></p>
            </div>
            <button class="rrb-turn-button" type="button" id="rrb-next" data-book-action="next" aria-label="Next recipe"><span><small>Next recipe</small><b id="rrb-next-title"></b></span>${bookIcon('right')}</button>
          </div>
        </div>
        <p class="rrb-book-note">${bookIcon('leaf')} Made to be used, loved and passed on. Bookmarks are kept with your Mirava account.</p>
        <p class="rrb-sr" id="rrb-live" role="status" aria-live="polite" aria-atomic="true"></p>
        <dialog class="rrb-index" id="rrb-index" aria-labelledby="rrb-index-heading">
          <div class="rrb-index-shell">
            <div class="rrb-index-head">
              <div class="rrb-index-title"><div><p>Find your next favourite</p><h3 id="rrb-index-heading">The contents.</h3></div><button type="button" data-book-action="close-index" aria-label="Close contents">${bookIcon('close')}</button></div>
              <label class="rrb-search">${bookIcon('search')}<span class="rrb-sr">Search all cookbook contents</span><input id="rrb-index-search" type="search" placeholder="Search all chapters..." autocomplete="off"></label>
            </div>
            <div class="rrb-index-body" id="rrb-index-body"></div>
            <div class="rrb-index-foot" id="rrb-index-count"></div>
          </div>
        </dialog>
      </div>
    </section>`;
}

function bookSpread(r) {
  const ingredients = Array.isArray(r.ingredients) ? r.ingredients : [];
  const steps = Array.isArray(r.steps) ? r.steps : [];
  const checked = book.checked.get(r.id) || new Set();
  const chapters = [...new Set(cache.map(x => x.region))];
  const chapter = String(chapters.indexOf(r.region) + 1).padStart(2, '0');
  const page = bookPage(r);
  const saved = book.saved.has(r.id);
  const cooked = book.cooked.has(r.id);
  return `<article class="rrb-frame" aria-label="${esc(r.name)} recipe spread">
    <div class="rrb-spread">
      <section class="rrb-page rrb-page-left" aria-labelledby="rrb-recipe-title">
        <div class="rrb-running"><span>Rasoi Rescue &middot; The living cookbook</span>${bookIcon('leaf')}</div>
        <p class="rrb-chapter-label">${r.demo ? 'Chapter ' + chapter : 'From your family kitchen'} &nbsp;/&nbsp; ${esc(r.region)}</p>
        <h3 class="rrb-title" id="rrb-recipe-title">${esc(r.name)}</h3>
        <div class="rrb-recipe-meta"><span>${esc(r.category || 'Family recipe')}</span><span>${bookIcon('clock')}${r.mins ? '~' + esc(r.mins) + ' min' : 'Time not recorded'}</span>${r.audioId ? `<span>${bookIcon('voice')} Family voice</span>` : ''}</div>
        <figure class="rrb-photo">
          <div class="rrb-photo-fallback" aria-hidden="true">${bookIcon('pot')}</div>
          <img src="${esc(r.photoURL || photoFor(r))}" alt="${r.photoURL ? esc(r.name) + ' - saved family photograph' : 'Representative kitchen photograph, not the specific dish'}" decoding="async">
          <figcaption>${r.photoURL ? 'From the family album' : 'Kitchen inspiration / representative photo'}</figcaption>
        </figure>
        <div class="rrb-small-title"><h4>What you&rsquo;ll need</h4><span id="rrb-checked-count">${checked.size}/${ingredients.length} ready</span></div>
        <ul class="rrb-ingredients">
          ${ingredients.map((i,k) => `<li><label class="rrb-ingredient"><input type="checkbox" data-book-ingredient="${k}" ${checked.has(k) ? 'checked' : ''}><span>${i.q ? '<b>' + esc(i.q) + '</b> ' : ''}${esc(i.n)}</span></label></li>`).join('')}
        </ul>
        <p class="rrb-source-note">${r.demo ? 'From the regional kitchen collection. Home-style variations are welcome.' : 'Preserved by ' + esc(r.by) + '. Your family recipe, kept on this device.'}</p>
        <div class="rrb-page-footer"><span>${esc(r.region)} &middot; ${esc(r.lang || 'Family kitchen')}</span><span class="rrb-page-number">${bookNumber(page)}</span></div>
      </section>
      <section class="rrb-page rrb-page-right" aria-labelledby="rrb-method-heading">
        <button class="rrb-ribbon" type="button" data-book-action="bookmark" aria-pressed="${saved}" aria-label="${saved ? 'Remove bookmark' : 'Bookmark this recipe'}" title="${saved ? 'Remove bookmark' : 'Bookmark this recipe'}">${bookIcon('bookmark')}</button>
        <div class="rrb-running" style="padding-right:30px"><span>A little patience. A lot of love.</span><span>&#10022;</span></div>
        <div class="rrb-method-title"><h4 id="rrb-method-heading">In the kitchen.</h4><span>${String(steps.length).padStart(2,'0')} steps</span></div>
        <ol class="rrb-method">${steps.map(s => `<li><p>${esc(s)}</p></li>`).join('')}</ol>
        ${r.tips ? `<aside class="rrb-family-tip"><h5>${bookIcon('star')} A note from the kitchen</h5><p>${esc(r.tips)}</p></aside>` : ''}
        ${r.story ? `<details class="rrb-story" ${r.demo ? '' : 'open'}><summary>The story behind the dish</summary><p>${esc(r.story)}</p>${r.by ? '<p>Preserved by ' + esc(r.by) + '</p>' : ''}</details>` : ''}
        ${r.audioId ? '<div class="rrb-audio-box" id="rrb-audio-slot" aria-live="polite">Loading the saved family voice...</div>' : ''}
        <div class="rrb-page-actions">
          <a class="rrb-tool rrb-primary" href="#/cook/${encodeURIComponent(r.id)}">${bookIcon('pot')} Cook along ${bookIcon('right')}</a>
          <button class="rrb-tool" type="button" data-book-action="cooked" aria-pressed="${cooked}">${bookIcon('check')}<span>${cooked ? 'Cooked with love' : 'Mark as cooked'}</span></button>
        </div>
        <div class="rrb-page-footer"><span>Recipes that remember.</span><span class="rrb-page-number">${bookNumber(page + 1)}</span></div>
      </section>
    </div>
  </article>`;
}

function bookSyncFilters() {
  if (!$('#rrb-search')) return;
  $('#rrb-search').value = filters.q;
  $('#rrb-region').value = filters.region;
  $('#rrb-collection').value = filters.kind;
  $$('[data-book-category]').forEach(el => {
    const active = el.dataset.bookCategory === filters.category;
    el.classList.toggle('active', active);
    el.setAttribute('aria-pressed', String(active));
  });
}
function filterBook(preferred = book.activeId) {
  const q = filters.q.trim().toLowerCase();
  book.found = cache.filter(r =>
    (!q || bookSearchText(r).includes(q)) &&
    (!filters.region || r.region === filters.region) &&
    (!filters.category || r.category === filters.category) &&
    (filters.kind === 'all' ||
      (filters.kind === 'mine' && !r.demo) ||
      (filters.kind === 'sample' && r.demo) ||
      (filters.kind === 'voice' && r.audioId) ||
      (filters.kind === 'bookmarked' && book.saved.has(r.id)))
  );
  book.index = Math.max(0, book.found.findIndex(r => r.id === preferred));
  bookSyncFilters();
  renderBook();
}
function bookClearFilters() {
  filters = { q: '', region: '', category: '', kind: 'all' };
  book.cover = false;
  filterBook();
}
function bookReleaseMedia() {
  book.mediaToken++;
  if (book.mediaURL) URL.revokeObjectURL(book.mediaURL);
  book.mediaURL = '';
}
async function bookLoadVoice(r) {
  if (!r.audioId) return;
  const token = book.mediaToken;
  try {
    const item = await get('blobs', r.audioId);
    const slot = $('#rrb-audio-slot');
    if (token !== book.mediaToken || !slot || r.id !== book.activeId) return;
    if (!item || !(item.blob instanceof Blob)) {
      slot.textContent = 'This recording is not available in this browser.';
      return;
    }
    book.mediaURL = URL.createObjectURL(item.blob);
    slot.innerHTML = `<label for="rrb-voice">${bookIcon('voice')} The original family voice</label><audio id="rrb-voice" controls preload="metadata" src="${book.mediaURL}"></audio>`;
  } catch (_) {
    const slot = $('#rrb-audio-slot');
    if (slot && token === book.mediaToken) slot.textContent = 'The saved recording could not be loaded.';
  }
}
function bookGhost(page) {
  if (!page) return null;
  const clone = page.cloneNode(true);
  clone.removeAttribute('id');
  clone.removeAttribute('aria-labelledby');
  clone.setAttribute('aria-hidden', 'true');
  clone.inert = true;
  $$('[id]', clone).forEach(el => el.removeAttribute('id'));
  $$('*', clone).forEach(el => {
    for (const attr of [...el.attributes]) if (attr.name.startsWith('data-book-')) el.removeAttribute(attr.name);
  });
  $$('audio', clone).forEach(el => el.remove());
  return clone;
}
function bookStopTurn() {
  if (book.animation) book.animation.cancel();
  book.animation = null;
  $$('.rrb-leaf, .rrb-static-leaf').forEach(el => el.remove());
  const frame = $('.rrb-frame');
  if (frame) { frame.classList.remove('rrb-flipping'); frame.removeAttribute('aria-busy'); }
}
function bookAnimate(direction, oldLeft, oldRight) {
  const frame = $('.rrb-frame');
  if (!frame || !oldLeft || !oldRight || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(max-width: 760px)').matches) {
    const animation = frame.animate([{opacity:.6, transform:`translateX(${direction * 8}px)`},{opacity:1,transform:'translateX(0)'}], {duration:200,easing:'ease-out'});
    book.animation = animation;
    animation.finished.then(() => { if (book.animation === animation) book.animation = null; }).catch(() => {});
    return;
  }
  const forward = direction > 0;
  const leaf = document.createElement('div');
  leaf.className = 'rrb-leaf ' + (forward ? 'rrb-forward' : 'rrb-backward');
  leaf.setAttribute('aria-hidden', 'true'); leaf.inert = true;
  const front = document.createElement('div'); front.className = 'rrb-leaf-face';
  const back = document.createElement('div'); back.className = 'rrb-leaf-face rrb-leaf-back';
  front.append(forward ? oldRight : oldLeft);
  back.append(bookGhost($(forward ? '.rrb-page-left' : '.rrb-page-right', frame)));
  leaf.append(front, back);
  const stationary = document.createElement('div');
  stationary.className = 'rrb-static-leaf';
  stationary.setAttribute('aria-hidden', 'true'); stationary.inert = true;
  stationary.style.cssText = `position:absolute;top:9px;bottom:13px;width:calc(50% - 10px);left:${forward ? '10px' : '50%'};z-index:4;overflow:hidden;pointer-events:none`;
  const oldStationary = forward ? oldLeft : oldRight;
  oldStationary.style.minHeight = '100%';
  stationary.append(oldStationary);
  frame.append(stationary, leaf);
  frame.classList.add('rrb-flipping'); frame.setAttribute('aria-busy', 'true');
  const animation = leaf.animate([
    {transform:'rotateY(0deg)', filter:'brightness(1)'},
    {transform:`rotateY(${forward ? -86 : 86}deg)`, filter:'brightness(.91)',offset:.5},
    {transform:`rotateY(${forward ? -180 : 180}deg)`,filter:'brightness(1)'}
  ], {duration:650,easing:'cubic-bezier(.35,.05,.2,1)',fill:'forwards'});
  book.animation = animation;
  const finish = () => {
    leaf.remove(); stationary.remove(); frame.classList.remove('rrb-flipping'); frame.removeAttribute('aria-busy');
    if (book.animation === animation) book.animation = null;
  };
  animation.finished.then(finish).catch(finish);
}

function renderBook(direction = 0) {
  const host = $('#rrb-host');
  if (!host) return;
  bookStopTurn();
  const oldLeft = direction ? bookGhost($('.rrb-page-left', host)) : null;
  const oldRight = direction ? bookGhost($('.rrb-page-right', host)) : null;
  bookReleaseMedia();
  const r = book.found[book.index];
  const activeFilters = !!(filters.q || filters.region || filters.category || filters.kind !== 'all');
  $('#rrb-clear').hidden = !activeFilters;
  $('#rrb-count').textContent = `${book.found.length} recipe${book.found.length === 1 ? '' : 's'} ${activeFilters ? 'in this selection' : 'in your book'}`;
  $('#rrb-saved-count').textContent = `${cache.filter(x => book.saved.has(x.id)).length} bookmarked`;
  $('#rrb-controls').hidden = !r || book.cover;
  $('.rrb-tabs').hidden = book.cover;
  const coverButton = $('[data-book-action="cover"]');
  coverButton.setAttribute('aria-label', book.cover ? 'Return to recipe pages' : 'Show the book cover');
  coverButton.title = book.cover ? 'Return to recipe pages' : 'Show the book cover';
  coverButton.innerHTML = `${bookIcon('book')}<span>${book.cover ? 'Pages' : 'Cover'}</span>`;
  if (book.cover) {
    host.innerHTML = `<div class="rrb-cover-scene">${bookCover()}</div><p class="rrb-cover-help">A collection to come back to. Open where you left off.</p>`;
    $('#rrb-live').textContent = 'Book cover. Select Open the book to return to the recipes.';
    return;
  }
  if (!r) {
    const family = filters.kind === 'mine' || filters.kind === 'voice';
    const bookmarked = filters.kind === 'bookmarked';
    host.innerHTML = `<div class="rrb-empty">${bookIcon(bookmarked ? 'bookmark' : 'book')}<h3>${bookmarked ? 'Your ribbon is waiting.' : family ? 'Your family chapter starts here.' : 'No recipes on these pages.'}</h3><p>${bookmarked ? 'Tap the ribbon on any recipe to keep it in your bookmarked collection.' : family ? 'Preserve a recipe or add an original recording to make these pages your own.' : 'Try another name, ingredient or region, or clear your filters to return to the full book.'}</p><button class="rrb-tool" type="button" data-book-action="clear">Browse the whole book</button>${family ? ' <a class="rrb-tool" href="#/record">Preserve a recipe</a>' : ''}</div>`;
    $('#rrb-live').textContent = 'No matching recipes. Clear the filters or preserve a family recipe.';
    return;
  }
  book.activeId = r.id;
  bookPersist();
  // replaceState gives every recipe a copyable link without triggering
  // the hash router, resetting scroll, or rebuilding the entire site.
  try { history.replaceState(history.state, '', '#/cookbook/' + encodeURIComponent(r.id)); } catch (_) {}
  host.innerHTML = bookSpread(r);
  $$('img', host).forEach(img => img.addEventListener('error', () => { img.style.visibility = 'hidden'; const caption = $('figcaption', img.parentElement); if (caption) caption.textContent = 'From the recipe notebook'; }, {once:true}));
  $('#rrb-prev').disabled = book.index === 0;
  $('#rrb-next').disabled = book.index === book.found.length - 1;
  $('#rrb-prev-title').textContent = book.found[book.index - 1]?.name || 'The beginning';
  $('#rrb-next-title').textContent = book.found[book.index + 1]?.name || 'The last page';
  $('#rrb-page-input').value = book.index + 1;
  $('#rrb-page-input').max = book.found.length;
  $('#rrb-total').textContent = book.found.length;
  $('#rrb-folios').textContent = `PAGES ${bookNumber(bookPage(r))} / ${bookNumber(bookPage(r) + 1)}`;
  $('#rrb-reading-progress').style.width = ((book.index + 1) / book.found.length * 100) + '%';
  $('#rrb-live').textContent = `${r.name}. Recipe ${book.index + 1} of ${book.found.length}. ${r.region}.`;
  if (direction) bookAnimate(direction, oldLeft, oldRight);
  bookLoadVoice(r);
}
function bookTurn(to) {
  if (book.cover || book.animation || !book.found.length) return;
  const index = Math.max(0, Math.min(book.found.length - 1, Math.floor(to)));
  if (!Number.isFinite(index) || index === book.index) return;
  const direction = index > book.index ? 1 : -1;
  book.index = index;
  renderBook(direction);
  if (window.matchMedia('(max-width: 760px)').matches && $('#rrb-host').getBoundingClientRect().top < 0) {
    $('#rrb-host').scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'start'});
  }
}
function bookJump() {
  const input = $('#rrb-page-input');
  const n = Number(input.value);
  if (!Number.isInteger(n) || n < 1 || n > book.found.length) {
    input.value = book.index + 1;
    toast(`Choose a recipe number from 1 to ${book.found.length}`);
    return;
  }
  bookTurn(n - 1);
  input.value = book.index + 1;
}
function bookRenderIndex(q = '') {
  const matches = cache.filter(r => !q.trim() || bookSearchText(r).includes(q.trim().toLowerCase()));
  const grouped = new Map();
  matches.forEach(r => {
    const title = r.demo ? r.region : 'Your family pages';
    if (!grouped.has(title)) grouped.set(title, []);
    grouped.get(title).push(r);
  });
  $('#rrb-index-body').innerHTML = matches.length ? [...grouped.entries()].map(([region, recipes]) => `
    <h4 class="rrb-index-chapter">${esc(region)}</h4>
    ${recipes.map(r => `<button type="button" class="rrb-index-entry" data-book-open="${esc(r.id)}" ${r.id === book.activeId ? 'aria-current="page"' : ''}><strong>${esc(r.name)}</strong>${book.saved.has(r.id) ? bookIcon('bookmark') : ''}<em aria-hidden="true"></em><span aria-label="Page ${bookPage(r)}">${bookNumber(bookPage(r))}</span></button>`).join('')}`).join('')
    : '<p style="padding:24px 0;color:#92765b">No matching recipes. Try another ingredient or name.</p>';
  $('#rrb-index-count').textContent = `${matches.length} recipes / choose a title to turn to its page`;
}
function bookOpenIndex() {
  const dialog = $('#rrb-index');
  $('#rrb-index-search').value = '';
  bookRenderIndex();
  book.previousOverflow = document.body.style.overflow;
  dialog.showModal();
  document.body.style.overflow = 'hidden';
  $('#rrb-index-search').focus();
}
function bookDispose() {
  bookStopTurn();
  bookReleaseMedia();
  const dialog = $('#rrb-index');
  if (dialog?.open) { dialog.close(); document.body.style.overflow = book.previousOverflow; }
  book.controller?.abort();
  book.controller = null;
}
function bindCookbook(requestedId = '') {
  book.controller = new AbortController();
  const signal = book.controller.signal;
  book.cover = false;
  if (requestedId) {
    if (cache.some(r => r.id === requestedId)) {
      book.activeId = requestedId;
      filters = {q:'', region:'', category:'', kind:'all'};
    } else toast('That recipe is not available here. Opening your book instead.');
  }
  const root = $('.rrb-book-section');
  root.addEventListener('click', e => {
    const entry = e.target.closest('[data-book-open]');
    if (entry) {
      $('#rrb-index').close();
      book.activeId = entry.dataset.bookOpen;
      bookClearFilters();
      return;
    }
    const category = e.target.closest('[data-book-category]');
    if (category) { filters.category = category.dataset.bookCategory; book.cover = false; filterBook(); return; }
    const button = e.target.closest('[data-book-action]');
    if (!button || button.disabled) return;
    const action = button.dataset.bookAction;
    if (action === 'previous') return bookTurn(book.index - 1);
    if (action === 'next') return bookTurn(book.index + 1);
    if (action === 'contents') return bookOpenIndex();
    if (action === 'close-index') return $('#rrb-index').close();
    if (action === 'clear') return bookClearFilters();
    if (action === 'cover') { book.cover = !book.cover; renderBook(); return; }
    if (action === 'open') { book.cover = false; renderBook(); return; }
    const r = book.found[book.index];
    if (!r) return;
    if (action === 'bookmark') {
      const saved = !book.saved.has(r.id);
      saved ? book.saved.add(r.id) : book.saved.delete(r.id);
      const persisted = bookPersist();
      toast(persisted ? saved ? 'A ribbon for this recipe. Bookmarked!' : 'Bookmark removed' : 'Bookmark updated for this session; sign in to keep it');
      if (filters.kind === 'bookmarked' && !saved) { filterBook(); return; }
      button.setAttribute('aria-pressed', String(saved));
      button.setAttribute('aria-label', saved ? 'Remove bookmark' : 'Bookmark this recipe');
      button.title = saved ? 'Remove bookmark' : 'Bookmark this recipe';
      $('#rrb-saved-count').textContent = `${cache.filter(x => book.saved.has(x.id)).length} bookmarked`;
    }
    if (action === 'cooked') {
      const cooked = !book.cooked.has(r.id);
      cooked ? book.cooked.add(r.id) : book.cooked.delete(r.id);
      const persisted = bookPersist();
      button.setAttribute('aria-pressed', String(cooked));
      $('span', button).textContent = cooked ? 'Cooked with love' : 'Mark as cooked';
      toast(persisted ? cooked ? 'Another recipe made into a memory.' : 'Cooking mark removed' : 'Cooking mark updated for this session; sign in to keep it');
    }
  }, {signal});
  root.addEventListener('input', e => {
    if (e.target.id === 'rrb-search') { filters.q = e.target.value; book.cover = false; filterBook(); }
    if (e.target.id === 'rrb-index-search') bookRenderIndex(e.target.value);
  }, {signal});
  root.addEventListener('change', e => {
    if (e.target.id === 'rrb-region') { filters.region = e.target.value; book.cover = false; filterBook(); }
    if (e.target.id === 'rrb-collection') { filters.kind = e.target.value; book.cover = false; filterBook(); }
    if (e.target.id === 'rrb-page-input') bookJump();
    if (e.target.matches('[data-book-ingredient]')) {
      const r = book.found[book.index]; if (!r) return;
      if (!book.checked.has(r.id)) book.checked.set(r.id, new Set());
      const set = book.checked.get(r.id), index = Number(e.target.dataset.bookIngredient);
      e.target.checked ? set.add(index) : set.delete(index);
      $('#rrb-checked-count').textContent = `${set.size}/${r.ingredients.length} ready`;
    }
  }, {signal});
  $('#rrb-page-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); bookJump(); }
  }, {signal});
  const dialog = $('#rrb-index');
  dialog.addEventListener('close', () => { document.body.style.overflow = book.previousOverflow; }, {signal});
  dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); }, {signal});
  window.addEventListener('keydown', e => {
    if (dialog.open || book.cover || e.ctrlKey || e.metaKey || e.altKey || /INPUT|TEXTAREA|SELECT|BUTTON|A|AUDIO|SUMMARY/.test(document.activeElement.tagName) || document.activeElement.isContentEditable) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); bookTurn(book.index + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); bookTurn(book.index - 1); }
  }, {signal});
  const host = $('#rrb-host');
  host.addEventListener('touchstart', e => {
    if (e.touches.length !== 1 || e.target.closest('button,a,input,textarea,audio,summary')) { book.touch = null; return; }
    book.touch = {x:e.touches[0].clientX,y:e.touches[0].clientY,time:Date.now()};
  }, {passive:true,signal});
  host.addEventListener('touchend', e => {
    if (!book.touch || !e.changedTouches.length) return;
    const dx = e.changedTouches[0].clientX - book.touch.x, dy = e.changedTouches[0].clientY - book.touch.y;
    if (Date.now() - book.touch.time < 800 && Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.8) bookTurn(book.index + (dx < 0 ? 1 : -1));
    book.touch = null;
  }, {passive:true,signal});
  host.addEventListener('touchcancel', () => { book.touch = null; }, {passive:true,signal});
  filterBook();
}

// ----------------------------------------------------------
// RENDER: RECORD PAGE
// ----------------------------------------------------------
function recordPage() {
  return `
    <section class="section">
      <div class="wrap">
        <div class="eyebrow">Your family archive begins here</div>
        <h2>Save the recipe.<br><em>Keep the voice.</em></h2>
        <p class="muted">Record or upload a loved one's explanation, then carefully transcribe their actual instructions. No AI transcription service is configured in this standalone edition.</p>
        <div class="record-layout">
          <div class="form-card">
            <h3>01 / Capture the voice</h3>
            <canvas id="wave" class="record-wave" aria-label="Live microphone waveform"></canvas>
            <div class="timer" id="timer">00:00</div>
            <div id="record-status" class="muted">Ready to record</div>
            <div class="actions">
              <button class="btn primary small" id="start">● Record</button>
              <button class="btn outline small" id="pause" disabled>Ⅱ Pause</button>
              <button class="btn outline small" id="resume" disabled>▶ Resume</button>
              <button class="btn dark small" id="stop" disabled>■ Stop</button>
            </div>
            <div class="field" style="margin-top:22px">
              <label>Or upload an audio file (max 60 MB)</label>
              <input type="file" id="audio-upload" accept="audio/*">
            </div>
            <div id="preview"></div>
            <div id="rec-message"></div>
            <div class="message">🔒 Saved recordings remain on this device. For permanent preservation, export backups of your family recipes and recordings from the vault.</div>
          </div>
          <div class="form-card">
            <h3>02 / Preserve the details</h3>
            <form id="recipe-form">
              <div class="form-grid">
                <div class="field"><label>Recipe name *</label><input id="name" required placeholder="Nani's Sunday Rajma"></div>
                <div class="field"><label>Shared by *</label><input id="by" required placeholder="Nani"></div>
                <div class="field"><label>Region</label><input id="origin" placeholder="Punjab"></div>
                <div class="field"><label>Cooking time (minutes)</label><input id="mins" type="number" min="1" placeholder="60"></div>
                <div class="field">
                  <label>Category</label>
                  <select id="type">
                    <option>Main Course</option><option>Breakfast</option><option>Snack</option>
                    <option>Dessert</option><option>Bread</option><option>Side</option><option>Drink</option>
                  </select>
                </div>
                <div class="field">
                  <label>Language</label>
                  <select id="language">
                    ${['Hindi','English','Tamil','Telugu','Marathi','Gujarati','Bengali','Punjabi','Kannada','Malayalam','Urdu','Other']
                      .map(x => `<option>${x}</option>`).join('')}
                  </select>
                </div>
                <div class="field wide"><label>Ingredients * (quantity | ingredient, one per line)</label><textarea id="ingredients" rows="4" required placeholder="1 cup | rajma\n2 tbsp | ghee"></textarea></div>
                <div class="field wide"><label>Steps * (one step per line)</label><textarea id="steps" rows="5" required placeholder="Soak the beans overnight.\nCook until tender."></textarea></div>
                <div class="field wide"><label>Secret family tip</label><textarea id="tips" rows="2"></textarea></div>
                <div class="field wide"><label>Story behind the dish</label><textarea id="story" rows="3"></textarea></div>
                <div class="field wide"><label>Transcript (optional, manually entered)</label><textarea id="transcript" rows="3"></textarea></div>
                <div class="field wide"><label>Dish photo (optional)</label><input type="file" id="photo" accept="image/*"></div>
                <label class="wide"><input type="checkbox" id="review" required> I have checked these details against the original source.</label>
                <button class="btn dark wide" type="submit">♥ Save to my family vault</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  `;
}

function updateRecordUI() {
  const mode = state.mode;
  $('#start').disabled = mode !== 'idle';
  $('#pause').disabled = mode !== 'recording';
  $('#resume').disabled = mode !== 'paused';
  $('#stop').disabled = mode === 'idle';
  $('#record-status').textContent =
    mode === 'recording' ? '🔴 Recording' :
    mode === 'paused' ? 'Paused' :
    state.blob ? 'Recording ready' : 'Ready to record';
}

function timer() {
  const ms = state.acc + (state.mode === 'recording' ? performance.now() - state.started : 0);
  const sec = Math.floor(ms / 1000);
  const el = $('#timer');
  if (el) el.textContent = String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0');
}

function wave() {
  const c = $('#wave');
  if (!c || !state.analyser) return;
  const ctx = c.getContext('2d');
  const scale = devicePixelRatio || 1;
  c.width = c.clientWidth * scale;
  c.height = 130 * scale;
  ctx.clearRect(0, 0, c.width, c.height);
  const data = new Uint8Array(state.analyser.frequencyBinCount);
  state.analyser.getByteFrequencyData(data);
  for (let i = 0; i < 55; i++) {
    const v = state.mode === 'recording' ? data[Math.floor(i * data.length / 55)] / 255 : .06;
    const h = Math.max(5, v * c.height * .9);
    ctx.fillStyle = i % 2 ? '#ffbd65' : '#e76e53';
    ctx.fillRect(i * c.width / 55 + 3, (c.height - h) / 2, c.width / 55 - 6, h);
  }
  timer();
  if (state.mode !== 'idle') state.raf = requestAnimationFrame(wave);
}

function setAudio(blob, name) {
  state.blob = blob;
  if (state.recordURL) URL.revokeObjectURL(state.recordURL);
  state.recordURL = URL.createObjectURL(blob);
  $('#preview').innerHTML = `
    <p><b>${esc(name)}</b></p>
    <audio class="audio" controls src="${state.recordURL}"></audio>
    <small>${Math.round(blob.size / 1024)} KB</small>
  `;
  updateRecordUI();
}

async function startRecording() {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    $('#rec-message').innerHTML = '<div class="message error">Microphone recording is unavailable. Try HTTPS or localhost, or upload audio instead.</div>';
    return;
  }
  try {
    state.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
    const mime = types.find(t => MediaRecorder.isTypeSupported(t));
    state.recorder = new MediaRecorder(state.stream, mime ? { mimeType: mime } : undefined);
    state.chunks = [];
    state.recorder.ondataavailable = e => { if (e.data.size) state.chunks.push(e.data); };
    state.recorder.onstop = () => {
      if (state.chunks.length) setAudio(new Blob(state.chunks, { type: state.recorder.mimeType || 'audio/webm' }), 'Family recording');
    };
    state.ctx = new (window.AudioContext || window.webkitAudioContext)();
    state.analyser = state.ctx.createAnalyser();
    state.analyser.fftSize = 256;
    state.ctx.createMediaStreamSource(state.stream).connect(state.analyser);
    state.recorder.start(250);
    state.mode = 'recording';
    state.acc = 0;
    state.started = performance.now();
    updateRecordUI();
    wave();
  } catch (e) {
    $('#rec-message').innerHTML = `<div class="message error">Could not access microphone: ${esc(e.message)}. Check permissions or upload a recording.</div>`;
  }
}

function pauseRecording() {
  state.recorder.pause();
  state.acc += performance.now() - state.started;
  state.mode = 'paused';
  updateRecordUI();
}

function resumeRecording() {
  state.recorder.resume();
  state.started = performance.now();
  state.mode = 'recording';
  updateRecordUI();
}

function stopRecording() {
  if (state.mode === 'recording') state.acc += performance.now() - state.started;
  state.mode = 'idle';
  state.recorder.stop();
  state.stream.getTracks().forEach(t => t.stop());
  state.ctx?.close();
  cancelAnimationFrame(state.raf);
  timer();
  updateRecordUI();
}

function parseIngredients(v) {
  return v.split('\n').map(s => s.trim()).filter(Boolean).map(s => {
    const a = s.split('|');
    return { q: a.length > 1 ? a.shift().trim() : '', n: a.join('|').trim() || s };
  });
}

async function saveRecipe(e) {
  e.preventDefault();
  if (!$('#recipe-form').reportValidity()) return;
  const id = 'family-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
  const v = s => $(s).value.trim();
  const ingredients = parseIngredients(v('#ingredients'));
  const steps = v('#steps').split('\n').map(x => x.trim()).filter(Boolean);
  if (!ingredients.length || !steps.length) { toast('Please add ingredients and steps'); return; }
  const recipe = {
    id,
    name: v('#name'),
    by: v('#by'),
    region: v('#origin') || 'Family kitchen',
    category: v('#type'),
    mins: Number(v('#mins')) || null,
    lang: v('#language'),
    ingredients,
    steps,
    tips: v('#tips'),
    story: v('#story'),
    transcript: v('#transcript'),
    notes: '',
    memory: '',
    visibility: 'private',
    consent: false,
    created: Date.now(),
    demo: false
  };
  try {
    if (state.blob) {
      recipe.audioId = id + '-audio';
      await put('blobs', { id: recipe.audioId, blob: state.blob });
    }
    const photo = $('#photo').files[0];
    if (photo) {
      if (!photo.type.startsWith('image/')) throw Error('Photo must be an image');
      if (photo.size > 15e6) throw Error('Photo must be under 15 MB');
      recipe.photoId = id + '-photo';
      await put('blobs', { id: recipe.photoId, blob: photo });
    }
    await put('recipes', recipe);
    state.blob = null;
    toast('Family recipe saved privately');
    location.hash = '#/vault';
  } catch (err) {
    toast('Could not save: ' + err.message);
  }
}

function bindRecord() {
  $('#start').onclick = startRecording;
  $('#pause').onclick = pauseRecording;
  $('#resume').onclick = resumeRecording;
  $('#stop').onclick = stopRecording;
  $('#audio-upload').onchange = e => {
    const f = e.target.files[0];
    if (!f) return;
    if (!f.type.startsWith('audio/') || f.size > 60e6) { toast('Please choose an audio file under 60 MB'); return; }
    setAudio(f, f.name);
  };
  $('#recipe-form').onsubmit = saveRecipe;
  updateRecordUI();
}

// ----------------------------------------------------------
// RENDER: COOK PAGE
// ----------------------------------------------------------
async function cookPage(id) {
  const r = cache.find(x => x.id === id);
  if (!r) return '<section class="section"><div class="wrap empty">Recipe not found. <a href="#/cookbook">Back to cookbook</a>.</div></section>';
  state.cook = r;
  state.index = 0;
  state.checked = new Set();
  const audio = await blobURL(r.audioId);
  return `
    <section class="section">
      <div class="wrap">
        <a href="#/cookbook/${encodeURIComponent(r.id)}">&larr; Back to the recipe book</a>
        <div class="eyebrow" style="margin-top:22px">Cook with memories</div>
        <h2>${esc(r.name)}</h2>
        <p class="muted">${esc(r.region)} · ${esc(r.by)} · ${r.mins || 'Time not recorded'} min</p>
        <div class="cook-layout">
          <div>
            <div class="progress"><div id="progress"></div></div>
            <div class="muted" id="progress-text"></div>
            <div class="step" style="margin-top:15px">
              <div class="eyebrow" id="step-number"></div>
              <p id="step-text"></p>
              <div class="actions">
                <button class="btn outline" id="previous">← Previous</button>
                <button class="btn primary" id="next">Next step →</button>
              </div>
            </div>
            ${r.tips ? `<div class="message"><b>Family tip:</b> ${esc(r.tips)}</div>` : ''}
            ${r.story ? `<div class="form-card" style="margin-top:20px"><h3>♥ The story</h3><p>${esc(r.story)}</p></div>` : ''}
          </div>
          <div>
            <div class="form-card">
              <h3>Ingredients checklist</h3>
              ${r.ingredients.map((i, k) => `
                <label class="ingredient">
                  <input type="checkbox" data-ing="${k}">
                  <span><b>${esc(i.q)}</b> ${esc(i.n)}</span>
                </label>
              `).join('')}
            </div>
            <div class="form-card" style="margin-top:20px">
              <h3>♫ The original voice</h3>
              ${audio
                ? `<audio class="audio" id="cook-audio" controls src="${audio}"></audio>
                   <div class="actions">
                     <button class="btn outline small" id="back10">↶ 10 seconds</button>
                     <button class="btn outline small" id="forward10">10 seconds ↷</button>
                   </div>`
                : '<p class="muted">No original voice is attached to this recipe.</p>'}
              <p class="muted" style="font-size:12px">Audio is not automatically synced with the cooking steps.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderStep() {
  const r = state.cook;
  if (!r || !$('#step-text')) return;
  $('#step-number').textContent = `Step ${state.index + 1} of ${r.steps.length}`;
  $('#step-text').textContent = r.steps[state.index];
  $('#previous').disabled = state.index === 0;
  $('#next').textContent = state.index === r.steps.length - 1 ? 'Finish ✓' : 'Next step →';
  const p = Math.round((state.index + state.checked.size) / (r.steps.length + r.ingredients.length) * 100);
  $('#progress').style.width = p + '%';
  $('#progress-text').textContent = `${state.index} steps navigated · ${state.checked.size}/${r.ingredients.length} ingredients checked`;
}

function bindCook() {
  if (!$('#next') || !state.cook) return;
  renderStep();
  $('#previous').onclick = () => { state.index = Math.max(0, state.index - 1); renderStep(); };
  $('#next').onclick = () => {
    if (state.index === state.cook.steps.length - 1) { toast('Enjoy your meal! ♥'); return; }
    state.index++;
    renderStep();
  };
  $$('[data-ing]').forEach(el => el.onchange = () => {
    const k = Number(el.dataset.ing);
    el.checked ? state.checked.add(k) : state.checked.delete(k);
    renderStep();
  });
  if ($('#cook-audio')) {
    $('#back10').onclick = () => { $('#cook-audio').currentTime = Math.max(0, $('#cook-audio').currentTime - 10); };
    $('#forward10').onclick = () => { $('#cook-audio').currentTime += 10; };
  }
}

// ----------------------------------------------------------
// RENDER: VAULT
// ----------------------------------------------------------
async function vaultPage() {
  const mine = cache.filter(r => !r.demo);
  let html = `
    <section class="section">
      <div class="wrap">
        <div class="eyebrow">Private family legacy</div>
        <h2>Your memory vault.</h2>
        <p class="muted">Your personal recipes, voices and memories are stored locally in this browser. Marking a recipe “Shared” does not publish it online.</p>
        <div class="actions">
          <a class="btn dark" href="#/record">+ Preserve another recipe</a>
          <button class="btn outline" id="export-all">↓ Export recipe backup</button>
        </div>
        <div class="sample-warning">
          Audio and photos are <b>not included</b> in the JSON recipe backup. Download them individually below. Keep secure copies outside your browser to avoid accidental loss.
        </div>
  `;
  if (!mine.length) {
    html += '<div class="empty">Your vault is waiting for its first story. <a href="#/record"><u>Preserve a recipe →</u></a></div>';
  }
  for (const r of mine) {
    const audio = await blobURL(r.audioId);
    html += `
      <article class="vault-card" id="vault-${esc(r.id)}">
        <div class="vault-layout">
          <div>
            <div class="eyebrow">${esc(r.region)}</div>
            <h3>${esc(r.name)}</h3>
            <p class="muted">Shared by ${esc(r.by)}</p>
            ${audio
              ? `<audio class="audio" controls src="${audio}"></audio>
                 <a class="btn outline small" href="${audio}" download="${esc(r.name)}-voice.webm">↓ Download audio</a>`
              : '<p class="muted">No recording attached.</p>'}
            ${r.photoURL
              ? `<div><img src="${r.photoURL}" alt="${esc(r.name)}" style="width:180px;max-width:100%;border-radius:12px;margin-top:15px"></div>
                 <a class="btn outline small" href="${r.photoURL}" download="${esc(r.name)}-photo">↓ Download photo</a>`
              : ''}
          </div>
          <div class="form-grid">
            <div class="field wide"><label>Family story</label><textarea data-key="story" rows="3">${esc(r.story)}</textarea></div>
            <div class="field wide"><label>Personal notes</label><textarea data-key="notes" rows="2">${esc(r.notes)}</textarea></div>
            <div class="field wide"><label>Celebration memories</label><textarea data-key="memory" rows="2">${esc(r.memory)}</textarea></div>
            <div class="field">
              <label>Visibility label</label>
              <select data-key="visibility">
                <option value="private" ${r.visibility === 'private' ? 'selected' : ''}>Private</option>
                <option value="shared" ${r.visibility === 'shared' ? 'selected' : ''}>Shared (local label only)</option>
              </select>
            </div>
            <div class="field"><label>Replace photo</label><input data-photo type="file" accept="image/*"></div>
            <label class="wide"><input type="checkbox" data-key="consent" ${r.consent ? 'checked' : ''}> Everyone featured has consented to sharing.</label>
            <div class="actions wide">
              <button class="btn dark small" data-save="${esc(r.id)}">Save changes</button>
              <a class="btn outline small" href="#/cookbook/${encodeURIComponent(r.id)}">Read in the book</a>
              <a class="btn outline small" href="#/cook/${encodeURIComponent(r.id)}">Cook this</a>
              <button class="btn outline small" data-delete="${esc(r.id)}">Delete</button>
            </div>
          </div>
        </div>
      </article>
    `;
  }
  return html + '</div></section>';
}

async function saveVault(id) {
  const el = root.querySelector('#vault-' + CSS.escape(id));
  const r = await get('recipes', id);
  const field = k => $(`[data-key="${k}"]`, el);
  if (field('visibility').value === 'shared' && !field('consent').checked) {
    toast('Consent required to mark shared');
    return;
  }
  for (const k of ['story', 'notes', 'memory', 'visibility']) r[k] = field(k).value.trim();
  r.consent = field('consent').checked;
  const photo = $('[data-photo]', el).files[0];
  try {
    if (photo) {
      if (!photo.type.startsWith('image/') || photo.size > 15e6) throw Error('Choose an image under 15 MB');
      r.photoId = id + '-photo';
      await put('blobs', { id: r.photoId, blob: photo });
    }
    await put('recipes', r);
    toast('Vault updated');
    render();
  } catch (e) { toast(e.message); }
}

async function deleteRecipe(id) {
  if (!confirm('Permanently delete this recipe and its saved media?')) return;
  const r = await get('recipes', id);
  if (r.audioId) await remove('blobs', r.audioId);
  if (r.photoId) await remove('blobs', r.photoId);
  await remove('recipes', id);
  toast('Recipe deleted');
  render();
}

function downloadFile(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  root.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function bindVault() {
  $$('[data-save]').forEach(b => b.onclick = () => saveVault(b.dataset.save));
  $$('[data-delete]').forEach(b => b.onclick = () => deleteRecipe(b.dataset.delete));
  $('#export-all').onclick = () => downloadFile(
    'rasoi-family-recipes.json',
    JSON.stringify(cache.filter(r => !r.demo).map(({ photoURL, ...r }) => r), null, 2),
    'application/json'
  );
}

// ----------------------------------------------------------
// ROUTER
// ----------------------------------------------------------
let rendering = 0;

async function render() {
  const token = ++rendering;
  let route;
  try { route = decodeURIComponent((location.hash || '#/').slice(1)); } catch (_) { route = '/'; }
  bookDispose();

  // Stop recording if navigating away
  if (state.mode !== 'idle' && !route.startsWith('/record')) {
    if (state.recorder?.state !== 'inactive') state.recorder?.stop();
    state.stream?.getTracks().forEach(t => t.stop());
    state.mode = 'idle';
  }

  urls.forEach(u => URL.revokeObjectURL(u));
  urls = [];

  await refresh();
  if (token !== rendering || disposed) return;

  const app = $('#app');
  if (route === '/record') {
    app.innerHTML = recordPage();
    bindRecord();
  } else if (route === '/cookbook' || route.startsWith('/cookbook/')) {
    app.innerHTML = cookbook();
    bindCookbook(route.startsWith('/cookbook/') ? route.slice(10) : '');
  } else if (route.startsWith('/cook/')) {
    const html = await cookPage(route.slice(6));
    if (token !== rendering || disposed) return;
    app.innerHTML = html;
    bindCook();
  } else if (route === '/vault') {
    const html = await vaultPage();
    if (token !== rendering || disposed) return;
    app.innerHTML = html;
    bindVault();
  } else {
    app.innerHTML = home();
  }

  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', render);
cleanups.push(() => window.removeEventListener('hashchange', render));

// Keyboard navigation on cook page
const onCookKey = e => {
  if (!location.hash.startsWith('#/cook/') || /INPUT|TEXTAREA|SELECT|BUTTON/.test(document.activeElement.tagName)) return;
  if (e.key === 'ArrowRight' && $('#next')) $('#next').click();
  if (e.key === 'ArrowLeft' && $('#previous')) $('#previous').click();
};
window.addEventListener('keydown', onCookKey);
cleanups.push(() => window.removeEventListener('keydown', onCookKey));

// ----------------------------------------------------------
// PROGRESSIVE ENHANCEMENT: SCROLL & REVEAL
// ----------------------------------------------------------
(function() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const header = root.querySelector('.top');
  let scheduled = false;

  function onScroll() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      const max = document.documentElement.scrollHeight - innerHeight;
      const progress = max > 0 ? Math.min(100, scrollY / max * 100) : 0;
      if (header) {
        header.style.setProperty('--scroll-progress', progress + '%');
        header.classList.toggle('scrolled', scrollY > 12);
      }
      scheduled = false;
    });
  }

  addEventListener('scroll', onScroll, { passive: true });
  cleanups.push(() => removeEventListener('scroll', onScroll));
  onScroll();

  if (reduced) return;

  const io = new IntersectionObserver(entries => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('motion-visible');
        io.unobserve(e.target);
      }
    }
  }, { threshold: .09, rootMargin: '0px 0px 35px 0px' });

  function register(root) {
    const selector = '.feature,.recipe-card,.section-head,.story-note,.story-grid > div,.form-card,.vault-card,.step';
    const nodes = [];
    if (root.nodeType === 1 && root.matches?.(selector)) nodes.push(root);
    if (root.querySelectorAll) nodes.push(...root.querySelectorAll(selector));
    for (const el of nodes) {
      if (el.dataset.motionReady) return;
      el.dataset.motionReady = '1';
      el.classList.add('reveal-motion');
      io.observe(el);
    }
  }

  cleanups.push(() => io.disconnect());
  register(root);

  const mo = new MutationObserver(mutations => {
    for (const m of mutations)
      for (const n of m.addedNodes)
        if (n.nodeType === 1) register(n);
  });

  mo.observe(root.querySelector('main') || root, { childList: true, subtree: true });
  cleanups.push(() => mo.disconnect());
})();

// ----------------------------------------------------------
// BOOT
// ----------------------------------------------------------
(async () => {
  const [opened] = await Promise.all([openDB(), bookLoadState()]);
  if (disposed) { opened?.close(); return; }
  db = opened;
  if (!db) toast('Browser storage unavailable: recipes last only this session');
  render();
})();

return () => {
  disposed = true;
  rendering++;
  bookDispose();
  // Flush a pending bookmark/position save immediately.
  if (saveTimer) {
    clearTimeout(saveTimer);
    ctx.saveState(STATE_KEY, { bookmarks: [...book.saved], cooked: [...book.cooked], last: book.activeId || '' });
  }
  clearTimeout(toastTimer);
  cancelAnimationFrame(state.raf);
  try { if (state.recorder && state.recorder.state !== 'inactive') { state.recorder.onstop = null; state.recorder.stop(); } } catch (_) {}
  state.stream?.getTracks().forEach(t => t.stop());
  try { state.ctx?.close(); } catch (_) {}
  if (state.recordURL) URL.revokeObjectURL(state.recordURL);
  urls.forEach(u => URL.revokeObjectURL(u));
  urls = [];
  for (const fn of cleanups.reverse()) fn();
  db?.close();
};

}
