const genres=[["Pakistani","Atif Aslam · Rahat Fateh Ali Khan"],["Indian","Arijit Singh · Sonu Nigam"],["English","Ed Sheeran · Adele"],["Arabic","Arabic classics"],["Qawwali","Nusrat Fateh Ali Khan"],["Islamic / Nasheeds","Hamd · Nasheeds"],["Punjabi","Punjabi classics"],["Turkish","Turkish pop · classics"]];
const songs=[
["Tajdar-e-Haram","Atif Aslam","Pakistani"],["Tera Hone Laga Hoon","Atif Aslam","Pakistani"],["Tum Hi Ho","Arijit Singh","Indian"],["Channa Mereya","Arijit Singh","Indian"],["Perfect","Ed Sheeran","English"],["Someone Like You","Adele","English"],["Tumhe Dillagi","Nusrat Fateh Ali Khan","Qawwali"],["Mere Rashke Qamar","Rahat Fateh Ali Khan","Qawwali"],["Afreen Afreen","Rahat Fateh Ali Khan & Momina Mustehsan","Pakistani"]];
const genreRoot=document.querySelector("#genres"),songRoot=document.querySelector("#songs");
genres.forEach(([name,desc])=>{const d=document.createElement("div");d.className="genre";d.innerHTML=`${name}<small>${desc}</small>`;genreRoot.append(d)});
function render(q=""){songRoot.innerHTML="";songs.filter(s=>s.join(" ").toLowerCase().includes(q.toLowerCase())).forEach(s=>{const d=document.createElement("div");d.className="song";d.innerHTML=`<div class="cover">♫</div><div><b>${s[0]}</b><small>${s[1]}</small></div><span class="kind">${s[2]}</span>`;songRoot.append(d)})}
render();document.querySelector("#search").addEventListener("input",e=>render(e.target.value));
if("serviceWorker" in navigator) window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js"));
