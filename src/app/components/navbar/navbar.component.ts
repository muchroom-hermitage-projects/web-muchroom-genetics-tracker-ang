import { Component, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { NodeModalComponent } from '../node-modal/node-modal.component';
import { AboutModalComponent } from '../about-modal/about-modal.component';
import { CultureService } from '../../services/culture.service';
import { CultureType } from '../../models/culture.model';
import { DataImportExportService } from '../../services/data-import-export.service';

type NavbarMenuAction = 'export' | 'import' | 'about';

interface NavbarMenuItem {
  id: NavbarMenuAction;
  label: string;
  dividerBefore?: boolean;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
  ],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent {
  private readonly dialog = inject(MatDialog);
  private readonly cultureService = inject(CultureService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dataImportExportService = inject(DataImportExportService);

  readonly menuItems: NavbarMenuItem[] = [
    { id: 'export', label: 'Export Data' },
    { id: 'import', label: 'Import Data' },
    { id: 'about', label: 'About', dividerBefore: true },
  ];

  addRootCulture(): void {
    const dialogRef = this.dialog.open(NodeModalComponent, {
      width: '500px',
      data: {
        culture: {
          label: '',
          type: CultureType.SPORE,
          strain: '',
          filialGeneration: 'F0',
          description: '',
          notes: '',
          dateCreated: new Date(),
        },
        isNew: true,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.cultureService.addCulture({
          ...result.updates,
        });
      }
    });
  }

  exportData(): void {
    const exportPackage = this.dataImportExportService.createExportPackage();
    const url = URL.createObjectURL(exportPackage.blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = exportPackage.filename;
    anchor.click();
    URL.revokeObjectURL(url);
    this.snackBar.open('Data exported', 'Close', { duration: 2500 });
  }

  importData(fileInput: HTMLInputElement): void {
    fileInput.click();
  }

  async onImportFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    try {
      await this.dataImportExportService.importFromFile(file);
      this.snackBar.open('Data imported', 'Close', { duration: 2500 });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Import failed';
      this.snackBar.open(`Import failed: ${message}`, 'Close', {
        duration: 5000,
      });
    } finally {
      input.value = '';
    }
  }

  showAbout(): void {
    this.dialog.open(AboutModalComponent, {
      width: '700px',
      maxWidth: '95vw',
    });
  }

  handleMenuAction(
    action: NavbarMenuAction,
    fileInput: HTMLInputElement,
  ): void {
    switch (action) {
      case 'export':
        this.exportData();
        break;
      case 'import':
        this.importData(fileInput);
        break;
      case 'about':
        this.showAbout();
        break;
    }
  }
}
