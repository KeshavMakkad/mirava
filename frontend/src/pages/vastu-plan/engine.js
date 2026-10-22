// @ts-nocheck
/* eslint-disable */
/**
 * VastuPlan AI — ported from VastuPlan.html (new3). The scoring engine (VE),
 * heritage quests (VQ) and page script are kept nearly verbatim; changes:
 *  - DOM lookups are scoped to `root`; listeners, timers, RAF, the observer and
 *    the festival AudioContext are torn down on cleanup.
 *  - Progress (was localStorage miravaVastuPlan + miravaVastuQuests, synced to
 *    D1 by the Worker) is one Mirava state blob 'vastuPlan' = {plan, quests},
 *    saved debounced and flushed on unmount / pagehide.
 *  - The account greeting (#who) is rendered by React from useAuth().
 *  - Seals and masterpiece scores submit a 'vastu-plan' score.
 *  - The sound preference stays in localStorage (miravaVastuSound).
 */

/* ===== VastuPlan scoring engine (pure functions, no DOM) ===== */
/* ===== VastuPlan scoring engine (pure functions, no DOM) ===== */
var VE=(function(){
 var N=9;
 var TYPES={
  road:   {n:'Street',          sk:'Veedhi',          ic:'🛣️', h:0,   needsRoad:false},
  temple: {n:'Temple',          sk:'Devalaya',        ic:'🛕', h:3.2, needsRoad:true},
  tank:   {n:'Water tank',      sk:'Kunda',           ic:'💧', h:0,   needsRoad:true},
  agni:   {n:'Hearth & forge',  sk:'Agnishala',       ic:'🔥', h:1.4, needsRoad:true},
  palace: {n:'Palace',          sk:'Rajagriha',       ic:'🏰', h:2.6, needsRoad:true},
  granary:{n:'Granary',         sk:'Dhanya-koshtha',  ic:'🌾', h:1.9, needsRoad:true},
  market: {n:'Market',          sk:'Vipani',          ic:'🛍️', h:1.0, needsRoad:true},
  house:  {n:'Homes',           sk:'Griha',           ic:'🏠', h:1.2, needsRoad:true},
  garden: {n:'Garden',          sk:'Udyana',          ic:'🌳', h:0.6, needsRoad:false}
 };
 var ORDER=['road','house','temple','tank','agni','palace','granary','market','garden'];
 var ZONES={
  N:{n:'Uttara',d:'North',deity:'Kubera',note:'lord of wealth — trade and treasuries'},
  NE:{n:'Ishanya',d:'North-east',deity:'Ishana',note:'the most sacred corner — water and worship, kept light and open'},
  E:{n:'Purva',d:'East',deity:'Indra',note:'the rising sun — entrances and open ground'},
  SE:{n:'Agneya',d:'South-east',deity:'Agni',note:'fire — hearths, kitchens and forges'},
  S:{n:'Dakshina',d:'South',deity:'Yama',note:'solid and closed — heavier structures'},
  SW:{n:'Nairutya',d:'South-west',deity:'Nirriti',note:'the heaviest, tallest and most stable buildings'},
  W:{n:'Paschima',d:'West',deity:'Varuna',note:'lord of waters and the evening'},
  NW:{n:'Vayavya',d:'North-west',deity:'Vayu',note:'wind and movement — granaries, stores and guests'},
  C:{n:'Brahmasthana',d:'Centre',deity:'Brahma',note:'the sacred centre — kept open or given to the temple'}
 };
 var IDEAL={
  tank:{NE:1,N:.6,E:.6},
  agni:{SE:1,S:.5,E:.5},
  palace:{SW:1,S:.6,W:.6},
  granary:{NW:1,W:.6,N:.5},
  market:{N:1,NW:.6,E:.6,NE:.4},
  temple:{C:1,NE:.7,E:.5},
  garden:{NE:1,N:.9,E:.9,C:.8}
 };
 var GATECELL={N:[0,4],S:[8,4],E:[4,8],W:[4,0]};
 function zoneOf(i){var r=(i/N)|0,c=i%N,R=r<3?'N':r>5?'S':'',C=c<3?'W':c>5?'E':'';return (R+C)||'C';}
 function zoneCells(z){var a=[];for(var i=0;i<N*N;i++)if(zoneOf(i)===z)a.push(i);return a;}
 function nb4(i){var r=(i/N)|0,c=i%N,a=[];if(r>0)a.push(i-N);if(r<N-1)a.push(i+N);if(c>0)a.push(i-1);if(c<N-1)a.push(i+1);return a;}
 function nb8(i){var r=(i/N)|0,c=i%N,a=[];for(var dr=-1;dr<=1;dr++)for(var dc=-1;dc<=1;dc++){if(!dr&&!dc)continue;var rr=r+dr,cc=c+dc;if(rr>=0&&cc>=0&&rr<N&&cc<N)a.push(rr*N+cc);}return a;}
 var clamp=function(v,a,b){return v<a?a:v>b?b:v;};

 function analyse(st){
  var g=st.g,gates=st.gates,cnt={},byType={},i,t;
  ORDER.forEach(function(k){cnt[k]=0;byType[k]=[];});
  for(i=0;i<N*N;i++){t=g[i];if(t){cnt[t]++;byType[t].push(i);}}
  var H=function(i){return g[i]?TYPES[g[i]].h:0;};
  var zoneH=function(z){var s=0;zoneCells(z).forEach(function(i){s+=H(i);});return s/9;};
  var fit=function(type){var a=byType[type];if(!a.length)return null;var s=0;a.forEach(function(i){s+=(IDEAL[type][zoneOf(i)]||0);});return s/a.length;};
  var nb=0;for(i=0;i<N*N;i++)if(g[i]&&g[i]!=='road')nb++;var prog=Math.min(1,nb/12);
  var rules=[];
  function R(id,cat,w,v,title,detail,tip,cells,zone){rules.push({id:id,cat:cat,w:w,v:clamp(v,0,1),title:title,detail:detail,tip:tip,cells:cells||[],zone:zone||null});}
  var misplaced=function(type){return byType[type].filter(function(i){return (IDEAL[type][zoneOf(i)]||0)<1;});};

  /* ---------- ORIENTATION (40) ---------- */
  var f;
  f=fit('tank');R('water','Orientation',8,f==null?0:f,'Water in the north-east',
   'Ishanya, the north-east, is the most sacred corner — traditionally given to wells, tanks and worship.',
   f==null?'Add a water tank (Kunda) in the north-east corner.':f<1?'Move your water tank into the north-east zone.':'Perfect — water rests in Ishanya.',misplaced('tank'),'NE');
  f=fit('agni');R('fire','Orientation',7,f==null?0:f,'Fire in the south-east',
   'Agneya, the south-east, belongs to Agni — the classic place for hearths, kitchens and forges.',
   f==null?'Add a hearth & forge (Agnishala) in the south-east.':f<1?'Shift your hearth & forge into the south-east.':'Agni is at home in the south-east.',misplaced('agni'),'SE');
  var pf=fit('palace'),hb=(zoneH('SW')>zoneH('NE')&&zoneH('SW')>0)?1:0;
  R('heavy','Orientation',7,(pf==null?0:pf)*.6+hb*.4,'Heavy and tall in the south-west',
   'Nairutya, the south-west, should hold the heaviest and tallest buildings, while the north-east stays lighter.',
   pf==null?'Place the palace (Rajagriha) in the south-west.':pf<1?'Move the palace into the south-west.':hb?'Strong and stable — the south-west carries the weight.':'Make the south-west taller than the north-east.',misplaced('palace'),'SW');
  f=fit('granary');R('granary','Orientation',5,f==null?0:f,'Granary in the north-west',
   'Vayavya, the north-west, is ruled by Vayu (wind) — suited to stores, granaries and movement of goods.',
   f==null?'Add a granary (Dhanya-koshtha) in the north-west.':f<1?'Move the granary to the north-west.':'Grain is stored where the wind blows.',misplaced('granary'),'NW');
  f=fit('market');R('market','Orientation',4,f==null?0:f,'Market toward the north',
   'The north belongs to Kubera, keeper of wealth — a natural home for trade.',
   f==null?'Add a market (Vipani) in the north.':f<1?'Bring the market closer to the north.':'Kubera smiles on your market.',misplaced('market'),'N');
  var gv=(gates.E?.5:0)+(gates.N?.5:0);
  R('gates','Orientation',5,gv,'Gates to the east and north',
   'Entrances facing the rising sun (east) and Kubera (north) are considered the most auspicious.',
   gv>=1?'The city opens to the sunrise and to Kubera.':'Open the '+(!gates.E&&!gates.N?'east and north gates':!gates.E?'east gate':'north gate')+'.',[],null);
  var neH=zoneH('NE');R('nelight','Orientation',4,prog*(1-clamp((neH-.25)/.9,0,1)),'North-east kept light',
   'The sacred north-east should stay low and open so the morning light and breeze can enter the city.',
   neH<=.25?'Ishanya is open and light.':'Lower or clear the tall buildings in the north-east.',zoneCells('NE').filter(function(i){return H(i)>.7;}),'NE');

  /* ---------- LAYOUT (35) ---------- */
  var centre=zoneCells('C'),badC=centre.filter(function(i){var t=g[i];return t&&t!=='road'&&t!=='garden'&&t!=='temple';});
  R('centre','Layout',9,prog*(1-badC.length*.3),'A sacred, open centre',
   'The Brahmasthana — the central nine squares of the Vastu Purusha Mandala — is kept open or given to the temple.',
   badC.length?'Clear homes and workshops from the centre; use the temple, gardens or streets instead.':'The Brahmasthana breathes freely.',badC,'C');
  // road network from gates
  var openG=['N','E','S','W'].filter(function(k){return gates[k];}),reachAll={},conn=0;
  openG.forEach(function(k){var s=GATECELL[k][0]*N+GATECELL[k][1];if(g[s]!=='road')return;var seen={},q=[s],hit=false;seen[s]=1;
   while(q.length){var x=q.shift();reachAll[x]=1;var r=(x/N)|0,c=x%N;if(r>=2&&r<=6&&c>=2&&c<=6)hit=true;nb4(x).forEach(function(y){if(!seen[y]&&g[y]==='road'){seen[y]=1;q.push(y);}});}
   if(hit)conn++;});
  R('avenues','Layout',8,openG.length?conn/openG.length:0,'Gates linked to the heart',
   'Every gate should open onto a street that leads all the way to the city centre.',
   !openG.length?'Open at least one gate in the city wall.':conn<openG.length?'Lay a street from each open gate to the centre.':'Every gate leads to the heart of the city.',
   openG.filter(function(k){var s=GATECELL[k][0]*N+GATECELL[k][1];return g[s]!=='road';}).map(function(k){return GATECELL[k][0]*N+GATECELL[k][1];}),null);
  var bld=[],ok=0;for(i=0;i<N*N;i++){t=g[i];if(t&&TYPES[t].needsRoad){bld.push(i);if(nb4(i).some(function(y){return g[y]==='road';}))ok++;}}
  R('access','Layout',8,bld.length?ok/bld.length:0,'Every building on a street',
   'Each plot should face a street (veedhi) so people, carts and water can reach it.',
   !bld.length?'Start placing buildings beside streets.':ok<bld.length?(bld.length-ok)+' building'+(bld.length-ok===1?' has':'s have')+' no street beside it.':'Every door opens onto a street.',
   bld.filter(function(i){return !nb4(i).some(function(y){return g[y]==='road';});}),null);
  var axis=[];for(i=0;i<N;i++){if(i!==4){axis.push(4*N+i);axis.push(i*N+4);}}
  var axR=axis.filter(function(i){return g[i]==='road';}).length;
  R('cross','Layout',3,axR/axis.length,'Cardinal cross-avenues',
   'Classical plans run two great streets north–south and east–west along the central lines, crossing at the heart.',
   axR===axis.length?'Your royal avenues cross at the centre.':'Complete the streets along the central row and column.',axis.filter(function(i){return g[i]!=='road';}),null);
  f=fit('temple');R('templec','Layout',4,f==null?0:f,'Temple at the heart',
   'In temple-centred plans such as Sarvatobhadra, the shrine stands at the centre with streets radiating to the gates.',
   f==null?'Raise a temple (Devalaya) in the centre.':f<1?'Move the temple into the central Brahmasthana.':'The shrine anchors the whole city.',misplaced('temple'),'C');
  var built=0,match=0;for(var r=0;r<N;r++)for(var c=0;c<4;c++){var a=g[r*N+c],b=g[r*N+8-c];var cl=function(x){return !x||x==='garden'?'o':x==='road'?'r':'b';};if(a||b){built++;if(cl(a)===cl(b))match++;}}
  R('symmetry','Layout',3,built>=4?match/built:0,'Balanced and symmetrical',
   'Traditional plans are ordered and balanced about their central axes.',
   built<4?'Build more of the city to judge its balance.':match/built>.8?'Beautifully balanced east and west.':'Mirror streets and buildings across the north–south axis.',[],null);

  /* ---------- SPATIAL ORGANISATION (25) ---------- */
  var need=[['temple',1],['tank',1],['agni',1],['granary',1],['market',1],['palace',1]],have=0,miss=[];
  need.forEach(function(n){var v=Math.min(1,cnt[n[0]]/n[1]);have+=v;if(v<1)miss.push(TYPES[n[0]].n.toLowerCase());});
  R('complete','Spatial organisation',6,have/need.length,'A complete city',
   'A living town needs worship, water, fire, food stores, trade and homes.',
   miss.length?'Still missing: '+miss.join(', ')+'.':'Your city has every essential building.',[],null);
  R('homes','Spatial organisation',4,Math.min(1,cnt.house/14),'Homes for the people',
   'A town lives through its households — rows of homes along every street.',
   cnt.house>=14?'A thriving population of '+cnt.house+' homes.':'Build more homes ('+cnt.house+' of 14).',[],null);
  var clash=[];byType.agni.forEach(function(i){nb8(i).forEach(function(y){if(g[y]==='tank'){clash.push(i);clash.push(y);}});});
  R('elements','Spatial organisation',4,(!cnt.agni&&!cnt.tank)?0:(!cnt.agni||!cnt.tank)?.5:clash.length?0:1,'Fire and water kept apart',
   'Agni and water are opposing elements — hearths and tanks are not placed side by side.',
   clash.length?'Separate the hearth from the water tank.':(!cnt.agni||!cnt.tank)?'Place both fire and water to complete this principle.':'Fire and water keep a respectful distance.',clash,null);
  var open=0;for(i=0;i<N*N;i++)if(!g[i]||g[i]==='garden')open++;var of=open/(N*N);
  R('space','Spatial organisation',5,of<.15?of/.15:of>.35?1-clamp((of-.35)/.3,0,1):1,'Room to breathe',
   'Open ground and gardens keep a town healthy — neither crowded nor empty.',
   of<.15?'The city is crowded — leave more open ground or gardens.':of>.35?'Plenty of space left — keep building ('+Math.round(of*100)+'% open).':'A healthy balance of built and open space ('+Math.round(of*100)+'% open).',[],null);
  var gf=fit('garden');R('gardens','Spatial organisation',3,gf==null?0:Math.min(1,cnt.garden/2)*gf,'Gardens toward the light',
   'Groves and gardens in the north and east welcome the morning sun.',
   gf==null?'Plant at least two gardens in the north or east.':cnt.garden<2?'Add one more garden.':gf<1?'Shift gardens toward the north and east.':'The city is green where the sun rises.',misplaced('garden'),'NE');
  var mk=byType.market.some(function(i){return nb4(i).some(function(y){return reachAll[y];});});
  R('trade','Spatial organisation',3,mk?1:0,'Market on a gate street',
   'Trade thrives where travellers arrive — beside a street that leads to a city gate.',
   !cnt.market?'Add a market beside a gate street.':mk?'Merchants greet every traveller.':'Put the market beside a street connected to a gate.',mk?[]:byType.market,null);

  var cats={Orientation:{w:0,v:0},Layout:{w:0,v:0},'Spatial organisation':{w:0,v:0}},total=0;
  rules.forEach(function(r){cats[r.cat].w+=r.w;cats[r.cat].v+=r.w*r.v;total+=r.w*r.v;});
  return {score:Math.round(total),raw:total,cats:cats,rules:rules,cnt:cnt};
 }
 function grade(s){return s>=90?['Sthapati’s masterpiece','A city the ancient master-builders would sign.']:s>=75?['Royal city','Ordered, auspicious and alive.']:s>=55?['Thriving town','Strong bones — a few principles to refine.']:s>=30?['Growing village','The plan is taking shape.']:['Empty land','Every great city began as open ground.'];}

 // ---- Sthapati AI: search for the single best next move ----
 function bestMove(st,opts){
  opts=opts||{};var base=analyse(st).raw,best=null,g=st.g;
  for(var gk in st.gates){var s2={g:g,gates:Object.assign({},st.gates)};s2.gates[gk]=!s2.gates[gk];var v=analyse(s2).raw-base;if(v>(best?best.gain:0.01))best={kind:'gate',gate:gk,open:s2.gates[gk],gain:v};}
  var types=ORDER.concat([null]);
  for(var i=0;i<N*N;i++){for(var k=0;k<types.length;k++){var t=types[k];if(t===g[i])continue;if(t===null&&!g[i])continue;
   var ng=g.slice();ng[i]=t;var gain=analyse({g:ng,gates:st.gates}).raw-base;if(t===null)gain-=.05;
   if(gain>(best?best.gain:0.01))best={kind:'cell',i:i,type:t,gain:gain};}}
  if(!best)return null;
  // explain: which rule improved most
  var after;if(best.kind==='gate'){var s3={g:g,gates:Object.assign({},st.gates)};s3.gates[best.gate]=best.open;after=analyse(s3);}else{var ng2=g.slice();ng2[best.i]=best.type;after=analyse({g:ng2,gates:st.gates});}
  var before=analyse(st),top=null,d=0;after.rules.forEach(function(r,ix){var dd=(r.v-before.rules[ix].v)*r.w;if(dd>d){d=dd;top=r;}});
  best.rule=top;return best;
 }
 // ---- Sthapati AI auto-planner: try street skeletons, then fill greedily; keeps your buildings ----
 var SKELETONS=[
  {n:'cross-and-ring',roads:function(r,c){return r===4||c===4||((r===1||r===7)&&c>=1&&c<=7)||((c===1||c===7)&&r>=1&&r<=7);}},
  {n:'cross-and-lanes',roads:function(r,c){return r===4||c===4||c===2||c===6;}},
  {n:'cross-and-rows',roads:function(r,c){return c===4||r===1||r===4||r===7;}}
 ];
 function planFrom(st,sk){
  var s={g:st.g.slice(),gates:{N:true,E:true,S:st.gates.S,W:st.gates.W}},moves=[];
  ['N','E'].forEach(function(k){if(!st.gates[k])moves.push({kind:'gate',gate:k,open:true});});
  for(var i=0;i<N*N;i++){var r=(i/N)|0,c=i%N;if(!s.g[i]&&sk.roads(r,c)){s.g[i]='road';moves.push({kind:'cell',i:i,type:'road'});}}
  return {s:s,moves:moves};
 }
 function* autoPlan(st){
  var best=null;
  for(var k=0;k<SKELETONS.length;k++){
   var p=planFrom(st,SKELETONS[k]);
   for(var step=0;step<70;step++){var m=bestMove(p.s);if(!m)break;if(m.kind==='gate')p.s.gates[m.gate]=m.open;else p.s.g[m.i]=m.type;p.moves.push(m);yield {phase:k,of:SKELETONS.length,step:step};}
   var sc=analyse(p.s).raw;if(!best||sc>best.sc)best={sc:sc,moves:p.moves,s:p.s};
  }
  var base=analyse(st).raw;
  return best&&best.sc>base?best:null;
 }
 function fromRows(rows){var m={'.':null,R:'road',T:'temple',W:'tank',F:'agni',P:'palace',G:'granary',M:'market',H:'house',Y:'garden'},g=[];rows.forEach(function(row){row.replace(/\s/g,'').split('').forEach(function(ch){g.push(m[ch]);});});return g;}
 return {N:N,TYPES:TYPES,ORDER:ORDER,ZONES:ZONES,IDEAL:IDEAL,GATECELL:GATECELL,zoneOf:zoneOf,zoneCells:zoneCells,analyse:analyse,grade:grade,bestMove:bestMove,autoPlan:autoPlan,fromRows:fromRows};
})();

/* ===== Heritage city challenges ===== */
var VQ=(function(){
 var N=9;
 function cnt(st,t){return st.g.filter(function(x){return x===t;}).length;}
 function cells(st,t){var a=[];st.g.forEach(function(x,i){if(x===t)a.push(i);});return a;}
 function rc(i){return [(i/N)|0,i%N];}
 function nb4(i){var r=(i/N)|0,c=i%N,a=[];if(r>0)a.push(i-N);if(r<N-1)a.push(i+N);if(c>0)a.push(i-1);if(c<N-1)a.push(i+1);return a;}
 function onRoad(st,i){return nb4(i).some(function(y){return st.g[y]==='road';});}
 function ring(d){var a=[];for(var i=0;i<N*N;i++){var p=rc(i);if(Math.max(Math.abs(p[0]-4),Math.abs(p[1]-4))===d)a.push(i);}return a;}
 function rowRoads(st,r){var n=0;for(var c=0;c<N;c++)if(st.g[r*N+c]==='road')n++;return n;}
 function colRoads(st,c){var n=0;for(var r=0;r<N;r++)if(st.g[r*N+c]==='road')n++;return n;}
 function allRoad(st,a){return a.every(function(i){return st.g[i]==='road';});}
 var GC={N:4,S:76,E:44,W:36};
 function gatesLinked(st){return ['N','E','S','W'].every(function(k){return st.gates[k]&&st.g[GC[k]]==='road';});}
 var Q=[
  {id:'mohenjo',city:'Mohenjo-daro',era:'c. 2500 BCE',where:'Indus Valley, Sindh',ic:'🏺',col:'#b8743a',gates:{N:false,E:true,S:false,W:true},
   story:'One of the great cities of the Harappan civilisation. Its baked-brick houses lined straight streets laid out in a grid, with covered drains running beneath them. A raised citadel to the west held the Great Bath and a large building often called the granary, while most people lived in the lower town to the east.',
   fact:'No grand temple or palace has ever been found in a Harappan city — one of history’s great puzzles.',
   obj:[
    {t:'A grid of streets — two full-length streets each way',f:function(st){var r=0,c=0;for(var k=0;k<N;k++){if(rowRoads(st,k)>=8)r++;if(colRoads(st,k)>=8)c++;}return r>=2&&c>=2;}},
    {hl:function(){var a=[];for(var r=0;r<N;r++)a.push(r*N,r*N+1,r*N+2);return a;},t:'The Great Bath on the western citadel (a water tank in the three western columns)',f:function(st){return cells(st,'tank').some(function(i){return i%N<=2;});}},
    {hl:function(){var a=[];for(var r=0;r<N;r++)a.push(r*N,r*N+1,r*N+2);return a;},t:'A granary on the citadel beside it',f:function(st){return cells(st,'granary').some(function(i){return i%N<=2;});}},
    {t:'A lower town of at least 12 homes in the east',f:function(st){return cells(st,'house').filter(function(i){return i%N>=3;}).length>=12;}},
    {t:'Every home opens onto a street',f:function(st){var h=cells(st,'house');return h.length>0&&h.every(function(i){return onRoad(st,i);});}},
    {t:'No grand temple — none has been found',f:function(st){return cnt(st,'temple')===0&&cnt(st,'house')>0;}}
   ],
   sol:['. W . R H H R H .','. G . R H H R H .','R R R R R R R R R','. H . R H H R H .','R R R R R R R R R','. H . R H H R H .','R R R R R R R R R','. H . R H H R H .','. . . R . . R . .']},
  {id:'jaipur',city:'Jaipur',era:'founded 1727',where:'Rajasthan',ic:'🏰',col:'#d4707a',gates:{N:false,E:true,S:false,W:true},
   story:'Sawai Jai Singh II founded Jaipur in 1727 with the architect Vidyadhar Bhattacharya, who drew on the principles of the Shilpa Shastra. The walled city was laid out as a grid of large blocks with broad bazaar streets, and the City Palace at its heart. The main east–west avenue runs from Suraj Pol (Sun Gate) in the east to Chand Pol (Moon Gate) in the west.',
   fact:'The old city was painted pink in 1876 to welcome the Prince of Wales; it became a UNESCO World Heritage Site in 2019.',
   obj:[
    {hl:function(){var a=[];for(var k=0;k<N;k++)a.push(2*N+k,6*N+k,k*N+2,k*N+6);return a;},t:'A nine-block grid — full streets along rows 3 and 7 and columns 3 and 7',f:function(st){return rowRoads(st,2)>=8&&rowRoads(st,6)>=8&&colRoads(st,2)>=8&&colRoads(st,6)>=8;}},
    {hl:function(){return [30,31,32,39,40,41,48,49,50];},t:'The City Palace in the central block',f:function(st){return cells(st,'palace').some(function(i){var p=rc(i);return p[0]>=3&&p[0]<=5&&p[1]>=3&&p[1]<=5;});}},
    {t:'Suraj Pol and Chand Pol — open the east and west gates',f:function(st){return st.gates.E&&st.gates.W;}},
    {t:'Bazaars — at least 4 markets on the streets',f:function(st){return cells(st,'market').filter(function(i){return onRoad(st,i);}).length>=4;}},
    {t:'A temple for the city',f:function(st){return cnt(st,'temple')>=1;}},
    {t:'Homes for its people — at least 12',f:function(st){return cnt(st,'house')>=12;}}
   ],
   sol:['Y H R H H H R H W','H M R M H M R M H','R R R R R R R R R','H T R P P P R H H','R R R P P P R R R','H M R P P P R M H','R R R R R R R R R','H H R H G H R F H','Y H R H H H R H Y']},
  {id:'madurai',city:'Madurai',era:'16th–17th c. layout',where:'Tamil Nadu',ic:'🛕',col:'#e5562f',gates:{N:true,E:true,S:true,W:true},
   story:'Madurai grew around the Meenakshi Amman temple. Its streets form concentric squares around the shrine. Most are named after the Tamil months whose festivals are held on them — the Chithirai, Avani Moola and Masi streets — with the Veli (outer) streets beyond. During each festival, the deities are taken in procession around the street of that name.',
   fact:'The outer Masi streets are also the city’s busiest bazaars.',
   obj:[
    {hl:function(){return [40];},t:'The temple at the very centre of the city',f:function(st){return st.g[40]==='temple';}},
    {hl:function(){return ring(1);},t:'Chithirai streets — a complete ring street around the temple',f:function(st){return allRoad(st,ring(1));}},
    {hl:function(){return ring(3);},t:'Masi streets — a complete outer ring street',f:function(st){return allRoad(st,ring(3));}},
    {hl:function(){return ring(2);},t:'Homes between the rings — at least 10',f:function(st){return ring(2).filter(function(i){return st.g[i]==='house';}).length>=10;}},
    {t:'Bazaars on the Masi streets — at least 2 markets beside the outer ring',f:function(st){var r3=ring(3);return cells(st,'market').filter(function(i){return nb4(i).some(function(y){return r3.indexOf(y)>=0;});}).length>=2;}},
    {t:'Four gopuram gates, each linked to the Masi streets',f:gatesLinked}
   ],
   sol:['Y M . M R M . W W','. R R R R R R R .','. R H H H H H R .','. R H R R R H R .','R R H R T R H R R','. R H R R R H R .','. R H H H H H R .','. R R R R R R R .','P . . . R . . F .']},
  {id:'srirangam',city:'Srirangam',era:'10th–17th c. walls',where:'Kaveri river, Tamil Nadu',ic:'🪷',col:'#8a5a2b',gates:{N:true,E:true,S:true,W:true},
   story:'The Sri Ranganathaswamy temple at Srirangam stands on an island between the Kaveri and Kollidam rivers. It is enclosed by seven concentric walls (prakarams) pierced by towering gopurams. The inner enclosures hold the shrines; in the outer ones people live and trade, so the whole town is part of the temple.',
   fact:'With its 21 gopurams, it is often described as one of the largest functioning Hindu temple complexes in the world.',
   obj:[
    {hl:function(){return [40];},t:'The temple at the very centre',f:function(st){return st.g[40]==='temple';}},
    {hl:function(){return ring(1);},t:'The first prakaram — a ring street around the shrine',f:function(st){return allRoad(st,ring(1));}},
    {hl:function(){return ring(2);},t:'A prakaram of homes — at least 12 in the second ring',f:function(st){return ring(2).filter(function(i){return st.g[i]==='house';}).length>=12;}},
    {hl:function(){return ring(3);},t:'The outer prakaram — a complete outer ring street',f:function(st){return allRoad(st,ring(3));}},
    {t:'Gopurams on all four sides, linked to the streets',f:gatesLinked},
    {hl:function(){return ring(4);},t:'A temple tank and at least 2 gardens in the outermost ring',f:function(st){var r4=ring(4);return cnt(st,'tank')>=1&&r4.filter(function(i){return st.g[i]==='garden';}).length>=2;}}
   ],
   sol:['Y . . . R . . W W','. R R R R R R R .','. R H H H H H R .','. R H R R R H R .','R R H R T R H R R','. R H R R R H R .','. R H H H H H R .','. R R R R R R R .','Y . . . R . . . Y']}
 ];
 function check(q,st){return q.obj.map(function(o){try{return !!o.f(st);}catch(e){return false;}});}
 // cities' illustrated plans (SVG)
 function art(id){
  var s='<svg viewBox="0 0 120 120" aria-hidden="true">';
  if(id==='mohenjo'){s+='<rect width="120" height="120" fill="#e9d2a8"/><rect x="6" y="10" width="34" height="100" rx="4" fill="#d7b98a" stroke="#a8743a"/>';
   for(var k=0;k<4;k++){s+='<rect x="'+(48+k*17)+'" y="10" width="13" height="100" fill="#c98e5a" opacity=".8"/>';}
   for(var r=0;r<6;r++)s+='<rect x="44" y="'+(12+r*17)+'" width="72" height="3" fill="#f3e6cc"/>';
   s+='<rect x="12" y="24" width="20" height="14" fill="#3f9fd0" stroke="#7a4e22" stroke-width="2"/><rect x="12" y="50" width="20" height="18" fill="#b8743a"/><text x="23" y="80" text-anchor="middle" font-size="7" font-family="DM Mono" fill="#7a4e22">CITADEL</text>';}
  else if(id==='jaipur'){s+='<rect width="120" height="120" fill="#f3d3d0"/><rect x="8" y="8" width="104" height="104" fill="#e8a3a3" stroke="#b5533c" stroke-width="3"/>';
   [40,80].forEach(function(v){s+='<rect x="'+(v-2)+'" y="8" width="4" height="104" fill="#fbe7c6"/><rect x="8" y="'+(v-2)+'" width="104" height="4" fill="#fbe7c6"/>';});
   s+='<rect x="46" y="46" width="28" height="28" fill="#f7b63e" stroke="#b5533c"/><text x="60" y="63" text-anchor="middle" font-size="6.5" font-family="DM Mono" fill="#792d3c">PALACE</text><circle cx="112" cy="60" r="5" fill="#f7b63e"/><circle cx="8" cy="60" r="5" fill="#dfe8f0"/><text x="104" y="52" font-size="5" text-anchor="end" font-family="DM Mono" fill="#792d3c">SURAJ POL</text><text x="16" y="52" font-size="5" font-family="DM Mono" fill="#792d3c">CHAND POL</text>';}
  else if(id==='madurai'){s+='<rect width="120" height="120" fill="#f6e4c8"/>';[52,38,24,10].forEach(function(h,k){s+='<rect x="'+(60-h)+'" y="'+(60-h)+'" width="'+(h*2)+'" height="'+(h*2)+'" fill="none" stroke="'+(k%2?'#d9b58a':'#c4743a')+'" stroke-width="'+(k%2?5:3)+'"/>';});
   s+='<rect x="52" y="52" width="16" height="16" fill="#e5562f"/>';[[60,44],[76,60],[60,76],[44,60]].forEach(function(p){s+='<path d="M'+(p[0]-4)+' '+(p[1]+3)+' L'+p[0]+' '+(p[1]-6)+' L'+(p[0]+4)+' '+(p[1]+3)+'Z" fill="#f7b63e"/>';});
   s+='<text x="60" y="116" text-anchor="middle" font-size="6" font-family="DM Mono" fill="#792d3c">MASI · AVANI MOOLA · CHITHIRAI</text>';}
  else{s+='<rect width="120" height="120" fill="#bfe0ee"/><ellipse cx="60" cy="60" rx="58" ry="46" fill="#e9d9b4"/>';for(var q=0;q<7;q++){var h2=40-q*5.2;s+='<rect x="'+(60-h2)+'" y="'+(60-h2*.8)+'" width="'+(h2*2)+'" height="'+(h2*1.6)+'" fill="none" stroke="'+(q%2?'#b98a4e':'#8a5a2b')+'" stroke-width="1.6"/>';}
   s+='<rect x="55" y="55" width="10" height="10" fill="#f7b63e"/><path d="M56 96 L60 84 L64 96Z" fill="#e5562f"/><text x="60" y="114" text-anchor="middle" font-size="6" font-family="DM Mono" fill="#1f5f8c">KAVERI</text><text x="60" y="9" text-anchor="middle" font-size="6" font-family="DM Mono" fill="#1f5f8c">KOLLIDAM</text>';}
  return s+'</svg>';
 }
 return {Q:Q,check:check,art:art,ring:ring};
})();

const STATE_KEY = 'vastuPlan';
const SAVE_DELAY = 1200;

export function initVastuPlan(root, mv) {
var cleanups = [];
var disposed = false;
var on = function (target, type, fn, opts) { target.addEventListener(type, fn, opts); cleanups.push(function () { target.removeEventListener(type, fn, opts); }); };
var timers = new Set(), intervals = new Set(), frames = new Set();
var setTimeout = function (fn, ms) { var id = window.setTimeout(function () { timers.delete(id); if (!disposed) fn(); }, ms); timers.add(id); return id; };
var clearTimeout = function (id) { timers.delete(id); window.clearTimeout(id); };
var setInterval = function (fn, ms) { var id = window.setInterval(function () { if (!disposed) fn(); }, ms); intervals.add(id); return id; };
var clearInterval = function (id) { intervals.delete(id); window.clearInterval(id); };
var requestAnimationFrame = function (fn) { var id = window.requestAnimationFrame(function (t) { frames.delete(id); if (!disposed) fn(t); }); frames.add(id); return id; };

/* ---- Mirava state sync (replaces localStorage + /api/heritage/progress) ---- */
var loaded = false, dirty = false, saveT = 0, lastSaved = '';
function stateBlob() { return { plan: { st: st, best: best }, quests: { active: qs.active, seals: qs.seals, revealed: qs.revealed } }; }
function flushSave() {
  window.clearTimeout(saveT); saveT = 0;
  if (!loaded) return;
  var blob = stateBlob(), sig = JSON.stringify(blob);
  if (sig === lastSaved) return;
  lastSaved = sig;
  mv.saveState(STATE_KEY, blob);
}
function scheduleSave() { if (!loaded || disposed) return; window.clearTimeout(saveT); saveT = window.setTimeout(flushSave, SAVE_DELAY); }
on(window, 'pagehide', flushSave);

/* ---- score milestones -> Mirava leaderboard ('vastu-plan') ---- */
function milestone(kind, label) {
  var seals = SEALS.filter(function (x) { return qs.seals[x.id]; }).map(function (x) { return x.id; });
  var all = seals.length === SEALS.length;
  var score = Math.min(100000, Math.round(best * 100 + seals.length * 10000 + (all ? 20000 : 0)));
  mv.submitScore('vastu-plan', { score: score, level: seals.length, completed: all, meta: { milestone: kind, label: label || null, best: best, current: lastA ? lastA.score : 0, seals: seals } });
}

var $=function(id){return root.querySelector('#'+id);};
var N=VE.N,T=VE.TYPES;
var REDUCED=matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------- state & persistence ---------------- */
var KEY='miravaVastuPlan';
var st={g:new Array(N*N).fill(null),gates:{N:false,E:true,S:false,W:false}};
var best=0,undoS=[],redoS=[],tool='road',overlay='none',pop={},flash=null,ghost=null,hover=-1;
function snap(){return JSON.stringify(st);}
function loadSaved(d){try{if(d&&d.st&&Array.isArray(d.st.g)&&d.st.g.length===N*N){st.g=d.st.g.map(function(x){return T[x]?x:null;});['N','E','S','W'].forEach(function(k){st.gates[k]=!!(d.st.gates||{})[k];});best=Math.max(best,+d.best||0);return true;}}catch(e){}return false;}
function persist(){dirty=true;scheduleSave();}
function pushUndo(){undoS.push(snap());if(undoS.length>120)undoS.shift();redoS=[];syncUndo();}
function syncUndo(){$('undo').disabled=!undoS.length;$('redo').disabled=!redoS.length;}
function restore(s){var d=JSON.parse(s);st.g=d.g;st.gates=d.gates;changed(true);}
$('undo').onclick=function(){if(!undoS.length)return;redoS.push(snap());restore(undoS.pop());syncUndo();};
$('redo').onclick=function(){if(!redoS.length)return;undoS.push(snap());restore(redoS.pop());syncUndo();};

/* account greeting: rendered by React from useAuth() into #who */

/* ---------------- tools ---------------- */
var TOOLS=VE.ORDER.concat(['erase']);
var tl=$('tools');
TOOLS.forEach(function(k,ix){var b=document.createElement('button');b.className='tool'+(k===tool?' on':'');b.dataset.t=k;
 var t=k==='erase'?{n:'Clear plot',sk:'Eraser',ic:'⌫'}:T[k];
 b.innerHTML='<span class="ti">'+t.ic+'</span><span><b>'+t.n+'</b><small>'+t.sk+'</small></span><kbd>'+(ix<9?ix+1:'0')+'</kbd>'+(k!=='erase'?'<span class="cnt" data-c="'+k+'"></span>':'');
 b.title=t.n+(k!=='erase'&&VE.IDEAL[k]?' — best in '+Object.keys(VE.IDEAL[k]).filter(function(z){return VE.IDEAL[k][z]===1;}).map(function(z){return VE.ZONES[z].d.toLowerCase();}).join(', '):'');
 b.onclick=function(){setTool(k);};tl.appendChild(b);});
function setTool(k){tool=k;tl.querySelectorAll('.tool').forEach(function(b){b.classList.toggle('on',b.dataset.t===k);});
 if(overlay==='ideal')draw();var t=k==='erase'?null:T[k];
 if(t&&VE.IDEAL[k]){var z=Object.keys(VE.IDEAL[k]).filter(function(q){return VE.IDEAL[k][q]===1;});tip('<b>'+t.n+'</b> — best in '+z.map(function(q){return VE.ZONES[q].n+' ('+VE.ZONES[q].d.toLowerCase()+')';}).join(' or ')+'. Switch on “Best plots” to see where.',2600);}
}
function counts(){var c={};VE.ORDER.forEach(function(k){c[k]=0;});st.g.forEach(function(x){if(x)c[x]++;});tl.querySelectorAll('[data-c]').forEach(function(s){s.textContent=c[s.dataset.c]||'';});}

/* ---------------- canvas geometry ---------------- */
var cv=$('board'),ctx=cv.getContext('2d'),wrap=$('wrap');
var G={S:60,K:.62,ox:0,oy:0,W:0,H:0,HU:0,dpr:1};
function layout(){
 var w=wrap.clientWidth,S=Math.floor(w/10.6);G.S=S;G.HU=S*.42;G.W=w;
 var m=(w-9*S)/2;G.ox=m;G.oy=Math.round(G.HU*3.6+S*.55);G.H=Math.round(G.oy+9*S*G.K+S*.9);
 G.dpr=Math.min(window.devicePixelRatio||1,2);cv.width=w*G.dpr;cv.height=G.H*G.dpr;cv.style.height=G.H+'px';
 ctx.setTransform(G.dpr,0,0,G.dpr,0,0);draw();
}
function cellXY(i){var r=(i/N)|0,c=i%N;return{x:G.ox+c*G.S,y:G.oy+r*G.S*G.K,r:r,c:c};}
function hitCell(x,y){var c=Math.floor((x-G.ox)/G.S),r=Math.floor((y-G.oy)/(G.S*G.K));if(c<0||r<0||c>=N||r>=N)return -1;return r*N+c;}
function gateAt(x,y){var S=G.S,K=G.K,cx=G.ox+4.5*S,cy=G.oy+4.5*S*K,pad=S*.55,bw=9*S,bh=9*S*K;
 if(Math.abs(x-cx)<S*.6&&Math.abs(y-(G.oy-pad*.5))<S*.5)return 'N';
 if(Math.abs(x-cx)<S*.6&&Math.abs(y-(G.oy+bh+pad*.4))<S*.5)return 'S';
 if(Math.abs(y-cy)<S*.5&&Math.abs(x-(G.ox-pad*.5))<S*.45)return 'W';
 if(Math.abs(y-cy)<S*.5&&Math.abs(x-(G.ox+bw+pad*.5))<S*.45)return 'E';return null;}

/* ---------------- drawing ---------------- */
function h32(i,s){var x=Math.sin(i*127.1+s*311.7)*43758.5453;return x-Math.floor(x);}
function shade(hex,f){var n=parseInt(hex.slice(1),16),r=n>>16,g=(n>>8)&255,b=n&255;r=Math.max(0,Math.min(255,r*f))|0;g=Math.max(0,Math.min(255,g*f))|0;b=Math.max(0,Math.min(255,b*f))|0;return 'rgb('+r+','+g+','+b+')';}
function rrect(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
// a box standing on the ground footprint (gx,gy,w,d) rising h px
function box(gx,gy,w,d,h,top,front){var K=G.K;ctx.fillStyle=front;ctx.fillRect(gx,gy+d*K-h,w,h);ctx.fillStyle=top;ctx.fillRect(gx,gy-h,w,d*K);ctx.strokeStyle='rgba(40,20,20,.18)';ctx.lineWidth=1;ctx.strokeRect(gx+.5,gy-h+.5,w-1,d*K+h-1);}
var ZCOL={N:'#f5c542',NE:'#4aa3d8',E:'#f39c4a',SE:'#e5562f',S:'#9b5b3c',SW:'#6e4a8f',W:'#3f8a8a',NW:'#9fb7c9',C:'#f7e08a'};
var t0=performance.now();
function sunVec(){var t=+$('sun').value,a=(t-6)/12*Math.PI;return{x:Math.cos(a),alt:Math.sin(a),t:t};}
function draw(){
 var S=G.S,K=G.K,now=(performance.now()-t0)/1000,sv=sunVec();
 ctx.clearRect(0,0,G.W,G.H);
 // sky band & sun
 var sky=ctx.createLinearGradient(0,0,0,G.oy);var warm=1-Math.min(1,sv.alt*1.6);
 sky.addColorStop(0,warm>.5?'#f6c9a0':'#cfe6f2');sky.addColorStop(1,'#eaf2e6');ctx.fillStyle=sky;ctx.fillRect(0,0,G.W,G.oy+4);
 var sx=G.W/2+sv.x*G.W*.42,sy=G.oy*.75-sv.alt*G.oy*.55;var sg=ctx.createRadialGradient(sx,sy,0,sx,sy,S*.9);sg.addColorStop(0,'rgba(255,240,180,1)');sg.addColorStop(.3,'rgba(255,200,90,.85)');sg.addColorStop(1,'rgba(255,200,90,0)');ctx.fillStyle=sg;ctx.beginPath();ctx.arc(sx,sy,S*.9,0,7);ctx.fill();
 // land beyond walls
 ctx.fillStyle='#b9cf9e';ctx.fillRect(0,G.oy-S*.7,G.W,G.H);
 for(var k=0;k<60;k++){ctx.fillStyle='rgba(70,110,50,.18)';ctx.beginPath();ctx.arc(h32(k,1)*G.W,G.oy-S*.5+h32(k,2)*(G.H-G.oy+S*.5),2+h32(k,3)*3,0,7);ctx.fill();}
 // ground plots
 for(var i=0;i<N*N;i++){var p=cellXY(i);var z=VE.zoneOf(i);
  ctx.fillStyle=(p.r+p.c)%2?'#a9c88d':'#b2cf96';ctx.fillRect(p.x,p.y,S,S*K);
  if(overlay==='zones'){ctx.fillStyle=ZCOL[z];ctx.globalAlpha=.28;ctx.fillRect(p.x,p.y,S,S*K);ctx.globalAlpha=1;}
  if(overlay==='ideal'&&tool!=='erase'){var f=(VE.IDEAL[tool]||{})[z]||0;if(tool==='house')f=z==='C'?0:.5;if(tool==='road')f=(p.r===4||p.c===4)?1:.35;
   ctx.fillStyle=f>=1?'rgba(63,160,80,.55)':f>0?'rgba(245,170,53,'+(.15+f*.35)+')':'rgba(192,57,43,.18)';ctx.fillRect(p.x,p.y,S,S*K);}
 }
 // plot grid lines
 ctx.strokeStyle='rgba(60,90,40,.18)';ctx.lineWidth=1;for(var a=0;a<=N;a++){ctx.beginPath();ctx.moveTo(G.ox+a*S,G.oy);ctx.lineTo(G.ox+a*S,G.oy+9*S*K);ctx.stroke();ctx.beginPath();ctx.moveTo(G.ox,G.oy+a*S*K);ctx.lineTo(G.ox+9*S,G.oy+a*S*K);ctx.stroke();}
 // brahmasthana outline
 ctx.strokeStyle='rgba(245,170,53,.75)';ctx.setLineDash([5,4]);ctx.lineWidth=1.6;ctx.strokeRect(G.ox+3*S,G.oy+3*S*K,3*S,3*S*K);ctx.setLineDash([]);
 if(overlay==='zones'){ctx.textAlign='center';ctx.textBaseline='middle';Object.keys(VE.ZONES).forEach(function(z){var cs=VE.zoneCells(z),pp=cellXY(cs[4]);ctx.fillStyle='rgba(36,21,26,.82)';ctx.font='700 '+Math.max(11,S*.22)+'px "Playfair Display",serif';ctx.fillText(VE.ZONES[z].n,pp.x+S/2,pp.y+S*K/2-S*.08);ctx.font='500 '+Math.max(8,S*.13)+'px "DM Mono",monospace';ctx.fillText(VE.ZONES[z].d.toUpperCase()+' · '+VE.ZONES[z].deity.toUpperCase(),pp.x+S/2,pp.y+S*K/2+S*.14);});}
 // north wall (behind everything)
 wallH();
 // flat items: roads, tanks, gardens' ground
 for(i=0;i<N*N;i++){var t=st.g[i];if(t==='road')drawRoad(i);else if(t==='tank')drawTank(i,now);}
 drawWalkers(now);
 // shadows
 if(sv.alt>.05&&!night)for(i=0;i<N*N;i++){t=st.g[i];if(!t||!T[t].h)continue;var q=cellXY(i),hh=T[t].h*G.HU*.9,len=hh*(1/Math.max(.25,sv.alt))*.35,dx=-sv.x*len;ctx.fillStyle='rgba(30,40,20,'+(.12+.1*(1-sv.alt))+')';ctx.beginPath();ctx.moveTo(q.x+S*.12,q.y+S*K*.85);ctx.lineTo(q.x+S*.88,q.y+S*K*.85);ctx.lineTo(q.x+S*.88+dx,q.y+S*K*.85-len*.18);ctx.lineTo(q.x+S*.12+dx,q.y+S*K*.85-len*.18);ctx.closePath();ctx.fill();}
 // buildings row by row (north first)
 for(var r=0;r<N;r++){
  for(var c=0;c<N;c++){i=r*N+c;t=st.g[i];if(!t||t==='road'||t==='tank')continue;var sc=1;if(pop[i]){var e=(performance.now()-pop[i])/320;if(e>=1)delete pop[i];else if(e<0)sc=.001;else sc=.55+.45*(1-Math.pow(1-e,3));}
   ctx.save();var cp=cellXY(i);ctx.translate(cp.x+S/2,cp.y+S*K);ctx.scale(sc,sc);ctx.translate(-(cp.x+S/2),-(cp.y+S*K));
   ({temple:drawTemple,agni:drawAgni,palace:drawPalace,granary:drawGranary,market:drawMarket,house:drawHouse,garden:drawGarden})[t](i,now);ctx.restore();}
  if(ratha)drawRathaRow(r,now);
 }
 wallSides();
 if(night)drawNight(now);
 if(overlay==='purusha')drawPurusha();
 if(ratha||petals.length)drawPetals(now);
 // ghost (AI suggestion / hover preview)
 var gi=ghost?ghost.i:-1;
 if(hover>=0&&!dragging&&gi<0){var hp=cellXY(hover);ctx.strokeStyle=tool==='erase'?'rgba(192,57,43,.9)':'rgba(255,255,255,.95)';ctx.lineWidth=2;ctx.strokeRect(hp.x+1,hp.y+1,S-2,S*K-2);}
 if(gi>=0){var gp=cellXY(gi),pul=.5+.5*Math.sin(now*6);ctx.strokeStyle='rgba(247,182,62,'+(.6+.4*pul)+')';ctx.lineWidth=3;ctx.strokeRect(gp.x+1.5,gp.y+1.5,S-3,S*K-3);
  ctx.font=Math.round(S*.42)+'px serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.globalAlpha=.6+.4*pul;ctx.fillText(ghost.type?T[ghost.type].ic:'⌫',gp.x+S/2,gp.y+S*K/2-S*.2-pul*4);ctx.globalAlpha=1;}
 if(flash&&performance.now()<flash.until){var fa=.5+.5*Math.sin(now*8);flash.cells.forEach(function(ci){var fp=cellXY(ci);ctx.strokeStyle='rgba(192,57,43,'+(.5+.5*fa)+')';ctx.lineWidth=3;ctx.strokeRect(fp.x+2,fp.y+2,S-4,S*K-4);});
  if(flash.zone){VE.zoneCells(flash.zone).forEach(function(ci){var fp=cellXY(ci);ctx.fillStyle='rgba(245,170,53,'+(.12+.15*fa)+')';ctx.fillRect(fp.x,fp.y,S,S*K);});}}
 // compass & labels
 ctx.fillStyle=night?'rgba(255,236,200,.85)':'rgba(36,21,26,.75)';ctx.font='600 '+Math.max(10,S*.17)+'px "DM Mono",monospace';ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.fillText('N · UTTARA',G.ox+4.5*S,G.oy-S*1.02-G.HU*0.2);
 ctx.save();ctx.translate(G.ox+9*S+S*.82,G.oy+4.5*S*K);ctx.rotate(Math.PI/2);ctx.fillText('E · PURVA',0,0);ctx.restore();
 ctx.save();ctx.translate(G.ox-S*.82,G.oy+4.5*S*K);ctx.rotate(-Math.PI/2);ctx.fillText('W · PASCHIMA',0,0);ctx.restore();
 ctx.fillText('S · DAKSHINA',G.ox+4.5*S,G.oy+9*S*K+S*.72);
 var cx0=G.W-S*.62,cy0=S*.62;ctx.fillStyle='rgba(255,250,243,.9)';ctx.beginPath();ctx.arc(cx0,cy0,S*.42,0,7);ctx.fill();ctx.strokeStyle='#792d3c';ctx.lineWidth=1.5;ctx.stroke();
 ctx.fillStyle='#e5562f';ctx.beginPath();ctx.moveTo(cx0,cy0-S*.32);ctx.lineTo(cx0-S*.1,cy0);ctx.lineTo(cx0+S*.1,cy0);ctx.fill();ctx.fillStyle='#792d3c';ctx.beginPath();ctx.moveTo(cx0,cy0+S*.32);ctx.lineTo(cx0-S*.1,cy0);ctx.lineTo(cx0+S*.1,cy0);ctx.fill();
 ctx.fillStyle='#24151a';ctx.font='700 '+Math.max(9,S*.16)+'px Manrope';ctx.fillText('N',cx0,cy0-S*.5+2);
}
function wallH(){var S=G.S,K=G.K,y=G.oy-S*.32,wh=G.HU*.55;
 ctx.fillStyle='#b5533c';ctx.fillRect(G.ox-S*.32,y-wh,9*S+S*.64,wh);ctx.fillStyle='#c96a4f';ctx.fillRect(G.ox-S*.32,y-wh-S*.18*K,9*S+S*.64,S*.18*K);
 for(var x=G.ox-S*.32;x<G.ox+9*S+S*.3;x+=S*.32){ctx.fillStyle='#a54b36';ctx.fillRect(x,y-wh-S*.18*K-S*.12,S*.18,S*.12);}
 gate('N',G.ox+4.5*S,y);
}
function wallSides(){var S=G.S,K=G.K,bh=9*S*K,wh=G.HU*.55;
 // west & east walls
 [G.ox-S*.32,G.ox+9*S+S*.08].forEach(function(x,ix){ctx.fillStyle='#c96a4f';ctx.fillRect(x,G.oy-S*.32-wh,S*.24,bh+S*.6);ctx.fillStyle='rgba(0,0,0,.12)';ctx.fillRect(x+(ix?0:S*.16),G.oy-S*.32-wh,S*.08,bh+S*.6);
  gate(ix?'E':'W',x+S*.12,G.oy+4.5*S*K);});
 // south wall (front)
 var y=G.oy+bh+S*.32;ctx.fillStyle='#b5533c';ctx.fillRect(G.ox-S*.32,y-wh,9*S+S*.64,wh);ctx.fillStyle='#c96a4f';ctx.fillRect(G.ox-S*.32,y-wh-S*.18*K,9*S+S*.64,S*.18*K);
 for(var x2=G.ox-S*.32;x2<G.ox+9*S+S*.3;x2+=S*.32){ctx.fillStyle='#a54b36';ctx.fillRect(x2,y-wh-S*.18*K-S*.12,S*.18,S*.12);}
 gate('S',G.ox+4.5*S,y);
}
function gate(side,x,y){var S=G.S,open=st.gates[side],wh=G.HU*.55;
 if(side==='N'||side==='S'){
  if(open){ctx.fillStyle=side==='N'?'#cbb48a':'#d9c19a';ctx.fillRect(x-S*.36,y-wh-S*.1,S*.72,wh+S*.1);}
  else{ctx.fillStyle='#6b3b28';ctx.fillRect(x-S*.36,y-wh,S*.72,wh);ctx.strokeStyle='rgba(255,220,150,.4)';ctx.beginPath();ctx.moveTo(x,y-wh);ctx.lineTo(x,y);ctx.stroke();}
  // gateway towers (gopura-like)
  [-1,1].forEach(function(s){var tx=x+s*S*.47;ctx.fillStyle=open?'#d98a5a':'#a5604a';ctx.fillRect(tx-S*.13,y-wh-G.HU*.9,S*.26,wh+G.HU*.9);ctx.fillStyle=open?'#f1b43c':'#8a5a48';ctx.beginPath();ctx.moveTo(tx-S*.16,y-wh-G.HU*.9);ctx.lineTo(tx,y-wh-G.HU*1.4);ctx.lineTo(tx+S*.16,y-wh-G.HU*.9);ctx.fill();});
  if(open){ctx.strokeStyle='#f1b43c';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(x-S*.36,y-wh-G.HU*.55);ctx.quadraticCurveTo(x,y-wh-G.HU*.95,x+S*.36,y-wh-G.HU*.55);ctx.stroke();
   for(var k=0;k<5;k++){ctx.fillStyle=k%2?'#e5562f':'#3f8a4a';ctx.beginPath();ctx.arc(x-S*.28+k*S*.14,y-wh-G.HU*.62-Math.sin(k/4*Math.PI)*G.HU*.18,S*.04,0,7);ctx.fill();}}
 } else {
  ctx.fillStyle=open?'#d9c19a':'#6b3b28';ctx.fillRect(x-S*.14,y-S*.32,S*.28,S*.64);
  ctx.fillStyle=open?'#f1b43c':'#8a5a48';ctx.fillRect(x-S*.18,y-S*.4,S*.36,S*.1);ctx.fillRect(x-S*.18,y+S*.3,S*.36,S*.1);
  if(open){ctx.fillStyle='#e5562f';ctx.beginPath();ctx.arc(x,y,S*.06,0,7);ctx.fill();}
 }
}
function drawRoad(i){var p=cellXY(i),S=G.S,K=G.K,r=p.r,c=p.c,cx=p.x+S/2,cy=p.y+S*K/2,w=S*.56;
 ctx.fillStyle='#ddc79e';var on=function(rr,cc){return rr>=0&&cc>=0&&rr<N&&cc<N&&st.g[rr*N+cc]==='road';};
 var gateCell={N:[0,4],S:[8,4],E:[4,8],W:[4,0]};
 var ext={n:on(r-1,c)||(st.gates.N&&r===0&&c===4),s:on(r+1,c)||(st.gates.S&&r===8&&c===4),w:on(r,c-1)||(st.gates.W&&c===0&&r===4),e:on(r,c+1)||(st.gates.E&&c===8&&r===4)};
 ctx.fillRect(cx-w/2,cy-w*K/2,w,w*K);
 if(ext.n)ctx.fillRect(cx-w/2,p.y-(r===0?S*.4:0),w,S*K/2+(r===0?S*.4:0));if(ext.s)ctx.fillRect(cx-w/2,cy,w,S*K/2+(r===8?S*.45:0));
 if(ext.w)ctx.fillRect(p.x-(c===0?S*.35:0),cy-w*K/2,S/2+(c===0?S*.35:0),w*K);if(ext.e)ctx.fillRect(cx,cy-w*K/2,S/2+(c===8?S*.35:0),w*K);
 ctx.fillStyle='rgba(120,90,50,.18)';for(var k=0;k<3;k++){ctx.fillRect(cx-w/2+h32(i,k)*w*.8,cy-w*K/2+h32(i,k+3)*w*K*.8,3,2);}
}
function drawTank(i,now){var p=cellXY(i),S=G.S,K=G.K;
 for(var k=0;k<4;k++){var ins=S*.07*k;ctx.fillStyle=['#c9b38a','#b89c74','#a8895f','#97784f'][k];ctx.fillRect(p.x+S*.06+ins,p.y+(S*.06+ins)*K,S*.88-ins*2,(S*.88-ins*2)*K);}
 var ins2=S*.29,wx=p.x+S*.06+ins2,wy=p.y+(S*.06+ins2)*K,ww=S*.88-ins2*2,wd=(S*.88-ins2*2)*K;var wg=ctx.createLinearGradient(wx,wy,wx,wy+wd);wg.addColorStop(0,'#5ab4e0');wg.addColorStop(1,'#2f7fb0');ctx.fillStyle=wg;ctx.fillRect(wx,wy,ww,wd);
 ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=1.2;for(var j=0;j<3;j++){var o=((now*12+j*S*.18+i*7)%ww);ctx.beginPath();ctx.moveTo(wx+o,wy+wd*(.3+j*.22));ctx.lineTo(Math.min(wx+ww,wx+o+S*.1),wy+wd*(.3+j*.22));ctx.stroke();}
 ctx.fillStyle='#f1b43c';ctx.beginPath();ctx.ellipse(wx+ww*.75,wy+wd*.35,S*.04,S*.025,0,0,7);ctx.fill();
}
function drawTemple(i,now){var p=cellXY(i),S=G.S,K=G.K,HU=G.HU,gx=p.x+S*.12,gy=p.y+S*.15*K,w=S*.76,d=S*.72;
 box(gx,gy,w,d,HU*.28,'#e7d3ad','#c9a77e');
 var bx=p.x+S/2,by=gy+d*K-HU*.28,bw=S*.5,top=by-HU*3.0;
 var g=ctx.createLinearGradient(bx-bw/2,0,bx+bw/2,0);g.addColorStop(0,'#c98a5a');g.addColorStop(.5,'#ecc08a');g.addColorStop(1,'#b5774a');ctx.fillStyle=g;
 ctx.beginPath();ctx.moveTo(bx-bw/2,by);ctx.bezierCurveTo(bx-bw/2,by-HU*1.6,bx-bw*.22,top+HU*.5,bx-bw*.12,top+HU*.25);ctx.lineTo(bx+bw*.12,top+HU*.25);ctx.bezierCurveTo(bx+bw*.22,top+HU*.5,bx+bw/2,by-HU*1.6,bx+bw/2,by);ctx.closePath();ctx.fill();
 ctx.strokeStyle='rgba(110,60,30,.35)';ctx.lineWidth=1;for(var k=1;k<7;k++){var yy=by-(by-top-HU*.25)*k/7,wk=bw/2*(1-Math.pow(k/7,1.6)*.75);ctx.beginPath();ctx.moveTo(bx-wk,yy);ctx.lineTo(bx+wk,yy);ctx.stroke();}
 ctx.fillStyle='#d9a868';ctx.beginPath();ctx.ellipse(bx,top+HU*.2,bw*.2,HU*.12,0,0,7);ctx.fill();
 ctx.fillStyle='#f1b43c';ctx.beginPath();ctx.arc(bx,top+HU*.02,S*.045,0,7);ctx.fill();
 ctx.strokeStyle='#5a3a22';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(bx,top);ctx.lineTo(bx,top-HU*.5);ctx.stroke();
 var wv=Math.sin(now*4+i)*S*.03;ctx.fillStyle='#e5562f';ctx.beginPath();ctx.moveTo(bx,top-HU*.5);ctx.quadraticCurveTo(bx+S*.1,top-HU*.42+wv,bx+S*.2,top-HU*.38+wv);ctx.lineTo(bx,top-HU*.28);ctx.fill();
 ctx.fillStyle='#3a1f14';ctx.beginPath();ctx.moveTo(bx-S*.06,by);ctx.lineTo(bx-S*.06,by-HU*.45);ctx.arc(bx,by-HU*.45,S*.06,Math.PI,0);ctx.lineTo(bx+S*.06,by);ctx.fill();
}
function drawAgni(i,now){var p=cellXY(i),S=G.S,K=G.K,HU=G.HU,gx=p.x+S*.14,gy=p.y+S*.2*K,w=S*.72,d=S*.62,h=HU*1.1;
 box(gx,gy,w,d,h,'#8a5a3c','#a8714a');
 ctx.fillStyle='#6b3b28';ctx.beginPath();ctx.moveTo(gx-S*.04,gy-h);ctx.lineTo(gx+w/2,gy-h-HU*.45);ctx.lineTo(gx+w+S*.04,gy-h);ctx.closePath();ctx.fill();
 var chx=gx+w*.72;ctx.fillStyle='#7d4a34';ctx.fillRect(chx,gy-h-HU*.7,S*.1,HU*.6);
 for(var k=0;k<3;k++){var ph=((now*.6+k/3+i*.13)%1);ctx.fillStyle='rgba(120,110,105,'+(.45*(1-ph))+')';ctx.beginPath();ctx.arc(chx+S*.05+ph*S*.15,gy-h-HU*.75-ph*HU*1.2,S*(.05+ph*.08),0,7);ctx.fill();}
 var fx=gx+w*.35,fy=gy+d*K-h*.3,fl=1+Math.sin(now*12+i)*.15;ctx.fillStyle='#3a1a14';rrect(fx-S*.11,fy-h*.45,S*.22,h*.45,3);ctx.fill();
 ['#e85a2a','#f1b43c','#fff3c0'].forEach(function(c,j){var fw=S*(.08-j*.022),fh=h*(.36-j*.08)*fl;ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(fx-fw,fy);ctx.quadraticCurveTo(fx-fw*.4,fy-fh*.6,fx,fy-fh);ctx.quadraticCurveTo(fx+fw*.4,fy-fh*.6,fx+fw,fy);ctx.fill();});
 var gl=ctx.createRadialGradient(fx,fy-h*.15,0,fx,fy-h*.15,S*.4);gl.addColorStop(0,'rgba(255,170,70,.35)');gl.addColorStop(1,'rgba(255,170,70,0)');ctx.fillStyle=gl;ctx.fillRect(fx-S*.4,fy-h*.15-S*.4,S*.8,S*.8);
}
function drawPalace(i,now){var p=cellXY(i),S=G.S,K=G.K,HU=G.HU,gx=p.x+S*.05,gy=p.y+S*.08*K,w=S*.9,d=S*.84;
 box(gx,gy,w,d,HU*1.5,'#f0d7b0','#e2b989');
 var y1=gy+d*K-HU*1.5;ctx.fillStyle='#7a2b2b';for(var k=0;k<4;k++){var ax=gx+S*.1+k*S*.2;ctx.beginPath();ctx.moveTo(ax,y1+HU*1.4);ctx.lineTo(ax,y1+HU*.75);ctx.arc(ax+S*.05,y1+HU*.75,S*.05,Math.PI,0);ctx.lineTo(ax+S*.1,y1+HU*1.4);ctx.fill();}
 box(gx+S*.18,gy+S*.12*K,w-S*.36,d*.62,HU*2.3,'#f7e2c0','#ecc896');
 [[gx+S*.16,gy+S*.04*K],[gx+w-S*.16,gy+S*.04*K],[gx+w/2,gy+S*.16*K]].forEach(function(q,j){var dy=q[1]-(j===2?HU*2.3:HU*1.5),r=S*(j===2?.13:.08);ctx.fillStyle='#e9c48a';ctx.fillRect(q[0]-r,dy-r*.6,r*2,r*.6);ctx.fillStyle='#f4dcb0';ctx.beginPath();ctx.arc(q[0],dy-r*.6,r,Math.PI,0);ctx.fill();ctx.fillStyle='#f1b43c';ctx.beginPath();ctx.arc(q[0],dy-r*1.65,S*.025,0,7);ctx.fill();});
 var wv=Math.sin(now*3+i)*S*.02,fx=gx+w/2,fy=gy+S*.16*K-HU*2.3-S*.32;ctx.strokeStyle='#5a3a22';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(fx,fy+S*.1);ctx.lineTo(fx,fy-S*.14);ctx.stroke();ctx.fillStyle='#f5aa35';ctx.beginPath();ctx.moveTo(fx,fy-S*.14);ctx.lineTo(fx+S*.16,fy-S*.08+wv);ctx.lineTo(fx,fy-S*.02);ctx.fill();
}
function drawGranary(i){var p=cellXY(i),S=G.S,K=G.K,HU=G.HU,gx=p.x+S*.16,gy=p.y+S*.16*K,w=S*.68,d=S*.64,h=HU*1.5;
 box(gx,gy,w,d,h,'#c9a26a','#b88c55');
 ctx.fillStyle='#8a5a2a';ctx.beginPath();ctx.moveTo(gx-S*.05,gy+d*K-h);ctx.lineTo(gx+w/2,gy+d*K-h-HU*.7);ctx.lineTo(gx+w+S*.05,gy+d*K-h);ctx.closePath();ctx.fill();
 ctx.fillStyle='#a8743a';ctx.fillRect(gx-S*.05,gy-h-S*.02,w+S*.1,d*K-S*.0+2);
 ctx.strokeStyle='rgba(80,50,20,.35)';for(var k=1;k<5;k++){ctx.beginPath();ctx.moveTo(gx+k*w/5,gy+d*K-h+2);ctx.lineTo(gx+k*w/5,gy+d*K);ctx.stroke();}
 ctx.fillStyle='#5a3a1a';ctx.fillRect(gx+w*.4,gy+d*K-h*.55,w*.2,h*.55);
 [[p.x+S*.08,p.y+S*.86*K],[p.x+S*.92,p.y+S*.86*K]].forEach(function(q){ctx.fillStyle='#d9b77a';ctx.fillRect(q[0]-S*.06,q[1]-HU*.7,S*.12,HU*.7);ctx.fillStyle='#b88c55';ctx.beginPath();ctx.ellipse(q[0],q[1]-HU*.7,S*.06,S*.03,0,0,7);ctx.fill();ctx.fillStyle='#e8c66a';ctx.beginPath();ctx.arc(q[0],q[1]-HU*.72,S*.05,Math.PI,0);ctx.fill();});
}
function drawMarket(i,now){var p=cellXY(i),S=G.S,K=G.K,HU=G.HU;
 ctx.fillStyle='#e7d3ad';ctx.fillRect(p.x+S*.06,p.y+S*.1*K,S*.88,S*.8*K);
 var cols=[['#e5562f','#fff3d6'],['#3f8a4a','#fff3d6'],['#f5aa35','#792d3c'],['#1f5fb2','#fff3d6']];
 [[.1,.12],[.54,.12],[.1,.5],[.54,.5]].forEach(function(o,k){var sx=p.x+S*o[0],sy=p.y+S*o[1]*K,sw=S*.36,sd=S*.3,h=HU*.75,c=cols[(k+i)%4];
  ctx.fillStyle='#8a5a3c';ctx.fillRect(sx+2,sy+sd*K-h,2,h);ctx.fillRect(sx+sw-4,sy+sd*K-h,2,h);
  ctx.fillStyle='#c98a5a';ctx.fillRect(sx,sy+sd*K-h*.35,sw,h*.35);
  for(var j=0;j<4;j++){ctx.fillStyle=['#e85a2a','#f1b43c','#7db35a','#d36fb0'][(j+k)%4];ctx.beginPath();ctx.arc(sx+sw*(.2+j*.2),sy+sd*K-h*.4,S*.025,0,7);ctx.fill();}
  for(var s2=0;s2<4;s2++){ctx.fillStyle=c[s2%2];ctx.beginPath();ctx.moveTo(sx+s2*sw/4,sy+sd*K-h);ctx.lineTo(sx+(s2+1)*sw/4,sy+sd*K-h);ctx.lineTo(sx+(s2+1)*sw/4,sy+sd*K-h*1.25);ctx.lineTo(sx+s2*sw/4,sy+sd*K-h*1.25);ctx.fill();}
  ctx.fillStyle=c[0];ctx.fillRect(sx,sy+sd*K-h*1.25-sd*K*.6,sw,sd*K*.6);});
}
var WALLS=['#f0dcc0','#e9c9a0','#f3d6c2','#e6d4b0','#f1e2c6'],ROOFS=['#b5533c','#a8462f','#c06a3c','#9a4a32'];
function drawHouse(i){var p=cellXY(i),S=G.S,K=G.K,HU=G.HU,n=h32(i,9)>.5?2:1;
 for(var k=0;k<n;k++){var w=S*(n===2?.4:.6),d=S*(n===2?.46:.56),gx=p.x+S*(n===2?(k?.54:.06):.2),gy=p.y+S*(n===2?(k?.38:.1):.2)*K,h=HU*(.85+h32(i,k)*.4),wc=WALLS[(i+k)%5],rc=ROOFS[(i*3+k)%4];
  box(gx,gy,w,d,h,shade(wc.replace('#','#'),1.04),wc);
  ctx.fillStyle=rc;ctx.beginPath();ctx.moveTo(gx-S*.03,gy+d*K-h);ctx.lineTo(gx+w/2,gy+d*K-h-HU*.5);ctx.lineTo(gx+w+S*.03,gy+d*K-h);ctx.closePath();ctx.fill();
  ctx.fillStyle=shade(rc,.82);ctx.fillRect(gx-S*.03,gy-h-HU*.02,w+S*.06,d*K);
  ctx.fillStyle='#5a3220';ctx.fillRect(gx+w*.4,gy+d*K-h*.6,w*.2,h*.6);ctx.fillStyle='#3a6ea5';ctx.fillRect(gx+w*.12,gy+d*K-h*.75,w*.14,h*.22);ctx.fillRect(gx+w*.74,gy+d*K-h*.75,w*.14,h*.22);}
}
function drawGarden(i,now){var p=cellXY(i),S=G.S,K=G.K,HU=G.HU;
 ctx.fillStyle='#7fb069';ctx.fillRect(p.x+S*.04,p.y+S*.04*K,S*.92,S*.92*K);
 for(var f=0;f<7;f++){ctx.fillStyle=['#f1b43c','#e85a2a','#fff','#d36fb0'][f%4];ctx.beginPath();ctx.arc(p.x+S*(.12+h32(i,f)*.76),p.y+S*K*(.2+h32(i,f+9)*.7),S*.025,0,7);ctx.fill();}
 [[.3,.35,.22],[.7,.3,.2],[.5,.75,.24]].forEach(function(t,k){var tx=p.x+S*t[0],ty=p.y+S*t[1]*K+S*.18,r=S*t[2],sw=Math.sin(now*1.5+i+k)*S*.01;
  ctx.fillStyle='#6b4a2e';ctx.fillRect(tx-S*.02,ty-HU*.5,S*.04,HU*.5);
  ctx.fillStyle=['#2f6b37','#3a7a40','#45874a'][(i+k)%3];ctx.beginPath();ctx.arc(tx+sw,ty-HU*.5-r*.6,r*.8,0,7);ctx.fill();ctx.fillStyle='rgba(255,255,255,.12)';ctx.beginPath();ctx.arc(tx+sw-r*.25,ty-HU*.5-r*.85,r*.35,0,7);ctx.fill();});
}

/* ---------------- interaction ---------------- */
var dragging=false,lastPaint=-1,changedInDrag=false;
function pos(e){var r=cv.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
function place(i,t){if(i<0)return false;if(t==='erase')t=null;if(st.g[i]===t)return false;st.g[i]=t;if(t)pop[i]=performance.now();return true;}
cv.addEventListener('contextmenu',function(e){e.preventDefault();});
cv.addEventListener('pointerdown',function(e){var p=pos(e),gk=gateAt(p.x,p.y);
 if(gk){pushUndo();st.gates[gk]=!st.gates[gk];changed(true);tip((st.gates[gk]?'Opened':'Closed')+' the <b>'+VE.ZONES[gk].d.toLowerCase()+' gate</b>.'+(gk==='E'||gk==='N'?' East and north gates are considered the most auspicious.':''),2200);return;}
 var i=hitCell(p.x,p.y);if(i<0)return;dragging=true;cv.setPointerCapture(e.pointerId);undoS.push(snap());redoS=[];changedInDrag=false;
 var t=e.button===2?'erase':tool;if(place(i,t))changedInDrag=true;lastPaint=i;ghost=null;$('apply').hidden=true;changed(false);});
cv.addEventListener('pointermove',function(e){var p=pos(e),i=hitCell(p.x,p.y);
 if(dragging){if(i>=0&&i!==lastPaint){var t=(e.buttons&2)?'erase':tool;if(place(i,t))changedInDrag=true;lastPaint=i;changed(false);}return;}
 if(i!==hover){hover=i;if(i>=0){var z=VE.zoneOf(i),Z=VE.ZONES[z],t2=st.g[i];var msg='<b>'+Z.n+'</b> · '+Z.d+' — '+Z.deity+': '+Z.note+'.';if(t2)msg='<b>'+T[t2].n+'</b> ('+T[t2].sk+') in '+Z.n+' · '+Z.d.toLowerCase()+'.';showFloat(msg);}else hideFloat();}
 var g2=gateAt(p.x,p.y);cv.style.cursor=g2?'pointer':'crosshair';if(g2)showFloat('<b>'+VE.ZONES[g2].d+' gate</b> — click to '+(st.gates[g2]?'close':'open')+'.');});
cv.addEventListener('pointerleave',function(){hover=-1;hideFloat();});
function endDrag(){if(!dragging)return;dragging=false;if(!changedInDrag)undoS.pop();syncUndo();changed(true);}
cv.addEventListener('pointerup',endDrag);cv.addEventListener('pointercancel',endDrag);
on(document,'keydown',function(e){if(e.target&&/INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?$('redo').click():$('undo').click();return;}
 if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();$('redo').click();return;}
 var n=parseInt(e.key,10);if(!isNaN(n)&&!e.ctrlKey&&!e.metaKey&&!e.altKey){if(n>=1&&n<=9)setTool(TOOLS[n-1]);else if(n===0)setTool('erase');}});

var fl=$('floaty'),flT=0;function showFloat(h){fl.innerHTML=h;fl.classList.add('show');}function hideFloat(){fl.classList.remove('show');}
function tip(h,ms){showFloat(h);clearTimeout(flT);flT=setTimeout(hideFloat,ms||2400);}
var toastT=0;function toast(m,ms){var t=$('toast');t.innerHTML=m;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(function(){t.classList.remove('show');},ms||2600);}

/* overlay & presets */
function setOverlay(ov){overlay=ov;$('overlaySeg').querySelectorAll('button').forEach(function(x){x.classList.toggle('on',x.dataset.ov===ov);});draw();if(ov==='purusha')ai('<b>Vastu Purusha.</b> Legend says a formless being once covered the whole earth, until the gods pressed him down — 45 of them, each on a part of his body. He lies face-down with his <b>head in the north-east</b> (Ishana) and <b>feet in the south-west</b> (Nairutya). His navel and heart lie under the open <b>Brahmasthana</b> — which is why the centre is never built over, and why heavy buildings go to the south-west.');}
$('overlaySeg').querySelectorAll('button').forEach(function(b){b.onclick=function(){setOverlay(b.dataset.ov);};});
var PRESETS={
 blank:{rows:Array(9).fill('. . . . . . . . .'),gates:{N:false,E:true,S:false,W:false},msg:'Fresh, empty land. The gate faces the sunrise — where will you begin?'},
 sarvato:{rows:['. G G M R M Y W W','. R R R R R R R W','H R H H R H H R Y','H R H T R Y H R H','R R R R R R R R R','H R H Y R Y H R F','P R H H R H H R F','P R R R R R R R .','P P H H R H H F .'],gates:{N:true,E:true,S:true,W:true},msg:'A temple-centred town with streets to four gates, inspired by the Sarvatobhadra plan. Can you push it to 100?'},
 grid:{rows:['H H R H W R H H H','R R R R R R R R R','H H R H H R H G H','H M R H H R H H H','R R R R R R R R R','H H R F H R H H H','H H R H H R P H H','R R R R R R R R R','H H R H H R H H H'],gates:{N:false,E:true,S:false,W:true},msg:'A dense grid of streets and homes, like the planned cities of the Harappan civilisation — built long before the Vastu texts. See how differently it scores.'},
 village:{rows:['. . . . R . Y W W','. G H H R H H W Y','. H R R R R R R Y','. H R . . . R H .','R R R . T . R R R','. H R . . . R H .','. P R R R R R F .','. P H H R H H . .','. . . . R . . . .'],gates:{N:true,E:true,S:true,W:true},msg:'A small village around a temple square. It still lacks a market — and the people need more homes.'}
};
$('preset').onchange=function(){var k=this.value;this.value='';if(!k)return;var P=PRESETS[k];pushUndo();st.g=VE.fromRows(P.rows);st.gates=Object.assign({},P.gates);for(var i=0;i<N*N;i++)if(st.g[i])pop[i]=performance.now()+((i/N)|0)*30;ghost=null;$('apply').hidden=true;quietBest=true;changed(true);quietBest=false;ai(P.msg);};

/* ---------------- scoring UI ---------------- */
var shown=0,lastA=null,quietBest=false;
function animateNum(to){var from=shown,t1=performance.now();(function step(){var e=Math.min(1,(performance.now()-t1)/600);shown=Math.round(from+(to-from)*(1-Math.pow(1-e,3)));$('scoreN').textContent=shown;if(e<1)requestAnimationFrame(step);})();}
function renderScore(){var a=VE.analyse(st);lastA=a;
 animateNum(a.score);$('ringArc').style.strokeDashoffset=326.7*(1-a.score/100);
 var gr=VE.grade(a.score);$('gradeT').textContent=gr[0];$('gradeP').textContent=gr[1];
 if(a.score>best){var was=best;best=a.score;if(!quietBest&&was>0&&best>=90&&was<90)toast('🏆 Sthapati’s masterpiece! Your city scored '+best+'.',3600);if(!quietBest&&((best>=90&&was<90)||(best>=100&&was<100)))milestone(best>=100?'perfect-city':'masterpiece');}
 $('best').textContent=best?'YOUR BEST · '+best:'';
 $('cats').innerHTML=Object.keys(a.cats).map(function(k){var c=a.cats[k];return '<div class="cat-row"><span>'+k+'</span><div class="tr"><i style="width:'+(c.v/c.w*100).toFixed(1)+'%"></i></div><span>'+c.v.toFixed(1)+'/'+c.w+'</span></div>';}).join('');
 var rs=a.rules.slice().sort(function(x,y){return (x.v>=.99)-(y.v>=.99)||(y.w*(1-y.v))-(x.w*(1-x.v));});
 $('rules').innerHTML=rs.map(function(r){var cls=r.v>=.99?'pass':r.v>=.5?'part':'fail',ic=r.v>=.99?'✓':r.v>=.5?'◐':'!';
  return '<button class="rule '+cls+'" data-r="'+r.id+'"><span class="ri">'+ic+'</span><span><span class="cat">'+r.cat+'</span><b>'+r.title+'</b><small>'+r.tip+'</small></span><span class="pts">'+(r.w*r.v).toFixed(1)+'/'+r.w+'</span></button>';}).join('');
 $('rules').querySelectorAll('.rule').forEach(function(b){b.onclick=function(){var r=a.rules.filter(function(q){return q.id===b.dataset.r;})[0];flash={cells:r.cells,zone:r.zone,until:performance.now()+2600};ai('<b>'+r.title+'.</b> '+r.detail+' '+(r.v>=.99?'':'<br>→ '+r.tip));$('wrap').scrollIntoView({behavior:'smooth',block:'nearest'});};});
 counts();
}
function changed(save){renderScore();if(save!==false)persist();syncUndo();questUpdate();draw();}

/* ---------------- Sthapati AI ---------------- */
var aiBusy=false;
function ai(h){$('aiMsg').innerHTML=h;}
function zoneName(i){var z=VE.zoneOf(i);return VE.ZONES[z].n+' ('+VE.ZONES[z].d.toLowerCase()+')';}
$('suggest').onclick=function(){if(aiBusy)return;var m=VE.bestMove(st);
 if(!m){ghost=null;$('apply').hidden=true;ai(lastA.score>=99?'I have nothing to add — this city is complete in every principle I know. 🙏':'I can’t find a single move that raises your score. Try <b>Auto-plan</b>, which tests whole street plans.');return;}
 var why=m.rule?' '+m.rule.detail:'';
 if(m.kind==='gate'){ghost=null;ai('<b>'+(m.open?'Open':'Close')+' the '+VE.ZONES[m.gate].d.toLowerCase()+' gate.</b>'+why+' <span class="mono">(+'+m.gain.toFixed(1)+')</span>');}
 else{ghost={i:m.i,type:m.type};ai((m.type?'Build a <b>'+T[m.type].n+'</b> ('+T[m.type].sk+')':'<b>Clear this plot</b>')+' in '+zoneName(m.i)+' — see the glowing plot.'+why+' <span class="mono">(+'+m.gain.toFixed(1)+')</span>');}
 pendingMove=m;$('apply').hidden=false;};
var pendingMove=null;
$('apply').onclick=function(){var m=pendingMove;if(!m)return;pushUndo();if(m.kind==='gate')st.gates[m.gate]=m.open;else place(m.i,m.type===null?'erase':m.type);ghost=null;pendingMove=null;$('apply').hidden=true;changed(true);ai('Done. '+(lastA.score>=99?'A perfect city!':'Ask again for the next move.'));};
$('explain').onclick=function(){var a=VE.analyse(st),lost=a.rules.filter(function(r){return r.v<.99;}).sort(function(x,y){return y.w*(1-y.v)-x.w*(1-x.v);}).slice(0,3);
 if(!lost.length){ai('Every principle is satisfied — <b>'+a.score+'/100</b>. A true Sthapati’s city.');return;}
 ai('Your city scores <b>'+a.score+'/100</b>. The biggest gains are here:<br>'+lost.map(function(r,k){return (k+1)+'. <b>'+r.title+'</b> (−'+(r.w*(1-r.v)).toFixed(1)+') — '+r.tip;}).join('<br>'));};
$('auto').onclick=function(){if(aiBusy)return;aiBusy=true;['suggest','auto','explain'].forEach(function(id){$(id).disabled=true;});$('apply').hidden=true;ghost=null;
 var it=VE.autoPlan(st),prog=$('prog');prog.style.display='block';ai('Thinking like a Sthapati… testing street plans and every possible building.');
 (function chunk(){var t1=performance.now(),r;
  while(performance.now()-t1<28){r=it.next();if(r.done)break;$('progI').style.width=Math.min(100,((r.value.phase+r.value.step/40)/r.value.of)*100)+'%';}
  if(!r||!r.done){setTimeout(chunk,0);return;}
  var plan=r.value;prog.style.display='none';
  if(!plan){aiBusy=false;['suggest','auto','explain'].forEach(function(id){$(id).disabled=false;});ai('Your plan already beats every street layout I tried. Impressive!');return;}
  pushUndo();var k=0,mv=plan.moves;
  ai('Building a plan worth <b>'+Math.round(plan.sc)+'/100</b> — '+mv.length+' moves. Watch the city rise… (you can undo it all with ↶)');
  (function stepPlace(){if(k>=mv.length){aiBusy=false;['suggest','auto','explain'].forEach(function(id){$(id).disabled=false;});changed(true);ai('Finished: <b>'+lastA.score+'/100</b>. I kept the open centre for the temple and gave each direction its traditional role. Undo (↶) restores your earlier plan.');return;}
   var m=mv[k++];if(m.kind==='gate')st.gates[m.gate]=m.open;else place(m.i,m.type===null?'erase':m.type);
   if(k%3===0||k===mv.length)changed(false);setTimeout(stepPlace,REDUCED?0:45);})();
 })();};

/* ---------------- city card download ---------------- */
$('saveCard').onclick=function(){var a=VE.analyse(st),gr=VE.grade(a.score),W=1200,pad=40,img=cv,ih=Math.round(img.height/img.width*(W-pad*2)),Hh=ih+280;
 var c=document.createElement('canvas');c.width=W;c.height=Hh;var g=c.getContext('2d');
 g.fillStyle='#fffaf3';g.fillRect(0,0,W,Hh);var hd=g.createLinearGradient(0,0,W,0);hd.addColorStop(0,'#301b22');hd.addColorStop(1,'#792d3c');g.fillStyle=hd;g.fillRect(0,0,W,150);
 g.fillStyle='#f8c35b';g.font='500 20px "DM Mono",monospace';g.fillText('MIRAVA · VASTUPLAN AI',pad,52);
 g.fillStyle='#fffaf3';g.font='700 46px "Playfair Display",serif';g.fillText(($('who').hidden?'My':$('who').textContent.replace('Sthapati ','')+'’s')+' city · '+gr[0],pad,112);
 g.fillStyle='#f7b63e';g.font='700 64px "Playfair Display",serif';g.textAlign='right';g.fillText(a.score+'/100',W-pad,110);g.textAlign='left';
 g.drawImage(img,pad,170,W-pad*2,ih);
 g.fillStyle='#24151a';g.font='700 22px Manrope,sans-serif';var y=170+ih+52,x=pad;Object.keys(a.cats).forEach(function(k){var cc=a.cats[k];g.fillText(k+'  '+cc.v.toFixed(1)+'/'+cc.w,x,y);x+=360;});
 g.fillStyle='rgba(36,21,26,.6)';g.font='500 18px Manrope,sans-serif';g.fillText('Designed on the 81-square Vastu Purusha Mandala · mirava',pad,y+42);
 var l=document.createElement('a');l.download='mirava-vastuplan-city.png';l.href=c.toDataURL('image/png');root.appendChild(l);l.click();l.remove();toast('📜 City card saved to your downloads');};

/* ---------------- learn section ---------------- */
var mg=$('mgrid'),ZORDER=['NW','N','NE','W','C','E','SW','S','SE'],BEST={NE:'💧🌳',SE:'🔥',SW:'🏰',NW:'🌾',N:'🛍️🌳',C:'🛕',E:'🚪🌳',S:'',W:''};
ZORDER.forEach(function(z){var Z=VE.ZONES[z],d=document.createElement('button');d.className='zc'+(z==='C'?' c':'');d.style.textAlign='left';
 d.innerHTML='<div class="zd">'+Z.d+'</div><h4>'+Z.n+'</h4><div class="deity">'+Z.deity+'</div><p>'+Z.note.charAt(0).toUpperCase()+Z.note.slice(1)+'.</p><div class="best">'+(BEST[z]||'')+'</div>';
 d.onclick=function(){flash={cells:[],zone:z,until:performance.now()+3000};$('planner').scrollIntoView({behavior:'smooth'});ai('<b>'+Z.n+'</b> — the '+Z.d.toLowerCase()+', guarded by '+Z.deity+': '+Z.note+'.');};mg.appendChild(d);});
// legend
$('legend').innerHTML=['<span><i style="background:rgba(245,170,53,.6);border:1px dashed #f5aa35"></i>Brahmasthana (sacred centre)</span>','<span>Click a gate in the wall to open / close it</span>','<span>Keys 1–9 pick tools · 0 eraser · Ctrl+Z undo</span>'].join('');
// hero art
(function(){var s='',svg=$('heroArt');s+='<g class="spin">';for(var k=0;k<16;k++)s+='<ellipse cy="-78" rx="9" ry="24" fill="#f7b63e" opacity=".55" transform="rotate('+k*22.5+')"/>';s+='</g>';
 for(var r=0;r<9;r++)for(var c=0;c<9;c++){var x=-63+c*14,y=-63+r*14,ctr=r>=3&&r<=5&&c>=3&&c<=5;s+='<rect x="'+x+'" y="'+y+'" width="13" height="13" rx="2" fill="'+(ctr?'#f7b63e':(r+c)%2?'rgba(255,250,243,.16)':'rgba(255,250,243,.08)')+'"/>';}
 s+='<text y="5" text-anchor="middle" font-family="Playfair Display" font-size="13" font-weight="700" fill="#301b22">ब्रह्म</text>';svg.innerHTML=s;})();


/* ================= HERITAGE LAYER ================= */
/* ---- walkers (townsfolk on the streets) ---- */
var walkers=[],wLast=performance.now(),WCOL=['#e5562f','#f5aa35','#792d3c','#1f5fb2','#3f8a4a','#d36fb0','#fff3d6','#8a3fa0'];
function roadNb(i){var r=(i/N)|0,c=i%N,a=[];if(r>0&&st.g[i-N]==='road')a.push(i-N);if(r<N-1&&st.g[i+N]==='road')a.push(i+N);if(c>0&&st.g[i-1]==='road')a.push(i-1);if(c<N-1&&st.g[i+1]==='road')a.push(i+1);return a;}
function drawWalkers(now){var t=performance.now(),dt=Math.min(.1,(t-wLast)/1000);wLast=t;var S=G.S,K=G.K;
 var roads=[];for(var i=0;i<N*N;i++)if(st.g[i]==='road')roads.push(i);
 var want=Math.min(26,Math.floor(roads.length/2.2));
 walkers=walkers.filter(function(w){return st.g[w.a]==='road'&&(w.b===w.a||st.g[w.b]==='road');});
 while(walkers.length>want)walkers.pop();
 while(walkers.length<want&&roads.length){var a=roads[(Math.random()*roads.length)|0];walkers.push({a:a,b:a,p:-1,t:Math.random(),sp:.45+Math.random()*.35,col:WCOL[(Math.random()*WCOL.length)|0],o:(Math.random()-.5)*.36,o2:(Math.random()-.5)*.3,ph:Math.random()*6});}
 walkers.forEach(function(w){if(!REDUCED)w.t+=dt*w.sp;
  if(w.t>=1){w.t=0;w.p=w.a;w.a=w.b;var nb=roadNb(w.a),nb2=nb.filter(function(x){return x!==w.p;});w.b=(nb2.length?nb2:nb.length?nb:[w.a])[(Math.random()*(nb2.length||nb.length||1))|0];}
  var A=cellXY(w.a),B=cellXY(w.b),x=A.x+(B.x-A.x)*w.t+S*(.5+w.o*.5),y=A.y+(B.y-A.y)*w.t+S*K*(.5+w.o2*.6);w.x=x;w.y=y;
  var bob=REDUCED?0:Math.abs(Math.sin(now*7+w.ph))*S*.015,h=S*.13;
  ctx.fillStyle='rgba(0,0,0,.18)';ctx.beginPath();ctx.ellipse(x,y,S*.045,S*.018,0,0,7);ctx.fill();
  ctx.fillStyle=w.col;ctx.beginPath();ctx.moveTo(x-S*.04,y-bob);ctx.lineTo(x+S*.04,y-bob);ctx.lineTo(x+S*.025,y-h*.75-bob);ctx.lineTo(x-S*.025,y-h*.75-bob);ctx.fill();
  ctx.fillStyle='#8a5a3c';ctx.beginPath();ctx.arc(x,y-h*.88-bob,S*.028,0,7);ctx.fill();
  if(w.col==='#e5562f'||w.col==='#d36fb0'){ctx.fillStyle='#24151a';ctx.beginPath();ctx.arc(x,y-h*.94-bob,S*.024,Math.PI,0);ctx.fill();}});
}

/* ---- Deepotsava (night of lamps) ---- */
var night=false;
function glow(x,y,r,a,col){var g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba('+(col||'255,176,70')+','+a+')');g.addColorStop(1,'rgba('+(col||'255,176,70')+',0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
function flame(x,y,s,now,k){var f=1+Math.sin(now*14+k*1.7)*.18;ctx.fillStyle='#fff1b8';ctx.beginPath();ctx.moveTo(x-s*.5,y);ctx.quadraticCurveTo(x,y-s*2.4*f,x+s*.5,y);ctx.fill();}
function diya(x,y,s,now,k){ctx.fillStyle='#b5532c';ctx.beginPath();ctx.ellipse(x,y,s*1.3,s*.55,0,0,Math.PI);ctx.fill();flame(x,y-s*.1,s,now,k);}
function drawNight(now){var S=G.S,K=G.K,HU=G.HU;
 ctx.save();ctx.fillStyle='rgba(16,12,46,.64)';ctx.fillRect(0,0,G.W,G.H);
 var skyH=G.oy-S*.8;for(var k=0;k<80;k++){var tw=.4+.6*Math.abs(Math.sin(now*(1+h32(k,4)*2)+k));ctx.fillStyle='rgba(255,250,230,'+(tw*.9)+')';ctx.fillRect(h32(k,5)*G.W,h32(k,6)*skyH,1.4+h32(k,7)*1.4,1.4+h32(k,7)*1.4);}
 // fireworks (phuljhadi & anar) in the sky
 if(!REDUCED)for(var b=0;b<2;b++){var tt=now/1.7+b*.5,bi=Math.floor(tt),ph=tt-bi;var fx=G.W*(.12+h32(bi,b+11)*.76),fy=skyH*(.25+h32(bi,b+13)*.45),cc=['255,120,80','255,210,90','140,220,255','255,140,220'][(bi+b)%4];
  for(var q=0;q<18;q++){var an=q/18*Math.PI*2,rr=ph*S*1.1;ctx.fillStyle='rgba('+cc+','+(1-ph)+')';ctx.beginPath();ctx.arc(fx+Math.cos(an)*rr,fy+Math.sin(an)*rr+ph*ph*S*.3,1.6,0,7);ctx.fill();}}
 ctx.globalCompositeOperation='lighter';
 for(var i=0;i<N*N;i++){var t=st.g[i];if(!t)continue;var p=cellXY(i),cx=p.x+S/2,cy=p.y+S*K/2;
  if(t==='road'){glow(cx,cy,S*.32,.16);}
  else if(t==='house'){glow(cx,p.y+S*K*.55-HU*.5,S*.55,.42);glow(p.x+S*.2,p.y+S*K*.92,S*.22,.6);glow(p.x+S*.8,p.y+S*K*.92,S*.22,.6);}
  else if(t==='temple'){var by=p.y+S*.15*K+S*.72*K-HU*.28,top=by-HU*3;glow(cx,(by+top)/2,S*1.1,.5);for(var j=0;j<=8;j++){var yy=by-(by-top)*j/8,wk=S*.25*(1-Math.pow(j/8,1.6)*.75);glow(cx-wk,yy,S*.12,.8);glow(cx+wk,yy,S*.12,.8);}}
  else if(t==='tank'){glow(cx,cy,S*.7,.25,'120,170,255');}
  else if(t==='palace'){glow(cx,p.y+S*K*.5-HU*1.4,S*.8,.45);}
  else if(t==='market'){glow(cx,p.y+S*K*.5-HU*.6,S*.6,.5,'255,140,90');}
  else if(t==='agni'){glow(cx,cy-HU*.3,S*.9,.6,'255,110,50');}
  else if(t==='granary'){glow(cx,cy,S*.35,.2);}
  else if(t==='garden'){for(var f=0;f<3;f++)glow(p.x+S*(.2+h32(i,f+20)*.6),p.y+S*K*(.2+h32(i,f+30)*.6),S*.1,.9,'200,255,120');}
 }
 // lamps along the city walls
 for(var x=G.ox-S*.2;x<G.ox+9*S+S*.3;x+=S*.45){glow(x,G.oy-S*.32-HU*.6,S*.16,.7);glow(x,G.oy+9*S*K+S*.32-HU*.6,S*.16,.7);}
 for(var y=G.oy;y<G.oy+9*S*K;y+=S*.45){glow(G.ox-S*.2,y,S*.14,.6);glow(G.ox+9*S+S*.2,y,S*.14,.6);}
 walkers.forEach(function(w){if(w.x)glow(w.x+S*.04,w.y-S*.1,S*.14,.7);});
 ctx.globalCompositeOperation='source-over';
 // diyas: on house fronts, floating on tanks, along walls
 for(i=0;i<N*N;i++){t=st.g[i];if(!t)continue;p=cellXY(i);
  if(t==='house'){diya(p.x+S*.2,p.y+S*K*.92,S*.03,now,i);diya(p.x+S*.8,p.y+S*K*.92,S*.03,now,i+1);}
  else if(t==='tank'){var ins2=S*.29,wx=p.x+S*.06+ins2,wy=p.y+(S*.06+ins2)*K,ww=S*.88-ins2*2,wd=(S*.88-ins2*2)*K;for(var d=0;d<4;d++){var u=(h32(i,d+40)+now*.03*(d%2?1:-1))%1;u=u<0?u+1:u;diya(wx+ww*(.1+u*.8),wy+wd*(.25+d*.17),S*.028,now,d);}}
 }
 for(x=G.ox-S*.2;x<G.ox+9*S+S*.3;x+=S*.45){diya(x,G.oy-S*.32-HU*.55,S*.026,now,x);diya(x,G.oy+9*S*K+S*.32-HU*.55,S*.026,now,x+1);}
 ctx.fillStyle='rgba(255,236,200,.85)';ctx.font='600 '+Math.max(9,S*.14)+'px "DM Mono",monospace';ctx.textAlign='left';ctx.textBaseline='top';ctx.fillText('AMAVASYA · NEW-MOON NIGHT OF DEEPAVALI',S*.3,S*.25);
 ctx.restore();
}

/* ---- Vastu Purusha overlay ---- */
function drawPurusha(){var S=G.S,K=G.K;ctx.save();ctx.translate(G.ox,G.oy);ctx.scale(S,S*K);ctx.translate(4.5,4.5);ctx.rotate(-Math.PI/4);
 ctx.lineJoin='round';ctx.lineCap='round';
 var OUT='rgba(121,45,60,.85)',FILL='rgba(247,190,90,.42)';
 function limb(pts,w){[[w+.16,OUT],[w,FILL]].forEach(function(L){ctx.lineWidth=L[0];ctx.strokeStyle=L[1];ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(var k=1;k<pts.length;k++)ctx.lineTo(pts[k][0],pts[k][1]);ctx.stroke();});}
 // soft halo
 var hg=ctx.createRadialGradient(0,0,0,0,0,5);hg.addColorStop(0,'rgba(247,182,62,.22)');hg.addColorStop(1,'rgba(247,182,62,0)');ctx.fillStyle=hg;ctx.fillRect(-5.5,-5.5,11,11);
 // legs folded outward (knees bent), arms folded with palms joined at the chest
 limb([[-.6,-.55],[-2.5,-2.3],[-4.2,-.8]],.55);limb([[-.6,.55],[-2.5,2.3],[-4.2,.8]],.55);
 limb([[2.5,-.85],[1.5,-2.0],[3.1,-.22]],.42);limb([[2.5,.85],[1.5,2.0],[3.1,.22]],.42);
 // torso and head
 ctx.lineWidth=.08;ctx.strokeStyle=OUT;ctx.fillStyle=FILL;
 ctx.beginPath();ctx.ellipse(1,0,2.15,1.12,0,0,7);ctx.fill();ctx.stroke();
 ctx.beginPath();ctx.arc(4.1,0,.78,0,7);ctx.fill();ctx.stroke();
 // crown & palms
 ctx.fillStyle='#f1b43c';ctx.beginPath();ctx.moveTo(4.8,-.5);ctx.lineTo(5.25,0);ctx.lineTo(4.8,.5);ctx.closePath();ctx.fill();
 ctx.fillStyle='rgba(121,45,60,.85)';ctx.beginPath();ctx.ellipse(3.15,0,.28,.22,0,0,7);ctx.fill();
 // navel over the Brahmasthana
 ctx.fillStyle='#e5562f';ctx.beginPath();ctx.arc(0,0,.2,0,7);ctx.fill();ctx.strokeStyle='rgba(229,86,47,.6)';ctx.lineWidth=.05;ctx.beginPath();ctx.arc(0,0,.45,0,7);ctx.stroke();
 ctx.restore();
 function lab(t,c,r,al){var x=G.ox+c*S,y=G.oy+r*S*K;ctx.font='700 '+Math.max(10,S*.16)+'px Manrope';ctx.textAlign=al||'center';ctx.textBaseline='middle';var w=ctx.measureText(t).width+12;ctx.fillStyle='rgba(48,27,34,.86)';rrect(al==='right'?x-w:al==='left'?x:x-w/2,y-S*.14,w,S*.28,S*.12);ctx.fill();ctx.fillStyle='#f8c35b';ctx.fillText(t,al==='right'?x-6:al==='left'?x+6:x,y);}
 lab('HEAD · ISHANA (NE)',8.9,.35,'right');lab('FEET · NAIRUTYA (SW)',.1,8.65,'left');lab('NAVEL · BRAHMASTHANA',4.5,5.35);
}

/* ---- Ratha Yatra (temple chariot procession) ---- */
var ratha=null,petals=[],soundOn=true,AC=null;
cleanups.push(function(){if(ratha)clearInterval(ratha.iv);if(AC&&AC.close)AC.close().catch(function(){});AC=null;});
try{soundOn=localStorage.getItem('miravaVastuSound')!=='off';}catch(e){}
function syncSound(){$('sound').textContent=soundOn?'🔊 Sound':'🔈 Muted';$('sound').setAttribute('aria-pressed',soundOn);}
$('sound').onclick=function(){soundOn=!soundOn;try{localStorage.setItem('miravaVastuSound',soundOn?'on':'off');}catch(e){}syncSound();};syncSound();
function ringRoute(r0,c0,d){if(r0-d<0||c0-d<0||r0+d>=N||c0+d>=N)return null;var a=[],r,c;
 for(c=c0-d;c<=c0+d;c++)a.push((r0-d)*N+c);for(r=r0-d+1;r<=r0+d;r++)a.push(r*N+c0+d);for(c=c0+d-1;c>=c0-d;c--)a.push((r0+d)*N+c);for(r=r0+d-1;r>r0-d;r--)a.push(r*N+c0-d);
 return a.every(function(i){return st.g[i]==='road';})?a:null;}
function findRoute(){var bestR=null;st.g.forEach(function(t,i){if(t!=='temple')return;for(var d=3;d>=1;d--){var a=ringRoute((i/N)|0,i%N,d);if(a&&(!bestR||a.length>bestR.cells.length)){bestR={temple:i,d:d,cells:a};break;}}});return bestR;}
function tone(f1,f2,dur,vol,type,when){if(!AC||!soundOn)return;var o=AC.createOscillator(),g=AC.createGain(),t=when||AC.currentTime;o.type=type||'sine';o.frequency.setValueAtTime(f1,t);o.frequency.exponentialRampToValueAtTime(f2,t+dur*.8);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);o.connect(g);g.connect(AC.destination);o.start(t);o.stop(t+dur+.02);}
function bell(){if(!AC||!soundOn)return;[880,1320,2210].forEach(function(f,k){tone(f,f*.995,1.6-k*.3,.09/(k+1),'sine');});}
var DHOL=[1,0,2,1,1,0,2,0];
function startRatha(){var R=findRoute();
 if(!R){ai('<b>The chariot needs a ring street.</b> Surround a temple with roads on all eight sides (or build a full square street around the centre) so the ratha can go round it clockwise. The <b>Madurai</b> challenge below shows how the Chithirai and Masi streets do this.');tip('Build a ring of roads around a temple first.',2600);$('heritage').scrollIntoView({behavior:'smooth'});return;}
 if(ratha)return;
 try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();}catch(e){AC=null;}
 var laps=R.d===1?2:1;ratha={cells:R.cells,t0:performance.now(),per:REDUCED?.15:.42,laps:laps,beat:0};ratha.total=R.cells.length*laps;
 $('ratha').disabled=true;bell();
 ratha.iv=setInterval(function(){var s=DHOL[ratha.beat%8];if(s===1)tone(120,48,.28,.5,'sine');else if(s===2){tone(260,140,.12,.25,'triangle');}if(ratha.beat%16===0)bell();ratha.beat++;},230);
 ai('🛕 <b>Ratha Yatra!</b> The deity leaves the temple on a towering wooden chariot. Devotees pull the thick ropes, drums beat and flower petals rain down. The chariot goes round <b>clockwise</b> — <i>pradakshina</i> — keeping the deity on the right. '+(R.d===3?'Like Madurai’s chariots on the outer <b>Masi streets</b> during the Chithirai festival.':'Round the inner temple streets.'));
}
function rathaPos(k){var c=ratha.cells,n=c.length,a=((Math.floor(k)%n)+n)%n,b=(a+1)%n,f=k-Math.floor(k),A=cellXY(c[a]),B=cellXY(c[b]);return{x:A.x+(B.x-A.x)*f+G.S/2,y:A.y+(B.y-A.y)*f+G.S*G.K*.62};}
function rathaK(){return (performance.now()-ratha.t0)/1000/ratha.per;}
function drawRathaRow(r,now){var k=rathaK();if(k>=ratha.total){endRatha();return;}var S=G.S,K=G.K,HU=G.HU;
 // crowd pulling ropes (ahead) and following (behind)
 [ .55,.8,1.05,-.45,-.7].forEach(function(o,ix){var q=rathaPos(k+o);if(Math.floor((q.y-G.oy)/(S*K))!==r)return;
  for(var m=0;m<4;m++){var x=q.x+(m-1.5)*S*.09,y=q.y+((m%2)?S*.05:-S*.03),bob=Math.abs(Math.sin(now*9+m+ix))*S*.02;ctx.fillStyle=WCOL[(m+ix*2)%WCOL.length];ctx.fillRect(x-S*.025,y-S*.1-bob,S*.05,S*.1);ctx.fillStyle='#8a5a3c';ctx.beginPath();ctx.arc(x,y-S*.12-bob,S*.024,0,7);ctx.fill();}});
 var p=rathaPos(k);if(Math.floor((p.y-G.oy)/(S*K))!==r)return;
 // ropes
 var a=rathaPos(k+.55);ctx.strokeStyle='#8a5a2a';ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(p.x-S*.08,p.y-HU*.3);ctx.lineTo(a.x-S*.08,a.y-S*.06);ctx.moveTo(p.x+S*.08,p.y-HU*.3);ctx.lineTo(a.x+S*.08,a.y-S*.06);ctx.stroke();
 var x=p.x,y=p.y,w=S*.62,sw=Math.sin(now*3)*S*.01;
 // wheels
 [-1,1].forEach(function(sd){var wx=x+sd*w*.36,wy=y-S*.05;ctx.fillStyle='#5a3220';ctx.beginPath();ctx.arc(wx,wy,S*.12,0,7);ctx.fill();ctx.strokeStyle='#d9a868';ctx.lineWidth=1.3;ctx.beginPath();ctx.arc(wx,wy,S*.09,0,7);ctx.stroke();for(var s2=0;s2<6;s2++){var an=s2/6*Math.PI+k*1.6;ctx.beginPath();ctx.moveTo(wx+Math.cos(an)*S*.09,wy+Math.sin(an)*S*.09);ctx.lineTo(wx-Math.cos(an)*S*.09,wy-Math.sin(an)*S*.09);ctx.stroke();}});
 // carved wooden base
 ctx.fillStyle='#7a4a2a';ctx.fillRect(x-w/2,y-HU*.75,w,HU*.55);ctx.fillStyle='#a8714a';ctx.fillRect(x-w/2,y-HU*.85,w,HU*.12);
 for(var j=0;j<5;j++){ctx.fillStyle='#5a3220';ctx.fillRect(x-w/2+S*.04+j*w/5.4,y-HU*.68,S*.05,HU*.4);}
 // deity platform & tiered cloth canopy (red and yellow, like Puri's chariots)
 var base=y-HU*.85,top=base-HU*3.2;ctx.fillStyle='#f1b43c';ctx.fillRect(x-S*.07,base-HU*.6,S*.14,HU*.6);ctx.fillStyle='#24151a';ctx.beginPath();ctx.arc(x,base-HU*.42,S*.04,0,7);ctx.fill();
 for(var tr=0;tr<6;tr++){var y1=base-HU*.55-tr*HU*.44,ww=w*(.95-tr*.13);ctx.fillStyle=tr%2?'#f5aa35':'#c0392b';ctx.beginPath();ctx.moveTo(x-ww/2+sw,y1);ctx.lineTo(x+ww/2+sw,y1);ctx.lineTo(x+ww*.4+sw,y1-HU*.46);ctx.lineTo(x-ww*.4+sw,y1-HU*.46);ctx.closePath();ctx.fill();ctx.fillStyle='rgba(255,255,255,.35)';ctx.fillRect(x-ww/2+sw,y1-HU*.06,ww,HU*.05);}
 ctx.fillStyle='#f1b43c';ctx.beginPath();ctx.arc(x+sw,top+HU*.15,S*.05,0,7);ctx.fill();
 ctx.strokeStyle='#5a3a22';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(x+sw,top+HU*.1);ctx.lineTo(x+sw,top-HU*.55);ctx.stroke();
 var wv=Math.sin(now*6)*S*.03;ctx.fillStyle='#e5562f';ctx.beginPath();ctx.moveTo(x+sw,top-HU*.55);ctx.quadraticCurveTo(x+S*.14,top-HU*.48+wv,x+S*.26,top-HU*.42+wv);ctx.lineTo(x+sw,top-HU*.3);ctx.fill();
 // garlands
 ctx.strokeStyle='#ffd56b';ctx.lineWidth=2;ctx.setLineDash([2,2]);ctx.beginPath();ctx.moveTo(x-w*.45,base-HU*.55);ctx.quadraticCurveTo(x,base-HU*.1,x+w*.45,base-HU*.55);ctx.stroke();ctx.setLineDash([]);
 ratha.x=x;ratha.y=top;
 if(!REDUCED&&Math.random()<.6)petals.push({x:x+(Math.random()-.5)*S*1.4,y:top-S*.3-Math.random()*S*.4,vx:(Math.random()-.5)*.4,vy:.3+Math.random()*.5,life:1,c:['#f5aa35','#e5562f','#ffd56b','#d36fb0','#fff'][(Math.random()*5)|0],r:S*(.018+Math.random()*.02)});
}
function drawPetals(){petals=petals.filter(function(q){return q.life>0;});petals.forEach(function(q){q.x+=q.vx;q.y+=q.vy*G.S*.04;q.life-=.012;ctx.globalAlpha=Math.max(0,q.life);ctx.fillStyle=q.c;ctx.beginPath();ctx.ellipse(q.x,q.y,q.r,q.r*.6,q.life*6,0,7);ctx.fill();});ctx.globalAlpha=1;}
function endRatha(){if(!ratha)return;clearInterval(ratha.iv);ratha=null;$('ratha').disabled=false;bell();
 var sv=getSeals(),firstRatha=!sv.ratha;sv.ratha=(sv.ratha||0)+1;saveQ();if(firstRatha)milestone('seal:ratha','Ratha Yatra');renderSeals();
 toast('🙏 Pradakshina complete — the deity returns to the temple.',3200);rain('🌼');
 ai('🙏 <b>Pradakshina complete.</b> The chariot has gone all the way round and the deity is back in the shrine. In Puri, Jagannath’s chariot festival draws over a million pilgrims each year; in Madurai, the Chithirai festival chariots go round the Masi streets.');}
function rain(ch){if(REDUCED)return;for(var k=0;k<26;k++){var d=document.createElement('span');d.className='petal';d.textContent=ch;d.style.left=(Math.random()*100)+'vw';d.style.top='-30px';d.style.animationDelay=(Math.random()*1.2)+'s';d.style.fontSize=(14+Math.random()*12)+'px';root.appendChild(d);setTimeout(function(e){e.remove();}.bind(null,d),4200);}}
$('ratha').onclick=startRatha;
$('deepa').onclick=function(){night=!night;this.classList.toggle('on',night);this.setAttribute('aria-pressed',night);this.textContent=night?'☀ Back to day':'🪔 Deepotsava';
 if(night){var c=VE.analyse(st).cnt||{},h=st.g.filter(function(x){return x==='house';}).length,tp=st.g.indexOf('temple')>=0;
  if(h>=10&&tp){var sv=getSeals();if(!sv.deepa){sv.deepa=1;saveQ();milestone('seal:deepa','Deepotsava');renderSeals(true);toast('🪔 Deepotsava seal earned — your whole city is glowing!',3400);}}
  ai('🪔 <b>Deepotsava.</b> On the new-moon (<i>amavasya</i>) night of Deepavali, rows of clay diyas are lit on every doorstep, wall and temple, and lamps are floated on the water. '+(h>=10&&tp?'Your city of '+h+' homes is ablaze with light.':'Light a city of at least <b>10 homes</b> and a <b>temple</b> to earn the Deepotsava seal (you have '+h+' home'+(h===1?'':'s')+(tp?'':' and no temple')+').'));}
 draw();};
root.querySelectorAll('[data-go]').forEach(function(b){b.onclick=function(){var g=b.dataset.go;$('planner').scrollIntoView({behavior:'smooth'});
 if(g==='ratha')setTimeout(startRatha,REDUCED?0:500);else if(g==='deepa'){if(!night)$('deepa').click();}else setOverlay('purusha');};});

/* ---- heritage city challenges ---- */
var QKEY='miravaVastuQuests',qs={active:null,seals:{},revealed:false},prevOk=[];
function getSeals(){return qs.seals;}
function saveQ(){scheduleSave();}
function qById(id){return VQ.Q.filter(function(q){return q.id===id;})[0]||null;}
function sealSVG(ic,col,on,txt){var s='<svg viewBox="0 0 100 100" aria-hidden="true"><g>';
 for(var k=0;k<24;k++){var a=k/24*Math.PI*2;s+='<circle cx="'+(50+Math.cos(a)*40).toFixed(1)+'" cy="'+(50+Math.sin(a)*40).toFixed(1)+'" r="9" fill="'+(on?col:'rgba(255,250,243,.12)')+'"/>';}
 s+='<circle cx="50" cy="50" r="40" fill="'+(on?col:'rgba(255,250,243,.1)')+'"/><circle cx="50" cy="50" r="31" fill="none" stroke="'+(on?'rgba(255,240,200,.8)':'rgba(255,250,243,.35)')+'" stroke-width="1.5" stroke-dasharray="'+(on?'0':'3 3')+'"/>';
 s+='<path id="arc'+txt.replace(/\W/g,'')+'" d="M22 50 A28 28 0 0 1 78 50" fill="none"/><text font-family="DM Mono" font-size="8" letter-spacing="1.5" fill="'+(on?'#fff3d6':'rgba(255,250,243,.6)')+'"><textPath href="#arc'+txt.replace(/\W/g,'')+'" startOffset="50%" text-anchor="middle">'+txt.toUpperCase()+'</textPath></text>';
 s+='<text x="50" y="66" text-anchor="middle" font-size="24">'+(on?ic:'🔒')+'</text></g></svg>';return s;}
var SEALS=VQ.Q.map(function(q){return {id:q.id,n:q.city,ic:q.ic,col:q.col};}).concat([{id:'ratha',n:'Ratha Yatra',ic:'🛕',col:'#c0392b'},{id:'deepa',n:'Deepotsava',ic:'🪔',col:'#3d2a62'}]);
function renderSeals(anim){var got=SEALS.filter(function(x){return qs.seals[x.id];}).length;
 $('seals').innerHTML='<div class="k">Your seals · '+got+' of '+SEALS.length+'</div>'+SEALS.map(function(x){var on=!!qs.seals[x.id];return '<div class="sl'+(on?' got':'')+'" title="'+x.n+(on?' — earned':' — not yet earned')+'">'+sealSVG(x.ic,x.col,on,x.n)+'<span>'+x.n+'</span></div>';}).join('');}
function renderQGrid(){
 var yrs=[['c. 2500 BCE','Mohenjo-daro',8],['1st millennium CE','Vastu texts',38],['10th–17th c.','Srirangam',60],['16th–17th c.','Madurai',76],['1727 CE','Jaipur',92]];
 $('tline').innerHTML=yrs.map(function(y){return '<span style="left:'+y[2]+'%">'+y[0]+'<br>'+y[1]+'</span>';}).join('');
 $('qgrid').innerHTML=VQ.Q.map(function(q){var done=!!qs.seals[q.id];
  return '<article class="qc'+(qs.active===q.id?' active':'')+'" data-q="'+q.id+'"><div class="art">'+VQ.art(q.id)+'<span class="ic">'+q.ic+'</span>'+(done?'<span class="seal">'+sealSVG(q.ic,q.col,true,q.city)+'</span>':'')+'</div><div class="bd"><div class="era">'+q.era+'</div><h3>'+q.city+'</h3><div class="wh">'+q.where+'</div><p>'+q.story+'</p><div class="fact"><b>Did you know?</b> '+q.fact+'</div>'+(done?'<div class="st">✓ SEAL EARNED · '+q.obj.length+'/'+q.obj.length+' OBJECTIVES</div>':'')+'<button class="btn '+(qs.active===q.id?'line':'ink')+' sm go" data-start="'+q.id+'">'+(qs.active===q.id?'Challenge in progress ↑':done?'Rebuild again':'Take the challenge →')+'</button></div></article>';}).join('');
 $('qgrid').querySelectorAll('[data-start]').forEach(function(b){b.onclick=function(){startQuest(b.dataset.start);};});
}
function startQuest(id){var q=qById(id);if(!q)return;
 if(qs.active===id){$('planner').scrollIntoView({behavior:'smooth'});return;}
 pushUndo();st.g=new Array(N*N).fill(null);st.gates={N:false,E:false,S:false,W:false};qs.active=id;qs.revealed=false;prevOk=[];saveQ();ghost=null;$('apply').hidden=true;
 quietBest=true;changed(true);quietBest=false;renderQGrid();
 $('planner').scrollIntoView({behavior:'smooth'});
 ai(q.ic+' <b>'+q.city+'</b> ('+q.era+'). '+q.story.split('. ')[0]+'. The land is cleared — your objectives are in the panel. Your previous plan is one ↶ away.');
}
function leaveQuest(){qs.active=null;qs.revealed=false;saveQ();questUpdate();renderQGrid();ai('Challenge closed. Your city stays on the board — keep building freely.');}
function revealQuest(){var q=qById(qs.active);if(!q)return;pushUndo();st.g=VE.fromRows(q.sol);st.gates=Object.assign({},q.gates);for(var i=0;i<N*N;i++)if(st.g[i])pop[i]=performance.now()+((i/N)|0)*45+(i%N)*12;qs.revealed=true;saveQ();quietBest=true;changed(true);quietBest=false;
 ai('📜 <b>The historic layout of '+q.city+'</b>, simplified onto the mandala. Study it, then press ↶ and try it yourself — the seal is earned only for a city you build. Notice its Vastu score: '+lastA.score+'/100. '+(q.id==='mohenjo'?'The Harappans built 2,000 years before the Vastu texts were written, so the mandala rules don’t fit them well!':''));}
function isSol(q){return JSON.stringify(st.g)===JSON.stringify(VE.fromRows(q.sol));}
function questUpdate(){var card=$('questCard'),q=qById(qs.active);if(!q){card.hidden=true;card.innerHTML='';return;}
 var ok=VQ.check(q,st),n=ok.filter(Boolean).length,all=n===ok.length,shown=qs.revealed&&isSol(q);card.hidden=false;
 card.innerHTML='<div class="qh"><div class="qart">'+VQ.art(q.id)+'</div><div><div class="k">Heritage challenge</div><h3>'+q.ic+' '+q.city+'</h3><div class="era">'+q.era.toUpperCase()+' · '+q.where.toUpperCase()+'</div></div></div>'+
  '<div class="qbar"><i style="width:'+(n/ok.length*100)+'%"></i></div><div class="qcount">'+n+' OF '+ok.length+' OBJECTIVES</div>'+
  '<ul class="objs">'+q.obj.map(function(o,k){return '<li data-o="'+k+'"'+(o.hl?' title="Show me where" style="cursor:pointer"':'')+' class="'+(ok[k]?'ok':'')+(ok[k]&&prevOk.length&&!prevOk[k]?' just':'')+'"><i>'+(ok[k]?'✓':'')+'</i><span>'+o.t+(o.hl?' <small style="color:var(--orange);font-weight:700">· show</small>':'')+'</span></li>';}).join('')+'</ul>'+
  (all&&qs.seals[q.id]&&!shown?'<div class="qdone">'+sealSVG(q.ic,q.col,true,q.city)+'<span><b>'+q.city+' rebuilt!</b> You earned its seal. Try another city below.</span></div>':'')+
  (all&&shown?'<div class="qdone"><span>📜 This is the historic layout. Press <b>↶</b> and build it yourself to earn the seal.</span></div>':'')+
  '<details><summary>The story of '+q.city+'</summary><p style="margin-top:6px">'+q.story+'</p></details>'+
  '<div class="qacts"><button class="btn line sm" id="qReveal">📜 Reveal the historic layout</button><button class="btn line sm" id="qLeave">Leave challenge</button></div>';
 $('qReveal').onclick=revealQuest;$('qLeave').onclick=leaveQuest;
 card.querySelectorAll('[data-o]').forEach(function(li){var o=q.obj[+li.dataset.o];if(o.hl)li.onclick=function(){flash={cells:o.hl(),zone:null,until:performance.now()+2600};$('wrap').scrollIntoView({behavior:'smooth',block:'nearest'});};});
 if(all&&!shown&&!qs.seals[q.id]){qs.seals[q.id]=1;saveQ();milestone('seal:'+q.id,q.city);renderSeals(true);renderQGrid();toast(q.ic+' '+q.city+' rebuilt — seal earned!',3600);rain(q.id==='mohenjo'?'🏺':'🌸');questUpdate();return;}
 prevOk=ok;
}
renderQGrid();renderSeals();

/* ---------------- boot ---------------- */
on(window,'resize',function(){clearTimeout(layout.t);layout.t=setTimeout(layout,120);});
$('sun').addEventListener('input',function(){var t=+this.value,h=Math.floor(t),m=Math.round((t-h)*60);$('sunT').textContent=String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');draw();});
layout();changed(false);syncUndo();
function applyRemote(d){var had=false;if(d&&typeof d==='object'){
 var q=d.quests;if(q&&typeof q==='object'){var rs=q.seals&&typeof q.seals==='object'?q.seals:{};Object.keys(rs).forEach(function(k){if(rs[k]&&!qs.seals[k])qs.seals[k]=rs[k];});
  if(!dirty){qs.active=qById(q.active)?q.active:null;qs.revealed=!!q.revealed;}}
 if(!dirty)had=loadSaved(d.plan);else if(d.plan)best=Math.max(best,+d.plan.best||0);}
 loaded=true;prevOk=[];renderQGrid();renderSeals();quietBest=true;changed(false);quietBest=false;syncUndo();
 if(had&&lastA.score>0)ai('Welcome back! Your city scores <b>'+lastA.score+'/100</b>. Ask me for the next move.');
 if(dirty)scheduleSave();else lastSaved=JSON.stringify(stateBlob());}
mv.loadState(STATE_KEY).then(function(d){if(!disposed)applyRemote(d);},function(){if(!disposed)applyRemote(null);});
var vis=true;if('IntersectionObserver' in window){var io=new IntersectionObserver(function(es){vis=es[0].isIntersecting;});io.observe(cv);cleanups.push(function(){io.disconnect();});}
(function loop(){if(disposed)return;if(vis&&!document.hidden)draw();setTimeout(function(){requestAnimationFrame(loop);},REDUCED?400:33);})();

return function cleanup() {
  flushSave();
  disposed = true;
  timers.forEach(function (id) { window.clearTimeout(id); }); timers.clear();
  intervals.forEach(function (id) { window.clearInterval(id); }); intervals.clear();
  frames.forEach(function (id) { window.cancelAnimationFrame(id); }); frames.clear();
  cleanups.reverse().forEach(function (fn) { try { fn(); } catch (e) {} });
  root.querySelectorAll('.petal').forEach(function (p) { p.remove(); });
};
}
