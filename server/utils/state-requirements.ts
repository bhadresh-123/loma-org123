import { BusinessStructure, StateRequirements } from '@/types/business';

export interface DocumentRequirement {
  name: string;
  form: string;
  description: string;
  isRequired: boolean;
  filingFee?: string;
  processingTime?: string;
  onlineUrl?: string;
}

export interface StateRequirements {
  state: string;
  businessStructures: {
    [key in BusinessStructure]: {
      name: string;
      documents: DocumentRequirement[];
      additionalRequirements?: string[];
      annualFees?: {
        amount: string;
        description: string;
      }[];
      restrictions?: string[];
    };
  };
}

export const stateRequirements: { [key: string]: StateRequirements } = {
  CA: {
    state: "California",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "LLC-1",
            description: "Primary formation document filed with Secretary of State",
            isRequired: true,
            filingFee: "$70",
            processingTime: "5-7 business days",
            onlineUrl: "https://bizfile.sos.ca.gov"
          },
          {
            name: "Operating Agreement",
            form: "Custom document",
            description: "Internal document governing LLC operations",
            isRequired: true
          },
          {
            name: "Initial Statement of Information",
            form: "LLC-12",
            description: "Must be filed within 90 days of formation",
            isRequired: true,
            filingFee: "$20",
            processingTime: "2-3 business days"
          }
        ],
        annualFees: [
          {
            amount: "$800",
            description: "Annual franchise tax"
          },
          {
            amount: "$20",
            description: "Statement of Information (every 2 years)"
          }
        ],
        additionalRequirements: [
          "Business License (city/county specific)",
          "EIN from IRS",
          "Seller's Permit (if applicable)"
        ]
      }
    }
  },
  FL: {
    state: "Florida",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "Form LLC",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$125",
            processingTime: "3-5 business days",
            onlineUrl: "https://dos.myflorida.com/sunbiz"
          },
          {
            name: "Operating Agreement",
            form: "Custom document",
            description: "Internal document governing LLC operations",
            isRequired: false
          }
        ],
        annualFees: [
          {
            amount: "$138.75",
            description: "Annual report filing fee"
          }
        ],
        additionalRequirements: [
          "Business License (if required by city/county)",
          "EIN from IRS",
          "Registered Agent designation"
        ]
      }
    }
  },
  AL: {
    state: "Alabama",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Certificate of Formation",
            form: "DLLC-1",
            description: "Primary formation document filed with Secretary of State",
            isRequired: true,
            filingFee: "$200",
            processingTime: "3-5 business days",
            onlineUrl: "https://sos.alabama.gov/business-services"
          },
          {
            name: "Operating Agreement",
            form: "Custom document",
            description: "Internal document governing LLC operations",
            isRequired: true
          }
        ],
        annualFees: [
          {
            amount: "$100",
            description: "Annual report and business privilege tax"
          }
        ],
        additionalRequirements: [
          "Business License (city/county specific)",
          "EIN from IRS",
          "State Tax Registration"
        ]
      }
    }
  },
  AK: {
    state: "Alaska",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "08-491",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$250",
            processingTime: "10-15 business days",
            onlineUrl: "https://www.commerce.alaska.gov/web/cbpl/"
          }
        ],
        annualFees: [
          {
            amount: "$100",
            description: "Biennial report"
          }
        ],
        additionalRequirements: [
          "Alaska Business License ($50 annually)",
          "EIN from IRS"
        ]
      }
    }
  },
  AZ: {
    state: "Arizona",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "L010",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$50",
            processingTime: "5-7 business days",
            onlineUrl: "https://ecorp.azcc.gov"
          },
          {
            name: "Operating Agreement",
            form: "Custom document",
            description: "Internal document governing LLC operations",
            isRequired: false
          },
          {
            name: "Statutory Agent Acceptance",
            form: "M002",
            description: "Acceptance by registered agent",
            isRequired: true,
            filingFee: "Included in formation"
          }
        ],
        annualFees: [
          {
            amount: "$0",
            description: "No annual report required"
          }
        ],
        additionalRequirements: [
          "Trade Name Registration (if applicable)",
          "City/County Business License",
          "EIN from IRS"
        ]
      }
    }
  },
  AR: {
    state: "Arkansas",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "LL-01",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$45",
            processingTime: "2-3 business days",
            onlineUrl: "https://www.sos.arkansas.gov"
          },
          {
            name: "Operating Agreement",
            form: "Custom document",
            description: "Internal document governing LLC operations",
            isRequired: false
          }
        ],
        annualFees: [
          {
            amount: "$150",
            description: "Annual report and franchise tax"
          }
        ],
        additionalRequirements: [
          "Business License (city/county specific)",
          "EIN from IRS",
          "State Tax Registration"
        ]
      }
    }
  },
  CO: {
    state: "Colorado",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "LLC ARTICLES",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$50",
            processingTime: "1-3 business days",
            onlineUrl: "https://www.coloradosos.gov"
          },
          {
            name: "Operating Agreement",
            form: "Custom document",
            description: "Internal document governing LLC operations",
            isRequired: false
          }
        ],
        annualFees: [
          {
            amount: "$10",
            description: "Annual periodic report"
          }
        ],
        additionalRequirements: [
          "Trade Name Registration (if applicable)",
          "Local Business License",
          "EIN from IRS"
        ]
      }
    }
  },
  CT: {
    state: "Connecticut",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Certificate of Organization",
            form: "LLC-1",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$120",
            processingTime: "3-5 business days",
            onlineUrl: "https://business.ct.gov"
          },
          {
            name: "Operating Agreement",
            form: "Custom document",
            description: "Internal document governing LLC operations",
            isRequired: true
          }
        ],
        annualFees: [
          {
            amount: "$80",
            description: "Annual report"
          }
        ],
        additionalRequirements: [
          "Business Property Tax Registration",
          "Local Business License",
          "EIN from IRS"
        ]
      }
    }
  },
  DE: {
    state: "Delaware",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Certificate of Formation",
            form: "No specific form number",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$90",
            processingTime: "10-15 business days",
            onlineUrl: "https://corp.delaware.gov"
          },
          {
            name: "Operating Agreement",
            form: "Custom document",
            description: "Internal document governing LLC operations",
            isRequired: false
          }
        ],
        annualFees: [
          {
            amount: "$300",
            description: "Annual franchise tax"
          }
        ],
        additionalRequirements: [
          "Registered Agent Required",
          "Business License",
          "EIN from IRS"
        ]
      }
    }
  },
  GA: {
    state: "Georgia",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "CD 030",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$100",
            processingTime: "5-7 business days",
            onlineUrl: "https://ecorp.sos.ga.gov"
          },
          {
            name: "Operating Agreement",
            form: "Custom document",
            description: "Internal document governing LLC operations",
            isRequired: false
          }
        ],
        annualFees: [
          {
            amount: "$50",
            description: "Annual registration"
          }
        ],
        additionalRequirements: [
          "Business License (city/county specific)",
          "EIN from IRS",
          "State Tax ID"
        ]
      }
    }
  },
  HI: {
    state: "Hawaii",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "LLC-1",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$50",
            processingTime: "3-5 business days",
            onlineUrl: "https://hbe.ehawaii.gov"
          },
          {
            name: "Operating Agreement",
            form: "Custom document",
            description: "Internal document governing LLC operations",
            isRequired: false
          }
        ],
        annualFees: [
          {
            amount: "$15",
            description: "Annual report"
          }
        ],
        additionalRequirements: [
          "General Excise Tax License",
          "Business License",
          "EIN from IRS"
        ]
      }
    }
  },
  ID: {
    state: "Idaho",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Certificate of Organization",
            form: "Form LLC-1",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$100",
            processingTime: "7-10 business days",
            onlineUrl: "https://sosbiz.idaho.gov"
          },
          {
            name: "Operating Agreement",
            form: "Custom document",
            description: "Internal document governing LLC operations",
            isRequired: false
          }
        ],
        annualFees: [
          {
            amount: "$0",
            description: "Annual report (no fee)"
          }
        ],
        additionalRequirements: [
          "Business License (if required)",
          "EIN from IRS",
          "Sales Tax Permit (if applicable)"
        ]
      }
    }
  },
  IL: {
    state: "Illinois",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "LLC-5.5",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$150",
            processingTime: "10-15 business days",
            onlineUrl: "https://www.ilsos.gov"
          },
          {
            name: "Operating Agreement",
            form: "Custom document",
            description: "Internal document governing LLC operations",
            isRequired: false
          }
        ],
        annualFees: [
          {
            amount: "$75",
            description: "Annual report"
          }
        ],
        additionalRequirements: [
          "Business License (city/county specific)",
          "EIN from IRS",
          "State Tax Registration"
        ]
      }
    }
  },
  IN: {
    state: "Indiana",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "Form 49459",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$100",
            processingTime: "5-7 business days",
            onlineUrl: "https://inbiz.in.gov"
          },
          {
            name: "Operating Agreement",
            form: "Custom document",
            description: "Internal document governing LLC operations",
            isRequired: false
          }
        ],
        annualFees: [
          {
            amount: "$50",
            description: "Business entity report (due every 2 years)"
          }
        ],
        additionalRequirements: [
          "Business License (if required)",
          "EIN from IRS",
          "State Tax Registration"
        ]
      }
    }
  },
  IA: {
    state: "Iowa",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Certificate of Organization",
            form: "635_0107",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$50",
            processingTime: "2-3 business days",
            onlineUrl: "https://filings.sos.iowa.gov"
          },
          {
            name: "Operating Agreement",
            form: "Custom document",
            description: "Internal document governing LLC operations",
            isRequired: false
          }
        ],
        annualFees: [
          {
            amount: "$45",
            description: "Biennial report"
          }
        ],
        additionalRequirements: [
          "Business License (if required)",
          "EIN from IRS",
          "Sales Tax Permit (if applicable)"
        ]
      }
    }
  },
  KS: {
    state: "Kansas",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "DL51",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$165",
            processingTime: "3-5 business days",
            onlineUrl: "https://www.kansas.gov/business"
          },
          {
            name: "Operating Agreement",
            form: "Custom document",
            description: "Internal document governing LLC operations",
            isRequired: false
          }
        ],
        annualFees: [
          {
            amount: "$55",
            description: "Annual report"
          }
        ],
        additionalRequirements: [
          "Business License (if required)",
          "EIN from IRS",
          "State Tax Registration"
        ]
      }
    }
  },
  KY: {
    state: "Kentucky",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "KLC",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$40",
            processingTime: "3-5 business days",
            onlineUrl: "https://onestop.ky.gov"
          },
          {
            name: "Operating Agreement",
            form: "Custom document",
            description: "Internal document governing LLC operations",
            isRequired: false
          }
        ],
        annualFees: [
          {
            amount: "$15",
            description: "Annual report"
          }
        ],
        additionalRequirements: [
          "Business License (city/county specific)",
          "EIN from IRS",
          "State Tax Registration"
        ]
      }
    }
  },
  LA: {
    state: "Louisiana",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "527",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$100",
            processingTime: "3-5 business days",
            onlineUrl: "https://geauxbiz.sos.la.gov/"
          },
          {
            name: "Operating Agreement",
            form: "Custom document",
            description: "Internal document governing LLC operations",
            isRequired: false
          }
        ],
        annualFees: [
          {
            amount: "$35",
            description: "Annual report"
          }
        ],
        additionalRequirements: [
          "Business License (if required)",
          "EIN from IRS",
          "State Tax Registration"
        ]
      }
    }
  },
  ME: {
    state: "Maine",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Certificate of Formation",
            form: "MLLC-6",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$175",
            processingTime: "5-10 business days",
            onlineUrl: "https://www.maine.gov/sos/cec/corp/"
          },
          {
            name: "Operating Agreement",
            form: "Custom document",
            description: "Internal document governing LLC operations",
            isRequired: false
          }
        ],
        annualFees: [
          {
            amount: "$85",
            description: "Annual report"
          }
        ],
        additionalRequirements: [
          "Business License (if required)",
          "EIN from IRS",
          "Sales Tax Registration (if applicable)"
        ]
      }
    }
  },
  MD: {
    state: "Maryland",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "LLC-1",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$100",
            processingTime: "7-10 business days",
            onlineUrl: "https://egov.maryland.gov/BusinessExpress"
          },
          {
            name: "Operating Agreement",
            form: "Custom document",
            description: "Internal document governing LLC operations",
            isRequired: false
          }
        ],
        annualFees: [
          {
            amount: "$300",
            description: "Annual report and personal property tax return"
          }
        ],
        additionalRequirements: [
          "Business License (if required)",
          "EIN from IRS",
          "Trade Name Registration (if applicable)"
        ]
      }
    }
  },
  MA: {
    state: "Massachusetts",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Certificate of Organization",
            form: "Form LLC-1",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$500",
            processingTime: "4-5 business days",
            onlineUrl: "https://www.sec.state.ma.us/cor"
          },
          {
            name: "Operating Agreement",
            form: "Custom document",
            description: "Internal document governing LLC operations",
            isRequired: false
          }
        ],
        annualFees: [
          {
            amount: "$500",
            description: "Annual report"
          }
        ],
        additionalRequirements: [
          "Business License (if required)",
          "EIN from IRS",
          "State Tax Registration"
        ]
      }
    }
  },
  MI: {
    state: "Michigan",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "Form 700",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$50",
            processingTime: "10-15 business days",
            onlineUrl: "https://cofs.lara.state.mi.us"
          },
          {
            name: "Operating Agreement",
            form: "Custom document",
            description: "Internal document governing LLC operations",
            isRequired: false
          }
        ],
        annualFees: [
          {
            amount: "$25",
            description: "Annual statement"
          }
        ],
        additionalRequirements: [
          "Business License (if required)",
          "EIN from IRS",
          "Sales Tax License (if applicable)"
        ]
      }
    }
  },
  MN: {
    state: "Minnesota",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "LLC-1",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$155",
            processingTime: "5-7 business days",
            onlineUrl: "https://mblsportal.sos.state.mn.us"
          },
          {
            name: "Operating Agreement",
            form: "Custom document",
            description: "Internal document governing LLC operations",
            isRequired: false
          }
        ],
        annualFees: [
          {
            amount: "$50",
            description: "Annual renewal"
          }
        ],
        additionalRequirements: [
          "Business License (if required)",
          "EIN from IRS",
          "Workers Compensation Insurance (if employees)"
        ]
      }
    }
  },
  MS: {
    state: "Mississippi",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Certificate of Formation",
            form: "F0001",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$50",
            processingTime: "3-5 business days",
            onlineUrl: "https://corp.sos.ms.gov/corp/portal/"
          },
          {
            name: "Operating Agreement",
            form: "Custom document",
            description: "Internal document governing LLC operations",
            isRequired: false
          }
        ],
        annualFees: [
          {
            amount: "$0",
            description: "No annual report required"
          }
        ],
        additionalRequirements: [
          "Business License (if required)",
          "EIN from IRS",
          "State Tax Registration"
        ]
      }
    }
  },
  MO: {
    state: "Missouri",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "LLC-1",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$50",
            processingTime: "5-10 business days",
            onlineUrl: "https://bsd.sos.mo.gov"
          },
          {
            name: "Operating Agreement",
            form: "Custom document",
            description: "Internal document governing LLC operations",
            isRequired: false
          }
        ],
        annualFees: [
          {
            amount: "$23",
            description: "Annual report"
          }
        ],
        additionalRequirements: [
          "Business License (if required)",
          "EIN from IRS",
          "State Tax Registration"
        ]
      }
    }
  },
  MT: {
    state: "Montana",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "35-14-202",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$70",
            processingTime: "7-10 business days",
            onlineUrl: "https://sosmt.gov/business"
          },
          {
            name: "Operating Agreement",
            form: "Custom document",
            description: "Internal document governing LLC operations",
            isRequired: false
          }
        ],
        annualFees: [
          {
            amount: "$20",
            description: "Annual report"
          }
        ],
        additionalRequirements: [
          "Business License (if required)",
          "EIN from IRS",
          "State Tax Registration"
        ]
      }
    }
  },
  NE: {
    state: "Nebraska",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Certificate of Organization",
            form: "LLC",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$100",
            processingTime: "3-5 business days",
            onlineUrl: "https://www.nebraska.gov/sos/corp"
          },
          {
            name: "Operating Agreement",
            form: "Custom document",
            description: "Internal document governing LLC operations",
            isRequired: false
          }
        ],
        annualFees: [
          {
            amount: "$10",
            description: "Biennial report (every 2 years)"
          }
        ],
        additionalRequirements: [
          "Business License (if required)",
          "EIN from IRS",
          "State Tax Registration"
        ]
      }
    }
  },
  PA: {
    state: "Pennsylvania",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Certificate of Organization",
            form: "DSCB:15-8821",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$125",
            processingTime: "7-10 business days",
            onlineUrl: "https://www.corporations.pa.gov"
          },
          {
            name: "Docketing Statement",
            form: "DSCB:15-134A",
            description: "Required initial filing information",
            isRequired: true,
            filingFee: "$70",
            processingTime: "Included with formation"
          }
        ],
        annualFees: [
          {
            amount: "$70",
            description: "Decennial report filing (every 10 years)"
          }
        ],
        additionalRequirements: [
          "Business License (if required)",
          "EIN from IRS",
          "Publication requirement in two newspapers"
        ]
      }
    }
  },
  RI: {
    state: "Rhode Island",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "Form 400",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$150",
            processingTime: "5-7 business days",
            onlineUrl: "https://www.sos.ri.gov/divisions/business-services"
          }
        ],
        annualFees: [
          {
            amount: "$50",
            description: "Annual report"
          }
        ],
        additionalRequirements: [
          "Business License (if required)",
          "EIN from IRS",
          "Sales Tax Permit (if applicable)"
        ]
      }
    }
  },
  SC: {
    state: "South Carolina",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "Form LLC-1",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$110",
            processingTime: "2-3 business days",
            onlineUrl: "https://businessfilings.sc.gov"
          }
        ],
        annualFees: [
          {
            amount: "$0",
            description: "No annual report required"
          }
        ],
        additionalRequirements: [
          "Business License (city/county specific)",
          "EIN from IRS",
          "State Tax Registration"
        ]
      }
    }
  },
  SD: {
    state: "South Dakota",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "Articles of Organization",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$150",
            processingTime: "3-5 business days",
            onlineUrl: "https://sosenterprise.sd.gov"
          }
        ],
        annualFees: [
          {
            amount: "$50",
            description: "Annual report"
          }
        ],
        additionalRequirements: [
          "Business License (if required)",
          "EIN from IRS",
          "Sales Tax License (if applicable)"
        ]
      }
    }
  },
  TN: {
    state: "Tennessee",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "SS-4270",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$300",
            processingTime: "5-7 business days",
            onlineUrl: "https://tnbear.tn.gov/Ecommerce"
          }
        ],
        annualFees: [
          {
            amount: "$300",
            description: "Annual report"
          },
          {
            amount: "$20",
            description: "Annual report filing fee"
          }
        ],
        additionalRequirements: [
          "Business License (city/county specific)",
          "EIN from IRS",
          "State Tax Registration"
        ]
      }
    }
  },
  WY: {
    state: "Wyoming",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "LLC-AR-1",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$100",
            processingTime: "3-5 business days",
            onlineUrl: "https://sos.wyo.gov"
          }
        ],
        annualFees: [
          {
            amount: "$50",
            description: "Annual report"
          }
        ],
        additionalRequirements: [
          "Operating Agreement",
          "EIN from IRS"
        ]
      }
    }
  },
  NV: {
    state: "Nevada",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "LLC-1",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$75",
            processingTime: "1-3 business days",
            onlineUrl: "https://www.nvsilverflume.gov"
          },
          {
            name: "Initial List of Managers",
            form: "LLC-2",
            description: "Must be filed at formation",
            isRequired: true,
            filingFee: "$150"
          }
        ],
        annualFees: [
          {
            amount: "$350",
            description: "Annual list and business license fee"
          }
        ],
        additionalRequirements: [
          "State Business License",
          "EIN from IRS",
          "Local Business License"
        ]
      }
    }
  },
  NH: {
    state: "New Hampshire",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Certificate of Formation",
            form: "LLC-1",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$100",
            processingTime: "3-5 business days",
            onlineUrl: "https://quickstart.sos.nh.gov"
          }
        ],
        annualFees: [
          {
            amount: "$100",
            description: "Annual report"
          }
        ],
        additionalRequirements: [
          "Business License (if required)",
          "EIN from IRS",
          "Trade Name Registration (if applicable)"
        ]
      }
    }
  },
  NJ: {
    state: "New Jersey",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Certificate of Formation",
            form: "LLC-1",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$125",
            processingTime: "2-3 business days",
            onlineUrl: "https://www.njportal.com/DOR/BusinessFormation"
          }
        ],
        annualFees: [
          {
            amount: "$75",
            description: "Annual report"
          }
        ],
        additionalRequirements: [
          "Business Registration",
          "EIN from IRS",
          "State Tax Registration"
        ]
      }
    }
  },
  NM: {
    state: "New Mexico",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "DLLC",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$50",
            processingTime: "1-3 business days",
            onlineUrl: "https://portal.sos.state.nm.us"
          }
        ],
        annualFees: [
          {
            amount: "$0",
            description: "No annual report required"
          }
        ],
        additionalRequirements: [
          "Business License (if required)",
          "EIN from IRS",
          "CRS Number for Tax"
        ]
      }
    }
  },
  NY: {
    state: "New York",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "DOS-1336",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$200",
            processingTime: "7-10 business days",
            onlineUrl: "https://www.dos.ny.gov/corps/"
          },
          {
            name: "Publication Requirement",
            form: "Custom notice",
            description: "Must publish in two newspapers for 6 weeks",
            isRequired: true,
            filingFee: "Varies ($600-$1200)"
          }
        ],
        annualFees: [
          {
            amount: "$9 per member",
            description: "Biennial statement fee"
          }
        ],
        additionalRequirements: [
          "Publication Requirements",
          "EIN from IRS",
          "Operating Agreement"
        ]
      }
    }
  },
  NC: {
    state: "North Carolina",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "L-01",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$125",
            processingTime: "5-7 business days",
            onlineUrl: "https://www.sosnc.gov/online_services/business_registration"
          }
        ],
        annualFees: [
          {
            amount: "$200",
            description: "Annual report"
          }
        ],
        additionalRequirements: [
          "Business License (if required)",
          "EIN from IRS",
          "Register with Department of Revenue"
        ]
      }
    }
  },
  ND: {
    state: "North Dakota",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "SFN 58701",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$135",
            processingTime: "3-5 business days",
            onlineUrl: "https://firststop.sos.nd.gov"
          }
        ],
        annualFees: [
          {
            amount: "$50",
            description: "Annual report"
          }
        ],
        additionalRequirements: [
          "Trade Name Registration (if applicable)",
          "EIN from IRS",
          "State Tax Registration"
        ]
      }
    }
  },
  OH: {
    state: "Ohio",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "532B",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$99",
            processingTime: "3-7 business days",
            onlineUrl: "https://ohiosos.gov/businesses"
          }
        ],
        annualFees: [
          {
            amount: "$0",
            description: "No annual report required"
          }
        ],
        additionalRequirements: [
          "Business License (if required)",
          "EIN from IRS",
          "Register with Department of Taxation"
        ]
      }
    }
  },
  OK: {
    state: "Oklahoma",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "LLC Form 1001",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$100",
            processingTime: "1-3 business days",
            onlineUrl: "https://www.sos.ok.gov/business/forms.aspx"
          }
        ],
        annualFees: [
          {
            amount: "$25",
            description: "Annual certificate"
          }
        ],
        additionalRequirements: [
          "Business License (if required)",
          "EIN from IRS",
          "Sales Tax Permit (if applicable)"
        ]
      }
    }
  },
  OR: {
    state: "Oregon",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "LLC-1",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$100",
            processingTime: "5-7 business days",
            onlineUrl: "https://sos.oregon.gov/business"
          }
        ],
        annualFees: [
          {
            amount: "$100",
            description: "Annual report"
          }
        ],
        additionalRequirements: [
          "Business License (if required)",
          "EIN from IRS",
          "Business Identification Number"
        ]
      }
    }
  },

  RI: {
    state: "Rhode Island",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "Form 400",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$150",
            processingTime: "5-7 business days",
            onlineUrl: "https://corps.ri.gov"
          }
        ],
        annualFees: [
          {
            amount: "$50",
            description: "Annual report"
          }
        ],
        additionalRequirements: [
          "Business License (if required)",
          "EIN from IRS",
          "Sales Tax Permit (if applicable)"
        ]
      }
    }
  },
  SC: {
    state: "South Carolina",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "Form LLC-1",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$110",
            processingTime: "2-3 business days",
            onlineUrl: "https://businessfilings.sc.gov"
          }
        ],
        annualFees: [
          {
            amount: "$0",
            description: "No annual report required"
          }
        ],
        additionalRequirements: [
          "Business License (city/county specific)",
          "EIN from IRS",
          "Sales Tax License (if applicable)"
        ]
      }
    }
  },
  SD: {
    state: "South Dakota",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "LLC AF",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$150",
            processingTime: "3-5 business days",
            onlineUrl: "https://sosenterprise.sd.gov"
          }
        ],
        annualFees: [
          {
            amount: "$50",
            description: "Annual report"
          }
        ],
        additionalRequirements: [
          "Business License (if required)",
          "EIN from IRS",
          "Sales Tax License (if applicable)"
        ]
      }
    }
  },
  TN: {
    state: "Tennessee",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "SS-4270",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$300",
            processingTime: "5-7 business days",
            onlineUrl: "https://tnbear.tn.gov/Ecommerce"
          }
        ],
        annualFees: [
          {
            amount: "$300",
            description: "Annual report"
          }
        ],
        additionalRequirements: [
          "Business License (city/county specific)",
          "EIN from IRS",
          "Sales Tax Registration (if applicable)"
        ]
      }
    }
  },
  TX: {
    state: "Texas",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Certificate of Formation",
            form: "Form 205",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$300",
            processingTime: "2-3 business days",
            onlineUrl: "https://www.sos.state.tx.us"
          }
        ],
        annualFees: [
          {
            amount: "$0",
            description: "No annual report required"
          },
          {
            amount: "$71.50",
            description: "Franchise tax annual report"
          }
        ],
        additionalRequirements: [
          "Business License (if required)",
          "EIN from IRS",
          "Sales Tax Permit (if applicable)",
          "Assumed Name Certificate (if applicable)"
        ]
      }
    }
  },
  UT: {
    state: "Utah",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Certificate of Organization",
            form: "LLC Form",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$70",
            processingTime: "1-2 business days",
            onlineUrl: "https://corporations.utah.gov"
          }
        ],
        annualFees: [
          {
            amount: "$20",
            description: "Annual report and renewal"
          }
        ],
        additionalRequirements: [
          "Business License (city/county specific)",
          "EIN from IRS",
          "Sales Tax License (if applicable)"
        ]
      }
    }
  },
  VT: {
    state: "Vermont",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "LLC-1",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$125",
            processingTime: "7-10 business days",
            onlineUrl: "https://sos.vermont.gov"
          }
        ],
        annualFees: [
          {
            amount: "$35",
            description: "Annual report"
          }
        ],
        additionalRequirements: [
          "Business License (if required)",
          "EIN from IRS",
          "Sales Tax Registration (if applicable)"
        ]
      }
    }
  },
  VA: {
    state: "Virginia",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "LLC-1011",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$100",
            processingTime: "5-7 business days",
            onlineUrl: "https://cis.scc.virginia.gov"
          }
        ],
        annualFees: [
          {
            amount: "$50",
            description: "Annual registration fee"
          }
        ],
        additionalRequirements: [
          "Business License (city/county specific)",
          "EIN from IRS",
          "Sales Tax Registration (if applicable)"
        ]
      }
    }
  },
  WA: {
    state: "Washington",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Certificate of Formation",
            form: "LLC-1",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$180",
            processingTime: "2-3 business days",
            onlineUrl: "https://www.sos.wa.gov"
          }
        ],
        annualFees: [
          {
            amount: "$60",
            description: "Annual report"
          }
        ],
        additionalRequirements: [
          "Business License (state and local)",
          "EIN from IRS",
          "Sales Tax Registration (if applicable)"
        ]
      }
    }
  },
  WV: {
    state: "West Virginia",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "Form LLD-1",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$100",
            processingTime: "5-7 business days",
            onlineUrl: "https://business4.wv.gov"
          }
        ],
        annualFees: [
          {
            amount: "$25",
            description: "Annual report"
          }
        ],
        additionalRequirements: [
          "Business Registration Certificate",
          "EIN from IRS",
          "Local Business License (if required)"
        ]
      }
    }
  },
  WI: {
    state: "Wisconsin",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "Form 502",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$130 online, $170 paper",
            processingTime: "3-5 business days",
            onlineUrl: "https://www.wdfi.org"
          }
        ],
        annualFees: [
          {
            amount: "$25",
            description: "Annual report"
          }
        ],
        additionalRequirements: [
          "Business License (if required)",
          "EIN from IRS",
          "Seller's Permit (if applicable)"
        ]
      }
    }
  },
  WY: {
    state: "Wyoming",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "LLC-AR-1",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$100 + $2/page",
            processingTime: "3-5 business days",
            onlineUrl: "https://sos.wyo.gov"
          }
        ],
        annualFees: [
          {
            amount: "$60",
            description: "Annual report"
          }
        ],
        additionalRequirements: [
          "Business License (if required)",
          "EIN from IRS",
          "Sales Tax License (if applicable)"
        ]
      }
    }
  },



  CT: {
    state: "Connecticut",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Certificate of Organization",
            form: "LLC-1",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$120",
            processingTime: "3-5 business days",
            onlineUrl: "https://portal.ct.gov/sots"
          }
        ],
        annualFees: [
          {
            amount: "$80",
            description: "Annual report"
          }
        ],
        additionalRequirements: [
          "Operating Agreement",
          "EIN from IRS",
          "Sales Tax Permit (if applicable)"
        ]
      }
    }
  },
  DE: {
    state: "Delaware",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Certificate of Formation",
            form: "Delaware LLC Form",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$90",
            processingTime: "10-15 business days",
            onlineUrl: "https://corp.delaware.gov"
          }
        ],
        annualFees: [
          {
            amount: "$300",
            description: "Annual franchise tax"
          }
        ],
        additionalRequirements: [
          "Operating Agreement",
          "Registered Agent",
          "EIN from IRS"
        ]
      }
    }
  },
  ID: {
    state: "Idaho",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Certificate of Organization",
            form: "Form LLC-1",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$100",
            processingTime: "7-10 business days",
            onlineUrl: "https://sos.idaho.gov"
          }
        ],
        annualFees: [
          {
            amount: "$0",
            description: "No annual report required"
          }
        ],
        additionalRequirements: [
          "Operating Agreement",
          "EIN from IRS",
          "State tax registration"
        ]
      }
    }
  },
  IL: {
    state: "Illinois",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "LLC-5.5",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$150 online, $250 paper",
            processingTime: "10-15 business days",
            onlineUrl: "https://www.ilsos.gov"
          }
        ],
        annualFees: [
          {
            amount: "$75",
            description: "Annual report"
          }
        ],
        additionalRequirements: [
          "Operating Agreement",
          "Federal EIN",
          "Publication Notice"
        ]
      }
    }
  },
  IN: {
    state: "Indiana",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "Form 49459",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$95",
            processingTime: "3-5 business days",
            onlineUrl: "https://inbiz.in.gov"
          }
        ],
        annualFees: [
          {
            amount: "$50",
            description: "Business entity report (every 2 years)"
          }
        ],
        additionalRequirements: [
          "Operating Agreement",
          "Business Tax Registration",
          "EIN from IRS"
        ]
      }
    }
  },
  IA: {
    state: "Iowa",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Certificate of Organization",
            form: "635_0107",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$50",
            processingTime: "2-3 business days",
            onlineUrl: "https://sos.iowa.gov"
          }
        ],
        annualFees: [
          {
            amount: "$45",
            description: "Biennial report"
          }
        ],
        additionalRequirements: [
          "Operating Agreement",
          "Trade Name Registration (if applicable)",
          "EIN from IRS"
        ]
      }
    }
  },
  KS: {
    state: "Kansas",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "LLC",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$160",
            processingTime: "2-3 business days",
            onlineUrl: "https://sos.ks.gov"
          }
        ],
        annualFees: [
          {
            amount: "$50",
            description: "Annual report"
          }
        ],
        additionalRequirements: [
          "Operating Agreement",
          "Tax Registration",
          "EIN from IRS"
        ]
      }
    }
  },
  KY: {
    state: "Kentucky",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "KLC",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$40",
            processingTime: "1-3 business days",
            onlineUrl: "https://onestop.ky.gov"
          }
        ],
        annualFees: [
          {
            amount: "$15",
            description: "Annual report"
          }
        ],
        additionalRequirements: [
          "Operating Agreement",
          "Business Tax Registration",
          "EIN from IRS"
        ]
      }
    }
  },
  LA: {
    state: "Louisiana",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "Form 365",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$100",
            processingTime: "3-5 business days",
            onlineUrl: "https://geauxbiz.sos.la.gov"
          }
        ],
        annualFees: [
          {
            amount: "$30",
            description: "Annual report"
          }
        ],
        additionalRequirements: [
          "Operating Agreement",
          "State Tax Registration",
          "EIN from IRS"
        ]
      }
    }
  },
  ME: {
    state: "Maine",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Certificate of Formation",
            form: "MLLC-6",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$175",
            processingTime: "5-10 business days",
            onlineUrl: "https://www.maine.gov/sos/cec"
          }
        ],
        annualFees: [
          {
            amount: "$85",
            description: "Annual report"
          }
        ],
        additionalRequirements: [
          "Operating Agreement",
          "Tax Registration",
          "EIN from IRS"
        ]
      }
    }
  },
  MD: {
    state: "Maryland",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "LLC-1",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$100",
            processingTime: "7-10 business days",
            onlineUrl: "https://egov.maryland.gov/businessexpress"
          }
        ],
        annualFees: [
          {
            amount: "$300",
            description: "Annual report and personal property return"
          }
        ],
        additionalRequirements: [
          "Operating Agreement",
          "Business License",
          "EIN from IRS"
        ]
      }
    }
  },
  MA: {
    state: "Massachusetts",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Certificate of Organization",
            form: "Form LLC-1",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$500",
            processingTime: "4-5 business days",
            onlineUrl: "https://www.sec.state.ma.us/cor"
          }
        ],
        annualFees: [
          {
            amount: "$500",
            description: "Annual report"
          }
        ],
        additionalRequirements: [
          "Operating Agreement",
          "Business Certificate (DBA if applicable)",
          "EIN from IRS"
        ]
      }
    }
  },
  MN: {
    state: "Minnesota",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "LLC-1",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$155",
            processingTime: "5-7 business days",
            onlineUrl: "https://mblsportal.sos.state.mn.us"
          }
        ],
        annualFees: [
          {
            amount: "$0",
            description: "Annual renewal (no fee)"
          }
        ],
        additionalRequirements: [
          "Operating Agreement",
          "State Tax ID",
          "EIN from IRS"
        ]
      }
    }
  },
  MS: {
    state: "Mississippi",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Certificate of Formation",
            form: "F0001",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$50",
            processingTime: "3-5 business days",
            onlineUrl: "https://corp.sos.ms.gov/corp/portal"
          }
        ],
        annualFees: [
          {
            amount: "$0",
            description: "Annual report not required"
          }
        ],
        additionalRequirements: [
          "Operating Agreement",
          "Business License",
          "EIN from IRS"
        ]
      }
    }
  },
  MO: {
    state: "Missouri",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "LLC-1",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$50",
            processingTime: "5-10 business days",
            onlineUrl: "https://bsd.sos.mo.gov"
          }
        ],
        annualFees: [
          {
            amount: "$0",
            description: "Annual report not required"
          }
        ],
        additionalRequirements: [
          "Operating Agreement",
          "Business License",
          "EIN from IRS"
        ]
      }
    }
  },
  MT: {
    state: "Montana",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "35-LLC",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$70",
            processingTime: "7-10 business days",
            onlineUrl: "https://sosmt.gov/business"
          }
        ],
        annualFees: [
          {
            amount: "$20",
            description: "Annual report"
          }
        ],
        additionalRequirements: [
          "Operating Agreement",
          "Business License",
          "EIN from IRS"
        ]
      }
    }
  },
  NE: {
    state: "Nebraska",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Certificate of Organization",
            form: "LLC",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$100",
            processingTime: "3-5 business days",
            onlineUrl: "https://www.nebraska.gov/sos/corp"
          }
        ],
        annualFees: [
          {
            amount: "$10",
            description: "Biennial report (every 2 years)"
          }
        ],
        additionalRequirements: [
          "Operating Agreement",
          "Publication Notice",
          "EIN from IRS"
        ]
      }
    }
  },
  NV: {
    state: "Nevada",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "LLC",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$75",
            processingTime: "1-3 business days",
            onlineUrl: "https://www.nvsilverflume.gov"
          }
        ],
        annualFees: [
          {
            amount: "$350",
            description: "Annual list of managers/members and business license"
          }
        ],
        additionalRequirements: [
          "Operating Agreement",
          "State Business License",
          "EIN from IRS"
        ]
      }
    }
  },
  NH: {
    state: "New Hampshire",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Certificate of Formation",
            form: "LLC-1",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$100",
            processingTime: "3-5 business days",
            onlineUrl: "https://quickstart.sos.nh.gov"
          }
        ],
        annualFees: [
          {
            amount: "$100",
            description: "Annual report"
          }
        ],
        additionalRequirements: [
          "Operating Agreement",
          "Trade Name Registration (if applicable)",
          "EIN from IRS"
        ]
      }
    }
  },
  NJ: {
    state: "New Jersey",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Certificate of Formation",
            form: "Form L-102",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$125",
            processingTime: "3-5 business days",
            onlineUrl: "https://www.njportal.com/DOR/BusinessFormation"
          }
        ],
        annualFees: [
          {
            amount: "$75",
            description: "Annual report"
          }
        ],
        additionalRequirements: [
          "Operating Agreement",
          "Business Registration",
          "EIN from IRS"
        ]
      }
    }
  },
  NM: {
    state: "New Mexico",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "DLLC",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$50",
            processingTime: "1-3 business days",
            onlineUrl: "https://portal.sos.state.nm.us"
          }
        ],
        annualFees: [
          {
            amount: "$0",
            description: "No annual report required"
          }
        ],
        additionalRequirements: [
          "Operating Agreement",
          "CRS Tax ID",
          "EIN from IRS"
        ]
      }
    }
  },
  NY: {
    state: "New York",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "DOS-1336",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$200",
            processingTime: "7-10 business days",
            onlineUrl: "https://www.dos.ny.gov/corps"
          }
        ],
        annualFees: [
          {
            amount: "$9 per member",
            description: "Biennial statement filing fee"
          }
        ],
        additionalRequirements: [
          "Operating Agreement",
          "Publication Requirement",
          "EIN from IRS"
        ]
      }
    }
  },
  NC: {
    state: "North Carolina",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "L-01",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$125",
            processingTime: "5-7 business days",
            onlineUrl: "https://www.sosnc.gov/online_services/business_registration"
          }
        ],
        annualFees: [
          {
            amount: "$200",
            description: "Annual report"
          }
        ],
        additionalRequirements: [
          "Operating Agreement",
          "Business License",
          "EIN from IRS"
        ]
      }
    }
  },
  ND: {
    state: "North Dakota",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "SFN 58702",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$135",
            processingTime: "3-5 business days",
            onlineUrl: "https://firststop.sos.nd.gov"
          }
        ],
        annualFees: [
          {
            amount: "$50",
            description: "Annual report"
          }
        ],
        additionalRequirements: [
          "Operating Agreement",
          "Trade Name Registration",
          "EIN from IRS"
        ]
      }
    }
  },
  OH: {
    state: "Ohio",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "533A",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$99",
            processingTime: "3-7 business days",
            onlineUrl: "https://ohiosos.gov/businesses"
          }
        ],
        annualFees: [
          {
            amount: "$0",
            description: "No annual report required"
          }
        ],
        additionalRequirements: [
          "Operating Agreement",
          "Business License",
          "EIN from IRS"
        ]
      }
    }
  },
  OK: {
    state: "Oklahoma",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "LLC",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$100",
            processingTime: "1-3 business days",
            onlineUrl: "https://www.sos.ok.gov/business"
          }
        ],
        annualFees: [
          {
            amount: "$25",
            description: "Annual certificate"
          }
        ],
        additionalRequirements: [
          "Operating Agreement",
          "Business License",
          "EIN from IRS"
        ]
      }
    }
  },
  OR: {
    state: "Oregon",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "LLC-1",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$100",
            processingTime: "5-7 business days",
            onlineUrl: "https://sos.oregon.gov/business"
          }
        ],
        annualFees: [
          {
            amount: "$100",
            description: "Annual report"
          }
        ],
        additionalRequirements: [
          "Operating Agreement",
          "Business License",
          "EIN from IRS"
        ]
      }
    }
  },
  PA: {
    state: "Pennsylvania",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Certificate of Organization",
            form: "DSCB:15-8821",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$125",
            processingTime: "7-10 business days",
            onlineUrl: "https://www.corporations.pa.gov"
          }
        ],
        annualFees: [
          {
            amount: "$70",
            description: "Decennial report filing fee"
          }
        ],
        additionalRequirements: [
          "Operating Agreement",
          "Tax Registration",
          "EIN from IRS"
        ]
      }
    }
  },
  RI: {
    state: "Rhode Island",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "Form 400",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$150",
            processingTime: "5-7 business days",
            onlineUrl: "https://www.sos.ri.gov/divisions/business-services"
          }
        ],
        annualFees: [
          {
            amount: "$50",
            description: "Annual report"
          }
        ],
        additionalRequirements: [
          "Operating Agreement",
          "Business License",
          "EIN from IRS"
        ]
      }
    }
  },
  SC: {
    state: "South Carolina",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "LLC-FILED",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$110",
            processingTime: "2-3 business days",
            onlineUrl: "https://businessfilings.sc.gov"
          }
        ],
        annualFees: [
          {
            amount: "$0",
            description: "No annual report required"
          }
        ],
        additionalRequirements: [
          "Operating Agreement",
          "Business License",
          "EIN from IRS"
        ]
      }
    }
  },
  SD: {
    state: "South Dakota",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "LLC AF",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$150",
            processingTime: "3-5 business days",
            onlineUrl: "https://sosenterprise.sd.gov"
          }
        ],
        annualFees: [
          {
            amount: "$50",
            description: "Annual report"
          }
        ],
        additionalRequirements: [
          "Operating Agreement",
          "Business License",
          "EIN from IRS"
        ]
      }
    }
  },
  TN: {
    state: "Tennessee",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "SS-4270",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$300",
            processingTime: "2-3 business days",
            onlineUrl: "https://tnbear.tn.gov/Ecommerce"
          }
        ],
        annualFees: [
          {
            amount: "$300",
            description: "Annual report"
          }
        ],
        additionalRequirements: [
          "Operating Agreement",
          "Business License",
          "EIN from IRS"
        ]
      }
    }
  },
  TX: {
    state: "Texas",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Certificate of Formation",
            form: "Form 205",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$300",
            processingTime: "2-3 business days",
            onlineUrl: "https://www.sos.texas.gov/corp/forms_boc.shtml"
          }
        ],
        annualFees: [
          {
            amount: "$0",
            description: "No annual report required"
          }
        ],
        additionalRequirements: [
          "Operating Agreement",
          "Business License",
          "EIN from IRS"
        ]
      }
    }
  },
  UT: {
    state: "Utah",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Certificate of Organization",
            form: "LLC",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$70",
            processingTime: "1-2 business days",
            onlineUrl: "https://secure.utah.gov/osbr-user"
          }
        ],
        annualFees: [
          {
            amount: "$20",
            description: "Annual renewal"
          }
        ],
        additionalRequirements: [
          "Operating Agreement",
          "Business License",
          "EIN from IRS"
        ]
      }
    }
  },
  VA: {
    state: "Virginia",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "LLC-1011",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$100",
            processingTime: "5-7 business days",
            onlineUrl: "https://cis.scc.virginia.gov"
          }
        ],
        annualFees: [
          {
            amount: "$50",
            description: "Annual registration fee"
          }
        ],
        additionalRequirements: [
          "Operating Agreement",
          "Business License",
          "EIN from IRS"
        ]
      }
    }
  },
  VT: {
    state: "Vermont",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "LLC-1",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$125",
            processingTime: "7-10 business days",
            onlineUrl: "https://sos.vermont.gov/corporations"
          }
        ],
        annualFees: [
          {
            amount: "$35",
            description: "Annual report"
          }
        ],
        additionalRequirements: [
          "Operating Agreement",
          "Business License",
          "EIN from IRS"
        ]
      }
    }
  },
  WA: {
    state: "Washington",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Certificate of Formation",
            form: "LLC-1",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$180",
            processingTime: "2-3 business days",
            onlineUrl: "https://ccfs.sos.wa.gov"
          }
        ],
        annualFees: [
          {
            amount: "$60",
            description: "Annual report"
          }
        ],
        additionalRequirements: [
          "Operating Agreement",
          "Business License",
          "EIN from IRS"
        ]
      }
    }
  },
  WV: {
    state: "West Virginia",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "Form LCC-1",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$100",
            processingTime: "5-7 business days",
            onlineUrl: "https://business4wv.gov"
          }
        ],
        annualFees: [
          {
            amount: "$25",
            description: "Annual report"
          }
        ],
        additionalRequirements: [
          "Operating Agreement",
          "Business License",
          "EIN from IRS"
        ]
      }
    }
  },
  WI: {
    state: "Wisconsin",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "Form 502",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$130",
            processingTime: "5 business days",
            onlineUrl: "https://quickstart.wi.gov"
          }
        ],
        annualFees: [
          {
            amount: "$25",
            description: "Annual report"
          }
        ],
        additionalRequirements: [
          "Operating Agreement",
          "Business License",
          "EIN from IRS"
        ]
      }
    }
  },
  WY: {
    state: "Wyoming",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "LLC-AG-1",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$100",
            processingTime: "3-5 business days",
            onlineUrl: "https://wyobiz.wyo.gov"
          }
        ],
        annualFees: [
          {
            amount: "$50",
            description: "Annual report"
          }
        ],
        additionalRequirements: [
          "Operating Agreement",
          "Business License",
          "EIN from IRS"
        ]
      }
    }
  },
  OK: {
    state: "Oklahoma",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "Form LLC-1",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$100",
            processingTime: "1-2 business days",
            onlineUrl: "https://www.sos.ok.gov"
          }
        ],
        annualFees: [
          {
            amount: "$25",
            description: "Annual certificate"
          }
        ],
        additionalRequirements: [
          "Operating Agreement",
          "EIN from IRS",
          "Business License (if required)"
        ]
      }
    }
  },
  OR: {
    state: "Oregon",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Articles of Organization",
            form: "Form LLC-1",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$100",
            processingTime: "5-7 business days",
            onlineUrl: "https://sos.oregon.gov/business"
          }
        ],
        annualFees: [
          {
            amount: "$100",
            description: "Annual report"
          }
        ],
        additionalRequirements: [
          "Operating Agreement",
          "EIN from IRS",
          "Business License"
        ]
      }
    }
  },
  PA: {
    state: "Pennsylvania",
    businessStructures: {
      llc: {
        name: "Limited Liability Company",
        documents: [
          {
            name: "Certificate of Organization",
            form: "DSCB:15-8821",
            description: "Primary formation document",
            isRequired: true,
            filingFee: "$125",
            processingTime: "7-10 business days",
            onlineUrl: "https://www.corporations.pa.gov"
          }
        ],
        annualFees: [
          {
            amount: "$70",
            description: "Decennial report filing"
          }
        ],
        additionalRequirements: [
          "Operating Agreement",
          "EIN from IRS",
          "Business License"
        ]
      }
    }
  }
};

export const getStateRequirements = (state: string): StateRequirements | undefined => {
  return stateRequirements[state];
};

export const getRequirementsForStructure = (
  state: string,
  structure: BusinessStructure
): StateRequirements["businessStructures"][BusinessStructure] | undefined => {
  const stateReqs = stateRequirements[state];
  return stateReqs?.businessStructures[structure];
};