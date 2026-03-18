# AGENTS.md — AI Coding Agent Guide

This guide helps AI agents understand the architecture, conventions, and workflows for the Mycology Genetics Tracker project.

## Change Philosophy

Prefer small, localized changes.
Avoid large refactors unless explicitly requested.
Maintain existing architecture and patterns.

## Project Overview

**Type**: Standalone Angular web application (v21.2.x) using Vite + Vitest, with Playwright E2E testing.

**Domain**: Tracks genetic relationships between mushroom cultures through a genealogy graph. Users create cultures (spores, agar, liquid cultures, grain spawns, etc.), track parent-child relationships, apply contamination/viability metadata, filter results, and import/export tracking data.

**Hosting**: Browser-based SPA. Data persists to localStorage with JSON import/export capability.

## System Architecture Summary

The application follows a service-centric architecture:

Components → Services → Utilities

Components must never depend on other components.
Components must not inject or depend on other components for application logic.
Shared behavior should live in services, utilities, or abstract base classes.
Services may depend on utilities but not components.
Utilities must remain framework-agnostic.

State lives exclusively in CultureService using Angular Signals.
GraphBuilderService converts state into Cytoscape graph elements.
Components render UI and trigger service actions but do not contain business logic.

## Architectural Invariants (Do Not Violate)

1. CultureService is the single source of truth for all culture and relationship data.

2. Components must never mutate culture data directly. All mutations must go through CultureService.

3. GraphBuilderService performs only data transformation. It must not contain business logic or persistence logic.

4. Application state uses Angular Signals only. RxJS is allowed only for interoperability.

5. Components must not import other feature components or services directly. Shared communication occurs only through services.

6. Persistence occurs only through CultureService's localStorage interface.

## Architecture Overview

### Core Application Flow

1. **CultureService** (1001 lines) - Single source of truth
  - NOTE: CultureService is large but should not grow further. New logic should prefer small helper utilities.
  - Manages `cultures[]`, `relationships[]`, `strains[]` via Angular signals
  - Persists to localStorage key: `'mycology-genetics-tracker-data-v1'`
  - Exposes filter options (strain, type, filial generation, contamination, viability)
  - All components query service via signal getters: `getCulturesSignal()`, `getSelectedNodeIdSignal()`
  - Also exposes Observable streams for `toSignal()` interop (see CultureService API Pattern below)

2. **GraphBuilderService** - Graph rendering layer
  - Converts cultures + relationships → Cytoscape.js elements
  - Builds stylesheet with culture-type-specific node styling (icons, colors)
  - Implements contaminated node styling (red background/border) and archived node styling (grey)
  - No business logic here - transforms only

3. **Genealogy Graph Component**
  - Renders Cytoscape DAG (directed acyclic graph) with dagre layout algorithm
  - Minimap via `cytoscape-navigator` (renders in `#cyNavigator` div in template)
  - Right-click context menu via `cytoscape-context-menus` (Details, Add child, Remove node, Archive/Restore, Contaminated/Clean)
  - Subtree drag mode: dragging a parent node moves all descendants; toggleable via checkbox in toolbar
  - Toolbar: Fit to screen (`fitGraph()`), Reset layout (`resetLayout()`), node count display
  - Exposes graph instance globally via `window['__GENETICS_GRAPH_CY__']` for E2E tests
  - Responds to node clicks → updates `selectedNodeId` signal → triggers detail panel & children list
  - Double-click on node opens edit modal

4. **Culture Detail Component**
  - Computed derived state: `selectedCulture = cultures.find(c => c.id === selectedNodeId)`
  - Shows metadata (contamination, viability %), parent relationships, child relationships
  - Opens NodeModalComponent for CRUD operations (via MatDialog)

5. **Filter Panel Component**
  - Mirrors FilterOptions interface from service
  - Updates filters signal → automatically updates displayed graph via Cytoscape event handlers

6. **Navbar Component**
  - Add root culture button (opens NodeModalComponent)
  - Export/Import data menu (via DataImportExportService)
  - About modal trigger (opens AboutModalComponent)

### Data Model (Culture Entity)

```typescript
Culture {
  id: string (UUID v4)
  label: string (user-friendly name)
  type: CultureType (enum: spore, agar, liquid_culture, grain_spawn, fruit, clone, slant, castellani_water)
  strain: string (e.g., "POS-1" - full strain label, auto-generated)
  strainSegment: number (genetic tracking segment: 1, 2, 3, etc.)
  filialGeneration: string (e.g., "F0", "F1", "F1-T1")
  description: string
  dateCreated: Date
  source?: string
  notes?: string
  metadata?: {
    transferNumber?: number
    cloneGeneration?: number
    isMaster?: boolean
    isArchived?: boolean       // ← UI shows "(archived)" suffix; node styled grey
    isContaminated?: boolean   // ← node styled red; modal gets red background
    viability?: number         // percentage, used in filter minimum
  }
}
```

**Strain Prefixes** (hardcoded in STRAIN_FAMILY_OPTIONS):
LED, POS, PCI, PDJ, PCU, PCY, HER-T, PUL, PST, PSM

### Relationship Types

- `GERMINATION`: Spore → any culture type
- `TRANSFER`: Agar → Agar (token numbering: `AG1` → `AG1A`, `AG1B`, …)
- `INOCULATION`: Spore/Agar → Liquid Culture
- `EXPANSION`: Liquid Culture → Liquid Culture, Grain → Grain
- `CLONE_FROM_FRUIT`: Fruit → Clone
- `FRUITING`: Grain Spawn → Fruit
- `COLLECTING_SPORES`: Fruit → Spore (increments `strainSegment` by +1 in `suggestChildStrainCode()`)
- `LONG_TERM_STORAGE`: any → Slant or Castellani Water

**TODO**: Relationships should auto-compute type based on source/target culture types; currently user-selectable but should be disabled.

## Development Workflows

### Starting Local Development

```bash
npm install                    # Install dependencies (Angular 21, Material, Cytoscape)
npm run start                  # Dev server: http://localhost:4200 with hot reload
```

### Testing

```bash
npm run test                   # Vitest (unit tests in src/**/*.spec.ts)
npm run test:coverage          # Generate coverage reports in ./coverage/
npm run format                 # Prettier + ESLint auto-fix
npm run lint                   # ESLint check
```

**Vitest Config Key Details**:
- Environment: `jsdom` (simulates DOM)
- Pool: `forks` (Windows-friendly, isolates tests)
- Setup file: `src/setup.ts`
- Coverage provider: `v8`
- Coverage thresholds: statements 80%, branches 75%, functions 80%, lines 80%

### E2E Testing (Playwright)

```bash
npx playwright test            # Runs ./tests/**/*.spec.ts
npx playwright show-report     # Opens HTML report from ./playwright-report/
```

**E2E POM Pattern**: `tests/pom/GeneticsGraph.page.ts` - Page Object Model for graph selectors.

**Webserver Requirement**: Playwright auto-starts `npm run start` at `http://127.0.0.1:4200`.

### Build & Production

```bash
npm run build                  # Outputs to ./dist/mycology-genetics-tracker/
```

**Constraints** (see angular.json):
- Initial bundle: ≤2MB warning, ≤3MB hard error
- Component style: ≤2KB warning, ≤4KB hard error
- Build uses Vite + Angular's new build system (@angular-devkit/build-angular)

## Code Conventions & Patterns

### Angular Signals (v21 Latest)

**All reactive state uses Angular Signals, NOT RxJS**:
```typescript
// ✓ DO: Signals in service
private readonly cultures: WritableSignal<Culture[]> = signal([]);

// ✓ DO: Components query via getter methods
readonly cultures = this.cultureService.getCulturesSignal();

// ✓ DO: Computed derived state
readonly selectedCulture = computed(() => {
  return this.cultures().find(c => c.id === this.selectedNodeId());
});

// ✗ DON'T: Use RxJS Subjects for application state (use toObservable() for Observable interop only)
```

**Pattern**: Services expose only typed getters + methods. Signals are private; public access via `Readonly<Signal<T>>` return types from getter functions.

### CultureService API Pattern

The service exposes both Signal getters (for direct reads) and Observable streams (for `toSignal()` interop):

```typescript
// Signal getters (use for synchronous reads or in computed())
this.cultureService.getCulturesSignal()       // Signal<Culture[]>
this.cultureService.getSelectedNodeIdSignal() // Signal<string | null>

// Observable streams (consume via toSignal() in components)
this.cultureService.getCultures()             // Observable<Culture[]>
this.cultureService.getFilteredCultures()     // Observable<Culture[]>
this.cultureService.getRelationships()        // Observable<Relationship[]>
this.cultureService.getStrains()              // Observable<Strain[]>
this.cultureService.getSelectedNodeId()       // Observable<string | null>
this.cultureService.getFilters()              // Observable<FilterOptions>
```

GenealogyGraphComponent pattern for consuming Observables:
```typescript
private readonly filteredCulturesSignal = toSignal(
  this.cultureService.getFilteredCultures(),
  { initialValue: [] as Culture[] },
);
```

### Standalone Components

**All components are standalone** (no NgModules except app-routing.module.ts):
```typescript
@Component({
  selector: 'app-...',
  standalone: true,
  imports: [CommonModule, MatButtonModule, ...],
  templateUrl: '...',
  styleUrls: ['...'],
})
```

Import Material modules explicitly. Prebuilt theme: `@angular/material/prebuilt-themes/indigo-pink.css` (in angular.json).

### Services (Dependency Injection)

```typescript
@Injectable({ providedIn: 'root' })
export class MyService {
  private readonly dependency = inject(SomeDependency);  // Use inject(), not constructor params
}
```

All services use `providedIn: 'root'` for tree-shaking. Use `inject()` helper, not constructor injection.

### Styling

- **Preprocessor**: SCSS (configured in angular.json as `inlineStyleLanguage: 'scss'`)
- **Component styles**: Local `.scss` files, scoped by Angular's view encapsulation
- **Global styles**: `src/styles.scss`
- **Material theming**: Indigo/Pink prebuilt theme

### TypeScript Configuration

- **Target**: ES2022
- **Strict mode**: Enabled (noImplicitAny, strictNullChecks, etc.)
- **Module**: ESNext
- **Notable enabled rules**: noPropertyAccessFromIndexSignature, noImplicitOverride

## Key File Locations & Responsibilities

| File/Folder | Purpose |
|---|---|
| `src/app/services/culture.service.ts` | State management (cultures, relationships, filters); localStorage I/O |
| `src/app/services/graph-builder.service.ts` | Cytoscape element/stylesheet generation |
| `src/app/services/data-import-export.service.ts` | JSON file I/O (no CSV support) |
| `src/app/models/culture.model.ts` | Enums + interfaces (CultureType, RelationshipType, Culture, Relationship) |
| `src/app/models/context-menu.models.ts` | Type definitions for cytoscape-context-menus (ContextMenuInstance, CytoscapeWithContextMenus) |
| `src/app/models/strains.model.ts` | StrainOption interface + STRAIN_FAMILY_OPTIONS constant |
| `src/app/components/genealogy-graph/` | Graph rendering + minimap + context menu + node selection |
| `src/app/components/culture-detail/` | Detail panel + relationship lists |
| `src/app/components/node-modal/` | Dialog for create/edit/delete (triggered by MatDialog) |
| `src/app/components/filter-panel/` | Left sidebar filter UI |
| `src/app/components/navbar/` | Top toolbar: Add root culture, Export/Import, About |
| `src/app/components/about-modal/` | About dialog with JSON format example |
| `src/app/app.component.ts` | Root layout (sidenav, navbar, graph, detail panel) |
| `src/setup.ts` | Vitest configuration (mocks, setup) |
| `tests/pom/GeneticsGraph.page.ts` | Playwright Page Object Model for graph selectors |

## Common Development Tasks

### Adding a New Culture Metadata Field

1. Update `Culture` interface in `src/app/models/culture.model.ts`
2. Initialize default value in CultureService constructor/initializeDefaultValues()
3. Add form control in NodeModalComponent (if user-editable)
4. Export/import handling: add to PersistedData serialization in CultureService
5. If filterable: add FilterOptions interface property + filter logic

### Adding Filter Logic

1. Add property to `FilterOptions` interface in CultureService
2. Add UI control in FilterPanelComponent.html/ts (bind to service filter signal)
3. Implement filter predicate in CultureService's private `applyFilters()` method
4. Add test coverage in CultureService.spec.ts

### Modifying Relationship Rules

1. Update RelationshipType enum in `culture.model.ts` if adding new type
2. Update GraphBuilderService edge stylesheet selector if a new color/style is needed
3. Update `suggestChildStrainCode()` in CultureService if the new type affects strain inheritance
4. **TODO**: Implement auto-derivation based on source/target types (currently manual)

### Testing New Features

- **Unit**: Create `.spec.ts` alongside component/service
- **E2E**: Add `.spec.ts` in `tests/`, use POM from `tests/pom/GeneticsGraph.page.ts`
- Run: `npm run test`, `npm run test:coverage`
- Coverage must stay above thresholds (statements 80%, branches 75%, functions/lines 80%)

## Performance & Constraints

- **Graph Max Size**: Cytoscape can handle thousands of nodes; test with >500 cultures
- **LocalStorage Quota**: Typically 5-10MB per origin; optimize JSON serialization
- **Re-renders**: Angular Signals trigger fine-grained updates; only affected components re-render
- **Cytoscape Rendering**: DAG layout (dagre) can be slow for very deep hierarchies (>100 levels)

## Dependencies & Gotchas

- **Angular**: `^21.2.x` (all core, common, material, cdk packages)
- **Cytoscape**: `3.25.0` + `cytoscape-dagre` (2.5.0) for DAG layout
- **cytoscape-context-menus**: `4.2.1` — right-click menus; typed via `CytoscapeWithContextMenus` in `context-menu.models.ts`
- **cytoscape-navigator**: `2.0.1` — minimap overlay; initialized with `cy.navigator({ container: '#cyNavigator' })`
- **Angular Material**: `^21.2.2` - full suite included (Dialogs, Sidenav, Buttons, etc.)
- **RxJS**: `7.5.0` (minimal usage; interop via `toObservable()` / `toSignal()`)
- **UUID**: `9.0.0` for culture/relationship IDs
- **zone.js**: `0.16.1`
- **Allowlist**: `cytoscape-dagre` in CommonJS deps (angular.json `allowedCommonJsDependencies`)

## Debugging Hints

### Graph Not Rendering

- Check CultureService signals populated: `window.cultures()` in console
- Verify Cytoscape instance: `window['__GENETICS_GRAPH_CY__']` should exist
- Check GraphBuilderService element construction (verify node/edge data shape)
- Test dagre layout with: `cy.layout({ name: 'dagre' }).run()`

### Minimap Not Showing

- Confirm `<div id="cyNavigator">` exists in `genealogy-graph.component.html`
- Verify `cytoscape-navigator` plugin registered: `navigator(cytoscape)` called before `cytoscape({...})`

### Context Menu Not Appearing

- Verify `cytoscape-context-menus` registered: `contextMenus(cytoscape)` in component bootstrap
- Check that `CytoscapeWithContextMenus` cast is used; plain `cytoscape.Core` does not expose `.contextMenus()`

### Filters Not Working

- Verify FilterOptions signal updated: `window.filters()` in console
- Check filter computation in CultureService's `getFilteredCultures()`
- Inspect Cytoscape filter event handlers in GenealogyGraphComponent's `effect()`

### localStorage Corruption

- Clear with: `localStorage.removeItem('mycology-genetics-tracker-data-v1')`
- Check JSON export format: CultureService's `exportDataAsJson()` + PersistedData interface

## Common Mistakes (Avoid)

1. Do not compute graph layout inside components; use GraphBuilderService.
2. Do not mutate signals directly from components.
3. Do not add Cytoscape logic outside GenealogyGraphComponent or GraphBuilderService.
4. Do not introduce RxJS Subjects for application state.
5. Do not add context-menu types inline — use `CytoscapeWithContextMenus` and `ContextMenuInstance` from `context-menu.models.ts`.

## Future Major Features (from TODO.md)

- [x] Contamination UI (red background for contaminated cultures + children) — **DONE**
- [x] Minimap — **DONE** (cytoscape-navigator; zoom in/out buttons + level indicator still pending)
- [ ] Auto-derive relationship types from source/target culture types
- [ ] Multiple named "saved states" (structure + data snapshots)
- [ ] Graph zoom in/out buttons with zoom level indicator
- [ ] Data testid attributes for all UI elements (a11y + E2E robustness)
- [ ] Migration to Nx monorepo (for Electron + mobile versions)
- [ ] Robust logging service
- [ ] List mode (toggle between graph and list view, persisted in localStorage)
- [ ] Dark mode / high contrast mode toggle (persisted in localStorage)
- [ ] Migrate to zoneless Angular
