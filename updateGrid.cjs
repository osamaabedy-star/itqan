const fs = require('fs');
let content = fs.readFileSync('src/components/ProfessionalReports.tsx', 'utf8');

const regex = /<div className="grid grid-cols-2 gap-4 mb-8">([\s\S]*?)<div className="mt-auto/g;

content = content.replace(regex, `<div className="grid grid-cols-2 gap-3 mb-6">
                    {(() => {
                       const stats = getQuizStats(selectedQuizToManage.id, data.students.filter(s => !s.isArchived));
                       return (
                          <>
                             <div className="bg-slate-50 p-5 rounded-[24px] flex flex-col justify-center items-center text-center -mx-2">
                                <div className="w-10 h-10 bg-white text-indigo-400 rounded-full flex items-center justify-center mb-3 shadow-sm"><TrendingUp size={18} strokeWidth={2.5} /></div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">المعدل العام</p>
                                <p className="text-3xl font-black text-slate-900">{stats.avg}%</p>
                             </div>
                             <div className="bg-slate-50 p-5 rounded-[24px] flex flex-col justify-center items-center text-center -mx-2">
                                <div className="w-10 h-10 bg-white text-emerald-500 rounded-full flex items-center justify-center mb-3 shadow-sm"><Users size={18} strokeWidth={2.5} /></div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">عدد الطلاب</p>
                                <p className="text-3xl font-black text-slate-900">{stats.count}</p>
                             </div>
                             <div className="bg-slate-50 p-5 rounded-[24px] flex flex-col justify-center items-center text-center -mx-2">
                                <div className="w-10 h-10 bg-white text-amber-500 rounded-full flex items-center justify-center mb-3 shadow-sm"><Award size={18} strokeWidth={2.5} /></div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">نسبة الإتقان</p>
                                <p className="text-3xl font-black text-slate-900">{stats.masteredPercentage}%</p>
                             </div>
                          </>
                       );
                    })()}
                    <div className="bg-slate-50 p-5 rounded-[24px] flex flex-col justify-center items-center text-center -mx-2">
                       <div className="w-10 h-10 bg-white text-rose-500 rounded-full flex items-center justify-center mb-3 shadow-sm"><Sparkles size={18} strokeWidth={2.5} /></div>
                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">تساؤلات</p>
                       <p className="text-3xl font-black text-slate-900">{selectedQuizToManage.questions?.length || 0}</p>
                    </div>
                 </div>

                 <div className="mb-6">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 text-right">أداء الفصول في هذا الاختبار</p>
                   <div className="flex flex-col gap-2">
                     {(() => {
                       const validClasses = data.classes.filter(c => {
                         if (c.isArchived) return false;
                         if (selectedQuizToManage.classIds && selectedQuizToManage.classIds.length > 0) return selectedQuizToManage.classIds.includes(c.id);
                         return c.gradeId === selectedQuizToManage.gradeId;
                       });
                       
                       if (validClasses.length === 0) {
                         return <div className="text-center text-slate-400 font-bold p-4 text-xs">لا يوجد فصول مرتبطة</div>;
                       }

                       return validClasses.map(cls => {
                         const clsStudents = data.students.filter(s => s.classId === cls.id && !s.isArchived);
                         const clsAvg = getQuizStats(selectedQuizToManage.id, clsStudents).avg;
                         return (
                           <div key={cls.id} className="flex justify-between items-center bg-white px-4 py-2.5 rounded-[20px] border border-slate-100 shadow-sm hover:shadow-md transition-all">
                              <div className="flex items-center gap-3">
                                <span className="font-black text-indigo-600 w-10 text-right text-sm">{clsAvg}%</span>
                                <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                                   <div className="h-full bg-indigo-500 rounded-full" style={{ width: \`\${clsAvg}%\` }}></div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-slate-700 text-xs">{cls.name}</span>
                                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs shrink-0">
                                   {cls.name.substring(0, 1) || '-'}
                                </div>
                              </div>
                           </div>
                         );
                       });
                     })()}
                   </div>
                 </div>

                 <div className="mt-auto`);

fs.writeFileSync('src/components/ProfessionalReports.tsx', content);
console.log("Grid updated");
