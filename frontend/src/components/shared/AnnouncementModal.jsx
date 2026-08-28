import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, X, Clock, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

export default function AnnouncementModal({ announcement, onClose }) {
  if (!announcement) return null;

  const rawTitle = announcement.title || announcement.metadata?.title || 'Announcement';
  const cleanTitle = rawTitle.replace(/^📢\s*Announcement:\s*/i, '');
  const content = announcement.message || announcement.metadata?.content || announcement.content || '';
  const senderName = announcement.sender?.name || announcement.metadata?.senderName || 'Sarah Connor';
  const senderDesignation = announcement.sender?.designation || announcement.metadata?.senderDesignation || 'HR Manager';
  const targetRoles = announcement.metadata?.targetRoles || [];

  let formattedTime = '';
  let fullDate = '';
  if (announcement.createdAt) {
    try {
      formattedTime = formatDistanceToNow(new Date(announcement.createdAt), { addSuffix: true });
      fullDate = format(new Date(announcement.createdAt), 'PPpp');
    } catch {
      formattedTime = '';
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative bg-white rounded-2xl border border-slate-100 max-w-lg w-full p-6 shadow-2xl z-10 overflow-hidden text-left"
        >
          {/* Top Bar */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                <Megaphone size={20} />
              </div>
              <div>
                <span className="text-[11px] font-bold tracking-wider text-orange-600 uppercase">Company Broadcast</span>
                <h3 className="font-headline font-bold text-base sm:text-lg text-slate-900 leading-snug">
                  📢 Announcement: {cleanTitle}
                </h3>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors shrink-0"
            >
              <X size={18} />
            </button>
          </div>

          {/* Sender & Timestamp Info */}
          <div className="py-3 px-4 my-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[12px]">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-orange-600 text-white flex items-center justify-center text-[10px] font-bold">
                {senderName.slice(0, 1).toUpperCase()}
              </div>
              <span className="text-slate-700 font-medium">
                Sender: <strong className="text-slate-900 font-semibold">{senderName} ({senderDesignation})</strong>
              </span>
            </div>
            {formattedTime && (
              <div className="flex items-center gap-1.5 text-slate-500" title={fullDate}>
                <Clock size={13} />
                <span>{formattedTime}</span>
              </div>
            )}
          </div>

          {/* Target Audience Tags */}
          {targetRoles.length > 0 && (
            <div className="flex items-center gap-1.5 mb-3 flex-wrap">
              <span className="text-[11px] text-slate-400 font-medium">Target Audience:</span>
              {targetRoles.map(role => (
                <span key={role} className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 border border-blue-100">
                  {role}
                </span>
              ))}
            </div>
          )}

          {/* Announcement Full Content */}
          <div className="py-2">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Message</h4>
            <div className="text-[13px] text-slate-700 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto custom-scrollbar p-3.5 bg-slate-50/70 rounded-xl border border-slate-100">
              {content}
            </div>
          </div>

          {/* Action Footer */}
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-[13px] font-semibold flex items-center gap-2 shadow-sm transition-colors"
            >
              <CheckCircle2 size={16} />
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
