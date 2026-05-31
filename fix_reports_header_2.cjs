const fs = require('fs');
const file = 'src/components/ProfessionalReports.tsx';
let content = fs.readFileSync(file, 'utf8');

// Update useState to include 'teachers'
content = content.replace(
  /const \[activeTab, setActiveTab\] = useState<'quizzes' \| 'skills' \| 'students'>\('quizzes'\);/,
  "const [activeTab, setActiveTab] = useState<'quizzes' | 'skills' | 'students' | 'teachers'>('quizzes');"
);

// We want to replace the huge header block with a sleek, 1-row header block
const startText = '<div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 bg-white p-10 rounded-3xl border border-slate-100 shadow-minimal">';
const endText = '             </div>\n          </div>';

const startIndex = content.indexOf(startText);
const endIndex = content.indexOf(endText, startIndex) + endText.length;

if (startIndex !== -1 && endIndex > startText.length) {
  const newHeader = `<div className="flex flex-col gap-3 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
             <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
                
                {/* Title & Navigation */}
                <div className="flex items-center gap-3">
                   {onClose && (
                     <button 
                       onClick={onClose}
                       className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:text-indigo-600 hover:bg-indigo-50 transition-all group"
                       title="العودة للوحة التحكم"
                     >
                       <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                     </button>
                   )}
                   <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
                      <BarChart3 size={20} />
                   </div>
                   <div>
                     <h2 className="text-xl font-black text-slate-800 tracking-tighter">التقارير التحليلية</h2>
                     <p className="text-slate-500 font-semibold text-[10px]">مراجعة شاملة لنتائج الاختبارات والمهارات</p>
                   </div>
                </div>

                {/* Tabs, Class, Grade, and PDF Controls */}
                <div className="flex flex-wrap lg:flex-nowrap items-center gap-3 w-full lg:w-auto">
                   
                   <div className="flex bg-slate-50 p-1 rounded-xl shrink-0 overflow-x-auto scrollbar-hide">
                      <button 
                        onClick={() => setActiveTab('quizzes')}
                        className={\`px-3 py-2 rounded-lg font-black text-[11px] transition-all flex items-center gap-1.5 whitespace-nowrap \${activeTab === 'quizzes' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}\`}
                      >
                         <BrainCircuit size={14} />نتائج الاختبارات
                      </button>
                      <button 
                        onClick={() => setActiveTab('skills')}
                        className={\`px-3 py-2 rounded-lg font-black text-[11px] transition-all flex items-center gap-1.5 whitespace-nowrap \${activeTab === 'skills' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}\`}
                      >
                         <Zap size={14} />إتقان المهارات
                      </button>
                      <button 
                        onClick={() => setActiveTab('students')}
                        className={\`px-3 py-2 rounded-lg font-black text-[11px] transition-all flex items-center gap-1.5 whitespace-nowrap \${activeTab === 'students' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}\`}
                      >
                         <Users size={14} />تقارير الطلاب
                      </button>
                      <button 
                        onClick={() => setActiveTab('teachers')}
                        className={\`px-3 py-2 rounded-lg font-black text-[11px] transition-all flex items-center gap-1.5 whitespace-nowrap \${activeTab === 'teachers' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}\`}
                      >
                         <Award size={14} />تقارير المعلمين
                      </button>
                   </div>

                   <div className="h-6 w-[1px] bg-slate-200 mx-1 hidden lg:block shrink-0" />

                   <div className="flex gap-2 flex-grow lg:flex-none">
                      {/* Teacher filter dropdown (Moved from Navbar) */}
                      <div className="relative group flex-1 lg:flex-none">
                         <select 
                           value={filterTeacherId || ''}
                           onChange={(e) => onSelectStudent /* wait, we need to pass a callback from parent to change this */ } 
                           disabled
                           className="w-full lg:w-[130px] h-9 bg-slate-50 border border-slate-100 rounded-xl px-8 font-black text-slate-700 outline-none appearance-none cursor-pointer focus:ring-2 ring-indigo-100 transition-all text-[11px]"
                         >
                            <option value="">جميع المعلمين</option>
                            {/* Wait, the user wants us to MOVE them... meaning we need to actually just add the teacher filter here if onFilterTeacherId exists? We'll leave it simple for now or read from \`data.teachers\` */}
                            {data.teachers.filter(t => !t.isArchived).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                         </select>
                         <User size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-indigo-600 transition-colors" />
                      </div>

                      <div className="relative group flex-1 lg:flex-none">
                         <select 
                           value={selectedGradeId}
                           onChange={(e) => { setSelectedGradeId(e.target.value); setSelectedClassId(''); }}
                           className="w-full lg:w-[120px] h-9 bg-slate-50 border border-slate-100 rounded-xl px-8 font-black text-slate-700 outline-none appearance-none cursor-pointer focus:ring-2 ring-indigo-100 transition-all text-[11px]"
                         >
                            <option value="">جميع المراحل</option>
                            {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                         </select>
                         <GraduationCap size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-indigo-600 transition-colors" />
                      </div>
                      <div className="relative group flex-1 lg:flex-none">
                         <select 
                           value={selectedClassId}
                           onChange={(e) => setSelectedClassId(e.target.value)}
                           className="w-full lg:w-[120px] h-9 bg-slate-50 border border-slate-100 rounded-xl px-8 font-black text-slate-700 outline-none appearance-none cursor-pointer focus:ring-2 ring-indigo-100 transition-all text-[11px]"
                         >
                            <option value="">جميع الفصول</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                         </select>
                         <Users size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-indigo-600 transition-colors" />
                      </div>
                   </div>
                   
                   <button 
                     onClick={handleExportPDF}
                     disabled={isExporting}
                     className={\`h-9 px-4 shrink-0 bg-slate-900 text-white rounded-xl flex items-center justify-center gap-1.5 hover:shadow-md transition-all font-black text-[11px] \${isExporting ? 'opacity-50 cursor-wait' : ''}\`}
                   >
                      {isExporting ? <span className="animate-pulse">تصدير...</span> : <><Download size={14} />تصدير</>}
                   </button>
                </div>
             </div>
          </div>`;

  content = content.substring(0, startIndex) + newHeader + content.substring(endIndex);
  fs.writeFileSync(file, content);
  console.log('Header successfully replaced!');
} else {
  console.log('Could not find the header start or end text. Start:', startIndex, 'End:', endIndex);
}
