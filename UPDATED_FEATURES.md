# OWMS Update - September 2026

## Fixed
- Consolidated the frontend API layer. `src/api/index.js` and `src/api/axios.js` now re-export the single configured client from `src/utils/api.js`.
- Fixed intern Status page to use the existing Daily Tracker API instead of the missing `/api/status-updates` endpoints.
- Fixed intern Performance page to use a real monthly performance endpoint.
- Fixed ProjectDetailModal to use role-aware project APIs instead of the old `/api/projects/...` endpoint.
- Fixed InternDetailModal to use PMO/HR intern APIs instead of the old `/api/users/...` endpoint.
- Added the missing Messages backend and wired intern messaging to it.

## Performance
Monthly intern performance is calculated from:
- Attendance
- Daily Tracker productivity and KT completion
- EOD report submission
- Task completion
- Project contribution (task-based)
- HR / PMO ratings

The result is a weighted 0-10 score with a breakdown and rating history.

## Announcements
Admin, HR and PMO can send and receive announcements. Employee and Intern can only view announcements addressed to them.

Send targets:
- Everyone
- One or more roles
- Specific selected people
- Any combination of role and selected people

Each announcement stores and displays the sender and receiving audience. In-app notifications and best-effort email fan-out are generated for targeted users.

## Security
The final archive intentionally excludes `.env`, `node_modules`, `.git`, and backend logs. Create local environment files from the supplied `.env.example` files.
