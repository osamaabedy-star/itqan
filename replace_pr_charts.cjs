const fs = require('fs');
const file = 'src/components/ProfessionalReports.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/fontWeight: 900/g, "fontWeight: 700");
content = content.replace(/fill="#1e293b"/g, 'fill="#64748b"');

fs.writeFileSync(file, content);
console.log('ProfessionalReports chart font replacements applied successfully.');
