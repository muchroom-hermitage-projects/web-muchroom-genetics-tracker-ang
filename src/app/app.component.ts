// app.component.ts
import { Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NodeModalComponent } from './components/node-modal/node-modal.component';
import { AboutModalComponent } from './components/about-modal/about-modal.component';
import { CultureService } from './services/culture.service';
import { CultureType } from './models/culture.model';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'mycology-genetics-tracker';

  constructor(
    private dialog: MatDialog,
    private cultureService: CultureService,
    private snackBar: MatSnackBar,
  ) {}

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
    const json = this.cultureService.exportDataAsJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.href = url;
    a.download = `mycology-data-${timestamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.snackBar.open('Data exported', 'Close', { duration: 2500 });
  }

  importData(fileInput: HTMLInputElement): void {
    fileInput.click();
  }

  onImportFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        this.cultureService.importDataFromJson(String(reader.result ?? ''));
        this.snackBar.open('Data imported', 'Close', { duration: 2500 });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Import failed';
        this.snackBar.open(`Import failed: ${message}`, 'Close', {
          duration: 5000,
        });
      } finally {
        input.value = '';
      }
    };

    reader.onerror = () => {
      this.snackBar.open('Failed to read file', 'Close', { duration: 5000 });
      input.value = '';
    };

    reader.readAsText(file);
  }

  showAbout(): void {
    this.dialog.open(AboutModalComponent, {
      width: '700px',
      maxWidth: '95vw',
    });
  }
}
