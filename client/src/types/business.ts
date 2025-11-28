export type BusinessStructure = 'sole_prop' | 'pllc' | 'pc' | 'llc' | 's_corp' | 'c_corp' | 'partnership';

export interface BusinessRequirement {
  name: string;
  form: string;
  description: string;
  isRequired: boolean;
  filingFee?: string;
  processingTime?: string;
  onlineUrl?: string;
}

export interface StateBusinessRequirements {
  state: string;
  businessStructures: {
    [key in BusinessStructure]: {
      name: string;
      documents: BusinessRequirement[];
      additionalRequirements?: string[];
      restrictions?: string[];
    };
  };
}
