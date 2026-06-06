import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Quiz, MCQQuestion, Student } from '../types';
import { 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  Award, 
  X, 
  Users, 
  ChevronDown, 
  LayoutDashboard, 
  TrendingUp, 
  ShieldCheck, 
  ChevronLeft, 
  BrainCircuit,
  Clock,
  HelpCircle,
  GraduationCap,
  RotateCcw,
  Sparkles,
  Check,
  ChevronLast,
  FileText
} from 'lucide-react';
import { firestoreService } from '../services/firestoreService';

interface QuizPlayerProps {
  quiz: Quiz;
  student?: Student;
  classStudents?: Student[];
  quizResults?: any[];
  onClose: () => void;
  onSelectStudent?: (student: Student) => void;
  allSkills: any[];
  allSubjects: any[];
  academicYear?: string;
  onExitPortal?: (action: 'logout' | 'reports' | 'home') => void;
  allowStudentSwitching?: boolean;
}

export function QuizPlayer({ 
  quiz, 
  student, 
  classStudents, 
  quizResults = [], 
  onClose, 
  onSelectStudent, 
  allSkills, 
  allSubjects, 
  academicYear = '2024-2025',
  onExitPortal,
  allowStudentSwitching = false
}: QuizPlayerProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  // Custom states matching requested LMS features
  const [answers, setAnswers] = useState<(number | undefined)[]>(() => 
    new Array(quiz.questions.length).fill(undefined)
  );
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(quiz.timeLimit ? quiz.timeLimit * 60 : null);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const currentQuestion = quiz.questions[currentQuestionIndex];

  // Timer Effect
  useEffect(() => {
    if (timeLeft === null || showResult || isTimeUp) return;

    if (timeLeft <= 0) {
      setIsTimeUp(true);
      submitQuiz(answers);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev !== null ? prev - 1 : null);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, showResult, isTimeUp, answers]);

  const hasSolved = (studentId: string) => {
    return quizResults.some(r => r.studentId === studentId && r.quizId === quiz.id);
  };

  // Reset progress when student changes
  useEffect(() => {
    setCurrentQuestionIndex(0);
    setAnswers(new Array(quiz.questions.length).fill(undefined));
    setShowResult(false);
    setIsDropdownOpen(false);
    setIsTimeUp(false);
    setShowHint(false);
    setTimeLeft(quiz.timeLimit ? quiz.timeLimit * 60 : null);
  }, [student?.id, quiz.timeLimit]);

  const submitQuiz = (finalAnswers: (number | undefined)[]) => {
      // Normalize answers mapping any undefined/unanswered index to -1 so Firestore/App handles it safely
      const normalizedAnswers = finalAnswers.map(ans => ans === undefined ? -1 : ans);

      const correctCount = normalizedAnswers.reduce((acc, ans, idx) => {
        if (idx >= quiz.questions.length || ans === -1) return acc;
        return acc + (ans === quiz.questions[idx].correctAnswerIndex ? 1 : 0);
      }, 0);
      const score = Math.round((correctCount / quiz.questions.length) * 100);
      
      // Only save if it's a real student taking the quiz
      if (student) {
        firestoreService.saveQuizResult({
          studentId: student.id,
          quizId: quiz.id,
          title: quiz.title,
          score,
          answers: normalizedAnswers,
          subjectId: quiz.subjectIds?.[0] || '',
          subjectIds: quiz.subjectIds
        }).catch(err => {
          console.error("Error saving quiz result:", err);
        });

        // INTELLIGENT LINK: If score >= 85%, auto-master skills for this subject
        if (score >= 85) {
           const quizSubjectNames = allSubjects
             .filter(s => quiz.subjectIds?.includes(s.id))
             .map(s => s.name);
           
           const relevantSkills = allSkills.filter(sk => 
             quizSubjectNames.includes(sk.subjectName) && 
             sk.gradeId === quiz.gradeId &&
             !sk.isArchived
           );

           relevantSkills.forEach(skill => {
              firestoreService.saveEvaluation(
                 student.id, 
                 skill.id, 
                 'mastered', 
                 `رصد تلقائي: تم اجتياز اختبار "${quiz.title}" بنسبة ${score}%`,
                 academicYear
              ).catch(err => {
                console.error("Error saving automatic evaluation:", err);
              });
           });
        }
      }
      
      setShowResult(true);
  };

  const handleSelectOption = (optionIndex: number) => {
    const updatedAnswers = [...answers];
    updatedAnswers[currentQuestionIndex] = optionIndex;
    setAnswers(updatedAnswers);
    setShowHint(false);
  };

  const handleNext = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setShowHint(false);
    } else {
      submitQuiz(answers);
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setShowHint(false);
    }
  };

  const handleNavigateToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
    setShowHint(false);
  };

  const handleResetProgress = () => {
    setAnswers(new Array(quiz.questions.length).fill(undefined));
    setCurrentQuestionIndex(0);
    setIsTimeUp(false);
    setShowHint(false);
    setTimeLeft(quiz.timeLimit ? quiz.timeLimit * 60 : null);
    setShowResetConfirm(false);
  };

  const handleNextStudent = () => {
    if (!classStudents || !student || !onSelectStudent) return;
    const currentIndex = classStudents.findIndex(s => s.id === student.id);
    const nextIndex = (currentIndex + 1) % classStudents.length;
    onSelectStudent(classStudents[nextIndex]);
  };

  const handlePrevStudent = () => {
    if (!classStudents || !student || !onSelectStudent) return;
    const currentIndex = classStudents.findIndex(s => s.id === student.id);
    const prevIndex = (currentIndex - 1 + classStudents.length) % classStudents.length;
    onSelectStudent(classStudents[prevIndex]);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Helpful educational advice generator based on quiz and question indexes
  const getEducationalTip = () => {
    const defaultTips = [
      "اقرأ خيارات الإجابة كاملة بتمعّن قبل حسم اختيارك النهائي.",
      "ابحث عن الكلمات المفتاحية في عبارة السؤال فهي تدل على القاعدة الصحيحة.",
      "فكر في العلاقة اللغوية والاشتقاقات والنقاء النحوي للفقرة المكتوبة.",
      "تذكر دائمًا القواعد النحوية الأساسية وعلامات الرفع والنصب والجر الأصلية والفرعية."
    ];
    
    if (quiz.title.includes("المطلق")) {
      return "تذكر: المفعول المطلق هو اسم منصوب مشتق من لفظ الفعل لتوكيده، أو بيان نوعه، أو بيان عدده (مثل: انطلق انطلاقًا).";
    }
    if (quiz.title.includes("الفاعل")) {
      return "تذكر: الفاعل هو من قام بالفعل أو اتصف به، وحكمه الإعرابي الرفع دائمًا.";
    }
    if (quiz.title.includes("المبتدأ")) {
      return "تذكر: المبتدأ والخبر هما ركنا الجملة الاسمية، وهما مرفوعان دائمًا.";
    }

    return defaultTips[currentQuestionIndex % defaultTips.length];
  };

  if (showResult) {
    const correctCount = answers.reduce((acc, ans, idx) => {
      if (ans === undefined || ans === -1) return acc;
      return acc + (ans === quiz.questions[idx].correctAnswerIndex ? 1 : 0);
    }, 0);
    const score = Math.round((correctCount / quiz.questions.length) * 100);

    return (
      <div className="fixed inset-0 bg-slate-50 z-[70] flex items-center justify-center p-6 text-slate-800 animate-fadeIn" dir="rtl">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full text-center space-y-6"
        >
          <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-xl ring-4 ring-emerald-50 animate-bounce">
             <Award size={48} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black mb-1 text-slate-150">{student ? `أحسنت يا ${student.name}!` : 'اكتمل وضع المعاينة'}</h2>
            <p className="text-slate-500 font-bold text-xs">لقد أتممت اختبار <span className="text-emerald-500 font-extrabold">{quiz.title}</span> بنجاح</p>
          </div>
          
          <div className="bg-white rounded-3xl p-6 border border-slate-200/85 shadow-md">
             <p className="text-5xl font-black text-emerald-600 mb-1">{score}%</p>
             <p className="text-xs font-bold text-slate-500 leading-relaxed">لقد أجبت بشكل صحيح على {correctCount} من أصل {quiz.questions.length} أسئلة.</p>
          </div>

          <div className="space-y-3 pt-2">
            {onExitPortal ? (
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => onExitPortal('reports')}
                  className="w-full py-3 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm shadow-md shadow-indigo-200 transition-all cursor-pointer active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <FileText size={16} />
                  <span>الدخول للتقارير واستعراض التقدم</span>
                </button>
                
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => onExitPortal('home')}
                    className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-705 text-xs font-black border border-slate-200 rounded-2xl transition-all cursor-pointer active:scale-[0.98]"
                  >
                    الاختبارات المتاحة
                  </button>
                  
                  <button 
                    onClick={() => onExitPortal('logout')}
                    className="py-3 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-2xl font-black text-xs border border-rose-100 transition-all cursor-pointer active:scale-[0.98]"
                  >
                    الخروج من الحساب
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={onClose}
                  className="py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 rounded-2xl font-black text-base border border-slate-200/60 transition-all font-sans cursor-pointer active:scale-[0.98]"
                >
                  العودة للرئيسية
                </button>
                {classStudents && student && classStudents.findIndex(s => s.id === student.id) < classStudents.length - 1 && (
                  <button 
                    onClick={handleNextStudent}
                    className="py-4 bg-emerald-600 text-white hover:bg-emerald-700 rounded-2xl font-black text-base shadow-lg shadow-emerald-100 hover:scale-[1.02] transition-all cursor-pointer active:scale-[0.98]"
                  >
                    الطالب التالي
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200 space-y-3">
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">تحديث مؤشرات التقرير وتحليل المهارات</p>
             <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-2.5 rounded-xl border border-slate-100 flex flex-col items-center gap-1 shadow-sm">
                   <TrendingUp size={16} className="text-emerald-500" />
                   <span className="text-[9px] font-black text-slate-600">رصد تلقائي بالملفات تفاعلي</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-100 flex flex-col items-center gap-1 shadow-sm">
                   <ShieldCheck size={16} className="text-emerald-500" />
                   <span className="text-[9px] font-black text-slate-600">مؤشرات التقدم المعياري محدثة</span>
                </div>
             </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#f8fafc] z-[70] flex flex-col overflow-y-auto" dir="rtl">
      {/* 1. Academic Portal Header matching custom school styling in screenshot */}
      <header className="bg-white/95 border-b border-slate-100/80 px-4 py-3 flex items-center justify-between sticky top-0 z-[80] backdrop-blur-md shadow-sm">
         <div className="flex items-center gap-3">
            {/* Green graduation circle icon exactly matches image style */}
            <div className="bg-[#10b981] text-white w-12 h-12 rounded-[1.25rem] flex items-center justify-center shadow-lg shadow-emerald-100 overflow-hidden transform hover:rotate-3 transition-transform">
               <GraduationCap size={26} className="transform -scale-x-100" />
            </div>
            <div>
               <h1 className="text-base font-extrabold text-slate-900 leading-tight">منصة اختبارات لغتي</h1>
               <div className="text-[10px] text-slate-400 font-bold mt-0.5">
                  الصف الرابع الابتدائي - الفصل الدراسي الثاني
               </div>
            </div>
         </div>
         
         <div className="flex items-center gap-3">
            {/* School Tag / Branding Button identical to screenshot tag */}
            <div className="hidden md:flex items-center bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-2 text-slate-600 font-black text-xs gap-2">
               <span className="w-2 h-2 rounded-full bg-emerald-400" />
               <span>مدارس رياض الإبداع الأهلية</span>
            </div>

            {/* Custom Student Select / active user card */}
            <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-2xl px-4 py-1.5 text-indigo-900 font-extrabold text-sm flex items-center gap-1.5 relative shadow-sm shrink-0">
              {!allowStudentSwitching || !(classStudents && classStudents.length > 0) ? (
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse shrink-0" />
                  <span className="text-[11px] text-blue-700 font-black">اسم الطالب:</span>
                  <span className="font-black text-blue-950 text-xs md:text-sm">{student ? student.name : 'وضع المعاينة'}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-blue-700 font-bold shrink-0">اسم الطالب:</span>
                  {classStudents && student && classStudents.length > 1 && (
                    <button 
                      onClick={handlePrevStudent}
                      className="w-5.5 h-5.5 rounded-lg text-blue-500 hover:bg-white hover:text-blue-700 transition-all flex items-center justify-center cursor-pointer font-black"
                      title="الطالب السابق"
                    >
                      <ChevronLeft size={14} />
                    </button>
                  )}
                  
                  <div className="relative">
                    <button 
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="flex items-center gap-1.5 px-1.5 py-1 rounded-lg hover:bg-white text-blue-950 font-black text-xs md:text-sm transition-all"
                    >
                      <Users size={12} className="text-blue-600 shrink-0" />
                      <span>{student ? student.name : 'وضع المعاينة'}</span>
                      <ChevronDown size={12} className="text-slate-400 shrink-0" />
                    </button>
                    
                    <AnimatePresence>
                      {isDropdownOpen && classStudents && onSelectStudent && (
                        <motion.div 
                          initial={{ opacity: 0, y: 5, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 5, scale: 0.95 }}
                          className="absolute top-full left-0 w-56 mt-2 bg-white rounded-xl shadow-2xl border border-slate-200/65 p-1.5 z-[100] overflow-hidden"
                        >
                          <div className="max-h-52 overflow-y-auto scrollbar-hide space-y-1">
                            {classStudents.map(s => {
                              const solved = hasSolved(s.id);
                              return (
                                <button 
                                  key={s.id} 
                                  onClick={() => { onSelectStudent(s); setIsDropdownOpen(false); }} 
                                  className={`w-full text-right px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between group cursor-pointer ${student && s.id === student.id ? 'bg-blue-50 text-blue-600 font-extrabold' : 'text-slate-600 hover:bg-slate-50'}`}
                                >
                                  <div className="flex items-center gap-2">
                                     {s.name}
                                     {solved && <CheckCircle2 size={12} className="text-emerald-500" />}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {classStudents && student && classStudents.findIndex(s => s.id === student.id) < classStudents.length - 1 && (
                    <button 
                      onClick={handleNextStudent}
                      className="w-5.5 h-5.5 rounded-lg text-blue-500 hover:bg-white hover:text-blue-700 transition-all flex items-center justify-center cursor-pointer font-black"
                      title="الطالب التالي"
                    >
                      <ChevronRight size={14} className="rotate-180" />
                    </button>
                  )}
                </div>
              )}
            </div>


         </div>
      </header>



      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
         {/* 2. Dynamic Info Panel representing the sleek card headers in image */}
         <div className="bg-white rounded-3xl p-5 border border-slate-200/50 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
               {/* Back Button */}
               <button 
                 onClick={onClose}
                 className="w-11 h-11 rounded-full border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 shadow-sm flex items-center justify-center text-slate-600 transition-all cursor-pointer shrink-0"
                 title="العودة ومغادرة الاختبار"
               >
                  <ChevronRight size={18} className="translate-x-[1px]" />
               </button>
               
               <div>
                  <div className="flex items-center gap-2">
                     <span className="bg-[#e6f4ea] text-[#137333] text-[10px] font-black px-2.5 py-1 rounded-full leading-none flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        جاري التقييم
                     </span>
                     <span className="text-[10px] text-slate-400 font-bold">
                        • {allSubjects.find(s => quiz.subjectIds?.includes(s.id))?.name || quiz.subjectName || "المادة"}
                     </span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-black text-slate-900 mt-1 leading-none">{quiz.title}</h2>
               </div>
            </div>

            <div className="flex items-center gap-3 self-stretch md:self-auto justify-between md:justify-end">
               {/* Question Count Pill */}
               <div className="bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-2 text-slate-600 font-extrabold text-xs">
                  السؤال <span className="text-emerald-600 text-sm font-black mx-0.5">{currentQuestionIndex + 1}</span> من <span className="text-slate-500 font-black">{quiz.questions.length}</span>
               </div>

               {/* Elegant Gold Timer countdown matching screen capsule */}
               {timeLeft !== null && (
                  <div className={`flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3.5 py-2 rounded-xl border border-amber-200/60 font-mono text-sm font-black leading-none ${
                     timeLeft < 60 ? 'bg-rose-50 text-rose-600 border-rose-200 animate-pulse' : ''
                  }`}>
                     <span>{formatTime(timeLeft)}</span>
                     <Clock size={15} className={`${timeLeft < 60 ? 'text-rose-500' : 'text-amber-500'}`} />
                  </div>
               )}
            </div>
         </div>

         {/* 3. Splitted Work layout: Question Area (left) + Question Map sidebar (right) */}
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT AREA: Question Card */}
            <div className="lg:col-span-9 space-y-4">
               <motion.div 
                 key={currentQuestionIndex}
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: -20 }}
                 transition={{ duration: 0.25 }}
                 className="bg-white rounded-3xl border border-slate-200/50 p-6 md:p-8 shadow-md relative overflow-hidden"
               >
                  {/* Progress Line */}
                  <div className="absolute top-0 inset-x-0 h-1.5 bg-slate-100">
                     <div 
                       className="h-full bg-emerald-500 transition-all duration-300"
                       style={{ width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }}
                     />
                  </div>

                  <div className="text-right space-y-6 pt-2">
                     {/* Question Indicator Badge */}
                     <div>
                        <span className="text-xs text-slate-400 font-bold">سؤال رقم {currentQuestionIndex + 1}:</span>
                     </div>

                     {/* Dynamic Text with rich typeface */}
                     <h3 className="text-xl md:text-2xl font-extrabold text-slate-900 leading-relaxed max-w-3xl">
                        {currentQuestion.text}
                     </h3>

                     {/* Image in Question (if available) */}
                     {currentQuestion.imageUrl && (
                        <div className="my-4 max-w-xl mx-auto rounded-2xl overflow-hidden border border-slate-200/60 shadow-sm bg-slate-50 p-2 transform rotate-1 hover:rotate-0 transition-transform">
                           <img 
                             src={currentQuestion.imageUrl} 
                             alt="توضيح بصري للسؤال" 
                             className="w-full max-h-[300px] object-contain rounded-xl mx-auto"
                             referrerPolicy="no-referrer"
                           />
                        </div>
                     )}

                     {/* Answers Option boxes beautifully colored in dynamic celestial/teal shade (per request!) */}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                        {currentQuestion.options.map((option, idx) => {
                           const letterCode = idx === 0 ? 'أ' : idx === 1 ? 'ب' : idx === 2 ? 'ج' : 'د';
                           const isSelected = answers[currentQuestionIndex] === idx;
                           
                           return (
                              <button
                                key={idx}
                                onClick={() => handleSelectOption(idx)}
                                className={`group p-4 rounded-2xl border-2 text-right transition-all flex items-center justify-between gap-4 scale-active active:scale-[0.98] duration-200 cursor-pointer ${
                                  isSelected 
                                    ? 'bg-[#e0f2fe] text-[#0369a1] border-[#0ea5e9] ring-4 ring-[#0ea5e9]/10 shadow-md shadow-[#0ea5e9]/5' 
                                    : 'bg-[#f0f9ff]/30 text-slate-700 border-slate-100 hover:border-[#bae6fd] hover:bg-[#e0f2fe]/40'
                                }`}
                              >
                                 <div className="flex items-center gap-3.5 flex-1 min-w-0">
                                    {/* Double ring radio button */}
                                    <div className={`w-5.5 h-5.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                      isSelected 
                                        ? 'border-[#0ea5e9] bg-white' 
                                        : 'border-slate-300 bg-white group-hover:border-[#0ea5e9]'
                                    }`}>
                                       {isSelected && (
                                          <div className="w-2.5 h-2.5 rounded-full bg-[#0ea5e9]" />
                                       )}
                                    </div>

                                    {/* Option text content and visual thumbnail optionally */}
                                    <div className="flex flex-col gap-1 min-w-0">
                                       {currentQuestion.optionImages?.[idx] && (
                                         <img 
                                           src={currentQuestion.optionImages[idx]} 
                                           alt="" 
                                           className="w-full max-h-24 object-contain rounded-lg border border-slate-200 shadow-sm"
                                           referrerPolicy="no-referrer" 
                                         />
                                       )}
                                       <span className="text-base font-extrabold truncate leading-snug">{option}</span>
                                    </div>
                                 </div>

                                 {/* Arabic letter box (A, B, C, D) inside on the far left (as shown in image) */}
                                 <div className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center transition-all shrink-0 ${
                                    isSelected 
                                      ? 'bg-[#0ea5e9] text-white shadow-sm' 
                                      : 'bg-white/80 border border-slate-200 text-slate-500 group-hover:bg-[#bae6fd]/30 group-hover:text-[#0369a1]'
                                 }`}>
                                    {letterCode}
                                 </div>
                              </button>
                           );
                        })}
                     </div>


                  </div>

                  {/* Actions navigation bottom bar inside the card container */}
                  <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between gap-4">
                     {/* "السابق" Button */}
                     <button
                       onClick={handlePrev}
                       disabled={currentQuestionIndex === 0}
                       className={`px-5 py-3 rounded-2xl text-xs font-black border transition-all flex items-center gap-1 cursor-pointer active:scale-[0.98] ${
                          currentQuestionIndex === 0 
                            ? 'bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed' 
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-sm'
                       }`}
                     >
                        السابق
                     </button>



                     {/* "التالي" or "إنهاء الاختبار" in green */}
                     {currentQuestionIndex < quiz.questions.length - 1 ? (
                        <button
                          onClick={handleNext}
                          className="px-6 py-3 bg-[#10b981] hover:bg-[#059669] text-white rounded-2xl text-xs font-black shadow-md shadow-emerald-100 hover:scale-[1.02] transition-all flex items-center gap-1 cursor-pointer leading-none active:scale-[0.98]"
                        >
                           <span>التالي</span>
                           <ChevronLeft size={16} className="rotate-180" />
                        </button>
                     ) : (
                        <button
                          onClick={handleNext}
                          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black shadow-lg shadow-emerald-100 hover:scale-[1.02] transition-all flex items-center gap-1.5 cursor-pointer leading-none active:scale-[0.98]"
                        >
                           <Check size={15} />
                           <span>إنهاء وتسليم الاختبار</span>
                        </button>
                     )}
                  </div>
               </motion.div>
            </div>

            {/* RIGHT SIDEBAR: Question Map ("خريطة الأسئلة") perfectly styled like the screenshot */}
            <div className="lg:col-span-3">
               <div className="bg-white rounded-3xl border border-slate-200/50 p-5 shadow-md space-y-5 text-right">
                  <div>
                     <h3 className="font-extrabold text-slate-800 text-sm leading-none flex items-center gap-2">
                        <FileText size={16} className="text-emerald-500" />
                        خريطة الأسئلة
                     </h3>
                     <p className="text-[10px] text-slate-400 font-bold mt-1.5 leading-tight">اضغط على أي رقم للمراجعة والتنقل السريع</p>
                  </div>

                  {/* Bubbles collection */}
                  <div className="grid grid-cols-5 gap-2.5 pt-2">
                     {quiz.questions.map((_, i) => {
                        const isCurrent = i === currentQuestionIndex;
                        const isAnswered = answers[i] !== undefined;

                        let bubbleStyle = "bg-white text-slate-400 border border-slate-200 hover:border-slate-300";
                        if (isCurrent) {
                           bubbleStyle = "border-2 border-emerald-500 text-emerald-600 bg-[#e6f4ea]/45 font-extrabold shadow-sm scale-110";
                        } else if (isAnswered) {
                           bubbleStyle = "bg-emerald-500 text-white border border-emerald-500 font-bold shadow-sm shadow-emerald-100";
                        }

                        return (
                           <button
                             key={i}
                             onClick={() => handleNavigateToQuestion(i)}
                             className={`w-10 h-10 rounded-xl mx-auto flex items-center justify-center text-xs transition-all cursor-pointer ${bubbleStyle}`}
                           >
                              {i + 1}
                           </button>
                        );
                     })}
                  </div>

                  {/* Standard legend identical indicator circles */}
                  <div className="border-t border-slate-100 pt-4 space-y-2 text-[10px] text-slate-500 font-bold leading-normal">
                     <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        <span>مجاب عنه</span>
                     </div>
                     <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full border border-slate-200 bg-white" />
                        <span>غير مجاب</span>
                     </div>
                     <div className="flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full border-2 border-emerald-500 bg-[#e6f4ea]/50" />
                        <span>السؤال الحالي</span>
                     </div>
                  </div>
               </div>
            </div>

         </div>
      </main>
    </div>
  );
}
