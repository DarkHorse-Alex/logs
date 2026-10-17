const CACHE='dh-logview-v3';
const CORE=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE&&k!=='dh-share').map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  if(e.request.method==='POST'&&url.pathname.endsWith('/share')){
    e.respondWith((async()=>{
      try{const fd=await e.request.formData();const f=fd.getAll('log').find(x=>x&&typeof x==='object');
        if(f){const c=await caches.open('dh-share');
          await c.put(new URL('shared-file',self.registration.scope).href,new Response(f,{headers:{'x-name':encodeURIComponent(f.name||'shared.csv')}}))}
      }catch(err){}
      return Response.redirect(new URL('./?shared=1',self.registration.scope).href,303);
    })());return;
  }
  if(e.request.method!=='GET'||url.origin!==location.origin)return;
  e.respondWith(caches.open(CACHE).then(async c=>{
    const hit=await c.match(e.request,{ignoreSearch:true});
    const net=fetch(e.request).then(r=>{if(r.ok)c.put(e.request,r.clone());return r}).catch(()=>hit);
    return hit||net;
  }));
});
