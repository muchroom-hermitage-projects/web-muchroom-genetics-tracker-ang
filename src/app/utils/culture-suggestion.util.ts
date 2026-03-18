import {
  Culture,
  CultureType,
  Relationship,
  RelationshipType,
  getCultureTypeAbbreviation,
} from '../models/culture.model';

// ─── Strain code helpers ──────────────────────────────────────────────────────

export function parseStrainCode(strainCode: string): {
  prefix: string;
  index: number;
} {
  const normalized = (strainCode || '').toUpperCase().trim();
  const match = normalized.match(/^([A-Z]+(?:-[A-Z]+)?)(?:-(\d+))?$/);
  if (!match) {
    return { prefix: normalized || 'STR', index: 0 };
  }
  return { prefix: match[1], index: match[2] ? Number(match[2]) : 0 };
}

export function extractStrainPrefix(strainCode: string): string {
  return parseStrainCode(strainCode).prefix;
}

export function suggestNextStrainCode(
  cultures: Culture[],
  prefix: string,
  excludeId?: string,
): { strain: string; segment: number } {
  const normalizedPrefix = (prefix || 'STR').toUpperCase();
  const maxIndex = cultures
    .filter((c) => c.id !== excludeId)
    .reduce((max, c) => {
      const parsed = parseStrainCode(c.strain);
      return parsed.prefix === normalizedPrefix
        ? Math.max(max, parsed.index)
        : max;
    }, 0);
  const next = maxIndex + 1;
  return { strain: `${normalizedPrefix}-${next}`, segment: next };
}

export function suggestChildStrainCode(
  cultures: Culture[],
  parentId: string,
  relationshipType: RelationshipType | string,
): { strain: string; segment: number } {
  const parent = cultures.find((c) => c.id === parentId);
  if (!parent) {
    return { strain: 'STR-1', segment: 1 };
  }
  if (relationshipType === RelationshipType.COLLECTING_SPORES) {
    const parentPrefix = extractStrainPrefix(parent.strain);
    const newSegment = (parent.strainSegment || 1) + 1;
    return { strain: `${parentPrefix}-${newSegment}`, segment: newSegment };
  }
  return { strain: parent.strain, segment: parent.strainSegment || 1 };
}

// ─── Type token helpers ───────────────────────────────────────────────────────

export function extractTypeTokenFromLabel(
  label: string,
  type: CultureType,
): string | null {
  const abbreviation = getCultureTypeAbbreviation(type);
  const escaped = abbreviation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(^|-)(${escaped}[A-Z0-9]+)-`);
  const match = label.match(regex);
  return match ? match[2] : null;
}

export function isTransferNumberingType(type: CultureType): boolean {
  return (
    type === CultureType.AGAR ||
    type === CultureType.LIQUID_CULTURE ||
    type === CultureType.GRAIN_SPAWN
  );
}

export function getNextBaseToken(
  type: CultureType,
  cultures: Culture[],
  currentCultureId: string | undefined,
  relationships?: Relationship[],
  parentId?: string,
): string {
  const abbreviation = getCultureTypeAbbreviation(type);
  const treeCultureIds: Set<string> | null =
    relationships && parentId
      ? getTreeCultureIds(parentId, relationships)
      : relationships && currentCultureId
      ? getTreeCultureIds(currentCultureId, relationships)
      : null;

  const baseRegex = new RegExp(`^${abbreviation}(\\d+)$`);
  const maxIndex = cultures
    .filter((c) => c.id !== currentCultureId)
    .filter((c) => !treeCultureIds || treeCultureIds.has(c.id))
    .reduce((max, c) => {
      const token = extractTypeTokenFromLabel(c.label, type);
      if (!token) return max;
      const m = token.match(baseRegex);
      return m ? Math.max(max, Number(m[1])) : max;
    }, 0);

  return `${abbreviation}${maxIndex + 1}`;
}

export function getNextTransferToken(
  parentId: string,
  type: CultureType,
  parentToken: string,
  cultures: Culture[],
  relationships: Relationship[],
): string {
  const lastChar = parentToken.charAt(parentToken.length - 1);
  const letterMode = /\d/.test(lastChar);
  const suffixes = getTransferChildSuffixes(
    parentId,
    type,
    parentToken,
    letterMode,
    cultures,
    relationships,
  );

  if (letterMode) {
    const maxLetterIndex = suffixes.reduce((max, suffix) => {
      const index = letterSuffixToIndex(suffix);
      return index > max ? index : max;
    }, 0);
    return `${parentToken}${indexToLetterSuffix(maxLetterIndex + 1)}`;
  }

  const maxNumber = suffixes.reduce((max, suffix) => {
    const parsed = Number(suffix);
    return Number.isNaN(parsed) ? max : Math.max(max, parsed);
  }, 0);
  return `${parentToken}${maxNumber + 1}`;
}

function getTransferChildSuffixes(
  parentId: string,
  type: CultureType,
  parentToken: string,
  letterMode: boolean,
  cultures: Culture[],
  relationships: Relationship[],
): string[] {
  const culturesById = new Map(cultures.map((c) => [c.id, c]));
  const suffixRegex = letterMode
    ? new RegExp(`^${parentToken}([A-Z]+)$`)
    : new RegExp(`^${parentToken}(\\d+)$`);

  return relationships
    .filter(
      (r) => r.sourceId === parentId && r.type === RelationshipType.TRANSFER,
    )
    .map((r) => culturesById.get(r.targetId))
    .filter((c): c is Culture => !!c && c.type === type)
    .map((c) => extractTypeTokenFromLabel(c.label, type))
    .filter((t): t is string => !!t)
    .map((t) => t.match(suffixRegex))
    .filter((m): m is RegExpMatchArray => !!m)
    .map((m) => m[1]);
}

// ─── Tree traversal helpers ───────────────────────────────────────────────────

export function findRootId(
  nodeId: string,
  relationships: Relationship[],
): string {
  const incomingByTarget = new Map<string, string>();
  relationships.forEach((r) => {
    if (!incomingByTarget.has(r.targetId)) {
      incomingByTarget.set(r.targetId, r.sourceId);
    }
  });

  let current = nodeId;
  const seen = new Set<string>();
  while (incomingByTarget.has(current) && !seen.has(current)) {
    seen.add(current);
    current = incomingByTarget.get(current)!;
  }
  return current;
}

export function getTreeCultureIds(
  nodeId: string,
  relationships: Relationship[],
): Set<string> {
  const rootId = findRootId(nodeId, relationships);
  const bySource = new Map<string, string[]>();
  relationships.forEach((r) => {
    const children = bySource.get(r.sourceId) ?? [];
    children.push(r.targetId);
    bySource.set(r.sourceId, children);
  });

  const visited = new Set<string>();
  const queue = [rootId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    (bySource.get(current) ?? []).forEach((childId) => {
      if (!visited.has(childId)) queue.push(childId);
    });
  }
  return visited;
}

// ─── String conversion helpers ────────────────────────────────────────────────

export function letterSuffixToIndex(input: string): number {
  let index = 0;
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i) - 64;
    if (code < 1 || code > 26) return 0;
    index = index * 26 + code;
  }
  return index;
}

export function indexToLetterSuffix(index: number): string {
  let value = index;
  let output = '';
  while (value > 0) {
    value -= 1;
    output = `${String.fromCharCode(65 + (value % 26))}${output}`;
    value = Math.floor(value / 26);
  }
  return output || 'A';
}
