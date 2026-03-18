import {
  Component,
  AfterViewInit,
  ViewChild,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import cytoscape, { LayoutOptions } from 'cytoscape';
import navigator from 'cytoscape-navigator';
import dagre from 'cytoscape-dagre';
import contextMenus from 'cytoscape-context-menus';

import { CultureService } from '../../services/culture.service';
import { GraphBuilderService } from '../../services/graph-builder.service';
import { Culture, Relationship } from '../../models/culture.model';
import { NodeModalComponent } from '../node-modal/node-modal.component';
import {
  CONTEXT_MENU_SELECTOR,
  ContextMenuInstance,
  CytoscapeWithContextMenus,
} from '../../models/context-menu.models';

// Register dagre layout
if (cytoscape && typeof cytoscape.use === 'function') {
  cytoscape.use(dagre);
  navigator(cytoscape);
  contextMenus(cytoscape);
}

const E2E_CY_HANDLE = '__GENETICS_GRAPH_CY__';

@Component({
  selector: 'app-genealogy-graph',
  imports: [
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatCheckboxModule,
  ],
  templateUrl: './genealogy-graph.component.html',
  styleUrls: ['./genealogy-graph.component.scss'],
})
export class GenealogyGraphComponent implements AfterViewInit, OnDestroy {
  private readonly cultureService = inject(CultureService);
  private readonly graphBuilder = inject(GraphBuilderService);
  private readonly dialog = inject(MatDialog);
  private readonly initialLayout = {
    name: 'dagre',
    nodeSep: 50,
    edgeSep: 20,
    rankSep: 50,
    rankDir: 'TB',
    animate: false,
    spacingFactor: 1.5,
    nodeDimensionsIncludeLabels: true,
  } as LayoutOptions;

  private readonly filteredCulturesSignal = toSignal(
    this.cultureService.getFilteredCultures(),
    { initialValue: [] as Culture[] },
  );
  readonly cultures = this.filteredCulturesSignal;
  private readonly relationshipsSignal = toSignal(
    this.cultureService.getRelationships(),
    { initialValue: [] as Relationship[] },
  );
  private readonly selectedNodeIdSignal = toSignal(
    this.cultureService.getSelectedNodeId(),
    { initialValue: null },
  );

  @ViewChild('cyContainer') cyContainer!: ElementRef;

  private cy!: cytoscape.Core;
  private contextMenu?: ContextMenuInstance;
  readonly subtreeMode = signal(true);
  readonly subtreeModeLabel = computed(() =>
    this.subtreeMode() ? 'Subtree Mode' : 'Cascade Drag',
  );
  readonly subtreeModeTooltip = computed(() => {
    return this.subtreeMode()
      ? 'Subtree Mode: Dragging a parent node moves all its descendants while maintaining relative positions.'
      : 'Cascade Drag: Dragging a node moves only that specific node without affecting its children.';
  });

  constructor() {
    effect(() => {
      const cultures = this.cultures();
      const relationships = this.relationshipsSignal();
      this.refreshGraph(cultures, relationships);
    });
    effect(() => {
      const selectedNodeId = this.selectedNodeIdSignal();
      this.highlightNode(selectedNodeId);
    });
  }

  ngAfterViewInit(): void {
    this.initGraph();
  }

  ngOnDestroy(): void {
    if (this.cy) {
      this.cy.destroy();
    }
    if (this.contextMenu) {
      this.contextMenu.destroy();
    }
    this.clearE2EHandle();
  }

  private getVisibleRelationships(): Relationship[] {
    return this.getVisibleRelationshipsFor(
      this.cultures(),
      this.relationshipsSignal(),
    );
  }

  private getVisibleRelationshipsFor(
    cultures: Culture[],
    relationships: Relationship[],
  ): Relationship[] {
    const visibleNodeIds = new Set(cultures.map((c) => c.id));
    return relationships.filter(
      (r) => visibleNodeIds.has(r.sourceId) && visibleNodeIds.has(r.targetId),
    );
  }

  private initGraph(): void {
    if (typeof cytoscape !== 'function') {
      return;
    }

    const cultures = this.cultures();
    const relationships = this.relationshipsSignal();
    const elements = this.graphBuilder.buildElements(
      cultures,
      this.getVisibleRelationshipsFor(cultures, relationships),
    );

    this.cy = cytoscape({
      container: this.cyContainer.nativeElement,
      elements: elements,
      style: this.graphBuilder.getStylesheet(),
      layout: this.initialLayout,
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
      autoungrabify: false,
      autounselectify: false,
    });
    this.exposeCyForE2E();

    this.cy.navigator({
      container: '#cyNavigator',
      viewLiveFramerate: 0,
      dblClickDelay: 200,
      removeCustomContainer: false,
    });
    this.initContextMenu();

    this.cy.on('tap', 'node', (event) => {
      const node = event.target;
      const mouseEvent = event.originalEvent as MouseEvent | undefined;
      const isDoubleClick = mouseEvent?.detail === 2;
      this.cultureService.setSelectedNode(node.id());

      if (isDoubleClick) {
        this.openEditCultureModal(node.id());
      }
    });

    this.cy.on('tap', (event) => {
      if (event.target === this.cy) {
        this.cultureService.setSelectedNode(null);
      }
    });

    this.cy.on('tap', 'edge', (event) => {
      const edge = event.target;
      // console.log('Edge clicked:', edge.data());
    });

    this.setupRecursiveSubtreeDragging();
  }

  private setupRecursiveSubtreeDragging(): void {
    let dragStartPositions: Map<string, { x: number; y: number }> | null = null;
    let draggedNodeId: string | null = null;

    // Capture initial positions when drag starts
    this.cy.on('grab', 'node', (event) => {
      const draggedNode = event.target;
      draggedNodeId = draggedNode.id();
      dragStartPositions = new Map();

      const descendants = this.getDescendants(draggedNode);

      dragStartPositions.set(draggedNode.id(), {
        x: draggedNode.position('x'),
        y: draggedNode.position('y'),
      });

      descendants.forEach((descendant: any) => {
        dragStartPositions!.set(descendant.id(), {
          x: descendant.position('x'),
          y: descendant.position('y'),
        });
      });
    });

    // Apply delta to all descendants during drag
    this.cy.on('drag', 'node', (event) => {
      if (!dragStartPositions || !draggedNodeId) return;

      const draggedNode = event.target;
      if (draggedNode.id() !== draggedNodeId) return;

      // Only apply to descendants if subtree mode is enabled
      if (!this.subtreeMode()) return;

      // Calculate delta from original position
      const originalPos = dragStartPositions.get(draggedNode.id());
      if (!originalPos) return;

      const dx = draggedNode.position('x') - originalPos.x;
      const dy = draggedNode.position('y') - originalPos.y;

      // Apply same offset to all descendants
      const descendants = this.getDescendants(draggedNode);
      descendants.forEach((descendant: any) => {
        const descendantOriginalPos = dragStartPositions!.get(descendant.id());
        if (descendantOriginalPos) {
          descendant.position({
            x: descendantOriginalPos.x + dx,
            y: descendantOriginalPos.y + dy,
          });
        }
      });
    });

    // Update global state when drag ends
    this.cy.on('free', 'node', (event) => {
      if (!dragStartPositions || !draggedNodeId) return;

      const draggedNode = event.target;
      if (draggedNode.id() !== draggedNodeId) return;

      // Clear drag state
      dragStartPositions = null;
      draggedNodeId = null;
    });
  }

  private getDescendants(node: any): any[] {
    const descendants: any[] = [];
    const visited = new Set<string>();
    const queue: any[] = [node];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentId = current.id();

      if (visited.has(currentId)) continue;
      visited.add(currentId);

      // Get all outgoing edges (children)
      const outgoingEdges = current.outgoers('edge');
      outgoingEdges.forEach((edge: any) => {
        const targetNode = edge.target();
        const targetId = targetNode.id();

        if (!visited.has(targetId)) {
          descendants.push(targetNode);
          queue.push(targetNode);
        }
      });
    }

    return descendants;
  }

  private refreshGraph(
    cultures: Culture[],
    relationships: Relationship[],
  ): void {
    if (!this.cy) return;

    const elements = this.graphBuilder.buildElements(
      cultures,
      this.getVisibleRelationshipsFor(cultures, relationships),
    );
    this.cy.elements().remove();
    this.cy.add(elements);

    // Fixed: Use the correct approach for applying initialLayout after initialization
    // Use type assertion to bypass TypeScript's strict checking
    const layout = this.cy.layout(this.initialLayout);

    layout.run();
  }

  private highlightNode(nodeId: string | null): void {
    if (!this.cy) return;

    this.cy.elements().removeClass('selected');

    if (nodeId) {
      const node = this.cy.getElementById(nodeId);
      node.addClass('selected');

      // Highlight path to root using a simpler approach
      try {
        const visited = new Set<string>();
        const queue = [nodeId];

        while (queue.length > 0) {
          const currentId = queue.shift()!;
          if (visited.has(currentId)) continue;
          visited.add(currentId);

          const incomingEdges = this.cy
            .getElementById(currentId)
            .incomers('edge');
          incomingEdges.forEach((edge: any) => {
            const sourceId = edge.data('source');
            if (sourceId && !visited.has(sourceId)) {
              this.cy.getElementById(sourceId).addClass('selected');
              queue.push(sourceId);
            }
          });
        }
      } catch (e) {
        console.warn('Error highlighting path:', e);
      }
    }
  }

  private openEditCultureModal(nodeId: string): void {
    const culture = this.cultures().find((c) => c.id === nodeId);
    if (!culture) {
      return;
    }

    const dialogRef = this.dialog.open(NodeModalComponent, {
      width: '500px',
      panelClass: culture.metadata?.isContaminated ? 'contaminated-modal' : '',
      data: {
        culture: { ...culture },
        isNew: false,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) {
        return;
      }

      if (result.delete) {
        this.cultureService.deleteCulture(culture.id);
        this.cultureService.setSelectedNode(null);
        return;
      }

      this.cultureService.updateCulture(culture.id, result.updates);
    });
  }

  private openAddChildModal(parentId: string): void {
    this.dialog.open(NodeModalComponent, {
      width: '500px',
      data: { parentId },
    });
  }

  private initContextMenu(): void {
    const core = this.cy as CytoscapeWithContextMenus;
    if (!core.contextMenus) {
      return;
    }

    this.contextMenu?.destroy();

    this.contextMenu = core.contextMenus({
      menuItems: [
        {
          id: 'details',
          content: 'Details',
          selector: CONTEXT_MENU_SELECTOR,
          onClickFunction: (event) => {
            this.openEditCultureModal(event.target.id());
          },
        },
        {
          id: 'add-child',
          content: 'Add child',
          selector: CONTEXT_MENU_SELECTOR,
          onClickFunction: (event) => {
            this.openAddChildModal(event.target.id());
          },
        },
        {
          id: 'remove-node',
          content: 'Remove node',
          selector: CONTEXT_MENU_SELECTOR,
          onClickFunction: (event) => {
            this.handleRemoveNode(event.target.id());
          },
        },
        {
          id: 'archive',
          content: 'Archive',
          selector: CONTEXT_MENU_SELECTOR,
          onClickFunction: (event) => {
            this.setArchiveState(event.target.id(), true);
          },
        },
        {
          id: 'restore',
          content: 'Restore',
          selector: CONTEXT_MENU_SELECTOR,
          show: false,
          onClickFunction: (event) => {
            this.setArchiveState(event.target.id(), false);
          },
        },
        {
          id: 'contaminated',
          content: 'Contaminated',
          selector: CONTEXT_MENU_SELECTOR,
          onClickFunction: (event) => {
            this.setContaminationState(event.target.id(), true);
          },
        },
        {
          id: 'clean',
          content: 'Clean',
          selector: CONTEXT_MENU_SELECTOR,
          show: false,
          onClickFunction: (event) => {
            this.setContaminationState(event.target.id(), false);
          },
        },
      ],
    });

    this.cy.on('cxttapstart', CONTEXT_MENU_SELECTOR, (event) => {
      this.updateContextMenuVisibility(event.target);
    });
  }

  private updateContextMenuVisibility(node: cytoscape.NodeSingular): void {
    if (!this.contextMenu) {
      return;
    }

    const culture = this.cultures().find((item) => item.id === node.id());
    const isArchived = culture?.metadata?.isArchived ?? false;
    const isContaminated = culture?.metadata?.isContaminated ?? false;

    if (isArchived) {
      this.contextMenu.showMenuItem('restore');
      this.contextMenu.hideMenuItem('archive');
    } else {
      this.contextMenu.showMenuItem('archive');
      this.contextMenu.hideMenuItem('restore');
    }

    if (isContaminated) {
      this.contextMenu.showMenuItem('clean');
      this.contextMenu.hideMenuItem('contaminated');
    } else {
      this.contextMenu.showMenuItem('contaminated');
      this.contextMenu.hideMenuItem('clean');
    }
  }

  private handleRemoveNode(nodeId: string): void {
    const descendants = this.cultureService.getDescendants(nodeId);
    const hasDescendants = descendants.length > 0;
    const message = hasDescendants
      ? 'Remove node and all its children?'
      : 'Are you sure?';

    if (!confirm(message)) {
      return;
    }

    if (hasDescendants) {
      this.cultureService.deleteCultureTree(nodeId);
    } else {
      this.cultureService.deleteCulture(nodeId);
    }
    this.cultureService.setSelectedNode(null);
  }

  private setArchiveState(nodeId: string, isArchived: boolean): void {
    if (isArchived) {
      this.cultureService.archiveCulture(nodeId);
      return;
    }

    this.cultureService.restoreCulture(nodeId);
  }

  private setContaminationState(nodeId: string, isContaminated: boolean): void {
    const culture = this.cultures().find((item) => item.id === nodeId);
    if (!culture) {
      return;
    }

    this.cultureService.updateCulture(nodeId, {
      metadata: {
        ...culture.metadata,
        isContaminated,
      },
    });
  }

  private exposeCyForE2E(): void {
    if (typeof window === 'undefined') {
      return;
    }
    (window as Window & { [E2E_CY_HANDLE]?: cytoscape.Core })[E2E_CY_HANDLE] =
      this.cy;
  }

  private clearE2EHandle(): void {
    if (typeof window === 'undefined') {
      return;
    }
    delete (window as Window & { [E2E_CY_HANDLE]?: cytoscape.Core })[
      E2E_CY_HANDLE
    ];
  }

  fitGraph(): void {
    this.cy.fit();
  }

  resetLayout(): void {
    // Fixed: Use type assertion for initialLayout options
    const layout = this.cy.layout(this.initialLayout);

    layout.run();
  }
}
