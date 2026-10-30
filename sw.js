/* ==========================================================================
   LOUP-GAROU — sw.js (Service Worker)
   Stratégies :
     • Navigation (HTML)      → réseau d'abord, cache en secours (hors ligne)
     • Images                 → cache d'abord (les illustrations changent rarement)
     • CSS / JS / polices     → cache immédiat + mise à jour en arrière-plan
   Pour publier une mise à jour : incrémentez VERSION.
   ========================================================================== */
const VERSION = 'lg-v4.0.0';
const SHELL_CACHE = `${VERSION}-shell`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const IMAGE_CACHE = 'lg-images'; // conservé entre les versions

/* Fichiers indispensables : l'installation échoue si l'un d'eux manque */
const SHELL = ['./', './index.html', './style.css', './app.js', './manifest.json'];

/* Fichiers facultatifs : mis en cache s'ils existent, ignorés sinon */
const OPTIONAL = [
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png',
  './assets/icons/apple-touch-icon.png',
  './assets/images/dos-de-carte.jpg',
  './assets/images/accueil.jpg',
  './assets/images/accueil-paysage.jpg',
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const shell = await caches.open(SHELL_CACHE);
    await shell.addAll(SHELL);
    const img = await caches.open(IMAGE_CACHE);
    await Promise.allSettled(OPTIONAL.map(u => img.add(u)));
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

/* L'application envoie la liste des illustrations à pré-charger */
self.addEventListener('message', event => {
  const data = event.data || {};
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

  // 1. Pages : réseau d'abord
  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req));
    return;
  }
  // 2. Images : cache d'abord
  if (req.destination === 'image' && url.origin === self.location.origin) {
    event.respondWith(cacheFirst(req, IMAGE_CACHE));
    return;
  }
  // 3. Google Fonts + fichiers du site : stale-while-revalidate
  if (url.origin === self.location.origin || url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')) {
    event.respondWith(staleWhileRevalidate(req));
  }
});

async function networkFirst(req) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put('./index.html', res.clone());
    return res;
  } catch (e) {
    return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
  }
}

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone()); // les 404 (images pas encore créées) ne sont pas mis en cache
    return res;
  } catch (e) {
    return Response.error();
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(RUNTIME_CACHE);
  const shellHit = await caches.match(req);
  const update = fetch(req).then(res => {
    if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
    return res;
  }).catch(() => null);
  return shellHit || (await update) || Response.error();
}
