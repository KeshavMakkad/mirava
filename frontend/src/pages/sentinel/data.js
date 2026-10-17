// Knowledge base — monuments, materials, conservation guidance (from legacy/Sentinel.html).
/* =====================================================================
   KNOWLEDGE BASE — monuments, materials, conservation guidance
   ===================================================================== */
export const MONUMENTS = [
  { id: 'konark', name: 'Sun Temple, Konark', loc: 'Konark, Puri district, Odisha', mat: 'laterite', matLabel: 'Khondalite & laterite' },
  { id: 'hampi', name: 'Group of Monuments at Hampi', loc: 'Hampi, Vijayanagara district, Karnataka', mat: 'igneous', matLabel: 'Granite' },
  { id: 'ellora', name: 'Ellora Caves', loc: 'Ellora, Chhatrapati Sambhajinagar district, Maharashtra', mat: 'igneous', matLabel: 'Basalt (Deccan Traps)' },
  { id: 'qutb', name: 'Qutb Minar and its Monuments', loc: 'Mehrauli, New Delhi', mat: 'sandstone', matLabel: 'Red & buff sandstone, marble' },
  { id: 'redfort', name: 'Red Fort Complex', loc: 'Old Delhi, Delhi', mat: 'sandstone', matLabel: 'Red sandstone, marble' },
  { id: 'taj', name: 'Taj Mahal', loc: 'Agra, Uttar Pradesh', mat: 'calcareous', matLabel: 'Makrana marble' },
  { id: 'khajuraho', name: 'Khajuraho Group of Monuments', loc: 'Chhatarpur district, Madhya Pradesh', mat: 'sandstone', matLabel: 'Sandstone' },
  { id: 'sanchi', name: 'Buddhist Monuments at Sanchi', loc: 'Raisen district, Madhya Pradesh', mat: 'sandstone', matLabel: 'Sandstone' },
  { id: 'thanjavur', name: 'Brihadisvara Temple, Thanjavur', loc: 'Thanjavur, Tamil Nadu', mat: 'igneous', matLabel: 'Granite' },
  { id: 'custom', name: 'Custom monument…', loc: '', mat: 'sandstone', matLabel: '' }
];
export const MATERIALS = { sandstone: 'Sandstone', calcareous: 'Marble / limestone', igneous: 'Granite / basalt', laterite: 'Laterite / khondalite', lime: 'Brick & lime plaster' };
export const SUBSTRATE = {
  sandstone: 'Sandstone is porous and can be soft. Keep water pressure low, test every chemical on a hidden patch first, and never seal the surface with water-repellents without conservator approval. Some sandstones have a calcite binder, so avoid acidic cleaners.',
  calcareous: 'Marble and limestone dissolve in acid, so never use acidic cleaners (including vinegar or lemon). A clay poultice of fuller\'s earth (multani mitti) is the gentlest way to draw out stains; ASI has used this mud-pack treatment on the Taj Mahal.',
  igneous: 'Granite and basalt are hard, but their weathered skin and carved detail are not. Do not grind or wire-brush them, and use lime-based mortars, never cement, for joints and fills.',
  laterite: 'Khondalite and laterite weather fast once moisture gets in. Prioritise drainage and joint pointing with lime mortar, and avoid cement-based patches.',
  lime: 'Repair brick and lime plaster only with lime-based plasters and mortars (slaked lime with local aggregate). Cement plaster traps moisture and salts and speeds up decay.'
};
export const LEGAL = 'Damaging, defacing or removing any part of a centrally protected monument is an offence under the Ancient Monuments and Archaeological Sites and Remains (AMASR) Act, 1958, as amended in 2010. Report it to the site in-charge and the local police with this ticket.';
export const REMEDY = {
  paint: {
    actions: [
      'Cordon off the spot and inform the site in-charge. Fresh paint is far easier to remove before it cures and soaks into the pores.',
      'Pre-wet the area with de-ionised water containing a little non-ionic surfactant, then test a solvent on a 5 × 5 cm patch out of sight.',
      'Lift the paint with a solvent gel or poultice (for example an acetone- or ethanol-based remover in cellulose or sepiolite pulp). Cover it, let it dwell, then work it off gently with a soft brush or wooden spatula. Repeat rather than scrub.',
      'Rinse with de-ionised water. Draw out any remaining "ghost" stain with a further clay poultice.',
      'Have the treatment carried out or supervised by a trained conservator (ASI Science Branch).'
    ],
    avoid: ['wire brushes', 'sand or grit blasting', 'high-pressure water jets', 'caustic or acid paint strippers', 'painting over the graffiti with "matching" paint']
  },
  carving: {
    actions: [
      'Photograph the marks under raking light with a scale bar, and record the depth and extent. The carving is evidence of a deliberate act.',
      'Do not grind, sand or "re-dress" the surface to erase it. That removes more original fabric than the vandal did.',
      'For shallow scratches, a conservator can tone them down with dry pigment in a reversible binder.',
      'Fill deep gouges only if needed, with a lime mortar of slaked lime and matching stone dust (about 1 : 2.5–3).',
      'Prevent a repeat: add a barrier, a signboard or CCTV, or put this spot on the guard rotation.'
    ],
    avoid: ['Portland cement', 'epoxy or polyester fillers on soft stone', 'acrylic or enamel paints', 'mechanical grinding']
  },
  crack: {
    actions: [
      'Install crack monitoring: glass or plaster tell-tales, or a crack-width gauge. Record the width and length, and re-photograph from the same spot every week.',
      'Refer it to a conservation or structural engineer straight away if the crack is wider than 2–3 mm, growing, or in a load-bearing member. Prop or cordon off the area if fragments could fall.',
      'For stable cracks, clean out the dust with a soft brush and air blower. Inject a hydraulic-lime (NHL) based grout, then point the surface with lime mortar.',
      'Stitch with non-corrosive (stainless steel or GFRP) dowels set in lime grout where needed. This is specialist work only.',
      'Trace and stop the water: check roof, joint and drainage leaks, and look for roots in the joints.'
    ],
    avoid: ['Portland cement or cement-rich mortars (harder than the stone, they trap moisture and salts)', 'epoxy on porous stone', 'iron clamps or nails']
  },
  bio: {
    actions: [
      'Let the surface dry, then remove the loose growth with soft nylon or natural-bristle brushes and wooden spatulas.',
      'Apply a tested biocide, such as a quaternary-ammonium compound at about 1–3 % in water, with a soft brush. Leave it for the recommended time, then brush off the dead growth and rinse at low pressure.',
      'Fix the moisture source: clear drains and weep-holes, remove standing water, and cut back roots, treating them rather than pulling them out by force.',
      'Re-inspect after the monsoon. Regrowth means the moisture problem is still there.'
    ],
    avoid: ['bleach / sodium hypochlorite (leaves harmful salts)', 'wire brushes', 'pressure washers', 'pulling out woody plants rooted in joints']
  },
  crust: {
    actions: [
      'Get a conservator to confirm whether it is a pollution black crust (gypsum) or a dark bio-film. The treatments differ.',
      'On marble and limestone, use clay (fuller\'s earth) or ammonium-carbonate poultices. On sandstone and granite, use gentle poulticing with soft brushing.',
      'Leave stubborn crust to specialists, who may use laser or micro-scale cleaning.',
      'If it is a bio-film, treat it as bio-growth (biocide plus moisture control).'
    ],
    avoid: ['acids', 'aggressive abrasion', 'over-cleaning that strips the stone\'s patina']
  },
  salt: {
    actions: [
      'Dry-brush the white efflorescence off and collect it. Do not wash it back into the stone.',
      'Desalinate with repeated poultices of cellulose pulp or kaolin wetted with de-ionised water, and check the salt load between cycles.',
      'Trace the moisture source (rising damp, roof leaks, nearby cement repairs) and fix it.',
      'Replace cement pointing near the area with breathable lime mortar.'
    ],
    avoid: ['washing with large volumes of water', 'cement repairs', 'impermeable sealants or coatings']
  },
  loss: {
    actions: [
      'Collect and label any detached fragments, and store them safely for re-attachment.',
      'Cordon off the area if more pieces could fall. Visitor safety comes first.',
      'A conservator should consolidate the friable edges and re-attach fragments with lime-based mortar or a reversible adhesive, using non-corrosive dowels if needed.'
    ],
    avoid: ['cement patching', 're-carving lost detail', 'leaving loose fragments in place']
  },
  change: {
    actions: [
      'Verify on site. Re-photograph the spot from the same position and at a similar time of day; shadows and wet patches can look like damage.',
      'If the change is real, classify it on site and raise a follow-up ticket with close-up photos.'
    ],
    avoid: ['starting any treatment before the cause is identified']
  }
};
export const LEVELS = {
  0: { name: 'Clear', desc: 'No significant anomaly detected', resp: 'Next routine inspection' },
  1: { name: 'Low', desc: 'Monitor — routine maintenance', resp: 'Next routine visit (≤ 30 days)' },
  2: { name: 'Medium', desc: 'Active deterioration — schedule conservation', resp: 'Within 7 days' },
  3: { name: 'Critical', desc: 'Structural threat / Physical defacement', resp: 'Dispatch within 24 hours' }
};
