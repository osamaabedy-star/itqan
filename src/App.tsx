import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  CartesianGrid
} from 'recharts';
import { Navbar } from './components/Navbar';
import { ClassCard } from './components/ClassCard';
import { INITIAL_DATA } from './constants';
import { 
  Class, 
  Skill, 
  Student, 
  Subject, 
  Evaluations, 
  EvaluationScore, 
  AppData, 
  Teacher, 
  Quiz,
  QuizResult,
  ExternalProfile
} from './types';
import SignatureCanvas from 'react-signature-canvas';
import { 
  BookOpen, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  LogIn, 
  ShieldCheck, 
  Award, 
  LayoutDashboard, 
  Search,
  BarChart3, 
  LogOut, 
  Eraser, 
  Save,
  Users,
  BrainCircuit,
  Star,
  ArrowRight,
  Zap,
  TrendingUp,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot,
  Timestamp,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';
import { firestoreService } from './services/firestoreService';
import { User } from 'firebase/auth';
import { Management } from './components/Management';
import { QuizPlayer } from './components/QuizPlayer';
import { Dashboard } from './components/Dashboard';
import { StudentProfile } from './components/StudentProfile';
import { Visits } from './components/Visits';
import { QuizLogin } from './components/QuizLogin';
import { TeacherProfile } from './components/TeacherProfile';

import { ProfessionalReports } from './components/ProfessionalReports';
import { QuizReport } from './components/QuizReport';
import { MonitoringMatrix } from './components/quick-eval/MonitoringMatrix';
import { ConfirmationModal } from './components/ui/ConfirmationModal';
import { ExternalPortal } from './components/ExternalPortal';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState(() => {
    try {
      const saved = localStorage.getItem('itqan-saved-state');
      if (saved) {
        return JSON.parse(saved).view || 'dashboard';
      }
    } catch (e) {}
    return 'dashboard';
  }); // dashboard, subjects, skills, students, evaluation, reports, student-report, management, quiz, baseline-selection, baseline-session, quick-matrix, student-profile, quiz-login
  const [rawAppData, setAppData] = useState<AppData>(INITIAL_DATA);

  const appData = useMemo(() => {
    const getGradeOrder = (g: any) => {
      if (!g || !g.name) return 999;
      const str = g.name.trim();
      let base = 0;
      if (g.stage === 'kindergarten' || str.includes('روضة') || str.includes('تمهيدي')) base = 0;
      else if (g.stage === 'primary' || str.includes('ابتدائي') || str.includes('الابتدائي')) base = 10;
      else if (g.stage === 'middle' || str.includes('متوسط') || str.includes('المتوسط')) base = 100;
      else if (g.stage === 'high' || str.includes('ثانوي') || str.includes('الثانوي')) base = 200;
      else {
        if (str.includes('متوسط')) base = 100;
        else if (str.includes('ثانوي') || str.includes('مسار') || str.includes('مقرر')) base = 200;
        else base = 10;
      }

      let rank = 10;
      if (str.includes('أول') || str.includes('اول') || str.includes('الاول')) rank = 1;
      else if (str.includes('ثاني') || str.includes('الثاني')) rank = 2;
      else if (str.includes('ثالث') || str.includes('الثالث')) rank = 3;
      else if (str.includes('رابع') || str.includes('الرابع')) rank = 4;
      else if (str.includes('خامس') || str.includes('الخامس')) rank = 5;
      else if (str.includes('سادس') || str.includes('السادس')) rank = 6;
      else if (str.includes('سابع') || str.includes('السابع')) rank = 7;
      else if (str.includes('ثامن') || str.includes('الثامن')) rank = 8;
      else if (str.includes('تاسع') || str.includes('التاسع')) rank = 9;
      else if (str.includes('عاشر') || str.includes('العاشر')) rank = 10;
      
      return base + rank;
    };

    const sortedGrades = [...rawAppData.grades].sort((a, b) => getGradeOrder(a) - getGradeOrder(b));

    const sortedClasses = [...rawAppData.classes].sort((a, b) => {
      const gradeA = sortedGrades.find(g => g.id === a.gradeId);
      const gradeB = sortedGrades.find(g => g.id === b.gradeId);
      const orderA = gradeA ? getGradeOrder(gradeA) : 999;
      const orderB = gradeB ? getGradeOrder(gradeB) : 999;
      if (orderA !== orderB) return orderA - orderB;
      return (a.name || '').localeCompare(b.name || '', 'ar');
    });

    const sortedStudents = [...rawAppData.students].sort((a, b) => {
      const classA = sortedClasses.find(c => c.id === a.classId);
      const classB = sortedClasses.find(c => c.id === b.classId);
      const classIdxA = classA ? sortedClasses.findIndex(c => c.id === classA.id) : 9999;
      const classIdxB = classB ? sortedClasses.findIndex(c => c.id === classB.id) : 9999;
      if (classIdxA !== classIdxB) return classIdxA - classIdxB;
      return (a.name || '').localeCompare(b.name || '', 'ar');
    });

    return {
      ...rawAppData,
      grades: sortedGrades,
      classes: sortedClasses,
      students: sortedStudents
    };
  }, [rawAppData]);

  const [selectedClass, setSelectedClass] = useState<Class | null>(() => {
    try {
      const saved = localStorage.getItem('itqan-saved-state');
      if (saved) {
        return JSON.parse(saved).selectedClass || null;
      }
    } catch (e) {}
    return null;
  });
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(() => {
    try {
      const saved = localStorage.getItem('itqan-saved-state');
      if (saved) {
        return JSON.parse(saved).selectedSubject || null;
      }
    } catch (e) {}
    return null;
  });
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(() => {
    try {
      const saved = localStorage.getItem('itqan-saved-state');
      if (saved) {
        return JSON.parse(saved).selectedSkill || null;
      }
    } catch (e) {}
    return null;
  });
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(() => {
    try {
      const saved = localStorage.getItem('itqan-saved-state');
      if (saved) {
        return JSON.parse(saved).selectedStudent || null;
      }
    } catch (e) {}
    return null;
  });
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(() => {
    try {
      const saved = localStorage.getItem('itqan-saved-state');
      if (saved) {
        return JSON.parse(saved).selectedTeacher || null;
      }
    } catch (e) {}
    return null;
  });
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(() => {
    try {
      const saved = localStorage.getItem('itqan-saved-state');
      if (saved) {
        return JSON.parse(saved).selectedQuiz || null;
      }
    } catch (e) {}
    return null;
  });
  const [evaluations, setEvaluations] = useState<Evaluations>({});
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [showStudentQuizPortal, setShowStudentQuizPortal] = useState(false);
  const [globalFilterTeacherId, setGlobalFilterTeacherId] = useState('');
  const [isTeacherReportMode, setIsTeacherReportMode] = useState(false);

  const [externalProfile, setExternalProfileState] = useState<ExternalProfile | null>(() => {
    try {
      const saved = localStorage.getItem('itqan-external-profile');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [studentSession, setStudentSession] = useState<Student | null>(() => {
    try {
      const saved = localStorage.getItem('itqan-student-session');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  useEffect(() => {
    if (externalProfile) {
      localStorage.setItem('itqan-external-profile', JSON.stringify(externalProfile));
      localStorage.setItem('external_id', externalProfile.id);
    } else {
      localStorage.removeItem('itqan-external-profile');
      localStorage.removeItem('external_id');
    }
  }, [externalProfile]);

  useEffect(() => {
    if (studentSession) {
      localStorage.setItem('itqan-student-session', JSON.stringify(studentSession));
    } else {
      localStorage.removeItem('itqan-student-session');
    }
  }, [studentSession]);

  const [loginRole, setLoginRole] = useState<'admin' | 'teacher' | 'supervisor' | 'student'>('student');
  const [loginIdInput, setLoginIdInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoginProcessing, setIsLoginProcessing] = useState(false);

  const handleUnifiedLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginRole !== 'admin' && !loginIdInput.trim()) {
      setLoginError('يرجى إدخال رقم الهوية أو الاسم المطلوب');
      return;
    }
    
    setLoginError('');
    setIsLoginProcessing(true);
    
    try {
      await firestoreService.loginAnonymously();
      const input = loginIdInput.trim();
      
      if (loginRole === 'teacher' || loginRole === 'supervisor') {
        const p = (await firestoreService.getExternalProfile(input)) as ExternalProfile | null;
        if (p && !p.isArchived) {
          if (p.role === loginRole) {
            setExternalProfileState(p);
            setView('external-portal');
          } else {
            const roleNameAr = loginRole === 'teacher' ? 'معلم' : 'مشرف';
            const profileRoleNameAr = p.role === 'teacher' ? 'معلم' : 'مشرف';
            setLoginError(`رقم الهوية المدخل مسجل كـ (${profileRoleNameAr}) وليس كـ (${roleNameAr})`);
          }
        } else {
          setLoginError('عذراً، رقم الهوية هذا غير مسجل في النظام');
        }
      } else if (loginRole === 'student') {
        // Find matching student by ID or Name
        const student = appData.students.find(s => 
          s.id.toLowerCase() === input.toLowerCase() || 
          s.name.trim().toLowerCase() === input.toLowerCase() ||
          s.name.trim().replace(/\s+/g, ' ').toLowerCase() === input.replace(/\s+/g, ' ').toLowerCase()
        );
        
        if (student && !student.isArchived) {
          setStudentSession(student);
          setShowStudentQuizPortal(true);
          setView('student-portal');
        } else {
          setLoginError('لم يتم العثور على طالب بهذا الاسم أو رقم الهوية. يرجى التأكد من كتابة الاسم صحيحاً كما هو مسجل في كشف المدرسة.');
        }
      }
    } catch (err) {
      console.error(err);
      setLoginError('حدث خطأ أثناء الاتصال بالنظام. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsLoginProcessing(false);
    }
  };

  // State Travel and Navigation Persistence
  type NavState = {
    view: string;
    selectedClass: Class | null;
    selectedSubject: Subject | null;
    selectedSkill: Skill | null;
    selectedStudent: Student | null;
    selectedTeacher: Teacher | null;
    selectedQuiz: Quiz | null;
  };

  const [navHistory, setNavHistory] = useState<NavState[]>(() => {
    try {
      const saved = localStorage.getItem('itqan-nav-history');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    return [];
  });

  const prevNavStateRef = useRef<NavState | null>(null);
  const isNavigatingBackRef = useRef(false);

  useEffect(() => {
    const currentState: NavState = {
      view,
      selectedClass,
      selectedSubject,
      selectedSkill,
      selectedStudent,
      selectedTeacher,
      selectedQuiz,
    };

    try {
      localStorage.setItem('itqan-saved-state', JSON.stringify(currentState));
    } catch (e) {}

    if (!prevNavStateRef.current) {
      prevNavStateRef.current = currentState;
      return;
    }

    const prev = prevNavStateRef.current;
    const hasChanged =
      prev.view !== currentState.view ||
      (prev.selectedClass?.id !== currentState.selectedClass?.id) ||
      (prev.selectedSubject?.id !== currentState.selectedSubject?.id) ||
      (prev.selectedSkill?.id !== currentState.selectedSkill?.id) ||
      (prev.selectedStudent?.id !== currentState.selectedStudent?.id) ||
      (prev.selectedTeacher?.id !== currentState.selectedTeacher?.id) ||
      (prev.selectedQuiz?.id !== currentState.selectedQuiz?.id);

    if (hasChanged) {
      if (isNavigatingBackRef.current) {
        prevNavStateRef.current = currentState;
        isNavigatingBackRef.current = false;
        return;
      }

      setNavHistory((prevHistory) => {
        const updated = [...prevHistory, prev];
        const sliced = updated.slice(-30);
        try {
          localStorage.setItem('itqan-nav-history', JSON.stringify(sliced));
        } catch (e) {}
        return sliced;
      });
      prevNavStateRef.current = currentState;
    }
  }, [view, selectedClass, selectedSubject, selectedSkill, selectedStudent, selectedTeacher, selectedQuiz]);

  const handleGoBack = () => {
    if (navHistory.length === 0) return;

    const previousState = navHistory[navHistory.length - 1];
    isNavigatingBackRef.current = true;

    setView(previousState.view);
    setSelectedClass(previousState.selectedClass);
    setSelectedSubject(previousState.selectedSubject);
    setSelectedSkill(previousState.selectedSkill);
    setSelectedStudent(previousState.selectedStudent);
    setSelectedTeacher(previousState.selectedTeacher);
    setSelectedQuiz(previousState.selectedQuiz);

    setNavHistory((prevHistory) => {
      const updated = prevHistory.slice(0, -1);
      try {
        localStorage.setItem('itqan-nav-history', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const [theme, setTheme] = useState<'light' | 'dark' | 'calm'>(() => {
    return (localStorage.getItem('itqan-theme') as 'light' | 'dark' | 'calm') || 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-light', 'theme-dark', 'theme-calm');
    root.classList.add(`theme-${theme}`);
    localStorage.setItem('itqan-theme', theme);
  }, [theme]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const teacherId = params.get('teacherReport');
    if (teacherId) {
      setGlobalFilterTeacherId(teacherId);
      setIsTeacherReportMode(true);
      setView('reports');
    }

    // Check for external portal link
    if (params.get('portal') === 'true') {
      setView('external-portal');
    }
  }, []);

  // Confirmation State
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: '',
    onConfirm: () => {},
  });

  const closeConfirm = () => setConfirmConfig(prev => ({ ...prev, isOpen: false }));

  const resetProgress = async () => {
    setConfirmConfig({
      isOpen: true,
      title: 'تصفير البيانات بالكامل',
      message: '🚨 هل أنت متأكد من مسح جميع التقييمات لهذا العام الدراسي؟ سيتم حذف نتائج جميع الطلاب للأبد ولا يمكن استرجاعها.',
      confirmLabel: 'تصفير نهائي شامل',
      isDestructive: true,
      onConfirm: async () => {
        closeConfirm();
        const studentIds = appData.students.map(s => s.id);
        const skillIds = appData.skills.map(sk => sk.id);
        try {
          await firestoreService.resetAllEvaluations(studentIds, skillIds, academicYear);
          alert('تم تصفير البيانات بنجاح');
        } catch (err) {
          alert('حدث خطأ أثناء تصفير البيانات');
        }
      }
    });
  };

  // Auth observer
  useEffect(() => {
    const unsubscribe = firestoreService.onAuth((u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Sync all data from Firestore
  useEffect(() => {
    if (!user) return;

    const sortByName = (arr: any[]) => [...arr].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));

    const subs = [
      firestoreService.subscribeToCollection('grades', (data) => setAppData(prev => ({ ...prev, grades: data.length > 0 ? sortByName(data) : [] }))),
      firestoreService.subscribeToCollection('classes', (data) => setAppData(prev => ({ ...prev, classes: data.length > 0 ? sortByName(data) : [] }))),
      firestoreService.subscribeToCollection('teachers', (data) => setAppData(prev => ({ ...prev, teachers: data.length > 0 ? sortByName(data) : [] }))),
      firestoreService.subscribeToCollection('subjects', (data) => setAppData(prev => ({ ...prev, subjects: data.length > 0 ? sortByName(data) : [] }))),
      firestoreService.subscribeToCollection('skills', (data) => setAppData(prev => ({ ...prev, skills: data.length > 0 ? sortByName(data) : [] }))),
      firestoreService.subscribeToCollection('students', (data) => setAppData(prev => ({ ...prev, students: data.length > 0 ? sortByName(data) : [] }))),
      firestoreService.subscribeToCollection('quizzes', (data) => setAppData(prev => ({ ...prev, quizzes: data.length > 0 ? data : [] }))),
      firestoreService.subscribeToCollection('visits', (data) => setAppData(prev => ({ ...prev, visits: data.length > 0 ? data : [] }))),
      firestoreService.subscribeToCollection('quizResults', (data) => setAppData(prev => ({ ...prev, quizResults: data.length > 0 ? data : [] }))),
      firestoreService.subscribeToCollection('rubrics', (data) => setAppData(prev => ({ ...prev, rubrics: data.length > 0 ? data : [] }))),
      firestoreService.subscribeToCollection('externalProfiles', (data) => setAppData(prev => ({ ...prev, externalProfiles: data.length > 0 ? data : [] }))),
      firestoreService.subscribeToCollection('quizSignatures', (data) => setAppData(prev => ({ ...prev, quizSignatures: data.length > 0 ? data : [] }))),
      firestoreService.subscribeToEvaluations((newEvals) => setEvaluations(newEvals))
    ];

    return () => subs.forEach(unsub => unsub());
  }, [user, showStudentQuizPortal]); // Resubscribe if student portal is opened

  const saveEvaluation = async (studentId: string, skillId: string, score: EvaluationScore, note: string = '') => {
    if (!user) return;
    
    // Optimistic update
    const evalId = `${studentId}-${skillId}-${academicYear}`;
    setEvaluations(prev => ({
      ...prev,
      [evalId]: { score, note, academicYear, updatedAt: Timestamp.now() }
    }));

    try {
      await firestoreService.saveEvaluation(studentId, skillId, score, note, academicYear);
    } catch (err) {
      console.error('Error saving evaluation:', err);
      // Revert if error? Maybe overkill for now but good to log
    }
  };

  const getSkillsForSubject = (subject: Subject) => {
    const skills = appData.skills.filter(sk => 
      (sk.gradeId === subject.gradeId && sk.subjectName === subject.name) || 
      (sk.subjectId === subject.id)
    ).filter(sk => !sk.isArchived);
    
    return skills;
  };

  const getQuizzesForSubject = (subject: Subject) => {
    const quizzes = appData.quizzes.filter(q => 
      q.status === 'published' && !q.isArchived && (
        (q.subjectIds?.includes(subject.id)) ||
        (q.subjectId === subject.id)
      )
    ).filter(q => {
      // If we have a selected class, ensure the quiz belongs to it
      if (selectedClass && q.classIds && q.classIds.length > 0) {
        return q.classIds.includes(selectedClass.id);
      }
      return true;
    });
    return quizzes;
  };

  const calculatePerformance = (classId: string, subjectId?: string) => {
    const classStudents = appData.students.filter(s => s.classId === classId && !s.isArchived);
    const cls = appData.classes.find(c => c.id === classId);
    let relevantSkills: Skill[] = [];
    let relevantQuizzes: Quiz[] = [];
    
    if (subjectId) {
      const subject = appData.subjects.find(s => s.id === subjectId);
      if (subject) {
        relevantSkills = getSkillsForSubject(subject);
        relevantQuizzes = appData.quizzes.filter(q => q.subjectIds?.includes(subjectId) && q.status === 'published');
      }
    } else if (cls) {
      const classSubjects = appData.subjects.filter(sub => 
        sub.gradeId === cls.gradeId && 
        (!sub.classId || sub.classId === classId || sub.classIds?.includes(classId)) &&
        !sub.isArchived
      );
      classSubjects.forEach(sub => {
        relevantSkills = [...relevantSkills, ...getSkillsForSubject(sub)];
        const subQuizzes = appData.quizzes.filter(q => q.subjectIds?.includes(sub.id) && q.status === 'published');
        subQuizzes.forEach(sq => {
          if (!relevantQuizzes.find(rq => rq.id === sq.id)) relevantQuizzes.push(sq);
        });
      });
      // Deduplicate shared skills
      const uniqueRelevantSkills: Skill[] = [];
      const seenNames = new Set<string>();
      relevantSkills.forEach(sk => {
        if (!seenNames.has(sk.name)) {
          uniqueRelevantSkills.push(sk);
          seenNames.add(sk.name);
        }
      });
      relevantSkills = uniqueRelevantSkills;
    }

    if (classStudents.length === 0) return 0;
    
    let totalPoints = 0;
    let maxPoints = 0;

    // Skill Points (0-4 scale)
    if (relevantSkills.length > 0) {
      maxPoints += classStudents.length * relevantSkills.length * 4;
      classStudents.forEach(st => {
        relevantSkills.forEach(sk => {
          const evalData = evaluations[`${st.id}-${sk.id}-${academicYear}`];
          const score = evalData?.score;
          if (score === 'mastered') totalPoints += 4;
          else if (score === 'advanced') totalPoints += 3;
          else if (score === 'accepted') totalPoints += 2;
          else if (score === 'weak') totalPoints += 1;
          else if (score === 'very-weak') totalPoints += 0;
        });
      });
    }

    // Quiz Points (Scale 100 to 4 for weighted average)
    if (relevantQuizzes.length > 0) {
      maxPoints += classStudents.length * relevantQuizzes.length * 4;
      classStudents.forEach(st => {
        relevantQuizzes.forEach(qz => {
          const result = appData.quizResults.find(r => r.studentId === st.id && r.quizId === qz.id);
          if (result) {
            totalPoints += (result.score / 100) * 4;
          }
        });
      });
    }

    if (maxPoints === 0) return 0;
    return Math.round((totalPoints / maxPoints) * 100);
  };

  const getAllStudents = () => appData.students;

  const [studentSearch, setStudentSearch] = useState('');

  const calculateStudentSkillPerformance = (studentId: string, subjectId: string) => {
    const subject = appData.subjects.find(s => s.id === subjectId);
    const subjectSkills = subject ? getSkillsForSubject(subject) : [];
    if (subjectSkills.length === 0) return 0;
    
    let points = 0;
    subjectSkills.forEach(sk => {
      const evalData = evaluations[`${studentId}-${sk.id}-${academicYear}`];
      const score = evalData?.score;
      if (score === 'mastered') points += 4;
      else if (score === 'advanced') points += 3;
      else if (score === 'accepted') points += 2;
      else if (score === 'weak') points += 1;
      else if (score === 'very-weak') points += 0;
    });

    return Math.round((points / (subjectSkills.length * 4)) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center" dir="rtl">
        <motion.div 
          animate={{ scale: [1, 1.1, 1] }} 
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="flex flex-col items-center gap-4"
        >
          <ShieldCheck className="text-indigo-600 w-12 h-12" />
          <p className="font-black text-indigo-900 animate-pulse">جاري تحميل النظام...</p>
        </motion.div>
      </div>
    );
  }

  // Check if we need to show the unified Login screen:
  const isUserAdmin = !!(user && !user.isAnonymous);
  const isTeacherActive = !!(externalProfile && view === 'external-portal');
  const isStudentActive = !!(studentSession && (view === 'student-portal' || view === 'quiz'));

  const showLogin = !isUserAdmin && !isTeacherActive && !isStudentActive;

  if (showLogin) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans p-4 relative overflow-hidden" dir="rtl">
        {/* Soft Background Blur Blobs */}
        <div className="absolute top-[-20%] right-[-20%] w-[60%] h-[60%] bg-indigo-100 rounded-full blur-[120px] opacity-70 pointer-events-none" />
        <div className="absolute bottom-[-20%] left-[-20%] w-[60%] h-[60%] bg-blue-50 rounded-full blur-[120px] opacity-70 pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="w-full max-w-md bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_25px_60px_-15px_rgba(99,102,241,0.06)] p-8 md:p-10 relative z-10"
        >
          {/* School Identity Header */}
          <div className="flex flex-col items-center text-center space-y-4 mb-8">
            <div className="w-20 h-20 rounded-[2rem] bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shadow-sm">
              <svg className="w-12 h-12 text-indigo-700" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M50 5C75 5 85 20 85 45C85 70 65 90 50 95C35 90 15 70 15 45C15 20 25 5 50 5Z" fill="currentColor" fillOpacity="0.06" stroke="currentColor" strokeWidth="4" strokeLinejoin="round"/>
                <path d="M32 60C45 60 50 48 50 48C50 48 55 60 68 60" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M32 40C45 40 50 48 50 48V68" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                <path d="M68 40C55 40 50 48 50 48V68" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                <path d="M50 18L52.5 24H58.5L53.5 27.5L55.5 33L50 29.5L44.5 33L46.5 27.5L41.5 24H47.5L50 18Z" fill="#FBBF24"/>
              </svg>
            </div>
            
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-widest text-indigo-600/70 font-black">مدارس رياض الإبداع الأهلية</span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">منصة إتقان لتقييم المهارات</h1>
            </div>
          </div>

          {/* Job / Role Tabs Selector */}
          <div className="bg-slate-50 border border-slate-100 p-1.5 rounded-2xl flex flex-wrap gap-1 items-center justify-between mb-8">
            {(['student', 'teacher', 'supervisor', 'admin'] as const).map((role) => {
              const labelMap = {
                student: 'دخول طالب',
                teacher: 'معلّم',
                supervisor: 'مشرف',
                admin: 'مسؤول'
              };
              
              const isActive = loginRole === role;
              
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => {
                    setLoginRole(role);
                    setLoginIdInput('');
                    setLoginError('');
                  }}
                  className={`flex-1 min-w-[70px] h-10 rounded-xl text-xs font-black transition-all ${
                    isActive 
                      ? 'bg-slate-900 text-white shadow-md' 
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {labelMap[role]}
                </button>
              );
            })}
          </div>

          {/* Form Actions Section */}
          <form onSubmit={handleUnifiedLoginSubmit} className="space-y-6">
            {loginError && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-2.5 text-rose-700 text-xs font-bold leading-relaxed-none"
              >
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </motion.div>
            )}

            {loginRole === 'admin' ? (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={async () => {
                    setLoginError('');
                    setIsLoginProcessing(true);
                    try {
                      await firestoreService.login();
                    } catch (err) {
                      setLoginError('فشل تسجيل الدخول كمسؤول. الرجاء تكرار المحاولة وسوف نساعدك.');
                    } finally {
                      setIsLoginProcessing(false);
                    }
                  }}
                  disabled={isLoginProcessing}
                  className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-transform active:scale-[0.98] disabled:opacity-50"
                >
                  <LogIn size={18} />
                  <span>دخول كمسؤول بالنظام (Google Auth)</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-700 block mr-1 text-right">
                    {loginRole === 'student' ? 'رقم الهوية أو اسم الطالب ثلاثياً' : 'أدخل رقم الهوية الشخصية'}
                  </label>
                  <input
                    type="text"
                    value={loginIdInput}
                    onChange={(e) => setLoginIdInput(e.target.value)}
                    placeholder={
                      loginRole === 'student' 
                        ? 'مثال: st1 أو اكتب اسم الطالب...' 
                        : 'أدخل رقم الهوية المسجل...'
                    }
                    className="w-full h-14 px-4 bg-slate-50 border border-slate-100 focus:border-indigo-400 focus:bg-white rounded-2xl outline-none text-slate-800 text-sm font-bold transition-all text-right shadow-inner"
                    disabled={isLoginProcessing}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoginProcessing}
                  className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-transform active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-indigo-600/10"
                >
                  {isLoginProcessing ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn size={18} />
                      <span>تسجيل الدخول</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        </motion.div>
      </div>
    );
  }

  const isOuterNavbarVisible = isUserAdmin && !isTeacherReportMode && view !== 'external-portal' && view !== 'student-portal';

  return (
      <div className="h-screen flex flex-col bg-slate-50 font-sans text-slate-800 overflow-hidden print:h-auto print:bg-white print:overflow-visible print:block" dir="rtl">
        {isOuterNavbarVisible && (
          <div className="print:hidden">
            <Navbar 
              activeView={view} 
              onNavigate={setView} 
              academicYear={academicYear} 
              onTeacherChange={setGlobalFilterTeacherId}
              teachers={appData.teachers.filter(t => !t.isArchived)}
              selectedTeacherId={globalFilterTeacherId}
              onYearChange={setAcademicYear} 
              theme={theme}
              onThemeChange={setTheme}
              onGoBack={handleGoBack}
              canGoBack={navHistory.length > 0}
            />
          </div>
        )}

      <main className="flex-1 flex overflow-hidden print:overflow-visible print:block">
        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <Dashboard 
              data={appData} 
              evaluations={evaluations}
              academicYear={academicYear}
              onNavigate={setView}
              onSelectClass={setSelectedClass}
              onSelectStudent={setSelectedStudent}
              onSelectTeacher={(t) => { setSelectedTeacher(t); setView('teacher-profile'); }}
              onSelectQuiz={(q, st) => { setSelectedQuiz(q); setSelectedStudent(st); setView(st ? 'quiz' : 'quiz-report'); }}
              calculatePerformance={calculatePerformance}
              filterTeacherId={globalFilterTeacherId}
            />
          )}

          {view === 'visits' && (
            <Visits 
              data={appData}
              evaluations={evaluations}
              academicYear={academicYear}
            />
          )}

          {view === 'external-portal' && (
            <ExternalPortal 
               data={appData}
               evaluations={evaluations}
               academicYear={academicYear}
               onClose={() => {
                 setExternalProfileState(null);
                 setView('login');
               }}
               onLogout={() => {
                 setExternalProfileState(null);
                 setView('login');
               }}
            />
          )}

          {view === 'student-portal' && studentSession && (
            <div className="flex-1 overflow-y-auto bg-slate-50 p-6 md:p-12 font-sans" dir="rtl">
              <div className="max-w-4xl mx-auto space-y-8">
                {/* Header Card */}
                <div className="bg-gradient-to-l from-indigo-700 to-indigo-900 rounded-[2.5rem] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl">
                  <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[150%] bg-white/[0.04] rounded-full blur-[60px] pointer-events-none" />
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-4">
                      {/* Shield Icon & School Title */}
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                          <BookOpen className="text-white w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-white/60 text-xs font-black uppercase leading-none">مدارس رياض الإبداع</p>
                          <h2 className="text-sm font-black text-yellow-300 mt-1">منصة إتقان لتقييم المهارات</h2>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <p className="text-white/60 text-xs font-bold text-indigo-200">مرحباً بك يا بطل المستقبل 🏆</p>
                        <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">{studentSession.name}</h1>
                      </div>
                      
                      {/* Class name / Grade Info */}
                      {(() => {
                        const sClass = appData.classes.find(c => c.id === studentSession.classId);
                        const sGrade = sClass ? appData.grades.find(g => g.id === sClass.gradeId) : null;
                        return (
                          <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-xs font-bold backdrop-blur-md text-indigo-100">
                            <span>{sGrade?.name || 'الصف الدراسي'}</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
                            <span>الفصل: {sClass?.name || 'أ'}</span>
                          </div>
                        );
                      })()}
                    </div>
                    
                    {/* Logout button */}
                    <button 
                      onClick={() => {
                        setStudentSession(null);
                        setShowStudentQuizPortal(false);
                        setView('login');
                      }}
                      className="px-6 h-12 bg-white/10 hover:bg-rose-600 hover:text-white text-indigo-100 rounded-2xl font-black flex items-center justify-center gap-2 backdrop-blur-md transition-all self-start md:self-center"
                    >
                      <LogOut size={16} />
                      <span>تسجيل الخروج</span>
                    </button>
                  </div>
                </div>

                {/* Available Quizzes Section */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-black text-slate-900">📝 الاختبارات والمهام النشطة</h3>
                      <p className="text-xs text-slate-500 font-bold mt-1">الرجاء إكمال الاختبارات المطلوبة منك بدقة وإتقان</p>
                    </div>
                  </div>

                  {(() => {
                    const sClass = appData.classes.find(c => c.id === studentSession.classId);
                    const sGrade = sClass ? appData.grades.find(g => g.id === sClass.gradeId) : null;
                    
                    const availableQuizzes = appData.quizzes.filter(q => {
                      if (q.isArchived || q.status !== 'published') return false;
                      
                      // 1. If class specific assignments exist, must match
                      if (q.classIds && q.classIds.length > 0) {
                        return q.classIds.includes(studentSession.classId);
                      }
                      
                      // 2. Fallback to Grade matches
                      if (q.gradeId && sGrade) {
                        return q.gradeId === sGrade.id;
                      }
                      
                      // 3. Fallback to Stage matches
                      if (q.stageId && sGrade) {
                        return q.stageId === sGrade.stage;
                      }
                      
                      return false;
                    });

                    if (availableQuizzes.length === 0) {
                      return (
                        <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 space-y-4">
                          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                            <CheckCircle2 size={32} />
                          </div>
                          <div>
                            <h4 className="text-lg font-black text-slate-800">لا توجد اختبارات نشطة حالياً</h4>
                            <p className="text-slate-400 text-xs mt-1">أنت متميز ومتقن لجميع المهارات المطلوبة منك!</p>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {availableQuizzes.map(quiz => {
                          // Check if quiz is already solved
                          const result = appData.quizResults?.find(r => r.studentId === studentSession.id && r.quizId === quiz.id);
                          const isCompleted = !!result;
                          
                          return (
                            <div 
                              key={quiz.id} 
                              className={`bg-white rounded-3xl p-6 border transition-all duration-300 flex flex-col justify-between h-48 ${
                                isCompleted 
                                ? 'border-emerald-100 bg-emerald-50/10' 
                                : 'border-slate-100 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5'
                              }`}
                            >
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold">
                                    <BookOpen size={12} />
                                    {quiz.subjectName || 'مادة دراسية'}
                                  </span>
                                  {isCompleted ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[10px] font-black">
                                      <CheckCircle2 size={12} />
                                      {result.score}% تم الحل
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-600 border border-amber-100 rounded-full text-[10px] font-black animate-pulse">
                                      مستمر حالياً
                                    </span>
                                  )}
                                </div>
                                
                                <h4 className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">{quiz.title}</h4>
                                <p className="text-xs text-slate-400 font-bold">عدد الأسئلة: {quiz.questions.length} أسئلة مهارية</p>
                              </div>

                              {isCompleted ? (
                                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                                  <span className="text-xs font-bold text-slate-400">لقد أكملت هذا التقييم</span>
                                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                    <CheckCircle2 size={16} />
                                  </div>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => {
                                    setSelectedQuiz(quiz);
                                    setSelectedStudent(studentSession);
                                    setView('quiz');
                                  }}
                                  className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
                                >
                                  <span>ابدأ الاختبار الآن 🚀</span>
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {view === 'management' && (
            <Management 
              data={appData} 
              evaluations={evaluations} 
              onClose={() => setView('dashboard')} 
              filterTeacherId={globalFilterTeacherId}
              onFilterTeacherChange={setGlobalFilterTeacherId}
              onSelectStudent={(st) => { setSelectedStudent(st); setView('student-profile'); }}
              academicYear={academicYear}
            />
          )}

          {view === 'quiz-report' && selectedQuiz && (
             <QuizReport
               quiz={selectedQuiz}
               data={appData}
               filterTeacherId={globalFilterTeacherId}
               onClose={() => {
                 setView(selectedTeacher ? 'teacher-profile' : 'dashboard');
                 setSelectedQuiz(null);
               }}
               onPreviewQuiz={() => setView('quiz')}
             />
          )}

          {view === 'quiz' && selectedQuiz && (
             <QuizPlayer 
               quiz={selectedQuiz} 
               student={selectedStudent || undefined} 
               classStudents={selectedStudent ? appData.students.filter(s => s.classId === selectedStudent.classId && !s.isArchived) : undefined}
               quizResults={appData.quizResults}
               onSelectStudent={setSelectedStudent}
               allSkills={appData.skills}
               allSubjects={appData.subjects}
               onClose={() => { 
                if (studentSession) {
                   setView('student-portal');
                   setSelectedQuiz(null);
                } else if (showStudentQuizPortal) {
                   setView('quiz-login');
                   setSelectedQuiz(null);
                   setSelectedStudent(null);
                } else if (selectedStudent) {
                   setView('student-profile'); 
                   setSelectedQuiz(null);
                } else {
                   setView('quiz-report');
                   // keep selectedQuiz to view the report
                }
              }} 
            />
          )}

          {view === 'quiz-login' && (
            <QuizLogin 
              data={appData} 
              onSelect={(q, st) => { setSelectedQuiz(q); setSelectedStudent(st); setView('quiz'); }} 
              onClose={() => { setShowStudentQuizPortal(false); setView('dashboard'); }} 
            />
          )}

          {view === 'quick-matrix' && (
            <MonitoringMatrix 
              data={appData}
              evaluations={evaluations}
              setEvaluations={setEvaluations}
              academicYear={academicYear}
              initialClassId={selectedClass?.id}
              initialSubjectId={selectedSubject?.id}
              onClose={() => setView('dashboard')}
              onSelectStudent={(st) => { setSelectedStudent(st); setView('student-profile'); }}
            />
          )}

          {view === 'teacher-profile' && selectedTeacher && (
            <TeacherProfile 
              teacher={selectedTeacher}
              data={appData}
              calculatePerformance={calculatePerformance}
              onClose={() => setView('dashboard')}
              onSelectQuiz={(q) => { setSelectedQuiz(q); setView('quiz-report'); }}
            />
          )}

          {view === 'student-profile' && selectedStudent && (
            <StudentProfile 
              student={selectedStudent}
              data={appData}
              evaluations={evaluations}
              academicYear={academicYear}
              onClose={() => setView('dashboard')}
              onStartQuiz={(q) => { setSelectedQuiz(q); setView('quiz'); }}
            />
          )}

          {(view === 'subjects' || view === 'skills' || view === 'evaluation') && selectedClass && (
            <motion.div 
              key="class-layout"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex overflow-hidden"
            >
              {/* Sidebar */}
              <aside className="w-72 bg-white border-l border-slate-200 p-6 flex flex-col gap-6 shrink-0 overflow-y-auto scrollbar-hide h-full transition-all">
                <div>
                  <button 
                    onClick={() => { setView('dashboard'); setSelectedClass(null); setSelectedSubject(null); setSelectedSkill(null); }}
                    className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 font-bold text-xs mb-6 transition-colors group"
                  >
                    <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    العودة لجميع الفصول
                  </button>
                  
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">الفصل المختار</p>
                  <div className="bg-slate-950 text-white p-5 rounded-[24px] shadow-xl shadow-indigo-100/10 flex flex-col gap-4 relative overflow-hidden">
                    <div className="relative z-10">
                      <p className="text-[10px] font-bold opacity-60 mb-0.5">تفاصيل الأداء</p>
                      <p className="text-lg font-black">{selectedClass.name}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 relative z-10">
                       <div className="bg-white/5 p-2 rounded-xl border border-white/10">
                          <p className="text-[7px] font-black opacity-40 uppercase mb-1">المختبرين</p>
                          <p className="text-sm font-black text-emerald-400">
                             {(() => {
                               const classStudents = appData.students.filter(s => s.classId === selectedClass.id);
                               const testedIds = new Set(appData.quizResults?.filter(r => classStudents.some(s => s.id === r.studentId)).map(r => r.studentId));
                               return testedIds.size;
                             })()}
                          </p>
                       </div>
                       <div className="bg-white/5 p-2 rounded-xl border border-white/10">
                          <p className="text-[7px] font-black opacity-40 uppercase mb-1">المتبقي</p>
                          <p className="text-sm font-black text-rose-400">
                             {(() => {
                               const classStudents = appData.students.filter(s => s.classId === selectedClass.id);
                               const testedIds = new Set(appData.quizResults?.filter(r => classStudents.some(s => s.id === r.studentId)).map(r => r.studentId));
                               return Math.max(0, classStudents.length - testedIds.size);
                             })()}
                          </p>
                       </div>
                    </div>
                    
                    <div className="relative z-10 bg-white/5 p-3 rounded-2xl backdrop-blur-sm border border-white/10">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[8px] font-black uppercase">المعدل العام</span>
                        <span className="text-lg font-black text-indigo-400">{calculatePerformance(selectedClass.id)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-l from-indigo-500 to-sky-400 transition-all duration-1000" style={{ width: `${calculatePerformance(selectedClass.id)}%` }} />
                      </div>
                    </div>

                    {selectedSubject && (
                      <div className="relative z-10 pt-2 border-t border-white/5">
                        <p className="text-[8px] font-black opacity-40 uppercase mb-1">المادة والمعلم</p>
                        <p className="text-[11px] font-bold text-indigo-200 truncate">{selectedSubject.name} - {selectedSubject.teacherName || 'عام'}</p>
                      </div>
                    )}

                    <Award className="absolute -bottom-4 -left-4 w-20 h-20 text-white/5 -rotate-12" />
                  </div>
                </div>

                <div className="flex-1 space-y-8">
                  {/* Breadcrumb style navigation in sidebar */}
                  <div className="space-y-4">
                    <button 
                      onClick={() => { setView('subjects'); setSelectedSubject(null); setSelectedSkill(null); }}
                      className={`w-full p-4 rounded-2xl flex items-center justify-between transition-all ${!selectedSubject ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-600'}`}
                    >
                      <span className="font-black text-sm">المواد الدراسية</span>
                      {!selectedSubject && <ChevronRight size={16} />}
                    </button>
                    
                    {selectedSubject && (
                      <button 
                        onClick={() => { setView('skills'); setSelectedSkill(null); }}
                        className={`w-full p-4 rounded-2xl flex items-center justify-between transition-all ${selectedSubject && !selectedSkill ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-600'}`}
                      >
                         <div className="text-right">
                           <span className="block text-[8px] font-black opacity-60 uppercase">المادة المختارة</span>
                        <span className="font-black text-sm">{selectedSubject.name}</span>
                      </div>
                      {!selectedSkill && <ChevronRight size={16} />}
                    </button>
                  )}
                  
                  {(view === 'evaluation' || (selectedClass && !selectedSubject)) && (
                    <button 
                      onClick={() => { setView('evaluation'); setSelectedSubject(null); setSelectedSkill(null); }}
                      className={`w-full p-4 rounded-2xl flex items-center justify-between transition-all ${view === 'evaluation' ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-600'}`}
                    >
                       <span className="font-black text-sm">التشخيص والقياس</span>
                       {view === 'evaluation' && <ChevronRight size={16} />}
                    </button>
                  )}
                </div>

                {/* Students List in Sidebar with Search */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">طلاب الفصل</p>
                     <div className="relative w-32 group">
                        <Search className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                        <input 
                          type="text"
                          value={studentSearch}
                          onChange={(e) => setStudentSearch(e.target.value)}
                          placeholder="بحث سريع..."
                          className="w-full bg-slate-50 border border-slate-100 rounded-lg py-1 pr-6 pl-2 text-[9px] font-bold outline-none focus:ring-2 focus:ring-indigo-100 transition-all font-sans"
                        />
                     </div>
                  </div>
                  
                  <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1 scrollbar-hide">
                     {appData.students
                       .filter(s => s.classId === selectedClass.id && !s.isArchived)
                       .filter(s => s.name.includes(studentSearch))
                       .map(s => (
                       <button 
                         key={s.id}
                         onClick={() => { setSelectedStudent(s); setView('student-profile'); }}
                         className="text-right p-2 rounded-xl text-[10px] font-bold text-slate-500 hover:bg-slate-50 hover:text-indigo-600 transition-all border border-transparent hover:border-slate-100"
                       >
                         {s.name}
                       </button>
                     ))}
                  </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 italic">
                   <div className="flex items-center gap-3 bg-yellow-50 p-4 rounded-2xl text-yellow-700">
                      <AlertCircle size={18} />
                      <p className="text-[10px] font-bold leading-tight">يرجى التأكد من رصد الاختبار القبلي في بداية العام.</p>
                   </div>
                </div>
              </aside>

              {/* Main Content Area */}
              <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50">
                <div className="flex-1 p-8 overflow-y-auto scrollbar-hide">
                  <div className="max-w-6xl mx-auto">
                    <AnimatePresence mode="wait">
                      {(view === 'subjects' || view === 'skills' || view === 'evaluation') && selectedClass && (
                        <motion.div 
                          key="class-unified-monitoring"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="space-y-10"
                        >
                           <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                             <div>
                                <h1 className="text-xl font-black text-slate-900">{selectedClass.name}</h1>
                                <p className="text-slate-400 font-medium text-[11px] mt-1 italic">
                                   {selectedClass.gradeId && appData.grades.find(g => g.id === selectedClass.gradeId)?.name}
                                </p>
                             </div>
                             <div className="flex gap-2">
                                <button 
                                  onClick={() => setView('dashboard')}
                                  className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-[10px] font-black hover:bg-slate-50 transition-all flex items-center gap-2"
                                >
                                  <ArrowRight size={14} />
                                  عودة
                                </button>
                                <button 
                                  onClick={() => setView('quick-matrix')}
                                  className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100"
                                >
                                  <LayoutDashboard size={14} />
                                  الشبكة
                                </button>
                             </div>
                           </header>

                           {!selectedSubject ? (
                             <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                               <div className="mb-6">
                                  <h3 className="text-sm font-black text-slate-800">اختر المادة الدراسية</h3>
                                  <p className="text-[10px] text-slate-400 font-bold">للبدء في رصد المهارات أو الاختبارات الذكية</p>
                               </div>
                               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                  {appData.subjects.filter(sub => 
                                    sub.gradeId === selectedClass.gradeId && 
                                    (!sub.classId || sub.classId === selectedClass.id || sub.classIds?.includes(selectedClass.id)) &&
                                    !sub.isArchived
                                  ).map(sub => (
                                    <button 
                                      key={sub.id}
                                      onClick={() => { setSelectedSubject(sub); setView('subjects'); }}
                                      className="bg-white p-6 rounded-[32px] border border-slate-100 hover:border-indigo-500 shadow-minimal hover:shadow-xl transition-all text-right group relative overflow-hidden"
                                    >
                                      <div className="relative z-10 flex flex-col gap-4">
                                         <div className="flex justify-between items-center">
                                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                               <BookOpen size={24} />
                                            </div>
                                            <div className="text-[10px] font-black text-slate-300">مادة دراسية</div>
                                         </div>
                                         <div>
                                            <h4 className="text-lg font-black text-slate-800 group-hover:text-indigo-600 transition-colors">{sub.name}</h4>
                                            <p className="text-[10px] text-slate-400 font-bold mt-1">تتضمن {getSkillsForSubject(sub).length} مهارات رصد</p>
                                         </div>
                                         <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                                            <div className="flex items-center gap-1.5">
                                               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                               <span className="text-[10px] font-black text-slate-500">{calculatePerformance(selectedClass.id, sub.id)}% إنجاز</span>
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
                                               <ChevronRight size={14} />
                                            </div>
                                         </div>
                                      </div>
                                    </button>
                                  ))}
                               </div>
                             </div>
                           ) : (
                             <div className="space-y-10 animate-in fade-in slide-in-from-left-4 duration-500">
                                <header className="flex items-center gap-4 bg-indigo-50 p-4 rounded-3xl border border-indigo-100">
                                   <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
                                      <BookOpen size={24} />
                                   </div>
                                   <div>
                                      <div className="flex items-center gap-2">
                                         <h3 className="text-lg font-black text-slate-800">{selectedSubject.name}</h3>
                                         <button 
                                           onClick={() => setSelectedSubject(null)}
                                           className="text-[10px] font-black text-indigo-600 bg-white px-2 py-1 rounded-lg border border-indigo-100"
                                         >تغيير المادة</button>
                                      </div>
                                      <p className="text-[10px] font-bold text-slate-500">لوحة المهارات والاختبارات لهذه المادة</p>
                                   </div>
                                </header>
                                
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                  {/* Skills Column */}
                                  <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-minimal space-y-6">
                                     <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                           <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
                                              <Star size={20} className="fill-current" />
                                           </div>
                                           <h3 className="text-base font-black text-slate-800">المهارات والتقييمات</h3>
                                        </div>
                                     </div>
                                     
                                     <div className="flex flex-wrap gap-2">
                                        {getSkillsForSubject(selectedSubject).map(skill => (
                                          <button
                                            key={skill.id}
                                            onClick={() => { setSelectedSkill(skill); setSelectedQuiz(null); }}
                                            className={`px-4 py-3 rounded-xl font-black text-xs transition-all border ${
                                              selectedSkill?.id === skill.id && !selectedQuiz
                                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg scale-105' 
                                              : 'bg-slate-50 text-slate-600 border-slate-100 hover:border-indigo-200 hover:bg-white'
                                            }`}
                                          >
                                             {skill.name}
                                          </button>
                                        ))}
                                        {getSkillsForSubject(selectedSubject).length === 0 && <p className="text-xs text-slate-300 py-6">لا توجد مهارات مضافة</p>}
                                     </div>
                                  </div>

                                  {/* Quizzes Column */}
                                  <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-minimal space-y-6">
                                     <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                           <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                                              <BrainCircuit size={20} />
                                           </div>
                                           <h3 className="text-base font-black text-slate-800">الاختبارات الذكية</h3>
                                        </div>
                                     </div>

                                     <div className="flex flex-wrap gap-2">
                                        {getQuizzesForSubject(selectedSubject).map(quiz => (
                                          <button
                                            key={quiz.id}
                                            onClick={() => { setSelectedQuiz(quiz); setSelectedSkill(null); }}
                                            className={`px-4 py-3 rounded-xl font-black text-xs transition-all border flex items-center gap-2 ${
                                              selectedQuiz?.id === quiz.id 
                                              ? 'bg-yellow-400 text-indigo-900 border-yellow-400 shadow-lg scale-105' 
                                              : 'bg-slate-50 text-slate-600 border-slate-100 hover:border-yellow-200 hover:bg-yellow-50'
                                            }`}
                                          >
                                             <Zap size={14} className="fill-current" />
                                             {quiz.title}
                                          </button>
                                        ))}
                                        {getQuizzesForSubject(selectedSubject).length === 0 && <p className="text-xs text-slate-300 py-6">لا توجد اختبارات منشورة</p>}
                                     </div>
                                  </div>
                                </div>
                             </div>
                           )}

                           {/* Monitoring Area */}
                           <AnimatePresence mode="wait">
                             {(selectedSkill || selectedQuiz) ? (
                               <motion.div 
                                 key={selectedSkill ? `skill-${selectedSkill.id}` : `quiz-${selectedQuiz?.id}`}
                                 initial={{ opacity: 0, y: 10 }}
                                 animate={{ opacity: 1, y: 0 }}
                                 exit={{ opacity: 0, y: -10 }}
                                 className="space-y-6 pt-6 border-t border-slate-100"
                               >
                                  <div className="flex justify-between items-center px-2">
                                     <div className="flex items-center gap-3">
                                        <div className={`w-1.5 h-6 rounded-full ${selectedSkill ? 'bg-green-500' : 'bg-yellow-400'}`} />
                                        <h3 className="text-lg font-black text-slate-800">
                                          رصد الأداء: {selectedSkill?.name || selectedQuiz?.title}
                                        </h3>
                                     </div>
                                     {selectedSkill && (
                                   <div className="flex gap-4">
                                          <div className="flex items-center gap-2 font-black text-[10px] text-slate-400">
                                             <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                                             <span>متقن</span>
                                          </div>
                                          <div className="flex items-center gap-2 font-black text-[10px] text-slate-400">
                                             <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                                             <span>متقدم</span>
                                          </div>
                                          <div className="flex items-center gap-2 font-black text-[10px] text-slate-400">
                                             <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                                             <span>مقبول</span>
                                          </div>
                                          <div className="flex items-center gap-2 font-black text-[10px] text-slate-400">
                                             <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                                             <span>ضعيف</span>
                                          </div>
                                          <div className="flex items-center gap-2 font-black text-[10px] text-slate-400">
                                             <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                                             <span>غير مجتاز</span>
                                          </div>
                                       </div>
                                     )}
                                  </div>

                                  {/* Analytics moved to bottom */}
                                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                     {appData.students.filter(s => (s.classId === selectedClass.id) && !s.isArchived).map(student => {
                                       const evalData = selectedSkill ? evaluations[`${student.id}-${selectedSkill.id}-${academicYear}`] : null;
                                       const quizResult = selectedQuiz ? appData.quizResults?.find(r => r.studentId === student.id && r.quizId === selectedQuiz.id) : null;
                                       const isTested = !!(evalData?.score || quizResult);
                                       
                                       return (
                                         <div
                                           key={student.id}
                                           className={`bg-white rounded-[32px] border transition-all flex flex-col p-4 relative group ${
                                             selectedStudent?.id === student.id ? 'border-sky-600 shadow-xl scale-[1.02]' : 'border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200'
                                           } ${isTested ? 'bg-green-50/20 border-green-100' : ''}`}
                                         >
                                            {isTested && (
                                              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-green-500 border-2 border-white flex items-center justify-center text-white z-10 shadow-lg">
                                                 <CheckCircle2 size={12} />
                                              </div>
                                            )}
                                            <div 
                                              onClick={() => setSelectedStudent(student)}
                                              className="flex flex-col items-center gap-2 cursor-pointer mb-3"
                                            >
                                               <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg transition-all shadow-sm ${
                                                 evalData?.score === 'mastered' ? 'bg-green-600 text-white shadow-green-100' :
                                                 evalData?.score === 'advanced' ? 'bg-blue-600 text-white shadow-blue-100' :
                                                 evalData?.score === 'accepted' ? 'bg-amber-500 text-white shadow-amber-100' :
                                                 evalData?.score === 'weak' ? 'bg-orange-600 text-white shadow-orange-100' :
                                                 evalData?.score === 'very-weak' ? 'bg-red-600 text-white shadow-red-100' : 
                                                 (quizResult ? 'bg-indigo-600 text-white shadow-indigo-100' : 'bg-slate-50 text-slate-300')
                                               }`}>
                                                  {student.name.charAt(0)}
                                               </div>
                                               <div className="text-center">
                                                 <p className="text-[11px] font-black text-slate-800 line-clamp-1">{student.name.split(' ')[0]}</p>
                                                 {quizResult && (
                                                   <div className="flex items-center justify-center gap-1 mt-0.5">
                                                     <span className="text-[9px] font-black text-indigo-600">{quizResult.score}%</span>
                                                     <CheckCircle2 size={8} className="text-green-500" />
                                                   </div>
                                                 )}
                                               </div>
                                            </div>

                                            {selectedSkill ? (
                                              <div className="flex gap-1.5 justify-center mt-auto border-t border-slate-50 pt-3 flex-wrap">
                                                 <button 
                                                   onClick={() => saveEvaluation(student.id, selectedSkill.id, 'mastered')}
                                                   className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${evalData?.score === 'mastered' ? 'bg-green-600 text-white ring-4 ring-green-100' : 'bg-slate-50 text-slate-400 hover:bg-green-50 hover:text-green-600'}`}
                                                   title="متقن"
                                                 >
                                                    <CheckCircle2 size={14} />
                                                 </button>
                                                 <button 
                                                   onClick={() => saveEvaluation(student.id, selectedSkill.id, 'advanced')}
                                                   className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${evalData?.score === 'advanced' ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600'}`}
                                                   title="متقدم"
                                                 >
                                                    <Star size={14} className="fill-current" />
                                                 </button>
                                                 <button 
                                                   onClick={() => saveEvaluation(student.id, selectedSkill.id, 'accepted')}
                                                   className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${evalData?.score === 'accepted' ? 'bg-amber-500 text-white ring-4 ring-amber-100' : 'bg-slate-50 text-slate-400 hover:bg-amber-50 hover:text-amber-600'}`}
                                                   title="مقبول"
                                                 >
                                                    <Zap size={14} />
                                                 </button>
                                                 <button 
                                                   onClick={() => saveEvaluation(student.id, selectedSkill.id, 'weak')}
                                                   className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${evalData?.score === 'weak' ? 'bg-orange-600 text-white ring-4 ring-orange-100' : 'bg-slate-50 text-slate-400 hover:bg-orange-50 hover:text-orange-600'}`}
                                                   title="ضعيف"
                                                  >
                                                     <AlertCircle size={14} />
                                                  </button>
                                                  <button 
                                                    onClick={() => saveEvaluation(student.id, selectedSkill.id, 'very-weak')}
                                                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${evalData?.score === 'very-weak' ? 'bg-red-600 text-white ring-4 ring-red-100' : 'bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-600'}`}
                                                    title="غير مجتاز"
                                                  >
                                                     <XCircle size={14} />
                                                  </button>
                                               </div>
                                             ) : selectedQuiz && (
                                               <button 
                                                 onClick={() => { setSelectedStudent(student); setView('quiz'); }}
                                                 className="w-full py-2 bg-yellow-400 text-indigo-900 rounded-xl font-black text-[9px] flex items-center justify-center gap-1 hover:scale-105 transition-all mt-auto"
                                               >
                                                  <BrainCircuit size={10} />
                                                  بدء الاختبار
                                               </button>
                                             )}
                                          </div>
                                        );
                                      })}
                                  </div>

                                  {/* Analytics Section at bottom */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                                     {/* Coverage Ratio */}
                                     <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                           <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg">
                                              <TrendingUp size={20} />
                                           </div>
                                           <div>
                                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">مؤشر التغطية</p>
                                              <h4 className="text-lg font-black text-slate-800 leading-none">نسبة الشمولية للفصل</h4>
                                           </div>
                                        </div>
                                        <div className="w-full">
                                           <div className="flex justify-between items-end mb-2">
                                              <span className="text-xl font-black text-slate-900 leading-none">
                                                 {(() => {
                                                    const students = appData.students.filter(s => s.classId === selectedClass.id && !s.isArchived);
                                                    const testedCount = students.filter(s => {
                                                       const eData = selectedSkill ? evaluations[`${s.id}-${selectedSkill.id}-${academicYear}`] : null;
                                                       const qResult = selectedQuiz ? appData.quizResults?.find(r => r.studentId === s.id && r.quizId === selectedQuiz.id) : null;
                                                       return eData?.score || qResult;
                                                    }).length;
                                                    return students.length > 0 ? Math.round((testedCount / students.length) * 100) : 0;
                                                 })()}%
                                              </span>
                                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                 {(() => {
                                                    const students = appData.students.filter(s => s.classId === selectedClass.id && !s.isArchived);
                                                    const testedCount = students.filter(s => {
                                                       const eData = selectedSkill ? evaluations[`${s.id}-${selectedSkill.id}-${academicYear}`] : null;
                                                       const qResult = selectedQuiz ? appData.quizResults?.find(r => r.studentId === s.id && r.quizId === selectedQuiz.id) : null;
                                                       return eData?.score || qResult;
                                                    }).length;
                                                    return `${testedCount} من ${students.length} طلاب موردين`;
                                                 })()}
                                              </span>
                                           </div>
                                           <div className="h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-200 p-0.5">
                                              <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ 
                                                  width: `${(() => {
                                                     const students = appData.students.filter(s => s.classId === selectedClass.id && !s.isArchived);
                                                     const testedCount = students.filter(s => {
                                                        const eData = selectedSkill ? evaluations[`${s.id}-${selectedSkill.id}-${academicYear}`] : null;
                                                        const qResult = selectedQuiz ? appData.quizResults?.find(r => r.studentId === s.id && r.quizId === selectedQuiz.id) : null;
                                                        return eData?.score || qResult;
                                                     }).length;
                                                     return students.length > 0 ? (testedCount / students.length) * 100 : 0;
                                                  })()}%`
                                                }}
                                                className="h-full bg-indigo-600 rounded-full"
                                              />
                                           </div>
                                        </div>
                                     </div>

                                     {/* Performance Ratio (Achievement Rate) */}
                                     <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                           <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-lg">
                                              <Star size={20} />
                                           </div>
                                           <div>
                                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">مؤشر الإنجاز</p>
                                              <h4 className="text-lg font-black text-slate-800 leading-none">نسبة التحصيل النوعي</h4>
                                           </div>
                                        </div>
                                        <div className="w-full">
                                           <div className="flex justify-between items-end mb-2">
                                              <span className="text-xl font-black text-slate-900 leading-none">
                                                 {(() => {
                                                    const students = appData.students.filter(s => s.classId === selectedClass.id && !s.isArchived);
                                                    const scoredStudents = students.filter(s => {
                                                       const eData = selectedSkill ? evaluations[`${s.id}-${selectedSkill.id}-${academicYear}`] : null;
                                                       const qRes = selectedQuiz ? appData.quizResults?.find(r => r.studentId === s.id && r.quizId === selectedQuiz.id) : null;
                                                       return eData?.score || qRes;
                                                    });
                                                    if (scoredStudents.length === 0) return 0;
                                                    const totalScore = scoredStudents.reduce((acc, s) => {
                                                       if (selectedSkill) {
                                                          const eData = evaluations[`${s.id}-${selectedSkill.id}-${academicYear}`];
                                                          const scoreMap: Record<string, number> = { 'mastered': 100, 'advanced': 85, 'accepted': 70, 'weak': 40, 'very-weak': 20 };
                                                          return acc + (scoreMap[eData?.score] || 0);
                                                       } else if (selectedQuiz) {
                                                          const qRes = appData.quizResults?.find(r => r.studentId === s.id && r.quizId === selectedQuiz.id);
                                                          return acc + (qRes?.score || 0);
                                                       }
                                                       return acc;
                                                    }, 0);
                                                    return Math.round(totalScore / scoredStudents.length);
                                                 })()}%
                                              </span>
                                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">متوسط إنجاز المقيّمين</span>
                                           </div>
                                           <div className="h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-200 p-0.5">
                                              <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ 
                                                  width: `${(() => {
                                                     const students = appData.students.filter(s => s.classId === selectedClass.id && !s.isArchived);
                                                     const scoredStudents = students.filter(s => {
                                                        const eData = selectedSkill ? evaluations[`${s.id}-${selectedSkill.id}-${academicYear}`] : null;
                                                        const qRes = selectedQuiz ? appData.quizResults?.find(r => r.studentId === s.id && r.quizId === selectedQuiz.id) : null;
                                                        return eData?.score || qRes;
                                                     });
                                                     if (scoredStudents.length === 0) return 0;
                                                     const totalScore = scoredStudents.reduce((acc, s) => {
                                                        if (selectedSkill) {
                                                           const eData = evaluations[`${s.id}-${selectedSkill.id}-${academicYear}`];
                                                           const scoreMap: Record<string, number> = { 'mastered': 100, 'advanced': 85, 'accepted': 70, 'weak': 40, 'very-weak': 20 };
                                                           return acc + (scoreMap[eData?.score] || 0);
                                                        } else if (selectedQuiz) {
                                                           const qRes = appData.quizResults?.find(r => r.studentId === s.id && r.quizId === selectedQuiz.id);
                                                           return acc + (qRes?.score || 0);
                                                        }
                                                        return acc;
                                                     }, 0);
                                                     return totalScore / scoredStudents.length;
                                                  })()}%`
                                                }}
                                                className="h-full bg-orange-500 rounded-full"
                                              />
                                           </div>
                                        </div>
                                     </div>
                                  </div>
                               </motion.div>
                             ) : (
                               <div className="h-64 flex flex-col items-center justify-center text-center space-y-4 bg-white rounded-[48px] border border-dashed border-slate-200">
                                  <div className="w-16 h-16 bg-slate-50 rounded-[24px] flex items-center justify-center text-slate-200">
                                     <LayoutDashboard size={32} />
                                  </div>
                                  <div>
                                     <h3 className="text-xl font-black text-slate-400 italic">الرجاء اختيار مهارة أو اختبار</h3>
                                     <p className="text-slate-300 text-[10px] font-medium mt-1">بمجرد الاختيار، ستتمكن من مراجعة ورصد أداء جميع طلاب الفصل بضغطة واحدة.</p>
                                  </div>
                               </div>
                             )}
                           </AnimatePresence>

                           {/* Subjects Performance Chart */}
                           <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-minimal">
                              <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                                <BarChart3 size={20} className="text-indigo-600" />
                                مؤشرات المواد الدراسية
                              </h3>
                              <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart
                                    data={appData.subjects
                                      .filter(sub => 
                                        sub.gradeId === selectedClass.gradeId && 
                                        (!sub.classId || sub.classId === selectedClass.id || sub.classIds?.includes(selectedClass.id)) &&
                                        !sub.isArchived
                                      )
                                      .map(sub => ({
                                        name: sub.name,
                                        perf: calculatePerformance(selectedClass.id, sub.id)
                                      }))}
                                    margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                                  >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 'bold' }} dy={10} />
                                    <YAxis hide domain={[0, 100]} />
                                    <Tooltip 
                                      cursor={{ fill: '#f8fafc' }}
                                      content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                          return (
                                            <div className="bg-slate-900 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-xl">
                                              {payload[0].payload.name}: {payload[0].value}%
                                            </div>
                                          );
                                        }
                                        return null;
                                      }}
                                    />
                                    <Bar dataKey="perf" radius={[8, 8, 8, 8]} barSize={40}>
                                      {
                                        appData.subjects.filter(sub => 
                                          sub.gradeId === selectedClass.gradeId && 
                                          (!sub.classId || sub.classId === selectedClass.id || sub.classIds?.includes(selectedClass.id)) &&
                                          !sub.isArchived
                                        ).map((entry, index) => {
                                          const perf = calculatePerformance(selectedClass.id, entry.id);
                                          const color = perf >= 80 ? '#22c55e' : (perf >= 50 ? '#f59e0b' : '#ef4444');
                                          return <Cell key={`cell-${index}`} fill={color} />;
                                        })
                                      }
                                    </Bar>
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                           </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Individual Evaluation Overlay/Section */}
                <AnimatePresence>
                  {selectedStudent && selectedSkill && (
                     <motion.div 
                       initial={{ y: '100%' }}
                       animate={{ y: 0 }}
                       exit={{ y: '100%' }}
                       transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                       className="fixed inset-x-0 bottom-0 top-32 bg-white rounded-t-[60px] shadow-[0_-20px_80px_rgba(0,0,0,0.1)] z-50 p-12 border-t border-slate-200 flex flex-col md:flex-row gap-12"
                     >
                        <button 
                          onClick={() => setSelectedStudent(null)}
                          className="absolute top-8 left-12 bg-slate-100 text-slate-400 px-6 py-2 rounded-full font-black text-xs hover:bg-slate-200"
                        >إغلاق التقييم الفردي</button>

                        <div className="md:w-1/3 flex flex-col gap-8">
                           <div className="bg-indigo-50 p-10 rounded-[48px] border border-indigo-100">
                              <p className="text-indigo-600 font-black text-xs mb-4 uppercase tracking-[0.2em] underline">ملف الطالب</p>
                              <h3 className="text-4xl font-black text-slate-900 mb-2">{selectedStudent.name}</h3>
                              <p className="text-slate-400 font-medium">سجل الأداء التعليمي • {selectedClass.name}</p>
                              
                              <div className="mt-8 pt-8 border-t border-indigo-200/50 space-y-4">
                                  <div>
                                     <p className="text-[10px] font-black text-slate-400 uppercase mb-2">مقياس التقدم في المادة</p>
                                     <div className="flex items-center gap-4">
                                         <div className="flex-1 h-3 bg-indigo-200/50 rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-600" style={{ width: `${calculateStudentSkillPerformance(selectedStudent.id, selectedSubject.id)}%` }} />
                                         </div>
                                         <span className="font-black text-indigo-700">{calculateStudentSkillPerformance(selectedStudent.id, selectedSubject.id)}%</span>
                                     </div>
                                  </div>

                                  {getQuizzesForSubject(selectedSubject).map(q => (
                                    <button
                                      key={q.id}
                                      onClick={() => { setSelectedQuiz(q); setView('quiz'); }}
                                      className="w-full py-4 bg-yellow-400 text-indigo-900 rounded-2xl font-black text-xs flex items-center justify-center gap-2 hover:scale-105 transition-all shadow-xl shadow-yellow-100"
                                    >
                                       <BrainCircuit size={18} />
                                       بدء اختبار الطالب: {q.title}
                                    </button>
                                  ))}
                               </div>
                            </div>
                         </div>

                         <div className="flex-1 flex flex-col gap-8">
                            <div className="bg-slate-50 p-8 rounded-[40px] border border-slate-100">
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">درجة التقييم الحالية</p>
                               <div className="flex gap-4">
                                  <EvaluationButtonLarge 
                                    active={evaluations[`${selectedStudent.id}-${selectedSkill.id}-${academicYear}`]?.score === 'mastered'} 
                                    type="mastered" 
                                    onClick={(note) => { saveEvaluation(selectedStudent.id, selectedSkill.id, 'mastered', note); setSelectedStudent(null); }}
                                  >متقن</EvaluationButtonLarge>
                                  <EvaluationButtonLarge 
                                    active={evaluations[`${selectedStudent.id}-${selectedSkill.id}-${academicYear}`]?.score === 'advanced'} 
                                    type="advanced" 
                                    onClick={(note) => { saveEvaluation(selectedStudent.id, selectedSkill.id, 'advanced', note); setSelectedStudent(null); }}
                                  >متقدم</EvaluationButtonLarge>
                                  <EvaluationButtonLarge 
                                    active={evaluations[`${selectedStudent.id}-${selectedSkill.id}-${academicYear}`]?.score === 'accepted'} 
                                    type="accepted" 
                                    onClick={(note) => { saveEvaluation(selectedStudent.id, selectedSkill.id, 'accepted', note); setSelectedStudent(null); }}
                                  >مقبول</EvaluationButtonLarge>
                                  <EvaluationButtonLarge 
                                    active={evaluations[`${selectedStudent.id}-${selectedSkill.id}-${academicYear}`]?.score === 'weak'} 
                                    type="weak" 
                                    onClick={(note) => { saveEvaluation(selectedStudent.id, selectedSkill.id, 'weak', note); setSelectedStudent(null); }}
                                  >ضعيف</EvaluationButtonLarge>
                                  <EvaluationButtonLarge 
                                    active={evaluations[`${selectedStudent.id}-${selectedSkill.id}-${academicYear}`]?.score === 'very-weak'} 
                                    type="very-weak" 
                                    onClick={(note) => { saveEvaluation(selectedStudent.id, selectedSkill.id, 'very-weak', note); setSelectedStudent(null); }}
                                  >ضعيف جداً</EvaluationButtonLarge>
                                  {evaluations[`${selectedStudent.id}-${selectedSkill.id}-${academicYear}`] && (
                                    <button 
                                      onClick={async () => {
                                        setConfirmConfig({
                                          isOpen: true,
                                          title: 'مسح التقييم',
                                          message: 'هل أنت متأكد من مسح هذا التقييم؟ لا يمكن التراجع عن هذه العملية.',
                                          confirmLabel: 'مسح التقييم الآن',
                                          isDestructive: true,
                                          onConfirm: async () => {
                                            closeConfirm();
                                            try {
                                              await firestoreService.deleteEvaluation(selectedStudent.id, selectedSkill.id, academicYear);
                                              setSelectedStudent(null);
                                            } catch (err) {
                                              alert('خطأ في الحذف');
                                            }
                                          }
                                        });
                                      }}
                                      className="flex flex-col items-center justify-center gap-2 p-6 rounded-[32px] border-2 border-red-100 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all group shrink-0"
                                    >
                                      <Eraser size={24} />
                                      <span className="text-[10px] font-black uppercase">مسح</span>
                                    </button>
                                  )}
                               </div>
                            </div>

                            <div className="flex-1 bg-white border-2 border-dashed border-slate-200 rounded-[40px] p-8 flex flex-col">
                               <div className="flex justify-between items-center mb-6">
                                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">توقيع المعلم وملاحظات إضافية</p>
                                 <button className="text-indigo-600 font-bold text-xs hover:underline">مسح التوقيع</button>
                               </div>
                               <div className="flex-1 relative cursor-crosshair">
                                  <SignatureCanvas 
                                    penColor='#1e293b'
                                    canvasProps={{ className: 'w-full h-full' }}
                                  />
                                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-5 select-none">
                                     <Award size={120} />
                                  </div>
                               </div>
                            </div>
                         </div>
                      </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {view === 'reports' && (
            <ProfessionalReports 
              data={appData} 
              evaluations={evaluations} 
              academicYear={academicYear}
              onSelectStudent={(st) => { setSelectedStudent(st); setView('student-report'); }}
              filterTeacherId={globalFilterTeacherId}
              onClose={isTeacherReportMode ? undefined : () => setView('dashboard')}
              calculatePerformance={calculatePerformance}
            />
          )}

          {view === 'student-report' && (
            <motion.div 
               key="student-report"
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0 }}
               className="flex-1 p-8 overflow-y-auto scrollbar-hide print:p-0 print:overflow-visible print:block"
            >
               <div className="max-w-4xl mx-auto print:max-w-full">
                  <div className="flex justify-between items-center mb-12 print:hidden">
                     <button onClick={() => setView('reports')} className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 font-bold transition-colors">
                        <ChevronRight size={20} />
                        العودة للتقارير العامة
                     </button>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">بطاقة الطالب الذكية</p>
                  </div>

                  {!selectedStudent ? (
                    <div className="bg-white p-12 rounded-[48px] text-center border-2 border-dashed border-slate-200">
                       <Users size={64} className="mx-auto text-slate-200 mb-6" />
                       <h3 className="text-2xl font-black text-slate-300 mb-8">ابحث عن طالب لاستخراج تقريره</h3>
                       <div className="max-w-md mx-auto relative">
                          <input 
                            type="text" 
                            placeholder="اسم الطالب..."
                            value={studentSearch}
                            onChange={(e) => setStudentSearch(e.target.value)}
                            className="w-full h-16 bg-slate-50 rounded-2xl px-8 font-bold border-2 border-transparent focus:border-indigo-600 focus:bg-white outline-none transition-all"
                          />
                          <div className="mt-4 flex flex-wrap gap-2 justify-center">
                             {getAllStudents().filter(s => s.name.includes(studentSearch) && studentSearch.length > 1).map(s => (
                               <button 
                                 key={s.id} 
                                 onClick={() => setSelectedStudent(s)}
                                 className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-xs font-black border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all"
                               >{s.name}</button>
                             ))}
                          </div>
                       </div>
                    </div>
                  ) : (
                    <div className="space-y-8">
                       <div className="bg-white p-12 rounded-[60px] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col md:flex-row gap-12 items-center relative overflow-hidden">
                          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/5 rounded-full -mr-40 -mt-40 blur-3xl" />
                          <div className="w-32 h-32 rounded-[40px] bg-indigo-600 text-white flex items-center justify-center text-5xl font-black shadow-2xl relative z-10 shrink-0">
                             {selectedStudent.name.charAt(0)}
                          </div>
                         <div className="flex-1 text-center md:text-right relative z-10">
                             <div className="flex items-center gap-3 justify-center md:justify-start mb-2">
                                <span className="text-slate-400 font-bold text-sm">#{selectedStudent.id}</span>
                             </div>
                             <h2 className="text-3xl font-black text-slate-900 mb-2">{selectedStudent.name}</h2>
                             <p className="text-slate-500 font-medium text-sm">التقرير الشامل للأداء الأكاديمي ومستوى إتقان المهارات</p>
                          </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {/* Loop through subjects for the student's grade */}
                          {appData.subjects.filter(sub => {
                             const cls = appData.classes.find(c => c.id === selectedStudent.classId);
                             let keep = sub.gradeId === cls?.gradeId;
                             if (keep && globalFilterTeacherId) {
                               keep = sub.teacherId === globalFilterTeacherId || (sub.teacherIds && sub.teacherIds.includes(globalFilterTeacherId)) || false;
                             }
                             return keep;
                          }).map(sub => {
                            const skillsPerformance = calculateStudentSkillPerformance(selectedStudent.id, sub.id);
                            const subjectQuizzes = appData.quizzes.filter(q => 
                              q.subjectIds?.includes(sub.id) && 
                              (!q.classIds || q.classIds.length === 0 || q.classIds.includes(selectedStudent.classId)) && 
                              !q.isArchived
                            );
                            const studentSubResults = subjectQuizzes.map(q => 
                              appData.quizResults?.find(r => r.studentId === selectedStudent.id && r.quizId === q.id)
                            ).filter((r): r is NonNullable<typeof r> => !!r);
                            const quizAvg = studentSubResults.length > 0 
                              ? Math.round(studentSubResults.reduce((sum, r) => sum + r.score, 0) / studentSubResults.length)
                              : 0;
                            const hasQuizzes = studentSubResults.length > 0;
                            const hasSkills = getSkillsForSubject(sub).length > 0;
                            const performance = (hasQuizzes && hasSkills) 
                              ? Math.round((skillsPerformance + quizAvg) / 2) 
                              : (hasSkills ? skillsPerformance : (hasQuizzes ? quizAvg : 0));
                            
                            const teacherId = sub.teacherIds?.[0] || sub.teacherId;
                            const teacher = appData.teachers.find(t => t.id === teacherId);
                            const teacherNameToDisplay = teacher?.name || sub.teacherName || 'عضو هيئة التدريس';

                            return (
                              <div key={sub.id} className="bg-white p-6 md:p-10 rounded-[32px] md:rounded-[48px] border border-slate-100 shadow-minimal flex flex-col gap-6 md:gap-8">
                                 <div className="flex justify-between items-start">
                                    <div>
                                       <p className="text-sm md:text-base font-black text-indigo-600 mb-1">{sub.name}</p>
                                       <p className="text-slate-400 text-[10px] font-bold">بإشراف: {teacherNameToDisplay}</p>
                                    </div>
                                    <div className="text-2xl md:text-3xl font-black text-indigo-900">{performance}%</div>
                                 </div>

                                 <div className="h-4 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                                    <div className={`h-full rounded-full ${performance >= 80 ? 'bg-emerald-500' : performance >= 60 ? 'bg-indigo-500' : 'bg-rose-500'}`} style={{ width: `${performance}%` }} />
                                 </div>

                                 {/* Breakdown card showing both skills & tests */}
                                 <div className="grid grid-cols-2 gap-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-100/50">
                                    <div className="text-center">
                                       <p className="text-[10px] font-black text-slate-400 mb-1">معدل إتقان المهارات</p>
                                       <p className="text-sm font-black text-slate-700">{skillsPerformance}%</p>
                                    </div>
                                    <div className="text-center border-r border-slate-200">
                                       <p className="text-[10px] font-black text-slate-400 mb-1">متوسط الاختبارات</p>
                                       <p className="text-sm font-black text-indigo-700">{hasQuizzes ? `${quizAvg}%` : 'لا توجد نتائج'}</p>
                                    </div>
                                 </div>

                                 <div className="h-48 w-full bg-slate-50/50 rounded-2xl border border-slate-100 p-2 mt-4 mb-2 shadow-inner">
                                   <ResponsiveContainer width="100%" height="100%">
                                     <BarChart data={getSkillsForSubject(sub).map(sk => {
                                       const ev = evaluations[`${selectedStudent.id}-${sk.id}-${academicYear}`];
                                       const scoreMap: Record<string, number> = { 'mastered': 100, 'advanced': 80, 'accepted': 60, 'weak': 40, 'very-weak': 20 };
                                       const scoreLabels: Record<string, string> = { 'mastered': 'متقن', 'advanced': 'متقدم', 'accepted': 'مقبول', 'weak': 'ضعيف', 'very-weak': 'ضعيف جدا' };
                                       return { 
                                         name: sk.name,
                                         shortName: sk.name.length > 12 ? sk.name.slice(0, 12) + '...' : sk.name,
                                         value: ev ? scoreMap[ev.score] || 0 : 0, 
                                         scoreLabel: ev ? scoreLabels[ev.score] || 'غير مقيم' : 'غير مقيم',
                                       };
                                     })} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                                       <XAxis dataKey="shortName" tick={{ fontSize: 9, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} />
                                       <YAxis tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} domain={[0, 100]} ticks={[0, 50, 100]} />
                                       <Tooltip 
                                         cursor={{fill: '#f8fafc'}} 
                                         content={({ active, payload }) => {
                                           if (active && payload && payload.length) {
                                             const data = payload[0].payload;
                                             return (
                                               <div className="bg-white p-2 rounded-xl shadow-lg border border-slate-100 text-right" dir="rtl">
                                                 <p className="text-[10px] font-black text-slate-800 mb-1">{data.name}</p>
                                                 <p className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-1 rounded inline-block">{data.scoreLabel}</p>
                                               </div>
                                             );
                                           }
                                           return null;
                                         }} 
                                       />
                                       <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={30}>
                                          {getSkillsForSubject(sub).map((entry, index) => {
                                             const sk = getSkillsForSubject(sub)[index];
                                             const ev = evaluations[`${selectedStudent.id}-${sk.id}-${academicYear}`];
                                             const score = ev?.score;
                                             return <Cell key={`cell-${index}`} fill={score === 'mastered' ? '#10b981' : score === 'advanced' ? '#0ea5e9' : score === 'accepted' ? '#f59e0b' : score === 'weak' || score === 'very-weak' ? '#ef4444' : '#e2e8f0'} />;
                                          })}
                                       </Bar>
                                     </BarChart>
                                   </ResponsiveContainer>
                                 </div>

                                 <div className="space-y-3">
                                     {getSkillsForSubject(sub).map(skill => {
                                       const evalCur = evaluations[`${selectedStudent.id}-${skill.id}-${academicYear}`];
                                       const scoreLabels: Record<string, string> = { 'mastered': 'متقن', 'advanced': 'متقدم', 'accepted': 'مقبول', 'weak': 'ضعيف', 'very-weak': 'ضعيف جدا' };
                                       return (
                                         <div key={skill.id} className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-slate-50/50 border border-slate-100 hover:bg-white transition-colors group">
                                            <div className="flex justify-between items-center gap-4">
                                               <span className="text-[10px] md:text-xs font-black text-slate-700 leading-tight">{skill.name}</span>
                                               <div className="flex shrink-0">
                                                  {evalCur ? (
                                                    <span className={`px-2 md:px-3 py-1 rounded-lg text-[9px] font-black ${
                                                      evalCur.score === 'mastered' ? 'bg-emerald-100 text-emerald-700' :
                                                      evalCur.score === 'advanced' ? 'bg-sky-100 text-sky-700' :
                                                      evalCur.score === 'accepted' ? 'bg-amber-100 text-amber-700' :
                                                      'bg-rose-100 text-rose-700'
                                                    }`}>{scoreLabels[evalCur.score] || evalCur.score}</span>
                                                  ) : (
                                                    <span className="px-2 md:px-3 py-1 rounded-lg text-[9px] font-black bg-slate-100 text-slate-400">غير مقيم</span>
                                                  )}
                                               </div>
                                            </div>
                                            {evalCur?.note && (
                                              <p className="text-[10px] text-slate-500 mt-2 font-bold bg-white p-2 rounded-lg border border-slate-100">"{evalCur.note}"</p>
                                            )}
                                         </div>
                                       );
                                    })}
                                 </div>

                                 {/* Tests / Quizzes part */}
                                 {(() => {
                                   const subjectQuizzes = appData.quizzes.filter(q => 
                                     q.subjectIds?.includes(sub.id) && 
                                     (!q.classIds || q.classIds.length === 0 || q.classIds.includes(selectedStudent.classId)) && 
                                     !q.isArchived
                                   );
                                   if (subjectQuizzes.length === 0) return null;
                                   
                                   const studentResults = subjectQuizzes.map(q => {
                                     const qResult = appData.quizResults?.find(r => r.studentId === selectedStudent.id && r.quizId === q.id);
                                     return { quiz: q, result: qResult };
                                   });

                                   return (
                                     <div className="mt-2 border-t border-slate-100 pt-6">
                                       <h4 className="text-xs font-black text-slate-800 mb-4 flex items-center gap-2">
                                         <FileText size={14} className="text-indigo-500" /> الاختبارات (الرصد الآلي)
                                       </h4>
                                       <div className="space-y-3">
                                         {studentResults.map((item, idx) => (
                                           <div key={idx} className="flex justify-between items-center p-3 rounded-2xl bg-indigo-50/50 border border-indigo-100/30">
                                              <span className="text-[10px] md:text-xs font-black text-slate-700">{item.quiz.title}</span>
                                              <div className="flex shrink-0">
                                                {item.result ? (
                                                  <span className={`px-3 py-1.5 rounded-lg text-xs font-black ${
                                                    item.result.score >= 80 ? 'bg-emerald-100 text-emerald-700' :
                                                    item.result.score >= 60 ? 'bg-indigo-100 text-indigo-700' : 'bg-rose-100 text-rose-700'
                                                  }`}>{item.result.score}%</span>
                                                ) : (
                                                  <span className="px-3 py-1.5 rounded-lg text-xs font-black bg-slate-100 text-slate-400">لم يختبر</span>
                                                )}
                                              </div>
                                           </div>
                                         ))}
                                       </div>
                                     </div>
                                   );
                                 })()}
                              </div>
                            );
                          })}
                       </div>

                       {/* General Tests (Not linked to specific subject or cross-subject tests) */}
                       {(() => {
                          const generalQuizzes = appData.quizzes.filter(q => 
                            !q.isArchived && 
                            (!q.subjectIds || q.subjectIds.length === 0) &&
                            (!q.classIds || q.classIds.length === 0 || q.classIds.includes(selectedStudent.classId))
                          );
                          
                          if (generalQuizzes.length === 0) return null;
                          
                          const generalResults = generalQuizzes.map(q => {
                            const qResult = appData.quizResults?.find(r => r.studentId === selectedStudent.id && r.quizId === q.id);
                            return { quiz: q, result: qResult };
                          });

                          return (
                            <div className="bg-white p-6 md:p-10 rounded-[32px] border border-slate-100 shadow-sm mt-8">
                              <h4 className="text-lg md:text-xl font-black text-indigo-900 mb-6 flex items-center gap-3">
                                <BrainCircuit size={20} className="text-indigo-500" /> اختبارات عامة ومستقلة
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {generalResults.map((item, idx) => (
                                  <div key={idx} className="flex justify-between items-center p-4 rounded-3xl bg-slate-50 border border-slate-100">
                                     <span className="text-xs font-black text-slate-800">{item.quiz.title}</span>
                                     <div className="flex shrink-0">
                                       {item.result ? (
                                         <span className={`px-4 py-2 rounded-xl text-xs font-black shadow-sm ${
                                           item.result.score >= 80 ? 'bg-emerald-500 text-white' :
                                           item.result.score >= 60 ? 'bg-indigo-500 text-white' : 'bg-rose-500 text-white'
                                         }`}>{item.result.score}%</span>
                                       ) : (
                                         <span className="px-4 py-2 rounded-xl text-xs font-black bg-slate-200 text-slate-500">لم يختبر</span>
                                       )}
                                     </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                       })()}

                       <div className="bg-indigo-900 text-white p-8 md:p-12 rounded-[40px] md:rounded-[60px] relative overflow-hidden mt-8">
                          <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
                             <div className="text-center md:text-right flex-1">
                                <h4 className="text-2xl md:text-3xl font-black mb-4 flex items-center justify-center md:justify-start gap-2">
                                  التوصيات التربوية
                                </h4>
                                {(() => {
                                  // Compute dynamic recommendations based on evaluations
                                  const weakSkills: string[] = [];
                                  const masteredSkills: string[] = [];
                                  
                                  appData.subjects.filter(sub => {
                                    const cls = appData.classes.find(c => c.id === selectedStudent.classId);
                                    return sub.gradeId === cls?.gradeId;
                                  }).forEach(sub => {
                                    getSkillsForSubject(sub).forEach(skill => {
                                      const evalCur = evaluations[`${selectedStudent.id}-${skill.id}-${academicYear}`];
                                      if (evalCur) {
                                        if (evalCur.score === 'weak' || evalCur.score === 'very-weak') {
                                          weakSkills.push(`${skill.name} (${sub.name})`);
                                        } else if (evalCur.score === 'mastered') {
                                          masteredSkills.push(`${skill.name} (${sub.name})`);
                                        }
                                      }
                                    });
                                  });

                                  if (weakSkills.length === 0 && masteredSkills.length > 0) {
                                    return <p className="text-indigo-200 font-medium leading-relaxed text-sm md:text-base">مستوى الطالب ممتاز ومتقن لمعظم المهارات. نوصي بالاستمرار في توفير الإثراء المعرفي لتعزيز قدراته المواهبية.</p>;
                                  } else if (weakSkills.length > 0) {
                                    return (
                                      <div className="text-indigo-200 font-medium leading-relaxed text-sm md:text-base">
                                        <p className="mb-2">بناءً على التقييمات، يوصى بتقديم دعم إضافي وتدريب مكثف للطالب في المهارات التالية:</p>
                                        <ul className="list-disc list-inside space-y-1 text-xs md:text-sm text-indigo-300">
                                          {weakSkills.slice(0, 5).map((sk, idx) => (
                                            <li key={idx}>{sk}</li>
                                          ))}
                                          {weakSkills.length > 5 && <li>وغيرها من المهارات...</li>}
                                        </ul>
                                      </div>
                                    );
                                  } else {
                                    return <p className="text-indigo-200 font-medium leading-relaxed text-sm md:text-base">لم يتم تقييم مهارات الطالب بشكل كافٍ حتى الآن لتحديد التوصيات التربوية بدقة. يرجى استكمال تقييم المهارات.</p>;
                                  }
                                })()}
                             </div>
                             <button onClick={() => window.print()} className="bg-white text-indigo-900 px-8 py-4 md:px-10 md:py-5 rounded-[24px] md:rounded-[32px] font-black shadow-xl shrink-0 print:hidden hover:-translate-y-1 transition-transform">طباعة التقرير (PDF)</button>
                          </div>
                          <Award className="absolute -bottom-10 -left-10 w-64 h-64 text-white/5 -rotate-12" />
                       </div>

                       <button onClick={() => setSelectedStudent(null)} className="w-full py-6 text-slate-400 font-bold hover:text-indigo-600 transition-colors print:hidden">العودة والبحث عن طالب آخر</button>
                    </div>
                  )}
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <ConfirmationModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmLabel={confirmConfig.confirmLabel}
        cancelLabel="إلغاء التراجع"
        onConfirm={confirmConfig.onConfirm}
        onCancel={closeConfirm}
        isDestructive={confirmConfig.isDestructive}
      />
    </div>
  );
}

function StatBadge({ label, value, highlight }: { label: string, value: number, highlight?: boolean }) {
  return (
    <div className="bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm text-center min-w-[120px]">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-3xl font-black ${highlight ? 'text-indigo-600' : 'text-slate-800'}`}>
        {value < 10 ? `0${value}` : value}
      </p>
    </div>
  );
}

function EvaluationButtonLarge({ active, type, children, onClick }: { 
  active: boolean, 
  type: 'mastered' | 'advanced' | 'accepted' | 'weak' | 'very-weak', 
  children: React.ReactNode, 
  onClick: (note: string) => void 
}) {
  const [note, setNote] = useState('');
  
  const styles = {
    mastered: active ? 'bg-green-600 text-white shadow-lg shadow-green-200 ring-4 ring-green-100' : 'bg-white text-slate-400 border-slate-200 hover:bg-green-50 hover:text-green-600 hover:border-green-200',
    advanced: active ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 ring-4 ring-blue-100' : 'bg-white text-slate-400 border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200',
    accepted: active ? 'bg-amber-500 text-white shadow-lg shadow-amber-200 ring-4 ring-amber-100' : 'bg-white text-slate-400 border-slate-200 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200',
    weak: active ? 'bg-orange-500 text-white shadow-lg shadow-orange-200 ring-4 ring-orange-100' : 'bg-white text-slate-400 border-slate-200 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200',
    'very-weak': active ? 'bg-red-600 text-white shadow-lg shadow-red-200 ring-4 ring-red-100' : 'bg-white text-slate-400 border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200',
  };

  return (
    <div className="flex-1 flex flex-col gap-4">
      <button
        onClick={() => onClick(note)}
        className={`w-full py-6 rounded-[32px] font-black text-sm transition-all border-2 ${styles[type]}`}
      >
        {children}
      </button>
      <input 
        type="text" 
        placeholder="أضف ملاحظة للمعلم..." 
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs font-medium focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300 outline-none transition-all"
      />
    </div>
  );
}

function ClassMetric({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-6 px-4">
      <div className="text-right">
        <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">مؤشر الإنجاز</p>
        <p className="text-4xl font-black text-white leading-none">{value}%</p>
      </div>
      <div className="w-16 h-16 rounded-full border-4 border-white/10 flex items-center justify-center relative overflow-hidden bg-white/5 shadow-inner">
        <motion.div 
          initial={{ height: 0 }}
          animate={{ height: `${value}%` }}
          className="absolute bottom-0 left-0 w-full bg-yellow-400 opacity-30" 
        />
        <span className="text-xs font-black z-10 text-white">{value}</span>
      </div>
    </div>
  )
}
