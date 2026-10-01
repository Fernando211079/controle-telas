/* Service Worker — Controle de Telas | Indemetal
   Estratégia: app shell em cache-first (funciona offline),
   chamadas ao Supabase sempre na rede (nunca cachear auth/dados). */
const CACHE = 'controle-telas-v1.2';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/styles.css',
  './assets/app.js',
  './assets/catalogo.js',
  './assets/seed.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-512-maskable.png',
  './assets/icons/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => Promise.allSettled(ASSETS.map((a) => c.add(a))))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // API Supabase (auth + banco): sempre rede, sem cache
  if (url.hostname.includes('supabase.co')) return;

  if (url.origin === location.origin) {
    // App shell: cache-first, com atualização em segundo plano
    e.respondWith(
      caches.match(e.request, { ignoreSearch: true }).then((hit) => {
        const net = fetch(e.request)
          .then((r) => {
            if (r.ok) caches.open(CACHE).then((c) => c.put(e.request, r.clone()));
            return r;
          })
          .catch(() => hit);
        return hit || net;
      })
    );
  } else {
    // Terceiros (CDN/fonts): stale-while-revalidate
    e.respondWith(
      caches.open(CACHE).then(async (c) => {
        const hit = await c.match(e.request);
        const net = fetch(e.request)
          .then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; })
          .catch(() => hit);
        return hit || net;
      })
    );
  }
});
