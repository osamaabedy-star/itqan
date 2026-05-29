const fs = require('fs');
let content = fs.readFileSync('src/components/ProfessionalReports.tsx', 'utf8');

// The file should import User and Layers from lucide-react
if (!content.includes('User,')) {
  content = content.replace(/import \{([^}]+)\} from 'lucide-react';/, (match, p1) => {
    return 'import {' + p1 + ', User, Layers } from \'lucide-react\';';
  });
}

fs.writeFileSync('src/components/ProfessionalReports.tsx', content);
