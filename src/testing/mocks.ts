import {
  Culture,
  CultureType,
  Relationship,
  RelationshipType,
  Strain,
} from '../app/models/culture.model';
import { FilterOptions } from '../app/services/culture.service';

export const DEFAULT_FILTERS: FilterOptions = {
  strain: '',
  type: '',
  filialGeneration: '',
  showArchived: false,
  showContaminated: true,
  showClean: true,
  minViability: 0,
};

export const FILTER_PANEL_MOCK_CULTURES: Partial<Culture>[] = [
  {
    id: '1',
    strain: 'STR-1',
    type: CultureType.SPORE,
    filialGeneration: 'F0',
    label: 'Test 1',
    dateCreated: new Date(),
    metadata: {},
  },
  {
    id: '2',
    strain: 'STR-2',
    type: CultureType.AGAR,
    filialGeneration: 'F1',
    label: 'Test 2',
    dateCreated: new Date(),
    metadata: {},
  },
  {
    id: '3',
    strain: 'STR-1',
    type: CultureType.LIQUID_CULTURE,
    filialGeneration: 'F0',
    label: 'Test 3',
    dateCreated: new Date(),
    metadata: {},
  },
];

export const SAMPLE_CULTURE: Culture = {
  id: 'node-1',
  label: 'Sample',
  type: CultureType.AGAR,
  strain: 'STR-1',
  strainSegment: 1,
  filialGeneration: 'F0',
  description: 'Sample',
  dateCreated: new Date(),
  metadata: { isArchived: false },
  notes: '',
};

export const NODE_MODAL_MOCK_CULTURE: Culture = {
  id: 'c1',
  label: 'Test Culture',
  type: CultureType.AGAR,
  strain: 'STR-1',
  strainSegment: 1,
  filialGeneration: 'F0',
  description: 'Test Description',
  dateCreated: new Date(),
  metadata: { isArchived: false },
};

export const NODE_MODAL_MOCK_RELATIONSHIP: Relationship = {
  id: 'r1',
  sourceId: 'p1',
  targetId: 'c1',
  type: RelationshipType.TRANSFER,
};

export const CULTURE_DETAIL_ROOT_CULTURE: Culture = {
  id: 'node-1',
  label: 'Root',
  type: CultureType.AGAR,
  strain: 'STR-1',
  strainSegment: 1,
  filialGeneration: 'F0',
  description: 'root',
  dateCreated: new Date('2025-01-01'),
  metadata: { isArchived: false, viability: 92 },
};

export const CULTURE_DETAIL_CHILD_CULTURE: Culture = {
  ...CULTURE_DETAIL_ROOT_CULTURE,
  id: 'node-2',
  label: 'Child',
  filialGeneration: 'F1',
};

export const GENEALOGY_VISIBLE_CULTURES: Culture[] = [
  { ...SAMPLE_CULTURE, id: 'a' },
  { ...SAMPLE_CULTURE, id: 'b' },
];

export const GENEALOGY_VISIBLE_RELATIONSHIPS: Relationship[] = [
  {
    id: 'r1',
    sourceId: 'a',
    targetId: 'b',
    type: RelationshipType.TRANSFER,
  },
  {
    id: 'r2',
    sourceId: 'b',
    targetId: 'c',
    type: RelationshipType.TRANSFER,
  },
];

export const GRAPH_BUILDER_MOCK_CULTURES: Culture[] = [
  {
    id: 'c1',
    label: 'Root',
    type: CultureType.AGAR,
    strain: 'STR-1',
    strainSegment: 1,
    filialGeneration: 'F0',
    description: 'root culture',
    dateCreated: new Date('2024-01-01'),
    metadata: { isArchived: false, isContaminated: false },
  },
  {
    id: 'c2',
    label: 'Archived child',
    type: CultureType.CLONE,
    strain: 'STR-2',
    strainSegment: 2,
    filialGeneration: 'F2',
    description: 'child culture',
    dateCreated: new Date('2024-02-01'),
    metadata: { isArchived: true, isContaminated: true },
  },
];

export const GRAPH_BUILDER_MOCK_RELATIONSHIPS: Relationship[] = [
  {
    id: 'r1',
    sourceId: 'c1',
    targetId: 'c2',
    type: RelationshipType.TRANSFER,
  },
  {
    id: 'r2',
    sourceId: 'c2',
    targetId: 'c1',
    type: 'custom_relation' as unknown as RelationshipType,
  },
];

export const APP_EXPORT_JSON = '{"test":"data"}';

export const APP_ADD_ROOT_MODAL_RESULT = {
  updates: {
    label: 'Test Culture',
    type: CultureType.SPORE,
    strain: 'STR-1',
  },
};

export const FILTER_PANEL_ACTIVE_FILTERS: FilterOptions = {
  strain: 'STR-1',
  type: CultureType.AGAR,
  filialGeneration: 'F1',
  showArchived: true,
  showContaminated: false,
  showClean: true,
  minViability: 50,
};

export const CULTURE_SERVICE_TREE_CULTURES: Culture[] = [
  {
    id: 'root',
    label: 'POS-1-AG1-root',
    type: CultureType.AGAR,
    strain: 'POS-1',
    strainSegment: 1,
    filialGeneration: 'F0',
    description: 'root culture',
    dateCreated: new Date('2024-01-01'),
    metadata: { isArchived: false, viability: 95 },
    notes: 'root notes',
  },
  {
    id: 'childA',
    label: 'POS-1-AG1A-child',
    type: CultureType.AGAR,
    strain: 'POS-1',
    strainSegment: 1,
    filialGeneration: 'F0-T1',
    description: 'child culture A',
    dateCreated: new Date('2024-01-02'),
    metadata: { isArchived: false, isContaminated: true, viability: 70 },
    notes: 'child notes',
  },
  {
    id: 'childB',
    label: 'POS-2-SP1-child',
    type: CultureType.SPORE,
    strain: 'POS-2',
    strainSegment: 2,
    filialGeneration: 'F1',
    description: 'child culture B',
    dateCreated: new Date('2024-01-03'),
    metadata: { isArchived: true, viability: 40 },
    notes: 'child b notes',
  },
  {
    id: 'grandchild',
    label: 'POS-1-AG1B-grandchild',
    type: CultureType.AGAR,
    strain: 'POS-1',
    strainSegment: 1,
    filialGeneration: 'F0-T2',
    description: 'grandchild culture',
    dateCreated: new Date('2024-01-04'),
    metadata: { isArchived: false, viability: 82 },
    notes: 'grandchild notes',
  },
];

export const CULTURE_SERVICE_TREE_RELATIONSHIPS: Relationship[] = [
  {
    id: 'rel1',
    sourceId: 'root',
    targetId: 'childA',
    type: RelationshipType.TRANSFER,
  },
  {
    id: 'rel2',
    sourceId: 'root',
    targetId: 'childB',
    type: RelationshipType.COLLECTING_SPORES,
  },
  {
    id: 'rel3',
    sourceId: 'childA',
    targetId: 'grandchild',
    type: RelationshipType.TRANSFER,
  },
];

export const CULTURE_SERVICE_STRAINS: Strain[] = [
  {
    id: 'POS',
    species: 'Pleurotus ostreatus',
    commonName: 'Oyster',
    source: 'Catalog',
    dateAcquired: new Date('2024-01-01'),
    notes: 'default',
  },
  {
    id: 'XYZ',
    species: 'Example species',
    commonName: 'Example',
    source: 'Lab',
    dateAcquired: new Date('2024-01-05'),
    notes: 'custom',
  },
];

export const CULTURE_SERVICE_VALID_IMPORT_PAYLOAD = {
  version: 1,
  cultures: CULTURE_SERVICE_TREE_CULTURES,
  relationships: CULTURE_SERVICE_TREE_RELATIONSHIPS,
  strains: CULTURE_SERVICE_STRAINS,
  filters: {
    strain: 'POS-1',
    type: CultureType.AGAR,
    filialGeneration: 'F0',
    showArchived: true,
    showContaminated: true,
    showClean: true,
    minViability: 50,
  },
  selectedNodeId: 'childA',
};
