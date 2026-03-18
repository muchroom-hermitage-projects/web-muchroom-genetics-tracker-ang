// components/culture-detail/culture-detail.component.ts
import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CultureService } from '../../services/culture.service';
import { Culture } from '../../models/culture.model';
import { NodeModalComponent } from '../node-modal/node-modal.component';

@Component({
  selector: 'app-culture-detail',
  imports: [
    CommonModule,
    MatButtonModule,
    MatTooltipModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    MatCardModule,
    MatChipsModule,
  ],
  templateUrl: './culture-detail.component.html',
  styleUrls: ['./culture-detail.component.scss'],
})
export class CultureDetailComponent {
  private cultureService = inject(CultureService);
  private dialog = inject(MatDialog);

  readonly selectedNodeId = this.cultureService.getSelectedNodeIdSignal();
  readonly cultures = this.cultureService.getCulturesSignal();
  readonly selectedCulture = computed<Culture | null>(() => {
    const nodeId = this.selectedNodeId();
    if (!nodeId) {
      return null;
    }
    return this.cultures().find((culture) => culture.id === nodeId) || null;
  });
  readonly ancestors = computed<Culture[]>(() => {
    const nodeId = this.selectedNodeId();
    return nodeId ? this.cultureService.getAncestors(nodeId) : [];
  });
  readonly descendants = computed<Culture[]>(() => {
    const nodeId = this.selectedNodeId();
    return nodeId ? this.cultureService.getDescendants(nodeId) : [];
  });

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
    const selectedCulture = this.selectedCulture();
    if (!selectedCulture) return;

    const dialogRef = this.dialog.open(NodeModalComponent, {
      width: '500px',
      data: {
        culture: { ...selectedCulture },
        isNew: false,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        if (result.delete) {
          this.deleteCulture();
        } else {
          // Update culture
          this.cultureService.updateCulture(selectedCulture.id, result.updates);
        }
      }
    });
  }

  // Add a child to the current culture
  addChild(): void {
    const selectedCulture = this.selectedCulture();
    if (!selectedCulture) return;

    const dialogRef = this.dialog.open(NodeModalComponent, {
      width: '500px',
      data: { parentId: selectedCulture.id },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.success) {
        this.cultureService.setSelectedNode(selectedCulture.id);
      }
    });
  }

  // Delete the current culture
  deleteCulture(): void {
    const selectedCulture = this.selectedCulture();
    if (!selectedCulture) return;

    const confirmation = confirm(
      `Are you sure you want to delete ${selectedCulture.label}? This cannot be undone.`,
    );

    if (confirmation) {
      this.cultureService.deleteCulture(selectedCulture.id);
      this.closeDetail();
    }
  }

  // Select a descendant culture
  selectCulture(id: string): void {
    this.cultureService.setSelectedNode(id);
  }

  // Archive the current culture
  archiveCulture(): void {
    const selectedCulture = this.selectedCulture();
    if (!selectedCulture) return;

    this.cultureService.archiveCulture(selectedCulture.id);
  }

  // Restore the current culture from archive
  restoreCulture(): void {
    const selectedCulture = this.selectedCulture();
    if (!selectedCulture) return;

    this.cultureService.restoreCulture(selectedCulture.id);
  }

  // Check if culture is archived
  isArchived(): boolean {
    return this.selectedCulture()?.metadata?.isArchived || false;
  }

  // Get viability display
  getViability(): string {
    const selectedCulture = this.selectedCulture();
    if (!selectedCulture?.metadata?.viability) return 'Unknown';
    return `${selectedCulture.metadata.viability}%`;
  }
}
