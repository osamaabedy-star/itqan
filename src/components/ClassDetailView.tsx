import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, BookOpen, AlertTriangle, ChevronRight, CheckCircle2 } from 'lucide-react';
import { AppData, Student, Quiz, QuizResult, Class } from '../types';

interface ClassDetailViewProps {
  data: AppData;
  classId: string;
  onBack: () => void;
  teacherId: string;
}

export const ClassDetailView: React.FC<ClassDetailViewProps> = ({ data, classId, onBack, teacherId }) => {
  const cls = data.classes.find(c => c.id === classId);
  const classStudents = useMemo(() => 
    data.students.filter(s => s.classId === classId && !s.isArchived),
    [data.students, classId]
  );
  
  const classQuizzes = useMemo(() => 
    data.quizzes.filter(q => !q.isArchived && q.classIds?.includes(classId) && (q.teacherId === teacherId || q.teacherIds?.includes(teacherId))),
    [data.quizzes, classId, teacherId]
  );

  const studentPerformance = useMemo(() => {
    return classStudents.map(student => {
      const results = data.quizResults.filter(r => r.studentId === student.id && classQuizzes.some(q => q.id === r.quizId));
      let totalScore = 0;
      let count = 0;
      classQuizzes.forEach(q => {
        const res = results.find(r => r.quizId === q.id);
        if (res) {
            totalScore += res.score;
            count++;
        }
      });
      const avg = count > 0 ? totalScore / count : 0;
      return {
        student,
        avg,
        results
      };
    });
  }, [classStudents, classQuizzes, data.quizResults]);

  const strugglingStudents = studentPerformance.filter(p => p.avg < 50 && p.results.length > 0);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <button onClick={onBack} className="flex items-center gap-1 text-slate-500 hover:text-indigo-600 font-bold text-sm">
        <ChevronRight size={16} /> العودة لفصولي
      </button>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8">
        <h2 className="text-2xl font-black text-slate-800 mb-2">فصل {cls?.name}</h2>
        <p className="text-sm font-bold text-slate-400">تحليل الأداء للفصل</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Struggling Students */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6">
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-6 text-rose-600">
            <AlertTriangle size={20} />
            طلاب يحتاجون دعم (أقل من 50%)
          </h3>
          <div className="space-y-3">
             {strugglingStudents.length > 0 ? strugglingStudents.map(p => (
               <div key={p.student.id} className="flex items-center justify-between p-4 bg-rose-50 border border-rose-100 rounded-2xl">
                 <span className="font-bold text-rose-900">{p.student.name}</span>
                 <span className="font-black text-rose-600">{Math.round(p.avg)}%</span>
               </div>
             )) : (
               <div className="text-center py-6 text-slate-400 font-bold text-sm">لا يوجد طلاب في هذه الفئة</div>
             )}
          </div>
        </div>

        {/* Quiz Performance */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6">
          <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-6 text-emerald-600">
            <BookOpen size={20} />
            أداء الاختبارات
          </h3>
          <div className="space-y-4">
            {classQuizzes.map(quiz => {
              const results = data.quizResults.filter(r => r.quizId === quiz.id && classStudents.some(s => s.id === r.studentId));
              const avg = results.length > 0 ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length) : 0;
              return (
                <div key={quiz.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                  <span className="font-bold text-slate-700 text-sm truncate max-w-[200px]">{quiz.title}</span>
                  <span className={`font-black ${avg >= 70 ? 'text-emerald-600' : 'text-indigo-600'}`}>{avg}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

     {/* All Students List */}
     <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6">
       <h3 className="text-lg font-black text-slate-800 mb-6">سجل درجات الطلاب</h3>
       <div className="overflow-x-auto">
         <table className="w-full text-right text-sm">
           <thead className="text-slate-400">
             <tr>
               <th className="p-3">الطالب</th>
               {classQuizzes.map(q => <th key={q.id} className="p-3 font-bold truncate max-w-[100px]">{q.title}</th>)}
               <th className="p-3">المتوسط</th>
             </tr>
           </thead>
           <tbody>
             {studentPerformance.map(p => (
               <tr key={p.student.id} className="border-t border-slate-50">
                 <td className="p-3 font-bold text-slate-700">{p.student.name}</td>
                 {classQuizzes.map(q => {
                   const res = p.results.find(r => r.quizId === q.id);
                   return (
                     <td key={q.id} className="p-3 font-bold text-slate-600">
                       {res ? `${res.score}%` : '-'}
                     </td>
                   )
                 })}
                 <td className="p-3 font-black text-indigo-600">{Math.round(p.avg)}%</td>
               </tr>
             ))}
           </tbody>
         </table>
       </div>
     </div>
    </motion.div>
  );
};
