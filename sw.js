const CACHE='talal-music-v3';
const FILES=['./','./index.html','./style.css','./online.css','./app.js','./manifest.json'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('talal-music-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
const allowed=new Set(FILES.map(f=>new URL(f,self.registration.scope).href));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||!allowed.has(e.request.url))return;e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(e.request,copy)))}return r}).catch(()=>caches.match(e.request).then(r=>r||Response.error())))});
