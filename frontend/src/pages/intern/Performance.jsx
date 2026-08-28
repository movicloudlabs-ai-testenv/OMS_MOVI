import { useEffect, useState } from 'react';
import { performanceAPI } from '../../api';
import PageWrapper from '../../components/PageWrapper';
import LoadingSpinner from '../../components/LoadingSpinner';
import { format } from 'date-fns';

export default function InternPerformance() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    performanceAPI.getAll().then(r => setRecords(r.data.data)).finally(() => setLoading(false));
  }, []);

  const latest = records[0];

  const ScoreBar = ({ label, score }) => (
    <div>
      <div className="flex justify-between mb-2">
        <span className="text-sm font-semibold text-slate-600">{label}</span>
        <span className="text-sm font-bold text-slate-900">{score}/10</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2">
        <div className="bg-primary rounded-full h-2 transition-all duration-500" style={{ width: `${score * 10}%` }} />
      </div>
    </div>
  );

  return (
    <PageWrapper>
      <div className="space-y-8">
        <div>
          <h1 className="font-headline font-bold text-2xl text-slate-900">Performance</h1>
          <p className="text-slate-500 text-sm mt-1">Your performance evaluations from HR and PMO</p>
        </div>

        {loading ? <LoadingSpinner /> : records.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <span className="material-symbols-outlined text-5xl mb-4 block">grade</span>
            <p className="font-semibold">No evaluations yet</p>
            <p className="text-sm mt-1">Your HR will publish performance evaluations here</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Latest Score Card */}
            {latest && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-gradient-to-br from-primary to-blue-600 text-white rounded-3xl p-8 flex flex-col items-center justify-center text-center">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-blue-200 mb-2">Overall Score</p>
                  <p className="text-7xl font-black mb-2">{latest.overallScore}</p>
                  <p className="text-blue-100 text-sm font-medium">{latest.period}</p>
                  <p className="text-[10px] mt-3 text-blue-200">Evaluated by {latest.evaluatedBy?.name}</p>
                </div>
                <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm p-8 space-y-5">
                  <h3 className="font-headline font-bold text-slate-900">Score Breakdown</h3>
                  <ScoreBar label="Technical Skills" score={latest.technicalScore} />
                  <ScoreBar label="Communication" score={latest.communicationScore} />
                  <ScoreBar label="Punctuality" score={latest.punctualityScore} />
                  {latest.feedback && (
                    <div className="bg-slate-50 rounded-2xl p-4 mt-4">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Feedback</p>
                      <p className="text-sm text-slate-700 leading-relaxed">{latest.feedback}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Goals */}
            {latest?.goals?.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
                <h3 className="font-headline font-bold text-slate-900 mb-5">My Goals</h3>
                <div className="space-y-3">
                  {latest.goals.map((goal, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${goal.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                        <span className="material-symbols-outlined text-sm">{goal.status === 'completed' ? 'check' : 'radio_button_unchecked'}</span>
                      </div>
                      <p className={`text-sm font-medium ${goal.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-700'}`}>{goal.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* History */}
            {records.length > 1 && (
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
                <h3 className="font-headline font-bold text-slate-900 mb-5">Evaluation History</h3>
                <div className="space-y-3">
                  {records.slice(1).map(r => (
                    <div key={r._id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:bg-slate-50">
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{r.period}</p>
                        <p className="text-xs text-slate-400">{format(new Date(r.createdAt), 'MMM d, yyyy')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-primary">{r.overallScore}</p>
                        <p className="text-[10px] text-slate-400">/ 10</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
