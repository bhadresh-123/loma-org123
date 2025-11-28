export interface ArticlesData {
  state: string;
  companyName: string;
  principalAddress: string;
  registeredAgent: {
    name: string;
    address: string;
  };
  members: Array<{
    name: string;
    address: string;
  }>;
  effectiveDate: string;
  purpose?: string;
}

export const generateArticles = (data: ArticlesData) => {
  const templates: { [key: string]: (data: ArticlesData) => string } = {
    AL: (data) => `
CERTIFICATE OF FORMATION
ALABAMA LIMITED LIABILITY COMPANY

1. The name of the Limited Liability Company is: ${data.companyName}

2. Street address of principal office:
${data.principalAddress}

3. The name and street address of the registered agent is:
${data.registeredAgent.name}
${data.registeredAgent.address}

4. Purpose (optional):
${data.purpose || "The purpose is to engage in any lawful act or activity."}

5. The company will be: Member-Managed

6. Period of Duration: Perpetual

Signed by Organizer: _____________________
Date: ${new Date().toLocaleDateString()}`,

    // Add more state-specific templates
  };

  return templates[data.state]?.(data) || templates.AL(data);
};