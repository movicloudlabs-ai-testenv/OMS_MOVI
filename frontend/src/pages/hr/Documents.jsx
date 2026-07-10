import { useEffect, useState, useRef } from 'react';
import { documentsAPI, usersAPI } from '../../api';
import HRLayout from '../../components/hr/HRLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { downloadFile } from '../../utils/downloadFile';

const CATEGORIES = ['NDA', 'Offer Letter', 'ID Proof', 'Report', 'Other'];

export default function HRDocuments() {
  const [docs, setDocs] = useState([]);
  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadModal, setUploadModal] = useState(false);
  const [form, setForm] = useState({ userId: '', name: '', category: 'Other' });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const fileRef = useRef();

  useEffect(() => {
    Promise.all([documentsAPI.getAll(), usersAPI.getAll({ role: 'intern' })])
      .then(([d, u]) => { setDocs(d.data.data); setInterns(u.data.data); })
      .finally(() => setLoading(false));
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) { toast.error('Please select a file'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('userId', form.userId);
      fd.append('name', form.name || file.name);
      fd.append('category', form.category);
      const res = await documentsAPI.upload(fd);
      setDocs(p => [res.data.data, ...p]);
      setUploadModal(false);
      setFile(null);
      toast.success('Document uploaded');
    } catch { toast.error('Upload failed'); } finally { setUploading(false); }
  };

  const deleteDoc = async (id) => {
    if (!confirm('Delete this document?')) return;
    await documentsAPI.delete(id);
    setDocs(p => p.filter(d => d._id !== id));
    toast.success('Document deleted');
  };

  const handleDownload = async (doc) => {
    setDownloadingId(doc._id);
    try {
      const res = await documentsAPI.download(doc._id);
      downloadFile(res.data, doc.originalName || doc.name);
    } catch {
      toast.error('Download failed');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <HRLayout bare>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-headline font-bold text-2xl text-slate-900">Documents</h1>
            <p className="text-slate-500 text-sm mt-1">Manage intern documents and files</p>
          </div>
          <button onClick={() => setUploadModal(true)} className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-base">upload</span> Upload Document
          </button>
        </div>

        {loading ? <LoadingSpinner /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {docs.map(d => (
              <div key={d._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                    <span className="material-symbols-outlined">description</span>
                  </div>
                  <button onClick={() => deleteDoc(d._id)} className="text-slate-300 hover:text-rose-500 transition-colors">
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                </div>
                <h3 className="font-bold text-slate-900 text-sm mb-1 truncate">{d.name}</h3>
                <p className="text-xs text-slate-400 mb-3">{d.user?.name} · {d.category}</p>
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <span className="text-[10px] text-slate-400">{format(new Date(d.createdAt), 'MMM d, yyyy')}</span>
                  <span className="text-[10px] text-slate-400">{format(new Date(d.createdAt), 'MMM d, yyyy')}</span>
                  <button 
                    onClick={() => handleDownload(d)}
                    disabled={downloadingId === d._id}
                    className="text-primary text-xs font-bold flex items-center gap-1 hover:underline disabled:opacity-50"
                  >
                    {downloadingId === d._id ? 'Downloading...' : 'Download'} 
                    <span className="material-symbols-outlined text-sm">download</span>
                  </button>
                </div>
              </div>
            ))}
            {docs.length === 0 && <p className="text-slate-400 col-span-3 text-center py-12 text-sm">No documents uploaded yet.</p>}
          </div>
        )}
      </div>

      <Modal isOpen={uploadModal} onClose={() => setUploadModal(false)} title="Upload Document">
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-widest font-extrabold text-slate-400 block mb-2">Intern</label>
            <select className="w-full bg-slate-50 rounded-2xl px-4 py-3 text-sm outline-none" value={form.userId} onChange={e => setForm(p => ({ ...p, userId: e.target.value }))} required>
              <option value="">Select intern...</option>
              {interns.map(i => <option key={i._id} value={i._id}>{i.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest font-extrabold text-slate-400 block mb-2">Category</label>
            <select className="w-full bg-slate-50 rounded-2xl px-4 py-3 text-sm outline-none" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest font-extrabold text-slate-400 block mb-2">File</label>
            <div
              onClick={() => fileRef.current.click()}
              className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center cursor-pointer hover:border-primary/40 transition-colors"
            >
              <span className="material-symbols-outlined text-4xl text-slate-300 mb-2 block">cloud_upload</span>
              <p className="text-sm font-medium text-slate-500">{file ? file.name : 'Click to select file'}</p>
              <p className="text-xs text-slate-400 mt-1">PDF, DOC, PNG, JPG up to 10MB</p>
              <input ref={fileRef} type="file" className="hidden" onChange={e => setFile(e.target.files[0])} />
            </div>
          </div>
          <button type="submit" disabled={uploading} className="w-full btn-primary py-3 text-sm flex items-center justify-center gap-2">
            {uploading ? <><div className="spinner" /> Uploading...</> : 'Upload Document'}
          </button>
        </form>
      </Modal>
    </HRLayout>
  );
}
