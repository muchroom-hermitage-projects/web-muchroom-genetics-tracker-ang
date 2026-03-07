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
import { Culture, Relationship } from '../../models/culture.model';
import { BehaviorSubject, Observable, of } from 'rxjs';
import {
  GENEALOGY_VISIBLE_CULTURES,
  GENEALOGY_VISIBLE_RELATIONSHIPS,
  SAMPLE_CULTURE,
} from '../../../testing/mocks';

class MockCultureService {
  private readonly filteredCultures$ = new BehaviorSubject<Culture[]>([]);
  private readonly relationships$ = new BehaviorSubject<Relationship[]>([]);
  private readonly selectedNodeId$ = new BehaviorSubject<string | null>(null);

  deleteCulture = vi.fn();
  updateCulture = vi.fn();
  setSelectedNode = vi.fn();

  emitFilteredCultures(value: Culture[]) {
    this.filteredCultures$.next(value);
  }

  emitRelationships(value: Relationship[]) {
    this.relationships$.next(value);
  }

  emitSelectedNodeId(value: string | null) {
    this.selectedNodeId$.next(value);
  }

  getCultures(): Observable<Culture[]> {
    return of([]);
  }

  getFilteredCultures() {
    return this.filteredCultures$.asObservable();
  }

  getRelationships() {
    return this.relationships$.asObservable();
  }

  getSelectedNodeId() {
    return this.selectedNodeId$.asObservable();
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
      imports: [
        MatIconModule,
        MatButtonModule,
        MatTooltipModule,
        MatCheckboxModule,
        FormsModule,
        NoopAnimationsModule,
        GenealogyGraphComponent,
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

  it('filters visible relationships based on current graph state', () => {
    (component as any).cultures = GENEALOGY_VISIBLE_CULTURES;
    (component as any).relationships = GENEALOGY_VISIBLE_RELATIONSHIPS;

    const visible = (component as any).getVisibleRelationships();
    expect(visible).toEqual([GENEALOGY_VISIBLE_RELATIONSHIPS[0]]);
  });

  it('updates subtree mode label and tooltip when signal changes', () => {
    expect(component.subtreeModeLabel()).toBe('Subtree Mode');
    expect(component.subtreeModeTooltip()).toContain(
      'moves all its descendants',
    );

    component.subtreeMode.set(false);

    expect(component.subtreeModeLabel()).toBe('Cascade Drag');
    expect(component.subtreeModeTooltip()).toContain(
      'moves only that specific node',
    );
  });

  it('highlights selected node and ancestor path', () => {
    const removeClass = vi.fn();
    const selectedNodeAddClass = vi.fn();
    const ancestorAddClass = vi.fn();

    const incomingEdge = {
      data: vi.fn().mockImplementation((field: string) => {
        return field === 'source' ? 'ancestor' : undefined;
      }),
    };

    const nodeMap: Record<string, any> = {
      selected: {
        addClass: selectedNodeAddClass,
        incomers: vi.fn().mockReturnValue([incomingEdge]),
      },
      ancestor: {
        addClass: ancestorAddClass,
        incomers: vi.fn().mockReturnValue([]),
      },
    };

    (component as any).cy = {
      elements: vi.fn().mockReturnValue({ removeClass }),
      getElementById: vi.fn().mockImplementation((id: string) => nodeMap[id]),
      destroy: vi.fn(),
    };

    (component as any).highlightNode('selected');

    expect(removeClass).toHaveBeenCalledWith('selected');
    expect(selectedNodeAddClass).toHaveBeenCalledWith('selected');
    expect(ancestorAddClass).toHaveBeenCalledWith('selected');
  });

  it('swallows highlight path errors without throwing', () => {
    const badNode = {
      addClass: vi.fn(),
      incomers: vi.fn(() => {
        throw new Error('broken graph state');
      }),
    };

    (component as any).cy = {
      elements: vi.fn().mockReturnValue({ removeClass: vi.fn() }),
      getElementById: vi.fn().mockImplementation(() => badNode),
      destroy: vi.fn(),
    };

    expect(() => (component as any).highlightNode('selected')).not.toThrow();
  });

  it('moves descendants during drag when subtree mode is enabled', () => {
    const handlers = new Map<string, (event: any) => void>();
    const register = vi.fn(
      (event: string, selector: string, callback: (evt: any) => void) => {
        handlers.set(`${event}:${selector}`, callback);
      },
    );

    const childPos = { x: 30, y: 40 };
    const rootPos = { x: 10, y: 20 };

    const childNode = {
      id: () => 'child',
      outgoers: vi.fn().mockReturnValue([]),
      position: vi
        .fn()
        .mockImplementation((arg: string | { x: number; y: number }) => {
          if (typeof arg === 'string') {
            return (childPos as any)[arg];
          }
          childPos.x = arg.x;
          childPos.y = arg.y;
          return undefined;
        }),
    };

    const edgeToChild = { target: () => childNode };
    const rootNode = {
      id: () => 'root',
      outgoers: vi.fn().mockReturnValue([edgeToChild]),
      position: vi
        .fn()
        .mockImplementation((arg: string | { x: number; y: number }) => {
          if (typeof arg === 'string') {
            return (rootPos as any)[arg];
          }
          rootPos.x = arg.x;
          rootPos.y = arg.y;
          return undefined;
        }),
    };

    (component as any).cy = { on: register, destroy: vi.fn() };
    (component as any).setupRecursiveSubtreeDragging();

    handlers.get('grab:node')!({ target: rootNode });
    rootNode.position({ x: 25, y: 35 });
    handlers.get('drag:node')!({ target: rootNode });
    handlers.get('free:node')!({ target: rootNode });

    expect(childPos).toEqual({ x: 45, y: 55 });
  });

  it('does not move descendants during drag when subtree mode is disabled', () => {
    const handlers = new Map<string, (event: any) => void>();
    const register = vi.fn(
      (event: string, selector: string, callback: (evt: any) => void) => {
        handlers.set(`${event}:${selector}`, callback);
      },
    );

    const childPos = { x: 30, y: 40 };
    const rootPos = { x: 10, y: 20 };

    const childNode = {
      id: () => 'child',
      outgoers: vi.fn().mockReturnValue([]),
      position: vi
        .fn()
        .mockImplementation((arg: string | { x: number; y: number }) => {
          if (typeof arg === 'string') {
            return (childPos as any)[arg];
          }
          childPos.x = arg.x;
          childPos.y = arg.y;
          return undefined;
        }),
    };

    const edgeToChild = { target: () => childNode };
    const rootNode = {
      id: () => 'root',
      outgoers: vi.fn().mockReturnValue([edgeToChild]),
      position: vi
        .fn()
        .mockImplementation((arg: string | { x: number; y: number }) => {
          if (typeof arg === 'string') {
            return (rootPos as any)[arg];
          }
          rootPos.x = arg.x;
          rootPos.y = arg.y;
          return undefined;
        }),
    };

    (component as any).cy = { on: register, destroy: vi.fn() };
    (component as any).setupRecursiveSubtreeDragging();
    component.subtreeMode.set(false);

    handlers.get('grab:node')!({ target: rootNode });
    rootNode.position({ x: 25, y: 35 });
    handlers.get('drag:node')!({ target: rootNode });

    expect(childPos).toEqual({ x: 30, y: 40 });
  });

  it('deduplicates descendants when graph has a cycle', () => {
    const rootNode: any = {
      id: () => 'root',
      outgoers: vi.fn(),
    };
    const childNode: any = {
      id: () => 'child',
      outgoers: vi.fn(),
    };

    const rootToChild = { target: () => childNode };
    const childToRoot = { target: () => rootNode };

    rootNode.outgoers.mockReturnValue([rootToChild]);
    childNode.outgoers.mockReturnValue([childToRoot]);

    const descendants = (component as any).getDescendants(rootNode);
    expect(descendants.map((node: any) => node.id())).toEqual(['child']);
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
