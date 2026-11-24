const genres=[["Pakistani","Atif Aslam · Rahat Fateh Ali Khan"],["Indian","Arijit Singh · Sonu Nigam"],["English","Ed Sheeran · Adele"],["Arabic","Arabic classics"],["Qawwali","Nusrat Fateh Ali Khan"],["Islamic / Nasheeds","Hamd · Nasheeds"],["Punjabi","Punjabi classics"],["Turkish","Turkish pop · classics"]];
const genreRoot=document.querySelector("#genres"),songRoot=document.querySelector("#songs");
genres.forEach(([name,desc])=>{const d=document.createElement("div");d.className="genre";d.innerHTML=`${name}<small>${desc}</small>`;genreRoot.append(d)});
const audio=document.querySelector("#audio"),picker=document.querySelector("#filePicker");
let tracks=[],current=-1;
const $=id=>document.getElementById(id);
function time(s){if(!Number.isFinite(s))return"0:00";return Math.floor(s/60)+":"+String(Math.floor(s%60)).padStart(2,"0")}
function render(q=""){songRoot.innerHTML="";const shown=tracks.map((t,i)=>({...t,index:i})).filter(t=>(t.title+" "+t.artist).toLowerCase().includes(q.toLowerCase()));
if(!shown.length){songRoot.innerHTML='<p class="muted">No songs yet. Select audio files above to add music.</p>';return}
shown.forEach(t=>{const d=document.createElement("div");d.className="song";d.innerHTML=`<button class="track-play" aria-label="Play">▶</button><div class="cover">♫</div><div class="track-meta"><b></b><small></small></div><span class="kind">LOCAL</span>`;d.querySelector("b").textContent=t.title;d.querySelector("small").textContent=t.artist;d.querySelector("button").onclick=()=>play(t.index);songRoot.append(d)})}
function play(i){if(i<0||i>=tracks.length)return;current=i;audio.src=tracks[i].url;audio.play().then(()=>{$("play").textContent="Ⅱ"}).catch(()=>{$("play").textContent="▶"});$("nowTitle").textContent=tracks[i].title;$("nowArtist").textContent=tracks[i].artist;render($("search").value)}
picker.addEventListener("change",e=>{[...e.target.files].forEach(file=>{if(!file.type.startsWith("audio/"))return;tracks.push({title:file.name.replace(/\.[^.]+$/,""),artist:"On this device",url:URL.createObjectURL(file)})});$("trackCount").textContent=tracks.length+" songs";render($("search").value);if(current===-1&&tracks.length)play(0);picker.value=""});
$("play").onclick=()=>{if(current===-1){if(tracks.length)play(0);return}if(audio.paused){audio.play();$("play").textContent="Ⅱ"}else{audio.pause();$("play").textContent="▶"}};
$("next").onclick=()=>{if(tracks.length)play((current+1)%tracks.length)};
$("prev").onclick=()=>{if(tracks.length)play((current-1+tracks.length)%tracks.length)};
audio.addEventListener("ended",()=>{if(tracks.length)play((current+1)%tracks.length)});
audio.addEventListener("timeupdate",()=>{if(audio.duration){$("seek").value=audio.currentTime/audio.duration*100;$("elapsed").textContent=time(audio.currentTime);$("duration").textContent=time(audio.duration)}});
$("seek").addEventListener("input",()=>{if(audio.duration)audio.currentTime=Number($("seek").value)/100*audio.duration});
$("search").addEventListener("input",e=>render(e.target.value));
render();
