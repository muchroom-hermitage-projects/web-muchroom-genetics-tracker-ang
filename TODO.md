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

# Future features:

- Adding options to rename relations
- Adding option to add/remove relations (under the hood relations have uuids assigned to them)
- Add option to rename species
- Adding option to add/remove mushroom species
- Add option to add new localStorage keys
  - keys are then added to "saved states" dropdown
  - the app should load data from the one that is currently selected
  - add option to remove the saved state
  - add option to giva a name to an imported/exported state json
- Add option to preserve the current nodes structure (store it with the data in the json object)
- Add indicator to the UI, that shows (a warning bulb) that the structure no longer matches what is currently sored in the json
- Add a buttons providing options to restore the strusture saved in json or to save the modified structure
- It should be possible to create up to 5 different structure state saves:
  - all are stored in the json
  - in the UI there should be a dropdown with all the saved structures selectable
  - if a save is still empty - is should be marked as "empty" in the dropdown
  - when "save" button is clicked, it the currently selected save is replaced with the new one
- Add buttons to zoom in/out the graph, and add indicator to the UI showing the current zoom level (e.g. 100%, 150%, etc.)
- Refactor navbar menu (currently in app.component), to a separate component
- Add option to define own relation styles (color, thickness, dashed/solid), and save them in localStorage
- Add option to define own node styles (color, shape, size), and save them in localStorage
- Add option to define background color, and save it in localStorage

# Project structure:

- Add data-testid attributes to all important elements in the UI, to make it easier to write tests for them
- Add '@playwright-testing/axe' to the project to test a11y
- migrate to Nx repo, to make it easier to maintain versions for mobile and desktop (Electron)
- Add a version for Electron
- Add a version for mobile (ionic?)
- Add robust logging (LoggerService)
- Migrate to zoneless Angular
- Clean up the "window hack" from GenealogyGraphComponent after migrating to Angular 20
- Add a list mode (should be more accessible than graph mode), there should be a toggle button to switch between graph and list mode, and the app should remember the selected mode in localStorage
- Add a "dark mode" toggle, and remember the selected mode in localStorage
- Add a "high contrast mode" toggle, and remember the selected mode in localStorage
