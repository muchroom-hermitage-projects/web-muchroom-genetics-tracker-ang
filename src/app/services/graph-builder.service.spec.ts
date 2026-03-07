import { TestBed } from '@angular/core/testing';
import { GraphBuilderService } from './graph-builder.service';
import { CultureType } from '../models/culture.model';
import {
  GRAPH_BUILDER_MOCK_CULTURES,
  GRAPH_BUILDER_MOCK_RELATIONSHIPS,
} from '../../testing/mocks';

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
    expect(rootNode?.data?.iconSvg).toContain('data:image/svg+xml;utf8,');

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
    expect(customEdge?.data?.label).toBe('custom_relation');
  });

  it('returns deterministic icon data uris and uses cache for repeated requests', () => {
    const first = (service as any).getTypeIconDataUri(CultureType.SPORE);
    const second = (service as any).getTypeIconDataUri(CultureType.SPORE);
    const other = (service as any).getTypeIconDataUri(CultureType.AGAR);

    expect(first).toContain('data:image/svg+xml;utf8,');
    expect(second).toBe(first);
    expect(other).not.toBe(first);
  });

  it('maps known relationship labels and falls back for unknown values', () => {
    expect((service as any).getRelationshipLabel('germination')).toBe(
      'germination',
    );
    expect((service as any).getRelationshipLabel('transfer')).toBe('transfer');
    expect((service as any).getRelationshipLabel('clone_from_fruit')).toBe(
      'tissue cloning',
    );
    expect((service as any).getRelationshipLabel('collecting_spores')).toBe(
      'collecting spores',
    );
    expect((service as any).getRelationshipLabel('inoculation')).toBe(
      'inoculation',
    );
    expect((service as any).getRelationshipLabel('fruiting')).toBe('fruiting');
    expect((service as any).getRelationshipLabel('unmapped')).toBe('unmapped');
  });

  it('returns svg for each culture type and defaults to spore icon for unknown types', () => {
    const values = Object.values(CultureType);
    values.forEach((type) => {
      const svg = (service as any).getTypeIconSvg(type);
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
    });

    const sporeSvg = (service as any).getTypeIconSvg(CultureType.SPORE);
    const fallbackSvg = (service as any).getTypeIconSvg('unknown_type');
    expect(fallbackSvg).toBe(sporeSvg);
  });

  it('exposes stylesheet entries for core, archived, contaminated, and edge states', () => {
    const stylesheet = service.getStylesheet();
    expect(stylesheet.length).toBeGreaterThan(10);

    const findStyle = (selector: string) =>
      stylesheet.find((entry) => entry.selector === selector);

    expect(findStyle('node')?.style?.['background-image']).toBe(
      'data(iconSvg)',
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
