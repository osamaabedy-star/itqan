export interface Teacher {
  id: string;
  name: string;
  email?: string;
  subjects?: string[]; // IDs of subjects they teach
  isArchived?: boolean;
  photoUrl?: string;
  specialization?: string;
  nationalId?: string;
}

export interface Grade {
  id: string;
  name: string; // "الصف الأول", "الصف الثاني", etc.
  stage?: 'kindergarten' | 'primary' | 'middle' | 'high' | string;
  isArchived?: boolean;
}

export interface Class {
  id: string;
  name: string; // "أ", "ب", "ج"
  gradeId: string; // Relationship to Grade
  teacherIds?: string[];
  isArchived?: boolean;
}

export interface Subject {
  id: string;
  name: string;
  teacherId?: string; // Legacy: Primary teacher
  teacherName?: string; // Legacy
  teacherIds?: string[]; // Array of teacher IDs who teach this subject for this grade
  teacherNames?: string[]; // Array of teacher names
  gradeId: string;
  classId?: string;
  classIds?: string[];
  isArchived?: boolean;
}

export interface Skill {
  id: string;
  name: string;
  questions: string[];
  gradeId?: string; // Grade association
  subjectName?: string; // Subject name (Math, etc.)
  subjectId?: string; // Keep for legacy/specific cases
  isArchived?: boolean;
  term?: 'term1' | 'term2' | 'full';
}

export interface MCQQuestion {
  id: string;
  text: string;
  options: string[];
  optionImages?: string[];
  correctAnswerIndex: number;
  imageUrl?: string;
}

export interface Quiz {
  id: string;
  title: string;
  stageId?: string;
  gradeId?: string;
  classIds?: string[];
  subjectName?: string;
  subjectIds?: string[];
  teacherId?: string;
  creatorId?: string;
  imageUrl?: string; // Added image for quiz
  questions: MCQQuestion[];
  isArchived?: boolean;
  status?: 'draft' | 'published';
  term?: 'term1' | 'term2' | 'full';
  timeLimit?: number; // In minutes
  scheduledDate?: string; // ISO date string
  bookUrl?: string;
  lessonName?: string;
  updatedAt?: any;
  createdAt?: any;
}

export interface Student {
  id: string;
  name: string;
  classId: string;
  isArchived?: boolean;
  academicYear?: string;
  photoUrl?: string;
  nationalId?: string;
}

export type EvaluationScore = 'mastered' | 'advanced' | 'accepted' | 'weak' | 'very-weak' | null;

export interface Evaluation {
  score: EvaluationScore;
  note?: string;
  updatedAt: any;
  academicYear?: string;
  stageId?: string;
  gradeId?: string;
  classId?: string;
  questionScores?: Record<number, number>; // index of question to its score (1 or 0, or specific value)
}

export interface RubricItem {
  id: string;
  title: string;
  maxScore?: number; // Usually 4
  weight: number; // Importance/Weight factor
}

export interface RubricCategory {
  id: string;
  title: string;
  items: RubricItem[];
}

export interface Rubric {
  id: string;
  name: string;
  categories: RubricCategory[];
  isArchived?: boolean;
  isPeerRubric?: boolean;
}

export interface Visit {
  id: string;
  teacherId: string;
  targetClassId?: string;
  date: string;
  notes?: string;
  lessonPeriod?: string;
  subjectId?: string;
  lessonTitle?: string;
  supervisorName?: string;
  supervisorId?: string;
  selectedStudentIds?: string[];
  studentQuizScores?: Record<string, number>;
  quizText?: string;
  quizMaxScore?: number;
  quizId?: string;
  quizUrl?: string;
  rubricId?: string; // Reference to which rubric was used
  term?: 'term1' | 'term2' | 'full';
  isArchived?: boolean;
  evaluationData?: Record<string, number>; // Maps a criterion ID to a score
  creatorId?: string;
  signed?: boolean;
  signatureName?: string;
  signatureData?: string;
  signedAt?: string;
  visitType?: 'supervisory' | 'peer';
  visitorTeacherId?: string;
}

export interface QuizResult {
  id?: string;
  studentId: string;
  nationalId?: string;
  quizId: string;
  title?: string;
  score: number; // Percentage
  answers: number[]; // Index of choices
  updatedAt: any;
  isArchived?: boolean;
}

export interface Evaluations {
  [key: string]: Evaluation; // Key format: `${studentId}-${skillId}-${academicYear}`
}

export interface ExternalProfile {
  id: string; // This will be the ID Number (National ID)
  name: string;
  role: 'teacher' | 'supervisor';
  linkedTeacherId?: string; // Only for teachers, to see their specific data
  supervisorType?: 'general' | 'stage' | 'classes';
  allowedGradeIds?: string[];
  allowedClassIds?: string[];
  isArchived?: boolean;
  createdAt: any;
}

export interface QuizSignature {
  id: string; // `${quizId}_${teacherId}`
  quizId: string;
  teacherId: string;
  teacherName: string;
  signed: boolean;
  signedAt: string;
  signatureData?: string;
  signatureText?: string;
}

export interface SkillSignature {
  id: string; // `${classId}_${subjectId}_${academicYear}`
  classId: string;
  subjectId: string;
  teacherId: string;
  teacherName: string;
  academicYear: string;
  signed: boolean;
  signedAt: string;
  signatureText?: string;
}

export interface VisitSignature {
  id: string; // `${visitId}_${teacherId}`
  visitId: string;
  teacherId: string;
  teacherName: string;
  signed: boolean;
  signedAt: string;
  signatureText?: string;
}

export interface SupportPlanItem {
  key: string;
  title: string;
  durationValue: string;
  dateValue: string;
  isCompleted: boolean;
}

export interface SupportPlan {
  id: string; // e.g., 'support_plan_' + studentId
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  selectedItems: SupportPlanItem[];
  notes?: string;
  createdAt: string;
}

export interface AppData {
  teachers: Teacher[];
  grades: Grade[];
  classes: Class[];
  subjects: Subject[];
  skills: Skill[];
  students: Student[];
  quizzes: Quiz[];
  visits: Visit[];
  quizResults: QuizResult[];
  rubrics?: Rubric[];
  externalProfiles?: ExternalProfile[];
  quizSignatures?: QuizSignature[];
  skillSignatures?: SkillSignature[];
  visitSignatures?: VisitSignature[];
  settings?: any[];
  supportPlans?: SupportPlan[];
}
