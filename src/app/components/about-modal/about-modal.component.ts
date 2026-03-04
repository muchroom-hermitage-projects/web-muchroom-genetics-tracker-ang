import { Component } from '@angular/core';

@Component({
  selector: 'app-about-modal',
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
  "selectedNodeId": "string | null"
}`;
}
