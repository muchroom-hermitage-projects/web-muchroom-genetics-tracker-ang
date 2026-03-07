import { expect, Locator, Page } from '@playwright/test';

const CY_HANDLE = '__GENETICS_GRAPH_CY__';

type CytoscapeWindow = Window & {
  [CY_HANDLE]?: {
    edges: () => {
      source: () => { id: () => string };
      target: () => { id: () => string };
    }[];
    nodes: (selector?: string) => { length: number };
    getElementById: (id: string) => {
      empty: () => boolean;
      position: () => { x: number; y: number };
      position: (point: { x: number; y: number }) => void;
      emit: (event: string) => void;
      id: () => string;
    };
  };
};

export class GeneticsGraphPage {
  readonly graphArea: Locator;
  readonly nodeCount: Locator;
  readonly detailPanel: Locator;
  readonly minViabilityInput: Locator;

  constructor(private readonly page: Page) {
    this.graphArea = this.page.locator('.graph-area');
    this.nodeCount = this.page.locator('.node-count');
    this.detailPanel = this.page.locator('.detail-panel');
    this.minViabilityInput = this.page.locator(
      'input[formcontrolname="minViability"]',
    );
  }

  async goto(): Promise<void> {
    await this.page.goto('/');
    await expect(this.graphArea).toBeVisible();
    await this.waitForCy();
  }

  async clickNode(nodeId: string): Promise<void> {
    await this.waitForCy();
    await this.page.evaluate(
      ({ id, handle }) => {
        const cy = (window as CytoscapeWindow)[handle];
        if (!cy) {
          throw new Error('Cytoscape instance is unavailable');
        }
        const node = cy.getElementById(id);
        if (node.empty()) {
          throw new Error(`Node ${id} not found`);
        }
        node.emit('tap');
      },
      { id: nodeId, handle: CY_HANDLE },
    );
  }

  async dragNode(nodeId: string, dx: number, dy: number): Promise<void> {
    await this.waitForCy();
    await this.page.evaluate(
      ({ id, deltaX, deltaY, handle }) => {
        const cy = (window as CytoscapeWindow)[handle];
        if (!cy) {
          throw new Error('Cytoscape instance is unavailable');
        }

        const node = cy.getElementById(id);
        if (node.empty()) {
          throw new Error(`Node ${id} not found`);
        }

        const start = node.position();
        node.emit('grab');
        node.position({ x: start.x + deltaX, y: start.y + deltaY });
        node.emit('drag');
        node.emit('free');
      },
      { id: nodeId, deltaX: dx, deltaY: dy, handle: CY_HANDLE },
    );
  }

  async hasParentChildConnection(
    parentId: string,
    childId: string,
  ): Promise<boolean> {
    await this.waitForCy();
    return this.page.evaluate(
      ({ parent, child, handle }) => {
        const cy = (window as CytoscapeWindow)[handle];
        if (!cy) {
          return false;
        }
        return cy
          .edges()
          .some(
            (edge) =>
              edge.source().id() === parent && edge.target().id() === child,
          );
      },
      { parent: parentId, child: childId, handle: CY_HANDLE },
    );
  }

  async getVisibleNodeCount(): Promise<number> {
    await this.waitForCy();
    return this.page.evaluate((handle) => {
      const cy = (window as CytoscapeWindow)[handle];
      if (!cy) {
        return 0;
      }
      return cy.nodes(':visible').length;
    }, CY_HANDLE);
  }

  async applyMinViability(value: number): Promise<void> {
    await this.minViabilityInput.fill(String(value));
    await this.minViabilityInput.blur();
  }

  private async waitForCy(): Promise<void> {
    await expect
      .poll(() =>
        this.page.evaluate(
          (handle) => Boolean((window as CytoscapeWindow)[handle]),
          CY_HANDLE,
        ),
      )
      .toBeTruthy();
  }
}
