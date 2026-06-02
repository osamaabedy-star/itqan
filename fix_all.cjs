const fs = require('fs');
let code = fs.readFileSync('src/components/ExternalPortal.tsx', 'utf8');
code = code.replace(/\\r\\n/g, '\\n');
let lines = code.split('\\n');

let startL = -1;
let endL = -1;

for(let i=0; i<lines.length; i++){
    if(lines[i].includes('const skillClasses = data.classes.filter(c => {') && startL === -1) {
       startL = i;
    }
    if(lines[i].includes('<div className="flex items-center gap-2">') && lines[i].includes('</select>') && startL !== -1) {
       endL = i;
       break;
    }
}

if(startL > -1 && endL > -1) {
    let replacedBlock = [
'                                                            </div>',
'                                                         );',
'                                                      })}',
'                                                      {totalStudents.length === 0 && (',
'                                                         <p className="text-[10px] text-slate-300 italic text-center col-span-2">لا يوجد فصول أو طلاب مرتبطين بهذا الاختبار.</p>',
'                                                      )}',
'                                                   </div>',
'                                                </motion.div>',
'                                             )}',
'                                          </AnimatePresence>',
'                                       </div>',
'',
'                                       <div className="mt-6 pt-4 border-t border-slate-150 flex items-center justify-between flex-wrap gap-4">',
'                                          {isSigned && sigObj ? (',
'                                             <div className="flex items-center gap-2">'
];
    lines.splice(startL, endL - startL + 1, ...replacedBlock);
    fs.writeFileSync('src/components/ExternalPortal.tsx', lines.join('\\n'));
    console.log('Done splice!');
} else {
    console.log('Not found:', startL, endL);
}
