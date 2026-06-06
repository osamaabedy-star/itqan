const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src', 'components', 'StudentProfile.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Normlize newlines
content = content.replace(/\r\n/g, '\n');

// 1. Find indices
const startIdx = content.indexOf('<div className="flex gap-2">');
const endIdx = content.indexOf('<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">');

if (startIdx !== -1 && endIdx !== -1 && startIdx < endIdx) {
  content = content.slice(0, startIdx) + content.slice(endIdx);
  console.log("Successfully cut out start block");
} else {
  console.log("Could not find start and end indices", { startIdx, endIdx });
}

// 2. Remove the duplicated bottom block
const bottomSearch = '                         </div>\n                                        <Clock size={12} className="text-slate-300" />';
const bottomIdx = content.indexOf(bottomSearch);
if (bottomIdx !== -1) {
  const nextClosingIdx = content.indexOf('                       ) : (', bottomIdx);
  if (nextClosingIdx !== -1) {
    content = content.slice(0, bottomIdx + 30) + content.slice(nextClosingIdx);
    console.log("Successfully cut out bottom block");
  } else {
    console.log("Could not find nextClosingIdx");
  }
} else {
  // Let's print index of bottom elements to debug
  console.log("Could not find exact bottom search string");
  const clockIdx = content.indexOf('Clock size={12}');
  if (clockIdx !== -1) {
    console.log("Found Clock around bottom at:", clockIdx);
    // Cut from the previous '</div>' to the clock block
    // Let's do loose index slicing
    const prevDiv = content.lastIndexOf('</div>', clockIdx);
    const nextTernary = content.indexOf(') : (', clockIdx);
    if (prevDiv !== -1 && nextTernary !== -1) {
      content = content.slice(0, prevDiv + 6) + '\n' + content.slice(nextTernary);
      console.log("Surgically cut loose bottom block");
    }
  }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log("Done");
