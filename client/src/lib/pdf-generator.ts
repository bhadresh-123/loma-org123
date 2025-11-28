import { jsPDF } from 'jspdf';

export class PDFDocument {
  private doc: jsPDF;

  constructor() {
    this.doc = new jsPDF();
  }

  private addHeader(text: string) {
    this.doc.setFontSize(16);
    this.doc.text(text, 20, 20);
    this.doc.setFontSize(12);
  }

  private addField(label: string, value: string = '', y: number) {
    this.doc.text(`${label}:`, 20, y);
    this.doc.setTextColor(100);
    this.doc.text(value, 80, y);
    this.doc.setTextColor(0);
  }

  generateArticlesOfOrganization(data: {
    businessName: string;
    businessType: string;
    state: string;
    firstName: string;
    lastName: string;
    businessAddress: string;
    businessCity: string;
    businessState: string;
    businessZip: string;
  }) {
    this.addHeader('ARTICLES OF ORGANIZATION');

    let y = 40;
    this.addField('Business Name', data.businessName, y);
    y += 10;
    this.addField('Business Type', data.businessType, y);
    y += 10;
    this.addField('State', data.state, y);
    y += 10;
    this.addField('Owner Name', `${data.firstName} ${data.lastName}`, y);
    y += 10;
    this.addField('Business Address', data.businessAddress, y);
    y += 10;
    this.addField('City', data.businessCity, y);
    y += 10;
    this.addField('State', data.businessState, y);
    y += 10;
    this.addField('ZIP', data.businessZip, y);

    return this.doc;
  }

  generateOperatingAgreement(data: {
    businessName: string;
    businessType: string;
    state: string;
    firstName: string;
    lastName: string;
    businessAddress: string;
    businessCity: string;
    businessState: string;
    businessZip: string;
    email: string;
    phone: string;
  }) {
    this.addHeader('OPERATING AGREEMENT');

    let y = 40;
    this.addField('Business Name', data.businessName, y);
    y += 10;
    this.addField('Business Type', data.businessType, y);
    y += 10;
    this.addField('State', data.state, y);
    y += 10;
    this.addField('Member Name', `${data.firstName} ${data.lastName}`, y);
    y += 10;
    this.addField('Principal Address', data.businessAddress, y);
    y += 10;
    this.addField('City', data.businessCity, y);
    y += 10;
    this.addField('State', data.businessState, y);
    y += 10;
    this.addField('ZIP', data.businessZip, y);
    y += 10;
    this.addField('Contact Email', data.email, y);
    y += 10;
    this.addField('Contact Phone', data.phone, y);

    return this.doc;
  }

  generateEINApplication(data: {
    businessName: string;
    businessType: string;
    firstName: string;
    lastName: string;
    ssn?: string;
    businessAddress: string;
    businessCity: string;
    businessState: string;
    businessZip: string;
    email: string;
    phone: string;
  }) {
    this.addHeader('Form SS-4: Application for Employer Identification Number');

    let y = 40;
    this.addField('Legal Business Name', data.businessName, y);
    y += 10;
    this.addField('Business Type', data.businessType, y);
    y += 10;
    this.addField('Owner Name', `${data.firstName} ${data.lastName}`, y);
    y += 10;
    if (data.ssn) {
      this.addField('SSN/ITIN', data.ssn, y);
      y += 10;
    }
    this.addField('Business Address', data.businessAddress, y);
    y += 10;
    this.addField('City', data.businessCity, y);
    y += 10;
    this.addField('State', data.businessState, y);
    y += 10;
    this.addField('ZIP', data.businessZip, y);
    y += 10;
    this.addField('Contact Email', data.email, y);
    y += 10;
    this.addField('Contact Phone', data.phone, y);

    return this.doc;
  }

  save(filename: string) {
    this.doc.save(filename);
  }
}