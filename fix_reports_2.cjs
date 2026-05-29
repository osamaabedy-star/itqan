const fs = require('fs');
let content = fs.readFileSync('src/components/ProfessionalReports.tsx', 'utf8');

// Shrink classes list and gaps in the modal left panel
content = content.replace(/<div className="flex flex-col gap-3">/g, '<div className="flex flex-col gap-2">');
content = content.replace(/<p className="text-\[10px\] font-black text-slate-400 uppercase tracking-widest mb-4 text-right">أداء الفصول في هذا الاختبار<\/p>/g, '<p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-right">أداء الفصول في هذا الاختبار</p>');
content = content.replace(/<div className="mb-8">/g, '<div className="mb-4">');
content = content.replace(/<div className="flex justify-between items-center bg-white px-4 py-2\.5 rounded-\[20px\] border/g, '<div className="flex justify-between items-center bg-white px-3 py-2 rounded-[16px] border');
content = content.replace(/<div className="flex items-center justify-between mb-8">/g, '<div className="flex items-center justify-between mb-4">');

// Less padding and rounded corners generally
content = content.replace(/rounded-\[48px\]/g, 'rounded-[32px]');

fs.writeFileSync('src/components/ProfessionalReports.tsx', content);
