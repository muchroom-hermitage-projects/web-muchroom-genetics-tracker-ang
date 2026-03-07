import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CultureDetailComponent } from './culture-detail.component';
import { MatDialog } from '@angular/material/dialog';
import { CultureService } from '../../services/culture.service';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { of } from 'rxjs';
import { Culture, CultureType } from '../../models/culture.model';

class MockCultureService {
  readonly setSelectedNode = vi.fn();
  readonly updateCulture = vi.fn();
  readonly deleteCulture = vi.fn();
  readonly archiveCulture = vi.fn();
  readonly restoreCulture = vi.fn();

  private readonly selectedNodeId = signal<string | null>(null);
  private readonly cultures = signal<Culture[]>([]);
  private readonly ancestors = signal<Culture[]>([]);
  private readonly descendants = signal<Culture[]>([]);

  getSelectedNodeIdSignal() {
    return this.selectedNodeId.asReadonly();
  }

  getCulturesSignal() {
    return this.cultures.asReadonly();
  }

  getAncestors = vi.fn(() => {
    return this.ancestors();
  });

  getDescendants = vi.fn(() => {
    return this.descendants();
  });

  setSelected(id: string | null) {
    this.selectedNodeId.set(id);
  }

  setCultures(value: Culture[]) {
    this.cultures.set(value);
  }

  setAncestors(value: Culture[]) {
    this.ancestors.set(value);
  }

  setDescendants(value: Culture[]) {
    this.descendants.set(value);
  }
}

class DialogSpy {
  result: unknown = null;
  open = vi
    .fn()
    .mockImplementation(() => ({ afterClosed: () => of(this.result) }));
}

describe('CultureDetailComponent', () => {
  let component: CultureDetailComponent;
  let fixture: ComponentFixture<CultureDetailComponent>;
  let cultureService: MockCultureService;
  let dialogSpy: DialogSpy;

  const rootCulture: Culture = {
    id: 'node-1',
    label: 'Root',
    type: CultureType.AGAR,
    strain: 'STR-1',
    strainSegment: 1,
    filialGeneration: 'F0',
    description: 'root',
    dateCreated: new Date('2025-01-01'),
    metadata: { isArchived: false, viability: 92 },
  };

  const childCulture: Culture = {
    ...rootCulture,
    id: 'node-2',
    label: 'Child',
    filialGeneration: 'F1',
  };

  beforeEach(async () => {
    dialogSpy = new DialogSpy();

    await TestBed.configureTestingModule({
      declarations: [CultureDetailComponent],
      providers: [
        { provide: MatDialog, useValue: dialogSpy },
        { provide: CultureService, useClass: MockCultureService },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(CultureDetailComponent);
    component = fixture.componentInstance;
    cultureService = TestBed.inject(
      CultureService,
    ) as unknown as MockCultureService;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('derives selected culture, ancestors, and descendants from signals', () => {
    cultureService.setCultures([rootCulture, childCulture]);
    cultureService.setAncestors([rootCulture]);
    cultureService.setDescendants([childCulture]);
    cultureService.setSelected('node-2');

    expect(component.selectedCulture()?.id).toBe('node-2');
    expect(component.ancestors().map((c) => c.id)).toEqual(['node-1']);
    expect(component.descendants().map((c) => c.id)).toEqual(['node-2']);
    expect(cultureService.getAncestors).toHaveBeenCalledWith('node-2');
    expect(cultureService.getDescendants).toHaveBeenCalledWith('node-2');
  });

  it('returns null selected culture when no node is selected', () => {
    cultureService.setCultures([rootCulture]);
    cultureService.setSelected(null);

    expect(component.selectedCulture()).toBeNull();
    expect(component.ancestors()).toEqual([]);
    expect(component.descendants()).toEqual([]);
  });

  it('formats dates and maps type icon/color with fallback', () => {
    expect(component.formatDate(null as unknown as Date)).toBe('Unknown');
    expect(component.formatDate(new Date('2025-01-02'))).toContain('2025');
    expect(component.getTypeIcon('agar')).toBe('science');
    expect(component.getTypeIcon('unknown')).toBe('circle');
    expect(component.getTypeColor('spore')).toBe('#8bc34a');
    expect(component.getTypeColor('unknown')).toBe('#9e9e9e');
  });

  it('closeDetail and selectCulture delegate to CultureService', () => {
    component.closeDetail();
    component.selectCulture('node-2');

    expect(cultureService.setSelectedNode).toHaveBeenNthCalledWith(1, null);
    expect(cultureService.setSelectedNode).toHaveBeenNthCalledWith(2, 'node-2');
  });

  it('editCulture updates selected culture when modal returns updates', () => {
    cultureService.setCultures([rootCulture]);
    cultureService.setSelected('node-1');
    dialogSpy.result = { updates: { label: 'Renamed' } };

    component.editCulture();

    expect(dialogSpy.open).toHaveBeenCalled();
    expect(cultureService.updateCulture).toHaveBeenCalledWith('node-1', {
      label: 'Renamed',
    });
  });

  it('editCulture triggers delete flow when modal result requests delete', () => {
    cultureService.setCultures([rootCulture]);
    cultureService.setSelected('node-1');
    dialogSpy.result = { delete: true };
    const deleteSpy = vi
      .spyOn(component, 'deleteCulture')
      .mockImplementation(() => {});

    component.editCulture();

    expect(deleteSpy).toHaveBeenCalled();
  });

  it('does not open edit dialog when no selected culture exists', () => {
    cultureService.setSelected(null);

    component.editCulture();

    expect(dialogSpy.open).not.toHaveBeenCalled();
  });

  it('addChild re-selects parent only when modal reports success', () => {
    cultureService.setCultures([rootCulture]);
    cultureService.setSelected('node-1');

    dialogSpy.result = { success: true };
    component.addChild();
    expect(cultureService.setSelectedNode).toHaveBeenCalledWith('node-1');

    cultureService.setSelectedNode.mockClear();
    dialogSpy.result = null;
    component.addChild();
    expect(cultureService.setSelectedNode).not.toHaveBeenCalled();
  });

  it('deleteCulture confirms before deleting and closes detail on success', () => {
    cultureService.setCultures([rootCulture]);
    cultureService.setSelected('node-1');
    const closeSpy = vi.spyOn(component, 'closeDetail');
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    component.deleteCulture();

    expect(confirmSpy).toHaveBeenCalled();
    expect(cultureService.deleteCulture).toHaveBeenCalledWith('node-1');
    expect(closeSpy).toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('deleteCulture aborts when confirmation is declined', () => {
    cultureService.setCultures([rootCulture]);
    cultureService.setSelected('node-1');
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    component.deleteCulture();

    expect(cultureService.deleteCulture).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('archives and restores the selected culture', () => {
    cultureService.setCultures([rootCulture]);
    cultureService.setSelected('node-1');

    component.archiveCulture();
    component.restoreCulture();

    expect(cultureService.archiveCulture).toHaveBeenCalledWith('node-1');
    expect(cultureService.restoreCulture).toHaveBeenCalledWith('node-1');
  });

  it('isArchived and getViability handle present and missing metadata', () => {
    cultureService.setCultures([rootCulture]);
    cultureService.setSelected('node-1');
    expect(component.isArchived()).toBe(false);
    expect(component.getViability()).toBe('92%');

    cultureService.setCultures([
      { ...rootCulture, id: 'node-3', metadata: {} },
    ]);
    cultureService.setSelected('node-3');
    expect(component.isArchived()).toBe(false);
    expect(component.getViability()).toBe('Unknown');
  });
});
