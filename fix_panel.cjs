const fs = require('fs');
let content = fs.readFileSync('src/components/ProfessionalReports.tsx', 'utf8');

// The replacement for the dark blue panel content (from lines 1220 to 1255)
const rightPanelRegex = /<div className="space-y-6 flex-1 flex flex-col items-end">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>\s*\{\/\* LEFT PANEL /;

const newRightPanel = `<div className="space-y-3 flex-1 flex flex-col items-end overflow-y-auto pr-1">
                       <div className="flex items-center gap-3 text-right justify-end w-full">
                          <div>
                             <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">المادة</p>
                             <p className="text-xs font-bold text-white leading-tight">
                               {data.subjects.filter(s => selectedQuizToManage.subjectIds?.includes(s.id)).map(s => s.name).join(' ، ') || 'غير محدد'}
                             </p>
                          </div>
                          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
                             <BookOpen size={14} className="text-slate-300" />
                          </div>
                       </div>

                       <div className="flex items-center gap-3 text-right justify-end w-full">
                          <div>
                             <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">تاريخ النشر</p>
                             <p className="text-xs font-bold text-white leading-tight">
                               {(() => {
                                 if (selectedQuizToManage.createdAt) return new Date(selectedQuizToManage.createdAt).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short', year: 'numeric' });
                                 if (selectedQuizToManage.id.startsWith('quiz_')) {
                                    const ts = parseInt(selectedQuizToManage.id.split('_')[1]);
                                    if (!isNaN(ts)) return new Date(ts).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short', year: 'numeric' });
                                 }
                                 return 'غير متوفر';
                               })()}
                             </p>
                          </div>
                          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
                             <Calendar size={14} className="text-slate-300" />
                          </div>
                       </div>

                       {(() => {
                          const targetClasses = data.classes.filter(c => {
                             if (c.isArchived) return false;
                             if (selectedQuizToManage.classIds && selectedQuizToManage.classIds.length > 0) return selectedQuizToManage.classIds.includes(c.id);
                             return c.gradeId === selectedQuizToManage.gradeId;
                          });
                          const gradeNames = Array.from(new Set(targetClasses.map(c => data.grades.find(g => g.id === c.gradeId)?.name).filter(Boolean))).join(' ، ');
                          
                          const allStudentsInTargetClasses = data.students.filter(s => targetClasses.some(c => c.id === s.classId) && !s.isArchived);
                          const totalStudentsCount = allStudentsInTargetClasses.length;
                          const testedStudentsCount = getQuizStats(selectedQuizToManage.id, allStudentsInTargetClasses).count;
                          const remainingStudentsCount = Math.max(0, totalStudentsCount - testedStudentsCount);

                          // Use the first target class grade's subject teacher or global logic if single teacher.
                          let teacherName = 'غير محدد';
                          if (selectedQuizToManage.subjectIds && selectedQuizToManage.subjectIds.length > 0) {
                             const sub = data.subjects.find(s => s.id === selectedQuizToManage.subjectIds[0]);
                             if (sub?.teacherId) {
                                teacherName = data.teachers.find(t => t.id === sub.teacherId)?.name || 'غير محدد';
                             }
                          } else if (filterTeacherId) {
                             teacherName = data.teachers.find(t => t.id === filterTeacherId)?.name || 'غير محدد';
                          }

                          return (
                             <>
                               <div className="flex items-center gap-3 text-right justify-end w-full">
                                  <div>
                                     <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">المعلم</p>
                                     <p className="text-xs font-bold text-white leading-tight">{teacherName}</p>
                                  </div>
                                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
                                     <User size={14} className="text-slate-300" />
                                  </div>
                               </div>

                               <div className="flex items-center gap-3 text-right justify-end w-full">
                                  <div>
                                     <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">الصف</p>
                                     <p className="text-xs font-bold text-white leading-tight">{gradeNames || 'غير محدد'}</p>
                                  </div>
                                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
                                     <Layers size={14} className="text-slate-300" />
                                  </div>
                               </div>

                               <div className="w-full grid grid-cols-2 gap-2 mt-2">
                                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 text-center flex flex-col items-center justify-center">
                                     <span className="text-[8px] text-emerald-400 font-bold uppercase tracking-wider mb-0.5">مختبرين</span>
                                     <span className="text-sm font-black text-emerald-300">{testedStudentsCount}</span>
                                  </div>
                                  <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-2 text-center flex flex-col items-center justify-center">
                                     <span className="text-[8px] text-rose-400 font-bold uppercase tracking-wider mb-0.5">متبقين</span>
                                     <span className="text-sm font-black text-rose-300">{remainingStudentsCount}</span>
                                  </div>
                               </div>

                               <div className="w-full mt-2 bg-white/5 rounded-2xl p-3 border border-white/10">
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-right">أداء الفصول في هذا الاختبار</p>
                                 <div className="flex flex-col gap-1.5 w-full">
                                   {targetClasses.length === 0 ? (
                                      <div className="text-center text-slate-400 font-bold p-3 text-[10px]">لا يوجد فصول مرتبطة</div>
                                   ) : (
                                      targetClasses.map(cls => {
                                        const clsStudents = data.students.filter(s => s.classId === cls.id && !s.isArchived);
                                        const clsAvg = getQuizStats(selectedQuizToManage.id, clsStudents).avg;
                                        return (
                                          <div key={cls.id} className="flex flex-row-reverse justify-between items-center bg-white/5 px-3 py-1.5 rounded-xl">
                                             <span className="font-bold text-slate-200 text-xs">{cls.name}</span>
                                             <div className="flex items-center gap-2">
                                                <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden hidden sm:block">
                                                   <div className="h-full bg-indigo-400 rounded-full" style={{ width: \`\${clsAvg}%\` }}></div>
                                                </div>
                                                <span className="font-black text-indigo-300 w-8 text-right text-[10px]">{clsAvg}%</span>
                                             </div>
                                          </div>
                                        );
                                      })
                                   )}
                                 </div>
                               </div>
                             </>
                          )
                       })()}
                    </div>
                 </div>
              </div>

              {/* LEFT PANEL (WHITE) `;

content = content.replace(rightPanelRegex, newRightPanel);

// Remove the obsolete classes performance section from the white panel:
// From <div className="mb-4"> ... text="أداء الفصول في هذا الاختبار" ... to </div> before mt-auto button
const leftOldClassesRegex = /<div className="mb-4">\s*<p className="text-\[10px\] font-black text-slate-400 uppercase tracking-widest mb-2 text-right">أداء الفصول في هذا الاختبار<\/p>[\s\S]*?<\/div>\s*<\/div>\s*<div className="mt-auto pt-4 flex gap-3 w-full">/;

content = content.replace(leftOldClassesRegex, '<div className="mt-auto pt-4 flex gap-3 w-full">');

fs.writeFileSync('src/components/ProfessionalReports.tsx', content);
