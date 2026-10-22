/* eslint-disable */
// Ahara Matrix app logic, ported from the new ahara-matrix.html. Runs inside
// `root` via useLegacyPage; progress goes to ctx.loadState/saveState('aharaMatrix').
import { AD } from './data.js';

export function init(root, ctx) {
var alive=true,timers=new Set();
var later=function(fn,ms){var id=window.setTimeout(function(){timers.delete(id);if(alive)fn();},ms);timers.add(id);return id;};
var $=function(id){return root.querySelector('#'+id);};
/* StrictMode re-mounts on the same DOM: start from empty dynamic containers */
$('tabs').innerHTML='';$('festStrip').innerHTML='';$('rituSel').innerHTML='';$('thaliBox').querySelectorAll('.katori').forEach(function(k){k.remove();});
var ING={};AD.ING.forEach(function(i){ING[i.id]=i;});
var MAX=6,KEY='aharaMatrix';
var S={sel:[],ritu:AD.rituOf(new Date()),time:null,found:[],plate:'brass',plates:['brass'],regions:[],fest:[],stamps:[]};
var hr=new Date().getHours();S.time=hr<11?'morning':hr<16?'midday':hr<20?'evening':'night';
/* progress lives in the per-user state API (was localStorage 'miravaAhara' + D1 sync) */
var loaded=false,saveT=0,dirty=false,sub=[];
function applySaved(d){if(!d||typeof d!=='object')return;if(Array.isArray(d.found))S.found=d.found.filter(function(x){return typeof x==='string';});if(Array.isArray(d.sel))S.sel=d.sel.filter(function(x){return ING[x];}).slice(0,MAX);['plates','regions','fest','stamps','sub'].forEach(function(k){if(Array.isArray(d[k]))(k==='sub'?(sub=d[k].filter(function(x){return typeof x==='string';})):(S[k]=d[k]));});if(typeof d.plate==='string'&&AD.PLATES.some(function(p){return p.id===d.plate;}))S.plate=d.plate;}
function snapshot(){return {found:S.found,sel:S.sel,plate:S.plate,plates:S.plates,regions:S.regions,fest:S.fest,stamps:S.stamps,sub:sub};}
function flush(){if(saveT){window.clearTimeout(saveT);timers.delete(saveT);saveT=0;}if(dirty){dirty=false;ctx.saveState(KEY,snapshot());}}
function save(){if(!loaded)return;dirty=true;if(saveT){window.clearTimeout(saveT);timers.delete(saveT);}saveT=later(function(){saveT=0;flush();},800);milestones();}
/* score: submitted only at milestones (each stamp, every 10 discoveries, the full journal), each once per account */
function foundN(){return ALL.filter(function(a){return S.found.indexOf(a.id)>=0;}).length;}
function score(){return foundN()*1000+S.stamps.length*2000+S.regions.length*500+S.fest.length*500+S.plates.length*200;}
var subT=0,pending=[];
function milestones(){var f=foundN(),hit=[];
 S.stamps.forEach(function(id){hit.push('stamp-'+id);});
 for(var n=10;n<=f;n+=10)hit.push('found-'+n);
 if(f===ALL.length)hit.push('all');
 var fresh=hit.filter(function(m){return sub.indexOf(m)<0;});if(!fresh.length)return;
 fresh.forEach(function(m){sub.push(m);pending.push(m);});dirty=true;
 if(subT){window.clearTimeout(subT);timers.delete(subT);}
 subT=later(submitNow,1200);}
function submitNow(){subT=0;ctx.submitScore('ahara-matrix',{score:score(),completed:foundN()===ALL.length,meta:{found:foundN(),total:ALL.length,stamps:S.stamps.slice(),regions:S.regions.length,festivals:S.fest.length,plates:S.plates.length,milestones:pending.splice(0)}});}
var toastT=0;function toast(m,ms){var t=$('toast');t.innerHTML=m;t.classList.add('show');window.clearTimeout(toastT);timers.delete(toastT);toastT=later(function(){t.classList.remove('show');},ms||2600);}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}

/* ---------- catalogue of everything discoverable ---------- */
var ALL=[];
AD.PAIRS.forEach(function(p){ALL.push({id:p.id,t:p.t,title:p.title,s:p.s});});
Object.keys(AD.NOTES).forEach(function(k){var n=AD.NOTES[k];ALL.push({id:'note-'+k,t:n.t,title:n.title,s:n.s});});
ALL.push({id:'curd-night',t:'caution',title:'No curd at night',s:'classical'});
ALL.push({id:'curd-season',t:'caution',title:'Curd out of season',s:'classical'});
ALL.push({id:'six-rasa',t:'harmony',title:'All six tastes',s:'tradition'});
AD.DISHES.forEach(function(d){ALL.push({id:'dish-'+d.n,t:'dish',title:d.n,s:'tradition'});});
$('hsP').textContent=ALL.length;$('hsI').textContent=AD.ING.length;

/* ---------- analysis ---------- */
function analyse(sel,rituId,time){
 var R=AD.RITU.filter(function(r){return r.id===rituId;})[0],has={};sel.forEach(function(x){has[x]=1;});
 var rasas={};sel.forEach(function(x){ING[x].r.forEach(function(r){rasas[r]=(rasas[r]||0)+1;});});
 var vir=0;sel.forEach(function(x){vir+=ING[x].v==='warming'?1:ING[x].v==='cooling'?-1:0;});vir=sel.length?vir/sel.length:0;
 var F=[];
 AD.PAIRS.forEach(function(p){if(!has[p.a])return;var m=p.b.filter(function(b){return has[b];});if(m.length)F.push({id:p.id,t:p.t,s:p.s,title:p.title,x:p.x,ref:p.ref,with:[p.a].concat(m)});});
 if(has.curd&&time==='night')F.push({id:'curd-night',t:'caution',s:'classical',title:'No curd at night',x:'The Charaka Samhita advises that curd should not be eaten at night.',ref:'Charaka Samhita, Sutrasthana 7 (Navegandharaniya)'});
 if(has.curd&&(rituId==='sharad'||rituId==='grishma'||rituId==='vasanta'))F.push({id:'curd-season',t:'caution',s:'classical',title:'Curd out of season',x:'Curd is described as mostly discouraged in autumn (Sharad), summer (Grishma) and spring (Vasanta).',ref:'Charaka Samhita, Sutrasthana 7'});
 var six=AD.RASA_ORDER.every(function(r){return rasas[r];});
 if(six)F.push({id:'six-rasa',t:'harmony',s:'tradition',title:'All six tastes on one plate',x:'Ayurvedic tradition holds that a balanced meal includes all six rasas — sweet, sour, salty, pungent, bitter and astringent — in suitable proportion.',ref:'Ayurvedic tradition'});
 sel.forEach(function(x){if(AD.NOTES[x]){var n=AD.NOTES[x];F.push({id:'note-'+x,t:n.t,s:n.s,title:n.title,x:n.x,ref:n.ref});}});
 var order={avoid:0,caution:1,harmony:2,note:3};F.sort(function(a,b){return order[a.t]-order[b.t];});
 // season fit
 var fit=null,why=[];
 if(sel.length){var tot=0;sel.forEach(function(x){var i=ING[x],s=0;
   if(i.v===R.v)s+=1;else if(i.v!=='balanced')s-=1;
   if(i.r.some(function(r){return R.fav.indexOf(r)>=0;}))s+=.5;
   if(i.r.every(function(r){return R.avoid.indexOf(r)>=0;}))s-=.75;
   if(R.foods.indexOf(x)>=0){s+=1;why.push(i.n);}
   if(x==='curd'&&(rituId==='sharad'||rituId==='grishma'||rituId==='vasanta'))s-=1;
   tot+=s;});
  fit=Math.max(0,Math.min(100,Math.round(50+tot/sel.length/2.5*50)));}
 var dish=null;AD.DISHES.forEach(function(dd){if(dd.need.every(function(x){return has[x];})&&(!dd.any||dd.any.some(function(x){return has[x];}))&&(!dish||dd.need.length+(dd.any?1:0)>dish.need.length+(dish.any?1:0)))dish=dd;});
 return {rasas:rasas,vir:vir,F:F,fit:fit,why:why,R:R,dish:dish,six:six};
}

/* ---------- pantry ---------- */
var cat='all',q='';
var tabs=$('tabs');[['all','All']].concat(Object.keys(AD.CATS).map(function(k){return [k,AD.CATS[k]];})).forEach(function(c){var b=document.createElement('button');b.textContent=c[1];b.dataset.c=c[0];if(c[0]==='all')b.className='on';b.onclick=function(){cat=c[0];tabs.querySelectorAll('button').forEach(function(x){x.classList.toggle('on',x===b);});renderPantry();};tabs.appendChild(b);});
$('q').addEventListener('input',function(){q=this.value.trim().toLowerCase();renderPantry();});
function renderPantry(){var L=$('ings');L.innerHTML='';
 AD.ING.filter(function(i){return (cat==='all'||i.cat===cat)&&(!q||(i.n+' '+i.sk+' '+i.id).toLowerCase().indexOf(q)>=0);}).forEach(function(i){
  var b=document.createElement('button');b.className='ing'+(S.sel.indexOf(i.id)>=0?' on':'');b.setAttribute('aria-pressed',S.sel.indexOf(i.id)>=0);
  b.innerHTML='<span class="e">'+i.ic+'</span><span><b>'+i.n+'</b><small>'+i.sk+' · '+i.v+'</small><span class="dots">'+i.r.map(function(r){return '<i title="'+AD.RASA[r].n+'" style="background:'+AD.RASA[r].c+'"></i>';}).join('')+'</span></span>';
  b.onclick=function(){toggle(i.id);};L.appendChild(b);});
 if(!L.children.length)L.innerHTML='<p style="grid-column:1/-1;font-size:12.5px;color:var(--muted);padding:8px">No ingredient matches “'+esc(q)+'”.</p>';
}
function toggle(id){var k=S.sel.indexOf(id);if(k>=0)S.sel.splice(k,1);else{if(S.sel.length>=MAX){toast('Your thali holds six bowls — remove one to add '+ING[id].n+'.');return;}S.sel.push(id);}update(true);}

/* ---------- controls ---------- */
var rs=$('rituSel');AD.RITU.forEach(function(r){var o=document.createElement('option');o.value=r.id;o.textContent=r.ic+' '+r.n+' · '+r.en+(r.id===AD.rituOf(new Date())?' (now)':'');rs.appendChild(o);});rs.value=S.ritu;
rs.onchange=function(){S.ritu=this.value;update(true);renderRitu(S.ritu);};
$('timeSeg').querySelectorAll('button').forEach(function(b){b.classList.toggle('on',b.dataset.t===S.time);b.onclick=function(){S.time=b.dataset.t;$('timeSeg').querySelectorAll('button').forEach(function(x){x.classList.toggle('on',x===b);});update(true);};});
$('clear').onclick=function(){S.sel=[];update(true);};
$('surprise').onclick=function(){var cands=AD.DISHES.filter(function(d){return !(d.need.length===S.sel.length&&d.need.every(function(x){return S.sel.indexOf(x)>=0;}));});var d=cands[Math.floor(Math.random()*cands.length)];S.sel=d.need.concat(d.any?[d.any[0]]:[]).slice(0,MAX);update(true);toast('🍽️ '+d.n+' — '+d.x,3400);};

/* ---------- render thali + analysis ---------- */
function polar(cx,cy,r,a){return [cx+r*Math.cos(a),cy+r*Math.sin(a)];}
function wheel(rasas){var s='<svg viewBox="-60 -60 120 120">';AD.RASA_ORDER.forEach(function(r,k){var a0=-Math.PI/2+k*Math.PI/3-Math.PI/6,a1=a0+Math.PI/3,p0=polar(0,0,52,a0),p1=polar(0,0,52,a1),on=!!rasas[r];
  s+='<path d="M0 0 L'+p0[0].toFixed(1)+' '+p0[1].toFixed(1)+' A52 52 0 0 1 '+p1[0].toFixed(1)+' '+p1[1].toFixed(1)+' Z" fill="'+AD.RASA[r].c+'" opacity="'+(on?.92:.14)+'" stroke="#fffaf3" stroke-width="2"/>';
  var lp=polar(0,0,36,(a0+a1)/2);s+='<text x="'+lp[0].toFixed(1)+'" y="'+(lp[1]+3).toFixed(1)+'" text-anchor="middle" font-size="7.5" font-weight="800" font-family="Manrope" fill="'+(on?'#fff':'rgba(36,21,26,.45)')+'">'+AD.RASA[r].n.slice(0,5)+'</text>';});
 var n=AD.RASA_ORDER.filter(function(r){return rasas[r];}).length;s+='<circle r="17" fill="#fffaf3"/><text y="2" text-anchor="middle" font-family="Playfair Display" font-weight="700" font-size="15" fill="#24151a">'+n+'/6</text><text y="11" text-anchor="middle" font-size="5" font-family="DM Mono" fill="rgba(36,21,26,.6)">TASTES</text></svg>';return s;}
function update(user){
 var A=analyse(S.sel,S.ritu,S.time);
 // thali bowls
 var box=$('thaliBox');box.querySelectorAll('.katori').forEach(function(k){if(S.sel.indexOf(k.dataset.id)<0)k.remove();});
 S.sel.forEach(function(id,ix){var k=box.querySelector('.katori[data-id="'+id+'"]');var a=-Math.PI/2+ix*2*Math.PI/Math.max(S.sel.length,1),r=S.sel.length===1?0:34;
  if(!k){k=document.createElement('button');k.className='katori '+bowlCls();k.dataset.id=id;k.setAttribute('aria-label','Remove '+ING[id].n);k.innerHTML='<span class="e">'+ING[id].ic+'</span><span class="nm">'+ING[id].n+'</span><span class="x">✕</span>';k.onclick=function(){toggle(id);};box.appendChild(k);}
  if(S.sel.length===1){k.style.left='50%';k.style.top='26%';}else{k.style.left=(50+r*Math.cos(a))+'%';k.style.top=(50+r*Math.sin(a))+'%';}});
 box.querySelectorAll('.katori').forEach(function(k){k.className='katori '+bowlCls();});$('steam').hidden=!A.dish;
 if(A.dish){var fz=AD.FESTIVALS.filter(function(f){return f.dish===A.dish.n;})[0];if(fz&&S.fest.indexOf(fz.n)<0){S.fest.push(fz.n);if(user)later(function(){toast(fz.ic+' Festival dish cooked: <b>'+fz.dish+'</b> for '+fz.n+'!',3200);},900);}}
 var c=$('centre');
 if(!S.sel.length)c.innerHTML='<div class="empty">Your thali is empty.<br>Choose ingredients from the pantry.</div>';
 else if(A.dish)c.innerHTML='<div class="k" style="color:#7a4e12">You made</div><div class="dn">'+A.dish.n+'</div><div class="ds">'+A.dish.x+'</div>';
 else c.innerHTML='<div class="dn">'+S.sel.length+' bowl'+(S.sel.length>1?'s':'')+'</div><div class="ds">'+(A.F.filter(function(f){return f.t!=='note';}).length?'See what the traditions say →':'No documented pairing yet — try another combination.')+'</div>';
 // rasa
 $('wheel').innerHTML=wheel(A.rasas);
 $('rasaList').innerHTML=AD.RASA_ORDER.map(function(r){return '<span class="'+(A.rasas[r]?'on':'')+'"><i style="background:'+AD.RASA[r].c+'"></i>'+AD.RASA[r].n+' <small style="font-family:DM Mono;opacity:.7">· '+AD.RASA[r].sk+'</small></span>';}).join('');
 // virya
 $('mk').style.left=(50+A.vir*46)+'%';
 $('vVal').textContent=!S.sel.length?'Add ingredients to see their potency (virya).':A.vir>.34?'Warming plate (ushna) — suits the cold months.':A.vir<-.34?'Cooling plate (sheeta) — suits the hot months.':'Balanced between warming and cooling.';
 // fit
 var R=A.R,fe=$('fit');
 if(A.fit==null)fe.innerHTML='<div class="top2"><b>'+R.ic+' '+R.n+' · '+R.en+'</b></div><p style="margin-top:6px">'+R.x+'</p>';
 else{var lbl=A.fit>=75?'Excellent for '+R.n:A.fit>=55?'Good for '+R.n:A.fit>=40?'Mixed for '+R.n:'Out of season',col=A.fit>=75?'#3f8a4a':A.fit>=55?'#7aa84a':A.fit>=40?'#f0b240':'#d0533f';
  fe.innerHTML='<div class="top2"><b>'+R.ic+' '+lbl+'</b><span class="pct" style="color:'+col+'">'+A.fit+'%</span></div><div class="bar2"><i style="width:'+A.fit+'%;background:'+col+'"></i></div><p>'+R.n+' favours <b>'+R.fav.map(function(r){return AD.RASA[r].n.toLowerCase();}).join(', ')+'</b> tastes and <b>'+R.v+'</b> foods.'+(A.why.length?' In season on your plate: '+A.why.join(', ')+'.':'')+'</p>';}
 // findings
 var fe2=$('finds');var newOnes=[];
 A.F.forEach(function(f){if(S.found.indexOf(f.id)<0){S.found.push(f.id);newOnes.push(f);}});
 if(A.dish&&S.found.indexOf('dish-'+A.dish.n)<0){S.found.push('dish-'+A.dish.n);newOnes.push({title:A.dish.n,dish:1});}
 var TY={harmony:'Harmonious',caution:'Use with care',avoid:'Traditionally avoided',note:'Did you know'};
 if(!A.F.length)fe2.innerHTML='<p class="no-finds">'+(S.sel.length<2?'Add two or more ingredients — documented principles appear here as you combine them.':'No documented principle connects these ingredients yet. Try pairing with milk, ghee, rice, turmeric or curd — or tap a coloured square in the matrix below.')+'</p>';
 else fe2.innerHTML=A.F.map(function(f){var src=AD.SRC[f.s],isNew=newOnes.some(function(n){return n.id===f.id;});
  return '<div class="find '+f.t+'"><div class="hd"><span class="ty">'+TY[f.t]+'</span><span class="src" style="color:'+src.c+'">'+src.n+'</span>'+(isNew&&user?'<span class="new">✦ NEW</span>':'')+'</div><b>'+(f.with?f.with.map(function(x){return ING[x].ic;}).join(' + ')+' ':'')+esc(f.title)+'</b><p>'+esc(f.x)+'</p><div class="ref">'+esc(f.ref)+'</div></div>';}).join('');
 if(user&&newOnes.length)toast('✦ '+(newOnes.length===1?'New discovery: <b>'+esc(newOnes[0].title)+'</b>':newOnes.length+' new discoveries!')+' · '+S.found.filter(function(id){return ALL.some(function(a){return a.id===id;});}).length+'/'+ALL.length);
 renderPantry();renderMatrix();renderJournal();renderFest();checkStamps(user,A);save();
}

/* ---------- matrix ---------- */
var PM={};AD.PAIRS.forEach(function(p){p.b.forEach(function(b){PM[p.a+'|'+b]=p;PM[b+'|'+p.a]=p;});});
function renderMatrix(){var reveal=$('reveal').checked,ings=AD.ING,h='<thead><tr><th></th>';
 ings.forEach(function(i){h+='<th><div>'+i.ic+' '+i.n+'</div></th>';});h+='</tr></thead><tbody>';
 ings.forEach(function(a){h+='<tr><th>'+a.n+' '+a.ic+'</th>';ings.forEach(function(b){if(a.id===b.id){h+='<td class="self"></td>';return;}var p=PM[a.id+'|'+b.id],cls='',txt='';
   if(p){if(reveal||S.found.indexOf(p.id)>=0)cls=p.t;else{cls='hidden-rule';txt='?';}}
   var sel=S.sel.indexOf(a.id)>=0&&S.sel.indexOf(b.id)>=0?' sel':'';
   h+='<td class="'+cls+sel+'" data-a="'+a.id+'" data-b="'+b.id+'">'+txt+'</td>';});h+='</tr>';});
 $('mx').innerHTML=h+'</tbody>';}
$('mx').addEventListener('mouseover',function(e){var td=e.target.closest('td[data-a]');if(!td)return;var p=PM[td.dataset.a+'|'+td.dataset.b],a=ING[td.dataset.a],b=ING[td.dataset.b];
 $('mxInfo').innerHTML=a.ic+' <b>'+a.n+'</b> + '+b.ic+' <b>'+b.n+'</b> — '+(p?(($('reveal').checked||S.found.indexOf(p.id)>=0)?esc(p.title):'a documented principle waits here. Tap to discover it.'):'no documented principle in this collection.');});
$('mx').addEventListener('click',function(e){var td=e.target.closest('td[data-a]');if(!td)return;S.sel=[td.dataset.a,td.dataset.b];update(true);$('lab').scrollIntoView({behavior:'smooth'});});
$('reveal').onchange=renderMatrix;

/* ---------- ritu wheel ---------- */
function renderRituWheel(){var s='<svg viewBox="-120 -120 240 240">',now=AD.rituOf(new Date());
 AD.RITU.forEach(function(r,k){var a0=-Math.PI/2+k*Math.PI/3,a1=a0+Math.PI/3,o=r.id===S.rituView,p0=polar(0,0,112,a0),p1=polar(0,0,112,a1),q0=polar(0,0,46,a1),q1=polar(0,0,46,a0);
  s+='<path class="seg-p" data-r="'+r.id+'" d="M'+p0[0].toFixed(1)+' '+p0[1].toFixed(1)+' A112 112 0 0 1 '+p1[0].toFixed(1)+' '+p1[1].toFixed(1)+' L'+q0[0].toFixed(1)+' '+q0[1].toFixed(1)+' A46 46 0 0 0 '+q1[0].toFixed(1)+' '+q1[1].toFixed(1)+' Z" fill="'+r.col+'" opacity="'+(o?1:.55)+'" stroke="#fffaf3" stroke-width="3"/>';
  var m=polar(0,0,80,(a0+a1)/2);s+='<text x="'+m[0].toFixed(1)+'" y="'+(m[1]-4).toFixed(1)+'" text-anchor="middle" font-size="18" style="pointer-events:none">'+r.ic+'</text><text x="'+m[0].toFixed(1)+'" y="'+(m[1]+13).toFixed(1)+'" text-anchor="middle" font-size="10" font-weight="800" font-family="Manrope" fill="#fff" style="pointer-events:none">'+r.n+'</text>';
  if(r.id===now){var t=polar(0,0,118,(a0+a1)/2);s+='<circle cx="'+t[0].toFixed(1)+'" cy="'+t[1].toFixed(1)+'" r="6" fill="#e5562f" stroke="#fffaf3" stroke-width="2"/>';}});
 s+='<circle r="42" fill="#fffaf3"/><text y="-4" text-anchor="middle" font-family="Playfair Display" font-weight="700" font-size="15" fill="#24151a">Ritu</text><text y="12" text-anchor="middle" font-family="DM Mono" font-size="6.5" fill="#e5562f">● = TODAY</text></svg>';
 $('rituWheel').innerHTML=s;$('rituWheel').querySelectorAll('[data-r]').forEach(function(p){p.addEventListener('click',function(){renderRitu(p.dataset.r);});});}
function renderRitu(id){S.rituView=id;var r=AD.RITU.filter(function(x){return x.id===id;})[0],now=AD.rituOf(new Date())===id;
 $('rituCard').innerHTML='<div class="k">'+r.m+'</div><h3>'+r.ic+' '+r.n+(now?'<span class="now-pill">Now</span>':'')+'</h3><div class="en">'+r.en+'</div><p>'+r.x+'</p>'+
  '<div class="rows"><div><div class="k" style="color:var(--ok)">Favoured tastes</div><div class="tagset">'+r.fav.map(function(x){return '<span style="background:'+AD.RASA[x].c+'">'+AD.RASA[x].n+' · '+AD.RASA[x].sk+'</span>';}).join('')+'<span style="background:'+(r.v==='cooling'?'#4f8fc0':'#d9542b')+'">'+(r.v==='cooling'?'❄ Cooling':'🔥 Warming')+'</span></div></div>'+
  '<div><div class="k" style="color:var(--bad)">Reduce</div><div class="tagset">'+(r.avoid.length?r.avoid.map(function(x){return '<span style="background:#9a8a86">'+AD.RASA[x].n+'</span>';}).join(''):'<span style="background:#9a8a86">Heavy, hard-to-digest food</span>')+'</div></div></div>'+
  '<div class="k" style="margin-top:16px">Seasonal foods in the pantry — tap to add</div><div class="foods">'+r.foods.map(function(f){return '<button data-f="'+f+'">'+ING[f].ic+' '+ING[f].n+'</button>';}).join('')+'</div>'+
  '<p style="font-size:12.5px;color:var(--muted);margin-top:12px">'+r.extra+' <span class="mono" style="font-family:DM Mono;font-size:10.5px">— Charaka Samhita, Sutrasthana 6</span></p>'+
  '<div style="margin-top:14px"><button class="btn gold sm" id="useRitu">Plan a thali for '+r.n+'</button></div>';
 $('rituCard').querySelectorAll('[data-f]').forEach(function(b){b.onclick=function(){if(S.sel.indexOf(b.dataset.f)<0)toggle(b.dataset.f);else toast(ING[b.dataset.f].n+' is already on your thali.');};});
 $('useRitu').onclick=function(){S.ritu=id;rs.value=id;update(true);$('lab').scrollIntoView({behavior:'smooth'});};
 renderRituWheel();}

/* ---------- journal ---------- */
function renderJournal(){var f=ALL.filter(function(a){return S.found.indexOf(a.id)>=0;}).length,tot=ALL.length;
 $('jrN').textContent=f;$('jrOf').textContent='OF '+tot+' FOUND';$('jrArc').style.strokeDashoffset=326.7*(1-f/tot);
 $('jrTitle').textContent=f===0?'Begin with any two ingredients.':f<10?'Apprentice of the kitchen — keep combining.':f<22?'Keeper of recipes — you know the classics.':f<tot?'Ahara acharya — a true scholar of food.':'Every principle discovered. A master of Ahara!';
 var IC={harmony:'🟢',caution:'🟠',avoid:'🔴',note:'🔵',dish:'🍽️'};
 $('jrList').innerHTML=ALL.map(function(a){var got=S.found.indexOf(a.id)>=0;return '<div class="jr-item'+(got?'':' locked')+'"><i>'+(got?IC[a.t]:'🔒')+'</i><div><b>'+(got?esc(a.title):'Undiscovered')+'</b><small>'+(a.t==='dish'?'Dish':AD.SRC[a.s].n)+'</small></div></div>';}).join('');}
$('jrReset').onclick=function(){if(window.confirm('Reset your journal? Discoveries, stamps and visited kitchens will be cleared.')){S.found=[];S.stamps=[];S.regions=[];S.fest=[];S.plates=[S.plate];update(false);renderMap();showRegion(curReg||'punjab');toast('Journal cleared.');}};

/* ---------- plates ---------- */
function bowlCls(){return {brass:'',kansa:'kansa',leaf:'dona',pattal:'dona',steel:'steel'}[S.plate]||'';}
function renderPlates(){var P=AD.PLATES.filter(function(p){return p.id===S.plate;})[0];
 $('plates').innerHTML='<span class="k" style="align-self:center;color:var(--muted)">Serve on</span>'+AD.PLATES.map(function(p){return '<button data-p="'+p.id+'" class="'+(p.id===S.plate?'on':'')+'" aria-pressed="'+(p.id===S.plate)+'"><i class="pi-'+p.id+'"></i>'+p.n+'</button>';}).join('');
 $('plate').className='thali '+(S.plate==='brass'?'':S.plate);$('plateNote').innerHTML='<b>'+P.n+' · '+P.sk+'</b> — '+P.x;
 $('plates').querySelectorAll('[data-p]').forEach(function(b){b.onclick=function(){setPlate(b.dataset.p,true);};});}
function setPlate(id,user){S.plate=id;if(S.plates.indexOf(id)<0)S.plates.push(id);renderPlates();$('thaliBox').querySelectorAll('.katori').forEach(function(k){k.className='katori '+bowlCls();});checkStamps(user);save();}

/* ---------- Thali Trail map ---------- */
var OUT=[[33,2],[40,0],[45,5],[42,10],[46,14],[52,18],[56,24],[63,27],[70,30],[73,31],[77,29],[81,27],[88,25],[95,24],[97,28],[93,32],[90,38],[86,42],[82,40],[80,44],[78,40],[77,36],[74,37],[74,42],[72,46],[69,49],[66,54],[62,60],[58,66],[56,72],[55,78],[53,84],[49,91],[47,96],[45,92],[42,85],[40,75],[38,66],[35,58],[33,52],[30,48],[25,46],[20,44],[17,40],[21,38],[17,35],[22,32],[25,28],[23,22],[27,16],[30,10]];
function smoothPath(pts){var d='M'+pts[0][0]+' '+pts[0][1],n=pts.length;for(var i=0;i<n;i++){var p0=pts[(i-1+n)%n],p1=pts[i],p2=pts[(i+1)%n],p3=pts[(i+2)%n];
 d+=' C'+(p1[0]+(p2[0]-p0[0])/6).toFixed(1)+' '+(p1[1]+(p2[1]-p0[1])/6).toFixed(1)+' '+(p2[0]-(p3[0]-p1[0])/6).toFixed(1)+' '+(p2[1]-(p3[1]-p1[1])/6).toFixed(1)+' '+p2[0]+' '+p2[1];}return d+'Z';}
var curReg=null,LO={rajasthan:[4.2,1],gujarat:[-4.2,1],tamil:[4.2,1],kerala:[-4.2,1],andhra:[0,6],odisha:[4.2,1],bengal:[-4.2,1],assam:[0,-4.6],punjab:[4.2,1]};
function renderMap(){var s='<svg viewBox="5 -6 100 108" role="img" aria-label="Stylised map of India with regional food traditions">';
 s+='<defs><linearGradient id="land" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6e7c8"/><stop offset=".5" stop-color="#f1dbb0"/><stop offset="1" stop-color="#e9cf9c"/></linearGradient><pattern id="wave" width="6" height="4" patternUnits="userSpaceOnUse"><path d="M0 2 Q1.5 0 3 2 T6 2" fill="none" stroke="rgba(79,143,192,.35)" stroke-width=".3"/></pattern></defs>';
 s+='<rect x="5" y="-6" width="100" height="108" fill="url(#wave)"/>';
 s+='<path d="'+smoothPath(OUT)+'" fill="url(#land)" stroke="#b8862a" stroke-width=".6" stroke-linejoin="round"/>';
 s+='<path d="M43 9 L46 5 L49 9 Z M48 10 L52 5 L55 11 Z M54 15 L57 11 L60 16 Z M38 9 L41 4 L44 9Z" fill="#d6c6b0" stroke="#a8946f" stroke-width=".3"/><path d="M46 5.6 L46.9 7 L45.1 7Z M52 5.6 L53 7.2 L51 7.2Z" fill="#fff"/>';
 s+='<path d="M41 18 C48 24 55 27 60 30 S70 36 73 41" fill="none" stroke="#5aa0c8" stroke-width=".7" stroke-linecap="round"/><path d="M73 33 C80 32 86 30 92 29" fill="none" stroke="#5aa0c8" stroke-width=".6" stroke-linecap="round"/><path d="M49 70 C53 74 55 76 57 78" fill="none" stroke="#5aa0c8" stroke-width=".55"/><path d="M38 45 C44 46 50 46 56 44" fill="none" stroke="#5aa0c8" stroke-width=".5"/>';
 s+='<text x="10" y="70" font-family="Playfair Display" font-style="italic" font-size="3.2" fill="rgba(31,95,140,.6)">Arabian Sea</text><text x="74" y="66" font-family="Playfair Display" font-style="italic" font-size="3.2" fill="rgba(31,95,140,.6)">Bay of Bengal</text><text x="40" y="101" font-family="Playfair Display" font-style="italic" font-size="3" fill="rgba(31,95,140,.6)">Indian Ocean</text>';
 s+='<g transform="translate(97 90)"><circle r="4" fill="#fffaf3" stroke="#792d3c" stroke-width=".4"/><path d="M0 -3.2 L1 0 L-1 0Z" fill="#e5562f"/><path d="M0 3.2 L1 0 L-1 0Z" fill="#792d3c"/><text y="-4.6" text-anchor="middle" font-size="2.6" font-weight="800" font-family="Manrope">N</text></g>';
 AD.REGIONS.forEach(function(r){var v=S.regions.indexOf(r.id)>=0,on=curReg===r.id;
  var lo=LO[r.id]||[0,6.6],anc=lo[0]>2?'start':lo[0]<-2?'end':'middle';
  s+='<g class="mk2'+(on?' on':'')+'" data-g="'+r.id+'" tabindex="0" role="button" aria-label="'+r.n+': '+r.t+'"><circle class="pulse" cx="'+r.x+'" cy="'+r.y+'" r="2.6" fill="rgba(229,86,47,.35)"/><circle class="dot" cx="'+r.x+'" cy="'+r.y+'" r="3.2" fill="'+(v?'#f7b63e':'#fffaf3')+'" stroke="#e5562f" stroke-width=".7"/><text x="'+r.x+'" y="'+(r.y+1.2)+'" text-anchor="middle" font-size="3.3">'+r.ic+'</text>'+
   '<text x="'+(r.x+lo[0])+'" y="'+(r.y+lo[1])+'" text-anchor="'+anc+'" font-family="Manrope" font-weight="800" font-size="2.3" fill="#301b22" paint-order="stroke" stroke="#fffaf3" stroke-width=".8">'+r.n+(v?' ✓':'')+'</text></g>';});
 $('map').innerHTML=s+'</svg>';
 $('map').querySelectorAll('[data-g]').forEach(function(g){var go=function(){showRegion(g.dataset.g);};g.addEventListener('click',go);g.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();go();}});});}
function showRegion(id){curReg=id;var r=AD.REGIONS.filter(function(x){return x.id===id;})[0],P=AD.PLATES.filter(function(p){return p.id===r.plate;})[0];
 $('regCard').innerHTML='<div class="k">'+r.place+'</div><div class="reg-top" style="margin-top:10px"><div class="reg-ill pi-'+r.plate+'">'+r.ic+'</div><div><h3>'+r.t+'</h3><div class="pl">'+r.n+'</div></div></div>'+
  '<p class="story">'+r.story+'</p><div class="meta"><span>🍽️ '+r.dish+'</span><span>Served on: '+P.n+'</span></div>'+
  '<div class="k" style="margin-top:16px">On this thali</div><div class="reg-ings">'+r.sel.map(function(x){return '<span>'+ING[x].ic+' '+ING[x].n+'</span>';}).join('')+'</div>'+
  '<div class="mini pi-'+r.plate+'">'+r.sel.map(function(x,i){var a=-Math.PI/2+i*2*Math.PI/r.sel.length;return '<span style="left:'+(50+31*Math.cos(a))+'%;top:'+(50+31*Math.sin(a))+'%;animation-delay:'+(i*.08)+'s">'+ING[x].ic+'</span>';}).join('')+'</div>'+
  '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:18px;justify-content:center"><button class="btn gold" id="serve">Serve this thali ↑</button></div>'+
  '<div class="trail-prog">KITCHENS VISITED · '+S.regions.length+' OF '+AD.REGIONS.length+'</div>';
 $('serve').onclick=function(){S.sel=r.sel.slice(0,MAX);if(S.regions.indexOf(r.id)<0)S.regions.push(r.id);setPlate(r.plate,false);update(true);renderMap();showRegion(r.id);$('lab').scrollIntoView({behavior:'smooth'});toast(r.ic+' Serving <b>'+r.t+'</b> on a '+P.n.toLowerCase()+'.',2800);};
 renderMap();}

/* ---------- festival kitchen ---------- */
function renderFest(){var st=$('festStrip');if(!st.children.length){st.innerHTML=AD.FESTIVALS.map(function(f,i){return '<button class="fest" data-f="'+i+'"><span class="m">'+f.m.toUpperCase()+'</span><span class="fi">'+f.ic+'</span><b>'+f.n+'</b><span class="dsh">'+f.dish+'</span><p>'+f.x+'</p><span class="cook">Cook it on your thali →</span></button>';}).join('');
  st.querySelectorAll('[data-f]').forEach(function(b){b.onclick=function(){var f=AD.FESTIVALS[+b.dataset.f];S.sel=f.sel.slice(0,MAX);update(true);$('lab').scrollIntoView({behavior:'smooth'});};});}
 st.querySelectorAll('[data-f]').forEach(function(b){b.classList.toggle('done',S.fest.indexOf(AD.FESTIVALS[+b.dataset.f].n)>=0);});}

/* ---------- Rasoi stamps ---------- */
var STAMPS=[
 {id:'shad',ic:'🌈',n:'Shad-rasa',d:'All six tastes on one plate',ok:function(A){return A&&A.six;}},
 {id:'ritu',ic:'🍂',n:'Ritu-bhojan',d:'A 75%+ seasonal thali (3+ items)',ok:function(A){return A&&A.fit!=null&&A.fit>=75&&S.sel.length>=3;}},
 {id:'trail',ic:'🗺️',n:'Yatri',d:'Serve 5 regional thalis',ok:function(){return S.regions.length>=5;}},
 {id:'fest',ic:'🪔',n:'Utsav cook',d:'Cook 3 festival dishes',ok:function(){return S.fest.length>=3;}},
 {id:'plates',ic:'🍃',n:'Patra',d:'Serve on 4 kinds of plate',ok:function(){return S.plates.length>=4;}},
 {id:'scholar',ic:'📜',n:'Ahara acharya',d:'Discover 25 principles',ok:function(){return S.found.length>=25;}}
];
function checkStamps(user,A){STAMPS.forEach(function(st){if(S.stamps.indexOf(st.id)<0&&st.ok(A)){S.stamps.push(st.id);if(user)later(function(){toast(st.ic+' Rasoi stamp earned: <b>'+st.n+'</b> — '+st.d,3600);},1500);}});
 $('stamps').innerHTML=STAMPS.map(function(st){var g=S.stamps.indexOf(st.id)>=0;return '<div class="stamp'+(g?' got':'')+'" title="'+st.d+'"><em>'+st.ic+'</em>'+st.n+'<small>'+st.d+'</small></div>';}).join('');}

/* ---------- boot ---------- */
S.rituView=S.ritu;renderRitu(S.ritu);renderPlates();renderMap();showRegion('punjab');update(false);

/* in-page nav: scroll instead of changing the SPA URL hash */
root.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href^="#"]');if(!a||!root.contains(a))return;var el=root.querySelector(a.getAttribute('href'));if(!el)return;e.preventDefault();el.scrollIntoView({behavior:'smooth'});});

/* load saved progress from the account, then re-render with it */
ctx.loadState(KEY).then(function(d){if(!alive)return;if(d){applySaved(d);renderPlates();renderMap();showRegion(curReg||'punjab');update(false);}loaded=true;});

return function(){alive=false;if(subT){window.clearTimeout(subT);timers.delete(subT);submitNow();}flush();timers.forEach(function(id){window.clearTimeout(id);});timers.clear();};
}
