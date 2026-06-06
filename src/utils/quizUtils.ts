import { QuizResult, Student, Quiz } from '../types';

/**
 * Normalizes an identifier string by trimming, lowering case, and removing common prefixes like 's' or 't'.
 */
export const normalizeId = (id: string | number | undefined | null): string => {
  if (id === undefined || id === null) return '';
  let str = String(id).trim().toLowerCase();
  // Remove 's' or 't' prefix if it seems to be a role prefix (followed by digits or more characters)
  if ((str.startsWith('s') || str.startsWith('t')) && str.length > 1) {
    str = str.substring(1);
  }
  return str;
};

/**
 * Robust check to determine if a student has solved a specific quiz.
 * Checks multiple identifier combinations to ensure accuracy regardless of how the result was saved.
 */
export const isQuizSolved = (
  student: Student | null | undefined,
  quiz: Quiz | null | undefined,
  quizResults: QuizResult[] | undefined | null
): boolean => {
  if (!student || !quiz || !quizResults || quizResults.length === 0) return false;

  const sId = normalizeId(student.id);
  const sNatId = normalizeId(student.nationalId);
  const qId = normalizeId(quiz.id);

  return quizResults.some(result => {
    const rStudentId = normalizeId(result.studentId);
    const rNationalId = normalizeId(result.nationalId);
    const rQuizId = normalizeId(result.quizId);
    const rId = normalizeId(result.id);

    // 1. Direct match on studentId and quizId fields
    const directMatch = (rStudentId === sId || (sNatId && rStudentId === sNatId) || (sNatId && rNationalId === sNatId)) && rQuizId === qId;
    if (directMatch) return true;

    // 2. Match on the constructed result ID format: studentId_quizId
    const idVariants = [
      `${sId}_${qId}`,
      sNatId ? `${sNatId}_${qId}` : null
    ].filter(Boolean);

    if (idVariants.some(variant => rId === variant || rId.includes(variant!))) return true;

    // 3. Fallback: if studentId in result matches either student ID and quizId matches
    if ((rStudentId === sId || (sNatId && rStudentId === sNatId)) && rQuizId === qId) return true;

    return false;
  });
};
