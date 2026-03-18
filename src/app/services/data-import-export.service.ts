import { Injectable } from '@angular/core';
import type { PersistedData, FilterOptions } from './culture.service';
import { Culture, Relationship, Strain } from '../models/culture.model';

@Injectable({
  providedIn: 'root',
})
export class CulturePersistenceService {
  private readonly STORAGE_KEY = 'mycology-genetics-tracker-data-v1';

  // ─── File I/O ─────────────────────────────────────────────────────────────

  createExportPackage(json: string): { blob: Blob; filename: string } {
    if (json == null) {
      throw new Error('Export data unavailable');
    }
    if (!json) {
      throw new Error('Export data is empty');
    }

    const blob = new Blob([json], { type: 'application/json' });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return { blob, filename: `mycology-data-${timestamp}.json` };
  }

  async importFromFile(file: File | null | undefined): Promise<PersistedData> {
    if (!file) {
      throw new Error('No file selected');
    }
    if (file.size === 0) {
      throw new Error('Import file is empty');
    }
    if (this.isCsvFile(file)) {
      throw new Error('CSV import is not supported');
    }

    const contents = await this.readFileAsText(file);
    if (!contents) {
      throw new Error('Import file is empty');
    }

    return this.deserialize(contents);
  }

  // ─── Serialization ────────────────────────────────────────────────────────

  serialize(data: PersistedData): string {
    return JSON.stringify(data, null, 2);
  }

  deserialize(raw: string): PersistedData {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error('Invalid JSON format');
    }
    return this.normalizeData(parsed);
  }

  // ─── localStorage I/O ─────────────────────────────────────────────────────

  saveToStorage(data: PersistedData): void {
    try {
      if (typeof localStorage === 'undefined') {
        return;
      }
      localStorage.setItem(this.STORAGE_KEY, this.serialize(data));
    } catch {
      // Ignore storage errors (quota / private mode) to keep app usable.
    }
  }

  readStorage(): string | null {
    try {
      if (typeof localStorage === 'undefined') {
        return null;
      }
      return localStorage.getItem(this.STORAGE_KEY);
    } catch {
      return null;
    }
  }

  loadFromStorage(): PersistedData | null {
    const raw = this.readStorage();
    if (!raw) {
      return null;
    }
    try {
      return this.deserialize(raw);
    } catch {
      return null;
    }
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private normalizeData(input: unknown): PersistedData {
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

    const cultures = data.cultures.map((c) => ({
      ...c,
      dateCreated: new Date(c.dateCreated),
      strainSegment: c.strainSegment || 1,
      metadata: { ...c.metadata, isArchived: c.metadata?.isArchived ?? false },
    })) as Culture[];

    const strains = data.strains.map((s) => ({
      ...s,
      dateAcquired: new Date(s.dateAcquired),
    })) as Strain[];

    if (
      cultures.some(
        (c) =>
          !c.id || !c.label || !c.type || Number.isNaN(c.dateCreated.getTime()),
      )
    ) {
      throw new Error('Invalid culture entries in JSON');
    }

    if (
      strains.some(
        (s) => !s.id || !s.species || Number.isNaN(s.dateAcquired.getTime()),
      )
    ) {
      throw new Error('Invalid strain entries in JSON');
    }

    const relationships = data.relationships as Relationship[];
    if (
      relationships.some((r) => !r.id || !r.sourceId || !r.targetId || !r.type)
    ) {
      throw new Error('Invalid relationship entries in JSON');
    }

    const cultureIds = new Set(cultures.map((c) => c.id));
    if (
      relationships.some(
        (r) => !cultureIds.has(r.sourceId) || !cultureIds.has(r.targetId),
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

  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  private isCsvFile(file: File): boolean {
    const name = file.name.toLowerCase();
    return name.endsWith('.csv') || file.type.includes('csv');
  }
}
