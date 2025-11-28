import { db } from '../../db';
import { documents, documentTemplates, patients, organizations } from '../../db/schema-hipaa-refactored';
import { eq, and, desc, or, isNull } from 'drizzle-orm';
import { encryptPHI, decryptPHI } from '../utils/phi-encryption';
import { logPHIAccessToDatabase } from '../utils/unified-audit-service';
import { AuditAction, ResourceType } from '../utils/audit-system';

/**
 * Documents Service
 * 
 * Handles document and document template management with HIPAA compliance,
 * PHI encryption, and organization-aware access control.
 */

export interface DocumentTemplateData {
  type: string;
  title: string;
  content: string;
  category?: string;
  organizationId?: number | null;
  createdBy?: number;
  isActive?: boolean;
  version?: number;
}

export interface DocumentData {
  organizationId: number;
  patientId: number;
  templateId?: number | null;
  type: string;
  title: string;
  content: string; // Will be encrypted
  fileUrl?: string | null;
  fileName?: string | null;
  fileMimeType?: string | null;
  status?: string;
  signedAt?: Date | null;
  signedBy?: string | null;
  createdBy: number;
}

export class DocumentsService {
  /**
   * Get all document templates (system-wide or organization-specific)
   * Filter by type/category if specified
   */
  static async getTemplates(params: {
    organizationId?: number;
    type?: string;
    category?: string;
    userId: number;
  }): Promise<any[]> {
    try {
      let query = db
        .select()
        .from(documentTemplates)
        .where(eq(documentTemplates.isActive, true));

      // Include system-wide templates (null organizationId) OR organization-specific templates
      const whereConditions = [isNull(documentTemplates.organizationId)];
      
      if (params.organizationId) {
        whereConditions.push(eq(documentTemplates.organizationId, params.organizationId));
      }

      const templates = await db
        .select()
        .from(documentTemplates)
        .where(
          and(
            eq(documentTemplates.isActive, true),
            or(...whereConditions),
            params.type ? eq(documentTemplates.type, params.type) : undefined,
            params.category ? eq(documentTemplates.category, params.category) : undefined
          )
        )
        .orderBy(desc(documentTemplates.createdAt));

      // Log access (non-blocking)
      try {
        await logPHIAccessToDatabase({
          userId: params.userId,
          action: AuditAction.READ,
          resourceType: ResourceType.DOCUMENT_TEMPLATE,
          resourceId: null,
          success: true,
          details: JSON.stringify({
            count: templates.length,
            category: params.category,
            type: params.type,
          }),
        });
      } catch (auditError) {
        console.error('Failed to log PHI access for template fetch, continuing:', auditError);
      }

      return templates;
    } catch (error) {
      console.error('Error fetching document templates:', error);
      throw error;
    }
  }

  /**
   * Get templates by category (e.g., "intake-docs")
   */
  static async getTemplatesByCategory(category: string, organizationId: number | null, userId: number): Promise<any[]> {
    return this.getTemplates({
      category,
      organizationId: organizationId || undefined,
      userId,
    });
  }

  /**
   * Create a new document template
   */
  static async createTemplate(data: DocumentTemplateData, userId: number): Promise<any> {
    try {
      const [template] = await db
        .insert(documentTemplates)
        .values({
          type: data.type,
          title: data.title,
          content: data.content,
          category: data.category || 'intake-docs',
          organizationId: data.organizationId || null,
          isActive: data.isActive ?? true,
          version: data.version || 1,
          createdBy: data.createdBy || userId,
          updatedBy: userId,
        })
        .returning();

      // Log creation (non-blocking)
      try {
        await logPHIAccessToDatabase({
          userId,
          action: AuditAction.CREATE,
          resourceType: ResourceType.DOCUMENT_TEMPLATE,
          resourceId: template.id,
          success: true,
          details: JSON.stringify({
            type: data.type,
            organizationId: data.organizationId,
          }),
        });
      } catch (auditError) {
        console.error('Failed to log PHI access for template creation, continuing:', auditError);
      }

      return template;
    } catch (error) {
      console.error('Error creating document template:', error);
      throw error;
    }
  }

  /**
   * Get all documents for a patient (with access control)
   */
  static async getDocumentsForPatient(
    patientId: number,
    userId: number,
    organizationId: number
  ): Promise<any[]> {
    try {
      // Verify user has access to this patient
      const patient = await db
        .select()
        .from(patients)
        .where(
          and(
            eq(patients.id, patientId),
            eq(patients.organizationId, organizationId)
          )
        )
        .limit(1);

      if (patient.length === 0) {
        throw new Error('Patient not found or access denied');
      }

      // Fetch documents
      const patientDocuments = await db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.patientId, patientId),
            eq(documents.organizationId, organizationId)
          )
        )
        .orderBy(desc(documents.createdAt));

      // Decrypt PHI content
      const decryptedDocuments = patientDocuments.map(doc => this.decryptDocumentPHI(doc));

      // Log PHI access (non-blocking)
      try {
        await logPHIAccessToDatabase({
          userId,
          action: AuditAction.READ,
          resourceType: ResourceType.PATIENT_DOCUMENT,
          resourceId: patientId,
          success: true,
          details: JSON.stringify({
            documentCount: decryptedDocuments.length,
            patientId,
          }),
        });
      } catch (auditError) {
        console.error('Failed to log PHI access for patient documents, continuing:', auditError);
      }

      return decryptedDocuments;
    } catch (error) {
      console.error('Error fetching patient documents:', error);
      throw error;
    }
  }

  /**
   * Get all documents for an organization
   */
  static async getDocumentsForOrganization(
    organizationId: number,
    userId: number
  ): Promise<any[]> {
    try {
      const orgDocuments = await db
        .select()
        .from(documents)
        .where(eq(documents.organizationId, organizationId))
        .orderBy(desc(documents.createdAt));

      // Decrypt PHI content
      const decryptedDocuments = orgDocuments.map(doc => this.decryptDocumentPHI(doc));

      // Log PHI access (non-blocking)
      try {
        await logPHIAccessToDatabase({
          userId,
          action: AuditAction.READ,
          resourceType: ResourceType.PATIENT_DOCUMENT,
          resourceId: null,
          success: true,
          details: JSON.stringify({
            documentCount: decryptedDocuments.length,
            organizationId,
          }),
        });
      } catch (auditError) {
        console.error('Failed to log PHI access for organization documents, continuing:', auditError);
      }

      return decryptedDocuments;
    } catch (error) {
      console.error('Error fetching organization documents:', error);
      throw error;
    }
  }

  /**
   * Get a specific document by ID
   */
  static async getDocument(
    documentId: number,
    userId: number,
    organizationId: number
  ): Promise<any | null> {
    try {
      const [document] = await db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.id, documentId),
            eq(documents.organizationId, organizationId)
          )
        )
        .limit(1);

      if (!document) {
        return null;
      }

      const decryptedDocument = this.decryptDocumentPHI(document);

      // Log PHI access (non-blocking)
      try {
        await logPHIAccessToDatabase({
          userId,
          action: AuditAction.READ,
          resourceType: ResourceType.PATIENT_DOCUMENT,
          resourceId: documentId,
          success: true,
          details: JSON.stringify({
            patientId: document.patientId,
            type: document.type,
          }),
        });
      } catch (auditError) {
        console.error('Failed to log PHI access for document by ID, continuing:', auditError);
      }

      return decryptedDocument;
    } catch (error) {
      console.error('Error fetching document:', error);
      throw error;
    }
  }

  /**
   * Create a new document
   */
  static async createDocument(data: DocumentData, userId: number): Promise<any> {
    try {
      // Verify patient exists and belongs to organization
      const [patient] = await db
        .select()
        .from(patients)
        .where(
          and(
            eq(patients.id, data.patientId),
            eq(patients.organizationId, data.organizationId)
          )
        )
        .limit(1);

      if (!patient) {
        throw new Error('Patient not found or does not belong to organization');
      }

      // Encrypt PHI content
      const encryptedContent = encryptPHI(data.content);

      // Create document
      const [document] = await db
        .insert(documents)
        .values({
          organizationId: data.organizationId,
          patientId: data.patientId,
          templateId: data.templateId || null,
          type: data.type,
          title: data.title,
          contentEncrypted: encryptedContent,
          fileUrl: data.fileUrl || null,
          fileName: data.fileName || null,
          fileMimeType: data.fileMimeType || null,
          status: data.status || 'draft',
          signedAt: data.signedAt || null,
          signedBy: data.signedBy || null,
          createdBy: data.createdBy,
          updatedBy: userId,
        })
        .returning();

      // Log PHI creation (non-blocking)
      try {
        await logPHIAccessToDatabase({
          userId,
          action: AuditAction.CREATE,
          resourceType: ResourceType.PATIENT_DOCUMENT,
          resourceId: document.id,
          success: true,
          details: JSON.stringify({
            patientId: data.patientId,
            type: data.type,
            templateId: data.templateId,
          }),
        });
      } catch (auditError) {
        console.error('Failed to log PHI access for document creation, continuing:', auditError);
      }

      // Return decrypted version
      return this.decryptDocumentPHI(document);
    } catch (error) {
      console.error('Error creating document:', error);
      throw error;
    }
  }

  /**
   * Update an existing document
   */
  static async updateDocument(
    documentId: number,
    data: Partial<DocumentData>,
    userId: number,
    organizationId: number
  ): Promise<any | null> {
    try {
      // Verify document exists and belongs to organization
      const [existingDoc] = await db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.id, documentId),
            eq(documents.organizationId, organizationId)
          )
        )
        .limit(1);

      if (!existingDoc) {
        throw new Error('Document not found or access denied');
      }

      // Prepare update data
      const updateData: any = {
        updatedBy: userId,
        updatedAt: new Date(),
      };

      if (data.content !== undefined) {
        updateData.contentEncrypted = encryptPHI(data.content);
      }
      if (data.title !== undefined) updateData.title = data.title;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.signedAt !== undefined) updateData.signedAt = data.signedAt;
      if (data.signedBy !== undefined) updateData.signedBy = data.signedBy;
      if (data.fileUrl !== undefined) updateData.fileUrl = data.fileUrl;
      if (data.fileName !== undefined) updateData.fileName = data.fileName;
      if (data.fileMimeType !== undefined) updateData.fileMimeType = data.fileMimeType;

      // Update document
      const [updatedDoc] = await db
        .update(documents)
        .set(updateData)
        .where(eq(documents.id, documentId))
        .returning();

      // Log PHI update (non-blocking)
      try {
        await logPHIAccessToDatabase({
          userId,
          action: AuditAction.UPDATE,
          resourceType: ResourceType.PATIENT_DOCUMENT,
          resourceId: documentId,
          success: true,
          details: JSON.stringify({
            patientId: existingDoc.patientId,
            updatedFields: Object.keys(updateData),
          }),
        });
      } catch (auditError) {
        console.error('Failed to log PHI access for document update, continuing:', auditError);
      }

      return this.decryptDocumentPHI(updatedDoc);
    } catch (error) {
      console.error('Error updating document:', error);
      throw error;
    }
  }

  /**
   * Delete a document
   */
  static async deleteDocument(
    documentId: number,
    userId: number,
    organizationId: number
  ): Promise<boolean> {
    try {
      // Verify document exists and belongs to organization
      const [existingDoc] = await db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.id, documentId),
            eq(documents.organizationId, organizationId)
          )
        )
        .limit(1);

      if (!existingDoc) {
        throw new Error('Document not found or access denied');
      }

      // Delete document
      await db
        .delete(documents)
        .where(eq(documents.id, documentId));

      // Log deletion (non-blocking)
      try {
        await logPHIAccessToDatabase({
          userId,
          action: AuditAction.DELETE,
          resourceType: ResourceType.PATIENT_DOCUMENT,
          resourceId: documentId,
          success: true,
          details: JSON.stringify({
            patientId: existingDoc.patientId,
            type: existingDoc.type,
          }),
        });
      } catch (auditError) {
        console.error('Failed to log PHI access for document deletion, continuing:', auditError);
      }

      return true;
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  /**
   * Decrypt PHI fields in a document
   */
  private static decryptDocumentPHI(document: any): any {
    if (!document) return null;

    const decrypted = { ...document };

    // Decrypt content if present
    if (document.contentEncrypted) {
      try {
        decrypted.content = decryptPHI(document.contentEncrypted);
        delete decrypted.contentEncrypted;
      } catch (error) {
        console.error('Error decrypting document content:', error);
        decrypted.content = '[Decryption Error]';
      }
    }

    return decrypted;
  }

  /**
   * Encrypt PHI fields in a document
   */
  private static encryptDocumentPHI(document: any): any {
    if (!document) return null;

    const encrypted = { ...document };

    // Encrypt content if present
    if (document.content) {
      encrypted.contentEncrypted = encryptPHI(document.content);
      delete encrypted.content;
    }

    return encrypted;
  }
}

export default DocumentsService;

