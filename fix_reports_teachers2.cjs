const fs = require('fs');
const file = 'src/components/ProfessionalReports.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetStr = "                </motion.div>\n             ) : null}\n          </AnimatePresence>";
const replacement = `                </motion.div>
             ) : activeTab === 'teachers' ? (
                <motion.div 
                  key="teachers"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                   <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                      {data.teachers.filter(t => !t.isArchived).map(teacher => {
                         const teacherSubjects = data.subjects.filter(s => !s.isArchived && (s.teacherId === teacher.id || s.teacherIds?.includes(teacher.id)));
                         const teacherClasses = data.classes.filter(c => !c.isArchived && (c.teacherIds?.includes(teacher.id) || teacherSubjects.some(ts => ts.gradeId === c.gradeId)));
                         
                         return (
                            <div 
                              key={teacher.id} 
                              onClick={() => {
                                if (onFilterTeacherChange) {
                                  onFilterTeacherChange(teacher.id);
                                  setActiveTab('quizzes'); /* switch to reports for that teacher */
                                }
                              }}
                              className={\`bg-white p-6 rounded-3xl border \${filterTeacherId === teacher.id ? 'border-indigo-400 shadow-sm ring-4 ring-indigo-50' : 'border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100'} transition-all cursor-pointer group flex flex-col justify-between h-full\`}
                            >
                               <div className="flex items-center gap-4 mb-6">
                                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                     <User size={24} />
                                  </div>
                                  <div>
                                     <p className="font-black text-slate-800 leading-tight text-sm">{teacher.name}</p>
                                     <p className="text-[10px] font-bold text-slate-400 mt-1">{teacher.employeeId || 'معلم'}</p>
                                  </div>
                               </div>
                               <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl">
                                  <div className="text-center flex-1">
                                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">المواد</p>
                                     <p className="font-black text-slate-700">{teacherSubjects.length}</p>
                                  </div>
                                  <div className="w-[1px] h-8 bg-slate-200" />
                                  <div className="text-center flex-1">
                                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">الفصول</p>
                                     <p className="font-black text-slate-700">{teacherClasses.length}</p>
                                  </div>
                               </div>
                            </div>
                         );
                      })}
                   </div>
                   {data.teachers.filter(t => !t.isArchived).length === 0 && (
                      <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-3xl border border-slate-100 shadow-sm"><div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4"><Users size={32} className="text-slate-300" /></div><h4 className="text-sm font-black text-slate-700 tracking-tight mb-1">لا يوجد معلمين</h4><p className="text-xs font-semibold text-slate-400">لم يتم تعيين معلمين في النظام بعد</p></div>
                   )}
                </motion.div>
             ) : null}
          </AnimatePresence>`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replacement);
  fs.writeFileSync(file, content);
  console.log("Teacher tab rendered.");
} else {
  console.error("Target still not found!");
}
