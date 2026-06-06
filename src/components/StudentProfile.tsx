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
  LabelList,
  AreaChart,
  Area
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
  activeTerm: 'term1' | 'term2' | 'full';
}

const getTimestampMs = (updatedAt: any): number => {
  if (!updatedAt) return 0;
  if (typeof updatedAt.toDate === 'function') return updatedAt.toDate().getTime();
  if (updatedAt.seconds !== undefined && updatedAt.seconds !== null) return updatedAt.seconds * 1000;
  const parsed = new Date(updatedAt);
  return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};

export function StudentProfile({ student, data, evaluations, onClose, onBack, onStartQuiz, academicYear, activeTerm }: StudentProfileProps) {
  const [activeTab, setActiveTab] = useState<'skills' | 'quizzes'>('skills');
  const [evaluatingSkill, setEvaluatingSkill] = useState<Skill | null>(null);
  const [selectedSkillDetails, setSelectedSkillDetails] = useState<Skill | null>(null);

  const activeQuizzes = data.quizzes.filter(q => {
    if (q.isArchived || q.status !== 'published') return false;
    if (q.scheduledDate) {
      const schedDateOnly = q.scheduledDate.split('T')[0];
      const d = new Date();
      const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (schedDateOnly > todayStr) return false;
    }
    return activeTerm === 'full' || (q.term || 'term1') === activeTerm;
  });
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

  const getFilteredSkills = (subjName: string, gradeId?: string) => {
    return data.skills.filter(sk => 
      sk.subjectName === subjName && 
      (!gradeId || sk.gradeId === gradeId) && 
      !sk.isArchived
    ).filter(sk => activeTerm === 'full' || !sk.term || sk.term === 'full' || sk.term === activeTerm);
  };
  
  const calculateSubjectProgress = (subjectId: string) => {
    const subj = data.subjects.find(s => s.id === subjectId);
    if (!subj) return 0;
    const subjectSkills = getFilteredSkills(subj.name, subj.gradeId);
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
        className="bg-slate-50 w-full max-w-5xl h-full max-h-[850px] rounded-[32px] shadow-2xl flex flex-col overflow-hidden text-right border border-white"
      >
        {/* Header Section */}
        <div className="bg-white p-6 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 shrink-0 relative">
          <button 
            onClick={onClose} 
            className="absolute left-6 top-6 w-8 h-8 rounded-full bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all active:scale-95"
          >
            <X size={18} />
          </button>
          
          <div className="flex items-center gap-4 text-right">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-100 shrink-0">
               {student.name.charAt(0)}
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
                {student.name}
                <span className="text-[10px] px-2.5 py-0.5 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-700 font-bold">
                  {studentClass?.name || 'فصل دراسي'}
                </span>
              </h1>
              <p className="text-xs text-slate-400 font-bold flex items-center gap-1.5 font-sans">
                {student.nationalId && (
                  <>
                    <span>الهوية: {student.nationalId}</span>
                    <span className="text-slate-200">•</span>
                  </>
                )}
                <span>السنة الدراسية: {academicYear}</span>
                <span className="text-slate-200">•</span>
                <span>{activeTerm === 'term1' ? 'الفصل الأول' : activeTerm === 'term2' ? 'الفصل الثاني' : 'العام الدراسي كاملًا'}</span>
              </p>
            </div>
          </div>

          {/* Navigation Tab Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl self-start md:self-center">
            <button
              onClick={() => setActiveTab('skills')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all duration-200 ${
                activeTab === 'skills'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              المهارات والمعايير
            </button>
            <button
              onClick={() => setActiveTab('quizzes')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all duration-200 ${
                activeTab === 'quizzes'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              مربعات النتائج والاختبارات
            </button>
          </div>
        </div>

        {/* Scrollable Workspace */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          <AnimatePresence mode="wait">
            {activeTab === 'skills' ? (
              <motion.div
                key="skills-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Visual Performance Charts Panel */}
                {chartData.length > 0 && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)] flex flex-col">
                      <div className="mb-4 text-right">
                        <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                           <TrendingUp size={14} className="text-indigo-500" />
                           مستوى الاختبارات مقارنة بمتوسط الصف
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">تحليل بياني لقدرة الطالب مقابل الزملاء</p>
                      </div>
                      <div className="h-64 flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 'bold', fill: '#64748b' }} axisLine={false} tickLine={false} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 10, fontWeight: 'medium', fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <Tooltip 
                              contentStyle={{ textAlign: 'right', direction: 'rtl', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)' }}
                              labelStyle={{ fontWeight: 'black', fontSize: '11px', color: '#1e293b' }}
                            />
                            <Bar dataKey="student" name="درجة الطالب %" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={30}>
                              {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.student >= 80 ? '#10b981' : entry.student >= 50 ? '#f59e0b' : '#ef4444'} />
                              ))}
                            </Bar>
                            <Bar dataKey="class" name="متوسط الصف %" fill="#cbd5e1" radius={[4, 4, 0, 0]} maxBarSize={30} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.03)] flex flex-col justify-between text-right">
                      <div className="text-right">
                        <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                           <Award size={14} className="text-indigo-500" />
                           التقدير العام للمهارات
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">معدل تغلغل الإتقان العام</p>
                      </div>

                      <div className="py-6 flex flex-col items-center justify-center space-y-3">
                        <div className="text-4xl font-black text-indigo-600 font-sans tracking-tight">
                          {Math.round(studentSubjects.reduce((acc, sub) => acc + calculateSubjectProgress(subjectMap.get(sub.name)?.id), 0) / (studentSubjects.length || 1))}%
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold text-center leading-relaxed max-w-[180px]">إجمالي نسبة إتقان المعايير المعتمدة لجميع المواد</p>
                      </div>

                      <div className="space-y-2 border-t border-slate-50 pt-3">
                         <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold">
                           <span>عدد المقررات التابعة:</span>
                           <span className="font-extrabold text-slate-700">{studentSubjects.length} مواد</span>
                         </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Subject-based Skill breakdown List */}
                <div className="space-y-4 text-right">
                  <h3 className="text-sm font-black text-slate-800">مستوى إتقان معايير المواد</h3>
                  
                  {studentSubjects.map(subj => {
                    const progress = calculateSubjectProgress(subj.id);
                    const subjectSkills = getFilteredSkills(subj.name, subj.gradeId);
                    
                    return (
                      <div key={subj.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.02)] space-y-4">
                         {/* Subject Progress Header */}
                         <div className="flex items-center justify-between gap-4">
                            <div className="space-y-0.5 text-right">
                               <h4 className="text-sm font-black text-slate-805">{subj.name}</h4>
                               <p className="text-[10px] text-slate-400 font-bold font-sans">عدد المعايير المقررة: {subjectSkills.length} معياراً</p>
                            </div>
                            <div className="flex items-center gap-3">
                               <div className="text-left">
                                  <span className="text-[10px] font-black text-indigo-600 block">{progress}% إتقان</span>
                               </div>
                               <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden shrink-0">
                                  <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: progress + "%" }} />
                               </div>
                            </div>
                         </div>

                         {/* Mini Skill Masteries Grid */}
                         {subjectSkills.length > 0 ? (
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-50">
                             {subjectSkills.map(sk => {
                               const ev = evaluations[student.id + "-" + sk.id + "-" + academicYear];
                               const score = ev?.score;
                               
                               const badgeStyle = score === 'mastered' 
                                 ? 'bg-emerald-50 text-emerald-700 border-emerald-150' 
                                 : score === 'advanced'
                                 ? 'bg-teal-50 text-teal-700 border-teal-150'
                                 : score === 'accepted'
                                 ? 'bg-amber-50 text-amber-700 border-amber-150'
                                 : score === 'weak'
                                 ? 'bg-orange-50 text-orange-700 border-orange-150'
                                 : score === 'very-weak'
                                 ? 'bg-rose-50 text-rose-700 border-rose-150'
                                 : 'bg-slate-50 text-slate-400 border-slate-150';

                               const scoreLabel = score === 'mastered'
                                 ? 'متقن'
                                 : score === 'advanced'
                                 ? 'متقدم'
                                 : score === 'accepted'
                                 ? 'مقبول'
                                 : score === 'weak'
                                 ? 'ضعيف'
                                 : score === 'very-weak'
                                 ? 'ضعيف جداً'
                                 : 'غير مقيم';

                               return (
                                 <div 
                                   key={sk.id}
                                   onClick={() => setSelectedSkillDetails(sk)}
                                   className="p-3 bg-slate-50/50 border border-slate-100 hover:border-indigo-150 rounded-xl flex items-center justify-between gap-3 text-right group/skill transition-all cursor-pointer"
                                 >
                                    <span className="text-xs font-bold text-slate-700 line-clamp-2 leading-snug hover:text-indigo-600 transition-colors">
                                      {sk.name}
                                    </span>
                                    <div className="flex items-center gap-2 shrink-0">
                                       <span className={"text-[10px] font-extrabold px-2 py-1 rounded-lg border " + badgeStyle + " leading-none"}>
                                         {scoreLabel}
                                       </span>
                                       <button 
                                         onClick={(e) => { e.stopPropagation(); setEvaluatingSkill(sk); }}
                                         title="تقييم سريع للمعيار"
                                         className="w-7 h-7 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                                       >
                                         <PlusCircle size={14} />
                                       </button>
                                    </div>
                                 </div>
                               );
                             })}
                           </div>
                         ) : (
                           <p className="text-[10px] text-slate-400 font-bold italic py-1 col-span-full">لا توجد معايير معالجة في هذا الفصل الدراسي.</p>
                         )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="quizzes-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-2 text-right pb-2 border-b border-slate-100">
                   <div>
                      <h3 className="text-sm font-black text-slate-800">الأداء الدراسي والنمو المعرفي الزمني</h3>
                      <p className="text-[10px] text-slate-400 font-bold mt-0.5 font-sans">تراكم الأداء لمستوى التطور لكل مقرر ومحاولات الطالب السابقة</p>
                   </div>
                </div>

                {(() => {
                  const sortedQuizzes = quizResults.map(res => {
                    const quiz = data.quizzes.find(q => q.id === res.quizId);
                    const dateObj = res.updatedAt && res.updatedAt.toDate 
                      ? res.updatedAt.toDate() 
                      : (res.updatedAt?.seconds ? new Date(res.updatedAt.seconds * 1000) : new Date(res.updatedAt || Date.now()));
                    return {
                      id: res.id || (res.studentId + "_" + res.quizId),
                      title: res.title || quiz?.title || 'اختبار تقويمي',
                      score: res.score,
                      quizId: res.quizId || quiz?.id || '',
                      date: dateObj,
                      dateStr: dateObj.toLocaleDateString('ar-SA', { month: 'numeric', day: 'numeric' }),
                      fullDateStr: dateObj.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }),
                      subjectName: data.subjects.find(sub => quiz?.subjectIds?.includes(sub.id))?.name || quiz?.subjectName || 'مادة أخرى',
                    };
                  });

                  const listData = [...sortedQuizzes].sort((a, b) => b.date.getTime() - a.date.getTime());

                  // 4 core subjects to track side-by-side
                  const subjectsToTrack = [
                    { id: 'arabic', name: 'لغتي', searchKeywords: ['لغتي', 'عربي', 'العربية'], color: '#ef4444', gradientColor: 'rgba(239, 68, 68, 0.15)', bgLight: '#fef2f2', borderLight: '#fee2e2', textColor: '#b91c1c' },
                    { id: 'math', name: 'رياضيات', searchKeywords: ['رياضيات', 'حساب', 'الحساب'], color: '#3b82f6', gradientColor: 'rgba(59, 130, 246, 0.15)', bgLight: '#eff6ff', borderLight: '#dbeafe', textColor: '#1d4ed8' },
                    { id: 'science', name: 'علوم', searchKeywords: ['علوم', 'العلوم', 'علم'], color: '#10b981', gradientColor: 'rgba(16, 185, 129, 0.15)', bgLight: '#ecfdf5', borderLight: '#d1fae5', textColor: '#047857' },
                    { id: 'english', name: 'إنجليزي', searchKeywords: ['إنجليزي', 'انجليزي', 'إنجليزية', 'انجليزية', 'اللغة الإنجليزية', 'english'], color: '#8b5cf6', gradientColor: 'rgba(139, 92, 246, 0.15)', bgLight: '#f5f3ff', borderLight: '#ede9fe', textColor: '#6d28d9' }
                  ];

                  const categorizedList = [
                    ...subjectsToTrack.map(s => {
                      const list = listData.filter(item => {
                        const norm = (item.subjectName || '').trim().toLowerCase();
                        return s.searchKeywords.some(keyword => norm.includes(keyword));
                      });
                      return { ...s, list };
                    }),
                    {
                      id: 'other',
                      name: 'مقررات أخرى',
                      color: '#64748b',
                      gradientColor: 'rgba(100, 116, 139, 0.15)',
                      bgLight: '#f8fafc',
                      borderLight: '#e2e8f0',
                      textColor: '#475569',
                      list: listData.filter(item => {
                        const norm = (item.subjectName || '').trim().toLowerCase();
                        return !subjectsToTrack.some(s => s.searchKeywords.some(keyword => norm.includes(keyword)));
                      })
                    }
                  ];

                  return (
                    <div className="space-y-6">
                      {/* 4 Subjects side-by-side Visual Timeline Tracking */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {subjectsToTrack.map((sub) => {
                          const subjectQuizzes = sortedQuizzes.filter(item => {
                            const norm = (item.subjectName || '').trim().toLowerCase();
                            return sub.searchKeywords.some(keyword => norm.includes(keyword));
                          });
                          const subAvg = subjectQuizzes.length > 0 ? Math.round(subjectQuizzes.reduce((sum, q) => sum + q.score, 0) / subjectQuizzes.length) : 0;
                          const subSortedChartData = [...subjectQuizzes].sort((a, b) => a.date.getTime() - b.date.getTime());

                          return (
                            <div 
                              key={sub.id} 
                              className="bg-white p-4 rounded-2xl border border-slate-150 shadow-sm flex flex-col justify-between space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sub.color }} />
                                  <h4 className="text-xs font-black text-slate-800">{sub.name}</h4>
                                </div>
                                <div className="text-left font-sans text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                                  <span>{subjectQuizzes.length} اختبارات</span>
                                  {subjectQuizzes.length > 0 && (
                                    <span className="font-black px-1.5 py-0.5 rounded" style={{ backgroundColor: sub.bgLight, color: sub.textColor }}>
                                      {subAvg}%
                                    </span>
                                  )}
                                </div>
                              </div>

                              {subSortedChartData.length === 0 ? (
                                <div className="h-16 flex flex-col items-center justify-center bg-slate-50/50 rounded-xl border border-dashed border-slate-100 text-center p-2">
                                  <Clock size={12} className="text-slate-300 mb-1" />
                                  <span className="text-[8px] text-slate-400 font-bold">لم تُجر اختبارات بعد</span>
                                </div>
                              ) : (
                                <div className="w-full h-16">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={subSortedChartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                                      <defs>
                                        <linearGradient id={"colorScore-prof-" + sub.id} x1="0" y1="0" x2="0" y2="1">
                                          <stop offset="5%" stopColor={sub.color} stopOpacity={0.35}/>
                                          <stop offset="95%" stopColor={sub.color} stopOpacity={0}/>
                                        </linearGradient>
                                      </defs>
                                      <Tooltip 
                                        content={({ active, payload }) => {
                                          if (active && payload && payload.length) {
                                            const d = payload[0].payload;
                                            return (
                                              <div className="bg-slate-900 text-white p-2 rounded-lg border border-slate-800 text-right space-y-0.5 text-[9px] shadow-lg max-w-[130px]" dir="rtl">
                                                <p className="font-extrabold text-white truncate">{d.title}</p>
                                                <p className="text-slate-400 text-[8px] font-medium font-sans">{d.dateStr}</p>
                                                <p className="font-bold flex items-center gap-1 mt-0.5" style={{ color: sub.color }}>
                                                  <span>الدرجة:</span>
                                                  <span className="text-white font-black text-[10px]">{d.score}%</span>
                                                </p>
                                              </div>
                                            );
                                          }
                                          return null;
                                        }}
                                      />
                                      <Area type="monotone" dataKey="score" stroke={sub.color} strokeWidth={2} fillOpacity={1} fill={"url(#colorScore-prof-" + sub.id + ")"} dot={{ r: 2, stroke: sub.color, strokeWidth: 1.5, fill: '#fff' }} />
                                    </AreaChart>
                                  </ResponsiveContainer>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Grouped Bottom Results Cards */}
                      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                          <h3 className="text-xs font-black text-slate-805">سجل نتائج المحاولات التقييمية</h3>
                          <span className="text-[10px] text-slate-400 font-bold">العدد الإجمالي: {listData.length}</span>
                        </div>

                        {listData.length === 0 ? (
                          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                             <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400">
                                <BrainCircuit size={24} />
                             </div>
                             <p className="text-slate-400 font-bold text-xs font-sans">لا يوجد نتائج اختبارات مسجلة.</p>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {categorizedList.map((cat) => {
                              if (cat.list.length === 0) return null;
                              return (
                                <div key={cat.id} className="space-y-3">
                                  <div className="flex items-center gap-2 border-r-4 pr-3" style={{ borderColor: cat.color }}>
                                    <h4 className="text-xs font-black" style={{ color: cat.textColor }}>{cat.name}</h4>
                                    <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full" style={{ backgroundColor: cat.bgLight, color: cat.textColor }}>
                                      {cat.list.length} اختبار
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 py-1">
                                    {cat.list.map((res) => {
                                      const quiz = data.quizzes.find(q => q.id === res.quizId);
                                      const scoreTextColor = res.score >= 80 ? 'text-emerald-600' : 
                                                             res.score >= 50 ? 'text-amber-600' : 
                                                             'text-rose-600';
                                      
                                      const classStudentIds = data.students
                                        .filter(s => s.classId === student.classId)
                                        .map(s => s.id);

                                      const classResultsForThisQuiz = data.quizResults?.filter(r => 
                                        r.quizId === res.quizId && 
                                        classStudentIds.includes(r.studentId)
                                      ) || [];

                                      const classAverage = classResultsForThisQuiz.length > 0
                                        ? Math.round(classResultsForThisQuiz.reduce((sum, r) => sum + r.score, 0) / classResultsForThisQuiz.length)
                                        : res.score;

                                      return (
                                        <div 
                                          key={res.id} 
                                          onClick={() => quiz && onStartQuiz(quiz)}
                                          className="p-3 bg-white hover:bg-slate-50/70 border border-slate-150 rounded-2xl flex flex-col justify-between transition-all duration-200 shadow-sm hover:shadow-md text-right h-[135px] cursor-pointer"
                                        >
                                          <div className="space-y-1">
                                            <div className="flex items-center justify-between gap-1">
                                              <span className="text-[8px] px-1.5 py-0.5 bg-indigo-50 border border-indigo-150 text-indigo-700 font-extrabold rounded-md truncate max-w-[65px] leading-none text-center" title={res.subjectName}>
                                                {res.subjectName}
                                              </span>
                                              <span className="text-[8px] text-slate-400 font-bold truncate font-sans">
                                                {res.dateStr}
                                              </span>
                                            </div>
                                            <h4 className="text-[11px] font-black text-slate-800 line-clamp-2 leading-tight h-8 overflow-hidden mt-1 font-sans" title={res.title}>
                                              {res.title}
                                            </h4>
                                          </div>
                                          
                                          <div className="space-y-1.5 border-t border-slate-100 pt-1.5 mt-auto">
                                            <div className="flex items-center justify-between">
                                              <span className="text-[9px] text-slate-400 font-medium font-sans">الدرجة:</span>
                                              <span className={"text-xs font-black " + scoreTextColor}>
                                                {res.score}%
                                              </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                              <span className="text-[9px] text-slate-400 font-medium font-sans">متوسط الصف:</span>
                                              <span className="text-[10px] font-extrabold text-slate-600 font-sans">
                                                {classAverage}%
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Short Quizzes Visits section */}
                <div className="mt-8 pt-8 border-t border-slate-100 text-right">
                   <h3 className="text-sm font-black text-slate-800 mb-4 font-sans text-right">الاختبارات القصيرة (من الزيارات الإشرافية)</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                     {data.visits?.filter(v => v.selectedStudentIds?.includes(student.id) && !v.isArchived && v.studentQuizScores && v.studentQuizScores[student.id] !== undefined).map(v => {
                        const score = v.studentQuizScores[student.id];
                        const maxScore = v.quizMaxScore || 10;
                        const percentage = Math.round((score / maxScore) * 100);
                        return (
                         <div key={v.id} className="p-4 rounded-2xl border border-slate-100 bg-white shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex items-center justify-between hover:border-indigo-100 transition-all group hover:shadow-md hover:-translate-y-0.5" dir="rtl">
                            <div className="flex items-center gap-4 text-right">
                               <div className={`w-12 h-12 rounded-[1rem] flex items-center space-x-0.5 justify-center font-black text-sm shadow-sm shrink-0 flex-col ${percentage >= 80 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : percentage >= 50 ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                                  <div>{score}</div>
                                  <div className="text-[8px] text-slate-400 font-bold border-t border-slate-200 w-6 text-center leading-tight">من {maxScore}</div>
                               </div>
                               <div className="space-y-1 text-right">
                                  <p className="font-black text-slate-800 text-sm group-hover:text-indigo-600 transition-colors font-sans">{v.quizText || v.lessonTitle || 'اختبار قصير'}</p>
                                  <div className="flex items-center gap-2">
                                    <div className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${percentage >= 80 ? 'text-emerald-700 bg-emerald-50' : percentage >= 50 ? 'text-amber-700 bg-amber-50' : 'text-rose-700 bg-rose-50'}`}>
                                      تطبيق قصير ضمن زيارة
                                    </div>
                                  </div>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 font-sans text-left">
                               <p className="text-[10px] font-black text-slate-400">تاريخ الزيارة</p>
                               <p className="text-xs text-slate-600 font-bold flex items-center gap-1.5 font-sans">
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
               className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl text-right"
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
                       <p className="text-slate-400 text-xs text-center font-bold">لا يوجد أسئلة مرتبطة حالياً</p>
                    )}
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
