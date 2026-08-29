// Deploy this file as: Deploy -> New deployment -> Web app
// Execute as: Me | Who has access: Anyone (or your organization's users)
const SPREADSHEET_ID = '1ZQXAj0bu_SYojJuGzZdsJU9n30UmOx2Ls8PW2WFy44A';
const SHEET_NAME = 'Bugs';

function doPost(e) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  const headers = ['Ticket ID','Timestamp','Raised By','Email','Role','Bug Title','Module','Severity','Steps to Reproduce','Expected Result','Actual Result','Status'];
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);
  const p = e.parameter || {};
  sheet.appendRow(headers.map(h => ({
    'Ticket ID':p.ticketId,'Timestamp':p.timestamp || new Date(),'Raised By':p.raisedBy,'Email':p.email,
    'Role':p.role,'Bug Title':p.title,'Module':p.module,'Severity':p.severity,
    'Steps to Reproduce':p.steps,'Expected Result':p.expected,'Actual Result':p.actual,'Status':p.status || 'Open'
  }[h] ?? '')));
  return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON);
}
