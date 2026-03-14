import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavbarComponent } from './navbar.component';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CultureService } from '../../services/culture.service';
import { DataImportExportService } from '../../services/data-import-export.service';
import { NodeModalComponent } from '../node-modal/node-modal.component';
import { APP_EXPORT_JSON } from '../../../testing/mocks';

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
    const button = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ).find((el) => el.textContent?.includes('Add Root Culture'));

    button?.click();

    expect(dialogMock.open).toHaveBeenCalledWith(
      NodeModalComponent,
      expect.objectContaining({ width: '500px' }),
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
    const event = { target: input } as Event;

    await component.onImportFileSelected(event);

    expect(dataImportExportServiceMock.importFromFile).toHaveBeenCalledWith(
      file,
    );
    expect(input.value).toBe('');
  });
});
