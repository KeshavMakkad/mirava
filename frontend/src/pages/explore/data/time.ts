// Era content for the Chronoscope (time travel) section.
export interface EraCard { label: string; text: string }
export interface Era { number: string; title: string; captionLabel: string; caption: string; cards: EraCard[] }

export const ERAS: Record<string, Era> = {
    '-500': {
      number: '01',
      title: 'The Age of Questions',
      captionLabel: 'A WORLD OF NEW QUESTIONS',
      caption: 'Across the Gangetic plain, cities, kingdoms and new communities are changing how people think about life, ethics and the self.',
      cards: [
        { label: 'THE SETTING', text: 'Cities, kingdoms and new communities are reshaping the Gangetic plain.' },
        { label: 'THE SHIFT',   text: 'Buddhist and Jain traditions challenge people to rethink ethics, suffering and self-discipline.' },
        { label: 'TAKEAWAY',    text: 'History is not only kings and battles — it is people changing how they understand life.' }
      ]
    },
    '120': {
      number: '02',
      title: 'Trade Across the Seas',
      captionLabel: 'THE INDIAN OCEAN AS HIGHWAY',
      caption: 'Ports turn the Indian Ocean into a busy highway for goods, ideas, scripts and stories moving between continents.',
      cards: [
        { label: 'THE PORTS', text: 'Arikamedu, Muziris and other coastal centres connect South Asia with distant markets.' },
        { label: 'THE CARGO', text: 'Spices, beads, textiles, ceramics and stories travel alongside merchants and sailors.' },
        { label: 'TAKEAWAY',  text: 'Heritage is also a history of movement — across water, languages and borders.' }
      ]
    },
    '250': {
      number: '03',
      title: 'The Mauryan Conversation',
      captionLabel: 'AN EMPIRE LEAVES MESSAGES IN STONE',
      caption: 'Mauryan power connects a vast territory through administration, roads and public inscriptions.',
      cards: [
        { label: 'THE EMPIRE', text: 'Administration, roads and political networks connect a huge territory.' },
        { label: 'THE CLUE',   text: 'Ashokan inscriptions turn public spaces into places where people meet ideas about dhamma.' },
        { label: 'TAKEAWAY',   text: 'Inscriptions are history speaking directly through surviving evidence.' }
      ]
    },
    '450': {
      number: '04',
      title: 'The Gupta World',
      captionLabel: 'SCIENCE, ART & CLASSICAL THOUGHT',
      caption: 'Mathematics, astronomy, literature and art enter a celebrated classical period — part of a longer exchange of ideas.',
      cards: [
        { label: 'THE SCHOLAR', text: 'Aryabhata and others reshape how people understand numbers and the sky.' },
        { label: 'THE ATELIER', text: 'Sculpture, Sanskrit literature and temple traditions develop sophisticated visual languages.' },
        { label: 'TAKEAWAY',    text: 'Knowledge becomes heritage when generations keep building on it.' }
      ]
    },
    '800': {
      number: '05',
      title: 'Temple Cities Rise',
      captionLabel: 'ARCHITECTURE AS ECOSYSTEM',
      caption: 'Temples become centres of worship, learning, music, craft and local economies — not just buildings.',
      cards: [
        { label: 'THE BLUEPRINT', text: 'Builders combine geometry, sculpture, water systems and careful planning.' },
        { label: 'THE CITY',      text: 'Temples anchor worship, learning, music, craft and local economies.' },
        { label: 'TAKEAWAY',      text: 'A monument can be an entire living ecosystem.' }
      ]
    },
    '1200': {
      number: '06',
      title: 'Temples, Ports & Trade',
      captionLabel: 'OCEANIC AND OVERLAND NETWORKS',
      caption: 'The subcontinent plugs into vast oceanic and overland networks — merchants move textiles, spices, ideas and stories.',
      cards: [
        { label: 'THE ROUTES', text: 'Merchants move textiles, spices, ideas and stories across the Indian Ocean.' },
        { label: 'THE CITIES', text: 'Temple towns and port cities become powerful cultural and economic centres.' },
        { label: 'TAKEAWAY',   text: 'Indian heritage was always connected to the wider world.' }
      ]
    },
    '1400': {
      number: '07',
      title: 'Vijayanagara & the Deccan',
      captionLabel: 'WATER, MARKET & ARCHITECTURE',
      caption: 'A powerful southern centre turns water, markets and architecture into urban infrastructure at an extraordinary scale.',
      cards: [
        { label: 'THE CAPITAL', text: 'Vijayanagara grows into a huge urban landscape of markets, temples and royal spaces.' },
        { label: 'THE WATER',   text: 'Reservoirs, canals and tanks help a large population thrive in a challenging landscape.' },
        { label: 'TAKEAWAY',    text: 'Engineering is part of heritage too.' }
      ]
    },
    '1650': {
      number: '08',
      title: 'Stories in Miniature',
      captionLabel: 'PAINTED WORLDS, TINY SURFACES',
      caption: 'Miniature painting makes courts, myths, landscapes and everyday life visible in dense, layered scenes.',
      cards: [
        { label: 'THE FRAME',  text: 'A tiny surface becomes a dense visual world of courts, myths and landscapes.' },
        { label: 'THE DETAIL', text: 'Artists encode clothing, architecture, plants, animals and emotions into layered scenes.' },
        { label: 'TAKEAWAY',   text: 'Looking closely can reveal an entire society.' }
      ]
    },
    '1857': {
      number: '09',
      title: 'A Turning Point',
      captionLabel: 'RESISTANCE REMEMBERED',
      caption: 'Resistance and political change leave a deep mark on the subcontinent — with many different voices preserving the memory.',
      cards: [
        { label: 'THE UPRISING', text: 'The revolt of 1857 becomes a major turning point in colonial Indian history.' },
        { label: 'THE MEMORY',   text: 'Places, letters, monuments and oral traditions preserve many different memories of the period.' },
        { label: 'TAKEAWAY',     text: 'History has multiple voices — preserving them matters.' }
      ]
    },
    '1947': {
      number: '10',
      title: 'A New Republic',
      captionLabel: 'FREEDOM & FRAMING',
      caption: 'Political freedom creates a new chapter for a very old cultural landscape — a democratic republic for a diverse society.',
      cards: [
        { label: 'THE MOMENT',    text: 'India becomes independent after a long anti-colonial movement.' },
        { label: 'THE FRAMEWORK', text: 'The Constitution establishes a democratic republic and a framework for a diverse society.' },
        { label: 'TAKEAWAY',      text: 'Heritage survives by being carried forward, questioned and reinterpreted.' }
      ]
    },
    '2025': {
      number: '11',
      title: 'Heritage, In Motion',
      captionLabel: 'THE STORY IS STILL BEING WRITTEN',
      caption: 'Museums, communities, artists, archaeologists and young people keep heritage visible — you are part of what happens next.',
      cards: [
        { label: 'TODAY',     text: 'Communities, artists and archaeologists keep heritage alive and visible.' },
        { label: 'CHALLENGE', text: 'Preservation now meets digitisation, tourism, climate pressures and changing lifestyles.' },
        { label: 'TAKEAWAY',  text: 'You are not outside heritage. You are part of what happens next.' }
      ]
    }
  }

export const ERA_ORDER = ['-500', '120', '250', '450', '800', '1200', '1400', '1650', '1857', '1947', '2025']
