// Onkel A's Ø service worker: henter altid nyeste version med internet, virker offline uden.
const CACHE = "klogeoeen-4cecfe358b";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png"];

self.addEventListener("install", e => {
  // cache:"reload" springer browserens HTTP-cache over, så vi aldrig gemmer en gammel side
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL.map(u => new Request(u, {cache: "reload"})))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const same = url.origin === location.origin;
  const ok = same || url.hostname === "cdnjs.cloudflare.com" || url.hostname.endsWith("googleapis.com") || url.hostname.endsWith("gstatic.com");
  if (!ok) return;
  // Selve siden: netværk først (nyeste version), gemt kopi kun når man er offline
  if (req.mode === "navigate" || (same && (url.pathname.endsWith("/") || url.pathname.endsWith("index.html")))) {
    e.respondWith(fetch(new Request(req.url, {cache: "no-cache"})).then(res => {
      if (res.ok) caches.open(CACHE).then(c => c.put("./", res.clone()));
      return res;
    }).catch(() => caches.match("./", {ignoreSearch: true})));
    return;
  }
  // Alt andet (ikoner, 3D-motor, skrifttyper): gemt kopi først, opdateres i baggrunden
  e.respondWith(caches.open(CACHE).then(async cache => {
    const hit = await cache.match(req, {ignoreSearch: same});
    const net = fetch(req).then(res => {
      if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});
