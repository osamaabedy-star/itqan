const fs = require('fs');

let content = fs.readFileSync('src/components/ProfessionalReports.tsx', 'utf8');

// Fix Date display to use fallback from ID
const dateRegex = /\{selectedQuizToManage\.createdAt \? new Date\(selectedQuizToManage\.createdAt\)\.toLocaleDateString\('ar-SA'.*? : 'غير متوفر'\}/g;
const newDateLogic = `{(() => {
                                 if (selectedQuizToManage.createdAt) return new Date(selectedQuizToManage.createdAt).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short', year: 'numeric' });
                                 if (selectedQuizToManage.id.startsWith('quiz_')) {
                                    const ts = parseInt(selectedQuizToManage.id.split('_')[1]);
                                    if (!isNaN(ts)) return new Date(ts).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short', year: 'numeric' });
                                 }
                                 return 'غير متوفر';
                               })()}`;
content = content.replace(dateRegex, newDateLogic);

// Make grid boxes smaller, shrink paddings
content = content.replace(/className="grid grid-cols-2 gap-3 mb-6"/g, 'className="grid grid-cols-2 gap-2 mb-4"');
content = content.replace(/className="bg-slate-50 p-5 rounded-\[24px\]/g, 'className="bg-slate-50 p-3 sm:p-4 rounded-[16px]');
content = content.replace(/<div className="w-10 h-10 bg-white/g, '<div className="w-8 h-8 bg-white');
content = content.replace(/size=\{18\} strokeWidth=\{2\.5\} \/>/g, 'size={14} strokeWidth={2.5} />');
content = content.replace(/<p className="text-\[10px\] font-black uppercase tracking-widest text-slate-400 mb-1">([^<]+)<\/p>/g, '<p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">$1</p>');
content = content.replace(/<p className="text-3xl font-black text-slate-900">/g, '<p className="text-xl font-black text-slate-900">');

// Rename تساؤلات to عدد الأسئلة
content = content.replace(/<p className="text-\[9px\] font-black uppercase tracking-widest text-slate-400 mb-1">(عدد التساؤلات|تساؤلات)<\/p>/g, '<p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">عدد الأسئلة</p>');

// Shrink header and subtitles of the popup
content = content.replace(/<h2 className="text-3xl lg:text-4xl font-black text-white/g, '<h2 className="text-2xl lg:text-3xl font-black text-white');
content = content.replace(/<p className="text-sm font-bold text-slate-400 mt-1">/g, '<p className="text-xs font-bold text-slate-400 mt-1">');
content = content.replace(/<h3 className="text-2xl font-black text-slate-900">/g, '<h3 className="text-xl font-black text-slate-900">');
content = content.replace(/<div className="md:w-\[35%\] bg-\[#0B1121\] text-white p-6 md:p-8/g, '<div className="md:w-[35%] bg-[#0B1121] text-white p-5 md:p-6');
content = content.replace(/<div className="md:w-\[65%\] bg-white p-6 md:p-8/g, '<div className="md:w-[65%] bg-white p-4 md:p-6');
content = content.replace(/<div className="flex items-center justify-between mb-6">/g, '<div className="flex items-center justify-between mb-4">');
content = content.replace(/<p className="text-\[10px\] font-black text-slate-400 uppercase tracking-widest mb-3 text-right">أداء الفصول في هذا الاختبار<\/p>/g, '<p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-right">أداء الفصول في هذا الاختبار</p>');
content = content.replace(/<div className="flex justify-between items-center bg-white px-4 py-2\.5 rounded-\[20px\]/g, '<div className="flex justify-between items-center bg-white px-3 py-2 rounded-[16px]');
content = content.replace(/<span className="font-black text-indigo-600 w-10 text-right text-sm">/g, '<span className="font-black text-indigo-600 w-10 text-right text-xs">');

// Shrink the overall card wrapper further
content = content.replace(/min-h-\[500px\]/g, 'min-h-[400px]');

fs.writeFileSync('src/components/ProfessionalReports.tsx', content);
console.log('Fixed ProfessionalReports.tsx!');
