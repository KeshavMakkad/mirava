// @ts-nocheck
/* eslint-disable */
/**
 * Lost Legends of Bharat — classic 2D open-world edition (top-down canvas
 * subcontinent, seven heritage-site mini-games, treasures, codex), ported from
 * the hackathon's public/classic-game.html. The engine is kept verbatim as an
 * imperative module; changes:
 *  - DOM lookups are scoped to `appRoot`; window/document listeners, timers,
 *    intervals, RAF loops and the WebAudio context are torn down on cleanup.
 *  - Progress (was localStorage 'll2_save_<name>') lives in the Mirava state API
 *    under 'll2_save'; the explorer name comes from the signed-in profile
 *    (the guest name prompt / "Switch explorer" are gone).
 *  - Finishing the Fading Lamps questline submits a 'lost-legends' score once.
 *  - MiravaI18n calls are guarded (the runtime may load after this module).
 */
export function initClassicGame(appRoot, host, hooks = {}) {
const STORE_KEY='ll2_save';
let disposed=false;
const cleanups=[];
const on=(target,type,fn,opts)=>{target.addEventListener(type,fn,opts);cleanups.push(()=>target.removeEventListener(type,fn,opts));};
const addEventListener=(type,fn,opts)=>on(window,type,fn,opts);
const removeEventListener=(type,fn,opts)=>window.removeEventListener(type,fn,opts);
const timers=new Set(),intervals=new Set();
const setTimeout=(fn,ms)=>{const id=window.setTimeout(()=>{timers.delete(id);if(!disposed)fn();},ms);timers.add(id);return id;};
const clearTimeout=id=>{timers.delete(id);window.clearTimeout(id);};
const setInterval=(fn,ms)=>{const id=window.setInterval(fn,ms);intervals.add(id);return id;};
const clearInterval=id=>{intervals.delete(id);window.clearInterval(id);};
let pendingSave=null,saveTimer=0;
const flushSave=()=>{
 if(saveTimer){window.clearTimeout(saveTimer);saveTimer=0;}
 if(pendingSave){const v=pendingSave;pendingSave=null;host.saveState(STORE_KEY,v);}
};
const queueRemoteSave=snap=>{pendingSave=snap;if(!saveTimer)saveTimer=window.setTimeout(()=>{saveTimer=0;flushSave();},1500);};
const I18N_FALLBACK={
 language:()=>'en',locale:()=>'en-IN',
 t:(v,p)=>p?String(v).replace(/\{(\w+)\}/g,(m,k)=>k in p?String(p[k]):m):v,
 translate:()=>{},translateHTML:h=>h,
 drawLiteral:(g,v,...a)=>g.fillText(v,...a),
};
const I18n=()=>window.MiravaI18n||I18N_FALLBACK;

/* =====================================================================
   LOST LEGENDS OF BHARAT — Mirava
   ===================================================================== */
const $=id=>appRoot.querySelector('#'+id);
// HUD values are often rewritten every frame. Translate at the write boundary so
// English never flashes between animation frames; retain original source text.
const gameTextState=new Map();
function gameText(id,source){
 const el=$(id);if(!el)return;
 source=String(source==null?'':source);
 const language=I18n().language(),previous=gameTextState.get(id);
 if(previous&&previous.source===source&&previous.language===language)return;
 const prefixed=source.match(/^([^\p{L}\p{N}]+)([\p{L}][\s\S]*)$/u);
 if(prefixed){const copy=document.createElement('span');copy.textContent=prefixed[2];el.replaceChildren(document.createTextNode(prefixed[1]),copy);}
 else el.textContent=source;
 I18n().translate(el);
 gameTextState.set(id,{source,language});
}

// Brahmi remains the inscription being decoded. Answer IDs stay Roman; the
// pronunciation key is shown in the reader's chosen script.
const gameSyllablesHi={ka:'क',ga:'ग',ja:'ज',ta:'त',da:'द',na:'न',pa:'प',ma:'म',ya:'य',ra:'र',la:'ल',va:'व',sa:'स',vana:'वन',jala:'जल',kamala:'कमल',nagara:'नगर',nayana:'नयन'};
const gameSyllable=source=>I18n().language()==='hi'?(gameSyllablesHi[source]||source):source;
function updateGameSyllables(){
 appRoot.querySelectorAll('[data-game-syllable]').forEach(el=>{el.textContent=gameSyllable(el.dataset.gameSyllable);});
}
function updateGameHeadings(){
 const title=appRoot.querySelector('[data-game-heading="legend"]');
 if(title)title.innerHTML=I18n().language()==='hi'?I18n().t('Lost Legends of Bharat'):'Lost <span>Legends</span> of Bharat';
 const lamps=appRoot.querySelector('[data-game-lamps]');
 if(lamps)lamps.innerHTML=I18n().t('The lamps are <em>'+lamps.dataset.gameLamps+'</em>.');
}
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const dist=(ax,ay,bx,by)=>Math.hypot(ax-bx,ay-by);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ri=n=>Math.floor(Math.random()*n);
function shuffle(a,rng){rng=rng||Math.random;for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function hash2(ix,iy,s){let h=Math.imul(ix,374761393)^Math.imul(iy,668265263)^Math.imul(s,1442695041);h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return(h>>>0)/4294967296;}
function vnoise(x,y,s){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);const a=hash2(ix,iy,s),b=hash2(ix+1,iy,s),c=hash2(ix,iy+1,s),d=hash2(ix+1,iy+1,s);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;}
function fbm(x,y,s,o){o=o||4;let t=0,a=.5,f=1,n=0;for(let i=0;i<o;i++){t+=a*vnoise(x*f,y*f,s+i*17);n+=a;a*=.5;f*=2;}return t/n;}

/* ===================== WORLD CONSTANTS ===================== */
const TS=40,W=4400,H=5000,COLS=W/TS,ROWS=H/TS,TPX=10,FOG=160,FC=Math.ceil(W/FOG),FR=Math.ceil(H/FOG),DAY_LEN=240;
const P=(nx,ny)=>({x:W*(0.04+0.92*nx),y:H*(0.03+0.94*ny)});
const INDIA=[[.36,0],[.52,.07],[.62,.15],[.75,.16],[.82,.29],[.75,.38],[.83,.47],[.72,.54],[.68,.70],[.59,.76],[.57,.99],[.49,.86],[.42,.79],[.36,.67],[.25,.59],[.28,.47],[.19,.40],[.25,.27],[.28,.13]].map(p=>P(p[0],p[1]));
const T={DEEP:0,SHALLOW:1,SAND:2,GRASS:3,FOREST:4,DESERT:5,DRY:6,MOUNT:7,SNOW:8,RIVER:9,ROAD:10};

/* ===================== CONTENT ===================== */
const SITES=[
 {id:'mithila',name:'Mithila Grove',icon:'🎨',at:[.68,.33],game:'memory',xp:60,kicker:'Madhubani Memory',
  lore:'Madhubani — or Mithila — painting comes from the Mithila region of Bihar and Nepal. For generations women painted it on the mud walls of their homes for weddings and festivals; fish, peacocks, the lotus and the sun recur as auspicious motifs, and borders are as important as the scene inside them.',
  how:'Flip two tiles at a time and match all eight Madhubani motifs. Fewer moves earn more stars.',
  relic:{icon:'🖌️',name:'Mithila Brush',desc:'A bamboo brush tipped with cloth, like those used to paint Madhubani lines with natural colours.'}},
 {id:'ashoka',name:"Ashoka's Pillar",icon:'🦁',at:[.46,.18],game:'cipher',xp:70,kicker:'The Brahmi Cipher',
  lore:'In the 3rd century BCE the Mauryan emperor Ashoka had his edicts carved on rocks and polished sandstone pillars across the subcontinent, mostly in Prakrit written in the Brahmi script. The Lion Capital found at Sarnath is now the national emblem of India.',
  how:"Read the weathered Brahmi syllables. Use the key carved beside the pillar and tap the syllables in order to restore each word. In later rounds the key is worn away — trust your memory.",
  relic:{icon:'🦁',name:'Lion Capital Replica',desc:"A miniature of Ashoka's four lions from Sarnath — today the national emblem of India."}},
 {id:'ajanta',name:'Ajanta Caves',icon:'🪔',at:[.40,.51],game:'lamps',xp:80,kicker:'Lamps of Ajanta',
  lore:'The Ajanta caves in Maharashtra are rock-cut Buddhist monuments created between roughly the 2nd century BCE and the 5th century CE. Their murals are among the finest surviving examples of ancient Indian painting, and the site is a UNESCO World Heritage Site.',
  how:"Tap the diyas before their embers die. Light 15 lamps to reveal the hidden mural. Don't startle the bats — it costs you time.",
  relic:{icon:'🪔',name:'Eternal Lamp',desc:'A diya relit in the Ajanta caves, where painters once worked by lamplight.'}},
 {id:'dholavira',name:'Dholavira Reservoirs',icon:'💧',at:[.27,.43],game:'pipes',xp:90,kicker:'Waterworks of Dholavira',
  lore:'Dholavira, in the Rann of Kutch in Gujarat, was a city of the Harappan civilisation. In a dry landscape its people built an elaborate system of dams, channels and stone reservoirs to capture every drop of rain. It became a UNESCO World Heritage Site in 2021.',
  how:'Tap the channel stones to rotate them and lead water from the reservoir on the left to the city on the right.',
  relic:{icon:'💠',name:'Reservoir Seal',desc:'A square seal in the Harappan style, like those found across Indus cities.'}},
 {id:'hampi',name:'Hampi Musical Pillars',icon:'🎵',at:[.47,.66],game:'rhythm',xp:100,kicker:'Song of the Stone Pillars',
  lore:'Hampi was the capital of the Vijayanagara empire from the 14th to the 16th century. In its Vittala temple stand the famous musical pillars, which ring with different notes when tapped, near the iconic stone chariot.',
  how:'Strike the pillars as the glowing notes reach the lotus line. Use keys D F J K (or tap the pillars).',
  relic:{icon:'🎶',name:'Pillar Note',desc:"A ringing note captured from Hampi's musical pillars."}},
 {id:'konark',name:'Konark Sun Temple',icon:'☀️',at:[.67,.53],game:'wheel',xp:110,kicker:'The Wheel of Surya',
  lore:'The Konark Sun Temple in Odisha was built in the 13th century by King Narasimhadeva I of the Eastern Ganga dynasty. It was designed as the colossal chariot of the sun god Surya, with 24 carved stone wheels pulled by seven horses.',
  how:'Turn the rings until all three sun-markers meet at the top. The inner ring also turns the middle ring, and the middle also turns the outer.',
  relic:{icon:'☸️',name:'Sun Wheel Spoke',desc:"A carved spoke from one of Konark's 24 stone wheels, which are said to work as sundials."}},
 {id:'nalanda',name:'Nalanda Mahavihara',icon:'📚',at:[.60,.24],game:'quiz',xp:150,kicker:'The Masters of Nalanda',
  lore:'Nalanda in Bihar was a great Buddhist monastic university that flourished from about the 5th to the 12th century. Scholars travelled from across Asia to study there — the Chinese pilgrim Xuanzang among them. Its ruins are a UNESCO World Heritage Site.',
  how:"Answer the masters' questions: seven questions, fifteen seconds each.",
  relic:{icon:'📿',name:'Nalanda Seal',desc:'A terracotta seal of the great Mahavihara — the symbol of a library that drew scholars from across Asia.'}}
];
const LANDMARKS=[
 {id:'himalaya',name:'Himalayan Foothills',icon:'🏔️',at:[.42,.08],lore:'The Himalaya are among the youngest mountain ranges on Earth. Their glaciers feed the great rivers of the north — the Ganga rises at the Gangotri glacier.'},
 {id:'thar',name:'Thar Desert',icon:'🐪',at:[.33,.30],lore:'The Great Indian Desert stretches across Rajasthan into Pakistan. Its towns are famous for folk music, mirror-work textiles and camel fairs such as Pushkar.'},
 {id:'rann',name:'Rann of Kutch',icon:'✨',at:[.22,.40],lore:'A vast seasonal salt marsh in Gujarat. In the dry season it turns into a dazzling white salt plain — home of the Indian wild ass.'},
 {id:'sanchi',name:'Sanchi Stupa',icon:'☸️',at:[.47,.42],lore:'The Great Stupa at Sanchi in Madhya Pradesh was first commissioned by Ashoka in the 3rd century BCE. Its richly carved stone gateways were added in later centuries.'},
 {id:'banyan',name:'The Great Banyan',icon:'🌳',at:[.55,.36],lore:"The banyan is India's national tree. Its aerial roots grow down into new trunks, so a single old banyan can look like a whole grove."},
 {id:'sundarbans',name:'Sundarbans',icon:'🐅',at:[.74,.34],lore:'The largest mangrove forest in the world, shared by India and Bangladesh where the Ganga meets the sea — home of the Bengal tiger.'},
 {id:'chilika',name:'Chilika Lake',icon:'🐬',at:[.72,.48],lore:"A brackish-water lagoon in Odisha and one of Asia's largest. Migratory birds arrive in winter, and Irrawaddy dolphins live in its waters."},
 {id:'deccan',name:'Deccan Traps',icon:'🌋',at:[.40,.59],lore:'Thick layers of volcanic basalt laid down about 66 million years ago — around the time the dinosaurs disappeared.'},
 {id:'ghats',name:'Western Ghats',icon:'⛰️',at:[.43,.75],lore:'A mountain range along the west coast that catches the monsoon rains. It is a UNESCO-listed biodiversity hotspot, older than the Himalaya.'},
 {id:'kanyakumari',name:'Kanyakumari',icon:'🌅',at:[.55,.90],lore:'The southern tip of mainland India, where the Arabian Sea, the Bay of Bengal and the Indian Ocean meet. Sunrise and sunset can both be seen over the water.'}
];
const NPCS=[
 {id:'dadi',name:'Dadi Saraswati',role:'Keeper of Stories',at:[.452,.347],av:'👵🏽',look:{k:'#f3efe4',p:'#cfc6b4',s:'#9c6a46',h:'bun',hc:'#ece6da'},
  intro:['Ah — a traveller at last! Come, sit by the fire.','Look around you, child. The great places of this land are <b>fading</b>. Their lamps of memory flicker, and the stories inside them grow quiet.','Seven sites hold the oldest flames — from the painted walls of <b>Mithila</b> to the halls of <b>Nalanda</b>. Restore them, one by one.','Begin with <b>Mithila Grove</b> to the east. Follow the golden light. And talk to the villagers — they know where old treasures sleep.'],
  repeat:['Walk with <b>WASD</b>, run with <b>Shift</b>, press <b>E</b> to talk or dig, and <b>M</b> to open your map.','Tired? Rest by my fire with <b>E</b> and wake at dawn — or at dusk, if you love the stars.']},
 {id:'arun',name:'Arun',role:'Wandering Trader',at:[.50,.385],av:'🧔🏽',look:{k:'#3a6ea5',p:'#e9e1cf',s:'#a8714a',h:'pagri',hc:'#b0262f'},
  intro:['Namaste! I trade salt from Kutch and silk from the east — and stories, for free.','Here is one worth more than silk: treasure lies buried by <b>the Great Banyan</b>, a little east of here — dig on the <b>south-east</b> side of its stone marker.','And at the <b>Sanchi Stupa</b>, just south of me, something old rests on the <b>west</b> side of the marker.'],
  repeat:['Banyan — south-east of the marker. Sanchi — to the west. Happy hunting!']},
 {id:'meera',name:'Meera',role:'Weaver of Mithila',at:[.63,.37],av:'👩🏽',look:{k:'#b0262f',p:'#f1b43c',s:'#9c6a46',h:'bun',hc:'#1b1210'},
  intro:['You walk like someone who has come a long way. My loom has been quiet since the colours began to fade.','My cousin collects honey in the <b>Sundarbans</b> far to the east, where the river meets the sea. She hid a jar <b>north-west</b> of the stone marker there.','And pashmina traders lost a bundle in the <b>Himalayan Foothills</b>, far to the north-west — <b>south-east</b> of the marker.'],
  repeat:['Sundarbans — north-west of the marker. Himalaya — south-east of it.']},
 {id:'vikram',name:'Vikram',role:'Camel Herder',at:[.30,.36],av:'👳🏽‍♂️',look:{k:'#efe6d2',p:'#e8dfcc',s:'#8f5d3b',h:'pagri',hc:'#e2731f'},
  intro:['Ho! My camels can smell water three villages away. Me, I can smell treasure.','North of here, in the <b>Thar Desert</b>, a musician buried his instrument <b>east</b> of the marker, a little north.','And west, out on the white salt of the <b>Rann of Kutch</b>, look <b>south-east</b> of the marker.'],
  repeat:['Thar — east of the marker. Rann — south-east. Mind the salt glare!']},
 {id:'lakshmi',name:'Lakshmi',role:'Potter of the Deccan',at:[.50,.56],av:'👩🏾',look:{k:'#2f7d6a',p:'#d9c9a8',s:'#7a4a2c',h:'bun',hc:'#1b1210'},
  intro:['Careful — that pot is still wet! Clay remembers every fingerprint, you know.','West of my wheel, on the black rock of the <b>Deccan Traps</b>, a royal coin lies <b>north-west</b> of the marker.','Further south-west, in the green <b>Western Ghats</b>, spice traders left a sack <b>north-east</b> of the marker.'],
  repeat:['Deccan Traps — north-west. Western Ghats — north-east.']},
 {id:'ravi',name:'Ravi',role:'Boatman of the South',at:[.53,.82],av:'🧑🏾',look:{k:'#f1f1ea',p:'#2f4f8f',s:'#6b3f24',h:'cap',hc:'#1b1210'},
  intro:['The sea brings everything back in time, friend — even stories.','Go south to <b>Kanyakumari</b>, where three seas meet. A pearl waits a short way <b>north</b> of the marker.'],
  repeat:['Kanyakumari — just north of the marker. Watch the sunrise while you dig!']},
 {id:'sana',name:'Sana',role:'Star-gazer',at:[.63,.45],av:'👩🏽‍🔬',look:{k:'#2f4f8f',p:'#d9d0bf',s:'#a8714a',h:'bun',hc:'#2a1a12'},
  intro:['Shh — the sky is talking. Every night the stars rise four minutes earlier, did you know?','East of here lies <b>Chilika Lake</b>. A painted scroll is hidden <b>west</b> of its marker, a little south.','And when night falls, carry your lantern. Some things only glow in the dark.'],
  repeat:['Chilika — west of the marker. And look up tonight!']}
];
const TREASURES=[
 {icon:'🪔',name:'Brass Diya',desc:'An oil lamp of beaten brass. Lamps like this have lit Indian homes, temples and festivals like Diwali for centuries.',xp:20,rarity:'common'},
 {icon:'🌸',name:'Torana Fragment',desc:'A carved sandstone fragment from a stupa gateway, covered in scenes of animals, trees and processions.',xp:25,rarity:'rare'},
 {icon:'🍯',name:'Sundarbans Honey',desc:'Wild honey from the mangroves, gathered by honey collectors who brave the tiger country every spring.',xp:20,rarity:'common'},
 {icon:'🎻',name:'Ravanahatha',desc:'A bowed string instrument from Rajasthan, played by folk musicians of the desert.',xp:30,rarity:'rare'},
 {icon:'🪞',name:'Kutch Mirror-work',desc:'Embroidery from Kutch, stitched with tiny mirrors that sparkle like the salt plains.',xp:25,rarity:'rare'},
 {icon:'🪙',name:'Gold Varaha',desc:'A small gold coin of the Vijayanagara empire, often stamped with a deity or a boar.',xp:40,rarity:'epic'},
 {icon:'🌶️',name:'Sack of Black Pepper',desc:'Pepper from the Malabar coast was so prized in ancient trade that it was called "black gold".',xp:25,rarity:'rare'},
 {icon:'🦪',name:'Gulf of Mannar Pearl',desc:'Pearls from the southern seas were famous in the ancient world and traded as far as Rome.',xp:40,rarity:'epic'},
 {icon:'🖼️',name:'Pattachitra Scroll',desc:'A painted cloth scroll from Odisha, telling myths in bold lines and natural colours.',xp:30,rarity:'rare'},
 {icon:'🧣',name:'Pashmina Shawl',desc:'Woven from the fine undercoat of Changthangi goats raised high in Ladakh.',xp:40,rarity:'epic'}
];
const CHESTS=[{lm:'banyan',o:[60,70]},{lm:'sanchi',o:[-85,30]},{lm:'sundarbans',o:[-70,-60]},{lm:'thar',o:[90,-40]},{lm:'rann',o:[70,60]},{lm:'deccan',o:[-60,-70]},{lm:'ghats',o:[70,-50]},{lm:'kanyakumari',o:[-20,-90]},{lm:'chilika',o:[-90,40]},{lm:'himalaya',o:[80,70]}].map((c,i)=>Object.assign(c,{id:'c'+i,t:i}));
const SCROLLS=[
 {t:'Zero',x:'Around 628 CE the mathematician Brahmagupta wrote down rules for calculating with zero as a number in its own right.'},
 {t:'Aryabhata',x:'In 499 CE Aryabhata proposed that the Earth spins on its axis, explaining why the stars appear to move across the sky.'},
 {t:'Sushruta',x:'The Sushruta Samhita, an ancient Sanskrit medical text, describes many surgical procedures and instruments — including reconstruction of the nose.'},
 {t:'Chaturanga',x:'Chess grew out of chaturanga, a game played in India around the 6th century, with infantry, cavalry, elephants and chariots.'},
 {t:'Panini',x:"Pāṇini's Aṣṭādhyāyī, composed around the 4th century BCE, describes Sanskrit grammar in about four thousand compact rules."},
 {t:'Iron Pillar',x:'The Iron Pillar in Delhi has stood for more than 1,600 years with remarkably little rust.'},
 {t:'Stepwells',x:'Stepwells like Rani ki Vav in Patan let people walk down many storeys to reach water. Rani ki Vav is a UNESCO World Heritage Site.'},
 {t:'Wootz Steel',x:'Crucible steel from southern India, known as wootz, was prized across the ancient world and used for famous "Damascus" blades.'},
 {t:'Cotton',x:'The people of the Harappan civilisation were among the first in the world to spin and weave cotton.'},
 {t:'Tirukkural',x:'The Tirukkural, a Tamil classic, holds 1,330 short couplets on ethics, statecraft and love.'},
 {t:'Kathakali',x:"In Kathakali, Kerala's dance-drama, the colours of the elaborate make-up tell the audience what kind of character is on stage."},
 {t:'Jantar Mantar',x:'In the 18th century Sawai Jai Singh II built the Jantar Mantar observatory in Jaipur, including a giant stone sundial.'}
];
const QUIZ=[
 ['Nalanda flourished as a centre of learning in which present-day state?',['Bihar','Gujarat','Kerala','Punjab'],0],
 ["Ashoka's edicts were mostly written in which script?",['Brahmi','Devanagari','Tamil','Gurmukhi'],0],
 ['Konark Sun Temple is designed as the chariot of which deity?',['Surya','Indra','Varuna','Agni'],0],
 ['Hampi was the capital of which empire?',['Vijayanagara','Mauryan','Mughal','Chola'],0],
 ['How many carved wheels does the Konark Sun Temple have?',['12','24','8','32'],1],
 ['Which Chinese pilgrim studied at Nalanda in the 7th century?',['Xuanzang','Marco Polo','Ibn Battuta','Faxian'],0],
 ['The Lion Capital of Ashoka was found at…',['Sarnath','Delhi','Sanchi','Pataliputra'],0],
 ['Dholavira lies in which region?',['Rann of Kutch','Thar Desert','Western Ghats','Sundarbans'],0],
 ['Madhubani painting comes from which region?',['Mithila','Malabar','Marwar','Konkan'],0],
 ['The Vittala temple at Hampi is famous for its…',['Musical pillars','Glass mosaics','Golden dome','Iron pillar'],0],
 ['The Ajanta caves are best known for their…',['Buddhist murals','Mughal gardens','Bronze idols','Iron tools'],0],
 ['The Great Bath was discovered at…',['Mohenjo-daro','Hampi','Konark','Nalanda'],0],
 ['Bharatanatyam developed in which present-day state?',['Tamil Nadu','Punjab','Assam','Rajasthan'],0],
 ['Kathakali is a dance-drama from…',['Kerala','Odisha','Gujarat','Bihar'],0],
 ['Which emperor embraced Buddhism after the Kalinga war?',['Ashoka','Akbar','Harsha','Chandragupta II'],0],
 ['Chilika Lake is in which state?',['Odisha','Kerala','Goa','Haryana'],0],
 ['Sanchi is famous for its…',['Great Stupa','Sun Temple','Stepwell','Fort'],0],
 ['The Indus Valley script is…',['Still undeciphered','Fully decoded','Identical to Brahmi','Written in Tamil'],0],
 ['The world\'s largest mangrove forest is the…',['Sundarbans','Western Ghats','Rann of Kutch','Thar'],0],
 ['Who wrote down rules for calculating with zero around 628 CE?',['Brahmagupta','Kalidasa','Panini','Tulsidas'],0]
];
const ACH=[
 {id:'steps',i:'👣',n:'First Steps',d:'Walk your first 500 paces.'},
 {id:'restore1',i:'🪔',n:'Lamp Lighter',d:'Restore your first heritage site.'},
 {id:'restoreAll',i:'👑',n:'Keeper of Bharat',d:'Restore all seven sites.'},
 {id:'perfect',i:'🌟',n:'Flawless Legacy',d:'Earn three stars at every site.'},
 {id:'chest5',i:'🎁',n:'Treasure Hunter',d:'Unearth five hidden treasures.'},
 {id:'chestAll',i:'💎',n:'Master Seeker',d:'Unearth all ten treasures.'},
 {id:'scrollAll',i:'📜',n:'Scholar of Scrolls',d:'Collect all twelve lore scrolls.'},
 {id:'lmAll',i:'🗺️',n:'Wanderer of the Land',d:'Discover all ten landmarks.'},
 {id:'friends',i:'🤝',n:'Friend of All',d:'Speak with every villager.'},
 {id:'night',i:'🌙',n:'Night Owl',d:'Roam for a full minute under the stars.'},
 {id:'monsoon',i:'🌧️',n:'Monsoon Child',d:'Walk through the monsoon rain.'},
 {id:'carto',i:'🧭',n:'Cartographer',d:'Reveal 60% of the land.'},
 {id:'photo',i:'📸',n:'Postcard Collector',d:'Take a postcard of your journey.'}
];
const RIVERS=[
 {n:'Ganga',p:[[.38,.10],[.40,.20],[.50,.27],[.63,.28],[.71,.30],[.77,.345],[.80,.385]]},
 {n:'Narmada',p:[[.53,.455],[.45,.462],[.37,.47],[.27,.485]]},
 {n:'Godavari',p:[[.39,.555],[.48,.585],[.58,.605],[.69,.62]]},
 {n:'Kaveri',p:[[.46,.775],[.52,.79],[.585,.80]]}
];
const ROADS=[['camp','ashoka'],['camp','nalanda'],['nalanda','mithila'],['camp','arun'],['arun','banyan'],['camp','vikram'],['vikram','dholavira'],['vikram','thar'],['camp','sanchi'],['sanchi','ajanta'],['ajanta','lakshmi'],['lakshmi','hampi'],['hampi','ravi'],['ravi','kanyakumari'],['arun','sana'],['sana','konark'],['mithila','meera'],['meera','sana'],['lakshmi','deccan']];
const TITLES=['Wanderer','Seeker','Pathfinder','Chronicler','Guardian','Sage','Living Legend'];
const levelOf=xp=>Math.floor(Math.sqrt(xp/40))+1;
const xpFor=L=>40*(L-1)*(L-1);
const titleOf=L=>TITLES[Math.min(L-1,TITLES.length-1)];

/* ===================== SAVE ===================== */
const DEF=()=>({v:2,playT:0,submitted:false,xp:0,stars:{},chests:[],scrolls:[],lms:[],npcs:[],ach:[],explored:'',pos:null,time:.3,items:[],travel:0,nightT:0,rainT:0,settings:{sound:true,music:true,hi:true},intro:false,track:'main',ended:false});
let S=DEF(),pname='Explorer';
async function load(){
 try{const d=await host.loadState(STORE_KEY);
  if(d&&typeof d==='object'){S=Object.assign(DEF(),d);S.settings=Object.assign(DEF().settings,d.settings||{});}
  else S=DEF();
 }catch(e){S=DEF();}
}
function save(){
 try{if(game.running)S.pos=[Math.round(player.x),Math.round(player.y)];if(world)S.explored=Array.from(world.explored).join('');
  queueRemoteSave(JSON.parse(JSON.stringify(S)));}catch(e){}
}
function miravaUser(){
 const p=host.me&&host.me.profile;
 return p?(p.display_name||p.username||null):null;
}
// Completing the Fading Lamps questline counts as a Lost Legends completion
// on the Mirava leaderboard.
function submitCompletion(){
 if(S.submitted)return;S.submitted=true;save();
 host.submitScore('lost-legends',{score:S.xp,time_taken_seconds:Math.round(S.playT||0),completed:true,
  meta:{edition:'classic',stars:SITES.reduce((a,s)=>a+(S.stars[s.id]||0),0),treasures:S.chests.length,scrolls:S.scrolls.length,landmarks:S.lms.length}})
 .then(res=>{
  if(!res){S.submitted=false;return;}
  if(disposed)return;hooks.onScore?.(res);
  const badges=(res.new_badges||[]).map(b=>(b.icon||'✦')+' '+esc(b.name)).join(', ');
  toast('✦ <b>+'+res.xp_earned+' Mirava XP</b>'+(badges?'<br>'+badges:''),'',5200);
 });
}

/* ===================== SOUND (synthesised, no files) ===================== */
const Sound={ctx:null,
 init(){
  if(this.ctx){if(this.ctx.state==='suspended')this.ctx.resume();return;}
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  try{this.ctx=new AC();}catch(e){return;}
  const c=this.ctx;this.master=c.createGain();this.master.gain.value=.55;this.master.connect(c.destination);
  const len=c.sampleRate;this.nbuf=c.createBuffer(1,len,c.sampleRate);const d=this.nbuf.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
  // rain bed
  const rs=c.createBufferSource();rs.buffer=this.nbuf;rs.loop=true;const rf=c.createBiquadFilter();rf.type='bandpass';rf.frequency.value=1400;rf.Q.value=.4;
  this.rainG=c.createGain();this.rainG.gain.value=0;rs.connect(rf);rf.connect(this.rainG);this.rainG.connect(this.master);rs.start();
  this.music=setInterval(()=>this.droneTick(),4000);
 },
 get ok(){return this.ctx&&S.settings.sound;},
 tone(f,d,type,v,slide,delay){if(!this.ok)return;const c=this.ctx,t=c.currentTime+(delay||0);const o=c.createOscillator(),g=c.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,f*slide),t+d);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(v||.1,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(g);g.connect(this.master);o.start(t);o.stop(t+d+.05);},
 noise(d,v,f,type,delay){if(!this.ok)return;const c=this.ctx,t=c.currentTime+(delay||0);const s=c.createBufferSource();s.buffer=this.nbuf;const fl=c.createBiquadFilter();fl.type=type||'bandpass';fl.frequency.value=f||1000;const g=c.createGain();g.gain.setValueAtTime(v||.1,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);s.connect(fl);fl.connect(g);g.connect(this.master);s.start(t);s.stop(t+d+.02);},
 tap(){this.tone(660,.08,'triangle',.07);},
 chime(){[880,1175,1568].forEach((f,i)=>this.tone(f,.5,'sine',.07,0,i*.06));},
 pickup(){this.tone(740,.15,'triangle',.09);this.tone(1110,.3,'sine',.07,0,.08);},
 buzz(){this.tone(150,.25,'sawtooth',.05,.7);},
 step(w){this.noise(.06,w?.05:.02,w?900:450);},
 dig(){this.noise(.3,.14,280,'lowpass');this.noise(.2,.1,320,'lowpass',.22);},
 tabla(f,v){f=f||110;v=v||.22;this.tone(f*2.2,.32,'sine',v,.55);this.noise(.05,v*.35,2600);},
 pillar(f){this.tone(f,1.3,'sine',.17);this.tone(f*2.76,.6,'sine',.045);this.tone(f*5.4,.25,'sine',.02);},
 fanfare(){[523,659,784,1047].forEach((f,i)=>this.tone(f,.5,'triangle',.08,0,i*.11));},
 bird(){const f=2000+Math.random()*1200;this.tone(f,.12,'sine',.02,1.35);this.tone(f*1.1,.1,'sine',.016,1.3,.14);},
 cricket(){for(let i=0;i<3;i++)this.tone(4300,.04,'sine',.01,0,i*.07);},
 pluck(f,delay){if(!this.ok)return;const c=this.ctx,t=c.currentTime+delay;const fl=c.createBiquadFilter();fl.type='lowpass';fl.Q.value=5;fl.frequency.setValueAtTime(2200,t);fl.frequency.exponentialRampToValueAtTime(480,t+2.6);const g=c.createGain();g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.03,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+3.6);[1,1.003].forEach(m=>{const o=c.createOscillator();o.type='sawtooth';o.frequency.value=f*m;o.connect(fl);o.start(t);o.stop(t+3.7);});fl.connect(g);g.connect(this.master);},
 droneTick(){if(!this.ok||!S.settings.music||!game.running||game.ui==='minigame'||document.hidden)return;[196,261.6,261.6,130.8].forEach((f,i)=>this.pluck(f,i*1));},
 setRain(v){if(this.ctx&&this.rainG)this.rainG.gain.setTargetAtTime(S.settings.sound?v*.1:0,this.ctx.currentTime,.6);}
};

/* ===================== WORLD GENERATION ===================== */
let world=null;
function sdPoly(x,y){
 let inside=false,md=1e9;
 for(let i=0,j=INDIA.length-1;i<INDIA.length;j=i++){
  const a=INDIA[i],b=INDIA[j];
  if(((a.y>y)!==(b.y>y))&&(x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x))inside=!inside;
  const dx=b.x-a.x,dy=b.y-a.y,t=clamp(((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy),0,1);
  md=Math.min(md,Math.hypot(x-(a.x+dx*t),y-(a.y+dy*t)));
 }
 return inside?md:-md;
}
function placeAll(){
 const camp=P(.44,.34);world.camp={x:camp.x,y:camp.y,name:'Storyteller\'s Camp',icon:'🏕️'};
 SITES.forEach(s=>{const p=P(s.at[0],s.at[1]);s.x=p.x;s.y=p.y;});
 LANDMARKS.forEach(l=>{const p=P(l.at[0],l.at[1]);l.x=p.x;l.y=p.y;});
 NPCS.forEach(n=>{const p=P(n.at[0],n.at[1]);n.hx=n.x=p.x;n.hy=n.y=p.y;n.tx=n.x;n.ty=n.y;n.wait=Math.random()*3;n.face=1;n.walk=0;n.moving=false;});
 CHESTS.forEach(c=>{const l=LANDMARKS.find(q=>q.id===c.lm);c.x=l.x+c.o[0];c.y=l.y+c.o[1];});
}
function pt(key){
 if(key==='camp')return world.camp;
 return SITES.find(s=>s.id===key)||LANDMARKS.find(s=>s.id===key)||NPCS.find(s=>s.id===key);
}
function genWorld(){
 world={};placeAll();
 const rng=mulberry32(1947);
 const tiles=new Uint8Array(COLS*ROWS),sd=new Float32Array(COLS*ROWS),bridge=new Uint8Array(COLS*ROWS);
 const pois=[];
 pois.push({x:world.camp.x,y:world.camp.y,r:340,c:200});
 SITES.forEach(s=>pois.push({x:s.x,y:s.y,r:330,c:210}));
 LANDMARKS.forEach(l=>pois.push({x:l.x,y:l.y,r:240,c:l.id==='banyan'||l.id==='sanchi'?150:80}));
 NPCS.forEach(n=>pois.push({x:n.x,y:n.y,r:180,c:100}));
 CHESTS.forEach(c=>pois.push({x:c.x,y:c.y,r:130,c:50}));
 world.pois=pois;
 const mith=SITES[0],sund=LANDMARKS.find(l=>l.id==='sundarbans');
 for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
  const x=(c+.5)*TS,y=(r+.5)*TS,i=r*COLS+c;
  let s=sdPoly(x,y)+(fbm(x/420,y/420,7)-.5)*280;
  for(const p of pois){const d=dist(x,y,p.x,p.y);if(d<p.r)s=Math.max(s,(1-d/p.r)*320+40);}
  sd[i]=s;
  if(s<-90){tiles[i]=T.DEEP;continue;}
  if(s<0){tiles[i]=T.SHALLOW;continue;}
  const nx=(x/W-.04)/.92,ny=(y/H-.03)/.94,m=fbm(x/700,y/700,3);
  let t;
  if(ny<.115+(m-.5)*.06)t=ny<.06?T.SNOW:T.MOUNT;
  else if(nx<.37&&ny>.22&&ny<.47&&m<.62)t=T.DESERT;
  else if(dist(x,y,mith.x,mith.y)<430||dist(x,y,sund.x,sund.y)<320)t=T.FOREST;
  else if(ny>.5&&nx<.48&&s<330)t=T.FOREST;
  else if(ny>.47&&ny<.78)t=m>.6?T.GRASS:T.DRY;
  else t=m>.64?T.FOREST:T.GRASS;
  if(s<55&&t!==T.FOREST&&t!==T.SNOW)t=T.SAND;
  tiles[i]=t;
 }
 // rivers
 const stampLine=(pts,wFn,fn)=>{
  for(let k=0;k<pts.length-1;k++){
   const a=pts[k],b=pts[k+1],L=dist(a.x,a.y,b.x,b.y),steps=Math.ceil(L/12);
   for(let s=0;s<=steps;s++){
    const tt=s/steps,x=lerp(a.x,b.x,tt),y=lerp(a.y,b.y,tt),w=wFn((k+tt)/(pts.length-1));
    const c0=Math.floor((x-w)/TS),c1=Math.floor((x+w)/TS),r0=Math.floor((y-w)/TS),r1=Math.floor((y+w)/TS);
    for(let r=r0;r<=r1;r++)for(let c=c0;c<=c1;c++){if(r<0||c<0||r>=ROWS||c>=COLS)continue;if(dist((c+.5)*TS,(r+.5)*TS,x,y)<=w)fn(r*COLS+c,(c+.5)*TS,(r+.5)*TS);}
   }
  }
 };
 world.rivers=RIVERS.map(rv=>{
  const raw=rv.p.map(q=>P(q[0],q[1]));const pts=[];
  for(let k=0;k<raw.length-1;k++){const a=raw[k],b=raw[k+1];for(let s=0;s<6;s++){const t=s/6,nx=-(b.y-a.y),ny=b.x-a.x,l=Math.hypot(nx,ny)||1;const wob=Math.sin((k*6+s)*1.3)*40*(s?1:0);pts.push({x:lerp(a.x,b.x,t)+nx/l*wob,y:lerp(a.y,b.y,t)+ny/l*wob});}}
  pts.push(raw[raw.length-1]);
  stampLine(pts,t=>24+t*26,(i,x,y)=>{if(tiles[i]===T.DEEP||tiles[i]===T.SHALLOW)return;for(const p of pois)if(dist(x,y,p.x,p.y)<p.c*.8)return;tiles[i]=T.RIVER;});
  return {n:rv.n,pts};
 });
 // roads
 world.roads=[];
 ROADS.forEach(([a,b],ri2)=>{
  const A=pt(a),B=pt(b);if(!A||!B)return;const pts=[];const n=Math.max(6,Math.ceil(dist(A.x,A.y,B.x,B.y)/120));
  const nx=-(B.y-A.y),ny=B.x-A.x,l=Math.hypot(nx,ny)||1,amp=40+rng()*70,ph=rng()*6;
  for(let s=0;s<=n;s++){const t=s/n,wob=Math.sin(t*Math.PI)*Math.sin(t*Math.PI*2+ph)*amp;pts.push({x:lerp(A.x,B.x,t)+nx/l*wob,y:lerp(A.y,B.y,t)+ny/l*wob});}
  world.roads.push(pts);
  stampLine(pts,()=>22,i=>{if(tiles[i]===T.DEEP)return;if(tiles[i]===T.RIVER)bridge[i]=1;tiles[i]=T.ROAD;});
 });
 world.tiles=tiles;world.sd=sd;world.bridge=bridge;
 // terrain canvas
 const tc=document.createElement('canvas');tc.width=COLS*TPX;tc.height=ROWS*TPX;const g=tc.getContext('2d');
 const BASE={0:[29,75,110],1:[64,145,176],2:[226,205,150],3:[118,166,88],4:[60,118,64],5:[228,192,124],6:[176,170,104],7:[132,124,112],8:[234,240,242],9:[78,158,194],10:[200,170,116]};
 for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
  const i=r*COLS+c,t=tiles[i],x=(c+.5)*TS,y=(r+.5)*TS;let col=BASE[t].slice();
  if(t===T.DEEP){const f=clamp(-sd[i]/700,0,1);col=[lerp(40,16,f),lerp(96,46,f),lerp(132,84,f)];}
  if(t===T.GRASS||t===T.DRY||t===T.FOREST){const m=fbm(x/500,y/500,21);col[0]+=(.5-m)*40;col[1]+=(m-.5)*26;}
  if(t===T.ROAD&&bridge[i])col=[132,92,58];
  const j=1+(fbm(x/90,y/90,11)-.5)*.24+(hash2(c,r,5)-.5)*.06;
  g.fillStyle=`rgb(${col[0]*j|0},${col[1]*j|0},${col[2]*j|0})`;g.fillRect(c*TPX,r*TPX,TPX,TPX);
  if(t>=T.SAND&&t!==T.RIVER){for(let k=0;k<3;k++){const h=hash2(c*3+k,r,9),sh=h>.5?1.12:.88;g.fillStyle=`rgba(${col[0]*sh|0},${col[1]*sh|0},${col[2]*sh|0},.8)`;g.fillRect(c*TPX+(hash2(c,r+k,3)*8|0),r*TPX+(hash2(c+k,r,4)*8|0),2,2);}}
  if(t===T.ROAD&&bridge[i]){g.fillStyle='rgba(60,36,20,.5)';g.fillRect(c*TPX,r*TPX+3,TPX,1);g.fillRect(c*TPX,r*TPX+7,TPX,1);}
 }
 world.terrain=tc;
 // decorations
 const decos=[],ground=[];
 const BW=400,BC=Math.ceil(W/BW),BR=Math.ceil(H/BW);world.BW=BW;world.BC=BC;
 const bk=Array.from({length:BC*BR},()=>[]),gbk=Array.from({length:BC*BR},()=>[]);
 const nearPoi=(x,y)=>{for(const p of pois)if(dist(x,y,p.x,p.y)<p.c)return true;return false;};
 const greens={3:['#4f8f45','#3f7f3a','#5d9b4c'],4:['#2f6b37','#285f30','#3a7a40'],6:['#7a8f45','#6b8040','#8a9a4c']};
 for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
  const t=tiles[r*COLS+c];if(t<=T.SHALLOW||t===T.RIVER||t===T.ROAD)continue;
  const x=c*TS+rng()*TS,y=r*TS+rng()*TS;if(nearPoi(x,y))continue;
  const ny=(y/H-.03)/.94,roll=rng(),s=sd[r*COLS+c];let d=null;
  if(t===T.FOREST){if(roll<.5)d=(ny>.6&&rng()<.35)?{k:'palm',s:26+rng()*10,r:7}:{k:'tree',s:20+rng()*14,r:9,c:greens[4][ri(3)]};else if(roll<.62)ground.push({x,y,k:'tuft'});}
  else if(t===T.GRASS){if(roll<.1)d=(ny>.66||(s<200&&ny>.45))?{k:'palm',s:26+rng()*10,r:7}:{k:'tree',s:18+rng()*12,r:9,c:greens[3][ri(3)]};else if(roll<.2)ground.push({x,y,k:'flower',c:['#f1b43c','#e85a2a','#f3efe4','#d36fb0'][ri(4)]});else if(roll<.32)ground.push({x,y,k:'tuft'});}
  else if(t===T.DRY){if(roll<.06)d={k:'rock',s:14+rng()*16,r:0};else if(roll<.11)d={k:'tree',s:16+rng()*8,r:9,c:greens[6][ri(3)]};else if(roll<.2)ground.push({x,y,k:'tuft',dry:1});}
  else if(t===T.DESERT){if(roll<.045)d={k:'shrub',s:14+rng()*10,r:6};else if(roll<.16)ground.push({x,y,k:'ripple'});}
  else if(t===T.SAND){if(roll<.05&&ny>.4)d={k:'palm',s:24+rng()*10,r:7};}
  else if(t===T.MOUNT){if(roll<.25)d={k:'pine',s:22+rng()*12,r:8};else if(roll<.36)d={k:'rock',s:16+rng()*18,r:0};}
  else if(t===T.SNOW){if(roll<.12)d={k:'pine',s:20+rng()*10,r:8,snow:1};else if(roll<.2)d={k:'rock',s:14+rng()*14,r:0,snow:1};}
  if(d){d.x=x;d.y=y;if(d.k==='rock'){d.r=d.s*.45;d.pts=[];for(let k=0;k<7;k++){const a=k/7*Math.PI*2;d.pts.push([Math.cos(a)*d.s*(.7+rng()*.4),Math.sin(a)*d.s*.55*(.7+rng()*.4)-d.s*.3]);}}
   d.ph=rng()*6;decos.push(d);bk[Math.floor(y/BW)*BC+Math.floor(x/BW)].push(d);}
 }
 ground.forEach(gd=>gbk[Math.floor(gd.y/BW)*BC+Math.floor(gd.x/BW)].push(gd));
 world.decos=decos;world.bk=bk;world.gbk=gbk;
 // scrolls
 world.scrolls=[];let tries=0;
 while(world.scrolls.length<SCROLLS.length&&tries<20000){tries++;
  const x=200+rng()*(W-400),y=200+rng()*(H-400),t=tileT(x,y);if(t<=T.SHALLOW||t===T.RIVER)continue;
  if(pois.some(p=>dist(x,y,p.x,p.y)<260))continue;
  const minD=tries<12000?650:300;if(world.scrolls.some(s=>dist(x,y,s.x,s.y)<minD))continue;
  world.scrolls.push({x,y,i:world.scrolls.length});
 }
 // fog
 world.explored=new Uint8Array(FC*FR);world.land=new Uint8Array(FC*FR);let landN=0;
 for(let r=0;r<FR;r++)for(let c=0;c<FC;c++){const t=tileT((c+.5)*FOG,(r+.5)*FOG);if(t!==T.DEEP){world.land[r*FC+c]=1;landN++;}}
 world.landN=landN;
 if(S.explored&&S.explored.length===FC*FR)for(let i=0;i<FC*FR;i++)world.explored[i]=S.explored.charCodeAt(i)===49?1:0;
 const fc=document.createElement('canvas');fc.width=FC;fc.height=FR;const fg=fc.getContext('2d');
 fg.fillStyle='rgba(16,10,12,.9)';fg.fillRect(0,0,FC,FR);
 for(let i=0;i<FC*FR;i++)if(world.explored[i])fg.clearRect(i%FC,Math.floor(i/FC),1,1);
 world.fog=fc;world.fogCtx=fg;
 // clouds & birds
 world.clouds=Array.from({length:14},()=>({x:rng()*W,y:rng()*H,r:260+rng()*320,s:14+rng()*12}));
}
function tileT(x,y){const c=Math.floor(x/TS),r=Math.floor(y/TS);if(c<0||r<0||c>=COLS||r>=ROWS)return T.DEEP;return world.tiles[r*COLS+c];}

/* ===================== GAME STATE ===================== */
const game={running:false,ui:null,time:0,raf:0,last:0,zoom:1,dpr:1,VW:0,VH:0,dark:0,dusk:0,sun:1,rain:0,rainTarget:0,rainTimer:120,region:'',regionHold:0,hudT:0,saveT:0,stepT:0,shake:0,ambT:0,parts:[],target:null,touch:false,sprintLock:false};
const player={x:0,y:0,face:1,walk:0,moving:false,stam:1,idle:0,sprint:false};
const pet={x:0,y:0,face:1,fan:0,walk:0};
const cam={x:0,y:0};
const keys={};
let stickV={x:0,y:0,id:null,ox:0,oy:0};
const cv=$('cv'),ctx=cv.getContext('2d'),lightCv=document.createElement('canvas'),lctx=lightCv.getContext('2d'),mini=$('mini'),mctx=mini.getContext('2d');

/* ===================== PROGRESSION ===================== */
const done=id=>!!S.stars[id];
const unlocked=i=>i===0||done(SITES[i-1].id);
function addXP(n,x,y){
 const before=levelOf(S.xp);S.xp+=n;
 if(x!==undefined)floatText('+'+n+' XP',x,y-40,'#f8c950');
 const after=levelOf(S.xp);
 if(after>before){Sound.fanfare();toast(`⬆️ Level ${after} — you are now a <b>${titleOf(after)}</b>`,'',3600);burst(player.x,player.y-20,'#f8c950',40);}
 updateHUD(true);
}
function unlockAch(id){
 if(S.ach.includes(id))return;S.ach.push(id);const a=ACH.find(q=>q.id===id);
 achToast(a);Sound.fanfare();addXP(25);save();
}
function checkAch(){
 if(S.travel>2000)unlockAch('steps');
 const r=SITES.filter(s=>done(s.id)).length;if(r>=1)unlockAch('restore1');if(r>=7)unlockAch('restoreAll');
 if(SITES.every(s=>S.stars[s.id]===3))unlockAch('perfect');
 if(S.chests.length>=5)unlockAch('chest5');if(S.chests.length>=10)unlockAch('chestAll');
 if(S.scrolls.length>=SCROLLS.length)unlockAch('scrollAll');
 if(S.lms.length>=LANDMARKS.length)unlockAch('lmAll');
 if(S.npcs.length>=NPCS.length)unlockAch('friends');
 if(S.nightT>=60)unlockAch('night');
 if(S.rainT>=8)unlockAch('monsoon');
 if(world){let e=0;for(let i=0;i<world.explored.length;i++)if(world.explored[i]&&world.land[i])e++;if(e/world.landN>=.6)unlockAch('carto');}
}
function objective(){
 if(!S.intro){const d=NPCS[0];return{t:'Speak with Dadi Saraswati by the campfire',x:d.x,y:d.y,i:'👵🏽'};}
 const tr=S.track;
 if(tr==='chests'){
  if(S.items.includes('compass')){const c=nearest(CHESTS.filter(c=>!S.chests.includes(c.id)));if(c)return{t:'Follow the Seeker\'s Compass to buried treasure',x:c.x,y:c.y,i:'🎁'};}
  else return{t:'Ask villagers where treasure is buried ('+S.chests.length+'/10)',x:null,i:'🎁'};
 }
 if(tr==='lms'){const l=nearest(LANDMARKS.filter(l=>!S.lms.includes(l.id)));if(l)return{t:'Discover '+(S.lms.length?'another landmark':'a landmark')+' ('+S.lms.length+'/10)',x:l.x,y:l.y,i:'🗺️'};}
 if(tr==='npcs'){const n=nearest(NPCS.filter(n=>!S.npcs.includes(n.id)));if(n)return{t:'Meet '+n.name+', '+n.role,x:n.x,y:n.y,i:'🤝'};}
 if(tr==='scrolls'){const s=nearest(world.scrolls.filter(s=>!S.scrolls.includes(s.i)));if(s)return{t:'Find a lost lore scroll ('+S.scrolls.length+'/12)',x:s.x,y:s.y,i:'📜'};}
 const i=SITES.findIndex(s=>!done(s.id));
 if(i>=0){const s=SITES[i];return{t:'Restore '+s.name,x:s.x,y:s.y,i:s.icon};}
 const c=CHESTS.find(c=>!S.chests.includes(c.id));if(c)return{t:'All flames burn bright. Hunt the remaining treasures!',x:null,i:'✨'};
 return{t:'You are a Living Legend. Wander freely.',x:null,i:'👑'};
}
function nearest(arr){let b=null,bd=1e12;arr.forEach(o=>{const d=dist(o.x,o.y,player.x,player.y);if(d<bd){bd=d;b=o;}});return b;}

/* ===================== GAME LIFECYCLE ===================== */
function startGame(){
 showScreen('gameScreen');$('loading').classList.remove('hidden');
 setTimeout(()=>{
  if(!world)genWorld();
  $('loading').classList.add('hidden');
  const camp=world.camp;
  if(S.pos&&tileT(S.pos[0],S.pos[1])!==T.DEEP){player.x=S.pos[0];player.y=S.pos[1];}else{player.x=camp.x+40;player.y=camp.y+110;}
  pet.x=player.x-40;pet.y=player.y;
  game.touch=matchMedia('(pointer:coarse)').matches;
  ['tAct','tRun'].forEach(id=>$(id).classList.toggle('hidden',!game.touch));
  resize();cam.x=player.x-game.VW/2;cam.y=player.y-game.VH/2;
  $('hpName').textContent=pname;
  game.running=true;game.ui=null;game.last=performance.now();game.region='';
  updateHUD(true);
  cancelAnimationFrame(game.raf);game.raf=requestAnimationFrame(loop);
  if(!S.intro)setTimeout(()=>showBanner('A Mirava adventure','Lost Legends of Bharat'),300);
  else setTimeout(()=>toast('Welcome back, <b translate="no">'+esc(pname)+'</b>. The land remembers you.'),400);
 },40);
}
function exitGame(){save();game.running=false;cancelAnimationFrame(game.raf);closePanel();closeDialog(true);$('mg').classList.add('hidden');renderDash();showScreen('dashScreen');}
function showScreen(id){['dashScreen','gameScreen'].forEach(s=>$(s).classList.toggle('hidden',s!==id));}
function resize(){
 const dpr=Math.min(window.devicePixelRatio||1,2);game.dpr=dpr;
 const w=innerWidth,h=innerHeight;cv.width=w*dpr;cv.height=h*dpr;lightCv.width=cv.width;lightCv.height=cv.height;
 const minZ=Math.max(.6,w/(W*.9),h/(H*.9));
 if(!game.zoomSet)game.zoom=w<760?.78:1;game.zoom=clamp(game.zoom,minZ,1.6);
 game.VW=w/game.zoom;game.VH=h/game.zoom;
}
addEventListener('resize',()=>{if(game.running)resize();});
function loop(now){
 const dt=Math.min((now-game.last)/1000,.05);game.last=now;
 update(dt);render();
 game.raf=requestAnimationFrame(loop);
}

/* ===================== UPDATE ===================== */
function walkable(x,y){
 if(x<20||y<20||x>W-20||y>H-20)return false;
 if(tileT(x,y)===T.DEEP)return false;
 const b=world.BW,c0=Math.floor(x/b),r0=Math.floor(y/b);
 for(let r=r0-1;r<=r0+1;r++)for(let c=c0-1;c<=c0+1;c++){if(r<0||c<0||c>=world.BC||r*world.BC+c>=world.bk.length)continue;
  for(const d of world.bk[r*world.BC+c])if(d.r&&dist(x,y,d.x,d.y)<d.r+8)return false;}
 for(const s of SITES)if(dist(x,y,s.x,s.y-24)<62)return false;
 for(const l of LANDMARKS)if(dist(x,y,l.x,l.y)<(l.id==='sanchi'?62:l.id==='banyan'?34:16))return false;
 if(dist(x,y,world.camp.x-60,world.camp.y-6)<40)return false;
 return true;
}
function speedMul(x,y){const t=tileT(x,y);return t===T.ROAD?1.18:t===T.SHALLOW?.55:t===T.RIVER?.6:t===T.SNOW?.72:t===T.DESERT?.86:t===T.SAND?.9:1;}
function update(dt){
 game.time+=dt;S.playT=(S.playT||0)+dt;
 S.time=(S.time+dt/DAY_LEN)%1;
 const e=Math.sin((S.time-.25)*Math.PI*2);game.sun=e;
 game.dark=clamp((.15-e)*.75,0,.72)+game.rain*.12;game.dusk=clamp(1-Math.abs(e)/.3,0,1);
 game.rainTimer-=dt;
 if(game.rainTimer<=0){if(game.rainTarget>0){game.rainTarget=0;game.rainTimer=150+Math.random()*150;}else{game.rainTarget=1;game.rainTimer=40+Math.random()*35;toast('🌧️ Monsoon clouds roll in…');}}
 game.rain=lerp(game.rain,game.rainTarget,dt*.35);Sound.setRain(game.rain);
 const free=!game.ui;
 // movement
 let ix=0,iy=0;
 if(free){
  if(keys.w||keys.arrowup)iy-=1;if(keys.s||keys.arrowdown)iy+=1;if(keys.a||keys.arrowleft)ix-=1;if(keys.d||keys.arrowright)ix+=1;
  if(stickV.id!==null){ix+=stickV.x;iy+=stickV.y;}
  if(ix||iy)game.target=null;
  else if(game.target){const t=game.target,d=dist(t.x,t.y,player.x,player.y);
   if(t.then&&d<t.then.range){const th=t.then;game.target=null;doInteract(th);}
   else if(d<8)game.target=null;else{ix=(t.x-player.x)/d;iy=(t.y-player.y)/d;}}
 }
 const len=Math.hypot(ix,iy);if(len>1){ix/=len;iy/=len;}
 player.moving=len>.1;
 player.sprint=player.moving&&(keys.shift||game.sprintLock)&&player.stam>.05;
 player.stam=clamp(player.stam+(player.sprint?-.32:.18)*dt,0,1);
 if(player.moving){
  const sp=175*speedMul(player.x,player.y)*(player.sprint?1.6:1)*Math.min(1,len);
  const dx=ix*sp*dt,dy=iy*sp*dt,ox=player.x,oy=player.y;
  if(walkable(player.x+dx,player.y))player.x+=dx;
  if(walkable(player.x,player.y+dy))player.y+=dy;
  const moved=dist(ox,oy,player.x,player.y);S.travel+=moved;
  if(moved<.01&&game.target)game.target=null;
  if(ix)player.face=ix>0?1:-1;
  player.walk+=dt*(player.sprint?16:11);player.idle=0;
  game.stepT-=dt;
  if(game.stepT<=0){game.stepT=player.sprint?.24:.34;const t=tileT(player.x,player.y),wet=t===T.SHALLOW||t===T.RIVER;Sound.step(wet);
   if(wet)burst(player.x,player.y,'rgba(200,235,255,.9)',5,40);else if(t===T.DESERT||t===T.SAND||t===T.ROAD||t===T.DRY)burst(player.x,player.y,'rgba(210,180,130,.6)',3,25);}
  if(game.dark>.45)S.nightT+=dt;if(game.rain>.5)S.rainT+=dt;
 }else player.idle+=dt;
 // camera
 const k=1-Math.pow(.0015,dt);
 cam.x=lerp(cam.x,player.x-game.VW/2,k);cam.y=lerp(cam.y,player.y-game.VH/2,k);
 cam.x=clamp(cam.x,0,W-game.VW);cam.y=clamp(cam.y,0,H-game.VH);
 // pet
 const pdx=player.x-player.face*42-pet.x,pdy=player.y+8-pet.y,pd=Math.hypot(pdx,pdy);
 if(pd>500){pet.x=player.x-40;pet.y=player.y;}
 if(pd>14){const ps=Math.min(pd*3.2,330);pet.x+=pdx/pd*ps*dt;pet.y+=pdy/pd*ps*dt;pet.face=pdx>0?1:-1;pet.walk+=dt*12;}
 pet.fan=lerp(pet.fan,player.idle>2.5?1:0,dt*3);
 // npcs
 NPCS.forEach(n=>{
  const pd2=dist(n.x,n.y,player.x,player.y);
  if(pd2<120){n.moving=false;n.face=player.x>n.x?1:-1;return;}
  n.wait-=dt;
  if(n.wait<=0){const a=Math.random()*Math.PI*2,r=Math.random()*70;n.tx=n.hx+Math.cos(a)*r;n.ty=n.hy+Math.sin(a)*r;n.wait=3+Math.random()*4;}
  const d=dist(n.tx,n.ty,n.x,n.y);
  if(d>4){n.x+=(n.tx-n.x)/d*32*dt;n.y+=(n.ty-n.y)/d*32*dt;n.face=n.tx>n.x?1:-1;n.walk+=dt*8;n.moving=true;}else n.moving=false;
 });
 // fog reveal
 const fc=Math.floor(player.x/FOG),fr=Math.floor(player.y/FOG);
 for(let r=fr-3;r<=fr+3;r++)for(let c=fc-3;c<=fc+3;c++){
  if(r<0||c<0||r>=FR||c>=FC)continue;if((r-fr)*(r-fr)+(c-fc)*(c-fc)>9)continue;const i=r*FC+c;
  if(!world.explored[i]){world.explored[i]=1;world.fogCtx.clearRect(c,r,1,1);}
 }
 // discoveries
 LANDMARKS.forEach(l=>{if(!S.lms.includes(l.id)&&dist(l.x,l.y,player.x,player.y)<210){S.lms.push(l.id);showBanner('Landmark discovered',l.name);Sound.chime();addXP(20,l.x,l.y);toast(l.icon+' <b>'+l.name+'</b> added to your codex');save();}});
 world.scrolls.forEach(s=>{if(!S.scrolls.includes(s.i)&&dist(s.x,s.y,player.x,player.y)<46){S.scrolls.push(s.i);Sound.pickup();burst(s.x,s.y-20,'#f8c950',24);addXP(15,s.x,s.y);toast('📜 Lore scroll found: <b>'+SCROLLS[s.i].t+'</b> <span class="mono">('+S.scrolls.length+'/12)</span>');save();}});
 const rev=S.items.includes('compass')?280:175;
 CHESTS.forEach(c=>{if(S.chests.includes(c.id))return;const d=dist(c.x,c.y,player.x,player.y);if(!c.rev&&d<rev){c.rev=true;toast('✨ You sense something buried nearby…');Sound.tone(520,.5,'sine',.05,1.5);}});
 // region banner
 const reg=regionName(player.x,player.y);
 if(reg!==game.region){game.regionHold+=dt;if(game.regionHold>.8){game.region=reg;game.regionHold=0;if(S.intro)showBanner('Entering',reg);}}else game.regionHold=0;
 // particles
 for(let i=game.parts.length-1;i>=0;i--){const p=game.parts[i];p.life-=dt;if(p.life<=0){game.parts.splice(i,1);continue;}p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=(p.g||0)*dt;}
 if(S.settings.hi&&game.dark>.35&&Math.random()<dt*6){const t=tileT(player.x,player.y);if(t===T.FOREST||t===T.GRASS)game.parts.push({x:player.x+(Math.random()-.5)*game.VW,y:player.y+(Math.random()-.5)*game.VH,vx:(Math.random()-.5)*20,vy:(Math.random()-.5)*20,life:4,max:4,c:'#e8ff9a',s:2.2,ff:1});}
 // ambient
 game.ambT-=dt;if(game.ambT<=0){game.ambT=2+Math.random()*5;if(game.dark>.4)Sound.cricket();else if(game.rain<.3&&tileT(player.x,player.y)!==T.DESERT)Sound.bird();}
 // interact prompt
 game.near=free?findInteract():null;
 const pr=$('prompt');if(game.near){pr.classList.remove('hidden');gameText('promptT',game.near.label);}else pr.classList.add('hidden');
 game.hudT-=dt;if(game.hudT<=0){game.hudT=.25;updateHUD();checkAch();}
 game.saveT-=dt;if(game.saveT<=0){game.saveT=8;save();}
 if(game.shake>0)game.shake-=dt;
}
function regionName(x,y){
 let best=null,bd=420;
 SITES.forEach(s=>{const d=dist(s.x,s.y,x,y);if(d<bd){bd=d;best=s.name;}});
 LANDMARKS.forEach(l=>{const d=dist(l.x,l.y,x,y);if(d<bd*.9){bd=d;best=l.name;}});
 if(dist(world.camp.x,world.camp.y,x,y)<380)return'Storyteller\'s Camp';
 if(best)return best;
 const t=tileT(x,y),nx=(x/W-.04)/.92,ny=(y/H-.03)/.94;
 if(t===T.SHALLOW)return'Coastal Shallows';
 if(t===T.RIVER){for(const r of world.rivers)for(const p of r.pts)if(dist(p.x,p.y,x,y)<120)return'The '+r.n+' River';return'River Crossing';}
 if(t===T.SNOW||t===T.MOUNT)return'Northern Highlands';
 if(t===T.DESERT)return'The Great Desert';
 if(ny>.78)return'Southern Peninsula';
 if(ny>.47)return t===T.FOREST&&nx<.48?'Malabar Forests':'Deccan Plateau';
 return nx>.42?'Gangetic Plains':'Western Plains';
}
function findInteract(){
 let best=null,bd=1e9;
 const consider=(o,d)=>{if(d<bd){bd=d;best=o;}};
 NPCS.forEach(n=>{const d=dist(n.x,n.y,player.x,player.y);if(d<85)consider({type:'npc',o:n,range:85,x:n.x,y:n.y,label:'Talk to '+n.name},d);});
 SITES.forEach((s,i)=>{const d=dist(s.x,s.y,player.x,player.y);if(d<170)consider({type:'site',o:s,range:170,x:s.x,y:s.y,label:!unlocked(i)?'Sealed — restore '+SITES[i-1].name+' first':done(s.id)?'Revisit '+s.name+' (best '+'★'.repeat(S.stars[s.id])+')':'Restore '+s.name},d-30);});
 CHESTS.forEach(c=>{if(S.chests.includes(c.id)||!c.rev)return;const d=dist(c.x,c.y,player.x,player.y);if(d<75)consider({type:'chest',o:c,range:75,x:c.x,y:c.y,label:'Dig for buried treasure'},d-20);});
 const fx=world.camp.x+30,fy=world.camp.y+10,fd=dist(fx,fy,player.x,player.y);
 if(fd<100)consider({type:'fire',range:100,x:fx,y:fy,label:game.dark>.3?'Rest by the fire until dawn':'Rest by the fire until dusk'},fd+20);
 return best;
}
function doInteract(it){
 if(!it||game.ui)return;
 if(it.type==='npc')talkNPC(it.o);
 else if(it.type==='site'){const i=SITES.indexOf(it.o);if(!unlocked(i)){toast('🔒 This flame is sealed. Restore <b>'+SITES[i-1].name+'</b> first.');Sound.buzz();}else openSite(it.o);}
 else if(it.type==='chest')digChest(it.o);
 else if(it.type==='fire')restFire();
}
function interact(){if(game.near)doInteract(game.near);}

/* ===================== RENDER ===================== */
function render(){
 const dpr=game.dpr,z=game.zoom,VW=game.VW,VH=game.VH;
 let sx=0,sy=0;if(game.shake>0){sx=(Math.random()-.5)*8;sy=(Math.random()-.5)*8;}
 ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#1d4b6e';ctx.fillRect(0,0,cv.width,cv.height);
 ctx.setTransform(dpr*z,0,0,dpr*z,(-cam.x+sx)*dpr*z,(-cam.y+sy)*dpr*z);
 const c=ctx;c.imageSmoothingEnabled=true;
 c.drawImage(world.terrain,cam.x/TS*TPX,cam.y/TS*TPX,VW/TS*TPX,VH/TS*TPX,cam.x,cam.y,VW,VH);
 // water shimmer
 const c0=Math.floor(cam.x/TS),c1=Math.ceil((cam.x+VW)/TS),r0=Math.floor(cam.y/TS),r1=Math.ceil((cam.y+VH)/TS);
 c.lineWidth=1.5;c.lineCap='round';
 for(let r=r0;r<=r1;r++)for(let cc=c0;cc<=c1;cc++){
  if(r<0||cc<0||r>=ROWS||cc>=COLS)continue;const t=world.tiles[r*COLS+cc];if(t>T.SHALLOW&&t!==T.RIVER)continue;
  const h=hash2(cc,r,77);if(h>.35)continue;
  const a=Math.sin(game.time*1.6+h*40)*.5+.5;c.strokeStyle=`rgba(220,240,255,${a*.35})`;
  const x=cc*TS+hash2(cc,r,2)*30,y=r*TS+hash2(cc,r,3)*30+(t===T.RIVER?(game.time*14+h*40)%30:0);
  c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+6,y-3,x+12,y);c.stroke();
 }
 // ground decos
 const bw=world.BW,bc0=Math.max(0,Math.floor(cam.x/bw)-1),bc1=Math.min(world.BC-1,Math.floor((cam.x+VW)/bw)+1),br0=Math.max(0,Math.floor(cam.y/bw)-1),br1=Math.floor((cam.y+VH)/bw)+1;
 const inView=(x,y,m)=>x>cam.x-m&&x<cam.x+VW+m&&y>cam.y-m&&y<cam.y+VH+m;
 const draws=[];
 for(let r=br0;r<=br1;r++)for(let cc=bc0;cc<=bc1;cc++){const i=r*world.BC+cc;if(i>=world.bk.length)continue;
  for(const g of world.gbk[i])if(inView(g.x,g.y,20))drawGround(g);
  for(const d of world.bk[i])if(inView(d.x,d.y,80))draws.push([d.y,0,d]);}
 // landmarks, sites, entities
 LANDMARKS.forEach(l=>{if(inView(l.x,l.y,260))draws.push([l.y,1,l]);});
 SITES.forEach((s,i)=>{if(inView(s.x,s.y,320)){draws.push([s.y,2,s,i]);}});
 if(inView(world.camp.x,world.camp.y,200))draws.push([world.camp.y,3,world.camp]);
 CHESTS.forEach(ch=>{if(ch.rev&&!S.chests.includes(ch.id)&&inView(ch.x,ch.y,60))draws.push([ch.y,4,ch]);});
 world.scrolls.forEach(s=>{if(!S.scrolls.includes(s.i)&&inView(s.x,s.y,60))draws.push([s.y,5,s]);});
 NPCS.forEach(n=>{if(inView(n.x,n.y,60))draws.push([n.y,6,n]);});
 draws.push([pet.y,7,pet]);draws.push([player.y,8,player]);
 draws.sort((a,b)=>a[0]-b[0]);
 for(const d of draws){switch(d[1]){case 0:drawDeco(d[2]);break;case 1:drawLandmark(d[2]);break;case 2:drawSite(d[2],d[3]);break;case 3:drawCamp(d[2]);break;case 4:drawChest(d[2]);break;case 5:drawScroll(d[2]);break;case 6:drawNPC(d[2]);break;case 7:drawPeacock(pet);break;case 8:drawHero();break;}}
 // beacon for next site
 SITES.forEach((s,i)=>{if(unlocked(i)&&!done(s.id)&&inView(s.x,s.y,900))drawBeacon(s);});
 // particles
 for(const p of game.parts){const a=clamp(p.life/p.max,0,1);
  if(p.txt){c.globalAlpha=a;c.font='800 16px Manrope';c.textAlign='center';c.fillStyle='#1a1210';c.fillText(p.txt,p.x+1,p.y+1);c.fillStyle=p.c;c.fillText(p.txt,p.x,p.y);c.globalAlpha=1;continue;}
  if(p.ff){const f=(Math.sin(game.time*6+p.x)*.5+.5)*a*clamp(game.dark*2,0,1);c.fillStyle=`rgba(232,255,154,${f})`;c.beginPath();c.arc(p.x,p.y,p.s,0,7);c.fill();continue;}
  c.globalAlpha=a;c.fillStyle=p.c;c.beginPath();c.arc(p.x,p.y,p.s*(.5+a*.5),0,7);c.fill();c.globalAlpha=1;}
 // cloud shadows & birds
 if(S.settings.hi){world.clouds.forEach(cl=>{cl.x+=cl.s*.016;if(cl.x-cl.r>W)cl.x=-cl.r;if(!inView(cl.x,cl.y,cl.r))return;const g=c.createRadialGradient(cl.x,cl.y,0,cl.x,cl.y,cl.r);g.addColorStop(0,`rgba(20,25,40,${.13*(1-game.dark)})`);g.addColorStop(1,'rgba(20,25,40,0)');c.fillStyle=g;c.fillRect(cl.x-cl.r,cl.y-cl.r,cl.r*2,cl.r*2);});
  if(game.dark<.3){const bt=game.time*.05%1;for(let b=0;b<5;b++){const bx=cam.x+VW*(bt*1.4-.2)+b*22,by=cam.y+VH*.3+Math.sin(b)*18+Math.sin(game.time+b)*4;c.strokeStyle='rgba(30,25,25,.7)';c.lineWidth=1.6;c.beginPath();const fl=Math.sin(game.time*8+b)*3;c.moveTo(bx-6,by-fl);c.lineTo(bx,by);c.lineTo(bx+6,by-fl);c.stroke();}}}
 // lighting
 const dark=game.dark;
 if(game.dusk>0.01){c.fillStyle=`rgba(255,120,50,${game.dusk*.13})`;c.fillRect(cam.x,cam.y,VW,VH);}
 if(dark>.02){
  if(S.settings.hi){
   lctx.setTransform(1,0,0,1,0,0);lctx.globalCompositeOperation='source-over';lctx.clearRect(0,0,lightCv.width,lightCv.height);
   lctx.setTransform(dpr*z,0,0,dpr*z,-cam.x*dpr*z,-cam.y*dpr*z);
   lctx.fillStyle=`rgba(10,10,34,${dark})`;lctx.fillRect(cam.x-10,cam.y-10,VW+20,VH+20);
   lctx.globalCompositeOperation='destination-out';
   const light=(x,y,r,i)=>{if(!inView(x,y,r))return;const g=lctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(0,0,0,${i})`);g.addColorStop(1,'rgba(0,0,0,0)');lctx.fillStyle=g;lctx.fillRect(x-r,y-r,r*2,r*2);};
   light(player.x,player.y-10,230+Math.sin(game.time*9)*4,.95);
   light(world.camp.x+30,world.camp.y,260+Math.sin(game.time*11)*8,1);
   SITES.forEach(s=>{if(done(s.id))light(s.x,s.y-60,320,.9);});
   NPCS.forEach(n=>light(n.x,n.y-20,90,.6));
   world.scrolls.forEach(s=>{if(!S.scrolls.includes(s.i))light(s.x,s.y-18,70,.7);});
   CHESTS.forEach(ch=>{if(ch.rev&&!S.chests.includes(ch.id))light(ch.x,ch.y,80,.7);});
   ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(lightCv,0,0);
   ctx.setTransform(dpr*z,0,0,dpr*z,-cam.x*dpr*z,-cam.y*dpr*z);
   ctx.globalCompositeOperation='lighter';
   const warm=(x,y,r,a)=>{if(!inView(x,y,r))return;const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(255,150,60,${a*dark})`);g.addColorStop(1,'rgba(255,150,60,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);};
   warm(world.camp.x+30,world.camp.y,170,.5);warm(player.x+player.face*9,player.y-16,60,.45);
   SITES.forEach(s=>{if(done(s.id))warm(s.x,s.y-60,200,.35);});
   ctx.globalCompositeOperation='source-over';
  }else{c.fillStyle=`rgba(10,10,34,${dark*.8})`;c.fillRect(cam.x,cam.y,VW,VH);}
 }
 // rain
 if(game.rain>.03){c.strokeStyle=`rgba(190,210,235,${.45*game.rain})`;c.lineWidth=1.2;const n=Math.floor(180*game.rain);c.beginPath();
  for(let i=0;i<n;i++){const h=hash2(i,7,3),h2=hash2(i,9,4),x=cam.x+((h*VW+game.time*120)%VW),y=cam.y+((h2*VH+game.time*(700+h*300))%VH);c.moveTo(x,y);c.lineTo(x-4,y+14);}c.stroke();
  c.fillStyle=`rgba(40,50,70,${.12*game.rain})`;c.fillRect(cam.x,cam.y,VW,VH);}
 // objective pointer (screen space)
 ctx.setTransform(dpr,0,0,dpr,0,0);drawPointer();
 drawMini();
}
function drawGround(g){const c=ctx;
 if(g.k==='tuft'){c.strokeStyle=g.dry?'rgba(120,110,50,.7)':'rgba(40,90,40,.6)';c.lineWidth=1.5;c.beginPath();const w=Math.sin(game.time*2+g.x)*1.5;c.moveTo(g.x-3,g.y);c.lineTo(g.x-4+w,g.y-7);c.moveTo(g.x,g.y);c.lineTo(g.x+w,g.y-9);c.moveTo(g.x+3,g.y);c.lineTo(g.x+4+w,g.y-7);c.stroke();}
 else if(g.k==='flower'){c.fillStyle=g.c;c.beginPath();c.arc(g.x,g.y,2.4,0,7);c.arc(g.x+5,g.y+3,2,0,7);c.fill();}
 else if(g.k==='ripple'){c.strokeStyle='rgba(170,130,70,.35)';c.lineWidth=2;c.beginPath();c.arc(g.x,g.y+20,22,-2.4,-.7);c.stroke();}
}
function ell(x,y,rx,ry,col){ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,7);ctx.fill();}
function drawDeco(d){const c=ctx,sw=Math.sin(game.time*1.3+d.ph)*1.6;
 switch(d.k){
 case'tree':ell(d.x+5,d.y,d.s*.8,d.s*.26,'rgba(0,0,0,.2)');c.fillStyle='#6b4a2e';c.fillRect(d.x-3,d.y-d.s*.9,6,d.s*.9);
  ell(d.x+sw,d.y-d.s*1.05,d.s*.78,d.s*.68,d.c);ell(d.x-d.s*.25+sw,d.y-d.s*1.25,d.s*.45,d.s*.4,'rgba(255,255,255,.1)');ell(d.x+d.s*.2+sw,d.y-d.s*.85,d.s*.5,d.s*.35,'rgba(0,0,0,.12)');break;
 case'pine':ell(d.x+4,d.y,d.s*.5,d.s*.18,'rgba(0,0,0,.2)');c.fillStyle='#5a3d26';c.fillRect(d.x-2,d.y-8,4,8);
  for(let k=0;k<3;k++){const w=d.s*(.55-k*.13),y=d.y-6-k*d.s*.32;c.fillStyle=k%2?'#2c5a3a':'#356b44';c.beginPath();c.moveTo(d.x-w+sw*.3,y);c.lineTo(d.x+sw*.5,y-d.s*.55);c.lineTo(d.x+w+sw*.3,y);c.fill();
   if(d.snow){c.fillStyle='rgba(255,255,255,.85)';c.beginPath();c.moveTo(d.x-w*.35,y-d.s*.36);c.lineTo(d.x+sw*.5,y-d.s*.55);c.lineTo(d.x+w*.35,y-d.s*.36);c.fill();}}break;
 case'palm':{ell(d.x+6,d.y,d.s*.6,d.s*.2,'rgba(0,0,0,.2)');const tx=d.x+8+sw,ty=d.y-d.s*1.4;c.strokeStyle='#8a6a42';c.lineWidth=4;c.lineCap='round';c.beginPath();c.moveTo(d.x,d.y);c.quadraticCurveTo(d.x+2,d.y-d.s*.7,tx,ty);c.stroke();
  c.strokeStyle='#3f8a3a';c.lineWidth=3;for(let k=0;k<6;k++){const a=k/6*Math.PI*2+.3;c.beginPath();c.moveTo(tx,ty);c.quadraticCurveTo(tx+Math.cos(a)*d.s*.5,ty+Math.sin(a)*d.s*.2-8,tx+Math.cos(a)*d.s*.75,ty+Math.sin(a)*d.s*.3+6);c.stroke();}
  ell(tx,ty+2,3,3,'#7a5a2a');break;}
 case'shrub':ell(d.x+3,d.y,d.s*.7,d.s*.2,'rgba(0,0,0,.18)');c.strokeStyle='#6b4a2e';c.lineWidth=2.5;c.beginPath();c.moveTo(d.x,d.y);c.lineTo(d.x+1,d.y-d.s*.8);c.stroke();ell(d.x+sw*.5,d.y-d.s*.9,d.s*.75,d.s*.28,'#7d8a3e');break;
 case'rock':ell(d.x+3,d.y,d.s*.6,d.s*.2,'rgba(0,0,0,.2)');c.fillStyle=d.snow?'#9a9aa0':'#8a8274';c.beginPath();d.pts.forEach((p,i)=>i?c.lineTo(d.x+p[0],d.y+p[1]):c.moveTo(d.x+p[0],d.y+p[1]));c.fill();
  c.fillStyle=d.snow?'rgba(255,255,255,.8)':'rgba(255,255,255,.14)';c.beginPath();c.ellipse(d.x-d.s*.15,d.y-d.s*.45,d.s*.32,d.s*.14,0,0,7);c.fill();break;
 }
}
function label(txt,x,y,col){const c=ctx;c.font='700 12px Manrope';c.textAlign='center';const w=c.measureText(txt).width+14;c.fillStyle='rgba(20,12,10,.72)';c.beginPath();c.roundRect?c.roundRect(x-w/2,y-12,w,19,9):c.rect(x-w/2,y-12,w,19);c.fill();c.fillStyle=col||'#f5e6c8';c.fillText(txt,x,y+2);}
function drawHuman(x,y,o){
 const c=ctx;c.save();c.translate(x,y);ell(0,0,12,4,'rgba(0,0,0,.28)');c.scale(o.face,1);
 const sw=o.moving?Math.sin(o.walk)*5:0,bob=o.moving?-Math.abs(Math.sin(o.walk))*2:Math.sin(game.time*2+x)*.5;
 c.lineCap='round';c.strokeStyle=o.p;c.lineWidth=4;c.beginPath();c.moveTo(-3,-12);c.lineTo(-3+sw,-1);c.moveTo(3,-12);c.lineTo(3-sw,-1);c.stroke();
 c.translate(0,bob);
 if(o.pack){c.fillStyle='#7a5230';c.fillRect(-12,-27,5,12);}
 c.fillStyle=o.k;c.beginPath();c.moveTo(-7,-28);c.lineTo(7,-28);c.lineTo(9,-11);c.lineTo(-9,-11);c.closePath();c.fill();
 c.strokeStyle='#f1b43c';c.lineWidth=2;c.beginPath();c.moveTo(-6,-27);c.lineTo(7,-15);c.stroke();
 c.strokeStyle=o.k;c.lineWidth=3.5;c.beginPath();c.moveTo(-6,-25);c.lineTo(-8-sw*.6,-15);c.moveTo(6,-25);c.lineTo(8+sw*.6,-15);c.stroke();
 c.fillStyle=o.s;c.beginPath();c.arc(0,-34,6.5,0,7);c.fill();
 c.fillStyle=o.hc;
 if(o.h==='pagri'){c.beginPath();c.ellipse(0,-38,8,5,0,Math.PI,0);c.fill();c.fillRect(-8,-39,16,3);c.beginPath();c.arc(-6,-37,2.6,0,7);c.fill();}
 else if(o.h==='bun'){c.beginPath();c.arc(0,-36,6.6,Math.PI*1.05,Math.PI*2.05);c.fill();c.beginPath();c.arc(-6,-36,3.2,0,7);c.fill();}
 else{c.beginPath();c.arc(0,-36,6.8,Math.PI,0);c.fill();c.fillRect(0,-38,9,2);}
 c.fillStyle='#1a1210';c.beginPath();c.arc(3,-34,1.1,0,7);c.fill();
 if(o.lantern){c.strokeStyle='#5a4030';c.lineWidth=1;c.beginPath();c.moveTo(9,-15);c.lineTo(10,-9);c.stroke();c.fillStyle='#3a2a1a';c.fillRect(7,-9,6,8);c.fillStyle=`rgba(255,${190+Math.sin(game.time*12)*30|0},90,1)`;c.fillRect(8,-8,4,6);}
 c.restore();
}
function drawHero(){
 const lv=levelOf(S.xp);
 if(game.ui===null&&player.sprint&&player.moving&&Math.random()<.4)burst(player.x,player.y,'rgba(255,240,200,.4)',1,20);
 drawHuman(player.x,player.y,{face:player.face,walk:player.walk,moving:player.moving,k:lv>=5?'#7a2b8f':'#e8913a',p:'#f3e9d6',s:'#b97a50',h:'pagri',hc:lv>=3?'#f1b43c':'#b0262f',pack:true,lantern:game.dark>.3});
}
function drawNPC(n){
 drawHuman(n.x,n.y,{face:n.face,walk:n.walk,moving:n.moving,k:n.look.k,p:n.look.p,s:n.look.s,h:n.look.h,hc:n.look.hc});
 const talked=S.npcs.includes(n.id),bob=Math.sin(game.time*3+n.x)*3;
 ctx.font='18px serif';ctx.textAlign='center';ctx.fillText(talked?'':'💬',n.x+12,n.y-52+bob);
 if(dist(n.x,n.y,player.x,player.y)<260)label(n.name,n.x,n.y-62,talked?'#f5e6c8':'#f8c950');
}
function drawPeacock(b){
 const c=ctx;c.save();c.translate(b.x,b.y);ell(0,0,10,3.5,'rgba(0,0,0,.25)');c.scale(b.face,1);
 const f=b.fan,hop=Math.abs(Math.sin(b.walk))*2;
 if(f>.05){for(let i=-6;i<=6;i++){const a=-Math.PI/2+i*.2*f-Math.PI*.0;const ex=-4+Math.cos(a-Math.PI*.15)*30*f,ey=-12+Math.sin(a)*30*f;c.strokeStyle='#2f7d4a';c.lineWidth=2.5;c.beginPath();c.moveTo(-4,-10);c.lineTo(ex,ey);c.stroke();ell(ex,ey,3.4*f,4*f,'#1d6b8a');ell(ex,ey,1.6*f,2*f,'#f1b43c');}}
 else{c.fillStyle='#2f7d4a';c.beginPath();c.moveTo(-3,-9);c.quadraticCurveTo(-18,-6,-26,-2);c.quadraticCurveTo(-14,-2,-3,-5);c.fill();}
 c.translate(0,-hop);c.strokeStyle='#8a6a42';c.lineWidth=1.4;c.beginPath();c.moveTo(-1,-5);c.lineTo(-2,0);c.moveTo(2,-5);c.lineTo(3,0);c.stroke();
 ell(0,-9,6,6,'#1f5fb2');c.strokeStyle='#1f5fb2';c.lineWidth=3.5;c.beginPath();c.moveTo(2,-12);c.quadraticCurveTo(6,-16,5,-21);c.stroke();
 ell(5,-22,3,3,'#1f6fc2');c.fillStyle='#f1b43c';c.beginPath();c.moveTo(7,-22);c.lineTo(10,-21);c.lineTo(7,-20.5);c.fill();
 c.fillStyle='#1f6fc2';for(let k=0;k<3;k++){c.beginPath();c.arc(3+k*1.6,-27+k*.3,1,0,7);c.fill();}
 c.fillStyle='#fff';c.beginPath();c.arc(6,-22.5,.8,0,7);c.fill();
 c.restore();
}
function drawCamp(cp){
 const c=ctx,x=cp.x,y=cp.y;
 // tent
 ell(x-60,y,46,10,'rgba(0,0,0,.25)');c.fillStyle='#b0262f';c.beginPath();c.moveTo(x-104,y);c.lineTo(x-60,y-62);c.lineTo(x-16,y);c.fill();
 c.fillStyle='#f1b43c';c.beginPath();c.moveTo(x-82,y);c.lineTo(x-60,y-62);c.lineTo(x-70,y);c.fill();
 c.fillStyle='#3a1a14';c.beginPath();c.moveTo(x-68,y);c.lineTo(x-60,y-30);c.lineTo(x-52,y);c.fill();
 // fire
 const fx=x+30,fy=y+10;ell(fx,fy+2,22,7,'rgba(0,0,0,.3)');
 c.strokeStyle='#5a3a22';c.lineWidth=5;c.lineCap='round';c.beginPath();c.moveTo(fx-14,fy+4);c.lineTo(fx+14,fy-2);c.moveTo(fx-14,fy-2);c.lineTo(fx+14,fy+4);c.stroke();
 for(let i=0;i<3;i++){const h=18+Math.sin(game.time*10+i*2)*5,w=8-i*2;c.fillStyle=['#e85a2a','#f1b43c','#fff3c0'][i];c.beginPath();c.moveTo(fx-w,fy);c.quadraticCurveTo(fx-w*.6,fy-h*.6,fx+Math.sin(game.time*7+i)*2,fy-h+i*3);c.quadraticCurveTo(fx+w*.6,fy-h*.6,fx+w,fy);c.fill();}
 if(Math.random()<.25)game.parts.push({x:fx+(Math.random()-.5)*8,y:fy-16,vx:(Math.random()-.5)*14,vy:-40-Math.random()*30,life:1.2,max:1.2,c:'#f8c950',s:1.6});
 label('Storyteller\'s Camp',x-20,y-80,'#f8c950');
}
function drawLandmark(l){
 const c=ctx,x=l.x,y=l.y,found=S.lms.includes(l.id);
 if(l.id==='banyan'){ell(x+10,y+4,120,30,'rgba(0,0,0,.22)');c.fillStyle='#5f4430';[-70,-40,-12,14,44,72].forEach((o,i)=>c.fillRect(x+o-4,y-60-(i%2)*10,i===2||i===3?16:6,62+(i%2)*10));
  const sw=Math.sin(game.time)*2;ell(x+sw,y-100,120,58,'#2f6b37');ell(x-50+sw,y-118,60,40,'#3a7a40');ell(x+55+sw,y-112,62,38,'#3a7a40');ell(x+sw,y-140,70,34,'#45874a');}
 else if(l.id==='sanchi'){ell(x,y+4,90,18,'rgba(0,0,0,.22)');c.fillStyle='#c9b08a';c.fillRect(x-70,y-24,140,24);c.fillStyle='#d8c29b';c.beginPath();c.ellipse(x,y-24,64,58,0,Math.PI,0);c.fill();
  c.fillStyle='rgba(0,0,0,.08)';c.beginPath();c.ellipse(x+20,y-30,36,46,0,Math.PI*1.3,0);c.fill();c.fillStyle='#b8a07a';c.fillRect(x-10,y-92,20,12);c.fillRect(x-1.5,y-110,3,18);c.fillRect(x-12,y-104,24,3);
  c.fillStyle='#a88a62';c.fillRect(x-46,y-44,6,46);c.fillRect(x+40,y-44,6,46);for(let k=0;k<3;k++)c.fillRect(x-54,y-48+k*9,108,4);}
 else{ell(x,y+2,20,6,'rgba(0,0,0,.25)');ell(x,y-4,16,8,'#7d7468');ell(x+1,y-14,12,7,'#8a8274');ell(x,y-22,8,5,'#978f81');
  c.strokeStyle='#5a3d26';c.lineWidth=2.5;c.beginPath();c.moveTo(x+4,y-20);c.lineTo(x+4,y-64);c.stroke();
  if(found){const w=Math.sin(game.time*4+x)*4;c.fillStyle='#e8913a';c.beginPath();c.moveTo(x+5,y-64);c.quadraticCurveTo(x+18,y-60+w,x+30,y-56+w);c.lineTo(x+5,y-48);c.fill();}}
 if(found){ctx.font='22px serif';ctx.textAlign='center';ctx.fillText(l.icon,x-14,y-(l.id==='banyan'?178:l.id==='sanchi'?124:70)+Math.sin(game.time*2)*2);}
 if(dist(x,y,player.x,player.y)<340)label(found?l.name:'Unknown place',x,y-(l.id==='banyan'?200:l.id==='sanchi'?140:84),found?'#f8c950':'#c8b8a8');
}
function drawChest(ch){
 const c=ctx,x=ch.x,y=ch.y;ell(x,y+2,26,9,'rgba(90,60,30,.7)');ell(x,y-2,22,8,'#8a6440');
 for(let i=0;i<5;i++){const a=game.time*1.5+i*1.26,r=22+Math.sin(game.time*3+i)*4,px=x+Math.cos(a)*r,py=y-12+Math.sin(a)*r*.45,s=2+Math.sin(game.time*5+i)*1.2;c.fillStyle='#fff3c0';c.beginPath();c.moveTo(px,py-s*2);c.lineTo(px+s*.6,py);c.lineTo(px,py+s*2);c.lineTo(px-s*.6,py);c.fill();}
 c.fillStyle='#6b4423';c.fillRect(x-9,y-12,18,9);c.fillStyle='#f1b43c';c.fillRect(x-9,y-9,18,2);
}
function drawScroll(s){
 const c=ctx,b=Math.sin(game.time*2.4+s.x)*4,y=s.y-20+b;
 const g=c.createRadialGradient(s.x,y,0,s.x,y,34);g.addColorStop(0,'rgba(248,201,80,.55)');g.addColorStop(1,'rgba(248,201,80,0)');c.fillStyle=g;c.fillRect(s.x-34,y-34,68,68);
 ell(s.x,s.y+2,10,3,'rgba(0,0,0,.2)');c.fillStyle='#f3e3c0';c.fillRect(s.x-8,y-10,16,20);c.fillStyle='#8a5a2a';c.fillRect(s.x-10,y-12,20,4);c.fillRect(s.x-10,y+8,20,4);
 c.strokeStyle='rgba(120,70,30,.6)';c.lineWidth=1;for(let k=0;k<3;k++){c.beginPath();c.moveTo(s.x-5,y-4+k*5);c.lineTo(s.x+5,y-4+k*5);c.stroke();}
}
function drawBeacon(s){
 const c=ctx,a=.25+Math.sin(game.time*2)*.1,g=c.createLinearGradient(0,s.y-700,0,s.y);g.addColorStop(0,'rgba(248,201,80,0)');g.addColorStop(1,`rgba(248,201,80,${a})`);
 c.fillStyle=g;c.fillRect(s.x-18,s.y-700,36,690);
 c.strokeStyle=`rgba(248,201,80,${a+.2})`;c.lineWidth=2;c.beginPath();c.ellipse(s.x,s.y,70+Math.sin(game.time*2)*8,22,0,0,7);c.stroke();
}
function drawSite(s,i){
 const c=ctx,x=s.x,y=s.y,r=done(s.id),un=unlocked(i);
 const col=(a,b)=>r?a:b;
 ell(x,y+4,110,28,'rgba(0,0,0,.22)');
 switch(s.id){
 case'ashoka':c.fillStyle=col('#c9a97a','#8e8578');c.fillRect(x-46,y-10,92,12);c.fillRect(x-34,y-20,68,10);
  {const g=c.createLinearGradient(x-9,0,x+9,0);g.addColorStop(0,col('#b8925c','#7a7266'));g.addColorStop(.5,col('#f0d6a8','#a59c90'));g.addColorStop(1,col('#a5804c','#6e675d'));c.fillStyle=g;c.fillRect(x-9,y-190,18,170);}
  c.fillStyle=col('#d8b07a','#8e8578');c.beginPath();c.moveTo(x-9,y-190);c.quadraticCurveTo(x-18,y-196,x-14,y-204);c.lineTo(x+14,y-204);c.quadraticCurveTo(x+18,y-196,x+9,y-190);c.fill();
  c.fillStyle=col('#c9a070','#8a8174');c.fillRect(x-17,y-212,34,8);
  [[-11,-221,8],[11,-221,8],[0,-226,9]].forEach(l=>{ell(x+l[0],y+l[1],l[2],l[2],col('#d9b47c','#9a9184'));ell(x+l[0]+3,y+l[1]-3,4,4,col('#e8c890','#a8a094'));});
  if(r){c.strokeStyle='#f1b43c';c.lineWidth=1.5;c.beginPath();c.arc(x,y-208,3.5,0,7);c.stroke();}break;
 case'mithila':{
  ell(x+70,y-80,58,46,col('#2f6b37','#4a5a48'));c.fillStyle='#5f4430';c.fillRect(x+66,y-40,8,40);
  const hut=(hx,sc)=>{c.fillStyle=col('#c98a5a','#8e7f72');c.fillRect(hx-30*sc,y-40*sc,60*sc,40*sc);
   if(r){const cols=['#b0262f','#f1b43c','#1f5fb2','#2f7d4a'];for(let k=0;k<5;k++){c.fillStyle=cols[k%4];c.beginPath();c.ellipse(hx-22*sc+k*11*sc,y-26*sc,4*sc,2.2*sc,0,0,7);c.fill();}c.strokeStyle='#b0262f';c.lineWidth=1.5;c.strokeRect(hx-28*sc,y-38*sc,56*sc,36*sc);}
   c.fillStyle='#3a1f14';c.beginPath();c.moveTo(hx-7*sc,y);c.lineTo(hx-7*sc,y-18*sc);c.arc(hx,y-18*sc,7*sc,Math.PI,0);c.lineTo(hx+7*sc,y);c.fill();
   c.fillStyle=col('#b08a4a','#7a7066');c.beginPath();c.moveTo(hx-40*sc,y-38*sc);c.lineTo(hx,y-74*sc);c.lineTo(hx+40*sc,y-38*sc);c.fill();
   c.strokeStyle='rgba(0,0,0,.18)';c.lineWidth=1;for(let k=1;k<5;k++){c.beginPath();c.moveTo(hx-40*sc+k*8*sc,y-38*sc);c.lineTo(hx,y-74*sc);c.stroke();}};
  hut(x-40,1.1);hut(x+30,.85);break;}
 case'ajanta':{const g=c.createLinearGradient(0,y-160,0,y);g.addColorStop(0,col('#7a5a42','#5e564e'));g.addColorStop(1,col('#4a3428','#3e3832'));c.fillStyle=g;
  c.beginPath();c.moveTo(x-130,y);c.quadraticCurveTo(x-120,y-120,x-60,y-150);c.quadraticCurveTo(x,y-172,x+70,y-148);c.quadraticCurveTo(x+125,y-120,x+132,y);c.fill();
  [-62,0,62].forEach((o,k)=>{const w=k===1?36:28,h=k===1?62:48;c.fillStyle='#140c0a';c.beginPath();c.moveTo(x+o-w/2,y);c.lineTo(x+o-w/2,y-h+w/2);c.arc(x+o,y-h+w/2,w/2,Math.PI,0);c.lineTo(x+o+w/2,y);c.fill();
   c.fillStyle=col('#9a7a5a','#6e665c');c.fillRect(x+o-w/2+5,y-h*.55,4,h*.55);c.fillRect(x+o+w/2-9,y-h*.55,4,h*.55);
   if(r){c.fillStyle=`rgba(255,${180+Math.sin(game.time*9+k)*40|0},80,1)`;c.beginPath();c.arc(x+o,y-10,3.4,0,7);c.fill();}});
  c.strokeStyle=col('#9a7a5a','#6e665c');c.lineWidth=4;c.beginPath();c.arc(x,y-62,30,Math.PI*1.1,Math.PI*1.9);c.stroke();break;}
 case'dholavira':{c.fillStyle=col('#a88f6a','#857c70');c.fillRect(x-80,y-118,160,26);for(let k=0;k<8;k++)c.fillRect(x-80+k*21,y-126,11,8);
  for(let k=0;k<4;k++){const ins=k*13;c.fillStyle=k%2?col('#b39a74','#8a8276'):col('#9c8462','#7a7268');c.fillRect(x-100+ins,y-80+ins*.55,200-ins*2,80-ins*1.1);}
  if(r){const g=c.createLinearGradient(0,y-50,0,y-6);g.addColorStop(0,'#5ab4e0');g.addColorStop(1,'#2f7fb0');c.fillStyle=g;c.fillRect(x-48,y-48,96,36);c.strokeStyle='rgba(255,255,255,.5)';c.lineWidth=1.2;for(let k=0;k<3;k++){const wx=x-36+((game.time*12+k*30)%72);c.beginPath();c.moveTo(wx,y-36+k*9);c.lineTo(wx+10,y-36+k*9);c.stroke();}}
  else{c.fillStyle='#6e5a42';c.fillRect(x-48,y-48,96,36);c.strokeStyle='rgba(40,30,20,.6)';c.lineWidth=1;c.beginPath();c.moveTo(x-30,y-40);c.lineTo(x-10,y-28);c.lineTo(x+14,y-36);c.moveTo(x-10,y-28);c.lineTo(x-4,y-16);c.stroke();}break;}
 case'hampi':{[[-110,-40,44],[115,-36,38],[-80,-90,30],[90,-84,28],[-130,-6,26]].forEach(b=>{ell(x+b[0],y+b[1],b[2],b[2]*.85,col('#b58a62','#857c72'));ell(x+b[0]-b[2]*.3,y+b[1]-b[2]*.35,b[2]*.4,b[2]*.25,'rgba(255,255,255,.12)');});
  c.fillStyle=col('#9c8466','#7a7268');c.fillRect(x-76,y-16,152,16);
  for(let k=0;k<6;k++){const px=x-60+k*24;c.fillStyle=col('#c9a77e','#948b80');c.fillRect(px-5,y-80,10,64);c.fillStyle='rgba(0,0,0,.15)';c.fillRect(px-5,y-60,10,3);c.fillRect(px-5,y-40,10,3);
   if(r&&Math.random()<.01)game.parts.push({x:px,y:y-60,vx:(Math.random()-.5)*10,vy:-26,life:2,max:2,c:'#f8c950',s:0,txt:'♪'});}
  c.fillStyle=col('#a88f6a','#857c70');c.fillRect(x-84,y-92,168,13);c.fillRect(x-30,y-112,60,20);c.beginPath();c.moveTo(x-30,y-112);c.lineTo(x,y-140);c.lineTo(x+30,y-112);c.fill();break;}
 case'konark':{c.fillStyle=col('#6e5e52','#5a5550');c.fillRect(x-100,y-44,200,44);
  [-62,0,62].forEach(o=>{c.strokeStyle=col('#c9a070','#8a837a');c.lineWidth=3;c.beginPath();c.arc(x+o,y-22,17,0,7);c.stroke();c.lineWidth=1.6;for(let k=0;k<8;k++){const a=k*Math.PI/4+(r?game.time*.3:0);c.beginPath();c.moveTo(x+o,y-22);c.lineTo(x+o+Math.cos(a)*16,y-22+Math.sin(a)*16);c.stroke();}});
  for(let k=0;k<5;k++){const w=160-k*26;c.fillStyle=k%2?col('#7d6b5c','#615c56'):col('#8a7766','#6c6660');c.fillRect(x-w/2,y-60-k*18,w,18);}
  ell(x,y-152,14,8,col('#8a7766','#6c6660'));c.fillStyle=col('#f1b43c','#7a746c');c.beginPath();c.arc(x,y-164,5,0,7);c.fill();
  if(r){const g=c.createRadialGradient(x,y-200,0,x,y-200,60);g.addColorStop(0,'rgba(255,200,80,.6)');g.addColorStop(1,'rgba(255,200,80,0)');c.fillStyle=g;c.fillRect(x-60,y-260,120,120);}
  c.fillStyle=col('#9a8470','#76706a');for(let k=0;k<2;k++){const hx=x-130+k*18;c.fillRect(hx,y-22,14,8);c.fillRect(hx+10,y-30,5,10);c.fillRect(hx+1,y-14,2,12);c.fillRect(hx+11,y-14,2,12);}break;}
 case'nalanda':{const br=col('#b5533c','#857066');[[200,30],[160,28],[110,26],[60,20]].forEach((t,k)=>{const yy=y-[30,58,84,104][k];c.fillStyle=br;c.fillRect(x-t[0]/2,yy,t[0],t[1]);c.strokeStyle='rgba(60,20,10,.35)';c.lineWidth=1;for(let q=1;q<4;q++){c.beginPath();c.moveTo(x-t[0]/2,yy+q*t[1]/4);c.lineTo(x+t[0]/2,yy+q*t[1]/4);c.stroke();}});
  c.fillStyle='rgba(40,15,10,.55)';for(let k=0;k<7;k++){const nx=x-84+k*28;c.beginPath();c.moveTo(nx-5,y-6);c.lineTo(nx-5,y-16);c.arc(nx,y-16,5,Math.PI,0);c.lineTo(nx+5,y-6);c.fill();}
  c.fillStyle=col('#d9b08a','#958a80');c.fillRect(x-10,y-104,20,104);
  if(r)for(let k=0;k<5;k++){c.fillStyle=`rgba(255,${190+Math.sin(game.time*8+k)*40|0},90,1)`;c.beginPath();c.arc(x-60+k*30,y-60,2.6,0,7);c.fill();}break;}
 }
 if(!un){c.font='30px serif';c.textAlign='center';c.globalAlpha=.85;c.fillText('🔒',x,y-60);c.globalAlpha=1;}
 if(r&&Math.random()<.06)game.parts.push({x:x+(Math.random()-.5)*160,y:y-Math.random()*80,vx:0,vy:-18,life:2.5,max:2.5,c:'#f8c950',s:1.8});
 if(dist(x,y,player.x,player.y)<480){label(s.name+(r?'  '+'★'.repeat(S.stars[s.id]):''),x,y-250,r?'#f8c950':un?'#fff':'#a89a8c');}
}
function drawPointer(){
 const o=objective();if(o.x===null||o.x===undefined)return;
 const z=game.zoom,sx=(o.x-cam.x)*z,sy=(o.y-cam.y)*z,w=innerWidth,h=innerHeight,m=60;
 const c=ctx;
 if(sx>m&&sx<w-m&&sy>m&&sy<h-m){const b=Math.sin(game.time*4)*5;c.fillStyle='#f8c950';c.strokeStyle='#1a1210';c.lineWidth=2;c.beginPath();c.moveTo(sx,sy-90*z+b);c.lineTo(sx-10,sy-108*z+b);c.lineTo(sx+10,sy-108*z+b);c.closePath();c.fill();c.stroke();return;}
 const cx=w/2,cy=h/2,a=Math.atan2(sy-cy,sx-cx);let px=cx+Math.cos(a)*(w/2-m),py=cy+Math.sin(a)*(h/2-m);px=clamp(px,m,w-m);py=clamp(py,m+90,h-m);
 c.save();c.translate(px,py);c.fillStyle='rgba(20,12,10,.8)';c.beginPath();c.arc(0,0,22,0,7);c.fill();c.strokeStyle='#f1b43c';c.lineWidth=2;c.stroke();
 c.font='18px serif';c.textAlign='center';c.textBaseline='middle';c.fillText(o.i,0,1);c.rotate(a);c.fillStyle='#f8c950';c.beginPath();c.moveTo(34,0);c.lineTo(24,-7);c.lineTo(24,7);c.fill();c.restore();c.textBaseline='alphabetic';
}
function drawMini(){
 const m=mctx,sz=mini.width,span=2600,sc=sz/span,ox=player.x-span/2,oy=player.y-span/2;
 m.setTransform(1,0,0,1,0,0);m.clearRect(0,0,sz,sz);m.save();m.beginPath();m.arc(sz/2,sz/2,sz/2,0,7);m.clip();
 m.fillStyle='#1d4b6e';m.fillRect(0,0,sz,sz);m.imageSmoothingEnabled=true;
 m.drawImage(world.terrain,ox/TS*TPX,oy/TS*TPX,span/TS*TPX,span/TS*TPX,0,0,sz,sz);
 m.drawImage(world.fog,ox/FOG,oy/FOG,span/FOG,span/FOG,0,0,sz,sz);
 const toM=(x,y)=>[(x-ox)*sc,(y-oy)*sc];
 const explored=(x,y)=>{const c=Math.floor(x/FOG),r=Math.floor(y/FOG);return c>=0&&r>=0&&c<FC&&r<FR&&world.explored[r*FC+c];};
 m.font='14px serif';m.textAlign='center';m.textBaseline='middle';
 SITES.forEach((s,i)=>{if(!explored(s.x,s.y))return;const[a,b]=toM(s.x,s.y);m.fillStyle=done(s.id)?'rgba(241,180,60,.9)':'rgba(20,12,10,.7)';m.beginPath();m.arc(a,b,9,0,7);m.fill();m.fillText(s.icon,a,b+1);});
 LANDMARKS.forEach(l=>{if(!S.lms.includes(l.id))return;const[a,b]=toM(l.x,l.y);m.font='11px serif';m.fillText(l.icon,a,b);});
 NPCS.forEach(n=>{if(!explored(n.x,n.y))return;const[a,b]=toM(n.x,n.y);m.fillStyle=S.npcs.includes(n.id)?'#e8dcc8':'#e58667';m.beginPath();m.arc(a,b,3,0,7);m.fill();});
 {const[a,b]=toM(world.camp.x,world.camp.y);m.font='12px serif';m.fillText('🏕️',a,b);}
 const o=objective();if(o.x!=null){const[a,b]=toM(o.x,o.y),d=Math.hypot(a-sz/2,b-sz/2),R=sz/2-12;let ax=a,ay=b;if(d>R){ax=sz/2+(a-sz/2)/d*R;ay=sz/2+(b-sz/2)/d*R;}m.fillStyle='#f8c950';m.beginPath();m.arc(ax,ay,5+Math.sin(game.time*5)*1.5,0,7);m.fill();m.strokeStyle='#1a1210';m.lineWidth=1.5;m.stroke();}
 if(S.items.includes('compass')){const c=nearest(CHESTS.filter(c=>!S.chests.includes(c.id)));if(c){const a=Math.atan2(c.y-player.y,c.x-player.x),R=sz/2-8;m.fillStyle='#b06fe0';m.save();m.translate(sz/2+Math.cos(a)*R,sz/2+Math.sin(a)*R);m.rotate(a);m.beginPath();m.moveTo(6,0);m.lineTo(-5,-5);m.lineTo(-5,5);m.fill();m.restore();}}
 m.translate(sz/2,sz/2);m.rotate(player.face>0?0:Math.PI);m.fillStyle='#fff';m.strokeStyle='#1a1210';m.lineWidth=2;m.beginPath();m.moveTo(8,0);m.lineTo(-6,-6);m.lineTo(-3,0);m.lineTo(-6,6);m.closePath();m.stroke();m.fill();
 m.restore();m.strokeStyle='rgba(241,180,60,.6)';m.lineWidth=3;m.beginPath();m.arc(sz/2,sz/2,sz/2-1.5,0,7);m.stroke();
}
function burst(x,y,col,n,sp){sp=sp||90;for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=Math.random()*sp;game.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-sp*.3,g:sp*1.5,life:.6+Math.random()*.6,max:1.2,c:col,s:2+Math.random()*2});}}
function floatText(t,x,y,col){game.parts.push({x,y,vx:0,vy:-34,life:1.6,max:1.6,c:col||'#fff',s:0,txt:t});}

/* ===================== HUD & UI ===================== */
function updateHUD(force){
 const L=levelOf(S.xp),a=xpFor(L),b=xpFor(L+1);
 $('hpLvl').textContent=L;gameText('hpTitle',titleOf(L)+' · '+S.xp+' XP');$('hpXp').style.width=((S.xp-a)/(b-a)*100)+'%';
 $('hpSt').style.width=(player.stam*100)+'%';
 $('hpAv').firstChild.nodeValue=L>=7?'👑':L>=5?'🦚':L>=3?'🧭':'🎒';
 const o=objective();gameText('hqT',o.i+' '+o.t);
 gameText('hqD',o.x!=null?'≈ '+Math.round(dist(o.x,o.y,player.x,player.y)/4)+' paces · '+compassDir(o.x-player.x,o.y-player.y):'');
 const h=Math.floor(S.time*24),mi=Math.floor((S.time*24-h)*60);
 $('hudClock').innerHTML=(game.dark>.35?'🌙':game.dusk>.5?'🌇':'☀️')+' '+String(h).padStart(2,'0')+':'+String(mi).padStart(2,'0')+(game.rain>.4?' · 🌧️':'');
 gameText('miniLabel',game.region);
}
function compassDir(dx,dy){const a=(Math.atan2(dy,dx)*180/Math.PI+360+90)%360;return['north','north-east','east','south-east','south','south-west','west','north-west'][Math.round(a/45)%8];}
function toast(html,cls,ms){const t=document.createElement('div');t.className='toast glass '+(cls||'');t.innerHTML=html;const box=$('toasts');box.appendChild(t);I18n().translate(t);while(box.children.length>4)box.firstChild.remove();setTimeout(()=>{t.classList.add('out');setTimeout(()=>t.remove(),500);},ms||2800);}
function achToast(a){toast(`<div class="ai">${a.i}</div><div><small>HONOUR UNLOCKED · +25 XP</small><b>${a.n}</b><div style="font-weight:500;font-size:12px;color:#645135">${a.d}</div></div>`,'ach',4200);}
let banT=0;
function showBanner(k,t){gameText('banK',k);gameText('banT',t);const b=$('banner');b.classList.add('show');clearTimeout(banT);banT=setTimeout(()=>b.classList.remove('show'),2600);}
function fadeDo(fn){const f=$('fade');f.classList.add('on');setTimeout(()=>{fn();setTimeout(()=>f.classList.remove('on'),120);},380);}

/* ---------- dialogue ---------- */
const dlg={lines:[],i:0,pos:0,typing:false,timer:0,onEnd:null};
function talk(name,role,av,lines,onEnd){
 game.ui='dialogue';game.target=null;dlg.lines=lines;dlg.i=0;dlg.onEnd=onEnd||null;
 gameText('dlgName',name);gameText('dlgRole',role||'');$('dlgAv').textContent=av;$('dlg').classList.remove('hidden');$('prompt').classList.add('hidden');showLine();
}
function dialogueHTML(){
 const source=dlg.lines[dlg.i]||'';
 // Complete authored lines allow Hindi word order to differ around <b> labels.
 const translated=I18n().t(source);
 return translated!==source?translated:I18n().translateHTML(source);
}
function finishDialogueLine(){
 clearInterval(dlg.timer);dlg.typing=false;$('dlgText').innerHTML=dialogueHTML();
}
function showLine(){
 dlg.pos=0;dlg.typing=true;clearInterval(dlg.timer);Sound.tap();
 const box=$('dlgText');box.innerHTML=dialogueHTML();
 // Type grapheme clusters, not UTF-16 slices: a Hindi vowel sign or conjunct
 // stays attached to its letter, and formatting tags are never cut in half.
 const segmenter=typeof Intl.Segmenter==='function'?new Intl.Segmenter(I18n().locale(),{granularity:'grapheme'}):null;
 const walker=document.createTreeWalker(box,NodeFilter.SHOW_TEXT),frames=[];
 let node;
 while((node=walker.nextNode())){
  const parts=segmenter?Array.from(segmenter.segment(node.data),part=>part.segment):Array.from(node.data);
  frames.push({node,parts});node.data='';
 }
 let frame=0,part=0;
 dlg.timer=setInterval(()=>{
  while(frame<frames.length&&part>=frames[frame].parts.length){frame++;part=0;}
  if(frame>=frames.length){clearInterval(dlg.timer);dlg.typing=false;return;}
  frames[frame].node.data+=frames[frame].parts[part++];dlg.pos++;
 },18);
}
function advance(){
 if(dlg.typing){finishDialogueLine();return;}
 dlg.i++;if(dlg.i<dlg.lines.length)showLine();else closeDialog();
}
addEventListener('mirava:languagechange',()=>{
 gameTextState.clear();
 updateGameHeadings();updateGameSyllables();
 if(game.running)updateHUD();
 if(game.ui==='dialogue')finishDialogueLine();
});
addEventListener('mirava:catalogue',()=>{
 gameTextState.clear();
 updateGameHeadings();updateGameSyllables();
 if(game.running)updateHUD();
 if(game.ui==='dialogue')finishDialogueLine();
});
function closeDialog(silent){clearInterval(dlg.timer);$('dlg').classList.add('hidden');if(game.ui==='dialogue')game.ui=null;const f=dlg.onEnd;dlg.onEnd=null;if(f&&!silent)f();}
$('dlg').addEventListener('click',advance);
function talkNPC(n){
 const first=!S.npcs.includes(n.id);
 talk(n.name,n.role,n.av,first?n.intro:n.repeat,()=>{
  if(first){S.npcs.push(n.id);addXP(10,n.x,n.y);
   if(n.id==='dadi'){S.intro=true;toast('📜 <b>Quest begun:</b> The Fading Lamps');showBanner('Quest begun','The Fading Lamps');Sound.fanfare();}
   if(S.npcs.length===NPCS.length&&!S.items.includes('compass')){S.items.push('compass');setTimeout(()=>rewardCard('compass',0,'A gift from the villagers'),300);}
   save();}
 });
}
/* ---------- panels ---------- */
let panelClose=null;
function openPanel(o){
 game.ui='panel';game.target=null;$('panelK').textContent=o.kicker||'';$('panelT').textContent=o.title||'';$('panelB').innerHTML=o.html||'';
 $('panel').className='panel'+(o.wide?' wide':'');$('panelWrap').classList.remove('hidden');panelClose=o.onClose||null;if(o.onMount)o.onMount($('panelB'));I18n().translate($('panel'));
}
function closePanel(){if($('panelWrap').classList.contains('hidden'))return;$('panelWrap').classList.add('hidden');if(game.ui==='panel')game.ui=null;const f=panelClose;panelClose=null;if(f)f();}
$('panelWrap').addEventListener('click',e=>{if(e.target===$('panelWrap')||e.target.closest('[data-close]'))closePanel();});
function itemInfo(id){
 if(id.startsWith('relic_')){const s=SITES.find(x=>'relic_'+x.id===id);return{icon:s.relic.icon,name:s.relic.name,desc:s.relic.desc,rarity:'legendary',kind:'Site relic · '+s.name};}
 if(id.startsWith('tr_')){const t=TREASURES[+id.slice(3)];return Object.assign({kind:'Buried treasure'},t);}
 return{icon:'🧭',name:"Seeker's Compass",desc:'A gift from every villager you befriended. Buried treasure now reveals itself from much further away, and a violet arrow on your minimap points to the nearest one.',rarity:'legendary',kind:'Tool'};
}
function rewardCard(id,xp,kicker){
 const it=itemInfo(id);Sound.fanfare();
 openPanel({kicker:kicker||'Treasure unearthed',title:it.name,html:`<div class="reward"><div class="reward-ic r-${it.rarity}">${it.icon}</div><span class="rar">${it.rarity} · ${esc(it.kind)}</span><p>${esc(it.desc)}</p>${xp?`<div class="xp">+${xp} XP</div>`:''}<button class="btn gold" data-close>Add to bag</button></div>`});
}
function openBag(){
 const items=S.items.slice();const slots=Math.max(24,items.length);
 let h='<div class="bag-grid">';for(let i=0;i<slots;i++){if(items[i]){const it=itemInfo(items[i]);h+=`<div class="slot r-${it.rarity}" data-item="${items[i]}" title="${esc(it.name)}">${it.icon}</div>`;}else h+='<div class="slot empty">·</div>';}
 h+='</div><div class="bag-detail" id="bagD">'+(items.length?'Select an item to read its story.':'Your bag is empty. Restore sites and dig up buried treasure to fill it.')+'</div>';
 openPanel({kicker:'Inventory · '+items.length+' items',title:'Your Bag',html:h,onMount:b=>b.querySelectorAll('[data-item]').forEach(el=>el.addEventListener('click',()=>{const it=itemInfo(el.dataset.item);$('bagD').innerHTML=`<span class="rar">${it.rarity} · ${esc(it.kind)}</span><br><b>${it.icon} ${esc(it.name)}</b><br>${esc(it.desc)}`;Sound.tap();}))});
}
function openQuests(){
 const rows=[
  ['main','🪔','The Fading Lamps','Restore all seven heritage sites',SITES.filter(s=>done(s.id)).length,7],
  ['chests','🎁','Buried Treasures','Unearth the treasures villagers whisper about',S.chests.length,10],
  ['lms','🗺️','Wonders of the Land','Discover every landmark',S.lms.length,10],
  ['scrolls','📜','Lost Lore','Gather the scattered lore scrolls',S.scrolls.length,12],
  ['npcs','🤝','Voices of the Land','Speak with every villager',S.npcs.length,NPCS.length]];
 let h=rows.map(r=>`<div class="q-item ${S.track===r[0]?'tracked':''}"><div class="qi">${r[1]}</div><div class="qm"><b>${r[2]}</b><p><span>${r[3]}</span> — <span>${r[4]}/${r[5]}</span></p><div class="bar xp"><i style="width:${r[4]/r[5]*100}%"></i></div></div><button class="btn small ${S.track===r[0]?'gold':''}" data-track="${r[0]}">${S.track===r[0]?'Tracking':'Track'}</button></div>`).join('');
 h+=`<h3 style="font:700 20px 'Playfair Display';margin:22px 0 12px">Honours · ${S.ach.length}/${ACH.length}</h3><div class="ach-grid">`+ACH.map(a=>`<div class="ach ${S.ach.includes(a.id)?'':'off'}"><div class="ai">${a.i}</div><div><b>${a.n}</b><small>${a.d}</small></div></div>`).join('')+'</div>';
 openPanel({kicker:'Journal',title:'Quests & Honours',html:h,wide:true,onMount:b=>b.querySelectorAll('[data-track]').forEach(el=>el.addEventListener('click',()=>{S.track=el.dataset.track;Sound.tap();updateHUD();openQuests();}))});
}
function openCodex(tab){
 tab=tab||'sites';
 const tabs=[['sites','Heritage Sites'],['lms','Landmarks'],['scrolls','Lore Scrolls']];
 let h='<div class="tabs">'+tabs.map(t=>`<button class="tab ${t[0]===tab?'on':''}" data-tab="${t[0]}">${t[1]}</button>`).join('')+'</div><div class="codex-grid">';
 if(tab==='sites')h+=SITES.map((s,i)=>done(s.id)?`<div class="cx"><h4>${s.icon} ${s.name}</h4><p>${s.lore}</p></div>`:`<div class="cx off"><h4>${unlocked(i)?s.icon+' '+s.name:'🔒 ???'}</h4><p>Restore this site to unlock its story.</p></div>`).join('');
 if(tab==='lms')h+=LANDMARKS.map(l=>S.lms.includes(l.id)?`<div class="cx"><h4>${l.icon} ${l.name}</h4><p>${l.lore}</p></div>`:'<div class="cx off"><h4>❔ Undiscovered</h4><p>Explore the land to find this wonder.</p></div>').join('');
 if(tab==='scrolls')h+=SCROLLS.map((s,i)=>S.scrolls.includes(i)?`<div class="cx"><h4>📜 ${s.t}</h4><p>${s.x}</p></div>`:'<div class="cx off"><h4>📜 Lost scroll</h4><p>Glowing scrolls are scattered across the land.</p></div>').join('');
 h+='</div>';
 const cnt=SITES.filter(s=>done(s.id)).length+S.lms.length+S.scrolls.length;
 openPanel({kicker:'Heritage codex · '+cnt+'/29 entries',title:'The Codex',html:h,wide:true,onMount:b=>b.querySelectorAll('[data-tab]').forEach(el=>el.addEventListener('click',()=>{Sound.tap();openCodex(el.dataset.tab);}))});
}
function ftPoints(){
 const explored=(x,y)=>world.explored[Math.floor(y/FOG)*FC+Math.floor(x/FOG)];
 const pts=[{n:'Storyteller\'s Camp',i:'🏕️',x:world.camp.x+40,y:world.camp.y+110}];
 SITES.forEach(s=>{if(explored(s.x,s.y))pts.push({n:s.name,i:s.icon,x:s.x,y:s.y+110});});
 LANDMARKS.forEach(l=>{if(S.lms.includes(l.id))pts.push({n:l.name,i:l.icon,x:l.x,y:l.y+70});});
 return pts;
}
function teleport(p){
 closePanel();Sound.chime();
 fadeDo(()=>{let x=p.x,y=p.y;for(let r=0;r<300&&!walkable(x,y);r+=20){x=p.x+Math.cos(r)*r;y=p.y+Math.sin(r)*r;}player.x=x;player.y=y;pet.x=x-40;pet.y=y;cam.x=clamp(x-game.VW/2,0,W-game.VW);cam.y=clamp(y-game.VH/2,0,H-game.VH);game.target=null;showBanner('Arrived at',p.n);});
}
function openMap(){
 const pts=ftPoints(),hh=Math.min(innerHeight*.7,640),ww=Math.round(hh*W/H);
 const h=`<div class="map-wrap"><canvas id="mapCv" width="${ww*2}" height="${hh*2}" style="width:${ww}px;height:${hh}px"></canvas><div class="ft-list"><div class="panel-k" style="margin-bottom:4px">Fast travel</div>${pts.map((p,i)=>`<button class="ft" data-ft="${i}"><span>${p.i}</span>${esc(p.n)}</button>`).join('')}<p style="font-size:11.5px;color:var(--dim);line-height:1.6;margin-top:8px">Discover landmarks and reach sites to unlock more travel points. Click a marker on the map to travel.</p></div></div>`;
 openPanel({kicker:'The subcontinent · '+Math.round(exploredPct()*100)+'% explored',title:'World Map',html:h,wide:true,onMount:b=>{
  const mc=$('mapCv'),g=mc.getContext('2d'),sc=mc.width/W;
  g.fillStyle='#1d4b6e';g.fillRect(0,0,mc.width,mc.height);g.imageSmoothingEnabled=true;g.drawImage(world.terrain,0,0,mc.width,mc.height);
  g.strokeStyle='rgba(120,80,40,.35)';g.lineWidth=2;world.roads.forEach(r=>{g.beginPath();r.forEach((p,i)=>i?g.lineTo(p.x*sc,p.y*sc):g.moveTo(p.x*sc,p.y*sc));g.stroke();});
  g.drawImage(world.fog,0,0,mc.width,mc.height);
  g.textAlign='center';g.textBaseline='middle';
  SITES.forEach((s,i)=>{if(!world.explored[Math.floor(s.y/FOG)*FC+Math.floor(s.x/FOG)])return;g.fillStyle=done(s.id)?'rgba(241,180,60,.95)':'rgba(20,12,10,.75)';g.beginPath();g.arc(s.x*sc,s.y*sc,16,0,7);g.fill();g.font='18px serif';g.fillText(s.icon,s.x*sc,s.y*sc+1);});
  LANDMARKS.forEach(l=>{if(!S.lms.includes(l.id))return;g.font='18px serif';g.fillText(l.icon,l.x*sc,l.y*sc);});
  g.font='18px serif';g.fillText('🏕️',world.camp.x*sc,world.camp.y*sc);
  g.fillStyle='#fff';g.strokeStyle='#1a1210';g.lineWidth=3;g.beginPath();g.arc(player.x*sc,player.y*sc,8,0,7);g.fill();g.stroke();
  g.font='700 20px Manrope';g.fillStyle='#f8c950';g.fillText('YOU',player.x*sc,player.y*sc-20);
  mc.addEventListener('click',e=>{const rc=mc.getBoundingClientRect(),x=(e.clientX-rc.left)/rc.width*W,y=(e.clientY-rc.top)/rc.height*H;let best=null,bd=180;pts.forEach(p=>{const d=dist(p.x,p.y-80,x,y);if(d<bd){bd=d;best=p;}});if(best)teleport(best);});
  b.querySelectorAll('[data-ft]').forEach(el=>el.addEventListener('click',()=>teleport(pts[+el.dataset.ft])));
 }});
}
function exploredPct(){let e=0;for(let i=0;i<world.explored.length;i++)if(world.explored[i]&&world.land[i])e++;return e/world.landN;}
function openPause(){
 const on=v=>v?'gold':'';
 openPanel({kicker:'Paused',title:'Menu',html:`
  <div class="opt-row"><span>🔊 Sound effects</span><button class="btn small ${on(S.settings.sound)}" data-opt="sound">${S.settings.sound?'On':'Off'}</button></div>
  <div class="opt-row"><span>🎶 Tanpura music</span><button class="btn small ${on(S.settings.music)}" data-opt="music">${S.settings.music?'On':'Off'}</button></div>
  <div class="opt-row"><span>✨ Lighting & effects</span><button class="btn small ${on(S.settings.hi)}" data-opt="hi">${S.settings.hi?'High':'Low'}</button></div>
  <div class="keys"><kbd>WASD / ↑↓←→</kbd><span>Walk (or click / tap the ground)</span><kbd>Shift</kbd><span>Run</span><kbd>E / Space</kbd><span>Talk, restore, dig, rest</span><kbd>M</kbd><span>Map & fast travel</span><kbd>Q</kbd><span>Quests & honours</span><kbd>I</kbd><span>Bag</span><kbd>C</kbd><span>Codex</span><kbd>P</kbd><span>Postcard (screenshot)</span><kbd>Wheel</kbd><span>Zoom</span></div>
  <div class="mg-actions"><button class="btn gold" data-close>Resume</button><button class="btn" id="pQuit">Save & return to dashboard</button></div>`,
  onMount:b=>{b.querySelectorAll('[data-opt]').forEach(el=>el.addEventListener('click',()=>{const k=el.dataset.opt;S.settings[k]=!S.settings[k];Sound.init();Sound.setRain(game.rain);save();openPause();}));$('pQuit').addEventListener('click',exitGame);}});
}
function postcard(){
 if(game.ui)return;
 const t=document.createElement('canvas'),w=cv.width,h=cv.height,pad=Math.round(28*game.dpr),cap=Math.round(70*game.dpr);
 t.width=w+pad*2;t.height=h+pad*2+cap;const g=t.getContext('2d');
 g.fillStyle='#f5e6c8';g.fillRect(0,0,t.width,t.height);g.drawImage(cv,pad,pad);
 g.strokeStyle='#b0262f';g.lineWidth=3*game.dpr;g.strokeRect(pad/2,pad/2,t.width-pad,t.height-pad);
 g.fillStyle='#55232f';g.font=`700 ${26*game.dpr}px 'Playfair Display'`;g.textBaseline='middle';g.fillText('Greetings from '+game.region,pad,h+pad+cap/2);
 g.textAlign='right';g.font=`500 ${13*game.dpr}px 'DM Mono'`;g.fillStyle='#8a6a5a';I18n().drawLiteral(g,I18n().t('LOST LEGENDS OF BHARAT')+' · '+pname.toUpperCase(),t.width-pad,h+pad+cap/2);
 const a=document.createElement('a');a.download='lost-legends-postcard.png';a.href=t.toDataURL('image/png');a.click();
 Sound.tone(1200,.08,'square',.05);$('fade').style.background='#fff';$('fade').classList.add('on');setTimeout(()=>{$('fade').classList.remove('on');setTimeout(()=>$('fade').style.background='#000',400);},90);
 toast('📸 Postcard saved to your downloads');unlockAch('photo');
}
function restFire(){
 const night=game.dark>.3;fadeDo(()=>{S.time=night?.27:.74;game.rainTarget=0;game.rain=0;toast(night?'🌅 You wake at dawn, rested.':'🌇 The sun sinks low. The stars will soon be out.');player.stam=1;});
}
function digChest(c){
 game.ui='busy';Sound.dig();game.shake=.3;burst(c.x,c.y,'#8a6440',30,120);
 setTimeout(()=>{S.chests.push(c.id);c.rev=false;const id='tr_'+c.t;S.items.push(id);const tr=TREASURES[c.t];burst(c.x,c.y-10,'#f8c950',30);
  game.ui=null;addXP(tr.xp,c.x,c.y);save();rewardCard(id,tr.xp,'Treasure unearthed · '+S.chests.length+'/10');},650);
}

/* ===================== INPUT ===================== */
addEventListener('keydown',e=>{
 if($('gameScreen').classList.contains('hidden')||!game.running)return;
 Sound.init();const k=e.key.toLowerCase();
 if(game.ui==='minigame'){if(k==='escape')closeMG();return;}
 if(game.ui==='dialogue'){if(k==='e'||k===' '||k==='enter'){e.preventDefault();advance();}return;}
 if(game.ui==='panel'){if(k==='escape'||k==='m'||k==='i'||k==='q'||k==='c'){e.preventDefault();closePanel();}return;}
 if(game.ui)return;
 keys[k]=true;
 if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();
 if(k==='e'||k===' '||k==='enter')interact();
 else if(k==='m')openMap();else if(k==='i'||k==='b')openBag();else if(k==='q'||k==='j')openQuests();else if(k==='c')openCodex();else if(k==='p')postcard();else if(k==='escape')openPause();
 else if(k==='='||k==='+'){game.zoomSet=true;game.zoom=clamp(game.zoom*1.1,.6,1.6);resize();}else if(k==='-'){game.zoomSet=true;game.zoom=clamp(game.zoom/1.1,.6,1.6);resize();}
});
addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false;});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;});
cv.addEventListener('wheel',e=>{e.preventDefault();game.zoomSet=true;game.zoom=clamp(game.zoom*(e.deltaY>0?.92:1.08),.6,1.6);resize();},{passive:false});
cv.addEventListener('contextmenu',e=>e.preventDefault());
cv.addEventListener('pointerdown',e=>{
 Sound.init();if(!game.running)return;
 if(game.ui==='dialogue'){advance();return;}if(game.ui)return;
 const rc=cv.getBoundingClientRect(),sx=e.clientX-rc.left,sy=e.clientY-rc.top;
 if(e.pointerType==='touch'&&sx<rc.width*.45&&sy>rc.height*.3&&stickV.id===null){stickV={id:e.pointerId,ox:sx,oy:sy,x:0,y:0};const st=$('stick');st.style.left=sx+'px';st.style.top=sy+'px';st.classList.remove('hidden');$('knob').style.transform='';cv.setPointerCapture(e.pointerId);return;}
 const wx=cam.x+sx/game.zoom,wy=cam.y+sy/game.zoom;
 let hit=null;
 NPCS.forEach(n=>{if(dist(n.x,n.y-22,wx,wy)<30)hit={type:'npc',o:n,range:85,x:n.x,y:n.y};});
 SITES.forEach(s=>{if(Math.abs(wx-s.x)<110&&wy<s.y+20&&wy>s.y-200)hit={type:'site',o:s,range:170,x:s.x,y:s.y+60};});
 CHESTS.forEach(c=>{if(c.rev&&!S.chests.includes(c.id)&&dist(c.x,c.y,wx,wy)<36)hit={type:'chest',o:c,range:75,x:c.x,y:c.y+20};});
 if(dist(world.camp.x+30,world.camp.y,wx,wy)<36)hit={type:'fire',range:100,x:world.camp.x+30,y:world.camp.y+40};
 if(hit){if(dist(hit.x,hit.y,player.x,player.y)<hit.range)doInteract(hit);else game.target={x:hit.x,y:hit.y,then:hit};return;}
 game.target={x:wx,y:wy};burst(wx,wy,'rgba(248,201,80,.8)',6,30);
});
cv.addEventListener('pointermove',e=>{if(e.pointerId!==stickV.id)return;const rc=cv.getBoundingClientRect(),dx=e.clientX-rc.left-stickV.ox,dy=e.clientY-rc.top-stickV.oy,d=Math.hypot(dx,dy),m=Math.min(d,50);
 stickV.x=d?dx/d*m/50:0;stickV.y=d?dy/d*m/50:0;$('knob').style.transform=`translate(${stickV.x*36}px,${stickV.y*36}px)`;});
const endStick=e=>{if(e.pointerId!==stickV.id)return;stickV={id:null,x:0,y:0,ox:0,oy:0};$('stick').classList.add('hidden');};
cv.addEventListener('pointerup',endStick);cv.addEventListener('pointercancel',endStick);
$('tAct').addEventListener('click',()=>{Sound.init();if(game.ui==='dialogue')advance();else interact();});
$('tRun').addEventListener('click',()=>{game.sprintLock=!game.sprintLock;$('tRun').classList.toggle('on',game.sprintLock);});
$('bMap').onclick=()=>{if(!game.ui)openMap();};$('bQuest').onclick=()=>{if(!game.ui)openQuests();};$('bBag').onclick=()=>{if(!game.ui)openBag();};
$('bCodex').onclick=()=>{if(!game.ui)openCodex();};$('bPhoto').onclick=()=>postcard();$('bPause').onclick=()=>{if(!game.ui)openPause();};
on(document,'visibilitychange',()=>{if(document.hidden&&game.running)save();});
addEventListener('beforeunload',()=>{if(game.running)save();});

/* ===================== MINIGAMES ===================== */
let mgClean=null,mgSite=null;
function openSite(s){
 game.ui='minigame';mgSite=s;game.target=null;Sound.chime();
 $('mg').classList.remove('hidden');$('mgK').textContent=s.kicker;$('mgT').textContent=s.icon+' '+s.name;gameText('mgS',S.stars[s.id]?'Best: '+'★'.repeat(S.stars[s.id]):'Not yet restored');
 $('mgPW').classList.add('hidden');
 $('mgB').innerHTML=`<div class="mg-intro"><div class="big">${s.icon}</div><p>${s.lore}</p><div class="how"><b>How to restore:</b> ${s.how}</div><div class="mg-actions"><button class="btn gold" id="mgGo">${done(s.id)?'Play again':'Begin restoration'}</button><button class="btn" id="mgLater">Not now</button></div></div>`;
 $('mgGo').onclick=()=>runGame(s);$('mgLater').onclick=closeMG;I18n().translate($('mg'));
}
function runGame(s){
 if(mgClean){try{mgClean();}catch(e){}mgClean=null;}
 $('mgB').innerHTML='';$('mgP').style.width='0';$('mgPW').classList.remove('hidden');
 const api={status:t=>gameText('mgS',t),progress:p=>$('mgP').style.width=(clamp(p,0,1)*100)+'%',win:(st,d)=>finishGame(s,st,d),fail:m=>failGame(s,m)};
 mgClean=GAMES[s.game]($('mgB'),api)||null;I18n().translate($('mg'));
}
function closeMG(){if(mgClean){try{mgClean();}catch(e){}mgClean=null;}$('mg').classList.add('hidden');if(game.ui==='minigame')game.ui=null;}
$('mgX').onclick=closeMG;
function finishGame(s,st,detail){
 if(mgClean){try{mgClean();}catch(e){}mgClean=null;}
 const prev=S.stars[s.id]||0,first=!prev;let gain=0;
 if(st>prev){gain=Math.round(s.xp*(st-prev)/3);S.stars[s.id]=st;}
 if(first){gain+=Math.round(s.xp/2);S.items.push('relic_'+s.id);}
 $('mgP').style.width='100%';Sound.fanfare();
 const idx=SITES.indexOf(s),next=SITES[idx+1];
 $('mgB').innerHTML=`<div class="mg-result"><div class="rs">${[0,1,2].map(i=>`<span class="${i<st?'':'off'}" style="animation-delay:${i*.18}s">⭐</span>`).join('')}</div>
  <h3>${first?s.name+' restored!':st>prev?'A new best!':'Well played'}</h3><p>${esc(detail||'')}</p>
  ${gain?`<p style="font:800 20px 'Playfair Display';color:var(--gold-t)">+${gain} XP</p>`:'<p style="color:var(--dim)">Beat your best stars to earn more XP.</p>'}
  ${first?`<p>${s.relic.icon} <b>${s.relic.name}</b> added to your bag.</p>`:''}
  ${first&&next?`<p style="color:var(--gold-t)">✦ A new flame awakens: <b>${next.name}</b></p>`:''}
  <div class="mg-actions"><button class="btn gold" id="mgBack">Return to the world</button><button class="btn" id="mgAgain">Play again</button></div></div>`;
 $('mgBack').onclick=closeMG;$('mgAgain').onclick=()=>runGame(s);
 if(gain)addXP(gain,s.x,s.y);
 if(first){burst(s.x,s.y-80,'#f8c950',60,160);confetti();setTimeout(()=>{showBanner('Flame restored',s.name);},200);
  if(SITES.every(q=>done(q.id))&&!S.ended){S.ended=true;setTimeout(showEnding,900);}}
 checkAch();save();
 if(S.ended)submitCompletion();
}
function failGame(s,msg){
 if(mgClean){try{mgClean();}catch(e){}mgClean=null;}Sound.buzz();
 $('mgB').innerHTML=`<div class="mg-result"><div class="rs"><span class="off">⭐</span><span class="off">⭐</span><span class="off">⭐</span></div><h3>The flame flickers…</h3><p>${esc(msg)}</p><div class="mg-actions"><button class="btn gold" id="mgAgain">Try again</button><button class="btn" id="mgBack">Return to the world</button></div></div>`;
 $('mgBack').onclick=closeMG;$('mgAgain').onclick=()=>runGame(s);
}
function confetti(){const cols=['#f1b43c','#df5934','#8ab372','#f8c950','#1f5fb2','#b0262f'];for(let i=0;i<70;i++){const d=document.createElement('div');d.className='confetti';d.style.left=Math.random()*100+'vw';d.style.background=cols[ri(cols.length)];d.style.animationDuration=(1.8+Math.random()*1.8)+'s';d.style.animationDelay=(Math.random()*.6)+'s';appRoot.appendChild(d);setTimeout(()=>d.remove(),4500);}}
function showEnding(){
 closeMG();confetti();setTimeout(confetti,900);Sound.fanfare();
 const tot=SITES.reduce((a,s)=>a+(S.stars[s.id]||0),0);
 openPanel({kicker:'The Fading Lamps · complete',title:'The lamps burn bright again',wide:false,html:`<div class="reward"><div class="reward-ic r-legendary">👑</div><p>From the painted walls of Mithila to the halls of Nalanda, every flame you touched is burning again. Dadi Saraswati says the land will remember your name — <b><span translate="no">${esc(pname)}</span>, Keeper of Bharat</b>.</p>
  <div class="stat-grid" style="margin:16px 0"><div class="stat"><b>${tot}/21</b><small>Stars</small></div><div class="stat"><b>${S.chests.length}/10</b><small>Treasures</small></div><div class="stat"><b>${S.scrolls.length}/12</b><small>Scrolls</small></div><div class="stat"><b>${S.xp}</b><small>XP</small></div></div>
  <p style="font-size:13px;color:var(--dim)">The world stays open — hunt the remaining treasures, chase three stars everywhere, and collect every honour.</p><button class="btn gold" data-close>Keep exploring</button></div>`});
}
const GAMES={};

/* ---------- 1. Madhubani Memory ---------- */
GAMES.memory=(body,api)=>{
 const motifs=['🐟','🦚','🌞','🌙','🐘','🪷','🌳','🐢'],deck=shuffle(motifs.concat(motifs));
 body.innerHTML='<div class="mem-grid" id="memG"></div>';const grid=$('memG');
 let open=[],matched=0,moves=0,lock=true;const t0=performance.now();
 const cards=deck.map(sym=>{const b=document.createElement('div');b.className='mem open';b.innerHTML=`<div class="in"><div class="b">✦</div><div class="f">${sym}</div></div>`;
  b.onclick=()=>{if(lock||b.classList.contains('open'))return;b.classList.add('open');Sound.tap();open.push([b,sym]);
   if(open.length===2){moves++;lock=true;const[a,c]=open;
    if(a[1]===c[1]){setTimeout(()=>{a[0].classList.add('done');c[0].classList.add('done');matched++;Sound.chime();open=[];lock=false;api.progress(matched/8);api.status(`Moves ${moves} · Pairs ${matched}/8`);
      if(matched===8){const secs=Math.round((performance.now()-t0)/1000);api.win(moves<=12?3:moves<=17?2:1,`${moves} moves · ${secs} seconds`);}},280);}
    else setTimeout(()=>{a[0].classList.remove('open');c[0].classList.remove('open');open=[];lock=false;},760);
    api.status(`Moves ${moves} · Pairs ${matched}/8`);}};
  grid.appendChild(b);return b;});
 api.status('Memorise the motifs…');
 const tm=setTimeout(()=>{cards.forEach(c=>c.classList.remove('open'));lock=false;api.status('Moves 0 · Pairs 0/8');},1500);
 return()=>clearTimeout(tm);
};

/* ---------- 2. Brahmi Cipher ---------- */
GAMES.cipher=(body,api)=>{
 const SY={ka:0x11013,ga:0x11015,ja:0x1101A,ta:0x11022,da:0x11024,na:0x11026,pa:0x11027,ma:0x1102B,ya:0x1102C,ra:0x1102D,la:0x1102E,va:0x1102F,sa:0x11032};
 const G=s=>String.fromCodePoint(SY[s]);
 const WORDS=shuffle([{s:['va','na'],w:'vana',m:'forest'},{s:['ja','la'],w:'jala',m:'water'},{s:['ka','ma','la'],w:'kamala',m:'lotus'},{s:['na','ga','ra'],w:'nagara',m:'city'},{s:['na','ya','na'],w:'nayana',m:'eye'}]);
 const all=Object.keys(SY);let round=0,mist=0,pos=0,timers=[];
 function render(){
  const w=WORDS[round],worn=round>=3?new Set(shuffle(all.slice()).slice(0,7)):new Set();
  const opts=shuffle(Array.from(new Set(w.s.concat(shuffle(all.filter(x=>!w.s.includes(x))).slice(0,6)))));
  body.innerHTML=`<div class="cip-key">${all.map(k=>`<span class="${worn.has(k)?'worn':''}"><b>${G(k)}</b><small data-game-syllable="${k}" data-mirava-localized="true">${gameSyllable(k)}</small></span>`).join('')}</div>
   <div class="panel-k" style="margin-bottom:8px">Inscription ${round+1} of ${WORDS.length}${round>=3?' · the key is weathered':''}</div>
   <div class="cip-stone">${w.s.map(G).join('')}</div><div class="cip-slots">${w.s.map((_,i)=>`<span id="sl${i}"></span>`).join('')}</div>
   <div class="cip-opts">${opts.map(o=>`<button data-s="${o}" data-game-syllable="${o}" data-mirava-localized="true">${gameSyllable(o)}</button>`).join('')}</div><div class="cip-mean" id="cipM"></div>`;
  pos=0;
  body.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{
   if(pos>=w.s.length)return;
   if(b.dataset.s===w.s[pos]){const sl=$('sl'+pos);sl.dataset.gameSyllable=w.s[pos];sl.setAttribute('data-mirava-localized','true');sl.textContent=gameSyllable(w.s[pos]);sl.classList.add('f');pos++;Sound.tone(520+pos*120,.18,'triangle',.08);
    if(pos===w.s.length){$('cipM').innerHTML=`✓ <b data-game-syllable="${w.w}" data-mirava-localized="true">${gameSyllable(w.w)}</b> — “<span>${w.m}</span>”`;Sound.chime();round++;api.progress(round/WORDS.length);
     timers.push(setTimeout(()=>{if(round>=WORDS.length)api.win(mist<=1?3:mist<=4?2:1,`${mist} mistake${mist===1?'':'s'} across ${WORDS.length} inscriptions`);else render();},1100));}}
   else{mist++;Sound.buzz();b.classList.remove('bad');void b.offsetWidth;b.classList.add('bad');}
   api.status(`Word ${Math.min(round+1,WORDS.length)}/${WORDS.length} · Mistakes ${mist}`);
  });
  api.status(`Word ${round+1}/${WORDS.length} · Mistakes ${mist}`);
 }
 render();return()=>timers.forEach(clearTimeout);
};

/* ---------- 3. Lamps of Ajanta ---------- */
GAMES.lamps=(body,api)=>{
 body.innerHTML='<canvas class="mg-canvas" width="720" height="400"></canvas>';const cvs=body.querySelector('canvas'),c=cvs.getContext('2d');
 const fres=document.createElement('canvas');fres.width=720;fres.height=400;const f=fres.getContext('2d');
 {const g=f.createLinearGradient(0,0,0,400);g.addColorStop(0,'#c98a3e');g.addColorStop(1,'#9a5a2a');f.fillStyle=g;f.fillRect(0,0,720,400);
  f.strokeStyle='#e8d7b0';f.lineWidth=6;f.beginPath();f.arc(360,150,64,0,7);f.stroke();f.fillStyle='#a5452f';f.beginPath();f.moveTo(300,300);f.quadraticCurveTo(360,170,420,300);f.fill();
  f.fillStyle='#d9a878';f.beginPath();f.arc(360,150,24,0,7);f.fill();f.fillStyle='#2a1a12';f.beginPath();f.arc(360,140,24,Math.PI,0);f.fill();
  [[160,'#3f7f6a'],[560,'#2f4f8f']].forEach(([x,col])=>{f.fillStyle=col;f.beginPath();f.ellipse(x,250,30,80,0,0,7);f.fill();f.fillStyle='#d9a878';f.beginPath();f.arc(x,160,18,0,7);f.fill();f.fillStyle='#f1b43c';f.fillRect(x-16,138,32,8);});
  for(let i=0;i<12;i++){const x=30+i*60;f.fillStyle=i%2?'#e8d7b0':'#3f7f6a';f.beginPath();f.ellipse(x,370,22,10,0,Math.PI,0);f.fill();}
  f.strokeStyle='#3f7f6a';f.lineWidth=3;f.beginPath();for(let x=0;x<=720;x+=10)f.lineTo(x,40+Math.sin(x/30)*10);f.stroke();}
 let lamps=[],bats=[],lit=[],missed=0,time=45,spawn=0,batT=3,last=performance.now(),raf=0,flash=0,ended=false;const need=15;
 function hit(e){if(ended)return;const rc=cvs.getBoundingClientRect(),x=(e.clientX-rc.left)/rc.width*720,y=(e.clientY-rc.top)/rc.height*400;
  for(let i=0;i<bats.length;i++){const b=bats[i];if(dist(b.x,b.y,x,y)<28){bats.splice(i,1);time-=3;flash=.4;Sound.buzz();return;}}
  for(let i=0;i<lamps.length;i++){const l=lamps[i];if(dist(l.x,l.y,x,y)<36){lamps.splice(i,1);lit.push({x:l.x,y:l.y,t:0});Sound.tone(700+lit.length*40,.4,'sine',.08);Sound.tone(1400+lit.length*40,.3,'sine',.03,0,.05);api.progress(lit.length/need);
   if(lit.length>=need){ended=true;api.win(missed<=3?3:missed<=7?2:1,`${need} lamps lit · ${missed} embers lost · ${Math.ceil(time)}s to spare`);}return;}}}
 cvs.addEventListener('pointerdown',hit);
 function frame(now){const dt=Math.min((now-last)/1000,.05);last=now;if(ended)return;
  time-=dt;if(time<=0){ended=true;api.fail(`Only ${lit.length} of ${need} lamps were lit before the darkness returned.`);return;}
  spawn-=dt;if(spawn<=0){spawn=.85-lit.length/need*.35;lamps.push({x:60+Math.random()*600,y:90+Math.random()*270,life:0,max:2.6-lit.length/need*.8});}
  batT-=dt;if(batT<=0){batT=2+Math.random()*2.2;const l=Math.random()<.5;bats.push({x:l?-30:750,y:60+Math.random()*280,vx:(l?1:-1)*(130+Math.random()*80),ph:Math.random()*6});}
  lamps.forEach(l=>l.life+=dt);for(let i=lamps.length-1;i>=0;i--)if(lamps[i].life>lamps[i].max){lamps.splice(i,1);missed++;}
  bats.forEach(b=>{b.x+=b.vx*dt;b.ph+=dt*8;b.y+=Math.sin(b.ph)*1.2;});bats=bats.filter(b=>b.x>-60&&b.x<780);
  lit.forEach(l=>l.t+=dt);flash=Math.max(0,flash-dt);
  c.fillStyle='#0d0806';c.fillRect(0,0,720,400);c.globalAlpha=.1+.85*lit.length/need;c.drawImage(fres,0,0);c.globalAlpha=1;
  const vg=c.createRadialGradient(360,200,100,360,200,460);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,`rgba(0,0,0,${.85-.5*lit.length/need})`);c.fillStyle=vg;c.fillRect(0,0,720,400);
  c.globalCompositeOperation='lighter';lit.forEach(l=>{const r=70+Math.sin(now/120+l.x)*4,g=c.createRadialGradient(l.x,l.y,0,l.x,l.y,r);g.addColorStop(0,'rgba(255,170,70,.45)');g.addColorStop(1,'rgba(255,170,70,0)');c.fillStyle=g;c.fillRect(l.x-r,l.y-r,r*2,r*2);});c.globalCompositeOperation='source-over';
  const diya=(x,y,on,a)=>{c.fillStyle='#8a4a22';c.beginPath();c.ellipse(x,y+6,16,7,0,0,Math.PI);c.fill();c.fillStyle='#a55a2a';c.beginPath();c.ellipse(x,y+6,16,4,0,0,7);c.fill();
   if(on){const h=14+Math.sin(now/80+x)*3;c.fillStyle='#ffd27a';c.beginPath();c.moveTo(x-5,y+4);c.quadraticCurveTo(x,y-h,x+5,y+4);c.fill();c.fillStyle='#fff3c0';c.beginPath();c.moveTo(x-2,y+4);c.quadraticCurveTo(x,y-h*.5,x+2,y+4);c.fill();}
   else{c.fillStyle=`rgba(255,120,40,${.4+.4*Math.sin(now/90+x)})`;c.beginPath();c.arc(x,y+2,3,0,7);c.fill();c.strokeStyle='rgba(248,201,80,.8)';c.lineWidth=3;c.beginPath();c.arc(x,y,26,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-a));c.stroke();}};
  lit.forEach(l=>diya(l.x,l.y,true));lamps.forEach(l=>diya(l.x,l.y,false,l.life/l.max));
  c.font='30px serif';c.textAlign='center';c.textBaseline='middle';bats.forEach(b=>c.fillText('🦇',b.x,b.y));
  if(flash>0){c.fillStyle=`rgba(229,134,103,${flash})`;c.fillRect(0,0,720,400);}
  c.fillStyle='#f8c950';c.font='700 16px DM Mono';c.textAlign='left';c.fillText(I18n().language()==='hi'?'⏳ '+Math.ceil(time)+' सेकंड':`⏳ ${Math.ceil(time)}s`,16,24);
  api.status(`Lamps ${lit.length}/${need} · Lost ${missed}`);
  raf=requestAnimationFrame(frame);}
 raf=requestAnimationFrame(frame);
 return()=>{ended=true;cancelAnimationFrame(raf);cvs.removeEventListener('pointerdown',hit);};
};

/* ---------- 4. Dholavira Waterworks ---------- */
GAMES.pipes=(body,api)=>{
 const C=6,R=5,CS=100,OX=60,OY=10;
 const D=[{dx:0,dy:-1,b:1,o:4},{dx:1,dy:0,b:2,o:8},{dx:0,dy:1,b:4,o:1},{dx:-1,dy:0,b:8,o:2}];
 const rot=m=>((m<<1)|(m>>3))&15,rotN=(m,k)=>{for(let i=0;i<k;i++)m=rot(m);return m;};
 let sr,er,path;
 for(let att=0;att<300;att++){sr=ri(R);er=ri(R);path=[[0,sr]];const vis=new Set(['0,'+sr]);
  const dfs=(x,y)=>{if(x===C-1&&y===er)return true;if(path.length>16)return false;
   const opts=shuffle(D.slice()).sort((a,b)=>(Math.random()<.6?((b.dx)-(a.dx)):0));
   for(const d of opts){const nx=x+d.dx,ny=y+d.dy;if(nx<0||ny<0||nx>=C||ny>=R||vis.has(nx+','+ny))continue;vis.add(nx+','+ny);path.push([nx,ny]);if(dfs(nx,ny))return true;path.pop();vis.delete(nx+','+ny);}return false;};
  if(dfs(0,sr)&&path.length>=C+1)break;}
 const base=Array(C*R).fill(0),onPath=Array(C*R).fill(false);
 path.forEach((p,i)=>{let m=0;const prev=i?path[i-1]:[p[0]-1,p[1]],next=i<path.length-1?path[i+1]:[p[0]+1,p[1]];
  [prev,next].forEach(q=>{const d=D.find(d=>d.dx===q[0]-p[0]&&d.dy===q[1]-p[1]);m|=d.b;});base[p[1]*C+p[0]]=m;onPath[p[1]*C+p[0]]=true;});
 const filler=[5,10,3,6,12,9,7,11,13,14];for(let i=0;i<C*R;i++)if(!onPath[i])base[i]=filler[ri(filler.length)];
 const rotA=base.map(()=>ri(4));let minC=0;
 for(let i=0;i<C*R;i++)if(onPath[i]){let k=0;while(rotN(base[i],rotA[i]+k)!==base[i])k++;minC+=k;}
 if(minC===0){const i=path[0][1]*C+path[0][0];rotA[i]=(rotA[i]+1)%4;minC=base[i]===5||base[i]===10?1:3;}
 const mask=i=>rotN(base[i],rotA[i]);
 body.innerHTML='<canvas class="mg-canvas" width="720" height="520"></canvas>';const cvs=body.querySelector('canvas'),c=cvs.getContext('2d');
 let clicks=0,filled=new Set(),solved=false,raf=0;
 function flow(){filled=new Set();const s=sr*C;if(!(mask(s)&8))return false;const q=[s];filled.add(s);
  while(q.length){const i=q.shift(),x=i%C,y=Math.floor(i/C),m=mask(i);for(const d of D)if(m&d.b){const nx=x+d.dx,ny=y+d.dy;if(nx<0||ny<0||nx>=C||ny>=R)continue;const j=ny*C+nx;if(!filled.has(j)&&(mask(j)&d.o)){filled.add(j);q.push(j);}}}
  const e=er*C+C-1;return filled.has(e)&&(mask(e)&2);}
 function click(e){if(solved)return;const rc=cvs.getBoundingClientRect(),x=(e.clientX-rc.left)/rc.width*720-OX,y=(e.clientY-rc.top)/rc.height*520-OY,cx=Math.floor(x/CS),cy=Math.floor(y/CS);
  if(cx<0||cy<0||cx>=C||cy>=R)return;const i=cy*C+cx;rotA[i]=(rotA[i]+1)%4;clicks++;Sound.tone(300+Math.random()*60,.08,'triangle',.08);
  solved=flow();api.progress(filled.size/path.length);api.status(`Turns ${clicks} · Channels flowing ${filled.size}`);
  if(solved){Sound.noise(1.2,.08,800);setTimeout(()=>api.win(clicks<=minC+3?3:clicks<=minC+10?2:1,`${clicks} turns (the stones needed at least ${minC})`),900);}}
 cvs.addEventListener('pointerdown',click);
 flow();api.status('Turns 0');
 function draw(now){
  c.fillStyle='#3a2a1e';c.fillRect(0,0,720,520);
  for(let y=0;y<R;y++)for(let x=0;x<C;x++){const i=y*C+x,px=OX+x*CS,py=OY+y*CS,m=mask(i),cx=px+CS/2,cy=py+CS/2;
   c.fillStyle=(x+y)%2?'#6a5440':'#5f4a38';c.fillRect(px+2,py+2,CS-4,CS-4);c.strokeStyle='rgba(0,0,0,.25)';c.strokeRect(px+6,py+6,CS-12,CS-12);
   c.lineCap='round';c.strokeStyle='#c9a26a';c.lineWidth=30;c.beginPath();for(const d of D)if(m&d.b){c.moveTo(cx,cy);c.lineTo(cx+d.dx*CS/2,cy+d.dy*CS/2);}c.stroke();
   c.strokeStyle='#8a6a42';c.lineWidth=18;c.stroke();
   if(filled.has(i)){c.strokeStyle='#3fa0d8';c.lineWidth=14;c.stroke();c.setLineDash([6,10]);c.lineDashOffset=-now/40;c.strokeStyle='rgba(220,245,255,.7)';c.lineWidth=3;c.stroke();c.setLineDash([]);}
   c.fillStyle=filled.has(i)?'#3fa0d8':'#8a6a42';c.beginPath();c.arc(cx,cy,9,0,7);c.fill();}
  c.font='40px serif';c.textAlign='center';c.textBaseline='middle';c.fillText('🏞️',30,OY+sr*CS+CS/2);c.fillText(solved?'🏙️':'🏚️',690,OY+er*CS+CS/2);
  c.fillStyle='#3fa0d8';c.fillRect(46,OY+sr*CS+CS/2-7,16,14);
  if(solved){c.fillStyle='rgba(63,160,216,.15)';c.fillRect(0,0,720,520);}
  raf=requestAnimationFrame(draw);}
 raf=requestAnimationFrame(draw);
 return()=>{cancelAnimationFrame(raf);cvs.removeEventListener('pointerdown',click);};
};

/* ---------- 5. Hampi Musical Pillars ---------- */
GAMES.rhythm=(body,api)=>{
 body.innerHTML='<canvas class="mg-canvas" width="640" height="440"></canvas><p style="font-size:12px;color:var(--dim);margin-top:10px">Keys <kbd class="mono">D F J K</kbd> · or tap a pillar</p>';
 const cvs=body.querySelector('canvas'),c=cvs.getContext('2d');
 const LX=[130,230,330,430],LW=80,HY=370,SPD=270,FREQ=[261.6,293.7,329.6,392],KEYS={d:0,f:1,j:2,k:3,arrowleft:0,arrowdown:1,arrowup:2,arrowright:3,'1':0,'2':1,'3':2,'4':3};
 const BPM=96,B=60/BPM,pat=[1,0,1,1,1,0,1,0,1,1,0,1,1,0,1,1];
 const notes=[];let lane=1;for(let i=0;i<72;i++){if(!pat[i%16])continue;if(i<16&&i%2)continue;lane=(lane+[0,1,1,2,3,3][ri(6)])%4;notes.push({t:2.4+i*B/2,lane,res:null});}
 const t0=performance.now();let raf=0,score=0,combo=0,best=0,judge='',jT=0,flash=[0,0,0,0],beat=-1,ended=false;
 const now=()=>(performance.now()-t0)/1000;
 function press(l){if(ended)return;flash[l]=.2;const t=now();let n=null,bd=.2;notes.forEach(q=>{if(q.lane===l&&!q.res){const d=Math.abs(q.t-t);if(d<bd){bd=d;n=q;}}});
  if(!n){Sound.tone(FREQ[l]*.5,.1,'sine',.03);return;}
  if(bd<.075){n.res='p';score+=2;judge='PERFECT';}else{n.res='g';score+=1;judge='GOOD';}combo++;best=Math.max(best,combo);jT=.5;Sound.pillar(FREQ[l]);}
 const kd=e=>{const l=KEYS[e.key.toLowerCase()];if(l!==undefined){e.preventDefault();if(!e.repeat)press(l);}};
 const pd=e=>{const rc=cvs.getBoundingClientRect(),x=(e.clientX-rc.left)/rc.width*640;LX.forEach((lx,i)=>{if(x>lx-10&&x<lx+LW+10)press(i);});};
 addEventListener('keydown',kd);cvs.addEventListener('pointerdown',pd);
 function frame(){if(ended)return;const t=now();
  const b=Math.floor((t-2.4)/B);if(b>beat&&t>.2){beat=b;Sound.tabla(b%4===0?90:130,b%4===0?.2:.1);}
  notes.forEach(n=>{if(!n.res&&t-n.t>.2){n.res='m';combo=0;judge='MISS';jT=.5;}});
  const doneN=notes.filter(n=>n.res).length;api.progress(doneN/notes.length);
  c.fillStyle='#1e1512';c.fillRect(0,0,640,440);
  LX.forEach((x,i)=>{const g=c.createLinearGradient(x,0,x+LW,0);g.addColorStop(0,'#5a4a3c');g.addColorStop(.5,'#8a7462');g.addColorStop(1,'#4e4034');c.fillStyle=g;c.fillRect(x,0,LW,440);
   c.fillStyle='rgba(0,0,0,.18)';for(let y=20;y<440;y+=60)c.fillRect(x,y,LW,6);
   if(flash[i]>0){c.fillStyle=`rgba(248,201,80,${flash[i]*2})`;c.fillRect(x,0,LW,440);flash[i]-=1/60;}
   c.strokeStyle='#f1b43c';c.lineWidth=3;c.beginPath();c.ellipse(x+LW/2,HY,28,12,0,0,7);c.stroke();
   c.fillStyle='#f5e6c8';c.font='700 14px DM Mono';c.textAlign='center';c.fillText('DFJK'[i],x+LW/2,HY+40);});
  notes.forEach(n=>{if(n.res)return;const y=HY-(n.t-t)*SPD;if(y<-30||y>470)return;const x=LX[n.lane]+LW/2;const g=c.createRadialGradient(x,y,0,x,y,24);g.addColorStop(0,'#fff3c0');g.addColorStop(.5,'#f8c950');g.addColorStop(1,'rgba(241,180,60,0)');c.fillStyle=g;c.beginPath();c.arc(x,y,24,0,7);c.fill();});
  if(t<2.4){c.fillStyle='#f8c950';c.font='800 64px Playfair Display';c.textAlign='center';c.fillText(String(Math.ceil(2.4-t)),320,200);}
  if(jT>0){jT-=1/60;c.globalAlpha=clamp(jT*2,0,1);c.fillStyle=judge==='MISS'?'#e58667':judge==='PERFECT'?'#f8c950':'#8ab372';c.font='800 30px Playfair Display';c.textAlign='center';c.fillText(judge,320,90);c.globalAlpha=1;}
  c.fillStyle='#f5e6c8';c.font='600 14px DM Mono';c.textAlign='left';c.fillText('Combo '+combo,16,26);
  api.status(`Notes ${doneN}/${notes.length} · Combo ${combo}`);
  if(t>notes[notes.length-1].t+1.2){ended=true;const acc=score/(notes.length*2);
   if(acc<.4)api.fail(`The pillars rang at ${Math.round(acc*100)}% accuracy. They need at least 40% to sing again.`);
   else api.win(acc>=.85?3:acc>=.65?2:1,`${Math.round(acc*100)}% accuracy · best combo ${best}`);return;}
  raf=requestAnimationFrame(frame);}
 raf=requestAnimationFrame(frame);
 return()=>{ended=true;cancelAnimationFrame(raf);removeEventListener('keydown',kd);cvs.removeEventListener('pointerdown',pd);};
};

/* ---------- 6. Wheel of Surya ---------- */
GAMES.wheel=(body,api)=>{
 body.innerHTML='<canvas class="mg-canvas" width="520" height="520" style="max-width:460px"></canvas><div class="wheel-ctl"><span>Turning direction:</span><button class="btn small gold" id="whDir">⟳ clockwise</button><span>· right-click turns the other way</span></div>';
 const cvs=body.querySelector('canvas'),c=cvs.getContext('2d');const RINGS=[[50,112],[116,176],[180,242]],MOVES=[[0,1],[1,2],[2]];
 const off=[0,0,0],tgt=[0,0,0],disp=[0,0,0];let dir=1,clicks=0,solved=false,raf=0;
 const apply=(j,d)=>MOVES[j].forEach(r=>{off[r]=(off[r]+d+8)%8;tgt[r]+=d*Math.PI/4;});
 do{for(let k=0;k<9;k++)apply(ri(3),Math.random()<.5?1:-1);}while(off.every(v=>v===0));
 for(let i=0;i<3;i++)disp[i]=tgt[i];
 const m8=v=>((v%8)+8)%8,x=m8(-off[0]),y=m8(-off[1]-x),z=m8(-off[2]-y),opt=[x,y,z].reduce((a,v)=>a+Math.min(v,8-v),0);
 $('whDir').onclick=()=>{dir*=-1;$('whDir').textContent=dir>0?'⟳ clockwise':'⟲ anticlockwise';Sound.tap();};
 function press(e,d){if(solved)return;const rc=cvs.getBoundingClientRect(),px=(e.clientX-rc.left)/rc.width*520-260,py=(e.clientY-rc.top)/rc.height*520-260,r=Math.hypot(px,py);
  const j=RINGS.findIndex(q=>r>=q[0]&&r<=q[1]);if(j<0)return;apply(j,d);clicks++;Sound.tone(220+j*80,.2,'triangle',.08);
  const aligned=off.filter(v=>v===0).length;api.progress(aligned/3);api.status(`Turns ${clicks} · Aligned ${aligned}/3`);
  if(off.every(v=>v===0)){solved=true;Sound.chime();setTimeout(()=>api.win(clicks<=opt+2?3:clicks<=opt+8?2:1,`${clicks} turns (the wheel could be solved in ${opt})`),1000);}}
 const pdn=e=>{if(e.button===2)return;press(e,dir);},ctxm=e=>{e.preventDefault();press(e,-dir);};
 cvs.addEventListener('pointerdown',pdn);cvs.addEventListener('contextmenu',ctxm);
 api.status('Turns 0');
 function draw(now){c.clearRect(0,0,520,520);c.save();c.translate(260,260);
  if(solved){c.save();c.rotate(now/2000);for(let k=0;k<16;k++){c.rotate(Math.PI/8);c.fillStyle='rgba(248,201,80,.18)';c.beginPath();c.moveTo(0,0);c.lineTo(-14,-260);c.lineTo(14,-260);c.fill();}c.restore();}
  RINGS.forEach((rg,i)=>{disp[i]=lerp(disp[i],tgt[i],.18);c.save();c.rotate(disp[i]);
   c.fillStyle=['#7d6b5c','#6e5e52','#5f5248'][i];c.beginPath();c.arc(0,0,rg[1],0,Math.PI*2);c.moveTo(rg[0],0);c.arc(0,0,rg[0],0,Math.PI*2);c.fill('evenodd');
   c.strokeStyle='rgba(0,0,0,.35)';c.lineWidth=2;c.beginPath();c.arc(0,0,rg[1]-2,0,7);c.stroke();
   for(let k=0;k<8;k++){const a=k*Math.PI/4;c.strokeStyle='#a89078';c.lineWidth=i===2?10:7;c.beginPath();c.moveTo(Math.cos(a)*(rg[0]+4),Math.sin(a)*(rg[0]+4));c.lineTo(Math.cos(a)*(rg[1]-4),Math.sin(a)*(rg[1]-4));c.stroke();
    const mid=(rg[0]+rg[1])/2,ma=a+Math.PI/8;c.fillStyle='rgba(255,230,190,.25)';c.beginPath();c.arc(Math.cos(ma)*mid,Math.sin(ma)*mid,4,0,7);c.fill();}
   const mid=(rg[0]+rg[1])/2;c.fillStyle=off[i]===0?'#f8c950':'#d98a3a';c.beginPath();c.arc(0,-mid,13,0,7);c.fill();c.strokeStyle='#3a2a1a';c.lineWidth=2;c.stroke();
   c.fillStyle='#fff3c0';c.beginPath();c.arc(0,-mid,5,0,7);c.fill();c.restore();});
  const hg=c.createRadialGradient(0,0,0,0,0,48);hg.addColorStop(0,'#ffe08a');hg.addColorStop(1,'#c9781e');c.fillStyle=hg;c.beginPath();c.arc(0,0,46,0,7);c.fill();c.font='40px serif';c.textAlign='center';c.textBaseline='middle';c.fillText('☀️',0,2);
  c.fillStyle='#f8c950';c.beginPath();c.moveTo(0,-246);c.lineTo(-12,-260);c.lineTo(12,-260);c.fill();c.restore();
  raf=requestAnimationFrame(draw);}
 raf=requestAnimationFrame(draw);
 return()=>{cancelAnimationFrame(raf);cvs.removeEventListener('pointerdown',pdn);cvs.removeEventListener('contextmenu',ctxm);};
};

/* ---------- 7. Masters of Nalanda ---------- */
GAMES.quiz=(body,api)=>{
 const qs=shuffle(QUIZ.slice()).slice(0,7);let i=0,score=0,timer=0,tl=15,ans=false,tos=[];
 function render(){
  if(i>=qs.length){if(score<3)api.fail(`${score} of 7 correct. The masters ask you to study the codex and return.`);else api.win(score===7?3:score>=5?2:1,`${score} of 7 answered correctly`);return;}
  const q=qs[i],opts=shuffle(q[1].map((t,k)=>({t,ok:k===q[2]})));ans=false;tl=15;
  body.innerHTML=`<div class="qz"><div class="panel-k" style="text-align:center;margin-bottom:8px">Question ${i+1} of 7</div><div class="qz-t"><i id="qzT" style="width:100%"></i></div><div class="qz-q">${esc(q[0])}</div><div class="qz-o">${opts.map((o,k)=>`<button data-k="${k}">${esc(o.t)}</button>`).join('')}</div><div class="qz-f" id="qzF"></div></div>`;
  const btns=body.querySelectorAll('[data-k]');
  const finish=k=>{if(ans)return;ans=true;clearInterval(timer);btns.forEach((b,j)=>{b.disabled=true;if(opts[j].ok)b.classList.add('ok');});
   if(k!==null&&opts[k].ok){score++;Sound.chime();$('qzF').textContent='Correct!';}else{if(k!==null)btns[k].classList.add('no');Sound.buzz();$('qzF').textContent=k===null?'Time ran out.':'Not quite.';}
   i++;api.progress(i/7);api.status(`Score ${score}/${i}`);tos.push(setTimeout(render,1300));};
  btns.forEach(b=>b.onclick=()=>finish(+b.dataset.k));
  timer=setInterval(()=>{tl-=.1;const el=$('qzT');if(el)el.style.width=(tl/15*100)+'%';if(tl<=0)finish(null);},100);
 }
 api.status('Score 0/0');render();
 return()=>{clearInterval(timer);tos.forEach(clearTimeout);};
};

/* ===================== DASHBOARD ===================== */
function renderDash(){
 const L=levelOf(S.xp),r=SITES.filter(s=>done(s.id)).length,pct=r/7,C=2*Math.PI*80;
 const started=S.intro||S.xp>0;
 $('dash').innerHTML=`
 <div class="dash-top"><div class="dash-brand" data-game-heading="legend"></div><div class="dash-top-r"><span class="dash-hello">Namaste, <b translate="no">${esc(pname)}</b></span><a class="btn small" href="/explore" data-nav="/explore">← Mirava atlas</a></div></div>
 <div class="dash-hero"><div><div class="dash-kicker">Level ${L} · ${titleOf(L)}</div><h1 data-game-lamps="${r===7?'burning':'fading'}" data-mirava-localized="true"></h1>
  <p>${r===7?'You restored every flame. The land is yours to wander — chase three stars, treasures and honours.':'Walk an open subcontinent shaped like home. Restore seven heritage sites, befriend villagers, unearth treasure, and fill your codex with stories that outlived empires.'}</p>
  <button class="btn gold" id="dPlay">▶ ${started?'Continue journey':'Begin the journey'}</button></div>
  <div class="ring"><svg viewBox="0 0 180 180"><circle cx="90" cy="90" r="80" stroke="rgba(255,255,255,.1)" stroke-width="10" fill="none"/><circle cx="90" cy="90" r="80" stroke="#f1b43c" stroke-width="10" fill="none" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C*(1-pct)}"/></svg><div class="ring-c"><b>${r}/7</b><small>Flames restored</small></div></div></div>
 <div><div class="sec-t">Your legend</div><div class="stat-grid">
  <div class="stat"><b>${S.xp}</b><small>Total XP</small></div><div class="stat"><b>${L}</b><small>${titleOf(L)}</small></div>
  <div class="stat"><b>${S.chests.length}/10</b><small>Treasures</small></div><div class="stat"><b>${S.scrolls.length}/12</b><small>Lore scrolls</small></div>
  <div class="stat"><b>${S.lms.length}/10</b><small>Landmarks</small></div><div class="stat"><b>${S.ach.length}/${ACH.length}</b><small>Honours</small></div></div></div>
 <div><div class="sec-t">Heritage sites</div><div class="site-grid">${SITES.map((s,i)=>`<div class="site-card ${done(s.id)?'done':unlocked(i)?'':'locked'}"><div class="ic">${unlocked(i)?s.icon:'🔒'}</div><h4>${s.name}</h4><div class="stars">${[0,1,2].map(k=>k<(S.stars[s.id]||0)?'★':'<i>★</i>').join('')}</div></div>`).join('')}</div></div>
 <div><div class="sec-t">Honours</div><div class="ach-grid">${ACH.map(a=>`<div class="ach ${S.ach.includes(a.id)?'':'off'}"><div class="ai">${a.i}</div><div><b>${a.n}</b><small>${a.d}</small></div></div>`).join('')}</div></div>
 <div class="dash-links"><a class="btn" href="/explore" data-nav="/explore">🗺️ Explore the Mirava atlas</a><a class="btn" href="/quiz" data-nav="/quiz">🏆 Quiz Arena</a><button class="btn" id="dReset" style="margin-left:auto;border-color:rgba(218,82,37,0.64);color:#9d3b1b">Reset this journey</button></div>`;
 const title=$('dash').querySelector('[data-game-heading="legend"]');
 title.setAttribute('data-mirava-localized','true');
 updateGameHeadings();
 $('dPlay').onclick=()=>{Sound.init();startGame();};
 $('dReset').onclick=()=>{if(confirm(I18n().t('Erase all progress for {name}? This cannot be undone.',{name:pname}))){S=DEF();world=null;CHESTS.forEach(c=>c.rev=false);save();flushSave();renderDash();}};
}

/* ===================== BOOT ===================== */
on(appRoot,'click',e=>{const a=e.target.closest&&e.target.closest('[data-nav]');if(!a)return;e.preventDefault();save();host.navigate(a.dataset.nav);});
(async()=>{
 // The Mirava profile loads asynchronously; give it a moment so the explorer is named.
 for(let i=0;i<30&&!host.me&&!disposed;i++)await new Promise(r=>window.setTimeout(r,100));
 if(disposed)return;
 pname=miravaUser()||'Explorer';
 await load();if(disposed)return;
 renderDash();showScreen('dashScreen');
 if(S.ended)submitCompletion();
})();

return()=>{
 try{if(game.running)save();}catch(e){}
 flushSave();
 disposed=true;game.running=false;cancelAnimationFrame(game.raf);
 if(mgClean){try{mgClean();}catch(e){}mgClean=null;}
 timers.forEach(id=>window.clearTimeout(id));timers.clear();
 intervals.forEach(id=>window.clearInterval(id));intervals.clear();
 for(const fn of cleanups.splice(0).reverse()){try{fn();}catch(e){}}
 if(Sound.ctx){try{Sound.ctx.close();}catch(e){}Sound.ctx=null;}
};
}
