import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  BrainCircuit, 
  Search, 
  Filter, 
  Download,
  Calendar,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Award,
  BookOpen,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Zap,
  Star,
  GraduationCap,
  Trophy,
  Target,
  ArrowUpRight,
  PieChart as PieChartIcon,
  ArrowRight,
  Printer,
  Trash2,
  Sparkles,
  X,
  User,
  Layers,
  Image,
  AlertTriangle
} from 'lucide-react';
import { AppData, Class, Quiz, QuizResult, Student, Grade, Evaluations } from '../types';
import { SchoolLogo } from './SchoolLogo';
import { firestoreService } from '../services/firestoreService';
import { Timestamp } from 'firebase/firestore';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Cell, 
  CartesianGrid,
  PieChart,
  Pie,
  Legend,
  LineChart,
  Line,
  LabelList,
  AreaChart,
  Area
} from 'recharts';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';

interface ProfessionalReportsProps {
  data: AppData;
  evaluations: Evaluations;
  academicYear: string;
  displayYear: string;
  activeTerm: 'term1' | 'term2' | 'full';
  onSelectStudent?: (student: Student) => void;
  onClose?: () => void;
  filterTeacherId?: string;
  onFilterTeacherChange?: (id: string) => void;
  onSelectTeacher?: (teacher: any) => void;
  calculatePerformance?: (classId: string, subjectId?: string) => number;
  hideStudentDetails?: boolean;
}

export function ProfessionalReports({ data, evaluations, academicYear, displayYear, activeTerm, onSelectStudent, onClose, filterTeacherId, onFilterTeacherChange, onSelectTeacher, calculatePerformance, hideStudentDetails }: ProfessionalReportsProps) {
  const [activeTab, setActiveTab] = useState<'quizzes' | 'skills' | 'students' | 'teachers'>(hideStudentDetails ? 'teachers' : 'quizzes');
  const [selectedGradeId, setSelectedGradeId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [skillSearchTerm, setSkillSearchTerm] = useState('');
  const [skillSubjectFilter, setSkillSubjectFilter] = useState('all');
  const [quizFilterGradeId, setQuizFilterGradeId] = useState<string>('');
  const [quizFilterQuizId, setQuizFilterQuizId] = useState<string>('');
  const [quizFilterTerm, setQuizFilterTerm] = useState<string>('all');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [studentSortBy, setStudentSortBy] = useState<'alphabetical' | 'class' | 'progress' | 'progress-asc' | 'support' | 'support-urgent'>('alphabetical');
  const [selectedReportStudentId, setSelectedReportStudentId] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [selectedQuizToManage, setSelectedQuizToManage] = useState<Quiz | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    isDestructive: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: '',
    isDestructive: false,
    onConfirm: () => {}
  });
  
  const closeConfirm = () => setConfirmConfig(prev => ({ ...prev, isOpen: false }));
  const reportRef = useRef<HTMLDivElement>(null);
  const quizCardRef = useRef<HTMLDivElement>(null);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [selectedSkillForDetails, setSelectedSkillForDetails] = useState<any>(null);

  const teacherSubjects = data.subjects.filter(s => !s.isArchived && (!filterTeacherId || s.teacherId === filterTeacherId || s.teacherIds?.includes(filterTeacherId)));
  const teacherSubjectIds = teacherSubjects.map(s => s.id);
  const teacherSubjectNames = Array.from(new Set(teacherSubjects.map(s => s.name)));

  const teacherDirectClasses = data.classes.filter(c => 
    !c.isArchived && filterTeacherId && (
      c.teacherIds?.includes(filterTeacherId) || 
      teacherSubjects.some(s => s.gradeId === c.gradeId && ((!s.classIds || s.classIds.includes(c.id)) || s.classId === c.id))
    )
  );
  const teacherDirectClassIds = teacherDirectClasses.map(c => c.id);
  const teacherDirectGradeIds = teacherDirectClasses.map(c => c.gradeId);

  const teacherGrades = Array.from(new Set([
    ...teacherSubjects.map(s => s.gradeId),
    ...teacherDirectGradeIds
  ])).filter(Boolean);

  const grades = data.grades.filter(g => !g.isArchived && (!filterTeacherId || teacherGrades.includes(g.id)));

  const classes = data.classes.filter(c => !c.isArchived && 
    (selectedGradeId === '' || c.gradeId === selectedGradeId) && 
    (!filterTeacherId || teacherDirectClassIds.includes(c.id))
  );

  const classQuizzes = useMemo(() => data.quizzes.filter(q => {
    if (q.isArchived) return false;
    if (selectedGradeId !== '' && q.gradeId !== selectedGradeId) return false;
    if (filterTeacherId) {
      // Check if the quiz belongs to one of the teacher's subjects by ID or Name
      const hasTeacherSubject = q.subjectIds?.some(id => teacherSubjectIds.includes(id)) || 
                                (q as any).subjectId && teacherSubjectIds.includes((q as any).subjectId) ||
                                (q.subjectName && teacherSubjectNames.some(tn => tn.trim() === q.subjectName?.trim()));
      if (!hasTeacherSubject) return false;
    }
    // Only show quizzes that have been tested/evaluated by students or belong to the active term
    const hasResults = data.quizResults?.some(r => !r.isArchived && r.quizId === q.id);
    const isTermMatch = activeTerm === 'full' || (q.term || 'term1') === activeTerm;
    return hasResults || isTermMatch;
  }), [data.quizzes, selectedGradeId, filterTeacherId, teacherSubjectIds, teacherSubjectNames, data.quizResults, activeTerm]);

  const activeQuizIds = useMemo(() => new Set(classQuizzes.map(q => q.id)), [classQuizzes]);
  
  const currentClass = data.classes.find(c => c.id === selectedClassId);
  const classStudents = data.students.filter(s => s.classId === selectedClassId && !s.isArchived);
  
  const filteredStudents = useMemo(() => {
    const list = data.students.filter(student => {
      if (student.isArchived) return false;
      
      // Teacher Isolation: only show students in classes belonging to this teacher
      if (filterTeacherId && !teacherDirectClassIds.includes(student.classId)) {
        return false;
      }

      if (selectedClassId) {
        if (student.classId !== selectedClassId) return false;
      } else if (selectedGradeId) {
        const cls = data.classes.find(c => c.id === student.classId);
        if (!cls || cls.gradeId !== selectedGradeId) return false;
      }
      if (studentSearchTerm.trim()) {
        const queryStr = studentSearchTerm.trim().toLowerCase();
        if (!student.name.toLowerCase().includes(queryStr)) return false;
      }
      return true;
    });

    const studentStats = (studentId: string) => {
      const results = data.quizResults.filter(r => r.studentId === studentId && !r.isArchived && activeQuizIds.has(r.quizId));
      const avg = results.length > 0 
        ? results.reduce((sum, r) => sum + r.score, 0) / results.length
        : 0;

      const evs = Object.entries(evaluations)
        .filter(([key]) => key.startsWith(`${studentId}-`) && key.endsWith(`-${academicYear}`))
        .map(([key, val]) => val);
      
      const weakCount = evs.filter(e => e.score === 'weak' || e.score === 'very-weak').length;
      const veryWeakCount = evs.filter(e => e.score === 'very-weak').length;
      return { avg, weakCount, veryWeakCount };
    };

    if (studentSortBy === 'class') {
      return [...list].sort((a, b) => {
        const clsA = data.classes.find(c => c.id === a.classId)?.name || '';
        const clsB = data.classes.find(c => c.id === b.classId)?.name || '';
        if (clsA !== clsB) return clsA.localeCompare(clsB, 'ar');
        return a.name.localeCompare(b.name, 'ar');
      });
    } else if (studentSortBy === 'progress') {
      const statsMap = new Map<string, { avg: number; weakCount: number; veryWeakCount: number }>();
      list.forEach(s => statsMap.set(s.id, studentStats(s.id)));
      return [...list].sort((a, b) => {
        const statsA = statsMap.get(a.id)!;
        const statsB = statsMap.get(b.id)!;
        if (statsB.avg !== statsA.avg) return statsB.avg - statsA.avg;
        return a.name.localeCompare(b.name, 'ar');
      });
    } else if (studentSortBy === 'progress-asc') {
      const statsMap = new Map<string, { avg: number; weakCount: number; veryWeakCount: number }>();
      list.forEach(s => statsMap.set(s.id, studentStats(s.id)));
      return [...list].sort((a, b) => {
        const statsA = statsMap.get(a.id)!;
        const statsB = statsMap.get(b.id)!;
        if (statsA.avg !== statsB.avg) return statsA.avg - statsB.avg;
        return a.name.localeCompare(b.name, 'ar');
      });
    } else if (studentSortBy === 'support' || studentSortBy === 'support-urgent') {
      const statsMap = new Map<string, { avg: number; weakCount: number; veryWeakCount: number }>();
      list.forEach(s => statsMap.set(s.id, studentStats(s.id)));
      return [...list].sort((a, b) => {
        const statsA = statsMap.get(a.id)!;
        const statsB = statsMap.get(b.id)!;
        if (statsB.veryWeakCount !== statsA.veryWeakCount) {
          return statsB.veryWeakCount - statsA.veryWeakCount;
        }
        if (statsB.weakCount !== statsA.weakCount) {
          return statsB.weakCount - statsA.weakCount;
        }
        if (statsA.avg !== statsB.avg) {
          return statsA.avg - statsB.avg;
        }
        return a.name.localeCompare(b.name, 'ar');
      });
    } else {
      return [...list].sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    }
  }, [data.students, data.classes, data.quizResults, evaluations, academicYear, selectedGradeId, selectedClassId, studentSearchTerm, studentSortBy, activeQuizIds]);
  
  const handleExportQuizCardImage = async () => {
    if (!quizCardRef.current || !selectedQuizToManage) return;
    setIsExportingImage(true);
    // Wait for animations and layout to settle
    await new Promise(resolve => setTimeout(resolve, 600));
    try {
      const element = quizCardRef.current;
      
      // Temporarily hide buttons
      const hiddenElements: HTMLElement[] = [];
      element.querySelectorAll('[data-export-hide="true"], [data-close-hide="true"]').forEach((el) => {
        const htmlEl = el as HTMLElement;
        hiddenElements.push(htmlEl);
        htmlEl.style.display = 'none';
      });

      const dataUrl = await toPng(element, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        style: {
          transform: 'none', // Ensure it doesn't try to scale it down
        }
      });
      
      // Restore buttons
      hiddenElements.forEach(el => {
        el.style.display = '';
      });

      const link = document.createElement('a');
      link.download = `تحليل_اختبار_${selectedQuizToManage.title.replace(/\s+/g, '_')}_${new Date().toLocaleDateString('ar-SA')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Image Export Error:', err);
      // Restore buttons if err
      if (quizCardRef.current) {
        quizCardRef.current.querySelectorAll('[data-export-hide="true"], [data-close-hide="true"]').forEach((el) => {
          (el as HTMLElement).style.display = '';
        });
      }
      alert('حدث خطأ أثناء حفظ الملف كصورة: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsExportingImage(false);
    }
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setIsExporting(true);
    
    // Allow any animations/charts to settle
    await new Promise(resolve => setTimeout(resolve, 800)); 
    
    const element = reportRef.current;
    const hiddenElements: HTMLElement[] = [];
    
    try {
      // Selectively hide buttons and interactive controls from export
      element.querySelectorAll('[data-export-hide="true"], [data-close-hide="true"], button').forEach((el) => {
        const htmlEl = el as HTMLElement;
        // Hide standard close or action buttons to keep output clean, but keep charts intact
        if (
          htmlEl.getAttribute('data-export-hide') === 'true' || 
          htmlEl.getAttribute('data-close-hide') === 'true' ||
          htmlEl.classList.contains('bg-indigo-600') || 
          htmlEl.textContent?.includes('تصدير') || 
          htmlEl.textContent?.includes('إغلاق')
        ) {
          hiddenElements.push(htmlEl);
          htmlEl.style.display = 'none';
        }
      });

      // Capture high-resolution PNG image of the exact dashboard view 
      const dataUrl = await toPng(element, {
        cacheBust: true,
        pixelRatio: 2.2, // Crisp density for high quality typography and vector charts
        backgroundColor: '#ffffff',
        style: {
          transform: 'none',
        }
      });
      
      // Initialize jsPDF document (A4 portrait)
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const margin = 10;
      const contentWidth = pdfWidth - (margin * 2);
      
      // Create a temporary image to determine dimensions and scale ratio
      const tempImg = new window.Image();
      
      // Awaitable promise wrapping the image load & PDF construction to keep it synchronous in the try-catch block
      await new Promise<void>((resolvePromise, rejectPromise) => {
        tempImg.onload = () => {
          try {
            const imgWidth = tempImg.width;
            const imgHeight = tempImg.height;
            
            const ratio = contentWidth / imgWidth;
            const finalImgHeight = imgHeight * ratio;
            
            // Multi-page slicing or simple fit scaling
            if (finalImgHeight <= pdfHeight - (margin * 2)) {
              pdf.addImage(dataUrl, 'PNG', margin, margin, contentWidth, finalImgHeight);
            } else {
              let heightLeft = finalImgHeight;
              let position = margin;
              
              pdf.addImage(dataUrl, 'PNG', margin, position, contentWidth, finalImgHeight);
              heightLeft -= (pdfHeight - (margin * 2));
              
              while (heightLeft > 0) {
                pdf.addPage();
                position = margin - (finalImgHeight - heightLeft);
                pdf.addImage(dataUrl, 'PNG', margin, position, contentWidth, finalImgHeight);
                heightLeft -= (pdfHeight - (margin * 2));
              }
            }
            
            // Prompt save of PDF
            pdf.save(`تقرير-اتقان-${activeTab}-${new Date().toLocaleDateString('ar-SA')}.pdf`);
            resolvePromise();
          } catch (err) {
            rejectPromise(err);
          }
        };
        
        tempImg.onerror = () => {
          rejectPromise(new Error('Failed to load temporary canvas export image'));
        };
        
        tempImg.src = dataUrl;
      });
      
    } catch (err) {
      console.error('PDF Export Error:', err);
      alert('حدث خطأ أثناء تصدير التقرير، يرجى المحاولة مرة أخرى: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      // ALWAYS restore hidden UI elements under all circumstances
      hiddenElements.forEach((el) => {
        el.style.display = '';
      });
      setIsExporting(false);
    }
  };

  const calculateQuizAchievement = (quizId: string, students: Student[]) => {
    let rawResults = data.quizResults?.filter(r => 
      !r.isArchived && 
      activeQuizIds.has(r.quizId) && 
      (quizId === '' || r.quizId === quizId) && 
      students.some(s => s.id === r.studentId)
    ) || [];
    
    // In teacher report mode, only include results for quizzes authored by or associated with this teacher
    if (filterTeacherId && quizId === '') {
       rawResults = rawResults.filter(r => classQuizzes.some(q => q.id === r.quizId));
    }
    
    const latestResultsMap = new Map();
    rawResults.forEach(r => {
      // If global (quizId === ''), group by quizId + studentId. If specific quiz, group by studentId.
      const key = `${r.quizId}-${r.studentId}`;
      const existing = latestResultsMap.get(key);
      if (!existing || new Date(r.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
         latestResultsMap.set(key, r);
      }
    });

    const results = Array.from(latestResultsMap.values());
    if (results.length === 0) return 0;
    const total = results.reduce((acc, r) => acc + (r.score || 0), 0);
    return Math.round(total / results.length);
  };

  const getQuizStats = (quizId: string, students: Student[]) => {
    if (!activeQuizIds.has(quizId)) return { avg: 0, count: 0, masteredPercentage: 0 };
    let rawResults = data.quizResults?.filter(r => !r.isArchived && r.quizId === quizId && students.some(s => s.id === r.studentId)) || [];
    const latestResultsMap = new Map();
    rawResults.forEach(r => {
      const key = r.studentId;
      const existing = latestResultsMap.get(key);
      if (!existing || new Date(r.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
         latestResultsMap.set(key, r);
      }
    });
    const results = Array.from(latestResultsMap.values());
    const count = results.length;
    if (count === 0) return { avg: 0, count: 0, masteredPercentage: 0 };
    const total = results.reduce((acc, r) => acc + (r.score || 0), 0);
    const avg = Math.round(total / count);
    const mastered = results.filter(r => r.score >= 80).length;
    const masteredPercentage = Math.round((mastered / count) * 100);
    return { avg, count, masteredPercentage };
  };

  const getPerformanceColor = (perf: number) => {
    if (perf >= 90) return 'text-green-600 bg-green-50 border-green-100';
    if (perf >= 80) return 'text-blue-600 bg-blue-50 border-blue-100';
    if (perf >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-100';
    if (perf >= 50) return 'text-orange-600 bg-orange-50 border-orange-100';
    return 'text-red-600 bg-red-50 border-red-100';
  };

  const skillAnalytics = useMemo(() => {
    const filteredStudents = data.students.filter(s => {
      if (s.isArchived) return false;
      if (selectedClassId !== '' && s.classId !== selectedClassId) return false;
      
      const cls = data.classes.find(c => c.id === s.classId);
      if (selectedGradeId !== '' && cls?.gradeId !== selectedGradeId) return false;
      
      if (filterTeacherId && cls) {
        const isDirect = teacherDirectClassIds.includes(cls.id) || cls.teacherIds?.includes(filterTeacherId);
        const isSkillMatch = data.skills.some(sk => {
           if (sk.gradeId !== cls.gradeId) return false;
           const isTeacherSubject = data.subjects.some(s => 
             (s.id === sk.subjectId || s.name === sk.subjectName) && 
             (s.teacherId === filterTeacherId || s.teacherIds?.includes(filterTeacherId))
           );
           return isTeacherSubject;
        });
        if (!isDirect && !isSkillMatch) return false;
      }
      return true;
    });

    let mastered = 0, advanced = 0, accepted = 0, weak = 0, veryWeak = 0;
    const nonAchieverIds = new Set<string>();
    
    const skillStats: Record<string, { mastered: number, advanced: number, accepted: number, weak: number, veryWeak: number, total: number, subjectName: string, outstandingStudentIds: Set<string>, needingCareStudentIds: Set<string> }> = {};

    data.skills.forEach(skill => {
      if (skill.isArchived) return;
      
      if (selectedGradeId && skill.gradeId !== selectedGradeId) return;
      
      if (selectedClassId) {
        const cls = data.classes.find(c => c.id === selectedClassId);
        if (cls && skill.gradeId !== cls.gradeId) return;
      }
      
      if (filterTeacherId) {
        const isTeacherSkill = data.subjects.some(s => 
          (s.id === skill.subjectId || s.name === skill.subjectName) && 
          (s.teacherId === filterTeacherId || s.teacherIds?.includes(filterTeacherId))
        );
        if (!isTeacherSkill) return;
      }
      
      skillStats[skill.id] = { mastered: 0, advanced: 0, accepted: 0, weak: 0, veryWeak: 0, total: 0, subjectName: skill.subjectName || 'عام', outstandingStudentIds: new Set(), needingCareStudentIds: new Set() };
    });

    Object.entries(evaluations).forEach(([key, ev]) => {
      if (!key.endsWith(`-${academicYear}`)) return;
      const keyWithoutYear = key.slice(0, -(academicYear.length + 1));
      
      let student = null;
      let skill = null;
      let studentId = '';
      
      for (const s of filteredStudents) {
         if (keyWithoutYear.startsWith(s.id + '-')) {
            const maybeSkillId = keyWithoutYear.slice(s.id.length + 1);
            const foundSkill = data.skills.find(sk => sk.id === maybeSkillId);
            if (foundSkill) {
               student = s;
               skill = foundSkill;
               studentId = s.id;
               break;
            }
         }
      }

      if (student && skill) {
          // If teacher filter is active, only include teacher's skills
          if (filterTeacherId) {
            const isTeacherSkill = data.subjects.some(s => 
              (s.id === skill.subjectId || s.name === skill.subjectName) && 
              (s.teacherId === filterTeacherId || s.teacherIds?.includes(filterTeacherId))
            );
            if (!isTeacherSkill) return;
          }

          if (ev.score === 'mastered') mastered++;
          else if (ev.score === 'advanced') advanced++;
          else if (ev.score === 'accepted') accepted++;
          else if (ev.score === 'weak') { weak++; nonAchieverIds.add(studentId); }
          else if (ev.score === 'very-weak') { veryWeak++; nonAchieverIds.add(studentId); }

          if (!skillStats[skill.id]) {
            skillStats[skill.id] = { mastered: 0, advanced: 0, accepted: 0, weak: 0, veryWeak: 0, total: 0, subjectName: skill.subjectName || 'عام', outstandingStudentIds: new Set<string>(), needingCareStudentIds: new Set<string>() };
          }
          skillStats[skill.id].total++;
          if (ev.score === 'mastered') { skillStats[skill.id].mastered++; skillStats[skill.id].outstandingStudentIds.add(studentId); }
          else if (ev.score === 'advanced') { skillStats[skill.id].advanced++; skillStats[skill.id].outstandingStudentIds.add(studentId); }
          else if (ev.score === 'accepted') skillStats[skill.id].accepted++;
          else if (ev.score === 'weak') { skillStats[skill.id].weak++; skillStats[skill.id].needingCareStudentIds.add(studentId); }
          else if (ev.score === 'very-weak') { skillStats[skill.id].veryWeak++; skillStats[skill.id].needingCareStudentIds.add(studentId); }
      }
    });

    const nonAchievers = filteredStudents.filter(s => nonAchieverIds.has(s.id));
    
    const distribution = [
      { name: 'متقن', value: mastered, color: '#10b981' },
      { name: 'متقدم', value: advanced, color: '#3b82f6' },
      { name: 'مقبول', value: accepted, color: '#f59e0b' },
      { name: 'ضعيف', value: weak, color: '#f97316' },
      { name: 'غير مجتاز', value: veryWeak, color: '#ef4444' },
    ];

    const totalEvaluations = mastered + advanced + accepted + weak + veryWeak;
    const overallMasteryPercentage = totalEvaluations > 0 ? Math.round(((mastered + advanced) / totalEvaluations) * 100) : 0;
    
    const skillsList = Object.entries(skillStats).map(([skillId, stats]) => {
      const dbSkill = data.skills.find(sk => sk.id === skillId);
      const grade = data.grades.find(g => g.id === dbSkill?.gradeId);
      const masteryRate = stats.total > 0 ? Math.round(((stats.mastered + stats.advanced) / stats.total) * 100) : 0;
      const weakRate = stats.total > 0 ? Math.round(((stats.weak + stats.veryWeak) / stats.total) * 100) : 0;
      return {
        id: skillId,
        name: dbSkill?.name || 'مهارة غير معروفة',
        subjectName: stats.subjectName,
        gradeName: grade?.name || 'غير محدد',
        term: dbSkill?.term || 'full',
        masteryRate,
        weakRate,
        total: stats.total,
        outstandingStudentIds: Array.from(stats.outstandingStudentIds),
        needingCareStudentIds: Array.from(stats.needingCareStudentIds),
        ...stats
      };
    }).sort((a, b) => b.total - a.total); // Sort by most evaluated by default

    const topSkills = [...skillsList].filter(s => s.total > 0).sort((a, b) => b.masteryRate - a.masteryRate).slice(0, 5);
    const weakestSkills = [...skillsList].filter(s => s.total > 0 && s.weakRate > 0).sort((a, b) => b.weakRate - a.weakRate).slice(0, 5);

    return { 
      masteryDistribution: { distribution, nonAchievers },
      totalEvaluations,
      overallMasteryPercentage,
      skillsList,
      topSkills,
      weakestSkills
    };
  }, [data, evaluations, academicYear, selectedClassId, selectedGradeId, filterTeacherId]);

  const subjectPerformance = useMemo(() => {
    const students = data.students.filter(s => 
      (selectedClassId === '' || s.classId === selectedClassId) && 
      (selectedGradeId === '' || data.classes.find(c => c.id === s.classId)?.gradeId === selectedGradeId) && 
      !s.isArchived
    );
    
    const performanceMap: { [key: string]: { total: number, count: number, id: string } } = {};
    
    const activeSubjects = data.subjects.filter(s => 
      !s.isArchived && 
      (selectedGradeId === '' || s.gradeId === selectedGradeId) &&
      (!filterTeacherId || s.teacherId === filterTeacherId || s.teacherIds?.includes(filterTeacherId))
    );

    activeSubjects.forEach(subj => {
      const tests = data.quizzes.filter(q => !q.isArchived && (q.subjectIds?.includes(subj.id) || q.subjectName === subj.name));
      
      if (!performanceMap[subj.name]) {
        performanceMap[subj.name] = { total: 0, count: 0, id: subj.id };
      }

      const rawResults = (data.quizResults || []).filter(r => 
        tests.some(q => q.id === r.quizId) && 
        students.some(s => s.id === r.studentId)
      );

      const latestResultsMap = new Map();
      rawResults.forEach(r => {
         const key = `${r.quizId}-${r.studentId}`;
         const existing = latestResultsMap.get(key);
         if (!existing || new Date(r.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
            latestResultsMap.set(key, r);
         }
      });
      const results = Array.from(latestResultsMap.values());

      if (results.length > 0) {
        performanceMap[subj.name].total += results.reduce((acc, r) => acc + (r.score || 0), 0);
        performanceMap[subj.name].count += results.length;
      }
    });

    return Object.entries(performanceMap).map(([name, stats]) => ({
      name,
      achievement: stats.count > 0 ? Math.round(stats.total / stats.count) : 0,
      count: stats.count
    })).sort((a, b) => b.achievement - a.achievement);
  }, [data, selectedGradeId, selectedClassId, filterTeacherId]);

  const gradePerformance = useMemo(() => {
    return grades.map(g => {
      const gradeStudents = data.students.filter(s => {
        const c = data.classes.find(cls => cls.id === s.classId);
        return c?.gradeId === g.id && !s.isArchived;
      });
      const perf = calculateQuizAchievement('', gradeStudents);
      return {
        name: g.name,
        achievement: perf
      };
    }).filter(g => g.achievement > 0);
  }, [data, grades]);

  const stagePerformance = useMemo(() => {
    const STAGES = [
      { id: 'primary', name: 'المرحلة الابتدائية' },
      { id: 'middle', name: 'المرحلة المتوسطة' },
      { id: 'high', name: 'المرحلة الثانوية' },
    ];
    
    return STAGES.map(stage => {
      const stageGrades = data.grades.filter(g => (g.stage || 'primary') === stage.id).map(g => g.id);
      const stageStudents = data.students.filter(s => {
        const c = data.classes.find(cls => cls.id === s.classId);
        return c && stageGrades.includes(c.gradeId) && !s.isArchived;
      });
      const perf = calculateQuizAchievement('', stageStudents);
      return {
        name: stage.name,
        achievement: perf
      };
    }).filter(s => s.achievement > 0);
  }, [data]);

  const filteredSkills = useMemo(() => {
    return skillAnalytics.skillsList.filter(sk => {
      if (skillSearchTerm && !sk.name.toLowerCase().includes(skillSearchTerm.toLowerCase())) return false;
      if (skillSubjectFilter !== 'all' && sk.subjectName !== skillSubjectFilter) return false;
      return true;
    });
  }, [skillAnalytics.skillsList, skillSearchTerm, skillSubjectFilter]);

  const reportStudents = useMemo(() => {
    return data.students.filter(s => {
      if (s.isArchived) return false;
      if (selectedClassId && s.classId !== selectedClassId) return false;
      if (selectedGradeId) {
        const cls = data.classes.find(c => c.id === s.classId);
        if (cls?.gradeId !== selectedGradeId) return false;
      }
      if (studentSearchTerm && !s.name.toLowerCase().includes(studentSearchTerm.toLowerCase())) return false;
      return true;
    });
  }, [data.students, data.classes, selectedClassId, selectedGradeId, studentSearchTerm]);

  return (
    <div className="flex-1 p-6 lg:p-12 overflow-y-auto scrollbar-hide bg-slate-50/30" dir="rtl">
       <div className="max-w-[1700px] mx-auto space-y-8">
          
          {/* Header & Main Controls */}
          <div className="flex flex-col gap-3 mb-6 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
             <div className="flex flex-col xl:flex-row justify-between items-center gap-4">
                
                {/* Title & Navigation */}
                <div className="flex items-center justify-between w-full xl:w-auto gap-4">
                   <div className="flex items-center gap-3">
                     {onClose && (
                       <button 
                         onClick={onClose}
                         className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:text-indigo-600 hover:bg-indigo-50 transition-all group shrink-0"
                         title="العودة للوحة التحكم"
                       >
                         <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                       </button>
                     )}
                     <div className="p-1.5 rounded-2xl bg-[#faf9f6]/95 border border-[#7a1c22]/10 shadow-sm shrink-0 flex items-center justify-center">
                        <SchoolLogo size={55} showText={false} imageUrl={data.settings?.[0]?.schoolLogoUrl} />
                     </div>
                     <div className="flex flex-col">
                       <h2 className="text-xl font-black text-slate-800 tracking-tighter whitespace-nowrap">التقارير التحليلية</h2>
                       <p className="text-slate-500 font-semibold text-[10px] whitespace-nowrap">مراجعة لنتائج الاختبارات والمهارات</p>
                     </div>
                   </div>
                   
                   {/* Mobile PDF button */}
                   <button 
                     onClick={handleExportPDF}
                     disabled={isExporting}
                     className={`xl:hidden h-10 px-4 shrink-0 bg-slate-900 text-white rounded-xl flex items-center justify-center gap-1.5 hover:shadow-md transition-all font-black text-[11px] ${isExporting ? 'opacity-50 cursor-wait' : ''}`}
                   >
                      {isExporting ? <span className="animate-pulse">تصدير...</span> : <Download size={16} />}
                   </button>
                </div>

                {/* Tabs, Class, Grade, and PDF Controls */}
                <div className="flex flex-wrap lg:flex-nowrap items-center gap-3 w-full xl:w-auto">
                   
                   <div data-export-hide="true" className="flex bg-slate-50 p-1 rounded-xl w-full sm:w-auto overflow-x-auto scrollbar-hide">
                      <button 
                        onClick={() => setActiveTab('quizzes')}
                        className={`px-3 py-2 rounded-lg font-black text-[11px] transition-all flex justify-center flex-1 sm:flex-none items-center gap-1.5 whitespace-nowrap ${activeTab === 'quizzes' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                         <BrainCircuit size={14} />نتائج الاختبارات
                      </button>
                      <button 
                        onClick={() => setActiveTab('skills')}
                        className={`px-3 py-2 rounded-lg font-black text-[11px] transition-all flex justify-center flex-1 sm:flex-none items-center gap-1.5 whitespace-nowrap ${activeTab === 'skills' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                         <Zap size={14} />إتقان المهارات
                      </button>
                      {!hideStudentDetails && (
                        <button 
                          onClick={() => setActiveTab('students')}
                          className={`px-3 py-2 rounded-lg font-black text-[11px] transition-all flex justify-center flex-1 sm:flex-none items-center gap-1.5 whitespace-nowrap ${activeTab === 'students' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                           <Users size={14} />تقارير الطلاب
                        </button>
                      )}
                      <button 
                        onClick={() => setActiveTab('teachers')}
                        className={`px-3 py-2 rounded-lg font-black text-[11px] transition-all flex justify-center flex-1 sm:flex-none items-center gap-1.5 whitespace-nowrap ${activeTab === 'teachers' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                         <Award size={14} />تقارير المعلمين
                      </button>
                   </div>

                   <div data-export-hide="true" className="h-6 w-[1px] bg-slate-200 mx-1 hidden lg:block shrink-0" />

                   <div data-export-hide="true" className="flex gap-2 flex-grow sm:flex-none w-full sm:w-auto">
                      {/* Teacher filter dropdown (Moved from Navbar) */}
                      <div className="relative group w-1/3 sm:w-[130px] lg:w-auto shrink-0">
                         <select 
                           value={filterTeacherId || ''}
                           onChange={(e) => onFilterTeacherChange && onFilterTeacherChange(e.target.value)}
                           disabled={!!filterTeacherId && !onFilterTeacherChange}
                           className="w-full lg:w-[130px] h-10 bg-slate-50 border border-slate-100 rounded-xl px-8 font-black text-slate-700 outline-none appearance-none cursor-pointer focus:ring-2 ring-indigo-100 transition-all text-[11px] disabled:opacity-70 disabled:cursor-not-allowed"
                         >
                            {(onFilterTeacherChange || !filterTeacherId) && <option value="">جميع المعلمين</option>}
                            {data.teachers.filter(t => !t.isArchived && (!filterTeacherId || !!onFilterTeacherChange || t.id === filterTeacherId)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                         </select>
                         <User size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-indigo-600 transition-colors" />
                      </div>

                      <div className="relative group w-1/3 sm:w-[120px] lg:w-auto shrink-0">
                         <select 
                           value={selectedGradeId}
                           onChange={(e) => { setSelectedGradeId(e.target.value); setSelectedClassId(''); }}
                           className="w-full lg:w-[120px] h-10 bg-slate-50 border border-slate-100 rounded-xl px-8 font-black text-slate-700 outline-none appearance-none cursor-pointer focus:ring-2 ring-indigo-100 transition-all text-[11px]"
                         >
                            <option value="">جميع المراحل</option>
                            {grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                         </select>
                         <GraduationCap size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-indigo-600 transition-colors" />
                      </div>
                      
                      <div className="relative group w-1/3 sm:w-[120px] lg:w-auto shrink-0">
                         <select 
                           value={selectedClassId}
                           onChange={(e) => setSelectedClassId(e.target.value)}
                           className="w-full lg:w-[120px] h-10 bg-slate-50 border border-slate-100 rounded-xl px-8 font-black text-slate-700 outline-none appearance-none cursor-pointer focus:ring-2 ring-indigo-100 transition-all text-[11px]"
                         >
                            <option value="">جميع الفصول</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                         </select>
                         <Users size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-indigo-600 transition-colors" />
                      </div>
                   </div>
                   
                   <button 
                     onClick={handleExportPDF}
                     disabled={isExporting}
                     className={`hidden xl:flex h-10 px-4 shrink-0 bg-slate-900 text-white rounded-xl items-center justify-center gap-1.5 hover:shadow-md transition-all font-black text-[11px] ${isExporting ? 'opacity-50 cursor-wait' : ''}`}
                   >
                      {isExporting ? <span className="animate-pulse">تصدير...</span> : <><Download size={14} />تصدير</>}
                   </button>
                </div>
             </div>
          </div>

          <div ref={reportRef} className="space-y-8 p-10 bg-white rounded-3xl">
             {/* Report Export Header */}
                  <div className="hidden pb-10 border-b border-slate-100 mb-10 flex-col gap-2 print:flex" style={{ display: isExporting ? 'flex' : 'none' }}>
                     <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                           <div className="w-16 h-16 bg-transparent flex items-center justify-center overflow-hidden shrink-0">
                               <SchoolLogo size={65} showText={false} imageUrl={data.settings?.[0]?.schoolLogoUrl} />
                           </div>
                           <div>
                              <h1 className="text-4xl font-black text-slate-900 tracking-tight">تقرير منصة إتقان</h1>
                              <p className="text-slate-400 font-bold mt-2 italic text-lg">تقرير تحليل الأداء الأكاديمي والمهاري</p>
                           </div>
                        </div>
                        <div className="text-left font-black text-slate-800">
                           <p className="text-xl">{new Date().toLocaleDateString('ar-SA')}</p>
                           <p className="text-indigo-600">العام الدراسي: {displayYear}</p>
                        </div>
                     </div>
                     {filterTeacherId && (
                        <div className="mt-8 p-6 bg-indigo-50 rounded-2xl border-2 border-indigo-100 w-fit">
                           <p className="text-3xl font-black text-indigo-700">المعلم: {data.teachers.find(t => t.id === filterTeacherId)?.name}</p>
                        </div>
                     )}
                  </div>

             <AnimatePresence mode="wait">
            {activeTab === 'quizzes' ? (
               <motion.div 
                 key="quizzes"
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -20 }}
                 className="space-y-8"
               >
                  {!selectedClassId ? (
                    <>
                       {/* High Level Stats */}
                       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                          <StatCard label="إجمالي الاختبارات" value={classQuizzes.length} icon={<BrainCircuit className="text-indigo-600" />} color="bg-indigo-50" />
                          <StatCard label="عمليات الرصد" value={data.quizResults?.filter(r => !r.isArchived && activeQuizIds.has(r.quizId) && (!filterTeacherId || classQuizzes.some(q => q.id === r.quizId))).length || 0} icon={<CheckCircle2 className="text-green-600" />} color="bg-green-50" />
                          <StatCard label="متوسط الإنجاز العام" value={`${calculateQuizAchievement('', data.students.filter(s => !s.isArchived))}%`} icon={<Trophy className="text-yellow-600" />} color="bg-yellow-50" />
                          <StatCard label="فصول نشطة" value={classes.length} icon={<Users className="text-blue-600" />} color="bg-blue-50" />
                       </div>

                         {/* Professional Charts Row */}
                         <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-white p-10 rounded-3xl border border-slate-100 shadow-minimal relative overflow-hidden">
                               <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/40 blur-[100px] rounded-full -translate-x-32 -translate-y-32" />
                               <div className="relative z-10">
                                  <div className="flex justify-between items-center mb-10">
                                     <h3 className="text-xl md:text-2xl font-black tracking-tighter text-slate-800 flex items-center gap-3">
                                        <TrendingUp size={24} className="text-indigo-600" />
                                        تحليل الكفاءة والمقارنة المعيارية
                                     </h3>
                                     <div className="text-[10px] font-black text-slate-400 bg-slate-50 px-4 py-2 rounded-xl">مقارنة أداء الفصول</div>
                                  </div>
                                  <div className="h-[350px] w-full">
                                     <ResponsiveContainer width="100%" height="100%">
                                        <BarChart 
                                           data={classes.slice(0, 8).map(c => ({
                                              name: (c.name.length > 10 ? c.name.substring(0, 8) + '..' : c.name),
                                              fullName: c.name,
                                              achievement: calculateQuizAchievement('', data.students.filter(s => s.classId === c.id && !s.isArchived))
                                           }))}
                                           margin={{ top: 20, right: 10, left: -25, bottom: 5 }}
                                        >
                                           <defs>
                                              <linearGradient id="gradientClasses" x1="0" y1="0" x2="0" y2="1">
                                                 <stop offset="0%" stopColor="#6366f1" stopOpacity={0.95} />
                                                 <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.3} />
                                              </linearGradient>
                                              <linearGradient id="gradientClassesAlt" x1="0" y1="0" x2="0" y2="1">
                                                 <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.95} />
                                                 <stop offset="100%" stopColor="#2563eb" stopOpacity={0.3} />
                                              </linearGradient>
                                           </defs>
                                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                           <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} dy={10} />
                                           <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                                           <Tooltip 
                                             cursor={{ fill: 'rgba(241, 245, 249, 0.45)', radius: 12 }}
                                             wrapperStyle={{ pointerEvents: 'none', zIndex: 100 }}
                                             content={({ active, payload }) => {
                                                if (active && payload && payload.length) {
                                                   return (
                                                      <div className="bg-slate-950/95 backdrop-blur-md text-white p-4 rounded-xl border border-slate-800 text-right min-w-[150px]">
                                                         <p className="font-extrabold text-[11px] text-slate-400 mb-1">{payload[0].payload.fullName}</p>
                                                         <div className="flex items-center gap-1.5 justify-end mt-1">
                                                            <span className="text-xl font-black text-indigo-400">{payload[0].value}%</span>
                                                            <span className="text-[10px] text-slate-450 font-bold">مستوى الإنجاز</span>
                                                         </div>
                                                      </div>
                                                   );
                                                }
                                                return null;
                                             }}
                                           />
                                           <Bar dataKey="achievement" radius={[8, 8, 0, 0]} barSize={18}>
                                              {classes.slice(0, 8).map((c, index) => (
                                                <Cell key={`cell-${index}`} fill={index % 2 === 0 ? 'url(#gradientClasses)' : 'url(#gradientClassesAlt)'} />
                                              ))}
                                           </Bar>
                                        </BarChart>
                                     </ResponsiveContainer>
                                  </div>
                               </div>
                            </div>

                            <div className="bg-white p-10 rounded-3xl border border-slate-100 shadow-minimal relative overflow-hidden">
                               <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/40 blur-[100px] rounded-full -translate-x-32 -translate-y-32" />
                               <div className="relative z-10">
                                  <div className="flex justify-between items-center mb-10">
                                     <h3 className="text-xl md:text-2xl font-black tracking-tighter text-slate-800 flex items-center gap-3">
                                        <PieChartIcon size={24} className="text-blue-600" />
                                        توزيع التحصيل لكل مادة دراسية
                                     </h3>
                                  </div>
                                  <div className="space-y-4">
                                     {subjectPerformance.slice(0, 5).length === 0 ? (
                                        <div className="py-20 text-center text-slate-400 font-bold text-xs">لا توجد بيانات مواد مسجلة للترم المحدد</div>
                                     ) : (
                                        subjectPerformance.slice(0, 5).map((subj, index) => {
                                           let trackColor = 'bg-slate-100';
                                           let barColor = 'bg-gradient-to-l from-indigo-500 to-indigo-600';
                                           let textAccent = 'text-indigo-600';
                                           let bgAccent = 'bg-indigo-50/50';
                                           
                                           if (subj.achievement >= 90) {
                                              barColor = 'bg-gradient-to-l from-emerald-500 to-emerald-600';
                                              textAccent = 'text-emerald-600';
                                              bgAccent = 'bg-emerald-50/50';
                                           } else if (subj.achievement >= 75) {
                                              barColor = 'bg-gradient-to-l from-blue-500 to-blue-600';
                                              textAccent = 'text-blue-600';
                                              bgAccent = 'bg-blue-50/50';
                                           } else if (subj.achievement >= 50) {
                                              barColor = 'bg-gradient-to-l from-amber-500 to-amber-600';
                                              textAccent = 'text-amber-600';
                                              bgAccent = 'bg-amber-50/50';
                                           } else {
                                              barColor = 'bg-gradient-to-l from-rose-500 to-rose-600';
                                              textAccent = 'text-rose-600';
                                              bgAccent = 'bg-rose-50/50';
                                           }

                                           return (
                                              <motion.div 
                                                 key={index}
                                                 initial={{ opacity: 0, x: 20 }}
                                                 animate={{ opacity: 1, x: 0 }}
                                                 transition={{ delay: index * 0.05 }}
                                                 className="group/subj p-3 hover:bg-slate-50/75 rounded-2xl border border-transparent hover:border-slate-100 transition-all duration-300"
                                              >
                                                 <div className="flex justify-between items-center mb-1.5">
                                                    <div className="flex items-center gap-3">
                                                       <div className={`w-8 h-8 rounded-xl ${bgAccent} ${textAccent} flex items-center justify-center font-black text-xs`}>
                                                          {index + 1}
                                                       </div>
                                                       <div>
                                                          <span className="font-extrabold text-slate-800 text-sm block group-hover/subj:text-indigo-900 transition-colors">{subj.name}</span>
                                                          <span className="text-[10px] text-slate-400 font-bold block">{subj.count} مهارات واختبارات مرصودة</span>
                                                       </div>
                                                    </div>
                                                    <div className="text-left">
                                                       <span className={`text-base font-black ${textAccent}`}>{subj.achievement}%</span>
                                                    </div>
                                                 </div>
                                                 
                                                 <div className={`w-full h-2 ${trackColor} rounded-full overflow-hidden relative shadow-inner`}>
                                                    <motion.div 
                                                       initial={{ width: 0 }}
                                                       animate={{ width: `${subj.achievement}%` }}
                                                       transition={{ duration: 0.8, ease: 'easeOut' }}
                                                       className={`h-full ${barColor} rounded-full`}
                                                    />
                                                 </div>
                                              </motion.div>
                                           );
                                        })
                                     )}
                                  </div>
                               </div>
                            </div>
                         </div>

                         {/* Analytics Row 3: Grade & Stage Performance Contrast */}
                         <div className="bg-white p-12 rounded-3xl border border-slate-100 shadow-minimal relative overflow-hidden">
                            <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-50/30 blur-[120px] -translate-x-32 translate-y-32" />
                            <div className="relative z-10 flex flex-col lg:flex-row gap-12 items-start">
                               <div className="lg:w-1/3 space-y-6">
                                  <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-slate-200">
                                     <LayoutGrid size={32} />
                                  </div>
                                  <div className="space-y-2">
                                     <h3 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tighter">مؤشرات المراحل والصفوف</h3>
                                     <p className="text-slate-400 font-bold leading-relaxed">تحصيل الطلاب العام حسب المرحلة والمستويات الدراسية.</p>
                                  </div>
                                  
                                  <div className="space-y-6">
                                     <div>
                                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2.5">تحصيل المراحل التعليمية</p>
                                        <div className="grid grid-cols-2 xs:grid-cols-3 gap-2 w-full">
                                           {stagePerformance.map((sp, i) => (
                                             <div key={i} className="p-3 bg-indigo-50/40 border border-indigo-100/80 rounded-2xl flex flex-col items-center justify-center text-center transition-all duration-300 hover:bg-indigo-50/80">
                                                <span className="font-extrabold text-[10px] text-slate-500 mb-1 leading-tight">{sp.name}</span>
                                                <span className="font-black text-base text-indigo-600">{sp.achievement}%</span>
                                             </div>
                                           ))}
                                        </div>
                                     </div>

                                     <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">تحصيل الصفوف الدراسية</p>
                                        <div className="grid grid-cols-2 xs:grid-cols-3 gap-2 w-full">
                                           {gradePerformance.map((gp, i) => {
                                             let percentColor = 'text-rose-700 bg-rose-50/30 border-rose-100/70';
                                             if (gp.achievement >= 90) {
                                                percentColor = 'text-emerald-700 bg-emerald-50/30 border-emerald-100/70';
                                             } else if (gp.achievement >= 75) {
                                                percentColor = 'text-blue-700 bg-blue-50/30 border-blue-100/70';
                                             } else if (gp.achievement >= 50) {
                                                percentColor = 'text-amber-700 bg-amber-50/35 border-amber-100/70';
                                             }
                                             return (
                                               <div key={i} className={`p-3 border rounded-2xl flex flex-col items-center justify-center text-center transition-all duration-300 ${percentColor}`}>
                                                  <span className="font-extrabold text-[10px] text-slate-600 mb-1 leading-tight">{gp.name}</span>
                                                  <span className="font-black text-sm">{gp.achievement}%</span>
                                               </div>
                                             );
                                           })}
                                        </div>
                                     </div>
                                  </div>
                               </div>
                               <div className="lg:w-2/3 w-full h-[300px]">
                                  <ResponsiveContainer width="100%" height="100%">
                                     <BarChart data={gradePerformance} margin={{ top: 20, right: 10, left: -25, bottom: 0 }}>
                                        <defs>
                                           <linearGradient id="gradientGradeBar" x1="0" y1="0" x2="0" y2="1">
                                              <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.95} />
                                              <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.3} />
                                           </linearGradient>
                                           <linearGradient id="gradientGradeBarAlt" x1="0" y1="0" x2="0" y2="1">
                                              <stop offset="0%" stopColor="#818cf8" stopOpacity={0.95} />
                                              <stop offset="100%" stopColor="#818cf8" stopOpacity={0.3} />
                                           </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} />
                                        <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                                        <Tooltip 
                                           cursor={{ fill: 'rgba(241, 245, 249, 0.45)', radius: 12 }}
                                           wrapperStyle={{ pointerEvents: 'none', zIndex: 100 }}
                                           content={({ active, payload }) => {
                                             if (active && payload && payload.length) {
                                               return (
                                                  <div className="bg-slate-950/95 backdrop-blur-md text-white p-4 rounded-xl border border-slate-800 shadow-xl text-right min-w-[130px]">
                                                     <p className="font-extrabold text-[11px] text-slate-400 mb-1">{payload[0].payload.name}</p>
                                                     <div className="flex items-center gap-1.5 justify-end mt-1">
                                                        <span className="text-xl font-black text-indigo-400">{payload[0].value}%</span>
                                                        <span className="text-[10px] text-slate-450 font-bold">متوسط التحصيل</span>
                                                     </div>
                                                  </div>
                                               );
                                             }
                                             return null;
                                           }}
                                        />
                                        <Bar dataKey="achievement" radius={[8, 8, 0, 0]} barSize={32}>
                                           {gradePerformance.map((entry, index) => (
                                              <Cell key={`cell-${index}`} fill={index % 2 === 0 ? 'url(#gradientGradeBar)' : 'url(#gradientGradeBarAlt)'} />
                                           ))}
                                        </Bar>
                                     </BarChart>
                                  </ResponsiveContainer>
                                </div>
                            </div>
                         </div>

                        {/* Top Elite Row - Compact, Horizontal, and Space-Saving */}
                        <div className="bg-slate-900 p-4 sm:p-5 rounded-2xl shadow-lg relative overflow-hidden">
                           <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 blur-[90px] rounded-full pointer-events-none" />
                           <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                              {/* Title Section */}
                              <div className="flex items-center gap-2.5 shrink-0">
                                 <div className="p-2 bg-indigo-500/20 rounded-lg text-yellow-400 shrink-0">
                                    <Star className="fill-current" size={16} />
                                 </div>
                                 <div className="text-right">
                                    <h3 className="text-sm font-black text-white leading-none mb-1">متصدري الفصول</h3>
                                    <p className="text-slate-400 font-bold text-[10px]">الشُعب الأعلى تحصيلاً</p>
                                 </div>
                              </div>
                              
                              {/* Horizontal list of Top Classes */}
                              <div className="flex flex-wrap items-center gap-2 justify-start flex-1 font-sans">
                                 {classes
                                   .map(c => ({
                                     name: c.name,
                                     perf: calculateQuizAchievement('', data.students.filter(s => s.classId === c.id && !s.isArchived))
                                   }))
                                   .sort((a, b) => b.perf - a.perf)
                                   .slice(0, 5)
                                   .map((c, i) => (
                                   <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/[0.06] rounded-xl transition-all group shrink-0">
                                      <div className={`w-5 h-5 rounded flex items-center justify-center font-black text-[10px] ${i === 0 ? 'bg-yellow-400 text-slate-900 shadow-md shadow-yellow-400/20' : i === 1 ? 'bg-slate-300 text-slate-900' : 'bg-indigo-600 text-white'}`}>
                                         {i + 1}
                                      </div>
                                      <span className="font-bold text-[11px] text-slate-200">{c.name}</span>
                                      <div className="w-[1px] h-3 bg-white/10" />
                                      <span className="font-black text-[11px] text-yellow-400">{c.perf}%</span>
                                   </div>
                                 ))}
                              </div>
                           </div>
                        </div>

                         <div className="bg-white p-10 rounded-3xl border border-slate-100 shadow-minimal">
                            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10 border-b border-slate-100 pb-8">
                               <div>
                                  <h3 className="text-xl md:text-2xl font-black tracking-tighter text-slate-800 italic">سجل الاختبارات الفصلية</h3>
                                  <p className="text-xs text-slate-400 font-bold mt-1">نتائج ومخرجات الطلاب لكل اختبار مرصود.</p>
                               </div>
                               
                               <div data-export-hide="true" className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full lg:w-auto">
                                  {/* Quiz Grade Filter */}
                                  <div className="relative flex items-center bg-slate-50 border border-slate-200/80 rounded-2xl px-3.5 py-2 h-12 hover:border-indigo-300 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-50 transition-all flex-1 sm:flex-none">
                                     <GraduationCap size={16} className="text-indigo-500 ml-2 shrink-0 animate-pulse" />
                                     <span className="text-[10px] font-black text-slate-400 ml-1.5 whitespace-nowrap">الصف:</span>
                                     <select
                                        value={quizFilterGradeId}
                                        onChange={(e) => {
                                           setQuizFilterGradeId(e.target.value);
                                           setQuizFilterQuizId(''); // Reset specific quiz selection
                                        }}
                                        className="bg-transparent font-black text-[11px] text-slate-700 outline-none cursor-pointer border-none p-0 pr-1 select-none w-full min-w-[90px]"
                                     >
                                        <option value="">جميع الصفوف</option>
                                        {grades.map(g => (
                                           <option key={g.id} value={g.id}>{g.name}</option>
                                        ))}
                                     </select>
                                  </div>

                                  {/* Specific Quiz Filter */}
                                  <div className="relative flex items-center bg-slate-50 border border-slate-200/80 rounded-2xl px-3.5 py-2 h-12 hover:border-indigo-300 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-50 transition-all flex-1 sm:flex-none">
                                     <BrainCircuit size={16} className="text-emerald-500 ml-2 shrink-0" />
                                     <span className="text-[10px] font-black text-slate-400 ml-1.5 whitespace-nowrap">الاختبار:</span>
                                     <select
                                        value={quizFilterQuizId}
                                        onChange={(e) => setQuizFilterQuizId(e.target.value)}
                                        className="bg-transparent font-black text-[11px] text-slate-700 outline-none cursor-pointer border-none p-0 pr-1 select-none max-w-[160px] min-w-[110px]"
                                     >
                                        <option value="">جميع الاختبارات</option>
                                        {classQuizzes
                                           .filter(q => !quizFilterGradeId || q.gradeId === quizFilterGradeId)
                                           .map(q => (
                                              <option key={q.id} value={q.id}>{q.title}</option>
                                           ))
                                        }
                                     </select>
                                  </div>

                                  {/* Term/Semester Filter */}
                                  <div className="relative flex items-center bg-slate-50 border border-slate-200/80 rounded-2xl px-3.5 py-2 h-12 hover:border-indigo-300 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-50 transition-all flex-1 sm:flex-none">
                                     <Calendar size={16} className="text-violet-500 ml-2 shrink-0" />
                                     <span className="text-[10px] font-black text-slate-400 ml-1.5 whitespace-nowrap">الفصل:</span>
                                     <select
                                        value={quizFilterTerm}
                                        onChange={(e) => setQuizFilterTerm(e.target.value)}
                                        className="bg-transparent font-black text-[11px] text-slate-700 outline-none cursor-pointer border-none p-0 pr-1 select-none w-full min-w-[90px]"
                                     >
                                        <option value="all">كامل العام</option>
                                        <option value="term1">الفصل الأول</option>
                                        <option value="term2">الفصل الثاني</option>
                                     </select>
                                  </div>

                                  {/* Text Search Input */}
                                  <div className="relative group w-full sm:w-48">
                                     <input 
                                       type="text"
                                       placeholder="بحث..."
                                       value={searchTerm}
                                       onChange={(e) => setSearchTerm(e.target.value)}
                                       className="w-full h-8 bg-slate-50 border border-slate-200/80 rounded-lg pr-9 pl-3 font-semibold text-slate-700 outline-none focus:ring-2 ring-indigo-50 focus:border-indigo-400 transition-all text-[11px]"
                                     />
                                     <Search size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                                  </div>
                               </div>
                            </div>
 
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                               {(() => {
                                  const filteredList = classQuizzes.filter(q => {
                                     if (searchTerm && !q.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
                                     if (quizFilterGradeId && q.gradeId !== quizFilterGradeId) return false;
                                     if (quizFilterQuizId && q.id !== quizFilterQuizId) return false;
                                     if (quizFilterTerm && quizFilterTerm !== 'all') {
                                        const qTerm = q.term || 'term1';
                                        if (qTerm !== quizFilterTerm) return false;
                                     }
                                     return true;
                                  });

                                  if (filteredList.length === 0) {
                                     return (
                                        <div className="col-span-full py-20 text-center space-y-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                           <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto shadow-sm">
                                              <XCircle size={28} />
                                           </div>
                                           <div className="space-y-1">
                                              <p className="text-slate-800 font-extrabold text-sm">لم يتم العثور على اختبارات</p>
                                              <p className="text-slate-400 font-bold text-xs">حاول تعديل خيارات الفلترة أو كتابة كلمة بحث أخرى</p>
                                           </div>
                                        </div>
                                     );
                                  }

                                  return filteredList.map((quiz, i) => (
                                      <motion.div 
                                        key={quiz.id} 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: i * 0.03 }}
                                        onClick={() => setSelectedQuizToManage(quiz)}
                                        className="group bg-white hover:bg-slate-50 border border-slate-100 hover:border-indigo-100 rounded-2xl p-2.5 flex items-center gap-3 transition-all cursor-pointer hover:shadow-md h-16 relative overflow-hidden shrink-0"
                                      >
                                         {/* Small Icon Container */}
                                         <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all transform shrink-0">
                                            <BrainCircuit size={18} />
                                         </div>
    
                                         {/* Title and Info */}
                                         <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                               <h4 className="text-[11px] font-black text-slate-800 truncate tracking-tight group-hover:text-indigo-600 transition-colors uppercase leading-none">
                                                 {quiz.title}
                                               </h4>
                                               <span className="px-1 py-0.5 bg-slate-100 text-slate-500 text-[6px] font-black rounded-sm uppercase tracking-widest border border-slate-200">
                                                 {data.subjects.filter(s => quiz.subjectIds?.includes(s.id)).map(s => s.name).join(' ، ') || 'عام'}
                                               </span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                               <p className="text-slate-400 font-bold text-[8px] uppercase tracking-widest truncate">
                                                  {grades.find(g => g.id === quiz.gradeId)?.name || 'مستوى عام'}
                                               </p>
                                               <div className="w-1 h-1 rounded-full bg-slate-200" />
                                               <p className="text-slate-400 font-bold text-[8px] uppercase tracking-widest">
                                                  تاريخ النشر: {quiz.updatedAt ? (quiz.updatedAt instanceof Timestamp ? quiz.updatedAt.toDate().toLocaleDateString('ar-SA') : new Date(quiz.updatedAt as any).toLocaleDateString('ar-SA')) : 'رصد جديد'}
                                               </p>
                                            </div>
                                         </div>
    
                                         {/* Stats and Actions */}
                                         <div className="flex items-center gap-4 shrink-0 px-4 border-r border-slate-100">
                                            {(() => {
                                               const stats = getQuizStats(quiz.id, data.students.filter(s => !s.isArchived));
                                               return (
                                                 <>
                                                    <div className="text-center group-hover:transform group-hover:scale-105 transition-transform min-w-[50px]">
                                                       <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1">النسبة</p>
                                                       <p className="text-sm font-black text-indigo-600 leading-none">{stats.avg}%</p>
                                                    </div>
                                                    <div className="text-center min-w-[40px]">
                                                       <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1">المختبرون</p>
                                                       <p className="text-sm font-black text-slate-900 leading-none">{stats.count}</p>
                                                    </div>
                                                 </>
                                               );
                                            })()}
                                            
                                            <div className="flex items-center gap-2 border-l border-slate-100 pl-4">
                                               <button 
                                                 onClick={async (e) => {
                                                   e.stopPropagation();
                                                   setSearchTerm(quiz.title);
                                                   setTimeout(() => handleExportPDF(), 500);
                                                 }}
                                                 className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center shadow-sm"
                                                 title="تصدير PDF"
                                               >
                                                 <Printer size={12} />
                                               </button>
                                               <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                  <ChevronLeft size={18} />
                                               </div>
                                            </div>
                                         </div>
                                      </motion.div>
                                  ));
                               })()}
                            </div>
                         </div>
                     </>
                   ) : (
                     <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
                        <button onClick={() => setSelectedClassId('')} className="flex items-center gap-3 text-slate-500 font-black text-xs hover:text-indigo-600 transition-colors bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100 w-fit group">
                           <ChevronLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> 
                           العودة للإحصائيات العامة
                        </button>

                        <div className="bg-white p-12 rounded-3xl border border-slate-100 shadow-minimal relative overflow-hidden">
                           <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-50/70 blur-[120px] rounded-full -translate-x-48 -translate-y-48" />
                           
                           <div className="relative z-10 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-10 mb-16 px-4">
                              <div className="flex items-center gap-8">
                                 <div className="w-24 h-24 rounded-[36px] bg-indigo-600 text-white flex items-center justify-center shadow-2xl shadow-indigo-200 relative group overflow-hidden">
                                    <Users size={48} />
                                    <div className="absolute inset-0 bg-white/20 translate-y-24 group-hover:translate-y-0 transition-transform duration-500" />
                                 </div>
                                 <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                       <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black border border-indigo-100 shadow-sm">
                                          {grades.find(g => g.id === currentClass?.gradeId)?.name}
                                       </span>
                                       <span className="px-4 py-1.5 bg-slate-900 text-white rounded-xl text-[10px] font-black shadow-lg">
                                          {classStudents.length} طالباً
                                       </span>
                                    </div>
                                    <h2 className="text-5xl font-black text-slate-900 tracking-tight">{currentClass?.name}</h2>
                                    <p className="text-slate-400 font-bold max-w-md leading-relaxed text-sm">بيانات معيارية لقياس جودة مخرجات التعليم بالفصل بناءً على الاختبارات السنوية والفصلية.</p>
                                 </div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full xl:w-auto">
                                       <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl text-center flex-1 md:min-w-[160px] shadow-lg">
                                          <p className="text-[10px] font-black text-indigo-300 uppercase tracking-wider mb-2">مؤشر التحصيل للفصل (الشامل)</p>
                                          <p className="text-3xl font-black text-yellow-400 leading-none">
                                             {calculatePerformance ? calculatePerformance(selectedClassId) : calculateQuizAchievement('', classStudents)}%
                                          </p>
                                          <p className="text-[10px] text-slate-400 font-bold mt-2">الأداء العام للمهارات والاختبارات</p>
                                       </div>
                                       <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl text-center flex-1 md:min-w-[160px] hover:border-indigo-100 transition-colors">
                                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">متوسط الاختبارات الفصلية</p>
                                          <p className="text-3xl font-black text-indigo-600 leading-none">
                                             {calculateQuizAchievement('', classStudents)}%
                                          </p>
                                          <p className="text-[10px] text-slate-400 font-bold mt-2">بناءً على الرصد الآلي</p>
                                       </div>
                                       <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl text-center flex-1 md:min-w-[160px] hover:border-indigo-100 transition-colors">
                                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">متوسط إتقان المهارات</p>
                                          <p className="text-3xl font-black text-emerald-600 leading-none">
                                             {(() => {
                                                if (!currentClass) return 0;
                                                const classSubjects = data.subjects.filter(sub => 
                                                   sub.gradeId === currentClass.gradeId && 
                                                   (!sub.classId || sub.classId === selectedClassId || (sub.classIds && sub.classIds.includes(selectedClassId))) &&
                                                   !sub.isArchived
                                                );
                                                let totalSkillsPoints = 0;
                                                let maxSkillsPoints = 0;
                                                
                                                classStudents.forEach(st => {
                                                   classSubjects.forEach(sub => {
                                                      const subSkills = data.skills.filter(sk => 
                                                         !sk.isArchived && 
                                                         ((sk.gradeId === sub.gradeId && sk.subjectName === sub.name) || (sk.subjectId === sub.id))
                                                      );
                                                      subSkills.forEach(sk => {
                                                         const evalData = evaluations[st.id + '-' + sk.id + '-' + academicYear];
                                                         if (evalData) {
                                                            maxSkillsPoints += 4;
                                                            const score = evalData.score;
                                                            if (score === 'mastered') totalSkillsPoints += 4;
                                                            else if (score === 'advanced') totalSkillsPoints += 3;
                                                            else if (score === 'accepted') totalSkillsPoints += 2;
                                                            else if (score === 'weak') totalSkillsPoints += 1;
                                                         }
                                                      });
                                                   });
                                                });
                                                return maxSkillsPoints > 0 ? Math.round((totalSkillsPoints / maxSkillsPoints) * 100) : 0;
                                             })()}%
                                          </p>
                                          <p className="text-[10px] text-slate-400 font-bold mt-2">بناءً على رصد المهارات</p>
                                       </div>
                                    </div>
                           </div>

                            <div className="relative z-10 max-h-[800px] overflow-y-auto pr-2 scrollbar-hide">
                               {hideStudentDetails ? (
                                  <div className="bg-slate-50/50 p-12 rounded-3xl border border-dashed border-slate-200 text-center">
                                     <Users size={48} className="text-slate-300 mx-auto mb-4" />
                                     <h3 className="text-lg font-black text-slate-700">بيانات الطلاب محجوبة</h3>
                                     <p className="text-xs text-slate-400 font-bold mt-2">تقارير الطلاب التفصيلية غير متاحة في هذا العرض الإشرافي العام.</p>
                                  </div>
                               ) : !selectedReportStudentId ? (
                                <div className="min-w-[1200px] overflow-x-auto pb-4 scrollbar-hide">
                                  <table className="w-full text-right border-separate border-spacing-y-4">
                                     <thead>
                                         <tr>
                                            <th className="pb-4 pr-6 font-black text-slate-400 text-[11px] uppercase tracking-widest text-right">معلومات الطالب</th>
                                            <th className="pb-4 px-4 font-black text-slate-400 text-[11px] uppercase tracking-widest text-center">معدل الاختبارات</th>
                                            <th className="pb-4 px-4 font-black text-slate-400 text-[11px] uppercase tracking-widest text-center">معدل المهارات</th>
                                            <th className="pb-4 px-4 font-black text-slate-400 text-[11px] uppercase tracking-widest text-center">المعدل الشامل</th>
                                            <th className="pb-4 px-6 font-black text-slate-400 text-[11px] uppercase tracking-widest text-right w-full">تفاصيل التقييم الدراسي للمهارات والاختبارات</th>
                                         </tr>
                                      </thead>
                                     <tbody>
                                        {classStudents.map(student => {
                                           let rawResults = data.quizResults?.filter(r => !r.isArchived && activeQuizIds.has(r.quizId) && r.studentId === student.id) || [];
                                            if (filterTeacherId) {
                                               rawResults = rawResults.filter(r => classQuizzes.some(q => q.id === r.quizId));
                                            }
                                            const latestResultsMap = new Map();
                                            rawResults.forEach(r => {
                                               const existing = latestResultsMap.get(r.quizId);
                                               if (!existing || new Date(r.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
                                                  latestResultsMap.set(r.quizId, r);
                                               }
                                            });
                                            const results = Array.from(latestResultsMap.values());
                                            const avg = results.length > 0 ? Math.round(results.reduce((acc, r) => acc + r.score, 0) / results.length) : 0;
                                            const max = results.length > 0 ? Math.max(...results.map(r => r.score)) : 0;
                                            const min = results.length > 0 ? Math.min(...results.map(r => r.score)) : 0;

                                            const skillsAvg = (() => {
                                              if (!currentClass) return 0;
                                              const classSubjects = data.subjects.filter(sub => 
                                                 sub.gradeId === currentClass.gradeId && 
                                                 (!sub.classId || sub.classId === selectedClassId || (sub.classIds && sub.classIds.includes(selectedClassId))) &&
                                                 !sub.isArchived
                                              );
                                              let totalSkillsPoints = 0;
                                              let maxSkillsPoints = 0;
                                              
                                              classSubjects.forEach(sub => {
                                                 const subSkills = data.skills.filter(sk => 
                                                    !sk.isArchived && 
                                                    ((sk.gradeId === sub.gradeId && sk.subjectName === sub.name) || (sk.subjectId === sub.id))
                                                 );
                                                 subSkills.forEach(sk => {
                                                    const evalData = evaluations[student.id + '-' + sk.id + '-' + academicYear];
                                                    if (evalData) {
                                                       maxSkillsPoints += 4;
                                                       const score = evalData.score;
                                                       if (score === 'mastered') totalSkillsPoints += 4;
                                                       else if (score === 'advanced') totalSkillsPoints += 3;
                                                       else if (score === 'accepted') totalSkillsPoints += 2;
                                                       else if (score === 'weak') totalSkillsPoints += 1;
                                                    }
                                                 });
                                              });
                                              return maxSkillsPoints > 0 ? Math.round((totalSkillsPoints / maxSkillsPoints) * 100) : 0;
                                           })();

                                           const comprehensiveAvg = (avg > 0 && skillsAvg > 0) 
                                              ? Math.round((avg + skillsAvg) / 2) 
                                              : (avg > 0 ? avg : (skillsAvg > 0 ? skillsAvg : 0));

                                           return (
                                              <tr key={student.id} className="group">
                                                 <td className="py-5 pr-6 bg-slate-50/50 group-hover:bg-indigo-50 group-hover:shadow-xl group-hover:shadow-indigo-500/5 transition-all rounded-r-[32px] border-y border-r border-slate-50">
                                                    <div 
                                                       className="flex items-center gap-4 cursor-pointer"
                                                       onClick={() => onSelectStudent?.(student)}
                                                    >
                                                       <div className={`w-14 h-14 rounded-[18px] flex items-center justify-center font-black text-lg text-white shadow-lg ${avg >= 70 ? 'bg-indigo-600 shadow-indigo-100' : 'bg-slate-300'}`}>
                                                          {student.name.charAt(0)}
                                                       </div>
                                                       <div>
                                                          <p className="font-black text-slate-800 text-lg leading-tight group-hover:text-indigo-600 transition-colors">{student.name}</p>
                                                          <p className="text-[9px] font-black text-slate-400 uppercase mt-1">كود الطالب: {student.id.substring(0, 8).toUpperCase()}</p>
                                                       </div>
                                                    </div>
                                                 </td>
                                                 <td className="py-5 px-6 bg-slate-50/50 group-hover:bg-indigo-50 text-center border-y border-slate-50">
                                                    <div className={`inline-flex px-6 py-2.5 rounded-2xl border font-black text-sm shadow-sm ${getPerformanceColor(avg)}`}>
                                                       {avg > 0 ? `${avg}%` : 'لا بيانات'}
                                                    </div>
                                                 </td>
                                                 <td className="py-5 px-6 bg-slate-50/50 group-hover:bg-indigo-50 text-center border-y border-slate-50">
                                                    <div className={`inline-flex px-6 py-2.5 rounded-2xl border font-black text-sm shadow-sm ${getPerformanceColor(skillsAvg)}`}>
                                                       {skillsAvg > 0 ? `${skillsAvg}%` : 'لا بيانات'}
                                                    </div>
                                                 </td>
                                                 <td className="py-5 px-6 bg-slate-50/50 group-hover:bg-indigo-50 text-center border-y border-slate-50">
                                                    <div className={`inline-flex px-6 py-2.5 rounded-2xl border font-black text-sm shadow-sm ${getPerformanceColor(comprehensiveAvg)}`}>
                                                       {comprehensiveAvg > 0 ? `${comprehensiveAvg}%` : 'لا بيانات'}
                                                    </div>
                                                 </td>
                                                 <td className="py-5 px-6 bg-slate-50/50 group-hover:bg-indigo-50 text-right rounded-l-[32px] border-y border-l border-slate-50">
                                                    <div className="flex gap-2 flex-wrap min-w-[200px]">
                                                       {classQuizzes.map(quiz => {
                                                          const res = results.find(r => r.quizId === quiz.id);
                                                          return (
                                                             <div 
                                                               key={quiz.id} 
                                                               className={`px-4 py-2 rounded-xl flex flex-col items-center justify-center font-black border transition-all ${
                                                                 res ? 'bg-white border-indigo-100 text-indigo-600 shadow-sm scale-115' : 'bg-slate-100/50 border-slate-100 text-slate-300 opacity-40'
                                                               }`}
                                                               title={quiz.title}
                                                             >
                                                                <span className="text-[8px] opacity-60 mb-0.5 uppercase tracking-tighter truncate w-10 text-center">{quiz.title}</span>
                                                                <span className="text-[11px] leading-none">{res ? `${res.score}%` : '0'}</span>
                                                             </div>
                                                          );
                                                       })}
                                                       {classQuizzes.length === 0 && <span className="text-[10px] text-slate-300 italic">لا توجد اختبارات مربوطة بالفصل</span>}
                                                    </div>
                                                 </td>
                                              </tr>
                                           );
                                        })}
                            
                                      </tbody>
                                   </table>
                                </div>
                                ) : (
                                   (() => {
                                      const student = data.students.find(s => s.id === selectedReportStudentId);
                                      if (!student) return null;
                                      const cls = data.classes.find(c => c.id === student.classId);
                                      const grd = cls ? data.grades.find(g => g.id === cls.gradeId) : undefined;
                                      
                                      const stQuizResults = data.quizResults.filter(r => r.studentId === student.id && !r.isArchived && activeQuizIds.has(r.quizId));
                                      const stQuizAvg = stQuizResults.length > 0 ? Math.round(stQuizResults.reduce((acc, r) => acc + r.score, 0) / stQuizResults.length) : 0;
                                      
                                      const studentEvaluations = Object.entries(evaluations)
                                         .filter(([key]) => key.startsWith(`${student.id}-`) && key.endsWith(`-${academicYear}`))
                                         .map(([key, val]) => {
                                            const skillId = key.slice(student.id.length + 1, -(academicYear.length + 1));
                                            const skill = data.skills.find(s => s.id === skillId);
                                            return { skill, val };
                                         })
                                         .filter(ev => ev.skill !== undefined);
                            
                         const mastered = studentEvaluations.filter(e => e.val.score === 'mastered').length;
                         const advanced = studentEvaluations.filter(e => e.val.score === 'advanced').length;
                         const accepted = studentEvaluations.filter(e => e.val.score === 'accepted').length;
                         const weak = studentEvaluations.filter(e => e.val.score === 'weak').length;
                         const veryWeak = studentEvaluations.filter(e => e.val.score === 'very-weak').length;
                         const totalEvals = studentEvaluations.length;
                         
                         const activePerformance = (() => {
                            if (stQuizResults.length === 0 && totalEvals === 0) return { label: 'جديد / لا توجد بيانات كافية حالياً', color: 'bg-slate-50 text-slate-500 border-slate-100', stars: 0 };
                            const masteredRate = totalEvals > 0 ? Math.round(((mastered + advanced) / totalEvals) * 100) : 100;
                            let rawPercentage = 0;
                            if (stQuizResults.length > 0 && totalEvals > 0) {
                               rawPercentage = Math.round((stQuizAvg + masteredRate) / 2);
                            } else if (stQuizResults.length > 0) {
                               rawPercentage = stQuizAvg;
                            } else {
                               rawPercentage = masteredRate;
                            }
                            
                            if (rawPercentage >= 90) return { label: 'ممتاز وفائق 🌟', color: 'bg-emerald-50 text-emerald-700 border-emerald-100', text: 'ممتاز', stars: 5 };
                            if (rawPercentage >= 80) return { label: 'مستوى متقدم وجيد جداً 👍', color: 'bg-indigo-50 text-indigo-700 border-indigo-100', text: 'جيد جداً', stars: 4 };
                            if (rawPercentage >= 70) return { label: 'مستوى جيد ومتمكن 🎯', color: 'bg-blue-50 text-blue-700 border-blue-100', text: 'جيد', stars: 3 };
                            if (rawPercentage >= 50) return { label: 'مستوى مقبول (يحتاج رعاية)', color: 'bg-amber-50 text-amber-700 border-amber-100', text: 'مقبول', stars: 2 };
                            return { label: 'بحاجة ماسة لخطة دعم وتوجيه ⚠️', color: 'bg-red-50 text-rose-700 border-rose-100', text: 'ضعيف', stars: 1 };
                         })();

                         const trendData = stQuizResults.map((r, i) => {
                            const qObj = data.quizzes.find(q => q.id === r.quizId);
                            return {
                               index: i + 1,
                               title: qObj?.title ? (qObj.title.length > 10 ? qObj.title.substring(0, 10) + '...' : qObj.title) : `اختبار ${i + 1}`,
                               الدرجة: r.score
                            };
                         });

                         const breakdownData = [
                            { name: 'متقن', value: mastered, fill: '#10b981' },
                            { name: 'متقدم', value: advanced, fill: '#6366f1' },
                            { name: 'مقبول', value: accepted, fill: '#f59e0b' },
                            { name: 'ضعيف', value: weak, fill: '#f43f5e' },
                            { name: 'ضعيف جداً', value: veryWeak, fill: '#be123c' }
                         ].filter(b => b.value > 0);

                         return (
                            <div className="space-y-8 animate-fadeIn text-right font-sans" dir="rtl">
                               {/* Actions Top Header */}
                               <div data-export-hide="true" className="flex flex-row bg-white p-4 px-6 rounded-2xl border border-slate-100 shadow-minimal print:hidden justify-between items-center">
                                  <button 
                                     onClick={() => setSelectedReportStudentId('')}
                                     className="flex items-center gap-2 text-xs font-black text-slate-600 hover:text-slate-950 flex-row hover:bg-slate-50 cursor-pointer px-3 py-1.5 rounded-xl transition-colors font-sans"
                                  >
                                     <ArrowRight size={16} />
                                     <span>العودة للقائمة</span>
                                  </button>
                                  
                                  <div className="flex items-center gap-2 font-sans">
                                     <span className="text-xs text-slate-400 font-bold hidden sm:inline font-sans">تقرير فردي مفصل للطالب</span>
                                     <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                  </div>
                               </div>

                               {/* Comprehensive Card Profile */}
                               <div className="bg-white p-8 md:p-10 rounded-3xl border border-slate-100 shadow-minimal relative overflow-hidden flex flex-col md:flex-row-reverse justify-between items-center gap-8 text-right font-sans">
                                  <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full filter blur-3xl pointer-events-none"></div>
                                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/5 rounded-full filter blur-3xl pointer-events-none"></div>

                                  {/* Student basics */}
                                  <div className="flex flex-col md:flex-row-reverse items-center justify-start gap-6 text-center md:text-right w-full font-sans">
                                     <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center font-black text-3xl shadow-xl shadow-indigo-600/15 shrink-0 transform hover:rotate-3 transition-transform font-sans">
                                        {student.name.trim().charAt(0)}
                                     </div>
                                     <div className="space-y-2 font-sans">
                                        <h3 className="text-2xl md:text-3xl font-black text-slate-800 leading-tight tracking-tight">{student.name}</h3>
                                        <div className="flex flex-row-reverse items-center justify-center md:justify-start gap-3 mt-1.5">
                                           <span className="bg-slate-100 border border-slate-200/50 px-3 py-1 text-[10px] font-black text-slate-600 rounded-xl font-sans">{grd?.name || 'غير محدد'}</span>
                                           <span className="bg-indigo-500/10 border border-indigo-200/50 px-3 py-1 text-[10px] font-black text-indigo-600 rounded-xl font-sans">{cls?.name || 'غير محدد'}</span>
                                           <span className="text-slate-400 font-bold text-[10px] font-sans">العام: {displayYear}</span>
                                        </div>
                                     </div>
                                  </div>

                                  {/* Visual Status Indicator */}
                                  <div className="flex flex-col items-center justify-center text-center p-6 bg-slate-50 border border-slate-100 rounded-2xl min-w-[220px] font-sans">
                                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">التقييم التشخيصي العام</span>
                                     <div className={`px-4 py-2.5 rounded-2xl border font-black text-xs ${activePerformance.color} mb-3.5`}>
                                        {activePerformance.label}
                                     </div>
                                     <div className="flex gap-1 justify-center w-full">
                                        {[...Array(5)].map((_, i) => (
                                           <Star 
                                              key={i} 
                                              size={14} 
                                              className={i < activePerformance.stars ? 'text-amber-500 fill-amber-500' : 'text-slate-200'}
                                           />
                                        ))}
                                     </div>
                                  </div>
                               </div>

                               {/* Four core metrics */}
                               <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 text-right font-sans">
                                  <div className="bg-gradient-to-br from-white to-slate-50/20 p-6 rounded-2xl border border-slate-100 shadow-minimal space-y-4">
                                     <div className="flex items-center justify-between flex-row-reverse">
                                        <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100/30">
                                           <Trophy size={16} />
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400">معدل درجات الاختبارات</span>
                                     </div>
                                     <div>
                                        <h4 className="text-3xl font-black text-indigo-600 tracking-tight">{stQuizResults.length > 0 ? `${stQuizAvg}%` : '--'}</h4>
                                        <p className="text-[10px] text-slate-400 font-bold mt-1.5 font-sans font-sans">مبني على {stQuizResults.length} اختبارات منجزة</p>
                                     </div>
                                  </div>

                                  <div className="bg-gradient-to-br from-white to-slate-50/20 p-6 rounded-2xl border border-slate-100 shadow-minimal space-y-4">
                                     <div className="flex items-center justify-between flex-row-reverse">
                                        <div className="w-9 h-9 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100/30">
                                           <CheckCircle2 size={16} />
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400">المهارات المتقنة</span>
                                     </div>
                                     <div>
                                        <h4 className="text-3xl font-black text-emerald-600 tracking-tight">{mastered + advanced}</h4>
                                        <p className="text-[10px] text-slate-400 font-bold mt-1.5 font-sans font-sans font-sans">من أصل {totalEvals} مهارات مقيمة</p>
                                     </div>
                                  </div>

                                  <div className="bg-gradient-to-br from-white to-slate-50/20 p-6 rounded-2xl border border-slate-100 shadow-minimal space-y-4">
                                     <div className="flex items-center justify-between flex-row-reverse">
                                        <div className="w-9 h-9 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center border border-amber-100/30">
                                           <Sparkles size={16} />
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400">مهارات في مستوى متوسط</span>
                                     </div>
                                     <div>
                                        <h4 className="text-3xl font-black text-amber-500 tracking-tight">{accepted}</h4>
                                        <p className="text-[10px] text-slate-400 font-bold mt-1.5 font-sans font-sans">تعتبر مقبولة واجتازها بنجاح</p>
                                     </div>
                                  </div>

                                  <div className="bg-gradient-to-br from-white to-slate-50/20 p-6 rounded-2xl border border-slate-100 shadow-minimal space-y-4">
                                     <div className="flex items-center justify-between flex-row-reverse">
                                        <div className="w-9 h-9 bg-red-50 text-rose-600 rounded-xl flex items-center justify-center border border-rose-100/30">
                                           <AlertCircle size={16} />
                                        </div>
                                        <span className="text-[10px] font-black text-slate-400">مهارات تحتاج دعم عاجل</span>
                                     </div>
                                     <div>
                                        <h4 className="text-3xl font-black text-rose-600 tracking-tight">{weak + veryWeak}</h4>
                                        <p className="text-[10px] text-slate-400 font-bold mt-1.5 font-sans font-sans">مستوى متدني يحتاج لوضع خطة</p>
                                     </div>
                                  </div>
                               </div>

                               {/* Graphical Analysis */}
                               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-right font-sans">
                                  {/* Trend Line Chart */}
                                  <div className="bg-white p-7 md:p-8 rounded-2xl border border-slate-100 shadow-minimal space-y-6 animate-fadeIn font-sans">
                                     <div className="text-right flex justify-between items-center flex-row-reverse font-sans">
                                        <div>
                                           <h4 className="font-black text-slate-800 text-sm">منحنى الفهم والتقدم التحصيلي</h4>
                                           <p className="text-[10px] font-bold text-slate-400 mt-0.5">مستوى تقدم درجات اختبارات الطالب المتعاقبة</p>
                                        </div>
                                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
                                           <TrendingUp size={14} />
                                        </div>
                                     </div>
                                     
                                     <div className="h-[220px] w-full font-sans">
                                        {stQuizResults.length === 0 ? (
                                           <div className="h-full w-full flex flex-col items-center justify-center text-center p-4">
                                              <p className="text-slate-350 text-xs font-bold leading-relaxed">لا توجد اختبارات مسجلة لهذا الطالب بعد</p>
                                           </div>
                                        ) : (
                                           <ResponsiveContainer width="100%" height="100%">
                                              <LineChart data={trendData} margin={{ top: 15, right: 15, left: -25, bottom: 5 }}>
                                                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                 <XAxis dataKey="index" tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                                 <YAxis domain={[0, 100]} tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                                 <Tooltip 
                                                    cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }}
                                                    content={({ active, payload }) => {
                                                       if (active && payload && payload.length) {
                                                          const ent = payload[0].payload;
                                                          return (
                                                             <div className="bg-slate-950 text-white p-3 rounded-xl border border-slate-800 shadow-xl text-right text-[10px] font-sans">
                                                                <p className="font-extrabold text-slate-400 mb-1">{ent.title}</p>
                                                                <p className="font-black text-xs text-indigo-400 font-sans">الدرجة: {payload[0].value}%</p>
                                                             </div>
                                                          );
                                                       }
                                                       return null;
                                                    }}
                                                 />
                                                 <Line 
                                                    type="monotone" 
                                                    dataKey="الدرجة" 
                                                    stroke="#4f46e5" 
                                                    strokeWidth={3} 
                                                    dot={{ r: 4, stroke: '#ffffff', strokeWidth: 2, fill: '#4f46e5' }}
                                                    activeDot={{ r: 6, stroke: '#4f46e5', strokeWidth: 2, fill: '#ffffff' }}
                                                 />
                                              </LineChart>
                                           </ResponsiveContainer>
                                        )}
                                     </div>
                                  </div>

                                  {/* Mastery Levels Bar Breakdown */}
                                  <div className="bg-white p-7 md:p-8 rounded-2xl border border-slate-100 shadow-minimal space-y-6">
                                     <div className="text-right flex justify-between items-center flex-row-reverse font-sans">
                                        <div>
                                           <h4 className="font-black text-slate-800 text-sm">توزيع مستويات إتقان المهارات</h4>
                                           <p className="text-[10px] font-bold text-slate-400 mt-0.5 font-sans">توزيع المهارات المقيمة بناءً على تصنيف المعايير الوزارية</p>
                                        </div>
                                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center font-sans">
                                           <BarChart3 size={14} />
                                        </div>
                                     </div>

                                     <div className="h-[220px] w-full font-sans">
                                        {studentEvaluations.length === 0 ? (
                                           <div className="h-full w-full flex flex-col items-center justify-center text-center p-4">
                                              <p className="text-slate-350 text-xs font-bold font-sans">لم يتم تقييم أي مهارات لهذا الطالب حتى الآن</p>
                                           </div>
                                        ) : (
                                           <ResponsiveContainer width="100%" height="100%">
                                              <BarChart data={breakdownData} margin={{ top: 15, right: 15, left: -25, bottom: 5 }}>
                                                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                 <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 800, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                                 <YAxis tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                                 <Tooltip 
                                                    cursor={{ fill: '#f8fafc', radius: 4 }}
                                                    content={({ active, payload }) => {
                                                       if (active && payload && payload.length) {
                                                          const ent = payload[0].payload;
                                                          return (
                                                             <div className="bg-slate-900 text-white px-2.5 py-1.5 rounded-xl text-right text-[10px] font-black w-full font-sans">
                                                                <span>{ent.name}: {payload[0].value} مهارة</span>
                                                             </div>
                                                          );
                                                       }
                                                       return null;
                                                    }}
                                                 />
                                                 <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={34}>
                                                    {breakdownData.map((entry, idx) => (
                                                       <Cell key={`cell-${idx}`} fill={entry.fill} />
                                                    ))}
                                                 </Bar>
                                              </BarChart>
                                           </ResponsiveContainer>
                                        )}
                                     </div>
                                  </div>
                               </div>

                               {/* Detailed History Sections */}
                               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-right font-sans">
                                  {/* Skills Records Table */}
                                  <div className="bg-white rounded-2xl border border-slate-100 shadow-minimal overflow-hidden text-right font-sans">
                                     <div className="p-6 bg-slate-50 border-b border-slate-100 flex flex-row bg-slate-50 border-b border-slate-100 justify-between items-center">
                                        <h4 className="font-black text-slate-800 text-xs flex items-center gap-2 flex-row font-sans">
                                           <BookOpen size={16} className="text-indigo-600 shrink-0 font-sans" />
                                           <span>سجل تقييم مهارات الطالب التفصيلي</span>
                                        </h4>
                                        <span className="text-[9px] font-black text-slate-400 font-sans">{studentEvaluations.length} تقييمات مهارية</span>
                                     </div>

                                     <div className="overflow-x-auto">
                                        {studentEvaluations.length === 0 ? (
                                           <p className="text-slate-400 font-bold text-center text-xs py-10 bg-white font-sans">لا توجد مهارات مسجلة ومقيمة حالياً</p>
                                        ) : (
                                           <table className="w-full text-xs font-bold text-slate-600 mb-0 font-sans" dir="rtl">
                                              <thead>
                                                 <tr className="bg-slate-50/40 border-b border-slate-100 text-slate-400 font-extrabold text-[10px]">
                                                    <th className="py-3 px-5 text-right font-black">المهارة المقيمة</th>
                                                    <th className="py-3 px-5 text-right font-black">درجة الإتقان</th>
                                                    <th className="py-3 px-5 text-right font-black">آخر تحديث</th>
                                                    <th className="py-3 px-5 text-right font-black">ملاحظات المعلم</th>
                                                 </tr>
                                              </thead>
                                              <tbody className="divide-y divide-slate-50/80">
                                                 {studentEvaluations.map((ev, i) => {
                                                    const scoreConfig = (() => {
                                                       const scr = ev.val.score;
                                                       if (scr === 'mastered') return { name: 'متقن ممتاز', cls: 'bg-emerald-50 text-emerald-700 border-emerald-100 font-sans' };
                                                       if (scr === 'advanced') return { name: 'متقدم جيد جداً', cls: 'bg-indigo-50 text-indigo-700 border-indigo-100 font-sans' };
                                                       if (scr === 'accepted') return { name: 'مقبول واجتياز', cls: 'bg-amber-50 text-amber-700 border-amber-100 font-sans' };
                                                       if (scr === 'weak') return { name: 'ضعيف يحتاج رعاية', cls: 'bg-rose-50 text-rose-700 border-rose-100 font-sans' };
                                                       return { name: 'ضعيف جداً عاجل', cls: 'bg-red-50 text-red-700 border-red-100 font-sans' };
                                                    })();

                                                    return (
                                                       <tr key={ev.skill?.id || i} className="hover:bg-slate-50/10 transition-colors">
                                                          <td className="py-4 px-5 text-slate-800 font-black font-sans">{ev.skill?.name || 'مهارة غير محددة'}</td>
                                                          <td className="py-4 px-5">
                                                             <span className={`px-2.5 py-1.5 rounded-xl border font-black text-[9px] ${scoreConfig.cls} font-sans`}>
                                                                {scoreConfig.name}
                                                             </span>
                                                          </td>
                                                          <td className="py-4 px-5 text-slate-400 text-[10px] font-mono">
                                                             {ev.val.updatedAt ? (ev.val.updatedAt.toDate ? ev.val.updatedAt.toDate() : (ev.val.updatedAt.seconds ? new Date(ev.val.updatedAt.seconds * 1000) : new Date(ev.val.updatedAt))).toLocaleDateString('ar-SA') : ''}
                                                          </td>
                                                          <td className="py-4 px-5 text-slate-500 font-bold max-w-xs truncate italic font-sans">
                                                             {ev.val.note || '--'}
                                                          </td>
                                                       </tr>
                                                    );
                                                 })}
                                              </tbody>
                                           </table>
                                        )}
                                     </div>
                                  </div>

                                  {/* Quiz Grades Records Table */}
                                  <div className="bg-white rounded-2xl border border-slate-100 shadow-minimal overflow-hidden text-right font-sans">
                                     <div className="p-6 bg-slate-50 border-b border-slate-100 flex flex-row bg-slate-50 border-b border-slate-100 justify-between items-center pr-2">
                                        <h4 className="font-black text-slate-800 text-xs flex items-center gap-2 flex-row font-sans">
                                           <Trophy size={16} className="text-amber-500 pr-0.5 shrink-0" />
                                           <span>سجل درجات الاختبارات التقويمية</span>
                                        </h4>
                                        <span className="text-[9px] font-black text-slate-400 font-sans">{stQuizResults.length} اختبارات منجزة</span>
                                     </div>

                                     <div className="overflow-x-auto font-sans">
                                        {stQuizResults.length === 0 ? (
                                           <p className="text-slate-400 font-bold text-center text-xs py-10 bg-white font-sans">لم يجتاز هذا الطالب أي اختبارات للآن</p>
                                        ) : (
                                           <table className="w-full text-xs font-bold text-slate-600 mb-0 font-sans" dir="rtl">
                                              <thead>
                                                 <tr className="bg-slate-50/40 border-b border-slate-100 text-slate-400 font-extrabold text-[10px]">
                                                    <th className="py-3 px-5 text-right font-black">عنوان الاختبار</th>
                                                    <th className="py-3 px-5 text-right font-black">النتيجة والدرجة</th>
                                                    <th className="py-3 px-5 text-right font-black">الفصل التابع</th>
                                                    <th className="py-3 px-5 text-right font-black">تاريخ وتوقيت التقديم</th>
                                                 </tr>
                                              </thead>
                                              <tbody className="divide-y divide-slate-50/80">
                                                 {stQuizResults.map((res, i) => {
                                                    const quizObj = data.quizzes.find(q => q.id === res.quizId);
                                                    const quizScoreColor = (() => {
                                                       if (res.score >= 90) return 'bg-emerald-50 text-emerald-700 border-emerald-100';
                                                       if (res.score >= 70) return 'bg-blue-50 text-blue-700 border-blue-100';
                                                       if (res.score >= 50) return 'bg-amber-50 text-amber-700 border-amber-100';
                                                       return 'bg-rose-50 text-rose-700 border-rose-100';
                                                    })();

                                                    return (
                                                       <tr key={i} className="hover:bg-slate-50/10 transition-colors font-sans">
                                                          <td className="py-4 px-5 text-slate-800 font-black font-sans">
                                                             {quizObj?.title || res.title || (res.quizId ? `اختبار (${res.quizId.slice(-6)})` : 'اختبار غير معروف')}
                                                          </td>
                                                          <td className="py-4 px-5 font-sans">
                                                             <span className={`px-2.5 py-1.5 rounded-xl border font-black text-xs min-w-[50px] inline-block text-center ${quizScoreColor}`}>
                                                                {res.score}%
                                                             </span>
                                                          </td>
                                                          <td className="py-4 px-5 text-slate-500 font-sans">{cls?.name || 'غير محدد'}</td>
                                                          <td className="py-4 px-5 text-slate-400 text-[10px] font-mono text-left">
                                                             {res.updatedAt ? (res.updatedAt.toDate ? res.updatedAt.toDate() : (res.updatedAt.seconds ? new Date(res.updatedAt.seconds * 1000) : new Date(res.updatedAt))).toLocaleString('ar-SA') : ''}
                                                          </td>
                                                       </tr>
                                                    );
                                                 })}
                                              </tbody>
                                           </table>
                                        )}
                                     </div>
                                  </div>
                               </div>
                            </div>
                         );
                      })()
                    )}
                 </div>
              </div>
           </div>
           )}
        </motion.div>
             ) : activeTab === 'skills' ? (
                <motion.div 
                  key="skills"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8 text-right font-sans"
                  dir="rtl"
                >
                   {/* Top stat widgets */}
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      <StatCard label="نسبة الإتقان العامة" value={`${skillAnalytics.overallMasteryPercentage}%`} icon={<Zap className="text-amber-500" />} color="bg-amber-50" />
                      <StatCard label="إجمالي التقييمات" value={skillAnalytics.totalEvaluations} icon={<CheckCircle2 className="text-emerald-500" />} color="bg-emerald-50" />
                      <StatCard label="المهارات المدرجة" value={skillAnalytics.skillsList.length} icon={<BookOpen className="text-blue-500" />} color="bg-blue-50" />
                      <StatCard label="الطلاب المتعثرون" value={skillAnalytics.masteryDistribution.nonAchievers.length} icon={<XCircle className="text-rose-500" />} color="bg-rose-50" />
                   </div>

                   {/* Charts Row */}
                   <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* Mastery Distribution Pie Chart */}
                      <div className="bg-white p-10 rounded-3xl border border-slate-100 shadow-minimal flex flex-col justify-between">
                         <div>
                            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-2">
                               <PieChartIcon size={20} className="text-indigo-600" />
                               توزيع كفاءة المهارات
                            </h3>
                            <p className="text-xs text-slate-400 font-bold mb-6">التقسيم النسبي لتقييمات المهارات الدراسية للطلبة.</p>
                         </div>
                         
                         <div className="h-[240px] w-full flex items-center justify-center">
                            {skillAnalytics.totalEvaluations > 0 ? (
                               <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                     <Pie
                                        data={skillAnalytics.masteryDistribution.distribution.filter((d: any) => d.value > 0)}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={4}
                                        dataKey="value"
                                     >
                                        {skillAnalytics.masteryDistribution.distribution.filter((d: any) => d.value > 0).map((entry: any, index: number) => (
                                           <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                     </Pie>
                                     <Tooltip formatter={(value) => `${value} تقييم`} />
                                  </PieChart>
                               </ResponsiveContainer>
                            ) : (
                               <p className="text-slate-400 font-bold text-xs">لا توجد بيانات كافية لعرض الرسم البياني</p>
                            )}
                         </div>
                         
                         {/* Legend list */}
                         <div className="grid grid-cols-2 gap-2 mt-4 text-[10px] font-black text-slate-600">
                            {skillAnalytics.masteryDistribution.distribution.map((d: any, index: number) => (
                               <div key={index} className="flex items-center gap-1.5 justify-end">
                                  <span>{d.name} ({d.value})</span>
                                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                               </div>
                            ))}
                         </div>
                      </div>

                      {/* Top Skills Horizonal list */}
                      <div className="bg-white p-10 rounded-3xl border border-slate-100 shadow-minimal">
                         <h3 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-2">
                            <Trophy size={20} className="text-yellow-500" />
                            المهارات الأكثر تميزاً
                         </h3>
                         <p className="text-xs text-slate-400 font-bold mb-8">أعلى مهارات حقق فيها الطلاب تطلعات التميز والإتقان.</p>
                         
                         <div className="space-y-4">
                            {skillAnalytics.topSkills.length > 0 ? (
                               skillAnalytics.topSkills.map((sk: any, idx: number) => (
                                  <div key={idx} className="flex flex-col gap-1 text-right">
                                     <div className="flex justify-between items-center text-xs">
                                        <span className="font-extrabold text-indigo-600 bg-indigo-50/50 px-2 py-0.5 rounded-lg text-[10px]">{sk.masteryRate}% إتقان</span>
                                        <span className="font-black text-slate-700 truncate max-w-[180px]">{sk.name}</span>
                                     </div>
                                     <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                        <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${sk.masteryRate}%` }} />
                                     </div>
                                  </div>
                               ))
                            ) : (
                               <p className="text-slate-400 font-bold text-center text-xs py-10">لا توجد سجلات كافية بعد</p>
                            )}
                         </div>
                      </div>

                      {/* Weakest Skills Horizontal list */}
                      <div className="bg-white p-10 rounded-3xl border border-slate-100 shadow-minimal">
                         <h3 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-2">
                            <AlertCircle size={20} className="text-rose-500" />
                            المهارات ذات الأولوية للدعم
                         </h3>
                         <p className="text-xs text-slate-400 font-bold mb-8">المهارات التي تحتاج لخطط علاجية وتدخل تعليمي عاجل.</p>
                         
                         <div className="space-y-4">
                            {skillAnalytics.weakestSkills.length > 0 ? (
                               skillAnalytics.weakestSkills.map((sk: any, idx: number) => (
                                  <div key={idx} className="flex flex-col gap-1 text-right">
                                     <div className="flex justify-between items-center text-xs">
                                        <span className="font-extrabold text-rose-600 bg-rose-50/50 px-2 py-0.5 rounded-lg text-[10px]">{sk.weakRate}% تعثر</span>
                                        <span className="font-black text-slate-700 truncate max-w-[180px]">{sk.name}</span>
                                     </div>
                                     <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                        <div className="bg-rose-500 h-full rounded-full" style={{ width: `${sk.weakRate}%` }} />
                                     </div>
                                  </div>
                               ))
                            ) : (
                               <p className="text-slate-400 font-bold text-center text-xs py-10">لا توجد مهارات ضعيفة مرصودة</p>
                            )}
                         </div>
                      </div>
                   </div>

                   {/* Detailed Skills Mastery Table with Search */}
                   <div className="bg-white p-10 rounded-3xl border border-slate-100 shadow-minimal text-right">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                         <div>
                            <h3 className="text-xl font-black text-slate-800">سجل كفاءة المهارات التفصيلي</h3>
                            <p className="text-xs text-slate-400 font-bold mt-1">عرض جميع المهارات المسجلة ونسب التقدم والإتقان المحققة.</p>
                         </div>
                         
                         {/* Search and Filter controls */}
                         <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                            {/* Search Input */}
                             <div className="relative group w-full sm:w-64">
                               <input 
                                 type="text"
                                 value={skillSearchTerm}
                                 onChange={(e) => setSkillSearchTerm(e.target.value)}
                                 placeholder="ابحث عن مهارة معينة..."
                                 className="w-full h-11 bg-slate-50 border border-slate-150/50 rounded-2xl pr-10 pl-4 font-bold text-xs text-slate-700 placeholder-slate-400 outline-none hover:border-indigo-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all"
                               />
                               <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-indigo-600 transition-colors" />
                            </div>

                            {/* Subject Filter */}
                            <div className="relative group w-full sm:w-44">
                               <select
                                 value={skillSubjectFilter}
                                 onChange={(e) => setSkillSubjectFilter(e.target.value)}
                                 className="w-full h-11 bg-slate-50 border border-slate-150/50 rounded-2xl pr-4 pl-8 font-black text-slate-700 appearance-none cursor-pointer focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all text-xs"
                               >
                                  <option value="all">جميع المواد</option>
                                  {Array.from(new Set(data.skills.map(sk => sk.subjectName || 'عام'))).map((subject: any, idx: number) => (
                                     <option key={idx} value={subject}>{subject}</option>
                                  ))}
                               </select>
                               <BookOpen size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-indigo-600 transition-colors" />
                            </div>
                         </div>
                      </div>

                      <div className="mt-8">
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredSkills.length > 0 ? (
                               filteredSkills.map((sk: any) => (
                                  <motion.div 
                                     initial={{ opacity: 0, y: 10 }}
                                     animate={{ opacity: 1, y: 0 }}
                                     key={sk.id} 
                                     onClick={() => setSelectedSkillForDetails(sk)}
                                     className="bg-white border text-right border-slate-100 rounded-3xl p-6 shadow-minimal hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col gap-5 relative overflow-hidden group cursor-pointer"
                                  >
                                     {/* Subject Tag */}
                                     <div className="absolute top-0 right-0 px-4 py-1.5 bg-slate-50 border-b border-l border-slate-100 rounded-bl-2xl text-[10px] font-black text-slate-500 z-10 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                        {sk.subjectName || 'عام'}
                                     </div>
                                     
                                     <div className="mt-2 flex-grow">
                                        <h4 className="font-black text-slate-800 text-sm leading-snug line-clamp-2" title={sk.name}>{sk.name}</h4>
                                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-bold">
                                            <div className="flex items-center gap-1.5 text-slate-500">
                                               <Layers size={14} className="text-indigo-400" />
                                               <span>{sk.gradeName}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-slate-500">
                                               <BookOpen size={14} className="text-amber-400" />
                                               <span>{sk.term === 'term1' ? 'الفصل الدراسي الأول' : sk.term === 'term2' ? 'الفصل الدراسي الثاني' : 'العام الدراسي كامل'}</span>
                                            </div>
                                        </div>
                                        <div className="mt-4 flex flex-col gap-4">
                                           {/* Mastery Level */}
                                           <div className="flex flex-col gap-2 bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
                                              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                 <span>نسبة الإتقان المحققة</span>
                                                 <span className="text-emerald-600 font-extrabold text-sm">{sk.masteryRate}%</span>
                                              </div>
                                              <div className="w-full bg-slate-150/50 h-2 rounded-full overflow-hidden">
                                                 <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${sk.masteryRate}%` }} />
                                              </div>
                                           </div>
                         
                                           {/* Weakness Level */}
                                           {sk.weakRate > 0 && (
                                              <div className="flex flex-col gap-2">
                                                 <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-slate-400">
                                                    <span>مؤشر التعثر</span>
                                                    <span className="text-rose-600 font-extrabold">{sk.weakRate}%</span>
                                                 </div>
                                                 <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                    <div className="bg-rose-500 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${sk.weakRate}%` }} />
                                                 </div>
                                              </div>
                                           )}
                                        </div>
                                     </div>
                         
                                     {/* Stats Footer Row */}
                                     <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                                        <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-slate-500">
                                           {(sk.mastered > 0 || sk.advanced > 0) && (
                                               <div className="flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-xl" title="متقن / متقدم">
                                                  <CheckCircle2 size={12} className="text-emerald-500" />
                                                  <span>متقن ومتقدم: {sk.mastered + sk.advanced}</span>
                                               </div>
                                           )}
                                           {sk.accepted > 0 && (
                                              <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-xl" title="مقبول">
                                                 <CheckCircle2 size={12} className="text-amber-500" />
                                                  <span>مقبول: {sk.accepted}</span>
                                              </div>
                                           )}
                                           {(sk.weak + sk.veryWeak) > 0 && (
                                              <div className="flex items-center gap-1 bg-rose-50 text-rose-700 px-2.5 py-1 rounded-xl" title="ضعيف / غير مجتاز">
                                                 <AlertCircle size={12} className="text-rose-500" />
                                                  <span>متعثر: {sk.weak + sk.veryWeak}</span>
                                              </div>
                                           )}
                                        </div>
                         
                                        <div className="px-3 py-1.5 bg-indigo-50/50 text-indigo-600 font-extrabold text-[10px] rounded-xl flex items-center gap-1 group-hover:bg-indigo-100 transition-colors">
                                           <Target size={12} />
                                           <span>{sk.total} تقييم</span>
                                        </div>
                                     </div>
                                  </motion.div>
                               ))
                            ) : (
                               <div className="col-span-full py-20 bg-slate-50/50 rounded-3xl border border-slate-100 border-dashed flex flex-col items-center justify-center text-slate-400 gap-4">
                                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                                     <BookOpen size={28} className="text-indigo-400" />
                                  </div>
                                  <p className="font-extrabold text-sm text-slate-500">لا توجد مهارات تطابق خيارات البحث الحالية</p>
                                  <p className="text-xs text-slate-400 max-w-xs text-center leading-relaxed">جرب تغيير المادة أو استخدام كلمات بحث مختلفة للوصول إلى المهارة المطلوبة.</p>
                               </div>
                            )}
                         </div>
                      </div>
                   </div>
                </motion.div>
             ) : activeTab === 'students' ? (
                <motion.div 
                  key="students"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-8 text-right font-sans"
                  dir="rtl"
                >
                   {(() => {
                      let highAchievers = 0;
                      let mediumAchievers = 0;
                      let supportRequired = 0;
                      
                      const studentScoresList = reportStudents.map(student => {
                         let rawResults = data.quizResults?.filter((r: any) => !r.isArchived && activeQuizIds.has(r.quizId) && r.studentId === student.id) || [];
                         if (filterTeacherId) {
                            rawResults = rawResults.filter((r: any) => classQuizzes.some(q => q.id === r.quizId));
                         }
                         const latestResultsMap = new Map();
                         rawResults.forEach((r: any) => {
                            const existing = latestResultsMap.get(r.quizId);
                            if (!existing || new Date(r.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
                               latestResultsMap.set(r.quizId, r);
                            }
                         });
                         const results: any[] = Array.from(latestResultsMap.values());
                         const quizAvg = results.length > 0 ? Math.round(results.reduce((acc, r) => acc + r.score, 0) / results.length) : 0;

                         const currentClass = data.classes.find(c => c.id === student.classId);
                         let skillsAvg = 0;
                         if (currentClass) {
                            const classSubjects = data.subjects.filter(sub => 
                               sub.gradeId === currentClass.gradeId && 
                               (!sub.classId || sub.classId === student.classId || (sub.classIds && sub.classIds.includes(student.classId))) &&
                               !sub.isArchived
                            );
                            let totalSkillsPoints = 0;
                            let maxSkillsPoints = 0;
                            
                            classSubjects.forEach(sub => {
                               const subSkills = data.skills.filter(sk => 
                                  !sk.isArchived && 
                                  ((sk.gradeId === sub.gradeId && sk.subjectName === sub.name) || (sk.subjectId === sub.id))
                               );
                               subSkills.forEach(sk => {
                                  const evalData = evaluations[student.id + '-' + sk.id + '-' + academicYear];
                                  if (evalData) {
                                     maxSkillsPoints += 4;
                                     const score = evalData.score;
                                     if (score === 'mastered') totalSkillsPoints += 4;
                                     else if (score === 'advanced') totalSkillsPoints += 3;
                                     else if (score === 'accepted') totalSkillsPoints += 2;
                                     else if (score === 'weak') totalSkillsPoints += 1;
                                  }
                               });
                            });
                            skillsAvg = maxSkillsPoints > 0 ? Math.round((totalSkillsPoints / maxSkillsPoints) * 100) : 0;
                         }

                         const comprehensiveAvg = (quizAvg > 0 && skillsAvg > 0) 
                            ? Math.round((quizAvg + skillsAvg) / 2) 
                            : (quizAvg > 0 ? quizAvg : (skillsAvg > 0 ? skillsAvg : 0));

                         if (comprehensiveAvg >= 90) highAchievers++;
                         else if (comprehensiveAvg >= 60) mediumAchievers++;
                         else if (comprehensiveAvg > 0 && comprehensiveAvg < 60) supportRequired++;

                         return {
                            student,
                            quizAvg,
                            skillsAvg,
                            comprehensiveAvg
                         };
                      });

                      const sortedList = [...studentScoresList].sort((a, b) => {
                         if (studentSortBy === 'alphabetical') {
                            return a.student.name.localeCompare(b.student.name, 'ar');
                         }
                         if (studentSortBy === 'progress') {
                            return b.comprehensiveAvg - a.comprehensiveAvg;
                         }
                         if (studentSortBy === 'progress-asc') {
                            return a.comprehensiveAvg - b.comprehensiveAvg;
                         }
                         if (studentSortBy === 'support' || studentSortBy === 'support-urgent') {
                            const aVal = a.comprehensiveAvg < 60 && a.comprehensiveAvg > 0 ? 1 : 0;
                            const bVal = b.comprehensiveAvg < 60 && b.comprehensiveAvg > 0 ? 1 : 0;
                            if (aVal !== bVal) return bVal - aVal;
                            return a.comprehensiveAvg - b.comprehensiveAvg;
                         }
                         if (studentSortBy === 'class') {
                            const classA = data.classes.find(c => c.id === a.student.classId)?.name || '';
                            const classB = data.classes.find(c => c.id === b.student.classId)?.name || '';
                            return classA.localeCompare(classB, 'ar');
                         }
                         return 0;
                      });

                      return (
                         <>
                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                               <StatCard label="إجمالي الطلاب" value={reportStudents.length} icon={<Users className="text-indigo-650" />} color="bg-indigo-50" />
                               <StatCard label="المتفوقون والمتميزون" value={highAchievers} icon={<Trophy className="text-yellow-500" />} color="bg-yellow-50" />
                               <StatCard label="على مسار الإتقان" value={mediumAchievers} icon={<Target className="text-emerald-500" />} color="bg-emerald-50" />
                               <StatCard label="ذوو أولوية الدعم" value={supportRequired} icon={<AlertCircle className="text-rose-500" />} color="bg-rose-50" />
                            </div>

                            {/* Students analysis list */}
                            <div className="bg-white p-10 rounded-3xl border border-slate-100 shadow-minimal text-right">
                               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                                  <div>
                                     <h3 className="text-xl font-black text-slate-800">بيانات وتقارير الطلاب التحليلية</h3>
                                     <p className="text-xs text-slate-400 font-bold mt-1">سجل تحليلي يعرض مستويات تلميذ وتلميذات الصفوف حسب مخرجات الاختبار والمهارة.</p>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                                     {/* Search Input */}
                                     <div className="relative group w-full sm:w-64">
                                        <input 
                                          type="text"
                                          value={studentSearchTerm}
                                          onChange={(e) => setStudentSearchTerm(e.target.value)}
                                          placeholder="ابحث عن طالب بالاسم..."
                                          className="w-full h-11 bg-slate-50 border border-slate-150/50 rounded-2xl pr-10 pl-4 font-bold text-xs text-slate-700 placeholder-slate-400 outline-none hover:border-indigo-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all"
                                        />
                                        <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-indigo-600 transition-colors" />
                                     </div>

                                     {/* Sorting select */}
                                     <div className="relative group w-full sm:w-44">
                                        <select
                                          value={studentSortBy}
                                          onChange={(e) => setStudentSortBy(e.target.value as any)}
                                          className="w-full h-11 bg-slate-50 border border-slate-150/50 rounded-2xl pr-3 pl-8 font-black text-slate-700 appearance-none cursor-pointer focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all text-xs"
                                        >
                                           <option value="alphabetical">أبجدي (أ - ي)</option>
                                           <option value="class">حسب الفصل</option>
                                           <option value="progress">المعدل الشامل (الأعلى)</option>
                                           <option value="progress-asc">المعدل الشامل (الأدنى)</option>
                                           <option value="support">يحتاج للرعاية (تقييم ضعيف)</option>
                                           <option value="support-urgent">الأولى بالرعاية (عاجل - غير مجتاز)</option>
                                        </select>
                                        <Filter size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-indigo-600 transition-colors" />
                                     </div>
                                  </div>
                               </div>

                               {hideStudentDetails ? (
                                  <div className="bg-slate-50/50 p-12 rounded-3xl border border-dashed border-slate-200 text-center">
                                     <Users size={48} className="text-slate-300 mx-auto mb-4" />
                                     <h3 className="text-lg font-black text-slate-700">بيانات الطلاب محجوبة</h3>
                                     <p className="text-xs text-slate-400 font-bold mt-2">تقارير الطلاب التفصيلية غير متاحة في هذا العرض الإشرافي العام.</p>
                                  </div>
                               ) : (
                                  <div className="overflow-x-auto">
                                     <table className="w-full text-right border-separate border-spacing-y-3">
                                        <thead>
                                           <tr>
                                              <th className="pb-3 pr-4 font-black text-slate-400 text-[11px] uppercase tracking-wider text-right">الاسم والفصل</th>
                                              <th className="pb-3 px-4 font-black text-slate-400 text-[11px] uppercase tracking-wider text-center">معدل الاختبارات</th>
                                              <th className="pb-3 px-4 font-black text-slate-400 text-[11px] uppercase tracking-wider text-center">معدل المهارات</th>
                                              <th className="pb-3 px-4 font-black text-slate-400 text-[11px] uppercase tracking-wider text-center">المعدل الشامل</th>
                                              <th className="pb-3 pl-4 font-black text-slate-400 text-[11px] uppercase tracking-wider text-left">الملف الدراسي</th>
                                           </tr>
                                        </thead>
                                        <tbody>
                                           {sortedList.length > 0 ? (
                                              sortedList.map(({ student, quizAvg, skillsAvg, comprehensiveAvg }) => {
                                                 const studentClassObj = data.classes.find((c: any) => c.id === student.classId);
                                                 return (
                                                    <tr key={student.id} className="group hover:-translate-y-[1px] transition-transform duration-200">
                                                       <td className="py-4 pr-5 bg-slate-50/50 group-hover:bg-indigo-50/40 rounded-r-2xl border-y border-r border-slate-100 transition-all">
                                                          <div className="flex items-center gap-3">
                                                             <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white shadow-sm ${comprehensiveAvg >= 70 ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                                                {student.name.charAt(0)}
                                                             </div>
                                                             <div className="space-y-0.5">
                                                                <p className="font-black text-slate-800 group-hover:text-indigo-600 text-sm transition-colors">{student.name}</p>
                                                                <p className="text-[10px] text-slate-400 font-bold">الفصل: {studentClassObj?.name || 'غير محدد'}</p>
                                                             </div>
                                                          </div>
                                                       </td>
                                                       <td className="py-4 px-4 bg-slate-50/50 group-hover:bg-indigo-50/40 border-y border-slate-100 text-center">
                                                          <span className={`inline-flex px-3 py-1.5 rounded-xl border font-black text-xs ${getPerformanceColor(quizAvg)}`}>
                                                             {quizAvg > 0 ? `${quizAvg}%` : 'لا بيانات'}
                                                          </span>
                                                       </td>
                                                       <td className="py-4 px-4 bg-slate-50/50 group-hover:bg-indigo-50/40 border-y border-slate-100 text-center">
                                                          <span className={`inline-flex px-3 py-1.5 rounded-xl border font-black text-xs ${getPerformanceColor(skillsAvg)}`}>
                                                             {skillsAvg > 0 ? `${skillsAvg}%` : 'لا بيانات'}
                                                          </span>
                                                       </td>
                                                       <td className="py-4 px-4 bg-slate-50/50 group-hover:bg-indigo-50/40 border-y border-slate-100 text-center">
                                                          <span className={`inline-flex px-4 py-1.5 rounded-xl border font-black text-xs ${getPerformanceColor(comprehensiveAvg)}`}>
                                                             {comprehensiveAvg > 0 ? `${comprehensiveAvg}%` : 'لا بيانات'}
                                                          </span>
                                                       </td>
                                                       <td className="py-4 pl-4 bg-slate-50/50 group-hover:bg-indigo-55/40 rounded-l-2xl border-y border-l border-slate-100 text-left">
                                                          <button
                                                             onClick={() => onSelectStudent?.(student)}
                                                             className="px-4 py-1.5 bg-white border border-slate-200 hover:border-indigo-300 rounded-xl font-bold text-xs text-indigo-600 hover:bg-indigo-50 shadow-sm transition-all flex items-center gap-1 inline-flex"
                                                          >
                                                             <span>الملف الدراسي</span>
                                                             <ChevronLeft size={14} />
                                                          </button>
                                                       </td>
                                                    </tr>
                                                 );
                                              })
                                           ) : (
                                              <tr>
                                                 <td colSpan={5} className="py-12 text-center text-slate-400 font-bold text-xs bg-slate-50/50 rounded-2xl border border-slate-100">
                                                    لا يوجد طلاب يطابقون خيارات البحث والصف الحالية
                                                 </td>
                                              </tr>
                                           )}
                                        </tbody>
                                     </table>
                                  </div>
                                )}
                             </div>
                          </>
                       );
                    })()}
                 </motion.div>
              ) : activeTab === 'teachers' ? (
                 <motion.div 
                  key="teachers"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                       {data.teachers.filter(t => !t.isArchived && (!filterTeacherId || !!onFilterTeacherChange || t.id === filterTeacherId)).map(teacher => {
                          const teacherSubjects = data.subjects.filter(s => !s.isArchived && (s.teacherId === teacher.id || s.teacherIds?.includes(teacher.id)));
                          const teacherClasses = data.classes.filter(c => !c.isArchived && (c.teacherIds?.includes(teacher.id) || teacherSubjects.some(ts => ts.gradeId === c.gradeId)));
                          const teacherSkills = data.skills.filter(sk => teacherSubjects.some(sub => sub.id === sk.subjectId || sub.name === sk.subjectName));
                          
                          const tsPercentage = Math.round(teacherSubjects.reduce((acc, sub) => acc + (calculatePerformance ? calculatePerformance("", sub.id) : 0), 0) / (teacherSubjects.length || 1));
                          
                          // Calculate Trend Data
                          const teacherStudentIds = data.students
                            .filter(s => teacherClasses.some(tc => tc.id === s.classId))
                            .map(s => s.id);

                          const relevantResults = data.quizResults.filter(qr => 
                            teacherStudentIds.includes(qr.studentId) && 
                            !qr.isArchived
                          );

                          const now = new Date();
                          const months = [0, 1, 2].map(i => {
                            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                            return {
                              month: d.getMonth(),
                              year: d.getFullYear(),
                              results: [] as number[]
                            };
                          });

                          relevantResults.forEach(qr => {
                            const date = qr.updatedAt && qr.updatedAt.toDate ? qr.updatedAt.toDate() : new Date(qr.updatedAt);
                            const mIndex = months.findIndex(m => m.month === date.getMonth() && m.year === date.getFullYear());
                            if (mIndex !== -1) {
                              months[mIndex].results.push(qr.score);
                            }
                          });

                          const trendValues = months.map(m => m.results.length > 0 ? Math.round(m.results.reduce((a, b) => a + b, 0) / m.results.length) : null).reverse();
                          const hasTrend = trendValues.some(v => v !== null);
                          const isImproving = trendValues[2] !== null && trendValues[1] !== null ? trendValues[2] >= trendValues[1] : true;
                          
                          return (
                             <div 
                               key={teacher.id} 
                               onClick={() => {
                                 if (onSelectTeacher) {
                                   onSelectTeacher(teacher);
                                 } else if (onFilterTeacherChange) {
                                    onFilterTeacherChange(teacher.id);
                                    setActiveTab("quizzes");
                                  }
                               }}
                               className={`group relative flex items-center gap-4 bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-indigo-100 transition-all cursor-pointer overflow-hidden font-sans`}
                             >
                                <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100/50 text-indigo-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform overflow-hidden shadow-inner">
                                   {teacher.photoUrl ? (
                                     <img 
                                       src={teacher.photoUrl} 
                                       alt="" 
                                       className="w-full h-full object-cover"
                                       referrerPolicy="no-referrer"
                                     />
                                   ) : (
                                     <User size={28} />
                                   )}
                                </div>

                                <div className="flex-1 min-w-0">
                                   <div className="flex items-center justify-between gap-2 mb-1">
                                      <div className="flex items-center gap-2 min-w-0 flex-1">
                                         <h4 className="font-black text-slate-800 text-[14px] leading-tight truncate group-hover:text-indigo-700 transition-colors">{teacher.name}</h4>
                                         {hasTrend && (
                                           <div className="flex items-center px-1.5 py-0.5 rounded-md bg-slate-50 border border-slate-100 shadow-sm shrink-0" title="مؤشر نمو الأداء (آخر 3 أشهر)">
                                              <svg width="24" height="12" viewBox="0 0 24 12" className="overflow-visible">
                                                 <path 
                                                   d={`M ${trendValues.map((v, i) => `${i * 12} ${12 - ((v || tsPercentage || 50) / 100) * 12}`).join(" L ")}`}
                                                   fill="none"
                                                   stroke={isImproving ? "#10b981" : "#ef4444"}
                                                   strokeWidth="2"
                                                   strokeLinecap="round"
                                                   strokeLinejoin="round"
                                                 />
                                              </svg>
                                           </div>
                                         )}
                                      </div>
                                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black shrink-0 ${tsPercentage >= 85 ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600"}`}>
                                         {tsPercentage}%
                                      </span>
                                   </div>
                                   
                                   <div className="flex items-center gap-2 mb-3">
                                      <span className="px-2 py-0.5 bg-slate-100/80 text-slate-500 rounded-md text-[9px] font-black">معلم</span>
                                      {teacher.specialization && (
                                        <p className="text-[9px] font-bold text-slate-400 truncate tracking-tight">{teacher.specialization}</p>
                                      )}
                                   </div>

                                   <div className="flex items-center gap-4 mb-3">
                                      <div className="flex flex-col">
                                         <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1">الفصول</span>
                                         <span className="text-[11px] font-black text-slate-700 leading-none">{teacherClasses.length}</span>
                                      </div>
                                      <div className="w-[1px] h-4 bg-slate-100" />
                                      <div className="flex flex-col">
                                         <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1">المواد</span>
                                         <span className="text-[11px] font-black text-slate-700 leading-none">{teacherSubjects.length}</span>
                                      </div>
                                      <div className="w-[1px] h-4 bg-slate-100" />
                                      <div className="flex flex-col">
                                         <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1">المهارات</span>
                                         <span className="text-[11px] font-black text-slate-700 leading-none">{teacherSkills.length}</span>
                                      </div>
                                   </div>

                                   <div className="w-full bg-slate-100/80 rounded-full h-1.5 overflow-hidden">
                                      <motion.div 
                                        initial={{ width: 0 }} 
                                        animate={{ width: `${tsPercentage}%` }} 
                                        className={`h-full rounded-full ${tsPercentage >= 85 ? "bg-emerald-500" : "bg-indigo-600"}`} 
                                      />
                                   </div>
                                </div>

                                <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                   <div className="w-5 h-5 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500">
                                      <ChevronLeft size={12} />
                                   </div>
                                </div>
                             </div>
                          );
                       })}
                    </div>
                   {data.teachers.filter(t => !t.isArchived).length === 0 && (
                      <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-3xl border border-slate-100 shadow-sm"><div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4"><Users size={32} className="text-slate-300" /></div><h4 className="text-sm font-black text-slate-700 tracking-tight mb-1">لا يوجد معلمين</h4><p className="text-xs font-semibold text-slate-400">لم يتم تعيين معلمين في النظام بعد</p></div>
                   )}
                </motion.div>
             ) : null}
          </AnimatePresence>
          {/* Report Export Footer */}
          <div className="hidden pt-10 border-t border-slate-100 mt-10 justify-between items-center print:flex" style={{ display: isExporting ? 'flex' : 'none' }}>
            <p className="text-slate-500 font-semibold text-xs md:text-sm">صدر هذا التقرير آلياً عبر منصة إتقان الذكية</p>
            <div className="p-6 bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-3xl text-white flex items-center gap-6 shadow-xl">
               <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-1">المؤشر العام</p>
                  <p className="text-xl font-black">تعليم متقن في بيئة تربوية آمنة</p>
               </div>
               <Award size={32} className="opacity-40" />
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedQuizToManage && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-slate-900/60 backdrop-blur-md"
            onClick={() => setSelectedQuizToManage(null)}
          >
            <motion.div 
              ref={quizCardRef}
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              className="bg-white w-full max-w-5xl lg:max-w-6xl rounded-2xl shadow-2xl overflow-hidden relative border border-slate-100 flex flex-col md:flex-row h-auto md:h-[620px] max-h-[95vh]"
              onClick={e => e.stopPropagation()}
              dir="rtl"
            >
              {(() => {
                  const targetClasses = data.classes.filter(c => {
                        if (selectedQuizToManage.classIds && selectedQuizToManage.classIds.length > 0) return selectedQuizToManage.classIds.includes(c.id);
                        return c.gradeId === selectedQuizToManage.gradeId && !c.isArchived;
                  });
                  const allStudentsInTargetClasses = data.students.filter(s => targetClasses.some(c => c.id === s.classId));
                  const totalTargetedStudents = allStudentsInTargetClasses.length;
                  const quizStats = getQuizStats(selectedQuizToManage.id, allStudentsInTargetClasses);
                  const testedCount = quizStats.count;
                  const remainingCount = Math.max(0, totalTargetedStudents - testedCount);
                  
                  const targetClassNames = targetClasses.map(c => c.name).join(' ، ');
                  const gradeNames = Array.from(new Set(targetClasses.map(c => data.grades.find(g => g.id === c.gradeId)?.name).filter(Boolean))).join(' ، ');
 
                  let teacherName = 'غير محدد';
                  if (selectedQuizToManage.subjectIds && selectedQuizToManage.subjectIds.length > 0) {
                     const sub = data.subjects.find(s => s.id === selectedQuizToManage.subjectIds[0]);
                     if (sub?.teacherId) {
                        teacherName = data.teachers.find(t => t.id === sub.teacherId)?.name || 'غير محدد';
                     }
                  } else if (filterTeacherId) {
                     teacherName = data.teachers.find(t => t.id === filterTeacherId)?.name || 'غير محدد';
                  }
 
                  return (
                    <>
                      <div className="md:w-[22%] bg-[#0B1121] text-white p-5 md:p-6 flex flex-col relative overflow-hidden shrink-0 border-l border-slate-800/60 font-sans">
                         <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-indigo-500/10 blur-[110px] rounded-full pointer-events-none" />
                         
                         <div className="relative z-10 flex flex-col h-full">
                            <div className="flex items-center gap-2 self-start bg-indigo-500/15 border border-indigo-500/30 rounded-full px-3 py-1 mb-5">
                               <BrainCircuit size={13} className="text-indigo-300" strokeWidth={2.5} />
                               <span className="text-[11px] font-black text-indigo-200">تحليل الأداء الذكي</span>
                            </div>
 
                            <h2 className="text-lg lg:text-xl font-black text-amber-300 leading-snug text-right mb-4 drop-shadow-sm font-sans">
                              {selectedQuizToManage.title}
                            </h2>

                            <div className="h-[1px] w-full bg-slate-800/80 mb-6" />
 
                            <div className="space-y-3.5 flex-1 flex flex-col overflow-y-auto pr-1">
                               <div className="flex items-center gap-3.5 text-right justify-start w-full bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-200 p-3 rounded-2xl border border-white/[0.04]">
                                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-300 shrink-0 shadow-sm">
                                     <BookOpen size={18} strokeWidth={2} />
                                  </div>
                                  <div className="flex-1 min-w-0 pr-1">
                                     <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">المادة</p>
                                     <p className="text-sm font-bold text-white leading-tight truncate">
                                       {data.subjects.filter(s => selectedQuizToManage.subjectIds?.includes(s.id)).map(s => s.name).join(' ، ') || 'غير محدد'}
                                     </p>
                                  </div>
                               </div>
 
                               <div className="flex items-center gap-3.5 text-right justify-start w-full bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-200 p-3 rounded-2xl border border-white/[0.04]">
                                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-300 shrink-0 shadow-sm">
                                     <Calendar size={18} strokeWidth={2} />
                                  </div>
                                  <div className="flex-1 min-w-0 pr-1">
                                     <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">تاريخ النشر</p>
                                     <p className="text-sm font-bold text-white leading-tight">
                                       {(() => {
                                         if (selectedQuizToManage.createdAt) return new Date(selectedQuizToManage.createdAt).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short', year: 'numeric' });
                                         if (selectedQuizToManage.id.startsWith('quiz_')) {
                                            const ts = parseInt(selectedQuizToManage.id.split('_')[1]);
                                            if (!isNaN(ts)) return new Date(ts).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short', year: 'numeric' });
                                         }
                                         return 'غير متوفر';
                                       })()}
                                     </p>
                                  </div>
                               </div>
 
                               <div className="flex items-center gap-3.5 text-right justify-start w-full bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-200 p-3 rounded-2xl border border-white/[0.04]">
                                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 text-purple-300 shrink-0 shadow-sm">
                                     <User size={18} strokeWidth={2} />
                                  </div>
                                  <div className="flex-1 min-w-0 pr-1">
                                     <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">المعلم</p>
                                     <p className="text-sm font-bold text-white leading-tight truncate">{teacherName}</p>
                                  </div>
                               </div>
 
                               <div className="flex items-center gap-3.5 text-right justify-start w-full bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-200 p-3 rounded-2xl border border-white/[0.04]">
                                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-300 shrink-0 shadow-sm">
                                     <Layers size={18} strokeWidth={2} />
                                  </div>
                                  <div className="flex-1 min-w-0 pr-1">
                                     <p className="text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1">المرحلة / الصف</p>
                                     <p className="text-sm font-bold text-white leading-snug">{targetClassNames || gradeNames || 'غير محدد'}</p>
                                  </div>
                               </div>
                            </div>
                         </div>
                      </div>
 
                      {/* LEFT PANEL (WHITE) */}
                      <div className="md:w-[78%] bg-white p-4 md:p-5 flex flex-col h-full overflow-hidden min-h-0 font-sans">
                         <div className="flex items-center justify-between mb-3.5">
                            <button data-close-hide="true" onClick={() => setSelectedQuizToManage(null)} className="w-10 h-10 bg-slate-50 hover:bg-slate-100 rounded-full flex items-center justify-center text-slate-500 transition-colors shrink-0">
                               <X size={20} />
                            </button>
                            <div className="text-right">
                               <h3 className="text-lg lg:text-xl font-black text-slate-900 tracking-tight">مؤشرات الإنجاز</h3>
                               <p className="text-[9px] font-bold text-slate-400 mt-0.5">إحصائيات فورية مبنية على نتائج {testedCount} مشارك</p>
                            </div>
                         </div>
 
                         {/* Grid Stats */}
                         <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mb-3.5">
                             <div className="bg-slate-50 p-2 sm:p-2.5 pb-2.5 sm:pb-3 rounded-[14px] flex flex-col justify-center items-center text-center">
                                <div className="w-6 h-6 bg-white text-indigo-500 rounded-full flex items-center justify-center mb-1.5 shadow-sm"><Users size={11} strokeWidth={3} /></div>
                                <p className="text-[7.5px] font-black uppercase tracking-widest text-slate-400 mb-0.5">عدد الطلاب</p>
                                <p className="text-base font-black text-slate-900">{totalTargetedStudents}</p>
                             </div>
                             <div className="bg-slate-50 p-2 sm:p-2.5 pb-2.5 sm:pb-3 rounded-[14px] flex flex-col justify-center items-center text-center">
                                <div className="w-6 h-6 bg-white text-indigo-500 rounded-full flex items-center justify-center mb-1.5 shadow-sm"><TrendingUp size={11} strokeWidth={3} /></div>
                                <p className="text-[7.5px] font-black uppercase tracking-widest text-slate-400 mb-0.5">المعدل العام</p>
                                <p className="text-base font-black text-slate-900">{quizStats.avg}%</p>
                             </div>
                             <div className="bg-slate-50 p-2 sm:p-2.5 pb-2.5 sm:pb-3 rounded-[14px] flex flex-col justify-center items-center text-center">
                                <div className="w-6 h-6 bg-white text-emerald-500 rounded-full flex items-center justify-center mb-1.5 shadow-sm"><CheckCircle2 size={11} strokeWidth={3} /></div>
                                <p className="text-[7.5px] font-black uppercase tracking-widest text-slate-400 mb-0.5">المختبرين</p>
                                <p className="text-base font-black text-emerald-600">{testedCount}</p>
                             </div>
                             <div className="bg-slate-50 p-2 sm:p-2.5 pb-2.5 sm:pb-3 rounded-[14px] flex flex-col justify-center items-center text-center">
                                <div className="w-6 h-6 bg-white text-rose-500 rounded-full flex items-center justify-center mb-1.5 shadow-sm"><AlertCircle size={11} strokeWidth={3} /></div>
                                <p className="text-[7.5px] font-black uppercase tracking-widest text-slate-400 mb-0.5">المتبقين</p>
                                <p className="text-base font-black text-rose-600">{remainingCount}</p>
                             </div>
                             <div className="bg-slate-50 p-2 sm:p-2.5 pb-2.5 sm:pb-3 rounded-[14px] flex flex-col justify-center items-center text-center">
                                <div className="w-6 h-6 bg-white text-amber-500 rounded-full flex items-center justify-center mb-1.5 shadow-sm"><Award size={11} strokeWidth={3} /></div>
                                <p className="text-[7.5px] font-black uppercase tracking-widest text-slate-400 mb-0.5">نسبة الإتقان</p>
                                <p className="text-base font-black text-slate-900">{quizStats.masteredPercentage}%</p>
                             </div>
                         </div>
 
                         {/* أداء الفصول في هذا الاختبار */}
                         <div className="mt-1 mb-3 bg-slate-50/70 p-4 rounded-2xl border border-slate-100 flex-1 flex flex-col min-h-[220px] overflow-hidden">
                            <div className="flex items-center justify-between mb-3 border-b border-slate-100/60 pb-2.5">
                               <div className="flex items-center gap-2">
                                  <div className="w-6.5 h-6.5 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100/30">
                                     <Layers size={12} />
                                  </div>
                                  <span className="font-black text-xs sm:text-sm text-slate-800 tracking-tight">أداء الفصول في هذا الاختبار</span>
                               </div>

                            </div>
                            
                            <div className="flex flex-col md:flex-row gap-4 flex-1 overflow-hidden w-full h-[220px]">
                               {/* القائمة */}
                               <div className="w-full md:w-[48%] grid grid-cols-1 gap-1.5 overflow-y-auto pr-1 h-full scrollbar-thin">
                                  {targetClasses.length === 0 ? (
                                     <div className="text-center text-slate-400 font-bold py-8 text-xs bg-white rounded-xl border border-slate-100/50">لا يوجد فصول مرتبطة</div>
                                  ) : (
                                     targetClasses.map(cls => {
                                       const clsStudents = data.students.filter(s => s.classId === cls.id);
                                       const clsAvg = getQuizStats(selectedQuizToManage.id, clsStudents).avg;
                                       return (
                                         <div key={cls.id} className="flex flex-row-reverse justify-between items-center bg-white p-2 sm:p-2.5 px-3 rounded-xl border border-slate-100 shadow-sm hover:border-indigo-100 transition-all group/item">
                                            <div className="flex flex-row-reverse items-center gap-2">
                                               <span className="font-black text-slate-700 text-xs group-hover/item:text-indigo-600 transition-colors">{cls.name}</span>
                                               <span className="text-[10px] font-bold text-slate-400">({clsStudents.length} {clsStudents.length === 1 ? 'طالب' : clsStudents.length === 2 ? 'طالبان' : clsStudents.length >= 3 && clsStudents.length <= 10 ? 'طلاب' : 'طالباً'})</span>
                                            </div>
                                            <div className="flex flex-row--reverse items-center gap-2">
                                               <span className="font-black text-indigo-600 text-xs bg-indigo-50/70 px-2.5 py-1 rounded-lg border border-indigo-100/30 min-w-[40px] text-center">
                                                  {clsAvg}%
                                               </span>
                                               <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden hidden sm:block" dir="ltr">
                                                  <div className="h-full bg-indigo-600 rounded-full transition-all duration-500" style={{ width: `${clsAvg}%` }}></div>
                                               </div>
                                            </div>
                                         </div>
                                       );
                                     })
                                  )}
                               </div>
 
                               {/* الرسم البياني */}
                               <div className="w-full md:w-[52%] h-full bg-white p-3 rounded-xl border border-slate-100 shadow-sm relative">
                                  {targetClasses.length === 0 ? (
                                     <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs font-bold">لا توجد بيانات للرسم البياني</div>
                                  ) : (
                                     <ResponsiveContainer width="100%" height="100%">
                                        <BarChart 
                                           data={targetClasses.map(cls => {
                                              const clsStudents = data.students.filter(s => s.classId === cls.id);
                                              const clsAvg = getQuizStats(selectedQuizToManage.id, clsStudents).avg;
                                              return {
                                                 name: cls.name,
                                                 achievement: clsAvg
                                              };
                                           })} 
                                           margin={{ top: 22, right: 15, left: -25, bottom: 20 }}
                                        >
                                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                           <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                           <YAxis domain={[0, 100]} tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                           <Tooltip 
                                              cursor={{ fill: '#f8fafc', radius: 8 }}
                                              content={({ active, payload }) => {
                                                 if (active && payload && payload.length) {
                                                    return (
                                                       <div className="bg-slate-900 text-white px-2.5 py-1.5 rounded-xl shadow-lg border border-slate-800 text-right">
                                                          <p className="font-black text-[10px]">{payload[0].payload.name}</p>
                                                          <p className="font-extrabold text-xs text-indigo-400 mt-0.5">{payload[0].value}%</p>
                                                       </div>
                                                    );
                                                 }
                                                 return null;
                                              }}
                                           />
                                           <Bar dataKey="achievement" radius={[6, 6, 0, 0]} barSize={18} label={{ fill: '#1e293b', fontSize: 9, fontWeight: 700, position: 'top', formatter: (v: any) => `${v}%` }}>
                                              {targetClasses.map((cls, index) => (
                                                 <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#4f46e5' : '#818cf8'} />
                                              ))}
                                           </Bar>
                                        </BarChart>
                                     </ResponsiveContainer>
                                  )}
                               </div>
                            </div>
                         </div>
 
                         <div data-export-hide="true" className="mt-auto pt-3 flex gap-3 w-full">
                            <button onClick={() => setSelectedQuizToManage(null)} className="flex-[1] bg-slate-900 hover:bg-slate-800 text-white rounded-[16px] h-[48px] font-black text-sm transition-colors shadow-sm">
                               إغلاق
                            </button>
                            <button 
                               onClick={(e) => {
                                  e.stopPropagation();
                                  handleExportQuizCardImage();
                               }}
                               disabled={isExportingImage}
                               className="flex-[2.5] bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white disabled:from-slate-400 disabled:to-slate-400 rounded-[16px] h-[48px] font-black text-sm transition-all flex items-center justify-center gap-2.5 shadow-sm active:scale-[0.98]"
                            >
                               <span>{isExportingImage ? 'جاري تصدير الصورة الرقمية...' : 'تصدير وحفظ كصورة مشاركة'}</span>
                               <Image size={16} />
                            </button>
                         </div>
                      </div>
                    </>
                  );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Skill Details Modal */}
      <AnimatePresence>
        {selectedSkillForDetails && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm font-sans"
            dir="rtl"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[32px] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="p-6 md:p-8 bg-slate-50 border-b border-slate-100 flex items-start flex-col gap-2 relative">
                <button 
                  onClick={() => setSelectedSkillForDetails(null)}
                  className="absolute top-6 left-6 w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-500 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50 transition-colors shadow-sm"
                >
                  <X size={20} />
                </button>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-full">{selectedSkillForDetails.subjectName || 'عام'}</span>
                  <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-black rounded-full">{selectedSkillForDetails.gradeName}</span>
                </div>
                <h3 className="text-xl md:text-2xl font-black text-slate-800 leading-tight pl-12">{selectedSkillForDetails.name}</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 w-full gap-4 mt-6">
                  <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-minimal flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-bold text-slate-400 mb-1">إجمالي التقييمات</span>
                    <span className="text-2xl font-black text-slate-700">{selectedSkillForDetails.total}</span>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-minimal flex flex-col items-center justify-center text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-1 h-full bg-emerald-500" />
                    <span className="text-[10px] font-bold text-emerald-600 mb-1">نسبة الإتقان </span>
                    <span className="text-2xl font-black text-emerald-700">{selectedSkillForDetails.masteryRate}%</span>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-rose-100 shadow-minimal flex flex-col items-center justify-center text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-1 h-full bg-rose-500" />
                    <span className="text-[10px] font-bold text-rose-600 mb-1">نسبة التعثر</span>
                    <span className="text-2xl font-black text-rose-700">{selectedSkillForDetails.weakRate}%</span>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-minimal flex flex-col items-center justify-center text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-1 h-full bg-amber-500" />
                    <span className="text-[10px] font-bold text-amber-600 mb-1">المقبول</span>
                    <span className="text-2xl font-black text-amber-700">{selectedSkillForDetails.accepted}</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-white">
                {(() => {
                   const evaluatedStudents = data.students.filter(student => !student.isArchived)
                     .map(student => {
                        const score = evaluations[`${student.id}-${selectedSkillForDetails.id}-${academicYear}`]?.score;
                        return { student, score };
                     })
                     .filter(item => item.score); // Only those who have been evaluated for this skill

                   const outstanding = evaluatedStudents.filter(s => s.score === 'mastered' || s.score === 'advanced');
                   // Sort those needing care: very-weak FIRST (most urgent), then weak
                   const needingCare = evaluatedStudents.filter(s => s.score === 'very-weak' || s.score === 'weak')
                     .sort((a, b) => {
                        if (a.score === 'very-weak' && b.score !== 'very-weak') return -1;
                        if (b.score === 'very-weak' && a.score !== 'very-weak') return 1;
                        return 0;
                     });

                   if (evaluatedStudents.length === 0) {
                      return <div className="text-center text-slate-400 py-12 font-bold text-sm">لم يتم تقييم أي طالب لهذه المهارة بعد.</div>;
                   }

                   return (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       {/* Table format for Students Needing Care */}
                       <div className="space-y-4">
                         <div className="flex items-center gap-2 pb-2 border-b border-rose-100">
                           <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                             <AlertTriangle size={16} />
                           </div>
                           <h4 className="font-black text-slate-800">الأولى بالرعاية (عاجل)</h4>
                           <span className="mr-auto font-black text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full text-xs">{needingCare.length}</span>
                         </div>
                         {needingCare.length > 0 ? (
                           <div className="space-y-3">
                             {needingCare.map(({ student, score }) => {
                               const cls = data.classes.find(c => c.id === student.classId);
                               const isUrgent = score === 'very-weak';
                               return (
                                 <div key={student.id} className={`p-4 rounded-2xl border ${isUrgent ? 'bg-rose-50 border-rose-200' : 'bg-orange-50 border-orange-200'} flex items-center justify-between`}>
                                   <div className="flex items-center gap-3">
                                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm ${isUrgent ? 'bg-rose-200 text-rose-700' : 'bg-orange-200 text-orange-700'}`}>
                                        {student.name.substring(0, 1)}
                                      </div>
                                      <div>
                                        <p className="font-bold text-slate-800 text-xs md:text-sm line-clamp-1">{student.name}</p>
                                        <p className="font-bold text-[10px] text-slate-500">{cls?.name || 'بدون فصل'}</p>
                                      </div>
                                   </div>
                                   <span className={`px-3 py-1 rounded-full text-[10px] font-black whitespace-nowrap ${isUrgent ? 'bg-rose-600 text-white shadow-sm shadow-rose-200' : 'bg-orange-100 text-orange-700'}`}>
                                      {score === 'very-weak' ? 'غير مجتاز عاجل' : 'ضعيف'}
                                   </span>
                                 </div>
                               );
                             })}
                           </div>
                         ) : (
                           <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-center text-slate-400 font-bold text-xs">
                             لا يوجد طلاب متعثرون في هذه المهارة، عمل رائع! 🎉
                           </div>
                         )}
                       </div>

                       {/* Table format for Outstanding Students */}
                       <div className="space-y-4">
                         <div className="flex items-center gap-2 pb-2 border-b border-emerald-100">
                           <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                             <Award size={16} />
                           </div>
                           <h4 className="font-black text-slate-800">الطلاب المتميزون</h4>
                           <span className="mr-auto font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full text-xs">{outstanding.length}</span>
                         </div>
                         {outstanding.length > 0 ? (
                           <div className="space-y-3">
                             {outstanding.map(({ student, score }) => {
                               const cls = data.classes.find(c => c.id === student.classId);
                               return (
                                 <div key={student.id} className="p-4 rounded-2xl border bg-emerald-50/50 border-emerald-100 flex items-center justify-between">
                                   <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-sm">
                                        {student.name.substring(0, 1)}
                                      </div>
                                      <div>
                                        <p className="font-bold text-slate-800 text-xs md:text-sm line-clamp-1">{student.name}</p>
                                        <p className="font-bold text-[10px] text-slate-500">{cls?.name || 'بدون فصل'}</p>
                                      </div>
                                   </div>
                                   <span className="px-3 py-1 rounded-full text-[10px] font-black text-emerald-700 bg-emerald-100/50 whitespace-nowrap">
                                      {score === 'mastered' ? 'متقن (100%)' : 'متقدم (90%)'}
                                   </span>
                                 </div>
                               );
                             })}
                           </div>
                         ) : (
                           <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-center text-slate-400 font-bold text-xs">
                             لم يحقق أحد الإتقان حتى الآن.
                           </div>
                         )}
                       </div>
                     </div>
                   );
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <ConfirmModal config={confirmConfig} onClose={closeConfirm} />
    </div>
  );
}

function ConfirmModal({ config, onClose }: { config: any, onClose: () => void }) {
  if (!config.isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-xl font-black text-slate-800 mb-2">{config.title}</h3>
        <p className="text-slate-500 mb-8 font-medium leading-relaxed whitespace-pre-wrap">{config.message}</p>
        <div className="flex gap-3">
          <button 
            onClick={config.onConfirm}
            className={`flex-1 h-12 rounded-xl font-black text-white transition-colors ${config.isDestructive ? 'bg-rose-500 hover:bg-rose-600' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          >
            {config.confirmLabel}
          </button>
          <button 
            onClick={onClose}
            className="flex-1 h-12 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black transition-colors"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string, value: string | number, icon: React.ReactNode, color: string }) {
  let bgGradient = 'from-indigo-50/70 to-white hover:border-indigo-200';
  if (color.includes('green') || color.includes('emerald')) {
    bgGradient = 'from-emerald-50/70 to-white hover:border-emerald-200';
  } else if (color.includes('yellow') || color.includes('amber')) {
    bgGradient = 'from-amber-50/70 to-white hover:border-amber-200';
  } else if (color.includes('blue') || color.includes('sky')) {
    bgGradient = 'from-sky-50/70 to-white hover:border-sky-200';
  }

  return (
    <div className={`p-5 rounded-3xl border border-slate-100 shadow-md bg-gradient-to-br ${bgGradient} flex items-center justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-xl relative overflow-hidden group`}>
      <div className="space-y-1.5 z-10 text-right">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{label}</p>
        <span className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight leading-none block">{value}</span>
      </div>
      <div className="w-12 h-12 rounded-2xl bg-white border border-slate-50 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300 z-10">
        {React.cloneElement(icon as any, { size: 24 })}
      </div>
      <div className="absolute -right-2 -bottom-2 w-16 h-16 bg-slate-50/40 rounded-full group-hover:scale-150 transition-all duration-700 pointer-events-none" />
    </div>
  );
}
