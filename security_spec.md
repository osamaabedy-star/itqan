# Security Specification for Firestore Rules

## 1. Data Invariants
- Teachers, Classes, Students, Subjects, Skills, Quizzes, Rubrics, and Visits are managed by an administrator.
- Teachers can view all educational data.
- Students can only view their own Quiz Results (though currently the app seems to be an administrative tool).
- External Profiles allow teachers and supervisors to access the system via their ID without a full Google account initial link (handled via the portal).
- Every document must have a `createdBy` field matching the user who created it, or be created by an admin.

## 2. The "Dirty Dozen" Payloads

1. **Identity Spoofing**: Attempt to create a teacher profile with a Different `createdBy` ID than the authenticated user.
2. **Resource Poisoning**: Create an `ExternalProfile` with an ID that is 1MB of junk characters.
3. **RBAC Escalation**: A regular user attempting to save an `ExternalProfile`.
4. **State Shortcutting**: Updating a Quiz status directly from 'draft' to 'published' without being the owner/admin.
5. **Orphaned Write**: Creating a `Student` with a `classId` that does not exist.
6. **PII Leak**: Accessing the `externalProfiles` collection without being authenticated.
7. **Shadow Field**: Adding `isAdmin: true` to a teacher profile update.
8. **Immutable Breach**: Attempting to change the `createdAt` timestamp on an `ExternalProfile`.
9. **Query Scraping**: Listing all `quizResults` without an admin role.
10. **Type Confusion**: Sending an integer for a `name` field in `teachers`.
11. **ID Poisoning**: Requesting `visits/../../../etc/passwd` (though Firestore handles paths, we validate IDs).
12. **Denial of Wallet**: Sending a massive array of 10,000 strings in a `Class.teacherIds` update.

## 3. Test Runner (Conceptual)
The `firestore.rules.test.ts` would verify that all the above unauthorized operations return `PERMISSION_DENIED`.
