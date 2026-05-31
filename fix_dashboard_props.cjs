const fs = require('fs');
const file = 'src/components/Dashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /filterTeacherId\?: string;/,
  "filterTeacherId?: string;\n  onFilterTeacherChange?: (id: string) => void;"
);

content = content.replace(
  /onSelectTeacher,\n  onSelectQuiz,\n  calculatePerformance,\n  filterTeacherId,\n}: DashboardProps\)/,
  "onSelectTeacher,\n  onSelectQuiz,\n  calculatePerformance,\n  filterTeacherId,\n  onFilterTeacherChange,\n}: DashboardProps)"
);

fs.writeFileSync(file, content);
console.log('DashboardProps updated');
