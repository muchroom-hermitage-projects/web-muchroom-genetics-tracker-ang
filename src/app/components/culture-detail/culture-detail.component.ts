// components/culture-detail/culture-detail.component.ts
import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CultureService } from '../../services/culture.service';
import { Culture } from '../../models/culture.model';
import { NodeModalComponent } from '../node-modal/node-modal.component';

@Component({
  selector: 'app-culture-detail',
  templateUrl: './culture-detail.component.html',
  styleUrls: ['./culture-detail.component.scss'],
})
export class CultureDetailComponent implements OnInit {
  selectedCulture: Culture | null = null;
  ancestors: Culture[] = [];
  descendants: Culture[] = [];

  constructor(
    private cultureService: CultureService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.cultureService.getSelectedNodeId().subscribe((nodeId) => {
      if (nodeId) {
        this.loadCultureDetails(nodeId);
      } else {
        this.selectedCulture = null;
        this.ancestors = [];
        this.descendants = [];
      }
    });
  }

  private loadCultureDetails(nodeId: string): void {
    // Get the selected culture
    this.cultureService.getCultures().subscribe((cultures) => {
      this.selectedCulture = cultures.find((c) => c.id === nodeId) || null;
    });

    // Get ancestors (parents, grandparents, etc.)
    this.ancestors = this.cultureService.getAncestors(nodeId);

    // Get descendants (children, grandchildren, etc.)
    this.descendants = this.cultureService.getDescendants(nodeId);
  }

  // Format date for display
  formatDate(date: Date): string {
    if (!date) return 'Unknown';
    return new Date(date).toLocaleDateString();
  }

  // Get icon for culture type
  getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      spore: 'grass',
      agar: 'science',
      liquid_culture: 'opacity',
      grain_spawn: 'agriculture',
      fruit: 'spa',
      clone: 'call_split',
      slant: 'vertical_align_bottom',
      castellani_water: 'water_drop',
    };
    return icons[type] || 'circle';
  }

  // NEW: Get color for culture type
  getTypeColor(type: string): string {
    const colors: Record<string, string> = {
      spore: '#8bc34a',
      agar: '#42a5f5',
      liquid_culture: '#ab47bc',
      grain_spawn: '#ffa726',
      fruit: '#ef5350',
      clone: '#7e57c2',
      slant: '#66bb6a',
      castellani_water: '#26c6da',
    };
    return colors[type] || '#9e9e9e';
  }

  // Close the detail panel
  closeDetail(): void {
    this.cultureService.setSelectedNode(null);
  }

  // Edit the current culture
  editCulture(): void {
    if (!this.selectedCulture) return;

    const dialogRef = this.dialog.open(NodeModalComponent, {
      width: '500px',
      data: {
        culture: { ...this.selectedCulture },
        isNew: false,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        if (result.delete) {
          this.deleteCulture();
        } else {
          // Update culture
          this.cultureService.updateCulture(
            this.selectedCulture!.id,
            result.updates,
          );
          // Refresh details
          this.loadCultureDetails(this.selectedCulture!.id);
        }
      }
    });
  }

  // Add a child to the current culture
  addChild(): void {
    if (!this.selectedCulture) return;

    const dialogRef = this.dialog.open(NodeModalComponent, {
      width: '500px',
      data: { parentId: this.selectedCulture.id },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.success) {
        // Refresh the graph and details
        this.loadCultureDetails(this.selectedCulture!.id);
      }
    });
  }

  // Delete the current culture
  deleteCulture(): void {
    if (!this.selectedCulture) return;

    const confirmation = confirm(
      `Are you sure you want to delete ${this.selectedCulture.label}? This cannot be undone.`,
    );

    if (confirmation) {
      this.cultureService.deleteCulture(this.selectedCulture.id);
      this.closeDetail();
    }
  }

  // Select a descendant culture
  selectCulture(id: string): void {
    this.cultureService.setSelectedNode(id);
  }

  // Archive the current culture
  archiveCulture(): void {
    if (!this.selectedCulture) return;

    this.cultureService.archiveCulture(this.selectedCulture.id);
    this.loadCultureDetails(this.selectedCulture.id);
  }

  // Restore the current culture from archive
  restoreCulture(): void {
    if (!this.selectedCulture) return;

    this.cultureService.restoreCulture(this.selectedCulture.id);
    this.loadCultureDetails(this.selectedCulture.id);
  }

  // Check if culture is archived
  isArchived(): boolean {
    return this.selectedCulture?.metadata?.isArchived || false;
  }

  // Get viability display
  getViability(): string {
    if (!this.selectedCulture?.metadata?.viability) return 'Unknown';
    return `${this.selectedCulture.metadata.viability}%`;
  }
}
