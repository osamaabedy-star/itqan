const fs = require('fs');
const file = 'src/App.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /filterTeacherId=\{globalFilterTeacherId\}/,
  "filterTeacherId={globalFilterTeacherId}\n              onFilterTeacherChange={setGlobalFilterTeacherId}"
);

fs.writeFileSync(file, content);
console.log('App.tsx updated');
