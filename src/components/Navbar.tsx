import React from 'react';
import { Award, LayoutDashboard, BarChart3, Settings, LogOut, Users, Timer, Grid3X3, Focus, Archive, Calendar, Sun, Moon, Sparkles, BrainCircuit, ChevronRight } from 'lucide-react';
import { firestoreService } from '../services/firestoreService';
import { auth } from '../lib/firebase';

interface NavbarProps {
  onNavigate: (view: string) => void;
  activeView: string;
  academicYear: string;
  onYearChange: (year: string) => void;
  activeTerm: 'term1' | 'term2';
  onTermChange: (term: 'term1' | 'term2') => void;
  teachers: any[];
  selectedTeacherId: string;
  onTeacherChange: (id: string) => void;
  theme: 'light' | 'dark' | 'calm';
  onThemeChange: (theme: 'light' | 'dark' | 'calm') => void;
  onGoBack?: () => void;
  canGoBack?: boolean;
  schoolLogoUrl?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onNavigate, 
  activeView, 
  academicYear, 
  onYearChange,
  activeTerm,
  onTermChange,
  teachers,
  selectedTeacherId,
  onTeacherChange,
  theme,
  onThemeChange,
  onGoBack,
  canGoBack,
  schoolLogoUrl
}) => {
  const user = auth.currentUser;

  const cycleTheme = () => {
    if (theme === 'light') onThemeChange('dark');
    else if (theme === 'dark') onThemeChange('calm');
    else onThemeChange('light');
  };

  return (
    <header className="bg-white/80 backdrop-blur-md text-slate-800 h-14 flex items-center justify-between px-3 md:px-6 shadow-sm border-b border-slate-100 sticky top-0 z-50 shrink-0" dir="rtl">
      <div className="flex items-center gap-3 md:gap-5">
        <div 
          className="flex items-center gap-2 cursor-pointer" 
          onClick={() => onNavigate('dashboard')}
        >
          <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 p-1.5 flex items-center justify-center overflow-hidden shrink-0">
            <img 
              src={schoolLogoUrl || "https://www.wzufa.com/wp-content/uploads/2022/07/Riyadh-Al-Ebdaa-Schools.png"} 
              alt="Logo" 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="hidden sm:block">
             <h1 className="text-base font-black tracking-tight text-slate-900 leading-none">إتقان</h1>
             <p className="text-[8px] font-black text-indigo-600 mt-0.5">أسامة إبراهيم</p>
          </div>
        </div>

        {canGoBack && onGoBack && (
          <button
            onClick={onGoBack}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-all font-black text-[10px] cursor-pointer border border-rose-100 shadow-sm"
          >
            <ChevronRight size={14} className="text-rose-600" />
            <span className="hidden xs:inline">تراجع</span>
          </button>
        )}

        

        <div className="hidden md:flex items-center gap-1.5 bg-emerald-50/50 px-2.5 py-1 rounded-lg border border-emerald-100/50">
           <Calendar size={12} className="text-emerald-500" />
           <select 
             value={academicYear} 
             onChange={(e) => onYearChange(e.target.value)}
             className="bg-transparent border-none outline-none font-bold text-[10px] text-emerald-700 cursor-pointer"
           >
              <option value="2024-2025">٢٠٢٤ - ٢٠٢٥</option>
              <option value="2025-2026">٢٠٢٥ - ٢٠٢٦</option>
              <option value="2026-2027">٢٠٢٦ - ٢٠٢٧</option>
           </select>
        </div>

        <div className="hidden md:flex items-center gap-1.5 bg-amber-50/50 px-2.5 py-1 rounded-lg border border-amber-100/50">
           <select 
             value={activeTerm} 
             onChange={(e) => onTermChange(e.target.value as 'term1' | 'term2')}
             className="bg-transparent border-none outline-none font-bold text-[10px] text-amber-700 cursor-pointer"
           >
              <option value="term1">الفصل الأول</option>
              <option value="term2">الفصل الثاني</option>
           </select>
        </div>

        <div className="hidden lg:flex items-center gap-1.5 bg-indigo-50/50 px-2.5 py-1 rounded-lg border border-indigo-100/50 mr-2">
           <Users size={12} className="text-indigo-500" />
           <select 
             value={selectedTeacherId} 
             onChange={(e) => onTeacherChange(e.target.value)}
             className="bg-transparent border-none outline-none font-bold text-[10px] text-indigo-700 cursor-pointer max-w-[120px]"
           >
              <option value="">جميع المعلمين</option>
              {teachers.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
           </select>
        </div>
      </div>

      <div className="flex items-center gap-1.5 md:gap-3 shrink-0">
        <nav className="flex gap-0.5 sm:gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100 overflow-x-auto scrollbar-hide shrink-0">
          <NavButton 
            active={activeView === 'dashboard'} 
            onClick={() => onNavigate('dashboard')}
            icon={<LayoutDashboard size={14} className="sm:w-4 sm:h-4" />}
            label="الرئيسية"
          />
          <NavButton 
            active={activeView === 'quick-matrix' || activeView === 'subjects' || activeView === 'skills' || activeView === 'evaluation'} 
            onClick={() => onNavigate('quick-matrix')}
            icon={<Grid3X3 size={14} className="sm:w-4 sm:h-4" />}
            label="الرصد"
          />
          <NavButton 
            active={activeView === 'quizzes' || activeView === 'quiz-login' || activeView === 'quiz' || activeView === 'quiz-report'} 
            onClick={() => onNavigate('quiz-login')}
            icon={<BrainCircuit size={14} className="sm:w-4 sm:h-4" />}
            label="الاختبارات"
          />
          <NavButton 
            active={activeView === 'visits'} 
            onClick={() => onNavigate('visits')}
            icon={<Focus size={14} className="sm:w-4 sm:h-4" />}
            label="الزيارات"
          />
          <NavButton 
            active={activeView === 'reports' || activeView === 'student-report' || activeView === 'teacher-profile'} 
            onClick={() => onNavigate('reports')}
            icon={<BarChart3 size={14} className="sm:w-4 sm:h-4" />}
            label="التقارير"
          />
          <div className="w-px h-4 bg-slate-200 self-center mx-0.5" />
          <NavButton 
            active={activeView === 'management'} 
            onClick={() => onNavigate('management')}
            icon={<Settings size={14} className="sm:w-4 sm:h-4" />}
            label="الإدارة"
          />
        </nav>

        {/* Dynamic Theme Toggler */}
        <button 
          onClick={cycleTheme}
          className="h-9 w-9 md:h-10 md:w-auto md:px-3 bg-white border border-slate-200 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 transition-all cursor-pointer shadow-sm text-slate-600 outline-none shrink-0"
          title={`تغيير المظهر`}
        >
          {theme === 'light' && <Sun size={14} className="text-amber-500 sm:w-4 sm:h-4" />}
          {theme === 'dark' && <Moon size={14} className="text-indigo-400 sm:w-4 sm:h-4" />}
          {theme === 'calm' && <Sparkles size={14} className="text-amber-600 sm:w-4 sm:h-4" />}
          <span className="text-[10px] font-black hidden lg:inline">
            {theme === 'light' && 'فاتح'}
            {theme === 'dark' && 'ليلي'}
            {theme === 'calm' && 'هادئ'}
          </span>
        </button>
        
        <button 
          onClick={() => firestoreService.logout()}
          className="h-9 w-9 md:h-10 md:w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all cursor-pointer shadow-sm shrink-0"
          title="خروج"
        >
          <LogOut size={14} className="sm:w-4 sm:h-4" />
        </button>
      </div>
    </header>
  );
};

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  tooltip?: string;
}

const NavButton: React.FC<NavButtonProps> = ({ active, onClick, icon, label, disabled, tooltip }) => (
  <button
    onClick={!disabled ? onClick : undefined}
    disabled={disabled}
    title={tooltip || label}
    className={`flex items-center gap-1 sm:gap-2 px-1.5 py-1 sm:px-3 sm:py-2 rounded-lg font-black transition-all duration-300 text-[10px] uppercase tracking-tight ${
      disabled ? 'opacity-30 cursor-not-allowed' : ''
    } ${
      active 
        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100 scale-105' 
        : 'text-slate-400 hover:bg-white hover:text-indigo-600'
    }`}
  >
    {icon}
    <span className="hidden lg:inline">{label}</span>
  </button>
);
