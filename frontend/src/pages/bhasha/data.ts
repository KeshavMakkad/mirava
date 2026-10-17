// Bhasha data ported from legacy Bhasha.html: languages, word histories,
// cognates and classical verses.

export interface Lang {
  c: string
  n: string
  nn: string
  g: 'auto' | 'modern' | 'classical'
  s?: string | null
  tts?: string | null
  mt?: string
  rtl?: boolean
  era?: string
  derive?: 'pali' | 'pk'
  aiOnly?: boolean
}
/** [Sanskrit IAST, meaning, Pali, Prakrit, Hindi IAST, Hindi Devanagari, cousins, note?] */
export type Chain = [string, string, string, string, string, string, [string, string, string][], string?]
export type FamilyKey = 'ia' | 'dr' | 'tb' | 'aa' | 'ie'
export interface Kin {
  k: string
  i: string
  roots: Record<string, string>
  w: Record<string, [string, string, string]>
}
export interface Verse {
  id: string
  lang: string
  src: string
  base: string
  show?: string
  text: string
  words: [string, string, string][]
  tr: string
  note?: string
}
/* =====================================================================
   BHĀṢĀ DATA — languages, word histories, cognates, classical verses
   ===================================================================== */
export const LANGS: Lang[] = [
  { c: 'auto', n: 'Detect language', nn: '', g: 'auto' },
  { c: 'en', n: 'English', nn: 'English', g: 'modern', s: null, tts: 'en-IN', mt: 'en' },
  { c: 'hi', n: 'Hindi', nn: 'हिन्दी', g: 'modern', s: 'deva', tts: 'hi-IN', mt: 'hi' },
  { c: 'bn', n: 'Bengali', nn: 'বাংলা', g: 'modern', s: 'beng', tts: 'bn-IN', mt: 'bn' },
  { c: 'mr', n: 'Marathi', nn: 'मराठी', g: 'modern', s: 'deva', tts: 'mr-IN', mt: 'mr' },
  { c: 'te', n: 'Telugu', nn: 'తెలుగు', g: 'modern', s: 'telu', tts: 'te-IN', mt: 'te' },
  { c: 'ta', n: 'Tamil', nn: 'தமிழ்', g: 'modern', s: 'taml', tts: 'ta-IN', mt: 'ta' },
  { c: 'gu', n: 'Gujarati', nn: 'ગુજરાતી', g: 'modern', s: 'gujr', tts: 'gu-IN', mt: 'gu' },
  { c: 'ur', n: 'Urdu', nn: 'اردو', g: 'modern', s: null, tts: 'ur-IN', mt: 'ur', rtl: true },
  { c: 'kn', n: 'Kannada', nn: 'ಕನ್ನಡ', g: 'modern', s: 'knda', tts: 'kn-IN', mt: 'kn' },
  { c: 'or', n: 'Odia', nn: 'ଓଡ଼ିଆ', g: 'modern', s: 'orya', tts: 'or-IN', mt: 'or' },
  { c: 'ml', n: 'Malayalam', nn: 'മലയാളം', g: 'modern', s: 'mlym', tts: 'ml-IN', mt: 'ml' },
  { c: 'pa', n: 'Punjabi', nn: 'ਪੰਜਾਬੀ', g: 'modern', s: 'guru', tts: 'pa-IN', mt: 'pa' },
  { c: 'as', n: 'Assamese', nn: 'অসমীয়া', g: 'modern', s: 'beng', tts: 'as-IN', mt: 'as' },
  { c: 'mai', n: 'Maithili', nn: 'मैथिली', g: 'modern', s: 'deva', tts: 'hi-IN', mt: 'mai' },
  { c: 'sat', n: 'Santali', nn: 'ᱥᱟᱱᱛᱟᱲᱤ', g: 'modern', s: null, tts: null, mt: 'sat' },
  { c: 'ks', n: 'Kashmiri', nn: 'کٲشُر', g: 'modern', s: null, tts: null, mt: 'ks', rtl: true },
  { c: 'ne', n: 'Nepali', nn: 'नेपाली', g: 'modern', s: 'deva', tts: 'ne-NP', mt: 'ne' },
  { c: 'sd', n: 'Sindhi', nn: 'سنڌي', g: 'modern', s: null, tts: null, mt: 'sd', rtl: true },
  { c: 'kok', n: 'Konkani', nn: 'कोंकणी', g: 'modern', s: 'deva', tts: 'hi-IN', mt: 'kok' },
  { c: 'doi', n: 'Dogri', nn: 'डोगरी', g: 'modern', s: 'deva', tts: 'hi-IN', mt: 'doi' },
  { c: 'mni', n: 'Manipuri (Meitei)', nn: 'ꯃꯤꯇꯩꯂꯣꯟ', g: 'modern', s: null, tts: null, mt: 'mni' },
  { c: 'brx', n: 'Bodo', nn: 'बड़ो', g: 'modern', s: 'deva', tts: 'hi-IN', mt: 'brx' },
  { c: 'sa', n: 'Sanskrit', nn: 'संस्कृतम्', g: 'classical', s: 'deva', tts: 'hi-IN', mt: 'sa', era: 'c. 1500 BCE →' },
  { c: 'pi', n: 'Pali', nn: 'पाळि', g: 'classical', s: 'deva', tts: 'hi-IN', era: 'c. 5th c. BCE →', derive: 'pali' },
  { c: 'pra', n: 'Prakrit (Mahārāṣṭrī)', nn: 'पाइअ', g: 'classical', s: 'brah', tts: 'hi-IN', era: 'c. 1st–9th c. CE', derive: 'pk' },
  { c: 'pka', n: 'Ardhamāgadhī Prakrit', nn: 'अद्धमागही', g: 'classical', s: 'deva', tts: 'hi-IN', era: 'Jain canon', aiOnly: true },
  { c: 'ota', n: 'Classical Tamil (Sangam)', nn: 'சங்கத் தமிழ்', g: 'classical', s: 'taml', tts: 'ta-IN', era: 'c. 300 BCE – 300 CE', aiOnly: true }
];

export const PHRASES: string[] = ['Truth alone triumphs.', 'The whole world is one family.', 'Welcome to India, friend.', 'Where is the old temple?', 'Knowledge gives humility.', 'Thank you for the delicious food.'];

/* Word histories: [Sanskrit IAST, meaning, Pali, Mahārāṣṭrī Prakrit, Hindi (IAST), Hindi (Devanagari), cousins [[language, native, roman]], note] */
export const CHAINS: Chain[] = [
  ['hasta', 'hand', 'hattha', 'hattha', 'hāth', 'हाथ', [['Bengali', 'হাত', 'hāt'], ['Marathi', 'हात', 'hāt'], ['Punjabi', 'ਹੱਥ', 'hatth']]],
  ['karma', 'work, deed', 'kamma', 'kamma', 'kām', 'काम', [['Marathi', 'काम', 'kām'], ['Punjabi', 'ਕੰਮ', 'kamm']], 'Hindi also borrowed karma back from Sanskrit unchanged: कर्म.'],
  ['agni', 'fire', 'aggi', 'aggi', 'āg', 'आग', [['Bengali', 'আগুন', 'āgun'], ['Punjabi', 'ਅੱਗ', 'agg'], ['Nepali', 'आगो', 'āgo']]],
  ['dugdha', 'milk', 'duddha', 'duddha', 'dūdh', 'दूध', [['Bengali', 'দুধ', 'dudh'], ['Punjabi', 'ਦੁੱਧ', 'duddh']]],
  ['sapta', 'seven', 'satta', 'satta', 'sāt', 'सात', [['Bengali', 'সাত', 'sāt'], ['Punjabi', 'ਸੱਤ', 'satt']], 'English seven comes from the same Indo-European number.'],
  ['kṣetra', 'field', 'khetta', 'khetta', 'khet', 'खेत', [['Punjabi', 'ਖੇਤ', 'khet']]],
  ['satya', 'truth', 'sacca', 'sacca', 'sac', 'सच', [['Punjabi', 'ਸੱਚ', 'sacc']]],
  ['adya', 'today', 'ajja', 'ajja', 'āj', 'आज', [['Bengali', 'আজ', 'āj'], ['Marathi', 'आज', 'āj'], ['Punjabi', 'ਅੱਜ', 'ajj']]],
  ['rātri', 'night', 'ratti', 'ratti', 'rāt', 'रात', [['Bengali', 'রাত', 'rāt'], ['Punjabi', 'ਰਾਤ', 'rāt']]],
  ['karṇa', 'ear', 'kaṇṇa', 'kaṇṇa', 'kān', 'कान', [['Bengali', 'কান', 'kān'], ['Punjabi', 'ਕੰਨ', 'kann']]],
  ['bhakta', 'cooked rice (a share)', 'bhatta', 'bhatta', 'bhāt', 'भात', [['Bengali', 'ভাত', 'bhāt'], ['Marathi', 'भात', 'bhāt']]],
  ['grāma', 'village', 'gāma', 'gāma', 'gā̃v', 'गाँव', [['Marathi', 'गाव', 'gāv']]],
  ['sarpa', 'snake', 'sappa', 'sappa', 'sā̃p', 'साँप', [['Bengali', 'সাপ', 'sāp'], ['Punjabi', 'ਸੱਪ', 'sapp']]],
  ['mukha', 'face, mouth', 'mukha', 'muha', 'mũh', 'मुँह', [['Bengali', 'মুখ', 'mukh']]],
  ['mitra', 'friend', 'mitta', 'mitta', 'mīt', 'मीत', []],
  ['akṣi', 'eye', 'akkhi', 'akkhi', 'ā̃kh', 'आँख', [['Punjabi', 'ਅੱਖ', 'akkh'], ['Gujarati', 'આંખ', 'āṅkh']]],
  ['kārya', 'task, work', 'kāriya', 'kajja', 'kāj', 'काज', [['Bengali', 'কাজ', 'kāj']]],
  ['nidrā', 'sleep', 'niddā', 'ṇiddā', 'nī̃d', 'नींद', [['Punjabi', 'ਨੀਂਦ', 'nī̃d']]],
  ['aṣṭa', 'eight', 'aṭṭha', 'aṭṭha', 'āṭh', 'आठ', [['Bengali', 'আট', 'āṭ'], ['Punjabi', 'ਅੱਠ', 'aṭṭh']]],
  ['hastin', 'elephant ("the one with a hand")', 'hatthī', 'hatthī', 'hāthī', 'हाथी', [['Bengali', 'হাতি', 'hāti']]],
  ['candra', 'moon', 'canda', 'caṃda', 'cā̃d', 'चाँद', [['Bengali', 'চাঁদ', 'cā̃d'], ['Punjabi', 'ਚੰਨ', 'cann']]],
  ['karpāsa', 'cotton', 'kappāsa', 'kappāsa', 'kapās', 'कपास', []],
  ['ikṣu', 'sugarcane', 'ucchu', 'ucchu', 'īkh', 'ईख', []],
  ['kṛṣṇa', 'dark; the god Krishna', 'kaṇha', 'kaṇha', 'kānhā', 'कान्हा', [], 'Kanha, the loving name for Krishna, is the Prakrit form living on.'],
  ['mayūra', 'peacock', 'mayūra', 'mora', 'mor', 'मोर', [['Marathi', 'मोर', 'mor']]],
  ['upādhyāya', 'teacher', 'upajjhāya', 'uvajjhāya', 'ojhā', 'ओझा', [], 'The surnames Ojha and Jha come from this word for a teacher.'],
  ['kūpa', 'well', 'kūpa', 'kūva', 'kuā̃', 'कुआँ', []],
  ['gṛha', 'house', 'gaha', 'ghara', 'ghar', 'घर', [['Bengali', 'ঘর', 'ghar'], ['Marathi', 'घर', 'ghar']]],
  ['jihvā', 'tongue', 'jivhā', 'jīhā', 'jībh', 'जीभ', []],
  ['sūcī', 'needle', 'sūci', 'sūī', 'suī', 'सुई', []],
  ['sūrya', 'sun', 'suriya', 'sujja', 'sūraj', 'सूरज', []],
  ['dīpa', 'lamp', 'dīpa', 'dīva', 'diyā', 'दिया', []],
  ['mṛttikā', 'earth, clay', 'mattikā', 'maṭṭiā', 'miṭṭī', 'मिट्टी', [['Bengali', 'মাটি', 'māṭi'], ['Punjabi', 'ਮਿੱਟੀ', 'miṭṭī']]],
  ['parṇa', 'leaf', 'paṇṇa', 'paṇṇa', 'pān', 'पान', [['Bengali', 'পান', 'pān']], 'Pān, the betel leaf, is simply "the leaf".'],
  ['śreṣṭhin', 'chief merchant', 'seṭṭhi', 'seṭṭhi', 'seṭh', 'सेठ', []],
  ['catvāri', 'four', 'cattāri', 'cattāri', 'cār', 'चार', [['Bengali', 'চার', 'cār'], ['Marathi', 'चार', 'cār']]],
  ['pakva', 'ripe, cooked', 'pakka', 'pakka', 'pakkā', 'पक्का', [], 'Here Hindi kept the double consonant: rules have exceptions.'],
  ['vatsa', 'calf', 'vaccha', 'vaccha', 'bachṛā', 'बछड़ा', []],
  ['dharma', 'duty, law', 'dhamma', 'dhamma', 'dharm', 'धर्म', [], 'Hindi uses the learned Sanskrit form again (a tatsama). Dhamma lives on in Buddhism.']
];

/* Cognates across India's four language families */
export const KIN_LANGS: [string, string, FamilyKey][] = [
  ['sa', 'Sanskrit', 'ia'], ['pi', 'Pali', 'ia'], ['hi', 'Hindi', 'ia'], ['bn', 'Bengali', 'ia'], ['mr', 'Marathi', 'ia'], ['gu', 'Gujarati', 'ia'], ['pa', 'Punjabi', 'ia'], ['or', 'Odia', 'ia'], ['as', 'Assamese', 'ia'], ['ne', 'Nepali', 'ia'],
  ['ta', 'Tamil', 'dr'], ['te', 'Telugu', 'dr'], ['kn', 'Kannada', 'dr'], ['ml', 'Malayalam', 'dr'],
  ['mni', 'Manipuri', 'tb'], ['sat', 'Santali', 'aa'], ['en', 'English', 'ie']
];
export const FAMILIES: Record<FamilyKey, [string, string]> = { ia: ['Indo-Aryan', '#f1b43c'], dr: ['Dravidian', '#4cc9a0'], tb: ['Tibeto-Burman', '#7aa7ff'], aa: ['Austroasiatic', '#e47bd0'], ie: ['Germanic cousin', '#9aa0a6'] };
export const KIN: Kin[] = [
  { k: 'mother', i: '🤱', roots: { m: 'Sanskrit mātṛ — English mother shares the same Indo-European root', n: 'Nursery words built on "a/ma" sounds turn up in unrelated families', d: 'Dravidian tāy', t: 'Telugu talli — a separate Dravidian word' },
    w: { sa: ['मातृ', 'mātṛ', 'm'], pi: ['माता', 'mātā', 'm'], hi: ['माँ', 'mā̃', 'm'], bn: ['মা', 'mā', 'm'], mr: ['आई', 'āī', 'n'], gu: ['મા', 'mā', 'm'], pa: ['ਮਾਂ', 'mā̃', 'm'], or: ['ମା', 'mā', 'm'], as: ['আই', 'āi', 'n'], ne: ['आमा', 'āmā', 'n'], ta: ['தாய்', 'tāy', 'd'], te: ['తల్లి', 'talli', 't'], kn: ['ತಾಯಿ', 'tāyi', 'd'], ml: ['അമ്മ', 'amma', 'n'], mni: ['', 'ima', 'n'], sat: ['', 'ayo', 'n'], en: ['', 'mother', 'm'] } },
  { k: 'water', i: '💧', roots: { j: 'Sanskrit jala', p: 'Sanskrit pānīya, "that which is drunk"', d: 'Dravidian nīr', x: 'Other roots — English water is actually related to Sanskrit udaka, another word for water' },
    w: { sa: ['जल', 'jala', 'j'], pi: ['जल', 'jala', 'j'], hi: ['पानी', 'pānī', 'p'], bn: ['জল', 'jal', 'j'], mr: ['पाणी', 'pāṇī', 'p'], gu: ['પાણી', 'pāṇī', 'p'], pa: ['ਪਾਣੀ', 'pāṇī', 'p'], or: ['ପାଣି', 'pāṇi', 'p'], as: ['পানী', 'pānī', 'p'], ne: ['पानी', 'pānī', 'p'], ta: ['நீர்', 'nīr', 'd'], te: ['నీరు', 'nīru', 'd'], kn: ['ನೀರು', 'nīru', 'd'], ml: ['വെള്ളം', 'veḷḷam', 'x'], mni: ['', 'ising', 'x'], sat: ['', "dak'", 'x'], en: ['', 'water', 'x'] } },
  { k: 'fire', i: '🔥', roots: { a: 'Sanskrit agni (Latin ignis is a cousin)', d: 'Dravidian neruppu / nippu', x: 'Other roots' },
    w: { sa: ['अग्नि', 'agni', 'a'], pi: ['अग्गि', 'aggi', 'a'], hi: ['आग', 'āg', 'a'], bn: ['আগুন', 'āgun', 'a'], mr: ['आग', 'āg', 'a'], gu: ['આગ', 'āg', 'a'], pa: ['ਅੱਗ', 'agg', 'a'], or: ['ନିଆଁ', 'niā̃', 'x'], as: ['জুই', 'zui', 'x'], ne: ['आगो', 'āgo', 'a'], ta: ['நெருப்பு', 'neruppu', 'd'], te: ['నిప్పు', 'nippu', 'd'], kn: ['ಬೆಂಕಿ', 'beṅki', 'x'], ml: ['തീ', 'tī', 'x'], mni: ['', 'mei', 'x'], sat: ['', 'sengel', 'x'], en: ['', 'fire', 'x'] } },
  { k: 'hand', i: '✋', roots: { h: 'Sanskrit hasta', d: 'Dravidian kai — Telugu cēyi is the same word with k softened to c', x: 'Other roots' },
    w: { sa: ['हस्त', 'hasta', 'h'], pi: ['हत्थ', 'hattha', 'h'], hi: ['हाथ', 'hāth', 'h'], bn: ['হাত', 'hāt', 'h'], mr: ['हात', 'hāt', 'h'], gu: ['હાથ', 'hāth', 'h'], pa: ['ਹੱਥ', 'hatth', 'h'], or: ['ହାତ', 'hāta', 'h'], as: ['হাত', 'hāt', 'h'], ne: ['हात', 'hāt', 'h'], ta: ['கை', 'kai', 'd'], te: ['చేయి', 'cēyi', 'd'], kn: ['ಕೈ', 'kai', 'd'], ml: ['കൈ', 'kai', 'd'], mni: ['', 'khut', 'x'], sat: ['', 'ti', 'x'], en: ['', 'hand', 'x'] } },
  { k: 'eye', i: '👁️', roots: { a: 'Sanskrit akṣi — distantly related to English eye', c: 'Sanskrit cakṣus, another word for eye', d: 'Dravidian kaṇ', x: 'Other roots — Meitei mit and Santali met\' look alike only by chance' },
    w: { sa: ['अक्षि', 'akṣi', 'a'], pi: ['अक्खि', 'akkhi', 'a'], hi: ['आँख', 'ā̃kh', 'a'], bn: ['চোখ', 'cokh', 'c'], mr: ['डोळा', 'ḍoḷā', 'x'], gu: ['આંખ', 'āṅkh', 'a'], pa: ['ਅੱਖ', 'akkh', 'a'], or: ['ଆଖି', 'ākhi', 'a'], as: ['চকু', 'sôku', 'c'], ne: ['आँखा', 'ā̃khā', 'a'], ta: ['கண்', 'kaṇ', 'd'], te: ['కన్ను', 'kannu', 'd'], kn: ['ಕಣ್ಣು', 'kaṇṇu', 'd'], ml: ['കണ്ണ്', 'kaṇṇŭ', 'd'], mni: ['', 'mit', 'x'], sat: ['', "met'", 'x'], en: ['', 'eye', 'a'] } },
  { k: 'moon', i: '🌙', roots: { c: 'Sanskrit candra, "the shining one", also borrowed into Telugu, Kannada and Malayalam', j: 'Sanskrit jyotsnā, "moonlight"', d: 'Tamil nilā', x: 'Other roots' },
    w: { sa: ['चन्द्र', 'candra', 'c'], pi: ['चन्द', 'canda', 'c'], hi: ['चाँद', 'cā̃d', 'c'], bn: ['চাঁদ', 'cā̃d', 'c'], mr: ['चंद्र', 'candra', 'c'], gu: ['ચાંદ', 'cā̃d', 'c'], pa: ['ਚੰਨ', 'cann', 'c'], or: ['ଜହ୍ନ', 'jahna', 'j'], as: ['জোন', 'zôn', 'j'], ne: ['जून', 'jūn', 'j'], ta: ['நிலா', 'nilā', 'd'], te: ['చంద్రుడు', 'candruḍu', 'c'], kn: ['ಚಂದ್ರ', 'candra', 'c'], ml: ['ചന്ദ്രൻ', 'candran', 'c'], mni: ['', 'tha', 'x'], sat: ['', 'chando', 'x'], en: ['', 'moon', 'x'] } },
  { k: 'three', i: '3️⃣', roots: { t: 'Sanskrit tri — the same number as English three', d: 'Dravidian mūnṟu', x: 'Other roots' },
    w: { sa: ['त्रि', 'tri', 't'], pi: ['तीणि', 'tīṇi', 't'], hi: ['तीन', 'tīn', 't'], bn: ['তিন', 'tin', 't'], mr: ['तीन', 'tīn', 't'], gu: ['ત્રણ', 'traṇ', 't'], pa: ['ਤਿੰਨ', 'tinn', 't'], or: ['ତିନି', 'tini', 't'], as: ['তিনি', 'tini', 't'], ne: ['तीन', 'tīn', 't'], ta: ['மூன்று', 'mūṉṟu', 'd'], te: ['మూడు', 'mūḍu', 'd'], kn: ['ಮೂರು', 'mūru', 'd'], ml: ['മൂന്ന്', 'mūnnŭ', 'd'], mni: ['', 'ahum', 'x'], sat: ['', 'pe', 'x'], en: ['', 'three', 't'] } },
  { k: 'seven', i: '7️⃣', roots: { s: 'Sanskrit sapta — the same number as English seven', d: 'Dravidian ēḻu', x: 'Other roots' },
    w: { sa: ['सप्त', 'sapta', 's'], pi: ['सत्त', 'satta', 's'], hi: ['सात', 'sāt', 's'], bn: ['সাত', 'sāt', 's'], mr: ['सात', 'sāt', 's'], gu: ['સાત', 'sāt', 's'], pa: ['ਸੱਤ', 'satt', 's'], or: ['ସାତ', 'sāta', 's'], as: ['সাত', 'xāt', 's'], ne: ['सात', 'sāt', 's'], ta: ['ஏழு', 'ēḻu', 'd'], te: ['ఏడు', 'ēḍu', 'd'], kn: ['ಏಳು', 'ēḷu', 'd'], ml: ['ഏഴ്', 'ēḻŭ', 'd'], mni: ['', 'taret', 'x'], sat: ['', 'eae', 'x'], en: ['', 'seven', 's'] } },
  { k: 'name', i: '🏷️', roots: { n: 'Sanskrit nāman — the same word as English name', d: 'Dravidian peyar (Kannada turned p into h)', x: 'Other roots' },
    w: { sa: ['नाम', 'nāma', 'n'], pi: ['नाम', 'nāma', 'n'], hi: ['नाम', 'nām', 'n'], bn: ['নাম', 'nām', 'n'], mr: ['नाव', 'nāv', 'n'], gu: ['નામ', 'nām', 'n'], pa: ['ਨਾਂ', 'nā̃', 'n'], or: ['ନାମ', 'nāma', 'n'], as: ['নাম', 'nām', 'n'], ne: ['नाम', 'nām', 'n'], ta: ['பெயர்', 'peyar', 'd'], te: ['పేరు', 'pēru', 'd'], kn: ['ಹೆಸರು', 'hesaru', 'd'], ml: ['പേര്', 'pēr', 'd'], mni: ['', 'ming', 'x'], sat: ['', 'ńutum', 'x'], en: ['', 'name', 'n'] } },
  { k: 'milk', i: '🥛', roots: { g: 'Sanskrit dugdha, "that which is milked"', k: 'Sanskrit kṣīra (Assamese gā-khīr = cow\'s milk)', d: 'Dravidian pāl (Kannada turned p into h)', x: 'Other roots' },
    w: { sa: ['दुग्ध', 'dugdha', 'g'], pi: ['खीर', 'khīra', 'k'], hi: ['दूध', 'dūdh', 'g'], bn: ['দুধ', 'dudh', 'g'], mr: ['दूध', 'dūdh', 'g'], gu: ['દૂધ', 'dūdh', 'g'], pa: ['ਦੁੱਧ', 'duddh', 'g'], or: ['ଦୁଧ', 'dudha', 'g'], as: ['গাখীৰ', 'gākhīr', 'k'], ne: ['दूध', 'dūdh', 'g'], ta: ['பால்', 'pāl', 'd'], te: ['పాలు', 'pālu', 'd'], kn: ['ಹಾಲು', 'hālu', 'd'], ml: ['പാൽ', 'pāl', 'd'], mni: ['', 'sanggom', 'x'], sat: ['', 'toa', 'x'], en: ['', 'milk', 'x'] } }
];

/* Classical verses with word-by-word glosses */
export const VERSES: Verse[] = [
  { id: 'satyam', lang: 'Sanskrit', src: 'Muṇḍaka Upaniṣad 3.1.6 · India\'s national motto', base: 'deva', text: 'सत्यमेव जयते नानृतम्',
    words: [['सत्यम्', 'satyam', 'truth'], ['एव', 'eva', 'alone, indeed'], ['जयते', 'jayate', 'triumphs'], ['न', 'na', 'not'], ['अनृतम्', 'anṛtam', 'untruth']],
    tr: 'Truth alone triumphs, not falsehood.', note: 'The first words appear under the Lion Capital of Ashoka on India\'s state emblem.' },
  { id: 'vasudha', lang: 'Sanskrit', src: 'Mahā Upaniṣad 6.71 · also in the Hitopadeśa', base: 'deva', text: 'अयं निजः परो वेति गणना लघुचेतसाम् । उदारचरितानां तु वसुधैव कुटुम्बकम् ॥',
    words: [['अयम्', 'ayam', 'this one'], ['निजः', 'nijaḥ', 'is my own'], ['परः', 'paraḥ', 'a stranger'], ['वा', 'vā', 'or'], ['इति', 'iti', 'thus'], ['गणना', 'gaṇanā', 'the reckoning'], ['लघुचेतसाम्', 'laghucetasām', 'of the narrow-minded'], ['उदारचरितानाम्', 'udāracaritānām', 'for the large-hearted'], ['तु', 'tu', 'but'], ['वसुधा', 'vasudhā', 'the earth'], ['एव', 'eva', 'itself'], ['कुटुम्बकम्', 'kuṭumbakam', 'is one family']],
    tr: '"This one is mine, that one is a stranger": so count the narrow-minded. For the large-hearted, the whole earth is one family.' },
  { id: 'gita', lang: 'Sanskrit', src: 'Bhagavad Gītā 2.47 (first half)', base: 'deva', text: 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन',
    words: [['कर्मणि', 'karmaṇi', 'in action'], ['एव', 'eva', 'only'], ['अधिकारः', 'adhikāraḥ', 'is the right'], ['ते', 'te', 'yours'], ['मा', 'mā', 'never'], ['फलेषु', 'phaleṣu', 'in its fruits'], ['कदाचन', 'kadācana', 'at any time']],
    tr: 'Your right is to the action alone, never to its fruits.', note: 'Sandhi has fused four words into karmaṇyevādhikāraste — tap the words to see them apart.' },
  { id: 'dhp5', lang: 'Pali', src: 'Dhammapada, verse 5', base: 'deva', text: 'न हि वेरेन वेरानि सम्मन्तीध कुदाचनं । अवेरेन च सम्मन्ति एस धम्मो सनन्तनो ॥',
    words: [['न हि', 'na hi', 'never indeed'], ['वेरेन', 'verena', 'by hatred'], ['वेरानि', 'verāni', 'hatreds'], ['सम्मन्ति', 'sammanti', 'are calmed'], ['इध', 'idha', 'here, in this world'], ['कुदाचनं', 'kudācanaṃ', 'at any time'], ['अवेरेन', 'averena', 'by non-hatred'], ['च', 'ca', 'but'], ['सम्मन्ति', 'sammanti', 'are calmed'], ['एस', 'esa', 'this'], ['धम्मो', 'dhammo', 'is the law'], ['सनन्तनो', 'sanantano', 'eternal']],
    tr: 'Hatred is never calmed by hatred in this world; by non-hatred alone is it calmed. This is an eternal law.', note: 'Compare Sanskrit vaira → Pali vera, dharmaḥ → dhammo, sanātanaḥ → sanantano.' },
  { id: 'ashoka', lang: 'Prakrit (Ashokan)', src: 'Pillar Edicts of Ashoka, c. 3rd century BCE', base: 'deva', show: 'brah', text: 'देवानंपिये पियदसि लाजा हेवं आहा',
    words: [['देवानंपिये', 'devānaṃpiye', 'Beloved of the Gods'], ['पियदसि', 'piyadasi', 'Piyadasi, "of gracious mien"'], ['लाजा', 'lājā', 'the king (Sanskrit rājā; eastern r → l)'], ['हेवं', 'hevaṃ', 'thus'], ['आहा', 'āhā', 'speaks']],
    tr: 'The Beloved of the Gods, King Piyadasi, speaks thus.', note: 'The opening formula of Ashoka\'s edicts, carved in Brahmi. Brahmi was deciphered by James Prinsep in 1837.' },
  { id: 'kural1', lang: 'Classical Tamil', src: 'Tirukkuṟaḷ, couplet 1', base: 'taml', text: 'அகர முதல எழுத்தெல்லாம் ஆதி பகவன் முதற்றே உலகு',
    words: [['அகர', 'akara', 'the letter A'], ['முதல', 'mutala', 'as the first'], ['எழுத்து', 'eḻuttu', 'letters'], ['எல்லாம்', 'ellām', 'all'], ['ஆதி', 'āti', 'primordial'], ['பகவன்', 'pakavaṉ', 'God'], ['முதற்றே', 'mutaṟṟē', 'is the first of'], ['உலகு', 'ulaku', 'the world']],
    tr: 'As the letter A is the first of all letters, so the Primordial God is first of the world.' },
  { id: 'puram192', lang: 'Classical Tamil (Sangam)', src: 'Puṟanāṉūṟu 192 · Kaṇiyaṉ Pūṅkuṉṟaṉār', base: 'taml', show: 'brah', text: 'யாதும் ஊரே யாவரும் கேளிர்',
    words: [['யாதும்', 'yātum', 'every place'], ['ஊரே', 'ūrē', 'is my town'], ['யாவரும்', 'yāvarum', 'all people'], ['கேளிர்', 'kēḷir', 'are my kin']],
    tr: 'Every town is my town; all people are my kin.', note: 'Shown by default in Brahmi: Sangam-era Tamil was written in a form of it, called Tamil-Brahmi.' }
];
