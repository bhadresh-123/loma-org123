/**
 * Clinical Document Templates
 * 
 * HIPAA-compliant document templates for mental health practices.
 * Includes placeholders for customization: {{therapist_name}}, {{practice_name}}, etc.
 */

export interface ClinicalDocumentTemplate {
  type: string;
  title: string;
  content: string;
  category: string;
}

// ============================================================================
// INTAKE FORM
// ============================================================================

export const INTAKE_FORM: ClinicalDocumentTemplate = {
  type: 'intake_form',
  title: 'Psychological Health Intake Questionnaire',
  category: 'intake-docs',
  content: `# Psychological Health Intake Questionnaire

**Date:** __________

## 1. Basic Information

- **Full Name:** ______________________________
- **DOB (MM/DD/YYYY):** __________ | **Age:** ____
- **Phone:** ___________________ | **Email:** ___________________
- **Emergency Contact (Name/Phone/Relationship):** ___________________________________

## 2. Presenting Concerns

- **Main Reason for Seeking Therapy:**
    
    ---
    
- **When did you first notice these concerns?**
    
    ---
    
- **Previous Treatment (if any):**
    
    ---
    

## 3. Current Symptoms (Check All That Apply)

- Mood (Depression, Anxiety, Irritability)
- Sleep/Appetite Changes
- Relationship or Family Issues
- Trauma/Stress (PTSD, Recent Loss)
- Other: ______________________________________

## 4. Mental Health & Medical

- **Prior Diagnoses or Hospitalizations:**
    
    ---
    
- **Medications (Psychiatric & Other):**
    
    ---
    
- **Physical Health Conditions:**
    
    ---
    

## 5. Substance Use

- **Alcohol/Drug Use:**
    
    ---
    
- **Other Addictive Behaviors:**
    
    ---
    

## 6. Safety & Risk

- **Suicidal Thoughts/History:**
    
    ---
    
- **Harm to Others/Violence History:**
    
    ---
    
- **Access to Weapons:**
    
    ---
    

## 7. Goals for Therapy

---

## 8. Additional Information

---

**Client Signature:** _________________________ **Date:** __________

**Therapist:** {{therapist_name}} | **Practice:** {{practice_name}}`
};

// ============================================================================
// INFORMED CONSENT
// ============================================================================

export const INFORMED_CONSENT: ClinicalDocumentTemplate = {
  type: 'informed_consent',
  title: 'Informed Consent for Treatment',
  category: 'intake-docs',
  content: `# Informed Consent for Psychotherapy Services

**Therapist:** {{therapist_name}}  
**Practice:** {{practice_name}}  
**Date:** __________

## Welcome

I am pleased that you have chosen to work with me. This document provides important information about my professional services and business policies. Please read it carefully and note any questions you may have so we can discuss them at our next meeting.

## Nature of Psychotherapy

Psychotherapy is a collaborative process between therapist and client. It can have both benefits and risks. Benefits may include improved relationships, reduced distress, and solutions to specific problems. However, psychotherapy also requires discussing difficult aspects of your life, which may cause uncomfortable feelings like sadness, guilt, anxiety, anger, frustration, loneliness, or helplessness.

There are no guarantees about what will happen in therapy. However, I will work with you to develop and implement treatment goals that address your specific needs.

## Confidentiality

The information you share in therapy is confidential and will not be released without your written consent, except in the following situations required or permitted by law:

1. **Danger to Self or Others:** If I believe you are in imminent danger of harming yourself or another person, I am required to take protective actions.

2. **Child or Elder Abuse:** If I have reasonable cause to suspect abuse or neglect of a child, elderly person, or dependent adult, I am required to file a report with the appropriate authorities.

3. **Court Orders:** If a court of law issues a subpoena, I may be required to provide information. I will assert privilege and confidentiality on your behalf when legally appropriate.

4. **Insurance/Managed Care:** If you use insurance benefits, I may be required to provide clinical information to your insurance company for payment purposes.

## Sessions and Fees

- **Session Length:** Sessions are typically 50 minutes
- **Fee:** {{session_fee}} per session
- **Insurance:** {{insurance_information}}
- **Payment:** Payment is due at the time of service unless other arrangements have been made

## Cancellation Policy

If you need to cancel or reschedule an appointment, please provide at least 24 hours notice. Late cancellations or missed appointments may be charged the full session fee and are typically not covered by insurance.

**Cancellation Fee:** {{cancellation_fee}}

## Emergency Procedures

I am often not immediately available by telephone. I do not provide crisis services. If you are experiencing a mental health emergency:

- **Call 911** or go to your nearest emergency room
- **National Suicide Prevention Lifeline:** 988 or 1-800-273-8255
- **Crisis Text Line:** Text HOME to 741741

For non-emergency matters, leave a message and I will return your call within 24 business hours.

## Professional Records

I maintain clinical records including your presenting concerns, diagnosis, treatment plan, progress notes, and billing information. These records are kept in a secure, encrypted system in compliance with HIPAA regulations. You may review or receive a copy of your records upon request, except in limited circumstances.

## Termination of Treatment

You have the right to terminate therapy at any time. I ask that you discuss termination with me first to ensure a proper conclusion to our work together. I may terminate our therapeutic relationship if I believe I cannot provide adequate care or if treatment is no longer benefiting you. In such cases, I will provide referrals to other providers.

## Client Rights

You have the right to:
- Considerate, respectful care
- Receive information about your diagnosis, treatment options, and prognosis
- Refuse any treatment recommendation
- Privacy of your records
- Review your clinical records
- Obtain a second opinion
- File a complaint with the appropriate licensing board

## Consent

By signing below, you acknowledge that you have read, understood, and agree to the policies outlined in this document. You have had the opportunity to ask questions and receive clarification.

---

**Client Name (Print):** _____________________________

**Client Signature:** _____________________________ **Date:** __________

**Parent/Guardian Signature (if minor):** _____________________________ **Date:** __________

**Therapist Signature:** {{therapist_name}} **Date:** __________`
};

// ============================================================================
// PRIVACY POLICY / NOTICE OF PRIVACY PRACTICES
// ============================================================================

export const PRIVACY_POLICY: ClinicalDocumentTemplate = {
  type: 'privacy_policy',
  title: 'Notice of Privacy Practices',
  category: 'intake-docs',
  content: `# Notice of Privacy Practices

**Effective Date:** {{effective_date}}  
**Practice:** {{practice_name}}  
**Therapist:** {{therapist_name}}

## Your Rights Regarding Your Health Information

This notice describes how medical/psychological information about you may be used and disclosed and how you can access this information. Please review it carefully.

## Our Commitment to Your Privacy

We are committed to protecting the privacy of your personal health information (PHI). We are required by law to:

1. Maintain the privacy of your protected health information
2. Provide you with this notice of our legal duties and privacy practices
3. Follow the terms of the notice currently in effect
4. Notify you if we are unable to agree to a requested restriction
5. Accommodate reasonable requests to communicate health information by alternative means or locations

## How We May Use and Disclose Health Information

**Treatment:** We may use your health information to provide you with psychological treatment or services. We may disclose your health information to other providers involved in your care.

**Payment:** We may use and disclose your health information to bill and collect payment for services. This may include contacting your insurance company to verify coverage or determine benefits.

**Healthcare Operations:** We may use your health information for healthcare operations such as quality assessment, training, and compliance activities.

**Other Uses:** We may use or disclose your health information in the following situations without your authorization:
- As required by law (court orders, subpoenas)
- For public health activities (reporting abuse, disease outbreaks)
- For health oversight activities (audits, investigations)
- In response to lawsuits or legal disputes
- To avert a serious threat to health or safety

## Uses and Disclosures Requiring Your Authorization

**Marketing Communications:** We will not use your health information for marketing purposes without your written authorization.

**Sale of PHI:** We will not sell your health information without your authorization.

**Psychotherapy Notes:** Certain psychotherapy notes require your authorization for use or disclosure, with limited exceptions.

**Other Uses:** Other uses and disclosures not described in this notice will be made only with your written authorization. You may revoke your authorization at any time in writing.

## Your Rights Regarding Your Health Information

You have the following rights regarding your protected health information:

**Right to Request Restrictions:** You may request restrictions on how we use or disclose your information. We are not required to agree to these restrictions, but if we do, we will honor them.

**Right to Confidential Communications:** You may request that we communicate with you in a certain way or at a certain location.

**Right to Inspect and Copy:** You have the right to inspect and obtain a copy of your health information. We may charge a reasonable fee for copying and mailing costs.

**Right to Amend:** If you believe your health information is incorrect or incomplete, you may request an amendment. We may deny your request in certain circumstances.

**Right to an Accounting of Disclosures:** You have the right to receive a list of certain disclosures we have made of your health information.

**Right to a Paper Copy:** You have the right to receive a paper copy of this notice upon request.

**Right to File a Complaint:** If you believe your privacy rights have been violated, you may file a complaint with:
- Our practice
- The U.S. Department of Health and Human Services

You will not be retaliated against for filing a complaint.

## How We Protect Your Information

We maintain physical, electronic, and procedural safeguards to protect your health information:
- Encrypted electronic health records
- Secure, password-protected systems
- Limited access to authorized personnel only
- Regular security audits and training
- HIPAA-compliant data storage

## Changes to This Notice

We reserve the right to change this notice. Any changes will apply to health information we already have as well as information we receive in the future. We will post the current notice in our office and on our website.

## Questions or Concerns

If you have questions about this notice or concerns about your privacy, please contact:

**{{practice_name}}**  
**{{therapist_name}}**  
**Phone:** {{phone_number}}  
**Email:** {{email_address}}

---

## Acknowledgment of Receipt

I acknowledge that I have received a copy of the Notice of Privacy Practices.

**Client Name (Print):** _____________________________

**Client Signature:** _____________________________ **Date:** __________

**Parent/Guardian Signature (if minor):** _____________________________ **Date:** __________`
};

// ============================================================================
// HIPAA NOTICE
// ============================================================================

export const HIPAA_NOTICE: ClinicalDocumentTemplate = {
  type: 'hipaa_notice',
  title: 'HIPAA Authorization for Use and Disclosure',
  category: 'intake-docs',
  content: `# HIPAA Authorization for Use and Disclosure of Protected Health Information

**Client Name:** _____________________________  
**Date of Birth:** __________  
**Practice:** {{practice_name}}  
**Therapist:** {{therapist_name}}

## Purpose of This Authorization

This form allows you to authorize the use and disclosure of your protected health information (PHI) for purposes beyond treatment, payment, and healthcare operations.

## Your Rights Under HIPAA

As a healthcare consumer, you have the following rights under the Health Insurance Portability and Accountability Act (HIPAA):

1. **Right to Privacy:** Your health information is private and protected by federal law
2. **Right to Access:** You can view and obtain copies of your health records
3. **Right to Amendment:** You can request corrections to your health information
4. **Right to an Accounting:** You can receive a list of certain disclosures of your information
5. **Right to Request Restrictions:** You can ask for limits on how your information is used
6. **Right to Confidential Communication:** You can request how and where we contact you
7. **Right to File a Complaint:** You can file a complaint if you believe your rights were violated

## Standard Uses and Disclosures

We may use and disclose your health information WITHOUT your separate authorization for:

**Treatment:** Coordinating your care with other healthcare providers

**Payment:** Billing insurance companies and processing claims

**Healthcare Operations:** Quality improvement, training, and compliance activities

## Uses Requiring Your Authorization

The following uses of your health information require your specific written authorization:

- Marketing communications
- Sale of your health information
- Most uses of psychotherapy notes
- Research studies
- Disclosures to family members or friends (unless emergency)
- Employment or disability evaluations
- Legal proceedings (unless subpoenaed)

## Authorization for Specific Disclosures

I authorize {{practice_name}} and {{therapist_name}} to disclose my protected health information to the following individuals or entities:

**Name/Entity:** _____________________________  
**Purpose:** _____________________________  
**Information to be Disclosed:** _____________________________  
**Expiration Date:** __________

---

**Name/Entity:** _____________________________  
**Purpose:** _____________________________  
**Information to be Disclosed:** _____________________________  
**Expiration Date:** __________

---

## Your Right to Revoke

You have the right to revoke this authorization at any time by submitting a written request. However, revocation will not affect any disclosures already made in reliance on your authorization.

## Limitations on Confidentiality

Please be aware that confidentiality cannot be maintained in the following circumstances:

1. **Imminent Danger:** If you pose a serious threat of violence to yourself or another person
2. **Child Abuse:** Suspected abuse or neglect of a child under 18 years
3. **Elder Abuse:** Suspected abuse or neglect of an adult 65 or older
4. **Dependent Adult Abuse:** Suspected abuse of a dependent adult (18-64 with disabilities)
5. **Court Orders:** Valid court orders or subpoenas
6. **Workers' Compensation:** If your treatment is part of a workers' compensation claim

## Electronic Health Records

We maintain electronic health records that are:
- Encrypted using AES-256 encryption
- Stored on HIPAA-compliant, secure servers
- Accessible only to authorized personnel
- Protected by multiple layers of security
- Backed up regularly with encrypted backups

## Data Breach Notification

In the unlikely event of a data breach affecting your protected health information, we will notify you promptly as required by HIPAA regulations.

## Questions or Complaints

If you have questions about your HIPAA rights or wish to file a complaint, contact:

**Privacy Officer:** {{therapist_name}}  
**Phone:** {{phone_number}}  
**Email:** {{email_address}}

You may also file a complaint with:
**U.S. Department of Health and Human Services**  
**Office for Civil Rights**  
**Website:** www.hhs.gov/ocr/privacy/hipaa/complaints/

You will not be retaliated against for filing a complaint.

---

## Client Acknowledgment and Consent

By signing below, I acknowledge that:
- I have read and understood this HIPAA authorization
- I have received a copy of the Notice of Privacy Practices
- I understand my rights regarding my protected health information
- I understand the limitations on confidentiality
- I authorize the uses and disclosures specified above

**Client Name (Print):** _____________________________

**Client Signature:** _____________________________ **Date:** __________

**Parent/Guardian Signature (if minor):** _____________________________ **Date:** __________

**Witness Signature:** _____________________________ **Date:** __________`
};

// ============================================================================
// TELEHEALTH CONSENT
// ============================================================================

export const TELEHEALTH_CONSENT: ClinicalDocumentTemplate = {
  type: 'telehealth_consent',
  title: 'Telehealth Consent Form',
  category: 'intake-docs',
  content: `# Informed Consent for Telehealth Services

**Client Name:** _____________________________  
**Date of Birth:** __________  
**Practice:** {{practice_name}}  
**Therapist:** {{therapist_name}}  
**Date:** __________

## What is Telehealth?

Telehealth (also called telemedicine or teletherapy) involves the delivery of mental health services using interactive audio, video, or other electronic communications. This includes consultation, treatment, transfer of medical data, and education using technology such as telephone, video conferencing, or internet-based applications.

## Benefits of Telehealth

- Access to care from any location with internet connectivity
- Reduced travel time and costs
- Increased convenience and flexibility
- Continuity of care when in-person sessions are not possible
- Ability to receive services while traveling or relocated
- Reduced exposure to contagious illnesses

## Potential Risks and Limitations

While telehealth services can be effective, there are some potential risks:

**Technology Issues:**
- Internet connection failures or disruptions
- Software/hardware malfunctions
- Audio or video quality problems
- Technology learning curve

**Privacy and Security:**
- Potential (though unlikely) security breaches
- Unauthorized access to private sessions
- Someone overhearing your session from your location

**Clinical Limitations:**
- Inability to provide in-person physical assessments
- Limited ability to respond to emergencies
- Difficulty reading non-verbal cues
- Not appropriate for severe mental health crises

## Technology Requirements

To participate in telehealth sessions, you will need:
- A device with camera and microphone (computer, tablet, or smartphone)
- Reliable high-speed internet connection
- Current web browser or required application
- Private, quiet space for sessions
- {{platform_name}} platform access

## Your Responsibilities

As a telehealth client, you agree to:

1. **Private Location:** Participate from a private, quiet location free from distractions
2. **Reliable Technology:** Ensure your technology is working properly before sessions
3. **Emergency Information:** Provide your current physical location and emergency contact at the beginning of each session
4. **Compliance:** Follow treatment recommendations and complete assigned activities
5. **Communication:** Inform me immediately if you feel telehealth is not meeting your needs

## My Responsibilities as Your Therapist

I agree to:

1. **Competency:** Maintain appropriate training and competency in telehealth delivery
2. **Privacy:** Conduct sessions from a private, secure location
3. **Technology:** Use secure, HIPAA-compliant technology platforms
4. **Licensure:** Only provide services within states where I am licensed
5. **Emergency Planning:** Maintain emergency protocols and resources

## Privacy and Security Measures

We take your privacy seriously and implement multiple safeguards:

**Platform Security:**
- End-to-end encryption for all sessions
- HIPAA-compliant video conferencing platform
- Password-protected meetings
- Secure data transmission
- No session recordings (unless explicitly agreed upon)

**Your Security:**
- Use a private location for sessions
- Secure your device with password protection
- Use a secure internet connection (not public WiFi)
- Close other applications during sessions
- Be mindful of who may be nearby during sessions

## Confidentiality

The same confidentiality agreements that apply to in-person therapy apply to telehealth services, with the following additions:

- Sessions may be interrupted by technology failures
- There is a rare possibility of security breaches despite safeguards
- I cannot control who may be present at your location during sessions
- I will verify your identity at the beginning of each session

Confidentiality will be broken only in the circumstances outlined in the Informed Consent for Treatment.

## Emergency Procedures

Telehealth is not appropriate for emergency situations. If you are experiencing a mental health emergency:

1. **Call 911** immediately or go to your nearest emergency room
2. **National Suicide Prevention Lifeline:** 988 or 1-800-273-8255
3. **Crisis Text Line:** Text HOME to 741741
4. Contact your local mobile crisis team

**Emergency Contact Information:**

**Your Current Address:** _____________________________

**Emergency Contact Name:** _____________________________

**Emergency Contact Phone:** _____________________________

**Local Emergency Services:** 911

## Session Interruptions

If a telehealth session is interrupted due to technology problems:

1. I will attempt to reconnect via the same platform
2. If unable to reconnect within 5 minutes, I will call you at: _______________
3. We will resume the session or reschedule if needed
4. You will only be charged for the portion of the session completed

## Scheduling and Fees

- **Session Fee:** {{session_fee}} (same as in-person sessions)
- **Late Cancellation Fee:** {{cancellation_fee}} (with less than 24 hours notice)
- **Insurance Coverage:** Please check with your insurance provider regarding telehealth coverage
- **Payment:** Due at time of service

## State Licensure and Jurisdiction

I am licensed to practice in the following state(s): {{license_states}}

I can only provide telehealth services to clients who are physically located in states where I am licensed. You must inform me of your physical location at the beginning of each session. Services cannot be provided if you are located outside of my licensed states.

## Professional Standards

I adhere to the same professional, ethical, and legal standards for telehealth services as I do for in-person services, including:
- American Psychological Association (APA) guidelines
- State licensing board regulations  
- HIPAA privacy and security requirements
- Professional liability insurance coverage

## Consent to Treatment

By signing below, I acknowledge and agree to the following:

- [ ] I have read and understand this Telehealth Consent Form
- [ ] I have had the opportunity to ask questions and receive clarification
- [ ] I understand the benefits and risks of telehealth services
- [ ] I understand that I can withdraw consent for telehealth at any time
- [ ] I understand that telehealth is not appropriate for emergency situations
- [ ] I consent to receive mental health services via telehealth
- [ ] I have been provided with emergency procedures and contact information
- [ ] I understand the technology requirements and my responsibilities
- [ ] I understand the privacy and security measures in place
- [ ] I will provide my current location and emergency contact at each session

---

**Client Name (Print):** _____________________________

**Client Signature:** _____________________________ **Date:** __________

**Parent/Guardian Signature (if minor):** _____________________________ **Date:** __________

**Therapist Signature:** {{therapist_name}} **Date:** __________

---

## For Minors (Under 18)

If the client is a minor, the parent/guardian must also consent:

**Parent/Guardian Name (Print):** _____________________________

**Relationship to Client:** _____________________________

**Parent/Guardian Signature:** _____________________________ **Date:** __________

---

**Questions or Concerns?**

If you have any questions about telehealth services or this consent form, please contact:

**{{practice_name}}**  
**{{therapist_name}}**  
**Phone:** {{phone_number}}  
**Email:** {{email_address}}`
};

// ============================================================================
// EXPORT ALL TEMPLATES
// ============================================================================

export const ALL_CLINICAL_TEMPLATES: ClinicalDocumentTemplate[] = [
  INTAKE_FORM,
  INFORMED_CONSENT,
  PRIVACY_POLICY,
  HIPAA_NOTICE,
  TELEHEALTH_CONSENT,
];

export default ALL_CLINICAL_TEMPLATES;

