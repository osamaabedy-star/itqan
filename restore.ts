import { execSync } from 'child_process';

try {
   console.log('Restoring ProfessionalReports.tsx to last committed state...');
   execSync('git checkout src/components/ProfessionalReports.tsx');
   console.log('Successfully restored file!');
} catch (e) {
   console.error('Failed to restore:', e);
}
