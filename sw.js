// sw.js - 简易预缓存 + 运行时缓存 (静态资源 + 图标)
const VERSION = 'v2.3.0';
const PRECACHE = `precache-${VERSION}`;
const RUNTIME = `runtime-${VERSION}`;
const CORE_ASSETS = [
  './',
  './index.html',
  './css/main.css',
  './js/app.js',
  './js/state/appState.js',
  './js/core/spin.js',
  './js/multiplayer/assign.js',
  './js/ui/render.js',
  './js/share/controller.js',
  './js/share/imageGenerator.js',
  './js/data.js',
  './js/utils.js',
  './js/wheel.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(PRECACHE).then(cache => cache.addAll(CORE_ASSETS)).then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>![PRECACHE,RUNTIME].includes(k)).map(k=>caches.delete(k)))).then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // 仅同源
  if (url.origin !== location.origin) return;
  // 图标与 weapon_icon 走运行时缓存（Cache First）
  if (url.pathname.includes('/weapon_icon')){
    e.respondWith(
      caches.match(e.request).then(cached=> cached || fetch(e.request).then(res=>{
        const copy = res.clone();
        caches.open(RUNTIME).then(c=>c.put(e.request, copy));
        return res;
      }).catch(()=>cached))
    );
    return;
  }
  // 其它静态资源：Cache First 回退网络
  if (CORE_ASSETS.some(a=>url.pathname.endsWith(a.replace('./','/')))){
    e.respondWith(caches.match(e.request).then(c=> c || fetch(e.request)));
    return;
  }
});
