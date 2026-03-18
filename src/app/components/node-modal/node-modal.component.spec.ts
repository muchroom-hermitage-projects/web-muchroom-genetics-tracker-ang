import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NodeModalComponent } from './node-modal.component';
import { CultureService } from '../../services/culture.service';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
} from '@angular/material/dialog';
import { ReactiveFormsModule } from '@angular/forms';
import {
  Culture,
  CultureType,
  RelationshipType,
} from '../../models/culture.model';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Mocked } from 'vitest';
import {
  NODE_MODAL_MOCK_CULTURE,
  NODE_MODAL_MOCK_RELATIONSHIP,
} from '../../../testing/mocks';

// Mock data
const mockCulture: Culture = NODE_MODAL_MOCK_CULTURE;

class MockCultureService {
  private cultures = signal([
    { id: 'p1', strain: 'STR-1', strainSegment: 1, metadata: {} },
  ]);

  getParent(id: string) {
    return id === 'c1' ? { id: 'p1' } : null;
  }
  getParentRelationship(id: string) {
    return id === 'c1' ? NODE_MODAL_MOCK_RELATIONSHIP : null;
  }
  getStrainOptions() {
    return [{ prefix: 'STR', label: 'Standard Strain' }];
  }
  suggestTypeToken() {
    return 'AG1';
  }
  suggestNextStrainCode() {
    return { strain: 'STR-1', segment: 1 };
  }
  suggestChildStrainCode() {
    return { strain: 'STR-1', segment: 1 };
  }
  updateRelationship = vi.fn();
  addCulture = vi.fn().mockReturnValue({ id: 'new1' });
  addRelationship = vi.fn();
  getCulturesSignal() {
    return this.cultures.asReadonly();
  }
}

/** Shared module imports used across all test groups. */
const SHARED_IMPORTS = [
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
  NodeModalComponent,
];

/**
 * Creates a fresh TestBed fixture with the given dialog data.
 * Must be called from beforeEach (before TestBed is instantiated by createComponent).
 */
async function createFixture(
  dialogData: { culture?: Culture; isNew?: boolean; parentId?: string },
  dialogRefSpy: Mocked<MatDialogRef<NodeModalComponent>>,
): Promise<ComponentFixture<NodeModalComponent>> {
  await TestBed.configureTestingModule({
    imports: SHARED_IMPORTS,
    schemas: [NO_ERRORS_SCHEMA],
    providers: [
      { provide: CultureService, useClass: MockCultureService },
      { provide: MatDialogRef, useValue: dialogRefSpy },
      { provide: MatDialog, useValue: {} },
      { provide: MAT_DIALOG_DATA, useValue: dialogData },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(NodeModalComponent);
  fixture.detectChanges();
  return fixture;
}

// ---------------------------------------------------------------------------
// Group 1: edit existing culture with parent (default dialog data)
// ---------------------------------------------------------------------------
describe('NodeModalComponent', () => {
  let component: NodeModalComponent;
  let fixture: ComponentFixture<NodeModalComponent>;
  let cultureService: MockCultureService;
  let dialogRefSpy: Mocked<MatDialogRef<NodeModalComponent>>;

  beforeEach(async () => {
    dialogRefSpy = { close: vi.fn() } as Mocked<
      MatDialogRef<NodeModalComponent>
    >;
    fixture = await createFixture(
      { culture: mockCulture, isNew: false },
      dialogRefSpy,
    );
    component = fixture.componentInstance;
    cultureService = TestBed.inject(
      CultureService,
    ) as unknown as MockCultureService;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should add relationshipType control if parent relationship exists', () => {
    expect(component.cultureForm.contains('relationshipType')).toBe(true);
    expect(component.cultureForm.get('relationshipType')?.value).toBe(
      RelationshipType.TRANSFER,
    );
  });

  it('should call updateRelationship on save if relationship type changed', () => {
    component.cultureForm.patchValue({
      relationshipType: RelationshipType.CLONE_FROM_FRUIT,
    });
    component.onSave();
    expect(cultureService.updateRelationship).toHaveBeenCalledWith('r1', {
      type: RelationshipType.CLONE_FROM_FRUIT,
    });
  });

  it('should disable strainPrefix control for non-root nodes', () => {
    expect(component.isRootNode).toBe(false);
    expect(component.cultureForm.get('strainPrefix')?.disabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Group 2: root culture and new-culture modes
// Each test calls createFixture directly so TestBed is set up fresh per test.
// ---------------------------------------------------------------------------
describe('NodeModalComponent – root / new culture', () => {
  let dialogRefSpy: Mocked<MatDialogRef<NodeModalComponent>>;

  beforeEach(() => {
    dialogRefSpy = { close: vi.fn() } as Mocked<
      MatDialogRef<NodeModalComponent>
    >;
  });

  it('should enable strainPrefix control for root nodes', async () => {
    const rootCulture = { ...mockCulture, id: 'root1' };
    const rootFixture = await createFixture(
      { culture: rootCulture, isNew: false },
      dialogRefSpy,
    );
    const rootComponent = rootFixture.componentInstance;

    expect(rootComponent.isRootNode).toBe(true);
    expect(rootComponent.cultureForm.get('strainPrefix')?.disabled).toBe(false);
  });

  it('should enable strainPrefix control for new nodes', async () => {
    const newFixture = await createFixture(
      { culture: mockCulture, isNew: true },
      dialogRefSpy,
    );
    const newComponent = newFixture.componentInstance;

    expect(newComponent.isRootNode).toBe(true);
    expect(newComponent.cultureForm.get('strainPrefix')?.disabled).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Group 3: add-child mode
// ---------------------------------------------------------------------------
describe('NodeModalComponent – Add Child Mode', () => {
  let dialogRefSpy: Mocked<MatDialogRef<NodeModalComponent>>;

  beforeEach(() => {
    dialogRefSpy = { close: vi.fn() } as Mocked<
      MatDialogRef<NodeModalComponent>
    >;
  });

  it('should initialize in add-child mode when parentId is provided', async () => {
    const childFixture = await createFixture({ parentId: 'p1' }, dialogRefSpy);
    const childComponent = childFixture.componentInstance;

    expect(childComponent.isRootNode).toBe(false);
    expect(childComponent.cultureForm.contains('relationshipType')).toBe(true);
    expect(childComponent.cultureForm.get('strainPrefix')?.disabled).toBe(true);
  });

  it('should create new culture and relationship in add-child mode', async () => {
    const childFixture = await createFixture({ parentId: 'p1' }, dialogRefSpy);
    const childComponent = childFixture.componentInstance;
    const cultureService = TestBed.inject(
      CultureService,
    ) as unknown as MockCultureService;

    childComponent.cultureForm.patchValue({
      label: 'New Child',
      type: 'agar',
      relationshipType: RelationshipType.TRANSFER,
    });

    childComponent.onSave();

    expect(cultureService.addCulture).toHaveBeenCalled();
    expect(cultureService.addRelationship).toHaveBeenCalledWith({
      sourceId: 'p1',
      targetId: 'new1',
      type: RelationshipType.TRANSFER,
    });
    expect(dialogRefSpy.close).toHaveBeenCalledWith({ success: true });
  });
});
