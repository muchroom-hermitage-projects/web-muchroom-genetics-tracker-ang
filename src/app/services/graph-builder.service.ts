// services/graph-builder.service.ts
import { Injectable } from '@angular/core';
import { Culture, Relationship, CultureType } from '../models/culture.model';
import cytoscape from 'cytoscape';

const CULTURE_TYPE_ICON_KEY: Record<CultureType, string> = {
  [CultureType.SPORE]: 'spore',
  [CultureType.AGAR]: 'agar',
  [CultureType.LIQUID_CULTURE]: 'liquid-culture',
  [CultureType.GRAIN_SPAWN]: 'grain-spawn',
  [CultureType.FRUIT]: 'fruit',
  [CultureType.CLONE]: 'clone',
  [CultureType.SLANT]: 'slant',
  [CultureType.CASTELLANI_WATER]: 'castellani-water',
};

@Injectable({
  providedIn: 'root',
})
export class GraphBuilderService {
  buildElements(
    cultures: Culture[],
    relationships: Relationship[],
  ): cytoscape.ElementDefinition[] {
    const nodes: cytoscape.ElementDefinition[] = cultures.map((culture) => {
      const isArchived = culture.metadata?.isArchived || false;
      const displayLabel = isArchived
        ? `${culture.label} (archived)`
        : culture.label;

      return {
        data: {
          id: culture.id,
          label: displayLabel,
          icon: CULTURE_TYPE_ICON_KEY[culture.type],
          iconUrl: this.getIconUrl(CULTURE_TYPE_ICON_KEY[culture.type]),
          nodeType: 'culture',
          type: culture.type,
          strain: culture.strain,
          filial: culture.filialGeneration,
          description: culture.description,
          dateCreated: culture.dateCreated,
          isArchived: isArchived,
          isContaminated: culture.metadata?.isContaminated || false,
          fullData: culture, // Store for reference
        },
        position: undefined, // Let layout handle positioning
        group: 'nodes',
      };
    });

    const edges: cytoscape.ElementDefinition[] = relationships.map((rel) => ({
      data: {
        id: rel.id,
        source: rel.sourceId,
        target: rel.targetId,
        relation: rel.type,
        label: rel.type.replace(/_/g, ' '),
      },
      group: 'edges',
    }));

    return [...nodes, ...edges];
  }

  getStylesheet(): cytoscape.CssStyleDeclaration[] {
    return [
      {
        selector: 'node',
        style: {
          label: 'data(label)',
          width: '60px',
          height: '60px',
          'font-size': '10px',
          'font-weight': 'bold',
          'text-valign': 'bottom',
          'text-halign': 'center',
          'text-margin-y': '5px',
          'background-color': '#c4edff',
          'border-width': '2px',
          'border-color': '#ffffff',
          'background-image': 'data(iconUrl)',
          'background-fit': 'contain',
          'background-width': '80%',
          'background-height': '80%',
          'background-opacity': 1,
          'background-clip': 'none',
          'background-image-containment': 'over',
          'label-events': 'no',
        },
      },
      {
        selector: 'node[type="spore"]',
        style: {
          'background-color': '#c4edff',
          shape: 'round-rectangle',
        },
      },
      {
        selector: 'node[type="agar"]',
        style: {
          shape: 'round-rectangle',
        },
      },
      {
        selector: 'node[type="liquid_culture"]',
        style: {
          shape: 'round-rectangle',
        },
      },
      {
        selector: 'node[type="grain_spawn"]',
        style: {
          shape: 'round-rectangle',
        },
      },
      {
        selector: 'node[type="fruit"]',
        style: {
          shape: 'round-rectangle',
        },
      },
      {
        selector: 'node[type="clone"]',
        style: {
          shape: 'round-rectangle',
        },
      },
      {
        selector: 'node[type="slant"]',
        style: {
          shape: 'round-rectangle',
        },
      },
      {
        selector: 'node[type="castellani_water"]',
        style: {
          shape: 'round-rectangle',
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
          width: '14px',
          'line-color': '#7c7c7c',
          'target-arrow-color': '#7c7c7c',
          'target-arrow-shape': 'triangle',
          'curve-style': 'bezier',
          label: 'data(label)',
          'font-size': '12px',
          'font-weight': 'bold',
          'text-rotation': 'autorotate',
          color: '#fff',
        },
      },
      {
        selector: 'edge[relation="germination"]',
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
        },
      },
      {
        selector: 'edge[relation="collecting_spores"]',
        style: {
          'line-color': '#ef5350',
          'target-arrow-color': '#ef5350',
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
          color: '#90a4ae',
          'background-image-opacity': 0.4,
        },
      },

      // Selected archived node override
      {
        selector: 'node[?isArchived].selected',
        style: {
          'border-color': '#37474f', // Dark blue-grey
          'overlay-color': '#37474f',
        },
      },

      // Contaminated node styling
      {
        selector: 'node[?isContaminated]',
        style: {
          'background-color': '#ffcdd2', // Light red
          'border-width': '3px',
          'border-color': '#d32f2f', // Red
          'border-style': 'solid',
          color: '#d32f2f', // Red label text
        },
      },

      // Selected contaminated node (reddish instead of yellowish)
      {
        selector: 'node[?isContaminated].selected',
        style: {
          'border-width': '4px',
          'border-color': '#b71c1c', // Dark red
          'overlay-opacity': '0.3',
          'overlay-color': '#d32f2f', // Red overlay
        },
      },

      // Contaminated archived node (contamination takes precedence, more faded)
      {
        selector: 'node[?isContaminated][?isArchived]',
        style: {
          'background-color': '#ffebee', // More faded red
          'border-color': '#e57373', // Lighter red border
          color: '#e57373', // Lighter red text
          'background-image-opacity': 0.4,
        },
      },
    ];
  }

  private getIconUrl(iconKey: string): string {
    return `assets/icons/${iconKey}/${iconKey}.png`;
  }
}
