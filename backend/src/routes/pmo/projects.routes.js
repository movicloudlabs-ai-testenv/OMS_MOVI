import { Router } from 'express';
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  changeProjectLead,
  deleteProject,
  addTeamMembers,
  removeTeamMember,
  assignInterns,
  addMilestone,
  updateMilestone,
  recordDeployment,
  addCredential,
  revealCredential,
  deleteCredential,
  getProjectBugs,
  createProjectBug,
  resolveProjectBug,
  reopenProjectBug,
  addProjectBugComment,
  getProjectActivity,
} from '../../controllers/pmo/projects.controller.js';
import {
  getProjectSprints,
  createSprint,
  startSprint,
  completeSprint,
  getProjectKanban,
  moveTaskStatus,
} from '../../controllers/pmo/sprints.controller.js';
import { getProjectGantt } from '../../controllers/pmo/gantt.controller.js';
import { protect } from '../../middleware/auth.js';
import { requirePermission } from '../../middleware/rbac.js';
import { pmoScope } from '../../middleware/pmoScope.js';

const router = Router();
router.use(protect);
router.use(pmoScope);

// Project Core CRUD
router.get('/', requirePermission('Projects', 'read'), getProjects);
router.post('/', requirePermission('Projects', 'create'), createProject);
router.get('/:id', requirePermission('Projects', 'read'), getProjectById);
router.put('/:id', requirePermission('Projects', 'update'), updateProject);
router.patch('/:id/lead', requirePermission('Projects', 'update'), changeProjectLead);
router.delete('/:id', requirePermission('Projects', 'delete'), deleteProject);

// Team & Interns
router.post('/:id/team', requirePermission('Projects', 'update'), addTeamMembers);
router.delete('/:id/team/:userId', requirePermission('Projects', 'update'), removeTeamMember);
router.post('/:id/interns', requirePermission('Interns', 'manage'), assignInterns);

// Milestones & Roadmap
router.post('/:id/milestones', requirePermission('Projects', 'update'), addMilestone);
router.patch('/:id/milestones/:milestoneId', requirePermission('Projects', 'update'), updateMilestone);

// Deployments (Append-only History)
router.post('/:id/deployments', requirePermission('Projects', 'update'), recordDeployment);

// Credentials Vault (AES-256-GCM Encrypted at rest)
router.post('/:id/credentials', requirePermission('Projects', 'update'), addCredential);
router.post('/:id/credentials/:credId/reveal', revealCredential);
router.delete('/:id/credentials/:credId', requirePermission('Projects', 'update'), deleteCredential);

// Bug Resolution Matrix (SLA, Solver Forensics, Commits/PRs)
router.get('/:id/bugs', requirePermission('Projects', 'read'), getProjectBugs);
router.post('/:id/bugs', requirePermission('Projects', 'update'), createProjectBug);
router.patch('/:id/bugs/:bugId/resolve', requirePermission('Projects', 'update'), resolveProjectBug);
router.patch('/:id/bugs/:bugId/reopen', requirePermission('Projects', 'update'), reopenProjectBug);
router.post('/:id/bugs/:bugId/comments', requirePermission('Projects', 'read'), addProjectBugComment);

// Live Activity Feed
router.get('/:id/activity', requirePermission('Projects', 'read'), getProjectActivity);

// Agile Sprints & Cycles Engine (Option A)
router.get('/:id/sprints', requirePermission('Projects', 'read'), getProjectSprints);
router.post('/:id/sprints', requirePermission('Projects', 'update'), createSprint);
router.patch('/:id/sprints/:sprintId/start', requirePermission('Projects', 'update'), startSprint);
router.patch('/:id/sprints/:sprintId/complete', requirePermission('Projects', 'update'), completeSprint);

// Interactive Kanban Board (Option A)
router.get('/:id/kanban', requirePermission('Projects', 'read'), getProjectKanban);
router.patch('/:id/tasks/:taskId/status', requirePermission('Projects', 'update'), moveTaskStatus);

// Interactive Gantt & Critical Path Analysis (Option D)
router.get('/:id/gantt', requirePermission('Projects', 'read'), getProjectGantt);

export default router;
