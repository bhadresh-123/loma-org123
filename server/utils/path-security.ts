import * as path from 'path';
import * as fs from 'fs';

/**
 * Path Security Utilities
 * Prevents path traversal and file inclusion attacks
 */

// Define allowed base directories for file operations
const ALLOWED_BASE_DIRS = {
  uploads: path.resolve(process.cwd(), 'uploads'),
  temp: path.resolve(process.cwd(), 'temp'),
  'cv-temp': path.resolve(process.cwd(), 'cv-temp'),
  storage: path.resolve(process.cwd(), 'storage'),
  encrypted: path.resolve(process.cwd(), 'encrypted'),
};

export type AllowedBaseDir = keyof typeof ALLOWED_BASE_DIRS;

/**
 * Validates that a file path is safe and within allowed directories
 * @param filePath The file path to validate
 * @param allowedBaseDir The base directory type that this path should be within
 * @returns The normalized, safe absolute path
 * @throws Error if path is unsafe or outside allowed directory
 */
export function validateAndNormalizePath(
  filePath: string,
  allowedBaseDir: AllowedBaseDir
): string {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('Invalid file path: path must be a non-empty string');
  }

  // Get the allowed base directory
  const baseDir = ALLOWED_BASE_DIRS[allowedBaseDir];
  if (!baseDir) {
    throw new Error(`Invalid base directory type: ${allowedBaseDir}`);
  }

  // Ensure base directory exists
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true, mode: 0o755 });
  }

  // Resolve to absolute path to prevent traversal
  const absolutePath = path.isAbsolute(filePath)
    ? path.resolve(filePath)
    : path.resolve(baseDir, filePath);

  // Normalize the path to remove any .. or . segments
  const normalizedPath = path.normalize(absolutePath);

  // Ensure the resolved path is still within the allowed base directory
  if (!normalizedPath.startsWith(baseDir + path.sep) && normalizedPath !== baseDir) {
    throw new Error(
      `Path traversal detected: ${filePath} resolves outside allowed directory ${allowedBaseDir}`
    );
  }

  // Additional security checks
  const filename = path.basename(normalizedPath);
  
  // Block null bytes (can be used to bypass extension checks in some environments)
  if (filename.includes('\0')) {
    throw new Error('Invalid filename: null bytes not allowed');
  }

  // Block files starting with . (hidden files) unless explicitly in a .well-known directory
  if (filename.startsWith('.') && !normalizedPath.includes('.well-known')) {
    throw new Error('Invalid filename: hidden files not allowed');
  }

  // Block suspicious patterns
  const suspiciousPatterns = [
    /\.\./,           // Directory traversal
    /~$/,             // Backup files
    /\.bak$/i,        // Backup files
    /\.tmp$/i,        // Temp files in wrong location
    /\.swp$/i,        // Vim swap files
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(filename)) {
      throw new Error(`Invalid filename: contains suspicious pattern ${pattern}`);
    }
  }

  return normalizedPath;
}

/**
 * Validates a user ID or other identifier used in paths
 * @param identifier The identifier to validate
 * @returns Sanitized identifier safe for use in paths
 */
export function validatePathIdentifier(identifier: string | number): string {
  const idStr = String(identifier);
  
  // Only allow alphanumeric, hyphens, and underscores
  if (!/^[a-zA-Z0-9_-]+$/.test(idStr)) {
    throw new Error('Invalid identifier: only alphanumeric characters, hyphens, and underscores allowed');
  }

  // Prevent excessively long identifiers
  if (idStr.length > 100) {
    throw new Error('Invalid identifier: too long (max 100 characters)');
  }

  return idStr;
}

/**
 * Safely joins path segments, validating each segment
 * @param baseDir The base directory type
 * @param segments Path segments to join
 * @returns Safe, validated absolute path
 */
export function safePathJoin(
  baseDir: AllowedBaseDir,
  ...segments: string[]
): string {
  const basePath = ALLOWED_BASE_DIRS[baseDir];
  
  // Validate each segment
  for (const segment of segments) {
    if (segment.includes('..') || segment.includes('\0') || path.isAbsolute(segment)) {
      throw new Error(`Invalid path segment: ${segment}`);
    }
  }

  const joinedPath = path.join(basePath, ...segments);
  return validateAndNormalizePath(joinedPath, baseDir);
}

/**
 * Checks if a file exists and is within allowed directory
 * @param filePath The file path to check
 * @param allowedBaseDir The base directory type
 * @returns true if file exists and is safe, false otherwise
 */
export function safeFileExists(
  filePath: string,
  allowedBaseDir: AllowedBaseDir
): boolean {
  try {
    const safePath = validateAndNormalizePath(filePath, allowedBaseDir);
    return fs.existsSync(safePath);
  } catch {
    return false;
  }
}

/**
 * Gets the allowed base directories (for configuration/testing)
 */
export function getAllowedBaseDirs(): Record<AllowedBaseDir, string> {
  return { ...ALLOWED_BASE_DIRS };
}

/**
 * Adds a custom allowed base directory (use with caution)
 * @param name The name for this base directory
 * @param absolutePath The absolute path to allow
 */
export function addAllowedBaseDir(name: string, absolutePath: string): void {
  if (!path.isAbsolute(absolutePath)) {
    throw new Error('Base directory must be an absolute path');
  }
  (ALLOWED_BASE_DIRS as any)[name] = path.resolve(absolutePath);
}

