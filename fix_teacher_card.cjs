const fs = require('fs');
const file = 'src/components/ProfessionalReports.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Update onClick in teacher card to also filter
content = content.replace(
  /onClick={() => {\n                                if (onSelectTeacher) {\n                                  onSelectTeacher\(teacher\);\n                                }\n                              }}/,
  "onClick={() => {\n                                if (onFilterTeacherChange) {\n                                  onFilterTeacherChange(teacher.id);\n                                  setActiveTab('quizzes');\n                                }\n                              }}"
);

// 2. Add performance display in teacher card
content = content.replace(
  /<div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl">/,
  `{(() => {
    const tsPercentage = Math.round(teacherSubjects.reduce((acc, sub) => acc + calculatePerformance("", sub.id), 0) / (teacherSubjects.length || 1));
    return (
      <div className="mb-4">
        <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
           <span>نسبة الإنجاز</span>
           <span>{tsPercentage}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5">
           <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: tsPercentage + '%' }}></div>
        </div>
      </div>
    );
  })()}
  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl">`
);

fs.writeFileSync(file, content);
console.log('Teacher card updated');
