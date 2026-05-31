const fs = require('fs');
const file = 'src/index.css';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/h1, h2, h3, \.font-black \{\n  @apply font-black tracking-tight;\n\}/g,
  `h1, h2, h3, .font-black {\n  @apply font-black tracking-tighter;\n}`);

// Add a specific styling for empty state illustrations if any, and softer shadows
content = content.replace(/--theme-shadow: 0 10px 40px -10px rgba\(79, 70, 229, 0.08\);/g, 
  `--theme-shadow: 0 8px 30px -4px rgba(79, 70, 229, 0.06);`);

content = content.replace(/box-shadow: 0 10px 40px -10px rgba\(79, 70, 229, 0.08\);/g,
  `box-shadow: 0 8px 30px -4px rgba(79, 70, 229, 0.06);`);

fs.writeFileSync(file, content);
console.log('index.css replacements applied successfully.');
