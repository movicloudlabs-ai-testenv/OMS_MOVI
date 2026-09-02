# Bug Sheet Integration

The application includes a **Bug Sheet** page at `/support/bugs`.

## Who can use it
- **Visible to:** Intern, HR, PMO only (Employee and Admin don't see it in their sidebar or route).
- **Can add bugs:** Intern and PMO.
- **View only:** HR — sees the "Visit Sheet" / "Download" buttons but no Add Bug form.

## How it works
- The spreadsheet has one tab per project: `cms`, `hms`, `spa`, `rms`, `boxway`, `owms`, `iws`, `e commerce`.
- The Add Bug form starts with a **Project** dropdown. Whichever project is selected, the row is
  appended directly to that project's own tab — not a separate generic sheet.
- Above the form, the page shows the **next free Test Case ID / Bug ID** for the selected project
  (e.g. `TC041` / `BUG041`), calculated by scanning that tab's existing rows for the highest number
  used so far. This is a live preview — it refreshes when you change project and after every submit.
- The actual number written is **re-calculated server-side at submit time** (inside `Code.gs`, under
  a script lock), so even if two people submit for the same project at the same moment, they can't
  both get e.g. `TC041` — duplicates are prevented at the source, not just in the UI preview.
- The row written matches the sheet's real columns exactly: Test Case ID, Module/Feature Name, Test
  Scenario, Test Case Description, Precondition, Test Steps, Test Data, Expected Result, Actual
  Result, Status, Priority, Severity, Environment/Browser/OS, Executed By (auto-filled from the
  logged-in user), Execution Date, Bug ID/Defect ID, Remarks/Comments.

## One-time Google Apps Script setup
1. Open the shared Google Sheet.
2. Go to **Extensions -> Apps Script**.
3. Replace everything in the Apps Script editor with the contents of `google-apps-script/Code.gs`.
4. Save it.
5. Deploy -> **New deployment** -> **Web app**.
6. Execute as: **Me**.
7. Who has access: **Anyone** (or your organization's users, if appropriate).
8. Copy the deployed `/exec` URL.
9. In `frontend/.env`, set:

```env
VITE_BUG_SHEET_WEB_APP_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

10. Restart/rebuild the frontend.

> If you re-deploy the script after editing it, you must create a **new version** in the deployment
> dialog (Manage deployments -> Edit -> Version: New version) — otherwise the live URL keeps serving
> the old code.

## Adding a new project tab later
1. Duplicate an existing tab in the spreadsheet and give it the new project's name (keep the same
   header row).
2. In `Code.gs`, add one line to the `PROJECT_SHEETS` map, e.g.:
   ```js
   newproj: 'New Project Tab Name',
   ```
3. In `frontend/src/pages/BugSheet.jsx`, add one entry to the `PROJECTS` array with the same `value`
   key, e.g. `{ value: 'newproj', label: 'New Project' }`.
4. Re-deploy the Apps Script as a new version (see note above) and rebuild the frontend.

> The Google Sheet itself must be accessible to the intended users. The supplied link is used for the
> Visit Sheet button and the XLSX download link.
