import HRLayout from '../../components/hr/HRLayout';
import CommunicationBoard from '../../components/shared/CommunicationBoard';

export default function HRCommunication() {
  return (
    <HRLayout
      title="HR Communication & Broadcasts"
      subtitle="Broadcast real-time announcements and notifications to company staff & interns"
    >
      <CommunicationBoard />
    </HRLayout>
  );
}
