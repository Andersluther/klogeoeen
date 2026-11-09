// Onkel A's Ø service worker: virker offline og henter nye versioner i baggrunden.
const CACHE = "klogeoeen-23a1291127";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const ok = url.origin === location.origin || url.hostname === "cdnjs.cloudflare.com" || url.hostname.endsWith("googleapis.com") || url.hostname.endsWith("gstatic.com");
  if (!ok) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const hit = await cache.match(req, {ignoreSearch: url.origin === location.origin});
    const net = fetch(req).then(res => {
      if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});
