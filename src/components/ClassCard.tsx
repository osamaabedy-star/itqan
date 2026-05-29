import React from 'react';
import { motion } from 'framer-motion';
import { Users, Smile, Meh, Frown } from 'lucide-react';
import { Class } from '../types';

interface ClassCardProps {
  classItem: Class;
  subjectsData?: { name: string; perf: number }[];
  onClick: () => void;
}

export const ClassCard: React.FC<ClassCardProps> = ({ classItem, subjectsData = [], onClick }) => {
  return (
    <motion.button
      whileHover={{ y: -6, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all text-right w-full flex flex-col justify-between min-h-[180px] relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50/80 rounded-bl-[100px] -mr-8 -mt-8 group-hover:bg-indigo-50/50 transition-colors duration-500 z-0" />
      
      <div className="relative z-10 w-full mb-4">
        <div className="flex justify-between items-center w-full mb-2">
          <div className="bg-slate-100 p-2.5 rounded-2xl group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
            <Users size={18} />
          </div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-indigo-400 transition-colors">فصل دراسي</span>
        </div>
        <h3 className="text-lg font-black text-slate-800 tracking-tight truncate">{classItem.name}</h3>
      </div>

      <div className="relative z-10 w-full mt-auto pt-4 border-t border-slate-100/50 flex flex-wrap items-center justify-start gap-4">
        {subjectsData.length > 0 ? (
          subjectsData.map((sub, i) => {
            const PerformanceIcon = sub.perf >= 90 ? Smile : sub.perf >= 75 ? Smile : sub.perf >= 50 ? Meh : Frown;
            const colorClass = sub.perf >= 75 ? 'text-emerald-500 bg-emerald-50 border-emerald-100' : sub.perf >= 50 ? 'text-amber-500 bg-amber-50 border-amber-100' : 'text-rose-500 bg-rose-50 border-rose-100';
            
            return (
              <motion.div 
                key={i} 
                className="flex flex-col items-center gap-1 group/sub"
              >
                <span className="text-[10px] font-black text-slate-600 truncate max-w-[60px] text-center group-hover/sub:text-indigo-600 transition-colors">
                  {sub.name}
                </span>
                <div className={`w-10 h-10 rounded-xl border-2 ${colorClass} transition-all duration-300 group-hover/sub:scale-110 shadow-sm flex items-center justify-center`}>
                  <PerformanceIcon size={18} strokeWidth={2.5} />
                </div>
                <span className="text-[9px] font-bold text-slate-400">
                  {Math.round(sub.perf)}%
                </span>
              </motion.div>
            );
          })
        ) : (
          <div className="w-full text-center text-[11px] text-slate-300 font-medium py-4">لاتوجد بيانات رصد</div>
        )}
      </div>
    </motion.button>
  );
};
