import { jsPDF } from "jspdf";

export class PDFDocument {
  private doc: jsPDF;

  constructor() {
    this.doc = new jsPDF();
    this.doc.setFontSize(12);
  }

  private addHeader(title: string) {
    this.doc.setFontSize(16);
    this.doc.setFont("helvetica", "bold");
    this.doc.text(title, 20, 20);
    this.doc.setFontSize(12);
    this.doc.setFont("helvetica", "normal");
  }

  private addField(label: string, value: string, y: number) {
    this.doc.setFont("helvetica", "bold");
    this.doc.text(`${label}:`, 20, y);
    this.doc.setFont("helvetica", "normal");
    this.doc.text(value, 80, y);
  }

  private addArticleSection(number: number, title: string, content: string, y: number): number {
    this.doc.setFont("helvetica", "bold");
    this.doc.text(`ARTICLE ${number}: ${title}`, 20, y);
    this.doc.setFont("helvetica", "normal");

    // Split content into multiple lines if needed
    const lines = this.doc.splitTextToSize(content, 170);
    y += 10;
    this.doc.text(lines, 20, y);

    return y + (lines.length * 7) + 10; // Return the new Y position
  }

  generateArticlesOfOrganization(data: any) {
    console.log('Starting Articles of Organization PDF generation with data:', JSON.stringify(data));
    
    try {
      // For sole proprietors, generate a different document
      if (data.businessType === 'sole_prop') {
        console.log('Generating Sole Proprietorship Guide instead of Articles');
        return this.generateSoleProprietorshipGuide(data);
      }

      // Check if required fields are available
      const requiredFields = ['businessName', 'businessType', 'firstName', 'lastName', 
        'businessAddress', 'businessCity', 'businessState', 'businessZip'];
      
      for (const field of requiredFields) {
        if (!data[field]) {
          console.warn(`Warning: Missing required field ${field} for Articles of Organization`);
        }
      }

      this.addHeader('ARTICLES OF ORGANIZATION OF');
      this.doc.setFontSize(14);
      this.doc.text(data.businessName || '[BUSINESS NAME]', 20, 30);
      this.doc.text('A CALIFORNIA PROFESSIONAL LIMITED LIABILITY COMPANY', 20, 40);
      this.doc.setFontSize(12);

      let y = 60;

      // Article 1: Name
      y = this.addArticleSection(1, 'NAME', 
        `The name of the limited liability company is ${data.businessName || '[BUSINESS NAME]'}.`, y);

      // Article 2: Purpose
      const businessTypeLabel = data.businessType === 'pllc' 
        ? 'Licensed Mental Health Professional' 
        : (data.businessType || '[BUSINESS TYPE]');
        
      y = this.addArticleSection(2, 'PURPOSE', 
        `The purpose of this Professional Limited Liability Company is to engage in the profession of ${businessTypeLabel} and any lawful activities permitted to be done by a professional limited liability company under the California Revised Limited Liability Company Act.`, y);

      // Article 3: Initial Agent
      const firstName = data.firstName || '[FIRST NAME]';
      const lastName = data.lastName || '[LAST NAME]';
      const address = data.businessAddress || '[BUSINESS ADDRESS]';
      const city = data.businessCity || '[CITY]';
      const state = data.businessState || '[STATE]';
      const zip = data.businessZip || '[ZIP]';
      
      y = this.addArticleSection(3, 'INITIAL AGENT FOR SERVICE OF PROCESS', 
        `The initial agent for service of process is:\n${firstName} ${lastName}\n${address}\n${city}, ${state} ${zip}`, y);

      // Article 4: Management
      y = this.addArticleSection(4, 'MANAGEMENT', 
        'The limited liability company will be managed by one or more managers.', y);

      // Article 5: Professional Services
      y = this.addArticleSection(5, 'PROFESSIONAL SERVICES', 
        'All members of this professional limited liability company shall be licensed professionals described in Section 13401 of the California Corporations Code.', y);

      // Signature Block
      y += 30;
      this.doc.line(20, y, 100, y);
      y += 5;
      this.doc.text(`${firstName} ${lastName}, Organizer`, 20, y);
      y += 10;
      this.doc.text(new Date().toLocaleDateString(), 20, y);

      console.log('Articles of Organization PDF generation completed');
      return this.doc.output('arraybuffer');
    } catch (error) {
      console.error('Error generating Articles of Organization PDF:', error);
      throw error;
    }
  }

  private generateSoleProprietorshipGuide(data: any) {
    console.log('Starting Sole Proprietorship Guide PDF generation with data:', JSON.stringify(data));
    
    try {
      this.addHeader('SOLE PROPRIETORSHIP INFORMATION GUIDE');
      let y = 40;
      
      // Check for required fields
      const requiredFields = ['firstName', 'lastName'];
      for (const field of requiredFields) {
        if (!data[field]) {
          console.warn(`Warning: Missing required field ${field} for Sole Proprietorship Guide`);
        }
      }

      // Basic Information
      const firstName = data.firstName || '[FIRST NAME]';
      const lastName = data.lastName || '[LAST NAME]';
      this.addField('Owner Name', `${firstName} ${lastName}`, y);
      y += 20;

      // DBA Section
      if (data.hasDBA) {
        this.doc.setFont("helvetica", "bold");
        this.doc.text('FICTITIOUS BUSINESS NAME (DBA) REQUIREMENTS', 20, y);
        this.doc.setFont("helvetica", "normal");
        y += 15;

        const dbaName = data.dbaName || '[DBA NAME]';
        const dbaText = [
          `Your chosen DBA name: ${dbaName}`,
          '',
          'Required Steps:',
          '1. File a Fictitious Business Name Statement with your county clerk\'s office',
          '2. Publish the FBN statement in a local newspaper for 4 consecutive weeks',
          '3. File proof of publication with the county clerk',
          '',
          'Note: DBA registration must be renewed every 5 years'
        ];

        dbaText.forEach(line => {
          this.doc.text(line, 20, y);
          y += 10;
        });
      } else {
        this.doc.setFont("helvetica", "bold");
        this.doc.text('BUSINESS NAME INFORMATION', 20, y);
        this.doc.setFont("helvetica", "normal");
        y += 15;

        const noDBaText = [
          'You have indicated that you will operate under your legal name.',
          'No fictitious business name filing is required.',
          '',
          'Note: If you decide to use a business name other than your legal name in the future,',
          'you must file a Fictitious Business Name Statement.'
        ];

        noDBaText.forEach(line => {
          this.doc.text(line, 20, y);
          y += 10;
        });
      }

      // Add general sole proprietorship information
      y += 20;
      this.doc.setFont("helvetica", "bold");
      this.doc.text('GENERAL INFORMATION', 20, y);
      this.doc.setFont("helvetica", "normal");
      y += 15;

      const generalInfo = [
        'As a sole proprietor:',
        '• You are not required to file formation documents with the state',
        '• Your business and personal assets are not separated',
        '• You may need local business licenses or permits',
        '• Consider obtaining liability insurance',
        '• Keep detailed records of income and expenses',
        '• You must report business income on your personal tax return'
      ];

      generalInfo.forEach(line => {
        this.doc.text(line, 20, y);
        y += 10;
      });

      console.log('Sole Proprietorship Guide PDF generation completed');
      return this.doc.output('arraybuffer');
    } catch (error) {
      console.error('Error generating Sole Proprietorship Guide PDF:', error);
      throw error;
    }
  }

  generateOperatingAgreement(data: any) {
    console.log('Starting Operating Agreement PDF generation with data:', JSON.stringify(data));
    
    try {
      this.addHeader('OPERATING AGREEMENT');
      let y = 40;

      // Check if required fields are available
      const requiredFields = ['businessName', 'businessType', 'firstName', 'lastName', 
        'businessAddress', 'businessCity', 'businessState', 'businessZip', 'email', 'phone'];
      
      for (const field of requiredFields) {
        if (!data[field]) {
          console.warn(`Warning: Missing required field ${field} for Operating Agreement`);
        }
      }

      // Proceed with filling the form using available data
      const formFields = {
        'Business Name': data.businessName || 'Not provided',
        'Business Type': data.businessType || 'Not provided',
        'State of Formation': data.state || data.incorporationState || 'Not provided',
        'Member Name': `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Not provided',
        'Business Address': data.businessAddress || 'Not provided',
        'City': data.businessCity || 'Not provided',
        'State (Jurisdiction)': data.businessState || 'Not provided',
        'ZIP': data.businessZip || 'Not provided',
        'Email': data.email || 'Not provided',
        'Phone': data.phone || 'Not provided'
      };

      Object.entries(formFields).forEach(([label, value]) => {
        this.addField(label, value as string, y);
        y += 10;
      });

      console.log('Operating Agreement PDF generation completed');
      return this.doc.output('arraybuffer');
    } catch (error) {
      console.error('Error generating Operating Agreement PDF:', error);
      throw error;
    }
  }

  generateEINApplication(data: any) {
    // Let's add detailed logging to track what's going on
    console.log('Starting EIN Application PDF generation with data:', JSON.stringify(data));
    
    try {
      this.addHeader('Form SS-4: Application for Employer Identification Number');
      let y = 40;

      // Check if required fields are available
      const requiredFields = ['businessName', 'businessType', 'firstName', 'lastName', 
        'businessAddress', 'businessCity', 'businessState', 'businessZip', 'email', 'phone'];
      
      for (const field of requiredFields) {
        if (!data[field]) {
          console.warn(`Warning: Missing required field ${field} for EIN application`);
        }
      }

      // Proceed with filling the form using available data
      const formFields = {
        'Legal Business Name': data.businessName || 'Not provided',
        'Business Type': data.businessType || 'Not provided',
        'Owner Name': `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Not provided',
        'Business Address': data.businessAddress || 'Not provided',
        'City': data.businessCity || 'Not provided',
        'State': data.businessState || 'Not provided',
        'ZIP': data.businessZip || 'Not provided',
        'Email': data.email || 'Not provided',
        'Phone': data.phone || 'Not provided'
      };

      Object.entries(formFields).forEach(([label, value]) => {
        this.addField(label, value as string, y);
        y += 10;
      });

      console.log('PDF generation completed, returning buffer');
      const buffer = this.doc.output('arraybuffer');
      return buffer;
    } catch (error) {
      console.error('Error generating EIN application PDF:', error);
      throw error;
    }
  }
}