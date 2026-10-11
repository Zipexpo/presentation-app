/**
 * What the external API may reveal about an account. `.select('-password')` still returned the
 * linked Google/Microsoft OAuth tokens and the pending verification/reset tokens.
 */
export const PUBLIC_USER_FIELDS = 'name email username studentId role school faculty cohort emailVerified active profileCompleted createdAt updatedAt';

/** Fields a key holder may change with PUT. Role, verification and linked accounts are not among them. */
export const WRITABLE_USER_FIELDS = ['name', 'studentId', 'school', 'faculty', 'cohort', 'password'];
