import React, { useMemo } from 'react';
import { Quiz, AppData, Student } from '../types';
import { ArrowRight, BrainCircuit, CheckCircle2, Users, Eye, XCircle, LayoutGrid, Printer, Calendar, User } from 'lucide-react';
import { motion } from 'framer-motion';

interface QuizReportProps {
  quiz: Quiz;
  data: AppData;
  onClose: () => void;
  onPreviewQuiz: () => void;
  filterTeacherId?: string;
}

export function QuizReport({ quiz, data, onClose, onPreviewQuiz, filterTeacherId }: QuizReportProps) {
  const subject = data.subjects.find(s => s.id === quiz.subjectIds?.[0] || s.name === quiz.subjectName);
  const quizGrade = data.grades.find(g => g.id === quiz.gradeId);
  const teacher = data.teachers.find(t => t.id === quiz.teacherId) || data.teachers.find(t => t.id === subject?.teacherId);
  
  // Find valid classes for this quiz
  const validClasses = useMemo(() => {
    return data.classes.filter(c => {
      if (c.isArchived) return false;
      if (quiz.classIds && quiz.classIds.length > 0) {
         return quiz.classIds.includes(c.id);
      }
      return c.gradeId === quiz.gradeId;
    });
  }, [data.classes, quiz]);

  const targetStudents = useMemo(() => {
    const classIds = validClasses.map(c => c.id);
    return data.students.filter(s => classIds.includes(s.classId) && !s.isArchived);
  }, [data.students, validClasses]);

  const results = useMemo(() => {
    const allResults = data.quizResults?.filter(r => r.quizId === quiz.id) || [];
    const latestMap = new Map();
    allResults.forEach(r => {
      const existing = latestMap.get(r.studentId);
      if (!existing || new Date(r.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
        latestMap.set(r.studentId, r);
      }
    });
    return Array.from(latestMap.values());
  }, [data.quizResults, quiz.id]);

  const quizDate = useMemo(() => {
    if (results.length > 0) {
      const firstResult = results[0];
      if (firstResult.updatedAt) {
         if (firstResult.updatedAt.toDate) {
            return firstResult.updatedAt.toDate().toLocaleDateString('ar-SA');
         } else if (firstResult.updatedAt.seconds) {
            return new Date(firstResult.updatedAt.seconds * 1000).toLocaleDateString('ar-SA');
         }
      }
    }
    return new Date().toLocaleDateString('ar-SA');
  }, [results]);

  const testedStudents = targetStudents.filter(s => results.some(r => r.studentId === s.id));
  const untestedStudents = targetStudents.filter(s => !results.some(r => r.studentId === s.id));

  const overallAverage = useMemo(() => {
    if (results.length === 0) return 0;
    const total = results.reduce((acc, r) => acc + r.score, 0);
    return Math.round(total / results.length);
  }, [results]);

  const classPerformances = useMemo(() => {
    return validClasses.map(c => {
      const classStudentsList = targetStudents.filter(s => s.classId === c.id);
      const classResults = results.filter(r => classStudentsList.some(s => s.id === r.studentId));
      let avg = 0;
      if (classResults.length > 0) {
         avg = Math.round(classResults.reduce((acc, r) => acc + r.score, 0) / classResults.length);
      }
      return {
        class: c,
        average: avg,
        testedCount: classResults.length,
        totalCount: classStudentsList.length
      };
    }).sort((a, b) => b.average - a.average);
  }, [validClasses, targetStudents, results]);

  const questionPerformances = useMemo(() => {
    return quiz.questions.map((q, index) => {
      let correctCount = 0;
      results.forEach(r => {
        if (r.answers && r.answers[index] === q.correctAnswerIndex) {
          correctCount++;
        }
      });
      const percent = results.length > 0 ? Math.round((correctCount / results.length) * 100) : 0;
      return {
        questionText: q.text,
        percent
      };
    });
  }, [quiz.questions, results]);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-8 scrollbar-hide print:p-0 print:bg-white print:overflow-visible">
      <div className="max-w-7xl mx-auto space-y-8 print:space-y-6 print:max-w-full">
        {/* Header */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 bg-white p-10 rounded-[48px] border border-slate-100 shadow-minimal relative overflow-hidden print:shadow-none print:border-b print:rounded-none print:p-4">
           <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-50 to-transparent rounded-full -translate-y-1/2 translate-x-1/4 opacity-50 pointer-events-none print:hidden" />
           <div className="space-y-4 relative z-10 w-full xl:w-auto">
              <div className="flex items-center gap-3">
                 <button 
                   onClick={onClose}
                   className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-indigo-600 hover:bg-indigo-50 transition-all group print:hidden"
                 >
                   <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
                 </button>
                 <div className="w-12 h-12 rounded-[20px] bg-indigo-600 text-white flex items-center justify-center shadow-2xl shadow-indigo-200">
                    <BrainCircuit size={24} />
                 </div>
                 <h1 className="text-3xl font-black text-slate-800">{quiz.title}</h1>
              </div>
              <div className="flex flex-wrap items-center gap-6 text-sm font-bold text-slate-500 mr-2 xl:mr-16">
                 <div className="flex items-center gap-2">
                    <User size={16} className="text-slate-400" />
                    <span>المعلم: {teacher ? teacher.name : 'غير محدد'}</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-slate-400" />
                    <span>تاريخ الاختبار: {quizDate}</span>
                 </div>
                 {(subject || quizGrade) && <div className="h-4 w-px bg-slate-300" />}
                 {subject && <span>{subject.name}</span>}
                 {quizGrade && <span>{quizGrade.name}</span>}
              </div>
           </div>
           <div className="flex items-center gap-4 relative z-10 print:hidden">
              <button 
                onClick={() => window.print()}
                className="px-6 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black flex items-center gap-2 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 transition-all shadow-sm"
              >
                 <Printer size={20} />
                 طباعة التقرير
              </button>
              <button 
                onClick={onPreviewQuiz}
                className="px-6 py-4 bg-indigo-50 text-indigo-600 rounded-2xl font-black flex items-center gap-2 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
              >
                 <Eye size={20} />
                 معاينة الأسئلة
              </button>
           </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 print:grid-cols-4 print:gap-4">
           <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between print:rounded-2xl print:p-4">
              <div>
                 <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">المتوسط العام</p>
                 <p className="text-3xl font-black text-slate-800">{overallAverage}%</p>
              </div>
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                 <LayoutGrid size={24} />
              </div>
           </div>
           
           <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between print:rounded-2xl print:p-4">
              <div>
                 <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">المستهدفون</p>
                 <p className="text-3xl font-black text-slate-800">{targetStudents.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                 <Users size={24} />
              </div>
           </div>

           <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between print:rounded-2xl print:p-4">
              <div>
                 <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">المختبرون</p>
                 <p className="text-3xl font-black text-emerald-600">{testedStudents.length}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                 <CheckCircle2 size={24} />
              </div>
           </div>

           <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center justify-between print:rounded-2xl print:p-4">
              <div>
                 <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">الغياب</p>
                 <p className="text-3xl font-black text-rose-600">{untestedStudents.length}</p>
              </div>
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
                 <XCircle size={24} />
              </div>
           </div>
        </div>

        {/* Detailed Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 print:block print:space-y-8">
           {/* Classes Performance & Question Analysis */}
           <div className="lg:col-span-1 space-y-8 print:w-full print:mb-8">
              <div className="space-y-6">
                 <h2 className="text-xl font-black text-slate-800">أداء الفصول</h2>
                 <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 space-y-4 print:border-none print:shadow-none print:p-0">
                    {classPerformances.map((cp, idx) => (
                       <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 print:bg-white print:border-slate-200">
                          <div className="flex justify-between items-center mb-2">
                             <p className="font-bold text-slate-800">{cp.class.name}</p>
                             <p className="font-black text-indigo-600">{cp.average}%</p>
                          </div>
                          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mb-3">
                             <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${cp.average}%` }} />
                          </div>
                          <div className="flex justify-between items-center text-xs text-slate-500 font-bold">
                             <span>اختبر: {cp.testedCount}</span>
                             <span>المجموع: {cp.totalCount}</span>
                          </div>
                       </div>
                    ))}
                    {classPerformances.length === 0 && (
                       <p className="text-center text-slate-400 font-bold py-4">لا توجد فصول مرتبطة</p>
                    )}
                 </div>
              </div>

              <div className="space-y-6">
                 <h2 className="text-xl font-black text-slate-800">تحليل الأسئلة (نقاط القوة والضعف)</h2>
                 <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 space-y-4 print:border-none print:shadow-none print:p-0">
                    {questionPerformances.map((qp, idx) => (
                       <div key={idx} className="space-y-2">
                          <div className="flex justify-between items-start gap-4">
                             <p className="text-sm font-bold text-slate-700 leading-relaxed flex-1">
                               <span className="text-indigo-600 ml-1">{idx + 1}.</span> 
                               {qp.questionText}
                             </p>
                             <span className={`px-2 py-1 rounded-lg text-xs font-black ${qp.percent >= 80 ? 'bg-emerald-50 text-emerald-600' : qp.percent >= 50 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                                {qp.percent}%
                             </span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                             <div 
                                className={`h-full rounded-full ${qp.percent >= 80 ? 'bg-emerald-500' : qp.percent >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                                style={{ width: `${qp.percent}%` }} 
                             />
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           </div>

           {/* Students List */}
           <div className="lg:col-span-2 space-y-6 print:w-full">
              <h2 className="text-xl font-black text-slate-800">بيانات الطلاب</h2>
              <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden print:border-none print:shadow-none print:rounded-none">
                 <table className="w-full text-right border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-100 print:bg-slate-100">
                       <tr>
                          <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase print:border print:border-slate-200">اسم الطالب</th>
                          <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase print:border print:border-slate-200">الفصل</th>
                          <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase text-center print:border print:border-slate-200">الحالة</th>
                          <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase text-center print:border print:border-slate-200">الدرجة</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {targetStudents.map(student => {
                          const result = results.find(r => r.studentId === student.id);
                          const cls = validClasses.find(c => c.id === student.classId);
                          
                          return (
                             <tr key={student.id} className="hover:bg-slate-50/50 transition-colors print:break-inside-avoid">
                                <td className="px-6 py-4 print:border print:border-slate-200">
                                   <p className="font-bold text-slate-800">{student.name}</p>
                                </td>
                                <td className="px-6 py-4 text-sm font-bold text-slate-500 print:border print:border-slate-200">
                                   {cls?.name || 'غير معروف'}
                                </td>
                                <td className="px-6 py-4 text-center print:border print:border-slate-200">
                                   {result ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-bold print:bg-transparent print:p-0">
                                         <CheckCircle2 size={12} className="print:hidden"/>
                                         مختبر
                                      </span>
                                   ) : (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 text-xs font-bold print:bg-transparent print:p-0">
                                         <XCircle size={12} className="print:hidden"/>
                                         غائب
                                      </span>
                                   )}
                                </td>
                                <td className="px-6 py-4 text-center print:border print:border-slate-200">
                                   {result ? (
                                      <span className="font-black text-lg text-slate-800">{result.score}%</span>
                                   ) : (
                                      <span className="text-slate-400 font-bold">-</span>
                                   )}
                                </td>
                             </tr>
                          );
                       })}
                       {targetStudents.length === 0 && (
                          <tr>
                             <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-bold print:border print:border-slate-200">
                                لا يوجد طلاب مستهدفين في هذا الاختبار
                             </td>
                          </tr>
                       )}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

