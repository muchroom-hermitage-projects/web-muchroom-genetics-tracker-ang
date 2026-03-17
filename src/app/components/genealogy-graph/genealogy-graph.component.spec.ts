import { ComponentFixture, TestBed } from '@angular/core/testing';
import cytoscape from 'cytoscape';
import { GenealogyGraphComponent } from './genealogy-graph.component';
import { CultureService } from '../../services/culture.service';
import { GraphBuilderService } from '../../services/graph-builder.service';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { NodeModalComponent } from '../node-modal/node-modal.component';
import { Culture, Relationship } from '../../models/culture.model';
import { BehaviorSubject, of } from 'rxjs';
import {
  GENEALOGY_VISIBLE_CULTURES,
  GENEALOGY_VISIBLE_RELATIONSHIPS,
  SAMPLE_CULTURE,
} from '../../../testing/mocks';

vi.mock('cytoscape-navigator', () => ({
  default: vi.fn(),
}));

vi.mock('cytoscape-dagre', () => ({
  default: {},
}));

vi.mock('cytoscape-context-menus', () => ({
  default: vi.fn(),
}));

vi.mock('cytoscape', () => {
  const contextMenuInstance = {
    destroy: vi.fn(),
    showMenuItem: vi.fn(),
    hideMenuItem: vi.fn(),
  };

  const mockCyInstance = {
    navigator: vi.fn(),
    on: vi.fn(),
    elements: vi
      .fn()
      .mockReturnValue({ remove: vi.fn(), removeClass: vi.fn() }),
    add: vi.fn(),
    layout: vi.fn().mockReturnValue({ run: vi.fn() }),
    fit: vi.fn(),
    destroy: vi.fn(),
    contextMenus: vi.fn().mockReturnValue(contextMenuInstance),
    getElementById: vi.fn().mockReturnValue({
      addClass: vi.fn(),
      incomers: vi.fn().mockReturnValue([]),
    }),
  };

  const mockCytoscape = vi.fn(() => mockCyInstance);
  (mockCytoscape as any).use = vi.fn();
  (mockCytoscape as any).__mockCyInstance = mockCyInstance;
  (mockCytoscape as any).__mockContextMenuInstance = contextMenuInstance;

  return {
    __esModule: true,
    default: mockCytoscape,
  };
});

class MockCultureService {
  private readonly filteredCultures$ = new BehaviorSubject<Culture[]>([]);
  private readonly relationships$ = new BehaviorSubject<Relationship[]>([]);
  private readonly selectedNodeId$ = new BehaviorSubject<string | null>(null);

  deleteCulture = vi.fn();
  deleteCultureTree = vi.fn();
  archiveCulture = vi.fn();
  restoreCulture = vi.fn();
  updateCulture = vi.fn();
  setSelectedNode = vi.fn();
  getDescendants = vi.fn().mockReturnValue([]);

  emitFilteredCultures(value: Culture[]) {
    this.filteredCultures$.next(value);
  }

  emitRelationships(value: Relationship[]) {
    this.relationships$.next(value);
  }

  emitSelectedNodeId(value: string | null) {
    this.selectedNodeId$.next(value);
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
    vi.clearAllMocks();
    dialogSpy = new DialogSpy();

    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule, GenealogyGraphComponent],
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

  it('filters visible relationships based on current graph state', () => {
    cultureService.emitFilteredCultures(GENEALOGY_VISIBLE_CULTURES);
    cultureService.emitRelationships(GENEALOGY_VISIBLE_RELATIONSHIPS);

    const visible = (component as any).getVisibleRelationships();
    expect(visible).toEqual([GENEALOGY_VISIBLE_RELATIONSHIPS[0]]);
  });

  it('initializes the minimap with the custom container', () => {
    const cyInstance = (cytoscape as any).__mockCyInstance;

    expect(cyInstance.navigator).toHaveBeenCalledWith(
      expect.objectContaining({
        container: '#cyNavigator',
        viewLiveFramerate: 0,
        dblClickDelay: 200,
        removeCustomContainer: false,
      }),
    );
  });

  it('initializes context menu items for culture nodes', () => {
    const cyInstance = (cytoscape as any).__mockCyInstance;
    const options = cyInstance.contextMenus.mock.calls[0][0] as {
      menuItems: Array<{ id: string; selector: string }>;
    };

    const ids = options.menuItems.map((item) => item.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'details',
        'add-child',
        'remove-node',
        'archive',
        'restore',
        'contaminated',
        'clean',
      ]),
    );
    options.menuItems.forEach((item) => {
      expect(item.selector).toBe('node');
    });
  });

  it('renders a navigator container in the template', () => {
    const navigatorEl = fixture.nativeElement.querySelector('#cyNavigator');

    expect(navigatorEl).not.toBeNull();
    expect(navigatorEl.id).toBe('cyNavigator');
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
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
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
    expect(warnSpy).toHaveBeenCalledWith(
      'Error highlighting path:',
      expect.any(Error),
    );
    warnSpy.mockRestore();
  });

  it('updates context menu toggle visibility based on node metadata', () => {
    const showMenuItem = vi.fn();
    const hideMenuItem = vi.fn();
    const destroy = vi.fn();

    (component as any).contextMenu = { showMenuItem, hideMenuItem, destroy };
    cultureService.emitFilteredCultures([
      {
        ...sampleCulture,
        metadata: { isArchived: true, isContaminated: true },
      },
    ]);

    (component as any).updateContextMenuVisibility({ id: () => 'node-1' });

    expect(showMenuItem).toHaveBeenCalledWith('restore');
    expect(hideMenuItem).toHaveBeenCalledWith('archive');
    expect(showMenuItem).toHaveBeenCalledWith('clean');
    expect(hideMenuItem).toHaveBeenCalledWith('contaminated');
  });

  it('removes a node tree when confirmed and descendants exist', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    cultureService.getDescendants.mockReturnValue([{ id: 'child' }]);

    (component as any).handleRemoveNode('node-1');

    expect(confirmSpy).toHaveBeenCalledWith(
      'Remove node and all its children?',
    );
    expect(cultureService.deleteCultureTree).toHaveBeenCalledWith('node-1');
    expect(cultureService.setSelectedNode).toHaveBeenCalledWith(null);
    confirmSpy.mockRestore();
  });

  it('removes a single node when confirmed and no descendants exist', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    cultureService.getDescendants.mockReturnValue([]);

    (component as any).handleRemoveNode('node-1');

    expect(confirmSpy).toHaveBeenCalledWith('Are you sure?');
    expect(cultureService.deleteCulture).toHaveBeenCalledWith('node-1');
    expect(cultureService.setSelectedNode).toHaveBeenCalledWith(null);
    confirmSpy.mockRestore();
  });

  it('skips deletion when confirmation is canceled', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    cultureService.getDescendants.mockReturnValue([{ id: 'child' }]);

    (component as any).handleRemoveNode('node-1');

    expect(confirmSpy).toHaveBeenCalledWith(
      'Remove node and all its children?',
    );
    expect(cultureService.deleteCultureTree).not.toHaveBeenCalled();
    expect(cultureService.deleteCulture).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('does not throw when filtered cultures emit during view init', () => {
    const altFixture = TestBed.createComponent(GenealogyGraphComponent);
    const altComponent = altFixture.componentInstance;
    const altService = TestBed.inject(
      CultureService,
    ) as unknown as MockCultureService;

    const originalInit = altComponent.ngAfterViewInit.bind(altComponent);
    altComponent.ngAfterViewInit = () => {
      originalInit();
      altService.emitFilteredCultures([
        { ...sampleCulture, id: 'node-a' },
        { ...sampleCulture, id: 'node-b' },
      ]);
    };

    expect(() => altFixture.detectChanges()).not.toThrow();

    const countEl = altFixture.nativeElement.querySelector('.node-count');
    expect(countEl.textContent).toContain('2 cultures');
  });

  it('refreshes the graph when filtered cultures emit after cy is available', () => {
    const remove = vi.fn();
    const add = vi.fn();
    const run = vi.fn();
    const layout = vi.fn().mockReturnValue({ run });

    (component as any).cy = {
      elements: vi.fn().mockReturnValue({ remove }),
      add,
      layout,
    };

    cultureService.emitFilteredCultures([sampleCulture]);
    TestBed.flushEffects();

    expect(remove).toHaveBeenCalled();
    expect(add).toHaveBeenCalledWith([]);
    expect(run).toHaveBeenCalled();
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
      cultureService.emitFilteredCultures([sampleCulture]);
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
      cultureService.emitFilteredCultures([sampleCulture]);
      dialogSpy.setResult({ delete: true });

      (component as any).openEditCultureModal('node-1');

      expect(cultureService.deleteCulture).toHaveBeenCalledWith('node-1');
      expect(cultureService.setSelectedNode).toHaveBeenCalledWith(null);
    });

    it('ignores unknown culture ids', () => {
      cultureService.emitFilteredCultures([]);
      dialogSpy.setResult({ updates: { label: 'Ignored' } });

      (component as any).openEditCultureModal('missing');

      expect(dialogSpy.open).not.toHaveBeenCalled();
      expect(cultureService.updateCulture).not.toHaveBeenCalled();
    });
  });
});
