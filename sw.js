/* ==========================================================================
   LOUP-GAROU — sw.js (Service Worker)
   Objectif : jouer hors ligne SANS jamais rester bloqué sur une vieille version.
   Stratégies :
     • Page, CSS, JS, manifest → réseau d'abord (revalidation HTTP), cache en secours
     • Images                  → cache immédiat + rafraîchissement en arrière-plan
     • Polices Google          → cache immédiat + rafraîchissement en arrière-plan
   Publier une mise à jour : incrémenter VERSION ici ET le ?v= dans index.html.
   ========================================================================== */
const VERSION = 'lg-v5.0.0';
const SHELL_CACHE = `${VERSION}-shell`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const IMAGE_CACHE = `${VERSION}-images`;   // versionné : les illustrations modifiées sont bien rechargées

const SHELL = ['./', './index.html', './style.css?v=5.0.0', './app.js?v=5.0.0', './manifest.json'];
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

  if (req.mode === 'navigate') { event.respondWith(networkFirst(req, './index.html')); return; }
  if (same && req.destination === 'image') { event.respondWith(staleWhileRevalidate(req, IMAGE_CACHE)); return; }
  if (same) { event.respondWith(networkFirst(req)); return; }
  if (url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')) {
    event.respondWith(staleWhileRevalidate(req, RUNTIME_CACHE));
  }
});

/* Réseau d'abord (avec revalidation auprès du serveur), cache en secours hors ligne */
async function networkFirst(req, fallbackKey) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const res = await fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' });
    if (res.ok) cache.put(fallbackKey || req, res.clone());
    return res;
  } catch (e) {
    return (await cache.match(fallbackKey || req)) || (await caches.match(req)) || (await cache.match('./')) || Response.error();
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  const update = fetch(req).then(res => {
    if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
    return res;
  }).catch(() => null);
  return hit || (await update) || Response.error();
}
