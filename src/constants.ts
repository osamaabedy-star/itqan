import { AppData } from './types';
import { Baby, Layers, BookOpen, GraduationCap } from 'lucide-react';
import React from 'react';

export const APP_STAGES = [
  { id: 'kindergarten', name: 'رياض الأطفال', color: 'text-pink-500', bg: 'bg-pink-50' },
  { id: 'primary', name: 'المرحلة الابتدائية', color: 'text-blue-500', bg: 'bg-blue-50' },
  { id: 'middle', name: 'المرحلة المتوسطة', color: 'text-amber-500', bg: 'bg-amber-50' },
  { id: 'high', name: 'المرحلة الثانوية', color: 'text-indigo-600', bg: 'bg-indigo-50' },
] as const;

export const INITIAL_DATA: AppData = {
  teachers: [
    { id: 't1', name: 'أ/ محمد العتيبي' },
    { id: 't2', name: 'أ/ عبدالله الشمري' },
    { id: 't3', name: 'أ/ خالد الحربي' },
    { id: 't4', name: 'أ/ فهد المطيري' },
  ],
  grades: [
    { id: 'g1', name: 'الصف الأول الابتدائي' },
    { id: 'g2', name: 'الصف الثاني الابتدائي' },
    { id: 'g3', name: 'الصف الثالث الابتدائي' },
  ],
  classes: [
    { id: 'c1', name: 'أ', gradeId: 'g1', teacherIds: ['t1', 't2'] },
    { id: 'c2', name: 'ب', gradeId: 'g1', teacherIds: ['t1'] },
    { id: 'c3', name: 'أ', gradeId: 'g2', teacherIds: ['t3'] },
    { id: 'c4', name: 'أ', gradeId: 'g3', teacherIds: ['t4'] }
  ],
  subjects: [
    { id: 'sub1', name: 'لغتي', teacherId: 't1', teacherName: 'أ/ محمد العتيبي', gradeId: 'g1', classId: 'c1' },
    { id: 'sub2', name: 'الرياضيات', teacherId: 't2', teacherName: 'أ/ عبدالله الشمري', gradeId: 'g1', classId: 'c1' },
    { id: 'sub3', name: 'لغتي', teacherId: 't1', teacherName: 'أ/ محمد العتيبي', gradeId: 'g1', classId: 'c2' },
  ],
  skills: [
    { id: 's1', gradeId: 'g1', subjectName: 'لغتي', name: 'التعرف على الحروف المضمومة', questions: ['انطق حرف (بُ)؟', 'استخرج حرفاً مضموماً من الكلمة: (كتبُ)'] },
    { id: 's2', gradeId: 'g1', subjectName: 'لغتي', name: 'اللام الشمسية والقمرية', questions: ['كلمة (الشمس) شمسية أم قمرية؟', 'أدخل (ال) على كلمة (قمر)'] },
    { id: 's3', gradeId: 'g2', subjectName: 'الرياضيات', name: 'الجمع حتى رقم 10', questions: ['كم ناتج 5 + 4؟', 'أكمل: 7 + 2 = ...'] },
  ],
  students: [
    { id: 'st1', name: 'أحمد السعيد', classId: 'c1' },
    { id: 'st2', name: 'سارة العبدالله', classId: 'c1' },
    { id: 'st3', name: 'خالد العنزي', classId: 'c2' },
    { id: 'st4', name: 'نورة القرني', classId: 'c3' },
    { id: 'st5', name: 'محمد حسن', classId: 'c4' },
  ],
  quizzes: [
    {
      id: 'q1',
      title: 'اختبار الحروف والكلمات',
      gradeId: 'g1',
      subjectName: 'لغتي',
      questions: [
        { id: 'q1_1', text: 'ما هو الحرف المضموم في كلمة (تُفاح)؟', options: ['تُ', 'فـا', 'ح'], correctAnswerIndex: 0 },
        { id: 'q1_2', text: 'كلمة (القمر) تحتوي على لام...', options: ['شمسية', 'قمرية'], correctAnswerIndex: 1 }
      ]
    }
  ],
  visits: [],
  quizResults: [],
  externalProfiles: [],
  supportPlans: [],
  studentBooks: []
};
