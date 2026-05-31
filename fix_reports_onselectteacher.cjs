const fs = require('fs');
const file = 'src/components/ProfessionalReports.tsx';
let content = fs.readFileSync(file, 'utf8');

// Update Props interface
content = content.replace(
  /onFilterTeacherChange\?: \(id: string\) => void;/,
  "onFilterTeacherChange?: (id: string) => void;\n  onSelectTeacher?: (teacher: any) => void;"
);

// Update destructuring
content = content.replace(
  /filterTeacherId, onFilterTeacherChange, calculatePerformance \}: ProfessionalReportsProps\)/,
  "filterTeacherId, onFilterTeacherChange, onSelectTeacher, calculatePerformance }: ProfessionalReportsProps)"
);

// Update onClick
content = content.replace(
  /onClick={() => {\n                                if (onFilterTeacherChange) {\n                                  onFilterTeacherChange(teacher.id);\n                                  setActiveTab('quizzes'); \/\* switch to reports for that teacher \*\/\n                                }\n                              }}/,
  "onClick={() => {\n                                if (onSelectTeacher) {\n                                  onSelectTeacher(teacher);\n                                }\n                              }}"
);

fs.writeFileSync(file, content);
console.log('ProfessionalReports updated to handle onSelectTeacher');
