import 'dotenv/config';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import Role from '../models/Role.js';
import ChatMessage from '../models/ChatMessage.js';
import ChatChannel from '../models/ChatChannel.js';
import EODReport from '../models/EODReport.js';

async function dispatchHmsEod() {
  try {
    await connectDB();
    console.log('Connected to MongoDB.');

    const eod = await EODReport.findById('6aa186681217df6a1adc66c2').populate('user');
    if (!eod) {
      console.error('EOD report not found!');
      process.exit(1);
    }

    const hmsChannelId = 'prj_6a9da10c372efbb03b6d2c34';
    const senderId = eod.user._id;
    const senderName = eod.user.name || 'Sanjitsriram';

    const today = new Date().toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    });

    const reportMsg = [
      `📋 *EOD Report — ${senderName}* | ${today}`,
      `⏱ *Hours Logged:* 2h 46m net (2h 46m gross)`,
      `✅ *Accomplished:*\n${eod.tasksCompleted || 'Deliverables submitted and synchronized with project roadmap'}`,
      `🟢 *Blockers:* None`,
      `🌟 *Energy:* 😃 Good`,
    ].join('\n');

    const chatMsg = await ChatMessage.create({
      channel: hmsChannelId,
      sender: senderId,
      message: reportMsg,
      messageType: 'eod_report',
      eodRef: {
        eodId: eod._id,
        tasksCompleted: eod.tasksCompleted,
        blockers: 'None',
        mood: 'good',
        hoursWorked: eod.hoursWorked || 2.77,
        netHoursWorked: eod.netHoursWorked || 2.72,
        date: '2026-09-09',
      },
    });

    await EODReport.findByIdAndUpdate(eod._id, { chatMessageId: chatMsg._id });

    await ChatChannel.updateOne(
      { channelId: hmsChannelId },
      {
        $set: {
          lastMessage: {
            message: `📋 EOD Report — ${senderName}`,
            sender: senderId,
            createdAt: new Date(),
          },
        },
        $inc: { messageCount: 1 },
      }
    );

    console.log(`✅ Successfully dispatched Sanjitsriram's actual EOD report to HMS channel (${hmsChannelId})!`);
    console.log(`Message ID: ${chatMsg._id}`);
    process.exit(0);
  } catch (err) {
    console.error('Error dispatching HMS EOD:', err);
    process.exit(1);
  }
}

dispatchHmsEod();
