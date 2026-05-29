const fs = require('fs');
let content = fs.readFileSync('src/components/Management.tsx', 'utf8');

content = content.replace(
  /if \(\!skillName \|\| \!targetGradeId \|\| \!targetSubjectName\) \{/,
  "if (!skillName || !targetGradeId || !targetSubjectName || !skillQuestions.trim()) {"
);
content = content.replace(
  /alert\('يرجى ملء جميع الحقول المطلوبة \(الاسم، الصف، واسم المادة\)'\);/,
  "alert('يرجى ملء جميع الحقول المطلوبة (الاسم، الصف، اسم المادة، والأسئلة)');"
);

fs.writeFileSync('src/components/Management.tsx', content);
