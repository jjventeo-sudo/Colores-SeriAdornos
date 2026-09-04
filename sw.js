/* Trabajador de segundo plano.

   Guarda la app entera la primera vez. A partir de ahí abre al instante y
   funciona sin cobertura, que en el taller pasa. Estrategia: se sirve lo
   guardado y se busca actualización por detrás; cuando la hay, la app avisa
   y se recarga sola al recargar la página.

   VERSION cambia con cada construcción, así que una app nueva se instala sola
   y la anterior se borra. */
const VERSION = 'colores-f7d3ada8';
const FICHEROS = ['./', './index.html', './manifest.webmanifest',
                  './icono-192.png', './icono-512.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FICHEROS)).catch(()=>{}));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;   // nada de terceros
  e.respondWith((async () => {
    const guardado = await caches.match(e.request, {ignoreSearch: true});
    const red = fetch(e.request).then(r => {
      if (r && r.ok) caches.open(VERSION).then(c => c.put(e.request, r.clone()));
      return r;
    }).catch(() => guardado);
    return guardado || red;
  })());
});
