import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Book,
  BrainCircuit,
  TrendingUp,
  Award,
  X,
  FileText,
  Calendar,
  ChevronLeft,
  Link,
  ChevronRight,
  BarChart3,
  Clock,
  ExternalLink,
  Star,
  ArrowLeftRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
  LabelList,
} from "recharts";
import { AppData, Teacher, Quiz } from "../types";

interface TeacherProfileProps {
  teacher: Teacher;
  data: AppData;
  calculatePerformance: (classId: string, subjectId?: string) => number;
  onClose: () => void;
  onSelectQuiz: (quiz: Quiz) => void;
}

export function TeacherProfile({
  teacher,
  data,
  calculatePerformance,
  onClose,
  onSelectQuiz,
}: TeacherProfileProps) {
  const teacherSubjects = useMemo(
    () =>
      data.subjects.filter(
        (s) =>
          (s.teacherId === teacher.id || s.teacherIds?.includes(teacher.id)) &&
          !s.isArchived,
      ),
    [data.subjects, teacher.id],
  );

  const teacherQuizzes = useMemo(
    () =>
      data.quizzes.filter((q) => {
        if (q.isArchived) return false;
        const subject =
          q.subjectIds && q.subjectIds.length > 0
            ? data.subjects.find((s) => q.subjectIds?.includes(s.id))
            : null;
        return (
          subject?.teacherId === teacher.id ||
          subject?.teacherIds?.includes(teacher.id)
        );
      }),
    [data.quizzes, data.subjects, teacher.id],
  );

  const teacherVisits = useMemo(
    () =>
      data.visits.filter((v) => v.teacherId === teacher.id && !v.isArchived),
    [data.visits, teacher.id],
  );

  const supervisoryVisits = useMemo(
    () => teacherVisits.filter((v) => v.visitType !== "peer"),
    [teacherVisits],
  );
  const peerVisits = useMemo(
    () => teacherVisits.filter((v) => v.visitType === "peer"),
    [teacherVisits],
  );

  // Overall Performance for teacher
  const stats = useMemo(() => {
    const performances: number[] = [];
    const classStats: any[] = [];

    teacherSubjects.forEach((sub) => {
      const affectedClasses = data.classes.filter(
        (c) =>
          !c.isArchived &&
          c.gradeId === sub.gradeId &&
          (!sub.classIds || sub.classIds.includes(c.id)),
      );
      affectedClasses.forEach((cls) => {
        const perf = calculatePerformance(cls.id, sub.id);
        if (perf !== null && perf > 0) {
          performances.push(perf);
          classStats.push({
            name: `${cls.name} (${sub.name})`,
            shortName: cls.name,
            subject: sub.name,
            perf: perf,
          });
        }
      });
    });

    const avg =
      performances.length > 0
        ? Math.round(
            performances.reduce((a, b) => a + b, 0) / performances.length,
          )
        : 0;

    return { avg, classStats };
  }, [teacherSubjects, data.classes, calculatePerformance]);

  const copyReportLink = () => {
    const link = `${window.location.origin}${window.location.pathname}?teacherReport=${teacher.id}`;
    navigator.clipboard.writeText(link);
    // Standard alert is discouraged in guidelines but sometimes necessary for feedback.
    // We'll use a more subtle way if possible, but keep it simple for now.
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[80] flex items-center justify-center p-4 md:p-12"
      dir="rtl"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white w-full max-w-5xl h-full max-h-[800px] rounded-[32px] shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header Section */}
        <div className="bg-white p-8 pb-6 flex items-center gap-6 relative">
          <button
            onClick={onClose}
            className="absolute top-6 left-6 w-10 h-10 rounded-2xl bg-slate-50 text-slate-400 hover:text-indigo-600 flex items-center justify-center transition-all border border-slate-100 hover:shadow-sm"
          >
            <X size={20} />
          </button>

          <div className="w-24 h-24 rounded-3xl bg-indigo-50 text-indigo-400 border border-indigo-100 flex items-center justify-center shadow-inner overflow-hidden shrink-0">
            {teacher.photoUrl ? (
              <img
                src={teacher.photoUrl}
                alt={teacher.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <User size={40} />
            )}
          </div>

          <div className="flex-1">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              {teacher.name}
            </h2>
            <div className="flex flex-wrap gap-3 mt-3">
              <span className="px-4 py-1.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">
                {teacher.specialization || "عضو هيئة التدريس"}
              </span>
              <span className="px-4 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black border border-slate-200">
                الرمز: #{teacher.id.slice(-6).toUpperCase()}
              </span>
              <button
                onClick={copyReportLink}
                className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black border border-emerald-100 flex items-center gap-2 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
              >
                <Link size={12} /> نسخ رابط التقرير
              </button>
            </div>
          </div>
        </div>

        {/* Content Area (Split) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden border-t border-slate-100">
          {/* Sidebar Analytics */}
          <div className="w-full md:w-80 bg-slate-50 p-6 border-l border-slate-100 flex flex-col gap-8 overflow-y-auto">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-6 flex items-center gap-2">
                <TrendingUp size={14} className="text-indigo-500" /> تحليل
                مؤشرات الأداء
              </p>

              <div className="h-56 w-full mb-6 bg-white rounded-[24px] p-4 shadow-sm border border-slate-100">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.classStats.slice(0, 8)}
                    margin={{ top: 15, right: 0, left: -25, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e2e8f0"
                      opacity={0.5}
                    />
                    <XAxis
                      dataKey="shortName"
                      tick={{ fill: "#64748b", fontSize: 9, fontWeight: 700 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#94a3b8", fontSize: 9, fontWeight: 600 }}
                      axisLine={false}
                      tickLine={false}
                      domain={[0, 100]}
                      ticks={[0, 50, 100]}
                    />
                    <Tooltip
                      cursor={{ fill: "#f8fafc" }}
                      contentStyle={{
                        borderRadius: "16px",
                        border: "1px solid #f1f5f9",
                        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                        fontSize: "10px",
                        fontWeight: 700,
                        textAlign: "right",
                      }}
                      itemStyle={{ fontWeight: 800 }}
                    />
                    <Bar
                      name="الأداء"
                      dataKey="perf"
                      fill="#4f46e5"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={20}
                    >
                      <LabelList
                        dataKey="perf"
                        position="top"
                        fill="#4338ca"
                        style={{ fontSize: "8px", fontWeight: "bold" }}
                      />
                      {stats.classStats.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.perf >= 85
                              ? "#10b981"
                              : entry.perf >= 70
                                ? "#4f46e5"
                                : "#ef4444"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    المواد
                  </p>
                  <p className="text-xl font-black text-indigo-600">
                    {teacherSubjects.length}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    الزيارات
                  </p>
                  <p className="text-xl font-black text-blue-600">
                    {teacherVisits.length}
                  </p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] font-black text-slate-800">
                    المؤشر العام
                  </p>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black border border-emerald-100">
                    {stats.avg}%
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.avg}%` }}
                    className={`h-full rounded-full ${stats.avg >= 85 ? "bg-emerald-500" : stats.avg >= 70 ? "bg-indigo-500" : "bg-rose-500"}`}
                  />
                </div>
                {stats.avg >= 85 && (
                  <div className="mt-4 flex items-center gap-2 p-2 bg-yellow-50 rounded-xl border border-yellow-100">
                    <Star
                      size={12}
                      className="text-yellow-600 fill-yellow-600"
                    />
                    <p className="text-[9px] font-black text-yellow-700">
                      أداء تعليمي متميز
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-auto pointer-events-none">
              <div className="flex items-center gap-3 opacity-30 justify-center">
                <div className="w-1 h-1 rounded-full bg-slate-300" />
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em]">
                  نظام إتقان الأساسي
                </p>
                <div className="w-1 h-1 rounded-full bg-slate-300" />
              </div>
            </div>
          </div>

          {/* Main Display Area */}
          <div className="flex-1 p-8 overflow-y-auto bg-white custom-scrollbar">
            <div className="space-y-12">
              {/* Subjects Section */}
              <section>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-black text-slate-800 flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                    الجدول الدراسي والأنصبة
                  </h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {teacherSubjects.map((sub) => {
                    const grade = data.grades.find((g) => g.id === sub.gradeId);
                    const affectedClasses = data.classes.filter(
                      (c) =>
                        !c.isArchived &&
                        c.gradeId === sub.gradeId &&
                        (!sub.classIds || sub.classIds.includes(c.id)),
                    );

                    return (
                      <div
                        key={sub.id}
                        className="bg-slate-50/50 p-5 rounded-[28px] border border-slate-100 flex flex-col gap-4"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-black text-slate-800 text-sm leading-tight mb-1">
                              {sub.name}
                            </p>
                            <p className="text-[10px] text-slate-400 font-bold">
                              {grade?.name || "مرحلة غير محددة"}
                            </p>
                          </div>
                          <div className="w-10 h-10 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-indigo-500 shadow-sm">
                            <Book size={18} />
                          </div>
                        </div>

                        <div className="space-y-2">
                          {affectedClasses.map((cls) => {
                            const perf = calculatePerformance(cls.id, sub.id);
                            return (
                              <div
                                key={cls.id}
                                className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-100/80"
                              >
                                <div className="flex items-center gap-2">
                                  <div className="w-1 h-1 rounded-full bg-indigo-400" />
                                  <span className="text-[11px] font-black text-slate-600">
                                    {cls.name}
                                  </span>
                                </div>
                                <span
                                  className={`text-[11px] font-black ${perf >= 85 ? "text-emerald-600" : perf >= 70 ? "text-indigo-600" : "text-rose-600"}`}
                                >
                                  {perf}%
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Quizzes & Visits Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Quizzes */}
                <section>
                  <h3 className="text-lg font-black text-slate-800 flex items-center gap-3 mb-6">
                    <div className="w-1.5 h-6 bg-amber-500 rounded-full" />
                    بنك الاختبارات
                  </h3>
                  <div className="space-y-3">
                    {teacherQuizzes.length > 0 ? (
                      teacherQuizzes.map((quiz) => (
                        <button
                          key={quiz.id}
                          onClick={() => onSelectQuiz(quiz)}
                          className="w-full bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between group hover:border-amber-200 hover:shadow-md transition-all text-right"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-1.5xl bg-amber-50 text-amber-500 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all">
                              <BrainCircuit size={18} />
                            </div>
                            <div>
                              <p className="text-xs font-black text-slate-800 group-hover:text-amber-600 transition-colors truncate max-w-[140px]">
                                {quiz.title}
                              </p>
                              <p className="text-[9px] text-slate-400 font-bold">
                                {quiz.subjectName}
                              </p>
                            </div>
                          </div>
                          <ChevronLeft
                            size={16}
                            className="text-slate-200 group-hover:text-amber-500 group-hover:-translate-x-1 transition-all"
                          />
                        </button>
                      ))
                    ) : (
                      <div className="p-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-center">
                        <BrainCircuit
                          size={24}
                          className="mx-auto text-slate-300 mb-2"
                        />
                        <p className="text-[10px] font-black text-slate-400">
                          لا يوجد اختبارات
                        </p>
                      </div>
                    )}
                  </div>
                </section>

                {/* Visits */}
                <div className="space-y-8 animate-in fade-in zoom-in-95 duration-150">
                  <section>
                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-3 mb-6">
                      <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                      الزيارات الإشرافية
                    </h3>
                    <div className="space-y-3">
                      {supervisoryVisits.length > 0 ? (
                        supervisoryVisits.map((visit) => {
                          const evaluationData = visit.evaluationData || {};
                          const totalS = Object.values(evaluationData).reduce(
                            (a: number, b: number) => a + b,
                            0,
                          );
                          const totalM = Object.keys(evaluationData).length * 4;
                          const perc =
                            totalM > 0
                              ? Math.round(((totalS as number) / totalM) * 100)
                              : 0;

                          return (
                            <div
                              key={visit.id}
                              className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between group hover:border-blue-200 transition-all"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-1.5xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0">
                                  <Calendar size={18} />
                                </div>
                                <div>
                                  <p className="text-xs font-black text-slate-800 group-hover:text-blue-600 transition-colors truncate max-w-[140px]">
                                    {visit.supervisorName || "زيارة إشرافية"}
                                  </p>
                                  <p className="text-[9px] text-slate-400 font-bold">
                                    {new Date(visit.date).toLocaleDateString(
                                      "ar-SA",
                                    )}
                                  </p>
                                </div>
                              </div>
                              <div
                                className={`px-2.5 py-1 rounded-lg text-[9px] font-black shadow-sm ${perc >= 85 ? "bg-emerald-500 text-white" : "bg-slate-50 text-slate-400 border border-slate-100"}`}
                              >
                                {perc}%
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-center">
                          <FileText
                            size={24}
                            className="mx-auto text-slate-300 mb-2"
                          />
                          <p className="text-[10px] font-black text-slate-400">
                            لا يوجد زيارات إشرافية مسجلة
                          </p>
                        </div>
                      )}
                    </div>
                  </section>

                  <section>
                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-3 mb-6">
                      <div className="w-1.5 h-6 bg-amber-500 rounded-full" />
                      الزيارات التبادلية (بين المعلمين)
                    </h3>
                    <div className="space-y-3">
                      {peerVisits.length > 0 ? (
                        peerVisits.map((visit) => {
                          const evaluationData = visit.evaluationData || {};
                          const totalS = Object.values(evaluationData).reduce(
                            (a: number, b: number) => a + b,
                            0,
                          );
                          const totalM = Object.keys(evaluationData).length * 4;
                          const perc =
                            totalM > 0
                              ? Math.round(((totalS as number) / totalM) * 100)
                              : 0;

                          return (
                            <div
                              key={visit.id}
                              className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between group hover:border-amber-200 transition-all hover:shadow-sm"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-1.5xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all shrink-0">
                                  <ArrowLeftRight size={18} />
                                </div>
                                <div>
                                  <p className="text-xs font-black text-slate-800 group-hover:text-amber-600 transition-colors truncate max-w-[140px]">
                                    {visit.supervisorName ? `الزائر: ${visit.supervisorName}` : "معلم زائر"}
                                  </p>
                                  <p className="text-[9px] text-slate-400 font-bold">
                                    {new Date(visit.date).toLocaleDateString(
                                      "ar-SA",
                                    )}
                                  </p>
                                </div>
                              </div>
                              <div
                                className={`px-2.5 py-1 rounded-lg text-[9px] font-black shadow-sm ${perc >= 85 ? "bg-amber-500 text-white" : "bg-slate-50 text-slate-400 border border-slate-100"}`}
                              >
                                {perc}%
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="relative p-8 md:p-10 bg-gradient-to-br from-amber-500/5 via-amber-500/[0.01] to-transparent rounded-[2.5rem] border border-amber-500/20 text-center space-y-4 shadow-sm max-w-sm mx-auto overflow-hidden">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
                          <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-600 mx-auto border border-amber-200/40 shadow-inner">
                            <ArrowLeftRight size={24} className="animate-pulse" />
                          </div>
                          <div className="space-y-1.5">
                            <h4 className="font-extrabold text-[#7a1c22] text-xs">مجتمعات التعلّم المهنية</h4>
                            <p className="text-[10px] leading-relaxed text-slate-500 font-medium">
                              لا توجد سجلات زيارات تبادلية مرصودة حالياً. تعزّز الزيارات المتبادلة بين المعلمين تبادل مهارات الإبداع واستراتيجيات الصف الفعالة.
                            </p>
                          </div>
                          <div className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-700 text-[9px] font-black px-2.5 py-1 rounded-full border border-amber-500/20">
                            <span className="w-1 h-1 rounded-full bg-amber-500 animate-ping" />
                            <span>بانتظار رصد أول زيارة صفية</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
