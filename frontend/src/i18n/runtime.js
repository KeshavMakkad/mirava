/*
 * MIRAVA English / Hindi DOM runtime — ES-module port of the hackathon's
 * public/mirava-language.js + public/mirava-i18n.js.
 *
 * Importing this module (first thing in main.tsx) sets <html lang> before
 * React renders and installs `window.MiravaI18n` with the same API as the
 * original script. It translates rendered English text using the catalogue
 * in /locales/hi.json (+ /locales/templates.json for "{n} of {total}" style
 * templates) and dispatches `mirava:languagechange` on window.
 *
 * Coexisting with React: the runtime only ever changes a text node's `.data`
 * or an attribute value — it never adds, removes or reorders nodes — so React's
 * reconciliation (which holds references to the same nodes) keeps working.
 * When React later writes new English into a node, the MutationObserver sees
 * the change and translates it again before the browser paints. The original
 * English is kept in WeakMaps so switching back restores it exactly.
 *
 * Differences from the original: the floating language bar is replaced by the
 * React <LanguageToggle/>; the account / profile hooks are wired to Supabase +
 * FastAPI through `MiravaI18n.connectAccount()` (see AuthProvider); `.html`
 * links are no longer rewritten with ?lang= (React Router routes have no .html).
 */

const STORAGE_KEY = 'miravaLanguage'
const LOCALES = '/locales/'

/* ---- mirava-language.js: choose the language before layout ---- */
;(function () {
  if (window.MIRAVA_LANGUAGE) return
  let code = 'en',
    source = 'default',
    explicit = null,
    saved = null
  try {
    explicit = new URLSearchParams(location.search).get('lang')
  } catch {
    /* ignore */
  }
  // A blocked storage API must not discard an explicit language in the URL.
  try {
    saved = localStorage.getItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
  if (explicit === 'en' || explicit === 'hi') {
    code = explicit
    source = 'url'
  } else if (saved === 'en' || saved === 'hi') {
    code = saved
    source = 'browser'
  }
  document.documentElement.lang = code
  document.documentElement.dataset.miravaLanguage = code
  window.MIRAVA_LANGUAGE = { code, source }
})()

/* ---- mirava-i18n.js ---- */
;(function () {
  'use strict'
  if (window.MiravaI18n) return
  const initial = window.MIRAVA_LANGUAGE || { code: 'en', source: 'default' }
  window.MIRAVA_LANGUAGE = initial
  let current = initial.code === 'hi' ? 'hi' : 'en'
  // A saved browser choice is explicit too. A slower account response must not
  // switch the next page back to English after the visitor has chosen Hindi.
  let userChoice = initial.source === 'url' || initial.source === 'browser'
  let requestVersion = 0,
    dictionaryPromise = null,
    dictionaryLoaded = false
  let observer,
    statusEl,
    statusTimer,
    accountSeen = null
  /** Signed-in account as handed over by AuthProvider: { id, preferredLanguage } | null. */
  let account = null
  /** Writes profile fields (camelCase, like the original /api/profile) — set by AuthProvider. */
  let profileWriter = null
  let profileChain = Promise.resolve()
  const profileFields = new Set(['displayName', 'bio', 'location', 'preferredLanguage', 'avatar'])
  const sourceNodes = new WeakMap(),
    sourceAttributes = new WeakMap()
  const dirty = new Set(),
    cache = new Map(),
    missing = new Map()
  const attributeNames = ['title', 'placeholder', 'aria-label', 'aria-description', 'aria-valuetext', 'alt', 'label', 'data-tooltip']
  const skipSelector =
    'script,style,noscript,template,code,pre,kbd,[translate="no"],[data-i18n-skip],[data-i18n-ignore],[data-mirava-localized="true"],[contenteditable="true"],.mirava-tools,.notranslate,.king-msg.user,.chat-msg.user,.chat-message.user,#hpName,#profileName,#profileEmail,#wordScript,.lesson-word,.roman,#out .txt,#lpOut'
  const core = {
    'Home':'मुखपृष्ठ','Explore':'खोजें','Explore India':'भारत को जानें','Profile':'प्रोफ़ाइल','My profile':'मेरी प्रोफ़ाइल',
    'Your profile':'आपकी प्रोफ़ाइल','English':'अंग्रेज़ी','Hindi':'हिंदी','Language':'भाषा','Website language':'वेबसाइट की भाषा',
    'MIRAVA':'मिरावा','Mirava':'मिरावा','mira':'मिरा','va':'वा','Your Mirava':'आपका मिरावा','PDF':'पीडीएफ',
    'Log in':'लॉग इन करें','Login':'लॉग इन','Sign in':'साइन इन करें','Sign up':'खाता बनाएँ','Sign Up':'खाता बनाएँ',
    'Log out':'लॉग आउट करें','Logout':'लॉग आउट','Log in / Join':'लॉग इन / पंजीकरण','Admin':'व्यवस्थापक',
    'Email':'ईमेल','Email address':'ईमेल पता','Password':'पासवर्ड','Confirm password':'पासवर्ड दोहराएँ','Username':'उपयोगकर्ता नाम',
    'Phone':'फ़ोन','Name':'नाम','Save':'सहेजें','Save changes':'बदलाव सहेजें','Cancel':'रद्द करें','Close':'बंद करें','Close dialog':'संवाद बंद करें',
    'Next':'अगला','Previous':'पिछला','Back':'वापस','Continue':'जारी रखें','Retry':'फिर कोशिश करें','Loading…':'लोड हो रहा है…',
    'Loading...':'लोड हो रहा है…','Saving...':'सहेजा जा रहा है…','Search':'खोजें','Search…':'खोजें…','Search...':'खोजें…',
    'Menu':'मेन्यू','Open navigation':'नेविगेशन खोलें','Main navigation':'मुख्य नेविगेशन','Toggle menu':'मेन्यू खोलें / बंद करें',
    'Atlas':'एटलस','Open the atlas':'एटलस खोलें','Open the atlas ↗':'एटलस खोलें ↗','Back to the atlas':'एटलस पर लौटें',
    'Back to the Mirava atlas':'मिरावा एटलस पर लौटें','Continue to the atlas ↗':'एटलस पर जाएँ ↗','Log in to explore':'खोजने के लिए लॉग इन करें',
    'Quiz Arena':'प्रश्नोत्तरी','3D Heritage Game':'त्रिआयामी विरासत खेल','Heritage Game':'विरासत खेल','Vedic Maths':'वैदिक गणित',
    'Bhasha':'भाषा','Rasoi':'रसोई','Jal Parampara':'जल परंपरा','Leaderboard':'अंक तालिका','Score':'अंक','Stats':'आँकड़े',
    'Campaign':'अभियान','Rivals':'प्रतिद्वंद्वी','Play':'खेलें','Start':'शुरू करें','How to play':'कैसे खेलें','How to Play':'कैसे खेलें',
    'Quests':'अभियान','Map':'नक्शा','Bag':'थैला','Heritage codex':'विरासत ज्ञानकोश','Quests & honours':'अभियान और सम्मान',
    'Take a postcard':'पोस्टकार्ड बनाएँ','Trials & tasks':'चुनौतियाँ और कार्य','3D monuments':'त्रिआयामी स्मारक',
    'Resume':'खेल जारी रखें','Pause':'विराम','Settings':'सेटिंग्स','Sound':'ध्वनि','Music':'संगीत','Health':'स्वास्थ्य','Inventory':'सामान',
    'Culture':'संस्कृति','History':'इतिहास','Heritage':'विरासत','Festivals':'त्योहार','Monuments':'स्मारक','Arts':'कलाएँ','Languages':'भाषाएँ',
    'India':'भारत','North India':'उत्तर भारत','South India':'दक्षिण भारत','East India':'पूर्वी भारत','West India':'पश्चिम भारत',
    'Read more':'और पढ़ें','Learn more':'और जानें','View all':'सभी देखें','All':'सभी','Details':'विवरण','Correct':'सही','Incorrect':'गलत',
    'Submit':'जमा करें','Submit results':'परिणाम जमा करें','Next question →':'अगला प्रश्न →','← Previous':'← पिछला',
    'Try again':'फिर कोशिश करें','Try quiz again':'प्रश्नोत्तरी फिर खेलें','New game':'नया खेल','No results':'कोई परिणाम नहीं',
    'Download':'डाउनलोड करें','Download PDF':'पीडीएफ डाउनलोड करें','Copy':'कॉपी करें','Copied':'कॉपी हो गया','Share':'साझा करें',
    'Forgot password?':'पासवर्ड भूल गए?','Remember me':'मुझे याद रखें','Create free account ↗':'निःशुल्क खाता बनाएँ ↗',
    'I already have an account':'मेरा पहले से खाता है','Checking your session…':'आपका सत्र जाँचा जा रहा है…',
    'Checking account…':'खाता जाँचा जा रहा है…',
    'Please enter a valid email address.':'कृपया सही ईमेल पता दर्ज करें।','Email or password is incorrect.':'ईमेल या पासवर्ड गलत है।',
    'Passwords do not match.':'दोनों पासवर्ड मेल नहीं खाते।','Use a password of at least 12 characters.':'कम से कम 12 अक्षरों का पासवर्ड रखें।',
    'Please enter your password (up to 128 characters).':'अपना पासवर्ड दर्ज करें (अधिकतम 128 अक्षर)।',
    'Username must be between 3 and 30 characters.':'उपयोगकर्ता नाम 3 से 30 अक्षरों का होना चाहिए।',
    'Use a nickname between 2 and 32 characters.':'2 से 32 अक्षरों का नाम रखें।',
    'Erase all progress for {name}? This cannot be undone.':'क्या {name} की सारी प्रगति मिटा दें? यह बदलाव वापस नहीं लिया जा सकता।',
    'Phone number looks invalid. Leave it blank if you prefer.':'फ़ोन नंबर सही नहीं लग रहा। चाहें तो इसे खाली छोड़ दें।',
    'Account created! Please log in with the same details.':'खाता बन गया! इन्हीं विवरणों से लॉग इन करें।',
    'Please log in to continue your journey.':'अपनी यात्रा जारी रखने के लिए लॉग इन करें।',
    'Creating your account…':'आपका खाता बनाया जा रहा है…','Logging in…':'लॉग इन हो रहा है…','Opening Mirava…':'मिरावा खुल रहा है…',
    'Account created ✓':'खाता बन गया ✓','The account was not created. Please try again.':'खाता नहीं बन पाया। फिर कोशिश करें।',
    'The account service took too long to respond. Please try again.':'खाते की सेवा ने जवाब देने में बहुत समय लिया। फिर कोशिश करें।',
    'Could not reach the account service. Check your connection and try again.':'खाते की सेवा से संपर्क नहीं हुआ। इंटरनेट जाँचकर फिर कोशिश करें।',
    'The account request failed. Please try again.':'खाते का अनुरोध पूरा नहीं हुआ। फिर कोशिश करें।',
    'Please fill out this field.':'कृपया यह जानकारी भरें।','Please enter a valid value.':'कृपया सही जानकारी दर्ज करें।',
    'Please select an option.':'कृपया एक विकल्प चुनें।','Please use the requested format.':'कृपया दिए गए प्रारूप का उपयोग करें।',
    'Your language preference is saved.':'आपकी भाषा पसंद सहेज दी गई है।',
    'Language changed on this device. Sign in to save it to your profile.':'इस डिवाइस की भाषा बदल गई है। प्रोफ़ाइल में सहेजने के लिए लॉग इन करें।',
    'Language changed here. Your profile preference could not be saved; retry from your profile.':'यहाँ भाषा बदल गई है। प्रोफ़ाइल में पसंद नहीं सहेज पाए; प्रोफ़ाइल से फिर कोशिश करें।',
    'Sign in to view or edit your profile.':'अपनी प्रोफ़ाइल देखने या बदलने के लिए साइन इन करें।',
    'Your account changed. Reload your profile before saving.':'आपका खाता बदल गया है। सहेजने से पहले अपनी प्रोफ़ाइल फिर से खोलें।',
    'Your changes could not be saved. Please try again.':'आपके बदलाव सहेजे नहीं जा सके। फिर कोशिश करें।',
    'Enter at least one profile field to update.':'बदलने के लिए प्रोफ़ाइल की कम से कम एक जानकारी दर्ज करें।',
    'Only displayName, bio, location, preferredLanguage and avatar can be updated.':'केवल दिखाई देने वाला नाम, परिचय, स्थान, पसंदीदा भाषा और प्रोफ़ाइल प्रतीक बदले जा सकते हैं।',
    'Profile fields must be text.':'प्रोफ़ाइल की जानकारी पाठ के रूप में दर्ज करें।',
    'Hindi text could not load. Please check your connection and select Hindi again.':'हिंदी सामग्री लोड नहीं हुई। इंटरनेट जाँचें और हिंदी फिर चुनें।',
    'English original — Hindi translation pending':'मूल अंग्रेज़ी सामग्री — हिंदी अनुवाद बाकी है',
    'English original':'मूल अंग्रेज़ी सामग्री','Profile saved':'प्रोफ़ाइल सहेजी गई','Editor administration':'संपादक प्रशासन',
    // React-port additions (Google sign-in, account menu, language toggle).
    'Continue with Google':'Google के साथ जारी रखें','Opening Google…':'Google खुल रहा है…','Use English':'अंग्रेज़ी में देखें',
    'Profile & leaderboards':'प्रोफ़ाइल और अंक तालिकाएँ','Sign out':'साइन आउट करें','Classroom':'कक्षा',
    'Administrator console':'व्यवस्थापक कंसोल','Guest session':'अतिथि सत्र','Continue as guest':'अतिथि के रूप में जारी रखें',
    'Google sign-in is unavailable right now. Please use your email instead.':'Google से साइन इन अभी उपलब्ध नहीं है। कृपया अपने ईमेल का उपयोग करें।',
    'Check your inbox':'अपना इनबॉक्स देखें','📬 Check your inbox':'📬 अपना इनबॉक्स देखें','Back to log in':'लॉग इन पर वापस जाएँ',
    'Email me a magic link':'मुझे जादुई लिंक ईमेल करें','← Use my password instead':'← इसके बजाय पासवर्ड का उपयोग करें',
    'Guests can explore and play; create an account to keep your progress and join leaderboards.':'अतिथि खोज और खेल सकते हैं; अपनी प्रगति सहेजने और अंक तालिकाओं में शामिल होने के लिए खाता बनाएँ।',
    'Could not start a guest session. Please try again.':'अतिथि सत्र शुरू नहीं हो पाया। फिर कोशिश करें।',
    'Reset your password':'अपना पासवर्ड रीसेट करें','No password needed — we will email you a one-time sign-in link.':'पासवर्ड की ज़रूरत नहीं — हम आपको एक बार उपयोग होने वाला साइन-इन लिंक ईमेल करेंगे।',
    'Enter your email and we will send you a reset link.':'अपना ईमेल दर्ज करें, हम आपको रीसेट लिंक भेजेंगे।','Send magic link':'जादुई लिंक भेजें','Send reset link':'रीसेट लिंक भेजें',
    'Confirm your email':'अपना ईमेल पुष्टि करें','Continue to Explore':'खोज जारी रखें','Continue to Explore ↗':'खोज जारी रखें ↗','I am joining as':'मैं इस रूप में जुड़ रहा/रही हूँ',
    'Travel & discover':'यात्रा करें और खोजें','Learn & join a class':'सीखें और कक्षा से जुड़ें','Run classrooms':'कक्षाएँ चलाएँ',
    'Username must be 3–24 characters: lowercase letters, numbers and underscores.':'उपयोगकर्ता नाम 3–24 अक्षरों का हो: छोटे अंग्रेज़ी अक्षर, अंक और अंडरस्कोर।',
    'Display name must be at most 40 characters.':'दिखाई देने वाला नाम अधिकतम 40 अक्षरों का हो।',
    'Open it to activate your account, then you will be signed in automatically.':'खाता सक्रिय करने के लिए इसे खोलें, फिर आप अपने-आप साइन इन हो जाएँगे।',
    'Save your progress':'अपनी प्रगति सहेजें','Turn your guest session into a free account.':'अपने अतिथि सत्र को निःशुल्क खाते में बदलें।',
    'Creating account…':'खाता बनाया जा रहा है…','Save my progress':'मेरी प्रगति सहेजें','This link didn\'t work':'यह लिंक काम नहीं किया',
    'Signing you in…':'आपको साइन इन किया जा रहा है…','Hold on while we open your Mirava account.':'कृपया रुकें, आपका मिरावा खाता खोला जा रहा है।',
    'The link is invalid or has expired. Request a new one and try again.':'लिंक अमान्य है या उसकी समय सीमा समाप्त हो गई है। नया लिंक माँगें और फिर कोशिश करें।',
    'Link expired':'लिंक की समय सीमा समाप्त','Choose your password':'अपना पासवर्ड चुनें','Choose a new password':'नया पासवर्ड चुनें','Save password':'पासवर्ड सहेजें',
    'Loading your profile…':'आपकी प्रोफ़ाइल लोड हो रही है…','← Back to Explore':'← खोज पर वापस जाएँ','Your honours':'आपके सम्मान','Leaderboards':'अंक तालिकाएँ',
    'Where you stand':'आप कहाँ हैं','Checking today\'s challenge…':'आज की चुनौती जाँची जा रही है…','View result':'परिणाम देखें',
    'Upgrade account':'खाता अपग्रेड करें','Keep your progress for good':'अपनी प्रगति हमेशा के लिए सहेजें','Use a different email':'दूसरा ईमेल उपयोग करें',
    'Your Mirava account':'आपका मिरावा खाता','Questions answered':'उत्तर दिए गए प्रश्न','Longest streak':'सबसे लंबी लगातार शृंखला',
    'Global rank':'वैश्विक रैंक','Quiz in progress':'प्रश्नोत्तरी जारी है','Resume quiz →':'प्रश्नोत्तरी जारी रखें →','Start today’s quiz →':'आज की प्रश्नोत्तरी शुरू करें →',
    'That username is taken — try another.':'यह उपयोगकर्ता नाम पहले से लिया गया है — दूसरा आज़माएँ।','Upgrade my account':'मेरा खाता अपग्रेड करें',
    'Playing as a guest.':'अतिथि के रूप में खेल रहे हैं।','Join Mirava':'मिरावा से जुड़ें','Exploring India’s heritage':'भारत की विरासत की खोज',
    'Join classrooms & homework':'कक्षाओं और गृहकार्य से जुड़ें','Create classrooms & assign quizzes':'कक्षाएँ बनाएँ और प्रश्नोत्तरी दें',
    'Enter a display name between 2 and 40 characters.':'2 से 40 अक्षरों का नाम लिखें।','Keep your location within 100 characters.':'स्थान 100 अक्षरों के भीतर लिखें।',
    'Keep your bio within 600 characters.':'परिचय 600 अक्षरों के भीतर लिखें।','Use plain text without markup or special control characters.':'साधारण पाठ लिखें। मार्कअप या विशेष नियंत्रण चिह्नों का उपयोग न करें।',
    'Your profile is saved.':'आपकी प्रोफ़ाइल सहेज दी गई है।','You have unsaved changes.':'आपके बदलाव अभी सहेजे नहीं गए हैं।','Changes discarded.':'बदलाव रद्द कर दिए गए हैं।',
    '2–40 characters. This is how MIRAVA greets you.':'2–40 अक्षर। मिरावा आपको इसी नाम से संबोधित करेगा।'
  }
  let dictionary = Object.assign(Object.create(null), core)
  let folded = new Map(),
    patterns = []
  const normal = (value) => String(value).replace(/\s+/gu, ' ').trim()
  const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const interpolate = (text, params) =>
    !params
      ? text
      : text.replace(/\{([\w.]+)\}/g, (match, key) =>
          Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match,
        )
  function indexDictionary() {
    folded = new Map()
    Object.keys(dictionary).forEach((key) => {
      const low = key.toLocaleLowerCase('en')
      if (!folded.has(low)) folded.set(low, dictionary[key])
    })
    cache.clear()
  }
  indexDictionary()
  function compilePatterns(rows) {
    if (!Array.isArray(rows)) rows = Object.entries(rows || {}).map(([source, translation]) => ({ source, translation }))
    patterns = []
    rows.forEach((row) => {
      const source = normal(row.source || row.en || ''),
        translation = row.translation || row.hi
      if (!source || typeof translation !== 'string' || !/\{[^}]+\}/.test(source)) return
      const keys = [],
        constants = source.replace(/\{[^}]+\}/g, '')
      const suffixKeys = new Map(
        [
          ...source.matchAll(
            /\b(digit|zero|question|answer|recipe|result|entry|entr|photo|item|point|attempt|day|hour|minute|second|task|step|level|star|coin|badge|file|record|character|language|part|year|month|player|tip|layer|piece|visit|match|sample|ticket|colour|color|monument|finding|page|issue|capture|route|report|alert|patrol|location|assessment|mistake|stroke|site|student)\{([^}]+)\}/gi,
          ),
        ].map((match) => [match[2], match[1].toLowerCase() === 'entr' ? /^(?:y|ies)$/ : /^(?:s|es)$/]),
      )
      if (constants.replace(/[^A-Za-z]/g, '').length < 2) return
      let expression = '',
        start = 0
      for (const match of source.matchAll(/\{([^}]+)\}/g)) {
        expression += escapeRegex(source.slice(start, match.index)) + '(.{0,600}?)'
        keys.push(match[1])
        start = match.index + match[0].length
      }
      expression += escapeRegex(source.slice(start))
      const connector = normal(constants).toLowerCase()
      try {
        patterns.push({
          re: new RegExp('^' + expression + '$', 'iu'),
          keys,
          suffixKeys,
          translation,
          weight: constants.length,
          countOnly: connector === 'of' || connector === 'out of',
          choiceOnly: connector === 'or' || connector === 'vs',
        })
      } catch {
        /* ignore invalid template */
      }
    })
    patterns.sort((a, b) => b.weight - a.weight)
  }
  function lookup(text, depth) {
    // Captured template values can have leading spaces or punctuation. Keep
    // their spacing while looking up the same normalized source as a DOM node.
    const normalized = normal(text)
    if (text !== normalized) {
      const translated = lookup(normalized, depth)
      return text.match(/^\s*/u)[0] + translated + text.match(/\s*$/u)[0]
    }
    const unit = text.match(/^([^\p{L}\p{N}]*[+−-]?[0-9०-९][0-9०-९,. ]*)\s*(min|mins|minutes?|s|sec|seconds?|pts?|points?|BCE|CE|BC|AD)$/iu)
    if (unit)
      return (
        unit[1].trim() +
        ' ' +
        {
          min: 'मिनट', mins: 'मिनट', minute: 'मिनट', minutes: 'मिनट', s: 'से.', sec: 'से.', second: 'सेकंड', seconds: 'सेकंड',
          pt: 'अंक', pts: 'अंक', point: 'अंक', points: 'अंक', bce: 'ईसा पूर्व', bc: 'ईसा पूर्व', ce: 'ईस्वी', ad: 'ईस्वी',
        }[unit[2].toLowerCase()]
      )
    if (Object.prototype.hasOwnProperty.call(dictionary, text) && dictionary[text] !== text) return dictionary[text]
    const exact = folded.get(text.toLocaleLowerCase('en'))
    if (exact !== undefined && exact.toLocaleLowerCase('en') !== text.toLocaleLowerCase('en')) return exact
    const level = text.match(/^L(?:v\.?)?\s*([0-9०-९]+)(?:\s+(.+))?$/iu)
    if (level) return 'स्तर ' + level[1] + (level[2] ? ' ' + lookup(level[2], depth + 1) : '')
    if (depth < 2 && text.length < 1800) {
      // Prefer complete dictionary phrases inside decorative emoji/punctuation
      // over broad templates such as "{n} of {total}".
      const edged = text.match(/^([^\p{L}]*)([\s\S]*?)([^\p{L}]*?)$/u)
      if (edged && edged[2] && edged[2] !== text) {
        const direct = dictionary[edged[2]] ?? folded.get(edged[2].toLocaleLowerCase('en'))
        if (direct !== undefined && direct !== edged[2]) return edged[1] + direct + edged[3]
      }
      const matchTemplate = (pattern) => {
        if (pattern.countOnly && !/^[0-9०-९,.+%\s/-]+\s+(?:out of|of)\s+[0-9०-९,.+%\s/-]+$/iu.test(text)) return
        if (pattern.choiceOnly && (text.length > 100 || /[.!?।]/u.test(text))) return
        const match = text.match(pattern.re)
        if (!match) return
        const params = {}
        pattern.keys.forEach((key, i) => {
          const value = match[i + 1]
          params[key] = pattern.suffixKeys.get(key)?.test(value) ? '' : lookup(value, depth + 1)
        })
        return interpolate(pattern.translation, params)
      }
      // A complete instructional template (including its colon) outranks
      // partial label composition. Short open-ended templates run last.
      for (const pattern of patterns) {
        if (pattern.weight < 12) continue
        const result = matchTemplate(pattern)
        if (result !== undefined) return result
      }
      const parts = text.split(/(\s+[·•|—–]\s+|\n|:\s+)/)
      if (parts.length > 1) {
        let changed = false
        const translated = parts
          .map((part, i) => {
            if (i % 2) return part
            const next = lookup(part, depth + 1)
            changed ||= next !== part
            return next
          })
          .join('')
        if (changed) return translated
      }
      for (const pattern of patterns) {
        if (pattern.weight >= 12) continue
        const result = matchTemplate(pattern)
        if (result !== undefined) return result
      }
      // Counters and short labels are composed from already-translated phrases.
      if (edged && edged[2] && edged[2] !== text) {
        const inner = lookup(edged[2], depth + 1)
        if (inner !== edged[2]) return edged[1] + inner + edged[3]
      }
    }
    return text
  }
  function t(value, params) {
    const source = String(value == null ? '' : value)
    if (current !== 'hi') return interpolate(source, params)
    const key = normal(source)
    if (!key || !/[A-Za-z]/.test(key)) return interpolate(source, params)
    let result = cache.get(key)
    if (result === undefined) {
      result = lookup(key, 0)
      if (cache.size > 12000) cache.delete(cache.keys().next().value)
      cache.set(key, result)
      if (result === key && missing.size < 2000 && key.length > 2) missing.set(key, (missing.get(key) || 0) + 1)
    }
    const leading = source.match(/^\s*/u)[0],
      trailing = source.match(/\s*$/u)[0]
    return interpolate(leading + result + trailing, params)
  }
  async function loadDictionary() {
    if (dictionaryLoaded) return
    if (dictionaryPromise) return dictionaryPromise
    // hi.json + templates.json are the same catalogue as the original
    // hi-bundle.js (tools/merge-i18n-catalogue.py), fetched only when needed.
    dictionaryPromise = (async () => {
      const responses = await Promise.all([fetch(LOCALES + 'hi.json'), fetch(LOCALES + 'templates.json')])
      if (!responses[0].ok) throw new Error('Hindi catalogue unavailable')
      const data = await responses[0].json()
      if (!data || Array.isArray(data) || typeof data !== 'object') throw new Error('Invalid Hindi catalogue')
      dictionary = Object.assign(Object.create(null), data, core)
      const templates = responses[1].ok ? await responses[1].json() : []
      compilePatterns(templates)
      indexDictionary()
      dictionaryLoaded = true
      window.dispatchEvent(new CustomEvent('mirava:catalogue'))
    })().catch((error) => {
      dictionaryPromise = null
      throw error
    })
    return dictionaryPromise
  }
  function skipped(node) {
    const element = node.nodeType === 1 ? node : node.parentElement
    return !element || !!element.closest(skipSelector) || (node.nodeType === 3 && !!element.closest('textarea'))
  }
  /** Kept for API compatibility: adds ?lang= to same-origin legacy .html links. */
  function languageURL(value) {
    const source = String(value || '')
    if (!source || source.startsWith('#') || /^(?:mailto|tel|javascript|data|blob):/i.test(source)) return source
    try {
      const target = new URL(source, document.baseURI),
        here = new URL(document.baseURI)
      if (target.origin !== here.origin || target.protocol !== here.protocol || !/\.html$/i.test(target.pathname)) return source
      target.searchParams.set('lang', current)
      if (/^[a-z][a-z\d+.-]*:/i.test(source) || source.startsWith('//')) return target.href
      return source.split(/[?#]/, 1)[0] + target.search + target.hash
    } catch {
      return source
    }
  }
  function textNode(node) {
    if (skipped(node) || !node.data.trim()) return
    const old = sourceNodes.get(node)
    const source = old && node.data === old.output ? old.source : node.data
    const output = current === 'hi' ? t(source) : source
    sourceNodes.set(node, { source, output })
    if (current === 'hi' && /[ऀ-ॿ]/.test(output)) node.parentElement?.setAttribute('data-mirava-translated', 'true')
    if (node.data !== output) node.data = output
  }
  function elementNode(element) {
    if (skipped(element)) return
    if (element.tagName === 'OPTION' && !element.hasAttribute('value')) element.setAttribute('value', element.textContent)
    const attrs = sourceAttributes.get(element) || {}
    for (const name of attributeNames) {
      const value = element.getAttribute(name)
      if (!value) continue
      const old = attrs[name],
        source = old && value === old.output ? old.source : value
      const output = current === 'hi' ? t(source) : source
      attrs[name] = { source, output }
      if (output !== value) element.setAttribute(name, output)
    }
    if (element.tagName === 'INPUT' && /^(button|submit|reset)$/i.test(element.type)) {
      const old = attrs.value,
        source = old && element.value === old.output ? old.source : element.value
      const output = current === 'hi' ? t(source) : source
      attrs.value = { source, output }
      if (element.value !== output) element.value = output
    }
    sourceAttributes.set(element, attrs)
  }
  const observerOptions = { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: attributeNames }
  function translate(root) {
    if (!root) return
    // Synchronous HUD/panel translation must not discard another component's
    // pending toast or dialog mutations when the observer is paused.
    collectMutations(observer?.takeRecords?.() || [], root)
    observer?.disconnect()
    try {
      if (root.nodeType === 3) textNode(root)
      else {
        if (root.nodeType === 1) elementNode(root)
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
          acceptNode(node) {
            return skipped(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
          },
        })
        let node
        while ((node = walker.nextNode())) {
          if (node.nodeType === 3) textNode(node)
          else elementNode(node)
        }
      }
    } finally {
      if (document.documentElement && observer) observer.observe(document.documentElement, observerOptions)
    }
  }
  function flush() {
    const roots = [...dirty]
    dirty.clear()
    // Skip roots nested inside another dirty root: one walk covers them.
    roots.forEach((root) => {
      if (root.isConnected && !roots.some((other) => other !== root && other.contains?.(root))) translate(root)
    })
  }
  function queue(node) {
    if (!node || skipped(node)) return
    dirty.add(node)
  }
  function collectMutations(records, coveredRoot) {
    if (current !== 'hi') return
    records.forEach((record) => {
      const nodes = record.type === 'childList' ? record.addedNodes : [record.target]
      nodes.forEach((node) => {
        if (node !== coveredRoot && !coveredRoot?.contains?.(node)) queue(node)
      })
    })
  }
  /* Status messages (the original showed them in its floating language bar). */
  function announce(message) {
    if (!document.body) return
    if (!statusEl || !statusEl.isConnected) {
      statusEl = document.createElement('div')
      statusEl.className = 'mirava-tools-status mirava-i18n-status'
      statusEl.setAttribute('role', 'status')
      statusEl.setAttribute('aria-live', 'polite')
      statusEl.setAttribute('translate', 'no')
      document.body.append(statusEl)
    }
    statusEl.textContent = t(message)
    clearTimeout(statusTimer)
    statusTimer = setTimeout(() => {
      statusEl.textContent = ''
    }, 6500)
  }
  function writePreference(code) {
    try {
      localStorage.setItem(STORAGE_KEY, code)
    } catch {
      /* ignore */
    }
  }
  const profileError = (message, status) => Object.assign(new Error(message), status ? { status } : {})
  /**
   * Same contract as the original MiravaI18n.updateProfile(fields): camelCase
   * fields, writes serialised in call order, rejected if the account changes.
   */
  function updateProfile(fields) {
    const identity = account?.id ?? null
    if (!identity || !profileWriter) return Promise.reject(profileError('Sign in to view or edit your profile.', 401))
    const keys = fields && typeof fields === 'object' && !Array.isArray(fields) ? Object.keys(fields) : []
    if (!keys.length) return Promise.reject(profileError('Enter at least one profile field to update.', 400))
    if (keys.some((key) => !profileFields.has(key)))
      return Promise.reject(profileError('Only displayName, bio, location, preferredLanguage and avatar can be updated.', 400))
    if (keys.some((key) => typeof fields[key] !== 'string')) return Promise.reject(profileError('Profile fields must be text.', 400))
    const snapshot = { ...fields }
    const run = profileChain.then(async () => {
      if ((account?.id ?? null) !== identity) throw profileError('Your account changed. Reload your profile before saving.', 401)
      const result = await profileWriter(snapshot)
      window.dispatchEvent(new CustomEvent('mirava:profile', { detail: { profile: result, requestFields: snapshot } }))
      return result
    })
    profileChain = run.catch(() => {})
    return run
  }
  async function savePreference(code) {
    if (!account || !profileWriter) return
    const identity = account.id
    try {
      await updateProfile({ preferredLanguage: code })
      if (current === code && account?.id === identity) {
        account.preferredLanguage = code
        announce('Your language preference is saved.')
      }
    } catch {
      if (current === code && account?.id === identity)
        announce('Language changed here. Your profile preference could not be saved; retry from your profile.')
    }
  }
  async function setLanguage(code, options) {
    if (code !== 'en' && code !== 'hi') return false
    options = options || {}
    const version = ++requestVersion
    if (options.source !== 'account' && options.source !== 'initial') userChoice = true
    document.documentElement.toggleAttribute('data-mirava-language-busy', true)
    try {
      if (code === 'hi') await Promise.all([loadDictionary(), fontReady()])
      if (version !== requestVersion) return false
      const changed = current !== code
      current = code
      document.documentElement.lang = code
      document.documentElement.dataset.miravaLanguage = code
      window.MIRAVA_LANGUAGE.code = code
      window.MIRAVA_LANGUAGE.source = options.source || 'user'
      if (options.persist !== false) writePreference(code)
      cache.clear()
      missing.clear()
      translate(document.documentElement)
      // Keep a shareable explicit language URL in sync without a navigation.
      try {
        const url = new URL(location.href)
        if (url.searchParams.has('lang')) {
          url.searchParams.set('lang', code)
          history.replaceState(history.state, '', url)
        }
      } catch {
        /* ignore */
      }
      window.dispatchEvent(
        new CustomEvent('mirava:languagechange', { detail: { language: code, source: options.source || 'user', changed } }),
      )
      if (options.syncProfile !== false && options.source !== 'account' && options.source !== 'storage' && options.source !== 'initial') {
        if (account) {
          if (account.preferredLanguage !== code) void savePreference(code)
        } else announce('Language changed on this device. Sign in to save it to your profile.')
      }
      return true
    } catch {
      announce('Hindi text could not load. Please check your connection and select Hindi again.')
      return false
    } finally {
      if (version === requestVersion) document.documentElement.removeAttribute('data-mirava-language-busy')
    }
  }
  /**
   * Called by AuthProvider whenever the signed-in profile is known (or on sign
   * out with `null`). Mirrors the original handleAccount(): on a new sign-in,
   * an explicit choice made in this browser wins and is saved to the profile;
   * otherwise the profile's preferred language is applied.
   */
  function connectAccount(user, writer) {
    if (writer !== undefined) profileWriter = writer
    if (!user || user.id == null) {
      account = null
      accountSeen = null
      return
    }
    const id = String(user.id)
    const preferred = user.preferredLanguage === 'hi' || user.preferredLanguage === 'en' ? user.preferredLanguage : null
    account = { id, preferredLanguage: preferred }
    if (accountSeen === id) return
    accountSeen = id
    if (userChoice) {
      if (preferred !== current) void savePreference(current)
    } else if (preferred) void setLanguage(preferred, { source: 'account', syncProfile: false })
  }
  function validMessage(element) {
    const validity = element.validity
    if (validity.valueMissing) return element.tagName === 'SELECT' ? 'Please select an option.' : 'Please fill out this field.'
    if (validity.typeMismatch && element.type === 'email') return 'Please enter a valid email address.'
    if (validity.patternMismatch) return 'Please use the requested format.'
    if (validity.tooShort) return current === 'hi' ? 'कम से कम ' + element.minLength + ' अक्षर दर्ज करें।' : 'Use at least ' + element.minLength + ' characters.'
    if (validity.tooLong) return current === 'hi' ? 'अधिकतम ' + element.maxLength + ' अक्षर दर्ज करें।' : 'Use at most ' + element.maxLength + ' characters.'
    if (validity.rangeUnderflow) return current === 'hi' ? 'कम से कम ' + element.min + ' दर्ज करें।' : 'Enter at least ' + element.min + '.'
    if (validity.rangeOverflow) return current === 'hi' ? 'अधिकतम ' + element.max + ' दर्ज करें।' : 'Enter at most ' + element.max + '.'
    return 'Please enter a valid value.'
  }
  const invalidFields = new WeakSet()
  document.addEventListener(
    'invalid',
    (event) => {
      const field = event.target
      if (current !== 'hi' || field.closest('[data-mirava-localized="true"]') || !field.setCustomValidity || field.validity.customError) return
      field.setCustomValidity(t(validMessage(field)))
      invalidFields.add(field)
    },
    true,
  )
  ;['input', 'change'].forEach((type) =>
    document.addEventListener(
      type,
      (event) => {
        if (invalidFields.has(event.target)) {
          event.target.setCustomValidity('')
          invalidFields.delete(event.target)
        }
      },
      true,
    ),
  )
  window.addEventListener('mirava:languagechange', () =>
    document.querySelectorAll('input,select,textarea').forEach((field) => {
      if (invalidFields.has(field)) {
        field.setCustomValidity('')
        invalidFields.delete(field)
      }
    }),
  )
  const canvasRaw = (canvas) =>
    canvas?.dataset?.miravaRaw === 'true' ||
    canvas?.hasAttribute?.('data-i18n-ignore') ||
    canvas?.hasAttribute?.('data-i18n-skip') ||
    canvas?.getAttribute?.('translate') === 'no'
  // Canvas HUD, maps, charts and postcards use the same cached catalogue as DOM text.
  const nativeCanvas = {}
  if (window.CanvasRenderingContext2D)
    ['fillText', 'strokeText', 'measureText'].forEach((method) => {
      const original = CanvasRenderingContext2D.prototype[method]
      nativeCanvas[method] = original
      CanvasRenderingContext2D.prototype[method] = function (value, ...args) {
        if (current !== 'hi' || canvasRaw(this.canvas)) return original.call(this, value, ...args)
        const text = t(value),
          font = this.font
        if (/[ऀ-ॿ]/.test(text) && !font.includes('Mirava Devanagari'))
          this.font = font.replace(/(\d+(?:\.\d+)?px)(?:\/[^ ]+)?\s+/, '$1 "Mirava Devanagari", ')
        try {
          return original.call(this, text, ...args)
        } finally {
          if (this.font !== font) this.font = font
        }
      }
    })
  function drawLiteral(context, value, ...args) {
    const text = String(value),
      font = context.font
    if (/[ऀ-ॿ]/.test(text) && !font.includes('Mirava Devanagari'))
      context.font = font.replace(/(\d+(?:\.\d+)?px)(?:\/[^ ]+)?\s+/, '$1 "Mirava Devanagari", ')
    try {
      return nativeCanvas.fillText.call(context, text, ...args)
    } finally {
      context.font = font
    }
  }
  ;['alert', 'confirm', 'prompt'].forEach((method) => {
    const original = window[method]
    window[method] = function (message, ...args) {
      return original.call(window, t(message), ...args)
    }
  })
  function sourceOf(node) {
    const old = sourceNodes.get(node)
    return old && node.data === old.output ? old.source : node.data
  }
  function originalText(element) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
    let node,
      output = ''
    while ((node = walker.nextNode())) output += sourceOf(node)
    return output
  }
  function originalHTML(element) {
    const copy = element.cloneNode(true)
    const sourceWalker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT)
    const copyWalker = document.createTreeWalker(copy, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT)
    let source, target
    while ((source = sourceWalker.nextNode()) && (target = copyWalker.nextNode())) {
      if (source.nodeType === 3) target.data = sourceOf(source)
      else {
        const attrs = sourceAttributes.get(source)
        if (attrs)
          for (const [name, record] of Object.entries(attrs)) {
            if (source.getAttribute(name) === record.output) target.setAttribute(name, record.source)
          }
      }
    }
    return copy.innerHTML
  }
  function translateHTML(html) {
    const template = document.createElement('template')
    template.innerHTML = html
    const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT)
    let node
    while ((node = walker.nextNode())) {
      if (node.nodeType === 3 && !node.parentElement?.closest('script,style,textarea,[translate="no"],[data-i18n-skip]')) node.data = t(node.data)
      else if (node.nodeType === 1)
        attributeNames.forEach((name) => {
          if (node.hasAttribute(name)) node.setAttribute(name, t(node.getAttribute(name)))
        })
    }
    return template.innerHTML
  }
  async function fontReady() {
    if (!document.fonts) return true
    try {
      await Promise.all([
        document.fonts.load('400 16px "Mirava Devanagari"', 'नमस्ते'),
        document.fonts.load('700 16px "Mirava Devanagari"', 'नमस्ते'),
      ])
    } catch {
      /* system fallback font is fine */
    }
    return true
  }
  window.MiravaI18n = {
    language: () => current,
    languageRevision: () => requestVersion,
    locale: () => (current === 'hi' ? 'hi-IN' : 'en-IN'),
    t,
    setLanguage,
    translate,
    translateHTML,
    originalText,
    originalHTML,
    url: languageURL,
    fontReady,
    announce,
    drawLiteral,
    updateProfile,
    connectAccount,
    number: (value, options) => new Intl.NumberFormat(current === 'hi' ? 'hi-IN' : 'en-IN', options).format(value),
    date: (value, options) => new Intl.DateTimeFormat(current === 'hi' ? 'hi-IN' : 'en-IN', options).format(new Date(value)),
    matches: (value, query) => {
      const values =
        value && typeof value === 'object'
          ? Object.values(value)
              .flat(Infinity)
              .filter((v) => typeof v === 'string')
          : [String(value ?? '')]
      const q = normal(query).toLocaleLowerCase()
      return values.some((v) => normal(v).toLocaleLowerCase().includes(q) || normal(t(v)).toLocaleLowerCase().includes(q))
    },
    coverage: () => ({
      language: current,
      dictionaryLoaded,
      entries: Object.keys(dictionary).length,
      templates: patterns.length,
      missing: [...missing.keys()],
    }),
  }
  window.MiravaI18n.ready = current === 'hi' ? loadDictionary().then(() => true, () => false) : Promise.resolve(true)
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY && (event.newValue === 'en' || event.newValue === 'hi'))
      setLanguage(event.newValue, { source: 'storage', syncProfile: false })
  })
  function start() {
    // Translate synchronously inside the observer callback (a microtask after
    // React commits, before paint) so Hindi pages never flash English.
    observer = new MutationObserver((records) => {
      collectMutations(records)
      if (dirty.size) flush()
    })
    translate(document.documentElement)
    if (current === 'hi') window.MiravaI18n.ready.then((ok) => ok && setLanguage(current, { source: 'initial', syncProfile: false }))
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true })
  else start()
})()
