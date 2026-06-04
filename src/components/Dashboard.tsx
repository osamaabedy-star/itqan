import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import {
  Plus,
  Search,
  BrainCircuit,
  Grid3X3,
  Users,
  TrendingUp,
  Zap,
  LayoutDashboard,
  ShieldCheck,
  ArrowLeft,
  ChevronRight,
  BookOpen,
  ShieldAlert,
  Clock,
  Layers,
  GraduationCap,
  Baby,
} from "lucide-react";
import {
  AppData,
  Class,
  Subject,
  Student,
  Quiz,
  Evaluations,
  Skill,
  Grade,
  Teacher,
} from "../types";
import { ClassCard } from "./ClassCard";

interface DashboardProps {
  data: AppData;
  evaluations: Evaluations;
  academicYear: string;
  activeTerm: 'term1' | 'term2' | 'full';
  onNavigate: (view: string) => void;
  onSelectClass: (cls: Class) => void;
  onSelectStudent: (st: Student) => void;
  onSelectTeacher: (t: Teacher) => void;
  onSelectQuiz: (q: Quiz, st: Student) => void;
  calculatePerformance: (classId: string, subjectId?: string) => number;
  filterTeacherId?: string;
  onFilterTeacherChange?: (id: string) => void;
  isAdmin?: boolean;
}

import { APP_STAGES } from "../constants";

export function Dashboard({
  data,
  evaluations,
  academicYear,
  activeTerm,
  onNavigate,
  onSelectClass,
  onSelectStudent,
  onSelectTeacher,
  onSelectQuiz,
  calculatePerformance,
  filterTeacherId,
  onFilterTeacherChange,
  isAdmin,
}: DashboardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [selectedGradeId, setSelectedGradeId] = useState<string | null>(null);

  const displayedGrades = data.grades
    .filter((g) => !g.isArchived)
    .filter((g) => {
      if (!filterTeacherId) return true;
      return data.subjects.some(
        (sub) =>
          !sub.isArchived &&
          sub.gradeId === g.id &&
          (sub.teacherId === filterTeacherId ||
            sub.teacherIds?.includes(filterTeacherId)),
      );
    });

  const currentGrade = selectedGradeId
    ? displayedGrades.find((g) => g.id === selectedGradeId)
    : null;
  const currentGradesToList = currentGrade
    ? [currentGrade]
    : selectedStageId
      ? displayedGrades.filter(
          (g) => (g.stage || "primary") === selectedStageId,
        )
      : displayedGrades;

  const currentClasses = data.classes
    .filter((cls) => !cls.isArchived)
    .filter((cls) =>
      currentGradesToList.map((g) => g.id).includes(cls.gradeId),
    );

  const filteredStudents = data.students
    .filter((s) => s.name.includes(searchTerm) && !s.isArchived)
    .filter((s) => {
      return currentClasses.map((c) => c.id).includes(s.classId);
    })
    .slice(0, 5);

  const currentStudents = data.students.filter(
    (s) => !s.isArchived && currentClasses.map((c) => c.id).includes(s.classId),
  );

  const currentQuizzes = data.quizzes
    .filter(
      (q) =>
        !q.isArchived &&
        (activeTerm === 'full' || (q.term || 'term1') === activeTerm) &&
        currentGradesToList.map((g) => g.id).includes(q.gradeId || ""),
    )
    .filter((q) => {
      if (!filterTeacherId) return true;
      const subject =
        q.subjectIds && q.subjectIds.length > 0
          ? data.subjects.find((s) => q.subjectIds?.includes(s.id))
          : undefined;
      return (
        subject?.teacherId === filterTeacherId ||
        subject?.teacherIds?.includes(filterTeacherId)
      );
    });

  // Function to calculate aggregate performance
  const calculateAggregatePerformance = (classesInScope: Class[]) => {
    if (classesInScope.length === 0) return 0;
    let totalPerf = 0;
    let counts = 0;
    classesInScope.forEach((cls) => {
      const perf = calculatePerformance(cls.id);
      if (perf > 0) {
        totalPerf += perf;
        counts++;
      }
    });
    return counts > 0 ? Math.round(totalPerf / counts) : 0;
  };

  const stats = [
    {
      label: "إجمالي الطلاب",
      value: currentStudents.length,
      icon: <Users size={20} />,
      color: "bg-blue-600",
    },
    {
      label: selectedGradeId ? "الفصول في المرحلة" : "إجمالي الفصول",
      value: currentClasses.length,
      icon: <Grid3X3 size={20} />,
      color: "bg-violet-600",
    },
    {
      label: "الاختبارات الذكية",
      value: currentQuizzes.length,
      icon: <BrainCircuit size={20} />,
      color: "bg-amber-500",
    },
    {
      label: "مؤشر الإنجاز الكلي",
      value: `${calculateAggregatePerformance(currentClasses)}%`,
      icon: <TrendingUp size={20} />,
      color: "bg-indigo-600",
    },
  ];

  const performanceByGrade = useMemo(() => {
    return currentGradesToList
      .map((grade) => {
        const gradeClasses = data.classes.filter(
          (c) => !c.isArchived && c.gradeId === grade.id,
        );
        return {
          name: grade.name,
          performance: calculateAggregatePerformance(gradeClasses),
        };
      })
      .filter((g) => g.performance > 0);
  }, [currentGradesToList, data.classes, calculatePerformance]);

  const STAGES = [
    {
      id: "primary",
      name: "المرحلة الابتدائية",
      icon: <Layers size={32} />,
      color: "text-blue-500",
      bg: "bg-blue-50",
    },
    {
      id: "middle",
      name: "المرحلة المتوسطة",
      icon: <BookOpen size={32} />,
      color: "text-amber-500",
      bg: "bg-amber-50",
    },
    {
      id: "high",
      name: "المرحلة الثانوية",
      icon: <GraduationCap size={32} />,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
  ] as const;

  return (
    <div
      className="flex-1 p-3 lg:p-4 overflow-y-auto scrollbar-hide bg-slate-50/50"
      dir="rtl"
    >
      <div className="max-w-7xl mx-auto space-y-4 pb-20">
        {/* Header removed */}

        {/* View Switch: Stages -> Grades -> Classes */}
        {!selectedStageId ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center px-2 mt-2">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                اختر المرحلة التعليمية
              </h2>
              <div className="h-[2px] flex-1 mx-6 bg-slate-100 rounded-full" />
              {/* Removed تهيئة النظام button per user request */}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {APP_STAGES.filter((stage) => {
                return displayedGrades.some(
                  (g) => (g.stage || "primary") === stage.id,
                );
              }).map((stage) => {
                const stageGrades = displayedGrades.filter(
                  (g) => (g.stage || "primary") === stage.id,
                );
                const stageClasses = data.classes.filter(
                  (c) =>
                    !c.isArchived &&
                    stageGrades.map((g) => g.id).includes(c.gradeId),
                );
                const stageStudents = data.students.filter(
                  (s) =>
                    !s.isArchived &&
                    stageClasses.map((c) => c.id).includes(s.classId),
                );
                const perf = calculateAggregatePerformance(stageClasses);

                return (
                  <button
                    key={stage.id}
                    onClick={() => setSelectedStageId(stage.id)}
                    className="bg-white p-8 rounded-[40px] border-2 border-slate-100 hover:border-indigo-500 shadow-minimal hover:shadow-xl transition-all text-right group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50 group-hover:opacity-100 transition-opacity" />

                    <div className="relative z-10">
                      <div
                        className={`w-16 h-16 rounded-2xl ${stage.bg} ${stage.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}
                      >
                        {stage.id === "kindergarten" && <Baby size={32} />}
                        {stage.id === "primary" && <Layers size={32} />}
                        {stage.id === "middle" && <BookOpen size={32} />}
                        {stage.id === "high" && <GraduationCap size={32} />}
                      </div>

                      <h3 className="text-2xl font-black text-slate-900 mb-2">
                        {stage.name}
                      </h3>
                      <p className="text-slate-500 font-medium mb-8 text-[11px] leading-relaxed">
                        تصفح صفوف وفصول {stage.name}
                      </p>

                      <div className="grid grid-cols-2 gap-4 mb-8">
                        <div>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                            عدد الصفوف
                          </p>
                          <p className="font-black text-lg text-slate-800">
                            {stageGrades.length}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                            إجمالي الطلاب
                          </p>
                          <p className="font-black text-lg text-slate-800">
                            {stageStudents.length}
                          </p>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-[20px] flex items-center justify-between border border-slate-100 group-hover:bg-indigo-50 transition-colors">
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                            مؤشر الإنجاز الكلي
                          </p>
                          <p className="font-black text-indigo-700 text-lg">
                            {perf}%
                          </p>
                        </div>
                        <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm text-indigo-600">
                          <ChevronRight
                            size={16}
                            className="group-hover:-translate-x-1 transition-transform"
                          />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
              {displayedGrades.length === 0 && (
                <div className="col-span-1 lg:col-span-4 text-center py-20 bg-white border border-dashed border-slate-200 rounded-[40px]">
                  <Layers size={48} className="mx-auto text-slate-300 mb-4" />
                  <h3 className="text-xl font-black text-slate-500 mb-2">
                    لا توجد مراحل مسجلة
                  </h3>
                  <p className="text-sm text-slate-400">
                    انتقل لتهيئة النظام لإضافة المراحل والصفوف.
                  </p>
                </div>
              )}
            </div>


          </div>
        ) : !selectedGradeId ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center px-2 mt-4">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                الصفوف الدراسية
              </h2>
              <div className="h-[2px] flex-1 mx-6 bg-slate-100 rounded-full" />
              {/* Removed تهيئة النظام button per user request */}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {displayedGrades
                .filter((g) => (g.stage || "primary") === selectedStageId)
                .map((grade) => {
                  const gradeClasses = data.classes.filter(
                    (c) => !c.isArchived && c.gradeId === grade.id,
                  );
                  const gradeStudents = data.students.filter(
                    (s) =>
                      !s.isArchived &&
                      gradeClasses.map((c) => c.id).includes(s.classId),
                  );
                  const perf = calculateAggregatePerformance(gradeClasses);

                  return (
                    <button
                      key={grade.id}
                      onClick={() => setSelectedGradeId(grade.id)}
                      className="bg-white p-8 rounded-[40px] border-2 border-slate-100 hover:border-indigo-500 shadow-minimal hover:shadow-xl transition-all text-right group relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50 group-hover:opacity-100 transition-opacity" />

                      <div className="relative z-10">
                        <div
                          className={`w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}
                        >
                          <Layers size={32} />
                        </div>

                        <h3 className="text-2xl font-black text-slate-900 mb-2">
                          {grade.name}
                        </h3>
                        <p className="text-slate-500 font-medium mb-8 text-[11px] leading-relaxed">
                          تصفح فصول {grade.name} والمؤشرات التابعة لها.
                        </p>

                        <div className="grid grid-cols-2 gap-4 mb-8">
                          <div>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                              عدد الفصول
                            </p>
                            <p className="font-black text-lg text-slate-800">
                              {gradeClasses.length}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                              إجمالي الطلاب
                            </p>
                            <p className="font-black text-lg text-slate-800">
                              {gradeStudents.length}
                            </p>
                          </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-[20px] flex items-center justify-between border border-slate-100 group-hover:bg-indigo-50 transition-colors">
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                              مؤشر الإنجاز الكلي
                            </p>
                            <p className="font-black text-indigo-700 text-lg">
                              {perf}%
                            </p>
                          </div>
                          <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-sm text-indigo-600">
                            <ChevronRight
                              size={16}
                              className="group-hover:-translate-x-1 transition-transform"
                            />
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-2 mt-2 mb-6 gap-4">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                الصفوف والفصول التابعة
              </h2>
              <div className="h-[2px] hidden sm:block flex-1 mx-6 bg-slate-100 rounded-full" />
            </div>

            {currentGradesToList.length > 0 ? (
              <div className="space-y-10">
                {/* Classes Section */}
                <div>
                  {currentGradesToList.map((grade) => {
                    const gradeClasses = currentClasses.filter(
                      (c) => c.gradeId === grade.id,
                    );

                    return (
                      <div key={grade.id} className="space-y-4 mb-8">
                        <div className="flex items-center gap-3 px-2">
                          <div className="w-1 h-5 bg-indigo-600 rounded-full" />
                          <h3 className="text-lg font-black text-slate-800">
                            {grade.name}
                          </h3>
                          <span className="text-[10px] font-bold text-slate-400 opacity-60">
                            ({gradeClasses.length} فصول)
                          </span>
                        </div>

                        {gradeClasses.length > 0 ? (
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            {gradeClasses.map((cls) => {
                              const clsSubjects = data.subjects.filter(
                                (s) =>
                                  (s.classId === cls.id ||
                                    s.classIds?.includes(cls.id)) &&
                                  !s.isArchived,
                              );
                              const subjectsData = clsSubjects.map((sub) => ({
                                name: sub.name,
                                perf: calculatePerformance(cls.id, sub.id) || 0,
                              }));
                              return (
                                <ClassCard
                                  key={cls.id}
                                  classItem={cls}
                                  subjectsData={subjectsData}
                                  onClick={() => {
                                    onSelectClass(cls);
                                    onNavigate("subjects");
                                  }}
                                />
                              );
                            })}
                          </div>
                        ) : (
                          <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-8 text-center text-slate-400">
                            لا توجد فصول مضافة في هذه المرحلة بعد
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Students List */}
                  <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-minimal">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <Users size={20} className="text-indigo-600" />
                        الطلاب ({currentStudents.length})
                      </h3>
                    </div>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2 scrollbar-hide">
                      {currentStudents.map((st) => {
                        const cls = data.classes.find(
                          (c) => c.id === st.classId,
                        );
                        const grd = data.grades.find(
                          (g) => g.id === cls?.gradeId,
                        );
                        return (
                          <div
                            key={st.id}
                            className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-indigo-50 transition-colors border border-transparent hover:border-indigo-100 group"
                          >
                            <div>
                              <p className="font-black text-slate-800">
                                {st.name}
                              </p>
                              <p className="text-[10px] text-slate-400 font-bold mt-1">
                                {grd?.name} - {cls?.name}
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                onSelectStudent(st);
                                onNavigate("student-profile");
                              }}
                              className="w-8 h-8 rounded-full bg-white text-indigo-600 flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <ArrowLeft size={14} />
                            </button>
                          </div>
                        );
                      })}
                      {currentStudents.length === 0 && (
                        <p className="text-center text-slate-400 py-10">
                          لا يوجد طلاب
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Quizzes List */}
                  <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-minimal">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                        <BrainCircuit size={20} className="text-amber-500" />
                        الاختبارات ({currentQuizzes.length})
                      </h3>
                    </div>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2 scrollbar-hide">
                      {currentQuizzes.map((quiz) => {
                        const grd = data.grades.find(
                          (g) => g.id === quiz.gradeId,
                        );
                        const subjectName =
                          quiz.subjectName ||
                          (quiz.subjectIds && quiz.subjectIds.length > 0
                            ? data.subjects.find((s) =>
                                quiz.subjectIds?.includes(s.id),
                              )?.name
                            : "");
                        return (
                          <div
                            key={quiz.id}
                            onClick={() => onSelectQuiz(quiz, null as any)}
                            className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-transparent cursor-pointer hover:border-indigo-100 hover:bg-white transition-all"
                          >
                            <div>
                              <p className="font-black text-slate-800">
                                {quiz.title}
                              </p>
                              <p className="text-[10px] text-slate-400 font-bold mt-1">
                                مادة: {subjectName} {grd && `• ${grd.name}`}
                              </p>
                            </div>
                            <div className="text-[10px] font-black text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">
                              {quiz.questions.length} أسئلة
                            </div>
                          </div>
                        );
                      })}
                      {currentQuizzes.length === 0 && (
                        <p className="text-center text-slate-400 py-10">
                          لا يوجد اختبارات
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-12 pb-12">
                  {stats.map((stat, i) => {
                    let bgGradient = 'from-indigo-50/70 to-white hover:border-indigo-200 text-indigo-950 shadow-indigo-100/30';
                    if (stat.color.includes('blue')) {
                      bgGradient = 'from-sky-50/70 to-white hover:border-sky-200 text-sky-950 shadow-sky-100/30';
                    } else if (stat.color.includes('emerald') || stat.color.includes('green') || stat.color.includes('success')) {
                      bgGradient = 'from-emerald-50/70 to-white hover:border-emerald-200 text-emerald-950 shadow-emerald-100/30';
                    } else if (stat.color.includes('amber') || stat.color.includes('yellow') || stat.color.includes('warning')) {
                      bgGradient = 'from-amber-50/70 to-white hover:border-amber-200 text-amber-950 shadow-amber-100/30';
                    } else if (stat.color.includes('violet') || stat.color.includes('purple')) {
                      bgGradient = 'from-purple-50/70 to-white hover:border-purple-200 text-purple-950 shadow-purple-100/30';
                    }

                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`p-5 rounded-3xl border border-slate-100 shadow-md bg-gradient-to-br ${bgGradient} flex items-center justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-xl relative overflow-hidden group`}
                      >
                        <div className="space-y-1.5 z-10 text-right">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                            {stat.label}
                          </p>
                          <span className="text-2xl font-black tracking-tight leading-none block text-slate-800">
                            {stat.value}
                          </span>
                        </div>
                        <div className={`w-12 h-12 rounded-2xl bg-white border border-slate-50 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300 z-10 text-indigo-600`}>
                          {React.cloneElement(stat.icon as any, { size: 24, className: stat.color.includes('blue') ? 'text-sky-600' : stat.color.includes('green') ? 'text-emerald-600' : stat.color.includes('amber') ? 'text-amber-500' : stat.color.includes('violet') ? 'text-violet-600' : 'text-indigo-600' })}
                        </div>
                        <div className="absolute -right-2 -bottom-2 w-16 h-16 bg-slate-50/40 rounded-full group-hover:scale-150 transition-all duration-700 pointer-events-none" />
                      </motion.div>
                    );
                  })}
                </div>

                {false && (
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm mb-12">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                        <TrendingUp size={20} className="text-indigo-600" />
                        مؤشرات الأداء للمرحلة
                      </h3>
                    </div>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={performanceByGrade}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={false}
                            stroke="#f1f5f9"
                          />
                          <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{
                              fill: "#94a3b8",
                              fontSize: 10,
                              fontStyle: "bold",
                            }}
                          />
                          <YAxis hide domain={[0, 100]} />
                          <Tooltip
                            cursor={{ fill: "#f8fafc" }}
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-slate-900 text-white text-[10px] font-black px-3 py-2 rounded-xl">
                                    {payload[0].payload.name}:{" "}
                                    {payload[0].value}%
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar
                            dataKey="performance"
                            radius={[6, 6, 6, 6]}
                            barSize={40}
                          >
                            {performanceByGrade.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  entry.performance >= 80
                                    ? "#10b981"
                                    : entry.performance >= 50
                                      ? "#f59e0b"
                                      : "#ef4444"
                                }
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-[40px] border border-slate-200 border-dashed p-12 text-center flex flex-col items-center">
                <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-3xl mb-6 flex items-center justify-center">
                  <Grid3X3 size={32} />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-2">
                  لا توجد فصول مضافة
                </h3>
                <p className="text-slate-400 font-medium text-sm">
                  قم بإضافة الفصول من خلال شاشة الإدارة في إعدادات النظام وتأكد
                  من تسمية الصف بكلمة "ابتدائي" أو "متوسط" أو "ثانوي".
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function QuickActionCard({
  onClick,
  icon,
  title,
  description,
  color,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`bg-white p-4 lg:p-6 rounded-3xl border-2 text-right transition-all group relative overflow-hidden ${color}`}
    >
      <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-slate-50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-sm lg:text-base font-black text-slate-800 mb-1 leading-none">
        {title}
      </h3>
      <p className="text-[10px] text-slate-400 font-medium leading-tight">
        {description}
      </p>
      <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowLeft
          size={16}
          className="text-slate-300 transform translate-x-2 group-hover:translate-x-0 transition-transform"
        />
      </div>
    </button>
  );
}
