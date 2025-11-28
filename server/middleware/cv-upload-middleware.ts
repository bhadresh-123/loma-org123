import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Enhanced middleware for CV uploads with better error handling and logging
export const createCVUploadMiddleware = () => {
  // Ensure upload directory exists
  const uploadDir = path.join(process.cwd(), 'uploads', 'cv-temp');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`Created CV upload directory: ${uploadDir}`);
  }

  const storage = multer.diskStorage({
    destination: function (_req, _file, cb) {
      cb(null, uploadDir);
    },
    filename: function (_req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const fileName = `cv-${uniqueSuffix}${path.extname(file.originalname)}`;
      console.log(`Generating CV upload filename: ${fileName}`);
      cb(null, fileName);
    }
  });

  const fileFilter = (_req: any, file: any, cb: any) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    const allowedExtensions = ['.pdf', '.doc', '.docx'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    console.log(`CV upload validation - File: ${file.originalname}, Type: ${file.mimetype}, Extension: ${fileExtension}`);
    
    if (allowedTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
      console.log(`CV upload accepted: ${file.originalname}`);
      cb(null, true);
    } else {
      console.log(`CV upload rejected: ${file.originalname} - Invalid type or extension`);
      cb(new Error('Invalid file type. Please upload PDF, DOC, or DOCX files only.'));
    }
  };

  return multer({
    storage,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
      files: 1
    },
    fileFilter
  });
};

// Cleanup function for temporary files
export const cleanupTempFile = (filePath: string) => {
  if (filePath && fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`Successfully cleaned up temporary CV file: ${filePath}`);
    } catch (error) {
      console.error(`Error cleaning up temporary CV file: ${filePath}`, error);
    }
  }
};