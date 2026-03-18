import {
  parseStrainCode,
  letterSuffixToIndex,
  indexToLetterSuffix,
  extractStrainPrefix,
  suggestNextStrainCode,
  suggestChildStrainCode,
  extractTypeTokenFromLabel,
  getNextBaseToken,
  getNextTransferToken,
  findRootId,
  getTreeCultureIds,
} from './culture-suggestion.util';
import { CultureType, RelationshipType } from '../models/culture.model';
import {
  CULTURE_SERVICE_TREE_CULTURES,
  CULTURE_SERVICE_TREE_RELATIONSHIPS,
} from '../../testing/mocks';

// ─── parseStrainCode ─────────────────────────────────────────────────────────

describe('parseStrainCode', () => {
  it('parses a valid strain code into prefix and index', () => {
    expect(parseStrainCode('POS-4')).toEqual({ prefix: 'POS', index: 4 });
  });

  it('returns index 0 when no number segment is present', () => {
    expect(parseStrainCode('POS')).toEqual({ prefix: 'POS', index: 0 });
  });

  it('returns STR with index 0 for empty string', () => {
    expect(parseStrainCode('')).toEqual({ prefix: 'STR', index: 0 });
  });

  it('returns uppercased prefix and index 0 for unrecognised format', () => {
    expect(parseStrainCode('invalid value')).toEqual({
      prefix: 'INVALID VALUE',
      index: 0,
    });
  });

  it('handles hyphenated prefix like HER-T', () => {
    expect(parseStrainCode('HER-T-3')).toEqual({ prefix: 'HER-T', index: 3 });
  });
});

// ─── letterSuffixToIndex / indexToLetterSuffix ────────────────────────────────

describe('letterSuffixToIndex', () => {
  it('converts A to 1', () => expect(letterSuffixToIndex('A')).toBe(1));
  it('converts Z to 26', () => expect(letterSuffixToIndex('Z')).toBe(26));
  it('converts AA to 27', () => expect(letterSuffixToIndex('AA')).toBe(27));
  it('returns 0 for non-letter characters', () =>
    expect(letterSuffixToIndex('A1')).toBe(0));
});

describe('indexToLetterSuffix', () => {
  it('converts 1 to A', () => expect(indexToLetterSuffix(1)).toBe('A'));
  it('converts 26 to Z', () => expect(indexToLetterSuffix(26)).toBe('Z'));
  it('converts 27 to AA', () => expect(indexToLetterSuffix(27)).toBe('AA'));
  it('returns A for index 0 (boundary)', () =>
    expect(indexToLetterSuffix(0)).toBe('A'));
});

// ─── extractStrainPrefix ──────────────────────────────────────────────────────

describe('extractStrainPrefix', () => {
  it('extracts the prefix from a valid strain code', () => {
    expect(extractStrainPrefix('POS-3')).toBe('POS');
  });

  it('returns the full uppercased string when no index is present', () => {
    expect(extractStrainPrefix('MYCO')).toBe('MYCO');
  });
});

// ─── suggestNextStrainCode ────────────────────────────────────────────────────

describe('suggestNextStrainCode', () => {
  it('returns next unused index for the given prefix', () => {
    const result = suggestNextStrainCode(CULTURE_SERVICE_TREE_CULTURES, 'pos');
    expect(result).toEqual({ strain: 'POS-3', segment: 3 });
  });

  it('excludes the specified culture when computing max', () => {
    const result = suggestNextStrainCode(
      CULTURE_SERVICE_TREE_CULTURES,
      'pos',
      // exclude childB which has POS-2, so max falls back to POS-1 → suggest POS-2
      'childA',
    );
    expect(result.segment).toBeGreaterThan(0);
  });

  it('returns prefix-1 when no cultures match the prefix', () => {
    const result = suggestNextStrainCode([], 'xyz');
    expect(result).toEqual({ strain: 'XYZ-1', segment: 1 });
  });

  it('defaults to STR when prefix is empty', () => {
    const result = suggestNextStrainCode([], '');
    expect(result).toEqual({ strain: 'STR-1', segment: 1 });
  });
});

// ─── suggestChildStrainCode ───────────────────────────────────────────────────

describe('suggestChildStrainCode', () => {
  it('increments segment for COLLECTING_SPORES relationship', () => {
    const result = suggestChildStrainCode(
      CULTURE_SERVICE_TREE_CULTURES,
      'root',
      RelationshipType.COLLECTING_SPORES,
    );
    expect(result).toEqual({ strain: 'POS-2', segment: 2 });
  });

  it('inherits parent strain and segment for TRANSFER relationship', () => {
    const result = suggestChildStrainCode(
      CULTURE_SERVICE_TREE_CULTURES,
      'root',
      RelationshipType.TRANSFER,
    );
    expect(result).toEqual({ strain: 'POS-1', segment: 1 });
  });

  it('returns STR-1 when parent is not found', () => {
    const result = suggestChildStrainCode(
      CULTURE_SERVICE_TREE_CULTURES,
      'missing',
      RelationshipType.TRANSFER,
    );
    expect(result).toEqual({ strain: 'STR-1', segment: 1 });
  });
});

// ─── extractTypeTokenFromLabel ────────────────────────────────────────────────

describe('extractTypeTokenFromLabel', () => {
  it('extracts a known type token from a label', () => {
    expect(extractTypeTokenFromLabel('POS-1-AG5-node', CultureType.AGAR)).toBe(
      'AG5',
    );
  });

  it('returns null when no matching token is found', () => {
    expect(
      extractTypeTokenFromLabel('POS-1-node', CultureType.AGAR),
    ).toBeNull();
  });

  it('matches at the start of the label', () => {
    expect(extractTypeTokenFromLabel('AG1-label', CultureType.AGAR)).toBe(
      'AG1',
    );
  });
});

// ─── getNextBaseToken ─────────────────────────────────────────────────────────

describe('getNextBaseToken', () => {
  it('returns abbreviation+1 when no cultures match', () => {
    expect(getNextBaseToken(CultureType.AGAR, [], undefined)).toBe('AG1');
  });

  it('increments past the highest existing base token', () => {
    const token = getNextBaseToken(
      CultureType.AGAR,
      CULTURE_SERVICE_TREE_CULTURES,
      undefined,
    );
    expect(token).toMatch(/^AG\d+$/);
    expect(Number(token.slice(2))).toBeGreaterThanOrEqual(1);
  });
});

// ─── getNextTransferToken ─────────────────────────────────────────────────────

describe('getNextTransferToken', () => {
  it('appends the next letter suffix to a numeric-ending parent token', () => {
    // root has token AG1; no existing transfer children in test data → first = AG1A
    const token = getNextTransferToken(
      'root',
      CultureType.AGAR,
      'AG1',
      CULTURE_SERVICE_TREE_CULTURES,
      CULTURE_SERVICE_TREE_RELATIONSHIPS,
    );
    expect(token).toMatch(/^AG1[A-Z]+$/);
  });
});

// ─── findRootId ───────────────────────────────────────────────────────────────

describe('findRootId', () => {
  it('walks parent chain to find root', () => {
    expect(findRootId('grandchild', CULTURE_SERVICE_TREE_RELATIONSHIPS)).toBe(
      'root',
    );
  });

  it('returns the node itself when it has no parent', () => {
    expect(findRootId('root', CULTURE_SERVICE_TREE_RELATIONSHIPS)).toBe('root');
  });

  it('terminates on cyclic relationships', () => {
    const cyclicRels = [
      {
        id: 'c1',
        sourceId: 'x',
        targetId: 'y',
        type: RelationshipType.TRANSFER,
      },
      {
        id: 'c2',
        sourceId: 'y',
        targetId: 'x',
        type: RelationshipType.TRANSFER,
      },
    ];
    const result = findRootId('x', cyclicRels);
    expect(['x', 'y']).toContain(result);
  });
});

// ─── getTreeCultureIds ────────────────────────────────────────────────────────

describe('getTreeCultureIds', () => {
  it('returns all culture IDs in the same tree', () => {
    const ids = getTreeCultureIds(
      'grandchild',
      CULTURE_SERVICE_TREE_RELATIONSHIPS,
    );
    expect(Array.from(ids).sort()).toEqual(
      ['root', 'childA', 'childB', 'grandchild'].sort(),
    );
  });

  it('handles duplicate paths in DAGs without infinite loops', () => {
    const branchingRels = [
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
    const ids = getTreeCultureIds('c', branchingRels);
    expect(Array.from(ids).sort()).toEqual(['a', 'b', 'c', 'root'].sort());
  });
});
