// Civilizations shown in the "Before the monuments" section.
export interface CivCard { label: string; headline: string; body: string; chip: string }
export interface Civ { tag: string; title: string; label: string; sub: string; tags: string[]; image: string; cards: CivCard[] }

export const CIVS: Record<string, Civ> = {
    'Harappa': {
      tag: 'INDUS VALLEY',
      title: 'Harappa',
      label: '2600–1900 BCE · PUNJAB · RAVI RIVER',
      sub: 'City planning, craft and trade at a scale that still surprises archaeologists.',
      tags: ['Grid streets', 'Standardised bricks', 'Craft economy', 'Long-distance trade'],
      image: 'https://miro.medium.com/1*uUphE-5CENnedhaPg_MAYQ.jpeg',
      cards: [
        { label: 'THE CITY',       headline: 'Grid-planned streets with carefully aligned blocks.',               body: 'Harappan cities were laid out on a grid. Streets ran at right angles, and neighbourhoods were organised around drainage and circulation.', chip: 'Urban planning' },
        { label: 'THE CRAFT',      headline: 'Standardised bricks, beads and seals that travelled far.',          body: 'Craft quarters produced beads, weights and seals with astonishing consistency — a sign of specialist skill and coordinated production.', chip: 'Craft economy' },
        { label: 'THE UNANSWERED', headline: 'A script we still cannot read.',                                    body: 'Thousands of short inscriptions survive on seals, but the Harappan script remains undeciphered — a language silently waiting.', chip: 'Undeciphered' },
        { label: 'WHY IT MATTERS', headline: 'One of the earliest urban systems in the world.',                   body: 'Harappa shows that sophisticated cities existed in South Asia more than 4,500 years ago — with planning, craft and trade at real scale.', chip: 'Living legacy' }
      ]
    },
    'Mohenjo-daro': {
      tag: 'INDUS VALLEY',
      title: 'Mohenjo-daro',
      label: 'c. 2500 BCE · SINDH · INDUS RIVER',
      sub: 'Water, streets and the Great Bath — an ancient story of urban infrastructure.',
      tags: ['Covered drains', 'Great Bath', 'Urban blocks', 'Sanitation'],
      image: 'https://visitsilkroad.org/wp-content/uploads/2021/04/Mohenjo-Daro-Archaeological-Site-Pakistan-2.jpg',
      cards: [
        { label: 'THE WATER',      headline: 'Covered drains and bathing spaces across an entire city.',         body: 'Mohenjo-daro had a sophisticated drainage network — an engineering story about public infrastructure, not just private homes.', chip: 'Sanitation' },
        { label: 'THE GREAT BATH', headline: 'A monumental structure at the heart of the city.',                 body: 'The Great Bath is one of the most striking surviving features of the site. Its purpose — ceremonial, ritual, communal — is still debated.', chip: 'Monumental' },
        { label: 'THE NAME',       headline: '“Mound of the Dead” — the modern name for an ancient city.',       body: 'Its original name is unknown. What we call it today is a reminder that some things about the Indus world still resist translation.', chip: 'Lost name' },
        { label: 'WHY IT MATTERS', headline: 'A window into early urban infrastructure.',                        body: 'The site makes clear that planning, water management and public architecture were central to South Asian urban life from the very beginning.', chip: 'Early engineering' }
      ]
    },
    'Dholavira': {
      tag: 'INDUS VALLEY',
      title: 'Dholavira',
      label: '3000–1500 BCE · KUTCH · GUJARAT',
      sub: 'Reservoirs, stone architecture and water in a dry island landscape.',
      tags: ['Reservoir network', 'Stone architecture', 'Zoned city', 'Water harvesting'],
      image: 'https://tripandtales.com/wp-content/uploads/2025/12/Citadel.webp',
      cards: [
        { label: 'THE RESERVOIRS', headline: 'A city that engineered around scarcity.',                          body: 'Dholavira sits on a dry island. Its inhabitants built elaborate reservoirs and channels — turning climate adaptation into urban design.', chip: 'Water harvesting' },
        { label: 'THE STONE',      headline: 'Monumental stone architecture — not just brick.',                  body: 'Unlike other Indus cities, Dholavira leans heavily on dressed stone. Walls, gateways and platforms show real architectural ambition.', chip: 'Stone craft' },
        { label: 'THE LAYOUT',     headline: 'Zoned neighbourhoods and a ceremonial core.',                      body: 'The city is divided into distinct areas — citadel, middle town, lower town — suggesting a clear social and civic order.', chip: 'Urban zoning' },
        { label: 'WHY IT MATTERS', headline: 'Climate adaptation as heritage.',                                   body: 'Dholavira shows that ancient urbanism wasn’t just about size — it was about solving hard environmental problems with intelligence.', chip: 'Climate legacy' }
      ]
    },
    'Mauryan Empire': {
      tag: 'CLASSICAL EMPIRE',
      title: 'Mauryan',
      label: '322–185 BCE · NORTHERN & CENTRAL SOUTH ASIA',
      sub: 'Empire, roads and Ashokan edicts — governance written into the landscape.',
      tags: ['Imperial roads', 'Ashokan edicts', 'Administrative centres', 'Trade routes'],
      image: 'https://dsqe6ephsjxi.cloudfront.net/cms/kingdoms_2023-1-5-12:45:32_img.jpg',
      cards: [
        { label: 'THE EMPIRE',     headline: 'A political network across an enormous territory.',                body: 'The Mauryan Empire connected a vast region through administration, roads and messaging — an early experiment in large-scale governance.', chip: 'Empire' },
        { label: 'THE EDICTS',     headline: 'Ashoka turns stone into public speech.',                           body: 'Rock and pillar inscriptions carried ideas about dhamma into public spaces. Governance became something people could read on the landscape.', chip: 'Public ethics' },
        { label: 'THE ROADS',      headline: 'Movement, trade and administration.',                              body: 'Roads and administrative centres linked the empire together — the circulatory system of a large classical state.', chip: 'Infrastructure' },
        { label: 'WHY IT MATTERS', headline: 'Primary sources speaking directly to us.',                          body: 'Ashoka’s inscriptions are among the most important surviving windows into ancient Indian governance and ethics.', chip: 'Primary source' }
      ]
    },
    'Gupta Age': {
      tag: 'CLASSICAL FLOWERING',
      title: 'Gupta Age',
      label: 'c. 320–550 CE · NORTHERN INDIA',
      sub: 'Mathematics, astronomy, literature and classical arts in a long building period.',
      tags: ['Aryabhata', 'Sanskrit literature', 'Temple arts', 'Astronomy'],
      image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRqKTWmuwauF8rlN58KfuheNmeg0bkuk5zzXwRppoB_8w&s=10',
      cards: [
        { label: 'THE SCHOLARS',   headline: 'Aryabhata and others reshape how people understand numbers and the sky.', body: 'Astronomy, mathematics and precise observation come together in a period that would later be called classical.', chip: 'Science' },
        { label: 'THE ATELIER',    headline: 'Sanskrit literature and sculpture flourish.',                       body: 'Courtly poetry, refined sculpture and temple traditions develop sophisticated new visual and literary languages.', chip: 'Art & literature' },
        { label: 'THE EXCHANGE',   headline: 'A longer story, not an isolated golden moment.',                    body: 'The Gupta period was part of a much longer exchange of ideas — not a sudden eruption of genius, but a steady building.', chip: 'Long view' },
        { label: 'WHY IT MATTERS', headline: 'Knowledge becomes heritage when generations keep building on it.',  body: 'The period connects scientific thought, language and artistic traditions into a single intellectual world.', chip: 'Knowledge heritage' }
      ]
    },
    'Sangam Tamilakam': {
      tag: 'CLASSICAL SOUTH',
      title: 'Sangam Tamilakam',
      label: 'c. 300 BCE–300 CE · SOUTHERN TAMILAKAM',
      sub: 'Poetry, ports and five landscapes — a classical world that still speaks to us.',
      tags: ['Sangam poetry', 'Maritime trade', 'Five tinai', 'Port cities'],
      image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQmom38sl52xh6DQPub03r5ZeNnEBr7Y5cURUpyrUTlPWZzJ5Cx_uxoBd8&s=10',
      cards: [
        { label: 'THE POETRY',     headline: 'A literary world organised around five landscapes.',                body: 'Sangam poetry gives unusually vivid glimpses of love, war, trade and everyday life in the ancient Tamil region.', chip: 'Sangam corpus' },
        { label: 'THE PORTS',      headline: 'Maritime trade across the Indian Ocean.',                          body: 'Ports connected southern India with distant markets — beads, spices, textiles and stories travelled with the ships.', chip: 'Ocean trade' },
        { label: 'THE LANDSCAPES', headline: 'Geography, emotion and poetry tightly connected.',                  body: 'The five tinai — landscapes — mapped emotions onto terrain. Inner life and outer world were understood as one.', chip: 'Five tinai' },
        { label: 'WHY IT MATTERS', headline: 'A classical world that still speaks directly.',                     body: 'Sangam literature remains one of the oldest continuously-read classical traditions in the world.', chip: 'Living literature' }
      ]
    }
  }

export const CIV_ORDER = ['Dholavira', 'Harappa', 'Mohenjo-daro', 'Mauryan Empire', 'Sangam Tamilakam', 'Gupta Age']
