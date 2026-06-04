import React from 'react';
import { ChevronLeft, Home } from 'lucide-react';

interface BreadcrumbProps {
  view: string;
  selectedClass: any;
  selectedSubject: any;
  selectedSkill: any;
  selectedStudent: any;
  selectedTeacher: any;
  selectedQuiz: any;
  onNavigate: (view: string, resetData?: boolean) => void;
}

export function Breadcrumb({ 
  view, 
  selectedClass, 
  selectedSubject, 
  selectedSkill, 
  selectedStudent, 
  selectedTeacher, 
  selectedQuiz,
  onNavigate 
}: BreadcrumbProps) {
  
  if (view === 'dashboard' || view === 'login' || view === 'student-portal' || view === 'external-portal' || view === 'quiz' || view === 'baseline-session') return null;

  const path = [];
  
  // Dashboard is always root
  path.push({
    title: 'الرئيسية',
    onClick: () => onNavigate('dashboard', true),
    isCurrent: false
  });

  if (view === 'subjects' || view === 'skills' || view === 'evaluation') {
    if (selectedClass) {
      path.push({
        title: `صف ${selectedClass.name}`,
        onClick: () => onNavigate('subjects', false),
        isCurrent: view === 'subjects'
      });
    }
    if ((view === 'skills' || view === 'evaluation') && selectedSubject) {
      path.push({
        title: selectedSubject.name,
        onClick: () => onNavigate('skills', false),
        isCurrent: view === 'skills'
      });
    }
    if (view === 'evaluation' && selectedSkill) {
      path.push({
        title: selectedSkill.name,
        onClick: () => {},
        isCurrent: true
      });
    }
  } else if (view === 'student-profile') {
    path.push({
      title: selectedStudent ? `بطاقة الطالب: ${selectedStudent.name}` : 'بطاقة الطالب',
      onClick: () => {},
      isCurrent: true
    });
  } else if (view === 'teacher-profile') {
    path.push({
      title: selectedTeacher ? `ملف المعلم: ${selectedTeacher.name}` : 'ملف المعلم',
      onClick: () => {},
      isCurrent: true
    });
  } else if (view === 'quiz-report') {
    path.push({
      title: selectedQuiz ? `تقرير اختبار: ${selectedQuiz.title}` : 'تقرير الاختبار',
      onClick: () => {},
      isCurrent: true
    });
  } else if (view === 'management') {
    path.push({
      title: 'إدارة النظام',
      onClick: () => {},
      isCurrent: true
    });
  } else if (view === 'reports') {
    path.push({
      title: 'التقارير الإحصائية',
      onClick: () => {},
      isCurrent: true
    });
  } else if (view === 'student-report') {
    path.push({
      title: 'التقارير الفردية',
      onClick: () => {},
      isCurrent: true
    });
  } else if (view === 'quick-matrix') {
    path.push({
      title: 'مصفوفة الرصد السريع',
      onClick: () => {},
      isCurrent: true
    });
  } else if (view === 'baseline-selection') {
     path.push({
      title: 'القياس القبلي',
      onClick: () => {},
      isCurrent: true
    });
  }

  // If path only has Dashboard, hide breadcrumb
  if (path.length <= 1) return null;

  return (
    <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center overflow-x-auto print:hidden shadow-sm z-10 w-full overflow-hidden shrink-0">
      <div className="flex items-center gap-1.5 whitespace-nowrap min-w-max pb-1">
        {path.map((item, index) => (
          <React.Fragment key={`${index}-${item.title}`}>
            {index > 0 && <ChevronLeft size={14} className="text-slate-300 shrink-0" />}
            <button
              onClick={item.onClick}
              disabled={item.isCurrent}
              className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${
                item.isCurrent 
                  ? 'text-slate-800' 
                  : 'text-slate-500 hover:text-indigo-600 cursor-pointer hover:bg-slate-50'
              } px-2 py-1.5 rounded-lg border border-transparent ${!item.isCurrent && 'hover:border-slate-100'}`}
            >
              {item.title === 'الرئيسية' && <Home size={14} className={`shrink-0 ${item.isCurrent ? "text-slate-600" : "text-slate-400"}`} />}
              <span>{item.title}</span>
            </button>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
