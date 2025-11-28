import { Router } from 'express';
import { authenticateToken } from '../auth-simple';
import { db } from '../../db';
import { eq, and } from 'drizzle-orm';
import { cvParserEducation, cvParserWorkExperience } from '@db/schema';
import multer from 'multer';
import { unlink } from 'fs/promises';
import { parseCVFile } from '../utils/cv-parser';
import path from 'path';

const router = Router();

// Configure multer for CV file uploads - use absolute path
const uploadDir = path.join(process.cwd(), 'cv-temp');
const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    // Accept PDF, DOC, DOCX
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, and DOCX files are allowed.'));
    }
  }
});

/**
 * GET /api/cv-parser/data
 * Get all parsed CV data for the authenticated user
 */
router.get('/data', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    
    // Fetch education records
    const education = await db
      .select()
      .from(cvParserEducation)
      .where(eq(cvParserEducation.userId, userId))
      .orderBy(cvParserEducation.startDate);
    
    // Fetch work experience records
    const workExperience = await db
      .select()
      .from(cvParserWorkExperience)
      .where(eq(cvParserWorkExperience.userId, userId))
      .orderBy(cvParserWorkExperience.startDate);
    
    // Transform timestamps to strings for frontend
    const transformedEducation = education.map(edu => ({
      ...edu,
      startDate: edu.startDate?.toISOString() || null,
      endDate: edu.endDate?.toISOString() || null,
      graduationDate: edu.graduationDate?.toISOString() || null,
    }));
    
    const transformedWorkExperience = workExperience.map(work => ({
      ...work,
      startDate: work.startDate?.toISOString() || null,
      endDate: work.endDate?.toISOString() || null,
    }));
    
    res.json({
      hasParsedData: education.length > 0 || workExperience.length > 0,
      education: transformedEducation,
      workExperience: transformedWorkExperience
    });
  } catch (error) {
    console.error('Error fetching CV parser data:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Failed to fetch CV data'
    });
  }
});

/**
 * POST /api/cv-parser/parse
 * Parse an uploaded CV file and extract education/work experience
 */
router.post('/parse', authenticateToken, upload.single('cv'), async (req, res) => {
  let filePath: string | undefined;
  
  try {
    const userId = req.user!.id;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({
        error: 'BAD_REQUEST',
        message: 'No file uploaded'
      });
    }
    
    filePath = file.path;
    
    // Use the utility function to parse the CV file
    console.log(`Parsing CV file: ${file.originalname}, type: ${file.mimetype}`);
    const parsedData = await parseCVFile(file.path, file.mimetype);
    
    // Store education records
    const insertedEducation = [];
    for (const edu of parsedData.education) {
      const [inserted] = await db
        .insert(cvParserEducation)
        .values({
          userId,
          university: edu.university || 'Unknown University',
          degree: edu.degree || 'Unknown Degree',
          major: edu.major || 'Unknown Major',
          startDate: edu.startDate ? new Date(edu.startDate) : null,
          endDate: edu.endDate ? new Date(edu.endDate) : null,
          graduationDate: edu.graduationDate ? new Date(edu.graduationDate) : null,
          gpa: edu.gpa || null,
          honors: edu.honors || null,
          isVerified: false
        })
        .returning();
      
      insertedEducation.push(inserted);
    }
    
    // Store work experience records
    const insertedWorkExperience = [];
    for (const work of parsedData.workExperience) {
      const [inserted] = await db
        .insert(cvParserWorkExperience)
        .values({
          userId,
          organization: work.organization || 'Unknown Organization',
          position: work.position || 'Unknown Position',
          location: work.location || null,
          startDate: work.startDate ? new Date(work.startDate) : null,
          endDate: work.endDate ? new Date(work.endDate) : null,
          isCurrent: work.isCurrent || false,
          description: work.description || null,
          responsibilities: work.responsibilities || [],
          achievements: work.achievements || [],
          isVerified: false
        })
        .returning();
      
      insertedWorkExperience.push(inserted);
    }
    
    res.json({
      success: true,
      message: 'CV parsed successfully',
      data: {
        educationCount: insertedEducation.length,
        workExperienceCount: insertedWorkExperience.length
      }
    });
    
  } catch (error) {
    console.error('Error parsing CV:', error);
    
    // Provide user-friendly error messages
    let errorMessage = 'Failed to parse CV';
    if (error instanceof Error) {
      if (error.message.includes('extract text from PDF')) {
        errorMessage = 'Unable to extract text from PDF. The file may be image-based, corrupted, or use an unsupported format. Please try converting to DOCX or ensure the PDF contains selectable text.';
      } else if (error.message.includes('AI parsing failed')) {
        errorMessage = 'AI parsing failed. The extracted text may be incomplete or the Anthropic API key is invalid. Please check your API configuration.';
      } else if (error.message.includes('ANTHROPIC_API_KEY')) {
        errorMessage = 'Anthropic API key is not configured. Please set the ANTHROPIC_API_KEY environment variable.';
      } else {
        errorMessage = error.message;
      }
    }
    
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: errorMessage
    });
  } finally {
    // Clean up uploaded file
    if (filePath) {
      try {
        await unlink(filePath);
      } catch (err) {
        console.error('Error deleting uploaded file:', err);
      }
    }
  }
});

/**
 * PUT /api/cv-parser/education/:id
 * Update an education entry
 */
router.put('/education/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        error: 'BAD_REQUEST',
        message: 'Invalid education ID'
      });
    }
    
    // Verify ownership
    const [existing] = await db
      .select()
      .from(cvParserEducation)
      .where(and(
        eq(cvParserEducation.id, id),
        eq(cvParserEducation.userId, userId)
      ))
      .limit(1);
    
    if (!existing) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Education entry not found'
      });
    }
    
    // Update the record
    const [updated] = await db
      .update(cvParserEducation)
      .set({
        university: req.body.university || existing.university,
        degree: req.body.degree || existing.degree,
        major: req.body.major || existing.major,
        startDate: req.body.startDate ? new Date(req.body.startDate) : existing.startDate,
        endDate: req.body.endDate ? new Date(req.body.endDate) : existing.endDate,
        graduationDate: req.body.graduationDate ? new Date(req.body.graduationDate) : existing.graduationDate,
        gpa: req.body.gpa !== undefined ? req.body.gpa : existing.gpa,
        honors: req.body.honors !== undefined ? req.body.honors : existing.honors,
        isVerified: req.body.isVerified !== undefined ? req.body.isVerified : existing.isVerified,
        updatedAt: new Date()
      })
      .where(eq(cvParserEducation.id, id))
      .returning();
    
    res.json({
      success: true,
      data: {
        ...updated,
        startDate: updated.startDate?.toISOString() || null,
        endDate: updated.endDate?.toISOString() || null,
        graduationDate: updated.graduationDate?.toISOString() || null,
      }
    });
    
  } catch (error) {
    console.error('Error updating education:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Failed to update education entry'
    });
  }
});

/**
 * DELETE /api/cv-parser/education/:id
 * Delete an education entry
 */
router.delete('/education/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        error: 'BAD_REQUEST',
        message: 'Invalid education ID'
      });
    }
    
    // Delete the record (will fail if not owned by user due to WHERE clause)
    const deleted = await db
      .delete(cvParserEducation)
      .where(and(
        eq(cvParserEducation.id, id),
        eq(cvParserEducation.userId, userId)
      ))
      .returning();
    
    if (deleted.length === 0) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Education entry not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Education entry deleted'
    });
    
  } catch (error) {
    console.error('Error deleting education:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Failed to delete education entry'
    });
  }
});

/**
 * PUT /api/cv-parser/work-experience/:id
 * Update a work experience entry
 */
router.put('/work-experience/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        error: 'BAD_REQUEST',
        message: 'Invalid work experience ID'
      });
    }
    
    // Verify ownership
    const [existing] = await db
      .select()
      .from(cvParserWorkExperience)
      .where(and(
        eq(cvParserWorkExperience.id, id),
        eq(cvParserWorkExperience.userId, userId)
      ))
      .limit(1);
    
    if (!existing) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Work experience entry not found'
      });
    }
    
    // Update the record
    const [updated] = await db
      .update(cvParserWorkExperience)
      .set({
        organization: req.body.organization || existing.organization,
        position: req.body.position || existing.position,
        location: req.body.location !== undefined ? req.body.location : existing.location,
        startDate: req.body.startDate ? new Date(req.body.startDate) : existing.startDate,
        endDate: req.body.endDate ? new Date(req.body.endDate) : existing.endDate,
        isCurrent: req.body.isCurrent !== undefined ? req.body.isCurrent : existing.isCurrent,
        description: req.body.description !== undefined ? req.body.description : existing.description,
        responsibilities: req.body.responsibilities !== undefined ? req.body.responsibilities : existing.responsibilities,
        achievements: req.body.achievements !== undefined ? req.body.achievements : existing.achievements,
        isVerified: req.body.isVerified !== undefined ? req.body.isVerified : existing.isVerified,
        updatedAt: new Date()
      })
      .where(eq(cvParserWorkExperience.id, id))
      .returning();
    
    res.json({
      success: true,
      data: {
        ...updated,
        startDate: updated.startDate?.toISOString() || null,
        endDate: updated.endDate?.toISOString() || null,
      }
    });
    
  } catch (error) {
    console.error('Error updating work experience:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Failed to update work experience entry'
    });
  }
});

/**
 * DELETE /api/cv-parser/work-experience/:id
 * Delete a work experience entry
 */
router.delete('/work-experience/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        error: 'BAD_REQUEST',
        message: 'Invalid work experience ID'
      });
    }
    
    // Delete the record (will fail if not owned by user due to WHERE clause)
    const deleted = await db
      .delete(cvParserWorkExperience)
      .where(and(
        eq(cvParserWorkExperience.id, id),
        eq(cvParserWorkExperience.userId, userId)
      ))
      .returning();
    
    if (deleted.length === 0) {
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Work experience entry not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Work experience entry deleted'
    });
    
  } catch (error) {
    console.error('Error deleting work experience:', error);
    res.status(500).json({
      error: 'SERVER_ERROR',
      message: 'Failed to delete work experience entry'
    });
  }
});

export default router;

