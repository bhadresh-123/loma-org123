# Security Incident Response SLA

**Document Version:** 1.0  
**Last Updated:** November 4, 2025  
**Status:** Active  
**Compliance:** HIPAA 1.4.1 Administrative Safeguards

---

## Overview

This document defines Service Level Agreements (SLAs) for security incident response at Loma. These SLAs ensure timely investigation, response, and resolution of security incidents in compliance with HIPAA requirements.

**Scope:** All security incidents affecting Protected Health Information (PHI), system availability, or data integrity.

---

## Incident Severity Levels

### Critical (P0)
**Definition:**
- Active breach of PHI affecting 500+ individuals
- Complete system outage affecting PHI access
- Ongoing unauthorized access to PHI database
- Ransomware or malware affecting PHI systems
- Data exfiltration in progress

**Business Impact:** Immediate threat to PHI security, potential HIPAA breach notification required

### High (P1)
**Definition:**
- Suspected PHI breach affecting 50-499 individuals
- Partial system outage affecting critical functions
- Successful unauthorized access attempt (contained)
- DDoS attack affecting service availability
- Critical security vulnerability discovered in production

**Business Impact:** Significant security risk, potential compliance impact

### Medium (P2)
**Definition:**
- Security incident affecting 1-49 individuals
- Minor system degradation
- Failed attack attempts with high frequency
- Non-critical security vulnerability discovered
- Suspicious activity requiring investigation

**Business Impact:** Moderate security risk, limited compliance impact

### Low (P3)
**Definition:**
- Isolated failed login attempts
- False positive security alerts
- Minor policy violations
- Informational security events
- Routine security monitoring alerts

**Business Impact:** Minimal security risk, no compliance impact

---

## Response Time SLAs

| Severity | Initial Response | Investigation Complete | Resolution Target | Notification Required |
|----------|-----------------|------------------------|-------------------|----------------------|
| **Critical (P0)** | 15 minutes | 1 hour | 4 hours | Immediate (internal + affected parties) |
| **High (P1)** | 1 hour | 4 hours | 24 hours | Within 4 hours (internal) |
| **Medium (P2)** | 4 hours | 24 hours | 5 business days | Within 24 hours (internal) |
| **Low (P3)** | 24 hours | 5 business days | 10 business days | As needed |

### SLA Definitions

**Initial Response:**
- Incident acknowledged by on-call engineer
- Incident response team notified
- Preliminary assessment started
- Status update provided

**Investigation Complete:**
- Root cause identified
- Scope of incident determined
- Affected systems/users identified
- Impact assessment completed
- Containment measures implemented

**Resolution Target:**
- Incident fully resolved or mitigated
- Systems restored to normal operation
- Security controls validated
- Post-incident review scheduled
- Documentation completed

---

## Response Procedures

### Critical Incidents (P0)

**Immediate Actions (0-15 minutes):**
1. Acknowledge alert and notify incident commander
2. Assemble incident response team
3. Initiate incident log (case number, discovery time, discoverer)
4. Begin containment actions if breach is in progress
5. Send initial notification to stakeholders

**Investigation Phase (15 minutes - 1 hour):**
1. Identify affected systems and data
2. Determine number of individuals affected
3. Assess if PHI was compromised
4. Document all findings in incident log
5. Implement containment measures
6. Preserve evidence for forensics

**Resolution Phase (1-4 hours):**
1. Execute remediation plan
2. Validate security controls
3. Restore affected systems
4. Verify no ongoing threat
5. Begin breach risk assessment (if applicable)
6. Prepare for potential breach notification

**Post-Incident (Within 24 hours):**
1. Complete incident documentation
2. Conduct post-incident review
3. Update security controls
4. File breach report if required (within 60 days of discovery)

### High Incidents (P1)

**Initial Response (0-1 hour):**
1. Acknowledge and classify incident
2. Notify security team and relevant stakeholders
3. Begin investigation
4. Document initial findings

**Investigation Phase (1-4 hours):**
1. Complete root cause analysis
2. Assess scope and impact
3. Implement containment
4. Preserve logs and evidence

**Resolution Phase (4-24 hours):**
1. Execute remediation plan
2. Test and validate fixes
3. Monitor for recurrence
4. Update documentation

**Post-Incident (Within 5 days):**
1. Post-incident review meeting
2. Update runbooks and procedures
3. Implement preventive measures

### Medium Incidents (P2)

**Initial Response (0-4 hours):**
1. Acknowledge and log incident
2. Assign to security team member
3. Begin investigation

**Investigation Phase (4-24 hours):**
1. Investigate and document findings
2. Assess impact and risk
3. Develop remediation plan

**Resolution Phase (1-5 business days):**
1. Implement fixes
2. Validate resolution
3. Update security monitoring

**Post-Incident (Within 10 days):**
1. Document lessons learned
2. Update security policies if needed

### Low Incidents (P3)

**Response (Within 24 hours):**
1. Log and categorize event
2. Review for patterns or trends
3. Take action only if pattern emerges

**Resolution (As needed):**
1. Address if part of larger pattern
2. Update alerting thresholds if false positive
3. Document for trend analysis

---

## Escalation Procedures

### When to Escalate

**Immediate Escalation (Critical):**
- PHI breach confirmed or suspected
- Active attack in progress
- System compromise detected
- Multiple systems affected
- Media attention or public disclosure

**Standard Escalation (High):**
- Incident not contained within SLA timeframe
- Additional resources needed
- Cross-functional coordination required
- Potential compliance impact

### Escalation Chain

**Level 1: On-Call Engineer**
- Initial response and triage
- Basic containment actions
- Incident logging

**Level 2: Security Team Lead**
- Complex investigations
- Coordination of response
- Resource allocation

**Level 3: CTO / Engineering Director**
- Critical incidents
- Business continuity decisions
- Executive notifications

**Level 4: CEO / Legal Counsel**
- Breach notification decisions
- Legal/regulatory compliance
- External communications

---

## Notification Requirements

### Internal Notifications

**Critical Incidents:**
- Immediate: Security team, CTO, CEO
- Within 15 minutes: Legal counsel, compliance officer
- Within 1 hour: All affected department heads

**High Incidents:**
- Within 1 hour: Security team, CTO
- Within 4 hours: Compliance officer, legal (if needed)

**Medium/Low Incidents:**
- Security team only (immediate)
- Weekly summary to management

### External Notifications

**HIPAA Breach (≥500 individuals):**
- Affected individuals: Within 60 days
- HHS OCR: Within 60 days
- Media: Within 60 days

**HIPAA Breach (<500 individuals):**
- Affected individuals: Within 60 days
- HHS OCR: Annual notification

**Business Associates:**
- Within 60 days of discovery (if BA caused breach)
- Immediate if ongoing threat

---

## Automated Response Actions

The SecurityMonitor system automatically implements the following responses:

### Critical Severity
- **IP Blocking:** Block source IP for 24 hours
- **Session Termination:** Terminate all user sessions (if user-related)
- **Email Alert:** Immediate notification to security team
- **Recommendation:** Investigate immediately, consider law enforcement

### High Severity
- **IP Throttling:** Rate limit source IP for 1 hour
- **Email Alert:** Notification to security team
- **Recommendation:** Investigate within 1 hour, monitor for escalation

### Medium Severity
- **Enhanced Monitoring:** Increase monitoring for 30 minutes
- **Logging:** Detailed logging of suspicious activity
- **Recommendation:** Monitor for escalation, review within 4 hours

### Low Severity
- **Logging Only:** Standard audit logging
- **Recommendation:** Log for trend analysis

---

## Metrics and Reporting

### SLA Performance Tracking

**Measured Metrics:**
- Time to initial response (target vs. actual)
- Time to investigation completion (target vs. actual)
- Time to resolution (target vs. actual)
- SLA compliance rate (% incidents meeting SLA)
- False positive rate
- Repeat incidents rate

**Reporting Frequency:**
- Real-time: Active incident status
- Daily: Critical/High incident summary
- Weekly: All incidents summary + SLA compliance
- Monthly: Trend analysis + SLA performance report
- Quarterly: Executive summary + recommendations

### Performance Targets

**SLA Compliance Rate:** ≥95% for all severity levels
**Mean Time to Detect (MTTD):** <30 minutes
**Mean Time to Respond (MTTR):** <1 hour (Critical), <4 hours (High)
**Mean Time to Resolve (MTTR):** <4 hours (Critical), <24 hours (High)
**False Positive Rate:** <10%

---

## Continuous Improvement

### Post-Incident Reviews

**Required for:**
- All Critical incidents
- All High incidents
- Medium incidents with unusual characteristics
- Any incident exceeding SLA targets

**Review Timeline:**
- Within 48 hours of incident resolution

**Review Agenda:**
1. Incident timeline and response
2. What went well
3. What could be improved
4. Action items for prevention
5. SLA performance assessment
6. Updates to runbooks/procedures

### Quarterly SLA Review

**Objectives:**
1. Assess SLA performance trends
2. Review incident patterns
3. Evaluate resource allocation
4. Update SLAs if needed
5. Plan security improvements

---

## Related Documentation

- **Breach Response Plan:** `ENGINEERING_TASKS_MINIMUM_VIABLE_COMPLIANCE.md` (Section: Breach Response)
- **Logging and Monitoring:** `docs/HIPAA_LOGGING_MONITORING.md`
- **Security Monitoring:** `server/utils/security-monitor.ts`
- **Audit Logging:** `server/middleware/audit-logging.ts`
- **HIPAA Compliance Checklist:** `security-reports/HIPAA-Compliance-Checklist.md`

---

## Environment Configuration

### Email Alerting (Optional)

To enable email notifications for security incidents, configure:

```env
# Security Alert Email Configuration
SECURITY_ALERT_EMAIL=security-team@yourdomain.com

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=alerts@yourdomain.com
SMTP_PASS=your-app-password
SMTP_FROM=alerts@yourdomain.com
```

**Note:** Email alerting is optional. If not configured, alerts will still be logged to console and audit logs.

---

## SLA Exceptions

### Exceptions to SLA Targets

**Accepted Reasons:**
- Force majeure (natural disasters, etc.)
- Coordinated large-scale attacks
- Third-party vendor outages
- Planned maintenance windows (with notification)

**Exception Process:**
1. Document reason for SLA miss
2. Incident commander approval required
3. Include in post-incident review
4. Report in monthly SLA summary

### Best-Effort Basis

As an early-stage startup, these SLAs represent our best-effort commitment to timely incident response. We continuously work to improve our response times and capabilities as we grow.

---

## Document Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| CTO | [NAME] | [SIGNATURE] | [DATE] |
| Compliance Officer | [NAME] | [SIGNATURE] | [DATE] |
| Legal Counsel | [NAME] | [SIGNATURE] | [DATE] |

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | November 4, 2025 | AI Implementation | Initial SLA documentation for HIPAA 1.4.1 compliance |

---

## Contact Information

**Security Incident Hotline:** [PHONE NUMBER]  
**Email:** security-incidents@loma.health  
**On-Call Engineer:** [CONTACT INFO]  

**Emergency Contacts:**
- CTO: [CONTACT]
- Compliance Officer: [CONTACT]
- Legal Counsel: [CONTACT]

---

*This document satisfies HIPAA 1.4.1 requirements for "Configured SLAs to Resolve Issues"*

