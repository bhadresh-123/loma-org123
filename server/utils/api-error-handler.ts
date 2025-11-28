// Comprehensive API error handling system for Phase 2.5
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    correlationId: string;
    retryable: boolean;
    suggestions?: string[];
  };
}

export interface RequestContext {
  method: string;
  url: string;
  userId?: number;
  userAgent?: string;
  ip?: string;
  correlationId: string;
}

export enum ErrorCode {
  // Database errors
  DATABASE_CONNECTION_FAILED = 'DATABASE_CONNECTION_FAILED',
  DATABASE_TRANSACTION_FAILED = 'DATABASE_TRANSACTION_FAILED',
  DATABASE_CONSTRAINT_VIOLATION = 'DATABASE_CONSTRAINT_VIOLATION',
  
  // Authentication errors
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  AUTH_INVALID_TOKEN = 'AUTH_INVALID_TOKEN',
  AUTH_EXPIRED = 'AUTH_EXPIRED',
  
  // Validation errors
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Business logic errors
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  OPERATION_NOT_PERMITTED = 'OPERATION_NOT_PERMITTED',
  
  // System errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED'
}

export interface ErrorClassification {
  code: ErrorCode;
  httpStatus: number;
  retryable: boolean;
  userMessage: string;
  suggestions: string[];
}

export class APIErrorHandler {
  private static errorClassifications: Map<string, ErrorClassification> = new Map([
    // Database errors
    ['ECONNREFUSED', {
      code: ErrorCode.DATABASE_CONNECTION_FAILED,
      httpStatus: 503,
      retryable: true,
      userMessage: 'Database connection temporarily unavailable',
      suggestions: ['Please try again in a few moments', 'Contact support if the issue persists']
    }],
    ['SERIALIZATION_FAILURE', {
      code: ErrorCode.DATABASE_TRANSACTION_FAILED,
      httpStatus: 409,
      retryable: true,
      userMessage: 'Data update conflict detected',
      suggestions: ['Please refresh the page and try again', 'Another user may be editing the same data']
    }],
    ['FOREIGN_KEY_VIOLATION', {
      code: ErrorCode.DATABASE_CONSTRAINT_VIOLATION,
      httpStatus: 400,
      retryable: false,
      userMessage: 'Data integrity constraint violated',
      suggestions: ['Please check your input data', 'Ensure all required relationships exist']
    }],
    
    // Authentication errors
    ['AUTH_REQUIRED', {
      code: ErrorCode.AUTH_REQUIRED,
      httpStatus: 401,
      retryable: false,
      userMessage: 'Authentication required',
      suggestions: ['Please log in to continue', 'Check if your session has expired']
    }],
    
    // Validation errors
    ['ZodError', {
      code: ErrorCode.VALIDATION_FAILED,
      httpStatus: 400,
      retryable: false,
      userMessage: 'Input validation failed',
      suggestions: ['Please check your input data format', 'Ensure all required fields are provided']
    }]
  ]);

  static handleError(error: Error, req: Request): APIResponse<null> {
    const correlationId = this.generateCorrelationId();
    const context = this.extractRequestContext(req, correlationId);
    
    // Log the error with full context
    this.logError(error, context);
    
    // Classify the error
    const classification = this.classifyError(error);
    
    return {
      success: false,
      error: {
        code: classification.code,
        message: classification.userMessage,
        correlationId,
        retryable: classification.retryable,
        suggestions: classification.suggestions
      }
    };
  }

  static classifyError(error: Error): ErrorClassification {
    // Check for known error patterns
    const errorKey = this.getErrorKey(error);
    const classification = this.errorClassifications.get(errorKey);
    
    if (classification) {
      return classification;
    }
    
    // Check for database-related errors
    if (this.isDatabaseError(error)) {
      return {
        code: ErrorCode.DATABASE_CONNECTION_FAILED,
        httpStatus: 503,
        retryable: true,
        userMessage: 'Database service temporarily unavailable',
        suggestions: ['Please try again in a few moments']
      };
    }
    
    // Check for authentication errors
    if (this.isAuthError(error)) {
      return {
        code: ErrorCode.AUTH_REQUIRED,
        httpStatus: 401,
        retryable: false,
        userMessage: 'Authentication required',
        suggestions: ['Please log in to continue']
      };
    }
    
    // Default to internal server error
    return {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      httpStatus: 500,
      retryable: false,
      userMessage: 'An unexpected error occurred',
      suggestions: ['Please try again later', 'Contact support if the issue persists']
    };
  }

  static generateCorrelationId(): string {
    return uuidv4();
  }

  static extractRequestContext(req: Request, correlationId: string): RequestContext {
    return {
      method: req.method,
      url: req.url,
      userId: (req as any).user?.id,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      correlationId
    };
  }

  static logError(error: Error, context: RequestContext): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: 'ERROR',
      correlationId: context.correlationId,
      context,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    };
    
    console.error('[API_ERROR]', JSON.stringify(logEntry, null, 2));
  }

  private static getErrorKey(error: Error): string {
    // Check for specific error types
    if (error.name === 'ZodError') return 'ZodError';
    if (error.message.includes('AUTH_REQUIRED')) return 'AUTH_REQUIRED';
    if (error.message.includes('ECONNREFUSED')) return 'ECONNREFUSED';
    if (error.message.includes('SERIALIZATION_FAILURE')) return 'SERIALIZATION_FAILURE';
    if (error.message.includes('foreign key')) return 'FOREIGN_KEY_VIOLATION';
    
    return error.name || 'UnknownError';
  }

  private static isDatabaseError(error: Error): boolean {
    const dbErrorPatterns = [
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
      'connection',
      'database',
      'query',
      'transaction'
    ];
    
    return dbErrorPatterns.some(pattern => 
      error.message.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  private static isAuthError(error: Error): boolean {
    const authErrorPatterns = [
      'AUTH_REQUIRED',
      'unauthorized',
      'authentication',
      'token',
      'session'
    ];
    
    return authErrorPatterns.some(pattern => 
      error.message.toLowerCase().includes(pattern.toLowerCase())
    );
  }
}

// Express middleware wrapper
export function withErrorHandler(
  handler: (req: Request, res: Response) => Promise<any>
) {
  return async (req: Request, res: Response) => {
    try {
      const result = await handler(req, res);
      return result;
    } catch (error) {
      const apiResponse = APIErrorHandler.handleError(error as Error, req);
      const classification = APIErrorHandler.classifyError(error as Error);
      
      return res.status(classification.httpStatus).json(apiResponse);
    }
  };
}

// Success response helper
export function createSuccessResponse<T>(data: T, message?: string): APIResponse<T> {
  return {
    success: true,
    data,
    ...(message && { message })
  };
}