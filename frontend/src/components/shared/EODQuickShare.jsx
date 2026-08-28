import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

/**
 * Simple EOD update box — "share what you worked on today" as a short message.
 * `api` must expose: getMyEODToday(), submitEOD(message)
 */
export default function EODQuickShare({ api }) {
  const [message, setMessage] = useState('');
  const [submittedToday, setSubmittedToday] = useState(null); // the saved entry, or null
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const load = async () => {
    try {
      const res = await api.getMyEODToday();
      const entry = res.data?.data || null;
      setSubmittedToday(entry);
      if (entry) setMessage(entry.message);
    } catch {
      setSubmittedToday(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast.error('Write a quick update before sharing');
      return;
    }
    setSaving(true);
    try {
      const res = await api.submitEOD(message.trim());
      setSubmittedToday(res.data?.data);
      setEditing(false);
      toast.success("EOD update shared with your team");
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to share update');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-[18px] text-[#2563EB]">forum</span>
        <h3 className="text-[14px] font-bold text-[#0F172A]">EOD Update</h3>
        {submittedToday && !editing && (
          <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-[#059669]">
            <span className="material-symbols-outlined text-[14px]">check_circle</span>
            Shared today
          </span>
        )}
      </div>

      {submittedToday && !editing ? (
        <div>
          <p className="text-[13px] text-[#0F172A] bg-[#F8FAFC] border border-[#F1F5F9] rounded-md p-3 whitespace-pre-wrap leading-relaxed">{submittedToday.message}</p>
          <button
            onClick={() => setEditing(true)}
            className="mt-2 text-[12px] font-medium text-[#2563EB] hover:underline"
          >
            Edit update
          </button>
        </div>
      ) : (
        <div>
          <textarea
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What did you work on today? A quick line is enough..."
            className="w-full border border-[#E2E8F0] rounded-md py-2 px-3 text-[13px] focus:outline-none focus:border-[#2563EB] resize-y"
          />
          <div className="flex justify-end gap-2 mt-2">
            {editing && (
              <button onClick={() => { setEditing(false); setMessage(submittedToday?.message || ''); }} className="px-3 py-1.5 rounded-md text-[12px] font-medium text-[#64748B] hover:bg-[#F1F5F9]">
                Cancel
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-4 py-1.5 rounded-md text-[12px] font-semibold text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[15px]">send</span>
              {saving ? 'Sharing...' : 'Share Update'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
