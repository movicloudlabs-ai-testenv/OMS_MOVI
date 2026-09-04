import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Clock, Send, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import toast from 'react-hot-toast';
import { messagesAPI } from '../../api';

export default function WelcomeMessageModal({ notification, onClose }) {
  if (!notification) return null;

  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [replied, setReplied] = useState(false);

  const title = notification.title || 'Onboarding Complete – Welcome to Movi Cloud Labs';
  const content = notification.message || 'Your onboarding is complete! Welcome to Movi Cloud Labs.';
  const senderName = notification.sender?.name || notification.metadata?.senderName || 'HR Manager';
  const senderDesignation = notification.sender?.designation || notification.metadata?.senderDesignation || 'HR Representative';
  const receiverId = typeof notification.sender === 'object' ? notification.sender?._id : (notification.sender || notification.metadata?.senderId);

  let formattedTime = '';
  let fullDate = '';
  if (notification.createdAt) {
    try {
      formattedTime = formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true });
      fullDate = format(new Date(notification.createdAt), 'PPpp');
    } catch {
      formattedTime = '';
    }
  }

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) {
      toast.error('Please enter a reply message');
      return;
    }

    setSending(true);
    try {
      if (receiverId) {
        await messagesAPI.send({
          receiver: receiverId,
          content: replyText.trim(),
        });
      }
      setReplied(true);
      toast.success(`Reply sent to ${senderName} successfully!`);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

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
          className="relative bg-white rounded-2xl border border-slate-100 max-w-lg w-full p-6 shadow-2xl z-10 overflow-hidden text-left font-sans"
        >
          {/* Top Header */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <Sparkles size={20} />
              </div>
              <div>
                <span className="text-[10px] font-extrabold tracking-wider text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                  Onboarding Complete
                </span>
                <h3 className="font-bold text-base sm:text-lg text-slate-900 leading-snug mt-1">
                  {title}
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
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-[11px] font-bold">
                {senderName.slice(0, 1).toUpperCase()}
              </div>
              <span className="text-slate-700 font-medium">
                From: <strong className="text-slate-900 font-semibold">{senderName}</strong> {senderDesignation ? `(${senderDesignation})` : ''}
              </span>
            </div>
            {formattedTime && (
              <div className="flex items-center gap-1.5 text-slate-500" title={fullDate}>
                <Clock size={13} />
                <span>{formattedTime}</span>
              </div>
            )}
          </div>

          {/* Welcome Message Body */}
          <div className="py-2">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Welcome Message</h4>
            <div className="text-[13px] text-slate-800 leading-relaxed whitespace-pre-wrap max-h-52 overflow-y-auto p-4 bg-blue-50/40 rounded-xl border border-blue-100 font-medium">
              {content}
            </div>
          </div>

          {/* Interactive Reply Section */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            {replied ? (
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-800 text-[13px] font-semibold flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                <span>Your reply has been sent to {senderName}!</span>
              </div>
            ) : (
              <form onSubmit={handleSendReply} className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Reply to {senderName}
                  </label>
                </div>
                <textarea
                  rows="3"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Type your reply to ${senderName} (e.g. Thank you so much!)...`}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[13px] text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none transition-all"
                />
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-[13px] font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sending || !replyText.trim()}
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[13px] font-bold flex items-center gap-2 shadow-sm transition-colors"
                  >
                    <Send size={15} />
                    {sending ? 'Sending...' : 'Send Reply'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
