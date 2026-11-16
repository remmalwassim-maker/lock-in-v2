// Network-first for the app's own files (so updates always arrive), cache fallback so it works fully offline.
const CACHE = 'lockin2-v1'
const FILES = ['./', 'index.html', 'css/style.css', 'manifest.webmanifest', 'fonts/inter.woff2', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png',
  'js/app.js', 'js/logic.js', 'js/clock.js', 'js/store.js', 'js/prayer.js', 'js/ui.js',
  'js/views/now.js', 'js/views/today.js', 'js/views/train.js', 'js/views/week.js', 'js/views/rules.js', 'js/views/settings.js']

self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())) })
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())) })
self.addEventListener('fetch', (e) => {
  const r = e.request
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return
  e.respondWith(fetch(r).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(r, copy)); return res }).catch(() => caches.match(r, { ignoreSearch: true }).then((m) => m || caches.match('index.html'))))
})
self.addEventListener('notificationclick', (e) => { e.notification.close(); e.waitUntil(clients.matchAll({ type: 'window' }).then((cs) => (cs[0] ? cs[0].focus() : clients.openWindow('./')))) })
