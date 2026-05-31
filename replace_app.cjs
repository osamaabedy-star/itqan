const fs = require('fs');
const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

// Edge Simplification
content = content.replace(/rounded-\[32px\]/g, 'rounded-3xl');
content = content.replace(/rounded-\[48px\]/g, 'rounded-3xl');
content = content.replace(/rounded-\[56px\]/g, 'rounded-3xl');
content = content.replace(/rounded-\[28px\]/g, 'rounded-3xl');

// Typography Hierarchy formatting
content = content.replace(/text-3xl font-black text-slate-800/g, 'text-2xl md:text-3xl font-black text-slate-800 tracking-tighter');
content = content.replace(/text-4xl font-black/g, 'text-3xl md:text-4xl font-black tracking-tighter');
content = content.replace(/text-2xl font-black/g, 'text-xl md:text-2xl font-black tracking-tighter');

content = content.replace(/className="text-slate-400 font-bold mt-2/g, 'className="text-slate-500 font-semibold mt-2 md:text-sm text-xs');
content = content.replace(/className="text-sm text-slate-400 font-bold"/g, 'className="text-xs md:text-sm text-slate-500 font-semibold"');

// More padding space for main layouts
content = content.replace(/<div className="flex-1 p-4 lg:p-8 overflow-y-auto scrollbar-hide" dir="rtl">/g, 
  '<div className="flex-1 p-6 lg:p-12 overflow-y-auto scrollbar-hide bg-slate-50/20" dir="rtl">');

// Micro Interactions on Hover for cards
content = content.replace(/hover:border-indigo-150 transition-all/g, 'hover:border-indigo-150 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300');
content = content.replace(/cursor-pointer transition-all/g, 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-300');
content = content.replace(/hover:bg-slate-50 hover:text-slate-800 transition-colors/g, 'hover:bg-slate-50 hover:text-slate-800 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-300');

fs.writeFileSync(file, content);
console.log('App.tsx replacements applied successfully.');
