'use strict';
const $=id=>document.getElementById(id), audio=$('audio'), API='https://talal-music-api.mirzatalalahmad001.workers.dev/', STORE='talal-music-v5-library', TTL=29*86400000;
let data={favorites:[],playlists:[],recent:[],shuffle:false,repeat:'off',auto:true}, local=[],results=[],queue=[],shuffled=new Set(),index=-1,current=null,activePlaylist='',pending=0,searchToken=0,searchController,yt=null,ytReady=false,ytLoading=null,videoVisible=false,videoObserver=null,videoToken=0,installPrompt=null,dbPromise, audioOwner=0, endHandled=0, autoPlan=null;
const audioLookups=new Map(), STREAM_FRESH=60*60*1000;
const key=t=>t.source+':'+t.id, valid=t=>t&&typeof t.id==='string'&&['Local','YouTube','Jamendo','Audius'].includes(t.source), fresh=t=>valid(t)&&(t.source==='Local'||Date.now()-Number(t.checked)<TTL), time=s=>Number.isFinite(s)?Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0'):'0:00';
const elem=(tag,text,cls)=>{const x=document.createElement(tag);if(text!==undefined)x.textContent=text;if(cls)x.className=cls;return x};
function safeURL(v){try{const u=new URL(v);return u.protocol==='https:'?u.href:''}catch{return ''}}
function save(){try{localStorage.setItem(STORE,JSON.stringify(data))}catch{$('playStatus').textContent='Browser storage unavailable; changes may not survive a reload.'}}
function prune(){data.favorites=data.favorites.filter(fresh);data.recent=data.recent.filter(fresh);data.playlists.forEach(p=>p.tracks=p.tracks.filter(fresh));save()}
try{const s=JSON.parse(localStorage.getItem(STORE)||'null');if(s&&Array.isArray(s.favorites)&&Array.isArray(s.playlists)&&Array.isArray(s.recent))data={...data,...s,playlists:s.playlists.filter(p=>p&&Array.isArray(p.tracks))};prune()}catch{}
function snap(t){return {id:t.id,source:t.source,title:t.title,artist:t.artist,image:t.source==='Local'?'':t.image||'',license:t.license||'',shareurl:t.shareurl||'',checked:t.checked||Date.now()}}
function replaceSaved(t){const update=a=>a.map(x=>key(x)===key(t)?snap(t):x);data.favorites=update(data.favorites);data.recent=update(data.recent);data.playlists.forEach(p=>p.tracks=update(p.tracks));save()}
function button(text,fn,label){const b=elem('button',text);b.type='button';if(label)b.setAttribute('aria-label',label);b.onclick=fn;return b}
function link(text,href){const a=elem('a',text);a.href=href;a.target='_blank';a.rel='noopener noreferrer';return a}
function credits(root,t){root.replaceChildren();if(t.source==='Audius'&&safeURL(t.shareurl))root.append(link('Listen on Audius',t.shareurl));if(t.source==='YouTube')root.append(link('Watch on YouTube','https://www.youtube.com/watch?v='+encodeURIComponent(t.id)));if(t.source==='Jamendo'){root.append(link('Jamendo track','https://www.jamendo.com/track/'+encodeURIComponent(t.id)));if(safeURL(t.license))root.append(link('License',t.license))}}
function favorite(t){const k=key(t);if(data.favorites.some(x=>key(x)===k))data.favorites=data.favorites.filter(x=>key(x)!==k);else data.favorites.unshift(snap(t));save();renderAll()}
function addToPlaylist(t){if(!data.playlists.length){if(!newPlaylist())return}const p=data.playlists.find(p=>p.id===activePlaylist)||data.playlists[0];if(!p.tracks.some(x=>key(x)===key(t))){p.tracks.push(snap(t));save();renderAll()}$('playStatus').textContent='Saved to '+p.name;}
function render(root,list,empty,remove){root.replaceChildren();if(!list.length){root.append(elem('p',empty,'muted'));return}list.forEach((t,i)=>{const row=elem('article',undefined,'track');row.dataset.source=t.source;const img=elem('img',undefined,'cover');img.alt='';img.loading='lazy';img.src=safeURL(t.image)||'icon-192.png';img.onerror=()=>{img.onerror=null;img.src='icon-192.png'};const meta=elem('div',undefined,'meta');meta.append(elem('strong',t.title),elem('div',t.artist+' · '+t.source,'muted'));const ls=elem('div',undefined,'links');credits(ls,t);meta.append(ls);const a=elem('div',undefined,'actions');const play=button('▶',()=>start(list,i),'Play '+t.title);const liked=data.favorites.some(x=>key(x)===key(t));const f=button(liked?'♥':'♡',()=>favorite(t),'Toggle favorite '+t.title);f.setAttribute('aria-pressed',String(liked));if(liked)f.className='hearted';a.append(play,f,button('+ List',()=>addToPlaylist(t),'Add to selected playlist'));if(remove)a.append(button('Remove',()=>remove(t)));row.append(img,meta,a);root.append(row)})}
function newPlaylist(){const name=prompt('Playlist name (up to 60 characters):')?.trim().slice(0,60);if(!name)return false;const p={id:crypto.randomUUID(),name,tracks:[]};data.playlists.push(p);activePlaylist=p.id;save();renderAll();return true}
function renderAll(){render($('resultList'),results,'No results yet.');render($('localList'),local,'Add music files to start.',removeLocal);render($('favorites'),data.favorites,'Tap the heart on a track.');$('favCount').textContent=data.favorites.length+' saved';const sel=$('playlistSelect');sel.replaceChildren();if(!data.playlists.some(p=>p.id===activePlaylist))activePlaylist=data.playlists[0]?.id||'';if(!data.playlists.length){const o=elem('option','No playlists');o.value='';sel.append(o)}for(const p of data.playlists){const o=elem('option',p.name+' ('+p.tracks.length+')');o.value=p.id;sel.append(o)}sel.value=activePlaylist;const p=data.playlists.find(p=>p.id===activePlaylist);$('deletePlaylist').disabled=!p;render($('playlistList'),p?.tracks||[],'Create or select a playlist, then use + List on a track.',t=>{p.tracks=p.tracks.filter(x=>key(x)!==key(t));save();renderAll()});render($('recentList'),data.recent,'Played songs will appear here.')}
$('newPlaylist').onclick=newPlaylist;$('playlistSelect').onchange=e=>{activePlaylist=e.target.value;renderAll()};$('deletePlaylist').onclick=()=>{if(confirm('Delete this playlist?')){data.playlists=data.playlists.filter(p=>p.id!==activePlaylist);save();renderAll()}};$('clearRecent').onclick=()=>{data.recent=[];save();renderAll()};
function db(){if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{const r=indexedDB.open('talal-music-local-v5',1);r.onupgradeneeded=()=>r.result.createObjectStore('files',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});return dbPromise}
async function transact(mode,fn){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction('files',mode),r=fn(tx.objectStore('files'));tx.oncomplete=()=>resolve(r?.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}
function fileTrack(x){return {id:x.id,title:x.title,artist:'On this device',source:'Local',url:URL.createObjectURL(x.file)}}
async function loadLocal(){try{const files=await transact('readonly',s=>s.getAll());local=files.map(fileTrack)}catch{$('playStatus').textContent='Local file storage is unavailable.'}renderAll()}
$('files').onchange=async e=>{for(const file of e.target.files){if(!file.type.startsWith('audio/')&&!/\.(mp3|m4a|wav|ogg|flac|aac)$/i.test(file.name))continue;const x={id:crypto.randomUUID(),title:file.name.replace(/\.[^.]+$/,''),file};try{await transact('readwrite',s=>s.put(x))}catch{$('playStatus').textContent='Storage is full or unavailable; this file works only for this session.'}local.push(fileTrack(x))}e.target.value='';renderAll()};
async function removeLocal(t){if(!confirm('Remove this file from the app? Your original file is not deleted.'))return;try{await transact('readwrite',s=>s.delete(t.id))}catch{$('playStatus').textContent='Could not remove stored file.';return}if(current&&key(current)===key(t)){pending++;stop();current=null;index=-1;queue=[];resetPlayer()}local=local.filter(x=>key(x)!==key(t));if(t.url)URL.revokeObjectURL(t.url);data.favorites=data.favorites.filter(x=>key(x)!==key(t));data.recent=data.recent.filter(x=>key(x)!==key(t));data.playlists.forEach(p=>p.tracks=p.tracks.filter(x=>key(x)!==key(t)));save();renderAll()}
async function fetchData(path,params,signal){const u=new URL(path,API);for(const [k,v] of Object.entries(params))u.searchParams.set(k,v);const r=await fetch(u,{signal,cache:'no-store'});const d=await r.json();if(!r.ok||!Array.isArray(d.results))throw Error(d.error||'Music service unavailable.');return d}
function mapTrack(t,source){const id=String(t.id||'');if(source==='YouTube'&&!/^[A-Za-z0-9_-]{11}$/.test(id)||source==='Jamendo'&&!/^\d{1,20}$/.test(id)||source==='Audius'&&!/^[A-Za-z0-9]{1,32}$/.test(id))return null;return {id,source,title:String(t.name||'Untitled'),artist:String(t.artist_name||'Unknown'),image:safeURL(t.album_image),license:safeURL(String(t.license_ccurl||'').replace(/^http:/,'https:')),shareurl:safeURL(t.shareurl),url:source==='Jamendo'||source==='Audius'?safeURL(t.audio):'',duration:Number(t.duration),checked:Date.now(),embeddable:t.embeddable,madeForKids:t.madeForKids}}
async function search(q,source){q=q.trim().slice(0,100);if(!q)return;const n=++searchToken;searchController?.abort();searchController=new AbortController();$('searchStatus').textContent='Searching '+source+'…';$('resultTitle').textContent=source+' results';$('count').textContent='';results=[];renderAll();try{const d=await fetchData(source==='YouTube'?'youtube':source==='Audius'?'audius':'',{q},searchController.signal);if(n!==searchToken)return;if(d.source!==source)throw Error('Unexpected provider response.');results=d.results.map(t=>mapTrack(t,source)).filter(Boolean);$('count').textContent=results.length+' results';$('searchStatus').textContent=results.length?'Search complete.':'No matches found.';renderAll();$('results').scrollIntoView({block:'start'})}catch(e){if(n!==searchToken||e.name==='AbortError')return;$('searchStatus').textContent=e.message||'Search unavailable.'}}
function selectedSource(){return {youtube:'YouTube',jamendo:'Jamendo',audius:'Audius'}[$('source').value]||'YouTube'}
$('searchForm').onsubmit=e=>{e.preventDefault();search($('query').value,selectedSource())};
const genres=[['🇵🇰','Pakistani','Pakistani songs official music'],['🇮🇳','Indian','Bollywood Hindi songs official music'],['🇬🇧','English','English pop official music'],['🇸🇦','Arabic','Arabic songs official music'],['♫','Qawwali','Qawwali official'],['☪','Islamic / Nasheeds','Islamic nasheeds official'],['♪','Punjabi','Punjabi songs official music'],['🇹🇷','Turkish','Turkish songs official music']];for(const [icon,name,q] of genres){const b=button('',()=>{const provider=selectedSource();const query=provider==='YouTube'?q:name;$('query').value=query;search(query,provider)});b.className='genre';b.append(elem('span',icon),document.createTextNode(name));$('genres').append(b)}
function loadYT(){if(window.YT?.Player)return Promise.resolve();if(!ytLoading)ytLoading=new Promise((resolve,reject)=>{const s=elem('script');s.src='https://www.youtube.com/iframe_api';let timer=setTimeout(()=>{ytLoading=null;reject(Error('YouTube player could not load.'))},15000);window.onYouTubeIframeAPIReady=()=>{clearTimeout(timer);resolve()};s.onerror=()=>{clearTimeout(timer);ytLoading=null;reject(Error('YouTube player could not load.'))};document.head.append(s)});return ytLoading}
function stopVideo(){videoToken++;videoObserver?.disconnect();videoObserver=null;videoVisible=false;ytReady=false;try{yt?.destroy()}catch{}yt=null;$('videoFrame').replaceChildren();$('videoWrap').hidden=true}
function stop(){audioOwner=0;autoPlan=null;clearMedia();audio.pause();audio.removeAttribute('src');audio.load();stopVideo();$('play').textContent='Play'}
function resetPlayer(){$('nowTitle').textContent='Choose a song';$('nowArtist').textContent='';$('nowLinks').replaceChildren();$('art').src='icon-192.png';$('sourceTag').textContent='Ready';$('playStatus').textContent='';$('audioControls').hidden=false;$('play').disabled=false}
function record(){if(!current)return;data.recent=[snap(current),...data.recent.filter(x=>key(x)!==key(current))].slice(0,30);save();renderAll()}
function updateNow(t){$('nowTitle').textContent=t.title;$('nowArtist').textContent=t.artist;$('sourceTag').textContent=t.source;$('art').src=safeURL(t.image)||'icon-192.png';credits($('nowLinks'),t);$('seek').value=0;$('elapsed').textContent='0:00';$('duration').textContent=time(t.duration);$('audioControls').hidden=t.source==='YouTube';$('play').disabled=t.source==='YouTube';$('play').textContent=t.source==='YouTube'?'Use video controls':'Play'}
async function showYT(t,auto,n){await loadYT();if(n!==pending)return;const token=++videoToken;const frame=elem('iframe');frame.title='YouTube video: '+t.title;frame.src='https://www.youtube.com/embed/'+t.id+'?enablejsapi=1&playsinline=1&autoplay=0&origin='+encodeURIComponent(location.origin);frame.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';$('videoFrame').append(frame);$('videoWrap').hidden=false;let wantAuto=auto;const maybeAuto=()=>{if(wantAuto&&ytReady&&videoVisible&&!document.hidden){wantAuto=false;try{yt.playVideo()}catch{}}};videoObserver=new IntersectionObserver(([e])=>{if(token!==videoToken)return;videoVisible=e.intersectionRatio>0.5;if(!videoVisible&&ytReady){try{yt.pauseVideo()}catch{}}maybeAuto()},{threshold:[0,.51,1]});videoObserver.observe(frame);yt=new YT.Player(frame,{events:{onReady:()=>{if(token!==videoToken)return;ytReady=true;maybeAuto()},onStateChange:e=>{if(token!==videoToken)return;if(e.data===1){if(document.hidden||!videoVisible){try{yt.pauseVideo()}catch{}return}record()}if(e.data===0&&data.auto&&videoVisible&&!document.hidden)advance(1,true)},onError:()=>{$('playStatus').textContent='This video is unavailable here. Use Watch on YouTube or choose another track.'},onAutoplayBlocked:()=>{$('playStatus').textContent='Tap the YouTube player to continue.'}}});$('videoWrap').scrollIntoView({block:'center'});}
// Search results already contain provider-approved stream URLs. Keep them only
// in memory, and resolve saved tracks ahead of time without downloading audio.
function readyAudio(t){
  if(!t)return null;
  if(t.source==='Local')return local.find(x=>key(x)===key(t))||null;
  if(!['Audius','Jamendo'].includes(t.source)||!safeURL(t.url)||Date.now()-Number(t.checked)>=STREAM_FRESH||!Number.isFinite(Number(t.checked))||t.source==='Jamendo'&&!t.license)return null;
  return t;
}
function resolveAudio(t){
  const ready=readyAudio(t);if(ready)return Promise.resolve(ready);
  if(t.source==='Local')return Promise.reject(Error('Local file is unavailable. Add it again.'));
  const k=key(t);if(audioLookups.has(k))return audioLookups.get(k);
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),15000);
  const task=fetchData(t.source==='Audius'?'audius-track':'track',{id:t.id},controller.signal).then(d=>{
    if(d.source!==t.source)throw Error('Unexpected provider response.');
    const resolved=mapTrack(d.results[0]||{},t.source);
    if(!resolved||resolved.id!==t.id||!readyAudio(resolved))throw Error('No licensed audio stream available.');
    return resolved;
  }).finally(()=>{clearTimeout(timeout);audioLookups.delete(k)});
  audioLookups.set(k,task);return task;
}
function chooseNext(d,automatic){
  if(!queue.length||index<0)return {i:-1};
  if(automatic&&data.repeat==='one')return {i:index};
  let i=index+d,reset=false;
  if(data.shuffle&&queue.length>1){
    let choices=queue.map((_,j)=>j).filter(j=>j!==index&&!shuffled.has(j));
    if(!choices.length){if(automatic&&data.repeat==='off')return {i:-1,reason:'End of shuffled queue.'};reset=true;choices=queue.map((_,j)=>j).filter(j=>j!==index)}
    i=choices[Math.floor(Math.random()*choices.length)];
  }else if(i<0||i>=queue.length){if(data.repeat==='all'||!automatic)i=(i+queue.length)%queue.length;else return {i:-1,reason:'End of queue.'}}
  return {i,reset};
}
function prepareNext(){
  if(!data.auto||!current||current.source==='YouTube'||data.repeat==='one')return;
  if(!autoPlan)autoPlan=chooseNext(1,true);
  const i=autoPlan.i,t=queue[i],list=queue;
  if(!t||t.source==='YouTube'||t.source==='Local'||readyAudio(t))return;
  resolveAudio(t).then(resolved=>{if(queue===list&&queue[i]&&key(queue[i])===key(resolved))queue[i]=resolved}).catch(()=>{});
}
function syncLoop(){audio.loop=Boolean(data.auto&&data.repeat==='one'&&current&&current.source!=='YouTube')}
async function playAt(i,auto=false){
  if(i<0||i>=queue.length)return;
  const n=++pending;audioOwner=0;autoPlan=null;index=i;shuffled.add(i);current=queue[i];
  // Keep the same HTML audio element and media session across audio tracks.
  // Do not pause/load/clear the session between already resolved audio tracks.
  if(current.source==='YouTube'){stop();}else if(yt||!$('videoWrap').hidden){stopVideo();}
  updateNow(current);$('playStatus').textContent='Loading…';syncLoop();
  try{
    let t=current;
    if(t.source==='YouTube'){
      const d=await fetchData('video',{id:t.id});if(n!==pending)return;
      t=mapTrack(d.results[0]||{},'YouTube');if(!t||t.id!==current.id)throw Error('This track is no longer available.');
      replaceSaved(t);queue[i]=t;current=t;updateNow(t);$('playStatus').textContent='';
      if(!t.embeddable||t.madeForKids!==false){$('playStatus').textContent='This video cannot be embedded here. Use Watch on YouTube.';return}
      await showYT(t,auto,n);return;
    }
    const ready=readyAudio(t);
    if(ready)t=ready;
    else{audio.pause();t=await resolveAudio(t);if(n!==pending)return;}
    if(n!==pending)return;
    queue[i]=t;current=t;updateNow(t);syncLoop();
    audioOwner=n;audio.src=t.url;
    // No network lookup or asynchronous work before play() on a ready track.
    const playing=audio.play();
    if(!ready&&t.source!=='Local')replaceSaved(t);
    try{await playing;}catch(e){if(n===pending)$('playStatus').textContent=e.name==='NotAllowedError'?'Tap Play to continue audio.':'Audio unavailable. Tap Next or try another track.'}
  }catch(e){if(n===pending)$('playStatus').textContent=e.name==='AbortError'?'Music service took too long. Try again.':e.message||'Playback unavailable.'}
}
function start(list,i){queue=list.slice();shuffled=new Set();autoPlan=null;playAt(i);$('player').scrollIntoView({block:'start'})}
function advance(d,automatic=false){const plan=automatic&&autoPlan?autoPlan:chooseNext(d,automatic);autoPlan=null;if(plan.i<0){if(plan.reason)$('playStatus').textContent=plan.reason;return}if(plan.reset)shuffled=new Set([index]);playAt(plan.i,automatic||current?.source==='YouTube')}
function handleEnded(){if(!audio.ended||audioOwner!==pending||endHandled===pending||current?.source==='YouTube')return;endHandled=pending;if(data.auto)advance(1,true)}
$('prev').onclick=()=>advance(-1);$('next').onclick=()=>advance(1);$('closeVideo').onclick=()=>{pending++;stopVideo();$('playStatus').textContent='Video closed. Select a track to reopen.'};$('play').onclick=()=>{if(!current){const list=local.length?local:results;if(list.length)start(list,0);return}if(current.source==='YouTube')return;if(audioOwner!==pending||!audio.getAttribute('src')){playAt(index);return}if(audio.paused)audio.play().catch(()=>{$('playStatus').textContent='Playback could not start.'});else audio.pause()};audio.onplay=()=>{if(audioOwner!==pending||current?.source==='YouTube')return;$('play').textContent='Pause';setMedia();record();prepareNext()};audio.onplaying=()=>{if(audioOwner===pending){$('playStatus').textContent='';setMedia();prepareNext()}};audio.onwaiting=()=>{if(audioOwner===pending&&!audio.paused)$('playStatus').textContent='Buffering audio…'};audio.onpause=()=>{$('play').textContent='Play';if('mediaSession' in navigator&&current?.source!=='YouTube')navigator.mediaSession.playbackState='paused'};audio.onended=handleEnded;audio.onerror=()=>{if(audioOwner===pending&&audio.getAttribute('src'))$('playStatus').textContent='Audio unavailable. Try another track.'};audio.ontimeupdate=()=>{if(Number.isFinite(audio.duration)&&audio.duration>0){$('seek').value=audio.currentTime/audio.duration*100;$('elapsed').textContent=time(audio.currentTime);$('duration').textContent=time(audio.duration)}};$('seek').oninput=()=>{if(Number.isFinite(audio.duration))audio.currentTime=Number($('seek').value)/100*audio.duration};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&ytReady){try{yt.pauseVideo()}catch{}}else if(!document.hidden)handleEnded()});
function prefs(){$('shuffle').textContent='Shuffle '+(data.shuffle?'on':'off');$('shuffle').setAttribute('aria-pressed',String(data.shuffle));$('repeat').textContent='Repeat '+data.repeat;$('repeat').setAttribute('aria-pressed',String(data.repeat!=='off'));$('autoNext').checked=data.auto;syncLoop()}
$('shuffle').onclick=()=>{data.shuffle=!data.shuffle;shuffled=new Set(index>=0?[index]:[]);autoPlan=null;save();prefs();prepareNext()};$('repeat').onclick=()=>{data.repeat={off:'all',all:'one',one:'off'}[data.repeat];autoPlan=null;save();prefs();prepareNext()};$('autoNext').onchange=e=>{data.auto=e.target.checked;autoPlan=null;save();syncLoop();prepareNext()};
$('clearData').onclick=async()=>{if(!confirm('Delete all local files, favorites, playlists and history from this app?'))return;pending++;stop();try{await transact('readwrite',s=>s.clear())}catch{$('playStatus').textContent='Could not clear stored files; clear browser site data manually.';return}local.forEach(t=>URL.revokeObjectURL(t.url));local=[];queue=[];results=[];current=null;index=-1;data={favorites:[],playlists:[],recent:[],shuffle:false,repeat:'off',auto:true};localStorage.removeItem(STORE);resetPlayer();renderAll();prefs()};
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e});$('install').onclick=async()=>{if(installPrompt){await installPrompt.prompt();installPrompt=null;return}alert('Android / Chrome: menu ⋮ → Install app or Add to Home screen. iPhone: Safari → Share → Add to Home Screen. Desktop: browser install menu. If already installed, open TALAL MUSIC from your home screen.')};
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});prefs();renderAll();loadLocal();setInterval(()=>{prune();renderAll()},3600000);

function clearMedia(){if(!('mediaSession' in navigator))return;try{navigator.mediaSession.metadata=null;navigator.mediaSession.playbackState='none';for(const a of ['play','pause','previoustrack','nexttrack','seekto']){try{navigator.mediaSession.setActionHandler(a,null)}catch{}}}catch{}}
function setMedia(){if(!('mediaSession' in navigator)||!current||current.source==='YouTube')return;try{const m=navigator.mediaSession;m.metadata=new MediaMetadata({title:current.title,artist:current.artist,album:current.source});m.playbackState='playing';const handlers={play:()=>audio.play().catch(()=>{}),pause:()=>audio.pause(),previoustrack:()=>advance(-1),nexttrack:()=>advance(1),seekto:e=>{if(Number.isFinite(audio.duration)&&Number.isFinite(e.seekTime))audio.currentTime=e.seekTime}};for(const [a,h] of Object.entries(handlers)){try{m.setActionHandler(a,h)}catch{}}}catch{}}
