/**
 * Rasoi Rescue — imperative engine ported from new/public/rasoi-rescue.html.
 * A small hash-routed app (#/, #/cookbook[/id], #/cook/id, #/record, #/vault)
 * rendered into the `main#app` element inside `root`. The header, footer and
 * toast markup are React (see index.tsx).
 *
 * Storage:
 *  - Family recipes live in the server vault (api.rasoi.*), with photo/audio
 *    attachments in private server storage (api.rasoi.media.*). Sharing a recipe
 *    publicly needs consent and passes a server-side AI screen.
 *  - This browser's IndexedDB keeps a device copy (recipes + media blobs) so
 *    nothing is lost while offline; pending copies sync on the next visit.
 *  - Bookmarks / cooked marks / last open recipe → account state `rasoiFavourites`.
 */
import { api, ApiError } from '../../lib/api'
import { supabase } from '../../lib/supabase'
import { SEED } from './data.js'

/**
 * @param {HTMLElement} root
 * @param {import('../../lib/legacy').LegacyContext} ctx
 */
export function initRasoi(root, ctx) {
/** @type {Array<() => void>} */
const cleanups = [];
let disposed = false;

// ----------------------------------------------------------
// DATA LAYER
// ----------------------------------------------------------
const $ = (s, scope = root) => scope.querySelector(s);
const $$ = (s, scope = root) => Array.from(scope.querySelectorAll(s));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));
/** translate="no" for user-generated recipe content (seed recipes stay translatable). */
const raw = r => r.demo ? '' : 'translate="no"';

let toastTimer = 0;
const toast = t => {
  if (disposed) return;
  const el = $('#toast');
  if (!el) return;
  el.textContent = t;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
};

let db = null;
const memory = { recipes: {}, blobs: {} };
let cache = [];
let urls = [];
/** Object URLs for server-stored media, keyed `${recipeId}/${mediaId}` (kept across renders). */
const remoteURLs = new Map();
/** Server media listings per recipe (invalidated after uploads). */
const mediaIndex = new Map();
const regions = [...new Set(SEED.map(r => r.region))].sort();
let filters = { q: '', region: '', category: '', kind: 'all' };
const vaultSync = { signedIn: false, online: navigator.onLine !== false, error: '' };
let currentUid = '';

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const PHOTO_MAX = 5 * 1024 * 1024;
const AUDIO_MAX = 10 * 1024 * 1024;

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

// IndexedDB helpers (device copy)
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
    } catch { resolve(null); }
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
  if (!v?.blob) return '';
  const url = URL.createObjectURL(v.blob);
  urls.push(url);
  return url;
}

// Ingredients are {q, n} in the UI and "q | n" strings on the server.
const parseLine = s => {
  const a = String(s).split('|');
  return { q: a.length > 1 ? a.shift().trim() : '', n: a.join('|').trim() || String(s).trim() };
};
const ingText = i => typeof i === 'string' ? i : (i?.q ? `${i.q} | ${i.n || ''}` : (i?.n || ''));
const ingList = list => (Array.isArray(list) ? list : []).map(i => typeof i === 'string' ? parseLine(i) : { q: i?.q || '', n: i?.n || '' });

/** Strip device-only fields: what the server vault stores. */
function databasePayload(recipe) {
  const mins = Number(recipe.mins);
  const shared = recipe.visibility === 'shared';
  return {
    id: recipe.id,
    name: recipe.name,
    by: recipe.by,
    region: recipe.region || 'Family kitchen',
    category: recipe.category || 'Main Course',
    mins: Number.isInteger(mins) && mins >= 1 && mins <= 10000 ? mins : null,
    lang: recipe.lang || 'English',
    ingredients: (recipe.ingredients || []).map(ingText).filter(Boolean),
    steps: (recipe.steps || []).filter(Boolean),
    tips: recipe.tips || '',
    story: recipe.story || '',
    transcript: recipe.transcript || '',
    notes: recipe.notes || '',
    memory: recipe.memory || '',
    visibility: shared ? 'shared' : 'private',
    consent: shared && !!recipe.consent,
    created: recipe.created || Date.now()
  };
}

/** Run an API call, tracking connectivity like the Worker's vaultRequest(). */
async function vaultCall(fn) {
  try {
    const value = await fn();
    vaultSync.online = true;
    vaultSync.signedIn = true;
    vaultSync.error = '';
    return { ok: true, status: 200, value, message: '' };
  } catch (err) {
    if (err instanceof ApiError) {
      vaultSync.online = true;
      if (err.status === 401) {
        vaultSync.signedIn = false;
        vaultSync.error = '';
      }
      return { ok: false, status: err.status, value: null, message: err.message || `Database request failed (${err.status})` };
    }
    vaultSync.online = false;
    vaultSync.error = 'Database is temporarily unreachable. Your device copy is still available.';
    return { ok: false, status: 0, value: null, message: vaultSync.error };
  }
}

const fromRemote = (remoteRecipe, local) => ({
  ...remoteRecipe,
  ingredients: ingList(remoteRecipe.ingredients),
  ...(local?.audioId ? { audioId: local.audioId } : {}),
  ...(local?.photoId ? { photoId: local.photoId } : {}),
  pendingMedia: local?.pendingMedia || [],
  owner: currentUid,
  databaseSynced: true,
  pendingSync: false,
  demo: false
});

const upsertDatabaseRecipe = recipe => vaultCall(() => api.rasoi.save(databasePayload(recipe)));

/** Upload this recipe's not-yet-backed-up photo/audio blobs to server storage. */
async function uploadRecipeMedia(recipe) {
  if (!recipe?.databaseSynced || !vaultSync.signedIn || !recipe.pendingMedia?.length) return recipe;
  const still = [];
  for (const mediaId of recipe.pendingMedia) {
    const type = mediaId.endsWith('-photo') ? 'photo' : 'audio';
    const local = await get('blobs', mediaId);
    if (!local?.blob) continue;
    try {
      await api.rasoi.media.upload(recipe.id, mediaId, type, local.blob);
      mediaIndex.delete(recipe.id);
      const key = recipe.id + '/' + mediaId;
      if (remoteURLs.has(key)) { URL.revokeObjectURL(remoteURLs.get(key)); remoteURLs.delete(key); }
    } catch (err) {
      if (err instanceof ApiError && [400, 409, 413, 415].includes(err.status)) {
        // Permanent rejection: keep the device copy, stop retrying.
        toast('Could not back up the recipe ' + type + ': ' + err.message);
      } else {
        // Keep the browser copy for a later retry; never silently discard it.
        console.warn('Recipe ' + type + ' backup is pending.');
        still.push(mediaId);
      }
    }
  }
  const updated = { ...recipe, pendingMedia: still };
  await put('recipes', updated);
  return updated;
}

async function remoteMediaURL(recipeId, mediaId) {
  if (!recipeId || !mediaId || !vaultSync.signedIn) return '';
  const key = recipeId + '/' + mediaId;
  if (remoteURLs.has(key)) return remoteURLs.get(key);
  try {
    const u = await api.rasoi.media.objectUrl(recipeId, mediaId);
    if (disposed) { URL.revokeObjectURL(u); return ''; }
    remoteURLs.set(key, u);
    return u;
  } catch { return ''; }
}

async function recipeMediaURL(recipe, type) {
  const mediaId = type === 'photo' ? recipe.photoId : recipe.audioId;
  if (!mediaId || recipe.demo) return '';
  return await blobURL(mediaId) || (recipe.databaseSynced ? await remoteMediaURL(recipe.id, mediaId) : '');
}

async function listRemoteMedia(recipeId) {
  if (mediaIndex.has(recipeId)) return mediaIndex.get(recipeId);
  try {
    const media = await api.rasoi.media.list(recipeId);
    mediaIndex.set(recipeId, media);
    return media;
  } catch { return []; }
}

async function sessionUid() {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id || '';
  } catch { return ''; }
}

async function refresh() {
  currentUid = await sessionUid();
  // Device copies belong to whoever saved them; unowned ones were made while signed out.
  const local = (await all('recipes')).filter(r => !r.owner || r.owner === currentUid);
  const localMap = new Map(local.map(r => [r.id, r]));
  const listed = await vaultCall(() => api.rasoi.list());
  const remote = listed.ok ? listed.value : null;
  const remoteMap = new Map(Array.isArray(remote) ? remote.map(r => [r.id, r]) : []);

  // If recipes were created/edited while offline or signed out, push those
  // pending device copies into the vault as soon as it is reachable again.
  if (Array.isArray(remote) && vaultSync.signedIn) {
    for (const pending of local.filter(r => r.pendingSync)) {
      let res = await upsertDatabaseRecipe(pending);
      if (!res.ok && pending.visibility === 'shared' && [422, 429, 503].includes(res.status)) {
        // Public sharing was refused by the AI screen: keep it as a private draft instead.
        const reason = res.message;
        res = await upsertDatabaseRecipe({ ...pending, visibility: 'private', consent: false });
        if (res.ok) toast('Saved privately — ' + reason);
      }
      if (!res.ok) continue;
      const merged = await uploadRecipeMedia(fromRemote(res.value, pending));
      await put('recipes', merged);
      localMap.set(merged.id, merged);
      remoteMap.set(merged.id, res.value);
    }
  }

  const mine = [];
  if (Array.isArray(remote)) {
    for (const remoteRecipe of remoteMap.values()) {
      const localRecipe = localMap.get(remoteRecipe.id);
      if (localRecipe?.pendingSync) {
        mine.push(localRecipe);
        continue;
      }
      const media = await listRemoteMedia(remoteRecipe.id);
      const remoteAudio = media.find(x => x.type === 'audio')?.mediaId;
      const remotePhoto = media.find(x => x.type === 'photo')?.mediaId;
      let merged = fromRemote(remoteRecipe, {
        ...localRecipe,
        audioId: remoteAudio || localRecipe?.audioId,
        photoId: remotePhoto || localRecipe?.photoId
      });
      if (merged.pendingMedia.length) merged = await uploadRecipeMedia(merged);
      else await put('recipes', merged);
      localMap.set(merged.id, merged);
      mine.push(merged);
    }
    for (const localRecipe of localMap.values()) {
      if (!remoteMap.has(localRecipe.id)) mine.push(localRecipe);
    }
  } else {
    mine.push(...localMap.values());
  }

  mine.sort((a, b) => b.created - a.created);
  cache = [...mine, ...SEED];
  for (const r of mine) {
    r.photoURL = r.photoId ? await recipeMediaURL(r, 'photo') : '';
  }
}

// ----------------------------------------------------------
// PHOTO LIBRARY — USER-SUPPLIED PHOTOS + RELIABLE LOCAL FALLBACK
// ----------------------------------------------------------
const recipeLocalPhotos = {
  'Rajma Masala': 'rajma masala.jpg',
  'Sarson da Saag': 'sarson da saag.jpg',
  'Makki di Roti': 'makki ki roti.jpg',
  'Amritsari Kulcha': 'amritsari kulcha.jpg',
  'Chole Bhature': 'chole bhature.jpg',
  'Kadhi Pakora': 'kadhi pakora.jpg',
  'Pinni': 'PINNI.jpg',
  'Dal Makhani': 'DAL MAKHANI.jpg',
  'Gatte ki Sabzi': 'GATTE KI SABZI.jpg',
  'Gatte Ki Sabzi': 'GATTE KI SABZI.jpg',
  'Dal Baati Churma': 'DAL BATI CHURMA.jpg',
  'Ghevar': 'GHEVAR.jpg',
  'Besan Ladoo': 'BESAN LADOO.jpg',
  'Pyaaz Kachori': 'PYAAZ KACHORI.jpg',
  'Dhokla': 'DHOKLA.jpg',
  'Thepla': 'THEPLAjpg.jpg',
  'Handvo': 'HANDVO.jpg',
  'Khandvi': 'KHANDVI.jpg',
  'Shrikhand': 'SHRIKHAND.jpg',
  'Dal Dhokli': 'DAL DHOKLI.jpg',
  'Misal Pav': 'MISAL PAV.jpg',
  'Sabudana Khichdi': 'SABUDANA KHICHDI.jpg',
  'Modak': 'MODAK.jpg',
  'Poha': 'POHA.jpg',
  'Masala Dosa': 'MASALA DOSA.jpg',
  'Bisi Bele Bath': 'Bisi Bele Bath.jpg',
  'Mysore Pak': 'mysore pak.jpg',
  'Ragi Mudde': 'raggi mude.jpg',
  'Neer Dosa': 'neer dosa.jpg',
  'Akki Roti': 'akki roti.jpg',
  'Sambar': 'sambar.jpg',
  'Rasam': 'rasam.jpg',
  'Pongal': 'pongal.jpg',
  'Ven Pongal': 'pongal.jpg',
  'Chettinad Kuzhambu': 'Chettinad Kuzhambu.jpg',
  'Adai': 'adai.jpg',
  'Payasam': 'Payasam.jpg',
  'Appam': 'Appam.jpg',
  'Avial': 'Avial.jpg',
  'Puttu Kadala': 'Puttu Kadala .jpg',
  'Ada Pradhaman': '_Ada Pradhaman .jpg',
  'Erissery': 'Erissery.jpg',
  'Pesarattu': 'Pesarattu.jpg',
  'Pulihora': 'Pulihora .jpg',
  'Hyderabadi Biryani': 'Hyderabadi Biryani.jpg',
  'Bagara Baingan': '_Bagara Baingan.jpg',
  'Jhalmuri': 'Jhalmuri .jpg',
  'Shorshe Ilish': 'Shorshe Ilish.jpg',
  'Mishti Doi': 'Mishti Doi.jpg',
  'Luchi Aloo Dum': 'Luchi Aloo Dum .jpg',
  'Luchi': 'Luchi Aloo Dum .jpg',
  'Chingri Malai Curry': 'chingri malai curry.jpg',
};

const recipeCategoryPhotos = {
  'Dessert': 'photo-1488477181946-6428a0291777',
  'Breakfast': 'photo-1533089860892-a7c6f0a88666',
  'Snack': 'photo-1601050690597-df0568f70950',
  'Bread': 'photo-1509440159596-0249088772ff',
  'Drink': 'photo-1544787219-7f47ccb76574',
  'Side': 'photo-1547592180-85f173990554',
  'Main Course': 'photo-1546833999-b9f581a1996d'
};

const categoryPhotoFor = r =>
  'https://images.unsplash.com/' + (recipeCategoryPhotos[r.category] || recipeCategoryPhotos['Main Course']) + '?auto=format&fit=crop&w=650&q=80';

/** Bundled recipe photo (public/images), else a representative category photo. */
const photoFor = r => {
  const localFile = recipeLocalPhotos[r.name];
  return localFile ? '/images/' + encodeURIComponent(localFile) : categoryPhotoFor(r);
};

// Broken image → swap to the category photo once (replaces inline onerror=).
const onImgError = e => {
  const img = e.target;
  if (!(img instanceof HTMLImageElement) || !img.dataset.fallback || img.dataset.fellBack) return;
  img.dataset.fellBack = '1';
  img.src = img.dataset.fallback;
};
root.addEventListener('error', onImgError, true);
cleanups.push(() => root.removeEventListener('error', onImgError, true));

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
            <a class="btn primary" href="#/record">✦ Preserve a memory ↗</a>
            <a class="btn secondary" href="#/cookbook">Explore the cookbook →</a>
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
        <img loading="lazy" decoding="async" src="${esc(r.photoURL || photoFor(r))}" data-fallback="${esc(categoryPhotoFor(r))}" alt="Food photograph representing ${esc(r.name)}" title="${esc(r.name)}">
        <span class="tag">${r.demo ? '✦ Regional collection' : '♥ Family recipe'}</span>
      </div>
      <div class="recipe-body">
        <div class="eyebrow" style="font-size:9px"><span ${raw(r)}>${esc(r.region)}</span></div>
        <h3 ${raw(r)}>${esc(r.name)}</h3>
        <p>${esc(r.category || 'Family recipe')} · <span ${raw(r)}>${esc(r.by)}</span></p>
        <div class="card-foot">
          <span>◷ ${r.mins || '?'} min</span>
          <span>${r.audioId ? '♫ Voice saved' : '✧ ' + (r.demo ? 'Sample' : 'No voice')}</span>
        </div>
        <a href="#/cook/${encodeURIComponent(r.id)}" class="btn dark small">View recipe ↗</a>
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
        <div class="eyebrow">Discover India on a plate</div>
        <div class="section-head">
          <h2>A thousand flavours.<br>One shared heritage.</h2>
          <a href="#/cookbook" class="btn dark">Browse all ${SEED.length} recipes →</a>
        </div>
        <div class="recipe-grid">
          ${SEED.slice(0, 8).map(card).join('')}
        </div>
      </div>
    </section>
  `;
}

// ----------------------------------------------------------
// BOOKMARKS & COOKED MARKS (account state `rasoiFavourites`)
// ----------------------------------------------------------
const STATE_KEY = 'rasoiFavourites';
const favourites = { saved: new Set(), cooked: new Set(), last: '' };
let saveTimer = 0;
function favouritesPayload() {
  return { bookmarks: [...favourites.saved], cooked: [...favourites.cooked], last: favourites.last || '' };
}
function persistFavourites() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { saveTimer = 0; ctx.saveState(STATE_KEY, favouritesPayload()); }, 600);
}
async function loadFavourites() {
  const v = await ctx.loadState(STATE_KEY);
  if (!v || typeof v !== 'object') return;
  const strings = a => Array.isArray(a) ? a.filter(x => typeof x === 'string') : [];
  favourites.saved = new Set(strings(v.bookmarks));
  favourites.cooked = new Set(strings(v.cooked));
  if (typeof v.last === 'string') favourites.last = v.last;
}

// ----------------------------------------------------------
// RENDER: COOKBOOK — PHYSICAL BOOK EXPERIENCE
// ----------------------------------------------------------
function cookbook() {
  return `
    <section class="section cookbook-stage">
      <div class="wrap">
        <div class="cookbook-intro">
          <div class="eyebrow">The living cookbook</div>
          <h2>Open the book.<br><em>Turn the pages.</em></h2>
          <p class="muted">A hardbound digital cookbook with ${SEED.length} regional recipes and your own saved family recipes.</p>
        </div>

        <div class="book-filter-panel">
          <div class="searchbar">
            <div class="field">
              <label for="search">Search recipes, ingredients, regions</label>
              <input id="search" type="search" placeholder="Try rajma, sambar, Gujarat…" value="${esc(filters.q)}">
            </div>
            <div class="field">
              <label for="region">Region</label>
              <select id="region">
                <option value="">All regions</option>
                ${regions.map(x => `<option ${filters.region === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}
              </select>
            </div>
            <div class="field">
              <label for="category">Category</label>
              <select id="category">
                <option value="">All categories</option>
                ${[...new Set(SEED.map(x => x.category))].sort().map(x => `<option ${filters.category === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="chips">
            ${[['all', 'All recipes'], ['mine', 'My family recipes'], ['sample', 'Regional collection'], ['voice', 'With original voice'], ['bookmarked', 'My bookmarks']]
              .map(([k, t]) => `<button class="chip ${filters.kind === k ? 'active' : ''}" type="button" data-kind="${k}">${t}</button>`)
              .join('')}
          </div>
          <div class="count" id="count"></div>
        </div>
      </div>

      <div class="book-scene">
        <div class="heritage-book is-closed" id="heritage-book" aria-label="Interactive Rasoi Rescue recipe book">
          <div class="book-board" aria-hidden="true"></div>

          <div class="open-book-shell" id="open-book-shell">
            <section class="paper-page left" id="paper-left" aria-label="Left book page"></section>
            <section class="paper-page right" id="paper-right" aria-label="Right book page"></section>
            <div class="book-spine" aria-hidden="true"></div>

            <div class="turn-sheet" id="turn-sheet" aria-hidden="true">
              <div class="sheet-face sheet-front" id="sheet-front"></div>
              <div class="sheet-face sheet-back" id="sheet-back"></div>
            </div>
          </div>

          <div class="book-cover-panel" id="book-cover-panel">
            <div class="cover-face cover-front">
              <div class="cover-design">
                <div class="cover-brand">Rasoi Rescue · Mirava</div>
                <div class="cover-emblem" aria-hidden="true"></div>
                <div class="cover-title">The Living<br>Recipe Book</div>
                <div class="cover-subtitle">Recipes that remember</div>
                <span class="cover-count">${SEED.length} RECIPES · FAMILY STORIES · ORIGINAL VOICES</span>
                <button class="open-book-button" id="open-book-btn" type="button">Open the Book</button>
              </div>
            </div>
            <div class="cover-face cover-back">
              <div class="cover-back-inner">
                <strong>From their kitchen<br>to your forever.</strong>
                <span>A Mirava heritage archive</span>
              </div>
            </div>
          </div>
        </div>

        <div class="book-nav is-closed" id="book-nav">
          <span class="book-closed-hint">Press “Open the Book” to begin.</span>
          <button class="book-open-controls" id="book-prev" type="button">← Previous page</button>
          <span class="book-open-controls book-page-label" id="book-page-label">Contents · Pages 1–2</span>
          <button class="book-open-controls" id="book-next" type="button">Next page →</button>
          <button class="book-open-controls" id="book-close" type="button">Close book</button>
        </div>
      </div>
    </section>
  `;
}

let bookMatches = [];
let bookSpread = 0; // 0 = contents, 1..n = one recipe per two-page spread
let bookOpen = false;
let bookTurning = false;
let bookTurnTimer = 0;
let bookSettleTimer = 0;

function bookPage(content, pageNo, side) {
  return `
    <div class="book-page-content ${side === 'left' ? 'book-page-left' : 'book-page-right'}">
      ${content}
      <div class="book-page-number">— ${pageNo} —</div>
    </div>
  `;
}

function contentsSpread() {
  // Every recipe currently on the shelf appears in the index (seed + family recipes).
  const indexRecipes = bookMatches;

  const left = `
    <div class="book-dedication" style="height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:8%;">
      <div class="book-page-kicker">RASOI RESCUE · MIRAVA</div>
      <h3 style="margin:16px 0 8px;font-size:clamp(28px,3vw,46px);line-height:1.02;">The Living<br>Recipe Book</h3>
      <div class="ornament" style="color:#b18446;letter-spacing:.45em;margin:10px 0 20px;font-size:16px;">✦ ❦ ✦</div>
      <p style="max-width:340px;margin:0 auto 14px;font-family:Georgia,serif;color:#705340;line-height:1.7;">Every kitchen carries a history. These pages preserve dishes, memories, methods and flavours passed through generations.</p>
      <div style="width:72%;height:1px;margin:16px auto;background:linear-gradient(90deg,transparent,rgba(177,132,70,.85),transparent);"></div>
      <div style="margin-top:5px;padding:16px 24px;border:1px solid rgba(177,132,70,.45);border-radius:12px;background:rgba(177,132,70,.05);">
        <div style="font-family:Georgia,serif;font-size:38px;line-height:1;color:#7a422d;">${indexRecipes.length}</div>
        <div style="margin-top:6px;font-family:var(--mono,monospace);font-size:9px;letter-spacing:.22em;text-transform:uppercase;color:#9b7655;">Recipes Preserved</div>
      </div>
      <p style="margin-top:20px;max-width:310px;font-size:11px;line-height:1.6;color:#81634e;">Select any recipe from the index to open its complete two-page spread.</p>
      <div style="margin-top:12px;font-size:18px;color:#ad844e;">❧</div>
    </div>
  `;

  const right = `
    <div class="book-page-scroll" style="height:100%;min-height:0;overflow-y:auto;overflow-x:hidden;padding-right:8px;">
      <div class="book-page-kicker">COMPLETE RECIPE INDEX</div>
      <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:15px;margin:4px 0 4px;">
        <h3 style="margin:0;font-size:clamp(25px,2.4vw,36px);">${indexRecipes.length} Recipes</h3>
        <span style="font-family:var(--mono,monospace);font-size:8px;letter-spacing:.12em;text-transform:uppercase;color:#9a7653;white-space:nowrap;">Tap to open</span>
      </div>
      <div style="width:100%;height:1px;margin:12px 0 10px;background:linear-gradient(90deg,rgba(177,132,70,.7),rgba(177,132,70,.12));"></div>
      ${indexRecipes.length ? `
        <div class="book-index-list" style="display:grid;grid-template-columns:1fr;gap:2px;margin-top:6px;padding-bottom:28px;">
          ${indexRecipes.map((r, i) => `
            <button class="book-index-item rr-index-item" type="button" data-book-jump="${i + 1}">
              <span class="n" style="font-family:var(--mono,monospace);font-size:9px;letter-spacing:.08em;color:#a07749;">${String(i + 1).padStart(3, '0')}</span>
              <strong ${raw(r)} style="font-family:Georgia,'Times New Roman',serif;font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#542a20;">${favourites.saved.has(r.id) ? '★ ' : ''}${esc(r.name)}</strong>
              <small ${raw(r)} style="max-width:95px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:8px;letter-spacing:.045em;text-transform:uppercase;color:#8a694f;">${esc(r.region)}</small>
            </button>
          `).join('')}
        </div>
      ` : `
        <div class="empty" style="padding:25px 0;text-align:center;">
          No recipes match your current search.
          <br><br>
          <a href="#/record"><u>Preserve your own recipe</u></a>
        </div>
      `}
    </div>
  `;

  return {
    left: bookPage(left, 1, 'left'),
    right: bookPage(right, 2, 'right'),
    label: `Complete Index · ${indexRecipes.length} Recipes`
  };
}

function recipeSpread(recipe, recipeIndex) {
  const pageLeft = recipeIndex * 2 + 1;
  const pageRight = pageLeft + 1;
  const saved = favourites.saved.has(recipe.id);
  const cooked = favourites.cooked.has(recipe.id);
  const left = `
    <div class="book-page-scroll">
      <div class="book-page-kicker"><span ${raw(recipe)}>${esc(recipe.region)}</span> · ${esc(recipe.category || 'Family recipe')}</div>
      <h3 ${raw(recipe)}>${esc(recipe.name)}</h3>
      <div class="book-recipe-meta">
        <span>◷ ${recipe.mins || '?'} min</span>
        <span>${recipe.demo ? '✦ Regional collection' : '♥ Family recipe'}</span>
        ${recipe.audioId ? '<span>♫ Voice preserved</span>' : ''}
      </div>
      <div class="book-recipe-photo">
        <img loading="lazy" src="${esc(recipe.photoURL || photoFor(recipe))}" data-fallback="${esc(categoryPhotoFor(recipe))}" alt="Food photograph representing ${esc(recipe.name)}">
      </div>
      <h4>Ingredients</h4>
      <ul class="book-ingredients" ${raw(recipe)}>
        ${(recipe.ingredients || []).map(i => `<li><b>${esc(i.q || '')}</b><span>${esc(i.n || '')}</span></li>`).join('')}
      </ul>
      ${recipe.story ? `<div class="book-story-note" ${raw(recipe)}>“${esc(recipe.story)}”</div>` : ''}
    </div>
  `;
  const right = `
    <div class="book-page-scroll">
      <div class="book-page-kicker">Method · ${String(recipeIndex).padStart(2, '0')}</div>
      <h3>From the kitchen</h3>
      <h4>Step by step</h4>
      <ol class="book-steps" ${raw(recipe)}>
        ${(recipe.steps || []).map(step => `<li>${esc(step)}</li>`).join('')}
      </ol>
      ${recipe.tips ? `<div class="book-tip-note"><strong>Kitchen note:</strong> <span ${raw(recipe)}>${esc(recipe.tips)}</span></div>` : ''}
      <a class="book-focus-link" href="#/cook/${encodeURIComponent(recipe.id)}">Open focused cooking view ↗</a>
      <div class="rr-book-marks">
        <button type="button" class="rr-mark" data-book-mark="${esc(recipe.id)}" aria-pressed="${saved}">${saved ? '★ Remove bookmark' : '☆ Bookmark this recipe'}</button>
        <button type="button" class="rr-mark" data-book-cooked="${esc(recipe.id)}" aria-pressed="${cooked}">${cooked ? '✓ Cooked with love' : 'Mark as cooked'}</button>
      </div>
    </div>
  `;
  return {
    left: bookPage(left, pageLeft, 'left'),
    right: bookPage(right, pageRight, 'right'),
    label: `${recipe.name} · Pages ${pageLeft}–${pageRight}`
  };
}

function getBookSpread(index) {
  if (index <= 0 || !bookMatches.length) return contentsSpread();
  const recipe = bookMatches[index - 1];
  if (!recipe) return contentsSpread();
  return recipeSpread(recipe, index);
}

function updateBookControls() {
  const prev = $('#book-prev');
  const next = $('#book-next');
  const label = $('#book-page-label');
  if (!prev || !next || !label) return;
  prev.disabled = bookSpread <= 0 || bookTurning;
  next.disabled = bookSpread >= bookMatches.length || bookTurning || !bookMatches.length;
  const recipe = bookSpread > 0 ? bookMatches[bookSpread - 1] : null;
  label.textContent = getBookSpread(bookSpread).label;
  // Recipe names are user content for family recipes.
  if (recipe && !recipe.demo) label.setAttribute('translate', 'no'); else label.removeAttribute('translate');
}

function rememberSpread() {
  const recipe = bookSpread > 0 ? bookMatches[bookSpread - 1] : null;
  const id = recipe?.id || '';
  if (id && id !== favourites.last) { favourites.last = id; persistFavourites(); }
  try { history.replaceState(history.state, '', id ? '#/cookbook/' + encodeURIComponent(id) : '#/cookbook'); } catch {}
}

function renderBookSpread(index = bookSpread) {
  const spread = getBookSpread(index);
  const left = $('#paper-left');
  const right = $('#paper-right');
  if (!left || !right) return;
  left.innerHTML = spread.left;
  right.innerHTML = spread.right;
  updateBookControls();
  if (bookOpen) rememberSpread();
}

function openBook() {
  if (bookOpen) return;
  bookOpen = true;
  const book = $('#heritage-book');
  const nav = $('#book-nav');
  book?.classList.remove('is-closed');
  book?.classList.add('is-open');
  nav?.classList.remove('is-closed');
  clearTimeout(bookSettleTimer);
  bookSettleTimer = setTimeout(() => book?.classList.add('cover-settled'), 1060);
  renderBookSpread();
}

function closeBook() {
  if (!bookOpen || bookTurning) return;
  const book = $('#heritage-book');
  const nav = $('#book-nav');
  book?.classList.remove('cover-settled');
  requestAnimationFrame(() => {
    book?.classList.remove('is-open');
    book?.classList.add('is-closed');
    nav?.classList.add('is-closed');
  });
  bookOpen = false;
  try { history.replaceState(history.state, '', '#/cookbook'); } catch {}
}

function finishTurn(target) {
  bookSpread = target;
  const sheet = $('#turn-sheet');
  if (sheet) sheet.className = 'turn-sheet';
  bookTurning = false;
  renderBookSpread(bookSpread);
}

function turnBook(delta) {
  if (!bookOpen) { openBook(); return; }
  if (bookTurning) return;
  const target = bookSpread + delta;
  if (target < 0 || target > bookMatches.length) return;

  const current = getBookSpread(bookSpread);
  const destination = getBookSpread(target);
  const left = $('#paper-left');
  const right = $('#paper-right');
  const sheet = $('#turn-sheet');
  const front = $('#sheet-front');
  const back = $('#sheet-back');
  if (!left || !right || !sheet || !front || !back) return;

  bookTurning = true;
  updateBookControls();
  sheet.className = 'turn-sheet active ' + (delta > 0 ? 'forward' : 'reverse');

  if (delta > 0) {
    // Current right page lifts; its reverse side is the next left page.
    front.innerHTML = current.right;
    back.innerHTML = destination.left;
    right.innerHTML = destination.right;
    void sheet.offsetWidth;
    sheet.classList.add('anim-forward');
  } else {
    // Current left page lifts back toward the right; reverse reveals previous right.
    front.innerHTML = current.left;
    back.innerHTML = destination.right;
    left.innerHTML = destination.left;
    void sheet.offsetWidth;
    sheet.classList.add('anim-reverse');
  }

  clearTimeout(bookTurnTimer);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  bookTurnTimer = setTimeout(() => finishTurn(target), reduced ? 30 : 940);
}

function jumpBook(target) {
  if (!Number.isFinite(target)) return;
  target = Math.max(0, Math.min(target, bookMatches.length));
  if (!bookOpen) openBook();
  if (target === bookSpread) return;
  const book = $('#heritage-book');
  book?.animate?.([
    { filter: 'drop-shadow(0 38px 38px rgba(0,0,0,.48)) brightness(1)' },
    { filter: 'drop-shadow(0 38px 38px rgba(0,0,0,.48)) brightness(.96)' },
    { filter: 'drop-shadow(0 38px 38px rgba(0,0,0,.48)) brightness(1)' }
  ], { duration: 330, easing: 'ease' });
  bookSpread = target;
  renderBookSpread();
}

const matchesQuery = (r, q) => {
  const fields = [r.name, r.region, r.category, r.by, ...(r.ingredients || []).map(i => i.n)];
  const i18n = window.MiravaI18n;
  if (i18n?.matches) return i18n.matches(fields, q);
  return fields.join(' ').toLowerCase().includes(q);
};

function filterCards() {
  const q = filters.q.trim().toLowerCase();
  bookMatches = cache.filter(r =>
    (!q || matchesQuery(r, q)) &&
    (!filters.region || r.region === filters.region) &&
    (!filters.category || r.category === filters.category) &&
    (filters.kind === 'all' ||
      (filters.kind === 'mine' && !r.demo) ||
      (filters.kind === 'sample' && r.demo) ||
      (filters.kind === 'voice' && r.audioId) ||
      (filters.kind === 'bookmarked' && favourites.saved.has(r.id)))
  );
  $('#count').textContent = `${bookMatches.length} recipe${bookMatches.length === 1 ? '' : 's'} on this shelf`;
  bookSpread = 0;
  renderBookSpread();
}

function toggleMark(button, kind) {
  const id = kind === 'saved' ? button.dataset.bookMark : button.dataset.bookCooked;
  const set = favourites[kind];
  const on = !set.has(id);
  if (on) set.add(id); else set.delete(id);
  persistFavourites();
  button.setAttribute('aria-pressed', String(on));
  if (kind === 'saved') {
    button.textContent = on ? '★ Remove bookmark' : '☆ Bookmark this recipe';
    toast(on ? 'A ribbon for this recipe. Bookmarked!' : 'Bookmark removed');
  } else {
    button.textContent = on ? '✓ Cooked with love' : 'Mark as cooked';
    toast(on ? 'Another recipe made into a memory.' : 'Cooking mark removed');
  }
}

function bindCookbook(requestedId = '') {
  bookOpen = false;
  bookTurning = false;
  bookSpread = 0;

  $('#search').oninput = e => { filters.q = e.target.value; filterCards(); };
  $('#region').onchange = e => { filters.region = e.target.value; filterCards(); };
  $('#category').onchange = e => { filters.category = e.target.value; filterCards(); };
  $$('[data-kind]').forEach(b => b.onclick = () => {
    filters.kind = b.dataset.kind;
    $$('[data-kind]').forEach(x => x.classList.toggle('active', x === b));
    filterCards();
  });

  $('#open-book-btn').onclick = openBook;
  $('#book-prev').onclick = () => turnBook(-1);
  $('#book-next').onclick = () => turnBook(1);
  $('#book-close').onclick = closeBook;
  $('#open-book-shell').onclick = e => {
    const jump = e.target.closest('[data-book-jump]');
    if (jump) { jumpBook(Number(jump.dataset.bookJump)); return; }
    const mark = e.target.closest('[data-book-mark]');
    if (mark) { toggleMark(mark, 'saved'); return; }
    const cooked = e.target.closest('[data-book-cooked]');
    if (cooked) toggleMark(cooked, 'cooked');
  };

  filterCards();

  // Deep link #/cookbook/<id>: open the book at that recipe.
  if (requestedId) {
    let index = bookMatches.findIndex(r => r.id === requestedId);
    if (index < 0 && cache.some(r => r.id === requestedId)) {
      filters = { q: '', region: '', category: '', kind: 'all' };
      $('#search').value = ''; $('#region').value = ''; $('#category').value = '';
      $$('[data-kind]').forEach(x => x.classList.toggle('active', x.dataset.kind === 'all'));
      filterCards();
      index = bookMatches.findIndex(r => r.id === requestedId);
    }
    if (index >= 0) { bookSpread = index + 1; openBook(); }
    else toast('That recipe is not available here. Opening your book instead.');
  }
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
              <button class="btn primary small" id="start" type="button">● Record</button>
              <button class="btn outline small" id="pause" type="button" disabled>Ⅱ Pause</button>
              <button class="btn outline small" id="resume" type="button" disabled>▶ Resume</button>
              <button class="btn dark small" id="stop" type="button" disabled>■ Stop</button>
            </div>
            <div class="field" style="margin-top:22px">
              <label for="audio-upload">Or upload an audio file (max 10 MB)</label>
              <input type="file" id="audio-upload" accept="audio/*">
            </div>
            <div id="preview"></div>
            <div id="rec-message"></div>
          </div>
          <div class="form-card">
            <h3>02 / Preserve the details</h3>
            <form id="recipe-form">
              <div class="form-grid">
                <div class="field"><label for="name">Recipe name *</label><input id="name" required maxlength="160" placeholder="Nani's Sunday Rajma"></div>
                <div class="field"><label for="by">Shared by *</label><input id="by" required maxlength="100" placeholder="Nani"></div>
                <div class="field"><label for="origin">Region</label><input id="origin" maxlength="100" placeholder="Punjab"></div>
                <div class="field"><label for="mins">Cooking time (minutes)</label><input id="mins" type="number" min="1" max="10000" step="1" placeholder="60"></div>
                <div class="field">
                  <label for="type">Category</label>
                  <select id="type">
                    <option>Main Course</option><option>Breakfast</option><option>Snack</option>
                    <option>Dessert</option><option>Bread</option><option>Side</option><option>Drink</option>
                  </select>
                </div>
                <div class="field">
                  <label for="language">Language</label>
                  <select id="language">
                    ${['Hindi', 'English', 'Tamil', 'Telugu', 'Marathi', 'Gujarati', 'Bengali', 'Punjabi', 'Kannada', 'Malayalam', 'Urdu', 'Other']
                      .map(x => `<option>${x}</option>`).join('')}
                  </select>
                </div>
                <div class="field wide"><label for="ingredients">Ingredients * (quantity | ingredient, one per line)</label><textarea id="ingredients" rows="4" required placeholder="1 cup | rajma\n2 tbsp | ghee"></textarea></div>
                <div class="field wide"><label for="steps">Steps * (one detailed step per line — aim for 6–12)</label><textarea id="steps" rows="9" required placeholder="Wash and sort the beans.\nSoak them overnight.\nDrain and add fresh water.\nPressure-cook until completely tender.\nPrepare the masala separately.\nCombine and simmer until thick.\nFinish with the family seasoning."></textarea></div>
                <div class="field wide"><label for="tips">Secret family tip</label><textarea id="tips" rows="2"></textarea></div>
                <div class="field wide"><label for="story">Story behind the dish</label><textarea id="story" rows="3"></textarea></div>
                <div class="field wide"><label for="transcript">Transcript (optional, manually entered)</label><textarea id="transcript" rows="3"></textarea></div>
                <div class="field wide"><label for="photo">Dish photo (optional)</label><input type="file" id="photo" accept="image/jpeg,image/png,image/webp"></div>
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
  if (!$('#start')) return;
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
  const g = c.getContext('2d');
  const scale = devicePixelRatio || 1;
  c.width = c.clientWidth * scale;
  c.height = 130 * scale;
  g.clearRect(0, 0, c.width, c.height);
  const data = new Uint8Array(state.analyser.frequencyBinCount);
  state.analyser.getByteFrequencyData(data);
  for (let i = 0; i < 55; i++) {
    const v = state.mode === 'recording' ? data[Math.floor(i * data.length / 55)] / 255 : .06;
    const h = Math.max(5, v * c.height * .9);
    g.fillStyle = i % 2 ? '#ffbd65' : '#e76e53';
    g.fillRect(i * c.width / 55 + 3, (c.height - h) / 2, c.width / 55 - 6, h);
  }
  timer();
  if (state.mode !== 'idle') state.raf = requestAnimationFrame(wave);
}

function setAudio(blob, name) {
  state.blob = blob;
  if (state.recordURL) URL.revokeObjectURL(state.recordURL);
  state.recordURL = URL.createObjectURL(blob);
  const preview = $('#preview');
  if (preview) preview.innerHTML = `
    <p><b translate="no">${esc(name)}</b></p>
    <audio class="audio" controls src="${state.recordURL}"></audio>
    <small>${Math.round(blob.size / 1024)} KB</small>
  `;
  if (blob.size > AUDIO_MAX) toast('This recording is over 10 MB; it will stay on this device only.');
  updateRecordUI();
}

async function startRecording() {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    $('#rec-message').innerHTML = '<div class="message error">Microphone recording is unavailable. Try HTTPS or localhost, or upload audio instead.</div>';
    return;
  }
  try {
    state.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (disposed) { state.stream.getTracks().forEach(t => t.stop()); return; }
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
  return v.split('\n').map(s => s.trim()).filter(Boolean).map(parseLine);
}

function checkPhoto(photo) {
  if (!PHOTO_TYPES.includes(photo.type)) throw Error('Photo must be a JPEG, PNG or WebP image');
  if (photo.size > PHOTO_MAX) throw Error('Photo must be under 5 MB');
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
    demo: false,
    owner: currentUid,
    pendingMedia: []
  };
  const submit = $('#recipe-form button[type="submit"]');
  try {
    const photo = $('#photo').files[0];
    if (photo) checkPhoto(photo);
    if (submit) submit.disabled = true;
    if (state.blob) {
      recipe.audioId = id + '-audio';
      await put('blobs', { id: recipe.audioId, blob: state.blob });
      if (state.blob.size <= AUDIO_MAX) recipe.pendingMedia.push(recipe.audioId);
    }
    if (photo) {
      recipe.photoId = id + '-photo';
      await put('blobs', { id: recipe.photoId, blob: photo });
      recipe.pendingMedia.push(recipe.photoId);
    }
    recipe.pendingSync = true;
    recipe.databaseSynced = false;
    await put('recipes', recipe);
    const res = await upsertDatabaseRecipe(recipe);
    if (res.ok) {
      const stored = await uploadRecipeMedia(fromRemote(res.value, recipe));
      await put('recipes', stored);
      toast('Family recipe saved');
    } else if (res.status && res.status !== 401) {
      toast('Saved on this device — ' + res.message);
    } else if (vaultSync.error) {
      toast('Saved on this device — ' + vaultSync.error);
    } else if (vaultSync.signedIn) {
      toast('Saved on this device — database sync is pending');
    } else {
      toast('Saved on this device — sign in to sync it to the database');
    }
    state.blob = null;
    if (!disposed) location.hash = '#/vault';
  } catch (err) {
    toast('Could not save: ' + err.message);
  } finally {
    if (submit) submit.disabled = false;
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
    if (!f.type.startsWith('audio/') || f.size > AUDIO_MAX) { toast('Please choose an audio file under 10 MB'); e.target.value = ''; return; }
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
  const audio = await recipeMediaURL(r, 'audio');
  return `
    <section class="section">
      <div class="wrap book-reading">
        <a href="#/cookbook">← Back to cookbook</a>
        <div class="eyebrow" style="margin-top:22px">Cook with memories</div>
        <h2 ${raw(r)}>${esc(r.name)}</h2>
        <p class="muted"><span ${raw(r)}>${esc(r.region)}</span> · <span ${raw(r)}>${esc(r.by)}</span> · ${r.mins || 'Time not recorded'} min</p>
        <div class="cook-layout">
          <div>
            <div class="progress"><div id="progress"></div></div>
            <div class="muted" id="progress-text"></div>
            <div class="step" style="margin-top:15px">
              <div class="eyebrow" id="step-number"></div>
              <p id="step-text"></p>
              <div class="actions">
                <button class="btn outline" id="previous" type="button">← Previous</button>
                <button class="btn primary" id="next" type="button">Next step →</button>
              </div>
            </div>
            ${r.tips ? `<div class="message"><b>Family tip:</b> <span ${raw(r)}>${esc(r.tips)}</span></div>` : ''}
            ${r.story ? `<div class="form-card" style="margin-top:20px"><h3>♥ The story</h3><p ${raw(r)}>${esc(r.story)}</p></div>` : ''}
          </div>
          <div>
            <div class="form-card">
              <h3>Ingredients checklist</h3>
              ${(r.ingredients || []).map((i, k) => `
                <label class="ingredient">
                  <input type="checkbox" data-ing="${k}">
                  <span ${raw(r)}><b>${esc(i.q)}</b> ${esc(i.n)}</span>
                </label>
              `).join('')}
            </div>
            <div class="form-card" style="margin-top:20px">
              <h3>♫ The original voice</h3>
              ${audio
                ? `<audio class="audio" id="cook-audio" controls src="${audio}"></audio>
                   <div class="actions">
                     <button class="btn outline small" id="back10" type="button">↶ 10 seconds</button>
                     <button class="btn outline small" id="forward10" type="button">10 seconds ↷</button>
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
  const steps = r.steps || [];
  const ingredients = r.ingredients || [];
  $('#step-number').textContent = `Step ${state.index + 1} of ${steps.length}`;
  $('#step-text').setAttribute('translate', r.demo ? 'yes' : 'no');
  $('#step-text').textContent = steps[state.index] || '';
  $('#previous').disabled = state.index === 0;
  $('#next').textContent = state.index >= steps.length - 1 ? 'Finish ✓' : 'Next step →';
  const total = steps.length + ingredients.length;
  const p = total ? Math.round((state.index + state.checked.size) / total * 100) : 0;
  $('#progress').style.width = p + '%';
  $('#progress-text').textContent = `${state.index} steps navigated · ${state.checked.size}/${ingredients.length} ingredients checked`;
}

function bindCook() {
  if (!$('#next') || !state.cook) return;
  renderStep();
  $('#previous').onclick = () => { state.index = Math.max(0, state.index - 1); renderStep(); };
  $('#next').onclick = () => {
    if (state.index >= (state.cook.steps || []).length - 1) { toast('Enjoy your meal! ♥'); return; }
    state.index++;
    renderStep();
  };
  $$('[data-ing]').forEach(el => el.onchange = () => {
    const k = Number(el.dataset.ing);
    if (el.checked) state.checked.add(k); else state.checked.delete(k);
    renderStep();
  });
  if ($('#cook-audio')) {
    $('#back10').onclick = () => { $('#cook-audio').currentTime = Math.max(0, $('#cook-audio').currentTime - 10); };
    $('#forward10').onclick = () => { $('#cook-audio').currentTime += 10; };
  }
}

// ----------------------------------------------------------
// RENDER: VAULT (private drafts + consented public community recipes)
// ----------------------------------------------------------
async function vaultPage() {
  const mine = cache.filter(r => !r.demo);
  let publicRecipes = [];
  try { publicRecipes = await api.rasoi.publicList(); } catch {}
  let html = `
    <section class="section">
      <div class="wrap">
        <div class="eyebrow">Private family legacy</div>
        <h2>Community recipe vault — share with explicit consent.</h2>
        ${vaultSync.error ? `<div class="message error">${esc(vaultSync.error)}</div>` : ''}
        ${!vaultSync.signedIn && vaultSync.online ? '<div class="message">Sign in to sync your family recipes to your Mirava account. Until then they stay on this device.</div>' : ''}
        <div class="actions">
          <a class="btn dark" href="#/record">+ Preserve another recipe</a>
          <button class="btn outline" id="export-all" type="button">↓ Export recipe backup</button>
        </div>
  `;
  html += '<h3 style="margin:28px 0 12px">Public community recipes</h3>';
  if (!publicRecipes.length) html += '<p class="muted">No community recipes have been published with consent yet.</p>';
  publicRecipes.forEach(entry => {
    const ing = Array.isArray(entry.ingredients) ? entry.ingredients : [];
    const steps = Array.isArray(entry.steps) ? entry.steps : [];
    const item = x => typeof x === 'string' ? x : ingText(x);
    html += `<article class="vault-card" style="padding:22px;margin-bottom:16px"><h3 translate="no">${esc(entry.name)}</h3><p class="muted"><span translate="no">${esc(entry.region)}</span> · Contributed by <span translate="no">${esc(entry.by)}</span></p><details><summary>See recipe and instructions</summary><h4>Ingredients</h4><ul translate="no">${ing.map(i => `<li>${esc(item(i))}</li>`).join('')}</ul><h4>Method</h4><ol translate="no">${steps.map(i => `<li>${esc(item(i))}</li>`).join('')}</ol>${entry.tips ? `<p><b>Kitchen note:</b> <span translate="no">${esc(entry.tips)}</span></p>` : ''}</details></article>`;
  });
  html += '<h3 style="margin:28px 0 12px">Your contributions and drafts</h3>';
  if (!mine.length) html += '<div class="empty">No personal drafts yet. <a href="#/record"><u>Preserve a recipe →</u></a></div>';
  for (const r of mine) {
    const audio = await recipeMediaURL(r, 'audio');
    const status = r.pendingSync ? '<span class="tag">Saved on this device — sync pending</span>'
      : r.visibility === 'shared' ? '<span class="tag">✦ Public</span>' : '<span class="tag">Draft</span>';
    html += `
      <article class="vault-card" id="vault-${esc(r.id)}">
        <div class="vault-layout">
          <div>
            <div class="eyebrow"><span translate="no">${esc(r.region)}</span></div>
            <h3 translate="no">${esc(r.name)}</h3>
            <p class="muted">Shared by <span translate="no">${esc(r.by)}</span></p>
            <p>${status}</p>
            ${audio
              ? `<audio class="audio" controls src="${audio}"></audio>
                 <a class="btn outline small" href="${audio}" download="${esc(r.name)}-voice.webm">↓ Download audio</a>`
              : '<p class="muted">No recording attached.</p>'}
            ${r.photoURL
              ? `<div><img src="${esc(r.photoURL)}" alt="${esc(r.name)}" style="width:180px;max-width:100%;border-radius:12px;margin-top:15px"></div>
                 <a class="btn outline small" href="${esc(r.photoURL)}" download="${esc(r.name)}-photo">↓ Download photo</a>`
              : ''}
          </div>
          <div class="form-grid">
            <div class="field wide"><label>Family story</label><textarea data-key="story" rows="3" translate="no">${esc(r.story)}</textarea></div>
            <div class="field wide"><label>Personal notes</label><textarea data-key="notes" rows="2" translate="no">${esc(r.notes)}</textarea></div>
            <div class="field wide"><label>Celebration memories</label><textarea data-key="memory" rows="2" translate="no">${esc(r.memory)}</textarea></div>
            <div class="field">
              <label>Visibility label</label>
              <select data-key="visibility">
                <option value="private" ${r.visibility !== 'shared' ? 'selected' : ''}>Draft — only you can see it</option>
                <option value="shared" ${r.visibility === 'shared' ? 'selected' : ''}>Public — requires consent</option>
              </select>
            </div>
            <div class="field"><label>Replace photo</label><input data-photo type="file" accept="image/jpeg,image/png,image/webp"></div>
            <label class="wide"><input type="checkbox" data-key="consent" ${r.consent ? 'checked' : ''}> Everyone featured has consented to sharing.</label>
            <p class="muted wide" style="font-size:12px;margin:0">Public recipes are checked by an AI screen before they are published. AI can check plausibility, not prove traditional authenticity.</p>
            <div class="wide" data-share-msg hidden></div>
            <div class="actions wide">
              <button class="btn dark small" type="button" data-save="${esc(r.id)}">Save changes</button>
              <button class="btn outline small" type="button" data-review="${esc(r.id)}">✦ AI review</button>
              <a class="btn outline small" href="#/cookbook/${encodeURIComponent(r.id)}">Read in the book</a>
              <a class="btn outline small" href="#/cook/${encodeURIComponent(r.id)}">Cook this</a>
              <button class="btn outline small" type="button" data-delete="${esc(r.id)}">Delete</button>
            </div>
            <div class="wide" data-review-out hidden></div>
          </div>
        </div>
      </article>
    `;
  }
  return html + '</div></section>';
}

function showCardMessage(el, selector, html, error = false) {
  const box = $(selector, el);
  if (!box) return;
  box.hidden = !html;
  box.innerHTML = html ? `<div class="message${error ? ' error' : ''}">${html}</div>` : '';
}

async function saveVault(id, button) {
  const el = root.querySelector('#vault-' + CSS.escape(id));
  const r = await get('recipes', id) || cache.find(x => x.id === id && !x.demo);
  if (!el || !r) { toast('Recipe not found.'); return; }
  const field = k => $(`[data-key="${k}"]`, el);
  const visibility = field('visibility').value === 'shared' ? 'shared' : 'private';
  const consent = field('consent').checked;
  if (visibility === 'shared' && !consent) {
    toast('Consent required to mark shared');
    return;
  }
  if (visibility === 'shared' && !vaultSync.signedIn) {
    toast(vaultSync.online ? 'Sign in to publish recipes publicly' : 'Public sharing needs a connection. Save it as a draft for now.');
    return;
  }
  const next = { ...r, visibility, consent: visibility === 'shared' && consent, pendingMedia: [...(r.pendingMedia || [])] };
  delete next.photoURL;
  for (const k of ['story', 'notes', 'memory']) next[k] = field(k).value.trim();
  const photo = $('[data-photo]', el).files[0];
  showCardMessage(el, '[data-share-msg]', '');
  try {
    if (photo) {
      checkPhoto(photo);
      next.photoId = id + '-photo';
      await put('blobs', { id: next.photoId, blob: photo });
      if (!next.pendingMedia.includes(next.photoId)) next.pendingMedia.push(next.photoId);
    }
    if (button) { button.disabled = true; button.textContent = visibility === 'shared' ? 'Screening…' : 'Saving…'; }
    const res = await upsertDatabaseRecipe(next);
    if (disposed) return;
    if (res.ok) {
      const stored = await uploadRecipeMedia(fromRemote(res.value, next));
      await put('recipes', stored);
      toast(visibility === 'shared' && r.visibility !== 'shared' ? 'Recipe published to the community vault' : 'Recipe updated');
    } else if (visibility === 'shared' && res.status === 422) {
      // The server-side AI screen asked for a human review: nothing was published.
      showCardMessage(el, '[data-share-msg]', `${esc(res.message)}<br><small>Edit the recipe and try again, or keep it as a draft.</small>`, true);
      toast('Not published — the recipe needs review');
      return;
    } else if (visibility === 'shared' && (res.status === 503 || res.status === 429)) {
      showCardMessage(el, '[data-share-msg]', `${esc(res.message)}<br><small>Choose “Draft — only you can see it” to save your changes privately.</small>`, true);
      toast('Public sharing is unavailable right now — save privately instead');
      return;
    } else if (res.status && res.status !== 401) {
      showCardMessage(el, '[data-share-msg]', esc(res.message), true);
      toast('Could not save: ' + res.message);
      return;
    } else {
      // Offline or signed out: keep a device copy that syncs later.
      await put('recipes', { ...next, pendingSync: true });
      toast(vaultSync.error
        ? 'Changes saved on this device — ' + vaultSync.error
        : vaultSync.signedIn ? 'Changes saved locally — sync pending' : 'Changes saved on this device — sign in to sync');
    }
    render();
  } catch (e) {
    toast(e.message);
  } finally {
    if (button && !disposed) { button.disabled = false; button.textContent = 'Save changes'; }
  }
}

async function reviewRecipe(id, button) {
  const el = root.querySelector('#vault-' + CSS.escape(id));
  const r = cache.find(x => x.id === id && !x.demo);
  if (!el || !r) return;
  const label = button.textContent;
  button.disabled = true;
  button.textContent = 'Reviewing…';
  showCardMessage(el, '[data-review-out]', '');
  try {
    const res = await api.rasoi.review({
      name: r.name,
      ingredients: (r.ingredients || []).map(ingText).filter(Boolean).slice(0, 50),
      steps: (r.steps || []).slice(0, 35)
    });
    if (disposed) return;
    showCardMessage(el, '[data-review-out]',
      `<b>AI review</b><p translate="no" style="white-space:pre-wrap;margin:8px 0">${esc(res.review)}</p><small>${esc(res.disclaimer)}</small>`);
  } catch (err) {
    if (disposed) return;
    const msg = err instanceof ApiError
      ? (err.status === 401 ? 'Sign in before requesting a recipe check.' : err.message)
      : 'The AI review could not be reached. Check your connection and try again.';
    showCardMessage(el, '[data-review-out]', esc(msg), true);
  } finally {
    if (!disposed) { button.disabled = false; button.textContent = label; }
  }
}

async function deleteRecipe(id) {
  if (!confirm('Permanently delete this recipe and its saved media?')) return;
  const r = await get('recipes', id) || cache.find(x => x.id === id && !x.demo);
  let deletedFromDatabase = false;
  if (r?.databaseSynced) {
    const res = await vaultCall(() => api.rasoi.remove(id));
    deletedFromDatabase = res.ok || res.status === 404;
    if (!deletedFromDatabase && vaultSync.signedIn && vaultSync.online) {
      toast('Could not delete the database copy: ' + (res.message || 'try again'));
      return;
    }
    if (!deletedFromDatabase) { toast('You are offline — try deleting again when connected.'); return; }
  }
  if (r?.audioId) await remove('blobs', r.audioId);
  if (r?.photoId) await remove('blobs', r.photoId);
  await remove('recipes', id);
  mediaIndex.delete(id);
  for (const [key, url] of remoteURLs) if (key.startsWith(id + '/')) { URL.revokeObjectURL(url); remoteURLs.delete(key); }
  favourites.saved.delete(id); favourites.cooked.delete(id);
  toast(deletedFromDatabase ? 'Recipe deleted from your vault and this device' : 'Recipe deleted from this device');
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
  $$('[data-save]').forEach(b => b.onclick = () => saveVault(b.dataset.save, b));
  $$('[data-review]').forEach(b => b.onclick = () => reviewRecipe(b.dataset.review, b));
  $$('[data-delete]').forEach(b => b.onclick = () => deleteRecipe(b.dataset.delete));
  const signup = $('[data-rr-signup]');
  if (signup) signup.onclick = e => { e.preventDefault(); ctx.navigate('/signup'); };
  $('#export-all').onclick = () => downloadFile(
    'rasoi-family-recipes.json',
    JSON.stringify(cache.filter(r => !r.demo).map(r => ({
      ...databasePayload(r), audioId: r.audioId, photoId: r.photoId
    })), null, 2),
    'application/json'
  );
}

// ----------------------------------------------------------
// ROUTER
// ----------------------------------------------------------
let rendering = 0;

function stopBookTimers() {
  clearTimeout(bookTurnTimer);
  clearTimeout(bookSettleTimer);
  bookTurning = false;
  bookOpen = false;
}

async function render() {
  const token = ++rendering;
  let route;
  try { route = decodeURIComponent((location.hash || '#/').slice(1)); } catch { route = '/'; }
  stopBookTimers();

  // Stop recording if navigating away
  if (state.mode !== 'idle' && !route.startsWith('/record')) {
    if (state.recorder?.state !== 'inactive') state.recorder?.stop();
    state.stream?.getTracks().forEach(t => t.stop());
    cancelAnimationFrame(state.raf);
    state.mode = 'idle';
  }

  const stale = urls;
  urls = [];

  await refresh();
  stale.forEach(u => URL.revokeObjectURL(u));
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

// Keyboard navigation for the focused cooking view and the physical cookbook
const onKey = e => {
  if (/INPUT|TEXTAREA|SELECT|BUTTON/.test(document.activeElement?.tagName || '')) return;
  if (location.hash.startsWith('#/cook/')) {
    if (e.key === 'ArrowRight' && $('#next')) $('#next').click();
    if (e.key === 'ArrowLeft' && $('#previous')) $('#previous').click();
    return;
  }
  if (location.hash.startsWith('#/cookbook') && bookOpen) {
    if (e.key === 'ArrowRight') turnBook(1);
    if (e.key === 'ArrowLeft') turnBook(-1);
    if (e.key === 'Escape') closeBook();
  }
};
window.addEventListener('keydown', onKey);
cleanups.push(() => window.removeEventListener('keydown', onKey));

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

  function register(node) {
    const selector = '.feature,.recipe-card,.section-head,.story-note,.story-grid > div,.form-card,.vault-card,.step';
    const nodes = [];
    if (node.nodeType === 1 && node.matches?.(selector)) nodes.push(node);
    if (node.querySelectorAll) nodes.push(...node.querySelectorAll(selector));
    for (const el of nodes) {
      if (el.dataset.motionReady) continue;
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
  const [opened] = await Promise.all([openDB(), loadFavourites()]);
  if (disposed) { opened?.close(); return; }
  db = opened;
  if (!db) toast('Browser storage unavailable: recipes last only this session');
  render();
})();

return () => {
  disposed = true;
  rendering++;
  stopBookTimers();
  // Flush a pending bookmark/position save immediately.
  if (saveTimer) {
    clearTimeout(saveTimer);
    ctx.saveState(STATE_KEY, favouritesPayload());
  }
  clearTimeout(toastTimer);
  cancelAnimationFrame(state.raf);
  try { if (state.recorder && state.recorder.state !== 'inactive') { state.recorder.onstop = null; state.recorder.stop(); } } catch {}
  state.stream?.getTracks().forEach(t => t.stop());
  try { state.ctx?.close(); } catch {}
  if (state.recordURL) URL.revokeObjectURL(state.recordURL);
  urls.forEach(u => URL.revokeObjectURL(u));
  urls = [];
  remoteURLs.forEach(u => URL.revokeObjectURL(u));
  remoteURLs.clear();
  for (const fn of cleanups.reverse()) fn();
  db?.close();
};

}
