import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  BookOpen, 
  Search, 
  X, 
  Printer, 
  TrendingUp, 
  BarChart, 
  ClipboardList, 
  LogOut,
  LayoutDashboard,
  Calendar,
  Award,
  ChevronLeft,
  Book,
  BrainCircuit,
  MessageSquare,
  Bell,
  Settings,
  Star,
  Zap,
  CheckCircle2,
  Clock,
  Briefcase,
  Sun,
  Moon,
  Sparkles
} from 'lucide-react';
import { AppData, Evaluations, ExternalProfile, Class, Subject, Student, Skill, Quiz } from '../types';
import { ClassDetailView } from './ClassDetailView';
import { ProfessionalReports } from './ProfessionalReports';
import { Visits } from './Visits';
import { MissingEvaluationsCard } from './MissingEvaluationsCard';

interface TeacherDashboardProps {
  data: AppData;
  evaluations: Evaluations;
  academicYear: string;
  displayYear: string;
  activeTerm: "term1" | "term2" | "full";
  externalProfile: ExternalProfile;
  onLogout: () => void;
  onToggleTerm: () => void;
  onSetTerm?: (term: 'term1' | 'term2' | 'full') => void;
  theme?: 'light' | 'dark' | 'calm';
  onThemeChange?: (theme: 'light' | 'dark' | 'calm') => void;
  calculatePerformance: (classId: string, subjectId?: string) => number;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ 
  data, evaluations, academicYear, displayYear, activeTerm, externalProfile, onLogout, onToggleTerm, onSetTerm, theme, onThemeChange, calculatePerformance 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'classes' | 'visits' | 'reports'>('overview');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  // Filter data for this teacher
  const teacherId = externalProfile.linkedTeacherId;
  
  const mySubjects = useMemo(() => 
    data.subjects.filter(s => 
      !s.isArchived && 
      (s.teacherId === teacherId || s.teacherIds?.includes(teacherId || ''))
    ), [data.subjects, teacherId]
  );

  const myClasses = useMemo(() => 
    data.classes.filter(c => 
      !c.isArchived && 
      (c.teacherIds?.includes(teacherId || '') || mySubjects.some(s => s.gradeId === c.gradeId && (!s.classIds || s.classIds.includes(c.id))))
    ), [data.classes, teacherId, mySubjects]
  );

  const myStudents = useMemo(() => 
    data.students.filter(s => !s.isArchived && myClasses.some(c => c.id === s.classId)),
    [data.students, myClasses]
  );

  const myQuizzes = useMemo(() => 
    data.quizzes.filter(q => !q.isArchived && (q.teacherId === teacherId || mySubjects.some(s => q.subjectIds?.includes(s.id)))),
    [data.quizzes, teacherId, mySubjects]
  );

  const myVisits = useMemo(() => 
    data.visits.filter(v => !v.isArchived && (v.teacherId === teacherId || (v.visitType === 'peer' && v.visitorTeacherId === teacherId))),
    [data.visits, teacherId]
  );

  const averagePerformance = useMemo(() => {
    if (myClasses.length === 0) return 0;
    const perfs = myClasses.map(c => calculatePerformance(c.id));
    const validPerfs = perfs.filter(p => p > 0);
    if (validPerfs.length === 0) return 0;
    return Math.round(validPerfs.reduce((a, b) => a + b, 0) / validPerfs.length);
  }, [myClasses, calculatePerformance]);

  const weakStudents = useMemo(() => {
    return myStudents.filter(s => {
      const results = data.quizResults.filter(r => r.studentId === s.id && !r.isArchived);
      if (results.length === 0) return false;
      const avg = results.reduce((sum, r) => sum + r.score, 0) / results.length;
      return avg < 50;
    });
  }, [myStudents, data.quizResults]);

  const skillPerformanceData = useMemo(() => {
    const skillStats = mySubjects.map(sub => {
      const subjectSkills = data.skills.filter(sk => !sk.isArchived && (sk.subjectId === sub.id || (sk.subjectName === sub.name && sk.gradeId === sub.gradeId)));
      const studentIds = data.students.filter(st => !st.isArchived && st.classId && (sub.classId === st.classId || sub.classIds?.includes(st.classId))).map(st => st.id);
      
      let total = 0;
      let count = 0;
      studentIds.forEach(stId => {
        subjectSkills.forEach(sk => {
          const ev = evaluations[`${stId}-${sk.id}-${academicYear}`];
          if (ev) {
            count++;
            if (ev.score === 'mastered') total += 100;
            else if (ev.score === 'advanced') total += 85;
            else if (ev.score === 'accepted') total += 70;
            else if (ev.score === 'weak') total += 40;
            else total += 20;
          }
        });
      });
      return {
        name: sub.name,
        performance: count > 0 ? Math.round(total / count) : 0
      };
    }).filter(s => s.performance > 0);
    return skillStats;
  }, [mySubjects, data.skills, data.students, evaluations, academicYear]);

  return (
    <div className="h-full flex flex-col bg-[#FDFCF9] font-sans" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <GraduationCap size={24} />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 leading-none">لوحة تحكم المعلم</h1>
            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">نظام إتقان التعليمي • {academicYear}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Term Selector */}
          <div className="hidden md:flex items-center gap-1.5 bg-amber-50/50 px-3 py-1.5 rounded-xl border border-amber-100/50">
             <Calendar size={14} className="text-amber-600" />
             <select 
               value={activeTerm} 
               onChange={(e) => onSetTerm?.(e.target.value as any)}
               className="bg-transparent border-none outline-none font-black text-[11px] text-amber-700 cursor-pointer"
             >
                <option value="full">العام الدراسي كامل</option>
                <option value="term1">الفصل الأول</option>
                <option value="term2">الفصل الثاني</option>
             </select>
          </div>

          {/* Theme Toggler */}
          {onThemeChange && (
            <button 
              onClick={() => {
                if (theme === 'light') onThemeChange('dark');
                else if (theme === 'dark') onThemeChange('calm');
                else onThemeChange('light');
              }}
              className="h-10 w-10 md:w-auto md:px-3 bg-white border border-slate-200 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 transition-all cursor-pointer shadow-sm text-slate-600 outline-none"
              title="تغيير المظهر"
            >
              {theme === 'light' && <Sun size={16} className="text-amber-500" />}
              {theme === 'dark' && <Moon size={16} className="text-indigo-400" />}
              {theme === 'calm' && <Sparkles size={16} className="text-amber-600" />}
              <span className="text-xs font-black hidden lg:inline">
                {theme === 'light' && 'فاتح'}
                {theme === 'dark' && 'ليلي'}
                {theme === 'calm' && 'هادئ'}
              </span>
            </button>
          )}

          <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl">
             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
             <span className="text-xs font-black text-slate-700">{externalProfile.name}</span>
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
          label="الرئيسية" 
        />
        <TabButton 
          active={activeTab === 'classes'} 
          onClick={() => setActiveTab('classes')} 
          icon={<Users size={16} />} 
          label="فصولي" 
        />
        <TabButton 
          active={activeTab === 'visits'} 
          onClick={() => setActiveTab('visits')} 
          icon={<Briefcase size={16} />} 
          label="الزيارات" 
        />
        <TabButton 
          active={activeTab === 'reports'} 
          onClick={() => setActiveTab('reports')} 
          icon={<BarChart size={16} />} 
          label="التقارير" 
        />
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          
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
                    label="الطلاب" 
                    value={myStudents.length.toString()} 
                    subValue="نشط"
                    color="indigo" 
                  />
                  <StatCard 
                    icon={<BookOpen className="text-emerald-600" size={16} />} 
                    label="الفصول" 
                    value={myClasses.length.toString()} 
                    subValue="نشط"
                    color="emerald" 
                  />
                  <StatCard 
                    icon={<Star className="text-amber-600" size={16} />} 
                    label="الأداء" 
                    value={`${averagePerformance}%`} 
                    subValue="إجمالي"
                    color="amber" 
                  />
                  <StatCard 
                    icon={<Zap className="text-sky-600" size={16} />} 
                    label="الاختبارات" 
                    value={myQuizzes.length.toString()} 
                    subValue="حالي"
                    color="sky" 
                  />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Classes & Subjects */}
                  <div className="lg:col-span-2 space-y-6">
                    <MissingEvaluationsCard 
                      data={data} 
                      evaluations={evaluations} 
                      academicYear={academicYear} 
                      filterTeacherId={teacherId}
                      onStudentClick={(studentId) => {
                        const s = data.students.find(st => st.id === studentId);
                        if (s) {
                          setSelectedClassId(s.classId);
                          // Scroll to the top or to the class detail view
                          window.scrollTo(0, 0);
                        }
                      }}
                    />
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 space-y-5">
                      <div className="flex items-center justify-between">
                         <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                           <Book className="text-indigo-500" size={20} />
                           المواد والفصول
                         </h3>
                         <button onClick={() => setActiveTab('classes')} className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 underline underline-offset-4">عرض الكل</button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {mySubjects.slice(0, 4).map(subject => {
                          const grade = data.grades.find(g => g.id === subject.gradeId);
                          const subjectClasses = myClasses.filter(c => c.gradeId === subject.gradeId && (!subject.classIds || subject.classIds.includes(c.id)));
                          
                          return (
                            <div key={subject.id} className="p-5 rounded-3xl bg-slate-50 border border-slate-100 flex flex-col gap-3 group hover:border-indigo-200 hover:bg-white transition-all">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h4 className="font-black text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">{subject.name}</h4>
                                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">{grade?.name || 'مرحلة غير محددة'}</p>
                                </div>
                                <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-indigo-500 border border-slate-100 shadow-sm group-hover:scale-110 transition-transform">
                                  <ClipboardList size={16} />
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {subjectClasses.map(cls => (
                                  <span key={cls.id} className="px-2 py-0.5 bg-white border border-slate-100 text-[10px] font-black text-slate-600 rounded-lg">فصل {cls.name}</span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Sidebar/Recent Activity */}
                  <div className="space-y-6">
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6">
                      <h3 className="text-lg font-black text-slate-800 flex items-center gap-2 mb-6">
                        <TrendingUp className="text-emerald-500" size={20} />
                        زيارات حديثة
                      </h3>
                      
                      <div className="space-y-4">
                        {myVisits.slice(0, 3).length > 0 ? (
                          myVisits.slice(0, 3).map(visit => (
                            <div key={visit.id} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                              <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
                                <Calendar size={18} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-black text-slate-800 truncate">{visit.supervisorName || 'زيارة إشرافية'}</p>
                                <p className="text-[10px] font-bold text-slate-400">{new Date(visit.date).toLocaleDateString('ar-SA')}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="py-8 text-center space-y-2">
                             <Clock size={24} className="mx-auto text-slate-300" />
                             <p className="text-[10px] font-bold text-slate-400">لا توجد زيارات مسجلة مؤخراً</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-indigo-600 rounded-[2.5rem] p-6 text-white shadow-lg shadow-indigo-100 overflow-hidden relative group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 group-hover:scale-110 transition-transform duration-700" />
                      <h4 className="text-sm font-black mb-1 relative z-10">تحليل الأداء</h4>
                      <p className="text-[10px] font-medium text-white/80 leading-relaxed mb-4 relative z-10">استعرض تقارير المهارات والتحصيل العلمي لفصولك والطلاب المتعثرين.</p>
                      <button 
                        onClick={() => setActiveTab('reports')}
                        className="px-4 py-2 bg-white text-indigo-600 rounded-xl text-[10px] font-black flex items-center gap-2 hover:bg-slate-50 transition-colors relative z-10"
                      >
                        فتح التقارير
                        <ChevronLeft size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'classes' && (
              <motion.div 
                key="classes"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                {selectedClassId ? (
                   <ClassDetailView 
                     data={data}
                     classId={selectedClassId}
                     onBack={() => setSelectedClassId(null)}
                     teacherId={teacherId || ''}
                     externalProfileName={externalProfile.name}
                     academicYear={academicYear}
                     evaluations={evaluations}
                   />
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                       <h2 className="text-2xl font-black text-slate-800">الفصول والمواد الدراسية</h2>
                       <div className="flex gap-2">
                          <div className="px-4 py-2 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-2xl text-[10px] font-black">إجمالي {myClasses.length} فصول</div>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {myClasses.map(cls => {
                        const grade = data.grades.find(g => g.id === cls.gradeId);
                        const classSubjects = mySubjects.filter(s => s.gradeId === cls.gradeId && (!s.classIds || s.classIds.includes(cls.id)));
                        const classStudents = data.students.filter(s => s.classId === cls.id && !s.isArchived);
                        const perf = calculatePerformance(cls.id);
                        
                        return (
                          <div key={cls.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6 flex flex-col gap-6 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="text-xl font-black text-slate-800">فصل {cls.name}</h3>
                                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{grade?.name}</p>
                              </div>
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm ${
                                perf >= 85 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                                perf >= 70 ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 
                                'bg-rose-50 text-rose-600 border border-rose-100'
                              }`}>
                                {perf}%
                              </div>
                            </div>

                            <div className="space-y-3">
                               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">المواد المسندة</p>
                               <div className="space-y-2">
                                 {classSubjects.map(sub => (
                                   <div key={sub.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100/50">
                                     <div className="flex items-center gap-2">
                                       <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                       <span className="text-xs font-black text-slate-700">{sub.name}</span>
                                     </div>
                                     <span className="text-[10px] font-bold text-slate-400">تحصيل {calculatePerformance(cls.id, sub.id)}%</span>
                                   </div>
                                 ))}
                               </div>
                            </div>

                            <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                               <div className="flex items-center gap-2 text-slate-500">
                                 <Users size={16} />
                                 <span className="text-xs font-black">{classStudents.length} طلاب</span>
                               </div>
                               <button 
                                 onClick={() => setSelectedClassId(cls.id)}
                                 className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                               >
                                  التفاصيل
                                  <ChevronLeft size={14} />
                               </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </motion.div>
            )}

          {activeTab === 'visits' && (
            <motion.div 
              key="visits"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <Visits 
                data={data} 
                evaluations={evaluations} 
                academicYear={academicYear} 
                activeTerm={activeTerm} 
                filterTeacherId={externalProfile.linkedTeacherId}
              />
            </motion.div>
          )}

            {activeTab === 'reports' && (
              <motion.div 
                key="reports"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between mb-8">
                   <h2 className="text-2xl font-black text-slate-800">التقارير الاحترافية</h2>
                   <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-2xl border border-emerald-100 text-[10px] font-black flex items-center gap-2">
                     <CheckCircle2 size={14} />
                     مؤشرات الأداء محدثة
                   </div>
                </div>
                <ProfessionalReports 
                  data={data} 
                  evaluations={evaluations} 
                  academicYear={academicYear}
                  displayYear={displayYear}
                  activeTerm={activeTerm}
                  filterTeacherId={externalProfile.linkedTeacherId}
                  calculatePerformance={calculatePerformance}
                  externalProfile={externalProfile}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Styled Tabs Styles */}
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
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
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

const GraduationCap = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 10L12 5L2 10L12 15L22 10Z" />
    <path d="M6 12V17C6 17 8 20 12 20C16 20 18 17 18 17V12" />
  </svg>
);
