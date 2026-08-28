import LeaveBalance from '../models/LeaveBalance.js';

export const syncEmployeeLeaveBalance = async (userId) => {
  const year = new Date().getFullYear();
  const existing = await LeaveBalance.findOne({ user: userId, year });
  if (!existing) {
    await LeaveBalance.create({
      user: userId,
      year,
      casual:    { total: 10, used: 0 },
      sick:      { total: 7,  used: 0 },
      annual:    { total: 15, used: 0 },
      emergency: { total: 2,  used: 0 },
    });
  }
};
