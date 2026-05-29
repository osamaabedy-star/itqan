const fs = require('fs');
let content = fs.readFileSync('src/components/Management.tsx', 'utf8');

const oldSkillAdd = `  const handleAddSkill = async () => {
    if (!skillName || !targetGradeId || !targetSubjectName) return;
    const id = editingId || 's_' + Date.now();
    const questions = skillQuestions.split('\\n').filter(q => q.trim() !== '');
    await firestoreService.saveItem('skills', id, { 
      name: skillName, 
      gradeId: targetGradeId,
      subjectName: targetSubjectName,
      questions 
    });
    resetForms();
  };`;

const newSkillAdd = `  const handleAddSkill = async () => {
    if (!skillName || !targetGradeId || !targetSubjectName) {
      alert('يرجى ملء جميع الحقول المطلوبة (الاسم، الصف، واسم المادة)');
      return;
    }
    const id = editingId || 's_' + Date.now();
    const questions = skillQuestions.split('\\n').filter(q => q.trim() !== '');
    setIsProcessing(true);
    try {
      await firestoreService.saveItem('skills', id, { 
        name: skillName, 
        gradeId: targetGradeId,
        subjectName: targetSubjectName,
        questions,
        createdAt: new Date().toISOString()
      });
      alert('تم حفظ المهارة بنجاح');
      resetForms();
    } catch (err: any) {
      alert('حدث خطأ أثناء الحفظ: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };`;

content = content.replace(oldSkillAdd, newSkillAdd);

if (content.includes('alert(\'تم حفظ المهارة بنجاح\')')) {
  console.log("Successfully replaced");
  fs.writeFileSync('src/components/Management.tsx', content);
} else {
  console.log("Failed to replace");
}
