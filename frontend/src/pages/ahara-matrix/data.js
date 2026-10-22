/* eslint-disable */
/* ===== Ahara Matrix knowledge base (verbatim from the new ahara-matrix.html) ===== */
export const AD=(function(){
 var RASA={sweet:{n:'Sweet',sk:'Madhura',c:'#e8a33d'},sour:{n:'Sour',sk:'Amla',c:'#d9b51f'},salty:{n:'Salty',sk:'Lavana',c:'#4f8fc0'},pungent:{n:'Pungent',sk:'Katu',c:'#d9542b'},bitter:{n:'Bitter',sk:'Tikta',c:'#4f8a4a'},astringent:{n:'Astringent',sk:'Kashaya',c:'#8a5a8f'}};
 var RASA_ORDER=['sweet','sour','salty','pungent','bitter','astringent'];
 var CATS={dairy:'Dairy',grain:'Grains',pulse:'Pulses',spice:'Spices & salt',fruit:'Fruit & vegetables',sweet:'Sweeteners & seeds',other:'Fish'};
 // virya: cooling | warming | balanced  (as commonly described in Ayurvedic texts; simplified)
 var ING=[
  {id:'milk',n:'Milk',sk:'Dugdha',ic:'🥛',cat:'dairy',r:['sweet'],v:'cooling'},
  {id:'ghee',n:'Ghee',sk:'Ghrita',ic:'🧈',cat:'dairy',r:['sweet'],v:'cooling'},
  {id:'curd',n:'Curd',sk:'Dadhi',ic:'🥣',cat:'dairy',r:['sour'],v:'warming'},
  {id:'takra',n:'Buttermilk',sk:'Takra',ic:'🥤',cat:'dairy',r:['sour','astringent'],v:'balanced'},
  {id:'rice',n:'Rice',sk:'Shali',ic:'🍚',cat:'grain',r:['sweet'],v:'cooling'},
  {id:'wheat',n:'Wheat',sk:'Godhuma',ic:'🌾',cat:'grain',r:['sweet'],v:'cooling'},
  {id:'barley',n:'Barley',sk:'Yava',ic:'🌿',cat:'grain',r:['sweet','astringent'],v:'cooling'},
  {id:'bajra',n:'Pearl millet',sk:'Bajra',ic:'🟤',cat:'grain',r:['sweet'],v:'warming'},
  {id:'moong',n:'Green gram',sk:'Mudga',ic:'🫛',cat:'pulse',r:['sweet','astringent'],v:'cooling'},
  {id:'urad',n:'Black gram',sk:'Masha',ic:'🫘',cat:'pulse',r:['sweet'],v:'warming'},
  {id:'ginger',n:'Ginger',sk:'Ardraka',ic:'🫚',cat:'spice',r:['pungent'],v:'warming'},
  {id:'pepper',n:'Black pepper',sk:'Maricha',ic:'⚫',cat:'spice',r:['pungent'],v:'warming'},
  {id:'turmeric',n:'Turmeric',sk:'Haridra',ic:'🟡',cat:'spice',r:['bitter','pungent'],v:'warming'},
  {id:'hing',n:'Asafoetida',sk:'Hingu',ic:'🧪',cat:'spice',r:['pungent'],v:'warming'},
  {id:'coriander',n:'Coriander seed',sk:'Dhanyaka',ic:'🌱',cat:'spice',r:['astringent','bitter'],v:'cooling'},
  {id:'mustard',n:'Mustard seed',sk:'Sarshapa',ic:'🟠',cat:'spice',r:['pungent','bitter'],v:'warming'},
  {id:'salt',n:'Rock salt',sk:'Saindhava',ic:'🧂',cat:'spice',r:['salty'],v:'cooling'},
  {id:'amla',n:'Indian gooseberry',sk:'Amalaki',ic:'🟢',cat:'fruit',r:['sour','sweet','bitter','pungent','astringent'],v:'cooling'},
  {id:'banana',n:'Banana',sk:'Kadali',ic:'🍌',cat:'fruit',r:['sweet'],v:'cooling'},
  {id:'coconut',n:'Coconut',sk:'Narikela',ic:'🥥',cat:'fruit',r:['sweet'],v:'cooling'},
  {id:'cucumber',n:'Cucumber',sk:'Trapusha',ic:'🥒',cat:'fruit',r:['sweet'],v:'cooling'},
  {id:'radish',n:'Radish',sk:'Mulaka',ic:'🤍',cat:'fruit',r:['pungent'],v:'warming'},
  {id:'garlic',n:'Garlic',sk:'Lashuna',ic:'🧄',cat:'fruit',r:['pungent','sweet','salty','bitter','astringent'],v:'warming'},
  {id:'tamarind',n:'Tamarind',sk:'Amlika',ic:'🟫',cat:'fruit',r:['sour'],v:'warming'},
  {id:'neem',n:'Neem flowers',sk:'Nimba',ic:'🌼',cat:'fruit',r:['bitter'],v:'cooling'},
  {id:'honey',n:'Honey',sk:'Madhu',ic:'🍯',cat:'sweet',r:['sweet','astringent'],v:'cooling'},
  {id:'jaggery',n:'Jaggery',sk:'Guda',ic:'🍬',cat:'sweet',r:['sweet'],v:'warming'},
  {id:'sesame',n:'Sesame',sk:'Tila',ic:'⚪',cat:'sweet',r:['sweet','bitter','astringent'],v:'warming'},
  {id:'fish',n:'Fish',sk:'Matsya',ic:'🐟',cat:'other',r:['sweet'],v:'warming'}
 ];
 var SRC={
  classical:{n:'Classical text',c:'#792d3c'},
  tradition:{n:'Regional tradition',c:'#b8741a'},
  modern:{n:'Modern Ayurvedic teaching',c:'#6b4fa0'},
  science:{n:'Nutrition science',c:'#1f7a8c'}
 };
 // type: avoid | caution | harmony.  a / b: ingredient ids (b may be a list = "any of")
 var PAIRS=[
  {id:'milk-fish',a:'milk',b:['fish'],t:'avoid',s:'classical',title:'Milk with fish',
   x:'Milk taken with fish is one of the best-known examples of viruddha ahara — incompatible food — in the Charaka Samhita.',ref:'Charaka Samhita, Sutrasthana 26 (Atreyabhadrakapyiya)'},
  {id:'milk-radish',a:'milk',b:['radish','garlic'],t:'avoid',s:'classical',title:'Milk after radish or garlic',
   x:'The Charaka Samhita advises against drinking milk after eating radish, garlic and similar pungent greens.',ref:'Charaka Samhita, Sutrasthana 26'},
  {id:'milk-sour',a:'milk',b:['tamarind','curd'],t:'avoid',s:'classical',title:'Milk with sour foods',
   x:'Classical texts describe milk combined with sour substances as incompatible.',ref:'Charaka Samhita, Sutrasthana 26'},
  {id:'honey-ghee',a:'honey',b:['ghee'],t:'caution',s:'classical',title:'Honey and ghee in equal parts',
   x:'Honey and ghee mixed in equal quantities are listed as incompatible. In unequal proportions they are combined in many traditional preparations.',ref:'Charaka Samhita, Sutrasthana 26'},
  {id:'banana-milk',a:'banana',b:['milk','curd'],t:'caution',s:'modern',title:'Banana with milk or curd',
   x:'Often cautioned in present-day Ayurvedic teaching as a heavy combination that is slow to digest. It is not one of the well-known classical examples.',ref:'Contemporary Ayurvedic guidance'},
  {id:'curd-partners',a:'curd',b:['ghee','moong','honey','amla'],t:'harmony',s:'classical',title:'Curd with its companions',
   x:'The Charaka Samhita advises that curd should not be eaten without ghee and sugar, green-gram soup, honey or amla — so these are its recommended companions.',ref:'Charaka Samhita, Sutrasthana 7 (Navegandharaniya)'},
  {id:'khichdi',a:'rice',b:['moong'],t:'harmony',s:'tradition',title:'Rice with green gram — khichdi',
   x:'Khichdi is India’s classic light meal, often the first food after illness. Nutritionally, cereals and pulses complement each other: grains are low in the amino acid lysine and pulses are low in methionine, so together they give a more complete protein.',ref:'Traditional practice · protein complementation'},
  {id:'dal-rice',a:'rice',b:['urad'],t:'harmony',s:'tradition',title:'Rice with black gram — idli and dosa',
   x:'Fermented rice and urad batter is the base of idli and dosa across South India. Fermentation softens the grains and the cereal–pulse pairing complements their proteins.',ref:'Traditional practice · protein complementation'},
  {id:'turmeric-pepper',a:'turmeric',b:['pepper'],t:'harmony',s:'science',title:'Turmeric with black pepper',
   x:'Piperine in black pepper greatly increases how much curcumin from turmeric the body absorbs — about twenty-fold in a well-known human study.',ref:'Shoba et al., Planta Medica, 1998'},
  {id:'turmeric-fat',a:'turmeric',b:['milk','ghee','coconut'],t:'harmony',s:'tradition',title:'Turmeric with milk or ghee',
   x:'Haldi doodh and turmeric cooked in ghee are household traditions. Curcumin dissolves in fat, which helps the body take it up.',ref:'Traditional practice'},
  {id:'iron-vitc',a:'amla',b:['moong','urad','bajra','sesame','jaggery'],t:'harmony',s:'science',title:'Amla with iron-rich foods',
   x:'Vitamin C — and amla is one of its richest sources — helps the body absorb the non-haem iron found in pulses, millets, sesame and jaggery.',ref:'Hallberg et al., 1989 · ascorbic acid and iron absorption'},
  {id:'til-gud',a:'sesame',b:['jaggery'],t:'harmony',s:'tradition',title:'Sesame with jaggery — til-gud',
   x:'Til-gud laddoos are shared at Makar Sankranti in mid-January. Both are considered warming — a winter food in the coldest weeks.',ref:'Festival tradition'},
  {id:'hing-dal',a:'hing',b:['moong','urad'],t:'harmony',s:'tradition',title:'Asafoetida in lentils',
   x:'A pinch of hing in the tadka (tempering) of dal is used across India to make pulses easier to digest and less gassy.',ref:'Traditional practice'},
  {id:'ginger-salt',a:'ginger',b:['salt'],t:'harmony',s:'tradition',title:'Fresh ginger with rock salt before meals',
   x:'A sliver of fresh ginger with rock salt before a meal is widely taught in Ayurveda as an appetiser that kindles agni, the digestive fire.',ref:'Ayurvedic tradition'},
  {id:'chaas',a:'takra',b:['ginger','salt','coriander','rice'],t:'harmony',s:'classical',title:'Buttermilk with meals',
   x:'Takra (buttermilk) is praised in the Charaka Samhita as light and digestive. Masala chaas with ginger and rock salt, or curd-rice made with buttermilk, are everyday traditions.',ref:'Charaka Samhita, Chikitsasthana 15 · regional practice'},
  {id:'raita',a:'curd',b:['cucumber'],t:'harmony',s:'tradition',title:'Curd with cucumber — raita',
   x:'Kheere ka raita is a common side dish with spiced meals, especially in hot weather.',ref:'Regional tradition'},
  {id:'coconut-rice',a:'coconut',b:['rice'],t:'harmony',s:'tradition',title:'Coconut with rice',
   x:'Coconut rice and coconut-based curries with rice are staples along the Kerala and Konkan coasts.',ref:'Regional tradition'},
  {id:'shorshe',a:'fish',b:['mustard'],t:'harmony',s:'tradition',title:'Fish with mustard — shorshe maach',
   x:'Fish cooked in a pungent mustard paste is a much-loved Bengali preparation.',ref:'Regional tradition (Bengal)'},
  {id:'bajra-winter',a:'bajra',b:['ghee','jaggery'],t:'harmony',s:'tradition',title:'Bajra with ghee and jaggery',
   x:'In Rajasthan and Gujarat, bajra roti with ghee and jaggery is a classic winter meal — all considered warming foods.',ref:'Regional tradition'},
  {id:'wheat-ghee',a:'wheat',b:['ghee','jaggery'],t:'harmony',s:'tradition',title:'Wheat with ghee and jaggery',
   x:'Roasting wheat flour in ghee with jaggery makes atte ka halwa and many festive sweets.',ref:'Traditional practice'},
  {id:'ginger-honey',a:'ginger',b:['honey'],t:'harmony',s:'tradition',title:'Ginger juice with honey',
   x:'Fresh ginger juice with honey is a familiar home remedy in many Indian households for coughs and colds.',ref:'Household tradition'},
  {id:'sweet-sour',a:'tamarind',b:['jaggery'],t:'harmony',s:'tradition',title:'Tamarind with jaggery',
   x:'The sweet-and-sour balance of tamarind and jaggery runs through rasam, sambar, chutneys and Gujarati dal.',ref:'Regional tradition'},
  {id:'neem-jaggery',a:'neem',b:['jaggery'],t:'harmony',s:'tradition',title:'Neem flowers with jaggery',
   x:'Bitter neem flowers and sweet jaggery are eaten together in Ugadi pachadi — a reminder that life brings both sweetness and bitterness.',ref:'Festival tradition (Ugadi / Gudi Padwa)'}
 ];
 var NOTES={
  honey:{t:'caution',s:'classical',title:'Never heat honey',x:'Classical Ayurvedic texts warn against heating honey or adding it to very hot food or drink.',ref:'Charaka Samhita; Sushruta Samhita'},
  salt:{t:'note',s:'classical',title:'The gentlest salt',x:'Saindhava (rock salt) is singled out in Ayurvedic texts as the best of salts and, unusually for a salt, is described as cooling.',ref:'Charaka Samhita, Sutrasthana 25 (list of foremost substances)'},
  amla:{t:'note',s:'classical',title:'Five tastes in one fruit',x:'Amalaki is described as having five of the six tastes — every one except salty — with sour the strongest.',ref:'Ayurvedic texts'},
  takra:{t:'note',s:'classical',title:'Praised in the texts',x:'Buttermilk is light and easy to digest, and Ayurvedic texts recommend it especially for weak digestion.',ref:'Charaka Samhita, Chikitsasthana 15'}
 };
 var RITU=[
  {id:'shishira',n:'Shishira',en:'Late winter',m:'mid-Jan – mid-Mar',from:[1,15],ic:'❄️',col:'#7aa2c4',
   x:'Cold and dry. Digestion is strong, so warming, nourishing food is favoured.',fav:['sweet','sour','salty'],v:'warming',avoid:['pungent','bitter','astringent'],
   foods:['sesame','jaggery','bajra','ghee','urad','ginger'],extra:'Til-gud at Makar Sankranti belongs to this season.'},
  {id:'vasanta',n:'Vasanta',en:'Spring',m:'mid-Mar – mid-May',from:[3,15],ic:'🌸',col:'#e48aa8',
   x:'Kapha melts with the warming sun. Lighter food is favoured — less heavy, sweet, sour and oily food.',fav:['bitter','pungent','astringent'],v:'warming',avoid:['sweet','sour'],
   foods:['barley','wheat','honey','moong','ginger','neem'],extra:'Ugadi pachadi, with bitter neem flowers, marks the new year in spring.'},
  {id:'grishma',n:'Grishma',en:'Summer',m:'mid-May – mid-Jul',from:[5,15],ic:'☀️',col:'#e5a13a',
   x:'Intense heat. Sweet, cool, liquid foods are favoured; salty, sour, pungent and heating food is reduced.',fav:['sweet'],v:'cooling',avoid:['salty','sour','pungent'],
   foods:['rice','milk','ghee','coconut','cucumber','coriander'],extra:'Classical texts recommend cool, sweet drinks in this season.'},
  {id:'varsha',n:'Varsha',en:'Monsoon',m:'mid-Jul – mid-Sep',from:[7,15],ic:'🌧️',col:'#4f8fc0',
   x:'Damp air weakens digestion. Light, warm, easily digested food is favoured — old grains, pulse soups, ginger and rock salt.',fav:['sour','salty'],v:'warming',avoid:[],
   foods:['barley','wheat','rice','moong','ginger','salt','honey'],extra:'Honey is suggested in small amounts during the rains.'},
  {id:'sharad',n:'Sharad',en:'Autumn',m:'mid-Sep – mid-Nov',from:[9,15],ic:'🍂',col:'#d9773a',
   x:'Warm days after the rains aggravate pitta. Sweet, bitter and astringent, cooling foods are favoured; curd is avoided.',fav:['sweet','bitter','astringent'],v:'cooling',avoid:['sour','salty','pungent'],
   foods:['rice','barley','wheat','moong','ghee','amla','honey','coriander'],extra:'The Charaka Samhita says curd is mostly discouraged in autumn, summer and spring.'},
  {id:'hemanta',n:'Hemanta',en:'Early winter',m:'mid-Nov – mid-Jan',from:[11,15],ic:'🍁',col:'#a8643c',
   x:'Cool weather and the strongest digestion of the year. Nourishing, unctuous, warming food is favoured.',fav:['sweet','sour','salty'],v:'warming',avoid:[],
   foods:['urad','wheat','rice','milk','ghee','sesame','jaggery'],extra:'This is the season for heavier dishes and sweets made with ghee.'}
 ];
 function rituOf(d){var m=d.getMonth()+1,day=d.getDate(),k=m*100+day;
  if(k>=115&&k<315)return 'shishira';if(k>=315&&k<515)return 'vasanta';if(k>=515&&k<715)return 'grishma';if(k>=715&&k<915)return 'varsha';if(k>=915&&k<1115)return 'sharad';return 'hemanta';}
 var DISHES=[
  {n:'Ugadi pachadi',need:['neem','jaggery','tamarind','salt'],any:['pepper','ginger'],x:'A festive spring dish holding all six tastes. Raw mango, its usual astringent and sour note, is the one ingredient missing from this pantry.'},
  {n:'Onam sadya (a taste of it)',need:['rice','coconut','banana','takra'],x:'Kerala’s harvest feast: rice, coconut curries, banana chips and spiced buttermilk, served on a banana leaf.'},
  {n:'Sakkarai pongal',need:['rice','moong','jaggery','ghee'],x:'Sweet pongal, boiled in a new pot at Thai Pongal until it overflows — “Pongalo pongal!”'},
  {n:'Ven pongal',need:['rice','moong','pepper'],x:'Savoury pongal tempered with black pepper, ginger and ghee — a classic Tamil breakfast and temple offering.'},
  {n:'Bhog khichuri',need:['rice','moong','ghee','ginger'],x:'The khichuri offered as bhog during Durga Puja in Bengal, made with roasted moong and ghee.'},
  {n:'Til pitha',need:['rice','sesame','jaggery'],x:'Rice-flour rolls filled with sesame and jaggery, made for Magh Bihu in Assam.'},
  {n:'Gur ki kheer',need:['milk','rice','jaggery'],x:'Rice pudding sweetened with jaggery — in Bengal, made with winter date-palm jaggery as nolen gur payesh.'},
  {n:'Langar meal',need:['wheat','urad','ghee'],x:'Roti, maa ki dal and ghee — the simple, shared meal of the Guru ka Langar.'},
  {n:'Thekua',need:['wheat','ghee','jaggery'],x:'Crisp wheat-and-jaggery cookies fried in ghee — the sacred offering of Chhath Puja in Bihar. The same trio makes atte ka halwa.'},
  {n:'Bajra roti with ghee & gud',need:['bajra','ghee','jaggery'],x:'A Rajasthani winter classic.'},
  {n:'Masala chaas',need:['takra','ginger','salt'],x:'Spiced buttermilk, sipped after a meal.'},
  {n:'Khichdi',need:['rice','moong'],x:'The comforting one-pot meal of rice and green gram.'},
  {n:'Haldi doodh',need:['milk','turmeric'],x:'Turmeric milk — add black pepper to help the body absorb the curcumin.'},
  {n:'Til-gud',need:['sesame','jaggery'],x:'The Makar Sankranti sweet: “til-gud ghya, god god bola” (take sesame-jaggery and speak sweetly).'},
  {n:'Narkel naru',need:['coconut','jaggery'],x:'Coconut-and-jaggery sweets made in Bengal for Kojagari Lakshmi Puja.'},
  {n:'Idli / dosa batter',need:['rice','urad'],x:'Fermented rice and black gram — the heart of South Indian breakfasts.'},
  {n:'Kheere ka raita',need:['curd','cucumber'],x:'A cooling side dish of curd and cucumber.'},
  {n:'Shorshe maach',need:['fish','mustard'],x:'Bengal’s fish in mustard paste.'},
  {n:'Coconut rice',need:['coconut','rice'],x:'A coastal South Indian favourite.'},
  {n:'Thandai (simplified)',need:['milk','pepper'],x:'Holi’s festive cooler of milk and black pepper — traditionally with almonds, fennel and rose, which this pantry doesn’t have.'},
  {n:'Ginger-honey',need:['ginger','honey'],x:'A household remedy: fresh ginger juice with honey.'}
 ];
 var PLATES=[
  {id:'brass',n:'Brass thali',sk:'Pital',x:'The round brass plate with small bowls (katoris) is the classic Indian thali, used in homes and for festive meals.'},
  {id:'kansa',n:'Bell-metal plate',sk:'Kansa',x:'Kansa — bell-metal of copper and tin — is treasured in Odisha, Bengal and Assam, where Sarthebari is famous for its craftsmen. Families pass these plates down through generations.'},
  {id:'leaf',n:'Banana leaf',sk:'Vazha ila',x:'In Kerala and across South India, feasts are served on a fresh banana leaf, tip to the guest’s left. Folding the leaf towards yourself afterwards is a way of saying the meal was satisfying.'},
  {id:'pattal',n:'Sal-leaf plate',sk:'Pattal',x:'Plates of sal leaves stitched with fine twigs, with leaf cups (donas), are used at temples, weddings and community feasts across central and eastern India — a tradition that returns to the soil.'},
  {id:'steel',n:'Langar plate',sk:'Steel',x:'At the Guru ka Langar, everyone — rich or poor, of any faith — sits together in rows (pangat) and is served the same food on simple steel plates.'}
 ];
 var REGIONS=[
  {id:'punjab',n:'Punjab',t:'Guru ka Langar',place:'Harmandir Sahib, Amritsar',x:32,y:16,ic:'🙏',plate:'steel',sel:['wheat','urad','ghee','milk','rice','jaggery'],
   story:'The community kitchen begun by Guru Nanak became a defining Sikh institution. At the Golden Temple, volunteers cook and serve free meals to tens of thousands of people every day — everyone sits together on the floor, whatever their caste, religion or status.',dish:'Roti, maa ki dal and kheer'},
  {id:'rajasthan',n:'Rajasthan',t:'The desert kitchen',place:'Thar Desert',x:29,y:29,ic:'🐪',plate:'brass',sel:['bajra','ghee','jaggery','garlic','takra'],
   story:'Where water is scarce, cooks built a cuisine of millets, buttermilk, dried beans and foods that keep for days. Bajra roti with ghee and jaggery, and fiery garlic chutney, are winter staples.',dish:'Bajra roti, lahsun chutney, chaas'},
  {id:'gujarat',n:'Gujarat',t:'The sweet-sour thali',place:'Ahmedabad and Saurashtra',x:22,y:42,ic:'🪔',plate:'brass',sel:['wheat','curd','jaggery','tamarind','hing','moong'],
   story:'The Gujarati thali is famous for balancing every taste in one meal — jaggery and tamarind in the dal, tangy kadhi made from curd, and a pinch of hing in the tempering.',dish:'Dal, kadhi, rotli and more'},
  {id:'bengal',n:'Bengal',t:'A meal from bitter to sweet',place:'Kolkata',x:70,y:41,ic:'🐟',plate:'kansa',sel:['rice','neem','fish','mustard','jaggery','ginger'],
   story:'A traditional Bengali meal moves in courses: it begins with something bitter (shukto, or neem leaves in spring), continues to fish in mustard, and ends with sweets made from nolen gur. Kansa plates have long been part of the table.',dish:'Shukto, shorshe maach, rice, payesh'},
  {id:'assam',n:'Assam',t:'Magh Bihu feast',place:'Brahmaputra valley',x:86,y:31,ic:'🌾',plate:'kansa',sel:['rice','sesame','jaggery','fish','mustard'],
   story:'At Magh Bihu, the harvest festival of January, families make pithas from rice, sesame and jaggery and gather around community bonfires (meji). Bell-metal ware from Sarthebari graces the feast.',dish:'Til pitha, fish, rice'},
  {id:'odisha',n:'Odisha',t:'Mahaprasad of Puri',place:'Jagannath Temple, Puri',x:63,y:53,ic:'🛕',plate:'pattal',sel:['rice','moong','ghee','coconut','jaggery','ginger'],
   story:'The Jagannath Temple kitchen is one of the largest in the world. Food is cooked in earthen pots stacked one above another over wood fires, offered to the deity and shared as Mahaprasad at the Ananda Bazaar. Traditional temple cooking leaves out onion and garlic.',dish:'Rice, dalma, khiri and sweets'},
  {id:'andhra',n:'Andhra & Karnataka',t:'Ugadi new year',place:'Deccan plateau',x:51,y:63,ic:'🌼',plate:'leaf',sel:['neem','jaggery','tamarind','salt','pepper','rice'],
   story:'Ugadi begins the new year with pachadi — a spoonful of all six tastes: bitter neem flowers, sweet jaggery, sour tamarind, salt, pungent chilli or pepper and astringent raw mango. Life, it reminds you, brings every flavour.',dish:'Ugadi pachadi'},
  {id:'tamil',n:'Tamil Nadu',t:'Thai Pongal',place:'Kaveri delta',x:52,y:80,ic:'🏺',plate:'leaf',sel:['rice','moong','jaggery','ghee','pepper','ginger'],
   story:'At the harvest festival of Thai Pongal, new rice is boiled with milk and jaggery in a new clay pot outdoors until it bubbles over, and everyone shouts “Pongalo pongal!” — a sign of abundance.',dish:'Sakkarai pongal and ven pongal'},
  {id:'kerala',n:'Kerala',t:'Onam sadya',place:'Malabar coast',x:45,y:88,ic:'🍃',plate:'leaf',sel:['rice','moong','ghee','coconut','banana','takra'],
   story:'The Onam sadya is a vegetarian feast of more than twenty dishes, each with its set place on the banana leaf. It begins with parippu (moong dal) and ghee over rice, and includes banana chips and spiced buttermilk.',dish:'Parippu, sambar, avial, payasam'}
 ];
 var FESTIVALS=[
  {m:'Jan',n:'Makar Sankranti & Lohri',ic:'🪁',dish:'Til-gud',sel:['sesame','jaggery'],x:'Kites fill the sky and sesame-jaggery sweets are shared as the sun turns north.'},
  {m:'Jan',n:'Thai Pongal',ic:'🏺',dish:'Sakkarai pongal',sel:['rice','moong','jaggery','ghee'],x:'New rice boils over in a clay pot for the Tamil harvest.'},
  {m:'Jan',n:'Magh Bihu',ic:'🔥',dish:'Til pitha',sel:['rice','sesame','jaggery'],x:'Assam’s harvest feast around the meji bonfire.'},
  {m:'Mar',n:'Holi',ic:'🎨',dish:'Thandai (simplified)',sel:['milk','pepper'],x:'A spiced milk cooler for the festival of colours.'},
  {m:'Mar–Apr',n:'Ugadi & Gudi Padwa',ic:'🌼',dish:'Ugadi pachadi',sel:['neem','jaggery','tamarind','salt','pepper'],x:'A new year that begins with all six tastes.'},
  {m:'Aug–Sep',n:'Onam',ic:'🛶',dish:'Onam sadya (a taste of it)',sel:['rice','coconut','banana','takra'],x:'Kerala welcomes King Mahabali with a feast on banana leaves.'},
  {m:'Sep–Oct',n:'Durga Puja',ic:'🪷',dish:'Bhog khichuri',sel:['rice','moong','ghee','ginger'],x:'Khichuri offered as bhog in pandals across Bengal.'},
  {m:'Oct',n:'Kojagari Lakshmi Puja',ic:'🌕',dish:'Narkel naru',sel:['coconut','jaggery'],x:'Coconut sweets on the full-moon night after Durga Puja.'},
  {m:'Oct–Nov',n:'Chhath Puja',ic:'🌅',dish:'Thekua',sel:['wheat','ghee','jaggery'],x:'Offered to the setting and rising sun on the riverbanks of Bihar.'}
 ];
 return {RASA:RASA,RASA_ORDER:RASA_ORDER,CATS:CATS,ING:ING,SRC:SRC,PAIRS:PAIRS,NOTES:NOTES,RITU:RITU,rituOf:rituOf,DISHES:DISHES,PLATES:PLATES,REGIONS:REGIONS,FESTIVALS:FESTIVALS};
})();
