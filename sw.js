const CORE_CACHE='family-kitchen-core-v3.7.7-fresh-assets';
const IMAGE_CACHE='family-kitchen-images-v1';
const CORE=['./','./index.html','./styles.css','./app.js','./manifest.webmanifest','./icon-192.png','./icon-512.png'];

self.addEventListener('install',event=>event.waitUntil(
  caches.open(CORE_CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting())
));

self.addEventListener('activate',event=>event.waitUntil(
  caches.keys()
    .then(keys=>Promise.all(keys.filter(key=>key!==CORE_CACHE&&key!==IMAGE_CACHE).map(key=>caches.delete(key))))
    .then(()=>self.clients.claim())
));

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  const sameOrigin=url.origin===location.origin;

  if(sameOrigin&&request.mode==='navigate'){
    const update=fetch(request).then(response=>{
      if(response.ok){
        const copy=response.clone();
        caches.open(CORE_CACHE).then(cache=>cache.put('./index.html',copy));
      }
      return response;
    });
    event.waitUntil(update.catch(()=>{}));
    event.respondWith(caches.match('./index.html').then(cached=>cached||update));
    return;
  }

  if(sameOrigin){
    const fresh=fetch(request).then(response=>{
      if(response.ok){
        const copy=response.clone();
        caches.open(CORE_CACHE).then(cache=>cache.put(request,copy));
      }
      return response;
    });
    event.respondWith(fresh.catch(()=>caches.match(request)));
    return;
  }

  if(request.destination==='image'){
    event.respondWith(caches.open(IMAGE_CACHE).then(async cache=>{
      const cached=await cache.match(request);
      if(cached)return cached;
      try{
        const response=await fetch(request);
        if(response.ok||response.type==='opaque')await cache.put(request,response.clone());
        return response;
      }catch{
        return new Response('',{status:504,statusText:'Offline image unavailable'});
      }
    }));
  }
});
