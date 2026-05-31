const fs = require('fs');
const file = 'src/components/ExternalPortal.tsx';
let content = fs.readFileSync(file, 'utf8');

// Edge Simplification
content = content.replace(/rounded-\[32px\]/g, 'rounded-3xl');
content = content.replace(/rounded-\[40px\]/g, 'rounded-3xl');
content = content.replace(/rounded-\[48px\]/g, 'rounded-3xl');

// Typography Hierarchy formatting
content = content.replace(/text-3xl font-black text-slate-800/g, 'text-2xl md:text-3xl font-black text-slate-800 tracking-tighter');
content = content.replace(/text-4xl font-black/g, 'text-3xl md:text-4xl font-black tracking-tighter');
content = content.replace(/text-2xl font-black/g, 'text-xl md:text-2xl font-black tracking-tighter');

content = content.replace(/className="text-slate-400 font-bold mt-2/g, 'className="text-slate-500 font-semibold mt-2 md:text-sm text-xs');
content = content.replace(/className="text-sm text-slate-400 font-bold"/g, 'className="text-xs md:text-sm text-slate-500 font-semibold"');

// Empty States and List Improvements
content = content.replace(/<div className="text-center text-slate-400 font-bold py-12">\s*لم يتم تعيين معلمين بعد.\s*<\/div>/g,
  `<div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-3xl border border-slate-100/50 shadow-sm"><div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4"><Users size={32} className="text-slate-300" /></div><h4 className="text-sm font-black text-slate-700 tracking-tight mb-1">لا يوجد معلمين</h4><p className="text-xs font-semibold text-slate-400">لم يتم تعيين معلمين في النظام بعد</p></div>`);

content = content.replace(/<div className="py-12 bg-slate-50 rounded-2xl text-center text-slate-400 font-bold border border-slate-100 text-xs">\s*لا يوجد نتائج مسجلة لهذه الفصول لبناء المؤشرات البيانية حالياً.\s*<\/div>/g,
  `<div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 rounded-2xl border border-slate-100/60"><div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-3"><BarChart2 size={24} className="text-slate-300" /></div><h4 className="text-xs font-black text-slate-700 tracking-tight mb-1">لا توجد بيانات بالمؤشر</h4><p className="text-[10px] font-semibold text-slate-400">لا يوجد نتائج مسجلة لهذه الفصول لبناء المؤشرات البيانية حالياً</p></div>`);

content = content.replace(/<div className="col-span-full py-8 text-center text-slate-400 italic">\s*لا توجد اختبارات منشورة لفصولك حتى الآن.\s*<\/div>/g,
  `<div className="col-span-full py-10 bg-slate-50 rounded-2xl flex flex-col items-center justify-center border border-slate-100/50"><div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-3"><BrainCircuit size={24} className="text-slate-300" /></div><h4 className="text-xs font-black text-slate-700 tracking-tight mb-1">لا توجد اختبارات</h4><p className="text-[10px] font-semibold text-slate-400">لا توجد اختبارات منشورة لفصولك حتى الآن</p></div>`);

content = content.replace(/<div className="text-center text-slate-400 font-bold py-12 text-sm bg-white rounded-\[32px\] border border-slate-100 shadow-minimal">\s*يرجى تحديد صف دراسي أو مادة لعرض المعلمين.\s*<\/div>/g,
  `<div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-3xl border border-slate-100/50 shadow-sm"><div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4"><Search size={32} className="text-slate-300" /></div><h4 className="text-sm font-black text-slate-700 tracking-tight mb-1">البحث عن المعلمين</h4><p className="text-xs font-semibold text-slate-400">يرجى تحديد صف دراسي أو مادة لعرض المعلمين</p></div>`);

// Micro Interactions on Hover for cards
content = content.replace(/hover:border-indigo-150 transition-all/g, 'hover:border-indigo-150 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300');
content = content.replace(/cursor-pointer transition-all/g, 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-300');

fs.writeFileSync(file, content);
console.log('ExternalPortal replacements applied successfully.');
