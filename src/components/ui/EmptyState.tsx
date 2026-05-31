import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  colorClass?: string;
  bgClass?: string;
}

export function EmptyState({ icon: Icon, title, description, colorClass = "text-slate-400", bgClass = "bg-slate-50" }: EmptyStateProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center p-12 text-center"
    >
      <div className={`w-20 h-20 rounded-3xl ${bgClass} ${colorClass} flex items-center justify-center mb-6 shadow-sm border border-slate-100/50 relative overflow-hidden group`}>
        <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-current"></div>
        <Icon size={32} strokeWidth={1.5} className="relative z-10 transition-transform group-hover:scale-110 duration-500 ease-out" />
      </div>
      <h4 className="text-lg font-black text-slate-800 mb-2 tracking-tight">{title}</h4>
      <p className="text-sm text-slate-400 font-medium max-w-sm leading-relaxed">{description}</p>
    </motion.div>
  );
}
