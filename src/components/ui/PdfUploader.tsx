import React, { useRef, useState } from 'react';
import { Upload, X, FileText, AlertCircle, RefreshCw } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Use a CDN for the worker to avoid Vite bundling issues
const pdfjsVersion = '4.10.38'; // or latest
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.mjs`;

interface PdfUploaderProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
}

export function PdfUploader({ value, onChange, label, placeholder }: PdfUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const extractTextFromPdf = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((item: any) => item.str).join(' ');
        text += `\n--- الصفحة ${i} ---\n` + pageText;
      }
      return text;
    } catch (err) {
      console.error('Error extracting PDF text:', err);
      throw new Error('حدث خطأ أثناء قراءة محتوى الملف');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('يجب أن يكون الملف بصيغة PDF');
        return;
      }

      // If the file is small enough, we can still use base64 to keep images.
      if (file.size <= 750 * 1024) {
        const reader = new FileReader();
        reader.onloadend = () => {
          onChange(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        // If the file is large, we extract the text to save space.
        setIsProcessing(true);
        try {
          const text = await extractTextFromPdf(file);
          if (!text.trim()) {
            setError('عذراً، لم نتمكن من استخراج أي نص من هذا الملف (قد يكون عبارة عن صور ممسوحة ضوئياً). يرجى تقليل حجم الملف ورفعه كـ PDF عادي بأقل من 750 كيلوبايت.');
          } else {
            onChange(text); // Send extracted text instead of big base64!
          }
        } catch (err: any) {
          setError(err.message || 'فشل استخراج النص من الكتاب.');
        } finally {
          setIsProcessing(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      }
    }
  };

  const clearFile = () => {
    onChange('');
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      {label && <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{label}</label>}
      
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 text-red-600 rounded-xl border border-red-100 text-xs font-bold leading-relaxed">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {isProcessing && (
        <div className="flex items-center gap-2 p-3 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 text-xs font-bold leading-relaxed">
          <RefreshCw size={16} className="shrink-0 animate-spin" />
          <p>جاري استخراج النصوص من الكتاب... قد يستغرق هذا بضع ثوانٍ للملفات الكبيرة.</p>
        </div>
      )}

      <div className="relative group">
        {value ? (
          <div className="relative w-full p-4 rounded-2xl border border-indigo-200 bg-indigo-50 flex items-center justify-between gap-3">
             <div className="flex items-center gap-3">
               <FileText className="text-indigo-600" />
               <span className="text-xs font-bold text-indigo-900 truncate">ملف PDF مرفوع</span>
             </div>
             <button 
               type="button"
               onClick={clearFile}
               className="p-1 rounded-lg hover:bg-white text-indigo-400 hover:text-rose-500 transition-colors"
               title="حذف"
             >
               <X size={16} />
             </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="w-full py-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-2 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-all">
              <Upload size={20} />
            </div>
            <p className="text-xs font-bold text-slate-500 text-center px-4">
              انقر لرفع ملف PDF (كتاب أو منهج)<br />
              <span className="text-[10px] text-slate-400 mt-1 block">الملفات الكبيرة جداً سيتم تلقائياً استخراج نصها لدعم أي مساحة استيعابية</span>
            </p>
          </button>
        )}
      </div>

      <input 
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        disabled={isProcessing}
        className="hidden"
        accept="application/pdf"
      />
    </div>
  );
}
