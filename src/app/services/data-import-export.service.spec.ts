import { TestBed } from '@angular/core/testing';
import { CulturePersistenceService } from './data-import-export.service';
import {
  APP_EXPORT_JSON,
  CULTURE_SERVICE_TREE_CULTURES,
  CULTURE_SERVICE_VALID_IMPORT_PAYLOAD,
} from '../../testing/mocks';
import { RelationshipType } from '../models/culture.model';

describe('CulturePersistenceService', () => {
  let service: CulturePersistenceService;
  const storageKey = 'mycology-genetics-tracker-data-v1';

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [CulturePersistenceService] });
    service = TestBed.inject(CulturePersistenceService);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ─── createExportPackage ───────────────────────────────────────────────────

  describe('createExportPackage', () => {
    it('returns a blob and filename for valid JSON', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-01-02T03:04:05.678Z'));

      const result = service.createExportPackage(APP_EXPORT_JSON);

      expect(result.filename).toBe(
        'mycology-data-2025-01-02T03-04-05-678Z.json',
      );
      expect(result.blob.type).toBe('application/json');
      await expect(result.blob.text()).resolves.toBe(APP_EXPORT_JSON);
    });

    it('throws when json is null/undefined', () => {
      expect(() =>
        service.createExportPackage(null as unknown as string),
      ).toThrow('Export data unavailable');
    });

    it('throws when json is an empty string', () => {
      expect(() => service.createExportPackage('')).toThrow(
        'Export data is empty',
      );
    });
  });

  // ─── importFromFile ────────────────────────────────────────────────────────

  describe('importFromFile', () => {
    const makeFileReaderMock = (result: string) => ({
      readAsText: vi.fn(),
      onload: null as null | (() => void),
      onerror: null as null | (() => void),
      result,
    });

    it('returns PersistedData from a valid JSON file', async () => {
      const validJson = JSON.stringify(CULTURE_SERVICE_VALID_IMPORT_PAYLOAD);
      const file = new File([validJson], 'data.json', {
        type: 'application/json',
      });
      const mock = makeFileReaderMock(validJson);
      vi.spyOn(window, 'FileReader').mockImplementation(function () {
        return mock;
      } as unknown as typeof FileReader);

      const promise = service.importFromFile(file);
      mock.onload?.();
      const result = await promise;

      expect(result.cultures).toHaveLength(
        CULTURE_SERVICE_TREE_CULTURES.length,
      );
      expect(result.selectedNodeId).toBe('childA');
    });

    it('throws when no file is provided', async () => {
      await expect(
        service.importFromFile(undefined as unknown as File),
      ).rejects.toThrow('No file selected');
    });

    it('throws when the file is empty', async () => {
      const file = new File([''], 'empty.json', { type: 'application/json' });
      await expect(service.importFromFile(file)).rejects.toThrow(
        'Import file is empty',
      );
    });

    it('throws when CSV import is attempted', async () => {
      const file = new File(['id,name'], 'data.csv', { type: 'text/csv' });
      await expect(service.importFromFile(file)).rejects.toThrow(
        'CSV import is not supported',
      );
    });

    it('throws when JSON is malformed', async () => {
      const file = new File(['{invalid'], 'bad.json', {
        type: 'application/json',
      });
      const mock = makeFileReaderMock('{invalid');
      vi.spyOn(window, 'FileReader').mockImplementation(function () {
        return mock;
      } as unknown as typeof FileReader);

      const promise = service.importFromFile(file);
      mock.onload?.();

      await expect(promise).rejects.toThrow('Invalid JSON format');
    });

    it('throws when file reading fails', async () => {
      const file = new File([APP_EXPORT_JSON], 'data.json', {
        type: 'application/json',
      });
      const mock = makeFileReaderMock(APP_EXPORT_JSON);
      vi.spyOn(window, 'FileReader').mockImplementation(function () {
        return mock;
      } as unknown as typeof FileReader);

      const promise = service.importFromFile(file);
      mock.onerror?.();

      await expect(promise).rejects.toThrow('Failed to read file');
    });
  });

  // ─── serialize ────────────────────────────────────────────────────────────

  describe('serialize', () => {
    it('returns a JSON string containing the persisted data', () => {
      const json = service.serialize(
        CULTURE_SERVICE_VALID_IMPORT_PAYLOAD as Parameters<
          typeof service.serialize
        >[0],
      );
      const parsed = JSON.parse(json) as { version: number };
      expect(parsed.version).toBe(1);
    });
  });

  // ─── deserialize ─────────────────────────────────────────────────────────

  describe('deserialize', () => {
    it('normalizes and returns valid PersistedData', () => {
      const result = service.deserialize(
        JSON.stringify(CULTURE_SERVICE_VALID_IMPORT_PAYLOAD),
      );
      expect(result.cultures).toHaveLength(
        CULTURE_SERVICE_TREE_CULTURES.length,
      );
      expect(result.selectedNodeId).toBe('childA');
    });

    it('converts dateCreated strings to Date objects', () => {
      const result = service.deserialize(
        JSON.stringify(CULTURE_SERVICE_VALID_IMPORT_PAYLOAD),
      );
      expect(result.cultures[0].dateCreated).toBeInstanceOf(Date);
    });

    it('sets selectedNodeId to null when it references a missing culture', () => {
      const result = service.deserialize(
        JSON.stringify({
          ...CULTURE_SERVICE_VALID_IMPORT_PAYLOAD,
          selectedNodeId: 'missing-node',
        }),
      );
      expect(result.selectedNodeId).toBeNull();
    });

    it('throws on non-JSON string', () => {
      expect(() => service.deserialize('not-json')).toThrow(
        'Invalid JSON format',
      );
    });

    it('throws when cultures array is missing', () => {
      expect(() =>
        service.deserialize(JSON.stringify({ cultures: [] })),
      ).toThrow('cultures, relationships, and strains arrays');
    });

    it('throws for invalid relationship references', () => {
      expect(() =>
        service.deserialize(
          JSON.stringify({
            ...CULTURE_SERVICE_VALID_IMPORT_PAYLOAD,
            relationships: [
              {
                id: 'bad',
                sourceId: 'root',
                targetId: 'missing',
                type: RelationshipType.TRANSFER,
              },
            ],
          }),
        ),
      ).toThrow('Relationships reference missing culture IDs');
    });
  });

  // ─── saveToStorage ────────────────────────────────────────────────────────

  describe('saveToStorage', () => {
    it('writes serialized data to localStorage under the correct key', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      service.saveToStorage(
        CULTURE_SERVICE_VALID_IMPORT_PAYLOAD as Parameters<
          typeof service.saveToStorage
        >[0],
      );
      expect(setItemSpy).toHaveBeenCalledWith(storageKey, expect.any(String));
    });

    it('silently swallows quota exceeded errors', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('QuotaExceededError');
      });
      expect(() =>
        service.saveToStorage(
          CULTURE_SERVICE_VALID_IMPORT_PAYLOAD as Parameters<
            typeof service.saveToStorage
          >[0],
        ),
      ).not.toThrow();
    });
  });

  // ─── readStorage ─────────────────────────────────────────────────────────

  describe('readStorage', () => {
    it('returns the stored JSON string', () => {
      localStorage.setItem(storageKey, APP_EXPORT_JSON);
      expect(service.readStorage()).toBe(APP_EXPORT_JSON);
    });

    it('returns null when nothing is stored', () => {
      expect(service.readStorage()).toBeNull();
    });

    it('returns null when localStorage throws', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Storage unavailable');
      });
      expect(service.readStorage()).toBeNull();
    });
  });

  // ─── loadFromStorage ─────────────────────────────────────────────────────

  describe('loadFromStorage', () => {
    it('returns PersistedData when valid JSON is stored', () => {
      localStorage.setItem(
        storageKey,
        JSON.stringify(CULTURE_SERVICE_VALID_IMPORT_PAYLOAD),
      );
      const result = service.loadFromStorage();
      expect(result?.cultures).toHaveLength(
        CULTURE_SERVICE_TREE_CULTURES.length,
      );
    });

    it('returns null when storage is empty', () => {
      expect(service.loadFromStorage()).toBeNull();
    });

    it('returns null when stored data is corrupt JSON', () => {
      localStorage.setItem(storageKey, 'not-valid-json{{{');
      expect(service.loadFromStorage()).toBeNull();
    });

    it('returns null when stored data fails schema validation', () => {
      localStorage.setItem(storageKey, JSON.stringify({ invalid: 'data' }));
      expect(service.loadFromStorage()).toBeNull();
    });
  });
});
