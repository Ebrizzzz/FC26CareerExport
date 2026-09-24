/* FC26 Season Review visualiser v2 — baked crest map + preloader + sorting + clear charts */
(function(){
"use strict";
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
/* OVR tiers: <68 red (low) • 68-76 orange (mid) • 77-83 green (good) • 84+ dark green (elite) */
function ovrClass(v){v=+v||0;if(v>=84)return"ovr-elite";if(v>=77)return"ovr-good";if(v>=68)return"ovr-mid";return"ovr-low";}
function ovrPill(v){if(v==null||v===""||isNaN(+v))return"";return `<span class="ovr ${ovrClass(v)}" title="OVR ${v}">OVR ${v}</span>`;}
function ovrInText(s){return esc(s).replace(/OVR (\d+)/g,(m,n)=>`<span class="ovr ${ovrClass(n)}">OVR ${n}</span>`);}
/* File-wide OVR lookup: every parsed section that carries an OVR feeds it, so any
   render can show a rating even when its own row doesn't include one. Squad wins. */
let OVR_LOOKUP={},OVR_NAMES={},__ovrRe=null;
function buildOvrLookup(D){
  OVR_LOOKUP={};OVR_NAMES={};__ovrRe=null;
  const put=(n,v)=>{if(!n||v==null||isNaN(+v))return;const k=norm(n);if(!k||(k in OVR_LOOKUP))return;
    OVR_LOOKUP[k]=+v;OVR_NAMES[k]=String(n);};
  const force=(n,v)=>{if(!n||v==null||isNaN(+v))return;const k=norm(n);if(!k)return;
    OVR_LOOKUP[k]=+v;OVR_NAMES[k]=String(n);};
  (D.topDeals||[]).forEach(d=>put(d.player,d.ovr));
  (D.myDeals||[]).forEach(d=>put(d.player,d.ovr));
  (D.pending||[]).forEach(p=>put(p.player,p.ovr));
  Object.values(D.leagueDetails||{}).forEach(det=>Object.values(det.cats||{}).forEach(c=>c.forEach(p=>put(p.player,p.ovr))));
  Object.values(D.euroStats||{}).forEach(e=>Object.values(e.cats||{}).forEach(c=>c.forEach(p=>put(p.player,p.ovr))));
  ["heroes","flops","veterans","teens","defenders"].forEach(k=>((D.story||{})[k]||[]).forEach(p=>put(p.player,p.ovr)));
  (D.youngStars||[]).forEach(p=>put(p.player,p.ovr));
  (D.club.squad||[]).forEach(s=>force(s.player,s.ovr));
}
function ovrFor(name){if(!name)return null;const v=OVR_LOOKUP[norm(name)];return v==null?null:v;}
function ovrPillFor(name){return ovrPill(ovrFor(name));}
/* Inject OVR pills after player names inside free-text detail lines (Top 3 / Goals / Assists). */
function injectOvrNames(s){
  s=String(s??"");
  if(!__ovrRe){
    const names=Object.values(OVR_NAMES).sort((a,b)=>b.length-a.length)
      .map(n=>String(n).replace(/[.*+?^${}()|[\]\\]/g,"\\$&"));
    if(!names.length)return s;
    __ovrRe=new RegExp("("+names.join("|")+")(?= \\()","g");
  }
  return s.replace(__ovrRe,(m,nm)=>`${m} ${ovrPillFor(nm)}`);
}

/* ================= IMAGE ENGINE ================= */
const TR={'\u00F8':'o','\u00D8':'o','\u0142':'l','\u0141':'l','\u00E6':'ae','\u00C6':'ae','\u0153':'oe','\u0152':'oe','\u00DF':'ss','\u0111':'d','\u0110':'d','\u00FE':'th','\u00DE':'th','\u0131':'i','\u0259':'e'};
function norm(s){s=String(s||"");for(const k in TR)s=s.split(k).join(TR[k]);
  s=s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ');
  return s.split(/\s+/).filter(Boolean).join(' ');}
const STOP=new Set(['fc','sc','ac','cf','cd','ud','rc','rcd','rk','sk','fk','bk','if','as','ss','ssv','sv','tsv','tsg','fsv','vfb','vfl','sg','dsc','spvgg','afc','cfc','kv','ksv','ka','kaa','krc','f','c','k','s','v','club','real','de','la','le','las','los','les','des','du','der','den','di','do','da','dos','das','del','al','el','united','town','rovers','wanderers','balompie','ca','ad','sd','ev','sport','football','fussball','aj','sco','estac','ogc','stade','sl','us','jk','il','rks','hnk','calcio']);
function strip(nk){const t=nk.split(' ').filter(t=>!/^\d{1,4}$/.test(t)&&!STOP.has(t));return t.length?t.join(' '):nk;}
/* FC names -> football-logos.cc site names (all targets verified present in team-logos.js) */
const TEAM_ALIAS={
'lombardia fc':'inter','milano fc':'milan','bergamo calcio':'atalanta','latium':'lazio','roma':'as roma',
'ol lyonnes':'olympique lyonnais','az':'az alkmaar','psv':'psv eindhoven','paris saint germain':'psg',
'liverpool':'liverpool fc','monza':'ac monza','frosinone':'frosinone calcio','sporting charleroi':'royal charleroi s c',
'rz pellets wolfsberger ac':'wolfsberg','en avant guingamp':'ea guingamp','coupe de france':'french cup',
'liga portugal':'primeira liga','lafc':'los angeles football club','la galaxy':'los angeles galaxy',
'u craiova 1948 club sportiv':'u craiova 1948','fc rapid 1923':'rapid bucuresti','fc dinamo 1948':'dinamo bucuresti',
'fk csikszereda miercurea ciuc':'csikszereda','afc unirea slobozia':'unirea slobozia','real club celta de vigo':'celta',
'athletic club':'athletic club bilbao','rc deportivo':'deportivo la coruna','1 fc koln':'cologne','vitoria sc':'vitoria de guimaraes',
'rodez aveyron football':'rodez af','f c kobenhavn':'f c copenhagen','bromley football club':'bromley',
'rts widzew lodz':'widzew lodz','rcd espanyol de barcelona':'espanyol','ca osasuna':'osasuna','real betis balompie':'real betis',
'leicester city':'leicester','tottenham hotspur':'tottenham','brighton hove albion':'brighton','jeonbuk hyundai motors fc':'jeonbuk',
'fc erzgebirge aue':'erzgebirge','real racing club':'racing santander','real sporting':'sporting gijon','qpr':'queens park rangers',
'real sociedad b':'real sociedad','sportclub verl':'sc verl','tsg hoffenheim ii':'hoffenheim','czechia':'czech republic national team',
'wrexham':'wrexham afc','fc twente':'twente','fc volendam':'volendam','fc bayern munchen':'bayern munich',
'ssc napoli':'napoli','losc lille':'lille','shakhtar donetsk':'shakhtar','mjallby aif':'mjallby','tsg hoffenheim':'hoffenheim',
'olympique de marseille':'marseille','royale union saint gilloise':'union saint gilloise','asfc universitatea cluj':'universitatea cluj',
'rams basaksehir':'basaksehir','ferencvarosi tc':'ferencvaros','rks rakow czestochowa':'rakow czestochowa','sk rapid':'rapid vienna',
'heart of midlothian':'hearts','hnk hajduk split':'hajduk split','fc fcsb':'fc steaua bucuresti','fc red bull salzburg':'salzburg',
'grasshopper club zurich':'grasshoppers','estoril praia':'estoril','cd nacional':'nacional da madeira','corendon alanyaspor':'alanyaspor',
'ikas eyupspor':'eyupspor','korea republic':'south korea national team','stade rennais fc':'rennes','stade brestois 29':'brest',
'jagiellonia bialystok':'jagiellonia','us boulogne co':'boulogne','norway':'norway national team',
'wales':'wales national team','ukraine':'ukraine national team','switzerland':'switzerland national team',
'saudi arabia':'saudi arabia national team'};
const COMP_ALIAS={
'bundesliga':'bundesliga','1a pro league':'jupiler pro league','eredivisie':'eredivisie','laliga ea sports':'la liga',
'liga portugal':'primeira liga','ligue 1 mcdonald s':'ligue 1','ligue 1 mcdonald':'ligue 1','premier league':'premier league','serie a enilive':'serie a',
'uefa champions league':'uefa champions league','uefa europa league':'uefa europa league','uecl':'uefa conference league',
'european tournament (cid 347)':'uefa women s champions league','carabao cup':'efl carabao cup','copa de espana':'copa del rey',
'coppa italia':'coppa italia','coupe de france':'french cup','croky cup':'belgian cup','dfb pokal':'dfb pokal',
'emirates fa cup':'emirates fa cup','f beckenbauer supercup':'franz beckenbauer supercup','fa community shield':'fa community shield',
'oranje beker':'knvb cup','3 liga':'3 liga','a league':'a league','allsvenskan':'allsvenskan','brack super league':null,
'bundesliga 2':'2 bundesliga','csl':'chinese super league','efl championship':'efl championship','efl league one':null,
'efl league two':null,'eliteserien':'eliteserien','isl':null,'k league 1':'k league 1','laliga hypermotion':'la liga 2',
'ligue 2 bkt':'ligue 2','mls':null,'men s national':null,'pko bp ekstraklasa':null,'roshn saudi league':null,
'sse airtricity pd':null,'superliga':'superliga','scottish prem':'scottish premiership','serie bkt':'serie b',
'trendyol super lig':'super lig','o bundesliga':'austrian football bundesliga','3f superliga':'danish cup'};
const LOGOS=(window.__TEAM_LOGOS__||{});
let STRIP_INDEX=null;
function stripIndex(){if(STRIP_INDEX)return STRIP_INDEX;STRIP_INDEX={};for(const k in LOGOS){const s=strip(k);if(!STRIP_INDEX[s])STRIP_INDEX[s]=LOGOS[k];}return STRIP_INDEX;}
function teamLogo(name){const nk=norm(name);if(LOGOS[nk])return LOGOS[nk];
  const a=TEAM_ALIAS[nk];if(a){if(LOGOS[a])return LOGOS[a];const si=stripIndex();if(si[strip(a)])return si[strip(a)];}
  const si=stripIndex();return si[strip(nk)]||null;}
function compLogo(name){const nk=norm(name);if(LOGOS[nk])return LOGOS[nk];
  if(nk in COMP_ALIAS){const a=COMP_ALIAS[nk];return a?LOGOS[a]:null;}
  const si=stripIndex();return si[strip(nk)]||null;}
function hashHue(s){let h=0;s=String(s);for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;return h%360;}
function initials(name){return String(name||"?").split(/[\s.]+/).map(w=>w[0]).filter(Boolean).slice(0,2).join("").toUpperCase();}
function shieldHTML(name,cls){const h=hashHue(name);return `<span class="${cls||"shield"}" title="${esc(name)}" style="background:linear-gradient(160deg,hsl(${h},65%,45%),hsl(${(h+60)%360},65%,24%))">${esc(initials(name))}</span>`;}
function teamBadge(name,cls){const u=teamLogo(name);if(u)return `<img class="${cls||"tb"}" src="${u}" alt="${esc(name)}" loading="lazy" title="${esc(name)}" onerror="this.outerHTML=window.__shieldFallback(this)">`;
  return shieldHTML(name,cls||"shield");}
window.__shieldFallback=function(img){const t=document.createElement('span');t.innerHTML=shieldHTML(img.getAttribute('title')||'?',img.className.includes('xl')?'shield xl':(img.className.includes('lg')?'shield lg':'shield'));img.replaceWith(t.firstChild);};
function compBadge(name,cls){const u=compLogo(name);if(u)return `<img src="${u}" alt="${esc(name)}" loading="lazy" onerror="this.style.display='none'">`;return shieldHTML(name,cls||"shield lg");}
/* player photos: AUTOMATIC name-based hotlinks — Wikipedia first (keyless, generous
   limits, upload.wikimedia.org hotlinks), TheSportsDB cutouts second. Works for any
   name in any future save. Hits cached in localStorage; misses cached too (7-day
   TTL) so dead-end names aren't re-searched on every load. */
const PC={},PC_MISS=new Set(),PCMISS_TTL=7*864e5;
let PCM={};
try{Object.assign(PC,JSON.parse(localStorage.getItem("fc26_player_img")||"{}"));}catch(e){}
try{const m=JSON.parse(localStorage.getItem("fc26_player_miss")||"{}");if(m&&typeof m==="object")PCM=m;}catch(e){}
for(const k in PC){if(!PC[k]||typeof PC[k]!=="string")delete PC[k];}
for(const k in PCM){if(!PCM[k]||Date.now()-PCM[k]>PCMISS_TTL)delete PCM[k];}
function pcSave(){ // bounded save that always writes VALID json (never slice-truncates)
  try{
    let keys=Object.keys(PC),s=JSON.stringify(PC);
    while(s.length>240000&&keys.length){ // drop oldest first (insertion order)
      for(let i=0;i<Math.ceil(keys.length*0.15);i++)delete PC[keys[i]];
      keys=Object.keys(PC);s=JSON.stringify(PC);
    }
    localStorage.setItem("fc26_player_img",s);
  }catch(e){
    try{const keys=Object.keys(PC); // quota: halve and retry once
      for(let i=0;i<Math.ceil(keys.length/2);i++)delete PC[keys[i]];
      localStorage.setItem("fc26_player_img",JSON.stringify(PC));
    }catch(e2){}
  }
}
function pcmSave(){try{
    const keys=Object.keys(PCM);
    if(keys.length>600)for(let i=0;i<keys.length-600;i++)delete PCM[keys[i]];
    localStorage.setItem("fc26_player_miss",JSON.stringify(PCM));
  }catch(e){}}
function isKnownMiss(n){if(PC_MISS.has(n))return true;
  const t=PCM[n];if(!t)return false;
  if(Date.now()-t>PCMISS_TTL){delete PCM[n];return false;}
  return true;}
function playerQueries(name){const q=[name];const a=norm(name);if(a&&a!==name)q.push(a);
  const p=String(name).trim().split(/\s+/);if(p.length>1){const last=p[p.length-1];if(last.length>2)q.push(last);}return [...new Set(q)];}
/* ---------- robust photo helpers ---------- */
function stripParen(t){return String(t||"").replace(/\s*\(.+?\)\s*$/,"").trim();}
function tokens(s){return norm(s).split(" ").filter(Boolean);}
function looksFootballSnippet(s){return /football|soccer|plays?\s+(as|for)|association|midfielder|striker|forward|defender|goalkeeper|fifa|uefa|club|born/i.test(String(s||"").replace(/<[^>]+>/g," "));}
function titleScore(name,title,snippet,team){
  const want=tokens(name);if(!want.length)return 0;
  const got=tokens(stripParen(title));if(!got.length)return 0;
  if(norm(name)===norm(stripParen(title)))return 3;
  if(want.every(t=>got.includes(t)))return 2;
  const last=want[want.length-1];
  if(last.length>2&&got.includes(last)&&(looksFootballSnippet(snippet)||/footballer|soccer player/i.test(String(title))))return 1;
  // single-mononym case ("Mauricio", "Ibanez"): accept surname/first-name contained in title
  if(want.length===1&&last.length>2&&got.includes(last))return 1;
  if(team){const tt=tokens(team);const hint=tt.filter(t=>t.length>3&&!/football|club|real|united|city|sporting/.test(t));
    if(hint.length&&hint.some(t=>String(snippet||"").toLowerCase().includes(t)))return 1;}
  return 0;}
function pickThumb(pg){if(!pg)return null;
  if(pg.thumbnail&&pg.thumbnail.source)return String(pg.thumbnail.source).split("?")[0];
  if(pg.original&&pg.original.source)return String(pg.original.source).split("?")[0];
  return null;}
const __sleep=ms=>new Promise(r=>setTimeout(r,ms));
let __wikiLast=0;
async function jget(url,retries){
  // global wiki throttle (enwiki + wikidata share rate limits per IP)
  const now=Date.now();const wait=150-(now-__wikiLast);if(wait>0)await __sleep(wait);
  __wikiLast=Date.now();
  let r=null;
  try{r=await fetch(url);}catch(e){return null;}
  if(r&&r.status===429&& (retries||0)<2){await __sleep(1200*((retries||0)+1));return jget(url,(retries||0)+1);}
  if(!r||!r.ok)return null;try{return await r.json();}catch(e){return null;}}
async function wikiThumbsForTitles(titles){
  if(!titles||!titles.length)return {};
  try{
    const j=await jget("https://en.wikipedia.org/w/api.php?action=query&titles="+encodeURIComponent(titles.slice(0,8).join("|"))+"&prop=pageimages&piprop=thumbnail%7Coriginal&pithumbsize=500&format=json&origin=*");
    const pages=j&&j.query&&j.query.pages;const out={};if(!pages)return out;
    for(const k in pages){const pg=pages[k];const u=pickThumb(pg);if(u)out[pg.title]=u;}
    return out;
  }catch(e){return {};}}
async function wikiSearchList(q,limit){
  try{
    const j=await jget("https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch="+encodeURIComponent(q)+"&srlimit="+(limit||8)+"&srnamespace=0&format=json&origin=*");
    const s=j&&j.query&&j.query.search;return s||[];
  }catch(e){return [];}}
async function wikiThumb(name,team){
  // Pass 1: fast generator search, exact + token-subset match (1 request)
  const queries=[name+" footballer"];
  const an=norm(name);if(an&&an!==name)queries.push(an+" footballer");
  if(team)queries.push(name+" "+team);
  queries.push(name);
  const seen=new Set();
  for(const q of queries.slice(0,3)){
    try{
      const j=await jget("https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch="+encodeURIComponent(q)+"&gsrlimit=8&prop=pageimages&piprop=thumbnail%7Coriginal&pithumbsize=500&format=json&origin=*");
      const pages=j&&j.query&&j.query.pages;if(!pages)continue;
      let best=null,bestScore=-1;
      for(const k in pages){const pg=pages[k];const s=titleScore(name,pg.title,"",team);
        if(s>bestScore&&pickThumb(pg)){bestScore=s;best=pg;}}
      if(best&&bestScore>=2)return pickThumb(best);
      // keep weak matches for later snippet verification
      if(best&&bestScore>=1){const key=best.title;if(!seen.has(key)){seen.add(key);
        // verify via list-search snippet before accepting a weak match
        const ls=await wikiSearchList(q,4);
        const hit=ls.find(h=>h.title===best.title&&looksFootballSnippet(h.snippet));
        if(hit)return pickThumb(best);}}
    }catch(e){}
  }
  // Pass 2: list-search snippets + batched thumbnails (handles missing pageimage variants)
  try{
    for(const q of [name+" footballer",name]){
      const hits=await wikiSearchList(q,8);if(!hits.length)continue;
      const scored=hits.map(h=>({h,s:titleScore(name,h.title,h.snippet,team)})).filter(x=>x.s>0).sort((a,b)=>b.s-a.s).slice(0,6);
      if(!scored.length)continue;
      const thumbs=await wikiThumbsForTitles(scored.map(x=>x.h.title));
      for(const x of scored){if(thumbs[x.h.title])return thumbs[x.h.title];}
      // No pageimage but title is strong: try REST summary original image
      for(const x of scored.slice(0,2)){const u=await wikiSummaryThumb(x.h.title);if(u)return u;}
      if(scored.length)break;
    }
  }catch(e){}
  // Pass 3: opensearch exact title + REST summary (covers hyphen/accent variants)
  try{
    const j=await jget("https://en.wikipedia.org/w/api.php?action=opensearch&search="+encodeURIComponent(name)+"&limit=5&namespace=0&format=json&origin=*");
    const titles=j&&j[1];if(titles&&titles.length){
      const thumbs=await wikiThumbsForTitles(titles);
      for(const t of titles){if(titleScore(name,t,"",team)>=1&&thumbs[t])return thumbs[t];}
      for(const t of titles.slice(0,2)){if(titleScore(name,t,"",team)>=1){const u=await wikiSummaryThumb(t);if(u)return u;}}
    }
  }catch(e){}
  return null;}
async function wikiSummaryThumb(title,retries){
  try{
    const now=Date.now();const wait=150-(now-__wikiLast);if(wait>0)await __sleep(wait);
    __wikiLast=Date.now();
    const r=await fetch("https://en.wikipedia.org/api/rest_v1/page/summary/"+encodeURIComponent(String(title).replace(/ /g,"_")));
    if(r.status===429&&(retries||0)<2){await __sleep(1200);return wikiSummaryThumb(title,(retries||0)+1);}
    if(!r.ok)return null;const j=await r.json();
    const u=(j.thumbnail&&j.thumbnail.source)||(j.originalimage&&j.originalimage.source);
    return u?String(u).split("?")[0]:null;
  }catch(e){return null;}}
let __wdLast=0;
async function wdget(url,retries){
  const now=Date.now();const wait=800-(now-__wdLast);if(wait>0)await __sleep(wait);
  __wdLast=Date.now();__wikiLast=Date.now();
  let r=null;try{r=await fetch(url);}catch(e){return null;}
  if(r&&r.status===429&&(retries||0)<2){await __sleep(2000);return wdget(url,(retries||0)+1);}
  if(!r||!r.ok)return null;try{return await r.json();}catch(e){return null;}}
async function wikidataThumb(name){
  try{
    const j=await wdget("https://www.wikidata.org/w/api.php?action=wbsearchentities&search="+encodeURIComponent(name)+"&language=en&format=json&origin=*&limit=6");
    const list=(j&&j.search)||[];if(!list.length)return null;
    const cands=list.filter(e=>/football|soccer/i.test(e.description||"")||titleScore(name,e.label,"",null)>=2).slice(0,3);
    const pool=cands.length?cands:list.slice(0,1);
    for(const e of pool){
      try{
        const c=await wdget("https://www.wikidata.org/w/api.php?action=wbgetclaims&entity="+encodeURIComponent(e.id)+"&property=P18&format=json&origin=*");
        const claim=c&&c.claims&&c.claims.P18&&c.claims.P18[0];
        const file=claim&&claim.mainsnak&&claim.mainsnak.datavalue&&claim.mainsnak.datavalue.value;
        if(file)return "https://commons.wikimedia.org/wiki/Special:FilePath/"+encodeURIComponent(String(file).replace(/ /g,"_"))+"?width=500";
      }catch(e2){}
    }
  }catch(e){}return null;}
let __tsdbLast=0;
async function tsdbFetch(q){
  const now=Date.now();const wait=400-(now-__tsdbLast);if(wait>0)await new Promise(r=>setTimeout(r,wait));
  __tsdbLast=Date.now();
  const r=await fetch("https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p="+encodeURIComponent(q));
  if(r.status===429){await new Promise(res=>setTimeout(res,1200));return tsdbFetch(q);}
  if(!r.ok)return null;try{return await r.json();}catch(e){return null;}}
async function tsdbThumb(name){
  const qt=tokens(name);if(!qt.length)return null;
  for(const q of playerQueries(name)){
    try{
      const j=await tsdbFetch(q);const list=j&&j.player;if(!list)continue;
      // best-first: exact/strong match with an actual image
      let fallback=null;
      for(const p of list){const rt=tokens(p.strPlayer||"");if(!rt.length)continue;
        const strong=qt.every(t=>rt.includes(t));
        const single=qt.length===1&&rt.includes(qt[0]);
        const ok=strong||single;
        if(!ok)continue;
        const u=p.strCutout||p.strThumb||p.strRender||p.strFanart1;
        if(!u)continue;
        if(strong&&qt.length>1)return u;
        if(!fallback)fallback=u;}
      if(fallback)return fallback;
    }catch(e){}}
  return null;}
async function fetchPlayerThumb(name,team){
  if(noPhotosEnabled())return null;
  if(!name)return null;if(PC[name])return PC[name];if(isKnownMiss(name))return null;
  let u=await wikiThumb(name,team);
  if(!u)u=await wikidataThumb(name);
  if(!u)u=await tsdbThumb(name);
  if(u){PC[name]=u;delete PCM[name];pcSave();return u;}
  PC_MISS.add(name);PCM[name]=Date.now();pcmSave();return null;}
function circleHTML(name,size){const h=hashHue(name);
  return `<span class="avatar-fallback ${size||""}" title="${esc(name)}" style="background:linear-gradient(135deg,hsl(${h},60%,46%),hsl(${(h+70)%360},60%,24%))">${esc(initials(name))}</span>`;}
function playerBadge(name,ovr,pos,rating,size,team){const sz=size||"";
  if(noPhotosEnabled())return circleHTML(name,sz);
  const cached=PC[name];
  if(cached)return `<img class="avatar ${sz}" src="${esc(cached)}" alt="${esc(name)}" loading="lazy" title="${esc(name)}" onerror="this.outerHTML=window.__circleFallback(this)">`;
  return `<span class="avatar-slot" data-p="${esc(name)}" data-team="${esc(team||"")}" data-size="${sz}">${circleHTML(name,sz)}</span>`;}
/* Lazy fill: slots rendered as initials get hydrated when visible (covers tab switches
   and photos that arrived after first render). Retries session misses in background. */
let __slotObs=null,__hydrating=false;
async function hydrateSlots(root){
  if(noPhotosEnabled())return;
  const slots=(root||document).querySelectorAll?Array.from((root||document).querySelectorAll(".avatar-slot")):[];
  if(!slots.length)return;
  if(!__slotObs&&"IntersectionObserver" in window){
    __slotObs=new IntersectionObserver(es=>{es.forEach(async e=>{
      if(!e.isIntersecting)return;const el=e.target;__slotObs.unobserve(el);
      const nm=el.getAttribute("data-p"),tm=el.getAttribute("data-team")||undefined;
      if(!nm||PC[nm]){if(PC[nm])swapSlot(el,PC[nm]);return;}
      // allow one background retry even for session misses
      PC_MISS.delete(nm);
      const u=await fetchPlayerThumb(nm,tm);
      if(u)swapSlot(el,u);
    });},{rootMargin:"400px"});
  }
  for(const el of slots){
    const nm=el.getAttribute("data-p");
    if(PC[nm]){swapSlot(el,PC[nm]);continue;}
    if(__slotObs)__slotObs.observe(el);
  }
  // background backfill for off-screen slots (bounded, low priority)
  if(!__hydrating){__hydrating=true;
    setTimeout(async ()=>{
      const rest=Array.from(document.querySelectorAll(".avatar-slot")).slice(0,40);
      for(const el of rest){const nm=el.getAttribute("data-p");if(!nm||PC[nm])continue;
        PC_MISS.delete(nm);
        const u=await fetchPlayerThumb(nm,el.getAttribute("data-team")||undefined);
        if(u&&document.contains(el))swapSlot(el,u);}
      __hydrating=false;
    },2500);}
}
function swapSlot(el,url){const nm=el.getAttribute("data-p")||"?";const sz=el.getAttribute("data-size")||"";
  const img=document.createElement("img");img.className=("avatar "+sz).trim();
  img.src=url;img.alt=nm;img.title=nm;img.loading="lazy";
  img.onerror=function(){this.outerHTML=window.__circleFallback?circleHTML(nm,sz):"";};
  // __circleFallback expects an <img>; emulate it safely
  img.onerror=()=>{const t=document.createElement("span");t.innerHTML=circleHTML(nm,sz);img.replaceWith(t.firstChild);};
  el.replaceWith(img);}
window.__circleFallback=function(img){const t=document.createElement('span');t.innerHTML=circleHTML(img.getAttribute('title')||'?',img.className.replace('avatar','').trim());img.replaceWith(t.firstChild);};
window.__futFallback=window.__circleFallback;

/* ================= PARSER (unchanged, verified) ================= */
function parseReport(text){
  const lines=String(text||"").split(/\r?\n/);
  const D={meta:{},leaguesCovered:[],leagues:{},leagueOrder:[],world:[],europe:[],cups:[],myDeals:[],topDeals:[],
    leagueDetails:{},story:{heroes:[],flops:[],veterans:[],teens:[],defenders:[]},boot:[],tots:[],bench:[],playmakers:[],youngStars:[],signings:[],euroStats:{},club:{squad:[],matches:[],next:[]},pending:[],raw:text,
    season:{scorers:[],droughts:[],improvers:[]},mgrMoves:[],mgrNote:""};
  let sec=null,curLeague=null,curEuro=null,curCup=null,curRound=null,curDetail=null,curDetailCat=null,
      curEuroStat=null,curEuroStatCat=null,mode=null,collectMode=null,expectWins=null;
  for(let i=0;i<lines.length;i++){
    const line=lines[i],t=line.trim();
    if(!t){continue;}
    let m;
    if(m=t.match(/^Snapshot:\s*(.+?)\s*\(in-game date:\s*(\S+)/)){D.meta.snapshot=m[1].trim();continue;}
    if(m=t.match(/^Latest in-game date seen:\s*(\S+)/)){D.meta.date=m[1];continue;}
    if(m=t.match(/^User:\s*(.+?)\s*\|\s*Club:\s*(.+?)\s*\|\s*League:\s*(.+?)\s*\|\s*Season:\s*(.+?)\s*$/)){D.meta.manager=m[1].trim();D.meta.club=m[2].trim();D.meta.league=m[3].trim();D.meta.season=m[4].trim();continue;}
    if(t.startsWith("===")){
      if(t.includes("LEAGUES COVERED")){sec="covered";continue;}
      if(t.includes("LEAGUE TABLES")){sec="leagues";curLeague=null;continue;}
      if(t.includes("WORLD LEAGUES")){sec="world";continue;}
      if(t.includes("EUROPEAN & TOURNAMENT")||t.includes("EUROPEAN AND TOURNAMENT")){sec="europe";curEuro=null;continue;}
      if(t.includes("CUPS AND KNOCKOUT")){sec="cups";curCup=null;continue;}
      if(t.includes("COMPLETED TRANSFERS")){sec="transfers";mode="transfers";continue;}
      if(t.includes("LEAGUE DETAILS")){sec="details";curDetail=null;continue;}
      if(t.includes("STORY HOOKS")){sec="story";mode="story";continue;}
      if(t.includes("GOLDEN BOOT")||t.includes("HONORS")||t.includes("TEAM OF THE SEASON")||t.includes("TEAM OF THE YEAR")||t.includes("SEASON AWARDS")){sec="boot";mode="boot";continue;}
      if(t.includes("EUROPEAN COMPETITIONS: TOP")){sec="eurostats";curEuroStat=null;continue;}
      if(t.startsWith("=== YOUR CLUB")){sec="club";const cm=t.match(/=== YOUR CLUB:\s*(.+?)\s*===/);D.meta.club=(cm&&cm[1]||D.meta.club).trim();D.club.name=D.meta.club;mode="clubhead";continue;}
      if(t.includes("MANAGER MOVES")){sec="mgr";continue;}
      if(t.includes("PENDING")){sec="pending";continue;}
      if(t.includes("LAST SEASON")){sec="lastseason";continue;}
      sec="other";continue;
    }
    if(sec==="covered"&&!t.startsWith("===")){D.leaguesCovered.push(t.replace("[YOUR LEAGUE]","").trim());continue;}
    if(sec==="leagues"){
      if(m=t.match(/^--\s*(.+?)\s*(?:\(last season's champion per DB:\s*(.+?)\))?\s*$/)){curLeague={name:m[1].trim(),champion:(m[2]||"").trim(),rows:[],wins:[],high:[],title:"",stats:""};D.leagues[curLeague.name]=curLeague;D.leagueOrder.push(curLeague.name);expectWins=null;continue;}
      if(curLeague&&(m=t.match(/^\s*(\d+)\.\s+(.+?)\s+P(\d+)\s+W(\d+)\s+D(\d+)\s+L(\d+)\s+GF(\d+)\s+GA(\d+)\s+GD([+-]?\d+)\s+(\d+)\s+pts\s+form\s+(\S+)\s+last season:\s*(\S+)(.*)$/))){
        curLeague.rows.push({pos:+m[1],team:m[2].trim(),P:+m[3],W:+m[4],D:+m[5],L:+m[6],GF:+m[7],GA:+m[8],GD:m[9],pts:+m[10],form:m[11],last:m[12],mine:/YOUR CLUB/.test(t)});continue;}
      if(curLeague&&t.startsWith("Title race:")){curLeague.title=t;continue;}
      if(curLeague&&/league matches played/.test(t)){curLeague.stats=t;continue;}
      if(curLeague&&t.startsWith("Biggest wins:")){expectWins="wins";continue;}
      if(curLeague&&t.startsWith("Highest-scoring")){expectWins="high";continue;}
      if(curLeague&&expectWins&&/^\d{4}-\d{2}-\d{2}\s/.test(t)){curLeague[expectWins].push(t);continue;}
      if(curLeague&&expectWins&&!t.match(/^\d/)&&t.length<40){expectWins=null;}
      continue;
    }
    if(sec==="world"){
      if(m=t.match(/^--\s*(.+?)\s*(\(.+?\))?\s*$/)){curLeague={league:m[1].trim(),note:(m[2]||"").trim()};D.world.push(curLeague);continue;}
      if(m=t.match(/^1st:\s*(.+?)\s*\((\d+)\s*pts,\s*GD\s*([+-]?\d+)\)\s*\|\s*2nd:\s*(.+?)\s*\((\d+)\)\s*\|\s*3rd:\s*(.+?)\s*\((\d+)\)/)){
        const c=D.world[D.world.length-1];if(c){c.first={team:m[1],pts:+m[2],gd:m[3]};c.second={team:m[4],pts:+m[5]};c.third={team:m[6],pts:+m[7]};}continue;}
      if(m=t.match(/^Bottom:\s*(.+)$/)){const c=D.world[D.world.length-1];if(c)c.bottom=m[1];continue;}
      continue;
    }
    if(sec==="europe"){
      if(m=t.match(/^--\s*(.+?)\s*\(league phase \/ group table\)\s*$/)){let ttl=m[1].trim();if(/super\s*cup/i.test(ttl))ttl="UEFA Champions League";curEuro={title:ttl,rows:[]};D.europe.push(curEuro);continue;}
      if(m=t.match(/^--\s*(.+)$/)&&!curEuro){let ttl=m[1].trim();if(/super\s*cup/i.test(ttl))ttl="UEFA Champions League";curEuro={title:ttl,rows:[]};D.europe.push(curEuro);continue;}
      if(curEuro&&(m=t.match(/^\s*(\d+)\.\s+(.+?)\s+P(\d+)\s+W(\d+)\s+D(\d+)\s+L(\d+)\s+GF(\d+)\s+GA(\d+)\s+GD([+-]?\d+)\s+(\d+)\s+pts(.*)$/))){
        curEuro.rows.push({pos:+m[1],team:m[2].trim(),P:+m[3],W:+m[4],D:+m[5],L:+m[6],GF:+m[7],GA:+m[8],GD:m[9],pts:+m[10],mine:/YOUR CLUB/.test(t)});continue;}
      continue;
    }
    if(sec==="cups"){
      if(m=t.match(/^--\s*(.+?)(?:\s*\((\d+)\s*matches(?:\s+logged)?,\s*(\d+)\s*ties\))?\s*$/)){curCup={name:m[1].trim(),matches:+(m[2]||0),ties:+(m[3]||0),rounds:[],champion:""};D.cups.push(curCup);curRound=null;continue;}
      if(curCup&&/^\s*Champion(?:\s*\/\s*Winner)?\s*:/i.test(t)){curCup.champion=t.replace(/^\s*Champion(?:\s*\/\s*Winner)?\s*:/i,"").trim();continue;}
      if(curCup&&curRound&&(m=t.match(/^Leg\s+(\d+)\s*:\s*(\d{4}-\d{2}-\d{2})?\s*(.+?)\s+(\d+)\s*-\s*(\d+)\s+(.+?)\s*$/i))){
        const last=curRound.ties[curRound.ties.length-1];
        const leg={n:+m[1],date:(m[2]||"").trim(),home:m[3].trim(),hs:+m[4],as:+m[5],away:m[6].trim()};
        if(last){(last.legs=last.legs||[]).push(leg);}else{curRound.ties.push({text:t,mine:/YOUR CLUB/.test(t)});}
        continue;}
      if(curCup&&curRound&&(m=t.match(/^(.+?)\s+(\d+)\s*-\s*(\d+)\s+(.+?)\s*\(aggregate\)(\s*\|\s*winner:\s*(.+))?\s*$/i))){
        curRound.ties.push({text:`${m[1].trim()} ${m[2]}-${m[3]} ${m[4].trim()} (agg.)`,agg:true,mine:/YOUR CLUB/.test(t),winner:(m[6]||"").replace(/\s*<== YOUR CLUB\s*/g,"").trim(),legs:[]});continue;}
      if(curCup&&/:\s*$/.test(t)&&t.length<90){
        const looksTie=/[A-Za-zÀ-ÿ\)]\s+\d+\s*-\s*\d+\s+[A-Za-zÀ-ÿ\(\[]/.test(t);
        if(!looksTie){curRound={stage:t.replace(/:\s*$/,"").trim(),ties:[]};curCup.rounds.push(curRound);continue;}}
      if(curCup&&curRound&&(m=t.match(/^(\d{4}-\d{2}-\d{2}\s+)?(.+?)\s+(\d+)\s*-\s*(\d+)\s+(.+?)(\s*\(pens[^)]*\))?(\s*\|\s*winner:\s*(.+))?(\s*<== YOUR CLUB)?\s*$/))&&/\d\s*-\s*\d/.test(t)){
        curRound.ties.push({text:t.replace(/\s*<== YOUR CLUB\s*/g,"").trim(),mine:/YOUR CLUB/.test(t),winner:(m[8]||"").replace(/\s*<== YOUR CLUB\s*/g,"").trim()});continue;}
      if(curCup&&!curRound&&/\d\s*-\s*\d/.test(t)){curRound={stage:"Knockout",ties:[]};curCup.rounds.push(curRound);curRound.ties.push({text:t,mine:/YOUR CLUB/.test(t)});continue;}
      continue;
    }
    if(sec==="transfers"){
      if(t.startsWith("-- Your Club")){mode="my";continue;}
      if(t.startsWith("-- Top 20")){mode="top";continue;}
      if(mode==="my"&&(m=t.match(/^(SIGNED|SOLD):\s*(.+?)\s*\((.+?),\s*age\s*(\d+),\s*OVR\s*(\d+)\)\s*\|\s*(.+?)\s*->\s*(.+?)\s*\|\s*Fee:\s*(.+?)(\s*\|\s*Date:\s*(.+))?\s*$/))){
        D.myDeals.push({dir:m[1],player:m[2],pos:m[3],age:+m[4],ovr:+m[5],from:m[6],to:m[7],fee:m[8],date:(m[10]||"").trim()});continue;}
      if(mode==="my"&&t.startsWith("(No direct")){continue;}
      if(mode==="top"&&(m=t.match(/^\d+\.\s*(.+?)\s*\((.+?),\s*OVR\s*(\d+)\):\s*(.+?)\s*->\s*(.+?)\s*\|\s*Fee:\s*(.+)$/))){
        D.topDeals.push({player:m[1],pos:m[2],ovr:+m[3],from:m[4],to:m[5],fee:m[6]});continue;}
      continue;
    }
    if(sec==="details"){
      if(m=t.match(/^#####\s*(.+?)\s*\(most appearances:\s*(\d+)\)/)){curDetail={league:m[1].trim(),max:+m[2],cats:{}};D.leagueDetails[curDetail.league]=curDetail;curDetailCat=null;continue;}
      if(curDetail&&(m=t.match(/^(Top scorers|Top assists|Most goal involvements.*|Best average rating.*|Best goalkeepers.*|Young players.*|Most yellow.*|Red cards.*):\s*$/))){curDetailCat=m[1];curDetail.cats[curDetailCat]=[];continue;}
      if(curDetail&&curDetailCat&&(m=t.match(/^\d+\.\s*(.+?)\s*\((.+?),\s*(.+?),\s*age\s*(\d+),\s*OVR\s*(\d+)\/POT\s*(\d+)\)\s*-\s*(\d+)\s*apps,\s*(\d+)\s*G,\s*(\d+)\s*A,\s*([\d.]+)\s*avg rating(.*)$/))){
        curDetail.cats[curDetailCat].push({player:m[1],team:m[2],pos:m[3],age:+m[4],ovr:+m[5],pot:+m[6],apps:+m[7],goals:+m[8],assists:+m[9],rating:+m[10],extra:(m[11]||"").trim()});continue;}
      continue;
    }
    if(sec==="story"){
      if(/Unlikely heroes/.test(t)){collectMode="heroes";D.story[collectMode]=D.story[collectMode]||[];continue;}
      if(/struggled|Big-name/.test(t)){collectMode="flops";D.story[collectMode]=D.story[collectMode]||[];continue;}
      if(/Veterans/.test(t)){collectMode="veterans";D.story[collectMode]=D.story[collectMode]||[];continue;}
      if(/Rising teenagers/.test(t)){collectMode="teens";D.story[collectMode]=D.story[collectMode]||[];continue;}
      if(/Highest-rated defenders/.test(t)){collectMode="defenders";D.story[collectMode]=D.story[collectMode]||[];continue;}
      let m2=t.match(/^\d+\.\s*(.+?)\s*\((.+?),\s*(.+?),\s*age\s*(\d+),\s*OVR\s*(\d+)\/POT\s*(\d+)\)\s*-\s*(\d+)\s*apps,\s*(\d+)\s*G,\s*(\d+)\s*A,\s*([\d.]+)\s*avg rating/);
      if(m2&&collectMode){D.story[collectMode].push({player:m2[1],team:m2[2],pos:m2[3],age:+m2[4],ovr:+m2[5],pot:+m2[6],apps:+m2[7],goals:+m2[8],assists:+m2[9],rating:+m2[10]});continue;}
      continue;
    }
    if(sec==="boot"){
      if(/Golden Boot/.test(t)){mode="bootlist";continue;}
      if(/Playmaker of the Season/i.test(t)){mode="playmaker";continue;}
      if(/Young Player of the Season/i.test(t)){mode="youngstar";continue;}
      if(/Signings of the Season/i.test(t)){mode="signings";continue;}
      if(/Substitutes Bench|World Squad of the Season/i.test(t)){mode="bench";continue;}
      if(/Team of the season|Best XI|Tactically Balanced Best XI/i.test(t)){mode="tots";continue;}
      let m2;
      if(mode==="bootlist"&&(m2=t.match(/^\d+\.\s*(.+?)\s*\((.+?),\s*(.+?),\s*age\s*(\d+)\)\s*-\s*(\d+)\s*goals in\s*(\d+)\s*apps\s*\(([\d.]+) per game\)\s*\|\s*(\d+)\s*assists,\s*([\d.]+)\s*avg/))){
        D.boot.push({player:m2[1],team:m2[2],pos:m2[3],age:+m2[4],goals:+m2[5],apps:+m2[6],perGame:+m2[7],assists:+m2[8],rating:+m2[9]});continue;}
      if(mode==="playmaker"&&(m2=t.match(/^\d+\.\s*(.+?)\s*\((.+?),\s*(.+?),\s*age\s*(\d+)\)\s*-\s*(\d+)\s*assists in\s*(\d+)\s*apps\s*\|\s*(\d+)\s*goals,\s*([\d.]+)\s*avg/))){
        D.playmakers.push({player:m2[1],team:m2[2],pos:m2[3],age:+m2[4],assists:+m2[5],apps:+m2[6],goals:+m2[7],rating:+m2[8]});continue;}
      if(mode==="youngstar"&&(m2=t.match(/^\d+\.\s*(.+?)\s*\((.+?),\s*(.+?),\s*age\s*(\d+),\s*OVR\s*(\d+)\)\s*-\s*(\d+)\s*apps,\s*(\d+)\s*G,\s*(\d+)\s*A,\s*([\d.]+)\s*avg/))){
        D.youngStars.push({player:m2[1],team:m2[2],pos:m2[3],age:+m2[4],ovr:+m2[5],apps:+m2[6],goals:+m2[7],assists:+m2[8],rating:+m2[9]});continue;}
      if(mode==="signings"&&(m2=t.match(/^\d+\.\s*(.+?)\s*\((.+?),\s*age\s*(\d+)\)\s*\|\s*(.+?)\s*->\s*(.+?)\s*\((.+?)\)\s*-\s*(\d+)\s*apps,\s*(\d+)\s*G,\s*(\d+)\s*A,\s*([\d.]+)\s*avg/))){
        D.signings.push({player:m2[1],pos:m2[2],age:+m2[3],from:m2[4].trim(),to:m2[5].trim(),fee:m2[6].trim(),apps:+m2[7],goals:+m2[8],assists:+m2[9],rating:+m2[10]});continue;}
      if((mode==="tots"||mode==="bench")&&(m2=t.match(/^([A-Za-z]{1,4})\s+(.+?)\s*\((.+?)(?:,\s*([A-Za-z]{1,4}))?\)\s*-\s*([\d.]+)\s*avg rating,\s*(\d+)\s*apps,\s*(\d+)\s*G,\s*(\d+)\s*A/))){
        const entry={role:m2[1].toUpperCase(),player:m2[2],team:m2[3].trim(),pos:((m2[4]||m2[1]).trim().toUpperCase()),rating:+m2[5],apps:+m2[6],goals:+m2[7],assists:+m2[8]};
        if(entry.role==="SUB"||mode==="bench")D.bench.push(entry);else D.tots.push(entry);continue;}
      continue;
    }
    if(sec==="eurostats"){
      let m2;
      if(m2=t.match(/^--\s*(.+)$/)){curEuroStat={comp:m2[1].trim(),cats:{}};D.euroStats[curEuroStat.comp]=curEuroStat;curEuroStatCat=null;continue;}
      if(curEuroStat&&(m2=t.match(/^(Top scorers|Top assists|Best ratings.*):\s*$/))){curEuroStatCat=m2[1];curEuroStat.cats[curEuroStatCat]=[];continue;}
      if(curEuroStat&&curEuroStatCat&&(m2=t.match(/^\d+\.\s*(.+?)\s*\((.+?),\s*(.+?),\s*age\s*(\d+),\s*OVR\s*(\d+)\/POT\s*(\d+)\)\s*-\s*(\d+)\s*apps,\s*(\d+)\s*G,\s*(\d+)\s*A,\s*([\d.]+)\s*avg/))){
        curEuroStat.cats[curEuroStatCat].push({player:m2[1],team:m2[2],pos:m2[3],age:+m2[4],ovr:+m2[5],pot:+m2[6],apps:+m2[7],goals:+m2[8],assists:+m2[9],rating:+m2[10]});continue;}
      continue;
    }
    if(sec==="club"){
      let m2;
      if(/Season \d+ record/.test(t)||/played \d+, W\d+/.test(t)){D.club.record=t;continue;}
      if(/Board objectives/.test(t)){D.club.objectives=t;continue;}
      if(/Trophies so far/.test(t)){D.club.trophies=t;continue;}
      if(/Biggest signing/.test(t)){D.club.signing=t;continue;}
      if(/Squad performance/.test(t)){mode="squad";continue;}
      if(/Match-by-match/.test(t)){mode="matches";continue;}
      if(/Next fixtures/.test(t)){mode="next";continue;}
      if(mode==="squad"&&(m2=t.match(/^(.+?)\s*\((.+?),\s*age\s*(\d+)\)\s*OVR\s*(\d+)\s*\/\s*POT\s*(\d+)\s*\|\s*(\d+)\s*apps,\s*(\d+)\s*G,\s*(\d+)\s*A,\s*([\d.]+)\s*avg rating,\s*(\d+)\s*YC,\s*(\d+)\s*RC/))){
        D.club.squad.push({player:m2[1],pos:m2[2],age:+m2[3],ovr:+m2[4],pot:+m2[5],apps:+m2[6],goals:+m2[7],assists:+m2[8],rating:+m2[9],yc:+m2[10],rc:+m2[11]});continue;}
      // NEW format (v12+): "DATE | comp | vs/at opp | W 2-1 [ (pens x-y) ]" + optional detail lines.
      // OLD format had trailing "| best: Name (rating)" — still accepted via optional group.
      if(mode==="matches"&&(m2=t.match(/^(\d{4}-\d{2}-\d{2})\s*\|\s*(.+?)\s*\|\s*(vs|at)\s+(.+?)\s*\|\s*([WDL])\s+(\d+)-(\d+)(?:\s*\(pens\s*(\d+)-(\d+)\))?(?:\s*\|\s*best:\s*(.+?)\s*\((\d+)\))?\s*$/))){
        D.club.matches.push({date:m2[1],comp:m2[2].trim(),ha:m2[3],opp:m2[4].trim(),res:m2[5],gf:+m2[6],ga:+m2[7],pens:(m2[8]!==undefined?{a:+m2[8],b:+m2[9]}:null),best:(m2[10]||"").trim()||null,brate:m2[11]?+m2[11]:null,top3:null,goals:[],assists:[],_detailSide:null});continue;}
      // Detail sub-lines belonging to the last match (new exporter only)
      if(mode==="matches"&&D.club.matches.length){
        const last=D.club.matches[D.club.matches.length-1];
        if(m=t.match(/^Top 3:\s*(.+)$/)){last.top3=m[1].trim();continue;}
        if(/^Goals:\s*$/.test(t)){last._detailSide="goals";continue;}
        if(/^Assists:\s*$/.test(t)){last._detailSide="assists";continue;}
        if((m=t.match(/^-\s*(.+?):\s*(.+)$/))&&last._detailSide){
          last[last._detailSide].push({team:m[1].trim(),text:m[2].trim()});continue;}
        if(/^\S/.test(t)&&!/^Top 3:|^Goals:|^Assists:|^- /.test(t))last._detailSide=null;
      }
      if(mode==="matches"&&/Total in these matches/.test(t)){D.club.totalLine=t;continue;}
      if(mode==="next"&&(m2=t.match(/^(\d{4}-\d{2}-\d{2})\s*\|\s*(.+?)\s*\|\s*(vs|at)\s+(.+)$/))){
        D.club.next.push({date:m2[1],comp:m2[2].trim(),ha:m2[3],opp:m2[4].trim()});continue;}
      continue;
    }
    if(sec==="pending"){
      let m2=t.match(/^(.+?)\s*\(OVR\s*(\d+)\):\s*(.+?)\s*->\s*(.+?)\s*\|\s*fee\s*(\d+)\s*\|\s*signed\s*(\S+)\s*\|\s*completes\s*(\S+)/);
      if(m2){D.pending.push({player:m2[1],ovr:+m2[2],from:m2[3],to:m2[4],fee:m2[5],signed:m2[6],completes:m2[7]});continue;}
    }
    if(sec==="mgr"){
      if(/^No /i.test(t)){D.mgrNote=t;continue;}
      if(t.length<160){D.mgrMoves.push(t);continue;}
      continue;
    }
    if(sec==="lastseason"){
      let m2;
      if(m2=t.match(/^--\s*(.+)$/)){
        const h=m2[1].toLowerCase();
        if(h.includes("top scorers"))mode="cmp";
        else if(h.includes("drought"))mode="drought";
        else if(h.includes("improv"))mode="improve";
        else mode=null;
        continue;}
      const lastNums=s=>{const q=String(s||"").match(/(\d+)\s*G,\s*(\d+)\s*A in (\d+) apps/);return q?{g:+q[1],a:+q[2],apps:+q[3]}:null;};
      if(mode==="cmp"&&(m2=t.match(/^\d+\.\s*(.+?)\s*\((.+?)\):\s*(\d+)\s*G,\s*(\d+)\s*A in (\d+) apps\s*\|\s*last season:\s*(.+?)\s*$/))){
        D.season.scorers.push({player:m2[1],team:m2[2],g:+m2[3],a:+m2[4],apps:+m2[5],last:lastNums(m2[6])});continue;}
      if((mode==="drought"||mode==="improve")&&(m2=t.match(/^(.+?)\s*\((.+?)\):\s*(\d+)\s*G in (\d+) apps now\s*\|\s*last season:\s*(.+?)\s*$/))){
        D.season[mode==="drought"?"droughts":"improvers"].push({player:m2[1],team:m2[2],g:+m2[3],apps:+m2[4],last:lastNums(m2[5])});continue;}
      continue;
    }
  }
  return D;
}

/* ================= RENDER STATE ================= */
let DATA=null,curLeagueName=null,curEuroTitle=null,curStarLeague=null,curCupFilter="",curEuroStat=null;
let leagueSort={k:"pos",d:1},euroSort={k:"pos",d:1},squadSort={k:"rating",d:-1};
function feeNum(f){const n=parseFloat(String(f||"").replace(/[^0-9.]/g,""));return isNaN(n)?0:n;}
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.remove("hidden");clearTimeout(t._h);t._h=setTimeout(()=>t.classList.add("hidden"),2600);}
function bootProg(pct,msg,stats){$("#bootFill").style.width=Math.round(pct*100)+"%";if(msg)$("#bootMsg").textContent=msg;if(stats!==undefined)$("#bootStats").textContent=stats;}

function renderAll(D){
  DATA=D;
  if(!D.leagueOrder.length){toast("No leagues found in this file — is it a season export?");$("#bootLoader").classList.add("done");return;}
  curLeagueName=D.meta.league&&D.leagues[D.meta.league]?D.meta.league:D.leagueOrder[0];
  curEuroTitle=(D.europe.find(e=>/champions league/i.test(e.title))||D.europe[0]||{}).title;curStarLeague=D.leagueOrder[0];
  curCupFilter=D.cups[0]?D.cups[0].name:"";
  leagueSort={k:"pos",d:1};euroSort={k:"pos",d:1};squadSort={k:"rating",d:-1};
  try{buildOvrLookup(D);}catch(e){}
  renderHero();renderStories();renderLeaguePills();renderLeague();renderWorld();renderEuroPills();renderEuro();renderEuroStats();
  renderCups();renderTransfers();renderStars();renderSeason();renderClub();
  document.querySelectorAll(".reveal").forEach(el=>el.classList.add("visible"));
  try{hydrateSlots(document);}catch(e){}
  try{renderShelf();}catch(e){}
}

function renderHero(){
  const D=DATA,club=D.meta.club||"Your Club";
  const snap=String(D.meta.snapshot||"").toUpperCase();
  let kicker="MID-SEASON SPECIAL";
  if(/END/.test(snap))kicker="END-OF-SEASON REVIEW";
  else if(/EARLY/.test(snap))kicker="EARLY-SEASON SPECIAL";
  else if(/RUN.?IN/.test(snap))kicker="RUN-IN SPECIAL";
  else if(/MID/.test(snap))kicker="MID-SEASON SPECIAL";
  else{
    // Fallback for old exports without a Snapshot line: June ~= end of season.
    const mo=String(D.meta.date||"").match(/-(\d{2})-\d{2}$/);
    if(mo&& (mo[1]==="05"||mo[1]==="06"||mo[1]==="07"))kicker="END-OF-SEASON REVIEW";
  }
  $("#heroKicker").textContent=kicker+" • "+(D.meta.date||"2026")+" • "+(D.meta.league||"");
  $("#heroLeague").textContent=(D.meta.league||"")+" • Season "+(D.meta.season||1);
  $("#heroClub").textContent=club;
  $("#heroManager").textContent="Manager "+(D.meta.manager||"")+" • "+(D.club.objectives||"").replace("Board objectives (raw codes): ","Board: ");
  const crest=$("#heroCrest");const u=teamLogo(club);
  crest.innerHTML=u?`<img src="${u}" alt="crest">`:`<span>${esc(initials(club))}</span>`;
  const ll=$("#heroLeagueLogo");const lu=compLogo(D.meta.league||"");
  if(lu){ll.src=lu;ll.style.display="block";ll.onerror=()=>ll.style.display="none";}else ll.style.display="none";
  const rec=(D.club.record||"").match(/played\s*(\d+),\s*W(\d+)\s*D(\d+)\s*L(\d+)\s*\|\s*GF\s*(\d+),\s*GA\s*(\d+)/);
  const cards=rec?[["Played",rec[1]],["Won",rec[2]],["Drawn",rec[3]],["Lost",rec[4]],["Scored",rec[5]],["Conceded",rec[6]]]:[["Info","See deep dive"]];
  $("#heroStats").innerHTML=cards.map(c=>`<div class="stat-chip"><b>${esc(c[1])}</b><span>${esc(c[0])}</span></div>`).join("");
  const last5=D.club.matches.slice(-5);
  $("#heroForm").innerHTML=last5.map(m=>`<i class="fp ${m.res}">${m.res}</i>`).join("")||"<span>—</span>";
  $("#heroNext").innerHTML=(D.club.next.slice(0,2).map(n=>`<div>Next: <b>${esc(n.date)}</b> ${n.ha==="at"?"at":"vs"} <b>${esc(n.opp)}</b> <span>(${esc(n.comp)})</span></div>`).join(""))||"";
  const ticks=[];
  if(D.boot[0])ticks.push({t:"Golden Boot",img:null,player:D.boot[0],h:`${D.boot[0].player} leads with ${D.boot[0].goals} goals`,p:`${D.boot[0].team} • ${D.boot[0].goals} in ${D.boot[0].apps} apps`});
  if(D.topDeals[0])ticks.push({t:"Record deal",img:null,player:{player:D.topDeals[0].player},h:`${D.topDeals[0].player} → ${D.topDeals[0].to}`,p:`${D.topDeals[0].fee} from ${D.topDeals[0].from}`});
  D.leagueOrder.slice(0,3).forEach(n=>{const l=D.leagues[n];if(l&&l.rows[0])ticks.push({t:n,img:compLogo(n),h:`${l.rows[0].team} lead the table`,p:`${l.rows[0].pts} pts, +${l.rows[0].pts-(l.rows[1]?l.rows[1].pts:0)} over 2nd`});});
  $("#tickerTrack").innerHTML=ticks.map(k=>`<div class="headline">${k.img?`<img src="${k.img}" onerror="this.style.display='none'">`:""}<div><b>${esc(k.t.toUpperCase())}</b>${esc(k.h)}<br><small style="color:var(--mut)">${esc(k.p)}</small></div></div>`).join("");
  $("#heroBoot").innerHTML=D.boot.slice(0,4).map((b,i)=>`<div class="mini-row">${playerBadge(b.player,null,b.pos,b.rating,"",b.team)}<div class="grow"><b>${i+1}. ${esc(b.player)}</b> ${ovrPillFor(b.player)}<small>${esc(b.team)} • ${b.goals} goals</small></div><span class="rate">${Number(b.rating).toFixed(1)}</span></div>`).join("");
}

function renderStories(){
  const D=DATA,el=$("#storyCards");const cards=[];
  const bl=D.leagues[D.leagueOrder.find(n=>/bundesliga/i.test(n))||D.leagueOrder[0]];
  if(bl&&bl.rows[0]){const gap=bl.rows[0].pts-(bl.rows[1]?bl.rows[1].pts:0);
    cards.push({tag:"Title race",img:compLogo(bl.name),big:`+${gap}`,h:`${bl.rows[0].team} clear at the top`,p:bl.title});}
  if(D.boot[0])cards.push({tag:"Golden boot",player:D.boot[0].player,big:`${D.boot[0].goals}`,h:`${D.boot[0].player} leads the charts`,p:`${D.boot[0].team} • ${D.boot[0].goals} in ${D.boot[0].apps} (${D.boot[0].perGame}/game)`});
  if(D.topDeals[0])cards.push({tag:"Record transfer",player:D.topDeals[0].player,big:D.topDeals[0].fee.split(" ")[0]||"€",h:`${D.topDeals[0].player} → ${D.topDeals[0].to}`,p:`From ${D.topDeals[0].from} • ${D.myDeals.length} deals at ${D.meta.club}`});
  const W=D.club.matches.filter(m=>m.res==="W").length,Dr=D.club.matches.filter(m=>m.res==="D").length,L=D.club.matches.filter(m=>m.res==="L").length;
  const li=D.leagues[D.meta.league]?(D.leagues[D.meta.league].rows.findIndex(r=>r.mine)+1):0;
  cards.push({tag:"Your story",img:teamLogo(D.meta.club),big:`${W}-${Dr}-${L}`,h:`${D.meta.club}${li?" sit "+li+"th":""} in ${D.meta.league}`,p:D.club.signing||D.club.record||""});
  if(D.story.teens[0]){const t0=D.story.teens[0];cards.push({tag:"Wonderkid",player:t0.player,ovr:t0.ovr,pos:t0.pos,big:`${Number(t0.rating).toFixed(1)}`,h:`${t0.player} (${t0.age}) exploding`,p:`${t0.team} • OVR ${t0.ovr} • ${t0.goals}G ${t0.assists}A in ${t0.apps} apps`});}
  if(D.story.flops[0]){const f=D.story.flops[0];cards.push({tag:"Cold streak",player:f.player,ovr:f.ovr,pos:f.pos,big:"0–3",h:`${f.player} misfiring`,p:`OVR ${f.ovr} but only ${f.goals} goals in ${f.apps} apps`});}
  el.innerHTML=cards.map(c=>`<div class="story-card"><span class="story-media">${c.player?playerBadge(c.player,c.ovr||null,null,null,"lg"):(c.img?`<img src="${c.img}" onerror="this.parentElement.innerHTML='<span class=big-num>${esc(c.big)}</span>'">`:`<span class="big-num">${esc(c.big)}</span>`)}</span><div class="story-body"><span class="story-tag">${esc(c.tag)}</span><h3>${esc(c.h)}</h3><p>${ovrInText(c.p)}</p></div></div>`).join("");
}

/* ---------- sortable tables ---------- */
function sortArrow(cur,k){return cur.k===k?`<span class="arrow">${cur.d===1?"▲":"▼"}</span>`:"";}
function sortBy(rows,k,d,isNum){const r=[...rows];r.sort((a,b)=>{let x=a[k],y=b[k];
  if(isNum){x=+x||0;y=+y||0;return (x-y)*d;}x=String(x||"");y=String(y||"");return x.localeCompare(y)*d;});return r;}
function formPills(f){return String(f||"").split("").map(c=>`<i class="fp small ${c}">${c}</i>`).join("");}
function zoneClass(l,pos,n){if(n>=18){if(pos<=4)return"zone-ucl";if(pos>n-4)return"zone-rel";return"zone-mid";}
  if(n>=16){if(pos<=4)return"zone-ucl";if(pos>n-3)return"zone-rel";return"zone-mid";}
  return pos<=2?"zone-ucl":(pos>n-2?"zone-rel":"zone-mid");}

function renderLeaguePills(){
  $("#leaguePills").innerHTML=DATA.leagueOrder.map(n=>{const u=compLogo(n);return `<button data-l="${esc(n)}" class="${n===curLeagueName?"active":""}">${u?`<img src="${u}" onerror="this.style.display='none'">`:""}${esc(n)}</button>`;}).join("");
  $("#leaguePills").querySelectorAll("button").forEach(b=>b.onclick=()=>{curLeagueName=b.dataset.l;leagueSort={k:"pos",d:1};renderLeaguePills();renderLeague();});
}
function renderLeague(){
  const L=DATA.leagues[curLeagueName];if(!L)return;
  const u=compLogo(curLeagueName);
  $("#leagueBanner").innerHTML=`${u?`<img src="${u}" onerror="this.style.display='none'">`:""}<div><h3>${esc(curLeagueName)}</h3><small>${L.rows.length} clubs • Champion last season: ${esc(L.champion||"—")}</small></div><div class="zone-note" style="margin-left:auto;z-index:1">Click any column header to sort</div>`;
  const q=($("#teamSearch").value||"").toLowerCase();
  let rows=L.rows.filter(r=>!q||r.team.toLowerCase().includes(q));
  if(leagueSort.k!=="pos")rows=sortBy(rows,leagueSort.k,leagueSort.d,leagueSort.k!=="team");
  const th=(l,k,num)=>`<th class="sortable" data-k="${k}">${l}${sortArrow(leagueSort,k)}</th>`;
  $("#leagueTable").innerHTML=`<thead><tr><th>#</th>${th("Club","team")}${th("P","P",1)}${th("W","W",1)}<th>D</th><th>L</th>${th("GF","GF",1)}${th("GA","GA",1)}${th("GD","GD",1)}${th("Pts","pts",1)}<th>Form</th></tr></thead><tbody>`+
    rows.map((r,ix)=>`<tr class="${zoneClass(curLeagueName,r.pos,L.rows.length)} ${r.mine?"is-mine":""}"><td><span class="pos">${leagueSort.k==="pos"?r.pos:(ix+1)}</span></td><td><span class="team-cell">${teamBadge(r.team,"mini-crest")}${esc(r.team)}${r.mine?' <span class="tag in">YOU</span>':""}</span></td><td>${r.P}</td><td>${r.W}</td><td>${r.D}</td><td>${r.L}</td><td>${r.GF}</td><td>${r.GA}</td><td>${esc(r.GD)}</td><td><span class="pts">${r.pts}</span></td><td>${formPills(r.form)}</td></tr>`).join("")+`</tbody>`;
  $("#leagueTable").querySelectorAll("th.sortable").forEach(h=>h.onclick=()=>{const k=h.dataset.k;
    if(leagueSort.k===k)leagueSort.d*=-1;else leagueSort={k,d:k==="team"?1:-1};renderLeague();});
  $("#titleRace").innerHTML=`<b>Title race:</b> ${esc(L.title||"—")}`;
  const pulseTiles=(()=>{const s=L.stats||"";
    const out=[];let m;
    if(m=s.match(/(\d+)\s+league matches played/))out.push(["Matches played",m[1]]);
    if(m=s.match(/([\d.]+)\s*goals\/game/))out.push(["Goals / game",m[1]]);
    if(m=s.match(/home wins\s*(\d+)%/i))out.push(["Home wins",m[1]+"%"]);
    if(m=s.match(/draws\s*(\d+)%/i))out.push(["Draws",m[1]+"%"]);
    if(m=s.match(/away wins\s*(\d+)%/i))out.push(["Away wins",m[1]+"%"]);
    return out.length?`<div class="pulse-grid">${out.map(t=>`<div class="pulse-tile"><b>${esc(t[1])}</b><span>${esc(t[0])}</span></div>`).join("")}</div>`:`<div style="font-size:13px;color:var(--mut)">${esc(s||"No stats yet.")}</div>`;})();
  $("#leagueMeta").innerHTML=`<div class="panel-title">Season pulse</div>${pulseTiles}
    <div class="pulse-game"><span class="lbl">Biggest statement</span><b>${esc(L.wins[0]||"—")}</b></div>
    <div class="pulse-game"><span class="lbl">Goals galore</span><b>${esc(L.high[0]||"—")}</b></div>`;
  $("#leagueWins").innerHTML=(L.wins||[]).map(w=>`<div class="mini-row"><span>⚡</span><div class="grow">${esc(w)}</div></div>`).join("")||"—";
  const det=DATA.leagueDetails[curLeagueName]||DATA.leagueDetails[Object.keys(DATA.leagueDetails).find(k=>k.toLowerCase()===curLeagueName.toLowerCase())||""];
  const sc=det&&det.cats["Top scorers"]?det.cats["Top scorers"]:[];
  $("#leagueScorers").innerHTML=sc.map(s=>`<div class="mini-row">${playerBadge(s.player,s.ovr,s.pos,s.rating,"",s.team)}<div class="grow"><b>${esc(s.player)}</b> ${ovrPill(s.ovr??ovrFor(s.player))}<small>${esc(s.team)} • ${s.goals}G ${s.assists}A</small></div><span class="rate">${Number(s.rating).toFixed(1)}</span></div>`).join("")||"<span style='color:var(--mut)'>No stat feed.</span>";
  try{hydrateSlots(document);}catch(e){}
}

function renderWorld(){
  if(!DATA.world.length){$("#worldGrid").innerHTML="<div class='panel'>No world leagues in this export.</div>";return;}
  $("#worldGrid").innerHTML=DATA.world.map(w=>{const u=compLogo(w.league);
    const row=(lbl,t,pts,first)=>t?`<div class="world-line${first?" first":""}"><span>${lbl} ${teamBadge(t,"mini-crest")} ${esc(t)}</span><b>${esc(pts)}</b></div>`:"";
    return `<div class="world-card"><h4>${u?`<img src="${u}" onerror="this.style.display='none'">`:""}${esc(w.league)}</h4>${w.note?`<div class="world-note">${esc(w.note)}</div>`:""}`
    +row("1st",w.first&&w.first.team,w.first&&(w.first.pts+" pts ("+w.first.gd+")"),1)
    +row("2nd",w.second&&w.second.team,w.second&&w.second.pts)
    +row("3rd",w.third&&w.third.team,w.third&&w.third.pts)
    +(w.bottom?`<div class="world-line"><span>Drop zone</span><b>${esc(w.bottom)}</b></div>`:"")+`</div>`;}).join("");
}

function renderEuroPills(){
  $("#euroPills").innerHTML=DATA.europe.map(e=>`<button data-e="${esc(e.title)}" class="${e.title===curEuroTitle?"active":""}">${esc(e.title.split("(")[0].slice(0,26))}</button>`).join("");
  $("#euroPills").querySelectorAll("button").forEach(b=>b.onclick=()=>{curEuroTitle=b.dataset.e;euroSort={k:"pos",d:1};renderEuroPills();renderEuro();});
}
function renderEuro(){
  const E=DATA.europe.find(e=>e.title===curEuroTitle)||DATA.europe[0];if(!E)return;
  const u=compLogo(E.title);
  $("#euroBanner").innerHTML=`${u?`<img src="${u}" onerror="this.style.display='none'">`:""}<div><h3>${esc(E.title)}</h3><small>${E.rows.length} clubs • Swiss league phase</small></div>`;
  const big=E.rows.length>=32;
  let rows=[...E.rows];if(euroSort.k!=="pos")rows=sortBy(rows,euroSort.k,euroSort.d,euroSort.k!=="team");
  const th=(l,k)=>`<th class="sortable" data-k="${k}">${l}${sortArrow(euroSort,k)}</th>`;
  let html=`<thead><tr><th>#</th>${th("Club","team")}<th>P</th><th>W</th><th>D</th><th>L</th>${th("GD","GD")}${th("Pts","pts")}</tr></thead><tbody>`;
  rows.forEach(r=>{html+=`<tr class="${r.mine?"is-mine":""}"><td><span class="pos">${r.pos}</span></td><td><span class="team-cell">${teamBadge(r.team,"mini-crest")}${esc(r.team)}</span></td><td>${r.P}</td><td>${r.W}</td><td>${r.D}</td><td>${r.L}</td><td>${esc(r.GD)}</td><td><span class="pts">${r.pts}</span></td></tr>`;
    if(big&&euroSort.k==="pos"){if(r.pos===8)html+=`<tr><td colspan="8" style="background:#22e07a22;color:#22e07a;font-weight:800;font-size:11px;letter-spacing:1px">— TOP 8: STRAIGHT TO ROUND OF 16 —</td></tr>`;
      if(r.pos===24)html+=`<tr><td colspan="8" style="background:#ffb02022;color:var(--amber);font-weight:800;font-size:11px;letter-spacing:1px">— 9–24: KNOCKOUT PLAY-OFF • 25+: ELIMINATED —</td></tr>`;}});
  $("#euroTable").innerHTML=html+"</tbody>";
  $("#euroTable").querySelectorAll("th.sortable").forEach(h=>h.onclick=()=>{const k=h.dataset.k;
    if(euroSort.k===k)euroSort.d*=-1;else euroSort={k,d:k==="team"?1:-1};renderEuro();});
  const st=DATA.euroStats[E.title]||{};
  $("#euroStats").innerHTML=Object.keys(st.cats||{}).length?Object.entries(st.cats).map(([k,v])=>`<b>${esc(k)}:</b> ${v.slice(0,3).map(p=>esc(p.player)+ovrPill(p.ovr??ovrFor(p.player))+" ("+p.goals+"G)").join(" • ")}`).join("<br>"):"Top individual stats live in the Stars section.";
}
function parseCupTie(t){
  let s=String((t&&t.text)||"").replace(/\s*<== YOUR CLUB\s*/g,"");
  s=s.replace(/\s*\|\s*winner:.*$/i,"").trim();
  let pens=null;const pm=s.match(/\(pens\s*(\d+)\s*-\s*(\d+)\)/i);
  if(pm){pens={a:+pm[1],b:+pm[2]};s=s.replace(/\(pens\s*\d+\s*-\s*\d+\)/i,"").trim();}
  const agg=/\(agg\.\)|\(aggregate\)/i.test(s);
  s=s.replace(/\(agg\.\)|\(aggregate\)/i,"").trim().replace(/^\d{4}-\d{2}-\d{2}\s+/,"").trim();
  const m=s.match(/^(.+?)\s+(\d+)\s*-\s*(\d+)\s+(.+)$/);
  if(!m)return null;
  return {a:m[1].trim(),sa:+m[2],sb:+m[3],b:m[4].trim(),agg,pens};
}
function bracketTieHTML(t){
  const p=parseCupTie(t);
  if(!p)return `<div class="tie ${t.mine?"mine":""}">${t.agg?`<span class="agg-tag">AGG</span>`:""}${esc(t.text)}${t.winner?` <span class="win">• ${esc(t.winner)}</span>`:""}${(t.legs||[]).map(l=>`<div class="leg">Leg ${l.n}: ${esc(l.date+" "+l.home+" "+l.hs+"-"+l.as+" "+l.away)}</div>`).join("")}</div>`;
  const w=t.winner||"";
  const decided=!!w||p.sa!==p.sb;
  const aW=decided&&(w?p.a===w:p.sa>p.sb),bW=decided&&(w?p.b===w:p.sb>p.sa);
  const row=(name,score,win,dim)=>`<div class="bk-team${win?" win":""}${dim?" dim":""}">${teamBadge(name,"mini-crest")}<span class="bk-name">${esc(name)}</span><b>${score}</b></div>`;
  const legs=(t.legs||[]).map(l=>`<div class="leg">L${l.n} ${esc(l.date)}: ${esc(l.home)} ${l.hs}-${l.as} ${esc(l.away)}</div>`).join("");
  const meta=[p.agg?`<span class="agg-tag">AGG</span>`:"",p.pens?`<span class="bk-pens">pens ${p.pens.a}-${p.pens.b}</span>`:"",w?`<span class="win">🏆 ${esc(w)}</span>`:""].filter(Boolean).join(" ");
  return `<div class="bk-tie${t.mine?" mine":""}">${row(p.a,p.sa,aW,decided&&!aW)}${row(p.b,p.sb,bW,decided&&!bW)}${meta?`<div class="bk-meta">${meta}</div>`:""}${legs?`<div class="bk-legs">${legs}</div>`:""}</div>`;
}
function shortStage(s){s=String(s||"").replace(/\s*\(.+?\)\s*$/,"");const l=s.toLowerCase();
  if(/^\s*final\s*$/i.test(s))return"FINAL";
  if(/semi/i.test(l))return"SEMI-FINAL";
  if(/quarter/i.test(l))return"QUARTER-FINAL";
  if(/round of 16/i.test(l))return"ROUND OF 16";
  if(/round of 32/i.test(l))return"ROUND OF 32";
  if(/play-?off/i.test(l))return"PLAY-OFF";
  if(/knockout/i.test(l))return"KNOCKOUT";
  const rm=s.match(/^round (\d+)/i);if(rm)return("ROUND "+rm[1]).toUpperCase();
  return (s.length>22?s.slice(0,22):s).toUpperCase();}
/* ---- true single-elimination tree: winners feed forward, linked by team name ----
   rounds[] is file order (Final first). Feeder for a slot = closest tie (same round
   first, then earlier stages) whose winner is that team. Imperfect data (mixed
   round labels, byes, undecided ties) degrades gracefully: unlinked slots just
   have no branch, leftover ties render below the tree. */
function inferredWinner(t,p){const w=String(t.winner||"").replace(/\s*<== YOUR CLUB\s*/g,"");if(w)return w;
  if(p.sa>p.sb)return p.a;if(p.sb>p.sa)return p.b;return "";}
function buildCupTree(cup){
  const rounds=cup.rounds;if(!rounds.length)return null;
  const P=rounds.map(r=>r.ties.map(t=>({t,p:parseCupTie(t)})));
  const used=new Set(),K=(r,i)=>r+":"+i;
  function findFeeder(slot,ri,selfK){
    for(let r=ri;r<rounds.length;r++)for(let i=0;i<P[r].length;i++){
      if(K(r,i)===selfK||used.has(K(r,i)))continue;
      const e=P[r][i];if(!e.p)continue;
      if(inferredWinner(e.t,e.p)===slot){used.add(K(r,i));return {ri:r,ti:i};}
    }
    return null;}
  function nodeFor(ri,ti,depth){
    if(depth>8)return null;
    const e=P[ri][ti];if(!e||!e.p)return null;
    const selfK=K(ri,ti);
    const faRef=findFeeder(e.p.a,ri,selfK),fbRef=findFeeder(e.p.b,ri,selfK);
    return {tie:e.t,p:e.p,stage:rounds[ri].stage,ri,ti,
      fa:faRef?nodeFor(faRef.ri,faRef.ti,depth+1):null,
      fb:fbRef?nodeFor(fbRef.ri,fbRef.ti,depth+1):null};}
  const roots=[];
  rounds[0].ties.forEach((t,i)=>{if(!P[0][i].p)return;used.add(K(0,i));
    roots.push(nodeFor(0,i,0));});
  if(!roots.length)return null;
  if(used.size<=roots.length)return null; // no links at all -> flat view is clearer
  const left=[];
  rounds.forEach((r,ri)=>r.ties.forEach((t,ti)=>{if(!used.has(K(ri,ti)))left.push({t,stage:r.stage});}));
  return {roots,left};
}
function cupMatchInner(t,p,stage){
  const w=String(t.winner||"").replace(/\s*<== YOUR CLUB\s*/g,"");
  const decided=!!w||p.sa!==p.sb;
  const aW=decided&&(w?p.a===w:p.sa>p.sb),bW=decided&&(w?p.b===w:p.sb>p.sa);
  const row=(name,score,win,dim)=>`<div class="bk-team${win?" win":""}${dim?" dim":""}" data-t="${esc(norm(name))}">${teamBadge(name,"mini-crest")}<span class="bk-name">${esc(name)}</span><b>${score}</b></div>`;
  const legs=(t.legs||[]).map(l=>`<div class="leg">L${l.n} ${esc(l.date)}: ${esc(l.home)} ${l.hs}-${l.as} ${esc(l.away)}</div>`).join("");
  const meta=[p.agg?`<span class="agg-tag">AGG</span>`:"",p.pens?`<span class="bk-pens">pens ${p.pens.a}-${p.pens.b}</span>`:"",w?`<span class="win">🏆 ${esc(w)}</span>`:""].filter(Boolean).join(" ");
  return `<span class="bkt-stage" title="${esc(stage||"")}">${esc(shortStage(stage))}</span>${row(p.a,p.sa,aW,decided&&!aW)}${row(p.b,p.sb,bW,decided&&!bW)}${meta?`<div class="bk-meta">${meta}</div>`:""}${legs?`<div class="bk-legs">${legs}</div>`:""}`;
}
/* ---- bracket MATRIX: strict round lanes (earliest left, final right) ----
   Same winner-linking as before, but every round owns one vertical lane and
   every tie is slotted by bracket order, so rounds always line up no matter
   how gappy the export is. Skipped lanes between a linked pair (a tie that is
   genuinely absent from the export) get a dashed ghost card saying so. */
var SLOT_H=150;
function buildCupMatrix(cup){
  const tree=buildCupTree(cup);
  if(!tree)return null;
  const nR=cup.rounds.length;
  const lanes=[...cup.rounds].reverse().map(r=>r.stage);
  const laneOfRi=r=>nR-1-r;
  let leaf=0;
  function mm(n){const k=[n.fa,n.fb].filter(Boolean);
    if(!k.length){n._lo=n._hi=leaf++;n.slot=n._lo;return;}
    k.forEach(mm);
    n._lo=Math.min(k[0]._lo,k.length>1?k[1]._lo:k[0]._lo);
    n._hi=Math.max(k[0]._hi,k.length>1?k[1]._hi:k[0]._hi);
    n.slot=(n._lo+n._hi)/2;}
  tree.roots.forEach(mm);
  const laneNodes=lanes.map(()=>[]),ghosts=[];
  function place(n){
    laneNodes[laneOfRi(n.ri)].push({kind:'tie',n,slot:n.slot});
    for(const f of [n.fa,n.fb]){
      if(!f)continue;
      const lc=laneOfRi(f.ri),lp=laneOfRi(n.ri);
      if(lp-lc>1){
        const w=inferredWinner(f.tie,f.p);
        for(let s=lc+1;s<lp;s++){
          const g=(s-lc)/(lp-lc);
          ghosts.push({kind:'ghost',lane:s,slot:f.slot+(n.slot-f.slot)*g,team:w,stage:lanes[s],child:f,parent:n,tid:null});
        }
      }
      place(f);
    }
  }
  tree.roots.forEach(place);
  ghosts.forEach(g=>laneNodes[g.lane].push(g));
  laneNodes.forEach(l=>l.sort((a,b)=>a.slot-b.slot));
  return {lanes,laneNodes,ghosts,left:tree.left,roots:tree.roots};
}
function layoutMatrixLanes(){
  document.querySelectorAll(".bkt-matrix").forEach(mx=>{
    mx.querySelectorAll(".bkt-lane-b").forEach(lane=>{
      let prevSlot=0,prevH=0,first=true;
      Array.prototype.forEach.call(lane.children,el=>{
        const slot=parseFloat(el.dataset.slot||"0");
        const h=el.offsetHeight||100;
        el.style.marginTop=(first?6:Math.max(10,(slot-prevSlot)*SLOT_H-prevH))+"px";
        prevSlot=slot;prevH=h;first=false;
      });
    });
  });
}
function matrixHTML(cup,mx,cupId){
  const links=[];
  let gk=0;
  mx.ghosts.forEach(g=>{g.tid=`${cupId}-g${gk++}`;});
  function chain(n){
    const tid=`${cupId}-${n.ri}-${n.ti}`;
    for(const f of [n.fa,n.fb]){
      if(!f)continue;
      const ftid=`${cupId}-${f.ri}-${f.ti}`;
      const gs=mx.ghosts.filter(g=>g.child===f&&g.parent===n).sort((a,b)=>a.lane-b.lane);
      let prev=ftid;
      gs.forEach(g=>{links.push([prev,g.tid]);prev=g.tid;});
      links.push([prev,tid]);
      chain(f);
    }
  }
  mx.roots.forEach(chain);
  function tieCard(n,lane){
    const tid=`${cupId}-${n.ri}-${n.ti}`;
    return `<div class="bkt-match${n.tie.mine?" mine":""}" data-tid="${tid}" data-teams="${esc(norm(n.p.a))}|${esc(norm(n.p.b))}" data-slot="${n.slot}" data-lane="${lane}">${cupMatchInner(n.tie,n.p,n.stage)}</div>`;
  }
  function ghostCard(g){
    return `<div class="bkt-ghost" data-tid="${g.tid}" data-t="${esc(norm(g.team||""))}" data-teams="${esc(norm(g.team||""))}" data-slot="${g.slot}" data-lane="${g.lane}"><span class="bkt-stage">${esc(shortStage(g.stage))}</span><b>${esc(g.team||" ? ")}</b><span>opponent unknown</span><em>tie not in export</em></div>`;
  }
  const laneHTML=mx.lanes.map((stage,i)=>{
    const items=mx.laneNodes[i];
    return `<div class="bkt-lane"><div class="bkt-lane-h" title="${esc(stage)}"><span class="stage-badge">${esc(shortStage(stage))}</span><span class="stage-count">${items.length}</span></div><div class="bkt-lane-b">${items.map(it=>it.kind==='ghost'?ghostCard(it):tieCard(it.n,i)).join("")}</div></div>`;
  }).join("");
  (window.__bktLinks=window.__bktLinks||{})[cupId]=links;
  return `<div class="bkt-matrix" data-cup="${cupId}">${laneHTML}<svg class="bkt-lines"></svg></div>`;
}
function bracketHTML(c,q,cupId){
  // Connected bracket whenever linkable paths exist (decided or in progress);
  // pure round-columns only when nothing links (group tables, single ties).
  const mx=buildCupMatrix(c);
  if(!mx){ // flat fallback: round columns (group tables, in-progress, undecided)
    let rounds=[...c.rounds].reverse();
    if(q)rounds=rounds.map(r=>({stage:r.stage,ties:(r.stage.toLowerCase().includes(q)?r.ties:r.ties.filter(t=>t.text.toLowerCase().includes(q)))})).filter(r=>r.ties.length);
    if(!rounds.length)return `<div class="panel">No ties match that search.</div>`;
    return `<div class="bracket">${rounds.map(r=>`<div class="bracket-round"><div class="bk-head"><span class="stage-badge">${esc(r.stage)}</span><span class="stage-count">${r.ties.length}</span></div><div class="bk-ties">${r.ties.map(bracketTieHTML).join("")}</div></div>`).join("")}${c.champion?`<div class="bracket-round champ"><div class="bk-head"><span class="stage-badge gold">🏆 Champion</span></div><div class="bk-champ">${esc(c.champion)}</div></div>`:""}</div>`;
  }
  const ql=(q||"").toLowerCase();
  const left=mx.left.filter(x=>!ql||x.t.text.toLowerCase().includes(ql)||x.stage.toLowerCase().includes(ql));
  return `<div class="bkt-wrap" id="wrap-${cupId}"><div class="bkt-hint">Rounds run left → right • click any team to trace its road to glory</div>${matrixHTML(c,mx,cupId)}${c.champion?`<div class="bk-champ-line">🏆 Champion: <b>${esc(c.champion)}</b></div>`:""}${left.length?`<details class="bkt-leftovers"><summary class="bkt-left-title">Other ties in this cup (${left.length}) — not on the paths above</summary><div class="bkt-left-body">${left.map(x=>bracketTieHTML(x.t)).join("")}</div></details>`:""}</div>`;
}
/* ---- SVG connectors: right edge of feeder card -> left edge of parent card ---- */
function drawBracketLines(){
  try{layoutMatrixLanes();}catch(e){}
  document.querySelectorAll(".bkt-matrix").forEach(mx=>{
    const svg=mx.querySelector("svg.bkt-lines");if(!svg)return;
    const links=((window.__bktLinks||{})[mx.dataset.cup]||[]);
    const byTid={};
    mx.querySelectorAll("[data-tid]").forEach(el=>byTid[el.dataset.tid]=el);
    const NS="http://www.w3.org/2000/svg";
    while(svg.firstChild)svg.removeChild(svg.firstChild);
    const W=mx.scrollWidth,H=mx.scrollHeight;
    svg.setAttribute("width",W);svg.setAttribute("height",H);
    svg.setAttribute("viewBox",`0 0 ${W} ${H}`);
    links.forEach(([c,p])=>{
      const a=byTid[c],b=byTid[p];if(!a||!b)return;
      const x1=a.offsetLeft+a.offsetWidth,y1=a.offsetTop+a.offsetHeight/2;
      const x2=b.offsetLeft,y2=b.offsetTop+b.offsetHeight/2;
      if(x2<=x1)return;
      const mx=(x1+x2)/2;
      const path=document.createElementNS(NS,"path");
      path.setAttribute("d",`M ${x1} ${y1} H ${mx} V ${y2} H ${x2}`);
      path.setAttribute("class","bkt-link");
      svg.appendChild(path);
    });
  });
}
let __bktDrawT=null;
function scheduleBracketDraw(){clearTimeout(__bktDrawT);
  __bktDrawT=setTimeout(()=>{try{drawBracketLines();}catch(e){}},60);
  setTimeout(()=>{try{drawBracketLines();}catch(e){}},900);}
/* ---- fullscreen bracket: whole tree on one screen, zoom in/out + fit ---- */
let bfsZ=1,bfsBase={w:800,h:600};
function bfsApply(z){bfsZ=Math.min(2.5,Math.max(.2,z));const el=$("#bfsZoom");
  el.style.transform=`scale(${bfsZ})`;el.style.width=bfsBase.w*bfsZ+"px";el.style.height=bfsBase.h*bfsZ+"px";
  $("#bfsZoomLabel").textContent=Math.round(bfsZ*100)+"%";}
function bfsFit(){const v=$("#bfsView");if(!v||!bfsBase.w)return;
  bfsApply(Math.min(v.clientWidth/bfsBase.w,v.clientHeight/bfsBase.h,2));}
function openBracketFS(idx){
  const c=DATA.cups[idx];if(!c)return;
  const fsId="cup"+idx+"fs";
  $("#bfsTitle").textContent=c.name;
  const z=$("#bfsZoom");
  z.style.transform="none";z.style.width="";z.style.height="";
  z.innerHTML=`<div class="bkt-tree-host" data-cup="${fsId}">${bracketHTML(c,(($("#cupSearch").value)||"").toLowerCase(),fsId)}</div>`;
  const host=z.querySelector(".bkt-tree-host"),t=host&&host.querySelector(".bkt-matrix");
  if(t)t.dataset.cup=fsId;
  $("#bracketFS").classList.remove("hidden");document.body.style.overflow="hidden";
  requestAnimationFrame(()=>{const inner=z.querySelector(".bkt-matrix,.bracket");
    bfsBase={w:(inner&&inner.scrollWidth)||800,h:(inner&&inner.scrollHeight)||600};
    bfsFit();scheduleBracketDraw();});
}
function closeBracketFS(){$("#bracketFS").classList.add("hidden");document.body.style.overflow="";}
function renderCups(){
  const pills=DATA.cups.map(c=>c.name);
  if(!pills.length){$("#cupList").innerHTML="<div class='panel'>No cup competitions in this export yet.</div>";$("#cupPills").innerHTML="";return;}
  if(!pills.includes(curCupFilter))curCupFilter=pills[0];
  $("#cupPills").innerHTML=pills.map(p=>`<button data-c="${esc(p)}" class="${curCupFilter===p?"active":""}">${esc(p.length>24?p.slice(0,24)+"…":p)}</button>`).join("");
  $("#cupPills").querySelectorAll("button").forEach(b=>b.onclick=()=>{curCupFilter=b.dataset.c;renderCups();});
  const q=($("#cupSearch").value||"").toLowerCase();
  const list=DATA.cups.filter(c=>c.name===curCupFilter&&(!q||c.name.toLowerCase().includes(q)||c.rounds.some(r=>r.stage.toLowerCase().includes(q)||r.ties.some(t=>t.text.toLowerCase().includes(q)))));
  $("#cupList").innerHTML=list.map(c=>{const u=compLogo(c.name);
    const cupId="cup"+DATA.cups.indexOf(c);
    return `<div class="cup-card"><div class="cup-head">${u?`<img src="${u}" onerror="this.style.display='none'">`:`<span class="mini-crest" style="background:linear-gradient(135deg,#7c3aed,#312e81)">🏆</span>`}<div><h3>${esc(c.name)}</h3><small>${c.matches||c.rounds.reduce((a,r)=>a+r.ties.length,0)} matches • ${c.champion?`<span class="champion">🏆 ${esc(c.champion)}</span>`:"knockout in progress"}</small></div><button class="fs-btn" data-fs="${DATA.cups.indexOf(c)}" title="Open this bracket fullscreen">⛶</button></div>
    <div class="cup-body"><div class="bkt-tree-host" data-cup="${cupId}">${bracketHTML(c,q,cupId)}</div></div></div>`;}).join("")||"<div class='panel'>No ties match that search.</div>";
  // tag tree with its cup id for line lookup, then draw connectors
  document.querySelectorAll(".bkt-tree-host").forEach(h=>{
    const t=h.querySelector(".bkt-matrix");if(t)t.dataset.cup=h.dataset.cup;});
  requestAnimationFrame(scheduleBracketDraw);
}

function renderTransfers(){
  $("#myDealCount").textContent=DATA.myDeals.length+" deals";
  const maxTop=Math.max(...DATA.topDeals.map(d=>feeNum(d.fee)),1);
  $("#myDeals").innerHTML=DATA.myDeals.map(d=>{const _o=d.ovr??ovrFor(d.player);return `<div class="deal"><span class="tag ${d.dir==="SIGNED"?"in":"out"}">${d.dir}</span>${playerBadge(d.player,d.ovr,d.pos,null,"md",d.to||d.from)}<div class="deal-info"><b>${esc(d.player)}</b> <span class="pos-chip">${esc(d.pos)}</span>${_o!=null?`<span class="ovr-inline ${ovrClass(_o)}">OVR ${_o}</span>`:""}<br><small style="color:var(--mut)">${teamBadge(d.from,"mini-crest")} ${esc(d.from)} → ${teamBadge(d.to,"mini-crest")} ${esc(d.to)}${d.date?" • "+esc(d.date):""}</small></div><span class="fee">${esc(d.fee)}</span></div>`}).join("")||"No deals.";
  $("#marquee").innerHTML=DATA.topDeals.map((d,i)=>{const _o=d.ovr??ovrFor(d.player);return `<div class="deal"><b class="deal-rank">${i+1}</b>${playerBadge(d.player,d.ovr,d.pos,null,"md",d.to||d.from)}<div class="deal-info" style="flex:1"><b>${esc(d.player)}</b> <span class="pos-chip">${esc(d.pos)}</span>${_o!=null?`<span class="ovr-inline ${ovrClass(_o)}">OVR ${_o}</span>`:""}<br><small style="color:var(--mut)">${teamBadge(d.from,"mini-crest")} ${esc(d.from)} → ${teamBadge(d.to,"mini-crest")} ${esc(d.to)}</small><div class="fee-bar" style="width:${Math.round(feeNum(d.fee)/maxTop*100)}%"></div></div><span class="fee">${esc(d.fee)}</span></div>`}).join("");
  $("#pendingList").innerHTML=DATA.pending.map(p=>`<div><b>${esc(p.player)}</b> ${ovrPill(p.ovr??ovrFor(p.player))}<br><span style="color:var(--mut)">${esc(p.from)} → ${esc(p.to)} • ${esc(p.completes)}</span></div>`).join("")||"No pre-signed deals.";
  const mgr=$("#mgrMoves");
  if(mgr)mgr.innerHTML=DATA.mgrMoves.length?DATA.mgrMoves.map(m=>`<div class="mini-row"><span>📋</span><div class="grow">${esc(m)}</div></div>`).join(""):`<div style="font-size:13px;color:var(--mut)">${esc(DATA.mgrNote||"No managerial changes detected.")}</div>`;
}

function renderEuroStats(){
  const host=$("#euroStatCards");if(!host)return;
  const keys=Object.keys(DATA.euroStats);
  if(!keys.length){host.innerHTML="<div style='font-size:13px;color:var(--mut)'>No continental stat feed in this export.</div>";$("#euroStatPills").innerHTML="";return;}
  if(!keys.includes(curEuroStat))curEuroStat=keys[0];
  $("#euroStatPills").innerHTML=keys.map(k=>`<button data-e="${esc(k)}" class="${k===curEuroStat?"active":""}">${esc(k)}</button>`).join("");
  $("#euroStatPills").querySelectorAll("button").forEach(b=>b.onclick=()=>{curEuroStat=b.dataset.e;renderEuroStats();});
  const st=DATA.euroStats[curEuroStat];
  const scorers=(st.cats["Top scorers"]||[]).slice(0,5);
  const assists=(st.cats["Top assists"]||[]).slice(0,5);
  const rated=(st.cats["Best ratings (min 4 apps)"]||st.cats["Best ratings"]||[]).slice(0,5);
  if(!scorers.length&&!assists.length&&!rated.length){host.innerHTML="<div style='font-size:13px;color:var(--mut)'>No scorers listed.</div>";return;}
  const row=(p,i,stat)=>`<div class="euro-row"><b class="euro-rank">${i+1}</b>${playerBadge(p.player,p.ovr,p.pos,p.rating,"",p.team)}<div class="grow"><b>${esc(p.player)}</b><small>${teamBadge(p.team,"mini-crest")} ${esc(p.team)} • ${esc(p.pos||"")}</small><div class="euro-sub">${ovrPill(p.ovr)}<span class="pos-chip">${p.apps} apps</span></div></div><div class="euro-stat"><b>${stat}</b><span class="rate">${Number(p.rating).toFixed(1)} ★</span></div></div>`;
  const col=(title,arr,fn)=>arr.length?`<div class="euro-col"><h5 class="sub-h">${title}</h5><div class="euro-list">${arr.map(fn).join("")}</div></div>`:"";
  host.innerHTML=`<div class="euro3">`
    +col("🥇 Top scorers",scorers,(p,i)=>row(p,i,`${p.goals} ⚽`))
    +col("🎯 Top assists",assists,(p,i)=>row(p,i,`${p.assists} 🅰️`))
    +col("⭐ Best ratings",rated,(p,i)=>row(p,i,`${p.goals}G ${p.assists}A`))
    +`</div>`;
  try{hydrateSlots(host);}catch(e){}
}

function renderSeason(){
  const cmp=$("#seasonTable");if(!cmp)return;
  const rows=DATA.season.scorers;
  cmp.innerHTML=rows.length?`<div class="table-wrap"><table class="league-table"><thead><tr><th>#</th><th>Player</th><th>This season</th><th>Last season</th><th>Δ goals</th></tr></thead><tbody>${
    rows.map((r,i)=>{const d=r.last?r.g-r.last.g:null;
      return `<tr><td><span class="pos">${i+1}</span></td><td><span class="player-cell">${playerBadge(r.player,null,null,null)}<b>${esc(r.player)}</b> ${ovrPillFor(r.player)}<br><small style="color:var(--mut)">${esc(r.team)}</small></span></td><td><b>${r.g}G ${r.a}A</b> <small style="color:var(--mut)">(${r.apps})</small></td><td>${r.last?`<b>${r.last.g}G ${r.last.a}A</b> <small style="color:var(--mut)">(${r.last.apps})</small>`:"<span style='color:var(--dim)'>n/a</span>"}</td><td>${d===null?"<span style='color:var(--dim)'>—</span>":`<span class="${d>0?"delta-up":d<0?"delta-down":""}">${d>0?"+":""}${d}</span>`}</td></tr>`;}).join("")}</tbody></table></div>`
    :"<div style='font-size:13px;color:var(--mut)'>No season-comparison data in this export.</div>";
  const card=(p,tag)=>{const d=p.last?p.g-p.last.g:null;
    return `<div class="star-card"><div class="star-photo">${playerBadge(p.player,null,null,null,"xl")}</div><div class="star-info"><b>${esc(p.player)}</b> ${ovrPillFor(p.player)}<small>${teamBadge(p.team,"mini-crest")} ${esc(p.team)}</small><div class="then-now"><span><b>${p.g}G</b>now (${p.apps})</span><span><b>${p.last?p.last.g:"–"}G</b>last${p.last?` (${p.last.apps})`:""}</span></div>${d===null?"":`<span class="${d>0?"delta-up":d<0?"delta-down":""}">${tag} ${d>0?"+":""}${d} goals</span>`}</div></div>`;};
  const dr=$("#droughtCards");if(dr)dr.innerHTML=DATA.season.droughts.map(p=>card(p,"📉")).join("")||"<div style='font-size:13px;color:var(--mut)'>No droughts flagged.</div>";
  const im=$("#improveCards");if(im)im.innerHTML=DATA.season.improvers.map(p=>card(p,"📈")).join("")||"<div style='font-size:13px;color:var(--mut)'>No improvers flagged.</div>";
}

function starCard(p,big){
  return `<div class="star-card"><div class="star-photo">${playerBadge(p.player,p.ovr,p.pos,p.rating,big?"xl":"md",p.team)}</div>
  <div class="star-info"><b>${esc(p.player)}</b><span class="pos-chip">${esc(p.pos||"")}</span>
  <small>${teamBadge(p.team,"mini-crest")} ${esc(p.team)}${(p.ovr??ovrFor(p.player))!=null?` • ${ovrPill(p.ovr??ovrFor(p.player))}`:""}${p.extra?` • ${esc(p.extra.replace(/^,\s*/,""))}`:""}</small>
  <div class="stat-tiles"><span><b>${p.goals}</b>G</span><span><b>${p.assists}</b>A</span><span><b>${p.apps}</b>Apps</span><span class="hl"><b>${p.rating?Number(p.rating).toFixed(1):"–"}</b>★</span></div></div></div>`;}
function renderStars(){
  const max=Math.max(...DATA.boot.map(b=>b.goals),1);
  $("#bootRace").innerHTML=DATA.boot.map((b,i)=>`<div class="boot-row"><b>${i+1}</b>${playerBadge(b.player,null,b.pos,b.rating,"",b.team)}<div><b>${esc(b.player)}</b> ${ovrPillFor(b.player)}<br><small style="color:var(--mut)">${esc(b.team)} • ${b.apps} apps • ${Number(b.rating).toFixed(1)} avg</small><div class="boot-bar"><i style="width:${Math.round(b.goals/max*100)}%"></i></div></div><span class="rate">${b.goals} ⚽</span></div>`).join("");
  const totsLine=t=>{const r=String(t.role||"").toUpperCase(),p=String(t.pos||"").toUpperCase();
    const DEF=new Set(["DEF","RB","CB","LB","RWB","LWB","RCB","LCB","RB ","SW"]);
    const MID=new Set(["MID","CDM","CM","CAM","RM","LM","RDM","LDM","RCM","LCM","RAM","LAM","DM","AM"]);
    if(r==="GK")return "GOAL";if(DEF.has(r)||DEF.has(p))return "DEFENCE";if(MID.has(r)||MID.has(p))return "MIDFIELD";return "ATTACK";};
  const byLine=l=>DATA.tots.filter(t=>totsLine(t)===l);
  const cell=t=>`<div class="pitch-player">${playerBadge(t.player,null,t.pos,t.rating,"md",t.team)}<b>${esc(t.player)}</b> ${ovrPillFor(t.player)}<span class="pos-chip">${esc(t.pos||t.role)}</span><span>${esc(t.team)} • ${Number(t.rating).toFixed(1)}</span></div>`;
  const line=(lbl,arr)=>arr.length?`<div class="pitch-line"><span class="pitch-tag">${lbl}</span><div class="pitch-row nowrap">${arr.map(cell).join("")}</div></div>`:"";
  const gk=byLine("GOAL"),df=byLine("DEFENCE"),md=byLine("MIDFIELD"),fw=byLine("ATTACK");
  $("#totsPitch").innerHTML=line("ATTACK",fw)+line("MIDFIELD",md)+line("DEFENCE",df)+line("GOAL",gk);
  $("#totsList").innerHTML=DATA.tots.map(t=>`${t.role} — <b style="color:var(--txt)">${esc(t.player)}</b> ${ovrPillFor(t.player)} (${esc(t.team)}, ${t.apps} apps, ${t.goals}G ${t.assists}A)`).join("<br>")
    +(DATA.bench.length?`<br><br><b>Substitutes Bench:</b><br>`+DATA.bench.map(t=>`SUB — <b style="color:var(--txt)">${esc(t.player)}</b> ${ovrPillFor(t.player)} (${esc(t.team)}, ${t.apps} apps, ${t.goals}G ${t.assists}A)`).join("<br>"):"")
    +(DATA.playmakers.length?`<br><br><b>🎯 Playmakers:</b><br>`+DATA.playmakers.map(p=>`<b style="color:var(--txt)">${esc(p.player)}</b> ${ovrPillFor(p.player)} (${esc(p.team)} — ${p.assists}A in ${p.apps})`).join("<br>"):"")
    +(DATA.youngStars.length?`<br><br><b>🌟 Young Players:</b><br>`+DATA.youngStars.map(p=>`<b style="color:var(--txt)">${esc(p.player)}</b> ${ovrPill(p.ovr??ovrFor(p.player))} (${esc(p.team)} — ${p.goals}G ${p.assists}A)`).join("<br>"):"")
    +(DATA.signings.length?`<br><br><b>💰 Signings of the Season:</b><br>`+DATA.signings.map(p=>`<b style="color:var(--txt)">${esc(p.player)}</b> ${ovrPillFor(p.player)} (${esc(p.from)} → ${esc(p.to)} — ${p.goals}G ${p.assists}A)`).join("<br>"):"");
  $("#starPills").innerHTML=DATA.leagueOrder.map(n=>`<button data-s="${esc(n)}" class="${n===curStarLeague?"active":""}">${esc(n.length>22?n.slice(0,22)+"…":n)}</button>`).join("");
  $("#starPills").querySelectorAll("button").forEach(b=>b.onclick=()=>{curStarLeague=b.dataset.s;renderStars();});
  const det=DATA.leagueDetails[curStarLeague];
  $("#starTabs").innerHTML=det?Object.entries(det.cats).map(([k,v])=>`<div class="star-cat"><h5>${esc(k)} <span class="count">${v.length}</span></h5><div class="star-cards">${v.map(p=>starCard(p)).join("")}</div></div>`).join(""):"";
  const H=(t,arr,sub)=>`<div class="hook-block"><div class="hook-head"><h4>${t} <span class="count">${arr.length}</span></h4><p>${sub}</p></div><div class="star-cards big">${arr.map(p=>starCard(p,true)).join("")}</div></div>`;
  $("#hooksGrid").innerHTML=H("🚀 Unlikely heroes",DATA.story.heroes,"OVR ≤74 scoring freely")+H("🧊 Big-name flops",DATA.story.flops,"OVR 82+ attackers gone cold")+H("🦁 Veterans delivering",DATA.story.veterans,"Age 34+ still deciding games")+H("🌟 Rising teenagers",DATA.story.teens,"Age ≤20, 5+ apps, by rating")+H("🎩 Midfield & defensive elite",DATA.story.defenders,"Top-rated non-attackers, min 8 apps");
}

function renderClub(){
  $("#myClubTitle").innerHTML=esc(DATA.meta.club||"My Club")+" <span>Deep Dive</span>";
  const sub=$("#myClubSub");if(sub)sub.textContent=(DATA.club.record||"")+" • "+(DATA.club.totalLine||"");
  $("#clubRecord").innerHTML=`<div style="font-size:13px">${esc(DATA.club.record||"")}<br><span style="color:var(--mut)">${esc(DATA.club.objectives||"")}</span><br><span style="color:var(--gold)">${esc(DATA.club.trophies||"")}</span><br><span style="color:var(--mut)">${esc(DATA.club.signing||"")}</span></div>`;
  $("#clubTimeline").innerHTML=DATA.club.matches.map(m=>{const c=m.res==="W"?"#22e07a":m.res==="D"?"#94a3b8":"#ff5d6c";
    const pens=m.pens?` (pens ${m.pens.a}-${m.pens.b})`:"";
    let sub="";
    if(m.best)sub=`<br><small style="color:var(--mut)">Best: ${injectOvrNames(esc(m.best))} (${m.brate})</small>`;
    else{
      const bits=[];
      if(m.top3)bits.push(`<br><small style="color:var(--mut)">Top 3: ${injectOvrNames(esc(m.top3))}</small>`);
      (m.goals||[]).forEach(g=>bits.push(`<br><small style="color:var(--mut)">⚽ ${esc(g.team)}: ${injectOvrNames(esc(g.text))}</small>`));
      (m.assists||[]).forEach(a=>bits.push(`<br><small style="color:var(--dim)">🅰️ ${esc(a.team)}: ${injectOvrNames(esc(a.text))}</small>`));
      sub=bits.join("");
    }
    return `<div class="tl-item" style="--c:${c}"><div class="tl-card"><b>${esc(m.date)}</b> • ${esc(m.comp)} • ${m.ha==="at"?"at":"vs"} <b>${esc(m.opp)}</b> — <b style="color:${c}">${m.res} ${m.gf}-${m.ga}${pens}</b>${sub}</div></div>`;}).join("");
  const q=(($("#squadSearch").value||"")).toLowerCase();
  let sq=DATA.club.squad.filter(s=>!q||s.player.toLowerCase().includes(q));
  const sqPanel=$("#squadTable").closest(".panel");
  if(sqPanel&&!sqPanel.querySelector(".ovr-legend")){const lg=document.createElement("div");lg.className="ovr-legend";lg.innerHTML=`<span class="ovr ovr-low">&lt;68</span> <span class="ovr ovr-mid">68–76</span> <span class="ovr ovr-good">77–83</span> <span class="ovr ovr-elite">84+</span><span class="ovr-legend-lbl">OVR tiers</span>`;sqPanel.insertBefore(lg,sqPanel.querySelector(".table-wrap"));}
  if(squadSort.k!=="player")sq=sortBy(sq.map(s=>({...s,GD:s.goals})),squadSort.k,squadSort.d,squadSort.k!=="player"&&squadSort.k!=="pos");
  const th=(l,k)=>`<th class="sortable" data-k="${k}">${l}${sortArrow(squadSort,k)}</th>`;
  $("#squadTable").innerHTML=`<thead><tr>${th("Player","player")}${th("Pos","pos")}${th("Age","age")}${th("OVR","ovr")}${th("Apps","apps")}${th("G","goals")}${th("A","assists")}${th("Rating","rating")}</tr></thead><tbody>`+
    sq.map(s=>`<tr><td><span class="player-cell">${playerBadge(s.player,s.ovr,s.pos,s.rating)}<b>${esc(s.player)}</b></span></td><td><span class="pos-chip">${esc(s.pos)}</span></td><td>${s.age}</td><td><span class="badge-ovr ${ovrClass(s.ovr)}" title="OVR ${s.ovr}">${s.ovr}</span></td><td>${s.apps}</td><td><b>${s.goals}</b></td><td>${s.assists}</td><td><span class="rate">${Number(s.rating).toFixed(1)}</span></td></tr>`).join("")+`</tbody>`;
  $("#squadTable").querySelectorAll("th.sortable").forEach(h=>h.onclick=()=>{const k=h.dataset.k;
    if(squadSort.k===k)squadSort.d*=-1;else squadSort={k,d:(k==="player"||k==="pos")?1:-1};renderClub();});
  $("#nextFixtures").innerHTML=DATA.club.next.map(n=>`<div class="next-card"><b>${esc(n.date)}</b><br>${n.ha==="at"?"✈️ at":"🏟️ vs"} <b>${esc(n.opp)}</b><br><small style="color:var(--mut)">${esc(n.comp)}</small></div>`).join("")||"No fixtures listed.";
  drawPointsChart();
}
/* Points-per-match bars + running-total line. WHAT IT MEASURES: every one of your
   club's matches in the order they appear in the export file (all competitions);
   each bar = points earned in that single match (W=3 green, D=1 grey, L=0 red);
   the cyan line = your running total after each match. */
function drawPointsChart(){
  const c=$("#formChart");if(!c)return;const ctx=c.getContext("2d");const W=c.width,H=c.height;
  ctx.clearRect(0,0,W,H);
  const ms=DATA.club.matches;const cap=$("#chartCap");
  if(!ms.length){if(cap)cap.textContent="No matches found in this export.";return;}
  const pts=ms.map(m=>m.res==="W"?3:m.res==="D"?1:0);
  const run=[];let acc=0;pts.forEach(p=>{acc+=p;run.push(acc);});
  const padL=34,padB=30,padT=14,padR=10,cw=W-padL-padR,ch=H-padT-padB;
  const maxRun=Math.max(...run,3),step=Math.max(1,Math.ceil(maxRun/5));
  ctx.font="10px Inter";ctx.textAlign="right";ctx.textBaseline="middle";
  for(let v=0;v<=maxRun+1;v+=step){const y=padT+ch-(v/maxRun)*ch;
    ctx.strokeStyle="#ffffff14";ctx.beginPath();ctx.moveTo(padL,y);ctx.lineTo(W-padR,y);ctx.stroke();
    ctx.fillStyle="#6b7a9e";ctx.fillText(v+" pts",padL-5,y);}
  const n=ms.length,bw=Math.min(26,(cw/n)*0.55);
  ctx.textAlign="center";ctx.textBaseline="top";
  ms.forEach((m,i)=>{const x=padL+(i+0.5)*(cw/n),bh=(pts[i]/3)*(ch*0.55),y=padT+ch-bh;
    ctx.fillStyle=m.res==="W"?"#22e07a":m.res==="D"?"#94a3b8":"#ff5d6c";
    if(ctx.roundRect){ctx.beginPath();ctx.roundRect(x-bw/2,y,bw,Math.max(bh,2),3);ctx.fill();}
    else ctx.fillRect(x-bw/2,y,bw,Math.max(bh,2));
    if(n<=20||i%2===0){ctx.fillStyle="#6b7a9e";ctx.fillText(i+1,x,padT+ch+4);}});
  ctx.strokeStyle="#00e5ff";ctx.lineWidth=2.5;ctx.beginPath();
  run.forEach((v,i)=>{const x=padL+(i+0.5)*(cw/n),y=padT+ch-(v/maxRun)*ch;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});
  ctx.stroke();
  run.forEach((v,i)=>{const x=padL+(i+0.5)*(cw/n),y=padT+ch-(v/maxRun)*ch;
    ctx.fillStyle="#00e5ff";ctx.beginPath();ctx.arc(x,y,3,0,7);ctx.fill();});
  if(cap)cap.textContent=`Match 1 = ${ms[0].date} vs ${ms[0].opp} (${ms[0].comp}) … match ${n} = ${ms[n-1].date} vs ${ms[n-1].opp}. Running total now ${acc} pts from ${n} games.`;
}

/* ================= BOOT: parse -> resolve crests -> fetch photos -> render ================= */
function collectPlayers(D){const m=new Map();
  const add=(p,ovr,pos,rating,team)=>{if(!p)return;const k=norm(p);
    if(!m.has(k))m.set(k,{name:p,ovr:ovr||null,pos:pos||null,rating:rating||null,team:team||null});
    else if(team&&!m.get(k).team)m.get(k).team=team;};
  D.boot.forEach(b=>add(b.player,null,b.pos,b.rating,b.team));
  D.tots.forEach(t=>add(t.player,null,t.pos,t.rating,t.team));
  (D.bench||[]).forEach(t=>add(t.player,null,t.pos,t.rating,t.team));
  (D.playmakers||[]).forEach(p=>add(p.player,null,p.pos,p.rating,p.team));
  (D.youngStars||[]).forEach(p=>add(p.player,p.ovr,p.pos,p.rating,p.team));
  (D.signings||[]).forEach(p=>add(p.player,null,p.pos,p.rating,p.to));
  Object.values(D.leagueDetails).forEach(d=>Object.values(d.cats).forEach(c=>c.forEach(p=>add(p.player,p.ovr,p.pos,p.rating,p.team))));
  ["heroes","flops","veterans","teens","defenders"].forEach(k=>(D.story[k]||[]).forEach(p=>add(p.player,p.ovr,p.pos,p.rating,p.team)));
  Object.values(D.euroStats).forEach(e=>Object.values(e.cats).forEach(c=>c.forEach(p=>add(p.player,p.ovr,p.pos,p.rating,p.team))));
  (D.club.squad||[]).forEach(s=>add(s.player,s.ovr,s.pos,s.rating,D.meta.club));
  D.myDeals.forEach(d=>add(d.player,d.ovr,d.pos,null,d.to||d.from));
  D.topDeals.forEach(d=>add(d.player,d.ovr,d.pos,null,d.to||d.from));
  (D.season.scorers||[]).forEach(s=>add(s.player,null,null,null,s.team));
  return [...m.values()];}
/* ================= BOOT: parse -> render instantly -> photos load dynamically =================
   Fast path (default): render the whole site right away with cached photos /
   initials, show an ENTER gate, and fetch player photos lazily as you scroll
   (IntersectionObserver in hydrateSlots) + a quiet background trickle.
   Untick "Fast load" to restore the old blocking pre-fetch of all 400+ photos. */
let __bootToken=0;
function fastLoadEnabled(){
  const cb=document.querySelector("#fastPhotos");
  if(cb)return cb.checked;
  try{return localStorage.getItem("fc26_fast_photos")!=="0";}catch(e){return true;}
}
/* No-faces mode: never fetch player photos, always render default initial avatars. */
function noPhotosEnabled(){
  const cb=document.querySelector("#noPhotos");
  if(cb)return cb.checked;
  const top=document.querySelector("#noPhotosTop");
  if(top)return top.checked;
  try{return localStorage.getItem("fc26_no_photos")==="1";}catch(e){return false;}
}
function setNoPhotos(v){
  try{localStorage.setItem("fc26_no_photos",v?"1":"0");}catch(e){}
  const a=document.querySelector("#noPhotos"),b=document.querySelector("#noPhotosTop");
  if(a)a.checked=!!v;
  if(b)b.checked=!!v;
}
function setEnterReady(label){
  const btn=$("#enterBtn");
  if(!btn)return;
  btn.disabled=false;
  btn.classList.add("ready");
  if(label)btn.textContent=label;
}
function enterSite(){
  $("#bootLoader").classList.add("done");
}
async function bootFromText(name,text){
  const token=++__bootToken;
  const enterBtn=$("#enterBtn");
  if(enterBtn){enterBtn.disabled=true;enterBtn.classList.remove("ready");enterBtn.textContent="Enter →";}
  $("#bootLoader").classList.remove("done");
  try{
    bootProg(0.04,"Parsing your export…","");
    await new Promise(r=>setTimeout(r,30));
    if(token!==__bootToken)return;
    const D=parseReport(text);
    const players=collectPlayers(D);
    const cached0=players.filter(p=>PC[p.name]).length;
    const needPhotos=players.filter(p=>PC[p.name]===undefined&&!isKnownMiss(p.name));
    const skipped=players.length-cached0-needPhotos.length;
    bootProg(0.12,`Resolving ${Object.keys(LOGOS).length.toLocaleString()} club & competition crests…`,"");
    await new Promise(r=>setTimeout(r,30));
    if(token!==__bootToken)return;
    stripIndex();
    const noFaces=noPhotosEnabled();
    setNoPhotos(noFaces);
    const fast=fastLoadEnabled();
    try{localStorage.setItem("fc26_fast_photos",fast?"1":"0");}catch(e){}
    const fastBox=document.querySelector("#fastPhotos");
    if(fastBox)fastBox.checked=fast;

    if(noFaces){
      // ---- NO FACES: render NOW with default avatars, fetch nothing ----
      bootProg(0.2,"Rendering with default avatars (photo fetching disabled)…","");
      await new Promise(r=>setTimeout(r,30));
      if(token!==__bootToken)return;
      renderAll(D);
      bootProg(1,`Ready — ${players.length} players, default avatars.`,"Press ENTER ↓");
      setEnterReady(`Enter → (${players.length} players, no photos)`);
      toast(`Loaded ${name} — ${D.leagueOrder.length} leagues, ${D.cups.length} cups. Player photos off.`);
      return;
    }

    if(fast){
      // ---- FAST: render NOW, photos stream in dynamically ----
      bootProg(0.2,"Rendering instantly — photos load as you scroll…",`${cached0}/${players.length} photos cached`);
      await new Promise(r=>setTimeout(r,30));
      if(token!==__bootToken)return;
      renderAll(D);
      const withPhoto0=players.filter(p=>PC[p.name]).length;
      bootProg(1,`Ready — ${needPhotos.length} photos will load as you scroll.`,"Press ENTER ↓");
      setEnterReady(`Enter → (${players.length} players, ${withPhoto0} photos ready)`);
      toast(`Loaded ${name} — ${D.leagueOrder.length} leagues, ${D.cups.length} cups. Photos load as you scroll.`);
      // quiet background trickle (low priority, cancellable, hydrates visible slots)
      const CONC=2;let ix=0,done=0;const total=needPhotos.length;
      async function worker(){
        while(ix<needPhotos.length){
          if(token!==__bootToken)return;
          const p=needPhotos[ix++];
          // yield so scrolling / lazy observer stays smooth
          await new Promise(r=>setTimeout(r,120));
          if(token!==__bootToken)return;
          await fetchPlayerThumb(p.name,p.team);
          done++;
          if(token!==__bootToken)return;
          if(done%8===0||done===total){
            try{hydrateSlots(document);}catch(e){}
            if(document.querySelector("#bootStats")&&!$("#bootLoader").classList.contains("done"))
              bootProg(1,`Ready — background photos ${done}/${total}.`,"Press ENTER ↓");
          }
        }
      }
      // don't await: site is already interactive behind the gate
      Promise.all(Array.from({length:Math.min(CONC,Math.max(total,1))},worker)).catch(()=>{});
      return;
    }

    // ---- CLASSIC (blocking) path, but ENTER can still skip the wait ----
    let done=0;const total=needPhotos.length;
    let skippedWait=false;
    const skip=()=>{skippedWait=true;};
    if(enterBtn){enterBtn.disabled=false;enterBtn.onclick=()=>{skip();enterSite();};}
    bootProg(0.15,total?`Fetching ${total} player photos (${cached0} cached${skipped?`, ${skipped} known missing`:""})…`:"Player photos cached.",total?`0 / ${total} — press ENTER to skip`:"");
    const CONC=4;let ix=0;
    async function worker(){while(ix<needPhotos.length){if(skippedWait||token!==__bootToken)return;const p=needPhotos[ix++];await fetchPlayerThumb(p.name,p.team);done++;
      if(token!==__bootToken)return;
      bootProg(0.15+0.8*(done/Math.max(total,1)),`Fetching player photos…`,`${done} / ${total} — press ENTER to skip`);}}
    await Promise.all(Array.from({length:Math.min(CONC,Math.max(total,1))},worker));
    if(token!==__bootToken)return;
    bootProg(0.97,"Rendering your season review…","");
    await new Promise(r=>setTimeout(r,30));
    if(token!==__bootToken)return;
    renderAll(D);
    const withPhoto=players.filter(p=>PC[p.name]).length;
    bootProg(1,"Done.","");
    enterSite();
    toast(`Loaded ${name} — ${D.leagueOrder.length} leagues, ${D.cups.length} cups, ${withPhoto}/${players.length} player photos`);
  }catch(e){console.error(e);bootProg(1,"Could not parse that file.","");toast("Could not parse that file — is it a season export?");}
}
/* ================= SAVED SEASONS (localStorage archive of uploads) ================= */
const SHELF_KEY="fc26_saved_reports_v1",SHELF_MAX=12;
function readShelf(){try{const a=JSON.parse(localStorage.getItem(SHELF_KEY)||"[]");return Array.isArray(a)?a:[];}catch(e){return[];}}
function writeShelf(a){localStorage.setItem(SHELF_KEY,JSON.stringify(a));}
function seasonLabel(text,fallbackName){
  try{
    const D=parseReport(text);
    const end=/END-OF-SEASON/.test(text);
    const d=(D.meta.date||"").match(/(\d{4})-(\d{2})/);
    let yy="";
    if(d){const y=+d[1],m=+d[2],s=m>=7?y:y-1;yy=`${s}/${String(s+1).slice(2)}`;}
    return `${end?"🏁":"⏸️"} ${yy} ${end?"Full season":"Mid-season"} · ${D.meta.club||fallbackName}`;
  }catch(e){return fallbackName||"Season export";}
}
function saveReport(name,text){
  try{
    let shelf=readShelf().filter(x=>x.text!==text);
    shelf.unshift({id:"r"+Date.now(),label:seasonLabel(text,name),name,date:new Date().toISOString().slice(0,10),size:text.length,text});
    while(shelf.length>SHELF_MAX)shelf.pop();
    try{writeShelf(shelf);}
    catch(e){shelf=shelf.slice(0,Math.max(1,shelf.length-2));
      try{writeShelf(shelf);toast("Storage full — oldest season removed.");}
      catch(e2){toast("Could not save season (browser storage full).");return;}}
    window.__activeReportId=shelf[0].id;
    renderShelf();
  }catch(e){}
}
function purgeSeededExample(){
  // One-time cleanup of the old seed-once approach: drop persisted copies
  // of the built-in example so the pinned card doesn't show twice.
  if(!window.__EMBEDDED_REPORT__)return;
  try{
    const shelf=readShelf();
    const kept=shelf.filter(x=>x.text!==window.__EMBEDDED_REPORT__);
    if(kept.length!==shelf.length)writeShelf(kept);
  }catch(e){}
}
function prunePhotoCache(shelf){
  // Drop cached player photos (hits + misses) that no remaining season and
  // not the currently loaded report reference, so deleting a season frees
  // its cache instead of leaving stale/wrong images behind.
  const keep=new Set();
  const addD=D=>{try{collectPlayers(D).forEach(p=>keep.add(norm(p.name)));}catch(e){}};
  (shelf||[]).forEach(x=>{try{addD(parseReport(x.text));}catch(e){}});
  if(typeof DATA!=="undefined"&&DATA)addD(DATA);
  let n=0;
  for(const k in PC){if(!keep.has(norm(k))){delete PC[k];n++;}}
  for(const k in PCM){if(!keep.has(norm(k)))delete PCM[k];}
  try{PC_MISS.forEach(m=>{if(!keep.has(norm(m)))PC_MISS.delete(m);});}catch(e){}
  pcSave();pcmSave();
  return n;
}
function renderShelf(){
  const g=$("#seasonsGrid");if(!g)return;
  const shelf=readShelf();
  // Pinned example card: always first, never persisted, no delete button.
  let ex="";
  if(window.__EMBEDDED_REPORT__){
    ex=`<div class="season-card${window.__activeReportId==="__example__"?" active":""}"><div class="season-info"><b>${esc(seasonLabel(window.__EMBEDDED_REPORT__,"example results.txt"))} <span class="tag in">EXAMPLE</span></b><small>Built-in • ${Math.round(window.__EMBEDDED_REPORT__.length/1024)} KB • example results.txt</small></div><div class="season-actions"><button data-open="__example__">Open</button></div></div>`;
  }
  if(!shelf.length&&!ex){g.innerHTML="<div class='panel' style='color:var(--mut);font-size:13px'>No saved seasons yet — upload a file and it'll appear here.</div>";return;}
  g.innerHTML=ex+shelf.map(x=>`<div class="season-card${x.id===window.__activeReportId?" active":""}"><div class="season-info"><b>${esc(x.label)}</b><small>Saved ${esc(x.date)} • ${Math.round(x.size/1024)} KB • ${esc(x.name||"")}</small></div><div class="season-actions"><button data-open="${x.id}">Open</button><button data-del="${x.id}" class="danger">Delete</button></div></div>`).join("");
}
function openSaved(id){
  if(id==="__example__"){
    if(!window.__EMBEDDED_REPORT__)return;
    window.__activeReportId="__example__";
    bootFromText("example results.txt",window.__EMBEDDED_REPORT__);
    return;
  }
  const x=readShelf().find(r=>r.id===id);if(!x)return;
  window.__activeReportId=id;
  bootFromText(x.label,x.text);
}
function loadFile(f){const r=new FileReader();r.onload=()=>{saveReport(f.name,r.result);bootFromText(f.name,r.result);};r.readAsText(f);}
$("#fileInput").addEventListener("change",e=>{const f=e.target.files[0];if(f)loadFile(f);e.target.value="";});
$("#sampleBtn").onclick=()=>{if(window.__EMBEDDED_REPORT__){window.__activeReportId="__example__";bootFromText("example results.txt",window.__EMBEDDED_REPORT__);window.scrollTo({top:0,behavior:"smooth"});}};
["dragover","dragenter"].forEach(ev=>document.addEventListener(ev,e=>{e.preventDefault();$("#dropHint").classList.remove("hidden");}));
["dragleave","drop"].forEach(ev=>document.addEventListener(ev,e=>{e.preventDefault();if(ev==="drop"&&e.dataTransfer.files[0])loadFile(e.dataTransfer.files[0]);$("#dropHint").classList.add("hidden");}));
$("#teamSearch").addEventListener("input",()=>{if(DATA)renderLeague();});
$("#cupSearch").addEventListener("input",()=>{if(DATA)renderCups();});
$("#squadSearch").addEventListener("input",()=>{if(DATA)renderClub();});
/* ---- enter gate: dismiss loader, photos keep loading dynamically ---- */
(function wireEnterGate(){
  const btn=$("#enterBtn");
  if(btn)btn.onclick=()=>enterSite();
  document.addEventListener("keydown",e=>{
    if(e.key==="Enter"&&!$("#bootLoader").classList.contains("done")){
      const b=$("#enterBtn");
      if(b&&!b.disabled)enterSite();
    }
  });
  const fastBox=$("#fastPhotos");
  if(fastBox){
    try{fastBox.checked=localStorage.getItem("fc26_fast_photos")!=="0";}catch(e){fastBox.checked=true;}
    fastBox.addEventListener("change",()=>{
      try{localStorage.setItem("fc26_fast_photos",fastBox.checked?"1":"0");}catch(e){}
      toast(fastBox.checked?"Fast load ON — photos fetch as you scroll.":"Full pre-fetch ON — will apply on next load.");
    });
  }
  /* No-faces toggle: boot checkbox + topbar checkbox stay in sync, persist, and
     re-render the current season so avatars swap instantly. */
  const noBox=$("#noPhotos"),noTop=$("#noPhotosTop");
  try{
    const saved=localStorage.getItem("fc26_no_photos")==="1";
    if(noBox)noBox.checked=saved;
    if(noTop)noTop.checked=saved;
  }catch(e){}
  const onNoPhotosChange=(src)=>{
    const v=!!(src&&src.checked);
    setNoPhotos(v);
    if(!DATA){toast(v?"Player photos OFF — default avatars only.":"Player photos ON — will fetch as you scroll.");return;}
    if(v){
      // Photos OFF mid-session: swap existing imgs to fallback avatars in place,
      // no full re-render so scroll/league/tab state is preserved. Future
      // renders + hydrateSlots/fetchPlayerThumb already no-op via noPhotosEnabled().
      try{
        document.querySelectorAll("img.avatar").forEach(img=>{
          const nm=img.getAttribute("title")||img.getAttribute("alt")||"?";
          const sz=(img.className||"").replace("avatar","").trim();
          const t=document.createElement("span");t.innerHTML=circleHTML(nm,sz);
          if(t.firstChild)img.replaceWith(t.firstChild);
        });
      }catch(e){}
      toast("Player photos OFF — default avatars only.");
    }else{
      // Photos back ON: re-render so slots are created, then lazy-fetch.
      try{renderAll(DATA);}catch(e){}
      try{hydrateSlots(document);}catch(e){}
      toast("Player photos ON — will fetch as you scroll.");
    }
  };
  if(noBox)noBox.addEventListener("change",()=>onNoPhotosChange(noBox));
  if(noTop)noTop.addEventListener("change",()=>onNoPhotosChange(noTop));
})();
/* fullscreen bracket controls */
$("#bfsZoomIn").onclick=()=>bfsApply(bfsZ*1.25);
$("#bfsZoomOut").onclick=()=>bfsApply(bfsZ/1.25);
$("#bfsFit").onclick=()=>bfsFit();
$("#bfsClose").onclick=()=>closeBracketFS();
$("#bracketFS").addEventListener("click",e=>{if(e.target.id==="bracketFS")closeBracketFS();});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("#bracketFS").classList.contains("hidden"))closeBracketFS();});
document.addEventListener("click",e=>{
  const fs=e.target.closest?e.target.closest("[data-fs]"):null;
  if(fs&&DATA){openBracketFS(+fs.dataset.fs);return;}
  const open=e.target.closest?e.target.closest("[data-open]"):null;
  if(open){openSaved(open.dataset.open);window.scrollTo({top:0,behavior:"smooth"});return;}
  const del=e.target.closest?e.target.closest("[data-del]"):null;
  if(del){const shelf=readShelf().filter(x=>x.id!==del.dataset.del);
    try{writeShelf(shelf);}catch(e2){}
    let freed=0;try{freed=prunePhotoCache(shelf);}catch(e3){}
    if(window.__activeReportId===del.dataset.del)window.__activeReportId=null;
    renderShelf();toast(freed?`Season deleted — ${freed} unused cached photo(s) cleared.`:"Season deleted.");return;}
});
/* road-to-glory: click a team in the bracket to light up every tie it played */
document.addEventListener("click",e=>{
  const row=e.target.closest?e.target.closest(".bkt-match .bk-team,.bkt-ghost"):null;
  if(!row)return;
  const wrap=row.closest(".bkt-wrap");if(!wrap)return;
  const t=row.dataset.t;
  if(wrap.dataset.focus===t){delete wrap.dataset.focus;
    wrap.querySelectorAll(".bkt-match.focus,.bkt-ghost.focus").forEach(m=>m.classList.remove("focus"));
    wrap.classList.remove("focusing");return;}
  wrap.dataset.focus=t;wrap.classList.add("focusing");
  wrap.querySelectorAll(".bkt-match,.bkt-ghost").forEach(m=>{
    m.classList.toggle("focus",(m.dataset.teams||"").split("|").includes(t));});
  wrap.dataset.focus=t;wrap.classList.add("focusing");
  wrap.querySelectorAll(".bkt-match").forEach(m=>{
    m.classList.toggle("focus",(m.dataset.teams||"").split("|").includes(t));});
});
let __bktRsT=null;
window.addEventListener("resize",()=>{clearTimeout(__bktRsT);__bktRsT=setTimeout(()=>{try{drawBracketLines();}catch(e){}},250);});
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add("visible");}),{threshold:.06});
document.querySelectorAll(".reveal").forEach(el=>io.observe(el));
/* scroll spy for the hover side nav */
if("IntersectionObserver" in window){
  const spy=new IntersectionObserver(es=>es.forEach(e=>{
    if(!e.isIntersecting)return;
    document.querySelectorAll("#sideNav a").forEach(a=>a.classList.toggle("active",a.dataset.spy===e.target.id));
  }),{rootMargin:"-40% 0px -55% 0px"});
  ["sec-seasons","sec-stories","sec-leagues","sec-myclub","sec-europe","sec-transfers","sec-stars","sec-cups","sec-world"].forEach(id=>{const el=document.getElementById(id);if(el)spy.observe(el);});
}
/* auto-hydrate avatar slots added by later tab/search re-renders */
if("MutationObserver" in window){let __moT=null;
  new MutationObserver(()=>{clearTimeout(__moT);__moT=setTimeout(()=>{try{hydrateSlots(document);}catch(e){}},400);}).observe(document.body,{childList:true,subtree:true});}
(function init(){
  try{purgeSeededExample();}catch(e){}
  if(window.__EMBEDDED_REPORT__)window.__activeReportId="__example__";
  try{renderShelf();}catch(e){}
  if(window.__EMBEDDED_REPORT__)bootFromText("example results.txt",window.__EMBEDDED_REPORT__);
  else{fetch("results.txt").then(r=>{if(!r.ok)throw 0;return r.text();}).then(t=>bootFromText("results.txt",t)).catch(()=>{bootProg(1,"Upload your export file to begin.","");toast("Upload your export file to begin — drag & drop anywhere");});}
})();
})();