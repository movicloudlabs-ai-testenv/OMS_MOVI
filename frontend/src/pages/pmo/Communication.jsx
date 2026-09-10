import PageWrapper from '../../components/PageWrapper';
import CommunicationBoard from '../../components/shared/CommunicationBoard';

export default function PMOCommunication() {
  return (
    <PageWrapper>
      <div className="max-w-5xl mx-auto p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900">PMO Communication & Broadcasts</h1>
          <p className="text-sm text-slate-500 mt-1">Broadcast real-time announcements and notifications to company staff & interns</p>
        </div>
        <CommunicationBoard />
      </div>
    </PageWrapper>
  );
}
