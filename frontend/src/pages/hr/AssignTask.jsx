import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HRLayout from '../../components/hr/HRLayout';
import { hrAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const PRIORITIES = [
  { id: 'low', label: 'Low', icon: 'keyboard_arrow_down', color: 'text-[#64748B]', bg: 'bg-[#F1F5F9]', border: 'border-[#E2E8F0]', ring: 'ring-[#CBD5E1]' },
  { id: 'medium', label: 'Medium', icon: 'drag_handle', color: 'text-[#D97706]', bg: 'bg-[#FFFBEB]', border: 'border-[#FDE68A]', ring: 'ring-[#FCD34D]' },
  { id: 'high', label: 'High', icon: 'keyboard_arrow_up', color: 'text-[#EA580C]', bg: 'bg-[#FFF7ED]', border: 'border-[#FFEDD5]', ring: 'ring-[#FDBA74]' },
  { id: 'critical', label: 'Critical', icon: 'priority_high', color: 'text-[#DC2626]', bg: 'bg-[#FEF2F2]', border: 'border-[#FEE2E2]', ring: 'ring-[#FCA5A5]' },
];

export default function AssignTask() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projRes, empRes, internRes] = await Promise.all([
          hrAPI.getMyProjects(),
          hrAPI.getEmployees(),
          hrAPI.getInterns()
        ]);
        setProjects(projRes.data.data || []);
        
        const emps = (empRes.data.data || []).map(e => {
          const roleStr = typeof e.designation === 'string' && e.designation.trim()
            ? e.designation
            : (typeof e.role === 'object' ? (e.role?.name || 'Employee') : (e.role || 'Employee'));
          return {
            id: e._id,
            name: e.name || 'Unnamed Employee',
            role: roleStr,
            type: 'Employee',
            initial: (e.name || 'E')[0]?.toUpperCase(),
            bg: 'bg-[#EFF6FF]', text: 'text-[#1D4ED8]'
          };
        });
        const interns = (internRes.data.data || []).map(e => {
          const roleStr = typeof e.designation === 'string' && e.designation.trim()
            ? e.designation
            : (typeof e.role === 'object' ? (e.role?.name || 'Intern') : (e.role || 'Intern'));
          return {
            id: e._id,
            name: e.name || 'Unnamed Intern',
            role: roleStr,
            type: 'Intern',
            initial: (e.name || 'I')[0]?.toUpperCase(),
            bg: 'bg-[#ECFDF5]', text: 'text-[#059669]'
          };
        });
        setEmployees([...emps, ...interns]);
      } catch (error) {
        toast.error('Failed to load data for task assignment');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project: '',
    assignees: [],
    priority: 'medium',
    dueDate: '',
    attachments: [],
  });

  const handleFileChange = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).map(f => ({
        name: f.name,
        size: (f.size / 1024 / 1024).toFixed(2) + ' MB'
      }));
      setFormData(prev => ({
        ...prev,
        attachments: [...prev.attachments, ...newFiles]
      }));
    }
  };

  const removeAttachment = (index) => {
    setFormData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!formData.title) newErrors.title = 'Task title is required';
    if (!formData.project) newErrors.project = 'Project is required';
    if (formData.assignees.length === 0) newErrors.assignees = 'Assign at least one person';
    if (!formData.dueDate) newErrors.dueDate = 'Due date is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (validate()) {
      setSubmitting(true);
      try {
        const promises = formData.assignees.map(assigneeId => {
          return hrAPI.assignTask({
            title: formData.title,
            description: formData.description,
            projectId: formData.project,
            assignedTo: assigneeId,
            priority: formData.priority,
            dueDate: formData.dueDate,
            effortPoints: 5
          });
        });
        await Promise.all(promises);
        
        toast.success('Task assigned successfully!');
        navigate('/hr/tasks');
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to assign task');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const toggleAssignee = (id) => {
    setFormData(prev => ({
      ...prev,
      assignees: prev.assignees.includes(id) 
        ? prev.assignees.filter(a => a !== id)
        : [...prev.assignees, id]
    }));
    if (errors.assignees) setErrors(prev => ({ ...prev, assignees: null }));
  };

  const filteredEmployees = employees.filter(e => {
    const q = (searchQuery || '').toLowerCase();
    const nameMatch = (e.name || '').toLowerCase().includes(q);
    const roleMatch = (String(typeof e.role === 'object' ? (e.role?.name || '') : (e.role || ''))).toLowerCase().includes(q);
    return nameMatch || roleMatch;
  });

  const selectedPriority = PRIORITIES.find(p => p.id === formData.priority);
  const selectedProjectObj = projects.find(p => p._id === formData.project);

  return (
    <HRLayout bare>
      <div className="font-sans text-[#0F172A] w-full flex flex-col h-full gap-8 max-w-[1100px] mx-auto pb-24 relative">
        
        {/* Toast Notification (removed as we use react-hot-toast) */}

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
          <div>
            <h1 className="text-[22px] font-semibold tracking-tight text-[#0F172A]">Assign New Task</h1>
            <p className="text-[13px] text-[#64748B] mt-0.5">
              Create a task, set priorities, and assign it to employees or interns.
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => navigate(-1)} 
              className="border border-[#E2E8F0] bg-white text-[#0F172A] px-4 py-2 rounded-lg text-[13px] font-medium hover:bg-[#F8FAFC] transition-colors shadow-sm"
            >
              Cancel
            </button>
            <button 
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-[#2563EB] text-white px-5 py-2 rounded-lg text-[13px] font-medium hover:bg-[#1D4ED8] transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
              {submitting ? 'Dispatching...' : 'Dispatch Task'}
            </button>
          </div>
        </div>

        {/* MAIN LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-4">
          
          {/* LEFT: FORM BUILDER */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Task Details Section */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <h2 className="text-[14px] font-bold text-[#0F172A] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#64748B] text-[18px]">edit_document</span>
                  Task Details
                </h2>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-[13px] font-semibold text-[#0F172A] mb-1.5">Task Title <span className="text-[#EF4444]">*</span></label>
                  <input 
                    type="text" 
                    placeholder="e.g. Q3 Security Audit Review"
                    value={formData.title}
                    onChange={e => { setFormData(prev => ({...prev, title: e.target.value})); setErrors(prev => ({...prev, title: null})) }}
                    className={`w-full px-3 py-2 border rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 transition-colors ${errors.title ? 'border-[#FCA5A5] focus:border-[#EF4444] bg-[#FEF2F2]' : 'border-[#E2E8F0] focus:border-[#2563EB]'}`}
                  />
                  {errors.title && <p className="text-[12px] text-[#EF4444] mt-1">{errors.title}</p>}
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[#0F172A] mb-1.5">Description</label>
                  <textarea 
                    rows={4}
                    placeholder="Provide clear instructions and context..."
                    value={formData.description}
                    onChange={e => setFormData(prev => ({...prev, description: e.target.value}))}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-colors resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[13px] font-semibold text-[#0F172A] mb-1.5">Related Project <span className="text-[#EF4444]">*</span></label>
                    <select 
                      value={formData.project}
                      onChange={e => { setFormData(prev => ({...prev, project: e.target.value})); setErrors(prev => ({...prev, project: null})) }}
                      className={`w-full px-3 py-2 border rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 transition-colors bg-white ${errors.project ? 'border-[#FCA5A5] focus:border-[#EF4444] bg-[#FEF2F2]' : 'border-[#E2E8F0] focus:border-[#2563EB]'}`}
                    >
                      <option value="">Select a project...</option>
                      {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                    </select>
                    {errors.project && <p className="text-[12px] text-[#EF4444] mt-1">{errors.project}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-[13px] font-semibold text-[#0F172A] mb-1.5">Due Date <span className="text-[#EF4444]">*</span></label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B] text-[18px]">calendar_today</span>
                      <input 
                        type="date" 
                        value={formData.dueDate}
                        onChange={e => { setFormData(prev => ({...prev, dueDate: e.target.value})); setErrors(prev => ({...prev, dueDate: null})) }}
                        className={`w-full pl-10 pr-3 py-2 border rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 transition-colors ${errors.dueDate ? 'border-[#FCA5A5] focus:border-[#EF4444] bg-[#FEF2F2]' : 'border-[#E2E8F0] focus:border-[#2563EB]'}`}
                      />
                    </div>
                    {errors.dueDate && <p className="text-[12px] text-[#EF4444] mt-1">{errors.dueDate}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Attachments Section */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <h2 className="text-[14px] font-bold text-[#0F172A] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#64748B] text-[18px]">attachment</span>
                  Supporting Documents
                </h2>
              </div>
              <div className="p-6">
                <div className="border-2 border-dashed border-[#E2E8F0] rounded-xl p-6 flex flex-col items-center justify-center bg-[#F8FAFC] hover:bg-[#F1F5F9] transition-colors relative cursor-pointer group">
                  <input 
                    type="file" 
                    multiple 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    onChange={handleFileChange}
                  />
                  <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-[#64748B] group-hover:text-[#2563EB] mb-3 transition-colors">
                    <span className="material-symbols-outlined text-[24px]">cloud_upload</span>
                  </div>
                  <p className="text-[14px] font-bold text-[#0F172A]">Click to upload or drag and drop</p>
                  <p className="text-[12px] text-[#64748B] mt-1">PDF, DOCX, PNG, JPG (max. 10MB)</p>
                </div>

                {formData.attachments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {formData.attachments.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 border border-[#E2E8F0] rounded-lg bg-white">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center">
                            <span className="material-symbols-outlined text-[16px]">description</span>
                          </div>
                          <div>
                            <p className="text-[13px] font-bold text-[#0F172A]">{file.name}</p>
                            <p className="text-[11px] font-medium text-[#64748B]">{file.size}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => removeAttachment(idx)}
                          className="text-[#64748B] hover:text-[#EF4444] p-1 rounded-md hover:bg-[#FEF2F2] transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>


            {/* Assignees Section */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
                <h2 className="text-[14px] font-bold text-[#0F172A] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#64748B] text-[18px]">group_add</span>
                  Assignees <span className="text-[#EF4444]">*</span>
                </h2>
                <div className="relative w-[200px]">
                  <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[#64748B] text-[16px]">search</span>
                  <input 
                    type="text" 
                    placeholder="Search personnel..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-[12px] border border-[#E2E8F0] rounded-md focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>
              <div className="p-6">
                {errors.assignees && <p className="text-[12px] text-[#EF4444] mb-3 -mt-2">{errors.assignees}</p>}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[240px] overflow-y-auto pr-1 custom-scrollbar">
                  {filteredEmployees.map(emp => {
                    const isSelected = formData.assignees.includes(emp.id);
                    return (
                      <div 
                        key={emp.id}
                        onClick={() => toggleAssignee(emp.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected ? 'border-[#2563EB] bg-[#EFF6FF]' : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
                        }`}
                      >
                        <div className="relative">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-[14px] ${emp.bg} ${emp.text}`}>
                            {emp.initial}
                          </div>
                          {isSelected && (
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#2563EB] text-white rounded-full flex items-center justify-center border-2 border-white">
                              <span className="material-symbols-outlined text-[10px]">check</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-bold text-[#0F172A] truncate">{emp.name}</div>
                          <div className="text-[11px] font-medium text-[#64748B] truncate">{typeof emp.role === 'object' ? (emp.role?.name || 'Personnel') : (emp.role || 'Personnel')}</div>
                        </div>
                        <div className="shrink-0">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${emp.type === 'Intern' ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#E2E8F0] text-[#475569]'}`}>
                            {emp.type}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT: TASK PREVIEW CARD */}
          <div className="lg:col-span-5 lg:sticky lg:top-[120px]">
            <h2 className="text-[13px] font-bold text-[#64748B] uppercase tracking-wider mb-4 px-1">Live Preview</h2>
            
            <div className="bg-white rounded-2xl shadow-lg border border-[#E2E8F0] p-6 relative overflow-hidden group hover:shadow-xl transition-shadow">
              
              {/* Top Meta */}
              <div className="flex justify-between items-start mb-5">
                <div className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 border ${selectedPriority.bg} ${selectedPriority.color} ${selectedPriority.border}`}>
                  <span className="material-symbols-outlined text-[14px]">{selectedPriority.icon}</span>
                  {selectedPriority.label} Priority
                </div>
                {formData.dueDate && (
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#DC2626] bg-[#FEF2F2] px-2.5 py-1 rounded-full border border-[#FECACA]">
                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                    {new Date(formData.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                )}
              </div>

              {/* Title & Desc */}
              <h3 className={`text-[18px] font-bold leading-tight mb-2 ${formData.title ? 'text-[#0F172A]' : 'text-[#CBD5E1]'}`}>
                {formData.title || 'Task title will appear here...'}
              </h3>
              
              <p className={`text-[13px] leading-relaxed mb-6 line-clamp-4 ${formData.description ? 'text-[#64748B]' : 'text-[#CBD5E1]'}`}>
                {formData.description || 'Add a description to provide context and requirements for the assignee.'}
              </p>

              {/* Project Tag */}
              {selectedProjectObj && (
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-6 h-6 rounded bg-[#F1F5F9] text-[#64748B] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[14px]">folder</span>
                  </div>
                  <span className="text-[13px] font-semibold text-[#0F172A]">{selectedProjectObj.name}</span>
                </div>
              )}

              {/* Footer: Assignees & Attachments */}
              <div className="border-t border-[#E2E8F0] pt-5 flex items-center justify-between">
                <div className="flex -space-x-2">
                  {formData.assignees.length > 0 ? (
                    formData.assignees.slice(0, 3).map((id, i) => {
                      const emp = employees.find(e => e.id === id) || { initial: '?', name: 'Assignee', bg: 'bg-slate-100', text: 'text-slate-700' };
                      return (
                        <div key={id} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[11px] border-2 border-white relative z-[${10-i}] ${emp.bg} ${emp.text}`} title={emp.name}>
                          {emp.initial}
                        </div>
                      )
                    })
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#F1F5F9] border-2 border-white flex items-center justify-center text-[#94A3B8]">
                      <span className="material-symbols-outlined text-[14px]">person</span>
                    </div>
                  )}
                  {formData.assignees.length > 3 && (
                    <div className="w-8 h-8 rounded-full bg-[#E2E8F0] text-[#475569] flex items-center justify-center font-bold text-[11px] border-2 border-white relative z-0">
                      +{formData.assignees.length - 3}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#64748B]">
                  <span className="material-symbols-outlined text-[16px]">attachment</span>
                  {formData.attachments.length} {formData.attachments.length === 1 ? 'File' : 'Files'}
                </div>
              </div>

            </div>

            {/* Priority Section (Moved to Right Side) */}
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden mt-6">
              <div className="px-5 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <h2 className="text-[14px] font-bold text-[#0F172A] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#64748B] text-[18px]">flag</span>
                  Priority Level
                </h2>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 gap-3">
                  {PRIORITIES.map(p => (
                    <div 
                      key={p.id}
                      onClick={() => setFormData(prev => ({...prev, priority: p.id}))}
                      className={`border rounded-lg p-3 cursor-pointer flex flex-col items-center justify-center gap-1.5 transition-all ${
                        formData.priority === p.id 
                        ? `border-transparent ring-2 ring-offset-1 ${p.ring} ${p.bg}` 
                        : 'border-[#E2E8F0] hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <span className={`material-symbols-outlined text-[20px] ${formData.priority === p.id ? p.color : 'text-[#64748B]'}`}>
                        {p.icon}
                      </span>
                      <span className={`text-[12px] font-bold ${formData.priority === p.id ? p.color : 'text-[#0F172A]'}`}>
                        {p.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </HRLayout>
  );
}
