import { effect, signal } from '@angular/core';
import { fakeAsync, TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import {
  CultureService,
  FilterOptions,
  PersistedData,
} from './culture.service';
import { CulturePersistenceService } from './data-import-export.service';
import {
  Culture,
  CultureType,
  Relationship,
  RelationshipType,
} from '../models/culture.model';
import {
  CULTURE_SERVICE_STRAINS,
  CULTURE_SERVICE_TREE_CULTURES,
  CULTURE_SERVICE_TREE_RELATIONSHIPS,
  CULTURE_SERVICE_VALID_IMPORT_PAYLOAD,
  DEFAULT_FILTERS,
} from '../../testing/mocks';

describe('CultureService', () => {
  let service: CultureService;
  let persistenceMock: {
    loadFromStorage: ReturnType<typeof vi.fn>;
    saveToStorage: ReturnType<typeof vi.fn>;
    serialize: ReturnType<typeof vi.fn>;
    deserialize: ReturnType<typeof vi.fn>;
  };

  const setState = (params: {
    cultures?: Culture[];
    relationships?: any[];
    strains?: any[];
    filters?: FilterOptions;
    selectedNodeId?: string | null;
  }) => {
    if (params.cultures) {
      (service as any).cultures.set(params.cultures);
    }
    if (params.relationships) {
      (service as any).relationships.set(params.relationships);
    }
    if (params.strains) {
      (service as any).strains.set(params.strains);
    }
    if (params.filters) {
      (service as any).filters.set(params.filters);
    }
    if (params.selectedNodeId !== undefined) {
      (service as any).selectedNodeId.set(params.selectedNodeId);
    }
  };

  const getCulturesState = () => (service as any).cultures() as Culture[];
  const getRelationshipsState = () => (service as any).relationships() as any[];
  const getFiltersState = () => (service as any).filters() as FilterOptions;

  beforeEach(() => {
    localStorage.clear();
    persistenceMock = {
      loadFromStorage: vi.fn().mockReturnValue(null),
      saveToStorage: vi.fn(),
      serialize: vi
        .fn()
        .mockImplementation((data: unknown) => JSON.stringify(data, null, 2)),
      deserialize: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        CultureService,
        { provide: CulturePersistenceService, useValue: persistenceMock },
      ],
    });
    service = TestBed.inject(CultureService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should avoid feedback loop when updateFilters is called from an effect', fakeAsync(() => {
    const trigger = signal<Partial<FilterOptions>>({});
    let runs = 0;

    const ref = TestBed.runInInjectionContext(() =>
      effect(() => {
        const nextFilters = trigger();
        runs += 1;
        service.updateFilters(nextFilters);
      }),
    );

    TestBed.flushEffects();
    expect(runs).toBe(1);

    trigger.set({ strain: 'STR-1' });
    TestBed.flushEffects();
    expect(runs).toBe(2);

    trigger.set({ minViability: 50 });
    TestBed.flushEffects();
    expect(runs).toBe(3);

    ref.destroy();
  }));

  it('filters cultures by strain/type/filial/archived/contamination/viability', () => {
    setState({
      cultures: CULTURE_SERVICE_TREE_CULTURES,
      relationships: CULTURE_SERVICE_TREE_RELATIONSHIPS,
    });
    service.updateFilters({
      strain: 'POS-1',
      type: CultureType.AGAR,
      filialGeneration: 'F0',
      showArchived: false,
      showContaminated: true,
      showClean: true,
      minViability: 80,
    });
    TestBed.flushEffects();

    const filtered = (service as any).filteredCulturesSignal() as Culture[];
    expect(filtered.map((culture) => culture.id)).toEqual([
      'root',
      'grandchild',
    ]);
  });

  it('resetFilters restores default filter values', () => {
    service.updateFilters({
      strain: 'POS-1',
      minViability: 30,
      showArchived: true,
      showClean: false,
    });
    service.resetFilters();

    expect(getFiltersState()).toEqual(DEFAULT_FILTERS);
  });

  it('adds culture with defaults for id, strainSegment, and archived metadata', () => {
    setState({ cultures: [] });

    const created = service.addCulture({
      label: 'New',
      type: CultureType.AGAR,
      strain: 'POS-9',
      strainSegment: 0,
      filialGeneration: 'F0',
      description: 'desc',
      dateCreated: new Date('2024-01-10'),
      notes: 'note',
      metadata: {},
    });

    expect(created.id).toBeTruthy();
    expect(created.strainSegment).toBe(1);
    expect(created.metadata?.isArchived).toBe(false);
    expect(getCulturesState()).toHaveLength(1);
  });

  it('updates culture and propagates strain prefix changes to descendants', () => {
    setState({
      cultures: CULTURE_SERVICE_TREE_CULTURES,
      relationships: CULTURE_SERVICE_TREE_RELATIONSHIPS,
    });

    service.updateCulture('root', { strain: 'NEW-1' });

    const byId = new Map(
      getCulturesState().map((culture) => [culture.id, culture]),
    );
    expect(byId.get('root')?.strain).toBe('NEW-1');
    expect(byId.get('childA')?.strain).toBe('NEW-1');
    expect(byId.get('grandchild')?.strain).toBe('NEW-1');
    expect(byId.get('childB')?.strain).toBe('NEW-2');
  });

  it('deletes culture and removes relationships referencing it', () => {
    setState({
      cultures: CULTURE_SERVICE_TREE_CULTURES,
      relationships: CULTURE_SERVICE_TREE_RELATIONSHIPS,
    });

    service.deleteCulture('childA');

    expect(getCulturesState().map((culture) => culture.id)).not.toContain(
      'childA',
    );
    expect(getRelationshipsState().map((rel) => rel.id)).toEqual(['rel2']);
  });

  it('deletes a culture tree including descendants and related relationships', () => {
    setState({
      cultures: CULTURE_SERVICE_TREE_CULTURES,
      relationships: CULTURE_SERVICE_TREE_RELATIONSHIPS,
    });

    service.deleteCultureTree('childA');

    expect(getCulturesState().map((culture) => culture.id)).toEqual([
      'root',
      'childB',
    ]);
    expect(getRelationshipsState().map((rel) => rel.id)).toEqual(['rel2']);
  });

  it('ignores deleteCultureTree calls for missing or empty ids', () => {
    setState({
      cultures: CULTURE_SERVICE_TREE_CULTURES,
      relationships: CULTURE_SERVICE_TREE_RELATIONSHIPS,
    });

    const originalCultures = getCulturesState();
    const originalRelationships = getRelationshipsState();

    service.deleteCultureTree('');
    service.deleteCultureTree('missing');
    service.deleteCultureTree(null as unknown as string);
    service.deleteCultureTree(undefined as unknown as string);

    expect(getCulturesState()).toEqual(originalCultures);
    expect(getRelationshipsState()).toEqual(originalRelationships);
  });

  it('deletes only the target when no descendants exist', () => {
    setState({
      cultures: CULTURE_SERVICE_TREE_CULTURES,
      relationships: CULTURE_SERVICE_TREE_RELATIONSHIPS,
    });

    service.deleteCultureTree('childB');

    expect(getCulturesState().map((culture) => culture.id)).toEqual([
      'root',
      'childA',
      'grandchild',
    ]);
    expect(getRelationshipsState().map((rel) => rel.id)).toEqual([
      'rel1',
      'rel3',
    ]);
  });

  it('performs relationship CRUD operations', () => {
    setState({ relationships: [] });

    const rel = service.addRelationship({
      sourceId: 'root',
      targetId: 'childA',
      type: RelationshipType.TRANSFER,
    });
    expect(rel.id).toBeTruthy();

    service.updateRelationship(rel.id, { type: RelationshipType.INOCULATION });
    expect(getRelationshipsState()[0].type).toBe(RelationshipType.INOCULATION);

    service.deleteRelationship(rel.id);
    expect(getRelationshipsState()).toHaveLength(0);
  });

  it('resolves parent/child/ancestor/descendant relationships', () => {
    setState({
      cultures: CULTURE_SERVICE_TREE_CULTURES,
      relationships: CULTURE_SERVICE_TREE_RELATIONSHIPS,
    });

    expect(service.getChildren('root').map((culture) => culture.id)).toEqual([
      'childA',
      'childB',
    ]);
    expect(service.getParent('childA')?.id).toBe('root');
    expect(service.getParentRelationship('childA')?.id).toBe('rel1');
    expect(
      service.getAncestors('grandchild').map((culture) => culture.id),
    ).toEqual(['root', 'childA']);
    expect(service.getDescendants('root').map((culture) => culture.id)).toEqual(
      ['childA', 'childB', 'grandchild'],
    );
  });

  it('sets selected node and toggles archive state', async () => {
    setState({ cultures: CULTURE_SERVICE_TREE_CULTURES });

    service.setSelectedNode('childA');
    expect((service as any).selectedNodeId()).toBe('childA');

    service.archiveCulture('childA');
    expect(
      getCulturesState().find((culture) => culture.id === 'childA')?.metadata
        ?.isArchived,
    ).toBe(true);

    service.restoreCulture('childA');
    expect(
      getCulturesState().find((culture) => culture.id === 'childA')?.metadata
        ?.isArchived,
    ).toBe(false);
  });

  it('suggests next strain code with prefix parsing and current-culture exclusion', () => {
    setState({
      cultures: [
        { ...CULTURE_SERVICE_TREE_CULTURES[0], id: 'x1', strain: 'POS-1' },
        { ...CULTURE_SERVICE_TREE_CULTURES[1], id: 'x2', strain: 'POS-3' },
      ],
    });

    expect(service.suggestNextStrainCode('pos')).toEqual({
      strain: 'POS-4',
      segment: 4,
    });
    expect(service.suggestNextStrainCode('pos', 'x2')).toEqual({
      strain: 'POS-2',
      segment: 2,
    });
  });

  it('suggests child strain code for collecting spores, transfer, and missing parent', () => {
    setState({ cultures: CULTURE_SERVICE_TREE_CULTURES });

    expect(
      service.suggestChildStrainCode(
        'root',
        CultureType.SPORE,
        RelationshipType.COLLECTING_SPORES,
      ),
    ).toEqual({
      strain: 'POS-2',
      segment: 2,
    });

    expect(
      service.suggestChildStrainCode(
        'root',
        CultureType.AGAR,
        RelationshipType.TRANSFER,
      ),
    ).toEqual({
      strain: 'POS-1',
      segment: 1,
    });

    expect(
      service.suggestChildStrainCode(
        'missing',
        CultureType.AGAR,
        RelationshipType.TRANSFER,
      ),
    ).toEqual({
      strain: 'STR-1',
      segment: 1,
    });
  });

  it('suggests type tokens for current label, transfer numbering, and base numbering', () => {
    setState({
      cultures: CULTURE_SERVICE_TREE_CULTURES,
      relationships: CULTURE_SERVICE_TREE_RELATIONSHIPS,
    });

    expect(
      service.suggestTypeToken({
        type: CultureType.AGAR,
        currentLabel: 'POS-1-AG8-something',
      }),
    ).toBe('AG8');

    expect(
      service.suggestTypeToken({
        type: CultureType.AGAR,
        parentId: 'root',
        relationshipType: RelationshipType.TRANSFER,
      }),
    ).toBe('AG1B');

    expect(
      service.suggestTypeToken({
        type: CultureType.AGAR,
        parentId: 'root',
      }),
    ).toBe('AG2');
  });

  it('extracts type token from labels and handles non-match', () => {
    expect(
      service.extractTypeTokenFromLabel('POS-1-AG5-node', CultureType.AGAR),
    ).toBe('AG5');
    expect(
      service.extractTypeTokenFromLabel('POS-1-node', CultureType.AGAR),
    ).toBeNull();
  });

  it('returns strain options with predefined and custom prefixes', () => {
    setState({ strains: CULTURE_SERVICE_STRAINS });
    const options = service.getStrainOptions();

    expect(options.some((option) => option.prefix === 'POS')).toBe(true);
    expect(options.some((option) => option.prefix === 'XYZ')).toBe(true);
  });

  it('exports data by delegating to persistence service serialize', () => {
    setState({
      cultures: CULTURE_SERVICE_TREE_CULTURES,
      relationships: CULTURE_SERVICE_TREE_RELATIONSHIPS,
      strains: CULTURE_SERVICE_STRAINS,
    });

    service.exportDataAsJson();

    expect(persistenceMock.serialize).toHaveBeenCalledWith(
      expect.objectContaining({
        version: 1,
        cultures: CULTURE_SERVICE_TREE_CULTURES,
      }),
    );
  });

  it('importDataFromJson deserializes via persistence service and applies signals', () => {
    persistenceMock.deserialize.mockReturnValue(
      CULTURE_SERVICE_VALID_IMPORT_PAYLOAD,
    );

    service.importDataFromJson('{}');

    expect(persistenceMock.deserialize).toHaveBeenCalledWith('{}');
    expect(getCulturesState().length).toBe(
      CULTURE_SERVICE_TREE_CULTURES.length,
    );
    expect((service as any).selectedNodeId()).toBe('childA');
  });

  it('importDataFromJson propagates errors thrown by persistence service deserialize', () => {
    persistenceMock.deserialize.mockImplementation(() => {
      throw new Error('Invalid JSON format');
    });

    expect(() => service.importDataFromJson('bad')).toThrow(
      'Invalid JSON format',
    );
  });

  it('applyImportedData sets all signals from a PersistedData object', () => {
    service.applyImportedData(
      CULTURE_SERVICE_VALID_IMPORT_PAYLOAD as PersistedData,
    );

    expect(getCulturesState().length).toBe(
      CULTURE_SERVICE_TREE_CULTURES.length,
    );
    expect((service as any).selectedNodeId()).toBe('childA');
  });

  it('loads persisted data from storage on construction', () => {
    const loadMock = vi
      .fn()
      .mockReturnValue(CULTURE_SERVICE_VALID_IMPORT_PAYLOAD);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        CultureService,
        {
          provide: CulturePersistenceService,
          useValue: {
            ...persistenceMock,
            loadFromStorage: loadMock,
            saveToStorage: vi.fn(),
          },
        },
      ],
    });
    const svc = TestBed.inject(CultureService);

    expect((svc as any).cultures().length).toBe(
      CULTURE_SERVICE_TREE_CULTURES.length,
    );
  });

  it('searches cultures by label, description, and notes', async () => {
    setState({ cultures: CULTURE_SERVICE_TREE_CULTURES });
    TestBed.flushEffects();

    const byLabel = await firstValueFrom(service.searchCultures('root'));
    expect(byLabel.map((culture) => culture.id)).toContain('root');

    const byDescription = await firstValueFrom(
      service.searchCultures('grandchild culture'),
    );
    expect(byDescription.map((culture) => culture.id)).toEqual(['grandchild']);

    const byNotes = await firstValueFrom(service.searchCultures('child notes'));
    expect(byNotes.map((culture) => culture.id)).toContain('childA');
  });

  it('computes culture stats by type/strain and archived count', async () => {
    setState({ cultures: CULTURE_SERVICE_TREE_CULTURES });
    TestBed.flushEffects();

    const stats = await firstValueFrom(service.getCultureStats());
    expect(stats.total).toBe(4);
    expect(stats.archived).toBe(1);
    expect(stats.byType[CultureType.AGAR]).toBe(3);
    expect(stats.byStrain['POS-1']).toBe(3);
  });

  it('handles tree traversal duplicates and root resolution in graph utilities', () => {
    const branchingCultures: Culture[] = [
      { ...CULTURE_SERVICE_TREE_CULTURES[0], id: 'root' },
      { ...CULTURE_SERVICE_TREE_CULTURES[1], id: 'a' },
      { ...CULTURE_SERVICE_TREE_CULTURES[2], id: 'b' },
      { ...CULTURE_SERVICE_TREE_CULTURES[3], id: 'c' },
    ];
    const branchingRels: Relationship[] = [
      {
        id: 'r1',
        sourceId: 'root',
        targetId: 'a',
        type: RelationshipType.TRANSFER,
      },
      {
        id: 'r2',
        sourceId: 'root',
        targetId: 'b',
        type: RelationshipType.TRANSFER,
      },
      {
        id: 'r3',
        sourceId: 'a',
        targetId: 'c',
        type: RelationshipType.TRANSFER,
      },
      {
        id: 'r4',
        sourceId: 'b',
        targetId: 'c',
        type: RelationshipType.TRANSFER,
      },
    ];

    setState({ cultures: branchingCultures, relationships: branchingRels });

    // getDescendants must not loop or duplicate results in a diamond DAG
    const descendants = service.getDescendants('root');
    const ids = descendants.map((c) => c.id);
    expect(ids.sort()).toEqual(['a', 'b', 'c'].sort());
    expect(ids.length).toBe(new Set(ids).size); // no duplicates
  });
});
