const fs = require('fs');
const file = 'src/components/Management.tsx';
let content = fs.readFileSync(file, 'utf8');

// Edge Simplification
content = content.replace(/rounded-\[32px\]/g, 'rounded-3xl');
content = content.replace(/rounded-\[40px\]/g, 'rounded-3xl');
content = content.replace(/rounded-\[28px\]/g, 'rounded-2xl');

// Typography Hierarchy formatting
content = content.replace(/text-3xl font-black/g, 'text-2xl md:text-3xl font-black tracking-tighter');
content = content.replace(/text-4xl font-black/g, 'text-3xl md:text-4xl font-black tracking-tighter');
content = content.replace(/text-2xl font-black/g, 'text-xl md:text-2xl font-black tracking-tighter');

// Empty States handling in Management (lots of lists there)
content = content.replace(/<div className="py-12 bg-white rounded-3xl border border-slate-100 flex flex-col items-center justify-center space-y-4">\s*<Users size=\{48\} className="text-slate-300" \/>\s*<p className="font-bold text-slate-400">لا يوجد معلمين مسجلين حالياً<\/p>\s*<\/div>/g,
  `<div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-3xl border border-slate-100 shadow-sm"><div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4"><Users size={32} className="text-slate-300" /></div><h4 className="text-lg font-black text-slate-700 tracking-tight mb-2">لا يوجد معلمين مسجلين حالياً</h4><p className="text-sm font-semibold text-slate-400">ابدأ بإضافة معلمين لإدارة الفصول والمواد</p></div>`);

content = content.replace(/<div className="py-12 bg-white rounded-3xl border border-slate-100 flex flex-col items-center justify-center space-y-4">\s*<AlertCircle size=\{64\} className="text-slate-300" \/>\s*<p className="text-xl font-bold text-slate-500">لا يوجد بيانات مسجلة حالياً<\/p>\s*<\/div>/g,
  `<div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-3xl border border-slate-100 shadow-sm"><div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4"><AlertCircle size={32} className="text-slate-300" /></div><h4 className="text-lg font-black text-slate-700 tracking-tight mb-2">لا يوجد بيانات مسجلة حالياً</h4><p className="text-sm font-semibold text-slate-400">القسم فارغ ولا توجد فيه بيانات</p></div>`);

content = content.replace(/<div className="col-span-full py-16 text-center text-slate-400 font-bold bg-white rounded-3xl border-2 border-dashed border-slate-200">\s*لا توجد إعدادات أخرى مسجلة حالياً\.\n\s*النسخة الأولية تعتمد الإعدادات الافتراضية أعلاه\.\s*<\/div>/g,
  `<div className="flex flex-col items-center justify-center p-16 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200/60"><div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4"><Settings size={32} className="text-slate-300" /></div><h4 className="text-lg font-black text-slate-700 tracking-tight mb-2">لا توجد إعدادات إضافية</h4><p className="text-sm font-semibold text-slate-400">النظام يعتمد الإعدادات الافتراضية حالياً.</p></div>`);


// Micro Interactions on Hover for cards
content = content.replace(/hover:border-indigo-150 transition-all/g, 'hover:border-indigo-150 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300');
content = content.replace(/cursor-pointer hover:bg-slate-50 transition-colors/g, 'cursor-pointer hover:bg-slate-50 hover:shadow-sm transition-all duration-300 hover:-translate-y-0.5');

fs.writeFileSync(file, content);
console.log('Management replacements applied successfully.');
