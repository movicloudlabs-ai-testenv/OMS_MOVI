import { useState, useEffect } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, entityName, entityLabel = 'item' }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  // Reset internal state every time the modal opens
  useEffect(() => {
    if (isOpen) {
      setIsDeleting(false);
      setError('');
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    setIsDeleting(true);
    setError('');
    try {
      await onConfirm();
      setIsDeleting(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete. Please try again.');
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (isDeleting) return;
    setError('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="relative bg-white rounded-xl border border-[#E2E8F0] max-w-md w-full mx-4 p-6 shadow-xl z-10"
          >
            <div className="mx-auto bg-[#FEE2E2] rounded-full p-3 w-fit">
              <AlertTriangle size={40} className="text-[#DC2626]" />
            </div>
            <h2 className="text-lg font-semibold text-[#0F172A] text-center mt-4">
              Delete {entityName}?
            </h2>
            <p className="text-sm text-[#64748B] text-center mt-2">
              This action cannot be undone. This {entityLabel} will be permanently removed from the system.
            </p>
            {error && (
              <p className="text-xs text-[#DC2626] bg-[#FEE2E2] rounded px-3 py-2 mt-3">
                {error}
              </p>
            )}
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleClose}
                disabled={isDeleting}
                className="flex-1 border border-[#E2E8F0] text-[#0F172A] rounded-lg py-2 text-sm font-medium hover:bg-[#F8FAFC] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={isDeleting}
                className="flex-1 bg-[#DC2626] text-white rounded-lg py-2 text-sm font-medium hover:bg-[#B91C1C] transition-colors disabled:opacity-75 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Deleting...
                  </>
                ) : 'Delete'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
