const fs = require('fs');
const file = 'src/components/Dashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

// Chart Colors Rebranding to match the requirements (Softness)
content = content.replace(/fontWeight: 900/g, "fontWeight: 700");
content = content.replace(/fill="#1e293b"/g, 'fill="#64748b"');

fs.writeFileSync(file, content);
console.log('Dashboard chart font replacements applied successfully.');
