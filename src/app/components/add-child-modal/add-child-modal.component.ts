// components/add-child-modal/add-child-modal.component.ts
import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CultureService } from '../../services/culture.service';
import { CultureType, CULTURE_TYPE_OPTIONS, RelationshipType } from '../../models/culture.model';

@Component({
  selector: 'app-add-child-modal',
  templateUrl: './add-child-modal.component.html',
  styleUrls: ['./add-child-modal.component.scss'],
})
export class AddChildModalComponent {
  childForm: FormGroup;
  cultureTypes = CULTURE_TYPE_OPTIONS;
  relationshipTypes = Object.values(RelationshipType);
  isManualLabel = false;
  resolvedStrainCode = '';
  resolvedStrainSegment = 1;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<AddChildModalComponent>,
    private cultureService: CultureService,
    @Inject(MAT_DIALOG_DATA) public data: { parentId: string },
  ) {
    this.childForm = this.fb.group({
      label: ['', Validators.required],
      type: [CultureType.AGAR, Validators.required],
      filialGeneration: ['F0'],
      description: [''],
      notes: [''],
      source: [''],
      dateCreated: [this.toDateTimeLocalInput(new Date()), Validators.required],
      isArchived: [false],
      relationshipType: ['', Validators.required],
    });

    // Auto-fill strain from parent if possible
    const parent = this.getParent();
    if (parent) {
      this.resolvedStrainCode = parent.strain;
      this.resolvedStrainSegment = parent.strainSegment || 1;
    }

    this.refreshAutoLabel();
    this.childForm.valueChanges.subscribe(() => {
      if (!this.isManualLabel) {
        this.refreshAutoLabel();
      }
    });
  }

  private getParent() {
    let parent: any = null;
    this.cultureService
      .getCultures()
      .subscribe((cultures) => {
        parent = cultures.find((c) => c.id === this.data.parentId);
      })
      .unsubscribe();
    return parent;
  }

  onCreate(): void {
    if (this.childForm.valid) {
      const formValue = this.childForm.value;

      // Get parent to inherit contamination status
      const parent = this.getParent();

      // Create new culture
      const newCulture = this.cultureService.addCulture({
        label: formValue.label,
        type: formValue.type,
        strain: this.resolvedStrainCode,
        strainSegment: this.resolvedStrainSegment,
        filialGeneration: formValue.filialGeneration,
        description: formValue.description,
        notes: formValue.notes,
        source: formValue.source,
        dateCreated: new Date(formValue.dateCreated),
        metadata: {
          isArchived: !!formValue.isArchived,
          isContaminated: parent?.metadata?.isContaminated || false, // Inherit contamination from parent
        },
      });

      // Create relationship
      this.cultureService.addRelationship({
        sourceId: this.data.parentId,
        targetId: newCulture.id,
        type: formValue.relationshipType,
      });

      this.dialogRef.close({ success: true });
    }
  }

  onClose(): void {
    this.dialogRef.close();
  }

  toggleLabelEdit(): void {
    this.isManualLabel = !this.isManualLabel;
    if (!this.isManualLabel) {
      this.refreshAutoLabel();
    }
  }

  private refreshAutoLabel(): void {
    const formValue = this.childForm.getRawValue();
    const strainInfo = this.cultureService.suggestChildStrainCode(
      this.data.parentId,
      formValue.type,
      formValue.relationshipType,
    );
    this.resolvedStrainCode = strainInfo.strain;
    this.resolvedStrainSegment = strainInfo.segment;
    const typeToken = this.resolveTypeToken(formValue.type, formValue.relationshipType);
    const generatedLabel = this.buildAutoLabel(
      this.resolvedStrainCode,
      typeToken,
      formValue.filialGeneration,
      formValue.dateCreated,
    );
    this.childForm.patchValue({ label: generatedLabel }, { emitEvent: false });
  }

  private resolveTypeToken(type: CultureType, relationshipType: RelationshipType | string): string {
    return this.cultureService.suggestTypeToken({
      type,
      parentId: this.data.parentId,
      relationshipType,
    });
  }

  private buildAutoLabel(strain: string, typeToken: string, filialGeneration: string, dateCreated: string): string {
    const strainPart = (strain || 'STRAIN').trim().toUpperCase();
    const filialPart = (filialGeneration || 'F0').trim().toUpperCase();
    const datePart = this.formatLabelDate(dateCreated);
    return `${strainPart}-${typeToken}-${filialPart}-${datePart}`;
  }

  private formatLabelDate(dateInput: string): string {
    const parsed = new Date(dateInput);
    if (Number.isNaN(parsed.getTime())) {
      return '0000/00/00T00:00';
    }

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    const hours = String(parsed.getHours()).padStart(2, '0');
    const minutes = String(parsed.getMinutes()).padStart(2, '0');
    return `${year}/${month}/${day}T${hours}:${minutes}`;
  }

  private toDateTimeLocalInput(date: Date): string {
    const parsed = new Date(date);
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    const hours = String(parsed.getHours()).padStart(2, '0');
    const minutes = String(parsed.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }
}
