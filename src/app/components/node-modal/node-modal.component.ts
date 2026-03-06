// components/node-modal/node-modal.component.ts
import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';
import {
  Culture,
  CULTURE_TYPE_OPTIONS,
  CultureType,
  RelationshipType,
} from '../../models/culture.model';
import { CultureService, StrainOption } from '../../services/culture.service';
import { AddChildModalComponent } from '../add-child-modal/add-child-modal.component';

@Component({
  selector: 'app-node-modal',
  templateUrl: './node-modal.component.html',
  styleUrls: ['./node-modal.component.scss'],
})
export class NodeModalComponent {
  cultureForm: FormGroup;
  cultureTypes = CULTURE_TYPE_OPTIONS;
  strainOptions: StrainOption[] = [];
  isNew: boolean;
  isRootNode = true;
  isManualLabel = false;
  relationshipTypes = Object.values(RelationshipType);
  private resolvedStrainCode = '';
  private resolvedStrainSegment = 1;
  private originalStrainPrefix = '';
  private parentRelationshipId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<NodeModalComponent>,
    private dialog: MatDialog,
    private cultureService: CultureService,
    @Inject(MAT_DIALOG_DATA) public data: { culture: Culture; isNew?: boolean },
  ) {
    this.isNew = data.isNew || false;
    this.isRootNode =
      this.isNew || !this.cultureService.getParent(data.culture.id);

    // Get parent relationship if it exists
    const parentRel = !this.isNew ? this.cultureService.getParentRelationship(data.culture.id) : null;
    this.parentRelationshipId = parentRel?.id || null;

    this.strainOptions = this.cultureService.getStrainOptions();
    this.originalStrainPrefix = this.extractStrainPrefix(
      data.culture?.strain || this.strainOptions[0]?.prefix || 'STR',
    );

    this.cultureForm = this.fb.group({
      label: [data.culture?.label || '', Validators.required],
      type: [data.culture?.type || CultureType.SPORE, Validators.required],
      strainPrefix: [this.originalStrainPrefix, Validators.required],
      filialGeneration: [data.culture?.filialGeneration || 'F0'],
      description: [data.culture?.description || ''],
      notes: [data.culture?.notes || ''],
      source: [data.culture?.source || ''],
      dateCreated: [
        this.toDateTimeLocalInput(data.culture?.dateCreated || new Date()),
        Validators.required,
      ],
      isArchived: [data.culture?.metadata?.isArchived || false],
      isContaminated: [data.culture?.metadata?.isContaminated || false],
    });

    // Add relationship type control if we have a parent relationship
    if (parentRel) {
      this.cultureForm.addControl(
        'relationshipType',
        this.fb.control(parentRel.type, Validators.required)
      );
    }

    // Disable strain family field for non-root nodes
    if (!this.isRootNode) {
      this.cultureForm.get('strainPrefix')?.disable();
    }

    this.refreshAutoLabel();
    this.cultureForm.valueChanges.subscribe(() => {
      if (!this.isManualLabel) {
        this.refreshAutoLabel();
      }
    });
  }

  onSave(): void {
    if (this.cultureForm.valid) {
      const formValue = this.cultureForm.value;

      // Update relationship if it exists and was changed
      if (this.parentRelationshipId && formValue.relationshipType) {
        this.cultureService.updateRelationship(this.parentRelationshipId, {
          type: formValue.relationshipType
        });
      }

      this.dialogRef.close({
        updates: {
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
            ...this.data.culture?.metadata,
            isArchived: !!formValue.isArchived,
            isContaminated: !!formValue.isContaminated,
          },
        },
      });
    }
  }

  get isContaminated(): boolean {
    return !!this.data.culture?.metadata?.isContaminated;
  }

  onAddChild(): void {
    // First close this modal
    this.dialogRef.close();

    // Then open add child modal
    this.dialog.open(AddChildModalComponent, {
      width: '500px',
      data: { parentId: this.data.culture.id },
    });
  }

  onDelete(): void {
    if (
      confirm(
        'Are you sure you want to delete this culture? This cannot be undone.',
      )
    ) {
      this.dialogRef.close({ delete: true });
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
    const formValue = this.cultureForm.getRawValue();
    const strainInfo = this.resolveStrainCode(formValue.strainPrefix);
    this.resolvedStrainCode = strainInfo.strain;
    this.resolvedStrainSegment = strainInfo.segment;
    const typeToken = this.resolveTypeToken(formValue.type);
    const generatedLabel = this.buildAutoLabel(
      this.resolvedStrainCode,
      typeToken,
      formValue.filialGeneration,
      formValue.dateCreated,
    );
    this.cultureForm.patchValue(
      { label: generatedLabel },
      { emitEvent: false },
    );
  }

  private resolveTypeToken(type: CultureType): string {
    return this.cultureService.suggestTypeToken({
      type,
      currentCultureId: this.isNew ? undefined : this.data.culture?.id,
      currentLabel: this.isNew ? undefined : this.data.culture?.label,
    });
  }

  private buildAutoLabel(
    strain: string,
    typeToken: string,
    filialGeneration: string,
    dateCreated: string,
  ): string {
    const strainPart = (strain || 'STRAIN').trim().toUpperCase();
    const filialPart = (filialGeneration || 'F0').trim().toUpperCase();
    const datePart = this.formatLabelDate(dateCreated);
    return `${strainPart}-${typeToken}-${filialPart}-${datePart}`;
  }

  private resolveStrainCode(strainPrefix: string): { strain: string; segment: number } {
    if (!this.isRootNode) {
      return {
        strain: this.data.culture?.strain || 'STR-1',
        segment: this.data.culture?.strainSegment || 1
      };
    }

    const normalizedPrefix = this.extractStrainPrefix(
      strainPrefix || this.originalStrainPrefix,
    );

    if (!this.isNew && normalizedPrefix === this.originalStrainPrefix) {
      if (this.data.culture?.strain) {
        return {
          strain: this.data.culture.strain,
          segment: this.data.culture.strainSegment || 1
        };
      }
      return this.cultureService.suggestNextStrainCode(
        normalizedPrefix,
        this.data.culture?.id,
      );
    }

    return this.cultureService.suggestNextStrainCode(
      normalizedPrefix,
      this.isNew ? undefined : this.data.culture?.id,
    );
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
    if (Number.isNaN(parsed.getTime())) {
      parsed.setTime(Date.now());
    }
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    const hours = String(parsed.getHours()).padStart(2, '0');
    const minutes = String(parsed.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  private extractStrainPrefix(strainCode: string): string {
    const match = (strainCode || '').toUpperCase().match(/^([A-Z]+)-?(\d+)?$/);
    return match ? match[1] : (strainCode || 'STR').toUpperCase();
  }
}
