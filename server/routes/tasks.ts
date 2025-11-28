import { Router } from 'express';
import { authenticateToken } from '../auth-simple';
import { parsePagination } from '../middleware/core-security';
import { db, getActiveSchema } from '../../db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { tasks } from '@db/schema';

const router = Router();

/**
 * Task Management Routes
 * 
 * Provides HIPAA-compliant task management functionality
 * for therapists to track follow-up tasks and reminders.
 */

// GET /api/tasks - List all tasks for user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    
    // Parse pagination parameters
    const { page, limit, offset } = parsePagination(req);
    
    // Use direct schema import for tasks
    try {
      // Get total count
      const [{ count: total }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(tasks)
        .where(eq(tasks.createdByUserId, userId));
      
      // Get paginated tasks
      const userTasks = await db
        .select()
        .from(tasks)
        .where(eq(tasks.createdByUserId, userId))
        .orderBy(desc(tasks.createdAt))
        .limit(limit)
        .offset(offset);
      
      res.json({
        data: userTasks,
        pagination: {
          page,
          limit,
          total: Number(total),
          totalPages: Math.ceil(Number(total) / limit),
          hasMore: offset + limit < Number(total)
        }
      });
    } catch (error) {
      console.error('Error fetching tasks:', error);
      // Return empty array on error to prevent crashes
      res.json([]);
    }
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// POST /api/tasks - Create new task
router.post('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { title, description, patientId, sessionId, categoryId, type, dueDate, organizationId, isAutomated, status } = req.body;
    const schema = getActiveSchema();
    
    console.log('Creating task with request body:', JSON.stringify(req.body, null, 2));
    console.log('User ID:', userId);
    
    // Validate required fields
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const taskData = {
      organizationId: organizationId || 1, // Default to organization 1 for now
      createdByUserId: userId,
      assignedToUserId: userId, // Default to creator
      patientId: patientId || null,
      sessionId: sessionId || null,
      categoryId: categoryId || null,
      type: type || 'general',
      title,
      description: description || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      status: status || 'pending',
      isAutomated: isAutomated || false
    };
    
    console.log('Inserting task with data:', JSON.stringify(taskData, null, 2));

    // Create task using schema
    const [newTask] = await db.insert(schema.tasks).values(taskData).returning();

    console.log('Task created successfully:', newTask.id);
    res.status(201).json(newTask);
  } catch (error: any) {
    console.error('❌ Error creating task:', error.message);
    console.error('Error details:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'Failed to create task', details: error.message });
  }
});

// GET /api/tasks/:id - Get task details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const taskId = parseInt(req.params.id);
    const schema = getActiveSchema();
    
    if (!schema.isHIPAASchema) {
      return res.status(400).json({ 
        error: 'HIPAA_SCHEMA_REQUIRED',
        message: 'Task management requires HIPAA schema'
      });
    }

    // Get user's organization
    const userMembership = await db.query.organizationMemberships.findFirst({
      where: eq(schema.organizationMemberships.userId, userId)
    });

    if (!userMembership) {
      return res.status(400).json({
        error: 'NO_ORGANIZATION',
        message: 'User must belong to an organization to view tasks'
      });
    }

    // Get task
    const task = await db.query.tasks.findFirst({
      where: and(
        eq(schema.tasks.id, taskId),
        eq(schema.tasks.organizationId, userMembership.organizationId)
      ),
      with: {
        createdBy: {
          columns: {
            id: true,
            username: true,
            email: true
          }
        },
        assignedTo: {
          columns: {
            id: true,
            username: true,
            email: true
          }
        },
        patient: {
          columns: {
            id: true,
            patientFirstNameEncrypted: true,
            patientLastNameEncrypted: true
          }
        }
      }
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

// PUT /api/tasks/:id - Update task (including completion)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const taskId = parseInt(req.params.id);
    const { title, description, status, priority, dueDate, assignedToUserId } = req.body;
    const schema = getActiveSchema();
    
    if (!schema.isHIPAASchema) {
      return res.status(400).json({ 
        error: 'HIPAA_SCHEMA_REQUIRED',
        message: 'Task management requires HIPAA schema'
      });
    }

    // Get user's organization
    const userMembership = await db.query.organizationMemberships.findFirst({
      where: eq(schema.organizationMemberships.userId, userId)
    });

    if (!userMembership) {
      return res.status(400).json({
        error: 'NO_ORGANIZATION',
        message: 'User must belong to an organization to update tasks'
      });
    }

    // Check if task exists and belongs to user's organization
    const existingTask = await db.query.tasks.findFirst({
      where: and(
        eq(schema.tasks.id, taskId),
        eq(schema.tasks.organizationId, userMembership.organizationId)
      )
    });

    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date()
    };

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'completed') {
        updateData.completedAt = new Date();
      }
    }
    if (priority !== undefined) updateData.priority = priority;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (assignedToUserId !== undefined) updateData.assignedToUserId = assignedToUserId;

    // Update task
    const [updatedTask] = await db.update(schema.tasks)
      .set(updateData)
      .where(eq(schema.tasks.id, taskId))
      .returning();

    res.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const taskId = parseInt(req.params.id);
    const schema = getActiveSchema();
    
    if (!schema.isHIPAASchema) {
      return res.status(400).json({ 
        error: 'HIPAA_SCHEMA_REQUIRED',
        message: 'Task management requires HIPAA schema'
      });
    }

    // Get user's organization
    const userMembership = await db.query.organizationMemberships.findFirst({
      where: eq(schema.organizationMemberships.userId, userId)
    });

    if (!userMembership) {
      return res.status(400).json({
        error: 'NO_ORGANIZATION',
        message: 'User must belong to an organization to delete tasks'
      });
    }

    // Check if task exists and belongs to user's organization
    const existingTask = await db.query.tasks.findFirst({
      where: and(
        eq(schema.tasks.id, taskId),
        eq(schema.tasks.organizationId, userMembership.organizationId)
      )
    });

    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Delete task
    await db.delete(schema.tasks).where(eq(schema.tasks.id, taskId));

    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

export default router;
