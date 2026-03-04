// components/filter-panel/filter-panel.component.ts
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { CultureService } from '../../services/culture.service';
import { CULTURE_TYPE_OPTIONS } from '../../models/culture.model';

@Component({
  selector: 'app-filter-panel',
  templateUrl: './filter-panel.component.html',
  styleUrls: ['./filter-panel.component.scss'],
})
export class FilterPanelComponent implements OnInit {
  filterForm: FormGroup;
  cultureTypes = CULTURE_TYPE_OPTIONS;
  strains: string[] = [];

  constructor(private fb: FormBuilder, private cultureService: CultureService) {
    this.filterForm = this.fb.group({
      strain: [''],
      type: [''],
      filialGeneration: [''],
      showArchived: [false],
      minViability: [0],
    });
  }

  ngOnInit(): void {
    // Load unique strains
    this.cultureService.getCultures().subscribe((cultures) => {
      this.strains = [
        ...new Set(cultures.map((c) => c.strain).filter(Boolean)),
      ];
    });

    // Apply filters when form changes
    this.filterForm.valueChanges.subscribe((filters) => {
      this.cultureService.updateFilters(filters);
    });
  }

  resetFilters(): void {
    this.filterForm.reset({
      strain: '',
      type: '',
      filialGeneration: '',
      showArchived: false,
      minViability: 0,
    });
  }

  getActiveFilterCount(): number {
    const values = this.filterForm.value;
    let count = 0;
    if (values.strain) count++;
    if (values.type) count++;
    if (values.filialGeneration) count++;
    if (values.minViability > 0) count++;
    return count;
  }
}
