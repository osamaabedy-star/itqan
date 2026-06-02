const fs = require('fs');
let code = fs.readFileSync('src/components/ExternalPortal.tsx', 'utf8');
code = code.replace(/ssName="flex items-center gap-2">\\\\n\\n/g, '');
code = code.replace(/ssName="flex items-center gap-2">\\\\n/g, '');
fs.writeFileSync('src/components/ExternalPortal.tsx', code);
console.log('Fixed artifact');
