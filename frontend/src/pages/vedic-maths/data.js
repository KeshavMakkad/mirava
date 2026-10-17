// Data for Mirava Gaṇita (from legacy/vedicmaths.html): Lab methods, the 16 sutras,
// the heritage timeline, and the Ancient Heist stages and badges.

export const METHODS = {
    urdhva: { no: 3, name: 'Ūrdhva-Tiryagbhyām', dev: 'ऊर्ध्वतिर्यग्भ्याम्', short: 'Vertically & crosswise', use: 'Any multiplication', desc: 'The general method: multiply any two numbers column by column, combining vertical and crosswise digit products, and write the answer in a single line.', fields: [['First number', '23'], ['Second number', '41']], op: '×', ex: [['23', '41'], ['123', '456'], ['3047', '58'], ['98765', '4321']] },
    nikhilam: { no: 2, name: 'Nikhilam Navataścaramaṁ Daśataḥ', dev: 'निखिलं नवतश्चरमं दशतः', short: 'All from 9, last from 10', use: 'Numbers near 10, 100, 1000…', desc: 'When both numbers sit near a power of ten, work with how far each is from that base: cross-add for the left part, multiply the small deviations for the right part.', fields: [['First number', '97'], ['Second number', '96']], op: '×', ex: [['97', '96'], ['104', '93'], ['998', '1007'], ['88', '112']] },
    yavadunam: { no: 10, name: 'Yāvadūnam', dev: 'यावदूनम्', short: 'Whatever the deficiency', use: 'Squares near a base', desc: 'To square a number near a base, lessen it by its deficiency (or add its surplus), then append the square of that deficiency.', fields: [['Number to square', '96']], op: '²', ex: [['96'], ['103'], ['994'], ['1012']] },
    ekadhika: { no: 1, name: 'Ekādhikena Pūrveṇa', dev: 'एकाधिकेन पूर्वेण', short: 'By one more than the previous', use: 'Squares ending in 5 & pairs like 43 × 47', desc: 'For numbers with the same leading part whose last digits add to 10: multiply the leading part by one more than itself, then append the product of the last digits.', fields: [['First number', '35'], ['Second number', '35']], op: '×', ex: [['35', '35'], ['43', '47'], ['125', '125'], ['92', '98']] },
    ekanyunena: { no: 14, name: 'Ekanyūnena Pūrveṇa', dev: 'एकन्यूनेन पूर्वेण', short: 'By one less than the previous', use: 'Multiplying by 9, 99, 999…', desc: 'To multiply by a row of nines: the left part is one less than the number, the right part is that number subtracted from the nines.', fields: [['Number', '637'], ['Nines', '999']], op: '×', ex: [['637', '999'], ['48', '99'], ['7', '9'], ['12345', '999']] },
    cuberoot: { no: '◎', name: 'Vilokanam · cube roots', dev: 'विलोकनम्', short: 'Cube roots by observation', use: 'Cube roots of perfect cubes', desc: 'A perfect cube\'s last digit fixes the root\'s last digit; the digits left after striking off three give the rest. Works for any perfect cube up to 999³.', fields: [['Perfect cube', '175616']], op: '∛', ex: [['175616'], ['12167'], ['636056'], ['970299']] },
    sqroot: { no: '◎', name: 'Vilokanam · square roots', dev: 'विलोकनम्', short: 'Square roots by observation', use: 'Square roots of perfect squares', desc: 'The last digit narrows the root to two choices; an Ekādhika square of the middle number decides which. Works for perfect squares up to 99,999².', fields: [['Perfect square', '7744']], op: '√', ex: [['7744'], ['3249'], ['15129'], ['998001']] }
  };
export const ORDER = ['urdhva', 'nikhilam', 'yavadunam', 'ekadhika', 'ekanyunena', 'cuberoot', 'sqroot'];
export const SUTRAS = [
    [1, 'एकाधिकेन पूर्वेण', 'Ekādhikena Pūrveṇa', 'By one more than the previous one', 'arith', '35² = 3×4 | 5×5 = 12|25 = 1225', 'ekadhika'],
    [2, 'निखिलं नवतश्चरमं दशतः', 'Nikhilam Navataścaramaṁ Daśataḥ', 'All from nine and the last from ten', 'arith', '97 × 96 → (−3)(−4): 93 | 12 = 9312', 'nikhilam'],
    [3, 'ऊर्ध्वतिर्यग्भ्याम्', 'Ūrdhva-Tiryagbhyām', 'Vertically and crosswise', 'arith', '23 × 41 → 2×4 | 2×1+3×4 | 3×1 = 8|14|3 = 943', 'urdhva'],
    [4, 'परावर्त्य योजयेत्', 'Parāvartya Yojayet', 'Transpose and apply', 'alg', '2x + 7 = x + 9 → x = (9−7)/(2−1) = 2', null],
    [5, 'शून्यं साम्यसमुच्चये', 'Śūnyaṁ Sāmyasamuccaye', 'When the sum is the same, that sum is zero', 'alg', '(x+7)(x+9) = (x+3)(x+21): 63 = 63, so x = 0', null],
    [6, 'आनुरूप्ये शून्यमन्यत्', '(Ānurūpye) Śūnyamanyat', 'If one is in ratio, the other is zero', 'alg', '6x+7y = 8, 19x+14y = 16: 7:14 = 8:16, so x = 0, y = 8/7', null],
    [7, 'सङ्कलनव्यवकलनाभ्याम्', 'Saṅkalana-vyavakalanābhyām', 'By addition and by subtraction', 'alg', '45x−23y = 113, 23x−45y = 91 → x−y = 3, x+y = 1 → x = 2, y = −1', null],
    [8, 'पूरणापूरणाभ्याम्', 'Pūraṇāpūraṇābhyām', 'By completion or non-completion', 'alg', 'x² + 6x = 16 → (x+3)² = 25 → x = 2 or −8', null],
    [9, 'चलनकलनाभ्याम्', 'Calana-Kalanābhyām', 'By differences and similarities (calculus)', 'alg', 'x² − 5x + 6 = 0: 2x − 5 = ±√(25−24) = ±1 → x = 3 or 2', null],
    [10, 'यावदूनम्', 'Yāvadūnam', 'Whatever the extent of its deficiency', 'arith', '96² = (96−4) | 4² = 92|16 = 9216', 'yavadunam'],
    [11, 'व्यष्टिसमष्टिः', 'Vyaṣṭisamaṣṭiḥ', 'Part and whole', 'alg', '(x+7)⁴ + (x+5)⁴ = 706: let y = x+6 → y = ±4 → x = −2 or −10', null],
    [12, 'शेषाण्यङ्केन चरमेण', 'Śeṣāṇyaṅkena Caramena', 'The remainders by the last digit', 'arith', '1/7: remainders 3,2,6,4,5,1 × 7 → last digits 1,4,2,8,5,7 = 0.142857…', null],
    [13, 'सोपान्त्यद्वयमन्त्यम्', 'Sopāntyadvayamantyam', 'The ultimate and twice the penultimate', 'alg', '1/((x+2)(x+3)) + 1/((x+2)(x+4)) = 1/((x+2)(x+5)) + 1/((x+3)(x+4)) → (x+5) + 2(x+4) = 0 → x = −13/3', null],
    [14, 'एकन्यूनेन पूर्वेण', 'Ekanyūnena Pūrveṇa', 'By one less than the previous one', 'arith', '637 × 999 = 636 | 363 = 636363', 'ekanyunena'],
    [15, 'गुणितसमुच्चयः', 'Guṇitasamuccayaḥ', 'The product of the sums equals the sum of the product', 'arith', '(x+3)(x+4) = x²+7x+12: at x = 1, 4 × 5 = 1+7+12 = 20. The basis of the digit-sum check', 'check'],
    [16, 'गुणकसमुच्चयः', 'Guṇakasamuccayaḥ', 'The factors of the sum equal the sum of the factors', 'alg', 'x²+7x+12 = (x+3)(x+4); its derivative 2x+7 = (x+3) + (x+4)', null]
  ];
export const TIMELINE = [
    ['c. 800–500 BCE', 'Baudhāyana Śulbasūtra', 'Rules for building fire altars with rope and pegs. It states the relation between a rectangle\'s sides and its diagonal (what we now call Pythagoras\' theorem) and approximates √2 as 1 + 1/3 + 1/(3·4) − 1/(3·4·34) ≈ 1.414216.', 'Geometry in the service of ritual architecture.'],
    ['c. 3rd–2nd century BCE', 'Piṅgala · Chandaḥśāstra', 'A treatise on poetic metre that lists patterns of short and long syllables with a method that works like binary numbers. Later commentators drew the number triangle now called Pascal\'s (meru-prastāra).', 'Combinatorics born from poetry.'],
    ['3rd–10th century CE (debated)', 'The Bakhshali manuscript', 'A birch-bark arithmetic text found in 1881 near Peshawar and now in Oxford\'s Bodleian Library. It uses a dot as a placeholder for zero; radiocarbon dates for its leaves range across several centuries.', 'An early written zero.'],
    ['499 CE', 'Āryabhaṭa · Āryabhaṭīya', 'Place-value arithmetic, square and cube roots, sine tables and π ≈ 62832/20000 = 3.1416, all in compact Sanskrit verse.', 'The method behind the roots trick on this page.'],
    ['628 CE', 'Brahmagupta · Brāhmasphuṭasiddhānta', 'The earliest known rules for calculating with zero and negative numbers as numbers in their own right, plus methods for quadratic equations.', 'Zero becomes a number.'],
    ['1150 CE', 'Bhāskara II · Līlāvatī', 'A much-loved arithmetic textbook in verse, full of puzzles addressed to a girl named Līlāvatī. It was taught across India for centuries.', 'Learning maths through puzzles, like the challenge above.'],
    ['c. 1340–1425', 'Mādhava of Saṅgamagrāma', 'Founder of the Kerala school. He found infinite series for π, sine and cosine, centuries before they appeared in Europe.', 'The roots of calculus in India.'],
    ['1724–1734', 'Jantar Mantar observatories', 'Sawai Jai Singh II built giant masonry instruments in Delhi, Jaipur and other cities. Jaipur\'s Samrat Yantra, about 27 m tall, is a sundial; the Jaipur observatory is a UNESCO World Heritage Site.', 'Maths you can walk through.', true],
    ['1887–1920', 'Srinivasa Ramanujan', 'A largely self-taught genius from Erode and Kumbakonam who left nearly 3,900 results in number theory, series and partitions, including the famous "taxicab number" 1729.', 'Mental brilliance with numbers.']
  ];

/* ---------- STAGE DEFINITIONS (unchanged from Stage 8) ---------- */
export const STAGES = [
  {
    id: "fatehpur-gates",
    title: "🕌 The Gates of Fatehpur Sikri",
    subtitle: "Beyond the great gateway, the guards listen for every whisper…",
    historicalRole: "Historical role: Fatehpur Sikri was a city developed under Akbar. Its grand gateway is associated with his reign.",
    technique: "Vedic Technique: Round up, then subtract the excess (e.g. 47 + 38 → 47 + 40 − 2).",
    backgroundUrl: "https://images.unsplash.com/photo-1585136652194-1a8c9a1a4a4a?auto=format&fit=crop&w=1200&q=60",
    objects: [
      { id: "gateway-inscription", label: "🪧 Gateway Inscription", title: "Discover: The Grand Gateway",
        means: "A monumental gateway marking the entrance to the imperial complex at Fatehpur Sikri.",
        matters: "It is associated with Akbar's reign and the architecture of the period." },
      { id: "mughal-coin-1", label: "🪙 Mughal Coin", title: "Discover: Mughal Coinage",
        means: "Coins circulated in the Mughal empire were often inscribed with royal titles and mint marks.",
        matters: "Coinage reflects how administration and trade were organised during the period." }
    ],
    lesson: {
      name: "Mental Addition by Rounding",
      explain: "When a number is close to a round number (like 40, 50, or 100), round it up first, then adjust at the end.",
      example: "47 + 38\n→ 47 + 40 = 87  (rounded 38 up to 40)\n→ 87 − 2 = 85    (adjust: we added 2 too many)\nAnswer: 85",
      compare: "Conventional: 47 + 38 = 47 + 30 + 8 = 77 + 8 = 85. Same result, but rounding is often faster in your head.",
      practice: { q: "Try it: 68 + 27", a: 95 }
    },
    pool: [
      { q: "Gate Seal: 47 + 38", a: 85 },
      { q: "Gate Seal: 92 − 57", a: 35 },
      { q: "Gate Seal: 14 × 6", a: 84 },
      { q: "Gate Seal: 96 ÷ 8", a: 12 },
      { q: "Gate Seal: 25 + 19 − 8", a: 36 },
      { q: "Gate Seal: 68 + 27", a: 95 },
      { q: "Gate Seal: 54 + 39", a: 93 },
      { q: "Gate Seal: 83 − 48", a: 35 },
      { q: "Gate Seal: 76 + 18", a: 94 },
      { q: "Gate Seal: 44 + 29", a: 73 }
    ]
  },
  {
    id: "diwan-i-aam",
    title: "🏛️ The Diwan-i-Aam",
    subtitle: "The Hall of Public Audience. Petitions and seals carry the next lock.",
    historicalRole: "Historical role: The Diwan-i-Aam (Hall of Public Audience) was associated with the emperor's public audiences and the receiving of petitions.",
    technique: "Vedic Technique: Nikhilam — subtract each from 100, cross-subtract, then multiply the deficits.",
    backgroundUrl: "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1200&q=60",
    objects: [
      { id: "petition-scroll", label: "📜 Petition Scroll", title: "Discover: The Diwan-i-Aam",
        means: "The Hall of Public Audience, where the emperor received petitioners.",
        matters: "It was associated with the emperor's public audiences and the presentation of petitions." },
      { id: "royal-seal", label: "🔖 Royal Seal", title: "Discover: Mughal Seals",
        means: "Seals authenticated royal documents and administrative orders.",
        matters: "They are a window into how records were validated at court." }
    ],
    lesson: {
      name: "Nikhilam Multiplication (near 100)",
      explain: "For numbers close to 100, write each as (100 − deficit). Then subtract the other deficit from the first number to get the first part. Multiply the deficits for the last part (pad to two digits).",
      example: "98 × 97\n→ Deficits: 100−98 = 2 and 100−97 = 3\n→ Cross-subtract: 98 − 3 = 95\n→ Multiply deficits: 2 × 3 = 6  → write as 06\n→ Join: 95 | 06  →  9506",
      compare: "Conventional: 98 × 97 = 98 × (100 − 3) = 9800 − 294 = 9506. Same answer, but Nikhilam avoids carrying large numbers.",
      practice: { q: "Try it: 96 × 95", a: 9120 }
    },
    pool: [
      { q: "Audience seal: 98 × 97", a: 9506 },
      { q: "Audience seal: 96 × 95", a: 9120 },
      { q: "Audience seal: 99 × 94", a: 9306 },
      { q: "Audience seal: 97 × 93", a: 9021 },
      { q: "Audience seal: 95 × 92", a: 8740 },
      { q: "Audience seal: 94 × 93", a: 8742 },
      { q: "Audience seal: 98 × 96", a: 9408 },
      { q: "Audience seal: 97 × 95", a: 9215 },
      { q: "Audience seal: 99 × 96", a: 9504 },
      { q: "Audience seal: 92 × 91", a: 8372 }
    ]
  },
  {
    id: "diwan-i-khas",
    title: "📜 The Diwan-i-Khas & Scholar's Library",
    subtitle: "Manuscripts, illustrated records, and the quiet of the royal library.",
    historicalRole: "Historical role: The Diwan-i-Khas (Hall of Private Audience) is associated with more exclusive court proceedings. Mughal courts supported a rich manuscript and scholarly culture.",
    technique: "Vedic Technique: For squares ending in 5 — tens × (tens + 1), then append 25.",
    backgroundUrl: "https://images.unsplash.com/photo-1615811361523-6bd03d7748e7?auto=format&fit=crop&w=1200&q=60",
    objects: [
      { id: "illustrated-manuscript", label: "📖 Illustrated Manuscript", title: "Discover: Mughal Manuscripts",
        means: "Illustrated manuscripts combined calligraphy and miniature painting at the Mughal court.",
        matters: "They show the importance of scholarship, art, and record-keeping in the period." },
      { id: "calligraphy-pen", label: "🖋️ Calligraphy Pen Case", title: "Discover: Calligraphy at Court",
        means: "Fine calligraphy was highly valued, and scribes held respected positions.",
        matters: "It reflects the cultural and intellectual life associated with Akbar's court." },
      { id: "bookbinding", label: "📚 Decorated Bookbinding", title: "Discover: Bookbinding Craft",
        means: "Mughal bookbindings used leather, gold tooling, and painted lacquer.",
        matters: "Craft traditions like these accompanied the spread of manuscript culture." }
    ],
    lesson: {
      name: "Squaring numbers ending in 5",
      explain: "If a number ends in 5, drop the 5, multiply the remaining number by the next integer, then append 25.",
      example: "45²\n→ Drop the 5: 4\n→ Multiply by next integer: 4 × 5 = 20\n→ Append 25: 2025\nAnswer: 2025",
      compare: "Conventional: 45 × 45 = 45 × (40 + 5) = 1800 + 225 = 2025. The trick is faster once practised.",
      practice: { q: "Try it: 65²", a: 4225 }
    },
    pool: [
      { q: "Library lock: 45²", a: 2025 },
      { q: "Library lock: 55²", a: 3025 },
      { q: "Library lock: 65²", a: 4225 },
      { q: "Library lock: 35²", a: 1225 },
      { q: "Library lock: 85²", a: 7225 },
      { q: "Library lock: 75²", a: 5625 },
      { q: "Library lock: 25²", a: 625 },
      { q: "Library lock: 95²", a: 9025 },
      { q: "Library lock: 15²", a: 225 },
      { q: "Library lock: 105²", a: 11025 }
    ]
  },
  {
    id: "ibadat-khana",
    title: "🕯️ The Ibadat Khana & Labyrinth of Knowledge",
    subtitle: "A house of discussion. Doors open only to those who reason clearly.",
    historicalRole: "Historical role: The Ibadat Khana at Fatehpur Sikri is associated with discussions Akbar organised involving representatives of different religious and intellectual traditions.",
    technique: "Reasoning Technique: Find the rule — ×, ÷, +, or − — then apply it to the last number.",
    backgroundUrl: "https://images.unsplash.com/photo-1609920658906-8223bd289001?auto=format&fit=crop&w=1200&q=60",
    objects: [
      { id: "jali-screen", label: "🪟 Jali Screen", title: "Discover: Jali Screens",
        means: "Carved stone lattice screens (jali) filtered light and air in Mughal buildings.",
        matters: "They are an example of the decorative architectural tradition of the period." },
      { id: "discussion-rug", label: "🧵 Discussion Rug", title: "Discover: The Ibadat Khana",
        means: "A house of discussion at Fatehpur Sikri associated with Akbar.",
        matters: "It is associated with discussions involving representatives of different religious and intellectual traditions." }
    ],
    lesson: {
      name: "Pattern Reasoning",
      explain: "Look at how each number changes to reach the next. The rule is usually the same each step (×2, ÷3, +7, −10…). Once you spot the rule, apply it to the last number.",
      example: "3, 6, 12, 24, …\n→ 3 × 2 = 6\n→ 6 × 2 = 12\n→ 12 × 2 = 24\n→ Rule: ×2 each step\n→ Next: 24 × 2 = 48",
      compare: "No single formula — the skill is spotting the rule. Try ×, ÷, +, − and combinations.",
      practice: { q: "Try it: 2, 6, 18, 54, …", a: 162 }
    },
    pool: [
      { q: "Pattern lock: 3, 6, 12, 24, …", a: 48 },
      { q: "Pattern lock: 81, 27, 9, 3, …", a: 1 },
      { q: "Missing number: 7, 14, __, 28, 35", a: 21 },
      { q: "Missing number: 100, 90, 81, 73, __", a: 66 },
      { q: "Reasoning lock: 1 + 2 + 3 + 4 + 5 + 6", a: 21 },
      { q: "Pattern lock: 2, 6, 18, 54, …", a: 162 },
      { q: "Pattern lock: 5, 10, 20, 40, …", a: 80 },
      { q: "Pattern lock: 1, 4, 9, 16, __", a: 25 },
      { q: "Pattern lock: 64, 32, 16, 8, …", a: 4 },
      { q: "Pattern lock: 1, 1, 2, 3, 5, 8, __", a: 13 }
    ]
  },
  {
    id: "imperial-treasury",
    title: "👑 The Imperial Treasury — Final Challenge",
    subtitle: "Three successive locks stand between you and the manuscript. Each tests a different technique.",
    historicalRole: "Historical note: The imperial treasury held the court's wealth and precious objects. In this game, it is the final chamber hiding the lost manuscript.",
    technique: "Boss Chamber: 3 successive locks — mental addition, Nikhilam, and squares ending in 5.",
    backgroundUrl: "https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&w=1200&q=60",
    isBoss: true,
    bossLockNames: [
      "Lock 1 — Mental addition",
      "Lock 2 — Nikhilam",
      "Lock 3 — Squares ending in 5"
    ],
    bossPools: [
      [
        { q: "Boss Lock 1: 68 + 27", a: 95 },
        { q: "Boss Lock 1: 54 + 39", a: 93 },
        { q: "Boss Lock 1: 76 + 18", a: 94 },
        { q: "Boss Lock 1: 44 + 29", a: 73 },
        { q: "Boss Lock 1: 83 − 48", a: 35 },
        { q: "Boss Lock 1: 92 − 57", a: 35 }
      ],
      [
        { q: "Boss Lock 2: 98 × 97", a: 9506 },
        { q: "Boss Lock 2: 96 × 95", a: 9120 },
        { q: "Boss Lock 2: 99 × 94", a: 9306 },
        { q: "Boss Lock 2: 97 × 95", a: 9215 },
        { q: "Boss Lock 2: 98 × 96", a: 9408 },
        { q: "Boss Lock 2: 99 × 96", a: 9504 }
      ],
      [
        { q: "Boss Lock 3: 45²", a: 2025 },
        { q: "Boss Lock 3: 55²", a: 3025 },
        { q: "Boss Lock 3: 65²", a: 4225 },
        { q: "Boss Lock 3: 35²", a: 1225 },
        { q: "Boss Lock 3: 85²", a: 7225 },
        { q: "Boss Lock 3: 75²", a: 5625 }
      ]
    ],
    objects: [
      { id: "treasure-chest", label: "🪙 Treasure Chest", title: "Discover: Royal Treasuries",
        means: "Royal treasuries held coins, jewels, textiles, and precious objects of the court.",
        matters: "They reflect how wealth and craft were central to the Mughal court." },
      { id: "royal-ledger", label: "📒 Royal Ledger", title: "Discover: Mansabdari Records",
        means: "Mughal administration used detailed records, including the mansabdari system of ranks and obligations.",
        matters: "It shows the sophistication of administration in the period." },
      { id: "lost-manuscript", label: "📜 Lost Manuscript", title: "Discover: The Lost Manuscript",
        means: "The manuscript in this game is a fictional creation, hidden for the adventure.",
        matters: "It is the game's treasure." }
    ],
    lesson: {
      name: "Boss Review — all three techniques",
      explain: "The final chamber asks you to clear three successive locks. Recognise each lock's shape before reaching for a method: rounding for sums, Nikhilam for numbers near 100, squaring-ending-in-5 for those squares.",
      example: "Lock 1: 68 + 27  → 68 + 30 − 3 = 95\nLock 2: 97 × 95  → deficits 3, 5 → 97−5 = 92, 3×5 = 15 → 9215\nLock 3: 45²  → 4 × 5 = 20, append 25 → 2025",
      compare: "Three locks, three different techniques — keep them separate in your head and you'll clear the chamber.",
      practice: { q: "Try it: 45²", a: 2025 }
    },
    pool: []
  }
];

/* ---------- BADGE DEFINITIONS ---------- */
export const BADGES = [
  { id: "first-blood",   icon: "🎯", name: "First Blood",   desc: "Answer your first question correctly." },
  { id: "scholar",       icon: "📖", name: "Scholar",       desc: "Open all five lesson panels." },
  { id: "historian",     icon: "📜", name: "Historian",     desc: "Collect every fact card." },
  { id: "perfectionist", icon: "⭐", name: "Perfectionist", desc: "Earn 3 stars on any level." },
  { id: "conqueror",     icon: "👑", name: "Conqueror",     desc: "Complete all five levels." },
  { id: "coin-collector",icon: "💰", name: "Coin Collector",desc: "Reach 150 coins." },
  { id: "mastermind",    icon: "🏆", name: "Mastermind",    desc: "Reach 500 XP." },
  { id: "survivor",      icon: "🛡️", name: "Survivor",      desc: "Complete a level with the alarm at or above 75%." }
];
