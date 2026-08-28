import { useEffect, useState } from 'react';
import { documentsAPI } from '../../api';
import PageWrapper from '../../components/PageWrapper';
import LoadingSpinner from '../../components/LoadingSpinner';
import { format } from 'date-fns';
import { downloadFile } from '../../utils/downloadFile';
import toast from 'react-hot-toast';

export default function InternDocuments() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    documentsAPI.getAll()
      .then(res => setDocs(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
    <PageWrapper>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div>
          <h1 className="font-headline font-bold text-2xl text-slate-900 tracking-tight">My Documents</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Access your official internship documents and files</p>
        </div>

        {loading ? <LoadingSpinner text="Fetching your documents..." /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {docs.map(d => (
              <div key={d._id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition-all group">
                <div className="flex items-start justify-between mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center transition-transform group-hover:scale-110">
                    <span className="material-symbols-outlined text-2xl">description</span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-3 py-1 rounded-full">
                    {d.category || 'Other'}
                  </span>
                </div>
                
                <h3 className="font-bold text-slate-900 text-sm mb-1 truncate group-hover:text-primary transition-colors">{d.name}</h3>
                <p className="text-xs text-slate-400 font-medium mb-5">Uploaded on {format(new Date(d.createdAt), 'MMM d, yyyy')}</p>
                
                <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                  <span className="text-[10px] text-slate-300 font-bold uppercase tracking-tight">{(d.size / 1024).toFixed(1)} KB</span>
                  <button 
                    onClick={() => handleDownload(d)}
                    disabled={downloadingId === d._id}
                    className="btn-secondary px-4 py-2 text-xs flex items-center gap-1.5 hover:bg-primary/10 hover:text-primary transition-all disabled:opacity-50"
                  >
                    {downloadingId === d._id ? 'Downloading...' : 'Download'} 
                    <span className="material-symbols-outlined text-sm">download</span>
                  </button>
                </div>
              </div>
            ))}
            
            {docs.length === 0 && (
              <div className="col-span-full py-20 text-center bg-slate-50 rounded-[2.5rem] border border-dashed border-slate-200">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-slate-300 text-3xl">folder_off</span>
                </div>
                <h3 className="text-slate-800 font-bold">No documents yet</h3>
                <p className="text-slate-400 text-sm mt-1 max-w-sm mx-auto">Your official documents will appear here once they are uploaded by HR.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
