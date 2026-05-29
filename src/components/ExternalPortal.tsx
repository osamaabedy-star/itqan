import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  LogIn, 
  UserCheck, 
  ClipboardCheck, 
  History, 
  LayoutDashboard, 
  Search, 
  FileText, 
  TrendingUp, 
  ArrowRight, 
  Save,
  Plus,
  X,
  User as UserIcon,
  ChevronRight,
  LogOut,
  Calendar,
  Users,
  Award,
  Star as StarIcon,
  Zap,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  PenTool,
  CheckSquare,
  BookOpen,
  UserPlus,
  Activity
} from 'lucide-react';
import { AppData, Evaluations, Teacher, Class, Student, ExternalProfile, Visit, Rubric, QuizSignature } from '../types';
import { firestoreService } from '../services/firestoreService';

interface ExternalPortalProps {
  data: AppData;
  evaluations: Evaluations;
  academicYear: string;
  onClose: () => void;
}

export function ExternalPortal({ data, evaluations, academicYear, onClose }: ExternalPortalProps) {
  const [profile, setProfile] = useState<ExternalProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [idInput, setIdInput] = useState('');
  const [error, setError] = useState('');

  // Tab selections
  const [teacherTab, setTeacherTab] = useState<'dashboard' | 'quizzes' | 'priority'>('dashboard');
  const [supervisorTab, setSupervisorTab] = useState<'visits' | 'reports'>('visits');

  // Supervisor Form State
  const [isAddingVisit, setIsAddingVisit] = useState(false);
  const [targetTeacherId, setTargetTeacherId] = useState('');
  const [targetClassId, setTargetClassId] = useState('');
  const [selectedRubricId, setSelectedRubricId] = useState('');
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [lessonPeriod, setLessonPeriod] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [lessonTitle, setLessonTitle] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentQuizScores, setStudentQuizScores] = useState<Record<string, number>>({});
  const [quizText, setQuizText] = useState('');
  const [quizMaxScore, setQuizMaxScore] = useState<number>(10);
  const [evaluationData, setEvaluationData] = useState<Record<string, number>>({});

  // Signature state
  const [signingItem, setSigningItem] = useState<{ type: 'visit' | 'quiz'; id: string } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [signType, setSignType] = useState<'draw' | 'type'>('draw');

  // Teacher Profile Calculations
  const activeTeacherId = profile?.linkedTeacherId;
  const activeTeacherObj = data.teachers.find(t => t.id === activeTeacherId);

  // Get active teacher classes
  const teacherClasses = data.classes.filter(c => {
    if (!activeTeacherId) return false;
    if (c.isArchived) return false;
    if (c.teacherIds?.includes(activeTeacherId)) return true;
    
    // Taught through subjects mapped to the grade
    const tSubjects = data.subjects.filter(s => s.teacherId === activeTeacherId || s.teacherIds?.includes(activeTeacherId));
    return tSubjects.some(s => s.gradeId === c.gradeId && (!s.classIds || s.classIds.length === 0 || s.classIds.includes(c.id)));
  });

  const teacherSubjects = data.subjects.filter(s => {
    if (!activeTeacherId) return false;
    return s.teacherId === activeTeacherId || s.teacherIds?.includes(activeTeacherId);
  });

  // Failing and priority support students (الطلاب المخفقين)
  const weakStudentsList = data.students
    .filter(s => !s.isArchived && teacherClasses.some(tc => tc.id === s.classId))
    .map(student => {
       const results = data.quizResults?.filter(r => r.studentId === student.id) || [];
       const avgQuiz = results.length > 0 ? results.reduce((sum, r) => sum + r.score, 0) / results.length : null;
       
       const weakSkills: string[] = [];
       data.skills.forEach(skill => {
          const evalKey = `${student.id}-${skill.id}-${academicYear}`;
          const evaluation = evaluations[evalKey];
          if (evaluation && (evaluation.score === 'weak' || evaluation.score === 'very-weak')) {
             weakSkills.push(skill.name);
          }
       });

       return {
          student,
          avgQuiz,
          weakSkills,
          isDeficient: (avgQuiz !== null && avgQuiz < 50) || weakSkills.length > 0
       };
    })
    .filter(item => item.isDeficient);

  const teacherQuizzes = data.quizzes.filter(q => {
    if (q.isArchived) return false;
    if (q.teacherId === activeTeacherId) return true;
    const targetMatches = q.classIds?.some(cid => teacherClasses.some(tc => tc.id === cid));
    if (targetMatches) return true;
    const subjectMatches = q.subjectIds?.some(sid => teacherSubjects.some(ts => ts.id === sid));
    return subjectMatches;
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idInput.trim()) return;
    
    setLoading(true);
    setError('');
    try {
      const p = await firestoreService.getExternalProfile(idInput);
      if (p) {
        setProfile(p as ExternalProfile);
        localStorage.setItem('external_id', idInput);
      } else {
        setError('عذراً، رقم الهوية هذا غير مسجل في النظام كحساب خارجي');
      }
    } catch (err) {
      setError('حدث خطأ أثناء التحقق من البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setProfile(null);
    setIdInput('');
    localStorage.removeItem('external_id');
  };

  useEffect(() => {
    const savedId = localStorage.getItem('external_id');
    if (savedId) {
      setIdInput(savedId);
      const verify = async () => {
        const p = await firestoreService.getExternalProfile(savedId);
        if (p) setProfile(p as ExternalProfile);
      };
      verify();
    }
  }, []);

  const handleSaveVisit = async () => {
    if (!targetTeacherId || !visitDate || !subjectId || !lessonPeriod || !lessonTitle || !targetClassId) {
      alert('يجب تعبئة المعلم، تاريخ الزيارة، المادة، الحصة، عنوان الدرس، وتحديد الفصل');
      return;
    }
    
    const id = 'visit_' + Date.now();
    await firestoreService.saveItem('visits', id, {
      teacherId: targetTeacherId,
      rubricId: selectedRubricId,
      date: visitDate,
      notes,
      lessonPeriod,
      subjectId,
      lessonTitle,
      supervisorName: profile?.name,
      supervisorId: profile?.id,
      selectedStudentIds,
      studentQuizScores,
      quizText,
      quizMaxScore,
      evaluationData,
      isArchived: false,
      targetClassId
    });
    
    setIsAddingVisit(false);
    resetVisitForm();
    alert('تم اعتماد الزيارة بنجاح ومشاركتها مع المعلم');
  };

  const resetVisitForm = () => {
    setTargetTeacherId('');
    setTargetClassId('');
    setSelectedRubricId('');
    setVisitDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setLessonPeriod('');
    setSubjectId('');
    setLessonTitle('');
    setSelectedStudentIds([]);
    setStudentQuizScores({});
    setQuizText('');
    setQuizMaxScore(10);
    setEvaluationData({});
  };

  // Canvas Drawing Handlers for Electronic Signatures
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#312e81'; // Dark Indigo/Charcoal

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSaveSignature = async () => {
    if (!signingItem) return;
    if (signType === 'type' && !signerName.trim()) {
      alert('يرجى كتابة الاسم الثلاثي قبل اعتماد التوقيع');
      return;
    }

    let signatureUri = '';
    if (signType === 'draw' && canvasRef.current) {
      signatureUri = canvasRef.current.toDataURL();
    }

    try {
      if (signingItem.type === 'visit') {
        const visit = data.visits.find(v => v.id === signingItem.id);
        if (visit) {
          await firestoreService.saveItem('visits', visit.id, {
            ...visit,
            signed: true,
            signatureName: signerName || profile?.name || '',
            signatureData: signatureUri,
            signedAt: new Date().toISOString()
          });
        }
      } else if (signingItem.type === 'quiz') {
        const sigId = `${signingItem.id}_${activeTeacherId}`;
        await firestoreService.saveItem('quizSignatures', sigId, {
          id: sigId,
          quizId: signingItem.id,
          teacherId: activeTeacherId || '',
          teacherName: profile?.name || '',
          signed: true,
          signedAt: new Date().toISOString(),
          signatureData: signatureUri,
          signatureText: signerName || profile?.name || ''
        });
      }

      alert('تم التوقيع الإلكتروني وتأكيد الاطلاع بنجاح');
      setSigningItem(null);
      setSignerName('');
    } catch (err: any) {
      alert('حدث خطأ أثناء حفظ التوقيع: ' + err.message);
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-955 flex items-center justify-center p-6 relative overflow-hidden" style={{ backgroundColor: '#0f172a' }} dir="rtl">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-650/10 rounded-full blur-[120px] -mr-64 -mt-64" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-650/5 rounded-full blur-[100px] -ml-48 -mb-48" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white/5 backdrop-blur-2xl p-10 rounded-[48px] border border-white/10 shadow-2xl relative z-10"
        >
          <div className="text-center mb-10">
             <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-950/50">
                <ShieldCheck className="text-white w-10 h-10" />
             </div>
             <h1 className="text-2xl font-black text-white mb-2 tracking-tight">بوابة إتقان للمنسوبين</h1>
             <p className="text-indigo-300 font-medium text-sm">التوجيه الإشرافي والمتابعة التحليلية</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-indigo-300/60 uppercase tracking-widest mr-2">أدخل رقم الهوية</label>
              <input 
                type="text"
                value={idInput}
                onChange={(e) => setIdInput(e.target.value)}
                placeholder="0000000000"
                className="w-full h-16 bg-white/10 border border-white/10 rounded-3xl px-8 text-white font-black text-xl text-center outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all placeholder:text-white/20"
              />
            </div>

            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 bg-rose-500/20 text-rose-300 p-4 rounded-2xl text-xs font-bold border border-rose-500/20">
                <X size={16} />
                {error}
              </motion.div>
            )}

            <button 
              disabled={loading || !idInput}
              className="w-full h-16 bg-white text-indigo-950 rounded-3xl font-black text-lg flex items-center justify-center gap-3 hover:bg-indigo-50 transition-all disabled:opacity-30 shadow-xl shadow-black/20"
            >
              {loading ? (
                <div className="w-6 h-6 border-4 border-indigo-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>التحقق والدخول</span>
                  <LogIn size={20} />
                </>
              )}
            </button>
          </form>

          <button onClick={onClose} className="w-full mt-8 text-white/40 font-bold text-xs hover:text-white transition-colors flex items-center justify-center gap-2">
            <ArrowRight size={14} />
            العودة للمنصة الرئيسية
          </button>
        </motion.div>
      </div>
    );
  }

  const SCORE_LABELS: Record<number, string> = {
    4: 'متميز',
    3: 'جيد جداً',
    2: 'جيد',
    1: 'يحتاج تطوير'
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans overflow-hidden relative" dir="rtl">
       
       {/* Signature Overlay Modal */}
       <AnimatePresence>
         {signingItem && (
           <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4 z-[9999]" dir="rtl">
             <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="bg-white rounded-[40px] max-w-md w-full p-8 shadow-2xl border border-slate-100 space-y-6"
             >
               <div className="flex justify-between items-center">
                 <h3 className="text-xl font-black text-slate-900">التوقيع الإلكتروني للاطلاع</h3>
                 <button onClick={() => setSigningItem(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                   <X size={16} />
                 </button>
               </div>

               <p className="text-xs text-slate-500 leading-relaxed font-medium">
                 بتوقيعك أدناه، تؤكد اطلاعك المباشر وفهمك لتقرير {signingItem.type === 'visit' ? 'الزيارة الإشرافية والتوصيات المستنتجة' : 'الاختبار التحصيلي والمهارات المقترحة'} من قبل إدارة المدرسة والمشرف المختص.
               </p>
               
               <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-2">
                 <button 
                   type="button"
                   onClick={() => setSignType('draw')}
                   className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${signType === 'draw' ? 'bg-white text-indigo-950 shadow-sm' : 'text-slate-500'}`}
                 >
                   رسم التوقيع باليد (توقيع حي)
                 </button>
                 <button 
                   type="button"
                   onClick={() => setSignType('type')}
                   className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${signType === 'type' ? 'bg-white text-indigo-950 shadow-sm' : 'text-slate-500'}`}
                 >
                   توقيع بالاسم الثلاثي
                 </button>
               </div>

               <div className="space-y-2">
                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mr-1">الاسم الكامل للموقع</label>
                 <input 
                   type="text"
                   value={signerName}
                   onChange={(e) => setSignerName(e.target.value)}
                   placeholder="اكتب اسمك الثلاثي للتفويض..."
                   className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-4 text-sm font-black outline-none focus:ring-4 focus:ring-indigo-100/50"
                 />
               </div>

               {signType === 'draw' ? (
                 <div className="space-y-2">
                   <label className="block text-[10px] font-black text-slate-400 mr-1">ارسم توقيعك في المساحة أدناه:</label>
                   <div className="relative border border-slate-200 rounded-3xl bg-slate-50 overflow-hidden">
                     <canvas 
                       ref={canvasRef}
                       width={380}
                       height={180}
                       onMouseDown={startDrawing}
                       onMouseMove={draw}
                       onMouseUp={stopDrawing}
                       onMouseLeave={stopDrawing}
                       onTouchStart={startDrawing}
                       onTouchMove={draw}
                       onTouchEnd={stopDrawing}
                       className="w-full h-[180px] cursor-crosshair touch-none bg-indigo-50/5"
                     />
                     <button 
                       type="button"
                       onClick={clearCanvas}
                       className="absolute bottom-3 left-3 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-600 font-bold text-[10px] border border-slate-200 rounded-xl shadow-sm transition-colors"
                     >
                       مسح اللوحة
                     </button>
                   </div>
                 </div>
               ) : (
                 <div className="p-10 border border-dashed border-indigo-200 bg-indigo-50/10 rounded-3xl flex items-center justify-center text-center">
                   <span className="font-serif italic text-3xl text-indigo-900 tracking-wider">
                     {signerName || 'سيظهر خط التوقيع هنا'}
                   </span>
                 </div>
               )}

               <div className="flex gap-4 pt-2">
                 <button 
                   onClick={handleSaveSignature}
                   className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white h-16 rounded-2xl text-sm font-black transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-100"
                 >
                   <PenTool size={16} />
                   اعتماد وحفظ التوقيع
                 </button>
                 <button 
                   onClick={() => { setSigningItem(null); setSignerName(''); }}
                   className="px-6 bg-slate-100 hover:bg-slate-200 text-slate-500 h-16 rounded-2xl text-sm font-black transition-colors"
                 >
                   إلغاء
                 </button>
               </div>
             </motion.div>
           </div>
         )}
       </AnimatePresence>

       {/* Header */}
       <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shrink-0 shadow-sm relative z-20">
          <div className="flex items-center gap-4">
             <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
                <ShieldCheck className="text-white w-6 h-6" />
             </div>
             <div>
                <h1 className="text-sm font-black text-slate-900 leading-none mb-1">بوابة إتقـان الإلكترونية</h1>
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none">External Portal</p>
             </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="text-right hidden sm:block">
                <p className="text-[10px] font-black text-slate-400 leading-none mb-1">مرحباً بك، {profile.role === 'supervisor' ? 'المشرف العام' : 'المعلم الفاضل/ة'}</p>
                <p className="text-xs font-black text-slate-800 leading-none">{profile.name}</p>
             </div>
             <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center">
                <UserIcon className="text-slate-400 w-5 h-5" />
             </div>
             <button onClick={handleLogout} className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all">
                <LogOut size={18} />
             </button>
          </div>
       </header>

       {/* Main Layout Area */}
       <main className="flex-1 overflow-y-auto p-4 md:p-10 pb-32">
          <div className="max-w-6xl mx-auto space-y-8">
             {profile.role === 'supervisor' ? (
                /* ========================================================= */
                /* SUPERVISOR VIEW                                           */
                /* ========================================================= */
                <div className="space-y-8">
                   
                   {/* Welcoming and Info */}
                   <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-[48px] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl">
                     <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
                        <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center text-amber-400 border border-white/15 shadow-inner">
                           <ShieldCheck size={48} />
                        </div>
                        <div className="text-center md:text-right">
                           <h2 className="text-2xl font-black mb-2">لوحة المشرف العام: {profile.name}</h2>
                           <p className="text-indigo-200 font-medium text-sm leading-relaxed max-w-2xl">
                             بوابة الإشراف الشامل لمراقبة تقارير الجودة، ونسبة إنجاز المعلمين، وتقارير التحصيل النهائي للفصول، مع رصد التواقيع الإلكترونية للمعلمين.
                           </p>
                        </div>
                     </div>
                     <div className="absolute top-0 left-0 w-80 h-80 bg-white/5 rounded-full -ml-40 -mt-40 blur-3xl opacity-35" />
                   </div>

                   {/* Tabs Menu */}
                   <div className="flex bg-slate-250 p-1 bg-slate-200/50 rounded-2xl w-fit gap-2">
                     <button 
                       onClick={() => setSupervisorTab('visits')}
                       className={`px-8 py-3 text-sm font-black rounded-xl transition-all flex items-center gap-2 ${supervisorTab === 'visits' ? 'bg-indigo-650 bg-indigo-600 text-white shadow-md' : 'text-slate-600'}`}
                     >
                       <ClipboardCheck size={16} />
                       تسجيل ومراقبة الزيارات
                     </button>
                     <button 
                       onClick={() => setSupervisorTab('reports')}
                       className={`px-8 py-3 text-sm font-black rounded-xl transition-all flex items-center gap-2 ${supervisorTab === 'reports' ? 'bg-indigo-650 bg-indigo-600 text-white shadow-md' : 'text-slate-600'}`}
                     >
                       <Activity size={16} />
                       التقارير النهائية وضمان الجودة
                     </button>
                   </div>

                   {/* Tab Content switch */}
                   {supervisorTab === 'visits' ? (
                     <div className="space-y-8">
                        {/* Upper Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                           <button 
                             onClick={() => setIsAddingVisit(true)}
                             className="bg-indigo-600 p-8 rounded-[40px] text-white flex flex-col gap-4 text-right shadow-2xl shadow-indigo-100 hover:-translate-y-1 transition-all group overflow-hidden relative"
                           >
                              <div className="relative z-10">
                                <Plus size={32} className="mb-2" />
                                <h3 className="text-xl font-black">تسجيل زيارة جديدة</h3>
                                <p className="text-indigo-100/60 text-xs font-bold">ابدأ بربط معلم وفصل لتسجيل الأداء الفني</p>
                              </div>
                              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-white/10 rounded-full rotate-12 group-hover:scale-125 transition-transform" />
                           </button>

                           <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col justify-between">
                              <div>
                                <History className="text-indigo-600 mb-4" size={24} />
                                <h3 className="text-lg font-black text-slate-800">إحصائيات زياراتي</h3>
                                <p className="text-slate-400 text-[10px] font-bold">إجمالي الزيارات التي قمت باعتمادها</p>
                              </div>
                              <div className="text-4xl font-black text-indigo-600 mt-4">
                                 {data.visits.filter(v => v.supervisorId === profile.id || v.supervisorName === profile.name).length}
                              </div>
                           </div>

                           <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col justify-between">
                              <div>
                                <Users className="text-amber-500 mb-4" size={24} />
                                <h3 className="text-lg font-black text-slate-800">المعلمون بالمنظومة</h3>
                                <p className="text-slate-400 text-[10px] font-bold">إجمالي الكادر التعليمي النشط</p>
                              </div>
                              <div className="text-4xl font-black text-amber-500 mt-4">
                                 {data.teachers.filter(t => !t.isArchived).length}
                              </div>
                           </div>
                        </div>

                        {/* Visit Adding form */}
                        {isAddingVisit && (
                          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-10 rounded-[48px] border border-slate-200 shadow-2xl space-y-8">
                             <div className="flex justify-between items-center mb-4">
                                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                                   <ClipboardCheck className="text-indigo-600" />
                                   تسجيل نموذج زيارة إشرافية
                                </h2>
                                <button onClick={() => { setIsAddingVisit(false); resetVisitForm(); }} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                   <X size={20} />
                                </button>
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div>
                                   <label className="block text-xs font-black text-slate-400 mb-2 uppercase mr-2">المعلم المزار</label>
                                   <select 
                                     value={targetTeacherId}
                                     onChange={(e) => setTargetTeacherId(e.target.value)}
                                     className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-4 font-black outline-none focus:ring-4 focus:ring-indigo-50 transition-all"
                                   >
                                      <option value="">اختر المعلم...</option>
                                      {data.teachers.filter(t => !t.isArchived).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                   </select>
                                </div>

                                <div>
                                   <label className="block text-xs font-black text-slate-400 mb-2 uppercase mr-2">التاريخ</label>
                                   <input 
                                     type="date"
                                     value={visitDate}
                                     onChange={(e) => setVisitDate(e.target.value)}
                                     className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-4 font-black outline-none focus:ring-4 focus:ring-indigo-50"
                                   />
                                </div>

                                <div>
                                   <label className="block text-xs font-black text-slate-400 mb-2 uppercase mr-2">المادة</label>
                                   <select 
                                     value={subjectId}
                                     onChange={(e) => setSubjectId(e.target.value)}
                                     className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-4 font-black outline-none"
                                   >
                                      <option value="">اختر المادة...</option>
                                      {data.subjects.filter(s => !s.isArchived).map(s => <option key={s.id} value={s.id}>{s.name} - {data.grades.find(g => g.id === s.gradeId)?.name}</option>)}
                                   </select>
                                </div>

                                <div>
                                   <label className="block text-xs font-black text-slate-400 mb-2 uppercase mr-2">الحصة</label>
                                   <input 
                                     type="text"
                                     value={lessonPeriod}
                                     onChange={(e) => setLessonPeriod(e.target.value)}
                                     placeholder="مثال: الحصة الثالثة"
                                     className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-4 font-black outline-none"
                                   />
                                </div>

                                <div>
                                   <label className="block text-xs font-black text-slate-400 mb-2 uppercase mr-2">عنوان الدرس</label>
                                   <input 
                                     type="text"
                                     value={lessonTitle}
                                     onChange={(e) => setLessonTitle(e.target.value)}
                                     placeholder="ادخل عنوان الدرس..."
                                     className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-4 font-black outline-none"
                                   />
                                </div>

                                <div>
                                   <label className="block text-xs font-black text-slate-400 mb-2 uppercase mr-2">نموذج التقييم (الروباريك)</label>
                                   <select 
                                     value={selectedRubricId}
                                     onChange={(e) => setSelectedRubricId(e.target.value)}
                                     className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-4 font-black outline-none"
                                   >
                                      <option value="">اختر نموذجاً...</option>
                                      {data.rubrics?.filter(r => !r.isArchived).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                   </select>
                                </div>

                                <div className="md:col-span-3">
                                   <label className="block text-xs font-black text-slate-400 mb-2 uppercase mr-2">تحديد الفصل لاختيار الطلاب</label>
                                   <select 
                                     value={targetClassId}
                                     onChange={(e) => { setTargetClassId(e.target.value); setSelectedStudentIds([]); }}
                                     className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-4 font-black outline-none"
                                   >
                                      <option value="">اختر الفصل المزار...</option>
                                      {data.classes.filter(c => !c.isArchived).map(c => <option key={c.id} value={c.id}>{c.name} - {data.grades.find(g => g.id === c.gradeId)?.name}</option>)}
                                   </select>
                                </div>
                             </div>

                             {targetClassId && (
                                <div className="bg-slate-50 p-8 rounded-[40px] border border-slate-100 space-y-6">
                                   <div className="flex justify-between items-center mb-2">
                                      <h4 className="font-black text-slate-800 text-sm">اختيار عينة من الطلاب للتقويم القصير</h4>
                                      <span className="text-[10px] font-black text-slate-400">{selectedStudentIds.length} طلاب مختارين</span>
                                   </div>
                                   <div className="flex flex-wrap gap-2">
                                      {data.students.filter(s => s.classId === targetClassId && !s.isArchived).map(student => {
                                         const isSelected = selectedStudentIds.includes(student.id);
                                         return (
                                            <button 
                                               key={student.id}
                                               type="button"
                                               onClick={() => setSelectedStudentIds(prev => isSelected ? prev.filter(id => id !== student.id) : [...prev, student.id])}
                                               className={`px-4 py-2 rounded-xl text-xs font-black transition-all border ${isSelected ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
                                            >
                                               {student.name.split(' ')[0]} {student.name.split(' ')[1]}
                                            </button>
                                         );
                                      })}
                                   </div>

                                   {selectedStudentIds.length > 0 && (
                                      <div className="mt-8 pt-8 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-8">
                                         <div className="space-y-4">
                                            <label className="text-xs font-black text-slate-400 uppercase">نص سؤال الاختبار السريع</label>
                                            <input 
                                               type="text"
                                               value={quizText}
                                               onChange={(e) => setQuizText(e.target.value)}
                                               placeholder="ما هو ناتج 5+5؟"
                                               className="w-full h-14 bg-white border border-slate-200 rounded-2xl px-6 font-bold outline-none"
                                            />
                                            <div className="flex items-center gap-4">
                                               <label className="text-xs font-black text-slate-400 uppercase">الدرجة القصوى:</label>
                                               <input 
                                                  type="number"
                                                  value={quizMaxScore}
                                                  onChange={(e) => setQuizMaxScore(Number(e.target.value))}
                                                  className="w-20 h-12 bg-white border border-slate-200 rounded-xl px-4 font-black outline-none"
                                               />
                                            </div>
                                         </div>
                                         <div className="space-y-3">
                                            <label className="text-xs font-black text-slate-400 uppercase">درجات العينة:</label>
                                            {selectedStudentIds.map(sid => (
                                               <div key={sid} className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-100">
                                                  <span className="text-xs font-black text-slate-700">{data.students.find(s => s.id === sid)?.name}</span>
                                                  <input 
                                                     type="number"
                                                     value={studentQuizScores[sid] || 0}
                                                     onChange={(e) => setStudentQuizScores(prev => ({ ...prev, [sid]: Number(e.target.value) }))}
                                                     className="w-16 h-10 text-center bg-slate-50 border border-slate-200 rounded-xl font-black outline-none"
                                                  />
                                               </div>
                                            ))}
                                         </div>
                                      </div>
                                   )}
                                </div>
                             )}

                             {selectedRubricId && (
                                <div className="space-y-8">
                                   <h3 className="text-xl font-black text-slate-900">بنود التقويم الفني</h3>
                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                      {data.rubrics?.find(r => r.id === selectedRubricId)?.categories.map(cat => (
                                         <div key={cat.id} className="bg-slate-50 p-6 rounded-[32px] border border-slate-100 space-y-6">
                                            <h4 className="font-black text-indigo-700 text-sm border-b border-indigo-100 pb-3">{cat.title}</h4>
                                            <div className="space-y-4">
                                               {cat.items.map(item => (
                                                  <div key={item.id} className="space-y-2">
                                                     <p className="text-[11px] font-black text-slate-600">{item.title}</p>
                                                     <div className="flex gap-1.5">
                                                        {[4, 3, 2, 1].map(sc => (
                                                           <button 
                                                              key={sc}
                                                              type="button"
                                                              onClick={() => setEvaluationData(prev => ({ ...prev, [item.id]: sc }))}
                                                              className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all border ${evaluationData[item.id] === sc ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-400 border-slate-100 hover:border-indigo-200'}`}
                                                           >
                                                              {SCORE_LABELS[sc]}
                                                           </button>
                                                        ))}
                                                     </div>
                                                  </div>
                                               ))}
                                            </div>
                                         </div>
                                      ))}
                                   </div>
                                </div>
                             )}

                             <div>
                                <label className="block text-xs font-black text-slate-400 mb-2 uppercase mr-2">التوصيات والملاحظات الختامية</label>
                                <textarea 
                                  value={notes}
                                  onChange={(e) => setNotes(e.target.value)}
                                  rows={4}
                                  placeholder="اكتب انطباعك العام وتوصياتك للمعلم هنا..."
                                  className="w-full bg-slate-50 border border-slate-100 rounded-3xl p-6 font-medium text-slate-700 outline-none focus:ring-4 focus:ring-indigo-50 transition-all resize-none"
                                />
                             </div>

                             <div className="flex gap-4">
                                <button 
                                   onClick={handleSaveVisit}
                                   className="flex-1 bg-indigo-600 text-white h-20 rounded-3xl font-black text-xl flex items-center justify-center gap-3 shadow-2xl shadow-indigo-100 hover:bg-slate-900 transition-all"
                                >
                                   <Save size={24} />
                                   اعتماد الزيارة وإرسالها
                                </button>
                                <button 
                                  onClick={() => { setIsAddingVisit(false); resetVisitForm(); }}
                                  className="px-10 h-20 bg-slate-100 text-slate-500 rounded-3xl font-black text-lg hover:bg-slate-200 transition-all"
                                >إلغاء</button>
                             </div>
                          </motion.div>
                        )}

                        {/* Recent Supervision history */}
                        <div className="space-y-4">
                           <h3 className="text-xl font-black text-slate-900">سجل الزيارات الإشرافية الصادرة</h3>
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              {data.visits
                                .filter(v => v.supervisorId === profile.id || v.supervisorName === profile.name)
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                .map(visit => {
                                   const teacher = data.teachers.find(t => t.id === visit.teacherId);
                                   return (
                                      <div key={visit.id} className="p-6 bg-white rounded-[32px] border border-slate-100 shadow-sm space-y-4 hover:border-indigo-200 transition-all cursor-pointer group flex flex-col justify-between">
                                         <div>
                                            <div className="flex justify-between items-start">
                                               <div>
                                                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">{visit.lessonPeriod}</p>
                                                  <h4 className="font-black text-slate-800">{teacher?.name || 'معلم غير محدد'}</h4>
                                                  <p className="text-[10px] text-slate-400 font-bold">{visit.date}</p>
                                               </div>
                                               <div className="px-3 py-1 bg-slate-100 rounded-full font-black text-[9px] text-slate-600">
                                                 {visit.signed ? '✓ تم الاطلاع' : '⏱ بانتظار التوقيع'}
                                               </div>
                                            </div>
                                            <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between mt-3 border border-slate-100">
                                               <span className="text-[10px] font-black text-slate-500">عنوان الدرس</span>
                                               <span className="text-[10px] font-black text-slate-850 truncate">{visit.lessonTitle}</span>
                                            </div>
                                         </div>

                                         {visit.signed && (
                                           <div className="mt-4 pt-3 border-t border-slate-150 flex flex-col gap-1.5">
                                             <span className="text-[9px] font-black text-indigo-600 flex items-center gap-1">
                                               <PenTool size={10} />
                                               تم توقيعه بواسطة المعلم: {visit.signatureName}
                                             </span>
                                             {visit.signatureData && (
                                               <img src={visit.signatureData} alt="التوقيع" className="h-10 object-contain self-start border border-indigo-100/30 bg-indigo-50/10 rounded-lg p-1" />
                                             )}
                                           </div>
                                         )}
                                      </div>
                                   );
                                })}
                              {data.visits.filter(v => v.supervisorId === profile.id || v.supervisorName === profile.name).length === 0 && (
                                 <div className="col-span-full py-12 text-center bg-white rounded-[40px] border border-dashed border-slate-200">
                                    <p className="text-slate-300 font-black">لا توجد زيارات مسجلة باسمك بعد</p>
                                 </div>
                              )}
                           </div>
                        </div>
                     </div>
                   ) : (
                     /* ========================================================= */
                     /* SUPERVISOR REPORTS VIEW (التقارير النهائية للمشرف العام)     */
                     /* ========================================================= */
                     <div className="space-y-10">
                        {/* Title Section */}
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 text-indigo-650 rounded-2xl flex items-center justify-center">
                              <TrendingUp size={20} className="text-indigo-600" />
                           </div>
                           <div>
                              <h3 className="text-xl font-black text-slate-900">تقرير التحصيل وضمان الجودة</h3>
                              <p className="text-xs text-slate-400 font-bold">نسب أداء الفصول ومقاييس الاختبارات مع تواقيع المعلمين المطلعين</p>
                           </div>
                        </div>

                        {/* Class Achievement Percentages */}
                        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
                           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                              <h4 className="text-lg font-black text-slate-800">معدلات التحصيل ونسب التفوق لكل فصل</h4>
                              <span className="px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl font-black text-xs">نسبة الإتقان للفصل</span>
                           </div>

                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                              {data.classes.filter(c => !c.isArchived).map(cls => {
                                 // Students in class
                                 const clsStudents = data.students.filter(s => s.classId === cls.id && !s.isArchived);
                                 // Results lists
                                 const results = data.quizResults?.filter(r => clsStudents.some(cs => cs.id === r.studentId)) || [];
                                 const avgScore = results.length > 0 ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length) : 0;
                                 
                                 // Total distinct quizzes
                                 const quizCount = Array.from(new Set(results.map(r => r.quizId))).length;

                                 return (
                                    <div key={cls.id} className="p-6 bg-slate-50/70 border border-slate-100 rounded-3xl space-y-4 hover:border-indigo-100 transition-all">
                                       <div className="flex justify-between items-start">
                                          <div>
                                             <h4 className="font-black text-slate-800 text-base">فصل: {cls.name}</h4>
                                             <p className="text-[10px] text-slate-400 font-bold">
                                               الصف: {data.grades.find(g => g.id === cls.gradeId)?.name || 'غير محدد'}
                                             </p>
                                          </div>
                                          <div className={`text-2xl font-black ${avgScore >= 75 ? 'text-emerald-500' : avgScore >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                                             {avgScore}%
                                          </div>
                                       </div>

                                       <div className="space-y-2">
                                          <div className="w-full h-2 bg-slate-200/60 rounded-full overflow-hidden">
                                             <div className={`h-full rounded-full ${avgScore >= 75 ? 'bg-emerald-500' : avgScore >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${avgScore}%` }} />
                                          </div>
                                          <div className="flex justify-between items-center text-[10px] font-black text-slate-400">
                                            <span>عدد الطلاب: {clsStudents.length}</span>
                                            <span>عدد الاختبارات: {quizCount}</span>
                                          </div>
                                       </div>
                                    </div>
                                 );
                              })}
                           </div>
                        </div>

                        {/* Detailed Quiz Statistics Tracker & Signature List */}
                        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
                           <h4 className="text-lg font-black text-slate-800">بيانات ومراقبة الاختبارات وتواقيع المعلمين</h4>
                           
                           <div className="overflow-x-auto">
                              <table className="w-full text-right border-collapse">
                                 <thead>
                                    <tr className="border-b border-slate-100 text-slate-400 font-black text-xs">
                                       <th className="pb-4 font-black">اسم الاختبار</th>
                                       <th className="pb-4 font-black">المرحلة / المادة</th>
                                       <th className="pb-4 font-black">معدل الإنجاز</th>
                                       <th className="pb-4 font-black">الحضور</th>
                                       <th className="pb-4 font-black text-center">توقيع المعلم للاطلاع</th>
                                    </tr>
                                 </thead>
                                 <tbody>
                                    {data.quizzes.filter(q => !q.isArchived).map(quiz => {
                                       // Students in quiz classes
                                       const quizClassIds = quiz.classIds || [];
                                       const totalStul = data.students.filter(s => quizClassIds.includes(s.classId) && !s.isArchived);
                                       const results = data.quizResults?.filter(r => r.quizId === quiz.id) || [];
                                       const avgScore = results.length > 0 ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length) : 0;

                                       // Find signatures for this quiz in the quizSignatures collection
                                       const signatures = data.quizSignatures?.filter(sig => sig.quizId === quiz.id) || [];

                                       return (
                                          <tr key={quiz.id} className="border-b border-slate-50 text-slate-700 text-xs">
                                             <td className="py-4 font-black text-slate-800 text-sm">{quiz.title}</td>
                                             <td className="py-4 font-bold text-slate-400">
                                               {data.grades.find(g => g.id === quiz.gradeId)?.name || 'عام'} - {quiz.subjectName || 'عام'}
                                             </td>
                                             <td className="py-4">
                                                <span className={`px-2.5 py-1 rounded-lg font-black text-[10px] ${avgScore >= 75 ? 'bg-emerald-50 text-emerald-600' : avgScore >= 50 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50' }`}>
                                                   {avgScore}%
                                                </span>
                                             </td>
                                             <td className="py-4 font-bold">{results.length} من {totalStul.length}</td>
                                             <td className="py-4">
                                                <div className="flex flex-col items-center justify-center gap-1">
                                                   {signatures.length > 0 ? (
                                                      signatures.map((sig, index) => (
                                                         <div key={index} className="flex flex-col items-center gap-1 p-2 bg-indigo-50/40 border border-indigo-100/40 rounded-xl w-full max-w-[180px]">
                                                            <span className="text-[10px] font-black text-indigo-700 flex items-center gap-1">
                                                               <PenTool size={10} />
                                                               {sig.teacherName} (✓ اطلع)
                                                            </span>
                                                            <span className="text-[8px] text-slate-400 font-bold">{new Date(sig.signedAt).toLocaleDateString('ar-SA')}</span>
                                                            {sig.signatureData ? (
                                                               <img src={sig.signatureData} alt="توقيع" className="h-8 object-contain" />
                                                            ) : (
                                                               <span className="font-serif italic text-xs text-indigo-900 border-t border-indigo-100/30 pt-1 mt-0.5">{sig.signatureText}</span>
                                                            )}
                                                         </div>
                                                      ))
                                                   ) : (
                                                      <span className="text-slate-400 font-bold italic text-[10px]">⏱ بانتظار اطلاع المعلم</span>
                                                   )}
                                                </div>
                                             </td>
                                          </tr>
                                       );
                                    })}
                                 </tbody>
                              </table>
                           </div>
                        </div>
                     </div>
                   )}
                </div>
             ) : (
                /* ========================================================= */
                /* TEACHER VIEW                                              */
                /* ========================================================= */
                <div className="space-y-10">
                   
                   {/* Teacher Banner */}
                   <div className="bg-gradient-to-r from-indigo-900 to-indigo-950 rounded-[48px] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl">
                      <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center">
                         <div className="w-24 h-24 bg-yellow-400/90 rounded-[2.2rem] flex items-center justify-center text-indigo-950 shadow-2xl shadow-yellow-400/20 shrink-0">
                            <Award size={48} />
                         </div>
                         <div className="text-center md:text-right">
                            <h2 className="text-2xl font-black mb-2">مرحباً بالأستاذ الفاضل: {profile.name}</h2>
                            <p className="text-indigo-200 text-sm font-medium leading-relaxed max-w-2xl">
                              الصفحة التعليمية الخاصة بك لمتابعة مستويات التقدم والتحصيل لطلاب الفصول المرتبطة، والاطلاع الفوري والتوقيع الموثق على الزيارات والاختبارات.
                            </p>
                         </div>
                      </div>
                      <div className="absolute top-0 left-0 w-80 h-80 bg-white/5 rounded-full -ml-40 -mt-40 blur-3xl opacity-35" />
                   </div>

                   {/* Tabs Menu */}
                   <div className="flex bg-slate-200/50 p-1 rounded-2xl w-fit gap-2">
                     <button 
                       onClick={() => setTeacherTab('dashboard')}
                       className={`px-8 py-3 text-sm font-black rounded-xl transition-all flex items-center gap-2 ${teacherTab === 'dashboard' ? 'bg-indigo-650 bg-indigo-600 text-white shadow-md' : 'text-slate-600'}`}
                     >
                       <ClipboardCheck size={16} />
                       السجل والزيارات الإشرافية
                     </button>
                     <button 
                       onClick={() => setTeacherTab('quizzes')}
                       className={`px-8 py-3 text-sm font-black rounded-xl transition-all flex items-center gap-2 ${teacherTab === 'quizzes' ? 'bg-indigo-650 bg-indigo-600 text-white shadow-md' : 'text-slate-600'}`}
                     >
                       <BookOpen size={16} />
                       الاختبارات والمهارات بالفصل
                     </button>
                     <button 
                       onClick={() => setTeacherTab('priority')}
                       className={`px-8 py-3 text-sm font-black rounded-xl transition-all flex items-center gap-2 ${teacherTab === 'priority' ? 'bg-indigo-650 bg-indigo-600 text-white shadow-md' : 'text-slate-600'}`}
                     >
                       <AlertCircle size={16} />
                       الطلاب ذوي الأولوية الرعائية ({weakStudentsList.length})
                     </button>
                   </div>

                   {/* Teacher Tab Contents */}
                   {teacherTab === 'dashboard' ? (
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                        
                        {/* Summary side stats */}
                        <div className="md:col-span-1 space-y-6">
                           <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
                              <h4 className="text-sm font-black text-slate-400 uppercase mr-1">بطاقة المعلم الإلكترونية</h4>
                              <div className="p-4 bg-slate-50 rounded-2xl flex flex-col gap-3">
                                 <div className="flex justify-between items-center text-xs">
                                   <span className="text-slate-400 font-bold">المادة الرئيسية</span>
                                   <span className="font-black text-slate-800">{activeTeacherObj?.specialization || 'التخصص التعليمي العام'}</span>
                                 </div>
                                 <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-2.5">
                                   <span className="text-slate-400 font-bold">عدد الفصول المسندة</span>
                                   <span className="font-black text-indigo-600">{teacherClasses.length} فصول</span>
                                 </div>
                                 <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-2.5">
                                   <span className="text-slate-400 font-bold">البريد الإلكتروني</span>
                                   <span className="font-extrabold text-slate-800 text-[10px]">{activeTeacherObj?.email || 'لا يوجد بريد'}</span>
                                 </div>
                              </div>
                           </div>
                        </div>

                        {/* Recent Supervision Visits list */}
                        <div className="md:col-span-2 space-y-6">
                           <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                                 <ClipboardCheck size={18} />
                              </div>
                              <h3 className="text-lg font-black text-slate-850">مراجعة تقارير الزيارات الإشرافية والتوقيع</h3>
                           </div>

                           <div className="space-y-4">
                              {data.visits
                                .filter(v => v.teacherId === activeTeacherId)
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                .map(visit => {
                                   let totalScore = 0; let totalMax = 0;
                                   Object.values(visit.evaluationData || {}).forEach(score => { totalScore += score; totalMax += 4; });
                                   const percentage = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

                                   return (
                                      <div key={visit.id} className="bg-white p-6 rounded-[32px] border border-slate-150 shadow-sm space-y-4 relative overflow-hidden group hover:border-indigo-200 transition-all flex flex-col justify-between">
                                         <div>
                                            <div className="flex justify-between items-start">
                                               <div>
                                                  <div className="flex items-center gap-2 mb-1">
                                                     <Calendar size={12} className="text-slate-300" />
                                                     <span className="text-[10px] font-bold text-slate-400">{visit.date}</span>
                                                  </div>
                                                  <h4 className="font-black text-slate-800 text-lg">زيارة: {visit.lessonTitle}</h4>
                                                  <p className="text-[10px] font-black text-indigo-600">المشرف المزار: {visit.supervisorName}</p>
                                               </div>
                                               <div className={`text-2xl font-black ${percentage >= 85 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                  {percentage}%
                                               </div>
                                            </div>
                                            
                                            <div className="space-y-2 mt-2">
                                               <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                                                  <div className={`h-full rounded-full ${percentage >= 85 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${percentage}%` }} />
                                               </div>
                                               {visit.notes && <p className="text-[11px] text-slate-500 font-bold bg-slate-50 p-4 rounded-xl border border-slate-100 italic">" {visit.notes} "</p>}
                                            </div>
                                         </div>

                                         {/* Signature segment */}
                                         <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-4">
                                            {visit.signed ? (
                                               <div className="flex items-center gap-3">
                                                  <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-150 flex items-center justify-center text-indigo-600">
                                                     <CheckCircle2 size={16} />
                                                  </div>
                                                  <div>
                                                    <p className="text-[10px] font-black text-slate-700">تم الاطلاع والتوقيع</p>
                                                    <span className="text-[8px] text-slate-400 font-medium">اسم الموقع: {visit.signatureName}</span>
                                                  </div>
                                                  {visit.signatureData && (
                                                    <img src={visit.signatureData} alt="التوقيع" className="h-10 object-contain border border-slate-150 bg-slate-50 rounded px-1.5 py-0.5" />
                                                  )}
                                               </div>
                                            ) : (
                                               <button 
                                                 onClick={() => setSigningItem({ type: 'visit', id: visit.id })}
                                                 className="px-5 py-2.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-600 hover:text-white text-indigo-700 text-xs font-black rounded-xl transition-all flex items-center gap-1.5"
                                               >
                                                 <PenTool size={14} />
                                                 توقيع تأكيد الاطلاع والمصادقة
                                               </button>
                                            )}
                                         </div>
                                      </div>
                                   );
                                })}
                              {data.visits.filter(v => v.teacherId === activeTeacherId).length === 0 && (
                                 <div className="py-20 text-center bg-white rounded-[40px] border border-dashed border-slate-100">
                                    <p className="text-slate-3s0 font-black text-slate-450">لم يتم رصد زيارات إشرافية لك حتى الآن</p>
                                 </div>
                              )}
                           </div>
                        </div>
                     </div>
                   ) : teacherTab === 'quizzes' ? (
                     /* ========================================================= */
                     /* TEACHER QUIZZES AND SKILLS VIEW                           */
                     /* ========================================================= */
                     <div className="space-y-10">
                        {/* Performance Header */}
                        <div className="flex items-center gap-3">
                           <div className="w-9 h-9 bg-indigo-50 text-indigo-600 border border-indigo-120 rounded-xl flex items-center justify-center">
                              <BookOpen size={18} />
                           </div>
                           <h3 className="text-xl font-black text-slate-850">أداء فصولك والمهارات المستهدفة</h3>
                        </div>

                        {/* List of quizzes with average scores and signature */}
                        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
                           <h4 className="text-base font-black text-slate-800">تفاصيل الاختبارات وتوقيع المعلم الموثق</h4>
                           
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {teacherQuizzes.map(quiz => {
                                 const quizClassIds = quiz.classIds || [];
                                 const totalStudents = data.students.filter(s => quizClassIds.includes(s.classId) && !s.isArchived);
                                 const results = data.quizResults?.filter(r => r.quizId === quiz.id) || [];
                                 const avgScore = results.length > 0 ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length) : 0;
                                 
                                 // Check sig for active teacher
                                 const isSigned = data.quizSignatures?.some(sig => sig.quizId === quiz.id && sig.teacherId === activeTeacherId);
                                 const sigObj = data.quizSignatures?.find(sig => sig.quizId === quiz.id && sig.teacherId === activeTeacherId);

                                 return (
                                    <div key={quiz.id} className="p-6 bg-slate-50/70 border border-slate-100 rounded-2xl flex flex-col justify-between">
                                       <div>
                                          <div className="flex justify-between items-start">
                                             <h4 className="font-black text-slate-850 text-base">{quiz.title}</h4>
                                             <span className={`px-2.5 py-1 rounded-lg font-black text-[10px] ${avgScore >= 75 ? 'bg-emerald-50 text-emerald-600' : avgScore >= 50 ? 'bg-amber-50 text-amber-600' : 'bg-rose-50'}`}>
                                               معدل التحصيل: {avgScore}%
                                             </span>
                                          </div>
                                          <p className="text-[10px] text-slate-400 font-bold mt-1">المادة: {quiz.subjectName || 'عام'} - حضور: {results.length} من {totalStudents.length}</p>
                                       </div>

                                       <div className="mt-6 pt-4 border-t border-slate-150 flex items-center justify-between flex-wrap gap-4">
                                          {isSigned && sigObj ? (
                                             <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-150 flex items-center justify-center text-indigo-600">
                                                   <CheckSquare size={12} />
                                                </div>
                                                <div>
                                                   <p className="text-[10px] font-black text-slate-700">✓ تم الاطلاع الكلي</p>
                                                   <span className="text-[8px] text-slate-400 font-medium">signedAt: {new Date(sigObj.signedAt).toLocaleDateString()}</span>
                                                </div>
                                                {sigObj.signatureData && (
                                                   <img src={sigObj.signatureData} alt="توقيع" className="h-8 object-contain" />
                                                )}
                                             </div>
                                          ) : (
                                             <button 
                                               onClick={() => setSigningItem({ type: 'quiz', id: quiz.id })}
                                               className="px-4 py-2 bg-indigo-50 hover:bg-indigo-650 hover:bg-indigo-600 hover:text-white text-indigo-700 font-black text-[11px] rounded-lg transition-colors flex items-center gap-1 border border-indigo-120"
                                             >
                                                <PenTool size={11} />
                                                الاطلاع والتوقيع المكتمل
                                             </button>
                                          )}
                                       </div>
                                    </div>
                                 );
                              })}
                              {teacherQuizzes.length === 0 && (
                                 <div className="col-span-full py-8 text-center text-slate-400 italic">
                                   لا توجد اختبارات منشورة لفصولك حتى الآن.
                                 </div>
                              )}
                           </div>
                        </div>

                        {/* List of skills for teacher */}
                        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
                           <h4 className="text-base font-black text-slate-800">قائمة مهارات الإتقان في فصولك</h4>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {data.skills
                                .filter(sk => teacherSubjects.some(ts => ts.name === sk.subjectName || ts.name.includes(sk.subjectName || '')))
                                .map(skill => {
                                   return (
                                      <div key={skill.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-4">
                                         <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center font-black text-sm shrink-0">
                                            {skill.questions.length}س
                                         </div>
                                         <div>
                                            <h5 className="font-extrabold text-slate-800 text-sm leading-tight">{skill.name}</h5>
                                            <p className="text-[10px] text-slate-400 font-bold">المادة: {skill.subjectName || 'غير محدد'}</p>
                                         </div>
                                      </div>
                                   );
                                })}
                           </div>
                        </div>
                     </div>
                   ) : (
                     /* ========================================================= */
                     /* PRIORITY SUPPORT CUSTOMERS (الطلاب ذوي الأولوية الرعائية)   */
                     /* ========================================================= */
                     <div className="space-y-6">
                        <div className="flex items-center gap-3">
                           <div className="w-9 h-9 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl flex items-center justify-center">
                              <AlertCircle size={18} />
                           </div>
                           <div>
                              <h3 className="text-xl font-black text-slate-850">قائمة الدعم والتدخل الأكاديمي ذوي الأولوية</h3>
                              <p className="text-xs text-slate-400 font-bold">الطلاب الذين يظهرون مستويات أداء ضعيفة (أقل من 50% في الاختبارات أو مهارات غير متقنة)</p>
                           </div>
                        </div>

                        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
                           <div className="overflow-x-auto">
                              <table className="w-full text-right border-collapse">
                                 <thead>
                                    <tr className="border-b border-slate-100 text-slate-400 font-black text-xs">
                                       <th className="pb-4 font-black">اسم الطالب</th>
                                       <th className="pb-4 font-black">الفصل الدراسي</th>
                                       <th className="pb-4 font-black">متوسط درجات الاختبارات</th>
                                       <th className="pb-4 font-black">المهارات غير المتقنة (الضعيفة)</th>
                                       <th className="pb-4 font-black">الحالة الإشرافية</th>
                                    </tr>
                                 </thead>
                                 <tbody>
                                    {weakStudentsList.map(item => (
                                       <tr key={item.student.id} className="border-b border-slate-50 text-xs">
                                          <td className="py-4 font-black text-slate-800">{item.student.name}</td>
                                          <td className="py-4 font-bold text-slate-400">
                                             {data.classes.find(c => c.id === item.student.classId)?.name || 'غير محدد'}
                                          </td>
                                          <td className="py-4 font-black">
                                             {item.avgQuiz !== null ? (
                                                <span className={`px-2 py-1 rounded-lg text-[10px] ${item.avgQuiz < 50 ? 'bg-rose-50 text-rose-600' : 'bg-slate-150'}`}>
                                                   {Math.round(item.avgQuiz)}%
                                                </span>
                                             ) : (
                                                <span className="text-slate-300 font-bold text-[10px]">لم يختبر</span>
                                             )}
                                          </td>
                                          <td className="py-4 text-xs font-bold text-slate-500 max-w-sm truncate whitespace-normal">
                                             {item.weakSkills.length > 0 ? (
                                                <div className="flex flex-wrap gap-1.5">
                                                   {item.weakSkills.map((skName, idx) => (
                                                      <span key={idx} className="bg-rose-50 text-rose-700 text-[9px] font-black px-2 py-0.5 rounded-md border border-rose-100/30">
                                                        {skName}
                                                      </span>
                                                   ))}
                                                </div>
                                             ) : (
                                                <span className="text-slate-300 italic font-bold text-[10px]">لا يوجد</span>
                                             )}
                                          </td>
                                          <td className="py-4">
                                             <span className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-black">
                                               ملاحظة وإرشاد ذوي الأولوية
                                             </span>
                                          </td>
                                       </tr>
                                    ))}
                                    {weakStudentsList.length === 0 && (
                                       <tr>
                                          <td colSpan={5} className="py-12 text-center text-slate-400 font-black">
                                             ✓ رائع! لا توجد حالات تحصيلية حرجة أو طلاب مخفقين في فصولك في الوقت الراهن.
                                          </td>
                                       </tr>
                                    )}
                                 </tbody>
                              </table>
                           </div>
                        </div>
                     </div>
                   )}
                </div>
             )}
          </div>
       </main>
    </div>
  );
}
