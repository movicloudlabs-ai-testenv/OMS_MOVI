const fs = require('fs');
let code = fs.readFileSync('src/pages/hr/Attendance.jsx', 'utf8');

// 1. Main wrapper
code = code.replace('<div className="w-full max-w-[1400px] mx-auto px-6 py-8 font-sans">', '<div className="w-full h-[calc(100vh-64px)] overflow-hidden px-4 py-3 font-sans flex flex-col">');

// 2. Header margin
code = code.replace('<div className="flex justify-between items-end mb-8">', '<div className="flex justify-between items-end mb-3 shrink-0">');
code = code.replace('<h1 className="text-2xl font-bold text-[#0F172A]">', '<h1 className="text-xl font-bold text-[#0F172A]">');

// 3. Stat Cards grid
code = code.replace('<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">', '<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3 shrink-0">');

// Stat card internal spacing & sizes
code = code.replaceAll('rounded-xl p-5 shadow-sm', 'rounded-xl p-3 shadow-sm');
code = code.replaceAll('w-10 h-10', 'w-8 h-8');
code = code.replaceAll('size={20}', 'size={16}');
code = code.replaceAll('mb-4', 'mb-2');
code = code.replaceAll('text-2xl font-black', 'text-xl font-black');

// 4. Main content flex wrapper
code = code.replace('<div className="flex flex-col lg:flex-row gap-6 items-start">', '<div className="flex flex-col lg:flex-row gap-3 items-stretch flex-1 min-h-0 overflow-hidden">');

// 5. Left column
code = code.replace('<div className="flex-1 w-full min-w-0">', '<div className="flex flex-col gap-3 flex-1 w-full min-w-0 min-h-0">');

// Queue table wrapper
code = code.replace('<div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">', '<div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm flex flex-col flex-1 min-h-0">');
code = code.replace('<div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex flex-col md:flex-row md:items-center justify-between gap-4">', '<div className="p-2.5 px-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex flex-col md:flex-row md:items-center justify-between gap-2 shrink-0">');
code = code.replace('<div className="overflow-x-auto">', '<div className="overflow-auto flex-1">');
code = code.replace('<div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-center text-xs text-[#64748B]">', '<div className="p-2 px-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex justify-between items-center text-xs text-[#64748B] shrink-0">');

// Queue table cells
code = code.replaceAll('px-4 py-3', 'px-3 py-1.5');
code = code.replaceAll('px-4 py-16', 'px-3 py-8');

// 6. Right sidebar
code = code.replace('<div className="w-full lg:w-[320px] shrink-0 space-y-6">', '<div className="w-full lg:w-[280px] shrink-0 space-y-3 overflow-y-auto pr-1">');

// Sidebar cards
code = code.replaceAll('px-4 py-3 border-b', 'px-3 py-2 border-b');
code = code.replaceAll('px-4 py-3 border-t', 'px-3 py-2 border-t');
code = code.replace('<div className="p-4">\n                {todayLeaves.length === 0', '<div className="p-3">\n                {todayLeaves.length === 0');
code = code.replace('<div className="p-4">\n                <ul', '<div className="p-3">\n                <ul');

// 7. AttendanceOverviewWidget modifications
code = code.replace('<div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-5 mt-6">', '<div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-3 shrink-0">');
code = code.replace('<div className="flex justify-between items-center mb-6">', '<div className="flex justify-between items-center mb-3">');
code = code.replace('<div className="flex flex-col md:flex-row items-center gap-8">', '<div className="flex flex-col md:flex-row items-center gap-4">');
code = code.replace('<div className="flex items-center gap-6">', '<div className="flex items-center gap-4 shrink-0">');
code = code.replace('<div className="relative w-32 h-32">', '<div className="relative w-24 h-24">');
code = code.replace('width={128} height={128}', 'width={96} height={96}');
code = code.replace('cx={60}\n                cy={60}\n                innerRadius={45}\n                outerRadius={60}', 'cx={48}\n                cy={48}\n                innerRadius={35}\n                outerRadius={48}');
code = code.replace('<span className="text-xl font-bold text-[#0F172A]">{rate}%</span>', '<span className="text-base font-bold text-[#0F172A]">{rate}%</span>');
code = code.replace('<span className="text-[9px] text-[#64748B]">Attendance Rate</span>', '<span className="text-[8px] text-[#64748B]">Rate</span>');
code = code.replace('<div className="space-y-2">', '<div className="space-y-1">');
code = code.replace('<div className="flex-1 grid grid-cols-4 gap-4 border border-[#E2E8F0] rounded-xl p-4">', '<div className="flex-1 grid grid-cols-4 gap-2 border border-[#E2E8F0] rounded-xl p-3">');
code = code.replaceAll('<p className="text-xl font-bold', '<p className="text-lg font-bold');

fs.writeFileSync('src/pages/hr/Attendance.jsx', code);
console.log('Modifications complete.');
