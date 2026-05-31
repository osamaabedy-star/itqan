import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Book, 
  BrainCircuit, 
  TrendingUp, 
  Award, 
  Clock, 
  X,
  PlayCircle,
  FileText,
  Trash2,
  PlusCircle,
  CheckCircle2,
  Zap,
  Target,
  AlertTriangle,
  XCircle,
  ChevronRight,
  BarChart3,
  ChevronLeft
} from 'lucide-react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
  LabelList
} from 'recharts';
import { AppData, Student, Quiz, Evaluation, Subject, Skill } from '../types';
import { firestoreService } from '../services/firestoreService';
import { QuickEvalDialog } from './quick-eval/QuickEvalDialog';

interface StudentProfileProps {
  student: Student;
  data: AppData;
  evaluations: Record<string, Evaluation>;
  onClose: () => void;
  onBack?: () => void;
  onStartQuiz: (quiz: Quiz) => void;
  academicYear: string;
  activeTerm: 'term1' | 'term2';
}

export function StudentProfile({ student, data, evaluations, onClose, onBack, onStartQuiz, academicYear, activeTerm }: StudentProfileProps) {
  const [activeTab, setActiveTab] = useState<'skills' | 'quizzes'>('skills');
  const [evaluatingSkill, setEvaluatingSkill] = useState<Skill | null>(null);
  const [selectedSkillDetails, setSelectedSkillDetails] = useState<Skill | null>(null);

  const activeQuizzes = data.quizzes.filter(q => !q.isArchived && (q.term || 'term1') === activeTerm);
  const activeQuizIds = new Set(activeQuizzes.map(q => q.id));
  
  const quizResults = data.quizResults?.filter(r => 
    r.studentId === student.id && 
    activeQuizIds.has(r.quizId)
  ) || [];

  const studentClasses = data.classes.filter(c => c.id === student.classId);
  const studentClass = studentClasses[0];
  
  // UNIQUE SUBJECTS grouping to prevent duplicates
  const subjectMap = new Map();
  data.subjects
    .filter(s => s.gradeId === studentClass?.gradeId && !s.isArchived)
    .forEach(s => {
      if (!subjectMap.has(s.name)) {
        subjectMap.set(s.name, s);
      }
    });
  const studentSubjects = Array.from(subjectMap.values());
  
  const calculateSubjectProgress = (subjectId: string) => {
    const subj = data.subjects.find(s => s.id === subjectId);
    if (!subj) return 0;
    const subjectSkills = data.skills.filter(sk => sk.subjectName === subj.name && sk.gradeId === subj.gradeId && !sk.isArchived);
    if (subjectSkills.length === 0) return 0;
    const mastered = subjectSkills.filter(sk => {
      const ev = evaluations[`${student.id}-${sk.id}-${academicYear}`];
      return ev && ev.score === 'mastered' && ev.classId === student.classId;
    }).length;
    return Math.round((mastered / subjectSkills.length) * 100);
  };

  const calculateSubjectQuizPerformance = (subjectName: string) => {
    // Find all subjects with this name across any grade (in case test was assigned broadly)
    const relatedSubjectIds = data.subjects
      .filter(s => s.name === subjectName)
      .map(s => s.id);

    if (relatedSubjectIds.length === 0) return 0;

    const subjectQuizzes = data.quizzes.filter(q => 
      (q.subjectIds?.some(id => relatedSubjectIds.includes(id)) || q.subjectName === subjectName) && 
      !q.isArchived
    );
    if (subjectQuizzes.length === 0) return 0;

    const rawStudentResults = quizResults.filter(r => 
      subjectQuizzes.some(q => q.id === r.quizId)
    );
    const latestStudentResultsMap = new Map();
    rawStudentResults.forEach(r => {
      const existing = latestStudentResultsMap.get(r.quizId);
      if (!existing || new Date(r.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
        latestStudentResultsMap.set(r.quizId, r);
      }
    });
    const studentResults = Array.from(latestStudentResultsMap.values());
    if (studentResults.length === 0) return 0;

    const totalScore = studentResults.reduce((sum, r) => sum + r.score, 0);
    return Math.round(totalScore / studentResults.length);
  };

  const chartData = studentSubjects.map(subject => {
    const studentPerf = calculateSubjectQuizPerformance(subject.name);
    
    // Find all subject IDs with this name
    const relatedSubjectIds = data.subjects
      .filter(s => s.name === subject.name)
      .map(s => s.id);

    const rawClassResults = (data.quizResults || []).filter(r => {
      const st = data.students.find(s => s.id === r.studentId);
      const q = data.quizzes.find(quiz => quiz.id === r.quizId);
      return st?.classId === student.classId && 
             (q?.subjectIds?.some(id => relatedSubjectIds.includes(id)) || q?.subjectName === subject.name) && 
             activeQuizIds.has(r.quizId);
    });
    const latestClassResultsMap = new Map();
    rawClassResults.forEach(r => {
      const key = `${r.quizId}-${r.studentId}`;
      const existing = latestClassResultsMap.get(key);
      if (!existing || new Date(r.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
        latestClassResultsMap.set(key, r);
      }
    });
    const classResults = Array.from(latestClassResultsMap.values());
    const classAvg = classResults.length > 0 ? Math.round(classResults.reduce((sum, r) => sum + r.score, 0) / classResults.length) : 0;
    
    return {
      subject: subject.name,
      student: studentPerf,
      class: classAvg,
      fullMark: 100
    };
  });

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[80] flex items-center justify-center p-4 md:p-12"
      dir="rtl"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white w-full max-w-5xl h-full max-h-[800px] rounded-[32px] shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header Section */}
        <div className="bg-white p-8 pb-6 flex items-center gap-6 relative">
           <div className="flex gap-2">
             <button 
               onClick={onClose}
               className="w-10 h-10 rounded-2xl bg-slate-50 text-slate-400 hover:text-indigo-600 flex items-center justify-center transition-all border border-slate-100 hover:shadow-sm"
             >
                <X size={20} />
             </button>
             {onBack && (
               <button 
                 onClick={onBack}
                 className="w-10 h-10 rounded-2xl bg-slate-50 text-slate-400 hover:text-indigo-600 flex items-center justify-center transition-all border border-slate-100 hover:shadow-sm"
               >
                  <ChevronLeft size={20} />
               </button>
             )}
           </div>

           <div className="w-24 h-24 rounded-3xl bg-indigo-50 text-indigo-400 border border-indigo-100 flex items-center justify-center shadow-inner overflow-hidden shrink-0">
              {student.photoUrl ? (
                <img 
                  src={student.photoUrl} 
                  alt={student.name} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <User size={40} />
              )}
           </div>
           
           <div className="flex-1">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">{student.name}</h2>
              <div className="flex gap-3 mt-3">
                 <span className="px-4 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-black">{studentClass?.name || 'فصل غير محدد'}</span>
                 <span className="px-4 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-black border border-slate-200">الرقم التسلسلي: #{student.id.slice(-6)}</span>
              </div>
           </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
           {/* Sidebar Analytics */}
           <div className="w-full md:w-80 bg-slate-50 p-6 border-l border-slate-100 flex flex-col gap-8 overflow-y-auto">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-6 flex items-center gap-2">
                  <TrendingUp size={14} className="text-indigo-500" /> تحليل الكفاءة النوعية
                </p>
                
                <div className="h-56 w-full mb-6 bg-white rounded-[24px] p-4 shadow-sm border border-slate-100">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 15, right: 0, left: -25, bottom: 0 }}>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                         <XAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} />
                         <YAxis tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 600 }} axisLine={false} tickLine={false} domain={[0, 100]} ticks={[0, 50, 100]} />
                         <Tooltip 
                            cursor={{fill: '#f8fafc'}}
                            contentStyle={{ borderRadius: '16px', border: '1px solid #f1f5f9', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', fontSize: '10px', fontWeight: 700, textAlign: 'right' }}
                            itemStyle={{ fontWeight: 800 }}
                         />
                         <Bar name="الطالب" dataKey="student" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={20}>
                            <LabelList dataKey="student" position="top" fill="#4338ca" style={{ fontSize: '8px', fontWeight: 'bold' }} />
                         </Bar>
                         <Bar name="الفصل" dataKey="class" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={20} opacity={0.3} />
                      </BarChart>
                   </ResponsiveContainer>
                </div>

                <div className="space-y-4">
                  {chartData.slice(0, 6).map(item => (
                    <div key={item.subject} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm transition-all hover:border-indigo-100 group">
                       <div className="flex justify-between items-center mb-2">
                          <p className="font-black text-slate-800 text-[10px]">{item.subject}</p>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${item.student >= item.class ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                            {item.student >= item.class ? 'فوق المتوسط' : 'تحت المتوسط'}
                          </span>
                       </div>
                       <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${item.student}%` }}
                            className="h-full bg-indigo-500 rounded-full"
                          />
                       </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-200">
                 <button 
                   onClick={() => setActiveTab('skills')}
                   className={`w-full flex items-center justify-between p-3 rounded-xl font-black text-[11px] mb-2 transition-all ${activeTab === 'skills' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white'}`}
                 >
                    <div className="flex items-center gap-3"><Book size={14} /> سجل المهارات</div>
                    <ChevronRight size={14} className={activeTab === 'skills' ? 'rotate-90' : ''} />
                 </button>
                 <button 
                   onClick={() => setActiveTab('quizzes')}
                   className={`w-full flex items-center justify-between p-3 rounded-xl font-black text-[11px] mb-2 transition-all ${activeTab === 'quizzes' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white'}`}
                 >
                    <div className="flex items-center gap-3"><BrainCircuit size={14} /> سجل الاختبارات</div>
                    <ChevronRight size={14} className={activeTab === 'quizzes' ? 'rotate-90' : ''} />
                 </button>
              </div>
           </div>

           {/* Main Display */}
           <div className="flex-1 p-6 overflow-y-auto bg-white">
              <AnimatePresence mode="wait">
                 {activeTab === 'skills' ? (
                   <motion.div 
                     key="skills-list"
                     initial={{ opacity: 0, x: 10 }}
                     animate={{ opacity: 1, x: 0 }}
                     exit={{ opacity: 0, x: -10 }}
                     className="space-y-6"
                   >
                      <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl mb-4 border border-slate-100">
                         <div>
                            <h3 className="text-sm font-black text-slate-800">إنجاز المهارات</h3>
                            <p className="text-[10px] text-slate-400 font-bold mt-1">عرض جميع المهارات المسجلة حسب المادة</p>
                         </div>
                         <div className="text-center">
                            <p className="text-[10px] font-black text-slate-400">الإنجاز الكلي</p>
                            <p className="text-xl font-black text-indigo-600">
                               {Math.round(studentSubjects.reduce((acc, s) => acc + calculateSubjectProgress(s.id), 0) / (studentSubjects.length || 1))}%
                            </p>
                         </div>
                      </div>
                      {studentSubjects.map(subject => (
                        <div key={subject.id} className="space-y-6 pt-6">
                           <h3 className="text-lg font-black text-slate-800 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="w-1.5 h-6 bg-indigo-600 rounded-full shadow-sm shadow-indigo-100" />
                                {subject.name}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-400 font-bold">{calculateSubjectProgress(subject.id)}%</span>
                                <div className="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                                   <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${calculateSubjectProgress(subject.id)}%` }} />
                                </div>
                              </div>
                           </h3>

                           {/* Skills Mastery Chart */}
                           <div className="mt-4 mb-6">
                             <div className="flex items-center gap-2 mb-4">
                                <BarChart3 size={16} className="text-indigo-400" />
                                <h4 className="text-sm font-black text-slate-800">تحليل الإتقان للمهارات</h4>
                             </div>
                             <div className="h-56 w-full bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                               <ResponsiveContainer width="100%" height="100%">
                                 <BarChart data={data.skills.filter(sk => sk.subjectName === subject.name && sk.gradeId === subject.gradeId && !sk.isArchived).map(sk => {
                                   const ev = evaluations[`${student.id}-${sk.id}-${academicYear}`];
                                   const scoreMap: Record<string, number> = { 'mastered': 100, 'advanced': 80, 'accepted': 60, 'weak': 40, 'very-weak': 20 };
                                   const scoreLabels: Record<string, string> = { 'mastered': 'متقن', 'advanced': 'متقدم', 'accepted': 'مقبول', 'weak': 'ضعيف', 'very-weak': 'ضعيف جدا' };
                                   return { 
                                     name: sk.name, // Keep full name for tooltip, we'll format axis
                                     shortName: sk.name.length > 15 ? sk.name.slice(0, 15) + '...' : sk.name,
                                     value: ev ? scoreMap[ev.score] || 0 : 0, 
                                     scoreLabel: ev ? scoreLabels[ev.score] || 'غير مقيم' : 'غير مقيم',
                                     rawScore: ev?.score || 'none'
                                   };
                                 })} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                                   <XAxis dataKey="shortName" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                                   <YAxis tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} />
                                   <Tooltip 
                                     cursor={{fill: '#f8fafc'}} 
                                     content={({ active, payload }) => {
                                       if (active && payload && payload.length) {
                                         const data = payload[0].payload;
                                         return (
                                           <div className="bg-white p-3 rounded-2xl shadow-xl border border-slate-100 text-right" dir="rtl">
                                             <p className="text-xs font-black text-slate-800 mb-1">{data.name}</p>
                                             <p className="text-sm font-bold bg-indigo-50 text-indigo-700 px-2 py-1 rounded inline-block">{data.scoreLabel}</p>
                                           </div>
                                         );
                                       }
                                       return null;
                                     }} 
                                   />
                                   <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={40}>
                                      {data.skills.filter(sk => sk.subjectName === subject.name && sk.gradeId === subject.gradeId && !sk.isArchived).map((entry, index) => {
                                         const sk = data.skills.filter(sk => sk.subjectName === subject.name && sk.gradeId === subject.gradeId && !sk.isArchived)[index];
                                         const ev = evaluations[`${student.id}-${sk.id}-${academicYear}`];
                                         const score = ev?.score;
                                         return <Cell key={`cell-${index}`} fill={score === 'mastered' ? '#10b981' : score === 'advanced' ? '#0ea5e9' : score === 'accepted' ? '#f59e0b' : score === 'weak' || score === 'very-weak' ? '#ef4444' : '#e2e8f0'} />;
                                      })}
                                   </Bar>
                                 </BarChart>
                               </ResponsiveContainer>
                             </div>
                           </div>

                           <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              {data.skills.filter(sk => sk.subjectName === subject.name && sk.gradeId === subject.gradeId && !sk.isArchived).map(skill => {
                                const evaluation = evaluations[`${student.id}-${skill.id}-${academicYear}`];
                                return (
                                  <div 
                                    key={skill.id} 
                                    onClick={() => setSelectedSkillDetails(skill)}
                                    className="p-4 rounded-[28px] border border-slate-100 bg-white flex items-center justify-between cursor-pointer group transition-all hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-0.5"
                                 >
                                      <div className="flex-1 min-w-0">
                                         <div className="flex items-center gap-2 mb-1">
                                            <p className="font-black text-slate-800 text-sm truncate">{skill.name}</p>
                                            {evaluation && (
                                              <div className={`px-2 py-0.5 rounded-lg text-[8px] font-black border shadow-sm flex items-center gap-1 ${
                                                evaluation.score === 'mastered' ? 'bg-emerald-500 text-white border-emerald-400' :
                                                evaluation.score === 'advanced' ? 'bg-sky-500 text-white border-sky-400' :
                                                evaluation.score === 'accepted' ? 'bg-amber-400 text-slate-900 border-amber-300' :
                                                evaluation.score === 'weak' ? 'bg-orange-500 text-white border-orange-400' :
                                                'bg-rose-500 text-white border-rose-400'
                                              }`}>
                                                 {evaluation.score === 'mastered' && <CheckCircle2 size={8} />}
                                                 {evaluation.score === 'advanced' && <Zap size={8} />}
                                                 {evaluation.score === 'accepted' && <Target size={8} />}
                                                 {evaluation.score === 'weak' && <AlertTriangle size={8} />}
                                                 {evaluation.score === 'very-weak' && <XCircle size={8} />}
                                                 {evaluation.score === 'mastered' ? 'متقن' : 
                                                  evaluation.score === 'advanced' ? 'متقدم' : 
                                                  evaluation.score === 'accepted' ? 'مقبول' : 
                                                  evaluation.score === 'weak' ? 'ضعيف' : 
                                                  'غير مجتاز'}
                                              </div>
                                            )}
                                         </div>
                                         <p className="text-[9px] text-slate-400 font-bold">{evaluation ? `آخر رصد: ${new Date(evaluation.updatedAt?.seconds * 1000).toLocaleDateString('ar-SA')}` : 'لم يتم الرصد بعد'}</p>
                                      </div>
                                      <div className="flex items-center gap-2 mr-4">
                                         {!evaluation && (
                                            <div className="px-3 py-1.5 rounded-xl text-[9px] font-black bg-slate-50 text-slate-400 border border-slate-100 flex items-center gap-1.5 leading-none">
                                               <Clock size={10} />
                                               قيد الانتظار
                                            </div>
                                         )}
                                         <button 
                                           onClick={(e) => { e.stopPropagation(); setEvaluatingSkill(skill); }}
                                           title="تقييم سريع"
                                           className="w-10 h-10 rounded-2xl bg-slate-50 text-slate-300 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-slate-100 group-hover:border-indigo-100 group-hover:text-indigo-400 hover:scale-110 active:scale-95"
                                         >
                                            <PlusCircle size={18} />
                                         </button>
                                      </div>
                                   </div>
                                );
                              })}
                           </div>
                        </div>
                      ))}
                   </motion.div>
                 ) : (
                   <motion.div 
                     key="quiz-results"
                     initial={{ opacity: 0, x: 10 }}
                     animate={{ opacity: 1, x: 0 }}
                     exit={{ opacity: 0, x: -10 }}
                     className="space-y-4"
                   >
                      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-2">
                         <div>
                            <h3 className="text-sm font-black text-slate-800">تاريخ الاختبارات</h3>
                            <p className="text-[10px] text-slate-400 font-bold mt-0.5">تفصيل آخر المحاولات والنتائج المحققة</p>
                         </div>
                         <div className="flex gap-2">
                            {data.quizzes
                              .filter(q => !q.isArchived && (q.classIds?.includes(student.classId) || (!q.classIds?.length && q.gradeId === studentClass?.gradeId)))
                              .slice(0, 0)
                              .map(quiz => (
                               <button 
                                 key={quiz.id}
                                 onClick={() => onStartQuiz(quiz)}
                                 className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-black text-[9px] flex items-center gap-1.5 shadow-md hover:bg-indigo-700 transition-all"
                               >
                                  <PlayCircle size={12} /> {quiz.title}
                               </button>
                            ))}
                         </div>
                      </div>

                      {quizResults.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                           {quizResults.sort((a, b) => b.updatedAt?.seconds - a.updatedAt?.seconds).map(res => {
                             const quiz = data.quizzes.find(q => q.id === res.quizId);
                             return (
                               <div key={res.id} onClick={() => quiz && onStartQuiz(quiz)} className="p-4 rounded-2xl border border-slate-100 bg-white shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex items-center justify-between hover:border-indigo-100 transition-all group cursor-pointer hover:shadow-md hover:-translate-y-0.5">
                                  <div className="flex items-center gap-4">
                                     <div className={`w-12 h-12 rounded-[1rem] flex items-center justify-center font-black text-sm shadow-sm shrink-0 ${res.score >= 80 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : res.score >= 50 ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                                        {res.score}%
                                     </div>
                                     <div className="space-y-1">
                                        <p className="font-black text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">{quiz?.title || 'اختبار'}</p>
                                        <div className="flex items-center gap-2">
                                          <div className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${res.score >= 80 ? 'text-emerald-700 bg-emerald-50' : res.score >= 50 ? 'text-amber-700 bg-amber-50' : 'text-rose-700 bg-rose-50'}`}>
                                            {res.score >= 80 ? 'مستوى متقدم' : res.score >= 50 ? 'مستوى متوسط' : 'مستوى ضعيف'}
                                          </div>
                                        </div>
                                     </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-1">
                                     <p className="text-[10px] font-black text-slate-400">تاريخ المعالجة</p>
                                     <p className="text-xs text-slate-600 font-bold flex items-center gap-1.5">
                                        <Clock size={12} className="text-slate-300" /> {new Date(res.updatedAt?.seconds * 1000).toLocaleDateString('ar-SA')}
                                     </p>
                                  </div>
                               </div>
                             );
                           })}
                        </div>
                      ) : (
                        <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                           <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-400">
                              <BrainCircuit size={32} />
                           </div>
                           <p className="text-slate-400 font-bold text-xs">لا يوجد نتائج اختبارات مسجلة.</p>
                        </div>
                      )}
                      
                      <div className="mt-8 pt-8 border-t border-slate-100">
                         <h3 className="text-sm font-black text-slate-800 mb-4">الاختبارات القصيرة (من الزيارات الإشرافية)</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                           {data.visits?.filter(v => v.selectedStudentIds?.includes(student.id) && !v.isArchived && v.studentQuizScores && v.studentQuizScores[student.id] !== undefined).map(v => {
                              const score = v.studentQuizScores[student.id];
                              const maxScore = v.quizMaxScore || 10;
                              const percentage = Math.round((score / maxScore) * 100);
                              return (
                               <div key={v.id} className="p-4 rounded-2xl border border-slate-100 bg-white shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex items-center justify-between hover:border-indigo-100 transition-all group hover:shadow-md hover:-translate-y-0.5">
                                  <div className="flex items-center gap-4">
                                     <div className={`w-12 h-12 rounded-[1rem] flex items-center space-x-0.5 justify-center font-black text-sm shadow-sm shrink-0 flex-col ${percentage >= 80 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : percentage >= 50 ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                                        <div>{score}</div>
                                        <div className="text-[8px] text-slate-400 font-bold border-t border-slate-200 w-6 text-center leading-tight">من {maxScore}</div>
                                     </div>
                                     <div className="space-y-1">
                                        <p className="font-black text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">{v.quizText || v.lessonTitle || 'اختبار قصير'}</p>
                                        <div className="flex items-center gap-2">
                                          <div className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${percentage >= 80 ? 'text-emerald-700 bg-emerald-50' : percentage >= 50 ? 'text-amber-700 bg-amber-50' : 'text-rose-700 bg-rose-50'}`}>
                                            تطبيق قصير ضمن زيارة
                                          </div>
                                        </div>
                                     </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-1">
                                     <p className="text-[10px] font-black text-slate-400">تاريخ الزيارة</p>
                                     <p className="text-xs text-slate-600 font-bold flex items-center gap-1.5">
                                        <Clock size={12} className="text-slate-300" /> {new Date(v.date).toLocaleDateString('ar-SA')}
                                     </p>
                                  </div>
                               </div>
                              )
                           })}
                         </div>
                      </div>
                   </motion.div>
                 )}
              </AnimatePresence>
           </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {evaluatingSkill && (
          <QuickEvalDialog
            studentId={student.id}
            skill={evaluatingSkill}
            academicYear={academicYear}
            initialScore={evaluations[`${student.id}-${evaluatingSkill.id}-${academicYear}`]?.score}
            initialNote={evaluations[`${student.id}-${evaluatingSkill.id}-${academicYear}`]?.note}
            onClose={() => setEvaluatingSkill(null)}
          />
        )}
        {selectedSkillDetails && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/40 z-[90] flex items-center justify-center p-4"
            onClick={() => setSelectedSkillDetails(null)}
          >
             <motion.div 
               initial={{ scale: 0.95 }}
               animate={{ scale: 1 }}
               exit={{ scale: 0.95 }}
               className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl"
               onClick={e => e.stopPropagation()}
             >
                <div className="flex justify-between items-center mb-4">
                   <h2 className="font-black text-slate-800 text-lg">{selectedSkillDetails.name}</h2>
                   <button onClick={() => setSelectedSkillDetails(null)}><X size={20} className="text-slate-400"/></button>
                </div>
                <div className="space-y-4">
                    <p className="text-slate-600 text-sm">عدد الأسئلة المرتبطة: {selectedSkillDetails.questions.length}</p>
                    {selectedSkillDetails.questions.length > 0 ? (
                       <ul className="text-[11px] text-slate-500 font-bold space-y-2">
                         {selectedSkillDetails.questions.map((qId, index) => <li key={index}>سؤال ID: {qId}</li>)}
                       </ul>
                    ) : (
                       <p className="text-slate-400 text-xs">لا يوجد أسئلة مرتبطة حالياً</p>
                    )}
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
