import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  BarChart, 
  LogOut,
  LayoutDashboard,
  Calendar,
  ShieldCheck,
  Briefcase,
  CheckCircle2,
  TrendingUp,
  BrainCircuit,
  Award,
  User
} from 'lucide-react';
import { AppData, Evaluations, ExternalProfile } from '../types';
import { ProfessionalReports } from './ProfessionalReports';
import { Visits } from './Visits';

interface SupervisorDashboardProps {
  data: AppData;
  evaluations: Evaluations;
  academicYear: string;
  displayYear: string;
  activeTerm: "term1" | "term2" | "full";
  externalProfile: ExternalProfile;
  onLogout: () => void;
  onToggleTerm: () => void;
  calculatePerformance: (classId: string, subjectId?: string) => number;
}

export const SupervisorDashboard: React.FC<SupervisorDashboardProps> = ({ 
  data, evaluations, academicYear, displayYear, activeTerm, externalProfile, onLogout, onToggleTerm, calculatePerformance 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'visits'>('overview');
  const [filterTeacherId, setFilterTeacherId] = useState<string>('');

  const totalStudents = data.students.filter(s => !s.isArchived).length;
  const totalTeachers = data.teachers.filter(s => !s.isArchived).length;
  const totalVisits = data.visits.filter(s => !s.isArchived && (filterTeacherId ? s.teacherId === filterTeacherId : true)).length;
  const totalQuizzes = data.quizzes.filter(s => !s.isArchived && (filterTeacherId ? s.teacherId === filterTeacherId : true)).length;

  return (
    <div className="h-full flex flex-col bg-[#FDFCF9] font-sans" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 leading-none">لوحة تحكم المشرف العام</h1>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">نظام إتقان التعليمي • {academicYear}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Teacher Selector */}
          <div className="relative group hidden lg:block">
            <select 
              value={filterTeacherId}
              onChange={(e) => setFilterTeacherId(e.target.value)}
              className="h-10 bg-slate-50 border border-slate-100 rounded-xl pr-9 pl-4 font-black transition-all outline-none focus:ring-2 focus:ring-emerald-100 appearance-none text-[11px] cursor-pointer"
            >
              <option value="">جميع المعلمين</option>
              {data.teachers.filter(t => !t.isArchived).map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <User size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-emerald-600 transition-colors" />
          </div>

          <button 
            onClick={onToggleTerm}
            className="hidden md:flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl text-emerald-700 hover:bg-emerald-100 transition-colors"
          >
            <Calendar size={14} />
            <span className="text-xs font-black">{activeTerm === 'term1' ? 'الفصل الدراسي الأول' : activeTerm === 'term2' ? 'الفصل الدراسي الثاني' : 'العام الدراسي كامل'}</span>
          </button>
          <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-xs font-black text-slate-700">{externalProfile.name} (مشرف)</span>
          </div>
          <button 
            onClick={onLogout}
            className="w-10 h-10 flex items-center justify-center bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all group"
            title="تسجيل الخروج"
          >
            <LogOut size={18} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav className="bg-white border-b border-slate-100 flex items-center gap-1 p-1 overflow-x-auto no-scrollbar">
        <TabButton 
          active={activeTab === 'overview'} 
          onClick={() => setActiveTab('overview')} 
          icon={<LayoutDashboard size={16} />} 
          label="نظرة عامة" 
        />
        <TabButton 
          active={activeTab === 'reports'} 
          onClick={() => setActiveTab('reports')} 
          icon={<BarChart size={16} />} 
          label="التقارير التحليلية" 
        />
        <TabButton 
          active={activeTab === 'visits'} 
          onClick={() => setActiveTab('visits')} 
          icon={<Briefcase size={16} />} 
          label="سجل الزيارات" 
        />
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div 
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-6"
              >
                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard 
                    icon={<Users className="text-indigo-600" size={16} />} 
                    label="إجمالي الطلاب" 
                    value={totalStudents.toString()} 
                    subValue="طالب نشط"
                    color="indigo" 
                  />
                  <StatCard 
                    icon={<Award className="text-emerald-600" size={16} />} 
                    label="المعلمون" 
                    value={totalTeachers.toString()} 
                    subValue="معلم معتمد"
                    color="emerald" 
                  />
                  <StatCard 
                    icon={<TrendingUp className="text-amber-600" size={16} />} 
                    label="الزيارات" 
                    value={totalVisits.toString()} 
                    subValue="زيارة منفذة"
                    color="amber" 
                  />
                  <StatCard 
                    icon={<BrainCircuit className="text-sky-600" size={16} />} 
                    label="بنك الاختبارات" 
                    value={totalQuizzes.toString()} 
                    subValue="اختبار متاح"
                    color="sky" 
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                   <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col justify-center items-center text-center space-y-5">
                      <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                         <BarChart size={32} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-800">التقارير المركزية</h3>
                        <p className="text-slate-500 mt-2 font-medium text-xs">عرض تحليلات الأداء لجميع الصفوف والمعلمين والمواد</p>
                      </div>
                      <button 
                        onClick={() => setActiveTab('reports')}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-xs shadow-xl shadow-indigo-100 hover:scale-[1.02] transition-transform"
                      >
                        الانتقال للتقارير
                      </button>
                   </div>
 
                   <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col justify-center items-center text-center space-y-5">
                      <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                         <Briefcase size={32} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-800">متابعة الزيارات</h3>
                        <p className="text-slate-500 mt-2 font-medium text-xs">سجل كامل لجميع الزيارات الإشرافية والتبادلية</p>
                      </div>
                      <button 
                         onClick={() => setActiveTab('visits')}
                         className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-black text-xs shadow-xl shadow-emerald-100 hover:scale-[1.02] transition-transform"
                      >
                        عرض السجل
                      </button>
                   </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'reports' && (
              <motion.div 
                key="reports"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                <ProfessionalReports 
                  data={data} 
                  evaluations={evaluations} 
                  academicYear={academicYear}
                  displayYear={displayYear}
                  activeTerm={activeTerm}
                  calculatePerformance={calculatePerformance}
                  filterTeacherId={filterTeacherId}
                  onFilterTeacherChange={setFilterTeacherId}
                  hideStudentDetails={true}
                />
              </motion.div>
            )}

            {activeTab === 'visits' && (
              <motion.div 
                key="visits"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 mb-6">
                   <h2 className="text-xl font-black text-slate-800 mb-2">سجل الزيارات الإشرافية</h2>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">متابعة شاملة لجميع الزيارات في المنصة</p>
                </div>
                <Visits 
                  data={data} 
                  evaluations={evaluations} 
                  academicYear={academicYear} 
                  activeTerm={activeTerm} 
                  filterTeacherId={filterTeacherId}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2.5 px-6 py-3 rounded-xl transition-all font-black text-xs whitespace-nowrap ${
      active 
        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' 
        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
    }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue: string;
  color: 'indigo' | 'emerald' | 'amber' | 'sky';
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, subValue, color }) => {
  const colorMap = {
    indigo: 'from-indigo-50/70 to-white hover:border-indigo-200 text-indigo-950 shadow-indigo-100/30',
    emerald: 'from-emerald-50/70 to-white hover:border-emerald-200 text-emerald-950 shadow-emerald-100/30',
    amber: 'from-amber-50/70 to-white hover:border-amber-200 text-amber-950 shadow-amber-100/30',
    sky: 'from-sky-50/70 to-white hover:border-sky-200 text-sky-950 shadow-sky-100/30',
  };

  return (
    <div className={`p-5 rounded-3xl border border-slate-100 shadow-md bg-gradient-to-br ${colorMap[color]} flex items-center justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-xl relative overflow-hidden group`}>
      <div className="space-y-1.5 z-10 text-right">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{label}</p>
        <div className="flex items-baseline gap-1.5">
           <span className="text-2xl font-black tracking-tight leading-none">{value}</span>
           <span className="text-[10px] font-bold text-slate-500">{subValue}</span>
        </div>
      </div>
      <div className="w-12 h-12 rounded-2xl bg-white border border-slate-50 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300 z-10">
        {React.cloneElement(icon as any, { size: 24 })}
      </div>
      <div className="absolute -right-2 -bottom-2 w-16 h-16 bg-slate-50/40 rounded-full group-hover:scale-150 transition-all duration-700 pointer-events-none" />
    </div>
  );
};
