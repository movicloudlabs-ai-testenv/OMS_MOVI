const STATUS_COLORS = {
  // Task statuses
  pending: 'badge-pending',
  in_progress: 'badge-in_progress',
  review: 'badge-review',
  done: 'badge-done',
  overdue: 'badge-overdue',
  // Roles
  admin: 'badge-admin',
  intern: 'badge-intern',
  hr: 'badge-hr',
  pmo: 'badge-pmo',
  // Project health
  stable: 'badge-stable',
  at_risk: 'badge-at_risk',
  critical: 'badge-critical',
  // Project status
  active: 'badge-active',
  completed: 'badge-done',
  on_hold: 'badge-pending',
  // Attendance
  present: 'badge-done',
  absent: 'badge-overdue',
  leave: 'badge-review',
  wfh: 'badge-in_progress',
};

export default function StatusBadge({ status }) {
  const label = status?.replace(/_/g, ' ') || '';
  const colorClass = STATUS_COLORS[status] || 'badge-pending';
  return (
    <span className={`badge ${colorClass}`}>
      {label}
    </span>
  );
}
