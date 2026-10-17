// Word list for the lost-language revival stage.
export interface RevivalWord { word: string; roman: string; meaning: string; lang: string; code: string; script: string; modern: string }

export const REVIVAL_WORDS: RevivalWord[] = [
    { word:'मित्र',   roman:'mitra',   meaning:'friend · companion',   lang:'Sanskrit',  code:'sa-IN', script:'DEVANAGARI',  modern:'मित्र / mitra' },
    { word:'मित्त',   roman:'mitta',   meaning:'friend · dear one',    lang:'Prakrit',   code:'hi-IN', script:'DEVANAGARI',  modern:'मीत / meet' },
    { word:'धम्म',    roman:'dhamma',  meaning:'conduct · teaching',   lang:'Prakrit',   code:'hi-IN', script:'DEVANAGARI',  modern:'धर्म / dharma' },
    { word:'नमः',     roman:'namah',   meaning:'salutation · respect', lang:'Sanskrit',  code:'sa-IN', script:'DEVANAGARI',  modern:'नमः / namah' },
    { word:'दोस्',    roman:'dos',     meaning:'friend',               lang:'Prakrit',   code:'hi-IN', script:'DEVANAGARI',  modern:'दोस्त / dost' },
    { word:'अग्गि',   roman:'aggi',    meaning:'fire',                 lang:'Prakrit',   code:'hi-IN', script:'DEVANAGARI',  modern:'अग्नि / agni' },
    { word:'পানী',    roman:'pāni',    meaning:'water',                lang:'Kashmiri',  code:'hi-IN', script:'BENGALI',     modern:'पानी / pāni' },
    { word:'ज़ून',     roman:'zūn',     meaning:'moon',                 lang:'Kashmiri',  code:'hi-IN', script:'PERSO-ARABIC',modern:'चाँद / moon' },
    { word:'பால்',    roman:'pāl',     meaning:'milk',                 lang:'Tamil',     code:'ta-IN', script:'TAMIL',       modern:'பால் / pāl' },
    { word:'জল',      roman:'jal',     meaning:'water',                lang:'Bengali',   code:'bn-IN', script:'BENGALI',     modern:'জল / jol' },
    { word:'पाणि',    roman:'pāṇi',    meaning:'hand',                 lang:'Sanskrit',  code:'sa-IN', script:'DEVANAGARI',  modern:'हाथ / hand' },
    { word:'अहं',     roman:'ahaṃ',    meaning:'I · myself',           lang:'Sanskrit',  code:'sa-IN', script:'DEVANAGARI',  modern:'मैं / I' },
    { word:'मेत्ता',  roman:'mettā',   meaning:'loving-kindness',      lang:'Pali',      code:'hi-IN', script:'DEVANAGARI',  modern:'मैत्री / maitri' },
    { word:'सुख',     roman:'sukha',   meaning:'well-being · ease',    lang:'Sanskrit',  code:'sa-IN', script:'DEVANAGARI',  modern:'सुख / happiness' },
    { word:'जीव',     roman:'jīva',    meaning:'living being · life',  lang:'Prakrit',   code:'hi-IN', script:'DEVANAGARI',  modern:'जीव / living being' },
    { word:'घर',      roman:'ghar',    meaning:'home · house',         lang:'Hindi',     code:'hi-IN', script:'DEVANAGARI',  modern:'घर / ghar' },
    { word:'நீர்',     roman:'nīr',     meaning:'water',                lang:'Tamil',     code:'ta-IN', script:'TAMIL',       modern:'நீர் / nīr' },
    { word:'আকাশ',    roman:'ākāś',    meaning:'sky',                  lang:'Bengali',   code:'bn-IN', script:'BENGALI',     modern:'আকাশ / akash' },
    { word:'पृथ्वी',  roman:'pṛthvī',  meaning:'earth',                lang:'Sanskrit',  code:'sa-IN', script:'DEVANAGARI',  modern:'पृथ्वी / earth' },
    { word:'ಬೆಳಕು',   roman:'beḷaku',  meaning:'light',                lang:'Kannada',   code:'kn-IN', script:'KANNADA',     modern:'ಬೆಳಕು / beḷaku' },
    { word:'પ્રેમ',   roman:'prem',    meaning:'love',                 lang:'Gujarati',  code:'gu-IN', script:'GUJARATI',    modern:'પ્રેમ / prem' },
    { word:'ਪਾਣੀ',    roman:'pāṇī',    meaning:'water',                lang:'Punjabi',   code:'pa-IN', script:'GURMUKHI',    modern:'ਪਾਣੀ / pāṇī' },
    { word:'സ്നേഹം', roman:'snēham',  meaning:'affection · love',     lang:'Malayalam', code:'ml-IN', script:'MALAYALAM',   modern:'സ്നേഹം / snēham' },
    { word:'ଜୀବନ',   roman:'jībana',   meaning:'life',                 lang:'Odia',      code:'or-IN', script:'ODIA',        modern:'ଜୀବନ / jībana' }
  ]
