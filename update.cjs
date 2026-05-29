const fs = require('fs');
let content = fs.readFileSync('src/components/ProfessionalReports.tsx', 'utf8');

const regex = /<div className="mt-auto pt-6 flex gap-4 w-full">([\s\S]*?)<\/button>\s*<\/div>/;

content = content.replace(regex, `<div className="mt-auto pt-4 flex gap-3 w-full">
                    <button onClick={() => setSelectedQuizToManage(null)} className="flex-[1] bg-slate-900 hover:bg-slate-800 text-white rounded-[20px] h-[56px] font-black text-sm transition-colors shadow-sm">
                       إغلاق
                    </button>
                    <button 
                       onClick={(e) => {
                          e.stopPropagation();
                          window.print();
                       }}
                       className="flex-[2] bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-[20px] h-[56px] font-black text-sm transition-colors flex items-center justify-center gap-3 border border-indigo-100 shadow-sm"
                    >
                       <span>تصدير PDF</span>
                       <Download size={18} />
                    </button>
                 </div>`);

fs.writeFileSync('src/components/ProfessionalReports.tsx', content);
console.log("File updated");
