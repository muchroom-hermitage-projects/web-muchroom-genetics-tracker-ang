import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { FilterPanelComponent } from './filter-panel.component';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { CultureService } from '../../services/culture.service';
import { of } from 'rxjs';
import { CultureType } from '../../models/culture.model';
import { Mocked } from 'vitest';

const mockCultures = [
  {
    id: '1',
    strain: 'STR-1',
    type: CultureType.SPORE,
    filialGeneration: 'F0',
    label: 'Test 1',
    dateCreated: new Date(),
    metadata: {},
  },
  {
    id: '2',
    strain: 'STR-2',
    type: CultureType.AGAR,
    filialGeneration: 'F1',
    label: 'Test 2',
    dateCreated: new Date(),
    metadata: {},
  },
  {
    id: '3',
    strain: 'STR-1',
    type: CultureType.LIQUID_CULTURE,
    filialGeneration: 'F0',
    label: 'Test 3',
    dateCreated: new Date(),
    metadata: {},
  },
];

const mockCultureService = {
  getCultures: vi.fn().mockReturnValue(of(mockCultures)),
  updateFilters: vi.fn(),
};

describe('FilterPanelComponent', () => {
  let component: FilterPanelComponent;
  let fixture: ComponentFixture<FilterPanelComponent>;
  let cultureService: Mocked<CultureService>;

  beforeEach(async () => {
    mockCultureService.getCultures
      .mockClear()
      .mockReturnValue(of(mockCultures));
    mockCultureService.updateFilters.mockClear();

    await TestBed.configureTestingModule({
      declarations: [FilterPanelComponent],
      imports: [
        ReactiveFormsModule,
        MatFormFieldModule,
        MatSelectModule,
        MatInputModule,
        MatCheckboxModule,
        MatButtonModule,
        NoopAnimationsModule,
      ],
      providers: [{ provide: CultureService, useValue: mockCultureService }],
    }).compileComponents();

    fixture = TestBed.createComponent(FilterPanelComponent);
    component = fixture.componentInstance;
    cultureService = TestBed.inject(CultureService) as Mocked<CultureService>;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Initialization', () => {
    it('should initialize form with default values', () => {
      expect(component.filterForm.value).toEqual({
        strain: '',
        type: '',
        filialGeneration: '',
        showArchived: false,
        showContaminated: true,
        showClean: true,
        minViability: 0,
      });
    });

    it('should have all required form controls', () => {
      expect(component.filterForm.contains('strain')).toBe(true);
      expect(component.filterForm.contains('type')).toBe(true);
      expect(component.filterForm.contains('filialGeneration')).toBe(true);
      expect(component.filterForm.contains('showArchived')).toBe(true);
      expect(component.filterForm.contains('showContaminated')).toBe(true);
      expect(component.filterForm.contains('showClean')).toBe(true);
      expect(component.filterForm.contains('minViability')).toBe(true);
    });

    it('should populate culture types from model', () => {
      expect(component.cultureTypes.length).toBeGreaterThan(0);
      expect(component.cultureTypes[0]).toEqual(
        expect.objectContaining({
          value: expect.any(String),
          label: expect.any(String),
        }),
      );
    });
  });

  describe('ngOnInit', () => {
    it('should load unique strains from cultures', fakeAsync(() => {
      fixture.detectChanges();

      tick(100);

      expect(cultureService.getCultures).toHaveBeenCalled();
      expect(component.strains).toEqual(['STR-1', 'STR-2']);
    }));

    it('should call updateFilters when form changes', () => {
      const testFilters = {
        strain: 'STR-1',
        type: CultureType.AGAR,
        filialGeneration: 'F1',
        showArchived: true,
        showContaminated: false,
        showClean: true,
        minViability: 50,
      };

      component.filterForm.patchValue(testFilters);

      expect(cultureService.updateFilters).toHaveBeenCalledWith(
        expect.objectContaining(testFilters),
      );
    });

    it('should handle empty strain list', async () => {
      mockCultureService.getCultures.mockReturnValue(of([]));

      // Create new fixture with updated mock
      const newFixture = TestBed.createComponent(FilterPanelComponent);
      const newComponent = newFixture.componentInstance;
      newFixture.detectChanges();

      // Wait for async operations
      await newFixture.whenStable();

      expect(newComponent.strains).toEqual([]);
    });
  });

  describe('resetFilters', () => {
    it('should reset all form fields to default values', () => {
      // Change some values
      component.filterForm.patchValue({
        strain: 'STR-1',
        type: CultureType.AGAR,
        filialGeneration: 'F1',
        showArchived: true,
        showContaminated: false,
        showClean: false,
        minViability: 50,
      });

      // Reset
      component.resetFilters();

      // Verify reset to defaults
      expect(component.filterForm.value).toEqual({
        strain: '',
        type: '',
        filialGeneration: '',
        showArchived: false,
        showContaminated: true,
        showClean: true,
        minViability: 0,
      });
    });

    it('should trigger updateFilters after reset', () => {
      cultureService.updateFilters.mockClear();

      component.resetFilters();

      expect(cultureService.updateFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          strain: '',
          type: '',
          filialGeneration: '',
          showArchived: false,
          showContaminated: true,
          showClean: true,
          minViability: 0,
        }),
      );
    });
  });

  describe('getActiveFilterCount', () => {
    it('should return 0 when no filters are active', () => {
      component.filterForm.reset({
        strain: '',
        type: '',
        filialGeneration: '',
        showArchived: false,
        showContaminated: true,
        showClean: true,
        minViability: 0,
      });

      expect(component.getActiveFilterCount()).toBe(0);
    });

    it('should count strain filter', () => {
      component.filterForm.patchValue({ strain: 'STR-1' });
      expect(component.getActiveFilterCount()).toBe(1);
    });

    it('should count type filter', () => {
      component.filterForm.patchValue({ type: CultureType.AGAR });
      expect(component.getActiveFilterCount()).toBe(1);
    });

    it('should count filialGeneration filter', () => {
      component.filterForm.patchValue({ filialGeneration: 'F1' });
      expect(component.getActiveFilterCount()).toBe(1);
    });

    it('should count minViability filter when > 0', () => {
      component.filterForm.patchValue({ minViability: 50 });
      expect(component.getActiveFilterCount()).toBe(1);
    });

    it('should not count minViability when 0', () => {
      component.filterForm.patchValue({ minViability: 0 });
      expect(component.getActiveFilterCount()).toBe(0);
    });

    it('should not count showArchived, showContaminated, or showClean', () => {
      component.filterForm.patchValue({
        showArchived: true,
        showContaminated: false,
        showClean: false,
      });
      expect(component.getActiveFilterCount()).toBe(0);
    });

    it('should count multiple active filters', () => {
      component.filterForm.patchValue({
        strain: 'STR-1',
        type: CultureType.AGAR,
        filialGeneration: 'F1',
        minViability: 75,
      });
      expect(component.getActiveFilterCount()).toBe(4);
    });

    it('should count all possible filters', () => {
      component.filterForm.patchValue({
        strain: 'STR-1',
        type: CultureType.SPORE,
        filialGeneration: 'F0',
        minViability: 100,
        showArchived: true,
        showContaminated: false,
        showClean: true,
      });
      expect(component.getActiveFilterCount()).toBe(4);
    });
  });

  describe('Form Validation', () => {
    it('should accept valid strain values', () => {
      component.filterForm.patchValue({ strain: 'STR-1' });
      expect(component.filterForm.get('strain')?.valid).toBe(true);
    });

    it('should accept empty strain values', () => {
      component.filterForm.patchValue({ strain: '' });
      expect(component.filterForm.get('strain')?.valid).toBe(true);
    });

    it('should accept valid culture type values', () => {
      component.filterForm.patchValue({ type: CultureType.AGAR });
      expect(component.filterForm.get('type')?.valid).toBe(true);
    });

    it('should accept numeric minViability values', () => {
      component.filterForm.patchValue({ minViability: 50 });
      expect(component.filterForm.get('minViability')?.valid).toBe(true);
    });

    it('should accept boolean checkbox values', () => {
      component.filterForm.patchValue({
        showArchived: true,
        showContaminated: false,
        showClean: true,
      });
      expect(component.filterForm.get('showArchived')?.valid).toBe(true);
      expect(component.filterForm.get('showContaminated')?.valid).toBe(true);
      expect(component.filterForm.get('showClean')?.valid).toBe(true);
    });
  });
});
