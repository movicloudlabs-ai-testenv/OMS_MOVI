import ChatChannel from '../models/ChatChannel.js';
import ChatMessage from '../models/ChatMessage.js';
import Project from '../models/Project.js';
import User from '../models/User.js';

export const DEFAULT_COMPANY_CHANNELS = [
  { id: '#general', name: 'general', displayName: '#general', topic: 'Company-wide updates & team communications', channelType: 'company', isPrivate: false },
];

/**
 * Ensures standard enterprise company channel exists in DB and purges empty mock channels.
 */
export const ensureDefaultChannels = async () => {
  try {
    // Seed standard #general
    for (const ch of DEFAULT_COMPANY_CHANNELS) {
      await ChatChannel.findOneAndUpdate(
        { channelId: ch.id },
        {
          $setOnInsert: {
            channelId: ch.id,
            name: ch.name,
            displayName: ch.displayName,
            topic: ch.topic,
            channelType: 'company',
            isPrivate: false,
          },
        },
        { upsert: true, new: true }
      );
    }

    // Clean up empty mock channels if they have no messages
    const mockChannelIds = ['#operations', '#pmo-sync', '#engineering'];
    for (const mockId of mockChannelIds) {
      const msgCount = await ChatMessage.countDocuments({ channel: mockId });
      if (msgCount === 0) {
        await ChatChannel.deleteOne({ channelId: mockId });
      }
    }
  } catch (err) {
    console.error('Failed to seed default chat channels:', err.message);
  }
};

/**
 * Records that a user has read all messages in a channel up to now.
 */
export const markChannelAsRead = async (channelId, userId) => {
  try {
    const now = new Date();
    // Update read receipt in channel
    await ChatChannel.findOneAndUpdate(
      { channelId, 'readReceipts.user': userId },
      { $set: { 'readReceipts.$.lastReadAt': now } }
    );
    // If user wasn't in readReceipts, push them
    await ChatChannel.findOneAndUpdate(
      { channelId, 'readReceipts.user': { $ne: userId } },
      { $push: { readReceipts: { user: userId, lastReadAt: now } } }
    );
    // Also update in members array if present
    await ChatChannel.findOneAndUpdate(
      { channelId, 'members.user': userId },
      { $set: { 'members.$.lastReadAt': now } }
    );
  } catch (err) {
    console.error('Failed to mark channel read:', err.message);
  }
};

/**
 * Generates standardized channelId for a project.
 */
export const getProjectChannelId = (project) => {
  return `prj_${project._id.toString()}`;
};

/**
 * Provisions a dedicated chat channel for a newly created or existing project.
 */
export const provisionProjectChannel = async (project, initialTeam = [], creatorId = null) => {
  try {
    const channelId = getProjectChannelId(project);
    const code = project.code || 'PRJ';
    const displayName = `[${code}] ${project.name}`;

    // Build unique roster
    const memberMap = new Map();

    if (project.manager) {
      const mgrId = (project.manager._id || project.manager).toString();
      memberMap.set(mgrId, { user: mgrId, role: 'Project Manager' });
    }

    if (project.hrManager) {
      const hrId = (project.hrManager._id || project.hrManager).toString();
      memberMap.set(hrId, { user: hrId, role: 'HR Manager' });
    }

    // Automatically synchronize all active HR managers into project group chat
    try {
      const hrUsers = await User.find({ status: 'Active' })
        .populate({ path: 'role', match: { slug: { $in: ['hr-manager', 'hr'] } } })
        .select('name role department')
        .lean();
      for (const hr of hrUsers) {
        if (hr.role && hr._id) {
          const hrId = hr._id.toString();
          if (!memberMap.has(hrId)) {
            memberMap.set(hrId, { user: hrId, role: 'HR Manager' });
          }
        }
      }
    } catch (e) {
      console.warn('Failed to auto-enroll HR users in project channel:', e.message);
    }

    if (creatorId) {
      const cId = creatorId.toString();
      if (!memberMap.has(cId)) {
        memberMap.set(cId, { user: cId, role: 'Owner' });
      }
    }

    const teamList = initialTeam.length > 0 ? initialTeam : (project.team || []);
    for (const t of teamList) {
      const uId = (t.user?._id || t.user || t.userId)?.toString();
      if (uId && !memberMap.has(uId)) {
        memberMap.set(uId, {
          user: uId,
          role: t.role || 'Developer',
          joinedAt: t.addedAt || new Date(),
        });
      }
    }

    if (project.interns && Array.isArray(project.interns)) {
      for (const intern of project.interns) {
        const uId = (intern.user?._id || intern.user)?.toString();
        if (uId && !memberMap.has(uId)) {
          memberMap.set(uId, {
            user: uId,
            role: 'Intern',
            joinedAt: intern.addedAt || new Date(),
          });
        }
      }
    }

    const members = Array.from(memberMap.values());

    let channel = await ChatChannel.findOne({ channelId });
    const isNew = !channel;

    if (isNew) {
      channel = await ChatChannel.create({
        channelId,
        name: project.name,
        displayName,
        topic: project.description || `Official team channel for ${project.name}`,
        channelType: 'project',
        project: project._id,
        isPrivate: true,
        members,
        createdBy: creatorId || project.manager,
      });

      // Post initial welcome system message
      const senderId = creatorId || project.manager;
      await ChatMessage.create({
        channel: channelId,
        sender: senderId,
        message: `🚀 Project workspace initiated for "${project.name}" (${code}). All assigned team members have been automatically enrolled.`,
        messageType: 'system',
      });
    } else {
      channel.displayName = displayName;
      channel.name = project.name;
      channel.members = members;
      await channel.save();
    }

    return channel;
  } catch (err) {
    console.error(`Failed to provision project channel for ${project.name}:`, err);
    return null;
  }
};

/**
 * Synchronizes team membership when members are added, updated, or removed from a project.
 */
export const syncProjectTeamMembers = async ({
  projectId,
  addedMembers = [],
  removedUserIds = [],
  performedBy = null,
}) => {
  try {
    const project = await Project.findById(projectId);
    if (!project) return;

    const channelId = getProjectChannelId(project);
    let channel = await ChatChannel.findOne({ channelId });

    if (!channel) {
      channel = await provisionProjectChannel(project, project.team, performedBy?._id);
    }

    let performerName = performedBy?.name || 'PMO';

    // Handle added members
    for (const m of addedMembers) {
      const uId = (m.user?._id || m.user || m.userId)?.toString();
      if (!uId) continue;

      const existingIdx = channel.members.findIndex((cm) => cm.user?.toString() === uId);
      const targetRole = m.role || 'Team Member';

      if (existingIdx === -1) {
        channel.members.push({
          user: uId,
          role: targetRole,
          joinedAt: new Date(),
        });

        const targetUser = await User.findById(uId).select('name');
        const memberName = targetUser?.name || 'A team member';

        // Log system message in project channel
        await ChatMessage.create({
          channel: channelId,
          sender: performedBy?._id || channel.createdBy || uId,
          message: `🤖 ${memberName} (${targetRole}) was added to the project channel by ${performerName}.`,
          messageType: 'system',
        });
      } else {
        channel.members[existingIdx].role = targetRole;
      }
    }

    // Handle removed members
    for (const rId of removedUserIds) {
      const uId = rId.toString();
      const initialCount = channel.members.length;
      channel.members = channel.members.filter((cm) => cm.user?.toString() !== uId);

      if (channel.members.length !== initialCount) {
        const targetUser = await User.findById(uId).select('name');
        const memberName = targetUser?.name || 'A team member';

        // Log system message in project channel
        await ChatMessage.create({
          channel: channelId,
          sender: performedBy?._id || channel.createdBy || uId,
          message: `🤖 ${memberName} was unassigned from the project team by ${performerName}.`,
          messageType: 'system',
        });
      }
    }

    await channel.save();
  } catch (err) {
    console.error('Failed to sync project team members to chat channel:', err);
  }
};

/**
 * Backfills channels for all existing projects in DB if they do not yet exist.
 */
export const syncExistingProjects = async () => {
  try {
    await ensureDefaultChannels();

    // Query active HR managers
    let activeHrIds = [];
    try {
      const hrUsers = await User.find({ status: 'Active' })
        .populate({ path: 'role', match: { slug: { $in: ['hr-manager', 'hr'] } } })
        .select('name role department')
        .lean();
      activeHrIds = hrUsers.filter((u) => u.role != null).map((u) => u._id.toString());
    } catch (_) {}

    const projects = await Project.find({}).populate('manager').lean();
    for (const p of projects) {
      const channelId = getProjectChannelId(p);
      let channel = await ChatChannel.findOne({ channelId });
      if (!channel) {
        await provisionProjectChannel(p, p.team || [], p.manager?._id);
      } else if (activeHrIds.length > 0) {
        let changed = false;
        for (const hrId of activeHrIds) {
          const exists = channel.members.some((m) => m.user?.toString() === hrId);
          if (!exists) {
            channel.members.push({
              user: hrId,
              role: 'HR Manager',
              joinedAt: new Date(),
            });
            changed = true;
          }
        }
        if (changed) {
          await channel.save();
        }
      }
    }
  } catch (err) {
    console.error('Error during chat channels backfill:', err.message);
  }
};
