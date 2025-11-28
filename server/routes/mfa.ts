/**
 * MFA Routes - Multi-Factor Authentication Endpoints
 * 
 * HIPAA 1.4.4 Compliance: Admin users have MFA enabled
 */

import { Router } from 'express';
import { MFAService } from '../utils/mfa-service';
import { authenticateToken } from '../middleware/authentication';
import { auditLogger, AuditAction, ResourceType } from '../utils/audit-system';

const router = Router();

/**
 * GET /api/mfa/status
 * Check if user has MFA enabled
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const isEnabled = await MFAService.isMFAEnabled(userId);
    const setupRequired = await MFAService.needsMFASetup(userId);

    res.json({
      enabled: isEnabled,
      setupRequired: setupRequired.required,
      gracePeriodEnds: setupRequired.gracePeriodEnds,
    });
  } catch (error) {
    console.error('MFA status check error:', error);
    res.status(500).json({ error: 'Failed to check MFA status' });
  }
});

/**
 * POST /api/mfa/setup
 * Initialize MFA setup - generates secret and QR code
 */
router.post('/setup', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email;
    
    if (!userId || !userEmail) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { secret, qrCodeUri, recoveryCodes } = await MFAService.setupMFA(userId, userEmail);

    // Audit log
    await auditLogger.logEvent({
      userId,
      action: AuditAction.MFA_SETUP_INITIATED,
      resourceType: ResourceType.USER,
      resourceId: userId,
      details: { email: userEmail },
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    });

    res.json({
      message: 'MFA setup initiated. Scan QR code with authenticator app.',
      qrCodeUri,
      secret, // Only shown once - user should save recovery codes
      recoveryCodes, // Display these to user - they should save them securely
    });
  } catch (error) {
    console.error('MFA setup error:', error);
    res.status(500).json({ error: 'Failed to set up MFA' });
  }
});

/**
 * POST /api/mfa/verify
 * Verify TOTP code and enable MFA
 */
router.post('/verify', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { code } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Verification code required' });
    }

    const isValid = await MFAService.verifyAndEnableMFA(userId, code);

    if (isValid) {
      // Audit log
      await auditLogger.logEvent({
        userId,
        action: AuditAction.MFA_ENABLED,
        resourceType: ResourceType.USER,
        resourceId: userId,
        details: { message: 'MFA enabled successfully' },
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
      });

      res.json({
        success: true,
        message: 'MFA enabled successfully',
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Invalid verification code',
      });
    }
  } catch (error) {
    console.error('MFA verification error:', error);
    res.status(500).json({ error: 'Failed to verify MFA code' });
  }
});

/**
 * POST /api/mfa/authenticate
 * Authenticate with MFA code (during login or sensitive operation)
 */
router.post('/authenticate', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { code, useRecoveryCode } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Code required' });
    }

    let isValid = false;

    if (useRecoveryCode) {
      isValid = await MFAService.verifyRecoveryCode(userId, code);
      
      if (isValid) {
        await auditLogger.logEvent({
          userId,
          action: AuditAction.MFA_RECOVERY_CODE_USED,
          resourceType: ResourceType.USER,
          resourceId: userId,
          details: { message: 'Recovery code used for authentication' },
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown',
        });
      }
    } else {
      isValid = await MFAService.verifyMFACode(userId, code);
      
      if (isValid) {
        await auditLogger.logEvent({
          userId,
          action: AuditAction.MFA_VERIFIED,
          resourceType: ResourceType.USER,
          resourceId: userId,
          details: { message: 'MFA code verified' },
          ipAddress: req.ip || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown',
        });
      }
    }

    if (isValid) {
      // Store MFA verification in session (if using session middleware)
      if (req.session) {
        req.session.mfaVerified = true;
        req.session.mfaVerifiedAt = new Date();
      }

      res.json({
        success: true,
        message: 'MFA authentication successful',
      });
    } else {
      res.status(401).json({
        success: false,
        error: 'Invalid code',
      });
    }
  } catch (error) {
    console.error('MFA authentication error:', error);
    res.status(500).json({ error: 'Failed to authenticate with MFA' });
  }
});

/**
 * POST /api/mfa/disable
 * Disable MFA for user (requires current MFA verification)
 */
router.post('/disable', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { code } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify current MFA code before disabling
    const isValid = await MFAService.verifyMFACode(userId, code);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid MFA code' });
    }

    await MFAService.disableMFA(userId);

    // Audit log
    await auditLogger.logEvent({
      userId,
      action: AuditAction.MFA_DISABLED,
      resourceType: ResourceType.USER,
      resourceId: userId,
      details: { message: 'MFA disabled' },
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    });

    res.json({
      success: true,
      message: 'MFA disabled successfully',
    });
  } catch (error) {
    console.error('MFA disable error:', error);
    res.status(500).json({ error: 'Failed to disable MFA' });
  }
});

/**
 * POST /api/mfa/regenerate-codes
 * Regenerate recovery codes (requires current MFA verification)
 */
router.post('/regenerate-codes', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email;
    const { code } = req.body;

    if (!userId || !userEmail) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Verify current MFA code before regenerating
    const isValid = await MFAService.verifyMFACode(userId, code);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid MFA code' });
    }

    // Generate new recovery codes
    const { recoveryCodes } = await MFAService.setupMFA(userId, userEmail);

    // Audit log
    await auditLogger.logEvent({
      userId,
      action: AuditAction.MFA_RECOVERY_CODES_REGENERATED,
      resourceType: ResourceType.USER,
      resourceId: userId,
      details: { message: 'Recovery codes regenerated' },
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
    });

    res.json({
      success: true,
      message: 'Recovery codes regenerated. Save these securely.',
      recoveryCodes,
    });
  } catch (error) {
    console.error('MFA regenerate codes error:', error);
    res.status(500).json({ error: 'Failed to regenerate recovery codes' });
  }
});

export default router;

