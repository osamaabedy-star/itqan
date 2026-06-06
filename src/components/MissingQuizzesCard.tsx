import React, { useMemo, useState } from 'react';
import { AppData, Student, Quiz, QuizResult } from '../types';
import { BrainCircuit, ChevronDown, ChevronUp, User, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { isQuizSolved } from '../utils/quizUtils';

export const MissingQuizzesCard = ({
  data,
  academicYear,
  filterTeacherId,
  filterGradeId,
  filterSubjectName,
  filterTerm,
  onStudentQuizClick
}: {
  data: AppData;
  academicYear: string;
  filterTeacherId?: string;
  filterGradeId?: string;
  filterSubjectName?: string;
  filterTerm?: 'term1' | 'term2' | 'full';
  onStudentQuizClick?: (student: Student, quiz: Quiz) => void;
}) => {
  const [expandedClass, setExpandedClass] = useState<string | null>(null);

  const missingQuizzesData = useMemo(() => {
    // 1. Get relevant quizzes
    const activeQuizzes = data.quizzes.filter(q => {
      if (q.isArchived || q.status !== 'published') return false;
      
      // Filter by Grade
      if (filterGradeId && q.gradeId !== filterGradeId) return false;

      // Filter by Subject Name
      if (filterSubjectName) {
         const subject = data.subjects.find(s => q.subjectIds?.includes(s.id));
         if (!subject || subject.name !== filterSubjectName) return false;
      }

      // Filter by Term
      if (filterTerm && filterTerm !== 'full' && q.term && q.term !== filterTerm) return false;

      if (filterTeacherId) {
        const subject = data.subjects.find(s => q.subjectIds?.includes(s.id));
        if (subject && subject.teacherId !== filterTeacherId && !subject.teacherIds?.includes(filterTeacherId)) return false;
      }
      return true;
    });

    if (activeQuizzes.length === 0) return [];

    const classMissingList: {
      classId: string;
      className: string;
      gradeName: string;
      missingCount: number;
      students: { student: Student; missingQuizzes: Quiz[] }[];
    }[] = [];

    data.classes.forEach(cls => {
      if (cls.isArchived) return;
      if (filterGradeId && cls.gradeId !== filterGradeId) return;
      
      const grade = data.grades.find(g => g.id === cls.gradeId);
      const clsStudents = data.students.filter(st => !st.isArchived && st.classId === cls.id);
      
      if (clsStudents.length === 0) return;

      const missingForClass: { student: Student; missingQuizzes: Quiz[] }[] = [];
      let classMissingCount = 0;

      clsStudents.forEach(st => {
        const studentMissingQuizzes = activeQuizzes.filter(q => {
          // Check if quiz is for this student's grade/class
          let isForStudent = false;
          if (q.classIds && q.classIds.length > 0) isForStudent = q.classIds.includes(st.classId);
          else if (q.gradeId) isForStudent = q.gradeId === cls.gradeId;
          else if (q.stageId) isForStudent = q.stageId === grade?.stage;

          if (!isForStudent) return false;

          // Check if solved
          return !isQuizSolved(st, q, data.quizResults);
        });

        if (studentMissingQuizzes.length > 0) {
          missingForClass.push({ student: st, missingQuizzes: studentMissingQuizzes });
          classMissingCount += studentMissingQuizzes.length;
        }
      });

      if (missingForClass.length > 0) {
        classMissingList.push({
          classId: cls.id,
          className: cls.name,
          gradeName: grade?.name || '',
          missingCount: classMissingCount,
          students: missingForClass
        });
      }
    });

    return classMissingList.sort((a, b) => b.missingCount - a.missingCount);
  }, [data, filterTeacherId]);

  if (missingQuizzesData.length === 0) {
    return (
      <div className="bg-indigo-50 rounded-[2.5rem] p-6 border border-indigo-100 shadow-sm flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600">
          <CheckCircle2 size={24} />
        </div>
        <div>
          <h3 className="text-lg font-black text-indigo-800">الاختبارات مكتملة</h3>
          <p className="text-xs font-bold text-indigo-600 mt-1">جميع الطلاب أنجزوا الاختبارات النشطة الموكلة إليهم.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2.5rem] p-6 border border-indigo-100 shadow-sm flex flex-col gap-4">
      <div className="flex items-center gap-3 border-b border-indigo-50 pb-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500 shadow-sm">
          <BrainCircuit size={24} />
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-800">اختبارات لم تُنجز بعد</h3>
          <p className="text-[10px] font-bold text-slate-400">طلاب لم يكملوا اختباراتهم الذكية النشطة</p>
        </div>
        <div className="mr-auto px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-black rounded-lg">
          {missingQuizzesData.length} فصل
        </div>
      </div>

      <div className="space-y-3">
        {missingQuizzesData.map(clsData => (
          <div key={clsData.classId} className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50">
            <button 
              onClick={() => setExpandedClass(expandedClass === clsData.classId ? null : clsData.classId)}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors cursor-pointer outline-none"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-500 shadow-sm shrink-0 uppercase">
                  <span className="font-black text-sm">{clsData.className.substring(0, 2)}</span>
                </div>
                <div className="text-right">
                  <p className="font-black text-slate-800 text-sm">فصل {clsData.className}</p>
                  <p className="text-[10px] font-bold text-slate-500">{clsData.gradeName}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <span className="block text-[10px] font-bold text-slate-400">اختبارات متبقية</span>
                  <span className="text-sm font-black text-indigo-500">{clsData.students.length} طالب</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-400 border border-slate-100 shrink-0">
                  {expandedClass === clsData.classId ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>
            </button>
            <AnimatePresence>
              {expandedClass === clsData.classId && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 border-t border-slate-100 bg-white">
                    <ul className="space-y-3 max-h-64 overflow-y-auto pr-2 scrollbar-hide text-right">
                      {clsData.students.map(stInfo => (
                        <div key={stInfo.student.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <div className="flex items-center gap-2 mb-2">
                             <User size={14} className="text-slate-400" />
                             <p className="font-bold text-xs text-slate-800">{stInfo.student.name}</p>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {stInfo.missingQuizzes.map(quiz => (
                              <button
                                key={quiz.id}
                                onClick={() => onStudentQuizClick && onStudentQuizClick(stInfo.student, quiz)}
                                className="bg-white border border-indigo-100 hover:border-indigo-300 hover:bg-indigo-50 px-2 py-1 rounded text-[9px] font-black text-indigo-600 transition-colors cursor-pointer"
                              >
                                {quiz.title}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
};
