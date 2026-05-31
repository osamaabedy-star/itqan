const fs = require('fs');
const file = 'src/components/ProfessionalReports.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace the activeTab type explicitly to include 'teachers' if defined in the same block, wait, type is defined on line 69
content = content.replace(/const \[activeTab, setActiveTab\] = useState<'quizzes' \| 'skills' \| 'students'>\('quizzes'\);/, "const [activeTab, setActiveTab] = useState<'quizzes' | 'skills' | 'students' | 'teachers'>('quizzes');");

// Define Regex
const oldHeaderRegex = /<div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">[\s\S]*?(?=<AnimatePresence mode="wait">)/;

const newHeader = `
             <div className="flex flex-col gap-4 mb-8">
                {/* Compact Head */}
                <div className="flex items-center justify-between bg-white px-6 py-4 rounded-3xl border border-slate-100 shadow-sm">
                   <div className="flex items-center gap-4">
                     {onClose && (
                       <button onClick={onClose} className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:text-indigo-600 hover:bg-indigo-50 transition-all">
                         <ArrowRight size={20} />
                       </button>
                     )}
                     <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
                        <BarChart3 size={20} />
                     </div>
                     <div>
                       <h2 className="text-xl font-black text-slate-800 tracking-tighter">التقارير التحليلية والتحصيلية</h2>
                       <p className="text-slate-500 font-semibold text-[10px]">مراجعة شاملة لنتائج الاختبارات ومستويات إتقان المهارات</p>
                     </div>
                   </div>
                   {filterTeacherId && (
                      <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
                         <span className="text-[10px] font-black text-indigo-400 uppercase">المعلم:</span>
                         <span className="text-sm font-black text-indigo-700">{data.teachers.find(t => t.id === filterTeacherId)?.name || 'غير معروف'}</span>
                      </div>
                   )}
                </div>

                {/* Control Row: Tabs, Filters, Export */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm w-full">
                   <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto overflow-x-auto scrollbar-hide">
                      <div className="flex bg-slate-50 p-1 rounded-xl shrink-0">
                         <button 
                           onClick={() => setActiveTab('quizzes')}
                           className={\`px-4 py-2 rounded-lg font-black text-[11px] transition-all flex items-center gap-1.5 \${activeTab === 'quizzes' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}\`}
                         >
                            <BrainCircuit size={14} /> نتائج الاختبارات
                         </button>
                         <button 
                           onClick={() => setActiveTab('skills')}
                           className={\`px-4 py-2 rounded-lg font-black text-[11px] transition-all flex items-center gap-1.5 \${activeTab === 'skills' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}\`}
                         >
                            <Zap size={14} /> إتقان المهارات
                         </button>
                         <button 
                           onClick={() => setActiveTab('students')}
                           className={\`px-4 py-2 rounded-lg font-black text-[11px] transition-all flex items-center gap-1.5 \${activeTab === 'students' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}\`}
                         >
                            <Users size={14} /> تقارير الطلاب
                         </button>
                         
                         <button 
                           onClick={() => setActiveTab('teachers')}
                           className={\`px-4 py-2 rounded-lg font-black text-[11px] transition-all flex items-center gap-1.5 \${activeTab === 'teachers' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}\`}
                         >
                            <Award size={14} /> المعلمين
                         </button>
                      </div>

                      <div className="h-6 w-[1px] bg-slate-200 mx-1 hidden lg:block" />

                      <div className="flex items-center gap-2 flex-grow lg:flex-none">
                         <div className="relative group w-1/2 lg:w-auto">
                            <select 
                              value={selectedGradeId}
                              onChange={(e) => { setSelectedGradeId(e.target.value); setSelectedClassId(''); }}
                              className="w-full lg:w-[140px] h-10 bg-slate-50 border border-slate-100 rounded-xl px-9 font-black text-slate-700 outline-none appearance-none cursor-pointer focus:ring-2 ring-indigo-100 transition-all text-[11px]"
                            >
                               <option value="">جميع المراحل</option>
                               {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                            <GraduationCap size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-indigo-600 transition-colors" />
                         </div>

                         <div className="relative group w-1/2 lg:w-auto">
                            <select 
                              value={selectedClassId}
                              onChange={(e) => setSelectedClassId(e.target.value)}
                              className="w-full lg:w-[140px] h-10 bg-slate-50 border border-slate-100 rounded-xl px-9 font-black text-slate-700 outline-none appearance-none cursor-pointer focus:ring-2 ring-indigo-100 transition-all text-[11px]"
                            >
                               <option value="">جميع الفصول</option>
                               {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <Users size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-indigo-600 transition-colors" />
                         </div>
                      </div>
                   </div>

                   <button 
                     onClick={exportToPDF}
                     disabled={isExporting}
                     className="h-10 px-5 flex-grow lg:flex-none flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-[11px] transition-all shadow-sm hover:shadow-md disabled:opacity-50 shrink-0"
                   >
                     {isExporting ? <span className="animate-pulse">جاري التصدير...</span> : <><Download size={14} /> تصدير PDF</>}
                   </button>
                </div>
             </div>
             
             <AnimatePresence mode="wait">
`;

if (oldHeaderRegex.test(content)) {
  content = content.replace(oldHeaderRegex, newHeader);
  fs.writeFileSync(file, content);
  console.log("Header replaced.");
} else {
  console.error("Regex didn't match.");
}
