import PageWrapper from '../../components/PageWrapper';
import CommunicationBoard from '../../components/shared/CommunicationBoard';

export default function EmployeeAnnouncements() {
  return (
    <PageWrapper>
      <div className="max-w-5xl mx-auto p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold text-slate-900">Announcement</h1>
          <p className="text-sm text-slate-500 mt-1">Updates and broadcasts shared by HR and PMO</p>
        </div>
        <CommunicationBoard />
      </div>
    </PageWrapper>
  );
}
