/**
 * Status Lifecycle & Segregation of Duties Engine
 */

const STATUS_TRANSITIONS = {
  OPEN: ['IN_PROGRESS', 'ACTION_COMPLETED', 'AI_ANALYSIS_PENDING'],
  IN_PROGRESS: ['ACTION_COMPLETED', 'AI_ANALYSIS_PENDING', 'OPEN'],
  ACTION_COMPLETED: ['AI_ANALYSIS_PENDING', 'PENDING_VERIFICATION', 'IN_PROGRESS'],
  AI_ANALYSIS_PENDING: ['AI_ANALYSIS_COMPLETED', 'FAILED', 'PENDING_VERIFICATION', 'ACTION_COMPLETED'],
  AI_ANALYSIS_COMPLETED: ['PENDING_VERIFICATION', 'ACTION_COMPLETED', 'AI_ANALYSIS_PENDING'],
  PENDING_VERIFICATION: ['CLOSED', 'REOPENED', 'ACTION_COMPLETED', 'AI_ANALYSIS_PENDING'],
  REOPENED: ['IN_PROGRESS', 'ACTION_COMPLETED', 'AI_ANALYSIS_PENDING'],
  CLOSED: ['REOPENED'] // Authorized reopen of closed challenges
};

const ALLOWED_VERIFIER_ROLES = ['superadmin', 'hod', 'supervisor'];

/**
 * Validates whether transition from currentStatus to nextStatus is permissible
 */
function isValidTransition(currentStatus = 'OPEN', nextStatus) {
  if (!nextStatus) return false;
  if (currentStatus === nextStatus) return true;
  const allowedNext = STATUS_TRANSITIONS[currentStatus] || [];
  return allowedNext.includes(nextStatus);
}

/**
 * Validates Segregation of Duties between Responsible Person and Verifier
 */
function validateSegregationOfDuties(challenge, currentUser) {
  if (!currentUser) {
    return {
      allowed: false,
      reason: 'Authentication required. Verifier credentials not provided.'
    };
  }

  // Check if role is permitted
  const userRole = (currentUser.role || 'user').toLowerCase();
  if (!ALLOWED_VERIFIER_ROLES.includes(userRole)) {
    return {
      allowed: false,
      reason: `Unauthorized. Role "${userRole}" is not permitted to perform resolution verification. Required: HOD, Supervisor, or Superadmin.`
    };
  }

  // Superadmin can override unless they were specifically the responsible employee who did the fix
  const isSuperadmin = userRole === 'superadmin';

  // Compare IDs
  const respEmpId = (challenge.responsiblePersonEmployeeId || '').trim().toUpperCase();
  const currentEmpId = (currentUser.employeeId || '').trim().toUpperCase();
  const respUserId = String(challenge.responsiblePersonId || '');
  const currentUserId = String(currentUser._id || currentUser.id || '');
  const respName = (challenge.responsiblePersonName || '').trim().toLowerCase();
  const currentName = (currentUser.name || '').trim().toLowerCase();

  const isSameEmployeeId = respEmpId && currentEmpId && respEmpId === currentEmpId;
  const isSameUserId = respUserId && currentUserId && respUserId === currentUserId;
  const isSameName = respName && currentName && respName === currentName;

  if (isSameEmployeeId || isSameUserId || (!isSuperadmin && isSameName)) {
    return {
      allowed: false,
      reason: 'Independent verification is required. The person responsible for corrective action cannot approve closure.'
    };
  }

  return { allowed: true };
}

module.exports = {
  STATUS_TRANSITIONS,
  ALLOWED_VERIFIER_ROLES,
  isValidTransition,
  validateSegregationOfDuties
};
