import { useEffect, useRef, useState } from 'react';
import { meAPI } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import PageWrapper from '../components/PageWrapper';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({ 
    name: '', 
    username: '', 
    bio: '', 
    profileImage: '', 
    githubLink: '', 
    projectLink: '' 
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);
  const fileRef = useRef();

  const initials = (form.name || '')
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';

  useEffect(() => {
    meAPI.getProfile()
      .then(r => {
        const u = r.data?.data || {};
        setForm({
          name: u.name || '',
          username: u.username || '',
          bio: u.bio || '',
          profileImage: u.profileImage || '',
          githubLink: u.githubLink || '',
          projectLink: u.projectLink || '',
        });
        setPreview(u.profileImage || null);
      })
      .catch(() => toast.error('Failed to load profile details'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be smaller than 2MB'); return; }
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreview(ev.target.result);
      setForm(p => ({ ...p, profileImage: ev.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username) return toast.error('Username is required');
    
    setSaving(true);
    try {
      const res = await meAPI.updateProfile(form);
      const updatedUser = res.data?.data;
      if (setUser && updatedUser) {
        setUser((prev) => {
          const merged = { ...prev, ...updatedUser };
          try { localStorage.setItem('owms_user', JSON.stringify(merged)); } catch { /* ignore */ }
          return merged;
        });
      }
      toast.success('Your profile has been updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <PageWrapper>
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="spinner w-10 h-10 border-primary" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Preferences...</p>
      </div>
    </PageWrapper>
  );

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
        <div className="flex items-end justify-between border-b border-slate-100 pb-6">
          <div>
            <h1 className="font-headline font-bold text-3xl text-slate-900 tracking-tight">Professional Profile</h1>
            <p className="text-slate-500 text-sm mt-1">Manage your identity and public presence across the platform.</p>
          </div>
          <div className="hidden sm:block">
            <span className={`px-4 py-1.5 rounded-full bg-primary/5 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/10`}>
              {user?.role} Access
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Sidebar: Avatar and Status */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 text-center flex flex-col items-center gap-6">
              <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
                <div className="w-32 h-32 rounded-[2rem] bg-slate-50 flex items-center justify-center text-primary font-bold text-4xl overflow-hidden ring-8 ring-slate-50/50 shadow-inner transition-transform group-hover:scale-[1.03]">
                  {preview
                    ? <img src={preview} alt="Avatar" className="w-full h-full object-cover" />
                    : <span>{initials}</span>
                  }
                </div>
                <div className="absolute inset-0 rounded-[2rem] bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white backdrop-blur-[2px]">
                  <span className="material-symbols-outlined text-3xl">add_a_photo</span>
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </div>
              
              <div>
                <h2 className="font-black text-xl text-slate-900 leading-tight">{form.name || 'Anonymous User'}</h2>
                <p className="text-primary font-bold text-xs tracking-tight mt-1">@{form.username || 'username'}</p>
              </div>

              <div className="w-full pt-6 border-t border-slate-50 space-y-3">
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="text-slate-400 uppercase tracking-widest">Email</span>
                  <span className="text-slate-700">{user?.email}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="text-slate-400 uppercase tracking-widest">Account ID</span>
                  <span className="text-slate-700 font-mono">#{user?._id?.slice(-6)}</span>
                </div>
              </div>

              <button 
                type="button" 
                onClick={() => fileRef.current?.click()}
                className="w-full py-3.5 bg-slate-50 hover:bg-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 transition-colors"
              >
                Upload New Image
              </button>
            </div>
          </div>

          {/* Main Content: Info & Links */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 space-y-8">
              
              {/* Identity Section */}
              <div className="space-y-6">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                  <span className="w-1 h-3 bg-primary rounded-full" />
                  Personal Identity
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-400 block mb-2 ml-1">Display Name</label>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="e.g. John Doe"
                      required
                      className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/40 transition-all font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-400 block mb-2 ml-1">Username</label>
                    <div className="relative">
                      <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-sm">@</span>
                      <input
                        type="text"
                        name="username"
                        value={form.username}
                        onChange={handleChange}
                        placeholder="john_doe"
                        required
                        className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl pl-10 pr-5 py-3.5 text-sm outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/40 transition-all font-medium"
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-400 block mb-2 ml-1 flex justify-between">
                    Professional Bio
                    <span className="opacity-60">{form.bio.length}/300</span>
                  </label>
                  <textarea
                    name="bio"
                    value={form.bio}
                    onChange={handleChange}
                    maxLength={300}
                    rows={4}
                    placeholder="Short summary of your background..."
                    className="w-full bg-slate-50/50 border border-slate-100 rounded-3xl px-5 py-4 text-sm outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/40 resize-none transition-all leading-relaxed"
                  />
                </div>
              </div>

              {/* Connections Section */}
              <div className="space-y-6 pt-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
                  <span className="w-1 h-3 bg-indigo-400 rounded-full" />
                  Professional Links
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-400 block mb-2 ml-1">GitHub Profile</label>
                    <input
                      type="url"
                      name="githubLink"
                      value={form.githubLink}
                      onChange={handleChange}
                      placeholder="https://github.com/..."
                      className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/40 transition-all font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-black text-slate-400 block mb-2 ml-1">Showcase Project</label>
                    <input
                      type="url"
                      name="projectLink"
                      value={form.projectLink}
                      onChange={handleChange}
                      placeholder="https://yourproject.com"
                      className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/40 transition-all font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <button 
                  type="submit" 
                  disabled={saving} 
                  className="w-full bg-slate-900 border border-slate-800 hover:bg-black text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-200 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  {saving ? <div className="spinner w-4 h-4 border-white/30 border-t-white" /> : <span className="material-symbols-outlined text-base">cloud_upload</span>}
                  Synchronize Profile
                </button>
              </div>

            </div>
          </div>
        </form>
      </div>
    </PageWrapper>
  );
}
