// LIPI engine ported verbatim from legacy Bhasha.html (pure functions).
/* =====================================================================
   LIPI ENGINE — convert between 16 Brahmic scripts + IAST
   Tables generated from the Unicode Character Database (v15.1).
   ===================================================================== */
const LIPI = (() => {
  'use strict';
  const T = {"deva": {"CANDRABINDU": "ँ", "ANUSVARA": "ं", "VISARGA": "ः", "L:SHORT A": "ऄ", "L:A": "अ", "L:AA": "आ", "L:I": "इ", "L:II": "ई", "L:U": "उ", "L:UU": "ऊ", "L:VOCALIC R": "ऋ", "L:VOCALIC L": "ऌ", "L:CANDRA E": "ऍ", "L:SHORT E": "ऎ", "L:E": "ए", "L:AI": "ऐ", "L:CANDRA O": "ऑ", "L:SHORT O": "ऒ", "L:O": "ओ", "L:AU": "औ", "L:KA": "क", "L:KHA": "ख", "L:GA": "ग", "L:GHA": "घ", "L:NGA": "ङ", "L:CA": "च", "L:CHA": "छ", "L:JA": "ज", "L:JHA": "झ", "L:NYA": "ञ", "L:TTA": "ट", "L:TTHA": "ठ", "L:DDA": "ड", "L:DDHA": "ढ", "L:NNA": "ण", "L:TA": "त", "L:THA": "थ", "L:DA": "द", "L:DHA": "ध", "L:NA": "न", "L:NNNA": "ऩ", "L:PA": "प", "L:PHA": "फ", "L:BA": "ब", "L:BHA": "भ", "L:MA": "म", "L:YA": "य", "L:RA": "र", "L:RRA": "ऱ", "L:LA": "ल", "L:LLA": "ळ", "L:LLLA": "ऴ", "L:VA": "व", "L:SHA": "श", "L:SSA": "ष", "L:SA": "स", "L:HA": "ह", "V:OE": "ऺ", "V:OOE": "ऻ", "NUKTA": "़", "AVAGRAHA": "ऽ", "V:AA": "ा", "V:I": "ि", "V:II": "ी", "V:U": "ु", "V:UU": "ू", "V:VOCALIC R": "ृ", "V:VOCALIC RR": "ॄ", "V:CANDRA E": "ॅ", "V:SHORT E": "ॆ", "V:E": "े", "V:AI": "ै", "V:CANDRA O": "ॉ", "V:SHORT O": "ॊ", "V:O": "ो", "V:AU": "ौ", "VIRAMA": "्", "V:PRISHTHAMATRA E": "ॎ", "V:AW": "ॏ", "V:CANDRA LONG E": "ॕ", "V:UE": "ॖ", "V:UUE": "ॗ", "L:QA": "क़", "L:KHHA": "ख़", "L:GHHA": "ग़", "L:ZA": "ज़", "L:DDDHA": "ड़", "L:RHA": "ढ़", "L:FA": "फ़", "L:YYA": "य़", "L:VOCALIC RR": "ॠ", "L:VOCALIC LL": "ॡ", "V:VOCALIC L": "ॢ", "V:VOCALIC LL": "ॣ", "DANDA": "।", "DDANDA": "॥", "D:ZERO": "०", "D:ONE": "१", "D:TWO": "२", "D:THREE": "३", "D:FOUR": "४", "D:FIVE": "५", "D:SIX": "६", "D:SEVEN": "७", "D:EIGHT": "८", "D:NINE": "९", "L:CANDRA A": "ॲ", "L:OE": "ॳ", "L:OOE": "ॴ", "L:AW": "ॵ", "L:UE": "ॶ", "L:UUE": "ॷ", "L:MARWARI DDA": "ॸ", "L:ZHA": "ॹ", "L:HEAVY YA": "ॺ", "L:GGA": "ॻ", "L:JJA": "ॼ", "L:GLOTTAL STOP": "ॽ", "L:DDDA": "ॾ", "L:BBA": "ॿ"}, "beng": {"CANDRABINDU": "ঁ", "ANUSVARA": "ং", "VISARGA": "ঃ", "L:A": "অ", "L:AA": "আ", "L:I": "ই", "L:II": "ঈ", "L:U": "উ", "L:UU": "ঊ", "L:VOCALIC R": "ঋ", "L:VOCALIC L": "ঌ", "L:E": "এ", "L:AI": "ঐ", "L:O": "ও", "L:AU": "ঔ", "L:KA": "ক", "L:KHA": "খ", "L:GA": "গ", "L:GHA": "ঘ", "L:NGA": "ঙ", "L:CA": "চ", "L:CHA": "ছ", "L:JA": "জ", "L:JHA": "ঝ", "L:NYA": "ঞ", "L:TTA": "ট", "L:TTHA": "ঠ", "L:DDA": "ড", "L:DDHA": "ঢ", "L:NNA": "ণ", "L:TA": "ত", "L:THA": "থ", "L:DA": "দ", "L:DHA": "ধ", "L:NA": "ন", "L:PA": "প", "L:PHA": "ফ", "L:BA": "ব", "L:BHA": "ভ", "L:MA": "ম", "L:YA": "য", "L:RA": "র", "L:LA": "ল", "L:SHA": "শ", "L:SSA": "ষ", "L:SA": "স", "L:HA": "হ", "NUKTA": "়", "AVAGRAHA": "ঽ", "V:AA": "া", "V:I": "ি", "V:II": "ী", "V:U": "ু", "V:UU": "ূ", "V:VOCALIC R": "ৃ", "V:VOCALIC RR": "ৄ", "V:E": "ে", "V:AI": "ৈ", "V:O": "ো", "V:AU": "ৌ", "VIRAMA": "্", "CHILLU": {"ৎ": "TA"}, "L:RRA": "ড়", "L:RHA": "ঢ়", "L:YYA": "য়", "L:VOCALIC RR": "ৠ", "L:VOCALIC LL": "ৡ", "V:VOCALIC L": "ৢ", "V:VOCALIC LL": "ৣ", "D:ZERO": "০", "D:ONE": "১", "D:TWO": "২", "D:THREE": "৩", "D:FOUR": "৪", "D:FIVE": "৫", "D:SIX": "৬", "D:SEVEN": "৭", "D:EIGHT": "৮", "D:NINE": "৯", "L:RA WITH MIDDLE DIAGONAL": "ৰ", "L:RA WITH LOWER DIAGONAL": "ৱ", "L:VEDIC ANUSVARA": "ৼ"}, "guru": {"ANUSVARA": "ਂ", "VISARGA": "ਃ", "L:A": "ਅ", "L:AA": "ਆ", "L:I": "ਇ", "L:II": "ਈ", "L:U": "ਉ", "L:UU": "ਊ", "L:E": "ਏ", "L:AI": "ਐ", "L:O": "ਓ", "L:AU": "ਔ", "L:KA": "ਕ", "L:KHA": "ਖ", "L:GA": "ਗ", "L:GHA": "ਘ", "L:NGA": "ਙ", "L:CA": "ਚ", "L:CHA": "ਛ", "L:JA": "ਜ", "L:JHA": "ਝ", "L:NYA": "ਞ", "L:TTA": "ਟ", "L:TTHA": "ਠ", "L:DDA": "ਡ", "L:DDHA": "ਢ", "L:NNA": "ਣ", "L:TA": "ਤ", "L:THA": "ਥ", "L:DA": "ਦ", "L:DHA": "ਧ", "L:NA": "ਨ", "L:PA": "ਪ", "L:PHA": "ਫ", "L:BA": "ਬ", "L:BHA": "ਭ", "L:MA": "ਮ", "L:YA": "ਯ", "L:RA": "ਰ", "L:LA": "ਲ", "L:LLA": "ਲ਼", "L:VA": "ਵ", "L:SHA": "ਸ਼", "L:SA": "ਸ", "L:HA": "ਹ", "NUKTA": "਼", "V:AA": "ਾ", "V:I": "ਿ", "V:II": "ੀ", "V:U": "ੁ", "V:UU": "ੂ", "V:E": "ੇ", "V:AI": "ੈ", "V:O": "ੋ", "V:AU": "ੌ", "VIRAMA": "੍", "L:KHHA": "ਖ਼", "L:GHHA": "ਗ਼", "L:ZA": "ਜ਼", "L:RRA": "ੜ", "L:FA": "ਫ਼", "D:ZERO": "੦", "D:ONE": "੧", "D:TWO": "੨", "D:THREE": "੩", "D:FOUR": "੪", "D:FIVE": "੫", "D:SIX": "੬", "D:SEVEN": "੭", "D:EIGHT": "੮", "D:NINE": "੯", "ADDAK": "ੱ"}, "gujr": {"CANDRABINDU": "ઁ", "ANUSVARA": "ં", "VISARGA": "ઃ", "L:A": "અ", "L:AA": "આ", "L:I": "ઇ", "L:II": "ઈ", "L:U": "ઉ", "L:UU": "ઊ", "L:VOCALIC R": "ઋ", "L:VOCALIC L": "ઌ", "L:E": "એ", "L:AI": "ઐ", "L:O": "ઓ", "L:AU": "ઔ", "L:KA": "ક", "L:KHA": "ખ", "L:GA": "ગ", "L:GHA": "ઘ", "L:NGA": "ઙ", "L:CA": "ચ", "L:CHA": "છ", "L:JA": "જ", "L:JHA": "ઝ", "L:NYA": "ઞ", "L:TTA": "ટ", "L:TTHA": "ઠ", "L:DDA": "ડ", "L:DDHA": "ઢ", "L:NNA": "ણ", "L:TA": "ત", "L:THA": "થ", "L:DA": "દ", "L:DHA": "ધ", "L:NA": "ન", "L:PA": "પ", "L:PHA": "ફ", "L:BA": "બ", "L:BHA": "ભ", "L:MA": "મ", "L:YA": "ય", "L:RA": "ર", "L:LA": "લ", "L:LLA": "ળ", "L:VA": "વ", "L:SHA": "શ", "L:SSA": "ષ", "L:SA": "સ", "L:HA": "હ", "NUKTA": "઼", "AVAGRAHA": "ઽ", "V:AA": "ા", "V:I": "િ", "V:II": "ી", "V:U": "ુ", "V:UU": "ૂ", "V:VOCALIC R": "ૃ", "V:VOCALIC RR": "ૄ", "V:CANDRA E": "ૅ", "V:E": "ે", "V:AI": "ૈ", "V:CANDRA O": "ૉ", "V:O": "ો", "V:AU": "ૌ", "VIRAMA": "્", "L:VOCALIC RR": "ૠ", "L:VOCALIC LL": "ૡ", "V:VOCALIC L": "ૢ", "V:VOCALIC LL": "ૣ", "D:ZERO": "૦", "D:ONE": "૧", "D:TWO": "૨", "D:THREE": "૩", "D:FOUR": "૪", "D:FIVE": "૫", "D:SIX": "૬", "D:SEVEN": "૭", "D:EIGHT": "૮", "D:NINE": "૯", "L:ZHA": "ૹ"}, "orya": {"CANDRABINDU": "ଁ", "ANUSVARA": "ଂ", "VISARGA": "ଃ", "L:A": "ଅ", "L:AA": "ଆ", "L:I": "ଇ", "L:II": "ଈ", "L:U": "ଉ", "L:UU": "ଊ", "L:VOCALIC R": "ଋ", "L:VOCALIC L": "ଌ", "L:E": "ଏ", "L:AI": "ଐ", "L:O": "ଓ", "L:AU": "ଔ", "L:KA": "କ", "L:KHA": "ଖ", "L:GA": "ଗ", "L:GHA": "ଘ", "L:NGA": "ଙ", "L:CA": "ଚ", "L:CHA": "ଛ", "L:JA": "ଜ", "L:JHA": "ଝ", "L:NYA": "ଞ", "L:TTA": "ଟ", "L:TTHA": "ଠ", "L:DDA": "ଡ", "L:DDHA": "ଢ", "L:NNA": "ଣ", "L:TA": "ତ", "L:THA": "ଥ", "L:DA": "ଦ", "L:DHA": "ଧ", "L:NA": "ନ", "L:PA": "ପ", "L:PHA": "ଫ", "L:BA": "ବ", "L:BHA": "ଭ", "L:MA": "ମ", "L:YA": "ଯ", "L:RA": "ର", "L:LA": "ଲ", "L:LLA": "ଳ", "L:VA": "ଵ", "L:SHA": "ଶ", "L:SSA": "ଷ", "L:SA": "ସ", "L:HA": "ହ", "NUKTA": "଼", "AVAGRAHA": "ଽ", "V:AA": "ା", "V:I": "ି", "V:II": "ୀ", "V:U": "ୁ", "V:UU": "ୂ", "V:VOCALIC R": "ୃ", "V:VOCALIC RR": "ୄ", "V:E": "େ", "V:AI": "ୈ", "V:O": "ୋ", "V:AU": "ୌ", "VIRAMA": "୍", "L:RRA": "ଡ଼", "L:RHA": "ଢ଼", "L:YYA": "ୟ", "L:VOCALIC RR": "ୠ", "L:VOCALIC LL": "ୡ", "V:VOCALIC L": "ୢ", "V:VOCALIC LL": "ୣ", "D:ZERO": "୦", "D:ONE": "୧", "D:TWO": "୨", "D:THREE": "୩", "D:FOUR": "୪", "D:FIVE": "୫", "D:SIX": "୬", "D:SEVEN": "୭", "D:EIGHT": "୮", "D:NINE": "୯", "L:WA": "ୱ"}, "taml": {"ANUSVARA": "ஂ", "VISARGA": "ஃ", "L:A": "அ", "L:AA": "ஆ", "L:I": "இ", "L:II": "ஈ", "L:U": "உ", "L:UU": "ஊ", "L:SHORT E": "எ", "L:E": "ஏ", "L:AI": "ஐ", "L:SHORT O": "ஒ", "L:O": "ஓ", "L:AU": "ஔ", "L:KA": "க", "L:NGA": "ங", "L:CA": "ச", "L:JA": "ஜ", "L:NYA": "ஞ", "L:TTA": "ட", "L:NNA": "ண", "L:TA": "த", "L:NA": "ந", "L:NNNA": "ன", "L:PA": "ப", "L:MA": "ம", "L:YA": "ய", "L:RA": "ர", "L:RRA": "ற", "L:LA": "ல", "L:LLA": "ள", "L:LLLA": "ழ", "L:VA": "வ", "L:SHA": "ஶ", "L:SSA": "ஷ", "L:SA": "ஸ", "L:HA": "ஹ", "V:AA": "ா", "V:I": "ி", "V:II": "ீ", "V:U": "ு", "V:UU": "ூ", "V:SHORT E": "ெ", "V:E": "ே", "V:AI": "ை", "V:SHORT O": "ொ", "V:O": "ோ", "V:AU": "ௌ", "VIRAMA": "்", "D:ZERO": "௦", "D:ONE": "௧", "D:TWO": "௨", "D:THREE": "௩", "D:FOUR": "௪", "D:FIVE": "௫", "D:SIX": "௬", "D:SEVEN": "௭", "D:EIGHT": "௮", "D:NINE": "௯"}, "telu": {"CANDRABINDU": "ఁ", "ANUSVARA": "ం", "VISARGA": "ః", "L:A": "అ", "L:AA": "ఆ", "L:I": "ఇ", "L:II": "ఈ", "L:U": "ఉ", "L:UU": "ఊ", "L:VOCALIC R": "ఋ", "L:VOCALIC L": "ఌ", "L:SHORT E": "ఎ", "L:E": "ఏ", "L:AI": "ఐ", "L:SHORT O": "ఒ", "L:O": "ఓ", "L:AU": "ఔ", "L:KA": "క", "L:KHA": "ఖ", "L:GA": "గ", "L:GHA": "ఘ", "L:NGA": "ఙ", "L:CA": "చ", "L:CHA": "ఛ", "L:JA": "జ", "L:JHA": "ఝ", "L:NYA": "ఞ", "L:TTA": "ట", "L:TTHA": "ఠ", "L:DDA": "డ", "L:DDHA": "ఢ", "L:NNA": "ణ", "L:TA": "త", "L:THA": "థ", "L:DA": "ద", "L:DHA": "ధ", "L:NA": "న", "L:PA": "ప", "L:PHA": "ఫ", "L:BA": "బ", "L:BHA": "భ", "L:MA": "మ", "L:YA": "య", "L:RA": "ర", "L:RRA": "ఱ", "L:LA": "ల", "L:LLA": "ళ", "L:LLLA": "ఴ", "L:VA": "వ", "L:SHA": "శ", "L:SSA": "ష", "L:SA": "స", "L:HA": "హ", "NUKTA": "఼", "AVAGRAHA": "ఽ", "V:AA": "ా", "V:I": "ి", "V:II": "ీ", "V:U": "ు", "V:UU": "ూ", "V:VOCALIC R": "ృ", "V:VOCALIC RR": "ౄ", "V:SHORT E": "ె", "V:E": "ే", "V:AI": "ై", "V:SHORT O": "ొ", "V:O": "ో", "V:AU": "ౌ", "VIRAMA": "్", "L:TSA": "ౘ", "L:DZA": "ౙ", "L:RRRA": "ౚ", "L:NAKAARA POLLU": "ౝ", "L:VOCALIC RR": "ౠ", "L:VOCALIC LL": "ౡ", "V:VOCALIC L": "ౢ", "V:VOCALIC LL": "ౣ", "D:ZERO": "౦", "D:ONE": "౧", "D:TWO": "౨", "D:THREE": "౩", "D:FOUR": "౪", "D:FIVE": "౫", "D:SIX": "౬", "D:SEVEN": "౭", "D:EIGHT": "౮", "D:NINE": "౯"}, "knda": {"CANDRABINDU": "ಁ", "ANUSVARA": "ಂ", "VISARGA": "ಃ", "L:A": "ಅ", "L:AA": "ಆ", "L:I": "ಇ", "L:II": "ಈ", "L:U": "ಉ", "L:UU": "ಊ", "L:VOCALIC R": "ಋ", "L:VOCALIC L": "ಌ", "L:SHORT E": "ಎ", "L:E": "ಏ", "L:AI": "ಐ", "L:SHORT O": "ಒ", "L:O": "ಓ", "L:AU": "ಔ", "L:KA": "ಕ", "L:KHA": "ಖ", "L:GA": "ಗ", "L:GHA": "ಘ", "L:NGA": "ಙ", "L:CA": "ಚ", "L:CHA": "ಛ", "L:JA": "ಜ", "L:JHA": "ಝ", "L:NYA": "ಞ", "L:TTA": "ಟ", "L:TTHA": "ಠ", "L:DDA": "ಡ", "L:DDHA": "ಢ", "L:NNA": "ಣ", "L:TA": "ತ", "L:THA": "ಥ", "L:DA": "ದ", "L:DHA": "ಧ", "L:NA": "ನ", "L:PA": "ಪ", "L:PHA": "ಫ", "L:BA": "ಬ", "L:BHA": "ಭ", "L:MA": "ಮ", "L:YA": "ಯ", "L:RA": "ರ", "L:RRA": "ಱ", "L:LA": "ಲ", "L:LLA": "ಳ", "L:VA": "ವ", "L:SHA": "ಶ", "L:SSA": "ಷ", "L:SA": "ಸ", "L:HA": "ಹ", "NUKTA": "಼", "AVAGRAHA": "ಽ", "V:AA": "ಾ", "V:I": "ಿ", "V:II": "ೀ", "V:U": "ು", "V:UU": "ೂ", "V:VOCALIC R": "ೃ", "V:VOCALIC RR": "ೄ", "V:SHORT E": "ೆ", "V:E": "ೇ", "V:AI": "ೈ", "V:SHORT O": "ೊ", "V:O": "ೋ", "V:AU": "ೌ", "VIRAMA": "್", "L:NAKAARA POLLU": "ೝ", "L:FA": "ೞ", "L:VOCALIC RR": "ೠ", "L:VOCALIC LL": "ೡ", "V:VOCALIC L": "ೢ", "V:VOCALIC LL": "ೣ", "D:ZERO": "೦", "D:ONE": "೧", "D:TWO": "೨", "D:THREE": "೩", "D:FOUR": "೪", "D:FIVE": "೫", "D:SIX": "೬", "D:SEVEN": "೭", "D:EIGHT": "೮", "D:NINE": "೯"}, "mlym": {"CANDRABINDU": "ഁ", "ANUSVARA": "ം", "VISARGA": "ഃ", "L:VEDIC ANUSVARA": "ഄ", "L:A": "അ", "L:AA": "ആ", "L:I": "ഇ", "L:II": "ഈ", "L:U": "ഉ", "L:UU": "ഊ", "L:VOCALIC R": "ഋ", "L:VOCALIC L": "ഌ", "L:SHORT E": "എ", "L:E": "ഏ", "L:AI": "ഐ", "L:SHORT O": "ഒ", "L:O": "ഓ", "L:AU": "ഔ", "L:KA": "ക", "L:KHA": "ഖ", "L:GA": "ഗ", "L:GHA": "ഘ", "L:NGA": "ങ", "L:CA": "ച", "L:CHA": "ഛ", "L:JA": "ജ", "L:JHA": "ഝ", "L:NYA": "ഞ", "L:TTA": "ട", "L:TTHA": "ഠ", "L:DDA": "ഡ", "L:DDHA": "ഢ", "L:NNA": "ണ", "L:TA": "ത", "L:THA": "ഥ", "L:DA": "ദ", "L:DHA": "ധ", "L:NA": "ന", "L:NNNA": "ഩ", "L:PA": "പ", "L:PHA": "ഫ", "L:BA": "ബ", "L:BHA": "ഭ", "L:MA": "മ", "L:YA": "യ", "L:RA": "ര", "L:RRA": "റ", "L:LA": "ല", "L:LLA": "ള", "L:LLLA": "ഴ", "L:VA": "വ", "L:SHA": "ശ", "L:SSA": "ഷ", "L:SA": "സ", "L:HA": "ഹ", "L:TTTA": "ഺ", "AVAGRAHA": "ഽ", "V:AA": "ാ", "V:I": "ി", "V:II": "ീ", "V:U": "ു", "V:UU": "ൂ", "V:VOCALIC R": "ൃ", "V:VOCALIC RR": "ൄ", "V:SHORT E": "െ", "V:E": "േ", "V:AI": "ൈ", "V:SHORT O": "ൊ", "V:O": "ോ", "V:AU": "ൌ", "VIRAMA": "്", "L:DOT REPH": "ൎ", "CHILLU": {"ൔ": "M", "ൕ": "Y", "ൖ": "LLL", "ൺ": "NN", "ൻ": "N", "ർ": "RR", "ൽ": "L", "ൾ": "LL", "ൿ": "K"}, "L:ARCHAIC II": "ൟ", "L:VOCALIC RR": "ൠ", "L:VOCALIC LL": "ൡ", "V:VOCALIC L": "ൢ", "V:VOCALIC LL": "ൣ", "D:ZERO": "൦", "D:ONE": "൧", "D:TWO": "൨", "D:THREE": "൩", "D:FOUR": "൪", "D:FIVE": "൫", "D:SIX": "൬", "D:SEVEN": "൭", "D:EIGHT": "൮", "D:NINE": "൯"}, "brah": {"CANDRABINDU": "𑀀", "ANUSVARA": "𑀁", "VISARGA": "𑀂", "L:A": "𑀅", "L:AA": "𑀆", "L:I": "𑀇", "L:II": "𑀈", "L:U": "𑀉", "L:UU": "𑀊", "L:VOCALIC R": "𑀋", "L:VOCALIC RR": "𑀌", "L:VOCALIC L": "𑀍", "L:VOCALIC LL": "𑀎", "L:E": "𑀏", "L:AI": "𑀐", "L:O": "𑀑", "L:AU": "𑀒", "L:KA": "𑀓", "L:KHA": "𑀔", "L:GA": "𑀕", "L:GHA": "𑀖", "L:NGA": "𑀗", "L:CA": "𑀘", "L:CHA": "𑀙", "L:JA": "𑀚", "L:JHA": "𑀛", "L:NYA": "𑀜", "L:TTA": "𑀝", "L:TTHA": "𑀞", "L:DDA": "𑀟", "L:DDHA": "𑀠", "L:NNA": "𑀡", "L:TA": "𑀢", "L:THA": "𑀣", "L:DA": "𑀤", "L:DHA": "𑀥", "L:NA": "𑀦", "L:PA": "𑀧", "L:PHA": "𑀨", "L:BA": "𑀩", "L:BHA": "𑀪", "L:MA": "𑀫", "L:YA": "𑀬", "L:RA": "𑀭", "L:LA": "𑀮", "L:VA": "𑀯", "L:SHA": "𑀰", "L:SSA": "𑀱", "L:SA": "𑀲", "L:HA": "𑀳", "L:LLA": "𑀴", "L:LLLA": "𑀵", "L:RRA": "𑀶", "L:NNNA": "𑀷", "V:AA": "𑀸", "V:BHATTIPROLU AA": "𑀹", "V:I": "𑀺", "V:II": "𑀻", "V:U": "𑀼", "V:UU": "𑀽", "V:VOCALIC R": "𑀾", "V:VOCALIC RR": "𑀿", "V:VOCALIC L": "𑁀", "V:VOCALIC LL": "𑁁", "V:E": "𑁂", "V:AI": "𑁃", "V:O": "𑁄", "V:AU": "𑁅", "VIRAMA": "𑁆", "DANDA": "𑁇", "DDANDA": "𑁈", "D:ZERO": "𑁦", "D:ONE": "𑁧", "D:TWO": "𑁨", "D:THREE": "𑁩", "D:FOUR": "𑁪", "D:FIVE": "𑁫", "D:SIX": "𑁬", "D:SEVEN": "𑁭", "D:EIGHT": "𑁮", "D:NINE": "𑁯", "L:SHORT E": "𑁱", "L:SHORT O": "𑁲", "V:SHORT E": "𑁳", "V:SHORT O": "𑁴"}, "khar": {"L:A": "𐨀", "V:I": "𐨁", "V:U": "𐨂", "V:VOCALIC R": "𐨃", "V:E": "𐨅", "V:O": "𐨆", "LENMARK": "𐨌", "ANUSVARA": "𐨎", "VISARGA": "𐨏", "L:KA": "𐨐", "L:KHA": "𐨑", "L:GA": "𐨒", "L:GHA": "𐨓", "L:CA": "𐨕", "L:CHA": "𐨖", "L:JA": "𐨗", "L:NYA": "𐨙", "L:TTA": "𐨚", "L:TTHA": "𐨛", "L:DDA": "𐨜", "L:DDHA": "𐨝", "L:NNA": "𐨞", "L:TA": "𐨟", "L:THA": "𐨠", "L:DA": "𐨡", "L:DHA": "𐨢", "L:NA": "𐨣", "L:PA": "𐨤", "L:PHA": "𐨥", "L:BA": "𐨦", "L:BHA": "𐨧", "L:MA": "𐨨", "L:YA": "𐨩", "L:RA": "𐨪", "L:LA": "𐨫", "L:VA": "𐨬", "L:SHA": "𐨭", "L:SSA": "𐨮", "L:SA": "𐨯", "L:ZA": "𐨰", "L:HA": "𐨱", "L:KKA": "𐨲", "L:TTTHA": "𐨳", "L:TTTA": "𐨴", "L:VHA": "𐨵", "VIRAMA": "𐨿", "D:ONE": "𐩀", "D:TWO": "𐩁", "D:THREE": "𐩂", "D:FOUR": "𐩃", "DANDA": "𐩖", "DDANDA": "𐩗"}, "gran": {"CANDRABINDU": "𑌁", "ANUSVARA": "𑌂", "VISARGA": "𑌃", "L:A": "𑌅", "L:AA": "𑌆", "L:I": "𑌇", "L:II": "𑌈", "L:U": "𑌉", "L:UU": "𑌊", "L:VOCALIC R": "𑌋", "L:VOCALIC L": "𑌌", "L:E": "𑌏", "L:AI": "𑌐", "L:O": "𑌓", "L:AU": "𑌔", "L:KA": "𑌕", "L:KHA": "𑌖", "L:GA": "𑌗", "L:GHA": "𑌘", "L:NGA": "𑌙", "L:CA": "𑌚", "L:CHA": "𑌛", "L:JA": "𑌜", "L:JHA": "𑌝", "L:NYA": "𑌞", "L:TTA": "𑌟", "L:TTHA": "𑌠", "L:DDA": "𑌡", "L:DDHA": "𑌢", "L:NNA": "𑌣", "L:TA": "𑌤", "L:THA": "𑌥", "L:DA": "𑌦", "L:DHA": "𑌧", "L:NA": "𑌨", "L:PA": "𑌪", "L:PHA": "𑌫", "L:BA": "𑌬", "L:BHA": "𑌭", "L:MA": "𑌮", "L:YA": "𑌯", "L:RA": "𑌰", "L:LA": "𑌲", "L:LLA": "𑌳", "L:VA": "𑌵", "L:SHA": "𑌶", "L:SSA": "𑌷", "L:SA": "𑌸", "L:HA": "𑌹", "NUKTA": "𑌼", "AVAGRAHA": "𑌽", "V:AA": "𑌾", "V:I": "𑌿", "V:II": "𑍀", "V:U": "𑍁", "V:UU": "𑍂", "V:VOCALIC R": "𑍃", "V:VOCALIC RR": "𑍄", "V:E": "𑍇", "V:AI": "𑍈", "V:O": "𑍋", "V:AU": "𑍌", "VIRAMA": "𑍍", "L:VEDIC ANUSVARA": "𑍞", "L:VEDIC DOUBLE ANUSVARA": "𑍟", "L:VOCALIC RR": "𑍠", "L:VOCALIC LL": "𑍡", "V:VOCALIC L": "𑍢", "V:VOCALIC LL": "𑍣"}, "shrd": {"CANDRABINDU": "𑆀", "ANUSVARA": "𑆁", "VISARGA": "𑆂", "L:A": "𑆃", "L:AA": "𑆄", "L:I": "𑆅", "L:II": "𑆆", "L:U": "𑆇", "L:UU": "𑆈", "L:VOCALIC R": "𑆉", "L:VOCALIC RR": "𑆊", "L:VOCALIC L": "𑆋", "L:VOCALIC LL": "𑆌", "L:E": "𑆍", "L:AI": "𑆎", "L:O": "𑆏", "L:AU": "𑆐", "L:KA": "𑆑", "L:KHA": "𑆒", "L:GA": "𑆓", "L:GHA": "𑆔", "L:NGA": "𑆕", "L:CA": "𑆖", "L:CHA": "𑆗", "L:JA": "𑆘", "L:JHA": "𑆙", "L:NYA": "𑆚", "L:TTA": "𑆛", "L:TTHA": "𑆜", "L:DDA": "𑆝", "L:DDHA": "𑆞", "L:NNA": "𑆟", "L:TA": "𑆠", "L:THA": "𑆡", "L:DA": "𑆢", "L:DHA": "𑆣", "L:NA": "𑆤", "L:PA": "𑆥", "L:PHA": "𑆦", "L:BA": "𑆧", "L:BHA": "𑆨", "L:MA": "𑆩", "L:YA": "𑆪", "L:RA": "𑆫", "L:LA": "𑆬", "L:LLA": "𑆭", "L:VA": "𑆮", "L:SHA": "𑆯", "L:SSA": "𑆰", "L:SA": "𑆱", "L:HA": "𑆲", "V:AA": "𑆳", "V:I": "𑆴", "V:II": "𑆵", "V:U": "𑆶", "V:UU": "𑆷", "V:VOCALIC R": "𑆸", "V:VOCALIC RR": "𑆹", "V:VOCALIC L": "𑆺", "V:VOCALIC LL": "𑆻", "V:E": "𑆼", "V:AI": "𑆽", "V:O": "𑆾", "V:AU": "𑆿", "VIRAMA": "𑇀", "AVAGRAHA": "𑇁", "DANDA": "𑇅", "DDANDA": "𑇆", "NUKTA": "𑇊", "V:PRISHTHAMATRA E": "𑇎", "D:ZERO": "𑇐", "D:ONE": "𑇑", "D:TWO": "𑇒", "D:THREE": "𑇓", "D:FOUR": "𑇔", "D:FIVE": "𑇕", "D:SIX": "𑇖", "D:SEVEN": "𑇗", "D:EIGHT": "𑇘", "D:NINE": "𑇙"}, "sidd": {"L:A": "𑖀", "L:AA": "𑖁", "L:I": "𑖂", "L:II": "𑖃", "L:U": "𑖄", "L:UU": "𑖅", "L:VOCALIC R": "𑖆", "L:VOCALIC RR": "𑖇", "L:VOCALIC L": "𑖈", "L:VOCALIC LL": "𑖉", "L:E": "𑖊", "L:AI": "𑖋", "L:O": "𑖌", "L:AU": "𑖍", "L:KA": "𑖎", "L:KHA": "𑖏", "L:GA": "𑖐", "L:GHA": "𑖑", "L:NGA": "𑖒", "L:CA": "𑖓", "L:CHA": "𑖔", "L:JA": "𑖕", "L:JHA": "𑖖", "L:NYA": "𑖗", "L:TTA": "𑖘", "L:TTHA": "𑖙", "L:DDA": "𑖚", "L:DDHA": "𑖛", "L:NNA": "𑖜", "L:TA": "𑖝", "L:THA": "𑖞", "L:DA": "𑖟", "L:DHA": "𑖠", "L:NA": "𑖡", "L:PA": "𑖢", "L:PHA": "𑖣", "L:BA": "𑖤", "L:BHA": "𑖥", "L:MA": "𑖦", "L:YA": "𑖧", "L:RA": "𑖨", "L:LA": "𑖩", "L:VA": "𑖪", "L:SHA": "𑖫", "L:SSA": "𑖬", "L:SA": "𑖭", "L:HA": "𑖮", "V:AA": "𑖯", "V:I": "𑖰", "V:II": "𑖱", "V:U": "𑖲", "V:UU": "𑖳", "V:VOCALIC R": "𑖴", "V:VOCALIC RR": "𑖵", "V:E": "𑖸", "V:AI": "𑖹", "V:O": "𑖺", "V:AU": "𑖻", "CANDRABINDU": "𑖼", "ANUSVARA": "𑖽", "VISARGA": "𑖾", "VIRAMA": "𑖿", "NUKTA": "𑗀", "DANDA": "𑗂", "DDANDA": "𑗃", "L:THREE-CIRCLE ALTERNATE I": "𑗘", "L:TWO-CIRCLE ALTERNATE I": "𑗙", "L:TWO-CIRCLE ALTERNATE II": "𑗚", "L:ALTERNATE U": "𑗛", "V:ALTERNATE U": "𑗜", "V:ALTERNATE UU": "𑗝"}, "modi": {"L:A": "𑘀", "L:AA": "𑘁", "L:I": "𑘂", "L:II": "𑘃", "L:U": "𑘄", "L:UU": "𑘅", "L:VOCALIC R": "𑘆", "L:VOCALIC RR": "𑘇", "L:VOCALIC L": "𑘈", "L:VOCALIC LL": "𑘉", "L:E": "𑘊", "L:AI": "𑘋", "L:O": "𑘌", "L:AU": "𑘍", "L:KA": "𑘎", "L:KHA": "𑘏", "L:GA": "𑘐", "L:GHA": "𑘑", "L:NGA": "𑘒", "L:CA": "𑘓", "L:CHA": "𑘔", "L:JA": "𑘕", "L:JHA": "𑘖", "L:NYA": "𑘗", "L:TTA": "𑘘", "L:TTHA": "𑘙", "L:DDA": "𑘚", "L:DDHA": "𑘛", "L:NNA": "𑘜", "L:TA": "𑘝", "L:THA": "𑘞", "L:DA": "𑘟", "L:DHA": "𑘠", "L:NA": "𑘡", "L:PA": "𑘢", "L:PHA": "𑘣", "L:BA": "𑘤", "L:BHA": "𑘥", "L:MA": "𑘦", "L:YA": "𑘧", "L:RA": "𑘨", "L:LA": "𑘩", "L:VA": "𑘪", "L:SHA": "𑘫", "L:SSA": "𑘬", "L:SA": "𑘭", "L:HA": "𑘮", "L:LLA": "𑘯", "V:AA": "𑘰", "V:I": "𑘱", "V:II": "𑘲", "V:U": "𑘳", "V:UU": "𑘴", "V:VOCALIC R": "𑘵", "V:VOCALIC RR": "𑘶", "V:VOCALIC L": "𑘷", "V:VOCALIC LL": "𑘸", "V:E": "𑘹", "V:AI": "𑘺", "V:O": "𑘻", "V:AU": "𑘼", "ANUSVARA": "𑘽", "VISARGA": "𑘾", "VIRAMA": "𑘿", "DANDA": "𑙁", "DDANDA": "𑙂", "D:ZERO": "𑙐", "D:ONE": "𑙑", "D:TWO": "𑙒", "D:THREE": "𑙓", "D:FOUR": "𑙔", "D:FIVE": "𑙕", "D:SIX": "𑙖", "D:SEVEN": "𑙗", "D:EIGHT": "𑙘", "D:NINE": "𑙙"}, "tirh": {"L:A": "𑒁", "L:AA": "𑒂", "L:I": "𑒃", "L:II": "𑒄", "L:U": "𑒅", "L:UU": "𑒆", "L:VOCALIC R": "𑒇", "L:VOCALIC RR": "𑒈", "L:VOCALIC L": "𑒉", "L:VOCALIC LL": "𑒊", "L:E": "𑒋", "L:AI": "𑒌", "L:O": "𑒍", "L:AU": "𑒎", "L:KA": "𑒏", "L:KHA": "𑒐", "L:GA": "𑒑", "L:GHA": "𑒒", "L:NGA": "𑒓", "L:CA": "𑒔", "L:CHA": "𑒕", "L:JA": "𑒖", "L:JHA": "𑒗", "L:NYA": "𑒘", "L:TTA": "𑒙", "L:TTHA": "𑒚", "L:DDA": "𑒛", "L:DDHA": "𑒜", "L:NNA": "𑒝", "L:TA": "𑒞", "L:THA": "𑒟", "L:DA": "𑒠", "L:DHA": "𑒡", "L:NA": "𑒢", "L:PA": "𑒣", "L:PHA": "𑒤", "L:BA": "𑒥", "L:BHA": "𑒦", "L:MA": "𑒧", "L:YA": "𑒨", "L:RA": "𑒩", "L:LA": "𑒪", "L:VA": "𑒫", "L:SHA": "𑒬", "L:SSA": "𑒭", "L:SA": "𑒮", "L:HA": "𑒯", "V:AA": "𑒰", "V:I": "𑒱", "V:II": "𑒲", "V:U": "𑒳", "V:UU": "𑒴", "V:VOCALIC R": "𑒵", "V:VOCALIC RR": "𑒶", "V:VOCALIC L": "𑒷", "V:VOCALIC LL": "𑒸", "V:E": "𑒹", "V:SHORT E": "𑒺", "V:AI": "𑒻", "V:O": "𑒼", "V:SHORT O": "𑒽", "V:AU": "𑒾", "CANDRABINDU": "𑒿", "ANUSVARA": "𑓀", "VISARGA": "𑓁", "VIRAMA": "𑓂", "NUKTA": "𑓃", "AVAGRAHA": "𑓄", "D:ZERO": "𑓐", "D:ONE": "𑓑", "D:TWO": "𑓒", "D:THREE": "𑓓", "D:FOUR": "𑓔", "D:FIVE": "𑓕", "D:SIX": "𑓖", "D:SEVEN": "𑓗", "D:EIGHT": "𑓘", "D:NINE": "𑓙"}};
  const INFO = {
    deva: { n: 'Devanagari', era: 'Modern · from c. 10th c.', font: "'Noto Sans Devanagari'", lang: 'hi-IN' },
    beng: { n: 'Bengali–Assamese', era: 'Modern', font: "'Noto Sans Bengali'", lang: 'bn-IN' },
    guru: { n: 'Gurmukhi', era: 'Modern · 16th c.', font: "'Noto Sans Gurmukhi'", lang: 'pa-IN' },
    gujr: { n: 'Gujarati', era: 'Modern', font: "'Noto Sans Gujarati'", lang: 'gu-IN' },
    orya: { n: 'Odia', era: 'Modern', font: "'Noto Sans Oriya'", lang: 'or-IN' },
    taml: { n: 'Tamil', era: 'Modern', font: "'Noto Sans Tamil'", lang: 'ta-IN' },
    telu: { n: 'Telugu', era: 'Modern', font: "'Noto Sans Telugu'", lang: 'te-IN' },
    knda: { n: 'Kannada', era: 'Modern', font: "'Noto Sans Kannada'", lang: 'kn-IN' },
    mlym: { n: 'Malayalam', era: 'Modern', font: "'Noto Sans Malayalam'", lang: 'ml-IN' },
    brah: { n: 'Brahmi', era: 'Ancient · 3rd c. BCE (Ashoka)', font: "'Noto Sans Brahmi'", ancient: true },
    khar: { n: 'Kharoshthi', era: 'Ancient · Gandhara, 3rd c. BCE', font: "'Noto Sans Kharoshthi'", ancient: true, rtl: true },
    gran: { n: 'Grantha', era: 'Medieval · Pallava, 6th c.', font: "'Noto Sans Grantha'", ancient: true },
    shrd: { n: 'Sharada', era: 'Medieval · Kashmir, 8th c.', font: "'Noto Sans Sharada'", ancient: true },
    sidd: { n: 'Siddham', era: 'Medieval · 6th c., carried to Japan', font: "'Noto Sans Siddham'", ancient: true },
    tirh: { n: 'Tirhuta (Mithilakshar)', era: 'Medieval · Mithila', font: "'Noto Sans Tirhuta'", ancient: true },
    modi: { n: 'Modi', era: 'Medieval · Maratha records', font: "'Noto Sans Modi'", ancient: true },
    iast: { n: 'Roman (IAST)', era: 'Scholarly transliteration', font: "'Noto Serif'" }
  };
  const ORDER = ['deva', 'brah', 'khar', 'gran', 'shrd', 'sidd', 'tirh', 'modi', 'beng', 'orya', 'guru', 'gujr', 'taml', 'telu', 'knda', 'mlym', 'iast'];
  const REV = new Map();
  for (const sid in T) for (const key in T[sid]) {
    if (key === 'CHILLU') { for (const ch in T[sid].CHILLU) REV.set(ch, { sid, chillu: T[sid].CHILLU[ch] }); continue; }
    if (!REV.has(T[sid][key])) REV.set(T[sid][key], { sid, key });
  }
  // romanisation
  const RC = { KA: 'k', KHA: 'kh', GA: 'g', GHA: 'gh', NGA: 'ṅ', CA: 'c', CHA: 'ch', JA: 'j', JHA: 'jh', NYA: 'ñ', TTA: 'ṭ', TTHA: 'ṭh', DDA: 'ḍ', DDHA: 'ḍh', NNA: 'ṇ', TA: 't', THA: 'th', DA: 'd', DHA: 'dh', NA: 'n', NNNA: 'ṉ', PA: 'p', PHA: 'ph', BA: 'b', BHA: 'bh', MA: 'm', YA: 'y', RA: 'r', RRA: 'ṟ', LA: 'l', LLA: 'ḷ', LLLA: 'ḻ', VA: 'v', SHA: 'ś', SSA: 'ṣ', SA: 's', HA: 'h', YYA: 'ẏ', ZA: 'z', VHA: 'vh', KKA: 'k', TTTA: 'ṭ', TTTHA: 'ṭh' };
  const NUK = { KA: 'q', KHA: 'k͟h', GA: 'ġ', JA: 'z', DDA: 'ṛ', DDHA: 'ṛh', PHA: 'f', YA: 'ẏ' };
  const RV = { A: 'a', AA: 'ā', I: 'i', II: 'ī', U: 'u', UU: 'ū', 'VOCALIC R': 'ṛ', 'VOCALIC RR': 'ṝ', 'VOCALIC L': 'ḷ', 'VOCALIC LL': 'ḹ', E: 'e', AI: 'ai', O: 'o', AU: 'au', 'SHORT E': 'ĕ', 'SHORT O': 'ŏ', 'CANDRA E': 'ê', 'CANDRA O': 'ô' };
  const DIG = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];

  function tokenize(text) {
    const out = [];
    const s = String(text || '').normalize('NFC');
    for (let i = 0; i < s.length;) {
      const cp = s.codePointAt(i), ch = String.fromCodePoint(cp); i += ch.length;
      const r = REV.get(ch);
      if (!r) { out.push({ t: 'O', ch }); continue; }
      if (r.chillu) { out.push({ t: 'C', k: r.chillu, sid: r.sid }, { t: 'X' }); continue; }
      const [kind, name] = r.key.includes(':') ? r.key.split(/:(.+)/) : [r.key, ''];
      if (kind === 'L') {
        if (RV[name] !== undefined) out.push({ t: 'V', k: name, sid: r.sid }); else out.push({ t: 'C', k: name, sid: r.sid });
      } else if (kind === 'V') out.push({ t: 'M', k: name.replace(/^ALTERNATE /, '').replace(/^BHATTIPROLU /, ''), sid: r.sid });
      else if (kind === 'D') out.push({ t: 'D', k: name });
      else if (kind === 'LENMARK') { const p = out[out.length - 1]; if (p && (p.t === 'M' || p.t === 'V')) p.k = { I: 'II', U: 'UU', A: 'AA', 'VOCALIC R': 'VOCALIC RR' }[p.k] || p.k; else if (p && p.t === 'C') out.push({ t: 'M', k: 'AA' }); }
      else if (kind === 'VIRAMA') out.push({ t: 'X' });
      else if (kind === 'NUKTA') out.push({ t: 'N' });
      else if (kind === 'DANDA' || kind === 'DDANDA') out.push({ t: 'P', k: kind });
      else if (kind === 'AVAGRAHA') out.push({ t: 'S', k: 'AVAGRAHA' });
      else if (['ANUSVARA', 'VISARGA', 'CANDRABINDU'].includes(kind)) out.push({ t: 'S', k: kind });
      else out.push({ t: 'O', ch });
    }
    return out;
  }

  // ---- Latin (IAST / ISO / casual) → tokens ----
  const LV = [['ai', 'AI'], ['au', 'AU'], ['aa', 'AA'], ['ā', 'AA'], ['ii', 'II'], ['ī', 'II'], ['ee', 'II'], ['uu', 'UU'], ['ū', 'UU'], ['oo', 'UU'], ['r̥̄', 'VOCALIC RR'], ['ṝ', 'VOCALIC RR'], ['r̥', 'VOCALIC R'], ['ṛ', 'VOCALIC R'], ['l̥', 'VOCALIC L'], ['ḹ', 'VOCALIC LL'], ['ē', 'E'], ['ō', 'O'], ['ĕ', 'SHORT E'], ['ŏ', 'SHORT O'], ['a', 'A'], ['i', 'I'], ['u', 'U'], ['e', 'E'], ['o', 'O']];
  const LC = [['kh', 'KHA'], ['gh', 'GHA'], ['ch', 'CHA'], ['jh', 'JHA'], ['ṭh', 'TTHA'], ['ḍh', 'DDHA'], ['th', 'THA'], ['dh', 'DHA'], ['ph', 'PHA'], ['bh', 'BHA'], ['sh', 'SHA'], ['ṅ', 'NGA'], ['ñ', 'NYA'], ['ṭ', 'TTA'], ['ḍ', 'DDA'], ['ṇ', 'NNA'], ['ṉ', 'NNNA'], ['ṟ', 'RRA'], ['ḻ', 'LLLA'], ['ḷ', 'LLA'], ['ś', 'SHA'], ['ṣ', 'SSA'], ['k', 'KA'], ['g', 'GA'], ['c', 'CA'], ['j', 'JA'], ['t', 'TA'], ['d', 'DA'], ['n', 'NA'], ['p', 'PA'], ['b', 'BA'], ['m', 'MA'], ['y', 'YA'], ['r', 'RA'], ['l', 'LA'], ['v', 'VA'], ['w', 'VA'], ['s', 'SA'], ['h', 'HA'], ['f', 'PHA+N'], ['z', 'JA+N'], ['q', 'KA+N'], ['x', 'KA+SSA']];
  const LS = [['m̐', 'CANDRABINDU'], ['ṃ', 'ANUSVARA'], ['ṁ', 'ANUSVARA'], ['ḥ', 'VISARGA']];
  const isLatin = s => /[a-zāīūṛṝḷḹṅñṭḍṇśṣṃṁḥēōĕŏ]/i.test(s) && ![...s].some(c => REV.has(c));
  function fromLatin(text, strict) {
    const s = String(text).normalize('NFC').toLowerCase();
    const casual = !strict && !/[āīūṛṝḷḹṅñṭḍṇśṣṃṁḥēōĕŏ]/.test(s);
    const out = []; let i = 0;
    const match = list => { for (const [r, k] of list) if (s.startsWith(r, i)) return [r, k]; return null; };
    const isWordCh = c => c && /[a-zāīūṛṝḷḹṅñṭḍṇśṣṃṁḥēōĕŏ̥̄̐']/.test(c);
    while (i < s.length) {
      let m = match(LS);
      if (m) { out.push({ t: 'S', k: m[1] }); i += m[0].length; continue; }
      if (s[i] === '|') { if (s[i + 1] === '|') { out.push({ t: 'P', k: 'DDANDA' }); i += 2; } else { out.push({ t: 'P', k: 'DANDA' }); i++; } continue; }
      if (/[0-9]/.test(s[i])) { out.push({ t: 'D', k: DIG[+s[i]] }); i++; continue; }
      if (s[i] === "'" && i > 0 && isWordCh(s[i - 1])) { out.push({ t: 'S', k: 'AVAGRAHA' }); i++; continue; }
      // ḷ is a vowel (Sanskrit) unless followed by a vowel
      let c = match(LC);
      if (c && c[0] === 'ḷ' && !LV.some(([r]) => s.startsWith(r, i + 1))) c = null;
      if (c) {
        const parts = c[1].split('+');
        if (parts[1] === 'SSA') { out.push({ t: 'C', k: 'KA' }, { t: 'X' }, { t: 'C', k: 'SSA' }); }
        else { out.push({ t: 'C', k: parts[0] }); if (parts[1] === 'N') out.push({ t: 'N' }); }
        i += c[0].length;
        const v = match(LV);
        if (v) {
          i += v[0].length;
          const wordEnd = !isWordCh(s[i]);
          if (v[1] !== 'A') out.push({ t: 'M', k: v[1] });
          else if (casual && wordEnd) out.push({ t: 'M', k: 'AA' });
        } else {
          const wordEnd = !isWordCh(s[i]);
          if (!(casual && wordEnd)) out.push({ t: 'X' });
        }
        continue;
      }
      const v = match(LV);
      if (v) { out.push({ t: 'V', k: v[1] }); i += v[0].length; continue; }
      out.push({ t: 'O', ch: s[i] }); i++;
    }
    return out;
  }

  // ---- fallbacks for scripts that lack a letter ----
  const CFB = { KHA: 'KA', GHA: 'GA', GA: 'KA', CHA: 'CA', JHA: 'JA', JA: 'CA', TTHA: 'TTA', DDHA: 'DDA', DDA: 'TTA', THA: 'TA', DHA: 'DA', DA: 'TA', PHA: 'PA', BHA: 'BA', BA: 'PA', NGA: 'NA', NYA: 'NA', NNA: 'NA', NNNA: 'NA', RRA: 'RA', LLLA: 'LLA', LLA: 'LA', SHA: 'SSA', SSA: 'SA', SA: 'SHA', VA: 'BA', YYA: 'YA', ZA: 'JA', VHA: 'VA', KKA: 'KA', TTTA: 'TTA', TTTHA: 'TTHA' };
  const VFB = { II: 'I', UU: 'U', 'VOCALIC RR': 'VOCALIC R', 'VOCALIC LL': 'VOCALIC L', 'SHORT E': 'E', 'SHORT O': 'O', 'CANDRA E': 'E', 'CANDRA O': 'O', AI: 'E', AU: 'O', E: 'SHORT E', O: 'SHORT O', AA: 'A' };
  function cons(sid, k) { const t = T[sid]; let key = k, n = 0; while (n++ < 6) { if (t['L:' + key]) return t['L:' + key]; key = CFB[key]; if (!key) break; } return t['L:KA'] ? '' : ''; }
  function sign(sid, k) {
    const t = T[sid];
    if (k === 'VOCALIC R' && !t['V:VOCALIC R']) return (t.VIRAMA || '') + cons(sid, 'RA') + (t[sid === 'taml' ? 'V:U' : 'V:I'] || '');
    if (k === 'VOCALIC L' && !t['V:VOCALIC L']) return (t.VIRAMA || '') + cons(sid, 'LA') + (t['V:I'] || '');
    let key = k, n = 0; while (n++ < 4) { if (t['V:' + key]) return t['V:' + key] + (sid === 'khar' && key !== k && /^(II|UU|AA)$/.test(k) && t.LENMARK ? t.LENMARK : ''); key = VFB[key]; if (!key || key === 'A') break; }
    return sid === 'khar' && k === 'AA' ? '' : '';
  }
  function vowel(sid, k) {
    const t = T[sid];
    let key = k, n = 0; while (n++ < 4) { if (t['L:' + key]) return t['L:' + key]; key = VFB[key]; if (!key) break; }
    if (t['L:A']) return t['L:A'] + (k === 'A' ? '' : sign(sid, k));
    return '';
  }

  function render(tokens, sid) {
    if (sid === 'iast') return roman(tokens);
    const t = T[sid]; let o = '';
    for (let i = 0; i < tokens.length; i++) {
      const x = tokens[i];
      switch (x.t) {
        case 'C': o += cons(sid, x.k); break;
        case 'V': o += vowel(sid, x.k); break;
        case 'M': o += sign(sid, x.k); break;
        case 'X': o += t.VIRAMA || ''; break;
        case 'N': o += t.NUKTA || ''; break;
        case 'S': o += (sid === 'taml' && (x.k === 'ANUSVARA' || x.k === 'CANDRABINDU') ? 'ம்' : '') || t[x.k] || (x.k === 'CANDRABINDU' ? t.ANUSVARA || '' : x.k === 'AVAGRAHA' ? "'" : ''); break;
        case 'D': o += (sid !== 'khar' && t['D:' + x.k]) || String(DIG.indexOf(x.k)); break;
        case 'P': o += t[x.k] || (sid === 'taml' ? '.' : x.k === 'DDANDA' ? '॥' : '।'); break;
        default: o += x.ch;
      }
    }
    return o;
  }
  function roman(tokens) {
    let o = '';
    for (let i = 0; i < tokens.length; i++) {
      const x = tokens[i];
      if (x.t === 'C') {
        let j = i + 1, nk = false; if (tokens[j] && tokens[j].t === 'N') { nk = true; j++; }
        o += nk && NUK[x.k] ? NUK[x.k] : (RC[x.k] || '');
        const nx = tokens[j];
        if (nx && nx.t === 'M') { o += RV[nx.k] || ''; i = j; }
        else if (nx && nx.t === 'X') { i = j; }
        else { o += 'a'; i = j - 1; }
      } else if (x.t === 'V') o += RV[x.k] || '';
      else if (x.t === 'M') o += RV[x.k] || '';
      else if (x.t === 'S') o += { ANUSVARA: 'ṃ', VISARGA: 'ḥ', CANDRABINDU: 'm̐', AVAGRAHA: "'" }[x.k];
      else if (x.t === 'D') o += DIG.indexOf(x.k);
      else if (x.t === 'P') o += x.k === 'DDANDA' ? ' ||' : ' |';
      else if (x.t === 'O') o += x.ch;
    }
    return o.replace(/\s+\|/g, ' |');
  }
  function parse(text) { return isLatin(text) ? fromLatin(text) : tokenize(text); }
  function convert(text, sid) { return render(parse(text), sid); }
  function detect(text) {
    for (const ch of String(text)) { const r = REV.get(ch); if (r) return r.sid; }
    return /[a-z]/i.test(text) ? 'latin' : null;
  }
  // Hindi-style display: drop the final virama of a word (schwa already silent)
  function convertIAST(iast, sid) { return render(fromLatin(iast, true), sid); }
  function toDevaHindi(iast) { return render(fromLatin(iast, true), 'deva').replace(/्(?=\s|$)/g, ''); }
  return { INFO, ORDER, convert, parse, render, roman, detect, isLatin, toDevaHindi, convertIAST, T };
})();

export default LIPI;
export { LIPI };
