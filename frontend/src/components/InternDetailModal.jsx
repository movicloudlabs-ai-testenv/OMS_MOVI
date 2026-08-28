import { useEffect, useState } from 'react';
import Modal from './Modal';
import { usersAPI } from '../api';
import toast from 'react-hot-toast';

export default function InternDetailModal({ internId, isOpen, onClose }) {
  const [intern, setIntern] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && internId) {
      setLoading(true);
      usersAPI.getById(internId)
        .then(res => setIntern(res.data.data))
        .catch(() => toast.error('Failed to load intern details'))
        .finally(() => setLoading(false));
    } else {
      setIntern(null);
    }
  }, [isOpen, internId]);

  if (!isOpen) return null;

  const DetailItem = ({ label, value, icon, link = false }) => (
    <div className="flex flex-col gap-1">
      <p className="text-[10px] uppercase tracking-widest font-black text-slate-400">{label}</p>
      <div className="flex items-center gap-2">
        {icon && <span className="material-symbols-outlined text-slate-300 text-sm">{icon}</span>}
        {link && value && value !== 'Not Assigned' ? (
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-primary hover:underline truncate">
            {value.replace('https://', '').replace('http://', '')}
          </a>
        ) : (
          <p className={`text-sm font-bold ${!value || value === 'Not Assigned' ? 'text-slate-300 italic' : 'text-slate-700'}`}>
            {value || 'Not Assigned'}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Intern Details" maxWidth="max-w-xl">
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="spinner w-8 h-8" />
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Fetching Data...</p>
        </div>
      ) : intern ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          
          {/* TOP: Name + username */}
          <div className="flex items-center gap-5 p-4 bg-slate-50 rounded-[2rem] border border-slate-100">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl overflow-hidden border-2 border-white shadow-sm">
              {intern.profileImage ? (
                <img src={intern.profileImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <span>{intern.name?.[0].toUpperCase()}</span>
              )}
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 leading-tight">{intern.name}</h2>
              <p className="text-sm font-bold text-slate-400 tracking-tight">@{intern.username || 'no_username'}</p>
            </div>
          </div>

          {/* MIDDLE: Project + role */}
          <div className="grid grid-cols-2 gap-6 px-2">
            <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
              <DetailItem label="Assigned Project" value={intern.project} icon="rocket_launch" />
            </div>
            <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50">
              <DetailItem label="Role" value={intern.role} icon="badge" />
            </div>
          </div>

          {/* BOTTOM: Stats, Status & Links */}
          <div className="bg-white rounded-[2rem] border border-slate-100 p-6 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <DetailItem 
                label="Joining Date" 
                value={intern.joiningDate ? new Date(intern.joiningDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not Set'} 
                icon="today" 
              />
              <div className="flex flex-col gap-1">
                <p className="text-[10px] uppercase tracking-widest font-black text-slate-400">Bond Status</p>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${intern.bond ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <p className="text-sm font-bold text-slate-700">{intern.bond ? 'Active (Yes)' : 'No Bond'}</p>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-[10px] uppercase tracking-widest font-black text-slate-400">NDA Signed</p>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${intern.nda ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <p className="text-sm font-bold text-slate-700">{intern.nda ? 'Confirmed' : 'Pending/No'}</p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-50 grid grid-cols-1 md:grid-cols-2 gap-6">
              <DetailItem label="GitHub Profile" value={intern.githubLink} icon="code" link />
              <DetailItem label="Key Project Link" value={intern.projectLink} icon="public" link />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button onClick={onClose} className="btn-secondary px-6 text-xs font-bold uppercase tracking-widest">Close Information</button>
          </div>

        </div>
      ) : (
        <div className="py-20 text-center">
          <p className="text-slate-400">No data found for this intern.</p>
        </div>
      )}
    </Modal>
  );
}
