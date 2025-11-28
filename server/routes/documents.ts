import { Router } from 'express';
import { DocumentsService } from '../services/DocumentsService';
import { authenticateToken, rbac } from '../middleware/authentication';
import { validateRequest } from '../middleware/validation';
import { rateLimits } from '../middleware/core-security';
import { auditMiddleware } from '../middleware/audit-logging';
import { z } from 'zod';
import { db } from '../../db';
import { organizationMemberships, documentTemplates, therapistProfiles, organizations } from '../../db/schema-hipaa-refactored';
import { eq, and } from 'drizzle-orm';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { storeFile, retrieveFile, deleteFile } from '../utils/file-storage';

const router = Router();

// ============================================================================
// MULTER CONFIGURATION FOR FILE UPLOADS
// ============================================================================

// Configure multer for temporary file uploads
const upload = multer({
  dest: 'uploads/temp/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Accept common document formats
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif',
      'text/plain',
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, images, and text files are allowed.'));
    }
  }
});

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createDocumentSchema = z.object({
  patientId: z.number().int().positive(),
  templateId: z.number().int().positive().optional().nullable(),
  type: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1),
  fileUrl: z.string().url().optional().nullable(),
  fileName: z.string().optional().nullable(),
  fileMimeType: z.string().optional().nullable(),
  status: z.enum(['draft', 'final', 'signed', 'archived']).optional(),
  signedAt: z.string().datetime().optional().nullable(),
  signedBy: z.string().optional().nullable(),
});

const updateDocumentSchema = createDocumentSchema.partial().omit({ patientId: true });

const createTemplateSchema = z.object({
  type: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1),
  category: z.string().optional(),
  organizationId: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().optional(),
  version: z.number().int().positive().optional(),
});

// ============================================================================
// DOCUMENT TEMPLATE ROUTES (must be before document routes to avoid conflicts)
// ============================================================================

/**
 * GET /api/document-templates/types/:type
 * Get templates by category (e.g., "intake-docs")
 * This is the endpoint the frontend is calling
 */
router.get('/types/:type', 
  rateLimits.readOnly,
  authenticateToken,
  rbac.requireTherapistOrAbove,
  auditMiddleware.auditPHIAccess('READ', 'DOCUMENT', { trackFields: true }),
  async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const category = req.params.type;
    
    // Get user's organization from membership (optional for templates)
    const [membership] = await db
      .select()
      .from(organizationMemberships)
      .where(eq(organizationMemberships.userId, userId))
      .limit(1);

    const templates = await DocumentsService.getTemplatesByCategory(category, membership?.organizationId || null, userId);
    
    res.json(templates); // Return array directly for compatibility with frontend
  } catch (error) {
    console.error('Error fetching document templates by category:', error);
    res.status(500).json({ 
      error: 'TEMPLATES_FETCH_FAILED',
      message: 'Failed to fetch document templates'
    });
  }
});

/**
 * GET /api/document-templates
 * Get all document templates (system-wide + organization-specific)
 */
router.get('/templates', 
  rateLimits.readOnly,
  authenticateToken,
  rbac.requireTherapistOrAbove,
  auditMiddleware.auditPHIAccess('READ', 'DOCUMENT', { trackFields: true }),
  async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get user's organization from membership (optional for templates)
    const [membership] = await db
      .select()
      .from(organizationMemberships)
      .where(eq(organizationMemberships.userId, userId))
      .limit(1);

    const type = req.query.type as string | undefined;
    const category = req.query.category as string | undefined;

    const templates = await DocumentsService.getTemplates({
      organizationId: membership?.organizationId,
      type,
      category,
      userId,
    });
    
    res.json({
      success: true,
      data: templates,
      count: templates.length
    });
  } catch (error) {
    console.error('Error fetching document templates:', error);
    res.status(500).json({ 
      error: 'TEMPLATES_FETCH_FAILED',
      message: 'Failed to fetch document templates'
    });
  }
});

/**
 * GET /api/document-templates/debug
 * Debug endpoint to check what's in the database
 */
router.get('/templates/debug', 
  rateLimits.admin,
  authenticateToken,
  rbac.requireAdminOrOwner,
  auditMiddleware.auditPHIAccess('READ', 'DOCUMENT', { trackFields: true }),
  async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Query all templates directly
    const allTemplates = await db
      .select()
      .from(documentTemplates);

    res.json({
      success: true,
      count: allTemplates.length,
      templates: allTemplates.map(t => ({
        id: t.id,
        type: t.type,
        title: t.title,
        category: t.category,
        organizationId: t.organizationId,
        isActive: t.isActive,
      })),
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: String(error) });
  }
});

/**
 * POST /api/document-templates
 * Create a new document template
 */
router.post('/templates', 
  rateLimits.admin,
  authenticateToken,
  rbac.requireAdminOrOwner,
  auditMiddleware.auditPHIAccess('CREATE', 'DOCUMENT', { trackFields: true }),
  validateRequest(createTemplateSchema), 
  async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const template = await DocumentsService.createTemplate(req.body, userId);
    
    res.status(201).json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('Error creating document template:', error);
    res.status(500).json({ 
      error: 'TEMPLATE_CREATE_FAILED',
      message: error instanceof Error ? error.message : 'Failed to create template'
    });
  }
});

/**
 * POST /api/document-templates/seed
 * Seed default document templates (admin/dev only)
 */
router.post('/templates/seed', 
  rateLimits.admin,
  authenticateToken,
  rbac.requireAdminOrOwner,
  auditMiddleware.auditPHIAccess('CREATE', 'DOCUMENT', { trackFields: true }),
  async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Import templates here
    const { ALL_CLINICAL_TEMPLATES } = await import('../../server/templates/clinical-documents');

    let createdCount = 0;
    let skippedCount = 0;

    for (const template of ALL_CLINICAL_TEMPLATES) {
      try {
        // Use DocumentsService which has the correct schema
        await DocumentsService.createTemplate({
          type: template.type,
          title: template.title,
          content: template.content,
          category: template.category,
          organizationId: null, // System-wide template
        }, userId);
        createdCount++;
      } catch (error) {
        // Template might already exist, skip it
        console.log(`Skipping template ${template.type}:`, error instanceof Error ? error.message : 'Unknown error');
        skippedCount++;
      }
    }

    res.json({
      success: true,
      message: 'Document templates seeded successfully',
      created: createdCount,
      skipped: skippedCount,
      total: ALL_CLINICAL_TEMPLATES.length
    });
  } catch (error) {
    console.error('Error seeding document templates:', error);
    res.status(500).json({ 
      error: 'TEMPLATE_SEED_FAILED',
      message: error instanceof Error ? error.message : 'Failed to seed templates'
    });
  }
});

// ============================================================================
// DOCUMENT ROUTES
// ============================================================================

/**
 * GET /api/documents
 * Get all documents for the user's organization
 */
router.get('/', 
  rateLimits.readOnly,
  authenticateToken,
  rbac.requireTherapistOrAbove,
  auditMiddleware.auditPHIAccess('READ', 'DOCUMENT', { trackFields: true, requireAuthorization: true }),
  async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get user's organization from membership
    const [membership] = await db
      .select()
      .from(organizationMemberships)
      .where(eq(organizationMemberships.userId, userId))
      .limit(1);
      
    if (!membership) {
      return res.status(403).json({ 
        error: 'ORGANIZATION_REQUIRED',
        message: 'User must belong to an organization to access documents'
      });
    }

    // Get documents for organization
    const documents = await DocumentsService.getDocumentsForOrganization(membership.organizationId, userId);
    
    res.json(documents); // Return array directly for compatibility with frontend
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ 
      error: 'DOCUMENTS_FETCH_FAILED',
      message: 'Failed to fetch documents'
    });
  }
});

/**
 * GET /api/documents/patient/:patientId
 * Get all documents for a specific patient
 * NOTE: This must come BEFORE /:id route to avoid matching conflicts
 */
router.get('/patient/:patientId', 
  rateLimits.sensitivePHI,
  authenticateToken,
  rbac.requireTherapistOrAbove,
  auditMiddleware.auditPHIAccess('READ', 'DOCUMENT', { trackFields: true, requireAuthorization: true }),
  async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const patientId = parseInt(req.params.patientId);
    if (isNaN(patientId)) {
      return res.status(400).json({ error: 'Invalid patient ID' });
    }

    // Get user's organization from membership
    const [membership] = await db
      .select()
      .from(organizationMemberships)
      .where(eq(organizationMemberships.userId, userId))
      .limit(1);
      
    if (!membership) {
      return res.status(403).json({ 
        error: 'ORGANIZATION_REQUIRED',
        message: 'User must belong to an organization'
      });
    }
    
    const organizationId = membership.organizationId;

    const documents = await DocumentsService.getDocumentsForPatient(patientId, userId, organizationId);
    
    res.json({
      success: true,
      data: documents,
      count: documents.length
    });
  } catch (error) {
    console.error('Error fetching patient documents:', error);
    res.status(500).json({ 
      error: 'DOCUMENTS_FETCH_FAILED',
      message: error instanceof Error ? error.message : 'Failed to fetch documents'
    });
  }
});

/**
 * GET /api/documents/:id/pdf
 * Generate and download a PDF version of a document
 * NOTE: This must come BEFORE /:id route to avoid matching conflicts
 */
router.get('/:id/pdf', 
  rateLimits.files,
  authenticateToken,
  rbac.requireTherapistOrAbove,
  auditMiddleware.auditPHIAccess('READ', 'DOCUMENT', { trackFields: true, requireAuthorization: true }),
  async (req, res) => {
  const startTime = Date.now();
  const documentId = parseInt(req.params.id);
  
  try {
    console.log(`[PDF-DOWNLOAD] Request received - Document ID: ${documentId}`);
    
    // Check authentication
    const userId = req.user?.id;
    if (!userId) {
      console.log(`[PDF-DOWNLOAD] Authentication failed - No user ID in request`);
      return res.status(401).json({ 
        error: 'AUTHENTICATION_REQUIRED',
        message: 'User not authenticated. Please log in and try again.' 
      });
    }
    
    console.log(`[PDF-DOWNLOAD] Authenticated user: ${userId}`);

    // Validate document ID
    if (isNaN(documentId)) {
      console.log(`[PDF-DOWNLOAD] Invalid document ID: ${req.params.id}`);
      return res.status(400).json({ 
        error: 'INVALID_DOCUMENT_ID',
        message: 'Invalid document ID provided' 
      });
    }

    // Get user's organization from membership
    console.log(`[PDF-DOWNLOAD] Fetching organization membership for user ${userId}`);
    const [membership] = await db
      .select()
      .from(organizationMemberships)
      .where(eq(organizationMemberships.userId, userId))
      .limit(1);
      
    if (!membership) {
      console.log(`[PDF-DOWNLOAD] No organization membership found for user ${userId}`);
      return res.status(403).json({ 
        error: 'ORGANIZATION_REQUIRED',
        message: 'User must belong to an organization to download documents'
      });
    }
    
    console.log(`[PDF-DOWNLOAD] User ${userId} belongs to organization ${membership.organizationId}`);

    // Fetch the document with decrypted content
    console.log(`[PDF-DOWNLOAD] Fetching document ${documentId} for user ${userId}`);
    const document = await DocumentsService.getDocument(documentId, userId, membership.organizationId);
    
    if (!document) {
      console.log(`[PDF-DOWNLOAD] Document ${documentId} not found or access denied for user ${userId}`);
      return res.status(404).json({ 
        error: 'DOCUMENT_NOT_FOUND',
        message: 'The requested document could not be found or you do not have access to it' 
      });
    }
    
    console.log(`[PDF-DOWNLOAD] Document found: "${document.title}" (ID: ${documentId})`);

    // Get therapist and organization data for template placeholders
    console.log(`[PDF-DOWNLOAD] Fetching therapist profile and organization data`);
    const [therapistProfile] = await db
      .select()
      .from(therapistProfiles)
      .where(eq(therapistProfiles.userId, userId))
      .limit(1);
      
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, membership.organizationId))
      .limit(1);

    // Prepare content - replace ALL Handlebars placeholders to avoid html-pdf-node errors
    let htmlContent = document.content || '<html><body><h1>No content available</h1></body></html>';
    
    // Replace common template placeholders with actual data
    const therapistName = therapistProfile?.name || 'N/A';
    const practiceName = organization?.name || 'N/A';
    
    console.log(`[PDF-DOWNLOAD] Replacing placeholders: therapist="${therapistName}", practice="${practiceName}"`);
    
    // Replace known Handlebars placeholders with actual values
    htmlContent = htmlContent
      .replace(/\{\{therapist_name\}\}/g, therapistName)
      .replace(/\{\{practice_name\}\}/g, practiceName)
      .replace(/\{\{patient_name\}\}/g, document.patientName || 'N/A')
      .replace(/\{\{date\}\}/g, new Date().toLocaleDateString());
    
    // Replace any remaining Handlebars placeholders with blank or default values
    // This prevents html-pdf-node from trying to process them and crashing
    htmlContent = htmlContent
      .replace(/\{\{session_fee\}\}/g, '[Fee to be determined]')
      .replace(/\{\{insurance_information\}\}/g, '[Insurance details to be provided]')
      .replace(/\{\{cancellation_fee\}\}/g, '[Per policy]')
      // Remove any other remaining Handlebars placeholders with a generic replacement
      .replace(/\{\{[^}]+\}\}/g, '__________');
    
    // Generate PDF from HTML content using html-pdf-node
    console.log(`[PDF-DOWNLOAD] Starting PDF generation for document ${documentId}`);
    const htmlPdf = await import('html-pdf-node');
    
    const options = {
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      }
    };
    
    const file = { content: htmlContent };
    
    // Generate PDF buffer (html-pdf-node uses callbacks, so we wrap in a Promise)
    let pdfBuffer: Buffer;
    try {
      pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
        try {
          htmlPdf.generatePdf(file, options, (err: Error, buffer: Buffer) => {
            if (err) {
              console.error(`[PDF-DOWNLOAD] PDF generation callback error for document ${documentId}:`, err);
              reject(new Error(`PDF generation failed: ${err.message}`));
            } else if (!buffer) {
              console.error(`[PDF-DOWNLOAD] PDF generation returned empty buffer for document ${documentId}`);
              reject(new Error('PDF generation returned empty buffer'));
            } else {
              console.log(`[PDF-DOWNLOAD] PDF generated successfully (${buffer.length} bytes)`);
              resolve(buffer);
            }
          });
        } catch (syncError) {
          console.error(`[PDF-DOWNLOAD] Synchronous error in generatePdf for document ${documentId}:`, syncError);
          reject(syncError);
        }
      });
    } catch (pdfError) {
      console.error(`[PDF-DOWNLOAD] Failed to generate PDF for document ${documentId}:`, pdfError);
      throw new Error(`PDF generation failed: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}`);
    }
    
    // Set appropriate headers for PDF download
    const sanitizedTitle = document.title.replace(/[^a-zA-Z0-9]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizedTitle}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    // Send the PDF
    const duration = Date.now() - startTime;
    console.log(`[PDF-DOWNLOAD] Success - Document ${documentId} sent to user ${userId} (${duration}ms, ${pdfBuffer.length} bytes)`);
    res.send(pdfBuffer);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[PDF-DOWNLOAD] Error generating document PDF (${duration}ms):`, {
      documentId,
      userId: req.user?.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    res.status(500).json({ 
      error: 'PDF_GENERATION_FAILED',
      message: error instanceof Error ? error.message : 'Failed to generate PDF. Please try again or contact support.'
    });
  }
});

/**
 * GET /api/documents/:id
 * Get a specific document by ID
 */
router.get('/:id', 
  rateLimits.sensitivePHI,
  authenticateToken,
  rbac.requireTherapistOrAbove,
  auditMiddleware.auditPHIAccess('READ', 'DOCUMENT', { trackFields: true, requireAuthorization: true }),
  async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    // Get user's organization from membership
    const [membership] = await db
      .select()
      .from(organizationMemberships)
      .where(eq(organizationMemberships.userId, userId))
      .limit(1);
      
    if (!membership) {
      return res.status(403).json({ 
        error: 'ORGANIZATION_REQUIRED',
        message: 'User must belong to an organization'
      });
    }

    const document = await DocumentsService.getDocument(documentId, userId, membership.organizationId);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({
      success: true,
      data: document
    });
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ 
      error: 'DOCUMENT_FETCH_FAILED',
      message: error instanceof Error ? error.message : 'Failed to fetch document'
    });
  }
});

/**
 * POST /api/documents
 * Create a new document
 */
router.post('/', 
  rateLimits.criticalPHI,
  authenticateToken,
  rbac.requireTherapistOrAbove,
  auditMiddleware.auditPHIAccess('CREATE', 'DOCUMENT', { trackFields: true, requireAuthorization: true }),
  validateRequest(createDocumentSchema), 
  async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get user's organization from membership
    const [membership] = await db
      .select()
      .from(organizationMemberships)
      .where(eq(organizationMemberships.userId, userId))
      .limit(1);
      
    if (!membership) {
      return res.status(403).json({ 
        error: 'ORGANIZATION_REQUIRED',
        message: 'User must belong to an organization to create documents'
      });
    }

    const documentData = {
      ...req.body,
      organizationId: membership.organizationId,
      createdBy: userId,
    };

    const document = await DocumentsService.createDocument(documentData, userId);
    
    res.status(201).json({
      success: true,
      data: document
    });
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ 
      error: 'DOCUMENT_CREATE_FAILED',
      message: error instanceof Error ? error.message : 'Failed to create document'
    });
  }
});

/**
 * PUT /api/documents/:id
 * Update an existing document
 */
router.put('/:id', 
  rateLimits.criticalPHI,
  authenticateToken,
  rbac.requireTherapistOrAbove,
  auditMiddleware.auditPHIAccess('UPDATE', 'DOCUMENT', { trackFields: true, requireAuthorization: true }),
  validateRequest(updateDocumentSchema), 
  async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    // Get user's organization from membership
    const [membership] = await db
      .select()
      .from(organizationMemberships)
      .where(eq(organizationMemberships.userId, userId))
      .limit(1);
      
    if (!membership) {
      return res.status(403).json({ 
        error: 'ORGANIZATION_REQUIRED',
        message: 'User must belong to an organization'
      });
    }

    const document = await DocumentsService.updateDocument(documentId, req.body, userId, membership.organizationId);
    
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({
      success: true,
      data: document
    });
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ 
      error: 'DOCUMENT_UPDATE_FAILED',
      message: error instanceof Error ? error.message : 'Failed to update document'
    });
  }
});

/**
 * POST /api/documents/:id/upload
 * Upload a file attachment for a document
 */
router.post('/:id/upload', 
  rateLimits.files,
  authenticateToken,
  rbac.requireTherapistOrAbove,
  auditMiddleware.auditPHIAccess('UPDATE', 'DOCUMENT', { trackFields: true, requireAuthorization: true }),
  upload.single('file'), 
  async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ 
        error: 'NO_FILE',
        message: 'No file uploaded' 
      });
    }

    // Get user's organization from membership
    const [membership] = await db
      .select()
      .from(organizationMemberships)
      .where(eq(organizationMemberships.userId, userId))
      .limit(1);
      
    if (!membership) {
      return res.status(403).json({ 
        error: 'ORGANIZATION_REQUIRED',
        message: 'User must belong to an organization'
      });
    }

    // Verify document exists and user has access
    const document = await DocumentsService.getDocument(documentId, userId, membership.organizationId);
    if (!document) {
      // Clean up temp file
      try {
        fs.unlinkSync(file.path);
      } catch {}
      return res.status(404).json({ error: 'Document not found' });
    }

    // Store file in cloud storage (encrypted)
    const storageKey = `documents/${membership.organizationId}/${documentId}/${file.filename}`;
    const result = await storeFile(file.path, storageKey, {
      encrypt: true,
      mimeType: file.mimetype,
      metadata: {
        documentId: documentId.toString(),
        organizationId: membership.organizationId.toString(),
        originalName: file.originalname,
      },
    });

    if (!result.success) {
      return res.status(500).json({ 
        error: 'UPLOAD_FAILED',
        message: result.error || 'Failed to store file'
      });
    }

    // Update document with file reference
    const updatedDoc = await DocumentsService.updateDocument(
      documentId,
      {
        fileUrl: result.metadata?.key,
        fileName: file.originalname,
        fileMimeType: file.mimetype,
      },
      userId,
      membership.organizationId
    );

    res.json({
      success: true,
      data: updatedDoc,
      message: 'File uploaded successfully',
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    
    // Clean up temp file if it exists
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {}
    }
    
    res.status(500).json({ 
      error: 'UPLOAD_FAILED',
      message: error instanceof Error ? error.message : 'Failed to upload file'
    });
  }
});

/**
 * GET /api/documents/:id/download
 * Download a document's file attachment
 */
router.get('/:id/download', 
  rateLimits.files,
  authenticateToken,
  rbac.requireTherapistOrAbove,
  auditMiddleware.auditPHIAccess('READ', 'DOCUMENT', { trackFields: true, requireAuthorization: true }),
  async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    // Get user's organization from membership
    const [membership] = await db
      .select()
      .from(organizationMemberships)
      .where(eq(organizationMemberships.userId, userId))
      .limit(1);
      
    if (!membership) {
      return res.status(403).json({ 
        error: 'ORGANIZATION_REQUIRED',
        message: 'User must belong to an organization'
      });
    }

    // Get document and verify access
    const document = await DocumentsService.getDocument(documentId, userId, membership.organizationId);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (!document.fileUrl) {
      return res.status(404).json({ 
        error: 'NO_FILE',
        message: 'Document has no file attachment' 
      });
    }

    // Retrieve file from storage (automatically decrypted)
    const result = await retrieveFile(document.fileUrl, { decrypt: true });

    if (!result.success || !result.data) {
      return res.status(404).json({ 
        error: 'FILE_NOT_FOUND',
        message: result.error || 'File not found in storage'
      });
    }

    // Set appropriate headers for download
    const filename = document.fileName || 'download';
    const mimeType = document.fileMimeType || 'application/octet-stream';
    
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', result.data.length);
    
    res.send(result.data);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ 
      error: 'DOWNLOAD_FAILED',
      message: error instanceof Error ? error.message : 'Failed to download file'
    });
  }
});

/**
 * DELETE /api/documents/:id
 * Delete a document
 */
router.delete('/:id', 
  rateLimits.sensitivePHI,
  authenticateToken,
  rbac.requireTherapistOrAbove,
  auditMiddleware.auditPHIAccess('DELETE', 'DOCUMENT', { trackFields: true, requireAuthorization: true }),
  async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      return res.status(400).json({ error: 'Invalid document ID' });
    }

    // Get user's organization from membership
    const [membership] = await db
      .select()
      .from(organizationMemberships)
      .where(eq(organizationMemberships.userId, userId))
      .limit(1);
      
    if (!membership) {
      return res.status(403).json({ 
        error: 'ORGANIZATION_REQUIRED',
        message: 'User must belong to an organization'
      });
    }

    // Get document to check for attached file
    const document = await DocumentsService.getDocument(documentId, userId, membership.organizationId);
    
    if (document && document.fileUrl) {
      // Delete attached file from storage
      await deleteFile(document.fileUrl);
    }

    await DocumentsService.deleteDocument(documentId, userId, membership.organizationId);
    
    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ 
      error: 'DOCUMENT_DELETE_FAILED',
      message: error instanceof Error ? error.message : 'Failed to delete document'
    });
  }
});

export default router;

