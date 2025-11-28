import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { promisify } from 'util';
import { validatePathIdentifier, safePathJoin } from '../utils/path-security';

// File type validation
const ALLOWED_MIME_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES_PER_REQUEST = 5;

// File content validation
const FILE_SIGNATURES = {
  'image/jpeg': [0xFF, 0xD8, 0xFF],
  'image/png': [0x89, 0x50, 0x4E, 0x47],
  'image/gif': [0x47, 0x49, 0x46],
  'application/pdf': [0x25, 0x50, 0x44, 0x46],
  'application/msword': [0xD0, 0xCF, 0x11, 0xE0],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [0x50, 0x4B, 0x03, 0x04]
};

// Enhanced file validation
export const validateFileType = (file: Express.Multer.File): boolean => {
  const mimeType = file.mimetype;
  const extension = path.extname(file.originalname).toLowerCase();
  
  // Check MIME type is allowed
  if (!ALLOWED_MIME_TYPES[mimeType as keyof typeof ALLOWED_MIME_TYPES]) {
    return false;
  }
  
  // Check extension matches MIME type
  const allowedExtensions = ALLOWED_MIME_TYPES[mimeType as keyof typeof ALLOWED_MIME_TYPES];
  if (!allowedExtensions.includes(extension)) {
    return false;
  }
  
  return true;
};

export const validateFileContent = async (filePath: string, expectedMimeType: string): Promise<boolean> => {
  try {
    const buffer = await fs.promises.readFile(filePath);
    const signature = FILE_SIGNATURES[expectedMimeType as keyof typeof FILE_SIGNATURES];
    
    if (!signature) {
      return true; // No signature to check
    }
    
    // Check file signature matches expected MIME type
    for (let i = 0; i < signature.length; i++) {
      if (buffer[i] !== signature[i]) {
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error validating file content:', error);
    return false;
  }
};

export const scanFileForMalware = async (filePath: string): Promise<boolean> => {
  try {
    const buffer = await fs.promises.readFile(filePath);
    
    // Check for common malware signatures
    const malwareSignatures = [
      Buffer.from('eval(', 'utf8'),
      Buffer.from('<script', 'utf8'),
      Buffer.from('javascript:', 'utf8'),
      Buffer.from('vbscript:', 'utf8'),
      Buffer.from('onload=', 'utf8'),
      Buffer.from('onerror=', 'utf8')
    ];
    
    for (const signature of malwareSignatures) {
      if (buffer.includes(signature)) {
        console.warn(`Potential malware signature detected: ${signature.toString()}`);
        return false;
      }
    }
    
    // Check for executable content in non-executable files
    const executableSignatures = [
      Buffer.from('MZ', 'utf8'), // PE executable
      Buffer.from('\x7fELF', 'utf8'), // ELF executable
      Buffer.from('#!', 'utf8') // Shell script
    ];
    
    const fileExtension = path.extname(filePath).toLowerCase();
    const isExecutableFile = ['.exe', '.bat', '.cmd', '.sh', '.ps1'].includes(fileExtension);
    
    if (!isExecutableFile) {
      for (const signature of executableSignatures) {
        if (buffer.includes(signature)) {
          console.warn(`Executable content detected in non-executable file: ${signature.toString()}`);
          return false;
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error scanning file for malware:', error);
    return false;
  }
};

// Secure file storage configuration
export const createSecureStorage = (uploadDir: string) => {
  // Ensure upload directory exists and has proper permissions
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true, mode: 0o755 });
  }
  
  return multer.diskStorage({
    destination: (req, file, cb) => {
      try {
        // Create user-specific subdirectory for better isolation
        const userId = (req as any).user?.id || 'anonymous';
        
        // Validate and sanitize the userId to prevent path traversal
        const safeUserId = validatePathIdentifier(userId);
        
        // Use safe path joining that prevents directory traversal
        const userDir = safePathJoin('uploads', safeUserId);
        
        if (!fs.existsSync(userDir)) {
          fs.mkdirSync(userDir, { recursive: true, mode: 0o755 });
        }
        
        cb(null, userDir);
      } catch (error) {
        cb(new Error(`Invalid user directory path: ${error.message}`), '');
      }
    },
    filename: (req, file, cb) => {
      // Generate secure filename with timestamp and random component
      const timestamp = Date.now();
      const randomBytes = crypto.randomBytes(16).toString('hex');
      const extension = path.extname(file.originalname);
      const sanitizedName = sanitizeFilename(file.originalname);
      
      const filename = `${timestamp}-${randomBytes}-${sanitizedName}${extension}`;
      cb(null, filename);
    }
  });
};

export const sanitizeFilename = (filename: string): string => {
  // Remove path traversal attempts and dangerous characters
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/\.\./g, '_')
    .replace(/^\./, '_')
    .substring(0, 100); // Limit length
};

// Enhanced multer configuration with security
export const createSecureUpload = (uploadDir: string) => {
  const storage = createSecureStorage(uploadDir);
  
  return multer({
    storage,
    limits: {
      fileSize: MAX_FILE_SIZE,
      files: MAX_FILES_PER_REQUEST,
      fieldSize: 1024 * 1024, // 1MB for form fields
      fieldNameSize: 100,
      fields: 10
    },
    fileFilter: (req, file, cb) => {
      // Validate file type
      if (!validateFileType(file)) {
        return cb(new Error(`File type ${file.mimetype} not allowed`));
      }
      
      // Check file size
      if (file.size && file.size > MAX_FILE_SIZE) {
        return cb(new Error(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`));
      }
      
      cb(null, true);
    }
  });
};

// Post-upload security validation middleware
export const postUploadSecurityCheck = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return next();
    }
    
    const file = req.file;
    
    // Validate file content matches MIME type
    const contentValid = await validateFileContent(file.path, file.mimetype);
    if (!contentValid) {
      // Clean up uploaded file
      await fs.promises.unlink(file.path).catch(() => {});
      return res.status(400).json({
        error: 'INVALID_FILE_CONTENT',
        message: 'File content does not match declared type'
      });
    }
    
    // Scan for malware
    const malwareScanPassed = await scanFileForMalware(file.path);
    if (!malwareScanPassed) {
      // Clean up uploaded file
      await fs.promises.unlink(file.path).catch(() => {});
      return res.status(400).json({
        error: 'MALWARE_DETECTED',
        message: 'File failed security scan'
      });
    }
    
    // Add security metadata to file object
    (req.file as any).securityValidated = true;
    (req.file as any).scanTimestamp = new Date().toISOString();
    
    next();
  } catch (error) {
    console.error('Post-upload security check failed:', error);
    
    // Clean up uploaded file if it exists
    if (req.file?.path) {
      await fs.promises.unlink(req.file.path).catch(() => {});
    }
    
    return res.status(500).json({
      error: 'SECURITY_CHECK_FAILED',
      message: 'File security validation failed'
    });
  }
};

// Cleanup middleware to remove temporary files
export const cleanupUploadedFiles = async (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Clean up uploaded files after response is sent
    if (req.file?.path) {
      fs.promises.unlink(req.file.path).catch(() => {});
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

// File access control middleware
export const validateFileAccess = (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user?.id;
  const fileId = req.params.id || req.params.fileId;
  
  if (!userId) {
    return res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authentication required'
    });
  }
  
  // This would integrate with your database to check file ownership
  // For now, we'll add the user context to the request
  (req as any).fileAccessUserId = userId;
  
  next();
};

// Rate limiting for file uploads
export const uploadRateLimit = (req: Request, res: Response, next: NextFunction) => {
  const userId = (req as any).user?.id || req.ip;
  
  // This would integrate with your existing rate limiting system
  // For now, we'll implement basic rate limiting
  const uploadsPerMinute = 5;
  const uploadsPerHour = 50;
  
  // Store upload timestamps in memory (in production, use Redis)
  if (!global.uploadTimestamps) {
    global.uploadTimestamps = new Map();
  }
  
  const now = Date.now();
  const userUploads = global.uploadTimestamps.get(userId) || [];
  
  // Clean old timestamps
  const recentUploads = userUploads.filter(timestamp => now - timestamp < 60 * 60 * 1000); // Last hour
  
  // Check rate limits
  const uploadsLastMinute = recentUploads.filter(timestamp => now - timestamp < 60 * 1000).length;
  const uploadsLastHour = recentUploads.length;
  
  if (uploadsLastMinute >= uploadsPerMinute) {
    return res.status(429).json({
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many uploads per minute'
    });
  }
  
  if (uploadsLastHour >= uploadsPerHour) {
    return res.status(429).json({
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many uploads per hour'
    });
  }
  
  // Add current upload timestamp
  recentUploads.push(now);
  global.uploadTimestamps.set(userId, recentUploads);
  
  next();
};

// Declare global type for upload timestamps
declare global {
  var uploadTimestamps: Map<string, number[]> | undefined;
}
