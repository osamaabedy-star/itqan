import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Timestamp } from 'firebase/firestore';
import { AppData, Evaluations, EvaluationScore, Student } from '../../types';
import { CheckCircle2, AlertCircle, XCircle, Trash2, Info, Search, Filter, Save, Users } from 'lucide-react';
import { firestoreService } from '../../services/firestoreService';

interface MonitoringMatrixProps {
  data: AppData;
  evaluations: Evaluations;
  setEvaluations: React.Dispatch<React.SetStateAction<Evaluations>>;
  onClose: () => void;
  onSelectStudent?: (st: Student) => void;
  academicYear: string;
  activeTerm: 'term1' | 'term2';
  initialClassId?: string;
  initialSubjectId?: string;
}

export function MonitoringMatrix({ data, evaluations, setEvaluations, onClose, onSelectStudent, academicYear, activeTerm, initialClassId = '', initialSubjectId = '' }: MonitoringMatrixProps) {
  const [selectedClassId, setSelectedClassId] = useState(initialClassId);
  const [selectedSubjectId, setSelectedSubjectId] = useState(initialSubjectId);
  const [searchTerm, setSearchTerm] = useState('');
  const [evalContext, setEvalContext] = useState<{ student: Student, skill: import('../../types').Skill, currentScore: EvaluationScore | undefined } | null>(null);

  const subjects = data.subjects.filter(s => (s.classId === selectedClassId || s.classIds?.includes(selectedClassId)) && !s.isArchived);
  const students = data.students.filter(s => s.classId === selectedClassId && !s.isArchived)
    .filter(st => st.name.includes(searchTerm));
  
  const selectedSubject = data.subjects.find(s => s.id === selectedSubjectId);
  const skills = data.skills.filter(sk => {
    if (!selectedSubject) return false;
    return (sk.subjectId === selectedSubjectId) || 
           (sk.gradeId === selectedSubject.gradeId && sk.subjectName === selectedSubject.name);
  }).filter(sk => !sk.isArchived);

  const handleQuickEval = async (studentId: string, skillId: string, currentScore: EvaluationScore | undefined) => {
    const targetSkill = skills.find(s => s.id === skillId);
    if (targetSkill && targetSkill.questions && targetSkill.questions.length > 0) {
      const targetStudent = students.find(s => s.id === studentId);
      if (targetStudent) {
        setEvalContext({ student: targetStudent, skill: targetSkill, currentScore });
        return;
      }
    }

    await performEvalSave(studentId, skillId, currentScore);
  };

  const performEvalSave = async (studentId: string, skillId: string, currentScore: EvaluationScore | undefined, forcedScore?: EvaluationScore, questionScores?: Record<number, number>) => {
    // Optimistic Update
    const evalId = `${studentId}-${skillId}-${academicYear}`;
    
    let nextScore: EvaluationScore | undefined = forcedScore;
    
    if (!forcedScore) {
      // Rotation logic: undefined -> mastered -> advanced -> accepted -> weak -> very-weak -> undefined
      if (!currentScore) nextScore = 'mastered';
      else if (currentScore === 'mastered') nextScore = 'advanced';
      else if (currentScore === 'advanced') nextScore = 'accepted';
      else if (currentScore === 'accepted') nextScore = 'weak';
      else if (currentScore === 'weak') nextScore = 'very-weak';
      else nextScore = undefined;
    }

    if (!nextScore) {
      const { [evalId]: _, ...rest } = evaluations;
      setEvaluations(rest);
      try {
        await firestoreService.deleteEvaluation(studentId, skillId, academicYear);
      } catch (err) {
        console.error('Error deleting evaluation:', err);
      }
      return;
    }

    setEvaluations(prev => ({
      ...prev,
      [evalId]: { score: nextScore as EvaluationScore, note: 'رصد سريع من الشبكة', academicYear, questionScores, updatedAt: Timestamp.now() }
    }));

    try {
      await firestoreService.saveEvaluation(studentId, skillId, nextScore as EvaluationScore, 'رصد سريع من الشبكة', academicYear, questionScores);
    } catch (err) {
      console.error('Error saving evaluation:', err);
    }
  };

  const calculatePerformance = (studentId: string) => {
    if (skills.length === 0) return 0;
    
    let totalScore = 0;
    let evaluatedCount = 0;
    
    skills.forEach(skill => {
      const score = evaluations[`${studentId}-${skill.id}-${academicYear}`]?.score;
      if (score) {
        evaluatedCount++;
        if (score === 'mastered') totalScore += 100;
        else if (score === 'advanced') totalScore += 75;
        else if (score === 'accepted') totalScore += 50;
        else if (score === 'weak') totalScore += 25;
        else if (score === 'very-weak') totalScore += 0;
      }
    });

    // We calculate based on ALL skills in the subject to show progress towards completion
    return Math.round(totalScore / skills.length);
  };

  const handleBulkSkillEval = async (skillId: string) => {
    // Mark all currently visible students as mastered for this skill
    const updates: Record<string, any> = {};
    const newEvaluations = { ...evaluations };
    
    for (const student of students) {
      const evalId = `${student.id}-${skillId}-${academicYear}`;
      newEvaluations[evalId] = { 
        score: 'mastered', 
        note: 'رصد جماعي', 
        academicYear, 
        updatedAt: Timestamp.now() 
      };
      updates[student.id] = 'mastered';
    }
    
    setEvaluations(newEvaluations);
    
    try {
      // We process these sequentially or in batches if the SDK supports it. 
      // For now, we'll fire them all and hope for the best, or ideally we'd have a batch API
      await Promise.all(students.map(s => 
        firestoreService.saveEvaluation(s.id, skillId, 'mastered', 'رصد جماعي', academicYear)
      ));
    } catch (err) {
      console.error('Error in bulk skill eval:', err);
    }
  };

  const getScoreCircle = (score: EvaluationScore | undefined) => {
    const baseClasses = "w-9 h-9 rounded-full transition-all duration-300 flex items-center justify-center shadow-md border-2";
    if (!score) return <div className={`${baseClasses} border-slate-200 bg-white/50 hover:bg-white hover:border-slate-300 scale-90`} />;
    
    const scoreMap = {
      'mastered': { bg: 'bg-green-500', border: 'border-green-400', icon: <CheckCircle2 className="text-white" size={18} /> },
      'advanced': { bg: 'bg-blue-500', border: 'border-blue-400', icon: <CheckCircle2 className="text-white" size={18} /> },
      'accepted': { bg: 'bg-amber-500', border: 'border-amber-400', icon: <AlertCircle className="text-white" size={18} /> },
      'weak': { bg: 'bg-orange-500', border: 'border-orange-400', icon: <AlertCircle className="text-white" size={18} /> },
      'very-weak': { bg: 'bg-red-500', border: 'border-red-400', icon: <XCircle className="text-white" size={18} /> }
    };
    
    const config = scoreMap[score];
    return <div className={`${baseClasses} ${config?.bg} ${config?.border} scale-100`}>{config?.icon}</div>;
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-100 overflow-hidden" dir="rtl">
      {/* Header Filters */}
      <div className="bg-white border-b border-slate-200 p-2 md:p-3 flex flex-col md:flex-row gap-3 items-center sticky top-0 z-50 shadow-sm shrink-0">
        <div className="flex items-center gap-3 flex-1 w-full">
          <div className="flex flex-col gap-0.5 flex-1">
             <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-2 leading-none">الفصل</label>
             <select 
               value={selectedClassId}
               onChange={(e) => { setSelectedClassId(e.target.value); setSelectedSubjectId(''); }}
               className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg px-3 font-black text-[11px] outline-none focus:ring-2 focus:ring-indigo-100 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:1rem_1rem] bg-[right_0.5rem_center] bg-no-repeat"
             >
                <option value="">اختر الفصل...</option>
                {data.classes.filter(c => !c.isArchived).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
             </select>
          </div>

          <div className="flex flex-col gap-0.5 flex-1">
             <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-2 leading-none">المادة</label>
             <select 
               value={selectedSubjectId}
               onChange={(e) => setSelectedSubjectId(e.target.value)}
               disabled={!selectedClassId}
               className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg px-3 font-black text-[11px] outline-none focus:ring-2 focus:ring-indigo-100 disabled:opacity-50 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:1rem_1rem] bg-[right_0.5rem_center] bg-no-repeat"
             >
                <option value="">اختر المادة...</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
             </select>
          </div>

          <div className="flex flex-col justify-end w-32 md:w-40">
             <div className="relative">
                <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300" size={10} />
                <input 
                  type="text"
                  placeholder="بحث..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-7 bg-slate-50 border border-slate-200 rounded-lg pr-7 pl-2 font-black text-[10px] outline-none focus:ring-2 focus:ring-indigo-100 placeholder-slate-400"
                />
             </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto self-end md:self-center">
           <button 
             onClick={onClose}
             className="h-8 px-5 bg-red-500 text-white rounded-lg font-black text-[11px] shadow-lg shadow-red-100 hover:bg-red-600 transition-all hover:scale-105 active:scale-95"
           >خروج</button>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="flex-1 overflow-auto p-1 md:p-2 pb-20">
        {selectedClassId && selectedSubjectId ? (
          <div className="bg-white border border-slate-200 shadow-xl overflow-hidden min-w-max">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#0f172a] border-b border-white/10 h-16 sticky top-0 z-40">
                  <th className="p-4 text-right text-white font-black w-60 sticky right-0 bg-[#0f172a] z-50 border-l border-white/10 shadow-[2px_0_5px_rgba(0,0,0,0.2)]">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center">
                          <Users size={18} className="text-indigo-400" />
                       </div>
                       <div>
                          <p className="text-sm font-black tracking-tight leading-none">قائمة الطلاب</p>
                          <p className="text-[9px] text-indigo-300 font-bold opacity-70 uppercase tracking-widest mt-1">{students.length} طالب</p>
                       </div>
                    </div>
                  </th>
                  {skills.map(skill => (
                    <th key={skill.id} className="p-4 text-center text-white/95 font-black text-[12px] border-l border-white/5 min-w-[130px] max-w-[180px] whitespace-normal leading-tight bg-[#0f172a]">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-[9px] text-indigo-400 font-black uppercase tracking-[0.1em] opacity-80">مهارة</span>
                        <span className="line-clamp-2">{skill.name}</span>
                        <button 
                          onClick={() => handleBulkSkillEval(skill.id)}
                          className="px-3 py-1 bg-white/10 hover:bg-green-600 text-white rounded-lg text-[9px] font-black transition-all"
                        >رصد الكل</button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((student, sIdx) => {
                  const studentPerformance = calculatePerformance(student.id);
                  
                  return (
                    <tr key={student.id} className={`${sIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'} hover:bg-indigo-50/30 transition-colors group h-12`}>
                      <td 
                        onClick={() => onSelectStudent?.(student)}
                        className="p-3 pr-8 text-right font-black text-slate-800 border-b border-slate-100 sticky right-0 bg-white/95 backdrop-blur-md shadow-[4px_0_15px_-5px_rgba(0,0,0,0.05)] z-20 cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-4">
                           <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-[14px] bg-slate-100 text-slate-400 flex items-center justify-center text-[10px] font-black group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner`}>
                                {sIdx + 1}
                              </div>
                              <div className="flex flex-col">
                                <span className="truncate max-w-[160px] group-hover:text-indigo-600 transition-colors font-black text-sm">{student.name}</span>
                                <div className="flex items-center gap-2 mt-1">
                                   <div className="h-1 w-20 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                      <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${studentPerformance}%` }}
                                        className={`h-full ${studentPerformance > 80 ? 'bg-green-500' : studentPerformance > 50 ? 'bg-blue-500' : 'bg-amber-500'}`} 
                                      />
                                   </div>
                                   <span className="text-[8px] font-black text-slate-400">{studentPerformance}%</span>
                                </div>
                              </div>
                           </div>
                           <button 
                             onClick={(e) => {
                               e.stopPropagation();
                               skills.forEach(sk => handleQuickEval(student.id, sk.id, 'mastered'));
                             }}
                             className="opacity-0 group-hover:opacity-100 px-3 py-1 bg-green-500 text-white rounded-xl text-[9px] font-black transition-all shadow-md active:scale-95"
                           >رصد متقن</button>
                        </div>
                      </td>
                      {skills.map(skill => {
                        const evalData = evaluations[`${student.id}-${skill.id}-${academicYear}`];
                        return (
                          <td 
                            key={skill.id} 
                            className="p-2 border-b border-l border-slate-50 text-center"
                          >
                            <button 
                              onClick={() => handleQuickEval(student.id, skill.id, evalData?.score)}
                              className="transition-all active:scale-75 relative hover:scale-110"
                              title="انقر للتبديل"
                            >
                              {getScoreCircle(evalData?.score)}
                              {evalData?.score && (
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-black py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-2xl z-40 border border-white/10">
                                  {evalData?.score === 'mastered' ? 'متقن' : evalData?.score === 'advanced' ? 'متقدم' : evalData?.score === 'accepted' ? 'مقبول' : evalData?.score === 'weak' ? 'ضعيف' : evalData?.score === 'very-weak' ? 'ضعيف جداً' : ''}
                                </div>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-8 py-20">
             <div className="w-48 h-48 bg-white rounded-[64px] shadow-2xl shadow-indigo-100 flex items-center justify-center text-indigo-400 relative overflow-hidden group">
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-indigo-50/50" />
                <Filter size={80} className="relative group-hover:scale-110 transition-transform duration-500" />
             </div>
             <div>
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">ابدأ الرصد السريع الآن</h3>
                <p className="text-slate-500 font-bold max-w-sm mt-3 leading-relaxed">اختر الفصل والمادة التعليمية لتفتح لك شبكة الرصد الذكية لجميع الطلاب.</p>
             </div>
          </div>
        )}
      </div>

      {/* Legend Footer */}
      <div className="bg-white/80 backdrop-blur-lg border-t border-slate-200 p-6 flex flex-wrap justify-center gap-x-12 gap-y-4 sticky bottom-0 z-50">
         <LegendItem icon={<div className="w-5 h-5 rounded-full bg-green-500 border-2 border-green-400 shadow-sm" />} label="متقن" />
         <LegendItem icon={<div className="w-5 h-5 rounded-full bg-blue-500 border-2 border-blue-400 shadow-sm" />} label="متقدم" />
         <LegendItem icon={<div className="w-5 h-5 rounded-full bg-amber-500 border-2 border-amber-400 shadow-sm" />} label="مقبول" />
         <LegendItem icon={<div className="w-5 h-5 rounded-full bg-orange-500 border-2 border-orange-400 shadow-sm" />} label="ضعيف" />
         <LegendItem icon={<div className="w-5 h-5 rounded-full bg-red-500 border-2 border-red-400 shadow-sm" />} label="ضعيف جداً" />
         <LegendItem icon={<div className="w-5 h-5 rounded-full border-2 border-slate-200 bg-white" />} label="لم يتم الرصد" />
      </div>

      {evalContext && (
        <QuestionEvalModal 
          evalContext={evalContext}
          evaluations={evaluations}
          academicYear={academicYear}
          onClose={() => setEvalContext(null)}
          onSave={(scores, calculatedScore) => {
            performEvalSave(evalContext.student.id, evalContext.skill.id, evalContext.currentScore, calculatedScore, scores);
            setEvalContext(null);
          }}
        />
      )}
    </div>
  );
}

function QuestionEvalModal({ evalContext, evaluations, academicYear, onClose, onSave }: any) {
  const { student, skill } = evalContext;
  
  // Initialize scores from previous evaluation if it exists
  const existingEvalId = `${student.id}-${skill.id}-${academicYear}`;
  const existingEval = evaluations[existingEvalId];
  
  const [qScores, setQScores] = useState<Record<number, number>>(existingEval?.questionScores || {});

  const maxPossibleScore = skill.questions.length * 10;
  const currentTotal = Object.values(qScores).reduce((a: any, b: any) => Number(a) + Number(b), 0) as number;
  const percentage = maxPossibleScore > 0 ? (currentTotal / maxPossibleScore) * 100 : 0;

  const handleScoreChange = (qIndex: number, val: number) => {
    setQScores(prev => ({ ...prev, [qIndex]: val }));
  };

  const calculateFinalScore = (): EvaluationScore => {
    if (percentage >= 90) return 'mastered';
    if (percentage >= 75) return 'advanced';
    if (percentage >= 50) return 'accepted';
    if (percentage >= 25) return 'weak';
    return 'very-weak';
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex justify-center items-center p-4">
       <motion.div 
         initial={{ opacity: 0, scale: 0.95, y: 20 }}
         animate={{ opacity: 1, scale: 1, y: 0 }}
         className="bg-white max-w-2xl w-full rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
       >
         <div className="bg-indigo-600 p-6 text-white flex justify-between items-center shrink-0">
           <div>
              <h3 className="font-black text-xl mb-1 shrink-0">تقييم مهارة مفصل</h3>
              <p className="text-indigo-200 font-bold text-xs">{student.name} - {skill.name}</p>
           </div>
           <button onClick={onClose} className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors">
              <XCircle size={20} />
           </button>
         </div>
         
         <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50">
            {skill.questions.map((qText: string, i: number) => {
               const val = qScores[i] || 0;
               return (
                 <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                    <div className="flex gap-3 text-slate-800 font-bold flex-1">
                       <span className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs shrink-0">{i + 1}</span>
                       <p className="text-sm leading-relaxed">{qText}</p>
                    </div>
                    {/* Score Selection */}
                    <div className="flex gap-1 shrink-0 bg-slate-50 p-1 rounded-lg border border-slate-200 self-end lg:self-auto">
                       {[0, 2, 4, 6, 8, 10].map(s => (
                         <button 
                           key={s} 
                           onClick={() => handleScoreChange(i, s)}
                           className={`w-8 h-8 rounded-md font-black text-xs transition-all ${val === s ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-200'}`}
                         >
                           {s}
                         </button>
                       ))}
                    </div>
                 </div>
               );
            })}
         </div>

         <div className="p-6 bg-white border-t border-slate-100 shrink-0 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full border-4 border-indigo-100 flex items-center justify-center">
                 <span className="font-black text-lg text-indigo-600">{Math.round(percentage)}%</span>
              </div>
              <div>
                 <p className="font-bold text-slate-400 text-xs">النتيجة المتوقعة</p>
                 <p className="font-black text-lg text-slate-800">
                    {percentage >= 90 ? 'متقن' : percentage >= 75 ? 'متقدم' : percentage >= 50 ? 'مقبول' : percentage >= 25 ? 'ضعيف' : 'ضعيف جداً'}
                 </p>
              </div>
            </div>

            <button 
              onClick={() => onSave(qScores, calculateFinalScore())}
              className="px-8 h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl transition-all shadow-lg active:scale-95"
            >
               اعتماد التقييم المفصل
            </button>
         </div>
       </motion.div>
    </div>
  );
}

function LegendItem({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <div className="flex items-center gap-2">
       {icon}
       <span className="text-xs font-black text-slate-500">{label}</span>
    </div>
  );
}
