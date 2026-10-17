// Curator-lens content for the interactive museum.
export interface MuseumLens { region: string; era: string; material: string; story: string; technique: string; lens: string; palette: string[] }

export const MUSEUM_LENS: Record<string, MuseumLens> = {
    Madhubani: {
      region: 'Mithila · Bihar',
      era: 'Living tradition · centuries old',
      material: 'Natural pigments on handmade paper or cloth',
      story: 'Madhubani grew from wall paintings made by women in Mithila homes for weddings and rituals. When a drought hit in the 1960s, the government asked artists to paint on paper — and Madhubani entered the global art world. The dense line work, the double outlines, the plants curling into the borders — every element has a purpose.',
      technique: 'Bamboo stick, matchstick, or pen nib for lines; natural dyes from turmeric, indigo, flower petals, lamp soot.',
      lens: 'Notice how the border and the subject share the same language. The frame is not a boundary — it is the story continuing outward.',
      palette: ['#b23a1e', '#1e2f5c', '#3d5a1a', '#f0b432']
    },
    Kalamkari: {
      region: 'Srikalahasti & Machilipatnam · Andhra Pradesh',
      era: 'Since the 10th century CE',
      material: 'Cotton, natural dyes, mordants applied by hand',
      story: 'Kalamkari literally means "pen-work" — kalam (pen) + kari (work). The painter draws directly with a bamboo pen dipped in mordant, then dyes and washes the cloth repeatedly. The result is an image that sits inside the fibre, not on it. It survives washing, sunlight, decades.',
      technique: 'Bamboo kalam, myrobalan treatment, kasimi (iron mordant), madder root, indigo. Up to 20 stages for a single panel.',
      lens: 'Look at how outline and colour live in different layers. That layering is why Kalamkari lasts — nothing sits on top.',
      palette: ['#8b1f1f', '#2a1a5a', '#c98d21', '#4d2a1a']
    },
    Bharatanatyam: {
      region: 'Tamil Nadu',
      era: 'Codified in the Natya Shastra · 200 BCE–200 CE',
      material: 'Body, rhythm, music, costume, codified gesture',
      story: 'Bharatanatyam is not a dance. It is a grammar — a system of hand gestures (mudras), eye movements, and posture that together form a language. The same mudra means one thing in a devotional context, another in a romance. The audience is not watching — the audience is reading.',
      technique: 'Araimandi (half-sitting posture), 28 single-hand mudras, 23 combined, footwork locked to rhythmic syllables (jathis).',
      lens: 'Watch the eyes. A trained dancer can tell an entire narrative through eye movement alone while the body holds a fixed pose.',
      palette: ['#c0392b', '#f1c40f', '#1a5276', '#d4a373']
    },
    Handloom: {
      region: 'Every weaving village in India',
      era: 'Pre-history to today',
      material: 'Cotton, silk, wool, natural or chemical dyes, hand-operated looms',
      story: 'Before machines, every thread was placed by hand. Each region developed its own weaves because each region had its own climate, its own fibres, its own markets. Banarasi brocade, Kanchipuram silk, Chanderi cotton, Ikat, Jamdani — these are entire systems of knowledge compressed into cloth.',
      technique: 'Pit loom, frame loom, or back-strap loom. Warp, weft, heald, shuttle. A Banarasi brocade saree can take a weaver months.',
      lens: 'Turn the fabric over. The reverse tells you more about the weave than the front ever will.',
      palette: ['#8b1e3f', '#f4a300', '#0b3d3d', '#e6d5b8']
    },
    Terracotta: {
      region: 'Bengal, Rajasthan, Tamil Nadu',
      era: 'Indus Valley to the present',
      material: 'Local river clay, fired in open pit or kiln',
      story: 'Terracotta is the oldest material of Indian art. The Indus Valley figurines, the Bishnupur temple panels, the Aiyanar horses — they share a common origin: local clay, shaped by hand, fired with the earth itself. Bengal took terracotta to its apex with entire temple facades carved into fired brick.',
      technique: 'Hand-rolled coils, open moulds, wooden paddles, sun-drying, open-pit firing.',
      lens: 'Touch the surface. Terracotta holds the fingerprints of whoever shaped it — fired, but never erased.',
      palette: ['#b96a3d', '#7a3618', '#e5b78a', '#2c1a10']
    },
    Pattachitra: {
      region: 'Raghurajpur · Odisha',
      era: 'Since the 12th century CE',
      material: 'Cloth treated with tamarind paste and chalk, natural pigments',
      story: 'Pattachitra means "cloth-picture" — the cloth is first stiffened with a paste made from tamarind seed and chalk, then burnished with a stone. On this surface, artists paint from memory, never from models. The border always contains a running pattern; the centre a deity or scene from Jagannath mythology.',
      technique: 'Treated cloth, natural pigments, fine brush from mouse hair, stone burnishing between layers.',
      lens: 'Look at the eyes. They are almost always oversized and elongated. They are not portraits — they are windows.',
      palette: ['#c41e3a', '#f6b83d', '#0e3a5c', '#3c6e2a']
    },
    Phulkari: {
      region: 'Punjab',
      era: 'Bhakti tradition · 15th century onward',
      material: 'Hand-spun cotton cloth, silk thread, darning stitch',
      story: 'Phulkari — "flower-work" — is not embroidery in the Western sense. The thread sits on the front of the cloth; the back is a clean, geometric ghost. Grandmothers stitched Phulkari for daughters, often starting years before a wedding. The patterns are held in memory. A Phulkari is a textile portrait of the women who made it.',
      technique: 'Darning stitch on hand-spun khaddar, using silk floss. Patterns are counted, not drawn.',
      lens: 'Turn it over. The back is often more beautiful than the front. That is where the geometry truly lives.',
      palette: ['#e8a33d', '#c0392b', '#0d5c4d', '#f0e2b6']
    },
    Channapatna: {
      region: 'Channapatna · Karnataka',
      era: 'Since the 18th century, under Tipu Sultan’s patronage',
      material: 'Soft ivory-wood, natural lacquer, hand or machine lathe',
      story: 'Channapatna toys were created when Tipu Sultan invited Persian artisans to train local craftsmen in lacquer-turning techniques. The result combined Persian lathe-work with South Indian wood and vegetable dyes. Today, Channapatna is legally protected as a geographical indication.',
      technique: 'Turned on a hand lathe, coloured with lac melted onto the spinning wood, polished with a leaf.',
      lens: 'Look for the seam where the lacquer meets the wood. It is a single continuous moment of colour meeting form.',
      palette: ['#e74c3c', '#f1c40f', '#2ecc71', '#3498db']
    },
    Kathak: {
      region: 'Uttar Pradesh · North India',
      era: 'Bhakti tradition, Mughal courts, 16th century onward',
      material: 'Movement, rhythm, storytelling, ghungroo bells',
      story: 'Kathak began with storytellers who narrated epics in village courtyards. When the Mughal courts adopted the form, it transformed. The turns, the footwork, the rapid spins that end in absolute stillness — these became a language of controlled virtuosity.',
      technique: 'Tatkar (footwork), chakkar (spins), ghungroo (ankle bells), abhinaya (expressive storytelling), bol (rhythmic syllables).',
      lens: 'Listen for the bells. Ghungroo are tuned. Every step is a note.',
      palette: ['#8b1f1f', '#f3b841', '#1c1c1c', '#c4a77d']
    },
    Bidriware: {
      region: 'Bidar · Karnataka',
      era: 'Since the 14th century, under the Bahmani Sultanate',
      material: 'Zinc-copper alloy, silver wire, soil from Bidar fort',
      story: 'Bidriware is a magic trick disguised as metalwork. The base is a dark alloy of zinc and copper. Silver is inlaid into the surface in thin wires, then treated with a special soil from the Bidar fort that turns the alloy permanently black. Silver lines seem to float inside blackness.',
      technique: 'Casting, engraving, inlay, oxidation with Bidar soil, polishing. No two pieces are exactly alike.',
      lens: 'Hold it at an angle in light. The silver lines are actually inlaid into grooves — they are physically part of the metal.',
      palette: ['#0c0c0c', '#c0c0c0', '#8b1f1f', '#6b5a3d']
    }
  }
