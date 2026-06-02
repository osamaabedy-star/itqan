const fs = require('fs');
let code = fs.readFileSync('src/components/ExternalPortal.tsx', 'utf8');

// The file start is corrupted (likely from a bad edit).
// It looks like the file was truncated or broken at the top.
// Based on line 16, it should be start of a map function or skill processing.
// I can try to fix the top lines by removing corrupt lines 1-14.

let lines = code.split('\\n');
// Looking at the view, line 16 'const skillClasses' is the actual start of a valid block.
// Let's remove everything before it.
lines.splice(0, 15);
fs.writeFileSync('src/components/ExternalPortal.tsx', lines.join('\\n'));
console.log('Cleaned top of file');
