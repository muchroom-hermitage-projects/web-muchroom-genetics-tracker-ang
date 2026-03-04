// components/genealogy-graph/genealogy-graph.component.ts
import {
  Component,
  OnInit,
  AfterViewInit,
  ViewChild,
  ElementRef,
  OnDestroy,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';

import { CultureService } from '../../services/culture.service';
import { GraphBuilderService } from '../../services/graph-builder.service';
import { NodeModalComponent } from '../node-modal/node-modal.component';
import { Culture, Relationship } from '../../models/culture.model';

// Register dagre layout
cytoscape.use(dagre);

@Component({
  selector: 'app-genealogy-graph',
  templateUrl: './genealogy-graph.component.html',
  styleUrls: ['./genealogy-graph.component.scss'],
})
export class GenealogyGraphComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  @ViewChild('cyContainer') cyContainer!: ElementRef;

  private cy!: cytoscape.Core;
  cultures: Culture[] = [];
  private relationships: Relationship[] = [];
  private subscriptions: Subscription[] = [];

  constructor(
    private cultureService: CultureService,
    private graphBuilder: GraphBuilderService,
    private dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    // Subscribe to data changes
    this.subscriptions.push(
      this.cultureService.getCultures().subscribe((cultures) => {
        this.cultures = cultures;
        this.refreshGraph();
      }),
    );

    this.subscriptions.push(
      this.cultureService.getRelationships().subscribe((relationships) => {
        this.relationships = relationships;
        this.refreshGraph();
      }),
    );

    this.subscriptions.push(
      this.cultureService.getSelectedNodeId().subscribe((nodeId) => {
        this.highlightNode(nodeId);
      }),
    );
  }

  ngAfterViewInit(): void {
    this.initGraph();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.cy) {
      this.cy.destroy();
    }
  }

  private initGraph(): void {
    const elements = this.graphBuilder.buildElements(this.cultures, this.relationships);

    this.cy = cytoscape({
      container: this.cyContainer.nativeElement,
      elements: elements,
      style: this.graphBuilder.getStylesheet(),
      // Fixed: Layout options are correctly formatted here
      layout: {
        name: 'dagre',
        // These are dagre-specific options that work in the initial layout
        nodeSep: 50,
        edgeSep: 20,
        rankSep: 100,
        rankDir: 'TB',
        ranker: 'network-simplex',
        animate: false
      } as any,  // Type assertion to bypass the strict name check
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
      autoungrabify: false,
      autounselectify: false,
    });

    // Node click handler
    this.cy.on('tap', 'node', (event) => {
      const node = event.target;
      this.cultureService.setSelectedNode(node.id());
      this.openNodeModal(node.data('fullData'));
    });

    // Background click clears selection
    this.cy.on('tap', (event) => {
      if (event.target === this.cy) {
        this.cultureService.setSelectedNode(null);
      }
    });

    // Edge click handler
    this.cy.on('tap', 'edge', (event) => {
      const edge = event.target;
      console.log('Edge clicked:', edge.data());
      // You could show relationship details here
    });
  }

  private refreshGraph(): void {
    if (!this.cy) return;

    const elements = this.graphBuilder.buildElements(this.cultures, this.relationships);
    this.cy.elements().remove();
    this.cy.add(elements);

    // Fixed: Use the correct approach for applying layout after initialization
    const layout = this.cy.layout({
      name: 'dagre',
      // These options work in the layout method as well
      nodeSep: 50,
      edgeSep: 20,
      rankSep: 100,
      rankDir: 'TB',
      animate: true,
      animationDuration: 500,
      // Add these to improve tree layout
      spacingFactor: 1.5,
      nodeDimensionsIncludeLabels: true
    } as any); // Use type assertion to bypass TypeScript's strict checking

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

          const incomingEdges = this.cy.getElementById(currentId).incomers('edge');
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

  private openNodeModal(culture: Culture): void {
    const dialogRef = this.dialog.open(NodeModalComponent, {
      width: '500px',
      data: { culture: { ...culture } }, // Pass a copy
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        if (result.delete) {
          this.cultureService.deleteCulture(culture.id);
        } else {
          // Update culture
          this.cultureService.updateCulture(culture.id, result.updates);
        }
      }
    });
  }

  fitGraph(): void {
    this.cy.fit();
  }

  resetLayout(): void {
    // Fixed: Use type assertion for layout options
    const layout = this.cy.layout({
      name: 'dagre',
      nodeSep: 50,
      edgeSep: 20,
      rankSep: 100,
      rankDir: 'TB',
      animate: true,
      animationDuration: 500,
      spacingFactor: 1.5,
      nodeDimensionsIncludeLabels: true
    } as any);

    layout.run();
  }
}
