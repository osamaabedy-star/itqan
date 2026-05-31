const fs = require('fs');
const file = 'src/components/ProfessionalReports.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/teacher.employeeId \|\| 'معلم'/g, "teacher.email || 'معلم'");

fs.writeFileSync(file, content);
console.log("Fixed teacher email");
