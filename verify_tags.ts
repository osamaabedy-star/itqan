import * as fs from 'fs';

const filePath = 'src/components/ProfessionalReports.tsx';
const content = fs.readFileSync(filePath, 'utf8');

// Find lines 1378 to 1774:
const lines = content.split('\n');
const block = lines.slice(1377, 1775).join('\n');

const tags = ['div', 'span', 'tr', 'td', 'table', 'tbody', 'thead', 'button'];
console.log('--- HTML TAG ANALYSIS IN DELETED-RESTORED REGION (Lines 1378 - 1775) ---');

for (const t of tags) {
   const openRegex = new RegExp(`<${t}\\b`, 'g');
   const closeRegex = new RegExp(`</${t}>`, 'g');
   
   const openCount = (block.match(openRegex) || []).length;
   const closeCount = (block.match(closeRegex) || []).length;
   
   console.log(`${t}: opened ${openCount} times, closed ${closeCount} times. Difference: ${openCount - closeCount}`);
}

// Let's check curly braces and parentheses in this block
let curlies = 0;
let parens = 0;
for (let i = 0; i < block.length; i++) {
   if (block[i] === '{') curlies++;
   if (block[i] === '}') curlies--;
   if (block[i] === '(') parens++;
   if (block[i] === ')') parens--;
}
console.log(`Curly brace net balance inside block: ${curlies}`);
console.log(`Parentheses net balance inside block: ${parens}`);
