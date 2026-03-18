import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavbarComponent } from './navbar.component';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CultureService } from '../../services/culture.service';
import { DataImportExportService } from '../../services/data-import-export.service';
import { NodeModalComponent } from '../node-modal/node-modal.component';
import { AboutModalComponent } from '../about-modal/about-modal.component';
import { APP_EXPORT_JSON } from '../../../testing/mocks';
import { CultureType } from '../../models/culture.model';

describe('NavbarComponent', () => {
  let fixture: ComponentFixture<NavbarComponent>;
  let component: NavbarComponent;
  let dialogMock: { open: ReturnType<typeof vi.fn> };
  let snackBarMock: { open: ReturnType<typeof vi.fn> };
  let cultureServiceMock: { addCulture: ReturnType<typeof vi.fn> };
  let dataImportExportServiceMock: {
    createExportPackage: ReturnType<typeof vi.fn>;
    importFromFile: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    dialogMock = {
      open: vi
        .fn()
        .mockReturnValue({ afterClosed: () => ({ subscribe: vi.fn() }) }),
    };
    snackBarMock = {
      open: vi.fn(),
    };
    cultureServiceMock = {
      addCulture: vi.fn(),
    };
    dataImportExportServiceMock = {
      createExportPackage: vi.fn().mockReturnValue({
        blob: new Blob([APP_EXPORT_JSON], { type: 'application/json' }),
        filename: 'mycology-data-test.json',
      }),
      importFromFile: vi.fn().mockResolvedValue(undefined),
    };

    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [
        { provide: MatDialog, useValue: dialogMock },
        { provide: MatSnackBar, useValue: snackBarMock },
        { provide: CultureService, useValue: cultureServiceMock },
        {
          provide: DataImportExportService,
          useValue: dataImportExportServiceMock,
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
    const button: any = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ).find((el: any) => el.textContent?.includes('Add Root Culture'));

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
          cb({
            updates: {
              label: 'New Root',
              type: CultureType.SPORE,
            },
          }),
      }),
    });

    component.addRootCulture();

    expect(cultureServiceMock.addCulture).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'New Root', type: CultureType.SPORE }),
    );
  });

  it('triggers export through the data import/export service', () => {
    const mockAnchor = {
      click: vi.fn(),
      setAttribute: vi.fn(),
      href: '',
      download: '',
    };
    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockReturnValue(mockAnchor as unknown as HTMLAnchorElement);
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    URL.revokeObjectURL = vi.fn();

    component.exportData();

    expect(dataImportExportServiceMock.createExportPackage).toHaveBeenCalled();
    expect(snackBarMock.open).toHaveBeenCalledWith('Data exported', 'Close', {
      duration: 2500,
    });

    createElementSpy.mockRestore();
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('triggers import through the data import/export service on file selection', async () => {
    const file = new File([APP_EXPORT_JSON], 'data.json', {
      type: 'application/json',
    });
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', {
      value: [file],
    });
    input.value = 'data.json';
    const event = { target: input } as any as Event;

    await component.onImportFileSelected(event);

    expect(dataImportExportServiceMock.importFromFile).toHaveBeenCalledWith(
      file,
    );
    expect(input.value).toBe('');
  });

  it('does nothing when no file is selected', async () => {
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [] });
    input.value = '';

    await component.onImportFileSelected({ target: input } as any as Event);

    expect(dataImportExportServiceMock.importFromFile).not.toHaveBeenCalled();
    expect(snackBarMock.open).not.toHaveBeenCalled();
  });

  it('shows an error snackbar when import fails', async () => {
    dataImportExportServiceMock.importFromFile.mockRejectedValueOnce(
      new Error('Boom'),
    );
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', {
      value: [new File(['{}'], 'bad.json')],
    });

    await component.onImportFileSelected({ target: input } as any as Event);

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
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    URL.revokeObjectURL = vi.fn();

    component.handleMenuAction('import', fakeInput);
    component.handleMenuAction('export', fakeInput);
    component.handleMenuAction('about', fakeInput);

    expect(importSpy).toHaveBeenCalledWith(fakeInput);
    expect(exportSpy).toHaveBeenCalledTimes(1);
    expect(aboutSpy).toHaveBeenCalledTimes(1);

    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
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
    const input = { click: clickSpy } as unknown as HTMLInputElement;

    component.importData(input);

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });
});
