import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppData, Evaluations, Visit, Teacher, Class, Student } from '../types';
import { firestoreService } from '../services/firestoreService';
import { Focus, Plus, Calendar, Save, Trash2, Edit2, Users, X } from 'lucide-react';
import { ConfirmationModal } from './ui/ConfirmationModal';

interface VisitsProps {
  data: AppData;
  evaluations: Evaluations;
  academicYear: string;
  activeTerm: 'term1' | 'term2';
}

const SCORE_LABELS: Record<number, string> = {
  4: 'متميز',
  3: 'جيد جداً',
  2: 'جيد',
  1: 'يحتاج تطوير'
};

export function Visits({ data, evaluations, academicYear, activeTerm }: VisitsProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Form State
  const [targetTeacherId, setTargetTeacherId] = useState('');
  const [targetClassId, setTargetClassId] = useState('');
  const [selectedRubricId, setSelectedRubricId] = useState('');
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [supervisorName, setSupervisorName] = useState('');
  const [notes, setNotes] = useState('');
  const [lessonPeriod, setLessonPeriod] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [lessonTitle, setLessonTitle] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentQuizScores, setStudentQuizScores] = useState<Record<string, number>>({});
  const [quizText, setQuizText] = useState('');
  const [quizMaxScore, setQuizMaxScore] = useState<number>(10);
  const [quizType, setQuizType] = useState<'text' | 'app_quiz' | 'external_url'>('text');
  const [quizId, setQuizId] = useState('');
  const [quizUrl, setQuizUrl] = useState('');
  const [evaluationData, setEvaluationData] = useState<Record<string, number>>({});

  const handleScoreChange = (studentId: string, score: number) => {
    setStudentQuizScores(prev => ({ ...prev, [studentId]: score }));
  };

  const handleSave = async () => {
    if (!targetTeacherId || !visitDate || !subjectId || !lessonPeriod || !lessonTitle || !targetClassId) {
      alert('يجب تعبئة المعلم، تاريخ الزيارة، المادة، الحصة، عنوان الدرس، وتحديد الفصل');
      return;
    }
    
    const id = editingId || 'visit_' + Date.now();
    await firestoreService.saveItem('visits', id, {
      term: activeTerm,
      teacherId: targetTeacherId,
      rubricId: selectedRubricId,
      date: visitDate,
      notes,
      lessonPeriod,
      subjectId,
      lessonTitle,
      supervisorName,
      selectedStudentIds,
      studentQuizScores,
      quizText,
      quizMaxScore,
      quizType,
      quizId,
      quizUrl,
      evaluationData,
      isArchived: false,
      targetClassId
    });
    
    setIsAdding(false);
    resetForm();
  };

  const resetForm = () => {
    setEditingId(null);
    setTargetTeacherId('');
    setTargetClassId('');
    setSelectedRubricId('');
    setVisitDate(new Date().toISOString().split('T')[0]);
    setSupervisorName('');
    setNotes('');
    setLessonPeriod('');
    setSubjectId('');
    setLessonTitle('');
    setSelectedStudentIds([]);
    setStudentQuizScores({});
    setQuizText('');
    setQuizMaxScore(10);
    setQuizType('text');
    setQuizId('');
    setQuizUrl('');
    setEvaluationData({});
  };

  const handleEdit = (visit: Visit) => {
    setEditingId(visit.id);
    setTargetTeacherId(visit.teacherId);
    setTargetClassId(visit.targetClassId || '');
    setSelectedRubricId(visit.rubricId || '');
    setVisitDate(visit.date);
    setNotes(visit.notes || '');
    setLessonPeriod(visit.lessonPeriod || '');
    setSubjectId(visit.subjectId || '');
    setLessonTitle(visit.lessonTitle || '');
    setSupervisorName(visit.supervisorName || '');
    setSelectedStudentIds(visit.selectedStudentIds || []);
    setStudentQuizScores(visit.studentQuizScores || {});
    setQuizText(visit.quizText || '');
    setQuizMaxScore(visit.quizMaxScore || 10);
    setQuizType(visit.quizId ? 'app_quiz' : visit.quizUrl ? 'external_url' : 'text');
    setQuizId(visit.quizId || '');
    setQuizUrl(visit.quizUrl || '');
    setEvaluationData(visit.evaluationData || {});
    setIsAdding(true);
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await firestoreService.deleteItem('visits', deleteConfirmId);
      if (selectedVisitId === deleteConfirmId) setSelectedVisitId(null);
      setDeleteConfirmId(null);
    } catch (error) {
      console.error("Error deleting visit:", error);
      alert("حدث خطأ أثناء الحذف.");
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto p-4 md:p-6 pb-32">
       <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex justify-between items-center bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                   <Focus size={24} />
                </div>
                <div>
                   <h1 className="text-xl font-black text-slate-800">الزيارات الإشرافية</h1>
                   <p className="text-xs font-bold text-slate-500">سجل وتتبع وتقييم المعلمين مع اختيار طلاب لتقييمهم</p>
                </div>
             </div>
             
             {!isAdding && (
               <button 
                 onClick={() => setIsAdding(true)}
                 className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 hover:bg-indigo-700 transition-colors"
               >
                 <Plus size={18} /> تسجيل زيارة جديدة
               </button>
             )}
          </div>
          
          {isAdding && (
            <div className="bg-white p-6 md:p-8 rounded-[32px] shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-4">
               <h2 className="text-lg font-black mb-5">{editingId ? 'تعديل الزيارة' : 'تسجيل زيارة إشرافية'}</h2>
               
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-5 w-full">
                  <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">اسم المعلم المزار</label>
                  <select 
                    value={targetTeacherId}
                    onChange={(e) => {
                      setTargetTeacherId(e.target.value);
                      setTargetClassId('');
                      setSelectedStudentIds([]);
                    }}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                     <option value="">اختر المعلم...</option>
                     {data.teachers.filter(t => !t.isArchived).map(t => (
                       <option key={t.id} value={t.id}>{t.name}</option>
                     ))}
                  </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">تاريخ الزيارة</label>
                    <input 
                      type="date"
                      value={visitDate}
                      onChange={(e) => setVisitDate(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">اسم المشرف (اختياري)</label>
                    <input 
                      type="text"
                      value={supervisorName}
                      onChange={(e) => setSupervisorName(e.target.value)}
                      placeholder="اسم المشرف / القائد"
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">الحصة</label>
                    <input 
                      type="text"
                      value={lessonPeriod}
                      onChange={(e) => setLessonPeriod(e.target.value)}
                      placeholder="مثال: الحصة الأولى"
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">المادة</label>
                    <select 
                      value={subjectId}
                      onChange={(e) => setSubjectId(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                       <option value="">اختر المادة...</option>
                       {data.subjects.filter(s => !s.isArchived && (!targetTeacherId || s.teacherId === targetTeacherId || s.teacherIds?.includes(targetTeacherId))).map(s => (
                         <option key={s.id} value={s.id}>{s.name}</option>
                       ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">عنوان الدرس</label>
                    <input 
                      type="text"
                      value={lessonTitle}
                      onChange={(e) => setLessonTitle(e.target.value)}
                      placeholder="عنوان الدرس..."
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">نموذج التقويم</label>
                    <select 
                      value={selectedRubricId}
                      onChange={(e) => {
                        setSelectedRubricId(e.target.value);
                        setEvaluationData({});
                      }}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                       <option value="">اختر نموذجاً...</option>
                       {data.rubrics?.filter(r => !r.isArchived).map(r => (
                         <option key={r.id} value={r.id}>{r.name}</option>
                       ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">تحديد فصل (اختياري)</label>
                    <select 
                      value={targetClassId}
                      onChange={(e) => {
                         setTargetClassId(e.target.value);
                         setSelectedStudentIds([]);
                      }}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                       <option value="">اختر فصل...</option>
                       {data.classes.filter(c => {
                          if (c.isArchived) return false;
                          if (!targetTeacherId) return true;
                          const teacherClasses = new Set<string>();
                          data.subjects.forEach(s => {
                            if (s.teacherId === targetTeacherId || s.teacherIds?.includes(targetTeacherId)) {
                              if (s.classIds) s.classIds.forEach(id => teacherClasses.add(id));
                              if (s.classId) teacherClasses.add(s.classId);
                            }
                          });
                          return teacherClasses.has(c.id);
                       }).map(c => (
                         <option key={c.id} value={c.id}>فصل {c.name}</option>
                       ))}
                    </select>
                  </div>
               </div>
               
               {targetClassId && (
                 <div className="mb-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                    <p className="font-black text-slate-700 mb-4">اختيار الطلاب للاختبار القصير</p>
                    <div className="flex flex-wrap gap-2 mb-6">
                       {data.students.filter(s => !s.isArchived && s.classId === targetClassId).map(s => {
                          const isSelected = selectedStudentIds.includes(s.id);
                          return (
                            <button
                               key={s.id}
                               onClick={() => setSelectedStudentIds(prev => isSelected ? prev.filter(id => id !== s.id) : [...prev, s.id])}
                               className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${isSelected ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'}`}
                            >
                               {s.name}
                            </button>
                          );
                       })}
                    </div>

                    {selectedStudentIds.length > 0 && (
                      <div className="space-y-4 pt-4 border-t border-slate-200 cursor-default">
                         <div className="flex gap-4 mb-4">
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                               <input type="radio" name="quizType" checked={quizType === 'text'} onChange={() => setQuizType('text')} className="accent-indigo-600" />
                               نص سؤال مباشر
                            </label>
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                               <input type="radio" name="quizType" checked={quizType === 'app_quiz'} onChange={() => setQuizType('app_quiz')} className="accent-indigo-600" />
                               اختبار من المنصة
                            </label>
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                               <input type="radio" name="quizType" checked={quizType === 'external_url'} onChange={() => setQuizType('external_url')} className="accent-indigo-600" />
                               رابط إلكتروني سريع
                            </label>
                         </div>
                         
                         {quizType === 'text' && (
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">سؤال الاختبار القصير</label>
                                <input 
                                  type="text"
                                  value={quizText}
                                  onChange={(e) => setQuizText(e.target.value)}
                                  placeholder="اكتب سؤال الاختبار القصير هنا..."
                                  className="w-full text-xs bg-white border border-slate-200 rounded-md px-2.5 py-1.5 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                             </div>
                             <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">الدرجة العظمى</label>
                                <input 
                                  type="number"
                                  value={quizMaxScore}
                                  onChange={(e) => setQuizMaxScore(Number(e.target.value))}
                                  className="w-full text-xs bg-white border border-slate-200 rounded-md px-2.5 py-1.5 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                             </div>
                           </div>
                         )}

                         {quizType === 'app_quiz' && (
                            <div>
                               <label className="block text-xs font-bold text-slate-500 mb-1">اختر الاختبار من المنصة</label>
                               <select
                                 value={quizId}
                                 onChange={(e) => setQuizId(e.target.value)}
                                 className="w-full text-xs bg-white border border-slate-200 rounded-md px-2.5 py-1.5 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                               >
                                  <option value="">-- اختر اختباراً --</option>
                                  {data.quizzes.filter(q => !q.isArchived).map(q => (
                                     <option key={q.id} value={q.id}>{q.title}</option>
                                  ))}
                               </select>
                            </div>
                         )}

                         {quizType === 'external_url' && (
                            <div>
                               <label className="block text-xs font-bold text-slate-500 mb-1">رابط الاختبار الإلكتروني (Google Forms, Microsoft Forms...)</label>
                               <input 
                                  type="url"
                                  value={quizUrl}
                                  onChange={(e) => setQuizUrl(e.target.value)}
                                  placeholder="https://..."
                                  className="w-full text-xs bg-white border border-slate-200 rounded-md px-2.5 py-1.5 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                               />
                            </div>
                         )}

                         <div className="space-y-2 mt-4">
                            <p className="font-bold text-slate-700 mb-2 text-sm">درجات الطلاب:</p>
                            {selectedStudentIds.map(studentId => {
                               const student = data.students.find(s => s.id === studentId);
                               return (
                                 <div key={studentId} className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
                                    <span className="flex-1 font-black text-sm">{student?.name}</span>
                                    <input 
                                       type="number"
                                       value={studentQuizScores[studentId] || ''}
                                       onChange={(e) => handleScoreChange(studentId, Number(e.target.value))}
                                       max={quizMaxScore}
                                       min={0}
                                       className="w-20 text-center text-sm bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                       placeholder="الدرجة"
                                    />
                                 </div>
                               );
                            })}
                         </div>
                      </div>
                    )}
                 </div>
               )}

               <div className="mb-6 space-y-4">
                 {selectedRubricId && data.rubrics?.find(r => r.id === selectedRubricId)?.categories.map(category => (
                   <div key={category.id} className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-sm">
                      <h3 className="text-sm md:text-base font-black text-indigo-900 mb-4 flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-indigo-600 rounded-full" />
                        {category.title}
                      </h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                         {category.items.map(item => (
                           <div key={item.id} className="flex flex-col gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                              <span className="font-black text-slate-800 text-xs">{item.title}</span>
                              <div className="flex gap-1.5 w-full">
                                {[4, 3, 2, 1].map(score => (
                                  <button
                                    key={score}
                                    onClick={() => setEvaluationData(prev => ({ ...prev, [item.id]: score }))}
                                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all border ${
                                      evaluationData[item.id] === score 
                                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                                    }`}
                                  >
                                    {SCORE_LABELS[score]}
                                  </button>
                                ))}
                              </div>
                           </div>
                         ))}
                      </div>
                   </div>
                 ))}
               </div>
               
               <div className="mb-6">
                 <label className="block text-xs font-bold text-slate-500 mb-1">ملاحظات والتوصيات</label>
                 <textarea 
                   value={notes}
                   onChange={e => setNotes(e.target.value)}
                   rows={3}
                   className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                 />
               </div>
               
               <div className="flex gap-3">
                 <button 
                   onClick={handleSave}
                   className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-black md:text-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-sm"
                 >
                   <Save size={18} /> {editingId ? 'حفظ التعديلات' : 'اعتماد الزيارة'}
                 </button>
                 <button 
                   onClick={() => { setIsAdding(false); resetForm(); }}
                   className="px-6 bg-slate-100 text-slate-600 rounded-xl font-black hover:bg-slate-200 transition-colors text-sm md:text-base shadow-sm"
                 >
                   إلغاء
                 </button>
               </div>
            </div>
          )}
          
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
             {data.visits?.filter(v => !v.isArchived && (v.term || 'term1') === activeTerm).map(visit => {
                const teacher = data.teachers.find(t => t.id === visit.teacherId);
                const students = data.students.filter(s => visit.selectedStudentIds?.includes(s.id));
                
                // Calculate overall score for badge
                let totalScore = 0;
                let totalMax = 0;
                Object.values(visit.evaluationData || {}).forEach(score => {
                  totalScore += score;
                  totalMax += 4;
                });
                const totalPercentage = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

                return (
                    <div 
                      key={visit.id} 
                      onClick={() => setSelectedVisitId(visit.id)}
                      className="bg-white rounded-[24px] shadow-sm border border-slate-200 flex flex-col justify-between hover:shadow-md hover:border-indigo-100 transition-all overflow-hidden group cursor-pointer"
                    >
                     <div className="p-5">
                        <div className="flex justify-between items-start mb-4">
                           <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-[12px] bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                               <Users size={20} />
                             </div>
                             <div>
                               <h3 className="font-black text-sm md:text-base text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">{teacher?.name || 'معلم غير معروف'}</h3>
                               <p className="text-[10px] font-black text-slate-400 flex items-center gap-1 mt-1"><Calendar size={12} className="text-indigo-400"/> {new Date(visit.date).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                             </div>
                           </div>
                           
                           <div className={`px-2.5 py-1 rounded-full text-[9px] font-black shadow-sm ${
                             totalPercentage >= 90 ? 'bg-emerald-500 text-white' :
                             totalPercentage >= 75 ? 'bg-sky-500 text-white' :
                             totalPercentage >= 50 ? 'bg-amber-500 text-white' :
                             'bg-rose-500 text-white'
                           }`}>
                              {totalPercentage}% {totalPercentage >= 90 ? 'متميز' : totalPercentage >= 75 ? 'جيد جداً' : totalPercentage >= 50 ? 'متوسط' : 'يحتاج تطوير'}
                           </div>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-wrap gap-2">
                            {visit.supervisorName && (
                              <div className="bg-indigo-50 text-indigo-700 text-[10px] font-black px-2.5 py-1 rounded-md max-w-full">
                                 <span className="truncate">بواسطة: {visit.supervisorName}</span>
                              </div>
                            )}
                            {visit.rubricId && (
                               <div className="bg-amber-50 text-amber-700 text-[10px] font-black px-2.5 py-1 rounded-md max-w-full">
                                  <span className="truncate">{data.rubrics?.find(r => r.id === visit.rubricId)?.name || 'غير معروف'}</span>
                               </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 mt-2">
                             <div className="flex items-center gap-1">
                                <Users size={12} /> {students.length} طلاب
                             </div>
                             {(visit.quizUrl || visit.quizId || visit.quizText) && (
                                <div className="flex items-center gap-1 text-emerald-600">
                                   <div className="w-1 h-1 rounded-full bg-emerald-500" /> اختبار
                                </div>
                             )}
                          </div>
                        </div>
                     </div>
                  </div>
                );
             })}
          </div>

          <AnimatePresence>
            {selectedVisitId && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
                onClick={() => setSelectedVisitId(null)}
              >
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                  onClick={e => e.stopPropagation()}
                >
                  {(() => {
                    const visit = data.visits?.find(v => v.id === selectedVisitId);
                    if (!visit) return null;
                    const teacher = data.teachers.find(t => t.id === visit.teacherId);
                    const students = data.students.filter(s => visit.selectedStudentIds?.includes(s.id));
                    
                    let totalScore = 0; let totalMax = 0;
                    Object.values(visit.evaluationData || {}).forEach(score => { totalScore += score; totalMax += 4; });
                    const totalPercentage = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

                    return (
                      <div className="p-6 md:p-8">
                         <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-4">
                              <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
                                <Users size={28} />
                              </div>
                              <div>
                                <h2 className="font-black text-xl text-slate-800 leading-tight">{teacher?.name || 'معلم غير معروف'}</h2>
                                <p className="text-[11px] font-black text-slate-400 mt-1">{new Date(visit.date).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <div className="flex items-center gap-1.5">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setSelectedVisitId(null); handleEdit(visit); }} 
                                  className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-slate-100"
                                >
                                  <Edit2 size={16}/>
                                </button>
                                <button 
                                  onClick={(e) => handleDelete(visit.id, e)} 
                                  className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 transition-all border border-slate-100"
                                >
                                  <Trash2 size={16}/>
                                </button>
                              </div>
                              <button onClick={() => setSelectedVisitId(null)} className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition-colors">
                                <X size={20} />
                              </button>
                            </div>
                         </div>

                         <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                           <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                             <div className="text-[10px] font-bold text-slate-400 mb-1">نسبة التقييم</div>
                             <div className={`text-lg font-black ${totalPercentage >= 90 ? 'text-emerald-500' : totalPercentage >= 75 ? 'text-sky-500' : totalPercentage >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>{totalPercentage}%</div>
                           </div>
                           <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                             <div className="text-[10px] font-bold text-slate-400 mb-1">المادة</div>
                             <div className="text-sm font-black text-slate-700 truncate">{data.subjects.find(s => s.id === visit.subjectId)?.name || 'غير محدد'}</div>
                           </div>
                           <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                             <div className="text-[10px] font-bold text-slate-400 mb-1">الحصة</div>
                             <div className="text-sm font-black text-slate-700 truncate">{visit.lessonPeriod || 'غير محدد'}</div>
                           </div>
                           <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                             <div className="text-[10px] font-bold text-slate-400 mb-1">المشرف</div>
                             <div className="text-sm font-black text-slate-700 truncate">{visit.supervisorName || 'غير محدد'}</div>
                           </div>
                         </div>

                         {visit.notes && (
                           <div className="mb-6">
                             <div className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest flex items-center gap-1.5">
                                <div className="w-4 h-[1px] bg-slate-200" /> 
                                الملحوظات والتوصيات
                             </div>
                             <div className="text-sm font-medium text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                {visit.notes}
                             </div>
                           </div>
                         )}

                         {visit.evaluationData && Object.keys(visit.evaluationData).length > 0 && (
                          <div className="mb-6 space-y-3">
                             <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                <div className="w-4 h-[1px] bg-slate-200" />
                                التقييم الفني
                             </div>
                             <div className="grid gap-3 sm:grid-cols-2">
                               {data.rubrics?.find(r => r.id === visit.rubricId)?.categories.map(category => {
                                 let catScore = 0; let catMax = 0;
                                 category.items.forEach(item => { if (visit.evaluationData?.[item.id]) { catScore += visit.evaluationData[item.id]; catMax += 4; } });
                                 if (catMax === 0) return null;
                                 const percentage = Math.round((catScore / catMax) * 100);
                                 return (
                                   <div key={category.id} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between gap-3">
                                      <span className="text-xs font-black text-slate-700 flex-1 truncate">{category.title}</span>
                                      <div className="flex items-center gap-2">
                                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden shrink-0">
                                          <div className={`h-full rounded-full ${percentage >= 80 ? 'bg-emerald-500' : percentage >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${percentage}%` }} />
                                        </div>
                                        <span className={`text-[10px] font-black w-8 text-left ${percentage >= 80 ? 'text-emerald-600' : percentage >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{percentage}%</span>
                                      </div>
                                   </div>
                                 );
                               })}
                             </div>
                          </div>
                         )}

                         {(visit.quizUrl || visit.quizId || visit.quizText || students.length > 0) && (
                           <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-100">
                              <p className="text-[11px] font-black text-slate-500 mb-4 flex items-center gap-1.5">
                                <Users size={14} className="text-indigo-400" /> 
                                الطلاب المستهدفين ({students.length}) والتقييم السريع
                              </p>
                              
                              {(visit.quizUrl || visit.quizId || visit.quizText) && (
                                <div className="bg-white rounded-xl p-3 mb-4 shadow-sm border border-slate-100">
                                   <div className="text-[10px] font-bold text-slate-400 mb-1">الاختبار / التطبيق:</div>
                                   {visit.quizUrl ? (
                                      <a href={visit.quizUrl} target="_blank" rel="noreferrer" className="text-sm font-black text-indigo-600 hover:underline break-all">{visit.quizUrl}</a>
                                   ) : visit.quizId ? (
                                      <div className="text-sm font-black text-slate-700">{data.quizzes.find(q => q.id === visit.quizId)?.title || 'اختبار غير معروف'}</div>
                                   ) : (
                                      <div className="text-sm font-black text-slate-700">{visit.quizText}</div>
                                   )}
                                </div>
                              )}

                              {students.length > 0 && (
                                <div className="flex flex-col gap-2">
                                  {students.map(s => {
                                    const score = visit.studentQuizScores?.[s.id];
                                    return (
                                      <div key={s.id} className="bg-white flex items-center justify-between px-4 py-2.5 rounded-xl border border-slate-100 shadow-sm">
                                        <div className="flex items-center gap-2">
                                          <div className={`w-2 h-2 rounded-full ${score !== undefined ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                          <span className="text-xs sm:text-sm font-black text-slate-800">{s.name}</span>
                                        </div>
                                        {score !== undefined ? (
                                          <div className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                                            {score} / {visit.quizMaxScore || 10}
                                          </div>
                                        ) : (
                                          <div className="text-[10px] font-bold text-slate-400">لم يقيم</div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                           </div>
                         )}

                      </div>
                    );
                  })()}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
       </div>
       <ConfirmationModal
          isOpen={deleteConfirmId !== null}
          title="حذف الزيارة"
          message="هل أنت متأكد من حذف الزيارة نهائياً؟ هذا الإجراء لا يمكن التراجع عنه وسيتم إزالة كافة التقييمات المرتبطة بهذه الزيارة."
          confirmLabel="حذف نهائي"
          cancelLabel="إلغاء"
          onCancel={() => setDeleteConfirmId(null)}
          onConfirm={confirmDelete}
          isDestructive={true}
       />
    </div>
  );
}
