// services/graph-builder.service.ts
import { Injectable } from '@angular/core';
import { Culture, Relationship, CultureType } from '../models/culture.model';
import * as cytoscape from 'cytoscape';

@Injectable({
  providedIn: 'root',
})
export class GraphBuilderService {
  private readonly iconDataCache: Record<string, string> = {};

  buildElements(
    cultures: Culture[],
    relationships: Relationship[],
  ): cytoscape.ElementDefinition[] {
    const nodes: cytoscape.ElementDefinition[] = cultures.map((culture) => ({
      data: {
        id: culture.id,
        label: culture.label,
        iconSvg: this.getTypeIconDataUri(culture.type),
        type: culture.type,
        strain: culture.strain,
        filial: culture.filialGeneration,
        description: culture.description,
        dateCreated: culture.dateCreated,
        isArchived: culture.metadata?.isArchived || false,
        fullData: culture, // Store for reference
      },
      position: undefined, // Let layout handle positioning
      group: 'nodes',
    }));

    const edges: cytoscape.ElementDefinition[] = relationships.map((rel) => ({
      data: {
        id: rel.id,
        source: rel.sourceId,
        target: rel.targetId,
        relation: rel.type,
        label: this.getRelationshipLabel(rel.type),
      },
      group: 'edges',
    }));

    return [...nodes, ...edges];
  }

  getStylesheet(): cytoscape.CssStyleDeclaration[] {
    return [
      // Node styles by type
      {
        selector: 'node',
        style: {
          label: 'data(label)',
          width: '40px',
          height: '40px',
          'font-size': '10px',
          'text-valign': 'bottom',
          'text-halign': 'center',
          'text-margin-y': '5px',
          'background-color': '#9e9e9e',
          'border-width': '2px',
          'border-color': '#ffffff',
          'background-image': 'data(iconSvg)',
          'background-fit': 'contain',
          'background-width': '60%',
          'background-height': '60%',
          'background-image-opacity': 0.95,
        },
      },
      {
        selector: 'node[type="spore"]',
        style: {
          'background-color': '#8bc34a',
          shape: 'ellipse',
        },
      },
      {
        selector: 'node[type="agar"]',
        style: {
          'background-color': '#42a5f5',
          shape: 'round-rectangle',
        },
      },
      {
        selector: 'node[type="liquid_culture"]',
        style: {
          'background-color': '#ab47bc',
          shape: 'diamond',
        },
      },
      {
        selector: 'node[type="grain_spawn"]',
        style: {
          'background-color': '#ffa726',
          shape: 'round-rectangle',
        },
      },
      {
        selector: 'node[type="fruit"]',
        style: {
          'background-color': '#ef5350',
          shape: 'ellipse',
        },
      },
      {
        selector: 'node[type="clone"]',
        style: {
          'background-color': '#7e57c2',
          shape: 'triangle',
        },
      },
      {
        selector: 'node[type="slant"]',
        style: {
          'background-color': '#66bb6a',
          shape: 'rectangle',
        },
      },
      {
        selector: 'node[type="castellani_water"]',
        style: {
          'background-color': '#26c6da',
          shape: 'hexagon',
        },
      },

      // Filial generation indicators
      {
        selector: 'node[filial="F1"]',
        style: {
          'border-width': '3px',
          'border-color': '#ffb74d',
        },
      },
      {
        selector: 'node[filial="F2"]',
        style: {
          'border-width': '4px',
          'border-color': '#ff9800',
        },
      },
      {
        selector: 'node[filial^="F2"]', // F2-T1, F2-T2, etc.
        style: {
          'border-width': '4px',
          'border-color': '#f57c00',
          'border-style': 'dashed',
        },
      },
      {
        selector: 'node[filial="F3"], node[filial^="F3"]',
        style: {
          'border-width': '5px',
          'border-color': '#e53935',
          'border-style': 'dashed',
        },
      },

      // Edge styles
      {
        selector: 'edge',
        style: {
          width: '2px',
          'line-color': '#9e9e9e',
          'target-arrow-color': '#9e9e9e',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          label: 'data(label)',
          'font-size': '8px',
          'text-rotation': 'autorotate',
          'text-margin-x': '5px',
          'text-margin-y': '5px',
        },
      },
      {
        selector: 'edge[relation="spore_to_agar"]',
        style: {
          'line-color': '#8bc34a',
          'target-arrow-color': '#8bc34a',
        },
      },
      {
        selector: 'edge[relation="clone_from_fruit"]',
        style: {
          'line-color': '#7e57c2',
          'target-arrow-color': '#7e57c2',
          'line-style': 'dashed',
        },
      },
      {
        selector: 'edge[relation="fruit_to_spore"]',
        style: {
          'line-color': '#ef5350',
          'target-arrow-color': '#ef5350',
          'line-style': 'dotted',
        },
      },

      // Selected node highlight
      {
        selector: '.selected',
        style: {
          'border-width': '4px',
          'border-color': '#ffd700',
          'border-opacity': '1',
          'overlay-opacity': '0.2',
          'overlay-color': '#ffd700',
        },
      },

      // Archived node styling
      {
        selector: 'node[?isArchived]',
        style: {
          'background-color': '#cfd8dc', // Light blue-grey
          'border-color': '#b0bec5',
          'color': '#90a4ae',
          'background-image-opacity': 0.4,
        }
      },

      // Selected archived node override
      {
        selector: 'node[?isArchived].selected',
        style: {
          'border-color': '#37474f', // Dark blue-grey
          'overlay-color': '#37474f',
        }
      },
    ];
  }

  private getRelationshipLabel(type: string): string {
    const labels: Record<string, string> = {
      spore_to_agar: 'isolate',
      transfer: 'transfer',
      clone_from_fruit: 'clone',
      fruit_to_spore: 'spore',
      inoculation: 'inoc',
      fruiting: 'fruit',
    };
    return labels[type] || type;
  }

  private getTypeIconDataUri(type: CultureType): string {
    if (this.iconDataCache[type]) {
      return this.iconDataCache[type];
    }

    const svg = this.getTypeIconSvg(type);

    const encoded = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    this.iconDataCache[type] = encoded;
    return encoded;
  }

  private getTypeIconSvg(type: CultureType): string {
    const commonStart = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24">';
    const commonEnd = '</svg>';

    const icons: Record<CultureType, string> = {
      [CultureType.SPORE]:
        '<g fill="#fff"><circle cx="12" cy="12" r="2.2"/><circle cx="8.5" cy="9.5" r="1.6"/><circle cx="15.5" cy="9.5" r="1.6"/><circle cx="8.5" cy="14.5" r="1.6"/><circle cx="15.5" cy="14.5" r="1.6"/></g>',
      [CultureType.AGAR]:
        '<g fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="6.5"/><path d="M6 12h12"/></g>',
      [CultureType.LIQUID_CULTURE]:
        '<path fill="#fff" d="M12 4c-2.8 4-4.8 6.2-4.8 8.8A4.8 4.8 0 0 0 12 17.6a4.8 4.8 0 0 0 4.8-4.8C16.8 10.2 14.8 8 12 4z"/>',
      [CultureType.GRAIN_SPAWN]:
        '<g fill="#fff"><ellipse cx="9" cy="10.5" rx="1.8" ry="2.6"/><ellipse cx="13.5" cy="11.8" rx="1.8" ry="2.6"/><ellipse cx="10.8" cy="15" rx="1.8" ry="2.6"/></g>',
      [CultureType.FRUIT]:
        '<g fill="#fff"><path d="M7 10.5c0-2.2 2.3-3.8 5-3.8s5 1.6 5 3.8H7z"/><path d="M11 10.5h2v5h-2z"/><path d="M9.5 15.5h5a2.5 2.5 0 0 1-5 0z"/></g>',
      [CultureType.CLONE]:
        '<g transform="translate(0,3.5)" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6v4"/><path d="M12 10l-3.5 3.5"/><path d="M12 10l3.5 3.5"/><circle cx="8.5" cy="14" r="1.2" fill="#fff"/><circle cx="15.5" cy="14" r="1.2" fill="#fff"/></g>',
      [CultureType.SLANT]:
        '<g fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M8 7h5"/><path d="M8 7l3.2 10.2a1.6 1.6 0 0 0 1.5 1.1h2.8"/><path d="M10.3 14.5h5.2"/></g>',
      [CultureType.CASTELLANI_WATER]:
        '<g fill="#fff"><path d="M12 5.2c-2.2 3.3-3.8 5.1-3.8 7.2A3.8 3.8 0 0 0 12 16.2a3.8 3.8 0 0 0 3.8-3.8c0-2.1-1.6-3.9-3.8-7.2z"/><circle cx="16.8" cy="15.8" r="1.3"/></g>',
    };

    return `${commonStart}${icons[type] ?? icons[CultureType.SPORE]}${commonEnd}`;
  }
}
