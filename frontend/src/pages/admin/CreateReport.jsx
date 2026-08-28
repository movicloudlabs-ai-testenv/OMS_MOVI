import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart2, CheckCircle2, Info, Table, PieChart, Users, 
  Building2, Shield, Lock, ScrollText, Briefcase, CheckSquare, 
  Plus, X, EyeOff, FileCheck, AlertCircle
} from 'lucide-react';

// --- DATA CONSTANTS ---
const CATEGORIES = [
  'User Reports', 'Department Reports', 'Role Reports', 'Permission Reports',
  'Security Reports', 'Audit Reports', 'Project Reports', 'Task Reports', 'Financial Reports'
];

const DATA_SOURCES = [
  { id: 'Users', icon: Users, desc: "Employee accounts and profiles" },
  { id: 'Departments', icon: Building2, desc: "Org structure and headcount" },
  { id: 'Roles', icon: Shield, desc: "Role assignments and counts" },
  { id: 'Permissions', icon: Lock, desc: "Permission grants and matrix" },
  { id: 'Audit Logs', icon: ScrollText, desc: "System activity and changes" },
  { id: 'Projects', icon: Briefcase, desc: "Project status and timelines" },
  { id: 'Tasks', icon: CheckSquare, desc: "Task assignments and progress" },
  { id: 'Reports', icon: BarChart2, desc: "Report run history and stats" },
];

const SOURCE_COLUMNS = {
  'Users': ['Full Name', 'Email', 'Role', 'Department', 'Status', 'Created Date', 'Last Login'],
  'Departments': ['Department Name', 'Head', 'Budget', 'Headcount', 'Created Date'],
  'Roles': ['Role Name', 'Description', 'User Count', 'Created Date'],
  'Permissions': ['Permission Name', 'Resource', 'Action', 'Assigned Roles'],
  'Audit Logs': ['Timestamp', 'User', 'Action', 'Module', 'IP Address', 'Result', 'Details'],
  'Projects': ['Project Name', 'Manager', 'Status', 'Start Date', 'End Date', 'Budget'],
  'Tasks': ['Task Title', 'Assignee', 'Status', 'Priority', 'Due Date', 'Created Date'],
  'Reports': ['Report Name', 'Category', 'Schedule', 'Last Run Status', 'Created By'],
};

const OPERATORS = ['equals', 'not equals', 'contains', 'greater than', 'less than', 'is empty', 'is not empty'];
const FORMATS = ['PDF', 'XLSX', 'CSV'];
const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const ROLES = [
  { name: 'Super Admin', color: 'bg-red-100 text-red-700', locked: true },
  { name: 'HR Manager', color: 'bg-blue-100 text-blue-700', locked: false },
  { name: 'PMO Lead', color: 'bg-purple-100 text-purple-700', locked: false },
  { name: 'Department Head', color: 'bg-amber-100 text-amber-700', locked: false },
  { name: 'Intern', color: 'bg-green-100 text-green-700', locked: false },
  { name: 'Viewer', color: 'bg-gray-100 text-gray-700', locked: false },
];

// --- SUB-COMPONENTS ---
const Toast = ({ show }) => (
  <AnimatePresence>
    {show && (
      <motion.div
        initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 100, opacity: 0 }} transition={{ duration: 0.3 }}
        className="fixed top-4 right-4 z-[100] bg-[#16A34A] text-white rounded-lg px-4 py-3 flex items-center gap-2 shadow-lg"
      >
        <CheckCircle2 size={18} />
        <span className="text-sm font-medium">Report created successfully</span>
      </motion.div>
    )}
  </AnimatePresence>
);

const FormCard = ({ title, subtitle, children }) => (
  <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 mb-6 shadow-sm">
    <h2 className="text-base font-semibold text-[#0F172A] mb-1">{title}</h2>
    {subtitle && <p className="text-sm text-[#64748B] mb-5">{subtitle}</p>}
    <div className="space-y-6">
      {children}
    </div>
  </div>
);

// --- MAIN PAGE COMPONENT ---
export default function AdminCreateReport() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "", category: "", description: "", reportType: "",
    dataSources: [], filters: [], dateRange: "all",
    customDateFrom: "", customDateTo: "", outputFormats: [],
    columns: [], sortBy: "", sortOrder: "asc",
    schedule: "Manual", scheduleTime: "", scheduleDays: [], scheduleDay: "",
    autoExpiry: false, autoExpiryDays: 30,
    notify: false, notifyEmails: ["admin@movicloudlabs.com"],
    visibility: "private", sharedRoles: ["Super Admin"]
  });
  const [errors, setErrors] = useState({});
  const [showToast, setShowToast] = useState(false);
  const containerRef = useRef(null);

  // Compute available columns based on selected sources
  const availableColumns = useMemo(() => {
    let cols = [];
    formData.dataSources.forEach(src => {
      if (SOURCE_COLUMNS[src]) {
        cols = [...cols, ...SOURCE_COLUMNS[src]];
      }
    });
    return Array.from(new Set(cols));
  }, [formData.dataSources]);

  const handleSourceToggle = (id) => {
    setFormData(prev => {
      const selected = prev.dataSources.includes(id);
      const newSources = selected ? prev.dataSources.filter(s => s !== id) : [...prev.dataSources, id];
      // remove columns that are no longer available
      let newCols = [];
      newSources.forEach(src => {
        if (SOURCE_COLUMNS[src]) newCols = [...newCols, ...SOURCE_COLUMNS[src]];
      });
      const validCols = new Set(newCols);
      const updatedSelectedCols = prev.columns.filter(c => validCols.has(c));
      return { ...prev, dataSources: newSources, columns: updatedSelectedCols };
    });
    if (errors.dataSources) setErrors(e => ({...e, dataSources: null}));
  };

  const handleFormatToggle = (fmt) => {
    setFormData(prev => {
      const selected = prev.outputFormats.includes(fmt);
      return { ...prev, outputFormats: selected ? prev.outputFormats.filter(f => f !== fmt) : [...prev.outputFormats, fmt] };
    });
    if (errors.outputFormats) setErrors(e => ({...e, outputFormats: null}));
  };

  const handleFilterAdd = () => {
    setFormData(prev => ({
      ...prev, filters: [...prev.filters, { field: availableColumns[0] || '', operator: 'equals', value: '' }]
    }));
  };

  const handleFilterUpdate = (index, field, value) => {
    const newFilters = [...formData.filters];
    newFilters[index] = { ...newFilters[index], [field]: value };
    setFormData({ ...formData, filters: newFilters });
  };

  const handleFilterRemove = (index) => {
    setFormData(prev => ({ ...prev, filters: prev.filters.filter((_, i) => i !== index) }));
  };

  const handleAddQuickFilter = (label) => {
    let newFilter = { field: '', operator: 'equals', value: '' };
    if (label === 'Active users only') newFilter = { field: 'Status', operator: 'equals', value: 'Active' };
    else if (label === 'Last 30 days') newFilter = { field: 'Created Date', operator: 'greater than', value: '30_days_ago' };
    else if (label === 'Current department') newFilter = { field: 'Department', operator: 'equals', value: 'Current' };
    else if (label === 'Failed status only') newFilter = { field: 'Status', operator: 'equals', value: 'FAILED' };
    else if (label === 'This quarter') newFilter = { field: 'Created Date', operator: 'greater than', value: 'this_quarter' };
    
    setFormData(prev => ({ ...prev, filters: [...prev.filters, newFilter] }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = "This field is required";
    if (!formData.category) newErrors.category = "This field is required";
    if (!formData.reportType) newErrors.reportType = "This field is required";
    if (formData.dataSources.length === 0) newErrors.dataSources = "Select at least one data source";
    if (formData.outputFormats.length === 0) newErrors.outputFormats = "Select at least one format";
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      // Find first error and scroll to it (mock behavior just scrolls to top)
      if (containerRef.current) containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (validate()) {
      setShowToast(true);
      setTimeout(() => {
        navigate('/admin/reports');
      }, 1500);
    }
  };

  // Calculate completed sections out of 6
  let completedCount = 0;
  if (formData.name && formData.category && formData.reportType) completedCount++;
  if (formData.dataSources.length > 0) completedCount++;
  if (formData.dateRange) completedCount++; // Filters always have some state
  if (formData.outputFormats.length > 0 && formData.columns.length > 0) completedCount++;
  if (formData.schedule) completedCount++; // Schedule always has a default
  if (formData.visibility) completedCount++; // Visibility always has a default

  return (
    <div className="flex flex-col lg:flex-row min-h-screen font-sans bg-[#1E293B]">
      <Toast show={showToast} />
      
      {/* LEFT PANE */}
      <div className="w-full lg:w-[40%] bg-[#1E293B] text-white p-8 lg:p-12 sticky top-0 h-screen overflow-y-auto custom-scrollbar flex flex-col justify-between">
        <div>
          <BarChart2 size={32} className="text-[#2563EB]" />
          <h1 className="text-2xl font-bold text-white tracking-tight mt-3">Create a Custom Report</h1>
          <p className="text-[#94A3B8] text-sm mt-3 leading-relaxed">
            Build targeted reports from any data source in OWMS. Custom reports can be scheduled, shared, and exported in multiple formats.
          </p>

          <div className="mt-8 space-y-4">
            <div className="flex gap-3 items-start">
              <CheckCircle2 size={18} className="text-[#2563EB] mt-0.5 shrink-0" />
              <p className="text-sm text-[#94A3B8]">Choose your data sources across any OWMS module</p>
            </div>
            <div className="flex gap-3 items-start">
              <CheckCircle2 size={18} className="text-[#2563EB] mt-0.5 shrink-0" />
              <p className="text-sm text-[#94A3B8]">Apply filters to scope the data to what matters</p>
            </div>
            <div className="flex gap-3 items-start">
              <CheckCircle2 size={18} className="text-[#2563EB] mt-0.5 shrink-0" />
              <p className="text-sm text-[#94A3B8]">Schedule automatic generation or run on demand</p>
            </div>
            <div className="flex gap-3 items-start">
              <CheckCircle2 size={18} className="text-[#2563EB] mt-0.5 shrink-0" />
              <p className="text-sm text-[#94A3B8]">Export as PDF, Excel, or CSV instantly</p>
            </div>
          </div>

          <div className="bg-[#0F172A] rounded-xl p-5 mt-8 border border-[#334155]">
            <label className="text-xs tracking-widest text-[#475569] font-semibold mb-3 block uppercase">
              Report Preview
            </label>
            <div className="space-y-4">
              <div>
                <span className="font-mono text-sm text-white">{formData.name || 'Untitled Report'}</span>
                <span className="text-xs text-[#64748B] block mt-1">{formData.category || '—'}</span>
              </div>
              
              <div>
                <span className="text-[10px] uppercase text-[#475569] font-bold tracking-wider block mb-1">Data Sources</span>
                <div className="flex flex-wrap gap-1.5">
                  {formData.dataSources.length > 0 ? formData.dataSources.map(src => (
                    <span key={src} className="bg-[#1E293B] border border-[#334155] text-[#94A3B8] text-xs px-2 py-0.5 rounded">
                      {src}
                    </span>
                  )) : <span className="text-xs text-[#64748B]">—</span>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] uppercase text-[#475569] font-bold tracking-wider block mb-1">Schedule</span>
                  <span className="text-xs text-[#64748B]">{formData.schedule}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-[#475569] font-bold tracking-wider block mb-1">Filters</span>
                  <span className="inline-block bg-[#2563EB] text-white text-xs px-2 py-0.5 rounded-full font-medium">
                    {formData.filters.length > 0 ? `${formData.filters.length} filters` : 'No filters'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase text-[#475569] font-bold tracking-wider block mb-1">Output Formats</span>
                <div className="flex flex-wrap gap-1.5">
                  {formData.outputFormats.length > 0 ? formData.outputFormats.map(fmt => (
                    <span key={fmt} className="bg-[#1E293B] border border-[#334155] text-xs text-[#94A3B8] px-2 py-0.5 rounded">
                      {fmt}
                    </span>
                  )) : <span className="text-xs text-[#64748B]">—</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-[#1E293B] mt-6 mb-4"></div>
          
          <div className="flex gap-2 items-start text-xs text-[#475569]">
            <Info size={14} className="shrink-0 mt-0.5" />
            <p>Custom reports can be created by Admins, HR Managers (HR data), and PMO Leads (project data). System reports are auto-generated.</p>
          </div>
        </div>

        <button 
          onClick={() => navigate('/admin/reports')}
          className="text-[#64748B] hover:text-white text-sm font-medium transition-colors text-left mt-12 w-fit"
        >
          &larr; Back to Reports
        </button>
      </div>

      {/* RIGHT PANE */}
      <div className="w-full lg:w-[60%] bg-[#F8FAFC] h-screen overflow-y-auto custom-scrollbar relative" ref={containerRef}>
        <div className="px-8 pt-8 pb-32 max-w-3xl mx-auto">
          
          {/* CARD 1: Report Identity */}
          <FormCard title="Report Identity">
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Report Name <span className="text-[#DC2626]">*</span></label>
              <input 
                type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="e.g. Monthly HR Headcount Summary"
                className={`w-full bg-white border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#2563EB] transition-colors ${errors.name ? 'border-[#DC2626]' : 'border-[#E2E8F0] focus:border-[#2563EB]'}`}
              />
              {errors.name && <p className="text-[#DC2626] text-xs mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Category <span className="text-[#DC2626]">*</span></label>
              <select 
                value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}
                className={`w-full bg-white border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#2563EB] cursor-pointer transition-colors ${errors.category ? 'border-[#DC2626]' : 'border-[#E2E8F0] focus:border-[#2563EB]'}`}
              >
                <option value="">Select Category...</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.category && <p className="text-[#DC2626] text-xs mt-1">{errors.category}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Description</label>
              <textarea 
                rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                placeholder="Describe what this report tracks and who it's for..."
                className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-colors resize-none"
              ></textarea>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Report Type <span className="text-[#DC2626]">*</span></label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div 
                  onClick={() => { setFormData({...formData, reportType: 'tabular'}); setErrors(e => ({...e, reportType: null})); }}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors flex items-start gap-3 ${formData.reportType === 'tabular' ? 'border-[#2563EB] bg-[#EFF6FF]' : 'border-[#E2E8F0] bg-white hover:border-[#CBD5E1]'}`}
                >
                  <Table className={formData.reportType === 'tabular' ? 'text-[#2563EB]' : 'text-[#64748B]'} size={20} />
                  <div>
                    <h3 className={`text-sm font-medium ${formData.reportType === 'tabular' ? 'text-[#2563EB]' : 'text-[#0F172A]'}`}>Tabular Report</h3>
                    <p className="text-xs text-[#64748B] mt-1">Rows and columns — best for data exports</p>
                  </div>
                </div>
                <div 
                  onClick={() => { setFormData({...formData, reportType: 'summary'}); setErrors(e => ({...e, reportType: null})); }}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors flex items-start gap-3 ${formData.reportType === 'summary' ? 'border-[#2563EB] bg-[#EFF6FF]' : 'border-[#E2E8F0] bg-white hover:border-[#CBD5E1]'}`}
                >
                  <PieChart className={formData.reportType === 'summary' ? 'text-[#2563EB]' : 'text-[#64748B]'} size={20} />
                  <div>
                    <h3 className={`text-sm font-medium ${formData.reportType === 'summary' ? 'text-[#2563EB]' : 'text-[#0F172A]'}`}>Summary Report</h3>
                    <p className="text-xs text-[#64748B] mt-1">Aggregated totals — best for dashboards</p>
                  </div>
                </div>
              </div>
              {errors.reportType && <p className="text-[#DC2626] text-xs mt-1">{errors.reportType}</p>}
            </div>
          </FormCard>

          {/* CARD 2: Data Sources */}
          <FormCard title="Data Sources" subtitle="Select which OWMS modules to pull data from">
            <div>
              <p className="text-xs text-[#64748B] mb-3">Selecting multiple sources creates a joined report</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {DATA_SOURCES.map(src => {
                  const isSelected = formData.dataSources.includes(src.id);
                  const Icon = src.icon;
                  return (
                    <div 
                      key={src.id} onClick={() => handleSourceToggle(src.id)}
                      className={`border rounded-lg p-3 flex items-center gap-3 cursor-pointer transition-colors ${isSelected ? 'border-[#2563EB] bg-[#EFF6FF]' : 'bg-white border-[#E2E8F0] hover:border-[#CBD5E1]'}`}
                    >
                      <div className={`p-2 rounded-md ${isSelected ? 'bg-white text-[#2563EB]' : 'bg-[#F1F5F9] text-[#64748B]'}`}>
                        <Icon size={16} />
                      </div>
                      <div>
                        <h3 className={`text-sm font-medium ${isSelected ? 'text-[#2563EB]' : 'text-[#0F172A]'}`}>{src.id}</h3>
                        <p className="text-[11px] text-[#64748B] mt-0.5">{src.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-sm font-medium text-[#2563EB]">{formData.dataSources.length} source(s) selected</p>
              {errors.dataSources && <p className="text-[#DC2626] text-xs mt-1">{errors.dataSources}</p>}
            </div>
          </FormCard>

          {/* CARD 3: Filters & Scope */}
          <FormCard title="Filters & Scope" subtitle="Narrow down the data this report will include. Leave empty to include all records.">
            <div>
              <div className="space-y-3 mb-4">
                <AnimatePresence>
                  {formData.filters.map((filter, index) => (
                    <motion.div 
                      key={index} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
                      className="flex items-center gap-3 overflow-hidden"
                    >
                      <select 
                        value={filter.field} onChange={e => handleFilterUpdate(index, 'field', e.target.value)}
                        className="bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm text-[#0F172A] focus:outline-none focus:border-[#2563EB] flex-1"
                      >
                        {availableColumns.length > 0 ? availableColumns.map(c => <option key={c} value={c}>{c}</option>) : <option value="">Select field...</option>}
                      </select>
                      <select 
                        value={filter.operator} onChange={e => handleFilterUpdate(index, 'operator', e.target.value)}
                        className="bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm text-[#0F172A] focus:outline-none focus:border-[#2563EB] w-32 shrink-0"
                      >
                        {OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
                      </select>
                      <input 
                        type="text" value={filter.value} onChange={e => handleFilterUpdate(index, 'value', e.target.value)} placeholder="Value..."
                        className="bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm text-[#0F172A] focus:outline-none focus:border-[#2563EB] flex-1"
                      />
                      <button onClick={() => handleFilterRemove(index)} className="text-[#DC2626] hover:bg-red-50 p-1.5 rounded transition-colors shrink-0">
                        <X size={16} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <button 
                onClick={handleFilterAdd} disabled={availableColumns.length === 0}
                className="text-sm font-medium text-[#2563EB] hover:text-blue-700 hover:bg-[#EFF6FF] px-3 py-1.5 rounded transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={16} /> Add Filter
              </button>

              <div className="mt-5">
                <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-2">Quick Filters</p>
                <div className="flex flex-wrap gap-2">
                  {['Active users only', 'Last 30 days', 'Current department', 'Failed status only', 'This quarter'].map(q => (
                    <button 
                      key={q} onClick={() => handleAddQuickFilter(q)}
                      className="bg-[#F1F5F9] border border-[#E2E8F0] text-sm text-[#0F172A] px-3 py-1 rounded-full hover:bg-[#E2E8F0] transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-[#E2E8F0] my-5"></div>

              <div>
                <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Report Date Range</label>
                <select 
                  value={formData.dateRange} onChange={e => setFormData({...formData, dateRange: e.target.value})}
                  className="w-full sm:w-1/2 bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm text-[#0F172A] focus:outline-none focus:border-[#2563EB] cursor-pointer"
                >
                  <option value="all">All Time</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="1q">Last Quarter</option>
                  <option value="1y">Last Year</option>
                  <option value="custom">Custom Range</option>
                </select>
                
                <AnimatePresence>
                  {formData.dateRange === 'custom' && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex gap-3 mt-3 overflow-hidden">
                      <div className="flex-1">
                        <label className="block text-xs text-[#64748B] mb-1">From</label>
                        <input type="date" value={formData.customDateFrom} onChange={e => setFormData({...formData, customDateFrom: e.target.value})} className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none"/>
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-[#64748B] mb-1">To</label>
                        <input type="date" value={formData.customDateTo} onChange={e => setFormData({...formData, customDateTo: e.target.value})} className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none"/>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </FormCard>

          {/* CARD 4: Output & Format */}
          <FormCard title="Output & Format" subtitle="Choose how this report will be generated and delivered">
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-2">Output Formats <span className="text-[#DC2626]">*</span></label>
              <div className="flex gap-2 mb-1">
                {FORMATS.map(fmt => {
                  const isSelected = formData.outputFormats.includes(fmt);
                  return (
                    <button 
                      key={fmt} onClick={() => handleFormatToggle(fmt)}
                      className={`border rounded-lg px-4 py-2 text-sm font-medium transition-colors ${isSelected ? 'bg-[#2563EB] text-white border-[#2563EB]' : 'bg-white text-[#64748B] border-[#E2E8F0] hover:bg-[#F8FAFC]'}`}
                    >
                      {fmt}
                    </button>
                  );
                })}
              </div>
              {errors.outputFormats && <p className="text-[#DC2626] text-xs mt-1">{errors.outputFormats}</p>}
            </div>

            <div className="border-t border-[#E2E8F0] my-5"></div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <label className="block text-sm font-medium text-[#0F172A]">Columns to include</label>
                  <p className="text-xs text-[#64748B]">Available columns depend on selected data sources</p>
                </div>
                {availableColumns.length > 0 && (
                  <div className="flex gap-2 text-xs">
                    <button onClick={() => setFormData({...formData, columns: availableColumns})} className="text-[#2563EB] font-medium hover:underline">Select All</button>
                    <span className="text-[#CBD5E1]">|</span>
                    <button onClick={() => setFormData({...formData, columns: []})} className="text-[#64748B] hover:text-[#0F172A]">Deselect All</button>
                  </div>
                )}
              </div>
              
              {availableColumns.length === 0 ? (
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] border-dashed rounded-lg p-6 text-center text-sm text-[#94A3B8]">
                  Select data sources first to see available columns
                </div>
              ) : (
                <div className="border border-[#E2E8F0] rounded-lg p-4 bg-[#F8FAFC] max-h-48 overflow-y-auto custom-scrollbar">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {availableColumns.map(col => (
                      <label key={col} className="flex items-center gap-2 text-sm text-[#0F172A] cursor-pointer hover:bg-white p-1 rounded transition-colors">
                        <input 
                          type="checkbox" 
                          checked={formData.columns.includes(col)}
                          onChange={e => {
                            if (e.target.checked) setFormData({...formData, columns: [...formData.columns, col]});
                            else setFormData({...formData, columns: formData.columns.filter(c => c !== col)});
                          }}
                          className="w-4 h-4 rounded border-[#CBD5E1] text-[#2563EB] focus:ring-[#2563EB] cursor-pointer"
                        />
                        {col}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Sort By</label>
                <select 
                  value={formData.sortBy} onChange={e => setFormData({...formData, sortBy: e.target.value})}
                  disabled={formData.columns.length === 0}
                  className="w-full bg-white border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm text-[#0F172A] focus:outline-none focus:border-[#2563EB] disabled:bg-[#F8FAFC] disabled:text-[#94A3B8]"
                >
                  <option value="">Default order</option>
                  {formData.columns.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="sm:w-48">
                <label className="block text-sm font-medium text-[#0F172A] mb-1.5">Order</label>
                <div className="flex border border-[#E2E8F0] rounded-lg overflow-hidden h-[38px]">
                  <button onClick={() => setFormData({...formData, sortOrder: 'asc'})} className={`flex-1 text-sm font-medium transition-colors ${formData.sortOrder === 'asc' ? 'bg-[#EFF6FF] text-[#2563EB]' : 'bg-white text-[#64748B] hover:bg-[#F8FAFC]'}`}>Ascending</button>
                  <div className="w-[1px] bg-[#E2E8F0]"></div>
                  <button onClick={() => setFormData({...formData, sortOrder: 'desc'})} className={`flex-1 text-sm font-medium transition-colors ${formData.sortOrder === 'desc' ? 'bg-[#EFF6FF] text-[#2563EB]' : 'bg-white text-[#64748B] hover:bg-[#F8FAFC]'}`}>Descending</button>
                </div>
              </div>
            </div>
          </FormCard>

          {/* CARD 5: Schedule & Delivery */}
          <FormCard title="Schedule & Delivery">
            <div>
              <label className="block text-sm font-medium text-[#0F172A] mb-2">Schedule Frequency</label>
              <div className="flex flex-wrap border border-[#E2E8F0] rounded-lg overflow-hidden w-full">
                {['Manual', 'Daily', 'Weekly', 'Monthly', 'On-Demand'].map((freq, i, arr) => {
                  const isSelected = formData.schedule === freq;
                  return (
                    <button
                      key={freq} onClick={() => setFormData({...formData, schedule: freq})}
                      className={`flex-1 min-w-[80px] py-2 text-sm font-medium transition-colors ${isSelected ? 'bg-[#2563EB] text-white' : 'bg-white text-[#64748B] hover:bg-[#F8FAFC]'} ${i !== arr.length-1 ? 'border-r border-[#E2E8F0]' : ''}`}
                    >
                      {freq}
                    </button>
                  );
                })}
              </div>
              
              <div className="mt-4 bg-[#F8FAFC] rounded-lg p-4 border border-[#E2E8F0]">
                {formData.schedule === 'Manual' || formData.schedule === 'On-Demand' ? (
                  <div className="flex items-center gap-2 text-sm text-[#475569]">
                    <Info size={16} className="text-[#2563EB]" />
                    This report will only run when manually triggered.
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-4 items-end">
                    {formData.schedule === 'Weekly' && (
                      <div className="w-full sm:w-auto">
                        <label className="block text-xs font-medium text-[#64748B] mb-1.5 uppercase tracking-wide">Run on Days</label>
                        <div className="flex gap-1">
                          {DAYS_OF_WEEK.map(day => (
                            <button key={day} onClick={() => {
                              const selected = formData.scheduleDays.includes(day);
                              setFormData({...formData, scheduleDays: selected ? formData.scheduleDays.filter(d => d !== day) : [...formData.scheduleDays, day]});
                            }} className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${formData.scheduleDays.includes(day) ? 'bg-[#2563EB] text-white' : 'bg-white border border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1]'}`}>
                              {day.charAt(0)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {formData.schedule === 'Monthly' && (
                      <div className="w-full sm:w-auto">
                        <label className="block text-xs font-medium text-[#64748B] mb-1.5 uppercase tracking-wide">Day of month</label>
                        <input type="number" min="1" max="31" placeholder="1-31" value={formData.scheduleDay} onChange={e => setFormData({...formData, scheduleDay: e.target.value})} className="w-24 border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2563EB]"/>
                      </div>
                    )}
                    <div className="w-full sm:w-auto">
                      <label className="block text-xs font-medium text-[#64748B] mb-1.5 uppercase tracking-wide">Run at time</label>
                      <input type="time" value={formData.scheduleTime} onChange={e => setFormData({...formData, scheduleTime: e.target.value})} className="border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2563EB] w-full sm:w-32"/>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-[#E2E8F0] my-5"></div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-[#0F172A]">Auto-delete old runs after</label>
                </div>
                <div className="flex items-center gap-3">
                  <AnimatePresence>
                    {formData.autoExpiry && (
                      <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="flex items-center gap-2 overflow-hidden">
                        <input type="number" min="1" value={formData.autoExpiryDays} onChange={e => setFormData({...formData, autoExpiryDays: e.target.value})} className="w-16 border border-[#E2E8F0] rounded py-1 px-2 text-sm text-center focus:outline-none focus:border-[#2563EB]"/>
                        <span className="text-sm text-[#64748B]">days</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <button onClick={() => setFormData({...formData, autoExpiry: !formData.autoExpiry})} className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors ${formData.autoExpiry ? 'bg-[#2563EB]' : 'bg-[#CBD5E1]'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.autoExpiry ? 'translate-x-2' : '-translate-x-2'}`} />
                  </button>
                </div>
              </div>

              <div className="flex items-start justify-between">
                <div className="flex-1 mr-4">
                  <label className="block text-sm font-medium text-[#0F172A]">Notify on completion</label>
                  <AnimatePresence>
                    {formData.notify && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-2 space-y-2 overflow-hidden">
                        {formData.notifyEmails.map((email, idx) => (
                          <div key={idx} className="flex gap-2">
                            <input type="email" value={email} onChange={e => {
                              const newArr = [...formData.notifyEmails];
                              newArr[idx] = e.target.value;
                              setFormData({...formData, notifyEmails: newArr});
                            }} className="flex-1 border border-[#E2E8F0] rounded py-1.5 px-3 text-sm focus:outline-none focus:border-[#2563EB]"/>
                            {idx > 0 && <button onClick={() => setFormData(p => ({...p, notifyEmails: p.notifyEmails.filter((_, i) => i !== idx)}))} className="text-[#DC2626] p-1.5 hover:bg-red-50 rounded transition-colors"><X size={16}/></button>}
                          </div>
                        ))}
                        <button onClick={() => setFormData(p => ({...p, notifyEmails: [...p.notifyEmails, ""]}))} className="text-xs font-medium text-[#2563EB] hover:underline mt-1 block">
                          + Add recipient
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <button onClick={() => setFormData({...formData, notify: !formData.notify})} className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors mt-1 ${formData.notify ? 'bg-[#2563EB]' : 'bg-[#CBD5E1]'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.notify ? 'translate-x-2' : '-translate-x-2'}`} />
                </button>
              </div>
            </div>
          </FormCard>

          {/* CARD 6: Access & Visibility */}
          <FormCard title="Access & Visibility">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div 
                onClick={() => setFormData({...formData, visibility: 'private'})}
                className={`border rounded-lg p-4 cursor-pointer transition-colors flex items-start gap-3 ${formData.visibility === 'private' ? 'border-[#2563EB] bg-[#EFF6FF]' : 'border-[#E2E8F0] bg-white hover:border-[#CBD5E1]'}`}
              >
                <EyeOff className={formData.visibility === 'private' ? 'text-[#2563EB]' : 'text-[#64748B]'} size={20} />
                <div>
                  <h3 className={`text-sm font-medium ${formData.visibility === 'private' ? 'text-[#2563EB]' : 'text-[#0F172A]'}`}>Private</h3>
                  <p className="text-xs text-[#64748B] mt-1">Only you and Super Admins can see this report</p>
                </div>
              </div>
              <div 
                onClick={() => setFormData({...formData, visibility: 'shared'})}
                className={`border rounded-lg p-4 cursor-pointer transition-colors flex items-start gap-3 ${formData.visibility === 'shared' ? 'border-[#2563EB] bg-[#EFF6FF]' : 'border-[#E2E8F0] bg-white hover:border-[#CBD5E1]'}`}
              >
                <Users className={formData.visibility === 'shared' ? 'text-[#2563EB]' : 'text-[#64748B]'} size={20} />
                <div>
                  <h3 className={`text-sm font-medium ${formData.visibility === 'shared' ? 'text-[#2563EB]' : 'text-[#0F172A]'}`}>Shared</h3>
                  <p className="text-xs text-[#64748B] mt-1">Visible to selected roles</p>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {formData.visibility === 'shared' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-5 overflow-hidden">
                  <h4 className="text-sm font-medium text-[#0F172A] mb-3">Role Access</h4>
                  <div className="space-y-3">
                    {ROLES.map(role => {
                      const isChecked = formData.sharedRoles.includes(role.name) || role.locked;
                      return (
                        <label key={role.name} className={`flex items-center gap-3 p-3 border rounded-lg transition-colors group ${role.locked ? 'bg-[#F8FAFC] border-[#E2E8F0] cursor-not-allowed opacity-80' : 'cursor-pointer border-[#E2E8F0] hover:bg-[#F8FAFC]'}`}>
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            disabled={role.locked}
                            onChange={() => {
                              if (!role.locked) {
                                setFormData(prev => ({
                                  ...prev, sharedRoles: prev.sharedRoles.includes(role.name) 
                                    ? prev.sharedRoles.filter(r => r !== role.name) 
                                    : [...prev.sharedRoles, role.name]
                                }));
                              }
                            }}
                            className="w-4 h-4 rounded border-[#CBD5E1] text-[#2563EB] focus:ring-[#2563EB] cursor-pointer disabled:cursor-not-allowed"
                          />
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-[#0F172A]">{role.name}</span>
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${role.color}`}>
                              Role
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </FormCard>

        </div>
      </div>

      {/* STICKY FOOTER */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-[40%] bg-white border-t border-[#E2E8F0] px-8 py-4 flex items-center justify-between z-50">
        <span className="text-sm text-[#64748B]">
          6 sections · <span className="font-medium text-[#0F172A]">{completedCount}</span> completed
        </span>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin/reports')} className="text-sm font-medium text-[#0F172A] bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] px-5 py-2.5 rounded-lg transition-colors">
            Cancel
          </button>
          <button className="text-sm font-medium text-[#2563EB] bg-white border border-[#2563EB] hover:bg-[#EFF6FF] px-5 py-2.5 rounded-lg transition-colors">
            Save as Draft
          </button>
          <button onClick={handleSubmit} className="bg-[#2563EB] hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
            <FileCheck size={16} /> Create Report
          </button>
        </div>
      </div>

    </div>
  );
}
