import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GenealogyGraphComponent } from './genealogy-graph.component';
import { CultureService } from '../../services/culture.service';
import { GraphBuilderService } from '../../services/graph-builder.service';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { NodeModalComponent } from '../node-modal/node-modal.component';
import { Culture } from '../../models/culture.model';
import { of } from 'rxjs';
import { SAMPLE_CULTURE } from '../../../testing/mocks';

class MockCultureService {
  deleteCulture = vi.fn();
  updateCulture = vi.fn();
  setSelectedNode = vi.fn();

  getCultures() {
    return of([]);
  }

  getFilteredCultures() {
    return of([]);
  }

  getRelationships() {
    return of([]);
  }

  getSelectedNodeId() {
    return of(null);
  }
}

class MockGraphBuilderService {
  buildElements(cultures: any[], relationships: any[]) {
    return [];
  }

  getStylesheet() {
    return [];
  }
}

class DialogSpy {
  result: unknown = null;
  lastArgs: { component: unknown; config: unknown } | null = null;

  open = vi.fn().mockImplementation((component, config) => {
    this.lastArgs = { component, config };
    return { afterClosed: () => of(this.result) };
  });

  setResult(value: unknown) {
    this.result = value;
  }
}

const sampleCulture: Culture = SAMPLE_CULTURE;

describe('GenealogyGraphComponent', () => {
  let component: GenealogyGraphComponent;
  let fixture: ComponentFixture<GenealogyGraphComponent>;
  let cultureService: MockCultureService;
  let dialogSpy: DialogSpy;

  beforeEach(async () => {
    dialogSpy = new DialogSpy();

    await TestBed.configureTestingModule({
      declarations: [GenealogyGraphComponent],
      imports: [
        MatIconModule,
        MatButtonModule,
        MatTooltipModule,
        MatCheckboxModule,
        FormsModule,
        NoopAnimationsModule,
      ],
      providers: [
        { provide: CultureService, useClass: MockCultureService },
        { provide: GraphBuilderService, useClass: MockGraphBuilderService },
        { provide: MatDialog, useValue: dialogSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GenealogyGraphComponent);
    component = fixture.componentInstance;
    cultureService = TestBed.inject(
      CultureService,
    ) as unknown as MockCultureService;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('openEditCultureModal', () => {
    it('opens edit dialog and updates culture when modal returns updates', () => {
      component.cultures = [sampleCulture];
      dialogSpy.setResult({ updates: { label: 'Updated Label' } });

      (component as any).openEditCultureModal('node-1');

      expect(dialogSpy.open).toHaveBeenCalledWith(
        NodeModalComponent,
        expect.any(Object),
      );
      expect(cultureService.updateCulture).toHaveBeenCalledWith('node-1', {
        label: 'Updated Label',
      });
      expect(dialogSpy.lastArgs?.config).toEqual(
        expect.objectContaining({ data: expect.any(Object) }),
      );
    });

    it('handles delete result by deleting culture and clearing selection', () => {
      component.cultures = [sampleCulture];
      dialogSpy.setResult({ delete: true });

      (component as any).openEditCultureModal('node-1');

      expect(cultureService.deleteCulture).toHaveBeenCalledWith('node-1');
      expect(cultureService.setSelectedNode).toHaveBeenCalledWith(null);
    });

    it('ignores unknown culture ids', () => {
      component.cultures = [];
      dialogSpy.setResult({ updates: { label: 'Ignored' } });

      (component as any).openEditCultureModal('missing');

      expect(dialogSpy.open).not.toHaveBeenCalled();
      expect(cultureService.updateCulture).not.toHaveBeenCalled();
    });
  });
});
