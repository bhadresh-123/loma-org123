// CPT Code suggestion logic based on session type and duration

export interface CPTCode {
  id: number;
  code: string;
  description: string;
  duration?: number;
  isActive?: boolean;
}

export interface CPTSuggestion {
  code: string;
  description: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  addOnCodes?: Array<{
    code: string;
    description: string;
    whenToUse: string;
  }>;
}

/**
 * Determines applicable add-on codes based on session characteristics
 */
function getApplicableAddOnCodes(
  duration: number,
  sessionType: string
): Array<{ code: string; description: string; whenToUse: string }> {
  const addOnCodes = [];

  // Determine base session duration for different therapy types
  const getBaseDuration = (type: string): number => {
    const category = type.toLowerCase();
    if (['individual', 'consultation', 'termination', 'triage'].includes(category)) {
      return duration <= 37 ? 30 : duration <= 52 ? 45 : 60;
    }
    if (['couple', 'family'].includes(category)) return 50;
    if (category === 'group') return 90;
    if (category === 'intake') return 60;
    return 45; // default
  };

  const baseDuration = getBaseDuration(sessionType);
  const extraTime = duration - baseDuration;

  // Add prolonged service codes for sessions that exceed base duration significantly
  if (extraTime > 30) {
    const prolongedInstances = Math.floor(extraTime / 30);
    
    for (let i = 0; i < prolongedInstances; i++) {
      addOnCodes.push({
        code: '99354',
        description: `Prolonged service (30 min beyond base) - Add-on #${i + 1}`,
        whenToUse: `Session duration (${duration} min) exceeds standard ${baseDuration}-minute ${sessionType} session`
      });
    }
  }

  // Interactive complexity add-on - suggested but not auto-applied
  // Therapists can add this based on session complexity
  if (sessionType.toLowerCase() !== 'assessment') {
    addOnCodes.push({
      code: '90785',
      description: 'Interactive complexity add-on',
      whenToUse: 'Consider for complex communication needs (e.g., trauma, language barriers, developmental disabilities)'
    });
  }

  return addOnCodes;
}

/**
 * Generates assessment-specific CPT billing recommendations
 */
export function generateAssessmentCPTSuggestion(
  assessmentType: string,
  duration: number
): CPTSuggestion {
  const assessmentCodes = [];
  
  // Note: 90791 (intake) should be billed separately, not included in assessment sessions
  
  // Determine administration and interpretation codes based on assessment type
  const needsAdministration = !['Depression/Anxiety', 'PTSD/Trauma', 'Substance Use', 'Vocational/Career'].includes(assessmentType);
  const needsExtendedAdmin = ['Intelligence Testing', 'Neuropsychological', 'Academic/Learning Disability'].includes(assessmentType);
  const needsExtendedInterpretation = ['Personality/Psychopathology', 'Neuropsychological', 'Autism'].includes(assessmentType);
  
  if (needsAdministration) {
    assessmentCodes.push({
      code: '96136',
      description: 'Test administration (first 30 min)',
      whenToUse: 'For administered psychological tests'
    });
    
    if (needsExtendedAdmin) {
      assessmentCodes.push({
        code: '96137',
        description: 'Test administration (additional 30 min) - Add-on',
        whenToUse: 'For longer test batteries requiring additional administration time'
      });
    }
  }
  
  // Interpretation codes
  assessmentCodes.push({
    code: '96130',
    description: 'Test interpretation (first 60 min)',
    whenToUse: 'For scoring and interpreting psychological tests'
  });
  
  if (needsExtendedInterpretation) {
    assessmentCodes.push({
      code: '96131',
      description: 'Test interpretation (additional 30 min) - Add-on',
      whenToUse: 'For complex assessments requiring extended interpretation'
    });
  }
  
  // Determine primary suggested code and add-ons based on session duration
  let primaryCode = '96130'; // Default to interpretation
  let confidence: 'high' | 'medium' | 'low' = 'high';
  let reason = `Assessment billing recommendation for ${assessmentType} (${duration} min)`;
  
  // Determine primary code based on duration
  if (duration <= 60 && needsAdministration) {
    primaryCode = '96136';
    reason = `Test administration session for ${assessmentType} (${duration} min)`;
  } else if (duration > 60) {
    primaryCode = '96130';
    reason = `Test interpretation session for ${assessmentType} (${duration} min)`;
  }
  
  // Add multiple instances of add-on codes based on duration
  if (needsAdministration && duration > 30) {
    const adminAddOns = Math.floor((duration - 30) / 30);
    for (let i = 0; i < adminAddOns; i++) {
      assessmentCodes.push({
        code: '96137',
        description: `Test administration (additional 30 min) - Add-on #${i + 1}`,
        whenToUse: `Additional administration time beyond first 30 minutes`
      });
    }
  }
  
  // Add multiple interpretation add-ons for longer sessions
  if (duration > 90) {
    const interpretationAddOns = Math.floor((duration - 60) / 30);
    for (let i = 0; i < interpretationAddOns; i++) {
      assessmentCodes.push({
        code: '96131',
        description: `Test interpretation (additional 30 min) - Add-on #${i + 1}`,
        whenToUse: `Additional interpretation time beyond first 60 minutes`
      });
    }
  }
  
  // Get description for primary code
  const codeDescriptions = {
    '96136': 'Test administration (first 30 min)',
    '96130': 'Test interpretation (first 60 min)'
  };

  return {
    code: primaryCode,
    description: codeDescriptions[primaryCode as keyof typeof codeDescriptions] || 'Psychological assessment',
    confidence,
    reason,
    addOnCodes: assessmentCodes
  };
}

/**
 * Suggests appropriate CPT codes based on session type and duration
 */
export function suggestCPTCode(
  sessionType: string, 
  duration: number, 
  availableCodes: CPTCode[],
  assessmentType?: string
): CPTSuggestion | null {
  
  // Handle assessment sessions separately
  if (sessionType.toLowerCase() === 'assessment' && assessmentType) {
    return generateAssessmentCPTSuggestion(assessmentType, duration);
  }
  
  // Map session types to therapy categories
  const getTherapyCategory = (type: string): 'individual' | 'family' | 'group' | 'evaluation' => {
    switch (type.toLowerCase()) {
      case 'individual':
      case 'consultation':
      case 'termination':
      case 'triage':
        return 'individual';
      case 'couple':
        return 'family'; // Couple therapy uses family therapy codes
      case 'group':
        return 'group';
      case 'intake':
        return 'evaluation';
      default:
        return 'individual';
    }
  };

  const category = getTherapyCategory(sessionType);
  
  // Define CPT code rules based on category and duration
  const cptRules = {
    individual: [
      { code: '90834', minDuration: 38, maxDuration: 52, description: 'Individual psychotherapy, 45 minutes' },
      { code: '90837', minDuration: 53, maxDuration: 67, description: 'Individual psychotherapy, 60 minutes' },
      { code: '90832', minDuration: 16, maxDuration: 37, description: 'Individual psychotherapy, 30 minutes' },
      { code: '90838', minDuration: 68, maxDuration: 90, description: 'Individual psychotherapy, 75+ minutes' }
    ],
    family: [
      { code: '90847', minDuration: 26, maxDuration: 60, description: 'Family psychotherapy with patient present' },
      { code: '90846', minDuration: 26, maxDuration: 60, description: 'Family psychotherapy without patient present' }
    ],
    group: [
      { code: '90853', minDuration: 60, maxDuration: 120, description: 'Group psychotherapy' }
    ],
    evaluation: [
      { code: '90791', minDuration: 45, maxDuration: 90, description: 'Psychiatric diagnostic evaluation' },
      { code: '90792', minDuration: 45, maxDuration: 90, description: 'Psychiatric diagnostic evaluation with medical services' }
    ]
  };

  const rules = cptRules[category];
  if (!rules) return null;

  // Find the best matching rule based on duration
  const matchingRule = rules.find(rule => 
    duration >= rule.minDuration && duration <= rule.maxDuration
  );

  if (!matchingRule) {
    // If no exact match, find the closest one
    const closestRule = rules.reduce((closest, current) => {
      const currentDistance = Math.min(
        Math.abs(duration - current.minDuration),
        Math.abs(duration - current.maxDuration)
      );
      const closestDistance = Math.min(
        Math.abs(duration - closest.minDuration),
        Math.abs(duration - closest.maxDuration)
      );
      return currentDistance < closestDistance ? current : closest;
    });

    const distanceFromRange = Math.min(
      Math.abs(duration - closestRule.minDuration),
      Math.abs(duration - closestRule.maxDuration)
    );

    // Determine applicable add-on codes for closest match
    const addOnCodes = getApplicableAddOnCodes(duration, sessionType);

    return {
      code: closestRule.code,
      description: closestRule.description,
      confidence: distanceFromRange <= 5 ? 'medium' : 'low',
      reason: `Closest match for ${sessionType} session (${duration} min): ${closestRule.description}`,
      addOnCodes: addOnCodes.length > 0 ? addOnCodes : undefined
    };
  }

  // Check if the suggested code exists in available codes
  const codeExists = availableCodes.some(code => code.code === matchingRule.code);
  
  // Determine applicable add-on codes
  const addOnCodes = getApplicableAddOnCodes(duration, sessionType);
  
  return {
    code: matchingRule.code,
    description: matchingRule.description,
    confidence: codeExists ? 'high' : 'medium',
    reason: `Best match for ${sessionType} session (${duration} min): ${matchingRule.description}`,
    addOnCodes: addOnCodes.length > 0 ? addOnCodes : undefined
  };
}

/**
 * Gets all possible CPT codes for a given session type
 */
export function getPossibleCPTCodes(
  sessionType: string,
  availableCodes: CPTCode[]
): CPTCode[] {
  const category = sessionType.toLowerCase();
  
  const relevantCodePrefixes = {
    individual: ['90832', '90834', '90837', '90838'],
    couple: ['90847', '90846'],
    group: ['90853'],
    intake: ['90791', '90792'],
    consultation: ['90832', '90834', '90837'],
    termination: ['90832', '90834', '90837'],
    triage: ['90791', '90834']
  };

  const prefixes = relevantCodePrefixes[category as keyof typeof relevantCodePrefixes] || 
                   relevantCodePrefixes.individual;

  return availableCodes.filter(code => 
    prefixes.some(prefix => code.code.startsWith(prefix))
  );
}