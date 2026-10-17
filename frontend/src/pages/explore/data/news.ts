// Static newsroom stories (fallback when no admin-published news exists).
export interface StaticStory { title: string; tag: string; body: string; meta: string[] }

export const STORY_DATA: Record<string, StaticStory> = {
    Dholavira: {
      title: 'How a desert city keeps rewriting what we know.',
      tag: 'ARCHAEOLOGY · JUL 31, 2026',
      body: 'New readings of Dholavira\'s reservoir system suggest the city wasn\'t just surviving scarcity — it was engineering around it with astonishing precision. The site\'s water-harvesting network, built more than four thousand years ago, continues to challenge assumptions about ancient urban planning.',
      meta: ['By Mirava Desk', '6 min read', 'Dholavira · Gujarat']
    },
    Restoration: {
      title: 'New conservation methods for old stone',
      tag: 'RESTORATION · JUL 30, 2026',
      body: 'A quiet revolution is happening in conservation labs — breathable consolidants are changing how we treat centuries-old sandstone. The new methods allow stone to "breathe" while still protecting it from moisture and pollution.',
      meta: ['By Mirava Desk', '4 min read', 'Conservation']
    },
    Discovery: {
      title: 'A small seal, a very large question',
      tag: 'ANCIENT DISCOVERIES · JUL 30, 2026',
      body: 'A newly surfaced Indus seal fragment has reignited one of the oldest debates in South Asian archaeology — what did the script mean? The seal, found in a private collection, carries three signs never before documented together.',
      meta: ['By Mirava Desk', '5 min read', 'Indus Valley']
    },
    Culture: {
      title: 'The makers putting handloom back on the map',
      tag: 'CULTURE · JUL 29, 2026',
      body: 'A new generation of weavers is reimagining traditional looms — and finding global audiences without losing the grammar of the craft. Their work is part of a broader revival of Indian textile heritage.',
      meta: ['By Mirava Desk', '3 min read', 'Handloom']
    },
    Pattadakal: {
      title: 'Pattadakal\'s stone is breathing again',
      tag: 'RESTORATION · JUL 28, 2026',
      body: 'A ten-year conservation project at the Chalukyan site has removed decades of damaging coatings without harming original carvings. The project is being watched closely by heritage bodies across Asia.',
      meta: ['By Mirava Desk', '5 min read', 'Pattadakal · Karnataka']
    },
    Keeladi: {
      title: 'Keeladi pushes Tamil literacy further back',
      tag: 'ARCHAEOLOGY · JUL 27, 2026',
      body: 'Fresh carbon dating from the Keeladi excavation suggests writing in Tamil may be centuries older than previously accepted. The findings could reshape our understanding of early Tamil society.',
      meta: ['By Mirava Desk', '6 min read', 'Keeladi · Tamil Nadu']
    },
    Baul: {
      title: 'The Baul singers teaching the world to listen',
      tag: 'CULTURE · JUL 26, 2026',
      body: 'A UNESCO-listed oral tradition is finding new life through digital archives and a younger generation of wandering minstrels. The Baul tradition, rooted in Bengal, continues to inspire listeners worldwide.',
      meta: ['By Mirava Desk', '4 min read', 'Baul · Bengal']
    }
  }
