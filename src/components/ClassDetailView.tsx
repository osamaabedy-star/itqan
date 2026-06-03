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
  const currentClass = data.classes.find(c => c.id === classId);
  const classStudents = useMemo(() => 
    data.students.filter(s => s.classId === classId && !s.isArchived),
    [data.students, classId]
  );
  
  const teacherSubjectsForClass = useMemo(() => 
    data.subjects.filter(s => 
      !s.isArchived && 
      (s.teacherId === teacherId || s.teacherIds?.includes(teacherId)) &&
      (s.gradeId === currentClass?.gradeId) &&
      (!s.classIds || s.classIds.includes(classId) || s.classId === classId)
    ),
    [data.subjects, teacherId, classId, currentClass]
  );
  const teacherSubjectIds = teacherSubjectsForClass.map(s => s.id);
  const teacherSubjectNames = teacherSubjectsForClass.map(s => s.name);

  const classQuizzes = useMemo(() => 
    data.quizzes.filter(q => 
      !q.isArchived && 
      (q.classIds?.includes(classId) || q.gradeId === currentClass?.gradeId) &&
      (
        q.teacherId === teacherId || 
        q.teacherIds?.includes(teacherId) ||
        (q.subjectIds && q.subjectIds.some(sid => teacherSubjectIds.includes(sid))) ||
        (q as any).subjectId && teacherSubjectIds.includes((q as any).subjectId) ||
        (q.subjectName && teacherSubjectNames.some(name => name.trim() === q.subjectName?.trim()))
      )
    ),
    [data.quizzes, classId, teacherId, teacherSubjectIds, teacherSubjectNames, currentClass]
  );

  const studentPerformance = useMemo(() => {
    return classStudents.map(student => {
      const results = data.quizResults.filter(r => r.studentId === student.id && !r.isArchived && classQuizzes.some(q => q.id === r.quizId));
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

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4">
        <h2 className="text-xl font-black text-slate-800 mb-1">فصل {currentClass?.name}</h2>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">تحليل الأداء للفصل</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Struggling Students */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4">
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 mb-4 text-rose-600">
            <AlertTriangle size={16} />
            طلاب بحاجة لدعم
          </h3>
          <div className="space-y-2">
             {strugglingStudents.length > 0 ? strugglingStudents.map(p => (
               <div key={p.student.id} className="flex items-center justify-between p-2 bg-rose-50 border border-rose-100 rounded-xl">
                 <span className="font-bold text-rose-900 text-[11px]">{p.student.name}</span>
                 <span className="font-black text-rose-600 text-[11px]">{Math.round(p.avg)}%</span>
               </div>
             )) : (
               <div className="text-center py-4 text-slate-400 font-bold text-xs">لا يوجد طلاب في هذه الفئة</div>
             )}
          </div>
        </div>

        {/* Quiz Performance */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4">
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 mb-4 text-emerald-600">
            <BookOpen size={16} />
            أداء الاختبارات
          </h3>
          <div className="space-y-2">
            {classQuizzes.map(quiz => {
              const results = data.quizResults.filter(r => r.quizId === quiz.id && !r.isArchived && classStudents.some(s => s.id === r.studentId));
              const avg = results.length > 0 ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length) : 0;
              return (
                <div key={quiz.id} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-100 rounded-xl">
                  <span className="font-bold text-slate-700 text-[11px] truncate max-w-[150px]">{quiz.title}</span>
                  <span className={`font-black text-[11px] ${avg >= 70 ? 'text-emerald-600' : 'text-indigo-600'}`}>{avg}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

     {/* All Students List */}
     <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4">
       <h3 className="text-sm font-black text-slate-800 mb-4">سجل الدرجات</h3>
       <div className="overflow-x-auto">
         <table className="w-full text-right text-[11px]">
           <thead className="text-slate-400">
             <tr>
               <th className="p-2">الطالب</th>
               {classQuizzes.map(q => <th key={q.id} className="p-2 font-bold truncate max-w-[80px]">{q.title}</th>)}
               <th className="p-2">المتوسط</th>
             </tr>
           </thead>
           <tbody>
             {studentPerformance.map(p => (
               <tr key={p.student.id} className="border-t border-slate-50">
                 <td className="p-2 font-bold text-slate-700">{p.student.name}</td>
                 {classQuizzes.map(q => {
                   const res = p.results.find(r => r.quizId === q.id);
                   return (
                     <td key={q.id} className="p-2 font-bold text-slate-600">
                       {res ? `${res.score}%` : '-'}
                     </td>
                   )
                 })}
                 <td className="p-2 font-black text-indigo-600 bg-indigo-50/30 rounded-lg">{Math.round(p.avg)}%</td>
               </tr>
             ))}
           </tbody>
         </table>
       </div>
     </div>
    </motion.div>
  );
};
