import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ShieldAlert, ShieldX, Save, X, MessageSquare } from 'lucide-react';
import { Skill, EvaluationScore } from '../../types';
import { firestoreService } from '../../services/firestoreService';

interface QuickEvalDialogProps {
  studentId: string;
  skill: Skill;
  initialScore?: EvaluationScore;
  initialNote?: string;
  academicYear: string;
  onClose: () => void;
}

export function QuickEvalDialog({ studentId, skill, initialScore, initialNote = '', academicYear, onClose }: QuickEvalDialogProps) {
  const [score, setScore] = useState<EvaluationScore | null>(initialScore || null);
  const [note, setNote] = useState(initialNote);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!score) return;
    setIsSaving(true);
    try {
      await firestoreService.saveEvaluation(studentId, skill.id, score, note, academicYear);
      onClose();
    } catch (err) {
      console.error('Error saving evaluation:', err);
      alert('حدث خطأ أثناء حفظ التقييم');
    } finally {
      setIsSaving(false);
    }
  };

  const scores: { value: EvaluationScore; label: string; icon: React.ReactNode; color: string }[] = [
    { value: 'mastered', label: 'متقن ✅', icon: <ShieldCheck size={20} />, color: 'bg-green-500' },
    { value: 'advanced', label: 'متقدم 🚀', icon: <ShieldCheck size={20} />, color: 'bg-blue-500' },
    { value: 'accepted', label: 'مقبول ⚠️', icon: <ShieldAlert size={20} />, color: 'bg-amber-500' },
    { value: 'weak', label: 'ضعيف 🛡️', icon: <ShieldAlert size={20} />, color: 'bg-orange-500' },
    { value: 'very-weak', label: 'ضعيف جداً ❌', icon: <ShieldX size={20} />, color: 'bg-red-500' }
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-md rounded-[24px] shadow-2xl overflow-y-auto max-h-[95vh] md:max-h-[90vh]"
      >
        <div className="p-6 md:p-8 space-y-5 md:space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-xl font-black text-slate-800">تقييم سريع للمهارة</h3>
              <p className="text-sm text-slate-500 font-bold mt-1 text-indigo-600">{skill.name}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <X size={20} className="text-slate-400" />
            </button>
          </div>

          <div className="space-y-3 md:space-y-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">اختر مستوى الإتقان</p>
            <div className="grid grid-cols-1 gap-2.5 md:gap-3">
              {scores.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setScore(s.value)}
                  className={`flex items-center justify-between p-3 md:p-4 rounded-xl md:rounded-2xl border-2 transition-all ${
                    score === s.value 
                      ? `border-indigo-600 bg-indigo-50 shadow-md` 
                      : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center text-white ${s.color}`}>
                      {s.icon}
                    </div>
                    <span className="font-black text-sm md:text-base text-slate-700">{s.label}</span>
                  </div>
                  {score === s.value && <div className="w-4 h-4 rounded-full bg-indigo-600 border-4 border-white shadow-sm" />}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 max-h-32 md:max-h-none">
            <div className="flex items-center gap-2 text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest">
              <MessageSquare size={12} className="md:w-[14px] md:h-[14px]" />
              <span>ملاحظات إضافية (اختياري)</span>
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="اكتب ملاحظاتك هنا..."
              className="w-full p-3 md:p-4 rounded-xl border-2 border-slate-100 focus:border-indigo-600 outline-none min-h-[80px] md:min-h-[100px] text-xs md:text-sm font-bold text-slate-700 placeholder-slate-400 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={!score || isSaving}
              className="flex-1 bg-indigo-600 text-white font-black py-3 md:py-4 rounded-xl md:rounded-2xl flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50 disabled:shadow-none text-sm md:text-base"
            >
              {isSaving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={18} />
                  حفظ التقييم
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="px-6 border-2 border-slate-100 text-slate-400 font-bold rounded-2xl hover:bg-slate-50 transition-all"
            >
              إلغاء
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
