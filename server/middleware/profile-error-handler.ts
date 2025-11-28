// Enhanced error handling middleware for profile operations
import { Request, Response, NextFunction } from 'express';

export interface ProfileError extends Error {
  code?: string;
  constraint?: string;
  detail?: string;
  table?: string;
  column?: string;
}

export const profileErrorHandler = (err: ProfileError, req: Request, res: Response, next: NextFunction) => {
  console.error('[PROFILE-ERROR]', {
    userId: req.user?.id,
    endpoint: req.path,
    method: req.method,
    error: err.message,
    code: err.code,
    constraint: err.constraint,
    detail: err.detail
  });

  // Database constraint violations
  if (err.code === '23505') {
    const field = extractFieldFromError(err);
    return res.status(409).json({
      error: 'DUPLICATE_VALUE',
      message: `The ${field} you entered is already in use. Please choose a different value.`,
      field
    });
  }

  // Not null constraint violations
  if (err.code === '23502') {
    const field = extractFieldFromError(err);
    return res.status(400).json({
      error: 'REQUIRED_FIELD',
      message: `${field} is required and cannot be empty.`,
      field
    });
  }

  // Check constraint violations
  if (err.code === '23514') {
    const field = extractFieldFromError(err);
    return res.status(400).json({
      error: 'CONSTRAINT_VIOLATION',
      message: `The value for ${field} violates database constraints. Please check the format and try again.`,
      field
    });
  }

  // Invalid text representation (type conversion errors)
  if (err.code === '22P02') {
    const field = extractFieldFromError(err);
    return res.status(400).json({
      error: 'INVALID_FORMAT',
      message: `The format of ${field} is invalid. Please check your input and try again.`,
      field
    });
  }

  // String data right truncation
  if (err.code === '22001') {
    const field = extractFieldFromError(err);
    return res.status(400).json({
      error: 'VALUE_TOO_LONG',
      message: `The ${field} value is too long. Please shorten it and try again.`,
      field
    });
  }

  // Numeric value out of range
  if (err.code === '22003') {
    const field = extractFieldFromError(err);
    return res.status(400).json({
      error: 'VALUE_OUT_OF_RANGE',
      message: `The ${field} value is out of the acceptable range.`,
      field
    });
  }

  // Connection errors
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
    return res.status(503).json({
      error: 'DATABASE_UNAVAILABLE',
      message: 'Database temporarily unavailable. Please try again in a moment.'
    });
  }

  // Generic database error
  if (err.code && err.code.startsWith('22') || err.code.startsWith('23')) {
    return res.status(400).json({
      error: 'DATABASE_ERROR',
      message: 'There was an issue processing your request. Please check your input and try again.'
    });
  }

  // Validation errors from Zod or custom validation
  if (err.message.includes('validation') || err.message.includes('Invalid')) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: err.message,
      details: [{
        field: "unknown",
        message: err.message,
        code: "validation_error"
      }]
    });
  }

  // Default server error
  return res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred. Please try again or contact support if the problem persists.'
  });
};

function extractFieldFromError(err: ProfileError): string {
  // Try to extract field name from various error properties
  if (err.constraint) {
    // Extract from constraint name (e.g., "users_email_unique" -> "email")
    const match = err.constraint.match(/users_(\w+)_/);
    if (match) return formatFieldName(match[1]);
  }

  if (err.column) {
    return formatFieldName(err.column);
  }

  if (err.detail) {
    // Extract from detail message (e.g., "Key (email)=(test@test.com) already exists")
    const match = err.detail.match(/Key \((\w+)\)/);
    if (match) return formatFieldName(match[1]);
  }

  if (err.message) {
    // Extract from error message
    const commonFields = [
      'email', 'phone', 'personalphone', 'personalemail', 'name', 'title', 
      'license', 'ssn', 'npi_number', 'ein', 'address', 'city', 'state', 
      'zipcode', 'specialties', 'languages', 'sessionformat', 'baserate',
      'default_note_format', 'session_duration', 'time_zone'
    ];
    
    for (const field of commonFields) {
      if (err.message.toLowerCase().includes(field)) {
        return formatFieldName(field);
      }
    }
  }

  return 'field';
}

function formatFieldName(dbFieldName: string): string {
  // Convert database field names to user-friendly names
  const fieldMap: Record<string, string> = {
    'personalphone': 'personal phone',
    'personalemail': 'personal email',
    'zipcode': 'zip code',
    'yearsofexperience': 'years of experience',
    'sessionformat': 'session format',
    'baserate': 'base rate',
    'slidingscale': 'sliding scale',
    'therapistidentities': 'therapist identities',
    'npi_number': 'NPI number',
    'taxonomy_code': 'taxonomy code',
    'legal_business_name': 'legal business name',
    'business_physical_address': 'business address',
    'default_note_format': 'default note format',
    'session_duration': 'session duration',
    'time_zone': 'time zone',
    'date_of_birth': 'date of birth',
    'birth_city': 'birth city',
    'birth_state': 'birth state',
    'birth_country': 'birth country',
    'is_us_citizen': 'US citizenship status',
    'work_permit_visa': 'work permit/visa'
  };

  return fieldMap[dbFieldName.toLowerCase()] || dbFieldName;
}