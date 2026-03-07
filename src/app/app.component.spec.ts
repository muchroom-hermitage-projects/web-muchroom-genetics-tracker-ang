import { ComponentFixture, TestBed, fakeAsync } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CultureService } from './services/culture.service';
import { NodeModalComponent } from './components/node-modal/node-modal.component';
import { AboutModalComponent } from './components/about-modal/about-modal.component';
import { CultureType } from './models/culture.model';
import { APP_ADD_ROOT_MODAL_RESULT, APP_EXPORT_JSON } from '../testing/mocks';

const matDialogMock = {
  open: vi.fn().mockReturnValue({
    afterClosed: () => of(null),
  }),
};
const snackBarMock = {
  open: vi.fn(),
};
const cultureServiceMock = {
  addCulture: vi.fn(),
  exportDataAsJson: vi.fn().mockReturnValue(APP_EXPORT_JSON),
  importDataFromJson: vi.fn(),
};

describe('AppComponent', () => {
  let component: AppComponent;
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(async () => {
    matDialogMock.open.mockReturnValue({
      afterClosed: () => of(null),
    });
    matDialogMock.open.mockClear();
    snackBarMock.open.mockClear();
    cultureServiceMock.addCulture.mockClear();
    cultureServiceMock.exportDataAsJson.mockClear();
    cultureServiceMock.importDataFromJson.mockClear();

    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule,
        MatToolbarModule,
        MatButtonModule,
        MatIconModule,
        MatMenuModule,
        MatDividerModule,
        MatSidenavModule,
        MatListModule,
        NoopAnimationsModule,
      ],
      declarations: [AppComponent],
      providers: [
        { provide: MatDialog, useValue: matDialogMock },
        { provide: MatSnackBar, useValue: snackBarMock },
        { provide: CultureService, useValue: cultureServiceMock },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Reset the ProxyZone state
    // (globalThis as any).Zone?.current.get('FakeAsyncTestZoneSpec')?.reset();
  });

  it('should create the app', fakeAsync(() => {
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  }));

  it(`should have as title 'mycology-genetics-tracker'`, () => {
    const app = fixture.componentInstance;
    expect(app.title).toEqual('mycology-genetics-tracker');
  });

  it('should render toolbar title', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('mat-toolbar')?.textContent).toContain(
      'Mycology Genetics Tracker',
    );
  });

  describe('addRootCulture', () => {
    it('should open NodeModalComponent with correct data', () => {
      component = fixture.componentInstance;

      component.addRootCulture();

      expect(matDialogMock.open).toHaveBeenCalledWith(NodeModalComponent, {
        width: '500px',
        data: {
          culture: expect.objectContaining({
            label: '',
            type: CultureType.SPORE,
            strain: '',
            filialGeneration: 'F0',
            description: '',
            notes: '',
          }),
          isNew: true,
        },
      });
    });

    it('should add culture when dialog returns result', () => {
      component = fixture.componentInstance;

      matDialogMock.open.mockReturnValue({
        afterClosed: () => of(APP_ADD_ROOT_MODAL_RESULT),
      });

      component.addRootCulture();

      expect(cultureServiceMock.addCulture).toHaveBeenCalledWith(
        APP_ADD_ROOT_MODAL_RESULT.updates,
      );
    });

    it('should not add culture when dialog is cancelled', () => {
      component = fixture.componentInstance;

      matDialogMock.open.mockReturnValue({ afterClosed: () => of(null) });

      component.addRootCulture();

      expect(cultureServiceMock.addCulture).not.toHaveBeenCalled();
    });
  });

  describe('exportData', () => {
    let createElementSpy: vi.SpyInstance;
    let mockAnchor: any;

    beforeEach(() => {
      mockAnchor = {
        click: vi.fn(),
        setAttribute: vi.fn(),
        href: '',
        download: '',
      };
      createElementSpy = vi
        .spyOn(document, 'createElement')
        .mockReturnValue(mockAnchor);
      // vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url');
      // vi.spyOn(URL, 'revokeObjectURL');
      URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
      URL.revokeObjectURL = vi.fn();
    });

    it('should export data and trigger download', () => {
      // Create component directly with mocks to avoid Material DOM issues
      component = new AppComponent(
        matDialogMock as any,
        cultureServiceMock as any,
        snackBarMock as any,
      );

      component.exportData();

      expect(cultureServiceMock.exportDataAsJson).toHaveBeenCalled();
      expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(mockAnchor.download).toContain('mycology-data-');
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    it('should show success snackbar after export', () => {
      component.exportData();

      expect(snackBarMock.open).toHaveBeenCalledWith('Data exported', 'Close', {
        duration: 2500,
      });
    });
  });

  describe('importData', () => {
    it('should trigger file input click', () => {
      component = fixture.componentInstance;

      const mockFileInput = { click: vi.fn() } as any;

      component.importData(mockFileInput);

      expect(mockFileInput.click).toHaveBeenCalled();
    });
  });

  describe('onImportFileSelected', () => {
    let mockFile: File;
    let mockFileReader: any;

    beforeEach(() => {
      mockFile = new File(['{"test":"data"}'], 'test.json', {
        type: 'application/json',
      });

      mockFileReader = {
        readAsText: vi.fn(function (this: any) {
          // This allows the component to attach its listener before we trigger it
        }),
        onload: null,
        onerror: null,
        result: '{"test":"data"}',
      };

      vi.spyOn(window, 'FileReader').mockReturnValue(mockFileReader as any);
    });

    it('should return early if no file is selected', () => {
      component = fixture.componentInstance;

      const mockEvent = {
        target: { files: [] },
      } as any;

      component.onImportFileSelected(mockEvent);

      expect(cultureServiceMock.importDataFromJson).not.toHaveBeenCalled();
    });

    it('should import data and show success snackbar on successful import', () => {
      component = fixture.componentInstance;

      // Reset the spy before this test
      cultureServiceMock.importDataFromJson.mockClear();
      cultureServiceMock.importDataFromJson.mockImplementation(() => {});

      const mockEvent = {
        target: { files: [mockFile], value: 'test.json' },
      } as any;

      component.onImportFileSelected(mockEvent);

      // Trigger the onload callback
      mockFileReader.onload();

      expect(cultureServiceMock.importDataFromJson).toHaveBeenCalledWith(
        '{"test":"data"}',
      );
      expect(snackBarMock.open).toHaveBeenCalledWith('Data imported', 'Close', {
        duration: 2500,
      });
      expect(mockEvent.target.value).toBe('');
    });

    it('should show error snackbar on import failure', () => {
      component = fixture.componentInstance;

      // Reset and reconfigure the spy for this test
      cultureServiceMock.importDataFromJson.mockClear();
      cultureServiceMock.importDataFromJson.mockImplementation(() => {
        throw new Error('Invalid JSON');
      });

      const mockEvent = {
        target: { files: [mockFile], value: 'test.json' },
      } as any;

      component.onImportFileSelected(mockEvent);

      // Trigger the onload callback
      mockFileReader.onload();

      expect(snackBarMock.open).toHaveBeenCalledWith(
        'Import failed: Invalid JSON',
        'Close',
        { duration: 5000 },
      );
      expect(mockEvent.target.value).toBe('');
    });

    it('should show error snackbar on file read error', () => {
      component = fixture.componentInstance;

      const mockEvent = {
        target: { files: [mockFile], value: 'test.json' },
      } as any;

      component.onImportFileSelected(mockEvent);

      // Trigger the onerror callback
      mockFileReader.onerror();

      expect(snackBarMock.open).toHaveBeenCalledWith(
        'Failed to read file',
        'Close',
        { duration: 5000 },
      );
      expect(mockEvent.target.value).toBe('');
    });
  });

  describe('showAbout', () => {
    it('should open AboutModalComponent', () => {
      component = fixture.componentInstance;

      component.showAbout();

      expect(matDialogMock.open).toHaveBeenCalledWith(AboutModalComponent, {
        width: '700px',
        maxWidth: '95vw',
      });
    });
  });
});

describe('AppComponent trivial run', () => {
  it('performs a smoke assertion', () => {
    expect(true).toBe(true);
  });
});
