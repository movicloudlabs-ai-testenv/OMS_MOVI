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
      anchorDate: toISO(first), // used to select this period in the parent's date state
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
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4); // Mon -> Fri (business week only)
    cards.push({
      key: toISO(monday),
      title: `${MONTH_NAMES[monday.getMonth()]} ${monday.getDate()} to ${MONTH_NAMES[friday.getMonth()]} ${friday.getDate()}`,
      from: toISO(monday),
      to: toISO(friday),
      anchorDate: toISO(monday),
    });
  }
  return cards;
}

/**
 * Row of Monthly or Weekly period cards.
 * Click the card body -> selects that period (calls onSelect with anchorDate).
 * Click the download icon -> exports that period directly (calls exportFn), no navigation.
 */
export default function PeriodCardGrid({ mode, selectedAnchor, onSelect, exportFn, filePrefix, reportLabel, employmentType, college, fileExt = 'xlsx' }) {
  const [downloadingKey, setDownloadingKey] = useState(null);

  const cards = useMemo(() => (mode === 'month' ? buildMonthlyCards(6) : buildWeeklyCards(6)), [mode]);

  const handleDownload = async (e, card) => {
    e.stopPropagation();
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
      a.download = `${label}.${fileExt}`;
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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {cards.map((card) => {
        const isSelected = card.anchorDate === selectedAnchor
          || (selectedAnchor >= card.from && selectedAnchor <= card.to);
        return (
          <button
            key={card.key}
            onClick={() => onSelect(card)}
            className={`bg-white border rounded-xl p-4 flex items-center justify-between gap-3 transition-all text-left ${isSelected ? 'border-[#2563EB] ring-1 ring-[#2563EB]/20 bg-[#EFF6FF]' : 'border-[#CBD5E1] hover:border-[#94A3B8]'}`}
          >
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-[#0F172A]">{reportLabel}</p>
              <p className="text-[12px] text-[#64748B] mt-0.5 truncate">{card.title}</p>
            </div>
            <span
              role="button"
              onClick={(e) => handleDownload(e, card)}
              className="shrink-0 p-1.5 rounded-md hover:bg-[#E2E8F0] transition-colors"
              title="Download this report"
            >
              {downloadingKey === card.key ? (
                <Loader2 size={16} className="text-[#2563EB] animate-spin" />
              ) : (
                <Download size={16} className="text-[#64748B]" />
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
