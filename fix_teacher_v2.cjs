const fs = require('fs');
const file = 'src/components/ProfessionalReports.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Move teacher section out of render loop or rework it.
// Actually, I can keep the teacher section, but wrap it in a dedicated component or just clean up the "OnClick".
// The user wants: "When clicking the teacher name, open the full report as before."
// In the current code (lines 2033), onClick is:
// onClick={() => {
//   if (onFilterTeacherChange) {
//     onFilterTeacherChange(teacher.id);
//     setActiveTab('quizzes'); /* switch to reports for that teacher */
//   }
// }}
// This seems to be doing the filtering correctly.
// Maybe "as before" means something else?
// Let's re-read: "عند الضغط على اسم المعلم يفتح التقرير كامل كما كان في السابق"
// Maybe `setActiveTab('quizzes')` is the problem? Should it stay on 'teachers'? 
// No, tab selection logic seems fine.
// Let's improve the card design first as requested.

const cardDesignReplacement = `
                            <div 
                              key={teacher.id} 
                              onClick={() => {
                                if (onFilterTeacherChange) {
                                  onFilterTeacherChange(teacher.id);
                                  setActiveTab('quizzes');
                                }
                              }}
                              className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all cursor-pointer group flex flex-col justify-between h-full relative overflow-hidden"
                            >
                               <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">→</div>
                               </div>
                               <div className="flex items-center gap-4 mb-8">
                                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-inner">
                                     <User size={32} />
                                  </div>
                                  <div>
                                     <p className="font-black text-slate-800 leading-tight text-lg">{teacher.name}</p>
                                     <p className="text-xs font-bold text-slate-400 mt-1.5">{teacher.email || 'معلم'}</p>
                                  </div>
                               </div>
                               {(() => {
                                  const tsPercentage = Math.round(teacherSubjects.reduce((acc, sub) => acc + (calculatePerformance ? calculatePerformance("", sub.id) : 0), 0) / (teacherSubjects.length || 1));
                                  return (
                                     <div className="mb-6">
                                        <div className="flex justify-between text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                           <span>نسبة الإنجاز الكلي</span>
                                           <span className="text-indigo-600">{tsPercentage}%</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-2">
                                           <div className="bg-indigo-600 h-2 rounded-full transition-all duration-500" style={{ width: tsPercentage + '%' }}></div>
                                        </div>
                                     </div>
                                  );
                               })()}
                               <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
                                  <div className="text-center flex-1">
                                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">المواد</p>
                                     <p className="font-black text-slate-700 text-lg">{teacherSubjects.length}</p>
                                  </div>
                                  <div className="w-[1px] h-10 bg-slate-200" />
                                  <div className="text-center flex-1">
                                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">الفصول</p>
                                     <p className="font-black text-slate-700 text-lg">{teacherClasses.length}</p>
                                  </div>
                               </div>
                            </div>
`;

// Note: I noticed in line 2051 in previous turn turn, the `calculatePerformance` check wasn't safe. Added `calculatePerformance ? ... : 0`

// This is complex, let's just do a simple replacement for the onClick and card design.
// I'll try to find the whole card block and replace it.

fs.writeFileSync(file, content);
console.log('File content ready for complex edit');
