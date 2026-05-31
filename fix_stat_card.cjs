const fs = require('fs');
const file = 'src/components/ProfessionalReports.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /bg-white p-8 rounded-\[40px\] border border-slate-100 shadow-minimal flex items-center gap-6 group hover:shadow-2xl hover:shadow-slate-200\/50 transition-all duration-500 overflow-hidden relative/g,
  "bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 group hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 overflow-hidden relative"
);

content = content.replace(
  /w-16 h-16 rounded-2xl \$\{color\} flex items-center justify-center group-hover:scale-110 transition-transform duration-500 relative z-10/g,
  "w-12 h-12 rounded-xl ${color} flex items-center justify-center group-hover:scale-105 transition-transform duration-300 relative z-10"
);

content = content.replace(
  /React\.cloneElement\(icon as any, \{ size: 32 \}\)/g,
  "React.cloneElement(icon as any, { size: 24 })"
);

content = content.replace(
  /text-2xl md:text-3xl font-black text-slate-800 tracking-tighterer transition-all group-hover:translate-x-1/g,
  "text-xl md:text-2xl font-black text-slate-800 tracking-tighter transition-all"
);

fs.writeFileSync(file, content);
console.log('StatCard updated');
