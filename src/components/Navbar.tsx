import React from 'react';
import { Award, LayoutDashboard, BarChart3, Settings, LogOut, Users, Timer, Grid3X3, Focus, Archive, Calendar, Sun, Moon, Sparkles, BrainCircuit, ChevronRight } from 'lucide-react';
import { firestoreService } from '../services/firestoreService';
import { auth } from '../lib/firebase';

interface NavbarProps {
  onNavigate: (view: string) => void;
  activeView: string;
  academicYear: string;
  onYearChange: (year: string) => void;
  teachers: any[];
  selectedTeacherId: string;
  onTeacherChange: (id: string) => void;
  theme: 'light' | 'dark' | 'calm';
  onThemeChange: (theme: 'light' | 'dark' | 'calm') => void;
  onGoBack?: () => void;
  canGoBack?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onNavigate, 
  activeView, 
  academicYear, 
  onYearChange,
  teachers,
  selectedTeacherId,
  onTeacherChange,
  theme,
  onThemeChange,
  onGoBack,
  canGoBack
}) => {
  const user = auth.currentUser;

  const cycleTheme = () => {
    if (theme === 'light') onThemeChange('dark');
    else if (theme === 'dark') onThemeChange('calm');
    else onThemeChange('light');
  };

  return (
    <header className="bg-white text-slate-800 h-20 flex items-center justify-between px-4 md:px-8 shadow-minimal border-b border-slate-100 sticky top-0 z-50 shrink-0" dir="rtl">
      <div className="flex items-center gap-6">
        <div 
          className="flex items-center gap-4 cursor-pointer" 
          onClick={() => onNavigate('dashboard')}
        >
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 p-1 flex items-center justify-center overflow-hidden">
            <img 
              src="https://www.wzufa.com/wp-content/uploads/2022/07/Riyadh-Al-Ebdaa-Schools.png" 
              alt="Logo" 
              className="w-full h-auto object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
             <h1 className="text-xl font-black tracking-tight text-slate-900 leading-none">إتقان</h1>
             <p className="text-[10px] font-black text-indigo-600 mt-1">أستاذ • أسامة إبراهيم</p>
          </div>
        </div>

        {canGoBack && onGoBack && (
          <button
            onClick={onGoBack}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 transition-all font-black text-xs cursor-pointer border border-rose-100 animate-in fade-in zoom-in-95 duration-200 shadow-sm"
            title="تراجع خطوة واحدة للخلف"
          >
            <ChevronRight size={16} className="text-rose-600" />
            <span>تراجع خطوة</span>
          </button>
        )}

        <div className="hidden xl:flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
           <Users size={14} className="text-indigo-400" />
           <select 
             value={selectedTeacherId} 
             onChange={(e) => onTeacherChange(e.target.value)}
             className="bg-transparent border-none outline-none font-black text-xs text-indigo-600 cursor-pointer max-w-[150px]"
           >
              <option value="">جميع المعلمين</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
           </select>
        </div>

        <div className="hidden md:flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
           <Calendar size={14} className="text-emerald-500" />
           <select 
             value={academicYear} 
             onChange={(e) => onYearChange(e.target.value)}
             className="bg-transparent border-none outline-none font-black text-xs text-emerald-700 cursor-pointer"
           >
              <option value="2024-2025">٢٠٢٤ - ٢٠٢٥</option>
              <option value="2025-2026">٢٠٢٥ - ٢٠٢٦</option>
              <option value="2026-2027">٢٠٢٦ - ٢٠٢٧</option>
           </select>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <nav className="flex gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
          <NavButton 
            active={activeView === 'dashboard'} 
            onClick={() => onNavigate('dashboard')}
            icon={<LayoutDashboard size={18} />}
            label="الرئيسية"
            tooltip="العودة للوحة القيادة"
          />
          <NavButton 
            active={activeView === 'quick-matrix'} 
            onClick={() => onNavigate('quick-matrix')}
            icon={<Grid3X3 size={18} />}
            label="الرصد السريع"
            tooltip="رصد الدرجات لكامل الفصل"
          />
          <NavButton 
            active={activeView === 'quizzes' || activeView === 'quiz-login'} 
            onClick={() => onNavigate('quiz-login')}
            icon={<BrainCircuit size={18} />}
            label="الاختبارات"
            tooltip="بوابة الاختبارات الفورية"
          />
          <NavButton 
            active={activeView === 'visits'} 
            onClick={() => onNavigate('visits')}
            icon={<Focus size={18} />}
            label="الزيارات الإشرافية"
            tooltip="سجل الزيارات الفنية"
          />
          <NavButton 
            active={activeView === 'reports'} 
            onClick={() => onNavigate('reports')}
            icon={<BarChart3 size={18} />}
            label="التقارير"
            tooltip="تحليلات الأداء والتقارير"
          />
          <div className="w-px h-6 bg-slate-200 self-center mx-1" />
          <NavButton 
            active={activeView === 'management'} 
            onClick={() => onNavigate('management')}
            icon={<Settings size={18} />}
            label="الإدارة"
            tooltip="إعدادات النظام والمستخدمين"
          />
        </nav>

        {/* Dynamic Theme Toggler */}
        <button 
          onClick={cycleTheme}
          className="h-12 px-3.5 bg-white border border-slate-200 rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-50 transition-all cursor-pointer shadow-sm text-slate-600 outline-none"
          title={`تغيير المظهر (المظهر الحالي: ${theme === 'light' ? 'الافتراضي الفاتح' : theme === 'dark' ? 'الليلي الاحترافي' : 'الهادئ المريح لترشيح الضوء'})`}
        >
          {theme === 'light' && <Sun size={18} className="text-amber-500" />}
          {theme === 'dark' && <Moon size={18} className="text-indigo-400" />}
          {theme === 'calm' && <Sparkles size={18} className="text-amber-600" />}
          <span className="text-[11px] font-black hidden lg:inline">
            {theme === 'light' && 'المظهر العادي'}
            {theme === 'dark' && 'المظهر الليلي'}
            {theme === 'calm' && 'المظهر الهادئ'}
          </span>
        </button>
        
        <button 
          onClick={() => firestoreService.logout()}
          className="h-12 w-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center hover:bg-red-50 hover:border-red-100 hover:text-red-500 transition-all cursor-pointer group shadow-sm"
          title="تسجيل الخروج"
        >
          <LogOut size={18} />
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
    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl font-black transition-all duration-300 text-[11px] uppercase tracking-tight ${
      disabled ? 'opacity-30 cursor-not-allowed' : ''
    } ${
      active 
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-105' 
        : 'text-slate-400 hover:bg-white hover:text-indigo-600 hover:shadow-sm'
    }`}
  >
    {icon}
    <span className="hidden lg:inline">{label}</span>
  </button>
);
