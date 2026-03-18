import { TestBed } from '@angular/core/testing';
import { DataImportExportService } from './data-import-export.service';
import { CultureService } from './culture.service';
import { APP_EXPORT_JSON } from '../../testing/mocks';

describe('DataImportExportService', () => {
  let service: DataImportExportService;
  let cultureServiceMock: {
    exportDataAsJson: ReturnType<typeof vi.fn>;
    importDataFromJson: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    cultureServiceMock = {
      exportDataAsJson: vi.fn().mockReturnValue(APP_EXPORT_JSON),
      importDataFromJson: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        DataImportExportService,
        { provide: CultureService, useValue: cultureServiceMock },
      ],
    });

    service = TestBed.inject(DataImportExportService);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('createExportPackage', () => {
    it('returns a blob and filename for valid export data', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-01-02T03:04:05.678Z'));

      const result = service.createExportPackage();

      expect(result.filename).toBe(
        'mycology-data-2025-01-02T03-04-05-678Z.json',
      );
      expect(result.blob.type).toBe('application/json');
      await expect(result.blob.text()).resolves.toBe(APP_EXPORT_JSON);
    });

    it('throws when export data is unavailable', () => {
      cultureServiceMock.exportDataAsJson.mockReturnValue(
        undefined as unknown as string,
      );

      expect(() => service.createExportPackage()).toThrow(
        'Export data unavailable',
      );
    });

    it('throws when export data is empty', () => {
      cultureServiceMock.exportDataAsJson.mockReturnValue('');

      expect(() => service.createExportPackage()).toThrow(
        'Export data is empty',
      );
    });
  });

  describe('importFromFile', () => {
    it('imports data from a valid JSON file', async () => {
      const file = new File([APP_EXPORT_JSON], 'data.json', {
        type: 'application/json',
      });
      const mockFileReader = {
        readAsText: vi.fn(),
        onload: null as null | (() => void),
        onerror: null as null | (() => void),
        result: APP_EXPORT_JSON,
      };
      vi.spyOn(window, 'FileReader').mockImplementation(
        function () { return mockFileReader; } as unknown as typeof FileReader,
      );

      const promise = service.importFromFile(file);
      mockFileReader.onload?.();

      await promise;

      expect(cultureServiceMock.importDataFromJson).toHaveBeenCalledWith(
        APP_EXPORT_JSON,
      );
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
      const mockFileReader = {
        readAsText: vi.fn(),
        onload: null as null | (() => void),
        onerror: null as null | (() => void),
        result: '{invalid',
      };
      vi.spyOn(window, 'FileReader').mockImplementation(
        function () { return mockFileReader; } as unknown as typeof FileReader,
      );
      cultureServiceMock.importDataFromJson.mockImplementation(() => {
        throw new Error('Invalid JSON format');
      });

      const promise = service.importFromFile(file);
      mockFileReader.onload?.();

      await expect(promise).rejects.toThrow('Invalid JSON format');
    });

    it('throws when file reading fails', async () => {
      const file = new File([APP_EXPORT_JSON], 'data.json', {
        type: 'application/json',
      });
      const mockFileReader = {
        readAsText: vi.fn(),
        onload: null as null | (() => void),
        onerror: null as null | (() => void),
        result: APP_EXPORT_JSON,
      };
      vi.spyOn(window, 'FileReader').mockImplementation(
        function () { return mockFileReader; } as unknown as typeof FileReader,
      );

      const promise = service.importFromFile(file);
      mockFileReader.onerror?.();

      await expect(promise).rejects.toThrow('Failed to read file');
    });
  });
});
