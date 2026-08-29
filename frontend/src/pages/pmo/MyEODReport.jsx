import React, { useEffect, useState } from 'react';
import PageWrapper from '../../components/PageWrapper';
import EODQuickShare from '../../components/shared/EODQuickShare';
import { pmoAPI } from '../../utils/api';

export default function PMOMyEODReport() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await pmoAPI.getMyEODHistory();
      setHistory(res.data?.data || []);
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <PageWrapper>
      <div className="w-full flex flex-col gap-6 max-w-[700px] mx-auto pb-10 font-sans text-left">

        <div className="mt-6">
          <h1 className="text-2xl font-bold text-[#0F172A]">My EOD Report</h1>
          <p className="text-sm text-[#64748B] mt-1">Share your own quick end-of-day update.</p>
        </div>

        <EODQuickShare
          allowBackdate
          api={{ ...pmoAPI, submitEOD: async (m, d) => { const r = await pmoAPI.submitEOD(m, d); load(); return r; } }}
        />

        <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E2E8F0]">
            <h2 className="text-[14px] font-bold text-[#0F172A]">Your Update History</h2>
          </div>
          <div className="divide-y divide-[#F1F5F9]">
            {loading ? (
              <p className="px-5 py-6 text-[13px] text-[#94A3B8]">Loading...</p>
            ) : history.length === 0 ? (
              <p className="px-5 py-6 text-[13px] text-[#94A3B8]">No updates shared yet.</p>
            ) : (
              history.map((h) => (
                <div key={h._id} className="px-5 py-4">
                  <p className="text-[12px] font-semibold text-[#64748B] mb-1.5">
                    {new Date(h.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-[13.5px] text-[#0F172A] leading-relaxed whitespace-pre-wrap">{h.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
