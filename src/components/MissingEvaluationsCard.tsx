import React, { useMemo, useState } from 'react';
import { AppData, Evaluations } from '../types';
import { AlertCircle, ChevronDown, ChevronUp, User, Users, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const MissingEvaluationsCard = ({
  data,
  evaluations,
  academicYear,
  filterTeacherId,
  onStudentClick
}: {
  data: AppData;
  evaluations: Evaluations;
  academicYear: string;
  filterTeacherId?: string;
  onStudentClick?: (studentId: string) => void;
}) => {
  const [expandedClass, setExpandedClass] = useState<string | null>(null);

  const missingData = useMemo(() => {
    // Determine which subjects to consider based on teacher filter
    const relevantSubjects = data.subjects.filter(s => {
      if (s.isArchived) return false;
      if (filterTeacherId && s.teacherId !== filterTeacherId && !s.teacherIds?.includes(filterTeacherId)) return false;
      return true;
    });

    const classMissingList: {
      classId: string;
      className: string;
      gradeName: string;
      missingCount: number;
      students: { studentId: string; studentName: string; missingSkills: { subjectName: string; skillName: string }[]; totalRequired: number; evaluatedCount: number }[];
    }[] = [];

    data.classes.forEach(cls => {
      if (cls.isArchived) return;
      
      const grade = data.grades.find(g => g.id === cls.gradeId);
      const clsSubjects = relevantSubjects.filter(sub => sub.gradeId === cls.gradeId && (!sub.classIds || sub.classIds.includes(cls.id) || sub.classId === cls.id));
      
      if (clsSubjects.length === 0) return;

      const clsStudents = data.students.filter(st => !st.isArchived && st.classId === cls.id);
      if (clsStudents.length === 0) return;

      const studentsMap = new Map<string, { studentId: string; studentName: string; missingSkills: { subjectName: string; skillName: string }[]; totalRequired: number; evaluatedCount: number }>();

      clsStudents.forEach(st => {
        studentsMap.set(st.id, { studentId: st.id, studentName: st.name, missingSkills: [], totalRequired: 0, evaluatedCount: 0 });
      });

      let classMissingCount = 0;

      clsSubjects.forEach(sub => {
        const subSkills = data.skills.filter(sk => !sk.isArchived && (sk.subjectId === sub.id || (sk.subjectName === sub.name && sk.gradeId === sub.gradeId)));
        
        subSkills.forEach(sk => {
          clsStudents.forEach(st => {
            const evKey = `${st.id}-${sk.id}-${academicYear}`;
            const stData = studentsMap.get(st.id)!;
            stData.totalRequired++;
            if (!evaluations[evKey]) {
              stData.missingSkills.push({ subjectName: sub.name, skillName: sk.name });
              classMissingCount++;
            } else {
              stData.evaluatedCount++;
            }
          });
        });
      });

      const missingStudents = Array.from(studentsMap.values()).filter(st => st.missingSkills.length > 0);

      if (missingStudents.length > 0) {
        classMissingList.push({
          classId: cls.id,
          className: cls.name,
          gradeName: grade?.name || '',
          missingCount: classMissingCount,
          students: missingStudents
        });
      }
    });

    return classMissingList.sort((a, b) => b.missingCount - a.missingCount);
  }, [data, evaluations, academicYear, filterTeacherId]);

  if (missingData.length === 0) {
    return (
      <div className="bg-emerald-50 rounded-[2.5rem] p-6 border border-emerald-100 shadow-sm flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
          <CheckCircle2 size={24} />
        </div>
        <div>
          <h3 className="text-lg font-black text-emerald-800">مكتملة بالكامل</h3>
          <p className="text-xs font-bold text-emerald-600 mt-1">تم رصد جميع المهارات لجميع الطلاب بنجاح.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2.5rem] p-6 border border-rose-100 shadow-sm flex flex-col gap-4">
      <div className="flex items-center gap-3 border-b border-rose-50 pb-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 shadow-sm">
          <AlertCircle size={24} />
        </div>
        <div>
          <h3 className="text-lg font-black text-slate-800">فصول غير مكتملة الرصد</h3>
          <p className="text-[10px] font-bold text-slate-400">تابع استكمال رصد المهارات المطلوبة</p>
        </div>
        <div className="mr-auto px-3 py-1 bg-rose-50 text-rose-600 text-xs font-black rounded-lg">
          {missingData.length} فصل
        </div>
      </div>

      <div className="space-y-3">
        {missingData.map(clsData => (
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
                  <span className="block text-[10px] font-bold text-slate-400">طالب ينقصه رصد</span>
                  <span className="text-sm font-black text-rose-500">{clsData.students.length}</span>
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
                      {clsData.students.sort((a, b) => a.evaluatedCount - b.evaluatedCount).map(st => (
                        <button 
                          key={st.studentId} 
                          onClick={() => onStudentClick && onStudentClick(st.studentId)}
                          className={`w-full text-right flex items-start gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 ${onStudentClick ? 'hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors cursor-pointer' : ''}`}
                        >
                          <User size={14} className={`mt-1 shrink-0 ${onStudentClick ? 'text-indigo-400' : 'text-slate-400'}`} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-xs text-slate-800">{st.studentName}</p>
                              {st.evaluatedCount === 0 && (
                                <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full text-[9px] font-black">
                                  لم يُقيّم أبداً
                                </span>
                              )}
                            </div>
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {st.evaluatedCount === 0 ? (
                                <span className="text-[10px] font-bold text-slate-500 block w-full mt-1">
                                  ينقص رصد جميع المهارات المطلوبة ({st.totalRequired})
                                </span>
                              ) : (
                                <>
                                  {st.missingSkills.slice(0, 3).map((sk, idx) => (
                                    <span key={idx} className="bg-white border border-slate-200 px-2 py-0.5 rounded text-[9px] font-black text-slate-500">
                                      {sk.subjectName.substring(0, 10)}: {sk.skillName}
                                    </span>
                                  ))}
                                  {st.missingSkills.length > 3 && (
                                    <span className="bg-rose-50 text-rose-600 px-2 py-0.5 rounded text-[9px] font-black">
                                      +{st.missingSkills.length - 3} أخرى
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </button>
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
