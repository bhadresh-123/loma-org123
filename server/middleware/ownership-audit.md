# Resource Ownership Audit - Complete Database Analysis

## Direct User Ownership (userId field)
1. **users** - Self-owned resources
2. **onboardingProgress** - userId reference
3. **licenses** - userId reference  
4. **businessRegistrations** - userId reference
5. **userSettings** - userId reference (unique)
6. **meetingTypes** - userId reference
7. **meetings** - userId reference
8. **calendarBlocks** - userId reference
9. **workSchedules** - userId reference
10. **taskCategories** - userId reference
11. **tasks** - userId reference (also has clientId/sessionId)
12. **documents** - userId reference (also has clientId)
13. **treatmentPlans** - userId reference (also has clientId)
14. **forms** - userId reference
15. **chatMessages** - userId reference (also has clientId)
16. **notificationSettings** - userId reference (unique)
17. **notifications** - userId reference
18. **clients** - userId reference (PRIMARY OWNERSHIP ROOT)

## Indirect User Ownership (via client relationship)
1. **insuranceInfo** - owned via clientId → clients.userId
2. **sessions** - owned via clientId → clients.userId (also has direct userId but nullable)
3. **sessionDocuments** - owned via sessionId → sessions.clientId → clients.userId
4. **sessionAssessments** - owned via sessionId → sessions.clientId → clients.userId

## Global/System Resources (no user ownership)
1. **documentTemplates** - System-wide templates
2. **psychologicalAssessments** - System-wide assessment definitions

## Complex Ownership Patterns
1. **tasks** - Can be owned via userId OR clientId OR sessionId
2. **documents** - Direct userId AND clientId (dual ownership validation)
3. **treatmentPlans** - Direct userId AND clientId (dual ownership validation)
4. **sessions** - Has nullable userId + required clientId (client ownership primary)

## Security Vulnerabilities Identified
1. **Sessions table** - userId is nullable, creates ownership ambiguity
2. **Bulk operations** - No ownership scoping in list endpoints
3. **Cascade operations** - Deleting clients doesn't verify user ownership
4. **Cross-reference attacks** - No validation when linking entities
5. **Pagination queries** - No user scoping on large datasets

## Implementation Priority
**CRITICAL**: clients, sessions, tasks, documents, treatmentPlans
**HIGH**: notifications, chatMessages, workSchedules, forms
**MEDIUM**: calendarBlocks, meetingTypes, meetings, userSettings
**LOW**: onboardingProgress, licenses, businessRegistrations