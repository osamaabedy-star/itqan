import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  CartesianGrid,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { Navbar } from './components/Navbar';
import { Breadcrumb } from './components/Breadcrumb';
import { SchoolLogo } from './components/SchoolLogo';
import { ClassCard } from './components/ClassCard';
import { INITIAL_DATA } from './constants';
import { 
  Class, 
  Skill, 
  Student, 
  Subject, 
  Evaluation, 
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
  FileText,
  GraduationCap,
  Key,
  ArrowLeft,
  Clock
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
import { auth } from './lib/firebase';
import { Management } from './components/Management';
import { QuizPlayer } from './components/QuizPlayer';
import { Dashboard } from './components/Dashboard';
import { StudentProfile } from './components/StudentProfile';
import { Visits } from './components/Visits';
import { QuizLogin } from './components/QuizLogin';
import { TeacherProfile } from './components/TeacherProfile';
import { TeacherDashboard } from './components/TeacherDashboard';
import { SupervisorDashboard } from './components/SupervisorDashboard';
import { normalizeNumerals } from './lib/stringUtils';
import { isQuizSolved, normalizeId } from './utils/quizUtils';

import { ProfessionalReports } from './components/ProfessionalReports';
import { QuizReport } from './components/QuizReport';
import { MonitoringMatrix } from './components/quick-eval/MonitoringMatrix';
import { ConfirmationModal } from './components/ui/ConfirmationModal';


export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const isAdmin = user?.email === 'osamaabedy@gmail.com';
  const [view, setView] = useState(() => {
    try {
      const saved = localStorage.getItem('itqan-saved-state');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.view === 'quiz' || parsed.view === 'baseline-session' || parsed.view === 'quiz-login') {
          return 'dashboard';
        }
        return parsed.view || 'dashboard';
      }
    } catch (e) {}
    return 'dashboard';
  });
  const [viewHistory, setViewHistory] = useState<string[]>([]);
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
  const [baseAcademicYear, setBaseAcademicYear] = useState('2025-2026');
  const [activeTerm, setActiveTerm] = useState<'term1' | 'term2'>('term1');
  const academicYear = `${baseAcademicYear}-${activeTerm}`;
  const displayYear = baseAcademicYear;

  const toggleTerm = () => {
    setActiveTerm(prev => prev === 'term1' ? 'term2' : 'term1');
  };

  const [showStudentQuizPortal, setShowStudentQuizPortal] = useState(false);
  const [globalFilterTeacherId, setGlobalFilterTeacherId] = useState('');
  const [isTeacherReportMode, setIsTeacherReportMode] = useState(false);
  const [studentReportSubjectId, setStudentReportSubjectId] = useState<string | null>(null);

  const [previousTeacherView, setPreviousTeacherView] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('itqan-previous-teacher-view');
      return saved || 'dashboard';
    } catch {
      return 'dashboard';
    }
  });

  useEffect(() => {
    localStorage.setItem('itqan-previous-teacher-view', previousTeacherView);
  }, [previousTeacherView]);

  const [externalProfile, setExternalProfileState] = useState<ExternalProfile | null>(() => {
    try {
      const saved = localStorage.getItem('itqan-external-profile');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  useEffect(() => {
    if (externalProfile) {
      localStorage.setItem('itqan-external-profile', JSON.stringify(externalProfile));
    } else {
      localStorage.removeItem('itqan-external-profile');
    }
  }, [externalProfile]);

  useEffect(() => {
    if (view === 'management' && user && !isAdmin) {
      setView('dashboard');
    }
  }, [view, user, isAdmin]);

  const [studentSession, setStudentSession] = useState<Student | null>(() => {
    try {
      const saved = localStorage.getItem('itqan-student-session');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  useEffect(() => {
    if (studentSession) {
      localStorage.setItem('itqan-student-session', JSON.stringify(studentSession));
    } else {
      localStorage.removeItem('itqan-student-session');
    }
  }, [studentSession]);

  const filteredSupervisorAppData = useMemo(() => {
    if (!externalProfile || externalProfile.role !== 'supervisor') return appData;
    if (!externalProfile.supervisorType || externalProfile.supervisorType === 'general') return appData;

    const allowedGradeIds = externalProfile.allowedGradeIds || [];
    const allowedClassIds = externalProfile.allowedClassIds || [];

    // Filter grades
    const filteredGrades = appData.grades.filter(g => {
      if (externalProfile.supervisorType === 'stage') {
        return allowedGradeIds.includes(g.id);
      }
      if (externalProfile.supervisorType === 'classes') {
        return appData.classes.some(c => c.gradeId === g.id && allowedClassIds.includes(c.id));
      }
      return true;
    });
    const filteredGradeIds = filteredGrades.map(g => g.id);

    // Filter classes
    const filteredClasses = appData.classes.filter(c => {
      if (externalProfile.supervisorType === 'stage') {
        return filteredGradeIds.includes(c.gradeId);
      }
      if (externalProfile.supervisorType === 'classes') {
        return allowedClassIds.includes(c.id);
      }
      return true;
    });
    const filteredClassIds = filteredClasses.map(c => c.id);

    // Filter students
    const filteredStudents = appData.students.filter(s => filteredClassIds.includes(s.classId));
    const filteredStudentIds = filteredStudents.map(s => s.id);

    // Filter subjects
    const filteredSubjects = appData.subjects.filter(sub => {
      if (sub.isArchived) return false;
      const isGradeAllowed = filteredGradeIds.includes(sub.gradeId);
      if (!isGradeAllowed) return false;
      
      if (externalProfile.supervisorType === 'classes') {
        const hasClass = sub.classIds?.some(cid => filteredClassIds.includes(cid)) || (sub.classId && filteredClassIds.includes(sub.classId));
        return !!hasClass;
      }
      return true;
    });

    // Filter skills
    const filteredSkills = appData.skills.filter(sk => filteredGradeIds.includes(sk.gradeId));

    // Filter quizzes
    const filteredQuizzes = appData.quizzes.filter(q => {
      if (q.isArchived) return false;
      if (q.gradeId && !filteredGradeIds.includes(q.gradeId)) return false;
      if (q.classIds && q.classIds.length > 0) {
        return q.classIds.some(cid => filteredClassIds.includes(cid));
      }
      return true;
    });
    const filteredQuizIds = filteredQuizzes.map(q => q.id);

    // Filter quizResults
    const filteredQuizResults = (appData.quizResults || []).filter(r => 
      filteredStudentIds.includes(r.studentId) && filteredQuizIds.includes(r.quizId)
    );

    // Filter visits
    const filteredVisits = appData.visits.filter(v => {
      if (v.classId) return filteredClassIds.includes(v.classId);
      return true; 
    });

    // Filter teachers (only those instructionally connected to our filtered classes)
    const filteredTeachers = appData.teachers.filter(t => {
      if (t.isArchived) return false;
      
      const isClassTeacher = filteredClasses.some(c => c.teacherIds?.includes(t.id));
      const isSubjectTeacher = filteredSubjects.some(sub => {
        const hasTeacher = sub.teacherId === t.id || sub.teacherIds?.includes(t.id);
        const hasClass = sub.classIds?.some(cid => filteredClassIds.includes(cid)) || (sub.classId && filteredClassIds.includes(sub.classId));
        return hasTeacher && hasClass;
      });
      return isClassTeacher || isSubjectTeacher;
    });

    return {
      ...appData,
      grades: filteredGrades,
      classes: filteredClasses,
      students: filteredStudents,
      subjects: filteredSubjects,
      skills: filteredSkills,
      quizzes: filteredQuizzes,
      quizResults: filteredQuizResults,
      visits: filteredVisits,
      teachers: filteredTeachers
    };
  }, [appData, externalProfile]);

  const filteredSupervisorEvaluations = useMemo(() => {
    if (!externalProfile || externalProfile.role !== 'supervisor') return evaluations;
    if (!externalProfile.supervisorType || externalProfile.supervisorType === 'general') return evaluations;

    const allowedGradeIds = externalProfile.allowedGradeIds || [];
    const allowedClassIds = externalProfile.allowedClassIds || [];

    const filteredGrades = appData.grades.filter(g => {
      if (externalProfile.supervisorType === 'stage') {
        return allowedGradeIds.includes(g.id);
      }
      if (externalProfile.supervisorType === 'classes') {
        return appData.classes.some(c => c.gradeId === g.id && allowedClassIds.includes(c.id));
      }
      return true;
    });
    const filteredGradeIds = filteredGrades.map(g => g.id);

    const filteredClasses = appData.classes.filter(c => {
      if (externalProfile.supervisorType === 'stage') {
        return filteredGradeIds.includes(c.gradeId);
      }
      if (externalProfile.supervisorType === 'classes') {
        return allowedClassIds.includes(c.id);
      }
      return true;
    });
    const filteredClassIds = filteredClasses.map(c => c.id);
    const filteredStudentIds = new Set(appData.students.filter(s => filteredClassIds.includes(s.classId)).map(s => s.id));

    const result: Record<string, Evaluation> = {};
    Object.keys(evaluations).forEach(key => {
      const studentId = key.split('-')[0];
      if (filteredStudentIds.has(studentId)) {
        result[key] = evaluations[key];
      }
    });
    return result;
  }, [evaluations, appData, externalProfile]);

  const [loginRole, setLoginRole] = useState<'admin' | 'teacher' | 'supervisor' | 'student'>('student');
  const [studentPortalTab, setStudentPortalTab] = useState<'quizzes' | 'quiz-reports' | 'skills-reports'>('quizzes');
  const [loginIdInput, setLoginIdInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoginProcessing, setIsLoginProcessing] = useState(false);

  const handleUnifiedLoginSubmit = async (e?: React.FormEvent, isDirectAdminLogin?: boolean) => {
    if (e) e.preventDefault();
    
    // Determine the effective role for this submission
    const effectiveRole = isDirectAdminLogin ? 'admin' : 'student'; // 'student' here just means 'normal text-based login'
    
    if (effectiveRole !== 'admin' && !loginIdInput.trim()) {
      setLoginError('يرجى إدخال رقم الهوية للتحقق');
      return;
    }
    
    setLoginError('');
    setIsLoginProcessing(true);
    
    try {
      // Attempt anonymous login but don't block if it fails since rules are now more permissive for reading
      if (!auth.currentUser && effectiveRole !== 'admin') {
        try {
          await firestoreService.loginAnonymously();
        } catch (authErr) {
          console.warn('Anonymous auth failed, attempting to continue with public access:', authErr);
        }
      }

      if (effectiveRole === 'admin') {
        try {
          await firestoreService.login();
          setLoginRole('admin');
        } catch (err) {
          setLoginError('فشل تسجيل الدخول كمسؤول. الرجاء تكرار المحاولة.');
        } finally {
          setIsLoginProcessing(false);
        }
        return;
      }

      const input = normalizeNumerals(loginIdInput.trim());
      const inputWithSPrefix = input.toLowerCase().startsWith('s') ? input.toLowerCase() : 's' + input.toLowerCase();

      // 1. Check if the ID belongs to an external profile (Teacher / Supervisor)
      try {
        const p = (await firestoreService.getExternalProfile(input)) as ExternalProfile | null;
        if (p && !p.isArchived) {
          setExternalProfileState(p);
          setView('external-portal');
          setIsLoginProcessing(false);
          return;
        }
      } catch (err) {
        console.warn('External profile check failed, continuing to student check:', err);
      }

      // 2. Check if the ID belongs to a student
      let studentsSnapshot: any[] = [];
      try {
        studentsSnapshot = await firestoreService.getCollection('students');
      } catch (fetchErr: any) {
        console.error('Students fetch failed:', fetchErr);
        if (fetchErr.message?.includes('permission-denied')) {
          setLoginError('تم رفض الوصول (Permission Denied). يرجى التأكد من إعدادات قواعد القراءة في الفايربيس للسماح بالوصول للطلاب.');
        } else {
          setLoginError('حدث خطأ أثناء الاتصال بالنظام. يرجى التحقق من اتصال الإنترنت الخاص بك.');
        }
        setIsLoginProcessing(false);
        return;
      }

      const allStudents = studentsSnapshot as Student[];
      
      // Find matching student by National ID, ID, or Name
      const student = allStudents.find(s => 
        (s.nationalId && (s.nationalId.trim().toLowerCase() === input.toLowerCase() || s.nationalId.trim().toLowerCase() === inputWithSPrefix)) ||
        s.id.toLowerCase() === input.toLowerCase() || 
        s.id.toLowerCase() === inputWithSPrefix ||
        s.name.trim().toLowerCase() === input.toLowerCase() ||
        s.name.trim().replace(/\s+/g, ' ').toLowerCase() === input.replace(/\s+/g, ' ').toLowerCase()
      );
      
      if (student && !student.isArchived) {
        setStudentSession(student);
        setShowStudentQuizPortal(true);
        setView('student-portal');
      } else {
        setLoginError('عذراً، لم يتم العثور على هذا السجل في النظام.');
      }
    } catch (err: any) {
      console.error(err);
      setLoginError('حدث خطأ غير متوقع أثناء الاتصال بالنظام. حاول مرة أخرى لاحقاً.');
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

  const prevNavStateRef = useRef<any | null>(null);

  useEffect(() => {
    const currentState = {
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

  }, [view, selectedClass, selectedSubject, selectedSkill, selectedStudent, selectedTeacher, selectedQuiz]);

  const handleGoBack = () => {
    if (viewHistory.length > 0) {
      const prev = viewHistory[viewHistory.length - 1];
      setViewHistory(viewHistory.slice(0, -1));
      setView(prev);
      return;
    }

    switch (view) {
      case 'subjects':
        setView('dashboard');
        setSelectedClass(null);
        break;
      case 'skills':
        setView('subjects');
        setSelectedSubject(null);
        break;
      case 'evaluation':
        setView('skills');
        setSelectedSkill(null);
        break;
      case 'student-profile':
      case 'teacher-profile':
      case 'management':
      case 'reports':
      case 'quick-matrix':
      case 'baseline-selection':
      case 'student-report':
      case 'quiz-report':
        setView('dashboard');
        setSelectedStudent(null);
        setSelectedTeacher(null);
        setSelectedQuiz(null);
        break;
      case 'quiz':
        setView('dashboard');
        break;
      default:
        setView('dashboard');
    }
  };

  const handleNavigateToView = (newView: string, resetData?: boolean) => {
    if (newView !== view) {
      setViewHistory(prev => [...prev, view]);
    }
    setView(newView);
    if (resetData) {
        if (newView === 'dashboard') {
            setSelectedClass(null);
            setSelectedSubject(null);
            setSelectedSkill(null);
            setSelectedStudent(null);
            setSelectedTeacher(null);
            setSelectedQuiz(null);
        } else if (newView === 'subjects') {
            setSelectedSubject(null);
            setSelectedSkill(null);
        } else if (newView === 'skills') {
            setSelectedSkill(null);
        }
    }
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

  useEffect(() => {
    if (user && loginRole === 'admin') {
      if (user.email === 'osamaabedy@gmail.com') {
        setView('management');
      } else {
        setLoginError('عذراً، هذا الحساب غير مصرح له بالدخول كمسؤول.');
        firestoreService.logout().catch(console.error);
      }
    }
  }, [user, loginRole]);

  // Sync all data from Firestore
  useEffect(() => {
    // We allow subscription even if no user is signed in, as rules allow public read
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
      firestoreService.subscribeToCollection('settings', (data) => setAppData(prev => ({ ...prev, settings: data.length > 0 ? data : [] }))),
      firestoreService.subscribeToCollection('supportPlans', (data) => setAppData(prev => ({ ...prev, supportPlans: data.length > 0 ? data : [] }))),
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
    ).filter(sk => !sk.isArchived)
     .filter(sk => activeTerm === 'full' || !sk.term || sk.term === 'full' || sk.term === activeTerm);
    
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
    // If classId is provided, get students of that class.
    // If classId is empty but subjectId is provided, find ALL students in ALL classes that take this subject.
    const classStudents = classId 
      ? appData.students.filter(s => s.classId === classId && !s.isArchived)
      : (subjectId 
          ? appData.students.filter(s => {
              if (s.isArchived) return false;
              const cls = appData.classes.find(c => c.id === s.classId);
              if (!cls) return false;
              const subject = appData.subjects.find(sub => sub.id === subjectId);
              if (!subject) return false;
              
              // Check if subject belongs to student's grade and (optionally) specific class
              const isGradeMatch = subject.gradeId === cls.gradeId;
              const isClassMatch = !subject.classId || subject.classId === cls.id || (subject.classIds && subject.classIds.includes(cls.id));
              
              return isGradeMatch && isClassMatch;
            })
          : []);

    const cls = classId ? appData.classes.find(c => c.id === classId) : null;
    let relevantSkills: Skill[] = [];
    let relevantQuizzes: Quiz[] = [];
    
    if (subjectId) {
      const subject = appData.subjects.find(s => s.id === subjectId);
      if (subject) {
        relevantSkills = getSkillsForSubject(subject);
        relevantQuizzes = appData.quizzes.filter(q => (q.subjectIds?.includes(subjectId) || q.subjectId === subjectId) && q.status === 'published');
      }
    } else if (cls) {
      const classSubjects = appData.subjects.filter(sub => 
        sub.gradeId === cls.gradeId && 
        (!sub.classId || sub.classId === classId || sub.classIds?.includes(classId)) &&
        !sub.isArchived
      );
      classSubjects.forEach(sub => {
        relevantSkills = [...relevantSkills, ...getSkillsForSubject(sub)];
        const subQuizzes = appData.quizzes.filter(q => (q.subjectIds?.includes(sub.id) || q.subjectId === sub.id) && q.status === 'published');
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
      classStudents.forEach(st => {
        relevantSkills.forEach(sk => {
          const evalData = evaluations[`${st.id}-${sk.id}-${academicYear}`];
          const score = evalData?.score;
          if (score) {
            maxPoints += 4;
            if (score === 'mastered') totalPoints += 4;
            else if (score === 'advanced') totalPoints += 3;
            else if (score === 'accepted') totalPoints += 2;
            else if (score === 'weak') totalPoints += 1;
            else if (score === 'very-weak') totalPoints += 0;
          }
        });
      });
    }

    // Quiz Points (Scale 100 to 4 for weighted average)
    if (relevantQuizzes.length > 0) {
      classStudents.forEach(st => {
        relevantQuizzes.forEach(qz => {
          const result = appData.quizResults.find(r => r.studentId === st.id && r.quizId === qz.id);
          if (result && result.score !== undefined) {
            maxPoints += 4;
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
      <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center sm:p-4" dir="rtl">
        <motion.div 
          animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }} 
          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
          className="flex flex-col items-center gap-5"
        >
          <SchoolLogo size={120} showText={false} imageUrl={appData?.settings?.[0]?.schoolLogoUrl} />
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#7a1c22] animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 rounded-full bg-[#e68824] animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 rounded-full bg-[#7a1c22] animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <p className="font-bold text-[13px] text-[#7a1c22] tracking-wide animate-pulse">جاري تحميل منصة إتقان...</p>
        </motion.div>
      </div>
    );
  }

  // Check if we need to show the unified Login screen:
  const isUserAdmin = isAdmin;
  const isTeacherActive = !!(externalProfile && view === 'external-portal');
  const isStudentActive = !!(studentSession && (view === 'student-portal' || view === 'quiz'));

  const showLogin = !isUserAdmin && !isTeacherActive && !isStudentActive;

  if (showLogin) {
    return (
      <div className="min-h-screen bg-[#faf9f6]/95 flex flex-col items-center justify-center font-sans p-4 relative overflow-hidden" dir="rtl">
        {/* Soft atmospheric radial gradients with school brand palette */}
        <div className="absolute top-[-30%] right-[-10%] w-[70%] h-[70%] rounded-full bg-[#fce8e6] opacity-60 blur-[130px] pointer-events-none" />
        <div className="absolute bottom-[-30%] left-[-10%] w-[70%] h-[70%] rounded-full bg-[#fef5e7] opacity-60 blur-[130px] pointer-events-none" />
        
        {/* Delicate geometric background patterns */}
        <div className="absolute inset-0 bg-transparent opacity-[0.02] pointer-events-none" style={{ 
          backgroundImage: 'radial-gradient(#7a1c22 1px, transparent 0)', 
          backgroundSize: '24px 24px' 
        }} />

        {/* Admin Login Button (Subtle, Top Left) */}
        {!isLoginProcessing && (
          <button
            onClick={() => {
              handleUnifiedLoginSubmit(undefined, true);
            }}
            className="absolute top-6 left-6 p-3 rounded-full text-slate-300 hover:text-slate-500 hover:bg-slate-100/50 transition-all cursor-pointer z-20 group"
            title="تسجيل الدخول كمسؤول (Google Workspace)"
          >
            <ShieldCheck size={20} className="group-hover:scale-110 transition-transform" />
          </button>
        )}

        {/* Centralized High-Contrast Elegant Card */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-[2.5rem] border border-[#7a1c22]/10 shadow-[0_40px_90px_-20px_rgba(122,28,34,0.08)] p-8 md:p-12 relative z-10 shrink-0"
        >
          {/* Aesthetic symmetrical corner dots */}
          <div className="absolute top-6 right-6 w-2.5 h-2.5 rounded-full bg-[#7a1c22]/10" />
          <div className="absolute top-6 left-6 w-2.5 h-2.5 rounded-full bg-[#e68824]/15" />

          {/* School & Platform Identity Header */}
          <div className="flex flex-col items-center text-center space-y-3 mb-10 select-none">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="relative p-1 rounded-full bg-gradient-to-b from-[#7a1c22]/5 to-[#e68824]/5 border border-[#7a1c22]/5 mb-1"
            >
              <SchoolLogo size={120} showText={true} imageUrl={appData.settings?.[0]?.schoolLogoUrl} />
            </motion.div>
            <div className="h-[1px] w-20 bg-gradient-to-r from-transparent via-[#7a1c22]/20 to-transparent mt-2" />
            <span className="text-xs font-black tracking-wide text-slate-400 mt-2">منصة إتقان لتقييم المهارات</span>
          </div>

          <div className="space-y-6">
            <form onSubmit={(e) => handleUnifiedLoginSubmit(e, false)} className="space-y-8">
              {loginError && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-start gap-2.5 text-rose-700 text-xs font-bold leading-relaxed"
                >
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </motion.div>
              )}

              <div className="space-y-4">
                <label className="text-[11px] font-black text-blue-900 block mr-1 text-center">
                  رقم الهوية الوطنية
                </label>
                <div className="relative flex items-center shadow-sm rounded-2xl bg-slate-50 border border-slate-200 focus-within:border-blue-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 transition-all overflow-hidden p-1.5 h-16">
                  <div className="text-slate-300 pr-4">
                    <Key size={20} />
                  </div>
                  <input
                    type="text"
                    value={loginIdInput}
                    onChange={(e) => setLoginIdInput(e.target.value)}
                    placeholder="أدخل رقم الهوية للبدء..."
                    className="w-full h-full bg-transparent outline-none text-slate-800 text-sm font-black text-center placeholder:text-slate-300 px-3"
                    disabled={isLoginProcessing}
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={isLoginProcessing || !loginIdInput.trim()}
                    className="h-full px-5 bg-gradient-to-r from-blue-600 to-blue-500 hover:brightness-110 text-white rounded-xl flex items-center justify-center shrink-0 transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale shadow-md shadow-blue-500/20 cursor-pointer group"
                    title="تسجيل الدخول"
                  >
                    {isLoginProcessing ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <ArrowLeft size={22} className="group-hover:-translate-x-1 transition-transform" />
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Simple Institutional footer */}
          <div className="mt-10 text-center text-[10px] font-bold text-slate-400 select-none">
             مدارس رياض الإبداع الأهلية - تعليم متقن في بيئة تربوية آمنة
          </div>
        </motion.div>
      </div>
    );
  }

  const isOuterNavbarVisible = isUserAdmin && !isTeacherReportMode && view !== 'external-portal' && view !== 'student-portal';

  return (
      <div className="h-screen flex flex-col bg-slate-50 font-sans text-slate-800 overflow-hidden print:h-auto print:bg-white print:overflow-visible print:block" dir="rtl">
        {isOuterNavbarVisible && (
          <div className="print:hidden flex flex-col">
            <Navbar 
              activeView={view} 
              onNavigate={setView} 
              academicYear={displayYear} 
              onYearChange={setBaseAcademicYear} 
              activeTerm={activeTerm}
              onTermChange={setActiveTerm}
              teachers={appData.teachers.filter(t => !t.isArchived)}
              selectedTeacherId={globalFilterTeacherId}
              onTeacherChange={setGlobalFilterTeacherId}
              theme={theme}
              onThemeChange={setTheme}
              onGoBack={handleGoBack}
              canGoBack={view !== 'dashboard' && view !== 'login' && view !== 'student-portal' && view !== 'external-portal'}
              schoolLogoUrl={appData.settings?.[0]?.schoolLogoUrl}
            />
            <Breadcrumb 
              view={view}
              selectedClass={selectedClass}
              selectedSubject={selectedSubject}
              selectedSkill={selectedSkill}
              selectedStudent={selectedStudent}
              selectedTeacher={selectedTeacher}
              selectedQuiz={selectedQuiz}
              onNavigate={handleNavigateToView}
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
              activeTerm={activeTerm}
              onNavigate={handleNavigateToView}
              onSelectClass={setSelectedClass}
              onSelectStudent={setSelectedStudent}
              onSelectTeacher={(t) => { setSelectedTeacher(t); setPreviousTeacherView('dashboard'); handleNavigateToView('teacher-profile'); }}
              onSelectQuiz={(q, st) => { setSelectedQuiz(q); setSelectedStudent(st); handleNavigateToView(st ? 'quiz' : 'quiz-report'); }}
              calculatePerformance={calculatePerformance}
              filterTeacherId={globalFilterTeacherId}
              onFilterTeacherChange={setGlobalFilterTeacherId}
              isAdmin={isAdmin}
            />
          )}

          {view === 'visits' && (
            <Visits 
              data={appData}
              evaluations={evaluations}
              academicYear={academicYear}
              activeTerm={activeTerm}
            />
          )}

          {view === 'external-portal' && externalProfile && (
            <div className="w-full h-full flex flex-col flex-1 select-none">
              {externalProfile.role === 'supervisor' ? (
                <SupervisorDashboard 
                   data={filteredSupervisorAppData}
                   evaluations={filteredSupervisorEvaluations}
                   academicYear={academicYear}
                   displayYear={baseAcademicYear}
                   activeTerm={activeTerm}
                   externalProfile={externalProfile}
                   onLogout={() => {
                     setExternalProfileState(null);
                     setView('login');
                   }}
                   onToggleTerm={toggleTerm}
                   calculatePerformance={calculatePerformance}
                />
              ) : (
                <TeacherDashboard 
                   data={appData}
                   evaluations={evaluations}
                   academicYear={academicYear}
                   displayYear={baseAcademicYear}
                   activeTerm={activeTerm}
                   externalProfile={externalProfile}
                   onLogout={() => {
                     setExternalProfileState(null);
                     setView('login');
                   }}
                   onToggleTerm={toggleTerm}
                   calculatePerformance={calculatePerformance}
                />
              )}
            </div>
          )}

          {view === 'student-portal' && studentSession && (
            <div className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6 font-sans" dir="rtl">
              <div className="max-w-4xl mx-auto space-y-4">
                {/* Header Card */}
                <div className="bg-white rounded-3xl p-6 text-slate-800 shadow-sm border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-1 border border-slate-100 rounded-2xl bg-[#faf9f6] shrink-0">
                      <SchoolLogo size={70} showText={false} imageUrl={appData.settings?.[0]?.schoolLogoUrl} />
                    </div>
                    <div className="space-y-0.5">
                      <h1 className="text-xl font-black text-slate-900">{studentSession.name}</h1>
                      <div className="flex items-center gap-3 text-slate-500 text-[10px] font-bold">
                         <span>{appData.grades.find(g => g.id === appData.classes.find(c => c.id === studentSession.classId)?.gradeId)?.name || 'الصف'}</span>
                         <span>|</span>
                         <span>الفصل: {appData.classes.find(c => c.id === studentSession.classId)?.name || 'أ'}</span>
                         <span>|</span>
                         <span>{displayYear}</span>
                      </div>
                    </div>
                  </div>
                    
                  {/* Logout button */}
                  <button 
                    onClick={() => {
                      setStudentSession(null);
                      setShowStudentQuizPortal(false);
                      handleNavigateToView('login');
                    }}
                    className="px-4 h-9 bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 rounded-xl text-[10px] font-black flex items-center gap-2 transition-all mr-auto sm:mr-0 cursor-pointer"
                  >
                    <LogOut size={14} />
                    <span>خروج</span>
                  </button>
                </div>

                {/* Available Quizzes & Reports Tabs */}
                <div className="space-y-6">
                  {/* Modern Tab Bar */}
                  <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm w-fit gap-1 overflow-x-auto max-w-full">
                    <button 
                      onClick={() => setStudentPortalTab('quizzes')}
                      className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer ${studentPortalTab === 'quizzes' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
                    >
                      الاختبارات المتاحة
                    </button>
                    <button 
                      onClick={() => setStudentPortalTab('quiz-reports')}
                      className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer ${studentPortalTab === 'quiz-reports' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
                    >
                      تقرير الاختبارات والتطور الزمني
                    </button>
                    <button 
                      onClick={() => setStudentPortalTab('skills-reports')}
                      className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer ${studentPortalTab === 'skills-reports' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
                    >
                      تقرير المهارات والمستويات
                    </button>
                  </div>

                  {/* 1. Quizzes Tab */}
                  {studentPortalTab === 'quizzes' && (
                    (() => {
                      const sClass = appData.classes.find(c => c.id === studentSession.classId);
                      const sGrade = sClass ? appData.grades.find(g => g.id === sClass.gradeId) : null;
                      
                      const availableQuizzes = appData.quizzes.filter(q => {
                        if (q.isArchived || q.status !== 'published') return false;
                        
                        // Robust check for already solved quizzes using shared utility
                        if (isQuizSolved(studentSession, q, appData.quizResults)) return false;

                        // Check if scheduled date is in the future
                        if (q.scheduledDate) {
                          const schedDateOnly = q.scheduledDate.split('T')[0];
                          const d = new Date();
                          const year = d.getFullYear();
                          const month = String(d.getMonth() + 1).padStart(2, '0');
                          const day = String(d.getDate()).padStart(2, '0');
                          const todayStr = `${year}-${month}-${day}`;
                          
                          if (schedDateOnly > todayStr) {
                            return false;
                          }
                        }
                        
                        if (q.classIds && q.classIds.length > 0) {
                          return q.classIds.includes(studentSession.classId);
                        }
                        if (q.gradeId && sGrade) {
                          return q.gradeId === sGrade.id;
                        }
                        if (q.stageId && sGrade) {
                          return q.stageId === sGrade.stage;
                        }
                        
                        return false;
                      });

                      const sortedQuizzes = [...availableQuizzes].sort((a, b) => {
                        const aDate = a.createdAt || a.scheduledDate || '';
                        const bDate = b.createdAt || b.scheduledDate || '';
                        return bDate.localeCompare(aDate);
                      });

                      if (sortedQuizzes.length === 0) {
                        return (
                          <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 space-y-4">
                            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto text-emerald-500">
                              <CheckCircle2 size={32} />
                            </div>
                            <div>
                              <h4 className="text-lg font-black text-slate-800 font-sans">لا توجد اختبارات نشطة حالياً</h4>
                              <p className="text-slate-400 text-xs mt-1 font-sans">أنت متميز ومتقن لجميع المهارات المطلوبة منك وكل الاختبارات منجزة!</p>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {sortedQuizzes.map(quiz => {
                            return (
                              <div 
                                key={quiz.id} 
                                className="bg-white rounded-2xl p-5 border border-slate-100 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 flex flex-col justify-between h-34"
                              >
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold">
                                      {appData.subjects.find(s => quiz.subjectIds?.includes(s.id) || quiz.subjectId === s.id)?.name || quiz.subjectName || 'مادة'}
                                    </span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  </div>
                                  <h4 className="text-sm font-black text-slate-900 line-clamp-1">{quiz.title}</h4>
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                  <div className="text-[10px] text-slate-400 font-bold">
                                    {quiz.timeLimit ? `المدة: ${quiz.timeLimit} دقيقة` : 'بدون وقت محدد'}
                                  </div>
                                  <button
                                    onClick={() => {
                                      setSelectedQuiz(quiz);
                                      handleNavigateToView('quiz');
                                    }}
                                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] sm:text-xs font-black shadow-md transition-all active:scale-95 cursor-pointer"
                                  >
                                    بدء الاختبار
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()
                  )}

                  {/* 2. Chronological Quiz Reports Tab with progress line/area chart */}
                  {studentPortalTab === 'quiz-reports' && (
                    (() => {
                      const solvedQuizzes = (appData.quizResults || []).filter(r => {
                          const sId = normalizeId(studentSession?.id);
                          const sNatId = normalizeId(studentSession?.nationalId);
                          const rStudentId = normalizeId(r.studentId);
                          const rNationalId = normalizeId(r.nationalId);
                          
                          return rStudentId === sId || (sNatId && rStudentId === sNatId) || (sNatId && rNationalId === sNatId);
                        })
                        .map(res => {
                          const quiz = appData.quizzes.find(q => q.id === res.quizId);
                          const dateObj = res.updatedAt && res.updatedAt.toDate 
                            ? res.updatedAt.toDate() 
                            : (res.updatedAt?.seconds ? new Date(res.updatedAt.seconds * 1000) : new Date(res.updatedAt || Date.now()));
                          return {
                            id: res.id || `${res.studentId}_${res.quizId}`,
                            title: res.title || quiz?.title || 'اختبار تقويمي',
                            score: res.score,
                            quizId: res.quizId || quiz?.id || '',
                            date: dateObj,
                            dateStr: dateObj.toLocaleDateString('ar-SA', { month: 'numeric', day: 'numeric' }),
                            fullDateStr: dateObj.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }),
                            subjectName: appData.subjects.find(sub => quiz?.subjectIds?.includes(sub.id))?.name || quiz?.subjectName || 'مادة أخرى',
                          };
                        });

                      const avg = solvedQuizzes.length > 0 ? Math.round(solvedQuizzes.reduce((sum, q) => sum + q.score, 0) / solvedQuizzes.length) : 0;
                      const maxScore = solvedQuizzes.length > 0 ? Math.max(...solvedQuizzes.map(q => q.score)) : 0;
                      const count = solvedQuizzes.length;

                      const listData = [...solvedQuizzes].sort((a, b) => b.date.getTime() - a.date.getTime());

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
                        <div className="space-y-6 animate-fadeIn">
                          {/* KPI Row */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                              <div className="space-y-1">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">متوسط أداء الطالب الإجمالي</h4>
                                <p className="text-2xl font-black text-indigo-600">{avg}%</p>
                              </div>
                              <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold">
                                <TrendingUp size={20} />
                              </div>
                            </div>
                            
                            <div className="bg-[#f0fdf4] p-5 rounded-3xl border border-emerald-100/70 shadow-sm flex items-center justify-between">
                              <div className="space-y-1">
                                <h4 className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">الاختبارات المنجزة</h4>
                                <p className="text-2xl font-black text-emerald-800">{count} اختبار</p>
                              </div>
                              <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                                <CheckCircle2 size={20} />
                              </div>
                            </div>

                            <div className="bg-[#fefaf0] p-5 rounded-3xl border border-amber-100/70 shadow-sm flex items-center justify-between">
                              <div className="space-y-1">
                                <h4 className="text-[10px] font-black text-amber-700 uppercase tracking-wider">أعلى درجة محققة</h4>
                                <p className="text-2xl font-black text-amber-800">{maxScore}%</p>
                              </div>
                              <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
                                <Award size={20} />
                              </div>
                            </div>
                          </div>

                          {/* 4 Subjects side-by-side Visual Timeline Tracking */}
                          <div className="space-y-4">
                            <div>
                              <h3 className="text-sm font-black text-slate-905">مؤشرات ومعادلات النمو الزمني للمواد الأساسية</h3>
                              <p className="text-[10px] text-slate-400 mt-0.5 font-sans">تراكم الدرجات ومنحنى أداء كل مادة مستقلة لتتبع التطور الزمني</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                              {subjectsToTrack.map((sub) => {
                                const subjectQuizzes = solvedQuizzes.filter(item => {
                                  const norm = (item.subjectName || '').trim().toLowerCase();
                                  return sub.searchKeywords.some(keyword => norm.includes(keyword));
                                });
                                const subAvg = subjectQuizzes.length > 0 ? Math.round(subjectQuizzes.reduce((sum, q) => sum + q.score, 0) / subjectQuizzes.length) : 0;
                                const subSortedChartData = [...subjectQuizzes].sort((a, b) => a.date.getTime() - b.date.getTime());

                                return (
                                  <div 
                                    key={sub.id} 
                                    className="bg-white p-5 rounded-3xl border border-slate-150 shadow-sm flex flex-col justify-between space-y-3"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sub.color }} />
                                        <h4 className="text-xs font-black text-slate-805">{sub.name}</h4>
                                      </div>
                                      <div className="text-left font-sans text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                                        <span>{subjectQuizzes.length} محاولات</span>
                                        {subjectQuizzes.length > 0 && (
                                          <span className="font-black px-1.5 py-0.5 rounded" style={{ backgroundColor: sub.bgLight, color: sub.textColor }}>
                                            {subAvg}%
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {subSortedChartData.length === 0 ? (
                                      <div className="h-20 flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-100 text-center p-2">
                                        <Clock size={16} className="text-slate-300 mb-1" />
                                        <span className="text-[9px] text-slate-400 font-bold">بانتظار تقديم أول اختبار</span>
                                      </div>
                                    ) : (
                                      <div className="w-full flex-1 flex flex-col mt-2">
                                        <div className="w-full h-20">
                                          <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={subSortedChartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                                              <defs>
                                                <linearGradient id={`colorScore-${sub.id}`} x1="0" y1="0" x2="0" y2="1">
                                                  <stop offset="5%" stopColor={sub.color} stopOpacity={0.35}/>
                                                  <stop offset="95%" stopColor={sub.color} stopOpacity={0}/>
                                                </linearGradient>
                                              </defs>
                                              <XAxis 
                                                dataKey="dateStr" 
                                                reversed={true} 
                                                axisLine={false} 
                                                tickLine={false} 
                                                tick={{ fontSize: 8, fill: '#64748b', fontWeight: 'bold' }} 
                                                dy={5}
                                              />
                                              <YAxis domain={[0, 100]} hide={true} />
                                              <Tooltip 
                                                content={({ active, payload }) => {
                                                  if (active && payload && payload.length) {
                                                    const d = payload[0].payload;
                                                    return (
                                                      <div className="bg-slate-900 text-white p-2.5 rounded-xl border border-slate-800 text-right space-y-0.5 text-[9px] shadow-lg max-w-[140px]" dir="rtl">
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
                                              <Area type="monotone" dataKey="score" stroke={sub.color} strokeWidth={2.5} fillOpacity={1} fill={`url(#colorScore-${sub.id})`} dot={{ r: 3, stroke: sub.color, strokeWidth: 1.5, fill: '#fff' }} />
                                            </AreaChart>
                                          </ResponsiveContainer>
                                        </div>
                                        <div className="text-[8px] text-slate-300 font-bold flex justify-between px-2 mt-1 items-center">
                                          <span>الأحدث</span>
                                          <div className="flex-1 border-b border-dashed border-slate-200 mx-2"></div>
                                          <span>الأقدم</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Subject-Grouped Chronological list of quizzes */}
                          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                              <h3 className="text-sm font-black text-slate-900">سجل ونتائج الاختبارات السابقة</h3>
                              <span className="text-[10px] text-slate-400 font-bold">العدد الإجمالي: {listData.length}</span>
                            </div>

                            {listData.length === 0 ? (
                              <p className="text-center py-8 text-slate-400 text-xs font-bold font-sans">لم تقم بحل أي اختبار بعد.</p>
                            ) : (
                              <div className="space-y-6">
                                {categorizedList.map((cat) => {
                                  if (cat.list.length === 0) return null;
                                  return (
                                    <div key={cat.id} className="space-y-3">
                                      <div className="flex items-center gap-2 border-r-4 pr-3.5" style={{ borderColor: cat.color }}>
                                        <h4 className="text-xs font-black" style={{ color: cat.textColor }}>{cat.name}</h4>
                                        <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full" style={{ backgroundColor: cat.bgLight, color: cat.textColor }}>
                                          {cat.list.length} اختبار
                                        </span>
                                      </div>
                                      
                                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 py-1">
                                        {cat.list.map((res) => {
                                          const scoreTextColor = res.score >= 80 ? 'text-emerald-600' : 
                                                                 res.score >= 50 ? 'text-amber-600' : 
                                                                 'text-rose-600';
                                          
                                          // Compute class aggregate/average score for this quiz
                                          const classStudentIds = appData.students
                                            .filter(s => s.classId === studentSession?.classId)
                                            .map(s => s.id);

                                          const classResultsForThisQuiz = appData.quizResults?.filter(r => 
                                            r.quizId === res.quizId && 
                                            classStudentIds.includes(r.studentId)
                                          ) || [];

                                          const classAverage = classResultsForThisQuiz.length > 0
                                            ? Math.round(classResultsForThisQuiz.reduce((sum, r) => sum + r.score, 0) / classResultsForThisQuiz.length)
                                            : res.score;

                                          return (
                                            <div 
                                              key={res.id} 
                                              className="p-3 bg-white hover:bg-slate-50/70 border border-slate-150 rounded-2xl flex flex-col justify-between transition-all duration-200 shadow-sm hover:shadow-md text-right h-[135px]"
                                            >
                                              <div className="space-y-1">
                                                <div className="flex items-center justify-between gap-1">
                                                  <span className="text-[8px] px-1.5 py-0.5 bg-indigo-50 border border-indigo-150 text-indigo-700 font-extrabold rounded-md truncate max-w-[65px] leading-none" title={res.subjectName}>
                                                    {res.subjectName}
                                                  </span>
                                                  <span className="text-[8px] text-slate-400 font-bold truncate">
                                                    {res.dateStr}
                                                  </span>
                                                </div>
                                                <h4 className="text-[11px] font-black text-slate-800 line-clamp-2 leading-tight h-8 overflow-hidden mt-1" title={res.title}>
                                                  {res.title}
                                                </h4>
                                              </div>
                                              
                                              <div className="space-y-1.5 border-t border-slate-105 pt-1.5 mt-auto">
                                                <div className="flex items-center justify-between">
                                                  <span className="text-[9px] text-slate-400 font-medium">الدرجة:</span>
                                                  <span className={`text-xs font-black ${scoreTextColor}`}>
                                                    {res.score}%
                                                  </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                  <span className="text-[9px] text-slate-400 font-medium font-sans">متوسط الصف:</span>
                                                  <span className="text-[10px] font-extrabold text-slate-600">
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
                    })()
                  )}

                  {/* 3. Skills Reports Tab */}
                  {studentPortalTab === 'skills-reports' && (
                    <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                            <BrainCircuit className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div>
                            <h3 className="text-sm font-black text-slate-800">تقرير المهارات والملاحظات التوجيهية</h3>
                            <p className="text-[10px] font-bold text-slate-400 mt-0.5 font-sans">
                              استعراض المظهر المعرفي والتوجيه السلوكي والأكاديمي لكل مادة
                            </p>
                          </div>
                        </div>
                 
                        {/* Total skills overview tracker */}
                        {(() => {
                           const studentGradeId = appData.classes.find(c => c.id === studentSession.id || c.id === studentSession.classId)?.gradeId;
                           const studentSubjects = appData.subjects.filter(s => s.gradeId === studentGradeId);
                           let totalSkills = 0;
                           let assessedSkills = 0;
                           studentSubjects.forEach(sub => {
                             const skills = getSkillsForSubject(sub);
                             totalSkills += skills.length;
                             skills.forEach(sk => {
                               const evalKey = `${studentSession.id}-${sk.id}-${studentSession.academicYear || academicYear}`;
                               if (evaluations[evalKey]?.score) {
                                 assessedSkills++;
                               }
                             });
                           });
                           return (
                             <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-100 rounded-full text-[10px] font-bold text-slate-500 font-sans">
                               <span>تم رصد:</span>
                               <span className="font-extrabold text-indigo-600">{assessedSkills}</span>
                               <span>من أصل</span>
                               <span className="font-extrabold text-slate-700">{totalSkills}</span>
                               <span>مهارات</span>
                             </div>
                           );
                        })()}
                      </div>

                      {/* Subject Selector Tabs */}
                      {(() => {
                          const studentGradeId = appData.classes.find(c => c.id === studentSession.classId)?.gradeId;
                          const allSubjects = appData.subjects.filter(s => s.gradeId === studentGradeId);
                          const studentSubjects = Array.from(new Map<string, Subject>(allSubjects.map(item => [item.name, item])).values());
                          
                          if (studentSubjects.length === 0) {
                            return (
                              <div className="text-center py-10 text-slate-400 font-bold text-xs font-sans animate-fadeIn">
                                لم يتم العثور على مواد مسجلة لهذا الصف الدراسي.
                              </div>
                            );
                          }
                          
                          const activeSub = studentSubjects.find(s => s.id === studentReportSubjectId) || studentSubjects[0];
                          const subjectSkills = getSkillsForSubject(activeSub);
                          
                          const scoreMap: Record<string, { label: string; badge: string; border: string }> = {
                              mastered: { label: 'متقن', badge: 'text-emerald-700 bg-emerald-50 border-emerald-100', border: 'border-emerald-200' },
                              advanced: { label: 'متقدم', badge: 'text-indigo-700 bg-indigo-50 border-indigo-100', border: 'border-indigo-200' },
                              accepted: { label: 'مقبول', badge: 'text-cyan-700 bg-cyan-50 border-cyan-100', border: 'border-cyan-200' },
                              weak: { label: 'ضعيف', badge: 'text-amber-700 bg-amber-50 border-amber-100', border: 'border-amber-200' },
                              'very-weak': { label: 'ضعيف جداً', badge: 'text-rose-700 bg-rose-50 border-rose-100', border: 'border-rose-200' }
                          };

                          return (
                            <div className="space-y-6 animate-fadeIn">
                              <div className="flex flex-wrap gap-2 pb-1 border-b border-slate-100 select-none">
                                {studentSubjects.map(sub => {
                                   const isActive = activeSub.id === sub.id;
                                   const skills = getSkillsForSubject(sub);
                                   const assessed = skills.filter(sk => evaluations[`${studentSession.id}-${sk.id}-${academicYear}`]?.score).length;
                                   
                                   return (
                                     <button 
                                       key={sub.id} 
                                       onClick={() => setStudentReportSubjectId(sub.id)}
                                       className={`px-4 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                                         isActive 
                                           ? 'bg-indigo-600 text-white shadow-sm' 
                                           : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-100'
                                       }`}
                                     >
                                       <span>{sub.name}</span>
                                       <span className={`text-[9.5px] px-1.5 py-0.5 rounded-md ${isActive ? 'bg-indigo-700 text-white' : 'bg-slate-200/80 text-slate-500'}`}>
                                          {assessed}/{skills.length}
                                       </span>
                                     </button>
                                   );
                                })}
                              </div>

                              {subjectSkills.length === 0 ? (
                                 <div className="flex flex-col items-center justify-center py-10 text-center space-y-2 animate-fadeIn">
                                   <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-350">
                                     <Award className="w-6 h-6 text-slate-300" />
                                   </div>
                                   <p className="text-xs font-bold text-slate-400 font-sans">لا توجد مهارات رصد مسجلة لهذه المادة حالياً.</p>
                                 </div>
                              ) : (
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
                                   {subjectSkills.map(skill => {
                                      const evalKey = `${studentSession.id}-${skill.id}-${academicYear}`;
                                      const scoreValue = evaluations[evalKey];
                                      const scoreStyle = scoreValue?.score ? scoreMap[scoreValue.score] : null;

                                      return (
                                        <div key={skill.id} className="p-5 bg-slate-50/60 hover:bg-slate-50 rounded-2xl border border-slate-100/80 space-y-4 transition-all flex flex-col justify-between">
                                          <div className="space-y-3">
                                            <div className="flex justify-between items-start gap-4">
                                              <h4 className="text-xs font-black text-slate-800 leading-relaxed md:max-w-[70%]">
                                                {skill.name}
                                              </h4>
                                              <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg border shrink-0 ${
                                                 scoreStyle 
                                                   ? scoreStyle.badge 
                                                   : 'text-slate-400 bg-slate-100/70 border-slate-100'
                                              }`}>
                                                {scoreStyle ? scoreStyle.label : 'لم يقيّم'}
                                              </span>
                                            </div>
                                            
                                            {/* Mini progress bar */}
                                            {scoreValue?.score && (
                                              <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full transition-all duration-500 ${
                                                  scoreValue.score === 'mastered' ? 'bg-emerald-500 w-full' :
                                                  scoreValue.score === 'advanced' ? 'bg-indigo-500 w-[80%]' :
                                                  scoreValue.score === 'accepted' ? 'bg-cyan-500 w-[60%]' :
                                                  scoreValue.score === 'weak' ? 'bg-amber-500 w-[40%]' : 'bg-rose-500 w-[20%]'
                                                }`} />
                                              </div>
                                            )}
                                          </div>

                                          {/* Note speech box */}
                                          {scoreValue?.note && (
                                             <div className={`mt-2 p-3 rounded-xl border-r-4 ${
                                               scoreValue.score === 'mastered' ? 'bg-emerald-50/40 border-emerald-450 text-emerald-950' :
                                               scoreValue.score === 'advanced' ? 'bg-indigo-50/30 border-indigo-400 text-indigo-950' :
                                               scoreValue.score === 'accepted' ? 'bg-cyan-50/30 border-cyan-400 text-cyan-950' :
                                               scoreValue.score === 'weak' ? 'bg-amber-50/45 border-amber-400 text-amber-950' :
                                               'bg-rose-50/30 border-rose-455 text-rose-950'
                                             } text-[10px] font-bold leading-relaxed space-y-1`}>
                                               <div className="text-[8px] opacity-75 flex items-center gap-1 font-black uppercase tracking-wider font-sans">
                                                 <span className="w-1 h-1 rounded-full bg-current animate-pulse" />
                                                 توجيه وملاحظة المعلم
                                               </div>
                                               <p className="opacity-90">{scoreValue.note}</p>
                                             </div>
                                          )}
                                        </div>
                                      );
                                   })}
                                 </div>
                              )}
                            </div>
                          );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {view === 'management' && isAdmin && (
            <Management 
              data={appData} 
              evaluations={evaluations} 
              onClose={() => handleNavigateToView('dashboard')} 
              filterTeacherId={globalFilterTeacherId}
              onFilterTeacherChange={setGlobalFilterTeacherId}
              onSelectStudent={(st) => { setSelectedStudent(st); handleNavigateToView('student-profile'); }}
              academicYear={academicYear}
            />
          )}

          {view === 'quiz-report' && selectedQuiz && (
             <QuizReport
               quiz={selectedQuiz}
               data={appData}
               filterTeacherId={globalFilterTeacherId}
               onClose={() => {
                 handleNavigateToView(selectedTeacher ? 'teacher-profile' : 'dashboard');
                 setSelectedQuiz(null);
               }}
               onPreviewQuiz={() => handleNavigateToView('quiz')}
             />
          )}

          {view === 'quiz' && selectedQuiz && (() => {
             const studentObj = selectedStudent || studentSession || undefined;
             const alreadySolved = studentObj ? appData.quizResults?.some(r => r.studentId === studentObj.id && r.quizId === selectedQuiz.id) : false;
             
             if (alreadySolved && studentSession) {
               setView('student-portal');
               setSelectedQuiz(null);
               return null;
             }
             
             return (
               <QuizPlayer 
                 quiz={selectedQuiz} 
                 student={studentObj} 
                 classStudents={selectedStudent ? appData.students.filter(s => s.classId === selectedStudent.classId && !s.isArchived) : undefined}
                 quizResults={appData.quizResults}
                 onSelectStudent={setSelectedStudent}
                 allSkills={appData.skills}
                 allSubjects={appData.subjects}
                 academicYear={academicYear}
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
                  }
                }} 
               />
             );
          })()}

          {view === 'quiz-login' && (
            <QuizLogin 
              data={appData} 
              onSelect={(q, st) => { setSelectedQuiz(q); setSelectedStudent(st); handleNavigateToView('quiz'); }} 
              onClose={() => { setShowStudentQuizPortal(false); handleNavigateToView('dashboard'); }} 
            />
          )}

          {view === 'quick-matrix' && (
            <MonitoringMatrix 
              data={appData}
              evaluations={evaluations}
              setEvaluations={setEvaluations}
              academicYear={academicYear}
              activeTerm={activeTerm}
              initialClassId={selectedClass?.id}
              initialSubjectId={selectedSubject?.id}
              onClose={() => handleNavigateToView('dashboard')}
              onSelectStudent={(st) => { setSelectedStudent(st); handleNavigateToView('student-profile'); }}
            />
          )}

          {view === 'teacher-profile' && selectedTeacher && (
            <TeacherProfile 
              teacher={selectedTeacher}
              data={appData}
              calculatePerformance={calculatePerformance}
              onClose={() => {
                handleNavigateToView(previousTeacherView || 'dashboard');
                setSelectedTeacher(null);
              }}
              onSelectQuiz={(q) => { setSelectedQuiz(q); handleNavigateToView('quiz-report'); }}
            />
          )}

          {view === 'student-profile' && selectedStudent && (
            <StudentProfile 
              student={selectedStudent}
              data={appData}
              evaluations={evaluations}
              academicYear={academicYear}
              activeTerm={activeTerm}
              onClose={() => {
                handleGoBack();
              }}
              onBack={() => handleGoBack()}
              onStartQuiz={(q) => { setSelectedQuiz(q); handleNavigateToView('quiz'); }}
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
                    onClick={() => { handleNavigateToView('dashboard'); setSelectedClass(null); setSelectedSubject(null); setSelectedSkill(null); }}
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
                      onClick={() => { handleNavigateToView('subjects'); setSelectedSubject(null); setSelectedSkill(null); }}
                      className={`w-full p-4 rounded-2xl flex items-center justify-between transition-all ${!selectedSubject ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-600'}`}
                    >
                      <span className="font-black text-sm">المواد الدراسية</span>
                      {!selectedSubject && <ChevronRight size={16} />}
                    </button>
                    
                    {selectedSubject && (
                      <button 
                        onClick={() => { handleNavigateToView('skills'); setSelectedSkill(null); }}
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
                      onClick={() => { handleNavigateToView('evaluation'); setSelectedSubject(null); setSelectedSkill(null); }}
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
                         onClick={() => { setSelectedStudent(s); handleNavigateToView('student-profile'); }}
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
                                      className="bg-white p-6 rounded-3xl border border-slate-100 hover:border-indigo-500 shadow-minimal hover:shadow-xl transition-all text-right group relative overflow-hidden"
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
                                           className={`bg-white rounded-3xl border transition-all flex flex-col p-4 relative group ${
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
                                     <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between gap-4">
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
                                     <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between gap-4">
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
                               <div className="h-64 flex flex-col items-center justify-center text-center space-y-4 bg-white rounded-3xl border border-dashed border-slate-200">
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
                           <div className="bg-indigo-50 p-10 rounded-3xl border border-indigo-100">
                              <p className="text-indigo-600 font-black text-xs mb-4 uppercase tracking-[0.2em] underline">ملف الطالب</p>
                              <h3 className="text-3xl md:text-4xl font-black tracking-tighter text-slate-900 mb-2">{selectedStudent.name}</h3>
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
                                      className="flex flex-col items-center justify-center gap-2 p-6 rounded-3xl border-2 border-red-100 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all group shrink-0"
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
              displayYear={displayYear}
              activeTerm={activeTerm}
              onSelectStudent={(st) => { setSelectedStudent(st); setView('student-report'); }}
              filterTeacherId={globalFilterTeacherId}
              onFilterTeacherChange={setGlobalFilterTeacherId}
              onSelectTeacher={(t) => { setSelectedTeacher(t); setPreviousTeacherView('reports'); setView('teacher-profile'); }}
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
                     <button onClick={() => handleNavigateToView('reports')} className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 font-bold transition-colors">
                        <ChevronRight size={20} />
                        العودة للتقارير العامة
                     </button>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">بطاقة الطالب الذكية</p>
                  </div>

                  {!selectedStudent ? (
                    <div className="bg-white p-12 rounded-3xl text-center border-2 border-dashed border-slate-200">
                       <Users size={64} className="mx-auto text-slate-200 mb-6" />
                       <h3 className="text-xl md:text-2xl font-black tracking-tighter text-slate-300 mb-8">ابحث عن طالب لاستخراج تقريره</h3>
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
                          <div className="w-32 h-32 rounded-[40px] bg-[#7a1c22] text-white flex items-center justify-center text-5xl font-black shadow-2xl relative z-10 shrink-0">
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
                              <div key={sub.id} className="bg-white p-6 md:p-10 rounded-3xl md:rounded-3xl border border-slate-100 shadow-minimal flex flex-col gap-6 md:gap-8">
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
                            <div className="bg-white p-6 md:p-10 rounded-3xl border border-slate-100 shadow-sm mt-8">
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
                             <button onClick={() => window.print()} className="bg-white text-indigo-900 px-8 py-4 md:px-10 md:py-5 rounded-[24px] md:rounded-3xl font-black shadow-xl shrink-0 print:hidden hover:-translate-y-1 transition-transform">طباعة التقرير (PDF)</button>
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
        className={`w-full py-6 rounded-3xl font-black text-sm transition-all border-2 ${styles[type]}`}
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
        <p className="text-3xl md:text-4xl font-black tracking-tighter text-white leading-none">{value}%</p>
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
