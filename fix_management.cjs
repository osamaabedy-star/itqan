const fs = require('fs');
let content = fs.readFileSync('src/components/Management.tsx', 'utf8');

// Add createdAt to newly saved quizzes
content = content.replace(/updatedAt\?: any;/g, 'updatedAt?: any;\n  createdAt?: any;');
content = content.replace(/status: quizStatus \|\| 'draft',/g, "status: quizStatus || 'draft',\n        createdAt: new Date().toISOString(),");
fs.writeFileSync('src/components/Management.tsx', content);

console.log('patched Management.tsx');
