// Deploy this file as: Deploy -> New deployment -> Web app
// Execute as: Me | Who has access: Anyone (or your organization's users)
//
// This script writes bug/test-case rows straight into the correct PROJECT TAB
// of the shared spreadsheet (cms / hms / spa / rms / boxway / owms / iws / e commerce),
// and generates the next Test Case ID / Bug ID for that tab so two people can't
// accidentally create duplicate numbers.

const SPREADSHEET_ID = '1ZQXAj0bu_SYojJuGzZdsJU9n30UmOx2Ls8PW2WFy44A';

// Key = the "project" value the app sends. Value = the EXACT tab name in the sheet
// (case-sensitive, including the space in "e commerce"). Add a line here any time
// a new project tab is added to the spreadsheet.
const PROJECT_SHEETS = {
  cms: 'cms',
  hms: 'hms',
  spa: 'spa',
  rms: 'rms',
  boxway: 'boxway',
  owms: 'owms',
  iws: 'iws',
  ecommerce: 'e commerce',
};

// Matches the real header row already in every project tab.
const HEADERS = [
  'Test Case ID', 'Module/Feature Name', 'Test Scenario', 'Test Case Description',
  'Precondition', 'Test Steps', 'Test Data', 'Expected Result', 'Actual Result',
  'Status', 'Priority', 'Severity', 'Environment/Browser/OS', 'Executed By',
  'Execution Date', 'Bug ID / Defect ID', 'Remarks/Comments',
  'starting time', 'end time', 'solved by', 'date',
];

const TEST_CASE_ID_COL = 1;  // column A
const BUG_ID_COL = 16;       // column P

function getSheet_(project) {
  const tabName = PROJECT_SHEETS[project];
  if (!tabName) throw new Error('Unknown project: ' + project);
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(tabName);
  if (!sheet) throw new Error('Sheet tab not found: ' + tabName);
  return sheet;
}

// Scans a column for the highest numeric suffix among values like "TC041" / "BUG041"
// (ignoring blank rows anywhere in between) and returns the next id, zero-padded to
// match the existing width. This is what prevents duplicate Test Case / Bug numbers
// even if earlier rows were deleted or are out of order.
function nextId_(sheet, colIndex, prefix) {
  const lastRow = sheet.getLastRow();
  let maxNum = 0;
  let maxWidth = 3;
  if (lastRow >= 2) {
    const values = sheet.getRange(2, colIndex, lastRow - 1, 1).getValues();
    values.forEach((row) => {
      const v = String(row[0] || '');
      const m = v.match(/(\d+)\s*$/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxNum) maxNum = n;
        if (m[1].length > maxWidth) maxWidth = m[1].length;
      }
    });
  }
  const nextNum = maxNum + 1;
  return prefix + String(nextNum).padStart(maxWidth, '0');
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// GET /exec?project=cms
// Lets the app show "Next Test Case ID / Next Bug ID" for the selected project
// BEFORE the user submits, so they can see it won't collide with an existing row.
function doGet(e) {
  const p = (e && e.parameter) || {};
  try {
    const sheet = getSheet_(p.project);
    return jsonOut_({
      ok: true,
      project: p.project,
      nextTestCaseId: nextId_(sheet, TEST_CASE_ID_COL, 'TC'),
      nextBugId: nextId_(sheet, BUG_ID_COL, 'BUG'),
    });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  }
}

// POST /exec  (form-encoded, project + row fields)
// Always re-derives the Test Case ID / Bug ID at write time (under a lock), so the
// ID actually written can never collide even if two people submit at once — the
// numbers shown by doGet are a preview, this is the authoritative source.
function doPost(e) {
  const p = (e && e.parameter) || {};
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const sheet = getSheet_(p.project);

    const testCaseId = nextId_(sheet, TEST_CASE_ID_COL, 'TC');
    const bugId = nextId_(sheet, BUG_ID_COL, 'BUG');

    const rowData = {
      'Test Case ID': testCaseId,
      'Module/Feature Name': p.module || '',
      'Test Scenario': p.scenario || '',
      'Test Case Description': p.description || '',
      'Precondition': p.precondition || '',
      'Test Steps': p.steps || '',
      'Test Data': p.testData || '',
      'Expected Result': p.expected || '',
      'Actual Result': p.actual || '',
      'Status': p.status || 'Open',
      'Priority': p.priority || '',
      'Severity': p.severity || '',
      'Environment/Browser/OS': p.environment || '',
      'Executed By': p.executedBy || '',
      'Execution Date': p.executionDate || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd-MM-yyyy'),
      'Bug ID / Defect ID': bugId,
      'Remarks/Comments': p.remarks || '',
      'starting time': p.startingTime || '',
      'end time': p.endTime || '',
      'solved by': p.solvedBy || '',
      'date': p.solvedDate || '',
    };

    sheet.appendRow(HEADERS.map((h) => rowData[h] ?? ''));

    return jsonOut_({ ok: true, testCaseId, bugId, project: p.project });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (ignored) { /* lock was never acquired */ }
  }
}
