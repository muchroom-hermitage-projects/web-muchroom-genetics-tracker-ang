import { TestBed } from '@angular/core/testing';
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

const matDialogMock = {
  open: jasmine
    .createSpy('open')
    .and.returnValue({ afterClosed: () => of(null) }),
};
const snackBarMock = {
  open: jasmine.createSpy('open'),
};
const cultureServiceMock = {
  addCulture: jasmine.createSpy('addCulture'),
  exportDataAsJson: jasmine
    .createSpy('exportDataAsJson')
    .and.returnValue('{"test":"data"}'),
  importDataFromJson: jasmine.createSpy('importDataFromJson'),
};

describe('AppComponent', () => {
  let component: AppComponent;

  beforeEach(async () => {
    matDialogMock.open.calls.reset();
    snackBarMock.open.calls.reset();
    cultureServiceMock.addCulture.calls.reset();
    cultureServiceMock.exportDataAsJson.calls.reset();
    cultureServiceMock.importDataFromJson.calls.reset();

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
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have as title 'mycology-genetics-tracker'`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('mycology-genetics-tracker');
  });

  it('should render toolbar title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('mat-toolbar')?.textContent).toContain(
      'Mycology Genetics Tracker',
    );
  });

  describe('addRootCulture', () => {
    it('should open NodeModalComponent with correct data', () => {
      const fixture = TestBed.createComponent(AppComponent);
      component = fixture.componentInstance;

      component.addRootCulture();

      expect(matDialogMock.open).toHaveBeenCalledWith(NodeModalComponent, {
        width: '500px',
        data: {
          culture: jasmine.objectContaining({
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
      const fixture = TestBed.createComponent(AppComponent);
      component = fixture.componentInstance;

      const mockResult = {
        updates: {
          label: 'Test Culture',
          type: CultureType.SPORE,
          strain: 'STR-1',
        },
      };

      matDialogMock.open.and.returnValue({ afterClosed: () => of(mockResult) });

      component.addRootCulture();

      expect(cultureServiceMock.addCulture).toHaveBeenCalledWith(
        mockResult.updates,
      );
    });

    it('should not add culture when dialog is cancelled', () => {
      const fixture = TestBed.createComponent(AppComponent);
      component = fixture.componentInstance;

      matDialogMock.open.and.returnValue({ afterClosed: () => of(null) });

      component.addRootCulture();

      expect(cultureServiceMock.addCulture).not.toHaveBeenCalled();
    });
  });

  describe('exportData', () => {
    let createElementSpy: jasmine.Spy;
    let mockAnchor: any;

    beforeEach(() => {
      mockAnchor = {
        href: '',
        download: '',
        click: jasmine.createSpy('click'),
      };
      createElementSpy = spyOn(document, 'createElement').and.returnValue(
        mockAnchor,
      );
      spyOn(URL, 'createObjectURL').and.returnValue('blob:mock-url');
      spyOn(URL, 'revokeObjectURL');
    });

    it('should export data and trigger download', () => {
      const fixture = TestBed.createComponent(AppComponent);
      component = fixture.componentInstance;

      component.exportData();

      expect(cultureServiceMock.exportDataAsJson).toHaveBeenCalled();
      expect(URL.createObjectURL).toHaveBeenCalledWith(jasmine.any(Blob));
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(mockAnchor.download).toContain('mycology-data-');
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    it('should show success snackbar after export', () => {
      const fixture = TestBed.createComponent(AppComponent);
      component = fixture.componentInstance;

      component.exportData();

      expect(snackBarMock.open).toHaveBeenCalledWith('Data exported', 'Close', {
        duration: 2500,
      });
    });
  });

  describe('importData', () => {
    it('should trigger file input click', () => {
      const fixture = TestBed.createComponent(AppComponent);
      component = fixture.componentInstance;

      const mockFileInput = { click: jasmine.createSpy('click') } as any;

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
        readAsText: jasmine.createSpy('readAsText'),
        onload: null,
        onerror: null,
        result: '{"test":"data"}',
      };

      spyOn(window as any, 'FileReader').and.returnValue(mockFileReader);
    });

    it('should return early if no file is selected', () => {
      const fixture = TestBed.createComponent(AppComponent);
      component = fixture.componentInstance;

      const mockEvent = {
        target: { files: [] },
      } as any;

      component.onImportFileSelected(mockEvent);

      expect(cultureServiceMock.importDataFromJson).not.toHaveBeenCalled();
    });

    it('should import data and show success snackbar on successful import', () => {
      const fixture = TestBed.createComponent(AppComponent);
      component = fixture.componentInstance;

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
      const fixture = TestBed.createComponent(AppComponent);
      component = fixture.componentInstance;

      cultureServiceMock.importDataFromJson.and.throwError('Invalid JSON');

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
      const fixture = TestBed.createComponent(AppComponent);
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
      const fixture = TestBed.createComponent(AppComponent);
      component = fixture.componentInstance;

      component.showAbout();

      expect(matDialogMock.open).toHaveBeenCalledWith(AboutModalComponent, {
        width: '700px',
        maxWidth: '95vw',
      });
    });
  });
});
