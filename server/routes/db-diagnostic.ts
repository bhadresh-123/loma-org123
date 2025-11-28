import { Router } from 'express';
import { db, queryClient } from '@db';

const router = Router();

// Diagnostic endpoint to check session tables and schema
router.get('/session-tables', async (_req, res) => {
  try {
    if (!queryClient) {
      throw new Error('Query client is not available');
    }

    // Check which session-related tables exist
    const tablesResult = await queryClient`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE '%session%'
      ORDER BY table_name
    `;

    const tableNames = tablesResult.map(r => r.table_name);

    // Check clinical_sessions table structure if it exists
    let clinicalSessionsInfo = null;
    if (tableNames.includes('clinical_sessions')) {
      const columnsResult = await queryClient`
        SELECT 
          column_name,
          data_type,
          column_default,
          is_nullable
        FROM information_schema.columns
        WHERE table_name = 'clinical_sessions'
        ORDER BY ordinal_position
      `;

      // Check if there's a sequence for id
      const sequenceResult = await queryClient`
        SELECT 
          sequence_name,
          last_value,
          increment_by
        FROM information_schema.sequences
        WHERE sequence_name LIKE 'clinical_sessions%'
          OR sequence_name LIKE '%sessions%seq'
      `;

      clinicalSessionsInfo = {
        exists: true,
        columns: columnsResult,
        sequences: sequenceResult,
      };
    }

    // Check sessions_hipaa table structure if it exists
    let sessionsHipaaInfo = null;
    if (tableNames.includes('sessions_hipaa')) {
      const columnsResult = await queryClient`
        SELECT 
          column_name,
          data_type,
          column_default,
          is_nullable
        FROM information_schema.columns
        WHERE table_name = 'sessions_hipaa'
        ORDER BY ordinal_position
      `;

      const sequenceResult = await queryClient`
        SELECT 
          sequence_name,
          last_value,
          increment_by
        FROM information_schema.sequences
        WHERE sequence_name LIKE 'sessions_hipaa%'
      `;

      sessionsHipaaInfo = {
        exists: true,
        columns: columnsResult,
        sequences: sequenceResult,
      };
    }

    res.json({
      timestamp: new Date().toISOString(),
      sessionRelatedTables: tableNames,
      clinical_sessions: clinicalSessionsInfo || { exists: false },
      sessions_hipaa: sessionsHipaaInfo || { exists: false },
      diagnosis: {
        tableExists: tableNames.includes('clinical_sessions'),
        legacyTableExists: tableNames.includes('sessions_hipaa'),
        needsMigration: !tableNames.includes('clinical_sessions') && tableNames.includes('sessions_hipaa'),
      }
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'DIAGNOSTIC_FAILED',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

export default router;

