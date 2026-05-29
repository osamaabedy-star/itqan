import React, { useRef, useState } from 'react';
import { Upload, X, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';

interface ImageUploaderProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  compact?: boolean;
  iconOnly?: boolean;
}

export function ImageUploader({ value, onChange, label, placeholder, compact, iconOnly }: ImageUploaderProps) {
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('حجم الصورة كبير جداً (الأقصى 2 ميجابايت)');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        onChange(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    onChange('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (iconOnly) {
     return (
        <div className="relative inline-block">
           <input 
             type="file"
             ref={fileInputRef}
             onChange={handleFileChange}
             className="hidden"
             accept="image/*"
           />
           {value ? (
             <div className="relative w-10 h-10 rounded-xl overflow-hidden border border-slate-200 bg-white group shrink-0">
               <img src={value} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
               <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button type="button" onClick={clearImage} className="text-white p-1 hover:text-rose-500"><X size={14} /></button>
               </div>
             </div>
           ) : (
             <button 
               type="button" 
               onClick={() => fileInputRef.current?.click()}
               className="w-10 h-10 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-slate-50 transition-all shrink-0"
               title={label || "رفع صورة"}
             >
                <ImageIcon size={18} />
             </button>
           )}
        </div>
     );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <input 
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*"
        />
        {value ? (
          <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-200 bg-white group shrink-0">
             <img src={value} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
             <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button type="button" onClick={clearImage} className="text-white"><X size={12} /></button>
             </div>
          </div>
        ) : (
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()}
            className="w-12 h-12 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 hover:border-indigo-400 hover:text-indigo-600 transition-all shrink-0"
          >
             <ImageIcon size={18} />
          </button>
        )}
        <div className="flex-1">
           <input 
             type="text"
             placeholder={label || 'رابط الصورة'}
             value={value.startsWith('data:') ? 'صورة مرفوعة' : value}
             readOnly={value.startsWith('data:')}
             onChange={(e) => onChange(e.target.value)}
             className="w-full h-8 px-3 bg-white border border-slate-200 rounded-lg text-[10px] font-bold outline-none focus:ring-1 focus:ring-indigo-100"
           />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {label && <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{label}</label>}
      
      <div className="relative group">
        {value ? (
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 group">
            <img 
              src={value} 
              alt="Preview" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 bg-white text-slate-900 rounded-xl hover:scale-110 transition-transform"
                title="تغيير الصورة"
              >
                <Upload size={18} />
              </button>
              <button 
                type="button"
                onClick={clearImage}
                className="p-2 bg-red-500 text-white rounded-xl hover:scale-110 transition-transform"
                title="حذف"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-video rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex flex-col items-center justify-center gap-3 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-all">
                <Upload size={24} />
              </div>
              <p className="text-xs font-bold text-slate-500">
                انقر أو اسحب لرفع صورة
              </p>
              <p className="text-[10px] text-slate-300">PNG, JPG حتى 2MB</p>
            </button>
            
            <div className="flex items-center gap-2 mt-1">
              <div className="h-px flex-1 bg-slate-100" />
              <span className="text-[9px] font-bold text-slate-300">أو</span>
              <div className="h-px flex-1 bg-slate-100" />
            </div>

            {!showUrlInput ? (
              <button
                type="button"
                onClick={() => setShowUrlInput(true)}
                className="text-[10px] font-bold text-indigo-400 hover:text-indigo-600 flex items-center justify-center gap-1.5 transition-colors"
              >
                <LinkIcon size={12} /> استخدام رابط صورة
              </button>
            ) : (
              <div className="relative flex items-center">
                <LinkIcon size={14} className="absolute right-3 text-slate-400" />
                <input 
                  type="text"
                  placeholder={placeholder || 'ضع رابط الصورة هنا...'}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  className="w-full h-10 pr-10 pl-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-100"
                />
                <button 
                  type="button"
                  onClick={() => setShowUrlInput(false)}
                  className="absolute left-3 text-slate-400 hover:text-red-500"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <input 
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />
    </div>
  );
}
