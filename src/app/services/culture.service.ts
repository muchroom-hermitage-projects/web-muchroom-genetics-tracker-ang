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
} from '../models/culture.model';
import { v4 as uuidv4 } from 'uuid';
import { STRAIN_FAMILY_OPTIONS, StrainOption } from '../models/strains.model';
import {
  culturesExample,
  relationshipsExample,
  strainsExample,
} from '../../assets/documents/example-culture-data';
import { environment } from '../../environments/environment';
import { CulturePersistenceService } from './data-import-export.service';
import {
  extractStrainPrefix,
  suggestNextStrainCode as utilSuggestNextStrainCode,
  suggestChildStrainCode as utilSuggestChildStrainCode,
  extractTypeTokenFromLabel as utilExtractTypeTokenFromLabel,
  isTransferNumberingType,
  getNextBaseToken as utilGetNextBaseToken,
  getNextTransferToken as utilGetNextTransferToken,
} from '../utils/culture-suggestion.util';

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
  private readonly persistenceService = inject(CulturePersistenceService);
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
    const savedData = this.persistenceService.loadFromStorage();
    if (savedData) {
      this.applyImportedData(savedData);
    } else if (!environment.production) {
      // TODO: Remove when done testing.
      this.loadSampleData();
    }
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
      const prefix = extractStrainPrefix(strain.id);
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
    return utilSuggestNextStrainCode(this.cultures(), prefix, currentCultureId);
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
    return utilSuggestChildStrainCode(
      this.cultures(),
      parentId,
      relationshipType,
    );
  }

  suggestTypeToken(params: {
    type: CultureType;
    parentId?: string;
    relationshipType?: RelationshipType | string;
    currentCultureId?: string;
    currentLabel?: string;
  }): string {
    if (params.currentLabel) {
      const existingToken = utilExtractTypeTokenFromLabel(
        params.currentLabel,
        params.type,
      );
      if (existingToken) {
        return existingToken;
      }
    }

    const isTransfer =
      params.relationshipType === RelationshipType.TRANSFER &&
      isTransferNumberingType(params.type) &&
      !!params.parentId;

    if (isTransfer && params.parentId) {
      const parent = this.cultures().find((c) => c.id === params.parentId);
      const parentToken = parent
        ? utilExtractTypeTokenFromLabel(parent.label, params.type)
        : null;
      if (parentToken) {
        return utilGetNextTransferToken(
          params.parentId,
          params.type,
          parentToken,
          this.cultures(),
          this.relationships(),
        );
      }
    }

    return utilGetNextBaseToken(
      params.type,
      this.cultures(),
      params.currentCultureId,
      this.relationships(),
      params.parentId,
    );
  }

  extractTypeTokenFromLabel(label: string, type: CultureType): string | null {
    return utilExtractTypeTokenFromLabel(label, type);
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
    return this.persistenceService.serialize(this.buildPersistedData());
  }

  importDataFromJson(raw: string): void {
    const normalized = this.persistenceService.deserialize(raw);
    this.applyImportedData(normalized);
  }

  applyImportedData(data: PersistedData): void {
    this.cultures.set(data.cultures);
    this.relationships.set(data.relationships);
    this.strains.set(data.strains);
    this.filters.set(data.filters);
    this.selectedNodeId.set(data.selectedNodeId);
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
      const oldPrefix = extractStrainPrefix(oldCulture.strain);
      const newPrefix = updates.strain
        ? extractStrainPrefix(updates.strain)
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

  deleteCultureTree(nodeId: string | null | undefined): void {
    if (!nodeId) {
      return;
    }

    const cultures = this.cultures();
    if (!cultures.some((culture) => culture.id === nodeId)) {
      return;
    }

    const descendants = this.getDescendants(nodeId);
    const idsToRemove = new Set<string>([
      nodeId,
      ...descendants.map((culture) => culture.id),
    ]);

    this.cultures.set(
      cultures.filter((culture) => !idsToRemove.has(culture.id)),
    );

    const relationships = this.relationships();
    this.relationships.set(
      relationships.filter(
        (rel) =>
          !idsToRemove.has(rel.sourceId) && !idsToRemove.has(rel.targetId),
      ),
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
    const seen = new Set<string>([nodeId]);

    while (toVisit.length > 0) {
      const currentId = toVisit.shift()!;
      const children = this.getChildren(currentId);
      for (const child of children) {
        if (!seen.has(child.id)) {
          seen.add(child.id);
          descendants.push(child);
          toVisit.push(child.id);
        }
      }
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
        this.persistenceService.saveToStorage(this.buildPersistedData());
      },
      { injector: this.injector },
    );
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
}
