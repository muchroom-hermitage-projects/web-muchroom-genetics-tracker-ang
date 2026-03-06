1. Add a checkbox in Edit Culture modal, beside "Archived", to mark "Contaminated" culture. When the culture is contaminated, the modal background should become reddish; beside the header "Edit Culture" there should be red, bold text: "(contaminated)",
and all new children created from it after marking its "contaminated" state shold also receive this UI changes (reddish background, "contaminated" text).
2. Filters left panel should now also include "show contaminated", and "show clean" (uncontaminated) checkboxes.
2. Relations should no longer be editable - the input should remains, but be disabled. Instead we should have defaults automatically selected based on the selected child "Type":
   a. spores to anything = germination
   b. agar to agar = transfer
   c. agar, spores to LC = inoculation
   d. LC to LC, grain to grain = expansion

{ value: CultureType.SPORE, label: 'Spores (SP)', abbreviation: 'SP' },
{ value: CultureType.AGAR, label: 'Agar (AG)', abbreviation: 'AG' },
{ value: CultureType.LIQUID_CULTURE, label: 'Liquid culture (LC)', abbreviation: 'LC' },
{ value: CultureType.GRAIN_SPAWN, label: 'Grain spawn (GS)', abbreviation: 'GS' },
{ value: CultureType.FRUIT, label: 'Fruit (FB)', abbreviation: 'FB' },
{ value: CultureType.CLONE, label: 'Clone (CL)', abbreviation: 'CL' },
{ value: CultureType.SLANT, label: 'Slant (SL)', abbreviation: 'SL' },
{ value: CultureType.CASTELLANI_WATER, label: 'Castellani water (CW)', abbreviation: 'CW' },


- Adding options to rename relations
- Adding option to add/remove relations (under the hood relations have uuids assigned to them)
- Relation
- Add option to rename species
- Adding option to add/remove mushroom species
- Add option to add new localStorage keys
  - keys are then added to "saved states" dropdown
  - the app should load data from the one that is currently selected
  - add option to remove the saved state
  - add option to giva a name to an imported/exported state json
