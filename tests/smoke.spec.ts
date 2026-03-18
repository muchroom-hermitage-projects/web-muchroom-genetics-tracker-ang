import { expect, test } from '@playwright/test';
import { GeneticsGraphPage } from './pom/GeneticsGraph.page';

test.describe('Genetics graph smoke tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.clear();
    });
  });

  test('renders nodes provided by the service', async ({ page }) => {
    const graph = new GeneticsGraphPage(page);
    await graph.goto();

    await expect(graph.nodeCount).toContainText('8 cultures');
    await expect.poll(() => graph.getVisibleNodeCount()).toBe(8);
    await expect(
      graph.hasParentChildConnection('sp1', 'ag1'),
    ).resolves.toBeTruthy();
  });

  test('selecting a node shows matching culture details', async ({ page }) => {
    const graph = new GeneticsGraphPage(page);
    await graph.goto();

    await graph.dragNode('ag1', 50, 40);
    await expect(
      graph.hasParentChildConnection('ag1', 'ag1b'),
    ).resolves.toBeTruthy();

    await graph.clickNode('ag1');
    await expect(graph.detailPanel).toBeVisible();
    await expect(graph.detailPanel).toContainText('POS-1 AG1');
    await expect(graph.detailPanel).toContainText('Culture Details');
  });

  test('min viability filter updates the visible graph set', async ({
    page,
  }) => {
    const graph = new GeneticsGraphPage(page);
    await graph.goto();

    await expect.poll(() => graph.getVisibleNodeCount()).toBe(8);
    await graph.applyMinViability(93);
    await expect.poll(() => graph.getVisibleNodeCount()).toBe(1);
    await expect(graph.nodeCount).toContainText('1 cultures');
  });
});
