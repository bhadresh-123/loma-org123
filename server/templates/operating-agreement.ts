export interface OperatingAgreementData {
  state: string;
  companyName: string;
  members: Array<{
    name: string;
    ownership: number;
    capitalContribution: number;
  }>;
  principalAddress: string;
  effectiveDate: string;
}

export const generateOperatingAgreement = (data: OperatingAgreementData) => {
  const baseTemplate = `
OPERATING AGREEMENT
OF
${data.companyName}

ARTICLE I: ORGANIZATION
1.1 Formation. This Limited Liability Company Operating Agreement governs the operation of ${data.companyName} (the "Company"), organized under the laws of ${data.state}.

ARTICLE II: MEMBERSHIP
2.1 Initial Members. The initial Members of the Company are:
${data.members.map(member => `
Name: ${member.name}
Ownership Percentage: ${member.ownership}%
Initial Capital Contribution: $${member.capitalContribution.toFixed(2)}
`).join('\n')}

ARTICLE III: MANAGEMENT
3.1 Management. The Company shall be managed by its Members.

IN WITNESS WHEREOF, this Operating Agreement is executed and effective as of ${data.effectiveDate}.

MEMBERS:
${data.members.map(member => `
_______________________
${member.name}
Date: ${data.effectiveDate}
`).join('\n')}`;

  return baseTemplate.trim();
};