const fs = require('fs');
let content = fs.readFileSync('src/components/ProfessionalReports.tsx', 'utf8');

content = content.replace(/className="bg-white w-full max-w-5xl rounded-\[48px\] shadow-2xl overflow-hidden relative border border-white\/20 flex flex-col md:flex-row min-h-\[600px\] max-h-\[90vh\]"/g,
'className="bg-white w-full max-w-4xl rounded-[32px] shadow-2xl overflow-hidden relative border border-white/20 flex flex-col md:flex-row h-auto max-h-[90vh] min-h-[500px]"');

content = content.replace(/className="md:w-\[45%\] bg-\[#0B1121\] text-white p-10 flex flex-col relative overflow-hidden shrink-0"/g,
'className="md:w-[35%] bg-[#0B1121] text-white p-6 md:p-8 flex flex-col relative overflow-hidden shrink-0"');

content = content.replace(/className="md:w-\[55%\] bg-white p-10 flex flex-col h-full overflow-y-auto min-h-0"/g,
'className="md:w-[65%] bg-white p-6 md:p-8 flex flex-col h-full overflow-y-auto min-h-0"');

// Fix headers
content = content.replace(/<h2 className="text-5xl font-black text-white leading-tight tracking-tight mt-auto text-right mb-16">/g,
'<h2 className="text-3xl lg:text-4xl font-black text-white leading-tight tracking-tight mt-auto text-right mb-10">');

content = content.replace(/<div className="space-y-8 flex-1 flex flex-col items-end">/g,
'<div className="space-y-6 flex-1 flex flex-col items-end">');

content = content.replace(/<div className="w-12 h-12 rounded-2xl bg-white\/5 flex items-center justify-center border border-white\/10 shrink-0">/g,
'<div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 shrink-0">');
content = content.replace(/<div className="w-12 h-12 rounded-2xl bg-white\/5 flex items-center justify-center border border-white\/10 shrink-0">/g,
'<div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 shrink-0">'); // For second instance

content = content.replace(/<p className="text-lg font-bold text-white">/g,
'<p className="text-sm font-bold text-white">');
content = content.replace(/<p className="text-lg font-bold text-white">/g,
'<p className="text-sm font-bold text-white">');

// change date formatter
// {new Date(selectedQuizToManage.createdAt).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' })}
// we should check if they exist first, use string replace carefully
content = content.replace(/\{new Date\(selectedQuizToManage.createdAt\).toLocaleDateString\('ar-SA', \{ day: 'numeric', month: 'long', year: 'numeric' \}\)\}/g,
"{selectedQuizToManage.createdAt ? new Date(selectedQuizToManage.createdAt).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short', year: 'numeric' }) : 'غير متوفر'}");

fs.writeFileSync('src/components/ProfessionalReports.tsx', content);
console.log("Width updated");
