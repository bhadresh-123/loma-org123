export interface BusinessStructureInfo {
  value: string;
  label: string;
  description: string;
  pros: string[];
  cons: string[];
  bestFor: string[];
  typicalCosts: {
    formation: string;
    ongoing: string;
  };
}

export const BUSINESS_STRUCTURES: BusinessStructureInfo[] = [
  {
    value: "pllc",
    label: "Professional Limited Liability Company (PLLC)",
    description: "Specialized structure designed specifically for licensed mental health professionals, combining liability protection with professional practice requirements.",
    pros: [
      "Strongest liability protection for licensed professionals",
      "Clear separation between personal and business assets",
      "Maintains professional credibility with clients",
      "Required in many states for licensed mental health practice",
      "Tax flexibility (can be taxed as partnership or S-corp)"
    ],
    cons: [
      "Higher formation and maintenance costs than LLC",
      "Must maintain professional license in good standing",
      "Additional regulatory oversight and compliance",
      "Not available in all states"
    ],
    bestFor: [
      "Licensed therapists and counselors",
      "Mental health group practices",
      "Professionals planning long-term practice",
      "Higher-risk therapeutic services"
    ],
    typicalCosts: {
      formation: "$500-1,500",
      ongoing: "$200-800/year"
    }
  },
  {
    value: "llc",
    label: "Limited Liability Company (LLC)",
    description: "Standard business structure that may not meet state requirements for professional mental health services.",
    pros: [
      "Basic liability protection for business debts",
      "Lower formation costs than PLLC",
      "Flexible management structure",
      "Simple tax treatment"
    ],
    cons: [
      "May not be legal for licensed mental health practice in your state",
      "Less professional credibility with clients",
      "Limited protection for professional liability",
      "Could require conversion to PLLC later"
    ],
    bestFor: [
      "Non-clinical mental health businesses",
      "Coaching or consulting services",
      "States that don't require PLLC",
      "Starting with plans to convert later"
    ],
    typicalCosts: {
      formation: "$100-800",
      ongoing: "$100-500/year"
    }
  },
  {
    value: "sole_prop",
    label: "Sole Proprietorship",
    description: "Basic structure with no separation between personal and business assets. Generally not recommended for mental health practices.",
    pros: [
      "No formation costs or paperwork",
      "Simple tax filing with personal return",
      "Complete control over business",
      "Easy to change structure later"
    ],
    cons: [
      "NO liability protection for professional services",
      "Personal assets at risk from lawsuits",
      "Less professional credibility",
      "Limited business banking options"
    ],
    bestFor: [
      "Testing initial practice viability",
      "Part-time or temporary practice",
      "Very low-risk services",
      "Planning to upgrade structure soon"
    ],
    typicalCosts: {
      formation: "$0-100",
      ongoing: "$50-200/year"
    }
  },
  {
    value: "pc",
    label: "Professional Corporation (PC)",
    description: "Formal corporate structure for licensed professionals with comprehensive protection and governance framework.",
    pros: [
      "Maximum liability protection and asset separation",
      "Formal corporate governance structure",
      "Enhanced professional image",
      "Easier to transfer ownership/succession"
    ],
    cons: [
      "Highest formation and maintenance costs",
      "Complex corporate formalities required",
      "More complicated tax treatment",
      "Stricter operational requirements"
    ],
    bestFor: [
      "Large mental health practices",
      "Multi-provider clinics",
      "High-revenue practices",
      "Complex organizational needs"
    ],
    typicalCosts: {
      formation: "$1,000-2,500",
      ongoing: "$500-2,000/year"
    }
  }
];

export function getBusinessStructureInfo(value: string): BusinessStructureInfo | undefined {
  return BUSINESS_STRUCTURES.find(structure => structure.value === value);
}