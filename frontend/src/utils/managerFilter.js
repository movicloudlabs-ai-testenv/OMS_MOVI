/**
 * Checks whether a user object is eligible to be a Reporting Manager.
 * 
 * Rules:
 * 1. Must not be an Intern (employmentType !== 'Intern', role slug/name !== 'intern').
 * 2. Must not be a regular Employee without a manager/lead level designation.
 * 3. Must not be unrelated HR personnel unless they have a valid Manager role or designation.
 * 4. Must have a Manager-level role (e.g. super-admin, admin, pmo-lead, hr-manager, manager, etc.)
 *    OR a Manager-level designation (e.g. Engineering Manager, Team Lead, PMO Lead, Director, etc.).
 * 5. Cannot be the employee currently being created or edited (checked via currentUserIdOrEmail).
 */
export const isEligibleReportingManager = (user, currentUserIdOrEmail) => {
  if (!user) return false;

  // Exclude self (by ID, _id, or Email)
  if (currentUserIdOrEmail) {
    const checkId = String(currentUserIdOrEmail).toLowerCase().trim();
    if (user._id && String(user._id).toLowerCase().trim() === checkId) return false;
    if (user.id && String(user.id).toLowerCase().trim() === checkId) return false;
    if (user.email && user.email.toLowerCase().trim() === checkId) return false;
  }

  // Exclude soft-deleted or inactive users if status is present
  if (user.status && user.status !== 'Active') return false;

  // Exclude Interns
  const employmentType = (user.employmentType || '').toLowerCase();
  const roleSlug = (user.role?.slug || user.role?.name || user.role || '').toLowerCase();
  const designation = (user.designation || '').toLowerCase();

  if (employmentType === 'intern' || roleSlug === 'intern' || designation.includes('intern')) {
    return false;
  }

  // Manager/Lead Designation check
  const managerDesignationRegex = /manager|lead|director|head|vp|chief|supervisor/i;
  const hasManagerDesignation = Boolean(designation && managerDesignationRegex.test(designation));

  // Manager Role check
  const isManagerRole = [
    'super-admin', 'admin', 'pmo-lead', 'pmo', 'hr-manager', 'manager',
    'project-manager', 'engineering-manager', 'team-lead', 'department-head', 'director'
  ].includes(roleSlug) || (
    (roleSlug.includes('manager') || roleSlug.includes('lead') || roleSlug.includes('director') || roleSlug.includes('head') || roleSlug.includes('admin')) &&
    !['hr', 'hr-executive', 'hr-personnel', 'hr-assistant', 'employee'].includes(roleSlug)
  );

  // Unrelated HR personnel exclusion (roles like hr, hr-executive without manager role or manager designation)
  if (['hr', 'hr-executive', 'hr-personnel', 'hr-assistant'].includes(roleSlug) && !hasManagerDesignation && !roleSlug.includes('manager')) {
    return false;
  }

  // Regular Employee exclusion (roles like employee or blank without manager designation)
  if ((roleSlug === 'employee' || !roleSlug) && !hasManagerDesignation) {
    return false;
  }

  return isManagerRole || hasManagerDesignation;
};

/**
 * Checks whether a user object is eligible to be an HR Manager / Assigned HR contact.
 * 
 * Rules:
 * 1. Must not be an Intern.
 * 2. Must not be a regular non-HR Employee.
 * 3. Must not be a Manager from non-HR departments (e.g., PMO Lead, Admin, Engineering Manager) unless they have an HR role/designation.
 * 4. Must have an HR-related role (hr-manager, hr, hr-executive, etc.) OR an HR-related designation (e.g. HR Manager, HR Executive).
 */
export const isEligibleHRManager = (user) => {
  if (!user) return false;

  // Exclude soft-deleted or inactive users if status is present
  if (user.status && user.status !== 'Active') return false;

  // Exclude Interns
  const employmentType = (user.employmentType || '').toLowerCase();
  const roleSlug = (user.role?.slug || user.role?.name || user.role || '').toLowerCase();
  const designation = (user.designation || '').toLowerCase();

  if (employmentType === 'intern' || roleSlug === 'intern' || designation.includes('intern')) {
    return false;
  }

  // HR Role check
  const isHRRole = [
    'hr-manager', 'hr', 'hr-executive', 'hr-personnel', 'hr-assistant', 'hr-partner'
  ].includes(roleSlug) || roleSlug.includes('hr') || roleSlug.includes('human-resource');

  // HR Designation check
  const isHRDesignation = Boolean(designation && (/\bhr\b/i.test(designation) || /human resource/i.test(designation)));

  return isHRRole || isHRDesignation;
};
