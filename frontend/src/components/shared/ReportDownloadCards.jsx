import React, { useMemo, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const toISO = (d) => d.toISOString().slice(0, 10);
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function buildMonthlyCards(count = 6) {
  const cards = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const first = new Date(d.getFullYear(), d.getMonth(), 1);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    cards.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      title: `${MONTH_NAMES[d.getMonth()]}-${d.getFullYear()}`,
      from: toISO(first),
      to: toISO(last),
    });
  }
  return cards;
}

function buildWeeklyCards(count = 6) {
  const cards = [];
  const now = new Date();
  const day = now.getDay();
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - ((day + 6) % 7));

  for (let i = 0; i < count; i++) {
    const monday = new Date(thisMonday);
    monday.setDate(thisMonday.getDate() - i * 7);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    cards.push({
      key: toISO(monday),
      title: `${MONTH_NAMES[monday.getMonth()]} ${monday.getDate()} to ${MONTH_NAMES[sunday.getMonth()]} ${sunday.getDate()}`,
      from: toISO(monday),
      to: toISO(sunday),
    });
  }
  return cards;
}

/**
 * Monthly + Weekly downloadable report cards.
 * `exportFn(params)` must return an axios promise with responseType: 'blob'.
 */
export default function ReportDownloadCards({ exportFn, filePrefix, reportLabel = 'Daily Tracker', employmentType, college }) {
  const [downloadingKey, setDownloadingKey] = useState(null);

  const monthlyCards = useMemo(() => buildMonthlyCards(6), []);
  const weeklyCards = useMemo(() => buildWeeklyCards(6), []);

  const handleDownload = async (card) => {
    setDownloadingKey(card.key);
    try {
      const label = `${filePrefix}_${card.title.replace(/\s+/g, '_')}`;
      const res = await exportFn({
        from: card.from,
        to: card.to,
        label,
        employmentType: employmentType || undefined,
        college: college || undefined,
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${label}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Report downloaded');
    } catch (err) {
      toast.error('Failed to download report');
    } finally {
      setDownloadingKey(null);
    }
  };

  const Card = ({ card }) => (
    <button
      onClick={() => handleDownload(card)}
      disabled={downloadingKey === card.key}
      className="bg-white border border-[#CBD5E1] rounded-xl p-4 flex items-center justify-between gap-3 hover:border-[#2563EB] hover:shadow-sm transition-all text-left disabled:opacity-60"
    >
      <div className="min-w-0">
        <p className="text-[13px] font-bold text-[#0F172A]">{reportLabel}</p>
        <p className="text-[12px] text-[#64748B] mt-0.5 truncate">{card.title}</p>
      </div>
      {downloadingKey === card.key ? (
        <Loader2 size={18} className="text-[#2563EB] animate-spin shrink-0" />
      ) : (
        <Download size={18} className="text-[#64748B] shrink-0" />
      )}
    </button>
  );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h3 className="text-[14px] font-bold text-[#0F172A] mb-3 underline decoration-2 underline-offset-4">Monthly</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {monthlyCards.map(card => <Card key={card.key} card={card} />)}
        </div>
      </div>
      <div>
        <h3 className="text-[14px] font-bold text-[#0F172A] mb-3 underline decoration-2 underline-offset-4">Weekly</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {weeklyCards.map(card => <Card key={card.key} card={card} />)}
        </div>
      </div>
    </div>
  );
}
