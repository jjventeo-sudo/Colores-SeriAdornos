/* Trabajador de segundo plano.

   Guarda la app entera la primera vez. A partir de ahí abre al instante y
   funciona sin cobertura, que en el taller pasa. Estrategia: se sirve lo
   guardado y se comprueba por detrás si hay algo nuevo; cuando lo hay, la app
   avisa y se recarga sola al recargar la página.

   VERSION cambia con cada construcción, así que una app nueva se instala sola
   y la anterior se borra. Es el mismo número que sale en Opciones › Datos y
   versión. */
const PREFIJO = 'colores-';
const VERSION = PREFIJO + 'f13673ec';

/* Lo ESENCIAL: sin esto la app no abre sin cobertura, así que si falla, la
   instalación falla y se reintenta la próxima vez (mejor eso que una caché
   vacía que parece buena). Lo OPCIONAL se guarda si está: antes iba todo junto
   en un addAll, y bastaba con que faltara un icono en el repositorio para que
   NO se guardara nada y la app no abriera sin cobertura, sin ningún aviso. */
const ESENCIALES = ['./', './index.html'];
const OPCIONALES = ['./manifest.webmanifest', './icono-192.png', './icono-512.png'];

/* `reload`: va a la red de verdad. Sin esto, la copia que ya tiene el navegador
   (GitHub Pages deja diez minutos) podía guardarse como «la versión nueva». */
const nuevaPeticion = u => new Request(u, {cache: 'reload'});

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await Promise.all(ESENCIALES.map(u => c.add(nuevaPeticion(u))));
    await Promise.allSettled(OPCIONALES.map(u => c.add(nuevaPeticion(u))));
  })());
});

/* Solo se borran las cachés de ESTA app. En github.io todas las aplicaciones de
   una misma cuenta comparten dirección, y por tanto caché: borrar «todo lo que
   no sea mi versión» se llevaba por delante la de las demás. */
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys())
      if (k.startsWith(PREFIJO) && k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;   // nada de terceros
  e.respondWith((async () => {
    const c = await caches.open(VERSION);
    const guardado = await c.match(e.request, {ignoreSearch: true});
    /* `no-cache`: pregunta al servidor si ha cambiado (una respuesta de unos
       cientos de bytes si no) en vez de fiarse de la copia del navegador. */
    const red = fetch(e.request, {cache: 'no-cache'}).then(r => {
      if (r && r.ok && r.type === 'basic') c.put(e.request, r.clone()).catch(() => {});
      return r;
    });
    if (guardado) {
      e.waitUntil(red.catch(() => {}));         // se actualiza por detrás
      return guardado;
    }
    return red.catch(() => Response.error());
  })());
});
