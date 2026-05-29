import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Quiz, MCQQuestion, Student } from '../types';
import { CheckCircle2, XCircle, ChevronRight, Award, X, Users, ChevronDown, LayoutDashboard, TrendingUp, ShieldCheck, ChevronLeft, BrainCircuit } from 'lucide-react';
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
}

export function QuizPlayer({ quiz, student, classStudents, quizResults = [], onClose, onSelectStudent, allSkills, allSubjects }: QuizPlayerProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);

  const currentQuestion = quiz.questions[currentQuestionIndex];

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const hasSolved = (studentId: string) => {
    return quizResults.some(r => r.studentId === studentId && r.quizId === quiz.id);
  };

  // Reset progress when student changes
  useEffect(() => {
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setShowResult(false);
    setIsDropdownOpen(false);
  }, [student?.id]);

  const handleAnswer = (optionIndex: number) => {
    const newAnswers = [...answers, optionIndex];
    setAnswers(newAnswers);

    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Calculate score and save
      const correctCount = newAnswers.reduce((acc, ans, idx) => {
        return acc + (ans === quiz.questions[idx].correctAnswerIndex ? 1 : 0);
      }, 0);
      const score = Math.round((correctCount / quiz.questions.length) * 100);
      
      // Only save if it's a real student taking the quiz
      if (student) {
        firestoreService.saveQuizResult({
          studentId: student.id,
          quizId: quiz.id,
          score,
          answers: newAnswers,
          subjectId: quiz.subjectIds?.[0] || '',
          subjectIds: quiz.subjectIds
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
                 '2024-2025'
              );
           });
        }
      }
      
      setShowResult(true);
    }
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

  if (showResult) {
    const correctCount = answers.reduce((acc, ans, idx) => {
      return acc + (ans === quiz.questions[idx].correctAnswerIndex ? 1 : 0);
    }, 0);
    const score = Math.round((correctCount / quiz.questions.length) * 100);

    return (
      <div className="fixed inset-0 bg-indigo-900 z-[70] flex items-center justify-center p-8 text-white" dir="rtl">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full text-center space-y-8"
        >
          <div className="w-32 h-32 bg-yellow-400 rounded-full flex items-center justify-center mx-auto shadow-2xl animate-bounce">
             <Award size={64} className="text-indigo-900" />
          </div>
          <div>
            <h2 className="text-4xl font-black mb-2">{student ? `أحسنت يا ${student.name}!` : 'اكتمل وضع المعاينة'}</h2>
            <p className="text-indigo-200 font-bold">لقد أتممت اختبار {quiz.title}</p>
          </div>
          
          <div className="bg-white/10 rounded-3xl p-8 backdrop-blur-md border border-white/10">
             <p className="text-6xl font-black text-yellow-400 mb-2">{score}%</p>
             <p className="text-sm font-bold opacity-70">لقد أجبت بشكل صحيح على {correctCount} من أصل {quiz.questions.length} أسئلة.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={onClose}
              className="py-5 bg-white/10 text-white rounded-2xl font-black text-lg border border-white/20 hover:bg-white/20 transition-all font-sans"
            >
              العودة للرئيسية
            </button>
            {classStudents && student && classStudents.findIndex(s => s.id === student.id) < classStudents.length - 1 && (
              <button 
                onClick={handleNextStudent}
                className="py-5 bg-white text-indigo-900 rounded-2xl font-black text-lg shadow-2xl hover:scale-105 transition-transform"
              >
                الطالب التالي
              </button>
            )}
          </div>

          <div className="mt-8 pt-8 border-t border-white/10 space-y-4">
             <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">تحديث المؤشرات والتقارير</p>
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col items-center gap-2">
                   <TrendingUp size={20} className="text-indigo-400" />
                   <span className="text-[9px] font-black">مؤشر المرحلة محدث</span>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 flex flex-col items-center gap-2">
                   <ShieldCheck size={20} className="text-emerald-400" />
                   <span className="text-[9px] font-black">مؤشر الصف محدث</span>
                </div>
             </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-50 z-[70] flex flex-col animate-in fade-in fill-mode-both" dir="rtl">
      <header className="bg-white h-16 border-b border-slate-100 flex items-center justify-between px-6 relative z-[80] shadow-sm">
         <div className="flex items-center gap-4">
            <div className="bg-indigo-600 text-white w-10 h-10 rounded-xl flex items-center justify-center font-black text-base shadow-md shadow-indigo-100">
               {currentQuestionIndex + 1}
            </div>
            <div>
               <h2 className="text-base font-black text-slate-900 leading-tight">{quiz.title}</h2>
               <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                     {classStudents && student && classStudents.length > 1 && (
                       <button 
                         onClick={handlePrevStudent}
                         className="w-8 h-8 rounded-lg text-slate-400 hover:bg-white hover:text-indigo-600 transition-all flex items-center justify-center"
                         title="الطالب السابق"
                       >
                          <ChevronLeft size={14} />
                       </button>
                     )}
                     
                     <div className="relative px-3">
                        <button 
                          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                          className="flex items-center gap-1.5 text-slate-700 font-black text-[10px]"
                        >
                           <Users size={12} className="text-indigo-600" />
                           {student ? student.name : 'وضع المعاينة'}
                        </button>
                        
                        <AnimatePresence>
                           {isDropdownOpen && classStudents && onSelectStudent && (
                             <motion.div 
                               initial={{ opacity: 0, y: 10, scale: 0.95 }}
                               animate={{ opacity: 1, y: 0, scale: 1 }}
                               exit={{ opacity: 0, y: 10, scale: 0.95 }}
                               className="absolute top-full right-0 w-64 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 z-[90] overflow-hidden"
                             >
                                <div className="max-h-60 overflow-y-auto scrollbar-hide">
                                   {classStudents.map(s => {
                                      const solved = hasSolved(s.id);
                                      return (
                                         <button 
                                           key={s.id} 
                                           onClick={() => { onSelectStudent(s); setIsDropdownOpen(false); }} 
                                           className={`w-full text-right px-4 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-between group ${student && s.id === student.id ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
                                         >
                                            <div className="flex items-center gap-2">
                                               {s.name}
                                               {solved && <CheckCircle2 size={12} className="text-emerald-500" />}
                                            </div>
                                            {student && s.id === student.id && <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />}
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
                         className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-1"
                       >
                         التالي <ChevronRight size={10} className="rotate-180" />
                       </button>
                     )}
                  </div>
               </div>
            </div>
         </div>
         
         <div className="flex items-center gap-4">
            <div className="hidden md:flex gap-1.5">
               {quiz.questions.map((_, i) => (
                 <div 
                   key={i} 
                   className={`h-1.5 rounded-full transition-all duration-500 ${
                     i === currentQuestionIndex ? 'bg-indigo-600 w-8' :
                     i < currentQuestionIndex ? 'bg-emerald-500 w-3' : 'bg-slate-200 w-3'
                   }`} 
                 />
               ))}
            </div>
            <div className="w-[1px] h-8 bg-slate-100 mx-2 hidden md:block" />
            <button 
              onClick={onClose} 
              className="h-12 px-6 flex items-center justify-center gap-2 rounded-2xl bg-slate-50 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all border border-slate-100 shadow-sm hover:shadow-md font-black text-xs"
              title="خروج من الاختبار"
            >
               <X size={18} />
               <span>خروج</span>
            </button>
         </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50/50 relative overflow-hidden">
         {quiz.imageUrl && (
           <div className="absolute inset-0 z-0 opacity-10 filter blur-3xl pointer-events-none">
             <img src={quiz.imageUrl} alt="Quiz Background" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
           </div>
         )}
         <motion.div 
           key={currentQuestionIndex}
           initial={{ x: 30, opacity: 0 }}
           animate={{ x: 0, opacity: 1 }}
           className={`max-w-4xl w-full flex flex-col ${currentQuestion.imageUrl ? 'lg:flex-row' : ''} gap-8 items-center bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 z-10`}
         >
            <div className="flex-1 flex flex-col gap-6 text-center lg:text-right">
               {quiz.imageUrl && currentQuestionIndex === 0 && (
                 <img src={quiz.imageUrl} alt="Quiz" className="w-full h-48 object-cover rounded-xl mb-4 border border-slate-100 shadow-sm" referrerPolicy="no-referrer" />
               )}
               <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-widest">السؤال {currentQuestionIndex + 1}</span>
                  <div className="flex items-center gap-1 text-[10px] font-black text-slate-400">
                     <BrainCircuit size={12} className="text-slate-300" />
                     {quiz.questions.length} أسئلة إجمالية
                  </div>
               </div>
               <h3 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight">
                  {currentQuestion.text}
               </h3>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentQuestion.options.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAnswer(idx)}
                      className="group bg-white p-5 rounded-3xl border-2 border-slate-100 text-right hover:border-indigo-600 hover:ring-4 hover:ring-indigo-50 transition-all flex items-center justify-between gap-4 shadow-sm"
                    >
                       <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm transition-all ${idx === 0 ? 'bg-blue-50 text-blue-600' : idx === 1 ? 'bg-purple-50 text-purple-600' : idx === 2 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                             {idx === 0 ? 'أ' : idx === 1 ? 'ب' : idx === 2 ? 'ج' : 'د'}
                          </div>
                          <div className="flex flex-col gap-1 min-w-0">
                             {currentQuestion.optionImages?.[idx] && (
                               <img src={currentQuestion.optionImages[idx]} alt="" className="w-full h-20 rounded-xl object-cover mb-1 bg-slate-50 border border-slate-100" referrerPolicy="no-referrer" />
                             )}
                             <span className="text-lg font-black text-slate-800 truncate">{option}</span>
                          </div>
                       </div>
                       <div className="w-6 h-6 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-300 group-hover:border-indigo-600 group-hover:bg-indigo-600 group-hover:text-white shrink-0 transition-all">
                          <ChevronRight size={14} className="rotate-180" />
                       </div>
                    </button>
                  ))}
               </div>
            </div>

            {currentQuestion.imageUrl && (
               <div className="lg:w-1/3 w-full shrink-0">
                  <div className="bg-white p-3 rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden transform rotate-2 hover:rotate-0 transition-all hover:scale-105 duration-500">
                     <img 
                       src={currentQuestion.imageUrl} 
                       alt="Question visual" 
                       className="w-full h-auto rounded-[1.8rem] object-cover max-h-[400px] mx-auto shadow-inner"
                       referrerPolicy="no-referrer"
                     />
                  </div>
               </div>
            )}
         </motion.div>
      </main>
    </div>
  );
}
