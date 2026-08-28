import User from '../models/User.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';

/**
 * Self-healing cleanup for soft-deleted users.
 *
 * The delete-user cascade strips a user from project rosters and flags their
 * tasks at delete time — but any users deleted *before* that cascade existed
 * still linger in Project.team / Project.interns and on open Tasks, so they
 * keep showing up in team views and reassignment pickers.
 *
 * This runs on startup (idempotent + cheap): once references are gone, the
 * lookup query matches nothing and it's a no-op.
 */
export async function scrubDeletedUserRefs() {
  try {
    const deleted = await User.find({ deletedAt: { $exists: true } }).select('_id');
    if (!deleted.length) return;

    const ids = deleted.map((d) => d._id);
    const idSet = new Set(ids.map((i) => i.toString()));

    // Remove deleted users from every project team / intern roster
    const projects = await Project.find({
      $or: [{ 'team.user': { $in: ids } }, { 'interns.user': { $in: ids } }],
    });

    let cleanedProjects = 0;
    for (const p of projects) {
      const beforeTeam = p.team.length;
      const beforeInterns = p.interns.length;
      p.team = p.team.filter((t) => t.user && !idSet.has(t.user.toString()));
      p.interns = p.interns.filter((i) => i.user && !idSet.has(i.user.toString()));
      if (p.team.length !== beforeTeam || p.interns.length !== beforeInterns) {
        await p.save({ validateBeforeSave: false });
        cleanedProjects++;
      }
    }

    // Flag their still-open tasks for reassignment (clear the dead assignee)
    const taskRes = await Task.updateMany(
      { assignedTo: { $in: ids }, status: { $ne: 'Done' } },
      { $set: { assignedTo: null, needsReassignment: true } }
    );

    if (cleanedProjects || taskRes.modifiedCount) {
      console.log(
        `🧹 scrubDeletedUserRefs: cleaned ${cleanedProjects} project roster(s) and ${taskRes.modifiedCount} task(s) referencing deleted users`
      );
    }
  } catch (err) {
    console.error('scrubDeletedUserRefs failed:', err.message);
  }
}
