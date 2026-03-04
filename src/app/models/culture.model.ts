// models/culture.model.ts
export enum CultureType {
  SPORE = 'spore',
  AGAR = 'agar',
  LIQUID_CULTURE = 'liquid_culture',
  GRAIN_SPAWN = 'grain_spawn',
  FRUIT = 'fruit',
  CLONE = 'clone',
  SLANT = 'slant',
  CASTELLANI_WATER = 'castellani_water',
}

export interface CultureTypeOption {
  value: CultureType;
  label: string;
  abbreviation: string;
}

export const CULTURE_TYPE_OPTIONS: CultureTypeOption[] = [
  { value: CultureType.SPORE, label: 'Spore (SP)', abbreviation: 'SP' },
  { value: CultureType.AGAR, label: 'Agar (AG)', abbreviation: 'AG' },
  { value: CultureType.LIQUID_CULTURE, label: 'Liquid culture (LC)', abbreviation: 'LC' },
  { value: CultureType.GRAIN_SPAWN, label: 'Grain spawn (GS)', abbreviation: 'GS' },
  { value: CultureType.FRUIT, label: 'Fruit (FB)', abbreviation: 'FB' },
  { value: CultureType.CLONE, label: 'Clone (CL)', abbreviation: 'CL' },
  { value: CultureType.SLANT, label: 'Slant (SL)', abbreviation: 'SL' },
  { value: CultureType.CASTELLANI_WATER, label: 'Castellani water (CW)', abbreviation: 'CW' },
];

export function getCultureTypeAbbreviation(type: CultureType | string | null | undefined): string {
  const match = CULTURE_TYPE_OPTIONS.find((option) => option.value === type);
  return match?.abbreviation ?? 'XX';
}

export interface Culture {
  id: string;
  label: string;
  type: CultureType;
  strain: string; // e.g., 'PLO-1', 'PSC-1'
  filialGeneration: string; // 'F0', 'F1', 'F1-T1', etc.
  description: string;
  dateCreated: Date;
  source?: string; // vendor, wild, etc.
  notes?: string;
  metadata?: {
    transferNumber?: number;
    cloneGeneration?: number;
    isMaster?: boolean;
    isArchived?: boolean;
    viability?: number; // percentage
  };
}

export interface Relationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: RelationshipType;
  notes?: string;
}

export enum RelationshipType {
  SPORE_TO_AGAR = 'spore_to_agar',
  TRANSFER = 'transfer',
  CLONE_FROM_FRUIT = 'clone_from_fruit',
  FRUIT_TO_SPORE = 'fruit_to_spore',
  INOCULATION = 'inoculation', // LC to grain, etc.
  FRUITING = 'fruiting', // grain to fruit
}

export interface Strain {
  id: string; // e.g., 'PLO-1'
  species: string; // e.g., 'Pleurotus ostreatus'
  commonName: string;
  source: string;
  dateAcquired: Date;
  notes: string;
}
