const fs = require('fs');
let code = fs.readFileSync('src/components/ExternalPortal.tsx', 'utf8');
code = code.replace(/\\n/g, '\\n');
fs.writeFileSync('src/components/ExternalPortal.tsx', code);
console.log('Fixed newlines');
