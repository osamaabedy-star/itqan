const fs = require('fs');
const file = 'src/components/ProfessionalReports.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replacements
content = content.replace(/rounded-\[32px\]/g, 'rounded-3xl');
content = content.replace(/rounded-\[28px\]/g, 'rounded-2xl');
content = content.replace(/rounded-\[56px\]/g, 'rounded-3xl');

// Typography Hierarchy formatting
content = content.replace(/text-3xl font-black text-slate-900 tracking-tight/g, 'text-2xl md:text-3xl font-black text-slate-800 tracking-tight');
content = content.replace(/text-2xl font-black/g, 'text-xl md:text-2xl font-black tracking-tight');
content = content.replace(/text-slate-400 font-bold text-sm italic/g, 'text-slate-500 font-semibold text-xs md:text-sm');

fs.writeFileSync(file, content);
console.log('Done');
