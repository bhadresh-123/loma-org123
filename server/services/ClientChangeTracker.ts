import { decryptPHI } from '../utils/phi-encryption';

export interface ChangeDetail {
  field: string;
  oldValue: any;
  newValue: any;
  description: string;
  isPHI: boolean;
}

export interface ChangeTrackingResult {
  hasChanges: boolean;
  changes: ChangeDetail[];
  updateData: Record<string, any>;
  auditDescription: string;
}

/**
 * Service for tracking client data changes with PHI-aware comparison
 * Handles proper change detection before encryption occurs
 */
export class ClientChangeTracker {
  // Define which fields contain PHI
  private static readonly PHI_FIELDS = new Set([
    'email', 'phone', 'notes', 'hometown', 'race', 'pronouns',
    'referringPhysician', 'referringPhysicianNpi', 'priorAuthNumber',
    'primaryDiagnosisCode', 'secondaryDiagnosisCode'
  ]);

  // Define allowed fields for client updates
  private static readonly ALLOWED_FIELDS = [
    'name', 'email', 'phone', 'billingType', 'sessionCost', 'noShowFee',
    'race', 'age', 'hometown', 'pronouns', 'placeOfService',
    'copayAmount', 'deductibleAmount', 'priorAuthNumber', 'authorizationRequired',
    'referringPhysician', 'referringPhysicianNpi', 'primaryDiagnosisCode', 
    'secondaryDiagnosisCode', 'notes'
  ];

  /**
   * Compares form data against existing client record to detect changes
   * Decrypts PHI fields from database for proper comparison
   */
  static async trackChanges(
    formData: Record<string, any>,
    existingClient: Record<string, any>
  ): Promise<ChangeTrackingResult> {
    const changes: ChangeDetail[] = [];
    const updateData: Record<string, any> = {};

    // Create a decrypted version of existing client for comparison
    const decryptedClient = await this.decryptClientForComparison(existingClient);

    // Process each allowed field in form data
    for (const field of this.ALLOWED_FIELDS) {
      if (formData[field] !== undefined) {
        const currentValue = decryptedClient[field];
        const newValue = formData[field];

        const change = this.compareValues(field, currentValue, newValue);
        if (change) {
          changes.push(change);
          updateData[field] = newValue;
        }
      }
    }

    // Always preserve billing_type if not being updated
    if (!('billingType' in updateData) && existingClient.billingType) {
      updateData.billingType = existingClient.billingType;
    }

    const auditDescription = changes.length > 0 
      ? `Updated: ${changes.map(c => c.description).join(', ')}`
      : 'No changes detected';

    return {
      hasChanges: changes.length > 0,
      changes,
      updateData,
      auditDescription
    };
  }

  /**
   * Decrypts PHI fields from database record for comparison
   */
  private static async decryptClientForComparison(client: Record<string, any>): Promise<Record<string, any>> {
    const decrypted = { ...client };

    // Decrypt each PHI field if encrypted version exists
    for (const field of this.PHI_FIELDS) {
      const encryptedField = `${field}_encrypted`;
      if (client[encryptedField]) {
        try {
          decrypted[field] = decryptPHI(client[encryptedField]);
        } catch (error) {
          console.error(`Failed to decrypt ${field} for comparison:`, error);
          // Keep original value if decryption fails
          decrypted[field] = client[field];
        }
      }
    }

    return decrypted;
  }

  /**
   * Compares two values and creates change detail if different
   */
  private static compareValues(field: string, currentValue: any, newValue: any): ChangeDetail | null {
    const normalizedCurrent = this.normalizeValue(currentValue);
    const normalizedNew = this.normalizeValue(newValue);

    if (normalizedCurrent === normalizedNew) {
      return null;
    }

    const isPHI = this.PHI_FIELDS.has(field);
    const description = this.createChangeDescription(field, normalizedCurrent, normalizedNew, isPHI);

    return {
      field,
      oldValue: normalizedCurrent,
      newValue: normalizedNew,
      description,
      isPHI
    };
  }

  /**
   * Normalizes values for consistent comparison
   */
  private static normalizeValue(value: any): any {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    if (typeof value === 'string') {
      return value.trim();
    }
    return value;
  }

  /**
   * Creates human-readable change description
   * Masks PHI values in descriptions for security
   */
  private static createChangeDescription(
    field: string, 
    oldValue: any, 
    newValue: any, 
    isPHI: boolean
  ): string {
    const formatValue = (val: any, maskPHI: boolean) => {
      if (val === null || val === undefined || val === '') {
        return 'empty';
      }
      
      if (maskPHI && isPHI) {
        // Mask PHI values in audit descriptions
        if (typeof val === 'string') {
          if (val.includes('@')) {
            // Email: show first char and domain
            const parts = val.split('@');
            return `"${parts[0][0]}***@${parts[1]}"`;
          } else if (val.match(/^\d+$/)) {
            // Phone-like numbers: show first 3 digits
            return `"${val.substring(0, 3)}***"`;
          } else {
            // Other PHI: show length
            return `"[${val.length} chars]"`;
          }
        }
      }
      
      return `"${val}"`;
    };

    if (oldValue === null) {
      return `${field}: set to ${formatValue(newValue, true)}`;
    } else if (newValue === null) {
      return `${field}: cleared from ${formatValue(oldValue, true)}`;
    } else {
      return `${field}: ${formatValue(oldValue, true)} → ${formatValue(newValue, true)}`;
    }
  }
}