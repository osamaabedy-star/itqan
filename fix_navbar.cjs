const fs = require('fs');
const file = 'src/components/Navbar.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace the teacher select
content = content.replace(
  /<div className="hidden xl:flex items-center gap-1\.5 bg-indigo-50\/50 px-2\.5 py-1 rounded-lg border border-indigo-100\/50">[\s\S]*?<\/div>/,
  ""
);

fs.writeFileSync(file, content);
console.log('Navbar teacher select removed.');
