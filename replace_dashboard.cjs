const fs = require('fs');
const file = 'src/components/Dashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

// Edge Simplification
content = content.replace(/rounded-\[32px\]/g, 'rounded-3xl');
content = content.replace(/rounded-\[28px\]/g, 'rounded-3xl');
content = content.replace(/rounded-\[24px\]/g, 'rounded-2xl');

// Typography Hierarchy formatting
content = content.replace(/text-3xl font-black text-slate-800/g, 'text-2xl md:text-3xl font-black text-slate-800 tracking-tighter');
content = content.replace(/text-4xl font-black text-slate-900/g, 'text-3xl md:text-4xl font-black text-slate-900 tracking-tighter');

content = content.replace(/className="text-slate-400 font-bold mt-2"/g, 'className="text-slate-500 font-semibold mt-2 md:text-sm text-xs"');
content = content.replace(/className="text-sm text-slate-400 font-bold"/g, 'className="text-xs md:text-sm text-slate-500 font-semibold"');

// Micro Interactions on Hover for cards
content = content.replace(/hover:border-indigo-100 transition-all/g, 'hover:border-indigo-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300');
content = content.replace(/cursor-pointer transition-all/g, 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-300');
content = content.replace(/hover:scale-105 transition-all/g, 'hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300 active:translate-y-0');

content = content.replace(/bg-white p-10 rounded-3xl border border-slate-100 shadow-minimal/g, 
  'bg-white p-8 md:p-10 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow');

// Empty States and List Improvements
content = content.replace(/<div className="py-20 text-center text-slate-400 font-bold bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">\s*لا توجد فصول دراسية تطابق بحثك\s*<\/div>/g,
  `<div className="flex flex-col items-center justify-center p-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200/60"><div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4"><Search size={32} className="text-slate-300" /></div><h4 className="text-lg font-black text-slate-700 tracking-tight mb-2">لا توجد فصول دراسية</h4><p className="text-sm font-semibold text-slate-400">لم يتم العثور على أي فصول تطابق معايير البحث الحالية</p></div>`);

content = content.replace(/<div className="text-center text-slate-400 font-bold py-12 bg-white rounded-3xl border border-slate-100 shadow-minimal">\s*لا يوجد فصول دراسية مسجلة حالياً\.\n\s*يمكنك إضافتها من إدارة النظام\.\s*<\/div>/g,
  `<div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-3xl border border-slate-100 shadow-sm"><div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 border border-slate-100/50"><Layers size={32} className="text-slate-300" /></div><h4 className="text-lg font-black text-slate-700 tracking-tight mb-2">لا يوجد فصول دراسية مسجلة حالياً</h4><p className="text-sm font-semibold text-slate-400">يمكنك إضافتها وتكوينها من خلال قسم إدارة النظام لتبدأ العمل</p></div>`);

fs.writeFileSync(file, content);
console.log('Dashboard replacements applied successfully.');
