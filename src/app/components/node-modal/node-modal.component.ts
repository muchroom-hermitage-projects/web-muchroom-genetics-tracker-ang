// components/node-modal/node-modal.component.ts
import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  Culture,
  CULTURE_TYPE_OPTIONS,
  CultureType,
  RelationshipType,
} from '../../models/culture.model';
import { CultureService, StrainOption } from '../../services/culture.service';

@Component({
  selector: 'app-node-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatCheckboxModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
  ],
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
    @Inject(MAT_DIALOG_DATA)
    public data: { culture?: Culture; isNew?: boolean; parentId?: string },
  ) {
    this.isNew = data.isNew || false;

    // Check if this is add-child mode
    const isAddChildMode = !!data.parentId;

    if (isAddChildMode) {
      // Add child mode
      this.isRootNode = false;

      // Get parent culture to inherit strain
      const parent = this.getParent(data.parentId!);
      this.resolvedStrainCode = parent?.strain || '';
      this.resolvedStrainSegment = parent?.strainSegment || 1;

      this.strainOptions = this.cultureService.getStrainOptions();
      this.originalStrainPrefix = this.extractStrainPrefix(
        parent?.strain || 'STR',
      );

      this.cultureForm = this.fb.group({
        label: ['', Validators.required],
        type: [CultureType.AGAR, Validators.required],
        strainPrefix: [this.originalStrainPrefix, Validators.required],
        filialGeneration: ['F0'],
        description: [''],
        notes: [''],
        source: [''],
        dateCreated: [
          this.toDateTimeLocalInput(new Date()),
          Validators.required,
        ],
        isArchived: [false],
        isContaminated: [parent?.metadata?.isContaminated || false],
        relationshipType: ['', Validators.required],
      });

      // Disable strain family field for child nodes
      this.cultureForm.get('strainPrefix')?.disable();
    } else {
      // Edit/Create root mode
      this.isRootNode =
        this.isNew || !this.cultureService.getParent(data.culture!.id);

      // Get parent relationship if it exists
      const parentRel = !this.isNew
        ? this.cultureService.getParentRelationship(data.culture!.id)
        : null;
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
          this.fb.control(parentRel.type, Validators.required),
        );
      }

      // Disable strain family field for non-root nodes
      if (!this.isRootNode) {
        this.cultureForm.get('strainPrefix')?.disable();
      }
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

      // Check if this is add-child mode
      if (this.data.parentId) {
        // Add child mode - create new culture and relationship
        const parent = this.getParent(this.data.parentId);

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
            isContaminated: parent?.metadata?.isContaminated || false,
          },
        });

        // Create relationship
        this.cultureService.addRelationship({
          sourceId: this.data.parentId,
          targetId: newCulture.id,
          type: formValue.relationshipType,
        });

        this.dialogRef.close({ success: true });
      } else {
        // Edit/Create root mode
        // Update relationship if it exists and was changed
        if (this.parentRelationshipId && formValue.relationshipType) {
          this.cultureService.updateRelationship(this.parentRelationshipId, {
            type: formValue.relationshipType,
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
  }

  get isContaminated(): boolean {
    return !!this.data.culture?.metadata?.isContaminated;
  }

  private getParent(parentId: string): Culture | null {
    return (
      this.cultureService
        .getCulturesSignal()()
        .find((culture) => culture.id === parentId) || null
    );
  }

  onAddChild(): void {
    // First close this modal
    this.dialogRef.close();

    // Then open add child modal using NodeModalComponent
    this.dialog.open(NodeModalComponent, {
      width: '500px',
      data: { parentId: this.data.culture!.id },
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

  formatRelationshipType(relationshipType: string): string {
    return relationshipType.split('_').join(' ');
  }

  private refreshAutoLabel(): void {
    const formValue = this.cultureForm.getRawValue();

    // Check if this is add-child mode
    if (this.data.parentId) {
      // Add child mode - use child strain logic
      const strainInfo = this.cultureService.suggestChildStrainCode(
        this.data.parentId,
        formValue.type,
        formValue.relationshipType,
      );
      this.resolvedStrainCode = strainInfo.strain;
      this.resolvedStrainSegment = strainInfo.segment;
      const typeToken = this.cultureService.suggestTypeToken({
        type: formValue.type,
        parentId: this.data.parentId,
        relationshipType: formValue.relationshipType,
      });
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
    } else {
      // Edit/Create root mode - use root strain logic
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

  private resolveStrainCode(strainPrefix: string): {
    strain: string;
    segment: number;
  } {
    if (!this.isRootNode) {
      return {
        strain: this.data.culture?.strain || 'STR-1',
        segment: this.data.culture?.strainSegment || 1,
      };
    }

    const normalizedPrefix = this.extractStrainPrefix(
      strainPrefix || this.originalStrainPrefix,
    );

    if (!this.isNew && normalizedPrefix === this.originalStrainPrefix) {
      if (this.data.culture?.strain) {
        return {
          strain: this.data.culture.strain,
          segment: this.data.culture.strainSegment || 1,
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
