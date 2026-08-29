# Bug Sheet Integration

The application now includes a **Bug Sheet** page at `/support/bugs`.

## What it provides
- Add bugs from Intern, Employee, HR, PMO and Admin accounts.
- Bugs are appended to the supplied Google Sheet.
- **Visit Sheet** opens the live Google Sheet.
- **Download** downloads the current sheet as XLSX.
- The Google Sheet remains the single live source of truth.

## One-time Google Apps Script setup
1. Open the supplied Google Sheet.
2. Go to **Extensions -> Apps Script**.
3. Copy the contents of `google-apps-script/Code.gs` into the Apps Script editor.
4. Save it.
5. Deploy -> **New deployment** -> **Web app**.
6. Execute as: **Me**.
7. Who has access: **Anyone** (or your organization's users, if appropriate).
8. Copy the deployed `/exec` URL.
9. In `frontend/.env`, add:

```env
VITE_BUG_SHEET_WEB_APP_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

10. Restart/rebuild the frontend.

The Apps Script automatically creates a `Bugs` sheet/tab if it does not already exist and appends these columns:
`Ticket ID, Timestamp, Raised By, Email, Role, Bug Title, Module, Severity, Steps to Reproduce, Expected Result, Actual Result, Status`.

> The Google Sheet itself must be accessible to the intended users. The supplied link is used for the Visit Sheet button and the XLSX download link.
