import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

/**
 * Self-service Attendance Clock widget.
 * `api` must expose: getTodayAttendance(), checkIn(), checkOut()
 */
export default function AttendanceClock({ api }) {
  const [today, setToday] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(new Date());

  const load = async () => {
    try {
      const res = await api.getTodayAttendance();
      setToday(res.data?.data || null);
    } catch {
      setToday(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const tick = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(tick);
  }, []);

  const handleCheckIn = async () => {
    setBusy(true);
    try {
      const res = await api.checkIn();
      setToday(res.data?.data);
      toast.success('Checked in — have a great day!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to check in');
    } finally {
      setBusy(false);
    }
  };

  const handleCheckOut = async () => {
    setBusy(true);
    try {
      const res = await api.checkOut();
      setToday(res.data?.data);
      toast.success('Checked out — see you tomorrow!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to check out');
    } finally {
      setBusy(false);
    }
  };

  const hasCheckedIn = !!today?.checkIn;
  const hasCheckedOut = !!today?.checkOut;

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${hasCheckedOut ? 'bg-slate-100 text-slate-400' : hasCheckedIn ? 'bg-[#ECFDF5] text-[#059669]' : 'bg-[#EFF6FF] text-[#2563EB]'}`}>
          <span className="material-symbols-outlined text-[22px]">schedule</span>
        </div>
        <div>
          <p className="text-[14px] font-bold text-[#0F172A]">
            {hasCheckedOut ? 'Day complete' : hasCheckedIn ? "You're checked in" : 'Not checked in yet'}
          </p>
          <p className="text-[12px] text-[#64748B] mt-0.5">
            {now.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            {hasCheckedIn && <> &middot; In: <span className="font-medium text-[#0F172A]">{today.checkIn}</span></>}
            {hasCheckedOut && <> &middot; Out: <span className="font-medium text-[#0F172A]">{today.checkOut}</span> &middot; {today.hoursWorked?.toFixed?.(1) ?? today.hoursWorked}h</>}
          </p>
        </div>
      </div>

      {!loading && (
        <div>
          {!hasCheckedIn && (
            <button
              onClick={handleCheckIn}
              disabled={busy}
              className="bg-[#2563EB] text-white px-5 py-2 rounded-md text-[13px] font-semibold hover:bg-[#1D4ED8] transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">login</span>
              Clock In
            </button>
          )}
          {hasCheckedIn && !hasCheckedOut && (
            <button
              onClick={handleCheckOut}
              disabled={busy}
              className="bg-[#DC2626] text-white px-5 py-2 rounded-md text-[13px] font-semibold hover:bg-[#B91C1C] transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              Clock Out
            </button>
          )}
          {hasCheckedOut && (
            <span className="text-[12px] font-medium text-[#059669] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              Attendance logged
            </span>
          )}
        </div>
      )}
    </div>
  );
}
