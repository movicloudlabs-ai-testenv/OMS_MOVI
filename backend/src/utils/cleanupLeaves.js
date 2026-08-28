import LeaveRequest from '../models/LeaveRequest.js';

const RETENTION_DAYS = 60;

export const cleanupApprovedLeaves = async () => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

  const result = await LeaveRequest.deleteMany({
    status: 'Approved',
    reviewedAt: { $lt: cutoff },
  });

  if (result.deletedCount > 0) {
    console.log(`[Leave cleanup] Removed ${result.deletedCount} approved leave record(s) older than ${RETENTION_DAYS} days`);
  }
};

export const scheduleLeaveCleanup = () => {
  // Run once on startup
  cleanupApprovedLeaves().catch(console.error);

  // Run daily at midnight
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  setInterval(() => {
    cleanupApprovedLeaves().catch(console.error);
  }, MS_PER_DAY);
};
