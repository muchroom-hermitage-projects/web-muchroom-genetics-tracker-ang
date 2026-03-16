import { TestBed } from '@angular/core/testing';
import { GraphBuilderService } from './graph-builder.service';
import {
  GRAPH_BUILDER_MOCK_CULTURES,
  GRAPH_BUILDER_MOCK_RELATIONSHIPS,
} from '../../testing/mocks';
import { RelationshipType } from '../models/culture.model';

describe('GraphBuilderService', () => {
  let service: GraphBuilderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GraphBuilderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('builds node and edge elements with mapped labels and metadata', () => {
    const elements = service.buildElements(
      GRAPH_BUILDER_MOCK_CULTURES,
      GRAPH_BUILDER_MOCK_RELATIONSHIPS,
    );

    expect(elements).toHaveLength(4);

    const rootNode = elements.find((e) => e.data?.id === 'c1');
    const archivedNode = elements.find((e) => e.data?.id === 'c2');
    const transferEdge = elements.find((e) => e.data?.id === 'r1');
    const customEdge = elements.find((e) => e.data?.id === 'r2');

    expect(rootNode?.group).toBe('nodes');
    expect(rootNode?.data?.label).toBe('Root');
    expect(rootNode?.data?.isArchived).toBe(false);
    expect(rootNode?.data?.isContaminated).toBe(false);
    expect(rootNode?.data?.icon).toBe('agar');
    expect(rootNode?.data?.iconUrl).toBe('assets/icons/agar/agar.png');

    expect(archivedNode?.group).toBe('nodes');
    expect(archivedNode?.data?.label).toBe('Archived child (archived)');
    expect(archivedNode?.data?.isArchived).toBe(true);
    expect(archivedNode?.data?.isContaminated).toBe(true);
    expect(archivedNode?.data?.fullData).toEqual(
      GRAPH_BUILDER_MOCK_CULTURES[1],
    );

    expect(transferEdge?.group).toBe('edges');
    expect(transferEdge?.data?.relation).toBe('transfer');
    expect(transferEdge?.data?.label).toBe('transfer');

    expect(customEdge?.data?.relation).toBe('custom_relation');
    expect(customEdge?.data?.label).toBe('custom relation');
  });

  it('replaces underscores in relationship labels', () => {
    const elements = service.buildElements(GRAPH_BUILDER_MOCK_CULTURES, [
      {
        id: 'r3',
        sourceId: 'c1',
        targetId: 'c2',
        type: RelationshipType.CLONE_FROM_FRUIT,
      },
    ]);

    const edge = elements.find((e) => e.data?.id === 'r3');

    expect(edge?.data?.relation).toBe('clone_from_fruit');
    expect(edge?.data?.label).toBe('clone from fruit');
  });

  it('computes icon urls based on the icon key', () => {
    expect((service as any).getIconUrl('agar')).toBe(
      'assets/icons/agar/agar.png',
    );
    expect((service as any).getIconUrl('grain-spawn')).toBe(
      'assets/icons/grain-spawn/grain-spawn.png',
    );
  });

  it('exposes stylesheet entries for core, archived, contaminated, and edge states', () => {
    const stylesheet = service.getStylesheet();
    expect(stylesheet.length).toBeGreaterThan(10);

    const findStyle = (selector: string) =>
      stylesheet.find((entry) => entry.selector === selector);

    expect(findStyle('node')?.style?.['background-image']).toBe(
      'data(iconUrl)',
    );
    expect(findStyle('edge')?.style?.['target-arrow-shape']).toBe('triangle');
    expect(findStyle('.selected')?.style?.['border-color']).toBe('#ffd700');
    expect(
      findStyle('node[?isArchived]')?.style?.['background-image-opacity'],
    ).toBe(0.4);
    expect(findStyle('node[?isContaminated]')?.style?.['border-color']).toBe(
      '#d32f2f',
    );
    expect(
      findStyle('node[?isContaminated][?isArchived]')?.style?.[
        'background-color'
      ],
    ).toBe('#ffebee');
  });
});
