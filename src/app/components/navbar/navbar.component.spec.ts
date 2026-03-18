import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavbarComponent } from './navbar.component';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CultureService } from '../../services/culture.service';
import { CulturePersistenceService } from '../../services/data-import-export.service';
import { NodeModalComponent } from '../node-modal/node-modal.component';
import { AboutModalComponent } from '../about-modal/about-modal.component';
import {
  APP_EXPORT_JSON,
  CULTURE_SERVICE_VALID_IMPORT_PAYLOAD,
} from '../../../testing/mocks';
import { CultureType } from '../../models/culture.model';

describe('NavbarComponent', () => {
  let fixture: ComponentFixture<NavbarComponent>;
  let component: NavbarComponent;
  let dialogMock: { open: ReturnType<typeof vi.fn> };
  let snackBarMock: { open: ReturnType<typeof vi.fn> };
  let cultureServiceMock: {
    addCulture: ReturnType<typeof vi.fn>;
    exportDataAsJson: ReturnType<typeof vi.fn>;
    applyImportedData: ReturnType<typeof vi.fn>;
  };
  let persistenceServiceMock: {
    createExportPackage: ReturnType<typeof vi.fn>;
    importFromFile: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    dialogMock = {
      open: vi
        .fn()
        .mockReturnValue({ afterClosed: () => ({ subscribe: vi.fn() }) }),
    };
    snackBarMock = { open: vi.fn() };
    cultureServiceMock = {
      addCulture: vi.fn(),
      exportDataAsJson: vi.fn().mockReturnValue(APP_EXPORT_JSON),
      applyImportedData: vi.fn(),
    };
    persistenceServiceMock = {
      createExportPackage: vi.fn().mockReturnValue({
        blob: new Blob([APP_EXPORT_JSON], { type: 'application/json' }),
        filename: 'mycology-data-test.json',
      }),
      importFromFile: vi
        .fn()
        .mockResolvedValue(CULTURE_SERVICE_VALID_IMPORT_PAYLOAD),
    };

    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [
        { provide: MatDialog, useValue: dialogMock },
        { provide: MatSnackBar, useValue: snackBarMock },
        { provide: CultureService, useValue: cultureServiceMock },
        {
          provide: CulturePersistenceService,
          useValue: persistenceServiceMock,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('opens the add root culture dialog from the toolbar button', () => {
    const button: HTMLElement | undefined = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ).find((el: unknown) =>
      (el as HTMLElement).textContent?.includes('Add Root Culture'),
    ) as HTMLElement | undefined;

    button?.click();

    expect(dialogMock.open).toHaveBeenCalledWith(
      NodeModalComponent,
      expect.objectContaining({ width: '500px' }),
    );
  });

  it('adds a root culture when the dialog returns updates', () => {
    dialogMock.open.mockReturnValue({
      afterClosed: () => ({
        subscribe: (cb: (value: unknown) => void) =>
          cb({ updates: { label: 'New Root', type: CultureType.SPORE } }),
      }),
    });

    component.addRootCulture();

    expect(cultureServiceMock.addCulture).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'New Root', type: CultureType.SPORE }),
    );
  });

  it('triggers export: calls exportDataAsJson then createExportPackage with the JSON', () => {
    const mockAnchor = { click: vi.fn(), href: '', download: '' };
    vi.spyOn(document, 'createElement').mockReturnValue(
      mockAnchor as unknown as HTMLAnchorElement,
    );
    URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    URL.revokeObjectURL = vi.fn();

    component.exportData();

    expect(cultureServiceMock.exportDataAsJson).toHaveBeenCalled();
    expect(persistenceServiceMock.createExportPackage).toHaveBeenCalledWith(
      APP_EXPORT_JSON,
    );
    expect(snackBarMock.open).toHaveBeenCalledWith('Data exported', 'Close', {
      duration: 2500,
    });
  });

  it('imports file: calls importFromFile then applyImportedData with the result', async () => {
    const file = new File([APP_EXPORT_JSON], 'data.json', {
      type: 'application/json',
    });
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [file] });
    input.value = 'data.json';

    await component.onImportFileSelected({ target: input } as unknown as Event);

    expect(persistenceServiceMock.importFromFile).toHaveBeenCalledWith(file);
    expect(cultureServiceMock.applyImportedData).toHaveBeenCalledWith(
      CULTURE_SERVICE_VALID_IMPORT_PAYLOAD,
    );
    expect(snackBarMock.open).toHaveBeenCalledWith('Data imported', 'Close', {
      duration: 2500,
    });
    expect(input.value).toBe('');
  });

  it('does nothing when no file is selected', async () => {
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [] });

    await component.onImportFileSelected({
      target: input,
    } as unknown as Event);

    expect(persistenceServiceMock.importFromFile).not.toHaveBeenCalled();
    expect(snackBarMock.open).not.toHaveBeenCalled();
  });

  it('shows an error snackbar when import fails', async () => {
    persistenceServiceMock.importFromFile.mockRejectedValueOnce(
      new Error('Boom'),
    );
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', {
      value: [new File(['{}'], 'bad.json')],
    });

    await component.onImportFileSelected({
      target: input,
    } as unknown as Event);

    expect(snackBarMock.open).toHaveBeenCalledWith(
      'Import failed: Boom',
      'Close',
      { duration: 5000 },
    );
    expect(input.value).toBe('');
  });

  it('delegates menu actions to the appropriate handlers', () => {
    const importSpy = vi.spyOn(component, 'importData');
    const exportSpy = vi.spyOn(component, 'exportData');
    const aboutSpy = vi.spyOn(component, 'showAbout');
    const fakeInput = Object.assign(document.createElement('input'), {
      click: vi.fn(),
    }) as HTMLInputElement;
    URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(document, 'createElement').mockReturnValue({
      click: vi.fn(),
      href: '',
      download: '',
    } as unknown as HTMLElement);

    component.handleMenuAction('import', fakeInput);
    component.handleMenuAction('export', fakeInput);
    component.handleMenuAction('about', fakeInput);

    expect(importSpy).toHaveBeenCalledWith(fakeInput);
    expect(exportSpy).toHaveBeenCalledTimes(1);
    expect(aboutSpy).toHaveBeenCalledTimes(1);
  });

  it('opens the about dialog with expected sizing', () => {
    component.showAbout();

    expect(dialogMock.open).toHaveBeenCalledWith(
      AboutModalComponent,
      expect.objectContaining({ width: '700px', maxWidth: '95vw' }),
    );
  });

  it('clicks the provided input when importData is invoked', () => {
    const clickSpy = vi.fn();

    component.importData({ click: clickSpy } as unknown as HTMLInputElement);

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });
});
