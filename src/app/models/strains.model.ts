export interface StrainOption {
  prefix: string;
  label: string;
}

export const STRAIN_FAMILY_OPTIONS: StrainOption[] = [
  { prefix: 'LED', label: 'Lentinula edodes (LED)' },
  { prefix: 'POS', label: 'Pleurotus ostreatus (POS)' },
  { prefix: 'PCI', label: 'Pleurotus citrinopileatus (PCI)' },
  { prefix: 'PDJ', label: 'Pleurotus djamor (PDJ)' },
  { prefix: 'PCU', label: 'Psilocybe cubensis (PCU)' },
  { prefix: 'PCY', label: 'Panaeolus cyanescens (PCY)' },
  { prefix: 'HER-T', label: 'Hericium erinaceus (thermophilic) (HER-T)' },
  { prefix: 'PUL', label: 'Pleurotus pulmonarius (PUL)' },
  { prefix: 'PST', label: 'Panellus stipticus (PST)' },
  { prefix: 'PSM', label: 'Psilocybe mexicana (PSM)' },
];
