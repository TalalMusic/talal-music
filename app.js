'use strict';
const API='https://talal-music-api.mirzatalalahmad001.workers.dev/';
const $=id=>document.getElementById(id);
const audio=$('audio');
const genres=[['Pakistani','Pakistan'],['Indian','India'],['English','English pop'],['Arabic','Arabic'],['Qawwali','Qawwali'],['Islamic / Nasheeds','Nasheed'],['Punjabi','Punjabi'],['Turkish','Turkish']];
let local=[],online=[],queue=[],current=-1,requestNumber=0,controller;
const time=s=>Number.isFinite(s)?Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0'):'0:00';
function safeURL(value){try{const u=new URL(value);return u.protocol==='https:'?u.href:''}catch{return ''}}
function credit(root,t){root.replaceChildren();if(!t||t.source!=='Jamendo')return;const a=document.createElement('a');a.href='https://www.jamendo.com/track/'+encodeURIComponent(t.id);a.target='_blank';a.rel='noopener noreferrer';a.textContent='Jamendo track';root.append(a);if(t.license){const l=document.createElement('a');l.href=t.license;l.target='_blank';l.rel='noopener noreferrer';l.textContent='License';root.append(' · ',l)}}
function render(root,list,empty){root.replaceChildren();if(!list.length){const p=document.createElement('p');p.className='muted';p.textContent=empty;root.append(p);return}list.forEach((t,i)=>{const row=document.createElement('div');row.className='song';const b=document.createElement('button');b.className='track-play';b.textContent='▶';b.setAttribute('aria-label','Play '+t.title);b.onclick=()=>start(list,i);const cover=document.createElement('div');cover.className='cover';cover.textContent='♫';if(t.image){const img=document.createElement('img');img.src=t.image;img.alt='';img.loading='lazy';img.onerror=()=>img.remove();cover.append(img)}const meta=document.createElement('div');meta.className='track-meta';const title=document.createElement('b');title.textContent=t.title;const artist=document.createElement('small');artist.textContent=t.artist;const links=document.createElement('div');links.className='credit';credit(links,t);meta.append(title,artist,links);const kind=document.createElement('span');kind.className='kind';kind.textContent=t.source==='Jamendo'?'ONLINE':'LOCAL';row.append(b,cover,meta,kind);root.append(row)})}
function start(list,i){queue=list.slice();play(i)}
function play(i){if(i<0||i>=queue.length)return;closeYouTube();current=i;const t=queue[i];audio.src=t.url;$('nowTitle').textContent=t.title;$('nowArtist').textContent=t.artist;credit($('nowCredit'),t);$('playerStatus').textContent='';$('seek').value=0;$('elapsed').textContent='0:00';$('duration').textContent=time(t.duration);$('playerArt').replaceChildren(document.createTextNode('♫'));if(t.image){const img=document.createElement('img');img.src=t.image;img.alt='';img.onerror=()=>img.remove();$('playerArt').append(img)}resume();}
function resume(){closeYouTube();audio.play().catch(()=>{$('playerStatus').textContent='Could not start playback. Try Play again or choose another track.'})}
function move(d){if(queue.length)play((current+d+queue.length)%queue.length)}
$('play').onclick=()=>{if(current<0){const list=online.length?online:local;if(list.length)start(list,0);return}if(audio.paused)resume();else audio.pause()};$('next').onclick=()=>move(1);$('prev').onclick=()=>move(-1);audio.addEventListener('ended',()=>move(1));audio.addEventListener('play',()=>{$('play').textContent='Ⅱ';$('playerStatus').textContent=''});audio.addEventListener('pause',()=>{$('play').textContent='▶'});audio.addEventListener('error',()=>{$('playerStatus').textContent='This audio could not be loaded. Try another track.'});audio.addEventListener('timeupdate',()=>{if(Number.isFinite(audio.duration)&&audio.duration>0){$('seek').value=audio.currentTime/audio.duration*100;$('elapsed').textContent=time(audio.currentTime);$('duration').textContent=time(audio.duration)}});$('seek').oninput=()=>{if(Number.isFinite(audio.duration)&&audio.duration>0)audio.currentTime=Number($('seek').value)/100*audio.duration};
$('filePicker').onchange=e=>{for(const f of e.target.files){if(f.type.startsWith('audio/')||/\.(mp3|m4a|wav|ogg|flac|aac)$/i.test(f.name)){local.push({title:f.name.replace(/\.[^.]+$/,''),artist:'On this device',url:URL.createObjectURL(f),source:'Local'})}}$('trackCount').textContent=local.length+' songs';render($('songs'),local,'Add music files to start listening.');if(current===-1&&local.length)start(local,0);e.target.value=''};
async function search(q){const n=++requestNumber;if(controller)controller.abort();controller=new AbortController();$('onlineStatus').textContent='Finding music…';$('onlineCount').textContent='Jamendo';$('onlineSongs').replaceChildren();online=[];try{const u=new URL(API);u.searchParams.set('q',q.trim().slice(0,100));const res=await fetch(u,{signal:controller.signal,cache:'no-store'});const data=await res.json();if(n!==requestNumber)return;if(!res.ok||!Array.isArray(data.results))throw Error('API error');online=data.results.map(t=>({id:String(t.id||''),title:String(t.name||'Untitled'),artist:String(t.artist_name||'Unknown artist'),url:safeURL(t.audio),image:safeURL(t.album_image),duration:Number(t.duration),license:safeURL(String(t.license_ccurl||'').replace(/^http:/,'https:')),source:'Jamendo'})).filter(t=>t.id&&t.url&&t.license);$('onlineCount').textContent=online.length+' songs';$('onlineStatus').textContent=online.length?'Music from independent artists · Jamendo':'No matching tracks found. Try pop, jazz or another search.';render($('onlineSongs'),online,'No tracks available.')}catch(e){if(n!==requestNumber||e.name==='AbortError')return;$('onlineStatus').textContent='Online music is unavailable. Check your connection and try Search again.'}}
let ytRequest=0,ytController;
function closeYouTube(){ $('ytFrame').replaceChildren(); $('ytPlayer').hidden=true; }
$('ytClose').onclick=closeYouTube;
document.addEventListener('visibilitychange',()=>{if(document.hidden)closeYouTube()});
function openYouTube(t){
  audio.pause(); closeYouTube();
  $('ytTitle').textContent=t.title;
  $('ytLink').href='https://www.youtube.com/watch?v='+t.id;
  const frame=document.createElement('iframe');
  frame.title='YouTube video: '+t.title;
  frame.src='https://www.youtube.com/embed/'+t.id;
  frame.allow='accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen';
  frame.allowFullscreen=true;
  frame.referrerPolicy='strict-origin-when-cross-origin';
  $('ytFrame').append(frame); $('ytPlayer').hidden=false;
  $('ytPlayer').scrollIntoView({behavior:'smooth',block:'start'});
}
async function searchYouTube(q){
  q=q.trim().slice(0,100);
  if(!q){$('ytStatus').textContent='Enter a song or artist first.';return;}
  const n=++ytRequest; if(ytController)ytController.abort(); ytController=new AbortController();
  $('ytSongs').replaceChildren(); $('ytCount').textContent='YouTube'; $('ytStatus').textContent='Searching YouTube…';
  try{
    const u=new URL('youtube',API);u.searchParams.set('q',q);
    const res=await fetch(u,{signal:ytController.signal,cache:'no-store'});const data=await res.json();
    if(n!==ytRequest)return;
    if(!res.ok||data.source!=='YouTube'||!Array.isArray(data.results))throw Error('API error');
    const tracks=data.results.filter(t=>/^[A-Za-z0-9_-]{11}$/.test(t.id)).map(t=>({id:t.id,title:String(t.name||'Untitled'),artist:String(t.artist_name||'YouTube channel'),image:safeURL(t.album_image)}));
    $('ytCount').textContent=tracks.length+' videos';$('ytStatus').textContent=tracks.length?'Choose a video to load its YouTube player.':'No matching videos. Try another song or artist.';
    tracks.forEach(t=>{
      const row=document.createElement('div');row.className='song';
      const b=document.createElement('button');b.className='track-play';b.textContent='▶';b.setAttribute('aria-label','Open YouTube video '+t.title);b.onclick=()=>openYouTube(t);
      const cover=document.createElement('div');cover.className='cover';cover.textContent='♫';if(t.image){const img=document.createElement('img');img.src=t.image;img.alt='';img.loading='lazy';img.onerror=()=>img.remove();cover.append(img)}
      const meta=document.createElement('div');meta.className='track-meta';const title=document.createElement('b');title.textContent=t.title;const channel=document.createElement('small');channel.textContent=t.artist;
      const links=document.createElement('div');links.className='credit';const link=document.createElement('a');link.href='https://www.youtube.com/watch?v='+t.id;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Watch on YouTube';links.append(link);meta.append(title,channel,links);
      const kind=document.createElement('span');kind.className='kind';kind.textContent='YouTube';row.append(b,cover,meta,kind);$('ytSongs').append(row);
    });
  }catch(e){if(n!==ytRequest||e.name==='AbortError')return;$('ytStatus').textContent='YouTube search unavailable. The API quota may be exhausted. Try later or switch to Jamendo.';}
}
function submitSearch(){const q=$('search').value;if($('source').value==='youtube'){searchYouTube(q);$('youtube').scrollIntoView({behavior:'smooth'});}else{search(q);$('online').scrollIntoView({behavior:'smooth'});}}
$('onlineForm').onsubmit=e=>{e.preventDefault();submitSearch()};
const categoryQueries={'Pakistani':'Pakistani songs official music','Indian':'Bollywood Hindi songs official music','English':'English pop official music','Arabic':'Arabic songs official music','Qawwali':'Qawwali Nusrat Fateh Ali Khan official','Islamic / Nasheeds':'Islamic nasheeds official','Punjabi':'Punjabi songs official music','Turkish':'Turkish songs official music'};
genres.forEach(([name,q])=>{const d=document.createElement('button');d.type='button';d.className='genre';d.textContent=name;d.onclick=()=>{$('source').value='youtube';$('search').value=categoryQueries[name]||q;submitSearch()};$('genres').append(d)});
render($('songs'),local,'Add music files to start listening.');search('pop');
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
