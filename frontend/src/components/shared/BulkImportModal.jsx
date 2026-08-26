import { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, Download, X, CheckCircle, XCircle, Loader, AlertTriangle, Users } from 'lucide-react';
import ExcelJS from 'exceljs/dist/exceljs.min.js';
import { adminAPI } from '../../utils/api';

// Kept in sync with INTERN_ROLE_OPTIONS in pages/pmo/ProjectDetails.jsx and
// INTERN_DESIGNATION_OPTIONS in admin/CreateUser.jsx & EditUser.jsx — PMO's
// "Assign Interns" wizard keyword-matches this exact designation string,
// so a bulk-imported intern with a free-text designation (e.g. "Full Stack
// Web Developer") would silently never show up as assignable to PMO.
const INTERN_DESIGNATION_OPTIONS = [
  'Full Stack Intern', 'Frontend Intern', 'Backend Intern',
  'UI/UX Intern', 'QA Intern', 'Data Intern', 'DevOps Intern', 'Mobile Intern',
];

// Same 4 values accepted by normalizeEmpType() below and by the
// Employment Type dropdown in admin/CreateUser.jsx.
const EMPLOYMENT_TYPE_OPTIONS = ['Full-time', 'Part-time', 'Contract', 'Intern'];

// ─── CSV Parsing ──────────────────────────────────────────────────────────────

const parseCSVLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { result.push(current); current = ''; }
    else { current += ch; }
  }
  result.push(current);
  return result;
};

// Normalize header key: lowercase, strip spaces/dashes/underscores
const norm = (s = '') => s.toLowerCase().replace(/[\s_\-]/g, '');

const parseCSV = (text) => {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const rawHeaders = parseCSVLine(lines[0]);
  const headers = rawHeaders.map(norm);
  return lines.slice(1)
    .filter(l => l.trim())
    .map(line => {
      const values = parseCSVLine(line);
      const obj = {};
      headers.forEach((h, i) => { obj[h] = (values[i] || '').trim().replace(/^"|"$/g, ''); });
      return obj;
    });
};

// ─── Validation ───────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeEmpType = (raw = '') => {
  const s = raw.toLowerCase();
  if (s.startsWith('full')) return 'Full-time';
  if (s.startsWith('part')) return 'Part-time';
  if (s.startsWith('cont')) return 'Contract';
  if (s.startsWith('int'))  return 'Intern';
  return 'Full-time';
};

const validateAndEnrich = (rawRows, roles, departments) => {
  return rawRows.map((row, i) => {
    const errors = [];

    const name       = row[norm('name')] || '';
    const email      = row[norm('email')] || '';
    const roleName   = row[norm('role')] || '';
    const deptName   = row[norm('department')] || '';
    const phone      = row[norm('phone')] || '';
    const desig      = row[norm('designation')] || row[norm('job title')] || row[norm('jobtitle')] || '';
    const empType    = row[norm('employmentType')] || row[norm('employment type')] || '';
    const college    = row[norm('college')] || '';
    const domain     = row[norm('domain')] || '';
    const batch      = row[norm('batch')] || '';

    if (!name)  errors.push('Name is required');
    if (!email) errors.push('Email is required');
    else if (!EMAIL_RE.test(email)) errors.push('Invalid email format');
    if (!roleName) errors.push('Role is required');
    if (!deptName) errors.push('Department is required');

    const normalizedEmpType = normalizeEmpType(empType);
    if (normalizedEmpType === 'Intern' && desig &&
        !INTERN_DESIGNATION_OPTIONS.some(opt => opt.toLowerCase() === desig.toLowerCase())) {
      errors.push(`Designation must be one of: ${INTERN_DESIGNATION_OPTIONS.join(', ')}`);
    }

    const matchedRole = roles.find(r => r.name.toLowerCase() === roleName.toLowerCase());
    const matchedDept = departments.find(d => d.name.toLowerCase() === deptName.toLowerCase());

    if (roleName && !matchedRole) errors.push(`Role "${roleName}" not found`);
    if (deptName && !matchedDept) errors.push(`Department "${deptName}" not found`);

    return {
      _rowNum: i + 2,
      name, email,
      phone,
      designation:    desig,
      department:     deptName,
      role:           roleName,
      employmentType: normalizedEmpType,
      college, domain, batch,
      roleId:         matchedRole?._id || null,
      departmentId:   matchedDept?._id || null,
      errors,
      valid: errors.length === 0,
    };
  });
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function BulkImportModal({ isOpen, onClose, onComplete }) {
  const [step, setStep]               = useState('upload');
  const [dragging, setDragging]       = useState(false);
  const [parseError, setParseError]   = useState('');
  const [rows, setRows]               = useState([]);
  const [roles, setRoles]             = useState([]);
  const [departments, setDepartments] = useState([]);
  const [metaLoading, setMetaLoading] = useState(true);
  const [importResults, setImportResults] = useState([]);
  const fileInputRef = useRef(null);

  // Reset & load meta when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setStep('upload');
    setRows([]);
    setParseError('');
    setImportResults([]);
    setDragging(false);
    setMetaLoading(true);
    Promise.all([adminAPI.getRoles(), adminAPI.getDepartments()])
      .then(([rRes, dRes]) => {
        setRoles(rRes.data.data || []);
        setDepartments(dRes.data.data || []);
      })
      .catch(() => {})
      .finally(() => setMetaLoading(false));
  }, [isOpen]);

  const handleFile = useCallback((file) => {
    if (!file) return;
    const lower = file.name.toLowerCase();
    const isXlsx = lower.endsWith('.xlsx');
    const isCsv = lower.endsWith('.csv');
    if (!isXlsx && !isCsv) {
      setParseError('Please upload a .xlsx or .csv file.'); return;
    }

    const finish = (raw) => {
      if (raw.length === 0) { setParseError('File has no data rows.'); return; }
      if (raw.length > 200) { setParseError('Maximum 200 rows allowed per import.'); return; }
      setRows(validateAndEnrich(raw, roles, departments));
      setParseError('');
      setStep('preview');
    };

    if (isXlsx) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(e.target.result);
          const sheet = workbook.getWorksheet('Users') || workbook.worksheets.find(ws => ws.state !== 'hidden') || workbook.worksheets[0];
          if (!sheet) { setParseError('No sheet found in the Excel file.'); return; }
          const headerRow = sheet.getRow(1);
          const headers = [];
          headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            headers[colNumber] = norm(String(cell.value ?? ''));
          });
          const raw = [];
          sheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            const obj = {};
            let hasValue = false;
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
              const key = headers[colNumber];
              if (!key) return;
              const val = cell.value == null ? '' : String(cell.value).trim();
              obj[key] = val;
              if (val) hasValue = true;
            });
            if (hasValue) raw.push(obj);
          });
          finish(raw);
        } catch {
          setParseError('Failed to parse the Excel file. Make sure it matches the downloaded template.');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          finish(parseCSV(e.target.result));
        } catch {
          setParseError('Failed to parse CSV. Check the file format and try again.');
        }
      };
      reader.readAsText(file);
    }
  }, [roles, departments]);

  const downloadTemplate = async () => {
    const roleNames = roles.map(r => r.name);
    const deptNames = departments.map(d => d.name);

    const workbook = new ExcelJS.Workbook();

    // Hidden helper sheet holding the dropdown option lists. Data
    // validation formulae reference ranges on this sheet instead of
    // inline comma lists, since role/department names are dynamic and
    // may contain commas.
    const listSheet = workbook.addWorksheet('Lists', { state: 'hidden' });
    listSheet.getCell('A1').value = 'Roles';
    listSheet.getCell('B1').value = 'Departments';
    listSheet.getCell('C1').value = 'EmploymentTypes';
    listSheet.getCell('D1').value = 'InternDesignations';
    roleNames.forEach((v, i) => { listSheet.getCell(`A${i + 2}`).value = v; });
    deptNames.forEach((v, i) => { listSheet.getCell(`B${i + 2}`).value = v; });
    EMPLOYMENT_TYPE_OPTIONS.forEach((v, i) => { listSheet.getCell(`C${i + 2}`).value = v; });
    INTERN_DESIGNATION_OPTIONS.forEach((v, i) => { listSheet.getCell(`D${i + 2}`).value = v; });

    const sheet = workbook.addWorksheet('Users');
    const columns = [
      { header: 'name', key: 'name', width: 20 },
      { header: 'email', key: 'email', width: 26 },
      { header: 'phone', key: 'phone', width: 16 },
      { header: 'designation', key: 'designation', width: 22 },
      { header: 'department', key: 'department', width: 18 },
      { header: 'role', key: 'role', width: 16 },
      { header: 'employmentType', key: 'employmentType', width: 16 },
      { header: 'college', key: 'college', width: 20 },
      { header: 'domain', key: 'domain', width: 20 },
      { header: 'batch', key: 'batch', width: 18 },
    ];
    sheet.columns = columns;
    sheet.getRow(1).font = { bold: true };

    sheet.addRow({
      name: 'Jane Doe', email: 'jane.doe@company.com', phone: '+1234567890',
      designation: 'Senior Developer', department: deptNames[0] || 'Engineering',
      role: roleNames.find(r => /employee/i.test(r)) || roleNames[0] || 'Employee',
      employmentType: 'Full-time', college: '', domain: '', batch: '',
    });
    sheet.addRow({
      name: 'John Smith', email: 'john.smith@company.com', phone: '',
      designation: 'HR Specialist', department: deptNames[0] || 'Human Resources',
      role: roleNames.find(r => /hr/i.test(r)) || roleNames[0] || 'HR Manager',
      employmentType: 'Full-time', college: '', domain: '', batch: '',
    });
    sheet.addRow({
      name: 'Arjun Patel', email: 'arjun.patel@company.com', phone: '+919876543210',
      designation: 'Frontend Intern', department: deptNames[0] || 'Engineering',
      role: roleNames.find(r => /intern/i.test(r)) || roleNames[0] || 'Intern',
      employmentType: 'Intern', college: 'IIT Madras', domain: 'Frontend Development', batch: '2026 Summer Batch',
    });

    // Apply the same dropdown constraints the manual "Add User" form uses,
    // for every row up to 201, so bulk-added rows can't drift from what the
    // system actually accepts (this is exactly the mismatch that caused
    // interns to silently disappear from PMO's assignment lists before).
    const lastRow = 201;
    for (let r = 2; r <= lastRow; r++) {
      if (deptNames.length) {
        sheet.getCell(`E${r}`).dataValidation = {
          type: 'list', allowBlank: false, showErrorMessage: true,
          formulae: [`Lists!$B$2:$B$${deptNames.length + 1}`],
          errorTitle: 'Invalid Department', error: 'Pick a department from the dropdown list.',
        };
      }
      if (roleNames.length) {
        sheet.getCell(`F${r}`).dataValidation = {
          type: 'list', allowBlank: false, showErrorMessage: true,
          formulae: [`Lists!$A$2:$A$${roleNames.length + 1}`],
          errorTitle: 'Invalid Role', error: 'Pick a role from the dropdown list.',
        };
      }
      sheet.getCell(`G${r}`).dataValidation = {
        type: 'list', allowBlank: false, showErrorMessage: true,
        formulae: [`Lists!$C$2:$C$${EMPLOYMENT_TYPE_OPTIONS.length + 1}`],
        errorTitle: 'Invalid Employment Type', error: 'Pick an employment type from the dropdown list.',
      };
      // Designation stays a soft suggestion (showErrorMessage: false) since
      // it's free text for Employee rows — only Intern rows must match one
      // of these exactly, which the "Designation must be one of…" preview
      // check enforces after upload.
      sheet.getCell(`D${r}`).dataValidation = {
        type: 'list', allowBlank: true, showErrorMessage: false,
        formulae: [`Lists!$D$2:$D$${INTERN_DESIGNATION_OPTIONS.length + 1}`],
        promptTitle: 'Designation', showInputMessage: true,
        prompt: 'For Intern rows, pick one of the dropdown values exactly. Employee rows can type any job title.',
      };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'owms_user_import_template.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const startImport = async () => {
    const validRows = rows.filter(r => r.valid);
    if (validRows.length === 0) return;
    setImportResults(validRows.map(row => ({ row, status: 'pending', error: '' })));
    setStep('importing');

    for (let i = 0; i < validRows.length; i++) {
      setImportResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'importing' } : r));
      try {
        await adminAPI.createUser({
          name:           validRows[i].name,
          email:          validRows[i].email,
          role:           validRows[i].roleId,
          department:     validRows[i].departmentId,
          designation:    validRows[i].designation || undefined,
          phone:          validRows[i].phone || undefined,
          employmentType: validRows[i].employmentType,
          college:        validRows[i].college || undefined,
          domain:         validRows[i].domain || undefined,
          batch:          validRows[i].batch || undefined,
        });
        setImportResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'success' } : r));
      } catch (err) {
        const msg = err.response?.data?.message || 'Failed to create user';
        setImportResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'failed', error: msg } : r));
      }
      if (i < validRows.length - 1) await new Promise(res => setTimeout(res, 800));
    }
    setStep('done');
  };

  if (!isOpen) return null;

  const validRows     = rows.filter(r => r.valid);
  const errorRows     = rows.filter(r => !r.valid);
  const successCount  = importResults.filter(r => r.status === 'success').length;
  const failedCount   = importResults.filter(r => r.status === 'failed').length;
  const doneCount     = importResults.filter(r => r.status === 'success' || r.status === 'failed').length;
  const progress      = importResults.length ? Math.round((doneCount / importResults.length) * 100) : 0;

  const stepTitle = {
    upload:    'Import Users from CSV',
    preview:   `Preview — ${rows.length} row${rows.length !== 1 ? 's' : ''} parsed`,
    importing: 'Importing Users…',
    done:      'Import Complete',
  }[step];

  const stepSub = {
    upload:    'Upload a CSV file to create multiple users at once.',
    preview:   `${validRows.length} valid · ${errorRows.length} with errors`,
    importing: `${doneCount} of ${importResults.length} processed`,
    done:      `${successCount} created · ${failedCount} failed`,
  }[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden font-sans">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="px-6 py-5 border-b border-[#E2E8F0] flex items-start justify-between shrink-0">
          <div>
            <h2 className="text-[17px] font-semibold text-[#0F172A]">{stepTitle}</h2>
            <p className="text-[13px] text-[#64748B] mt-0.5">{stepSub}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F1F5F9] text-[#64748B] transition-colors mt-0.5">
            <X size={17} />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* Upload Step */}
          {step === 'upload' && (
            <div className="p-6 space-y-5">
              <input ref={fileInputRef} type="file" accept=".xlsx,.csv" className="hidden"
                onChange={(e) => handleFile(e.target.files[0])} />

              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]); }}
                onClick={() => !metaLoading && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl py-12 text-center cursor-pointer transition-all select-none ${
                  metaLoading ? 'border-[#E2E8F0] opacity-60 cursor-not-allowed' :
                  dragging    ? 'border-[#2563EB] bg-[#EFF6FF]' :
                                'border-[#CBD5E1] hover:border-[#2563EB] hover:bg-[#F8FAFC]'
                }`}
              >
                <Upload size={30} className="mx-auto mb-3 text-[#94A3B8]" />
                <p className="text-[15px] font-semibold text-[#0F172A]">
                  {metaLoading ? 'Loading roles & departments…' : 'Drag & drop your Excel or CSV file here'}
                </p>
                {!metaLoading && (
                  <p className="text-[13px] text-[#64748B] mt-1.5">
                    or <span className="text-[#2563EB] font-medium">click to browse</span> · .xlsx or .csv · max 200 rows
                  </p>
                )}
              </div>

              {parseError && (
                <div className="flex items-center gap-2 bg-[#FEF2F2] border border-[#DC2626]/30 rounded-lg px-4 py-3 text-[13px] text-[#DC2626]">
                  <AlertTriangle size={14} className="shrink-0" />
                  {parseError}
                </div>
              )}

              {/* Template card */}
              <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-[#0F172A]">Download Excel Template</p>
                    <p className="text-[12px] text-[#64748B] mt-0.5">
                      Required: <span className="font-medium text-[#0F172A]">name, email, role, department</span>
                      {' · '}Optional: phone, designation, employmentType (Employee ID is always auto-generated)
                      {' · '}Role, Department, Employment Type &amp; Designation columns have built-in dropdowns, same as the Add User form.
                    </p>
                  </div>
                  <button
                    onClick={downloadTemplate}
                    disabled={metaLoading}
                    className="shrink-0 flex items-center gap-1.5 text-[13px] font-medium text-[#2563EB] border border-[#2563EB]/40 hover:border-[#2563EB] bg-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Download size={13} />
                    Download
                  </button>
                </div>
                {!metaLoading && (
                  <div className="pt-3 border-t border-[#E2E8F0] grid grid-cols-1 sm:grid-cols-2 gap-2 text-[12px]">
                    <div>
                      <span className="font-semibold text-[#0F172A]">Available Roles: </span>
                      <span className="text-[#64748B]">{roles.map(r => r.name).join(', ') || 'None'}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-[#0F172A]">Departments: </span>
                      <span className="text-[#64748B]">{departments.map(d => d.name).join(', ') || 'None'}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Preview Step */}
          {step === 'preview' && (
            <div className="p-6 space-y-4">
              <div className="flex gap-2 flex-wrap">
                <span className="flex items-center gap-1.5 text-[12px] font-semibold bg-[#DCFCE7] text-[#16A34A] px-3 py-1.5 rounded-full">
                  <CheckCircle size={12} /> {validRows.length} valid
                </span>
                {errorRows.length > 0 && (
                  <span className="flex items-center gap-1.5 text-[12px] font-semibold bg-[#FEE2E2] text-[#DC2626] px-3 py-1.5 rounded-full">
                    <XCircle size={12} /> {errorRows.length} with errors — will be skipped
                  </span>
                )}
              </div>

              <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
                <div className="overflow-x-auto max-h-[340px] overflow-y-auto">
                  <table className="w-full text-left text-[12px] border-collapse whitespace-nowrap">
                    <thead className="sticky top-0 bg-[#F8FAFC] z-10">
                      <tr className="border-b border-[#E2E8F0]">
                        <th className="px-3 py-2.5 font-semibold text-[#64748B] w-8">#</th>
                        <th className="px-3 py-2.5 font-semibold text-[#64748B]">Name</th>
                        <th className="px-3 py-2.5 font-semibold text-[#64748B]">Email</th>
                        <th className="px-3 py-2.5 font-semibold text-[#64748B]">Role</th>
                        <th className="px-3 py-2.5 font-semibold text-[#64748B]">Department</th>
                        <th className="px-3 py-2.5 font-semibold text-[#64748B]">Designation</th>
                        <th className="px-3 py-2.5 font-semibold text-[#64748B]">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr key={i} className={`border-b border-[#F1F5F9] last:border-0 ${row.valid ? '' : 'bg-[#FEF2F2]'}`}>
                          <td className="px-3 py-2.5 text-[#94A3B8]">{row._rowNum}</td>
                          <td className="px-3 py-2.5 font-medium text-[#0F172A]">
                            {row.name || <span className="text-[#DC2626] italic">missing</span>}
                          </td>
                          <td className="px-3 py-2.5 text-[#64748B]">
                            {row.email || <span className="text-[#DC2626] italic">missing</span>}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={row.roleId ? 'text-[#0F172A]' : 'text-[#DC2626]'}>
                              {row.role || <em>missing</em>}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={row.departmentId ? 'text-[#0F172A]' : 'text-[#DC2626]'}>
                              {row.department || <em>missing</em>}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-[#64748B]">{row.designation || '—'}</td>
                          <td className="px-3 py-2.5">
                            {row.valid ? (
                              <span className="text-[#16A34A] font-semibold">✓ Valid</span>
                            ) : (
                              <span className="text-[#DC2626]" title={row.errors.join('\n')}>
                                ✗ {row.errors[0]}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Importing / Done Step */}
          {(step === 'importing' || step === 'done') && (
            <div className="p-6 space-y-4">

              {step === 'importing' && (
                <div>
                  <div className="flex justify-between mb-1.5 text-[12px] font-medium text-[#64748B]">
                    <span>Importing users…</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#2563EB] rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {step === 'done' && (
                <div className={`flex items-center gap-3 rounded-xl p-4 border ${
                  failedCount === 0
                    ? 'bg-[#F0FDF4] border-[#16A34A]/20'
                    : 'bg-[#FFFBEB] border-[#D97706]/20'
                }`}>
                  {failedCount === 0
                    ? <CheckCircle size={20} className="text-[#16A34A] shrink-0" />
                    : <AlertTriangle size={20} className="text-[#D97706] shrink-0" />}
                  <div>
                    <p className="text-[14px] font-semibold text-[#0F172A]">
                      {failedCount === 0 ? 'All users created successfully' : 'Import completed with some failures'}
                    </p>
                    <p className="text-[12px] text-[#64748B] mt-0.5">
                      {successCount} created · {failedCount} failed
                    </p>
                  </div>
                </div>
              )}

              <div className="border border-[#E2E8F0] rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                {importResults.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-[#F1F5F9] last:border-0">
                    <div className="w-5 flex justify-center shrink-0">
                      {r.status === 'pending'   && <div className="w-2 h-2 rounded-full bg-[#CBD5E1]" />}
                      {r.status === 'importing' && <Loader size={14} className="text-[#2563EB] animate-spin" />}
                      {r.status === 'success'   && <CheckCircle size={14} className="text-[#16A34A]" />}
                      {r.status === 'failed'    && <XCircle size={14} className="text-[#DC2626]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[#0F172A] truncate">{r.row.name}</p>
                      <p className="text-[12px] text-[#64748B] truncate">{r.row.email}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      {r.status === 'pending'   && <span className="text-[11px] text-[#94A3B8]">Pending</span>}
                      {r.status === 'importing' && <span className="text-[11px] text-[#2563EB]">Importing…</span>}
                      {r.status === 'success'   && <span className="text-[11px] text-[#16A34A] font-medium">Created</span>}
                      {r.status === 'failed'    && <span className="text-[11px] text-[#DC2626] max-w-[160px] block">{r.error}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* ── Footer ─────────────────────────────────────────────────────────── */}
        <div className="px-6 py-4 border-t border-[#E2E8F0] flex items-center justify-between shrink-0">
          {step === 'upload' && (
            <>
              <button onClick={onClose} className="text-[13px] font-medium text-[#64748B] hover:text-[#0F172A] transition-colors">
                Cancel
              </button>
              <p className="text-[12px] text-[#94A3B8]">Upload a file to continue</p>
            </>
          )}
          {step === 'preview' && (
            <>
              <button onClick={() => setStep('upload')} className="text-[13px] font-medium text-[#64748B] hover:text-[#0F172A] transition-colors flex items-center gap-1">
                ← Back
              </button>
              <button
                onClick={startImport}
                disabled={validRows.length === 0}
                className="bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2 rounded-lg text-[13px] font-semibold transition-colors flex items-center gap-2"
              >
                <Users size={14} />
                Import {validRows.length} User{validRows.length !== 1 ? 's' : ''}
              </button>
            </>
          )}
          {step === 'importing' && (
            <p className="text-[13px] text-[#64748B] w-full text-center">
              Please wait — do not close this window
            </p>
          )}
          {step === 'done' && (
            <>
              {failedCount > 0 && (
                <button onClick={() => { setStep('upload'); setRows([]); setImportResults([]); }}
                  className="text-[13px] font-medium text-[#64748B] hover:text-[#0F172A] transition-colors">
                  Import More
                </button>
              )}
              <button
                onClick={onComplete}
                className="ml-auto bg-[#0F172A] hover:bg-[#1E293B] text-white px-5 py-2 rounded-lg text-[13px] font-semibold transition-colors"
              >
                Done
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
