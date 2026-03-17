import cytoscape from 'cytoscape';

export const CONTEXT_MENU_SELECTOR = 'node';

export type ContextMenuEvent = { target: cytoscape.NodeSingular };

export type ContextMenuItem = {
  id: string;
  content: string;
  selector: string;
  onClickFunction: (event: ContextMenuEvent) => void;
  show?: boolean;
};

export type ContextMenuOptions = {
  menuItems: ContextMenuItem[];
};

export type ContextMenuInstance = {
  destroy: () => void;
  showMenuItem: (id: string) => void;
  hideMenuItem: (id: string) => void;
};

export type CytoscapeWithContextMenus = cytoscape.Core & {
  contextMenus?: (options: ContextMenuOptions) => ContextMenuInstance;
};
