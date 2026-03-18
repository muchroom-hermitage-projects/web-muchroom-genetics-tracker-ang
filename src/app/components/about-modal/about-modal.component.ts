import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-about-modal',
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './about-modal.component.html',
  styleUrls: ['./about-modal.component.scss'],
})
export class AboutModalComponent {
  readonly dataFormatExample = `{
  "version": 1,
  "cultures": [Culture],
  "relationships": [Relationship],
  "strains": [Strain],
  "filters": {
    "strain": "string",
    "type": "string",
    "filialGeneration": "string",
    "showArchived": false,
    "minViability": 0
  },
  "selectedNodeId": "string | null",
  "_note": "CSV import is not supported; use JSON."
}`;
}
