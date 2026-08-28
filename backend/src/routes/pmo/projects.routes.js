import { Router } from 'express';
import {
  getProjects, getProjectById, createProject,
  updateProject, addTeamMembers, removeTeamMember,
  addMilestone, updateMilestone, assignInterns, deleteProject,
} from '../../controllers/pmo/projects.controller.js';
import { protect } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { pmoScope } from '../../middleware/pmoScope.js';
import { auditLog } from '../../middleware/audit.js';

const router = Router();
router.use(protect);
router.use(pmoScope);

router.get('/', requirePermission('Projects', 'read'), getProjects);
router.post('/', requirePermission('Projects', 'create'), auditLog('Create', 'Projects'), createProject);
router.get('/:id', requirePermission('Projects', 'read'), getProjectById);
router.put('/:id', requirePermission('Projects', 'update'), auditLog('Update', 'Projects'), updateProject);
router.delete('/:id', requirePermission('Projects', 'delete'), auditLog('Delete', 'Projects'), deleteProject);

router.post('/:id/team', requirePermission('Projects', 'update'), auditLog('Update', 'Projects'), addTeamMembers);
router.delete('/:id/team/:userId', requirePermission('Projects', 'update'), auditLog('Update', 'Projects'), removeTeamMember);
router.post('/:id/interns', requirePermission('Interns', 'manage'), auditLog('Update', 'Projects'), assignInterns);

router.post('/:id/milestones', requirePermission('Projects', 'update'), auditLog('Update', 'Projects'), addMilestone);
router.patch('/:id/milestones/:milestoneId', requirePermission('Projects', 'update'), auditLog('Update', 'Projects'), updateMilestone);

export default router;
