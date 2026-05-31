const fs = require('fs');
const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /calculatePerformance=\{calculatePerformance\}\n              \/>/,
  "calculatePerformance={calculatePerformance}\n              onSelectTeacher={(t) => { setSelectedTeacher(t); setView('teacher-profile'); }}\n            />"
);

fs.writeFileSync(file, content);
console.log('App.tsx updated with onSelectTeacher');
