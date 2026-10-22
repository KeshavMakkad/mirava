// AI Monument & Damage Screening — port of the vision section added to the new
// Sentinel.html. The photo goes to OUR FastAPI (/api/sentinel/vision), which
// accepts one jpeg/png/webp data URL of at most ~2.4 MB and answers
// { assessment, advisory }. Large photos are downscaled client-side first.
import { api, ApiError } from '../../lib/api';

const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 2_400_000;
const MAX_EDGE = 1600;

const tr = (s) => (window.MiravaI18n ? window.MiravaI18n.t(s) : s);

const readDataURL = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('read failed'));
    reader.readAsDataURL(blob);
  });

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('decode failed'));
    img.src = src;
  });

/** Data URL within the server's limits: the file as-is when small enough, else a re-encoded JPEG. */
async function toUploadable(file) {
  if (TYPES.includes(file.type) && file.size <= MAX_BYTES) return readDataURL(file);
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    for (let edge = MAX_EDGE; edge >= 600; edge = Math.round(edge * 0.75)) {
      const scale = Math.min(1, edge / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      const g = canvas.getContext('2d');
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, canvas.width, canvas.height);
      g.drawImage(img, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL('image/jpeg', 0.85);
      // base64 is 4/3 of the bytes; the API caps the string at 3.2M characters.
      if (data.length < 3_100_000) return data;
    }
  } finally {
    URL.revokeObjectURL(url);
  }
  return null;
}

function errorMessage(e) {
  if (e instanceof ApiError) {
    if (e.status === 401) return 'Sign in to use AI screening.';
    if (e.status === 503) return 'Sentinel AI is not configured on this server.';
    if (e.status === 429) return 'Daily image review limit reached.';
    if (e.status === 400) return 'Use a JPG, PNG or WebP file smaller than 2.4 MB.';
    return e.message || 'AI assessment failed.';
  }
  return 'AI assessment failed.';
}

export function initVision(root) {
  const $ = (id) => root.querySelector('#' + id);
  const file = $('sentinelVisionImage'), btn = $('sentinelVisionRun'), status = $('sentinelVisionStatus');
  const out = $('sentinelVisionResult'), advisory = $('sentinelVisionAdvisory'), preview = $('sentinelVisionPreview');
  if (!file || !btn) return () => {};
  let alive = true, previewUrl = null, run = 0;

  const setStatus = (text, isError = false) => {
    status.textContent = text ? tr(text) : '';
    status.classList.toggle('err', isError);
  };
  const clearResult = () => {
    out.hidden = true; out.textContent = '';
    advisory.hidden = true; advisory.textContent = '';
  };

  file.onchange = () => {
    run++; // a running review belongs to the previous photo
    btn.disabled = false;
    clearResult(); setStatus('');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null; preview.hidden = true;
    const f = file.files && file.files[0];
    if (f && f.type.startsWith('image/')) {
      previewUrl = URL.createObjectURL(f);
      preview.src = previewUrl; preview.hidden = false;
    }
  };

  btn.onclick = async () => {
    const f = file.files && file.files[0];
    clearResult();
    if (!f) { setStatus('Choose a photo first.', true); return; }
    if (!f.type.startsWith('image/')) { setStatus('Use a JPG, PNG or WebP file smaller than 2.4 MB.', true); return; }
    const mine = ++run;
    btn.disabled = true;
    setStatus('Reviewing visible evidence…');
    try {
      const image = await toUploadable(f).catch(() => null);
      if (!alive || mine !== run) return;
      if (!image) { setStatus('Use a JPG, PNG or WebP file smaller than 2.4 MB.', true); return; }
      const answer = await api.sentinel.vision(image);
      if (!alive || mine !== run) return;
      setStatus('');
      out.textContent = answer.assessment || 'No visual assessment returned.';
      out.hidden = false;
      if (answer.advisory) { advisory.textContent = tr(answer.advisory); advisory.hidden = false; }
    } catch (e) {
      if (alive && mine === run) setStatus(errorMessage(e), true);
    } finally {
      if (alive && mine === run) btn.disabled = false;
    }
  };

  return () => {
    alive = false;
    file.onchange = null; btn.onclick = null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  };
}
