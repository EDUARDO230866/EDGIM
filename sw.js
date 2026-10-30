/* Service worker de EDGIM: la app abre sin internet.
   - Archivos de la app y librería de Supabase: primero caché (y se actualizan en segundo plano).
   - Supabase y la API de Claude: primero red; las peticiones que no son GET nunca pasan por la caché.
   Al publicar cambios grandes, sube CACHE (edgim-v2, v3…) para borrar la caché vieja. */
const CACHE = "edgim-v1";
const SUPABASE_LIB = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js";
const APP_FILES = ["./", "index.html", "styles.css", "config.js", "data.js", "auth.js", "app.js", "manifest.json", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png", SUPABASE_LIB];

self.addEventListener("install", (ev) => {
  ev.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (ev) => {
  ev.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

const isNetworkFirst = (url) => url.hostname.endsWith(".supabase.co") || url.hostname === "api.anthropic.com";

self.addEventListener("fetch", (ev) => {
  const req = ev.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (!url.protocol.startsWith("http")) return;

  if (isNetworkFirst(url)) {
    ev.respondWith(fetch(req).catch(() => caches.match(req).then((r) => r || Response.error())));
    return;
  }
  // Primero caché; en segundo plano trae la versión nueva para la próxima vez
  ev.respondWith(caches.open(CACHE).then(async (cache) => {
    const cached = await cache.match(req, { ignoreSearch: req.mode === "navigate" }) || (req.mode === "navigate" ? await cache.match("index.html") : null);
    const fresh = fetch(req).then((res) => { if (res.ok || res.type === "opaque") cache.put(req, res.clone()); return res; }).catch(() => null);
    if (cached) { ev.waitUntil(fresh); return cached; }
    return (await fresh) || Response.error();
  }));
});
