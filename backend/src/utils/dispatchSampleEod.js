import 'dotenv/config';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import Role from '../models/Role.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import ChatChannel from '../models/ChatChannel.js';
import ChatMessage from '../models/ChatMessage.js';
import EODReport from '../models/EODReport.js';

async function dispatchSampleEOD() {
  try {
    await connectDB();
    console.log('Connected to MongoDB.');

    // 1. Find an active employee/lead user
    const user = await User.findOne({
      isActive: { $ne: false },
      email: { $ne: 'system@movi.com' },
    }).populate('role');

    if (!user) {
      console.error('No active user found in database!');
      process.exit(1);
    }

    console.log(`Using active user: ${user.name} (${user.email}, Role: ${user.role?.name || 'Employee'})`);

    // 2. Find their project or any active project
    let project = await Project.findOne({
      $or: [
        { manager: user._id },
        { 'team.user': user._id },
        { status: 'In Progress' },
      ],
    });

    if (!project) {
      project = await Project.findOne();
    }

    const projectName = project ? project.name : 'Enterprise Workspace';
    console.log(`Active Project: ${projectName}`);

    // 3. Find real tasks assigned to user or project
    const tasks = await Task.find({
      $or: [
        { assignedTo: user._id },
        ...(project ? [{ project: project._id }] : []),
      ],
    }).limit(3);

    const taskSummaries = tasks.length > 0
      ? tasks.map((t, idx) => `${idx + 1}. [${t.code || 'TSK'}] ${t.title} (${t.status || 'Done'})`).join('\n')
      : '1. Implemented End-of-Day report synchronization module\n2. Connected real-time chat broadcast and interactive card views\n3. Verified responsive multi-channel dispatch';

    // Clean up any EOD messages from #general
    const delRes = await ChatMessage.deleteMany({ channel: '#general', messageType: 'eod_report' });
    if (delRes.deletedCount > 0) {
      console.log(`Cleaned up ${delRes.deletedCount} EOD report(s) from #general`);
      const lastGeneralMsg = await ChatMessage.findOne({ channel: '#general' }).sort({ createdAt: -1 });
      if (lastGeneralMsg) {
        await ChatChannel.updateOne(
          { channelId: '#general' },
          {
            $set: {
              lastMessage: {
                message: lastGeneralMsg.message,
                sender: lastGeneralMsg.sender,
                createdAt: lastGeneralMsg.createdAt,
              },
            },
          }
        );
      }
    }

    // 4. Find broadcast channel: STRICTLY the user's particular project channel
    let channels = [];
    if (project) {
      const prjChannel = await ChatChannel.findOne({
        $or: [
          { project: project._id },
          { channelId: `prj_${project._id}` },
          { name: project.name },
        ],
      });
      if (prjChannel) channels.push(prjChannel);
    }

    if (channels.length === 0) {
      console.error('No project channel found for project:', project?.name);
      process.exit(1);
    }

    console.log(`Targeting project channel exclusively:`, channels.map(c => c.channelId || c.name));

    // 5. Build EOD Report Content
    const today = new Date().toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
    const todayYMD = new Date().toISOString().slice(0, 10);

    const reportMsg = [
      `📋 *EOD Report — ${user.name}* | ${today}`,
      `⏱ *Hours Logged:* 8h 15m (7h 45m net after break)`,
      `✅ *Accomplished:*\n${taskSummaries}`,
      `🟢 *Blockers:* None — all deliverables on schedule for sprint velocity`,
      `💡 *Learnings:* Resolved schema validation and channel ID routing across chat pipeline`,
      `📅 *Tomorrow:* Review testing reports, sprint backlog grooming, and QA validation`,
      `🌟 *Energy:* 🚀 Energized`,
    ].join('\n');

    // 6. Save or update EODReport document
    const eodDoc = await EODReport.findOneAndUpdate(
      { user: user._id, date: todayYMD },
      {
        user: user._id,
        date: todayYMD,
        message: reportMsg,
        tasksCompleted: taskSummaries,
        blockers: 'None',
        learnings: 'Resolved schema validation and channel ID routing across chat pipeline',
        plansTomorrow: 'Review testing reports, sprint backlog grooming, and QA validation',
        mood: 'energized',
        hoursWorked: 8.25,
        netHoursWorked: 7.75,
        submittedAt: new Date(),
      },
      { new: true, upsert: true }
    );

    // 7. Dispatch ChatMessage to each channel
    for (const ch of channels) {
      const channelKey = ch.channelId || ch._id.toString();

      const chatMsg = await ChatMessage.create({
        channel: channelKey,
        sender: user._id,
        message: reportMsg,
        messageType: 'eod_report',
        eodRef: {
          eodId: eodDoc._id,
          tasksCompleted: taskSummaries,
          blockers: 'None',
          learnings: 'Resolved schema validation and channel ID routing across chat pipeline',
          plansTomorrow: 'Review testing reports, sprint backlog grooming, and QA validation',
          mood: 'energized',
          hoursWorked: 8.25,
          netHoursWorked: 7.75,
          date: todayYMD,
        },
      });

      // Update last message in channel
      await ChatChannel.findByIdAndUpdate(ch._id, {
        lastMessage: {
          message: `📋 EOD Report — ${user.name}`,
          sender: user._id,
          createdAt: new Date(),
        },
        $inc: { messageCount: 1 },
      });

      console.log(`✅ Successfully dispatched EOD report to channel "${channelKey}" (Message ID: ${chatMsg._id})`);
    }

    console.log('Sample EOD report broadcast complete!');
    process.exit(0);
  } catch (err) {
    console.error('Error dispatching sample EOD:', err);
    process.exit(1);
  }
}

dispatchSampleEOD();
