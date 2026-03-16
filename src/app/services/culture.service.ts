import {
  Injector,
  Signal,
  WritableSignal,
  computed,
  effect,
  inject,
  Injectable,
  signal,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  Culture,
  Relationship,
  Strain,
  CultureType,
  RelationshipType,
  getCultureTypeAbbreviation,
} from '../models/culture.model';
import { v4 as uuidv4 } from 'uuid';
import { STRAIN_FAMILY_OPTIONS, StrainOption } from '../models/strains.model';
import {
  culturesExample,
  relationshipsExample,
  strainsExample,
} from '../../assets/documents/example-culture-data';
import { environment } from '../../environments/environment';

export interface FilterOptions {
  strain: string;
  type: string;
  filialGeneration: string;
  showArchived: boolean;
  showContaminated: boolean;
  showClean: boolean;
  minViability: number;
}

export interface PersistedData {
  version: number;
  cultures: Culture[];
  relationships: Relationship[];
  strains: Strain[];
  filters: FilterOptions;
  selectedNodeId: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class CultureService {
  private readonly STORAGE_KEY = 'mycology-genetics-tracker-data-v1';
  private readonly injector = inject(Injector);

  private readonly cultures: WritableSignal<Culture[]> = signal([]);
  private readonly relationships: WritableSignal<Relationship[]> = signal([]);
  private readonly strains: WritableSignal<Strain[]> = signal([]);
  private readonly selectedNodeId: WritableSignal<string | null> = signal(null);
  private readonly filters: WritableSignal<FilterOptions> = signal({
    strain: '',
    type: '',
    filialGeneration: '',
    showArchived: false,
    showContaminated: true,
    showClean: true,
    minViability: 0,
  });

  private readonly filteredCulturesSignal = computed(() =>
    this.applyFilters(this.cultures(), this.filters()),
  );
  private readonly cultures$ = toObservable(this.cultures, {
    injector: this.injector,
  });
  private readonly relationships$ = toObservable(this.relationships, {
    injector: this.injector,
  });
  private readonly strains$ = toObservable(this.strains, {
    injector: this.injector,
  });
  private readonly selectedNodeId$ = toObservable(this.selectedNodeId, {
    injector: this.injector,
  });
  private readonly filters$ = toObservable(this.filters, {
    injector: this.injector,
  });
  private readonly filteredCultures$ = toObservable(
    this.filteredCulturesSignal,
    {
      injector: this.injector,
    },
  );

  constructor() {
    const loaded = this.loadFromStorage();
    // TODO: Remove when done testing.
    if (!loaded && !environment.production) {
      this.loadSampleData();
    }
    // END TODO
    this.setupAutoPersistence();
  }

  // Observable streams
  getCultures(): Observable<Culture[]> {
    return this.cultures$;
  }

  getFilteredCultures(): Observable<Culture[]> {
    return this.filteredCultures$;
  }

  getRelationships(): Observable<Relationship[]> {
    return this.relationships$;
  }

  getStrains(): Observable<Strain[]> {
    return this.strains$;
  }

  getSelectedNodeId(): Observable<string | null> {
    return this.selectedNodeId$;
  }

  getFilters(): Observable<FilterOptions> {
    return this.filters$;
  }

  getCulturesSignal(): Signal<Culture[]> {
    return this.cultures.asReadonly();
  }

  getSelectedNodeIdSignal(): Signal<string | null> {
    return this.selectedNodeId.asReadonly();
  }

  getStrainOptions(): StrainOption[] {
    const options = [...STRAIN_FAMILY_OPTIONS];
    const existingPrefixes = new Set(options.map((option) => option.prefix));

    this.strains().forEach((strain) => {
      const prefix = this.extractStrainPrefix(strain.id);
      if (!existingPrefixes.has(prefix)) {
        options.push({
          prefix,
          label: `${strain.species} (${prefix})`,
        });
        existingPrefixes.add(prefix);
      }
    });

    return options;
  }

  /**
   * Suggests the next strain code for a given prefix.
   * Returns both the full strain code and the segment number.
   */
  suggestNextStrainCode(
    prefix: string,
    currentCultureId?: string,
  ): { strain: string; segment: number } {
    const normalizedPrefix = (prefix || 'STR').toUpperCase();
    const maxIndex = this.cultures()
      .filter((culture) => culture.id !== currentCultureId)
      .reduce((max, culture) => {
        const parsed = this.parseStrainCode(culture.strain);
        if (parsed.prefix !== normalizedPrefix) {
          return max;
        }
        return Math.max(max, parsed.index);
      }, 0);

    const nextIndex = maxIndex + 1;
    return {
      strain: `${normalizedPrefix}-${nextIndex}`,
      segment: nextIndex,
    };
  }

  /**
   * Suggests strain code and segment for a child culture.
   * - For 'collecting_spores' relationships: increments segment by 1
   * - For other relationships: inherits parent's strain and segment
   */
  suggestChildStrainCode(
    parentId: string,
    childType: CultureType,
    relationshipType: RelationshipType | string,
  ): { strain: string; segment: number } {
    const parent = this.cultures().find((culture) => culture.id === parentId);
    if (!parent) {
      return { strain: 'STR-1', segment: 1 };
    }

    // Check if this is a spore collection (sexual reproduction / filial generation change)
    const isCollectingSpores =
      relationshipType === RelationshipType.COLLECTING_SPORES;

    if (isCollectingSpores) {
      // Increment the strain segment for new filial generation
      const parentPrefix = this.extractStrainPrefix(parent.strain);
      const newSegment = (parent.strainSegment || 1) + 1;
      return {
        strain: `${parentPrefix}-${newSegment}`,
        segment: newSegment,
      };
    }

    // For all other relationships, inherit parent's strain and segment
    return {
      strain: parent.strain,
      segment: parent.strainSegment || 1,
    };
  }

  suggestTypeToken(params: {
    type: CultureType;
    parentId?: string;
    relationshipType?: RelationshipType | string;
    currentCultureId?: string;
    currentLabel?: string;
  }): string {
    const abbreviation = getCultureTypeAbbreviation(params.type);

    if (params.currentLabel) {
      const existingToken = this.extractTypeTokenFromLabel(
        params.currentLabel,
        params.type,
      );
      if (existingToken) {
        return existingToken;
      }
    }

    const isTransfer =
      params.relationshipType === RelationshipType.TRANSFER &&
      this.isTransferNumberingType(params.type) &&
      !!params.parentId;

    if (isTransfer && params.parentId) {
      const parent = this.cultures().find(
        (culture) => culture.id === params.parentId,
      );
      const parentToken = parent
        ? this.extractTypeTokenFromLabel(parent.label, params.type)
        : null;

      if (parentToken) {
        return this.getNextTransferToken(
          params.parentId,
          params.type,
          parentToken,
        );
      }
    }

    return this.getNextBaseToken(
      params.type,
      params.parentId,
      params.currentCultureId,
    );
  }

  extractTypeTokenFromLabel(label: string, type: CultureType): string | null {
    const abbreviation = getCultureTypeAbbreviation(type);
    const escapedAbbreviation = abbreviation.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&',
    );
    const regex = new RegExp(`(^|-)(${escapedAbbreviation}[A-Z0-9]+)-`);
    const match = label.match(regex);
    return match ? match[2] : null;
  }

  // New: Update filters
  updateFilters(filters: Partial<FilterOptions>): void {
    this.filters.update((currentFilters) => ({
      ...currentFilters,
      ...filters,
    }));
  }

  // New: Reset filters to default
  resetFilters(): void {
    this.filters.set({
      strain: '',
      type: '',
      filialGeneration: '',
      showArchived: false,
      showContaminated: true,
      showClean: true,
      minViability: 0,
    });
  }

  exportDataAsJson(): string {
    return JSON.stringify(this.buildPersistedData(), null, 2);
  }

  importDataFromJson(raw: string): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error('Invalid JSON format');
    }

    const normalized = this.normalizeImportedData(parsed);
    this.cultures.set(normalized.cultures);
    this.relationships.set(normalized.relationships);
    this.strains.set(normalized.strains);
    this.filters.set(normalized.filters);
    this.selectedNodeId.set(normalized.selectedNodeId);
    this.saveToStorage();
  }

  // New: Apply filters to cultures
  private applyFilters(cultures: Culture[], filters: FilterOptions): Culture[] {
    return cultures.filter((culture) => {
      // Filter by strain
      if (filters.strain && culture.strain !== filters.strain) {
        return false;
      }

      // Filter by type
      if (filters.type && culture.type !== filters.type) {
        return false;
      }

      // Filter by filial generation (partial match)
      if (
        filters.filialGeneration &&
        !culture.filialGeneration.includes(filters.filialGeneration)
      ) {
        return false;
      }

      // Filter by archived status
      if (!filters.showArchived && culture.metadata?.isArchived) {
        return false;
      }

      // Filter by contamination status
      const isContaminated = culture.metadata?.isContaminated || false;
      if (!filters.showContaminated && isContaminated) {
        return false;
      }
      if (!filters.showClean && !isContaminated) {
        return false;
      }

      // Filter by minimum viability
      if (
        filters.minViability > 0 &&
        (culture.metadata?.viability || 0) < filters.minViability
      ) {
        return false;
      }

      return true;
    });
  }

  // CRUD operations
  addCulture(culture: Omit<Culture, 'id'>): Culture {
    const newCulture = {
      ...culture,
      id: uuidv4(),
      strainSegment: culture.strainSegment || 1, // Ensure strainSegment is set
      metadata: {
        ...culture.metadata,
        isArchived: culture.metadata?.isArchived ?? false,
      },
    } as Culture;

    const current = this.cultures();
    this.cultures.set([...current, newCulture]);
    return newCulture;
  }

  updateCulture(id: string, updates: Partial<Culture>): void {
    const current = this.cultures();
    const index = current.findIndex((c) => c.id === id);
    if (index !== -1) {
      const updated = [...current];
      const oldCulture = updated[index];
      updated[index] = { ...updated[index], ...updates };

      // If strain prefix changed (species/family changed), propagate to descendants
      const oldPrefix = this.extractStrainPrefix(oldCulture.strain);
      const newPrefix = updates.strain
        ? this.extractStrainPrefix(updates.strain)
        : oldPrefix;

      if (newPrefix !== oldPrefix && updates.strain) {
        this.propagateStrainPrefixChange(id, newPrefix, updated);
      }

      this.cultures.set(updated);
    }
  }

  /**
   * Propagates strain prefix changes to all descendants.
   * Maintains +1 increment for each spore-based generation.
   */
  private propagateStrainPrefixChange(
    nodeId: string,
    newPrefix: string,
    cultures: Culture[],
  ): void {
    const relationships = this.relationships();
    const children = relationships.filter((r) => r.sourceId === nodeId);

    children.forEach((rel) => {
      const childIndex = cultures.findIndex((c) => c.id === rel.targetId);
      if (childIndex !== -1) {
        const child = cultures[childIndex];
        const isCollectingSpores =
          rel.type === RelationshipType.COLLECTING_SPORES;

        // Update child's strain with new prefix, keeping the same segment logic
        cultures[childIndex] = {
          ...child,
          strain: `${newPrefix}-${child.strainSegment}`,
        };

        // Recursively update descendants
        this.propagateStrainPrefixChange(rel.targetId, newPrefix, cultures);
      }
    });
  }

  deleteCulture(id: string): void {
    const current = this.cultures();
    this.cultures.set(current.filter((c) => c.id !== id));

    // Also remove relationships involving this culture
    const rels = this.relationships();
    this.relationships.set(
      rels.filter((r) => r.sourceId !== id && r.targetId !== id),
    );
  }

  addRelationship(relationship: Omit<Relationship, 'id'>): Relationship {
    const newRelationship = {
      ...relationship,
      id: uuidv4(),
    } as Relationship;

    const current = this.relationships();
    this.relationships.set([...current, newRelationship]);
    return newRelationship;
  }

  updateRelationship(id: string, updates: Partial<Relationship>): void {
    const current = this.relationships();
    const index = current.findIndex((r) => r.id === id);
    if (index !== -1) {
      const updated = [...current];
      updated[index] = { ...updated[index], ...updates };
      this.relationships.set(updated);
    }
  }

  deleteRelationship(id: string): void {
    const current = this.relationships();
    this.relationships.set(current.filter((r) => r.id !== id));
  }

  getChildren(parentId: string): Culture[] {
    const rels = this.relationships();
    const childIds = rels
      .filter((r) => r.sourceId === parentId)
      .map((r) => r.targetId);

    const cultures = this.cultures();
    return cultures.filter((c) => childIds.includes(c.id));
  }

  getParent(childId: string): Culture | undefined {
    const rels = this.relationships();
    const parentRel = rels.find((r) => r.targetId === childId);
    if (!parentRel) return undefined;

    const cultures = this.cultures();
    return cultures.find((c) => c.id === parentRel.sourceId);
  }

  getParentRelationship(childId: string): Relationship | undefined {
    const rels = this.relationships();
    return rels.find((r) => r.targetId === childId);
  }

  getAncestors(nodeId: string): Culture[] {
    const ancestors: Culture[] = [];
    let currentId = nodeId;
    const cultures = this.cultures();

    while (true) {
      const parent = this.getParent(currentId);
      if (!parent) break;
      ancestors.unshift(parent);
      currentId = parent.id;
    }

    return ancestors;
  }

  getDescendants(nodeId: string): Culture[] {
    const descendants: Culture[] = [];
    const toVisit = [nodeId];
    const visited = new Set<string>();
    const cultures = this.cultures();

    while (toVisit.length > 0) {
      const currentId = toVisit.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const children = this.getChildren(currentId);
      descendants.push(...children);
      toVisit.push(...children.map((c) => c.id));
    }

    return descendants;
  }

  setSelectedNode(nodeId: string | null): void {
    this.selectedNodeId.set(nodeId);
  }

  archiveCulture(id: string): void {
    this.updateCulture(id, {
      metadata: {
        ...this.cultures().find((c) => c.id === id)?.metadata,
        isArchived: true,
      },
    });
  }

  restoreCulture(id: string): void {
    this.updateCulture(id, {
      metadata: {
        ...this.cultures().find((c) => c.id === id)?.metadata,
        isArchived: false,
      },
    });
  }

  // TODO: Remove when done testing.
  private loadSampleData(): void {
    const strains: Strain[] = strainsExample;
    const cultures: Culture[] = culturesExample;
    const relationships: Relationship[] = relationshipsExample;

    this.cultures.set(cultures);
    this.relationships.set(relationships);
    this.strains.set(strains);
  }

  // Search functionality
  searchCultures(query: string): Observable<Culture[]> {
    return this.cultures$.pipe(
      map((cultures) =>
        cultures.filter(
          (culture) =>
            culture.label.toLowerCase().includes(query.toLowerCase()) ||
            culture.description?.toLowerCase().includes(query.toLowerCase()) ||
            culture.notes?.toLowerCase().includes(query.toLowerCase()),
        ),
      ),
    );
  }

  // Statistics
  getCultureStats(): Observable<{
    total: number;
    byType: Record<string, number>;
    byStrain: Record<string, number>;
    archived: number;
  }> {
    return this.cultures$.pipe(
      map((cultures) => {
        const stats = {
          total: cultures.length,
          byType: {} as Record<string, number>,
          byStrain: {} as Record<string, number>,
          archived: cultures.filter((c) => c.metadata?.isArchived).length,
        };

        cultures.forEach((culture) => {
          // Count by type
          stats.byType[culture.type] = (stats.byType[culture.type] || 0) + 1;

          // Count by strain
          if (culture.strain) {
            stats.byStrain[culture.strain] =
              (stats.byStrain[culture.strain] || 0) + 1;
          }
        });

        return stats;
      }),
    );
  }

  private setupAutoPersistence(): void {
    effect(
      () => {
        this.cultures();
        this.relationships();
        this.strains();
        this.filters();
        this.selectedNodeId();
        this.saveToStorage();
      },
      { injector: this.injector },
    );
  }

  private loadFromStorage(): boolean {
    const raw = this.readStorage();
    if (!raw) {
      return false;
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      const normalized = this.normalizeImportedData(parsed);
      this.cultures.set(normalized.cultures);
      this.relationships.set(normalized.relationships);
      this.strains.set(normalized.strains);
      this.filters.set(normalized.filters);
      this.selectedNodeId.set(normalized.selectedNodeId);
      return true;
    } catch {
      return false;
    }
  }

  private saveToStorage(): void {
    try {
      if (typeof localStorage === 'undefined') {
        return;
      }
      localStorage.setItem(this.STORAGE_KEY, this.exportDataAsJson());
    } catch {
      // Ignore storage errors (quota/private mode) to keep app usable.
    }
  }

  private readStorage(): string | null {
    try {
      if (typeof localStorage === 'undefined') {
        return null;
      }
      return localStorage.getItem(this.STORAGE_KEY);
    } catch {
      return null;
    }
  }

  private buildPersistedData(): PersistedData {
    return {
      version: 1,
      cultures: this.cultures(),
      relationships: this.relationships(),
      strains: this.strains(),
      filters: this.filters(),
      selectedNodeId: this.selectedNodeId(),
    };
  }

  private normalizeImportedData(input: unknown): PersistedData {
    if (!input || typeof input !== 'object') {
      throw new Error('JSON root must be an object');
    }

    const data = input as Partial<PersistedData>;
    if (
      !Array.isArray(data.cultures) ||
      !Array.isArray(data.relationships) ||
      !Array.isArray(data.strains)
    ) {
      throw new Error(
        'JSON must include cultures, relationships, and strains arrays',
      );
    }

    const cultures = data.cultures.map((culture) => ({
      ...culture,
      dateCreated: new Date(culture.dateCreated),
      strainSegment: culture.strainSegment || 1, // Ensure strainSegment is set for legacy data
      metadata: {
        ...culture.metadata,
        isArchived: culture.metadata?.isArchived ?? false,
      },
    })) as Culture[];

    const strains = data.strains.map((strain) => ({
      ...strain,
      dateAcquired: new Date(strain.dateAcquired),
    })) as Strain[];

    if (
      cultures.some(
        (culture) =>
          !culture.id ||
          !culture.label ||
          !culture.type ||
          Number.isNaN(culture.dateCreated.getTime()),
      )
    ) {
      throw new Error('Invalid culture entries in JSON');
    }

    if (
      strains.some(
        (strain) =>
          !strain.id ||
          !strain.species ||
          Number.isNaN(strain.dateAcquired.getTime()),
      )
    ) {
      throw new Error('Invalid strain entries in JSON');
    }

    const cultureIds = new Set(cultures.map((culture) => culture.id));
    const relationships = data.relationships as Relationship[];

    if (
      relationships.some(
        (relationship) =>
          !relationship.id ||
          !relationship.sourceId ||
          !relationship.targetId ||
          !relationship.type,
      )
    ) {
      throw new Error('Invalid relationship entries in JSON');
    }

    if (
      relationships.some(
        (relationship) =>
          !cultureIds.has(relationship.sourceId) ||
          !cultureIds.has(relationship.targetId),
      )
    ) {
      throw new Error('Relationships reference missing culture IDs');
    }

    const filters: FilterOptions = {
      strain: data.filters?.strain ?? '',
      type: data.filters?.type ?? '',
      filialGeneration: data.filters?.filialGeneration ?? '',
      showArchived: data.filters?.showArchived ?? false,
      showContaminated: data.filters?.showContaminated ?? true,
      showClean: data.filters?.showClean ?? true,
      minViability: data.filters?.minViability ?? 0,
    };

    const selectedNodeId =
      data.selectedNodeId && cultureIds.has(data.selectedNodeId)
        ? data.selectedNodeId
        : null;

    return {
      version: 1,
      cultures,
      relationships,
      strains,
      filters,
      selectedNodeId,
    };
  }

  private isTransferNumberingType(type: CultureType): boolean {
    return (
      type === CultureType.AGAR ||
      type === CultureType.LIQUID_CULTURE ||
      type === CultureType.GRAIN_SPAWN
    );
  }

  private getNextBaseToken(
    type: CultureType,
    parentId?: string,
    currentCultureId?: string,
  ): string {
    const abbreviation = getCultureTypeAbbreviation(type);
    const treeCultureIds: Set<string> | null = parentId
      ? this.getTreeCultureIds(parentId)
      : currentCultureId
      ? this.getTreeCultureIds(currentCultureId)
      : null;
    const cultures = this.cultures()
      .filter((culture) => culture.id !== currentCultureId)
      .filter((culture) => !treeCultureIds || treeCultureIds.has(culture.id));

    const baseRegex = new RegExp(`^${abbreviation}(\\d+)$`);
    const maxIndex = cultures.reduce((max, culture) => {
      const token = this.extractTypeTokenFromLabel(culture.label, type);
      if (!token) {
        return max;
      }
      const match = token.match(baseRegex);
      if (!match) {
        return max;
      }
      return Math.max(max, Number(match[1]));
    }, 0);

    return `${abbreviation}${maxIndex + 1}`;
  }

  private getNextTransferToken(
    parentId: string,
    type: CultureType,
    parentToken: string,
  ): string {
    const lastChar = parentToken.charAt(parentToken.length - 1);
    const letterMode = /\d/.test(lastChar);
    const suffixes = this.getTransferChildSuffixes(
      parentId,
      type,
      parentToken,
      letterMode,
    );

    if (letterMode) {
      const maxLetterIndex = suffixes.reduce((max, suffix) => {
        const index = this.letterSuffixToIndex(suffix);
        return index > max ? index : max;
      }, 0);
      return `${parentToken}${this.indexToLetterSuffix(maxLetterIndex + 1)}`;
    }

    const maxNumber = suffixes.reduce((max, suffix) => {
      const parsed = Number(suffix);
      return Number.isNaN(parsed) ? max : Math.max(max, parsed);
    }, 0);
    return `${parentToken}${maxNumber + 1}`;
  }

  private getTransferChildSuffixes(
    parentId: string,
    type: CultureType,
    parentToken: string,
    letterMode: boolean,
  ): string[] {
    const relationships = this.relationships();
    const culturesById = new Map(
      this.cultures().map((culture) => [culture.id, culture]),
    );
    const suffixRegex = letterMode
      ? new RegExp(`^${parentToken}([A-Z]+)$`)
      : new RegExp(`^${parentToken}(\\d+)$`);

    return relationships
      .filter(
        (relationship) =>
          relationship.sourceId === parentId &&
          relationship.type === RelationshipType.TRANSFER,
      )
      .map((relationship) => culturesById.get(relationship.targetId))
      .filter(
        (culture): culture is Culture => !!culture && culture.type === type,
      )
      .map((culture) => this.extractTypeTokenFromLabel(culture.label, type))
      .filter((token): token is string => !!token)
      .map((token) => token.match(suffixRegex))
      .filter((match): match is RegExpMatchArray => !!match)
      .map((match) => match[1]);
  }

  private getTreeCultureIds(nodeId: string): Set<string> {
    const relationships = this.relationships();
    const rootId = this.findRootId(nodeId, relationships);
    const bySource = new Map<string, string[]>();

    relationships.forEach((relationship) => {
      const children = bySource.get(relationship.sourceId) ?? [];
      children.push(relationship.targetId);
      bySource.set(relationship.sourceId, children);
    });

    const visited = new Set<string>();
    const queue = [rootId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) {
        continue;
      }
      visited.add(current);
      const children = bySource.get(current) ?? [];
      children.forEach((childId) => {
        if (!visited.has(childId)) {
          queue.push(childId);
        }
      });
    }

    return visited;
  }

  private findRootId(nodeId: string, relationships: Relationship[]): string {
    const incomingByTarget = new Map<string, string>();
    relationships.forEach((relationship) => {
      if (!incomingByTarget.has(relationship.targetId)) {
        incomingByTarget.set(relationship.targetId, relationship.sourceId);
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

  private letterSuffixToIndex(input: string): number {
    let index = 0;
    for (let i = 0; i < input.length; i += 1) {
      const code = input.charCodeAt(i) - 64;
      if (code < 1 || code > 26) {
        return 0;
      }
      index = index * 26 + code;
    }
    return index;
  }

  private indexToLetterSuffix(index: number): string {
    let value = index;
    let output = '';
    while (value > 0) {
      value -= 1;
      const char = String.fromCharCode(65 + (value % 26));
      output = `${char}${output}`;
      value = Math.floor(value / 26);
    }
    return output || 'A';
  }

  private extractStrainPrefix(strainCode: string): string {
    return this.parseStrainCode(strainCode).prefix;
  }

  private parseStrainCode(strainCode: string): {
    prefix: string;
    index: number;
  } {
    const normalized = (strainCode || '').toUpperCase().trim();
    const match = normalized.match(/^([A-Z]+(?:-[A-Z]+)?)(?:-(\d+))?$/);
    if (!match) {
      return { prefix: normalized || 'STR', index: 0 };
    }
    return {
      prefix: match[1],
      index: match[2] ? Number(match[2]) : 0,
    };
  }
}
