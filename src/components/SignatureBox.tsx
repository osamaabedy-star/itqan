import React from 'react';
import { CheckCircle2, AlertCircle, PenTool } from 'lucide-react';
import { motion } from 'framer-motion';

interface SignatureBoxProps {
  isCompleted: boolean;
  onSign: (text?: string) => void;
  signature?: {
    signed: boolean;
    signedAt: string;
    teacherName: string;
    signatureText?: string;
  };
  label: string;
  requirementText: string;
  userName: string;
}

export const SignatureBox: React.FC<SignatureBoxProps> = ({ 
  isCompleted, 
  onSign, 
  signature, 
  label, 
  requirementText,
  userName
}) => {
  if (signature?.signed) {
    return (
      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{label}</p>
            <p className="text-sm font-black text-slate-800">{signature.teacherName}</p>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">تم التوقيع في: {new Date(signature.signedAt).toLocaleString('ar-SA')}</p>
          </div>
        </div>
        {signature.signatureText && (
          <div className="italic text-xs text-emerald-700 font-medium">
            "{signature.signatureText}"
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-2xl border-2 border-dashed transition-all ${isCompleted ? 'bg-indigo-50/50 border-indigo-200' : 'bg-slate-50 border-slate-200 opacity-80'}`}>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-right w-full sm:w-auto">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isCompleted ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-400'}`}>
            <PenTool size={20} />
          </div>
          <div>
            <p className="text-sm font-black text-slate-800">{label}</p>
            <p className={`text-[10px] font-bold flex items-center gap-1 mt-0.5 ${isCompleted ? 'text-indigo-600' : 'text-slate-400'}`}>
              {isCompleted ? (
                <> <CheckCircle2 size={12} /> المتطلبات مكتملة - متاح للتوقيع </>
              ) : (
                <> <AlertCircle size={12} /> {requirementText} </>
              )}
            </p>
          </div>
        </div>
        
        {isCompleted ? (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSign()}
            className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
          >
            <PenTool size={16} />
            توقيع للاطلاع ( {userName} )
          </motion.button>
        ) : (
          <button
            disabled
            className="w-full sm:w-auto px-6 py-2.5 bg-slate-200 text-slate-400 rounded-xl text-xs font-black cursor-not-allowed"
          >
            في انتظار المتطلبات
          </button>
        )}
      </div>
    </div>
  );
};
