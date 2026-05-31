const fs = require('fs');
const file = 'src/components/ProfessionalReports.tsx';
let content = fs.readFileSync(file, 'utf8');

// Edge Simplification
content = content.replace(/rounded-\[32px\]/g, 'rounded-3xl');
content = content.replace(/rounded-\[28px\]/g, 'rounded-2xl');
content = content.replace(/rounded-\[56px\]/g, 'rounded-3xl');
content = content.replace(/rounded-\[20px\]/g, 'rounded-2xl');
content = content.replace(/rounded-\[24px\]/g, 'rounded-2xl');

// Empty States and List Improvements
content = content.replace(/<p className="text-xs font-bold text-slate-400 text-center py-4">المهارات مقيمة بمستويات جيدة<\/p>/g,
  `<div className="flex flex-col items-center justify-center p-6 text-center bg-slate-50 rounded-2xl"><div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-3"><AlertCircle size={24} className="text-slate-300" /></div><p className="text-xs font-bold text-slate-500">المهارات مقيمة بمستويات جيدة</p></div>`);

content = content.replace(/<p className="text-xs font-bold text-slate-400 text-center py-4">لم يتم تقييم مستوى الإتقان<\/p>/g,
  `<div className="flex flex-col items-center justify-center p-6 text-center bg-slate-50 rounded-2xl"><div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-3"><Trophy size={24} className="text-slate-300" /></div><p className="text-xs font-bold text-slate-500">لم يتم تقييم مستوى الإتقان</p></div>`);

content = content.replace(/<p className="text-xs font-bold text-slate-400 text-center py-4">لا يوجد طلاب بحاجة لمتابعة<\/p>/g,
  `<div className="flex flex-col items-center justify-center p-6 text-center bg-slate-50 rounded-2xl"><div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-3"><Users size={24} className="text-slate-300" /></div><p className="text-xs font-bold text-slate-500">لا يوجد طلاب بحاجة لمتابعة</p></div>`);

content = content.replace(/<tr><td colSpan=\{5\} className="py-8 text-center text-slate-400 text-xs font-bold">لا يوجد بيانات للتقييم<\/td><\/tr>/g,
  `<tr><td colSpan={5} className="py-12"><div className="flex flex-col items-center justify-center text-center"><div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4"><Zap size={32} className="text-slate-300" /></div><h4 className="text-sm font-black text-slate-700 mb-1">لا توجد بيانات للتقييم</h4><p className="text-xs text-slate-400 max-w-xs">سيتم تحديث القائمة بعد رصد المعلمين لتقييم المهارات</p></div></td></tr>`);


// Micro Interactions on Hover
content = content.replace(/hover:bg-slate-50\/50 transition-colors/g, 'hover:bg-slate-50/50 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-300 cursor-pointer');

// Chart Colors Rebranding to match the requirements (Softness)
content = content.replace(/fill: '#64748b', fontSize: 11, fontWeight: 900/g, "fill: '#94a3b8', fontSize: 10, fontWeight: 800");

// Typography Hierarchy formatting
content = content.replace(/text-3xl font-black text-slate-900 tracking-tight/g, 'text-2xl md:text-3xl font-black text-slate-800 tracking-tighter');
content = content.replace(/text-2xl font-black/g, 'text-xl md:text-2xl font-black tracking-tighter');
content = content.replace(/text-slate-400 font-bold text-sm italic/g, 'text-slate-500 font-semibold text-xs md:text-sm');

// More padding space for reports
content = content.replace(/<div className="flex-1 p-4 lg:p-8 overflow-y-auto scrollbar-hide bg-slate-50\/30" dir="rtl">/g, 
  '<div className="flex-1 p-6 lg:p-12 overflow-y-auto scrollbar-hide bg-slate-50/30" dir="rtl">');

fs.writeFileSync(file, content);
console.log('Replacements applied successfully.');
