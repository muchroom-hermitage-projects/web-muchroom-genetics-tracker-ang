import { Injectable, inject } from '@angular/core';
import { CultureService } from './culture.service';

@Injectable({
  providedIn: 'root',
})
export class DataImportExportService {
  private readonly cultureService = inject(CultureService);

  createExportPackage(): { blob: Blob; filename: string } {
    const json = this.cultureService.exportDataAsJson();
    if (json == null) {
      throw new Error('Export data unavailable');
    }
    if (!json) {
      throw new Error('Export data is empty');
    }

    const blob = new Blob([json], { type: 'application/json' });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return {
      blob,
      filename: `mycology-data-${timestamp}.json`,
    };
  }

  async importFromFile(file: File | null | undefined): Promise<void> {
    if (!file) {
      throw new Error('No file selected');
    }

    if (file.size === 0) {
      throw new Error('Import file is empty');
    }

    if (this.isCsvFile(file)) {
      throw new Error('CSV import is not supported');
    }

    const contents = await this.readFileAsText(file);
    if (!contents) {
      throw new Error('Import file is empty');
    }

    this.cultureService.importDataFromJson(contents);
  }

  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  private isCsvFile(file: File): boolean {
    const name = file.name.toLowerCase();
    return name.endsWith('.csv') || file.type.includes('csv');
  }
}
