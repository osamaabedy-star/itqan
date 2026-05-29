import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppData, Class, Student, Quiz, Grade } from '../types';
import { Users, ChevronRight, BrainCircuit, Search, BookOpen, ArrowRight, ShieldCheck, Award, XCircle, CheckCircle2 } from 'lucide-react';

interface QuizLoginProps {
  data: AppData;
  onSelect: (quiz: Quiz, student: Student) => void;
  onClose: () => void;
}

export function QuizLogin({ data, onSelect, onClose }: QuizLoginProps) {
  const [step, setStep] = useState<'stage' | 'grade' | 'class' | 'quiz' | 'student'>('stage');
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(null);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleStageSelect = (stageId: string) => {
    setSelectedStage(stageId);
    setStep('grade');
  };

  const handleGradeSelect = (grade: Grade) => {
    setSelectedGrade(grade);
    setStep('class');
  };

  const handleClassSelect = (cls: Class) => {
    setSelectedClass(cls);
    setStep('quiz');
  };

  const handleQuizSelect = (quiz: Quiz) => {
    setSelectedQuiz(quiz);
    setStep('student');
    setSearchTerm('');
  };

  const studentList = data.students.filter(s => 
    s.classId === selectedClass?.id && 
    (s.name.toLowerCase().includes(searchTerm.toLowerCase())) && 
    (!s.isArchived)
  ).map(s => {
    const isCompleted = data.quizResults?.some(r => r.studentId === s.id && r.quizId === selectedQuiz?.id);
    return { ...s, isCompleted };
  });

  const availableQuizzes = data.quizzes.filter(q => {
    if (q.isArchived || q.status !== 'published') return false;
    
    // 1. If specific classes are assigned, student's class MUST be one of them
    if (q.classIds && q.classIds.length > 0) {
      if (q.classIds.includes(selectedClass?.id || '')) return true;
      return false;
    }
    
    // 2. Fallback: If no specific classes, check if it matches the grade level
    if (q.gradeId) {
      return q.gradeId === selectedGrade?.id;
    }
    
    // 3. Fallback: If no gradeId and no classIds, check stage
    if (q.stageId) {
      return q.stageId === selectedStage;
    }
    
    return false;
  });

  const steps = [
    { id: 'stage', label: 'المرحلة', icon: <ChevronRight size={16} /> },
    { id: 'grade', label: 'الصف', icon: <Users size={16} /> },
    { id: 'class', label: 'الفصل', icon: <Users size={16} /> },
    { id: 'quiz', label: 'الاختبار', icon: <BrainCircuit size={16} /> },
    { id: 'student', label: 'الاسم', icon: <Search size={16} /> }
  ];

  const STAGES = [
    { id: 'primary', name: 'المرحلة الابتدائية' },
    { id: 'middle', name: 'المرحلة المتوسطة' },
    { id: 'high', name: 'المرحلة الثانوية' },
  ];

  return (
    <div className="fixed inset-0 bg-slate-950 z-[80] flex flex-col font-sans overflow-hidden" dir="rtl">
      {/* Premium Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.03] grayscale" 
             style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      {/* Top Navigation */}
      <div className="p-3 md:py-3 md:px-6 flex justify-between items-center relative z-10 border-b border-white/5 bg-slate-950/20 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
            <ShieldCheck className="text-white" size={20} />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-white text-base font-black tracking-tight">بوابة إتقان</h1>
            <p className="text-indigo-400 text-[8px] font-bold uppercase tracking-widest mt-0.5">Interactive Hub</p>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10">
          {steps.map((s, idx) => (
            <React.Fragment key={s.id}>
              <div 
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-500 ${
                  step === s.id 
                  ? 'bg-white text-indigo-950 shadow-lg font-black' 
                  : (idx < steps.findIndex(x => x.id === step) ? 'text-green-400' : 'text-slate-500')
                }`}
              >
                {idx < steps.findIndex(x => x.id === step) ? <Award size={14} /> : s.icon}
                <span className="text-[10px] hidden md:block">{s.label}</span>
              </div>
              {idx < steps.length - 1 && <div className="w-4 h-[1px] bg-white/10 mx-1" />}
            </React.Fragment>
          ))}
        </div>

        <button 
          onClick={onClose}
          className="group flex items-center gap-2 bg-white/5 hover:bg-red-500/10 text-slate-300 hover:text-red-400 px-4 py-2 rounded-lg transition-all border border-white/5"
        >
          <span className="text-[10px] font-black">خروج</span>
          <XCircle size={16} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-start py-4 px-6 md:py-6 md:px-12 relative z-10 overflow-y-auto">
        <div className="w-full max-w-6xl">
          <AnimatePresence mode="wait">
            {step === 'stage' && (
              <motion.div 
                key="step-stage"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-8"
              >
                <div className="text-center space-y-2">
                  <h2 className="text-xs font-black text-white">بوابة الاختبارات</h2>
                  <p className="text-indigo-300/70 text-[8px]">اختر المرحلة التعليمية للبدء</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
                  {STAGES.map((stg) => (
                    <motion.button 
                       key={stg.id}
                       onClick={() => handleStageSelect(stg.id)}
                       className="bg-white/5 hover:bg-indigo-600 p-8 rounded-3xl border border-white/10 text-white font-black text-xl transition-all"
                    >
                      {stg.name}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 'grade' && (
              <motion.div 
                key="step-grade"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="space-y-8"
              >
                <div className="text-center space-y-4">
                  <button onClick={() => setStep('stage')} className="text-indigo-400 text-[10px] font-black flex items-center gap-1 mx-auto bg-white/5 px-3 py-1.5 rounded-full"><ChevronRight size={14}/> العودة للمراحل</button>
                  <h2 className="text-xl md:text-2xl font-black text-white">اختر الصف الدراسي</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {data.grades.filter(g => (g.stage || 'primary') === selectedStage && !g.isArchived).map((grade) => (
                    <motion.button 
                      key={grade.id}
                      onClick={() => handleGradeSelect(grade)}
                      className="bg-white/10 hover:bg-indigo-600 p-6 rounded-2xl border border-white/10 text-white font-bold"
                    >
                      {grade.name}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 'class' && (
              <motion.div 
                key="step-class"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -40 }}
                className="space-y-8"
              >
                <div className="text-center space-y-4">
                  <button onClick={() => setStep('grade')} className="text-indigo-400 text-[10px] font-black flex items-center gap-1 mx-auto bg-white/5 px-3 py-1.5 rounded-full"><ChevronRight size={14}/> العودة للصوف ({selectedGrade?.name})</button>
                  <h2 className="text-xl md:text-2xl font-black text-white">اختر فصلك</h2>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {data.classes.filter(c => c.gradeId === selectedGrade?.id && !c.isArchived).map((cls, idx) => (
                    <motion.button 
                      key={cls.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      onClick={() => handleClassSelect(cls)}
                      className="group relative bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 p-6 rounded-3xl text-right transition-all hover:border-indigo-500/50 flex flex-col gap-4"
                    >
                      <div className="flex justify-between items-start">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-all">
                          <Users size={20} className="text-white" />
                        </div>
                        <div className="px-2 py-0.5 bg-white/5 rounded-full text-[8px] text-white/40 font-bold border border-white/5">
                           فصل
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-white group-hover:text-indigo-400 transition-colors">{cls.name}</h3>
                        <p className="text-slate-500 font-bold mt-1 text-[10px]">دخول الفصل</p>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 'quiz' && selectedClass && (
              <motion.div 
                key="step-quiz"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="space-y-8"
              >
                <div className="text-center space-y-4">
                  <button onClick={() => setStep('class')} className="text-indigo-400 text-[10px] font-black flex items-center gap-1 mx-auto bg-white/5 px-3 py-1.5 rounded-full"><ChevronRight size={14}/> العودة للفصول ({selectedClass?.name})</button>
                  <h2 className="text-xl md:text-2xl font-black text-white italic">الاختبارات المتاحة لهذا الفصل</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                   {availableQuizzes.length > 0 ? (
                     availableQuizzes.map((quiz, idx) => {
                       const subjectName = quiz.subjectName || (quiz.subjectIds && quiz.subjectIds.length > 0 ? data.subjects.find(s => quiz.subjectIds?.includes(s.id))?.name : '');
                       const completionCount = data.students.filter(s => s.classId === selectedClass.id && !s.isArchived).filter(s => data.quizResults?.some(r => r.studentId === s.id && r.quizId === quiz.id)).length;
                       const totalCount = data.students.filter(s => s.classId === selectedClass.id && !s.isArchived).length;

                       return (
                         <motion.button 
                           key={quiz.id}
                           initial={{ opacity: 0, y: 20 }}
                           animate={{ opacity: 1, y: 0 }}
                           transition={{ delay: idx * 0.1 }}
                           onClick={() => handleQuizSelect(quiz)}
                           className="group relative h-[145px] bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl text-right transition-all hover:border-indigo-500/50 flex flex-col overflow-hidden shadow-lg"
                         >
                            {/* Background Image / Gradient */}
                            <div className="absolute inset-0 z-0">
                               {quiz.imageUrl ? (
                                  <img src={quiz.imageUrl} alt="" className="w-full h-full object-cover opacity-30 group-hover:opacity-50 group-hover:scale-110 transition-all duration-700" referrerPolicy="no-referrer" />
                               ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-indigo-600/10 to-purple-600/10" />
                               )}
                               <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent" />
                            </div>

                            <div className="relative z-10 p-3 h-full flex flex-col justify-between">
                               <div className="flex justify-between items-start">
                                  <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-sm">
                                     <BrainCircuit size={14} className="text-white" />
                                  </div>
                                  <div className="flex flex-col items-end gap-0.5">
                                     <span className="px-2 py-0.5 bg-indigo-600 text-white rounded-full text-[8px] font-black shadow-sm">
                                        {subjectName}
                                     </span>
                                     <div className="flex items-center gap-0.5 text-[8px] font-black text-indigo-300">
                                        <CheckCircle2 size={8} />
                                        {completionCount} / {totalCount} رصد
                                     </div>
                                  </div>
                               </div>

                               <div className="space-y-1.5 text-right w-full">
                                  <h3 className="text-xs font-black text-white group-hover:text-amber-400 transition-colors leading-tight line-clamp-1">{quiz.title}</h3>
                                  <div className="pt-2 border-t border-white/10 flex justify-between items-center w-full">
                                     <p className="text-slate-400 font-bold text-[8px] flex items-center gap-0.5">
                                        <BookOpen size={10} />
                                        {quiz.questions.length} أسئلة مهارية
                                     </p>
                                     <div className="bg-white/10 hover:bg-white text-white hover:text-indigo-950 w-6 h-6 rounded-lg flex items-center justify-center transition-all shadow-sm backdrop-blur-md border border-white/10 shrink-0">
                                        <ArrowRight size={12} />
                                     </div>
                                  </div>
                               </div>
                            </div>
                            
                            {/* Animated Border/Glow effect */}
                            <div className="absolute inset-0 border border-white/0 group-hover:border-indigo-500/20 rounded-2xl transition-all pointer-events-none" />
                         </motion.button>
                       );
                     })
                   ) : (
                     <div className="col-span-full py-20 text-center">
                        <BookOpen size={48} className="text-white/10 mx-auto mb-4" />
                        <p className="text-slate-500 font-black italic">لا توجد اختبارات منشورة لهذا الفصل حالياً</p>
                     </div>
                   )}
                </div>
              </motion.div>
            )}

            {step === 'student' && selectedQuiz && selectedClass && (
              <motion.div 
                key="step-student"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full max-w-4xl mx-auto space-y-4"
              >
                {/* Clean Header Row: Title on the right, small left-aligned search on user request */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button onClick={() => setStep('quiz')} className="text-indigo-400 text-[10px] font-black flex items-center gap-1 bg-white/5 px-2.5 py-1 rounded-full hover:bg-white/10 transition-colors shrink-0">
                      <ChevronRight size={12}/> عودة
                    </button>
                    <div className="text-right">
                      <h2 className="text-base font-black text-white">اختر اسم الطالب</h2>
                      <p className="text-slate-400 text-[9px] font-bold">اختبار: {selectedQuiz.title}</p>
                    </div>
                  </div>

                  {/* Left-aligned small search bar, no explanation text */}
                  <div className="relative w-full sm:w-60">
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-400">
                      <Search size={14} />
                    </div>
                    <input 
                      type="text" 
                      placeholder="بحث عن اسم الطالب..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full h-9 pr-9 pl-3 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-indigo-600/30 focus:border-indigo-500/50 transition-all font-sans text-right"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-[420px] overflow-y-auto scrollbar-hide p-2 bg-white/5 rounded-2xl border border-white/10">
                   {studentList.length > 0 ? (
                     studentList.map((st, i) => (
                       <motion.button 
                         key={st.id}
                         initial={{ opacity: 0, y: 10 }}
                         animate={{ opacity: 1, y: 0 }}
                         transition={{ delay: i * 0.01 }}
                         onClick={() => onSelect(selectedQuiz, st)}
                         className={`text-right p-2.5 rounded-xl flex items-center gap-2.5 transition-all group relative overflow-hidden border ${st.isCompleted ? 'bg-emerald-500/10 border-emerald-500/35' : 'bg-white/5 border-white/5 hover:bg-indigo-600/90 hover:border-indigo-600'}`}
                       >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs text-white shrink-0 transition-colors ${st.isCompleted ? 'bg-emerald-500' : 'bg-white/10 group-hover:bg-white/20'}`}>
                             {st.isCompleted ? <CheckCircle2 size={14} /> : st.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                             <p className={`font-black text-xs truncate ${st.isCompleted ? 'text-emerald-400' : 'text-white'}`}>{st.name}</p>
                             <p className={`${st.isCompleted ? 'text-emerald-500/60' : 'text-slate-500 group-hover:text-indigo-200'} text-[8px] font-bold`}>
                                {st.isCompleted ? 'تم الإنجاز ✓' : 'انقر للبدء'}
                             </p>
                          </div>
                          <ChevronRight size={12} className={`${st.isCompleted ? 'text-emerald-500' : 'text-slate-600 group-hover:text-white'} transition-all transform group-hover:translate-x-0.5 shrink-0`} />
                       </motion.button>
                     ))
                   ) : (
                     <div className="col-span-full py-12 text-center">
                        <p className="text-slate-500 font-bold text-xs">لم يتم العثور على طلاب في هذا الفصل</p>
                     </div>
                   )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
