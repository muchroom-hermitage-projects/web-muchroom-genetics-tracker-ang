// components/filter-panel/filter-panel.component.ts
import {
  Component,
  DestroyRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CultureService, FilterOptions } from '../../services/culture.service';
import { CULTURE_TYPE_OPTIONS } from '../../models/culture.model';

@Component({
  selector: 'app-filter-panel',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule,
  ],
  templateUrl: './filter-panel.component.html',
  styleUrls: ['./filter-panel.component.scss'],
})
export class FilterPanelComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly cultureService = inject(CultureService);
  private readonly destroyRef = inject(DestroyRef);

  readonly filterForm = this.fb.group({
    strain: [''],
    type: [''],
    filialGeneration: [''],
    showArchived: [false],
    showContaminated: [true],
    showClean: [true],
    minViability: [0],
  });
  readonly cultureTypes = CULTURE_TYPE_OPTIONS;
  readonly strains = signal<string[]>([]);
  private readonly filterValues = toSignal(this.filterForm.valueChanges, {
    initialValue: this.filterForm.getRawValue(),
  });
  readonly activeFilterCount = computed(() => {
    const values = this.filterValues();
    let count = 0;
    if (values.strain) count++;
    if (values.type) count++;
    if (values.filialGeneration) count++;
    if ((values.minViability ?? 0) > 0) count++;
    return count;
  });

  constructor() {
    effect(() => {
      this.cultureService.updateFilters(
        this.filterValues() as Partial<FilterOptions>,
      );
    });
  }

  ngOnInit(): void {
    // Load unique strains
    this.cultureService
      .getCultures()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((cultures) => {
        this.strains.set([
          ...new Set(cultures.map((c) => c.strain).filter(Boolean)),
        ]);
      });
  }

  resetFilters(): void {
    this.filterForm.reset({
      strain: '',
      type: '',
      filialGeneration: '',
      showArchived: false,
      showContaminated: true,
      showClean: true,
      minViability: 0,
    });
  }

  getActiveFilterCount(): number {
    return this.activeFilterCount();
  }
}
