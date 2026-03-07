import {
  Culture,
  CultureType,
  Relationship,
  RelationshipType,
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

export const FILTER_PANEL_MOCK_CULTURES: Culture[] = [
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
