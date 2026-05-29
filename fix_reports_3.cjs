const fs = require('fs');
let content = fs.readFileSync('src/components/ProfessionalReports.tsx', 'utf8');

// Shrink header and subtitle
content = content.replace(/<h3 className="text-3xl font-black text-slate-900 tracking-tight">مؤشرات الإنجاز<\/h3>/g, '<h3 className="text-xl font-black text-slate-900 tracking-tight">مؤشرات الإنجاز</h3>');
content = content.replace(/<p className="text-xs font-bold text-slate-400 mt-1">/g, '<p className="text-[10px] font-bold text-slate-400 mt-1">');

fs.writeFileSync('src/components/ProfessionalReports.tsx', content);
