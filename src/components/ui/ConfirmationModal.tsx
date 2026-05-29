import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export function ConfirmationModal({ 
  isOpen, 
  title, 
  message, 
  confirmLabel, 
  cancelLabel, 
  onConfirm, 
  onCancel,
  isDestructive = true
}: ConfirmationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" dir="rtl">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white w-full max-w-md rounded-[32px] p-8 shadow-2xl overflow-hidden border border-slate-100"
          >
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${isDestructive ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
              <AlertTriangle size={32} />
            </div>

            <h3 className="text-2xl font-black text-slate-900 mb-3">{title}</h3>
            <p className="text-slate-500 font-medium leading-relaxed mb-8">
              {message}
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={onConfirm}
                className={`flex-1 h-14 rounded-2xl font-black text-white transition-all shadow-lg ${isDestructive ? 'bg-red-600 hover:bg-red-700 shadow-red-100' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'}`}
              >
                {confirmLabel}
              </button>
              <button
                onClick={onCancel}
                className="flex-1 h-14 rounded-2xl font-black text-slate-400 bg-slate-50 hover:bg-slate-100 transition-all"
              >
                {cancelLabel}
              </button>
            </div>

            <button 
              onClick={onCancel}
              className="absolute top-6 left-6 text-slate-300 hover:text-slate-500 transition-colors"
            >
              <X size={20} />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
