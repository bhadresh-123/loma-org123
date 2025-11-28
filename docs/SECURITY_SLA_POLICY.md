# Security Incident Response SLAs

**Document Version:** 1.0  
**Effective Date:** November 4, 2025  
**Review Schedule:** Quarterly  
**Owner:** CTO / Security Lead  
**Classification:** INTERNAL - HIPAA Compliance Document

---

## 1. Purpose & Scope

### 1.1 Purpose

This document defines Service Level Agreements (SLAs) for security incident detection, response, and resolution for LOMA Mental Health Platform in compliance with HIPAA Security Rule § 164.308(a)(6) - Security Incident Procedures.

### 1.2 Scope

This policy applies to all security incidents involving:

- **Protected Health Information (PHI)** - Any breach, unauthorized access, or exposure
- **System Availability** - Outages affecting patient care or business operations
- **Data Integrity** - Unauthorized modification, deletion, or corruption of data
- **Authentication & Access Control** - Unauthorized access attempts or compromised credentials
- **Security Vulnerabilities** - Discovered vulnerabilities requiring remediation
- **Compliance Violations** - HIPAA, data protection, or security policy violations

### 1.3 Applicability

This policy applies to:
- All LOMA employees and contractors
- Business associates with access to LOMA systems
- Third-party service providers (Render.com, Neon Database, etc.)
- Any person or system with access to PHI

---

## 2. Incident Severity Classifications

### 2.1 Critical (P0) - Active Emergency

**Definition:** Active or imminent breach of PHI, complete system failure, or immediate threat to patient safety.

**Impact:** 
- Confirmed or highly likely PHI breach in progress
- Complete service outage affecting patient care
- Immediate risk to patient safety or privacy
- Catastrophic system compromise

**Examples:**
- ✅ Active PHI data breach in progress (confirmed unauthorized access)
- ✅ Complete system outage preventing patient care access
- ✅ Ransomware or malware infection detected
- ✅ Unauthorized administrator or root access detected
- ✅ Database compromise confirmed (unauthorized queries/exports)
- ✅ Encryption key compromise suspected or confirmed
- ✅ Mass data exfiltration detected
- ✅ Confirmed SQL injection or remote code execution exploit

**Immediate Actions Required:**
1. Activate full incident response team
2. Begin containment procedures immediately
3. Notify HIPAA Compliance Officer within 15 minutes
4. Document all actions in incident log
5. Preserve evidence for forensic analysis

---

### 2.2 High (P1) - Urgent Security Risk

**Definition:** Significant security risk with potential for PHI breach, major service degradation, or serious security vulnerability.

**Impact:**
- Potential PHI breach requiring investigation
- Partial system outage or major degradation
- Critical security vulnerability discovered
- Multiple or sustained attack attempts

**Examples:**
- ✅ Multiple failed PHI access attempts from same source (brute force)
- ✅ Authentication system failure or major degradation
- ✅ DDoS attack affecting service performance
- ✅ Business associate breach notification received
- ✅ Critical security vulnerability (CVSS 7.0+) discovered
- ✅ Audit log tampering or deletion detected
- ✅ Suspicious admin account activity (unusual location, time, actions)
- ✅ Failed ransomware/malware attempt (blocked but detected)
- ✅ Insider threat indicators detected
- ✅ PHI accidentally sent to wrong recipient (small scale)

**Immediate Actions Required:**
1. Engage incident response team (on-call engineer + security lead)
2. Begin investigation and containment
3. Notify management within 1 hour
4. Assess breach risk using 4-factor test
5. Prepare for potential escalation to P0

---

### 2.3 Medium (P2) - Moderate Security Risk

**Definition:** Moderate security risk with limited impact, requiring investigation but not immediate containment.

**Impact:**
- Low probability of PHI breach
- Minor service impact or degradation
- Security misconfiguration requiring correction
- Single or isolated security event

**Examples:**
- ✅ Suspicious access patterns detected (automated alerts, may be false positive)
- ✅ Security misconfiguration discovered (minor, no active exploit)
- ✅ Non-PHI data exposure, limited scope (e.g., email addresses)
- ✅ Single failed intrusion attempt (one-time, not sustained)
- ✅ Audit log anomalies requiring investigation
- ✅ Security policy violation (non-critical, training issue)
- ✅ Outdated software component (non-critical, no active exploit)
- ✅ Phishing attempt reported by staff (no credentials compromised)
- ✅ Minor compliance finding during internal review

**Actions Required:**
1. Assign to security team for investigation
2. Investigate within 4 hours
3. Document findings and remediation plan
4. Update security controls if needed

---

### 2.4 Low (P3) - Minor Security Issue

**Definition:** Minor security issue with minimal risk, no immediate threat, routine security maintenance.

**Impact:**
- No PHI risk
- No system impact
- Informational or preventative

**Examples:**
- ✅ Minor security policy violations (documentation, training gaps)
- ✅ Security awareness training compliance tracking
- ✅ Non-urgent security updates or patches available
- ✅ Documentation updates needed for security procedures
- ✅ Routine security review findings (informational)
- ✅ Security best practices recommendations
- ✅ Expired non-critical certificates (not in use)
- ✅ Low-severity dependency updates available

**Actions Required:**
1. Create ticket for security team
2. Address within SLA timeframe (7 days)
3. Update documentation or procedures as needed
4. Include in next security review meeting

---

## 3. Response Time SLAs

### 3.1 SLA Matrix

| Severity | Detection Time | Initial Response | Investigation Complete | Resolution Target | Status Updates |
|----------|---------------|------------------|----------------------|-------------------|----------------|
| **P0 Critical** | Real-time | **< 15 minutes** | **< 1 hour** | **< 4 hours** | Every 30 minutes |
| **P1 High** | **< 5 minutes** | **< 1 hour** | **< 4 hours** | **< 24 hours** | Every 4 hours |
| **P2 Medium** | **< 15 minutes** | **< 4 hours** | **< 24 hours** | **< 72 hours** | Daily |
| **P3 Low** | **< 1 hour** | **< 24 hours** | **< 3 days** | **< 7 days** | As needed |

### 3.2 SLA Definitions

**Detection Time:**
- Time from when incident occurs to when it's detected by monitoring systems or reported
- Measured from earliest evidence in logs/monitoring
- Goal: Minimize dwell time

**Initial Response:**
- Time from detection/notification to incident response team engagement
- Includes: Acknowledgment, initial triage, severity classification
- Goal: Rapid containment

**Investigation Complete:**
- Time from response to root cause determination
- Includes: Analysis, scope assessment, risk evaluation
- Deliverable: Incident report with findings

**Resolution Target:**
- Time from detection to incident fully resolved
- Includes: Remediation, verification, documentation
- Measured by: Threat eliminated, service restored, controls in place

**Status Updates:**
- Frequency of communication to stakeholders during active incident
- Includes: Progress updates, new findings, timeline changes
- Delivered via: Slack (urgent), Email (routine), Phone (critical)

### 3.3 SLA Measurement

**Start Time:**
- Clock starts at **detection or notification**, whichever is earlier
- If incident discovered retroactively, clock starts at discovery time
- Documented in incident log with timestamp

**Stop Time (Resolution):**
- Threat eliminated or contained
- Service restored to normal operation
- Temporary or permanent fix implemented
- Monitoring in place to prevent recurrence
- Post-incident report completed

**SLA Compliance Tracking:**
- All incidents logged in database with timestamps
- Monthly SLA performance reports generated
- SLA misses require documented explanation and corrective action
- Quarterly review of SLA performance and adjustment if needed

---

## 4. Escalation Procedures

### 4.1 Level 1: Initial Response (All Incidents)

**Team:**
- On-call engineer (24/7 rotation)
- Security lead (notified immediately)

**Trigger:**
- Any security incident detected
- Security alert triggered
- Employee security concern reported

**Actions:**
1. **Acknowledge** incident within SLA timeframe
2. **Classify** severity using definitions above
3. **Triage** immediate containment needs
4. **Document** initial findings in incident log
5. **Escalate** if severity is P0 or P1

**Decision Point:** Can this be handled at Level 1, or escalate?
- P2/P3: Usually handled at Level 1
- P0/P1: Immediately escalate to Level 2

---

### 4.2 Level 2: Critical Response (P0, P1)

**Team:**
- Level 1 team (on-call + security lead)
- **+ CTO / Engineering Lead**
- **+ HIPAA Compliance Officer**

**Trigger:**
- P0 (Critical) severity classification
- P1 (High) severity classification
- Level 1 requests escalation

**Actions:**
1. **Activate** full incident response team (all hands on deck)
2. **Contain** threat and prevent further damage
3. **Assess** breach risk using HIPAA 4-factor test:
   - Nature and extent of PHI involved
   - Unauthorized person who accessed PHI
   - Was PHI actually acquired/viewed?
   - To what extent is risk mitigated?
4. **Preserve** evidence for forensic analysis
5. **Notify** stakeholders per notification requirements
6. **Execute** remediation plan
7. **Escalate** to Level 3 if breach confirmed or suspected

**Decision Point:** Is this a potential HIPAA breach?
- **Yes or uncertain:** Escalate to Level 3
- **No (confirmed no PHI involved):** Continue at Level 2

---

### 4.3 Level 3: Executive Response (P0 with Breach)

**Team:**
- Level 2 team (engineering, security, compliance)
- **+ CEO / Executive Leadership**
- **+ Legal Counsel**
- **+ HR Director** (if employee involved)

**Trigger:**
- Confirmed or suspected HIPAA breach
- P0 incident with PHI involvement
- Legal or regulatory implications

**Actions:**
1. **Convene** breach response team meeting (within 1 hour)
2. **Complete** HIPAA 4-factor breach risk assessment
3. **Determine** notification requirements:
   - Affected individuals (< 500 or ≥ 500?)
   - HHS Office for Civil Rights (OCR)
   - Media (if ≥ 500 individuals)
   - Business associates (if applicable)
4. **Prepare** breach notification documentation
5. **Engage** cyber insurance carrier (if applicable)
6. **Coordinate** with legal counsel on regulatory compliance
7. **Escalate** to Level 4 if breach affects ≥ 500 individuals

**Timeline Critical:** HIPAA requires notification within 60 days of discovery

---

### 4.4 Level 4: External Response (Breach ≥ 500 Individuals)

**Team:**
- Level 3 team (executive, legal, compliance)
- **+ External Legal Counsel**
- **+ Public Relations Firm**
- **+ Forensics Firm** (if not already engaged)
- **+ Cyber Insurance Representatives**

**Trigger:**
- Confirmed breach affecting ≥ 500 individuals
- Media attention or public disclosure
- Law enforcement involvement required

**Actions:**
1. **File** HHS OCR breach report via online portal (https://ocrportal.hhs.gov)
   - **Deadline:** Within 60 days of discovery
2. **Send** written notification to all affected individuals
   - **Deadline:** Within 60 days of discovery
   - **Content:** Per HIPAA § 164.404(c) requirements
3. **Issue** media notification (prominent media outlets in affected areas)
   - **Deadline:** Within 60 days of discovery
   - **Method:** Press release, website notice
4. **Coordinate** with law enforcement (FBI, state AG) if criminal activity
5. **Manage** public relations and media inquiries
6. **File** cyber insurance claim
7. **Engage** third-party forensics for investigation
8. **Prepare** for potential regulatory investigation/audit

**Post-Breach Actions:**
- Offer credit monitoring to affected individuals (if applicable)
- Implement corrective action plan
- Update security policies and procedures
- Conduct staff retraining
- Quarterly compliance monitoring (increased frequency)

---

## 5. Notification Requirements

### 5.1 Internal Notifications

| Severity | Who to Notify | Timeframe | Method | Information Provided |
|----------|--------------|-----------|--------|----------------------|
| **P0 Critical** | • On-call engineer<br>• Security lead<br>• CTO<br>• HIPAA Officer<br>• CEO (if breach) | **< 15 min** | • Phone call<br>• Slack alert<br>• Email<br>• SMS | • Incident description<br>• Affected systems<br>• Immediate actions<br>• Status updates every 30 min |
| **P1 High** | • On-call engineer<br>• Security lead<br>• CTO<br>• HIPAA Officer | **< 1 hour** | • Slack alert<br>• Email<br>• Phone (if urgent) | • Incident summary<br>• Potential PHI impact<br>• Investigation status<br>• Updates every 4 hours |
| **P2 Medium** | • On-call engineer<br>• Security lead | **< 4 hours** | • Slack<br>• Email | • Incident details<br>• Investigation plan<br>• Daily updates |
| **P3 Low** | • Security lead | **< 24 hours** | • Email<br>• Ticket system | • Issue description<br>• Remediation plan<br>• Updates as needed |

**Internal Communication Channels:**
- **Phone:** Immediate, P0/P1 emergencies
- **Slack #security-alerts:** Real-time updates, all severities
- **Email:** Formal notifications, documentation
- **Incident Management System:** Central tracking and documentation

---

### 5.2 External Notifications (HIPAA Breach)

#### Breach Notification Rule (45 CFR § 164.404-414)

**Critical Deadline:** **60 days from discovery** (not from when breach occurred)

#### Individual Notification (§ 164.404)

| Affected Individuals | Notification Deadline | Method | Required Content |
|---------------------|---------------------|---------|------------------|
| **< 500 individuals** | 60 days from discovery | **First-class mail** to last known address | • Brief description of breach<br>• Types of PHI involved<br>• Steps individuals should take<br>• What we're doing to investigate<br>• Contact procedures |
| **≥ 500 individuals** | 60 days from discovery | **First-class mail**<br>**+ Media notification** | Same as above |
| **Insufficient contact info** | 60 days from discovery | **Conspicuous website notice**<br>**+ Toll-free number** (90 days) | Same as above |

**Required Content per § 164.404(c):**
1. Brief description of what happened (date of breach, date of discovery)
2. Types of unsecured PHI involved (names, SSNs, medical info, etc.)
3. Steps individuals should take to protect themselves
4. What LOMA is doing to investigate, mitigate harm, prevent recurrence
5. Contact procedures (name, phone, email, address)

**Notification Letter Template:** See Appendix A

---

#### HHS Notification (§ 164.408)

| Breach Size | Notification Deadline | Method | Portal |
|-------------|---------------------|---------|--------|
| **≥ 500 individuals** | **60 days** from discovery | OCR Breach Reporting Portal | https://ocrportal.hhs.gov |
| **< 500 individuals** | **Annually** (within 60 days of year-end) | OCR Breach Reporting Portal | https://ocrportal.hhs.gov |

**Information Required:**
- Name and contact information for organization
- Business associate involved (if applicable)
- Date of breach, date of discovery
- Brief description of breach
- Number of individuals affected
- Types of PHI involved
- Actions taken in response

---

#### Media Notification (§ 164.406)

**Required if:** Breach affects **≥ 500 individuals in same state/jurisdiction**

**Deadline:** 60 days from discovery

**Method:**
- Press release to prominent media outlets
- Website notice on homepage
- Social media notification (if applicable)

**Content:**
- Same information as individual notification
- Contact information for media inquiries
- Reassurance of steps being taken

---

### 5.3 Business Associate Notification (§ 164.410)

**If breach occurs at Business Associate:**
- Business associate must notify LOMA **without unreasonable delay**
- Maximum **60 days** from discovery
- LOMA then notifies individuals (60 days from when BA notifies us)

**If breach occurs at LOMA involving BA data:**
- Notify BA within **24 hours** of discovery
- Provide details needed for BA to fulfill their obligations

---

### 5.4 Notification Exceptions (Not a Breach)

Per § 164.402, notification NOT required if low probability of compromise:

**Exception 1:** Unintentional acquisition/access by authorized person
- Example: Employee accidentally opens wrong patient record, immediately closes

**Exception 2:** Inadvertent disclosure to another authorized person
- Example: Two employees at same covered entity, both authorized

**Exception 3:** Good faith belief PHI cannot be retained
- Example: Recipient confirms immediate deletion, no viewing

**Encrypted PHI:** If encryption key not compromised, not considered breach

**Must document:** Use 4-factor test to assess and document why notification not required

---

## 6. Monitoring & Compliance Metrics

### 6.1 System Monitoring SLAs

| Metric | Target SLA | Measurement Frequency | Alert Threshold | Owner |
|--------|------------|---------------------|-----------------|-------|
| **System Uptime** | 99.9% | Continuous | < 99.9% monthly | DevOps |
| **API Response Time** | < 200ms (p95) | Continuous | > 500ms for 5 min | Engineering |
| **Failed Login Rate** | < 1% of attempts | Continuous | > 5% in 1 hour | Security |
| **Audit Log Success** | 100% | Continuous | < 100% for 1 min | Engineering |
| **Backup Success** | 100% | Daily | Single failure | DevOps |
| **Database Availability** | 99.9% | Continuous | Any downtime | DevOps |
| **Redis Availability** | 99% | Continuous | > 1% downtime | DevOps |
| **PHI Encryption** | 100% | Continuous | < 100% detected | Security |
| **TLS/SSL Certificate** | Valid | Daily | < 30 days to expiry | DevOps |

**Monitoring Tools:**
- Render.com dashboard (uptime, performance)
- Application logs (errors, security events)
- Database monitoring (Neon dashboard)
- Custom audit log monitoring (audit-system.ts)
- Security monitoring (security-monitor.ts)

**Automated Alerts:**
- Slack alerts for all threshold breaches
- Email alerts for daily summaries
- PagerDuty (or similar) for P0/P1 incidents
- Dashboard for real-time visibility

---

### 6.2 Compliance Monitoring SLAs

| Activity | Frequency | Completion SLA | Responsibility | Documentation |
|----------|-----------|----------------|----------------|---------------|
| **Audit Log Review** | Daily | < 24 hours | Security Team | Log review checklist |
| **Failed Access Analysis** | Daily | < 24 hours | Security Team | Access report |
| **Backup Verification** | Daily | < 24 hours | DevOps | Backup log |
| **Backup Restore Test** | Monthly | < 7 days | DevOps | Test report |
| **Access Control Review** | Quarterly | < 5 days | HIPAA Officer | Access audit report |
| **Security Patch Review** | Weekly | < 7 days (critical) | Engineering | Patch log |
| **Security Vulnerability Scan** | Monthly | < 7 days | Security Team | Scan report |
| **Penetration Testing** | Annual | < 30 days | External Firm | Pen test report |
| **Risk Assessment** | Annual | < 30 days | HIPAA Officer | Risk assessment doc |
| **Policy Review & Update** | Annual | < 30 days | Compliance | Policy change log |
| **Staff Security Training** | Annual | < 45 days | HR + Compliance | Training completion cert |
| **Incident Response Drill** | Semi-annual | < 14 days | Security Team | Drill report |

**Compliance Documentation:**
- All activities logged in compliance management system
- Completion certificates retained for 7 years (HIPAA requirement)
- Reports available for audits
- Exceptions require documented justification and remediation plan

---

### 6.3 Security Patch Management

| Patch Type | Assessment SLA | Application SLA | Testing Required | Approval |
|------------|---------------|----------------|------------------|----------|
| **Critical (CVSS 9.0-10.0)** | < 24 hours | **< 7 days** | Limited (priority) | CTO |
| **High (CVSS 7.0-8.9)** | < 3 days | **< 14 days** | Standard | Security Lead |
| **Medium (CVSS 4.0-6.9)** | < 7 days | **< 30 days** | Standard | Engineering Lead |
| **Low (CVSS 0.1-3.9)** | < 14 days | **< 90 days** | Standard | Engineering Lead |

**Patching Process:**
1. **Monitor** security advisories (npm audit, Snyk, Aikido, GitHub Dependabot)
2. **Assess** severity using CVSS scores and exploitability
3. **Test** patches in development/staging environment
4. **Apply** to production within SLA timeframe
5. **Verify** successful application and no regression
6. **Document** in security patch log

**Emergency Patching:** Zero-day exploits or active exploitation = immediate patching (< 24 hours)

---

## 7. Incident Response Procedures

### 7.1 Detection Phase

**Detection Methods:**
1. ✅ Automated monitoring alerts (security-monitor.ts)
2. ✅ Audit log anomaly detection
3. ✅ Failed login threshold alerts
4. ✅ Employee security concern reports
5. ✅ Patient complaints or inquiries
6. ✅ Business associate notifications
7. ✅ Security scan findings
8. ✅ Third-party vulnerability reports
9. ✅ Media reports or public disclosure

**Initial Detection Actions (< 15 minutes for P0/P1):**
- [ ] Log incident timestamp (exact date/time of detection)
- [ ] Document detection method (how was it discovered?)
- [ ] Preserve initial evidence (logs, screenshots, alerts)
- [ ] Classify severity (P0, P1, P2, P3)
- [ ] Notify appropriate team per escalation procedures
- [ ] Create incident record in tracking system

---

### 7.2 Containment Phase

**Immediate Containment (P0/P1 - within 1 hour):**
- [ ] **Isolate** affected systems (disconnect from network if needed)
- [ ] **Disable** compromised accounts or credentials
- [ ] **Block** malicious IP addresses or sources
- [ ] **Preserve** evidence (don't destroy or modify)
- [ ] **Document** all containment actions taken

**Threat-Specific Containment:**

**Ransomware/Malware:**
- Immediately disconnect affected systems from network
- Do NOT pay ransom (per company policy)
- Engage external forensics firm
- Assess backup integrity before restoration

**Unauthorized Access:**
- Force password reset for affected accounts
- Disable compromised accounts
- Review access logs for lateral movement
- Check for backdoors or persistence mechanisms

**Data Breach:**
- Stop ongoing exfiltration (block IPs, disable accounts)
- Identify what data was accessed/copied
- Preserve evidence for breach risk assessment
- Do not delete logs or evidence

**DDoS Attack:**
- Enable DDoS mitigation (Render provides this)
- Identify attack vectors and sources
- Contact hosting provider (Render) for assistance
- Monitor for secondary attacks during mitigation

---

### 7.3 Investigation Phase

**Investigation Objectives:**
1. **Root Cause:** How did incident occur?
2. **Scope:** What systems/data affected?
3. **Timeline:** When did it start? How long?
4. **Attribution:** Who/what was responsible?
5. **Impact:** What damage occurred?

**Investigation Steps:**
- [ ] Review audit logs (audit_logs_hipaa table)
- [ ] Review application logs (server logs)
- [ ] Review access logs (authentication, authorization)
- [ ] Review network logs (if available from Render)
- [ ] Interview relevant personnel
- [ ] Analyze malware/attack artifacts
- [ ] Consult external forensics (if needed)
- [ ] Document findings in incident report

**HIPAA 4-Factor Breach Risk Assessment:**

If PHI potentially involved, assess using these factors:

**Factor 1: Nature and Extent of PHI**
- What types of PHI? (Names, SSNs, diagnoses, session notes, etc.)
- How many records/individuals affected?
- How sensitive is the PHI? (High: SSN, diagnoses; Low: names only)

**Factor 2: Unauthorized Person**
- Who accessed/received the PHI?
- Relationship to covered entity? (Employee, business associate, public)
- Likelihood they understood it was PHI?

**Factor 3: Was PHI Actually Acquired/Viewed?**
- Evidence of actual viewing or copying?
- Or was it just "accessible" but not proven viewed?
- Duration of potential exposure?

**Factor 4: Extent Risk is Mitigated**
- Remedial actions taken?
- Confidentiality agreements obtained?
- PHI recovered or confirmed deleted?
- Encryption or other technical safeguards?

**Outcome:** Low, Medium, or High probability of compromise
- **Low:** Notification likely not required (document rationale)
- **Medium/High:** Notification required (proceed to notification phase)

---

### 7.4 Remediation Phase

**Remediation Actions:**
- [ ] **Fix** root cause vulnerability
- [ ] **Update** security controls to prevent recurrence
- [ ] **Deploy** patches or configuration changes
- [ ] **Test** that fix is effective
- [ ] **Monitor** for re-occurrence
- [ ] **Document** remediation steps and verification

**Common Remediation Actions:**

| Incident Type | Remediation Actions |
|--------------|---------------------|
| **Unauthorized Access** | • Reset passwords<br>• Enable MFA<br>• Review and update access controls<br>• Audit all account permissions |
| **Malware/Ransomware** | • Restore from clean backups<br>• Rebuild affected systems<br>• Update antimalware definitions<br>• Patch vulnerabilities |
| **Data Breach** | • Enhanced encryption<br>• Data loss prevention (DLP) controls<br>• Access logging improvements<br>• User training |
| **Vulnerability Exploit** | • Apply security patches<br>• Update dependencies<br>• Code review and remediation<br>• Penetration testing |
| **Insider Threat** | • Revoke access immediately<br>• HR investigation<br>• Policy enforcement<br>• Enhanced monitoring |

---

### 7.5 Recovery Phase

**Recovery Objectives:**
- [ ] Restore normal operations
- [ ] Verify system integrity
- [ ] Resume normal security posture
- [ ] Confirm no lingering threats

**Recovery Steps:**
- [ ] **Restore** services from clean backups (if needed)
- [ ] **Verify** data integrity and completeness
- [ ] **Test** application functionality
- [ ] **Monitor** for unusual activity (24-48 hours)
- [ ] **Communicate** with users that service is restored
- [ ] **Resume** normal operations

**Post-Recovery Monitoring (Enhanced - 30 days):**
- Increased log monitoring frequency
- Daily manual review of audit logs
- Anomaly detection sensitivity increased
- Weekly security posture reviews
- Direct communication with Render/Neon support

---

### 7.6 Post-Incident Phase

**Post-Incident Review Meeting (Within 7 days of resolution):**

**Attendees:**
- Incident response team
- Engineering leadership
- HIPAA Compliance Officer
- Executive leadership (for P0/P1)

**Agenda:**
1. **Timeline Review:** What happened and when?
2. **Root Cause:** Why did it happen?
3. **Response Evaluation:** What went well? What didn't?
4. **SLA Performance:** Did we meet our SLAs?
5. **Lessons Learned:** What can we improve?
6. **Action Items:** Concrete steps to prevent recurrence

**Deliverables:**
- [ ] Post-incident report (detailed)
- [ ] Executive summary (1-page)
- [ ] Action items with owners and deadlines
- [ ] Policy/procedure updates (if needed)
- [ ] Training updates (if needed)
- [ ] Security control enhancements

**Continuous Improvement:**
- Update incident response procedures based on lessons learned
- Enhance monitoring and detection capabilities
- Improve communication and escalation procedures
- Conduct tabletop exercises to test improvements
- Share learnings with broader team (anonymized if needed)

---

## 8. Documentation Requirements

### 8.1 Incident Log (All Incidents)

**Required Information:**
- [ ] Incident ID (UUID)
- [ ] Severity classification (P0, P1, P2, P3)
- [ ] Discovery date and time
- [ ] Detection method
- [ ] Reporter name and contact
- [ ] Affected systems/applications
- [ ] Affected data (PHI involvement?)
- [ ] Number of individuals affected (if applicable)
- [ ] Timeline of events
- [ ] Actions taken (containment, investigation, remediation)
- [ ] Response team members
- [ ] Resolution date and time
- [ ] Root cause
- [ ] Lessons learned

**Storage:** Database (`security_incidents` table) + File system (incident reports)

**Retention:** 7 years (HIPAA requirement: 6 years, we do 7 for safety)

---

### 8.2 Breach Documentation (If HIPAA Breach)

**Additional Required Information:**
- [ ] HIPAA 4-factor breach risk assessment (completed)
- [ ] Number of individuals affected (exact count)
- [ ] Types of unsecured PHI involved (detailed list)
- [ ] Notification timeline and methods
- [ ] Individual notification proof (certified mail receipts)
- [ ] HHS notification confirmation (OCR portal submission)
- [ ] Media notification proof (if ≥ 500 individuals)
- [ ] Remediation actions taken
- [ ] Policy/procedure updates resulting from breach
- [ ] Post-breach monitoring plan

**Regulatory Reporting:**
- HHS OCR breach report (https://ocrportal.hhs.gov)
- Cyber insurance claim (if applicable)
- State Attorney General (if required by state breach laws)
- Other regulators (if applicable)

---

### 8.3 Document Templates

**Templates Available:**
- Incident Report Template (Appendix A)
- Breach Notification Letter Template (Appendix B)
- HIPAA 4-Factor Risk Assessment Template (Appendix C)
- Post-Incident Review Template (Appendix D)

**Document Location:** `docs/templates/incident-response/`

---

## 9. Contact Information

### 9.1 Internal Security Team

| Role | Name | Email | Phone | Availability |
|------|------|-------|-------|--------------|
| **CTO / Security Lead** | [TO BE FILLED] | [EMAIL] | [PHONE] | 24/7 on-call |
| **HIPAA Compliance Officer** | [TO BE FILLED] | [EMAIL] | [PHONE] | Business hours (M-F 9-5 PT) + Emergency |
| **Lead Engineer** | [TO BE FILLED] | [EMAIL] | [PHONE] | 24/7 on-call rotation |
| **DevOps Lead** | [TO BE FILLED] | [EMAIL] | [PHONE] | 24/7 on-call rotation |
| **CEO** | [TO BE FILLED] | [EMAIL] | [PHONE] | Emergency only (P0 with breach) |
| **Legal Counsel** | [TO BE FILLED] | [EMAIL] | [PHONE] | Business hours + Emergency |

**On-Call Schedule:** Maintained in PagerDuty (or similar) with rotation schedule

**Emergency Contact Tree:**
1. On-call engineer (primary)
2. Security lead (escalation)
3. CTO (if levels 1-2 unavailable)

---

### 9.2 External Service Providers

| Service Provider | Purpose | Contact | Documentation | Response Time |
|-----------------|---------|---------|---------------|---------------|
| **Render.com** | Infrastructure hosting, load balancing, TLS | • Dashboard: https://dashboard.render.com<br>• Support: support@render.com<br>• Emergency: Use dashboard ticket | https://render.com/docs | • Critical: < 1 hour<br>• High: < 4 hours |
| **Neon Database** | PostgreSQL database hosting, backups | • Console: https://console.neon.tech<br>• Support: support@neon.tech<br>• Docs: https://neon.tech/docs | https://neon.tech/docs | • Critical: < 1 hour<br>• High: < 4 hours |
| **Stripe** | Payment processing | • Dashboard: https://dashboard.stripe.com<br>• Support: https://support.stripe.com | https://stripe.com/docs | • Critical: < 2 hours<br>• Standard: < 24 hours |
| **Aikido Security** | Security scanning and monitoring | • Dashboard: https://app.aikido.dev<br>• Support: support@aikido.dev | https://docs.aikido.dev | • Business hours |

**Business Associate Agreements (BAA):**
- ✅ Render.com - BAA on file
- ✅ Neon Database - BAA on file
- ❌ Stripe - Not required (not accessing PHI)
- ❌ Aikido - Not required (scanning code, not PHI)

---

### 9.3 External Resources (Emergency)

| Resource Type | Provider | Contact | When to Use |
|--------------|----------|---------|-------------|
| **Cyber Insurance** | [PROVIDER NAME]<br>[POLICY #] | [PHONE]<br>[EMAIL]<br>[CLAIM PORTAL] | Any P0/P1 incident, especially confirmed breach |
| **External Forensics** | [FIRM NAME] | [PHONE - 24/7]<br>[EMAIL] | P0 breach, malware/ransomware, complex investigations |
| **Legal Counsel (External)** | [LAW FIRM] | [PHONE]<br>[EMAIL] | Breach notification, regulatory response, major incidents |
| **PR Firm** | [FIRM NAME] | [PHONE]<br>[EMAIL] | Breach ≥ 500 individuals, media attention, public disclosure |
| **HHS Office for Civil Rights (OCR)** | U.S. Department of Health and Human Services | • Portal: https://ocrportal.hhs.gov<br>• Phone: 1-800-368-1019<br>• Email: OCRComplaint@hhs.gov | HIPAA breach notification (≥ 500: within 60 days) |

---

### 9.4 Emergency After-Hours Procedures

**If incident occurs after business hours (M-F 5pm-9am PT, weekends, holidays):**

1. **Automated Alerts:**
   - Security monitoring system sends alerts to on-call engineer (PagerDuty)
   - Critical alerts (P0) escalate automatically if not acknowledged within 5 minutes

2. **Manual Reporting:**
   - Employees: Call on-call engineer directly (number in company directory)
   - If on-call unavailable: Call security lead
   - If both unavailable: Call CTO

3. **Escalation Path:**
   - On-call engineer → Security lead → CTO → CEO (if P0 with breach)

4. **Acknowledgment:**
   - On-call must acknowledge receipt within 15 minutes for P0, 1 hour for P1

---

## 10. Compliance & Review

### 10.1 Regulatory Compliance

This SLA policy is designed to comply with:

**HIPAA Security Rule:**
- § 164.308(a)(1)(ii)(D) - Information System Activity Review
- § 164.308(a)(6) - Security Incident Procedures
- § 164.308(a)(6)(ii) - Response and Reporting

**HIPAA Breach Notification Rule:**
- § 164.404 - Notification to Individuals
- § 164.406 - Notification to Media
- § 164.408 - Notification to Secretary (HHS OCR)
- § 164.410 - Notification by Business Associate

**HITECH Act:**
- Breach notification requirements (60-day deadline)
- Enhanced penalties for willful neglect

**State Breach Notification Laws:**
- California (CMIA, CCPA): Additional notification requirements
- Other states: Compliance as applicable

---

### 10.2 SLA Performance Tracking

**Monthly Metrics (Report due by 5th of following month):**
- Total incidents by severity (P0, P1, P2, P3)
- SLA compliance rate by metric (detection, response, resolution)
- Number of SLA misses with explanations
- Average response time by severity
- Average resolution time by severity
- Incident types and trends

**Dashboard Access:**
- Real-time SLA performance dashboard available to security team
- Monthly reports to executive leadership
- Quarterly reports to board (if applicable)

**SLA Miss Procedure:**
1. Document reason for SLA miss in incident report
2. Assess whether SLA is too aggressive (adjust if needed)
3. Identify process improvements to prevent future misses
4. Implement corrective actions
5. Track in next monthly report

---

### 10.3 Review & Update Schedule

| Review Type | Frequency | Owner | Deliverable |
|------------|-----------|-------|-------------|
| **SLA Performance Review** | Monthly | Security Lead | SLA performance report |
| **Post-Incident Review** | After each P0/P1 | Incident Commander | Post-incident report |
| **SLA Policy Review** | Quarterly | HIPAA Officer | Policy update (if needed) |
| **Comprehensive Security Review** | Annual | CTO + HIPAA Officer | Security assessment report |
| **Incident Response Drill** | Semi-annual | Security Team | Drill report + improvements |

**Triggers for Immediate Review:**
- Multiple SLA misses in same month
- Confirmed HIPAA breach
- Major regulatory change
- Significant infrastructure change
- Post-incident finding of policy inadequacy

**Update Process:**
1. Draft proposed changes to SLA policy
2. Review with security team and stakeholders
3. Legal and compliance review
4. Executive approval (CTO + CEO)
5. Communicate changes to all staff
6. Update training materials
7. Document version history

---

### 10.4 Continuous Improvement

**Lessons Learned Process:**
- Every P0/P1 incident → Post-incident review meeting
- Document what worked and what didn't
- Create actionable improvement items with owners
- Track improvement items to completion
- Measure effectiveness of improvements

**Security Maturity Roadmap:**
- Year 1: Establish baseline, document procedures, train team
- Year 2: Enhance monitoring, automate responses, improve SLAs
- Year 3: Advanced threat detection, predictive analytics, industry leadership

**Training & Drills:**
- Annual security awareness training (all staff)
- Quarterly security updates (new threats, policy changes)
- Semi-annual incident response drills (tabletop exercises)
- Annual simulated breach exercise (red team)

---

## 11. Appendices

### Appendix A: Incident Report Template

*(See separate document: `docs/templates/incident-response/incident-report-template.md`)*

### Appendix B: Breach Notification Letter Template

*(See separate document: `docs/templates/incident-response/breach-notification-letter-template.md`)*

### Appendix C: HIPAA 4-Factor Risk Assessment Template

*(See separate document: `docs/templates/incident-response/breach-risk-assessment-template.md`)*

### Appendix D: Post-Incident Review Template

*(See separate document: `docs/templates/incident-response/post-incident-review-template.md`)*

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | November 4, 2025 | CTO / Security Lead | Initial SLA policy creation for HIPAA 1.4.5 compliance |

---

## Approval

**Prepared By:**  
[NAME], CTO / Security Lead  
Date: November 4, 2025

**Reviewed By:**  
[NAME], HIPAA Compliance Officer  
Date: [TO BE FILLED]

**Approved By:**  
[NAME], CEO  
Date: [TO BE FILLED]

---

**Next Review Date:** February 4, 2026 (Quarterly)

**Document Classification:** INTERNAL - HIPAA Compliance Document  
**Retention:** 7 years from date of retirement (HIPAA requirement)

---

*This document is maintained as part of LOMA Mental Health Platform's HIPAA compliance program and is subject to regular review and updates. For questions or concerns, contact the HIPAA Compliance Officer.*










