import * as fs from 'fs';

const filePath = 'src/components/ProfessionalReports.tsx';
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
let curlies = 0;
let parens = 0;

console.log('Line-by-line mismatch tracer (Lines 1375 - 1785):');
for (let i = 1375; i < 1785; i++) {
   const val = lines[i];
   if (!val) continue;
   let lineC = 0;
   let lineP = 0;
   for (let char of val) {
      if (char === '{') { curlies++; lineC++; }
      if (char === '}') { curlies--; lineC--; }
      if (char === '(') { parens++; lineP++; }
      if (char === ')') { parens--; lineP--; }
   }
   if (lineC !== 0 || lineP !== 0) {
      console.log(`Line ${i + 1}: net changed curlies by ${lineC} (global: ${curlies}), parens by ${lineP} (global: ${parens}) - text: ${val.trim().substring(0, 40)}`);
   }
}
