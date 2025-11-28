// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success?: boolean;
}

// HIPAA-compliant client types
export interface ClientHIPAA {
  id: number;
  therapistId: number;
  name: string;
  emailEncrypted: string | null;
  phoneEncrypted: string | null;
  addressEncrypted: string | null;
  cityEncrypted: string | null;
  stateEncrypted: string | null;
  zipCodeEncrypted: string | null;
  dateOfBirthEncrypted: string | null;
  genderEncrypted: string | null;
  raceEncrypted: string | null;
  ethnicityEncrypted: string | null;
  maritalStatusEncrypted: string | null;
  occupationEncrypted: string | null;
  employerEncrypted: string | null;
  emergencyContactNameEncrypted: string | null;
  emergencyContactPhoneEncrypted: string | null;
  emergencyContactRelationshipEncrypted: string | null;
  insuranceProviderEncrypted: string | null;
  insurancePolicyNumberEncrypted: string | null;
  insuranceGroupNumberEncrypted: string | null;
  copayAmountEncrypted: string | null;
  deductibleAmountEncrypted: string | null;
  outOfPocketMaxEncrypted: string | null;
  primaryCarePhysicianNameEncrypted: string | null;
  primaryCarePhysicianPhoneEncrypted: string | null;
  primaryCarePhysicianAddressEncrypted: string | null;
  psychiatristNameEncrypted: string | null;
  psychiatristPhoneEncrypted: string | null;
  psychiatristAddressEncrypted: string | null;
  currentMedicationsEncrypted: string | null;
  allergiesEncrypted: string | null;
  medicalConditionsEncrypted: string | null;
  mentalHealthHistoryEncrypted: string | null;
  familyMentalHealthHistoryEncrypted: string | null;
  substanceUseHistoryEncrypted: string | null;
  traumaHistoryEncrypted: string | null;
  presentingConcernsEncrypted: string | null;
  treatmentGoalsEncrypted: string | null;
  treatmentHistoryEncrypted: string | null;
  currentSymptomsEncrypted: string | null;
  riskAssessmentEncrypted: string | null;
  safetyPlanEncrypted: string | null;
  crisisInterventionPlanEncrypted: string | null;
  notesEncrypted: string | null;
  status: 'active' | 'inactive' | 'discharged';
  createdAt: string;
  updatedAt: string;
}

// Dashboard API Response Types
export interface DashboardData {
  sessions: Session[];
  tasks: Task[];
  clients: Client[];
}

export interface Session {
  id: number;
  userId: number;
  patientId: number;
  date: string;
  notes: string | null;
  sessionClinicalNotes?: string | null;
  duration: number;
  status: string;
  type: string;
  isPaid: boolean;
  paymentId: string | null;
  createdAt: string;
  client?: Client;
}

export interface Task {
  id: number;
  userId: number;
  patientId: number | null;
  sessionId: number | null;
  title: string;
  description: string | null;
  status: string;
  type: string;
  dueDate: string | null;
  createdAt: string;
  completedAt: string | null;
  client?: Client | null;
  session?: Session | null;
  isAutomated?: boolean;
}

// HIPAA-compliant patient interface
export interface Patient {
  id: number;
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
  clinicalNotes: string | null;
  status: string;
  type: string;
  billingType: string;
  sessionCost: string | null;
  noShowFee: string | null;
  stripeCustomerId: string | null;
  race: string | null;
  age: number | null;
  hometown: string | null;
  pronouns: string | null;
  photoFilename: string | null;
  photoOriginalName: string | null;
  photoMimeType: string | null;
  createdAt: string;
  deleted: boolean;
  organizationId: number;
  primaryTherapistId: number;
}

// Client interface (extends Patient for backward compatibility)
// This interface provides field name mappings for existing components
// New code should use Patient interface directly
export interface Client extends Patient {
  // Field mappings for backward compatibility
  email: string | null; // Maps to contactEmail
  phone: string | null; // Maps to contactPhone  
  notes: string | null; // Maps to clinicalNotes
}

// Type Guards
export function isArrayResponse<T>(data: unknown): data is T[] {
  return Array.isArray(data);
}

export function isValidSession(session: unknown): session is Session {
  if (session === null || typeof session !== 'object') return false;
  
  const sessionObj = session as Record<string, unknown>;
  return 'id' in sessionObj && 
         typeof sessionObj.id === 'number' && 
         'date' in sessionObj && 
         typeof sessionObj.date === 'string';
}

export function isValidTask(task: unknown): task is Task {
  if (task === null || typeof task !== 'object') return false;
  
  const taskObj = task as Record<string, unknown>;
  return 'id' in taskObj && 
         typeof taskObj.id === 'number' && 
         'title' in taskObj && 
         typeof taskObj.title === 'string';
}

export function isValidClient(client: unknown): client is Client {
  if (client === null || typeof client !== 'object') return false;
  
  const clientObj = client as Record<string, unknown>;
  return 'id' in clientObj && 
         typeof clientObj.id === 'number' && 
         'name' in clientObj && 
         typeof clientObj.name === 'string';
}