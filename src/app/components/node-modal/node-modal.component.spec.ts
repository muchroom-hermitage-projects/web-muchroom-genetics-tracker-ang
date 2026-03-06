import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NodeModalComponent } from './node-modal.component';
import { CultureService } from '../../services/culture.service';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
} from '@angular/material/dialog';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Culture, CultureType, RelationshipType } from '../../models/culture.model';
import { NO_ERRORS_SCHEMA, Pipe, PipeTransform } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

// Mock Pipe
@Pipe({name: 'replace'})
class MockReplacePipe implements PipeTransform {
  transform(value: string, from: string, to: string): string {
    return value;
  }
}

// Mock data
const mockCulture: Culture = {
  id: 'c1',
  label: 'Test Culture',
  type: CultureType.AGAR,
  strain: 'STR-1',
  strainSegment: 1,
  filialGeneration: 'F0',
  description: 'Test Description',
  dateCreated: new Date(),
  metadata: { isArchived: false }
};

const mockRelationship = {
  id: 'r1',
  sourceId: 'p1',
  targetId: 'c1',
  type: RelationshipType.TRANSFER
};

class MockCultureService {
  getParent(id: string) { return id === 'c1' ? { id: 'p1' } : null; }
  getParentRelationship(id: string) { return id === 'c1' ? mockRelationship : null; }
  getStrainOptions() { return [{ prefix: 'STR', label: 'Standard Strain' }]; }
  suggestTypeToken() { return 'AG1'; }
  suggestNextStrainCode() { return { strain: 'STR-1', segment: 1 }; }
  suggestChildStrainCode() { return { strain: 'STR-1', segment: 1 }; }
  updateRelationship = jasmine.createSpy('updateRelationship');
  addCulture = jasmine.createSpy('addCulture');
  addRelationship = jasmine.createSpy('addRelationship');
  getCultures() { return { subscribe: (fn: any) => fn([{ id: 'p1', strain: 'STR-1', strainSegment: 1 }]), unsubscribe: () => {} }; }
}

describe('NodeModalComponent', () => {
  let component: NodeModalComponent;
  let fixture: ComponentFixture<NodeModalComponent>;
  let cultureService: MockCultureService;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<NodeModalComponent>>;

  beforeEach(async () => {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      declarations: [ NodeModalComponent, MockReplacePipe ],
      imports: [
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatSelectModule,
        MatInputModule,
        MatCheckboxModule,
        MatIconModule,
        MatButtonModule,
        MatTooltipModule,
        NoopAnimationsModule,
      ],
      schemas: [ NO_ERRORS_SCHEMA ],
      providers: [
        { provide: CultureService, useClass: MockCultureService },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MatDialog, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: { culture: mockCulture, isNew: false } },
        FormBuilder
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NodeModalComponent);
    component = fixture.componentInstance;
    cultureService = TestBed.inject(CultureService) as unknown as MockCultureService;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should add relationshipType control if parent relationship exists', () => {
    expect(component.cultureForm.contains('relationshipType')).toBeTrue();
    expect(component.cultureForm.get('relationshipType')?.value).toBe(RelationshipType.TRANSFER);
  });

  it('should call updateRelationship on save if relationship type changed', () => {
    component.cultureForm.patchValue({ relationshipType: RelationshipType.CLONE_FROM_FRUIT });
    component.onSave();
    expect(cultureService.updateRelationship).toHaveBeenCalledWith('r1', { type: RelationshipType.CLONE_FROM_FRUIT });
  });

  it('should disable strainPrefix control for non-root nodes', () => {
    expect(component.isRootNode).toBeFalse();
    expect(component.cultureForm.get('strainPrefix')?.disabled).toBeTrue();
  });

  it('should enable strainPrefix control for root nodes', () => {
    const rootCulture = { ...mockCulture, id: 'root1' };
    const rootComponent = new NodeModalComponent(
      TestBed.inject(FormBuilder),
      dialogRefSpy,
      TestBed.inject(MatDialog),
      cultureService as any,
      { culture: rootCulture, isNew: false }
    );

    expect(rootComponent.isRootNode).toBeTrue();
    expect(rootComponent.cultureForm.get('strainPrefix')?.disabled).toBeFalse();
  });

  it('should enable strainPrefix control for new nodes', () => {
    const newComponent = new NodeModalComponent(
      TestBed.inject(FormBuilder),
      dialogRefSpy,
      TestBed.inject(MatDialog),
      cultureService as any,
      { culture: mockCulture, isNew: true }
    );

    expect(newComponent.isRootNode).toBeTrue();
    expect(newComponent.cultureForm.get('strainPrefix')?.disabled).toBeFalse();
  });

  describe('Add Child Mode', () => {
    it('should initialize in add-child mode when parentId is provided', () => {
      const childComponent = new NodeModalComponent(
        TestBed.inject(FormBuilder),
        dialogRefSpy,
        TestBed.inject(MatDialog),
        cultureService as any,
        { parentId: 'p1' }
      );

      expect(childComponent.isRootNode).toBeFalse();
      expect(childComponent.cultureForm.contains('relationshipType')).toBeTrue();
      expect(childComponent.cultureForm.get('strainPrefix')?.disabled).toBeTrue();
    });

    it('should create new culture and relationship in add-child mode', () => {
      spyOn(cultureService, 'addCulture').and.returnValue({ id: 'new1' } as any);
      spyOn(cultureService, 'addRelationship');

      const childComponent = new NodeModalComponent(
        TestBed.inject(FormBuilder),
        dialogRefSpy,
        TestBed.inject(MatDialog),
        cultureService as any,
        { parentId: 'p1' }
      );

      childComponent.cultureForm.patchValue({
        label: 'New Child',
        type: 'agar',
        relationshipType: RelationshipType.TRANSFER
      });

      childComponent.onSave();

      expect(cultureService.addCulture).toHaveBeenCalled();
      expect(cultureService.addRelationship).toHaveBeenCalledWith({
        sourceId: 'p1',
        targetId: 'new1',
        type: RelationshipType.TRANSFER
      });
      expect(dialogRefSpy.close).toHaveBeenCalledWith({ success: true });
    });
  });
});
