import { Request, Response, NextFunction } from 'express';
import { db } from '@db';
import { eq, and, inArray } from 'drizzle-orm';
import { getActiveSchema } from '@db';

// Get active schema for table references
const schema = getActiveSchema();


export interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    username: string;
    name: string;
    [key: string]: any;
  };
}

// Enhanced generic resource ownership verification with caching
const ownershipCache = new Map<string, { userId: number; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function verifyResourceOwnership(table: any, resourceIdParam: string = 'id', options: {
  allowIndirectOwnership?: boolean;
  parentTable?: any;
  parentIdField?: string;
  cacheEnabled?: boolean;
} = {}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({
          error: "AUTH_REQUIRED",
          message: "Authentication required"
        });
      }

      const resourceId = parseInt(req.params[resourceIdParam]);
      if (isNaN(resourceId)) {
        return res.status(400).json({
          error: "INVALID_ID",
          message: "Invalid resource ID"
        });
      }

      const userId = (req as AuthenticatedRequest).user.id;
      
      if (!userId) {
        console.error('User ID not found in authenticated request:', req.user);
        return res.status(401).json({
          error: "AUTH_REQUIRED",
          message: "User ID not available"
        });
      }
      
      // Set userId on request for downstream middleware
      (req as any).userId = userId;
      const cacheKey = `${table._.name}:${resourceId}`;

      // Check cache if enabled
      if (options.cacheEnabled) {
        const cached = ownershipCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
          if (cached.userId === userId) {
            return next();
          } else {
            return res.status(404).json({
              error: "NOT_FOUND",
              message: "Resource not found or access denied"
            });
          }
        }
      }

      // Direct ownership check
      const [resource] = await db
        .select()
        .from(table)
        .where(and(
          eq(table.id, resourceId),
          eq(table.userId, userId)
        ))
        .limit(1);

      if (resource) {
        // Cache the result
        if (options.cacheEnabled) {
          ownershipCache.set(cacheKey, { userId, timestamp: Date.now() });
        }
        (req as any).resource = resource;
        return next();
      }

      // If direct ownership fails and indirect ownership is allowed
      if (options.allowIndirectOwnership && options.parentTable && options.parentIdField) {
        const [indirectResource] = await db
          .select({
            resource: table,
            parent: options.parentTable
          })
          .from(table)
          .innerJoin(options.parentTable, eq(table[options.parentIdField], options.parentTable.id))
          .where(and(
            eq(table.id, resourceId),
            eq(options.parentTable.userId, userId)
          ))
          .limit(1);

        if (indirectResource) {
          if (options.cacheEnabled) {
            ownershipCache.set(cacheKey, { userId, timestamp: Date.now() });
          }
          (req as any).resource = indirectResource.resource;
          return next();
        }
      }

      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Resource not found or access denied"
      });

    } catch (error) {
      console.error('Resource ownership verification error:', error);
      return res.status(500).json({
        error: "SERVER_ERROR",
        message: "Internal server error"
      });
    }
  };
}

// =================== SPECIFIC RESOURCE MIDDLEWARE ===================

// Client ownership verification (root ownership entity)
export function verifyClientOwnership(req: Request, res: Response, next: NextFunction) {
  return verifyResourceOwnership(clients, 'id', { cacheEnabled: true })(req, res, next);
}

// Insurance Info ownership (via client)
export function verifyInsuranceInfoOwnership(req: Request, res: Response, next: NextFunction) {
  return verifyResourceOwnership(insuranceInfo, 'id', {
    allowIndirectOwnership: true,
    parentTable: clients,
    parentIdField: 'patientId',
    cacheEnabled: true
  })(req, res, next);
}

// Work Schedule ownership (direct user ownership)
export function verifyWorkScheduleOwnership(req: Request, res: Response, next: NextFunction) {
  return verifyResourceOwnership(workSchedules, 'id', { cacheEnabled: true })(req, res, next);
}

// Calendar Block ownership (direct user ownership)
export function verifyCalendarBlockOwnership(req: Request, res: Response, next: NextFunction) {
  return verifyResourceOwnership(calendarBlocks, 'id', { cacheEnabled: true })(req, res, next);
}

// Meeting Type ownership (direct user ownership)
export function verifyMeetingTypeOwnership(req: Request, res: Response, next: NextFunction) {
  return verifyResourceOwnership(meetingTypes, 'id', { cacheEnabled: true })(req, res, next);
}

// Meeting ownership (direct user ownership)
export function verifyMeetingOwnership(req: Request, res: Response, next: NextFunction) {
  return verifyResourceOwnership(meetings, 'id', { cacheEnabled: true })(req, res, next);
}

// Task Category ownership (direct user ownership)
export function verifyTaskCategoryOwnership(req: Request, res: Response, next: NextFunction) {
  return verifyResourceOwnership(taskCategories, 'id', { cacheEnabled: true })(req, res, next);
}

// Form ownership (direct user ownership)
export function verifyFormOwnership(req: Request, res: Response, next: NextFunction) {
  return verifyResourceOwnership(forms, 'id', { cacheEnabled: true })(req, res, next);
}

// Notification ownership (direct user ownership)
export function verifyNotificationOwnership(req: Request, res: Response, next: NextFunction) {
  return verifyResourceOwnership(notifications, 'id', { cacheEnabled: true })(req, res, next);
}

// Chat Message ownership (dual validation: user + client)
export async function verifyChatMessageOwnership(req: Request, res: Response, next: NextFunction) {
  try {
    // Chat messages not available in HIPAA schema
    return res.status(501).json({
      error: "NOT_IMPLEMENTED",
      message: "Chat messages not available in HIPAA schema"
    });
  } catch (error) {
    console.error('Chat message ownership verification error:', error);
    return res.status(500).json({
      error: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
}

// Session ownership verification (complex: nullable userId + required patientId)
export async function verifySessionOwnership(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({
        error: "AUTH_REQUIRED",
        message: "Authentication required"
      });
    }

    const sessionId = parseInt(req.params.id);
    if (isNaN(sessionId)) {
      return res.status(400).json({
        error: "INVALID_ID",
        message: "Invalid session ID"
      });
    }

    const userId = (req as AuthenticatedRequest).user.id;

    // Sessions have complex ownership: direct userId OR via client ownership
    const [session] = await db
      .select({
        session: schema.clinicalSessions,
        client: schema.patients
      })
      .from(schema.clinicalSessions)
      .innerJoin(schema.patients, eq(schema.clinicalSessions.patientId, schema.patients.id))
      .where(and(
        eq(schema.clinicalSessions.id, sessionId),
        eq(schema.patients.primaryTherapistId, userId) // Primary ownership via client
      ))
      .limit(1);

    if (!session) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Session not found or access denied"
      });
    }

    // Additional validation: if session has userId, it must match current user
    if (session.session.userId && session.session.userId !== userId) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Session not found or access denied"
      });
    }

    (req as any).resource = session.session;
    next();
  } catch (error) {
    console.error('Session ownership verification error:', error);
    return res.status(500).json({
      error: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
}

// Session Documents ownership (via session → client ownership)
export async function verifySessionDocumentOwnership(req: Request, res: Response, next: NextFunction) {
  try {
    // Session documents not available in HIPAA schema
    return res.status(501).json({
      error: "NOT_IMPLEMENTED",
      message: "Session documents not available in HIPAA schema"
    });
  } catch (error) {
    console.error('Session document ownership verification error:', error);
    return res.status(500).json({
      error: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
}

// Task ownership verification (complex: userId + optional patientId/sessionId)
export async function verifyTaskOwnership(req: Request, res: Response, next: NextFunction) {
  try {
    // Tasks not available in HIPAA schema
    return res.status(501).json({
      error: "NOT_IMPLEMENTED",
      message: "Tasks not available in HIPAA schema"
    });

  } catch (error) {
    console.error('Task ownership verification error:', error);
    return res.status(500).json({
      error: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
}

// Document ownership verification (via client ownership)
export async function verifyDocumentOwnership(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({
        error: "AUTH_REQUIRED",
        message: "Authentication required"
      });
    }

    const documentId = parseInt(req.params.id);
    if (isNaN(documentId)) {
      return res.status(400).json({
        error: "INVALID_ID",
        message: "Invalid document ID"
      });
    }

    const userId = (req as AuthenticatedRequest).user.id;

    // Direct user ownership check for documents
    const [document] = await db
      .select()
      .from(documents)
      .where(and(
        eq(documents.id, documentId),
        eq(documents.userId, userId)
      ))
      .limit(1);

    if (!document) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Document not found or access denied"
      });
    }

    (req as any).resource = document;
    next();
  } catch (error) {
    console.error('Document ownership verification error:', error);
    return res.status(500).json({
      error: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
}

// Treatment plan ownership verification (via client ownership)
export async function verifyTreatmentPlanOwnership(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({
        error: "AUTH_REQUIRED",
        message: "Authentication required"
      });
    }

    const planId = parseInt(req.params.id);
    if (isNaN(planId)) {
      return res.status(400).json({
        error: "INVALID_ID",
        message: "Invalid treatment plan ID"
      });
    }

    const userId = (req as AuthenticatedRequest).user.id;

    // Direct user ownership check for treatment plans
    const [plan] = await db
      .select()
      .from(treatmentPlans)
      .where(and(
        eq(treatmentPlans.id, planId),
        eq(treatmentPlans.userId, userId)
      ))
      .limit(1);

    if (!plan) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Treatment plan not found or access denied"
      });
    }

    (req as any).resource = plan;
    next();
  } catch (error) {
    console.error('Treatment plan ownership verification error:', error);
    return res.status(500).json({
      error: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
}

// Middleware to ensure user can only create resources for themselves
export function addUserToBody(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({
      error: "AUTH_REQUIRED",
      message: "Authentication required"
    });
  }

  req.body.userId = (req as AuthenticatedRequest).user.id;
  next();
}

// =================== BULK OPERATION SCOPING ===================

// Middleware to ensure user can only query their own resources
export function scopeToUser(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({
      error: "AUTH_REQUIRED",
      message: "Authentication required"
    });
  }

  // Add user ID to query parameters for scoping
  (req as any).userId = (req as AuthenticatedRequest).user.id;
  next();
}

// Bulk client validation for operations affecting multiple clients
export async function validateBulkClientOwnership(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({
        error: "AUTH_REQUIRED",
        message: "Authentication required"
      });
    }

    const patientIds = req.body.patientIds || req.body.clients || [];
    if (!Array.isArray(patientIds) || patientIds.length === 0) {
      return next(); // No bulk operation
    }

    const userId = (req as AuthenticatedRequest).user.id;

    // Verify all clients belong to the user
    const userClients = await db
      .select({ id: clients.id })
      .from(clients)
      .where(and(
        inArray(clients.id, patientIds),
        eq(clients.userId, userId)
      ));

    if (userClients.length !== patientIds.length) {
      return res.status(404).json({
        error: "INVALID_CLIENTS",
        message: "One or more clients not found or access denied"
      });
    }

    next();
  } catch (error) {
    console.error('Bulk client validation error:', error);
    return res.status(500).json({
      error: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
}

// Bulk session validation for operations affecting multiple sessions
export async function validateBulkSessionOwnership(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({
        error: "AUTH_REQUIRED",
        message: "Authentication required"
      });
    }

    const sessionIds = req.body.sessionIds || req.body.sessions || [];
    if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
      return next(); // No bulk operation
    }

    const userId = (req as AuthenticatedRequest).user.id;

    // Verify all sessions belong to user's clients
    const userSessions = await db
      .select({ id: sessions.id })
      .from(sessions)
      .innerJoin(clients, eq(sessions.patientId, clients.id))
      .where(and(
        inArray(sessions.id, sessionIds),
        eq(clients.userId, userId)
      ));

    if (userSessions.length !== sessionIds.length) {
      return res.status(404).json({
        error: "INVALID_SESSIONS",
        message: "One or more sessions not found or access denied"
      });
    }

    next();
  } catch (error) {
    console.error('Bulk session validation error:', error);
    return res.status(500).json({
      error: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
}

// Bulk task validation for operations affecting multiple tasks
export async function validateBulkTaskOwnership(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({
        error: "AUTH_REQUIRED",
        message: "Authentication required"
      });
    }

    const taskIds = req.body.taskIds || req.body.tasks || [];
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return next(); // No bulk operation
    }

    const userId = (req as AuthenticatedRequest).user.id;

    // Verify all tasks belong to the user
    const userTasks = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(
        inArray(tasks.id, taskIds),
        eq(tasks.userId, userId)
      ));

    if (userTasks.length !== taskIds.length) {
      return res.status(404).json({
        error: "INVALID_TASKS",
        message: "One or more tasks not found or access denied"
      });
    }

    next();
  } catch (error) {
    console.error('Bulk task validation error:', error);
    return res.status(500).json({
      error: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
}

// Validate cross-reference operations (e.g., linking client to session)
export async function validateCrossReference(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({
        error: "AUTH_REQUIRED",
        message: "Authentication required"
      });
    }

    const userId = (req as AuthenticatedRequest).user.id;
    const { patientId, sessionId, taskId } = req.body;

    // Validate patientId if provided
    if (patientId) {
      const [client] = await db
        .select()
        .from(clients)
        .where(and(
          eq(clients.id, patientId),
          eq(clients.userId, userId)
        ))
        .limit(1);

      if (!client) {
        return res.status(404).json({
          error: "INVALID_CLIENT",
          message: "Client not found or access denied"
        });
      }
    }

    // Validate sessionId if provided
    if (sessionId) {
      const [session] = await db
        .select()
        .from(sessions)
        .innerJoin(clients, eq(sessions.patientId, clients.id))
        .where(and(
          eq(sessions.id, sessionId),
          eq(clients.userId, userId)
        ))
        .limit(1);

      if (!session) {
        return res.status(404).json({
          error: "INVALID_SESSION",
          message: "Session not found or access denied"
        });
      }
    }

    // Validate taskId if provided
    if (taskId) {
      const [task] = await db
        .select()
        .from(tasks)
        .where(and(
          eq(tasks.id, taskId),
          eq(tasks.userId, userId)
        ))
        .limit(1);

      if (!task) {
        return res.status(404).json({
          error: "INVALID_TASK",
          message: "Task not found or access denied"
        });
      }
    }

    next();
  } catch (error) {
    console.error('Cross-reference validation error:', error);
    return res.status(500).json({
      error: "SERVER_ERROR",
      message: "Internal server error"
    });
  }
}

// Cache cleanup utility
export function clearOwnershipCache(pattern?: string) {
  if (pattern) {
    const keysToDelete: string[] = [];
    ownershipCache.forEach((value, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => ownershipCache.delete(key));
  } else {
    ownershipCache.clear();
  }
}