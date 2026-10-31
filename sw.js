/* ==========================================================================
   LOUP-GAROU — sw.js (Service Worker)
   Objectif : jouer hors ligne SANS jamais rester bloqué sur une vieille version.
   Stratégies :
     • Page, manifest          → réseau d'abord (3 s max), copie hors ligne en secours
     • CSS / JS versionnés     → copie locale immédiate (une URL = un contenu)
     • Images                  → cache immédiat + rafraîchissement en arrière-plan
     • Polices Google          → cache immédiat + rafraîchissement en arrière-plan
   Publier une mise à jour : incrémenter VERSION ici ET le ?v= dans index.html.
   ========================================================================== */
const VERSION = 'lg-v5.0.1';
const SHELL_CACHE = `${VERSION}-shell`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const IMAGE_CACHE = `${VERSION}-images`;   // versionné : les illustrations modifiées sont bien rechargées

const SHELL = ['./', './index.html', './style.css?v=5.0.1', './app.js?v=5.0.1', './manifest.json'];
const OPTIONAL = [
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png',
  './assets/icons/apple-touch-icon.png',
  './assets/images/dos-de-carte.jpg',
  './assets/images/accueil.jpg',
  './assets/images/accueil-paysage.jpg',
];
const fresh = u => new Request(u, { cache: 'reload' });   // ignore le cache HTTP du navigateur

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const shell = await caches.open(SHELL_CACHE);
    await shell.addAll(SHELL.map(fresh));
    const img = await caches.open(IMAGE_CACHE);
    await Promise.allSettled(OPTIONAL.map(async u => { const r = await fetch(fresh(u)); if (r.ok) await img.put(u, r); }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keep = [SHELL_CACHE, RUNTIME_CACHE, IMAGE_CACHE];
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => !keep.includes(k)).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') self.skipWaiting();
  if (data.type === 'WARM_IMAGES' && Array.isArray(data.urls)) {
    event.waitUntil((async () => {
      const cache = await caches.open(IMAGE_CACHE);
      await Promise.allSettled(data.urls.map(async u => {
        if (await cache.match(u)) return;
        const res = await fetch(u);
        if (res.ok) await cache.put(u, res);
      }));
    })());
  }
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const same = url.origin === self.location.origin;

  if (req.mode === 'navigate') { event.respondWith(navigate(req)); return; }
  if (same && req.destination === 'image') { event.respondWith(staleWhileRevalidate(req, IMAGE_CACHE)); return; }
  // Fichiers versionnés (?v=…) : leur contenu ne change jamais pour une URL donnée → copie locale immédiate
  if (same && url.searchParams.has('v')) { event.respondWith(cacheFirst(req)); return; }
  if (same) { event.respondWith(networkFirst(req)); return; }
  if (url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')) {
    event.respondWith(staleWhileRevalidate(req, RUNTIME_CACHE));
  }
});

/* fetch avec délai maximal : un réseau lent ne bloque jamais l'ouverture */
function fetchTimeout(input, init, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return fetch(input, { ...(init || {}), signal: ctrl.signal }).finally(() => clearTimeout(t));
}
/* Safari refuse une page servie par le service worker si la réponse a été redirigée :
   on recopie la réponse pour supprimer le drapeau « redirected ». */
async function clean(res) {
  if (!res || !res.redirected) return res;
  const body = await res.blob();
  return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
}

/* Navigation : réseau (4 s max si une copie existe), sinon copie hors ligne */
async function navigate(req) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = (await cache.match('./index.html')) || (await cache.match('./'));
  try {
    const res = await fetchTimeout(req, undefined, cached ? 3000 : 15000);
    if (res.type === 'opaqueredirect') return res;            // le navigateur suit lui-même la redirection
    const ok = await clean(res);
    if (ok.ok) cache.put('./index.html', ok.clone());
    return ok;
  } catch (e) {
    return cached || Response.error();
  }
}

/* CSS / JS / manifest : réseau d'abord (revalidation, 4 s max), copie en secours */
async function networkFirst(req) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await caches.match(req);
  try {
    const res = await clean(await fetchTimeout(req.url, { cache: 'no-cache', credentials: 'same-origin' }, cached ? 4000 : 15000));
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (e) {
    return cached || Response.error();
  }
}

async function cacheFirst(req) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await clean(await fetch(req));
  if (res.ok) (await caches.open(SHELL_CACHE)).put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  const update = fetch(req).then(async res => {
    res = await clean(res);
    if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
    return res;
  }).catch(() => null);
  return hit || (await update) || Response.error();
}
