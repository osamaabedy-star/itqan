import React from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Book, 
  BrainCircuit, 
  TrendingUp, 
  Award, 
  X,
  FileText,
  Calendar,
  ChevronLeft,
  Link
} from 'lucide-react';
import { AppData, Teacher, Quiz } from '../types';

interface TeacherProfileProps {
  teacher: Teacher;
  data: AppData;
  calculatePerformance: (classId: string, subjectId?: string) => number;
  onClose: () => void;
  onSelectQuiz: (quiz: Quiz) => void;
}

export function TeacherProfile({ teacher, data, calculatePerformance, onClose, onSelectQuiz }: TeacherProfileProps) {
  const teacherSubjects = data.subjects.filter(s => 
    (s.teacherId === teacher.id || s.teacherIds?.includes(teacher.id)) && !s.isArchived
  );

  const teacherQuizzes = data.quizzes.filter(q => {
    if (q.isArchived) return false;
    const subject = q.subjectIds && q.subjectIds.length > 0 ? data.subjects.find(s => q.subjectIds?.includes(s.id)) : null;
    return subject?.teacherId === teacher.id || subject?.teacherIds?.includes(teacher.id);
  });

  const teacherVisits = data.visits.filter(v => v.teacherId === teacher.id && !v.isArchived);

  // Overall Performance for teacher (average of all their subjects in all their classes)
  const allPerformances: number[] = [];
  teacherSubjects.forEach(sub => {
    const affectedClasses = data.classes.filter(c => !c.isArchived && c.gradeId === sub.gradeId && (!sub.classIds || sub.classIds.includes(c.id)));
    affectedClasses.forEach(cls => {
      allPerformances.push(calculatePerformance(cls.id, sub.id));
    });
  });
  const avgPerformance = allPerformances.length > 0 
    ? Math.round(allPerformances.reduce((a, b) => a + b, 0) / allPerformances.length) 
    : 0;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[90] flex items-center justify-center p-4 md:p-8"
      dir="rtl"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-slate-50 w-full max-w-6xl h-full max-h-[900px] rounded-[40px] shadow-2xl flex flex-col overflow-hidden border border-white/20"
      >
        {/* Header Section */}
        <div className="bg-white p-8 relative border-b border-slate-100">
           <button 
             onClick={onClose}
             className="absolute top-8 left-8 w-12 h-12 rounded-2xl bg-white border border-slate-100 hover:border-indigo-200 hover:bg-slate-50 flex items-center justify-center transition-all shadow-sm group"
           >
              <X size={20} className="text-slate-400 group-hover:text-red-500 transition-colors" />
           </button>

           <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-28 h-28 rounded-[32px] bg-gradient-to-br from-indigo-600 to-blue-700 text-white flex items-center justify-center shadow-2xl shadow-indigo-200 overflow-hidden shrink-0 border-4 border-white">
                 {teacher.photoUrl ? (
                   <img 
                     src={teacher.photoUrl} 
                     alt={teacher.name} 
                     className="w-full h-full object-cover"
                     referrerPolicy="no-referrer"
                   />
                 ) : (
                   <div className="flex flex-col items-center gap-1">
                     <User size={48} strokeWidth={2.5}/>
                   </div>
                 )}
              </div>
              <div className="text-center md:text-right space-y-3">
                 <div className="space-y-1">
                   <h2 className="text-3xl font-black text-slate-900 tracking-tight">{teacher.name}</h2>
                   <p className="text-indigo-600 font-black text-[10px] uppercase tracking-[0.2em]">{teacher.specialization || 'عضو هيئة التدريس'}</p>
                 </div>
                 <div className="flex flex-wrap justify-center md:justify-start gap-2">
                    <span className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black border border-emerald-100 shadow-sm flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      الحالة: نشط حالياً
                    </span>
                    <span className="px-4 py-1.5 bg-slate-50 text-slate-500 rounded-full text-[10px] font-black border border-slate-100 shadow-sm">
                      رقم المعلم: {teacher.id.slice(-6).toUpperCase()}
                    </span>
                    <button
                      onClick={() => {
                        const link = `${window.location.origin}${window.location.pathname}?teacherReport=${teacher.id}`;
                        navigator.clipboard.writeText(link);
                        alert('تم نسخ رابط التقرير الخاص بالمعلم بنجاح. يمكنك إرساله إليه الآن.');
                      }}
                      className="px-4 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all rounded-full text-[10px] font-black border border-indigo-100 shadow-sm flex items-center gap-2"
                      title="نسخ رابط مباشر لتقرير هذا المعلم"
                    >
                       <Link size={14} /> نسخ رابط التقرير
                    </button>
                 </div>
              </div>
           </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
           {/* Summary Stats */}
           <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center group hover:border-indigo-600 transition-colors">
                 <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
                   <Book size={20} />
                 </div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">المواد المسندة</p>
                 <p className="text-3xl font-black text-indigo-600 tracking-tighter">{teacherSubjects.length}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center group hover:border-amber-500 transition-colors">
                 <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center mb-3 transition-colors group-hover:bg-amber-500 group-hover:text-white">
                   <BrainCircuit size={20} />
                 </div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">بنك الاختبارات</p>
                 <p className="text-3xl font-black text-amber-500 tracking-tighter">{teacherQuizzes.length}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center group hover:border-blue-600 transition-colors">
                 <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 transition-colors group-hover:bg-blue-600 group-hover:text-white">
                   <FileText size={20} />
                 </div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">سجل الزيارات</p>
                 <p className="text-3xl font-black text-blue-600 tracking-tighter">{teacherVisits.length}</p>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center group hover:border-emerald-600 transition-colors">
                 <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                   <TrendingUp size={20} />
                 </div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">المؤشر العام</p>
                 <div className="flex items-end gap-1">
                   <p className="text-3xl font-black text-emerald-600 tracking-tighter">{avgPerformance}%</p>
                   {avgPerformance >= 85 && <Award className="text-yellow-400 mb-1" size={20} />}
                 </div>
              </div>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              {/* Subjects & Performance */}
              <div className="space-y-6">
                 <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                       <Book size={24} className="text-indigo-600" /> الجدول الدراسي والأنصبة
                    </h3>
                    <div className="px-3 py-1 bg-white rounded-lg border border-slate-100 text-[10px] font-bold text-slate-400">
                      {teacherSubjects.length} مواد مسندة
                    </div>
                 </div>

                 <div className="space-y-4">
                    {teacherSubjects.map(sub => {
                      const grade = data.grades.find(g => g.id === sub.gradeId);
                      const affectedClasses = data.classes.filter(c => !c.isArchived && c.gradeId === sub.gradeId && (!sub.classIds || sub.classIds.includes(c.id)));

                      return (
                        <div key={sub.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
                           <div className="flex justify-between items-start mb-6">
                              <div className="space-y-1">
                                 <p className="font-black text-lg text-slate-900 group-hover:text-indigo-600 transition-colors">{sub.name}</p>
                                 <p className="text-[11px] text-slate-400 font-bold bg-slate-50 px-2 py-0.5 rounded-lg inline-block">{grade?.name}</p>
                              </div>
                              <div className="w-10 h-10 rounded-xl bg-indigo-50/50 flex items-center justify-center text-indigo-200 group-hover:text-indigo-600 transition-colors">
                                <Award size={24} strokeWidth={2.5}/>
                              </div>
                           </div>
                           <div className="space-y-3">
                              {affectedClasses.map(cls => {
                                const perf = calculatePerformance(cls.id, sub.id);
                                return (
                                  <div key={cls.id} className="flex flex-col gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100/50">
                                     <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-black text-slate-700">{cls.name}</span>
                                        <span className={`text-[11px] font-black ${perf >= 85 ? 'text-emerald-600' : perf >= 70 ? 'text-amber-600' : 'text-rose-600'}`}>
                                          {perf}%
                                        </span>
                                     </div>
                                     <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                        <motion.div 
                                          initial={{ width: 0 }}
                                          animate={{ width: `${perf}%` }}
                                          className={`h-full rounded-full ${perf >= 85 ? 'bg-emerald-500' : perf >= 70 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                        />
                                     </div>
                                  </div>
                                );
                              })}
                           </div>
                        </div>
                      );
                    })}
                 </div>
              </div>

              {/* Quizzes and Visits */}
              <div className="space-y-10">
                 {/* Quizzes */}
                 <div className="space-y-6">
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                       <BrainCircuit size={24} className="text-amber-500" /> بنك الاختبارات والمقاييس
                    </h3>
                    <div className="grid grid-cols-1 gap-3">
                       {teacherQuizzes.length > 0 ? teacherQuizzes.map(quiz => (
                         <button 
                           key={quiz.id} 
                           onClick={() => onSelectQuiz(quiz)}
                           className="bg-white p-5 rounded-2xl border border-slate-100 flex justify-between items-center group transition-all hover:bg-slate-50 hover:border-indigo-100 hover:shadow-sm text-right"
                         >
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all">
                                  <FileText size={18} />
                               </div>
                               <div>
                                  <p className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{quiz.title}</p>
                                  <p className="text-[10px] text-slate-400 font-bold">{quiz.subjectName}</p>
                               </div>
                            </div>
                            <div className="flex items-center gap-3">
                               <div className="text-[10px] font-black text-slate-300 group-hover:text-slate-400">{quiz.questions.length || 0} فِقرة</div>
                               <ChevronLeft size={18} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-[-4px] transition-all" />
                            </div>
                         </button>
                       )) : (
                         <div className="text-center p-12 bg-white rounded-3xl border border-dashed border-slate-200">
                           <BrainCircuit size={32} className="mx-auto text-slate-200 mb-3" />
                           <p className="text-sm font-bold text-slate-400">لا توجد اختبارات متاحة حالياً</p>
                         </div>
                       )}
                    </div>
                 </div>

                 {/* Supervisory Visits */}
                 <div className="space-y-6">
                    <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                       <FileText size={24} className="text-blue-600" /> سجل الزيارات الإشرافية المنفذة
                    </h3>
                    <div className="space-y-3">
                       {teacherVisits.length > 0 ? teacherVisits.map(visit => {
                          const totalS = Object.values(visit.evaluationData || {}).reduce((a, b) => a + b, 0);
                          const totalM = Object.keys(visit.evaluationData || {}).length * 4;
                          const perc = totalM > 0 ? Math.round((totalS / totalM) * 100) : 0;
                          
                          return (
                            <div key={visit.id} className="bg-white p-5 rounded-2xl border border-slate-100 flex justify-between items-center group hover:border-blue-100 transition-all">
                               <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                                     <Calendar size={22} />
                                  </div>
                                  <div>
                                     <p className="text-sm font-black text-slate-800 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{visit.supervisorName || 'زيارة إشرافية'}</p>
                                     <div className="flex items-center gap-2 mt-0.5">
                                        <p className="text-[10px] text-slate-400 font-bold">{new Date(visit.date).toLocaleDateString('ar-SA')}</p>
                                        <div className="w-1 h-1 rounded-full bg-slate-200" />
                                        <p className="text-[10px] text-slate-500 font-bold line-clamp-1 max-w-[150px]">{visit.notes?.slice(0, 40)}...</p>
                                     </div>
                                  </div>
                               </div>
                               <div className="flex flex-col items-end gap-1.5">
                                  <div className={`px-3 py-1 rounded-full text-[10px] font-black shadow-sm ${
                                    perc >= 85 ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'
                                  }`}>
                                     {perc}% {perc >= 85 ? 'متميز' : 'منجز'}
                                  </div>
                               </div>
                            </div>
                          );
                       }) : (
                        <div className="text-center p-12 bg-white rounded-3xl border border-dashed border-slate-200">
                          <FileText size={32} className="mx-auto text-slate-200 mb-3" />
                          <p className="text-sm font-bold text-slate-400">لا توجد زيارات مرصودة بالسجل</p>
                        </div>
                       )}
                    </div>
                 </div>
              </div>
           </div>
        </div>
        
        {/* Footer */}
        <div className="bg-white p-8 border-t border-slate-100 flex justify-center items-center gap-4">
           <div className="w-1.5 h-1.5 rounded-full bg-indigo-200" />
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">نظام إتقان • جودة التعليم أولاً</p>
           <div className="w-1.5 h-1.5 rounded-full bg-indigo-200" />
        </div>
      </motion.div>
    </motion.div>
  );
}
