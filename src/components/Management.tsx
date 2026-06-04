import React, { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Save,
  UserPlus,
  BookOpen,
  Settings,
  ChevronRight,
  ListRestart,
  Edit2,
  X,
  Archive,
  ArrowUpCircle,
  Search,
  AlertTriangle,
  BrainCircuit,
  ShieldCheck,
  Building,
  Users,
  Star,
  AlertCircle,
  CheckCircle2,
  PlusCircle,
  LayoutGrid,
  LayoutDashboard,
  Check,
  Zap,
  Calendar,
  Sparkles,
  FileSpreadsheet,
  Download,
  Upload,
  Info,
  Menu,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AppData,
  Teacher,
  Class,
  Subject,
  Skill,
  Student,
  Quiz,
  MCQQuestion,
  RubricCategory,
  Rubric,
} from "../types";
import { firestoreService } from "../services/firestoreService";
import { APP_STAGES } from "../constants";
import { normalizeNumerals } from "../lib/stringUtils";
import { ImageUploader } from "./ui/ImageUploader";
import { PdfUploader } from "./ui/PdfUploader";
import { ConfirmationModal } from "./ui/ConfirmationModal";

function parseBulkLine(line: string, type: "teachers" | "students" = "students") {
  const text = normalizeNumerals(line.trim());
  if (!text) return null;
  
  const parts = text.split(/[,;\t]/).map((p) => p.trim()).filter(p => p);
  
  if (type === "students") {
    // Expected structure could be: Name, ID, Grade, Class
    // Or just Name, ID
    let name = parts[0] || "";
    let nationalId = "";
    let gradeName = "";
    let className = "";

    // Identify ID (Numeric string 6-14 digits)
    const idIndex = parts.findIndex(p => /^\d{6,14}$/.test(p));
    if (idIndex !== -1) {
      nationalId = parts[idIndex];
      // Assume first non-numeric part is name
      const foundName = parts.find((p, i) => i !== idIndex && !/^\d+$/.test(p));
      if (foundName) name = foundName;
      
      // Other parts could be Grade and Class
      const remaining = parts.filter((p, i) => i !== idIndex && p !== name);
      if (remaining.length >= 1) gradeName = remaining[0];
      if (remaining.length >= 2) className = remaining[1];
    } else if (parts.length >= 2) {
      // Simple fallback
      name = parts[0];
      nationalId = parts[1];
      if (parts.length >= 3) gradeName = parts[2];
      if (parts.length >= 4) className = parts[3];
    }

    return { name, nationalId, gradeName, className };
  }

  // Teacher/Default logic (existing improved)
  const numberMatch = text.match(/\b\d{6,14}\b/);
  let nationalId = "";
  let name = text;
  if (numberMatch) {
    nationalId = numberMatch[0];
    name = text
      .replace(nationalId, "")
      .replace(/[,;\t]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  } else if (parts.length >= 2) {
     const possibleId = parts.find((p) => /^\d+$/.test(p));
     if (possibleId) {
       nationalId = possibleId;
       name = parts.filter((p) => p !== possibleId).join(" ");
     } else {
       name = parts[0];
     }
  }
  return { name, nationalId, gradeName: "", className: "" };
}

const downloadCSVTemplate = (type: "teachers" | "students") => {
  const headers = type === "teachers" ? "اسم_المعلم,رقم_الهوية\n" : "اسم_الطالب,رقم_الهوية,الصف_الدراسي,الفصل\n";
  const rows = type === "teachers"
    ? "خالد بن محمد العتيبي,1029384756\nعبدالرحمن بن عبدالله الحربي,1039485761"
    : "عبدالرحمن بن محمد القحطاني,1049586722,الصف الثالث,أ\nسلطان بن خالد السبيعي,1059687733,الصف الرابع,ب";
  
  const csvContent = "\uFEFF" + "sep=,\n" + headers + rows; // Arabic UTF-8 BOM + Excel separator directive
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${type === "teachers" ? "نموذج_استيراد_المعلمين" : "نموذج_استيراد_الطلاب"}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

interface ManagementProps {
  data: AppData;
  onClose: () => void;
  evaluations: any; // Add evaluations to prop if we want cascading student delete support
  filterTeacherId?: string;
  onFilterTeacherChange?: (id: string) => void;
  onSelectStudent?: (s: Student) => void;
  academicYear?: string;
}

function TabTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="text-xl md:text-2xl font-black tracking-tighter text-slate-800">{title}</h2>
      <p className="text-slate-500 font-medium text-xs mt-1">{description}</p>
    </div>
  );
}

function TabCard({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm transition-all duration-200 hover:shadow-md">
      {title && <h4 className="font-black text-slate-800 text-sm md:text-base mb-4">{title}</h4>}
      {children}
    </div>
  );
}

export function Management({
  data,
  onClose,
  evaluations,
  filterTeacherId: propFilterTeacherId,
  onFilterTeacherChange,
  onSelectStudent,
  academicYear,
}: ManagementProps) {
  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "grades"
    | "teachers"
    | "classes"
    | "subjects"
    | "skills"
    | "quizzes"
    | "students"
    | "bulk"
    | "archive"
    | "rubrics"
    | "external_profiles"
    | "system_settings"
    | "books"
  >("overview");

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const selectTab = (tab: typeof activeTab) => {
    setActiveTab(tab);
    resetForms();
    setIsMobileSidebarOpen(false);
  };

  // Confirmation State
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: "",
    message: "",
    confirmLabel: "",
    onConfirm: () => {},
  });

  const closeConfirm = () =>
    setConfirmConfig((prev) => ({ ...prev, isOpen: false }));

  // Promotion States
  const [promoFromClassId, setPromoFromClassId] = useState("");
  const [promoToClassId, setPromoToClassId] = useState("");
  const [promoYear, setPromoYear] = useState("2024-2025");

  const handleAddRubric = async () => {
    if (!rubricName) return;
    setIsProcessing(true);
    try {
      const id = editingId || "rubric_" + Date.now();
      await firestoreService.saveItem("rubrics", id, {
        name: rubricName,
        categories: rubricCategories,
        isArchived: false,
        isPeerRubric: isPeerRubric,
      });
      resetForms();
    } finally {
      setIsProcessing(false);
    }
  };

  const addCategory = () => {
    if (!newCatTitle) return;
    setRubricCategories([
      ...rubricCategories,
      { id: "cat_" + Date.now(), title: newCatTitle, items: [] },
    ]);
    setNewCatTitle("");
  };

  const addItemToCategory = (catIndex: number, itemTitle?: string) => {
    const titleToAdd = itemTitle || newItemTitle;
    if (!titleToAdd) return;
    const updated = [...rubricCategories];
    updated[catIndex].items.push({
      id: "item_" + Date.now(),
      title: titleToAdd,
      maxScore: 4,
      weight: 0,
    });
    setRubricCategories(updated);
    if (!itemTitle) setNewItemTitle("");
  };

  const removeCategory = (index: number) => {
    setRubricCategories(rubricCategories.filter((_, i) => i !== index));
  };

  const removeItem = (catIndex: number, itemIndex: number) => {
    const updated = [...rubricCategories];
    updated[catIndex].items.splice(itemIndex, 1);
    setRubricCategories(updated);
  };

  const handleArchiveYear = async (year: string) => {
    setConfirmConfig({
      isOpen: true,
      title: "تأكيد الأرشفة",
      message: `هل أنت متأكد من أرشفة العام الدراسي ${year}؟ سيتم وضع علامة "مؤرشف" على سجلات الطلاب الحالية.`,
      confirmLabel: "تأكيد الأرشفة الآن",
      isDestructive: false,
      onConfirm: async () => {
        closeConfirm();
        setIsProcessing(true);
        try {
          const studentsToArchive = data.students.filter((s) => !s.isArchived);
          for (const student of studentsToArchive) {
            await firestoreService.saveItem("students", student.id, {
              ...student,
              isArchived: true,
            });
          }
          alert("تمت الأرشفة بنجاح!");
        } catch (err) {
          alert("حدث خطأ أثناء الأرشفة");
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };

  const handlePromoteStudents = async () => {
    if (!promoFromClassId || !promoToClassId) return;

    setConfirmConfig({
      isOpen: true,
      title: "تأكيد ترفيع الطلاب",
      message:
        "سيتم نقل جميع طلاب الفصل المختار إلى الفصل الجديد. هل أنت متأكد؟",
      confirmLabel: "بدء الترفيع",
      isDestructive: false,
      onConfirm: async () => {
        closeConfirm();
        setIsProcessing(true);
        try {
          const studentsToPromote = data.students.filter(
            (s) => s.classId === promoFromClassId,
          );
          for (const student of studentsToPromote) {
            await firestoreService.saveItem("students", student.id, {
              ...student,
              classId: promoToClassId,
              isArchived: false, // Ensure they are active in the new year
              academicYear: promoYear,
            });
          }
          alert("تم ترفيع الطلاب بنجاح!");
          setPromoFromClassId("");
          setPromoToClassId("");
        } catch (err) {
          alert("حدث خطأ أثناء الترفيع");
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };

  // Bulk States
  const [bulkType, setBulkType] = useState<
    "teachers" | "classes" | "students" | "skills" | "quizzes"
  >("teachers");
  const [bulkData, setBulkData] = useState("");
  const [bulkClassId, setBulkClassId] = useState("");
  const [bulkSubjectId, setBulkSubjectId] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);

  const [rubricName, setRubricName] = useState("");
  const [rubricCategories, setRubricCategories] = useState<RubricCategory[]>(
    [],
  );
  const [isPeerRubric, setIsPeerRubric] = useState(false);
  const [newCatTitle, setNewCatTitle] = useState("");
  const [newItemTitle, setNewItemTitle] = useState("");
  const [activeCatIndex, setActiveCatIndex] = useState<number | null>(null);

  const handleBulkImport = async () => {
    if (!bulkData.trim()) return;
    setIsProcessing(true);

    try {
      if (bulkType === "quizzes") {
        try {
          const quizzes = JSON.parse(bulkData);
          if (!Array.isArray(quizzes))
            throw new Error(
              "يرجى التأكد من أن الصيغة عبارة عن مصفوفة JSON [ ... ]",
            );

          for (const q of quizzes) {
            const id =
              "quiz_" + Date.now() + Math.random().toString(36).substr(2, 6);

            let matchedSubjects = data.subjects.filter(
              (s) => !s.isArchived && s.name === q.subjectName,
            );

            // If gradeName is supplied, narrow the tied subjects to only those in the matched grade
            if (q.gradeName) {
              const matchedGrades = data.grades.filter(
                (g) => !g.isArchived && g.name === q.gradeName,
              );
              const matchedGradeIds = matchedGrades.map((g) => g.id);
              matchedSubjects = matchedSubjects.filter((s) =>
                matchedGradeIds.includes(s.gradeId),
              );
            }

            const gradeIds = Array.from(
              new Set(matchedSubjects.map((s) => s.gradeId)),
            );
            const classIds = Array.from(
              new Set(
                matchedSubjects.flatMap(
                  (s) => s.classIds || (s.classId ? [s.classId] : []),
                ),
              ),
            );
            const stageId =
              gradeIds.length > 0
                ? data.grades.find((g) => g.id === gradeIds[0])?.stage ||
                  "primary"
                : "primary";

            await firestoreService.saveItem("quizzes", id, {
              title: q.title || "اختبار بدون عنوان",
              subjectName: q.subjectName || "عام",
              subjectIds: matchedSubjects.map((s) => s.id),
              gradeId: gradeIds[0] || "",
              classIds: classIds,
              status: "published",
              term: q.term || "term1",
              createdAt: new Date().toISOString(),
              questions: (q.questions || []).map(
                (question: any, idx: number) => ({
                  id: "q_" + Date.now() + "_" + idx,
                  text: question.text || "سؤال بدون نص",
                  options: question.options || ["أ", "ب", "ج", "د"],
                  correctAnswerIndex: question.correctAnswerIndex || 0,
                }),
              ),
            });
          }
          alert("تم رفع واستيراد الاختبارات بنجاح!");
          setBulkData("");
        } catch (e: any) {
          alert("صيغة JSON غير صحيحة: " + e.message);
        }
        setIsProcessing(false);
        return;
      }

      const lines = bulkData.split("\n").filter((l) => l.trim() !== "");
      for (const line of lines) {
        const id = Date.now() + Math.random().toString(36).substr(2, 9);

        if (bulkType === "teachers") {
          const parsed = parseBulkLine(line, "teachers");
          if (parsed) {
            const teacherId = "t_" + id;
            await firestoreService.saveItem("teachers", teacherId, {
              name: parsed.name,
              isArchived: false,
            });
            if (parsed.nationalId) {
              await firestoreService.saveItem("externalProfiles", parsed.nationalId, {
                id: parsed.nationalId,
                name: parsed.name,
                role: "teacher",
                linkedTeacherId: teacherId,
                isArchived: false,
                createdAt: new Date(),
              });
            }
          }
        } else if (bulkType === "classes") {
          await firestoreService.saveItem("classes", "c_" + id, {
            name: line.trim(),
            teacherIds: [],
          });
        } else if (bulkType === "students") {
          const parsed = parseBulkLine(line, "students");
          if (parsed) {
            // Smart Class Mapping if gradeName/className provided
            let finalClassId = bulkClassId;
            if (parsed.className || parsed.gradeName) {
               const matchedGrade = data.grades.find(g => !g.isArchived && g.name.includes(parsed.gradeName || ''));
               const matchedClass = data.classes.find(c => {
                  const nameMatch = !c.isArchived && c.name.includes(parsed.className || '');
                  const gradeMatch = matchedGrade ? c.name.includes(matchedGrade.name) : true;
                  return nameMatch && gradeMatch;
               });
               if (matchedClass) finalClassId = matchedClass.id;
            }

            if (!finalClassId) continue; // Skip if no class assigned

            await firestoreService.saveItem("students", "st_" + id, {
              name: parsed.name,
              classId: finalClassId,
              isArchived: false,
              academicYear: academicYear || "2024-2025",
              nationalId: parsed.nationalId,
            });
          }
        } else if (bulkType === "skills" && (bulkSubjectId || targetGradeId)) {
          const [name, ...questions] = line.split("|").map((s) => s.trim());
          if (name) {
            const subject = bulkSubjectId
              ? data.subjects.find((s) => s.id === bulkSubjectId)
              : null;
            await firestoreService.saveItem("skills", "s_" + id, {
              name,
              gradeId: subject?.gradeId || targetGradeId || "",
              subjectName:
                subject?.name || targetSubjectName || "مادة غير محددة",
              questions: questions.length > 0 ? questions : ["سؤال تجريبي 1"],
            });
          }
        }
      }
      alert("تم الاستيراد بنجاح!");
      setBulkData("");
    } catch (err) {
      alert("حدث خطأ أثناء الاستيراد");
    } finally {
      setIsProcessing(false);
    }
  };

  // Form States
  const [gradeName, setGradeName] = useState("");
  const [gradeStage, setGradeStage] = useState("primary");
  const [teacherName, setTeacherName] = useState("");
  const [teacherNationalId, setTeacherNationalId] = useState("");
  const [className, setClassName] = useState("");
  const [targetGradeId, setTargetGradeId] = useState("");
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [studentName, setStudentName] = useState("");
  const [studentNationalId, setStudentNationalId] = useState("");
  const [targetClassId, setTargetClassId] = useState("");
  const [studentPhotoUrl, setStudentPhotoUrl] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [targetTeacherId, setTargetTeacherId] = useState("");
  const [skillName, setSkillName] = useState("");
  const [targetSubjectName, setTargetSubjectName] = useState("");
  const [skillQuestions, setSkillQuestions] = useState("");
  const [skillTerm, setSkillTerm] = useState<"term1" | "term2" | "full">("term1");
  const [searchQuery, setSearchQuery] = useState("");
  const [parsedTeachers, setParsedTeachers] = useState<{ name: string; nationalId: string }[]>([]);
  const [parsedStudents, setParsedStudents] = useState<{ name: string; nationalId: string; className?: string; gradeName?: string }[]>([]);
  const [teacherImportMode, setTeacherImportMode] = useState<"single" | "file">("single");
  const [studentImportMode, setStudentImportMode] = useState<"single" | "file">("single");

  // External Profiles Form States
  const [extProfileId, setExtProfileId] = useState("");
  const [extProfileName, setExtProfileName] = useState("");
  const [extProfileRole, setExtProfileRole] = useState<
    "teacher" | "supervisor"
  >("teacher");
  const [extProfileTeacherId, setExtProfileTeacherId] = useState("");
  const [supervisorType, setSupervisorType] = useState<"general"|"stage"|"classes">("general");
  const [supervisorAllowedGradeIds, setSupervisorAllowedGradeIds] = useState<string[]>([]);
  const [supervisorAllowedClassIds, setSupervisorAllowedClassIds] = useState<string[]>([]);

  // Filtering States
  const [localFilterTeacherId, setLocalFilterTeacherId] = useState(
    propFilterTeacherId || "",
  );
  const [filterClassId, setFilterClassId] = useState("");
  const [filterStageId, setFilterStageId] = useState("");
  const [filterGradeId, setFilterGradeId] = useState("");
  const [filterSubjectId, setFilterSubjectId] = useState("");
  const [filterQuizSubjectId, setFilterQuizSubjectId] = useState("");
  const [filterQuizGradeId, setFilterQuizGradeId] = useState("");
  const [filterQuizTerm, setFilterQuizTerm] = useState<string>("");
  const [filterQuizStage, setFilterQuizStage] = useState<string>("");

  const filterTeacherId = onFilterTeacherChange
    ? propFilterTeacherId || ""
    : localFilterTeacherId;
  const setFilterTeacherId = (id: string) => {
    if (onFilterTeacherChange) onFilterTeacherChange(id);
    else setLocalFilterTeacherId(id);
  };

  // Quiz Form State
  const [quizTitle, setQuizTitle] = useState("");
  const [quizStatus, setQuizStatus] = useState<"draft" | "published">("draft");
  const [quizTerm, setQuizTerm] = useState<"term1" | "term2" | "all">("term1");
  const [quizSubjectIds, setQuizSubjectIds] = useState<string[]>([]);
  const [quizSubjectName, setQuizSubjectName] = useState("");
  const [quizSelectedGradeId, setQuizSelectedGradeId] = useState("");
  const [quizQuestions, setQuizQuestions] = useState<MCQQuestion[]>([]);
  const [quizImageUrl, setQuizImageUrl] = useState("");
  const [quizBookId, setQuizBookId] = useState("");
  const [quizBookPageReference, setQuizBookPageReference] = useState("");
  const [currentQText, setCurrentQText] = useState("");
  const [currentQImageUrl, setCurrentQImageUrl] = useState("");
  const [currentQOptions, setCurrentQOptions] = useState(["", "", "", ""]);
  const [currentQOptionImages, setCurrentQOptionImages] = useState([
    "",
    "",
    "",
    "",
  ]);
  const [currentQCorrect, setCurrentQCorrect] = useState(0);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkQuizText, setBulkQuizText] = useState("");

  // AI Question Generator States
  const [aiMode, setAiMode] = useState<"lesson" | "custom" | "book">("lesson");
  const [aiSelectedGradeId, setAiSelectedGradeId] = useState("");
  const [aiSelectedSubject, setAiSelectedSubject] = useState("");
  const [aiLessonName, setAiLessonName] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiQuestionCount, setAiQuestionCount] = useState(5);
  const [aiIsGenerating, setAiIsGenerating] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiSuccess, setAiSuccess] = useState("");
  const [aiSelectedBookId, setAiSelectedBookId] = useState("");
  const [aiSelectedChapterIds, setAiSelectedChapterIds] = useState<string[]>([]);

  // Student Book States
  const [bookTitle, setBookTitle] = useState("");
  const [bookSelectedGradeId, setBookSelectedGradeId] = useState("");
  const [bookSubjectName, setBookSubjectName] = useState("");
  const [bookTerm, setBookTerm] = useState<'term1' | 'term2' | 'full'>("term1");
  const [bookChapters, setBookChapters] = useState<{ id: string; title: string; content: string; pages?: string; }[]>([]);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);

  // Chapters builder inside book creation
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [newChapterContent, setNewChapterContent] = useState("");
  const [newChapterPages, setNewChapterPages] = useState("");
  const [editingChapterIndex, setEditingChapterIndex] = useState<number | null>(null);
  const [aiChapterGenerating, setAiChapterGenerating] = useState(false);

  // Sync AI choices with main quiz choices
  useEffect(() => {
    if (quizSubjectName && !aiSelectedSubject) {
      setAiSelectedSubject(quizSubjectName);
    }
  }, [quizSubjectName, aiSelectedSubject]);

  useEffect(() => {
    if (quizSubjectIds.length > 0 && !aiSelectedGradeId) {
      const currentSub = data.subjects.find((s) => s.id === quizSubjectIds[0]);
      if (currentSub) {
        setAiSelectedGradeId(currentSub.gradeId);
      }
    }
  }, [quizSubjectIds, aiSelectedGradeId, data.subjects]);

  const handleGenerateQuestionsWithAI = async () => {
    let finalPrompt = "";
    let finalSubject = "";
    let finalGrade = "";
    let bookChaptersPayload: any[] | undefined = undefined;

    if (aiMode === "lesson") {
      if (!aiLessonName.trim()) {
        setAiError("يرجى كتابة اسم الدرس المراد التوليد له أولاً");
        return;
      }
      finalSubject = aiSelectedSubject || quizSubjectName;
      const targetGradeId = aiSelectedGradeId || (quizSubjectIds.length > 0 ? data.subjects.find((s) => s.id === quizSubjectIds[0])?.gradeId : "");
      const targetGrade = data.grades.find((g) => g.id === targetGradeId);
      finalGrade = targetGrade ? targetGrade.name : "";

      finalPrompt = `تمارين وأسئلة متميزة في مادة ${finalSubject || "المادة"} لدرس: "${aiLessonName.trim()}" ${finalGrade ? `للصف ${finalGrade}` : ""}`;
    } else if (aiMode === "book") {
      if (!aiSelectedBookId) {
        setAiError("يرجى تحديد الكتاب أو المنهج المرجعي أولاً");
        return;
      }
      if (aiSelectedChapterIds.length === 0) {
        setAiError("يرجى تحديد درس أو فصل مادي واحد على الأقل للتوليد منه");
        return;
      }

      const selectedBook = data.studentBooks?.find((b) => b.id === aiSelectedBookId);
      if (!selectedBook) {
        setAiError("الملف المرجعي لهذا المنهج غير موجود");
        return;
      }

      const selectedChapters = selectedBook.chapters?.filter((ch) => aiSelectedChapterIds.includes(ch.id)) || [];
      bookChaptersPayload = selectedChapters.map(ch => ({ title: ch.title, content: ch.content, pages: ch.pages }));
      const chaptersTextAndNotes = selectedChapters.map((ch) => `الدرس: ${ch.title}${ch.pages ? ` (المأخوذ من الصفحات: ${ch.pages})` : ""}\nالمحتوى المرجعي:\n${ch.content}`).join("\n\n");

      finalSubject = selectedBook.subjectName;
      const targetGrade = data.grades.find((g) => g.id === selectedBook.gradeId);
      finalGrade = targetGrade ? targetGrade.name : "";

      finalPrompt = `أنت بصدد توليد أسئلة اختبار دقيقة ومطابقة بنسبة 100% للنصوص المرجعية التالية المأخوذة من كتاب الطالب لمادة: {${selectedBook.subjectName}}:\n\n${chaptersTextAndNotes}\n\nصغ أسئلة اختبار ذكية وبنفس مفردات ومصطلحات هذا المرجع التعليمي الشامل تقيس فهم وتحصيل الطلاب.`;
    } else {
      if (!aiPrompt.trim()) {
        setAiError(
          "يرجى كتابة موضوع الأسئلة التي تريد توليدها بالذكاء الاصطناعي",
        );
        return;
      }
      finalPrompt = aiPrompt;
      finalSubject = quizSubjectName;
      const targetGrade = data.grades.find((g) => g.id === quizSelectedGradeId);
      finalGrade = targetGrade ? targetGrade.name : "";
    }

    setAiIsGenerating(true);
    setAiError("");
    setAiSuccess("");

    try {
      const response = await fetch("/api/gemini/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: finalPrompt,
          count: aiQuestionCount,
          subject: finalSubject || undefined,
          grade: finalGrade || undefined,
          chapters: bookChaptersPayload
        }),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(
          resData.error || "فشل في توليد الأسئلة. يرجى المحاولة لاحقاً.",
        );
      }

      if (resData.success && Array.isArray(resData.questions)) {
        const formattedQuestions: MCQQuestion[] = resData.questions.map(
          (q: any) => ({
            id: `q_${Date.now()}_${Math.random()}`,
            text: q.text || "",
            options:
              Array.isArray(q.options) && q.options.length === 4
                ? q.options
                : ["", "", "", ""],
            correctAnswerIndex:
              typeof q.correctAnswerIndex === "number" &&
              q.correctAnswerIndex >= 0 &&
              q.correctAnswerIndex < 4
                ? q.correctAnswerIndex
                : 0,
            imageUrl: "",
            optionImages: ["", "", "", ""],
          }),
        );

        setQuizQuestions((prev) => [...prev, ...formattedQuestions]);
        if (aiMode === "lesson") {
          setAiLessonName("");
        } else {
          setAiPrompt("");
        }
        setAiSuccess(
          `تم توليد وإضافة ${formattedQuestions.length} سؤال بنجاح لدرس (${aiMode === "lesson" ? aiLessonName : "المخصص"}) إلى نهاية الاختبار!`,
        );
        setTimeout(() => setAiSuccess(""), 5500);
      } else {
        throw new Error("الاستجابة المستلمة من الذكاء الاصطناعي غير صالحة");
      }
    } catch (err: any) {
      console.error("AI Question Generator Error:", err);
      setAiError(err.message || "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي");
    } finally {
      setAiIsGenerating(false);
    }
  };

  // Dual-mode Batch Quiz Importer States & Logics
  const [quizSubView, setQuizSubView] = useState<
    "create" | "batch_ai" | "batch_structured"
  >("create");
  const [batchImportProgress, setBatchImportProgress] = useState<string>("");
  const [batchIsLoading, setBatchIsLoading] = useState<boolean>(false);
  const [parsedQuizzesToReview, setParsedQuizzesToReview] = useState<any[]>([]);
  const [batchAiText, setBatchAiText] = useState<string>("");
  const [batchStructuredText, setBatchStructuredText] = useState<string>("");

  const handleAiFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setBatchAiText(text);
    };
    reader.readAsText(file);
  };

  const handleStructuredFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setBatchStructuredText(text);
    };
    reader.readAsText(file);
  };

  const handleParseQuizzesWithAI = async () => {
    if (!batchAiText.trim()) {
      alert("الرجاء كتابة أو رفع نص الاختبارات أولاً");
      return;
    }

    setBatchIsLoading(true);
    setBatchImportProgress(
      "جاري فحص وتصفح المستند من قبل الذكاء الاصطناعي وتحليل الاختبارات المطروحة...",
    );

    try {
      const metadata = {
        grades: data.grades
          .filter((g) => !g.isArchived)
          .map((g) => ({ id: g.id, name: g.name })),
        classes: data.classes
          .filter((c) => !c.isArchived)
          .map((c) => ({ id: c.id, name: c.name, gradeId: c.gradeId })),
        subjects: data.subjects
          .filter((s) => !s.isArchived)
          .map((s) => ({
            id: s.id,
            name: s.name,
            gradeId: s.gradeId,
            classIds: s.classIds || [],
          })),
      };

      const response = await fetch("/api/gemini/parse-quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: batchAiText, metadata }),
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.error || "فشل الاتصال بخدمة الذكاء الاصطناعي");
      }

      if (resData.success && Array.isArray(resData.quizzes)) {
        const initialized = resData.quizzes.map((quiz: any, index: number) => ({
          ...quiz,
          id: "temp_" + index + "_" + Date.now(),
          isSelected: true,
          questions: (quiz.questions || []).map((q: any, qIdx: number) => ({
            ...q,
            id:
              "q_" +
              qIdx +
              "_" +
              Date.now() +
              Math.random().toString(36).substr(2, 5),
            optionImages: ["", "", "", ""],
            imageUrl: "",
          })),
        }));
        setParsedQuizzesToReview(initialized);
        setBatchImportProgress("");
      } else {
        throw new Error("لم يقدم الذكاء الاصطناعي رداً على النحو المطلوب.");
      }
    } catch (error: any) {
      console.error(error);
      alert(error.message || "حدث خطأ غير متوقع أثناء الاتصال بالخادم الذكي.");
      setBatchImportProgress("");
    } finally {
      setBatchIsLoading(false);
    }
  };

  const parseStructuredText = () => {
    const raw = batchStructuredText.trim();
    if (!raw) {
      alert("الرجاء كتابة أو لصق البيانات المنظمة أولاً");
      return;
    }

    try {
      if (raw.startsWith("[") || raw.startsWith("{")) {
        const parsed = JSON.parse(raw);
        const quizzesArray = Array.isArray(parsed) ? parsed : [parsed];

        const processed = quizzesArray.map((quiz: any, index: number) => {
          const matchedGrade = data.grades.find(
            (g) => !g.isArchived && g.name.trim() === quiz.gradeName?.trim(),
          );
          const matchedClass = matchedGrade
            ? data.classes.find(
                (c) =>
                  !c.isArchived &&
                  c.gradeId === matchedGrade.id &&
                  c.name.trim() === quiz.className?.trim(),
              )
            : data.classes.find(
                (c) =>
                  !c.isArchived && c.name.trim() === quiz.className?.trim(),
              );
          const matchedSubject = matchedGrade
            ? data.subjects.find(
                (s) =>
                  !s.isArchived &&
                  s.gradeId === matchedGrade.id &&
                  s.name.trim() === quiz.subjectName?.trim(),
              )
            : data.subjects.find(
                (s) =>
                  !s.isArchived && s.name.trim() === quiz.subjectName?.trim(),
              );

          return {
            title: quiz.title || "اختبار رقم " + (index + 1),
            gradeId: matchedGrade?.id || "",
            classIds: matchedClass ? [matchedClass.id] : [],
            subjectIds: matchedSubject ? [matchedSubject.id] : [],
            rawGrade: quiz.gradeName || "",
            rawClass: quiz.className || "",
            rawSubject: quiz.subjectName || "",
            questions: (quiz.questions || []).map((q: any, qIdx: number) => ({
              id:
                "q_" +
                qIdx +
                "_" +
                Date.now() +
                Math.random().toString(36).substr(2, 5),
              text: q.text,
              options: q.options || ["", "", "", ""],
              correctAnswerIndex: parseInt(q.correctAnswerIndex) || 0,
              optionImages: ["", "", "", ""],
              imageUrl: "",
            })),
            id: "temp_struct_" + index + "_" + Date.now(),
            isSelected: true,
          };
        });

        setParsedQuizzesToReview(processed);
        return;
      }

      const lines = raw
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const quizGroups: Record<string, any> = {};

      lines.forEach((line, idx) => {
        let delimiter = "\t";
        if (line.includes("|")) delimiter = "|";
        else if (line.includes(",") && !line.includes("\t")) delimiter = ",";

        const cols = line.split(delimiter).map((c) => c.trim());
        if (cols.length >= 8) {
          let qTitle = cols[0];
          let qSub = cols[1];
          let qGrade = cols[2];
          let qClass = cols[3];
          let qText = cols[4];
          let opt1 = cols[5];
          let opt2 = cols[6];
          let opt3 = cols[7];
          let opt4 = cols[8];
          let correctStr = cols[9] || "0";

          if (cols.length === 9) {
            qTitle = cols[0];
            qSub = cols[1];
            qGrade = cols[2];
            qClass = "";
            qText = cols[3];
            opt1 = cols[4];
            opt2 = cols[5];
            opt3 = cols[6];
            opt4 = cols[7];
            correctStr = cols[8] || "0";
          }

          if (!quizGroups[qTitle]) {
            quizGroups[qTitle] = {
              title: qTitle,
              rawGrade: qGrade,
              rawSubject: qSub,
              rawClass: qClass,
              questions: [],
            };
          }

          quizGroups[qTitle].questions.push({
            text: qText,
            options: [opt1, opt2, opt3, opt4].filter(Boolean),
            correctAnswerIndex: parseInt(correctStr) || 0,
          });
        }
      });

      const quizzesArray = Object.values(quizGroups);
      if (quizzesArray.length === 0) {
        throw new Error(
          "لم يتم العثور على أسطر صالحة للتنسيق المطلوب. يرجى مراجعة شكل الأعمدة المطروحة.",
        );
      }

      const processed = quizzesArray.map((quiz: any, index: number) => {
        const matchedGrade = data.grades.find(
          (g) => !g.isArchived && g.name.trim() === quiz.rawGrade?.trim(),
        );
        const matchedClass = matchedGrade
          ? data.classes.find(
              (c) =>
                !c.isArchived &&
                c.gradeId === matchedGrade.id &&
                c.name.trim() === quiz.rawClass?.trim(),
            )
          : data.classes.find(
              (c) => !c.isArchived && c.name.trim() === quiz.rawClass?.trim(),
            );
        const matchedSubject = matchedGrade
          ? data.subjects.find(
              (s) =>
                !s.isArchived &&
                s.gradeId === matchedGrade.id &&
                s.name.trim() === quiz.rawSubject?.trim(),
            )
          : data.subjects.find(
              (s) => !s.isArchived && s.name.trim() === quiz.rawSubject?.trim(),
            );

        return {
          title: quiz.title,
          gradeId: matchedGrade?.id || "",
          classIds: matchedClass ? [matchedClass.id] : [],
          subjectIds: matchedSubject ? [matchedSubject.id] : [],
          rawGrade: quiz.rawGrade || "",
          rawClass: quiz.rawClass || "",
          rawSubject: quiz.rawSubject || "",
          questions: quiz.questions.map((q: any, qIdx: number) => ({
            id:
              "q_" +
              qIdx +
              "_" +
              Date.now() +
              Math.random().toString(36).substr(2, 5),
            text: q.text,
            options:
              q.options.length >= 4
                ? q.options
                : [...q.options, "", "", "", ""].slice(0, 4),
            correctAnswerIndex: q.correctAnswerIndex,
            optionImages: ["", "", "", ""],
            imageUrl: "",
          })),
          id: "temp_struct_" + index + "_" + Date.now(),
          isSelected: true,
        };
      });

      setParsedQuizzesToReview(processed);
    } catch (err: any) {
      alert("فشل التحليل: " + err.message);
    }
  };

  const handleSaveBulkParsedQuizzes = async () => {
    const selectedQuizzes = parsedQuizzesToReview.filter((q) => q.isSelected);
    if (selectedQuizzes.length === 0) {
      alert("الرجاء تحديد اختبار واحد على الأقل للاستيراد");
      return;
    }

    setBatchIsLoading(true);
    setBatchImportProgress("جاري تهيئة وحفظ الاختبارات بقاعدة البيانات...");

    try {
      let savedCount = 0;
      for (const quiz of selectedQuizzes) {
        const id =
          "quiz_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);

        const quizToSave: any = {
          title: quiz.title,
          status: quiz.status || "published",
          gradeId: quiz.gradeId || "",
          classIds: quiz.classIds || [],
          subjectIds: quiz.subjectIds || [],
          imageUrl: "",
          questions: quiz.questions.map((q: any) => ({
            id: q.id,
            text: q.text,
            options: q.options,
            optionImages: ["", "", "", ""],
            imageUrl: "",
            correctAnswerIndex: q.correctAnswerIndex,
          })),
          createdAt: new Date().toISOString(),
          isArchived: false,
          academicYear: academicYear || "2025-2026",
        };

        await firestoreService.saveItem("quizzes", id, quizToSave);
        savedCount++;
      }

      alert(
        `تم بنجاح استيراد ${savedCount} اختبار مجهّز ومطابق للفصول الدراسية والمواد!`,
      );
      setParsedQuizzesToReview([]);
      setBatchAiText("");
      setBatchStructuredText("");
      setQuizSubView("create");
    } catch (err: any) {
      console.error(err);
      alert("حدث خطأ أثناء حفظ الاختبارات: " + err.message);
    } finally {
      setBatchIsLoading(false);
      setBatchImportProgress("");
    }
  };

  const handleBulkQuestionsImport = () => {
    if (!bulkQuizText.trim()) return;
    const lines = bulkQuizText.split("\n").filter((l) => l.trim());
    const newQuestions: MCQQuestion[] = [];

    lines.forEach((line) => {
      const parts = line.split("|").map((s) => s.trim());
      if (parts.length >= 6) {
        const [text, o1, o2, o3, o4, correct] = parts;
        newQuestions.push({
          id: "q_" + Date.now() + Math.random().toString(36).substr(2, 5),
          text,
          options: [o1, o2, o3, o4],
          optionImages: ["", "", "", ""],
          imageUrl: "",
          correctAnswerIndex: parseInt(correct) || 0,
        });
      }
    });

    setQuizQuestions([...quizQuestions, ...newQuestions]);
    setBulkQuizText("");
    setShowBulkAdd(false);
  };

  const resetForms = () => {
    setGradeName("");
    setGradeStage("primary");
    setTeacherName("");
    setTeacherNationalId("");
    setClassName("");
    setTargetGradeId("");
    setStudentName("");
    setStudentNationalId("");
    setTargetClassId("");
    setStudentPhotoUrl("");
    setSubjectName("");
    setTargetTeacherId("");
    setSelectedClassIds([]);
    setSkillName("");
    setTargetSubjectName("");
    setSkillQuestions("");
    setSkillTerm("term1");
    setQuizTitle("");
    setQuizStatus("draft");
    setQuizTerm("term1");
    setQuizSubjectIds([]);
    setQuizSubjectName("");
    setQuizSelectedGradeId("");
    setQuizQuestions([]);
    setQuizImageUrl("");
    setQuizBookId("");
    setQuizBookPageReference("");
    setCurrentQText("");
    setCurrentQImageUrl("");
    setCurrentQOptions(["", "", "", ""]);
    setCurrentQOptionImages(["", "", "", ""]);
    setCurrentQCorrect(0);
    setRubricName("");
    setRubricCategories([]);
    setIsPeerRubric(false);
    setNewCatTitle("");
    setNewItemTitle("");
    setExtProfileId("");
    setExtProfileName("");
    setExtProfileRole("teacher");
    setExtProfileTeacherId("");
    setSupervisorType("general");
    setSupervisorAllowedGradeIds([]);
    setSupervisorAllowedClassIds([]);
    setEditingId(null);
    setParsedTeachers([]);
    setParsedStudents([]);
    // Student Book Forms Reset
    setBookTitle("");
    setBookSelectedGradeId("");
    setBookSubjectName("");
    setBookTerm("term1");
    setBookChapters([]);
    setEditingBookId(null);
    setNewChapterTitle("");
    setNewChapterContent("");
    setNewChapterPages("");
    setEditingChapterIndex(null);
    setAiChapterGenerating(false);
  };

  const handleSaveBook = async () => {
    if (!bookTitle.trim()) {
      alert("يرجى كتابة عنوان للتسمية");
      return;
    }
    if (!bookSelectedGradeId) {
      alert("يرجى تحديد الصف الدراسي");
      return;
    }
    if (!bookSubjectName || !bookSubjectName.trim()) {
      alert("يرجى تحديد المادة الدراسية");
      return;
    }

    let finalChapters = [...bookChapters];
    if (newChapterTitle.trim()) {
      const alreadyExists = finalChapters.some(ch => ch.title.trim() === newChapterTitle.trim());
      if (!alreadyExists) {
        finalChapters.push({
          id: "chap_" + Date.now() + Math.random().toString(36).substr(2, 4),
          title: newChapterTitle.trim(),
          content: newChapterContent.trim() || "محتوى وشرح مرجعي للدرس",
          pages: newChapterPages.trim() || undefined
        });
      }
    }

    if (finalChapters.length === 0) {
      alert("يرجى إضافة درس أو باب واحد على الأقل للمنهج الدراسي قبل الحفظ");
      return;
    }

    const bId = editingBookId || "book_" + Date.now();
    const bookDataToSave = {
      id: bId,
      title: bookTitle.trim(),
      gradeId: bookSelectedGradeId,
      subjectName: bookSubjectName.trim(),
      term: bookTerm,
      chapters: finalChapters,
      isArchived: false,
      updatedAt: new Date().toISOString()
    };

    try {
      await firestoreService.saveItem("studentBooks", bId, bookDataToSave);
      alert(editingBookId ? "تم تعديل المنهج بنجاح!" : "تم إضافة المنهج بنجاح!");
      resetForms();
    } catch (e) {
      console.error(e);
      alert("حدث خطأ أثناء الحفظ");
    }
  };

  const handleEditBook = (book: any) => {
    setEditingBookId(book.id);
    setBookTitle(book.title);
    setBookSelectedGradeId(book.gradeId);
    setBookSubjectName(book.subjectName);
    setBookTerm(book.term || "term1");
    setBookChapters(book.chapters || []);
    setNewChapterTitle("");
    setNewChapterContent("");
    setNewChapterPages("");
    setEditingChapterIndex(null);
    setActiveTab("books");
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>, type: "teachers" | "students") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      const parsed: any[] = [];

      // Check if first line contains header keywords
      const firstLine = lines[0] || "";
      const startIdx = (firstLine.includes("الاسم") || firstLine.includes("Name") || firstLine.includes("الهوية") || firstLine.includes("id")) ? 1 : 0;

      for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i];
        const cols = line.split(/[,;\t]/).map(c => c.trim().replace(/^["']|["']$/g, ""));
        if (cols.length > 0 && cols[0]) {
          const name = cols[0];
          const nationalId = cols[1] || "";
          if (type === "students") {
            const gradeName = cols[2] || "";
            const className = cols[3] || "";
            parsed.push({ name, nationalId, gradeName, className });
          } else {
            parsed.push({ name, nationalId });
          }
        }
      }

      if (parsed.length > 0) {
        if (type === "teachers") {
          setParsedTeachers(parsed);
        } else {
          setParsedStudents(parsed);
        }
      } else {
        alert("لم نتمكن من العثور على أي أسماء في الملف. تأكد من صحة الصيغة.");
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  const handleAddQuestion = () => {
    if (!currentQText.trim()) {
      alert("يرجى كتابة نص السؤال");
      return;
    }
    const filledOptions = currentQOptions.filter((o) => o.trim() !== "");
    if (filledOptions.length < 2) {
      alert("يرجى كتابة خيارين على الأقل للإجابة");
      return;
    }

    // Ensure the correct answer index is still valid among filled options
    // If we just save as is, but we want to allow empty options, we can either keep them empty or filter.
    // However, the quiz player expects options array. It's safer to just require all 4 options, OR just alert.
    if (currentQOptions.some((o) => !o.trim())) {
      alert("يرجى تعبئة جميع الخيارات الأربعة");
      return;
    }

    const newQ: MCQQuestion = {
      id: "q_" + Date.now(),
      text: currentQText,
      imageUrl: currentQImageUrl.trim() || undefined,
      options: [...currentQOptions],
      optionImages: currentQOptionImages.some((img) => img.trim())
        ? [...currentQOptionImages]
        : undefined,
      correctAnswerIndex: currentQCorrect,
    };
    setQuizQuestions([...quizQuestions, newQ]);
    setCurrentQText("");
    setCurrentQImageUrl("");
    setCurrentQOptions(["", "", "", ""]);
    setCurrentQOptionImages(["", "", "", ""]);
    setCurrentQCorrect(0);
  };

  const handleSaveQuiz = async () => {
    if (
      !quizTitle ||
      quizSubjectIds.length === 0 ||
      quizQuestions.length === 0
    ) {
      alert(
        "يرجى ملء جميع البيانات المطلوبة (عنوان الاختبار، المادة المعنية، والأسئلة) قبل الحفظ.",
      );
      return;
    }
    setIsProcessing(true);
    try {
      const id = editingId || "quiz_" + Date.now();

      // Collect target grade and class info from selected subjects
      const selectedSubjects = quizSubjectIds
        .map((sId) => data.subjects.find((s) => s.id === sId))
        .filter(Boolean) as Subject[];
      const gradeIds = Array.from(
        new Set(selectedSubjects.map((s) => s.gradeId)),
      );
      const classIds = Array.from(
        new Set(
          selectedSubjects.flatMap(
            (s) => s.classIds || (s.classId ? [s.classId] : []),
          ),
        ),
      );

      // Grab stage from the first selected grade
      const stageId =
        gradeIds.length > 0
          ? data.grades.find((g) => g.id === gradeIds[0])?.stage || "primary"
          : "primary";

      const quizToSave: any = {
        title: quizTitle,
        status: quizStatus || "draft",
        term: quizTerm,
        createdAt: new Date().toISOString(),
        stageId,
        subjectName: quizSubjectName,
        gradeId: gradeIds[0] || "", // Keep for backward compatibility
        classIds: classIds,
        subjectIds: quizSubjectIds,
        teacherId: filterTeacherId,
        imageUrl: (quizImageUrl || "").trim(),
        bookId: quizBookId || undefined,
        bookPageReference: (quizBookPageReference || "").trim() || undefined,
        questions: quizQuestions
          .map((q) => ({
            ...q,
            imageUrl: q.imageUrl || null,
            optionImages: q.optionImages || null,
          }))
          .map((q) => {
            // Remove undefined fields recursively
            const cleanQ = { ...q };
            Object.keys(cleanQ).forEach((key) => {
              if ((cleanQ as any)[key] === undefined) {
                delete (cleanQ as any)[key];
              }
            });
            return cleanQ;
          }),
      };

      // Clean top-level object of undefined values
      Object.keys(quizToSave).forEach((key) => {
        if (quizToSave[key] === undefined) {
          delete quizToSave[key];
        }
      });

      await firestoreService.saveItem("quizzes", id, quizToSave);
      resetForms();
      setQuizQuestions([]); // Reset questions after saving
      alert("تم حفظ الاختبار بنجاح");
    } catch (err: any) {
      let errorMessage = "حدث خطأ أثناء حفظ الاختبار";
      try {
        const errorInfo = JSON.parse(err.message);
        errorMessage = `خطأ في الحفظ: ${errorInfo.error}`;
      } catch (e) {
        errorMessage = err.message;
      }
      alert(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddGrade = async () => {
    if (!gradeName) return;
    const id = editingId || "g_" + Date.now();
    await firestoreService.saveItem("grades", id, {
      name: gradeName.trim(),
      stage: gradeStage,
    });
    resetForms();
  };

  const handleAddTeacher = async () => {
    const itemsToSave = parsedTeachers.length > 0 
      ? parsedTeachers 
      : [{ name: teacherName.trim(), nationalId: teacherNationalId.trim() }];

    if (itemsToSave.length === 1 && !itemsToSave[0].name) return;
    setIsProcessing(true);
    try {
      for (const item of itemsToSave) {
        if (!item.name) continue;
        const id = editingId || "t_" + Date.now() + Math.random().toString(36).substr(2, 5);
        
        let rawNatId = item.nationalId.trim();
        let formattedNatId = "";
        if (rawNatId) {
          formattedNatId = rawNatId.toLowerCase().startsWith("t") 
            ? rawNatId.toLowerCase() 
            : "t" + rawNatId;
        }

        // 1. Save Teacher document
        await firestoreService.saveItem("teachers", id, {
          name: item.name,
          nationalId: formattedNatId,
          isArchived: false,
        });

        // 2. Format teacher login profile ID with "t" prefix if not yet there

        const existingProfile = data.externalProfiles?.find(
          (p) => p.linkedTeacherId === id
        );

        if (formattedNatId) {
          // If the login ID changed, delete the old profile document
          if (existingProfile && existingProfile.id !== formattedNatId) {
            await firestoreService.deleteItem("externalProfiles", existingProfile.id);
          }
          // Save/overwrite the external login profile
          await firestoreService.saveItem("externalProfiles", formattedNatId, {
            id: formattedNatId,
            name: item.name,
            role: "teacher",
            linkedTeacherId: id,
            isArchived: false,
            createdAt: new Date(),
          });
        } else if (existingProfile) {
          // If National ID was cleared out during edit, delete the login profile
          await firestoreService.deleteItem("externalProfiles", existingProfile.id);
        }

        if (editingId) break;
      }
      resetForms();
    } catch (err: any) {
      console.error(err);
      alert("حدث خطأ أثناء حفظ المعلم: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddClass = async () => {
    if (!className || !targetGradeId) return;
    const names = className.split("\n").filter((n) => n.trim() !== "");
    for (const name of names) {
      const id =
        editingId ||
        "c_" + Date.now() + Math.random().toString(36).substr(2, 5);
      await firestoreService.saveItem("classes", id, {
        name: name.trim(),
        gradeId: targetGradeId,
        teacherIds: [],
      });
    }
    resetForms();
  };

  const handleAddStudent = async () => {
    const itemsToSave = parsedStudents.length > 0
      ? parsedStudents
      : [{ name: studentName.trim(), nationalId: studentNationalId.trim(), gradeName: "", className: "" }];

    // If importing single row without a class selected, and no class name in it, abort.
    if (itemsToSave.length === 1 && !targetClassId && (!itemsToSave[0].className || !itemsToSave[0].gradeName)) return;

    setIsProcessing(true);
    try {
      const localGradesCache = new Map<string, string>();
      const localClassesCache = new Map<string, string>();

      for (const item of itemsToSave) {
        if (!item.name) continue;
        const id = Date.now() + Math.random().toString(36).substr(2, 5);
        const studentId = editingId || "st_" + id;

        let rawNatId = item.nationalId.trim();
        let formattedNatId = "";
        if (rawNatId) {
          formattedNatId = rawNatId.toLowerCase().startsWith("s")
            ? rawNatId.toLowerCase()
            : "s" + rawNatId;
        }

        let finalClassId = targetClassId;

        // Auto-detect or create grade and class if provided in CSV
        if (item.gradeName && item.className) {
           let gradeNameClean = item.gradeName.trim();
           let classNameClean = item.className.trim();
           
           let gId = localGradesCache.get(gradeNameClean);
           if (!gId) {
             const existingGrade = data.grades.find(g => g.name.trim() === gradeNameClean);
             if (existingGrade) {
               gId = existingGrade.id;
             } else {
               gId = "gr_" + Date.now() + Math.random().toString(36).substr(2, 5);
               await firestoreService.saveItem("grades", gId, { name: gradeNameClean, stage: "primary" });
             }
             localGradesCache.set(gradeNameClean, gId);
           }

           const cacheClassKey = gId + "_" + classNameClean;
           let cId = localClassesCache.get(cacheClassKey);
           if (!cId) {
             const existingClass = data.classes.find(c => c.name.trim() === classNameClean && c.gradeId === gId);
             if (existingClass) {
               cId = existingClass.id;
             } else {
               cId = "cl_" + Date.now() + Math.random().toString(36).substr(2, 5);
               await firestoreService.saveItem("classes", cId, { name: classNameClean, gradeId: gId, isArchived: false });
             }
             localClassesCache.set(cacheClassKey, cId);
           }

           finalClassId = cId;
        }

        if (!finalClassId) {
          continue;
        }

        await firestoreService.saveItem("students", studentId, {
          name: item.name,
          classId: finalClassId,
          isArchived: false,
          academicYear: academicYear || "2025-2026",
          photoUrl: studentPhotoUrl.trim() || "",
          nationalId: formattedNatId,
        });

        if (editingId) break;
      }
      resetForms();
    } catch (err: any) {
      console.error(err);
      alert("حدث خطأ أثناء حفظ الطالب: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper to get unique subject names
  const getSubjectOptions = () => {
    const names = data.subjects.filter((s) => !s.isArchived).map((s) => s.name);
    return [...new Set(names)].sort();
  };

  // Helper to group subjects by grade + name for Skills and Quizzes
  const getGroupedSubjects = () => {
    const grouped = data.subjects
      .filter((s) => !s.isArchived)
      .reduce(
        (acc, sub) => {
          const cls = data.classes.find((c) => c.id === sub.classId);
          if (!cls?.gradeId) {
            // Keep non-graded subjects as is
            acc[sub.id] = {
              name: sub.name,
              gradeId: "",
              id: sub.id,
              className: cls?.name || "بدون فصل",
            };
            return acc;
          }
          const key = `${cls.gradeId}-${sub.name}`;
          if (!acc[key]) {
            acc[key] = {
              name: sub.name,
              gradeId: cls.gradeId,
              id: sub.id, // pick one representative
              className:
                data.grades.find((g) => g.id === cls.gradeId)?.name ||
                "غير محدد",
            };
          }
          return acc;
        },
        {} as Record<
          string,
          { name: string; gradeId: string; id: string; className: string }
        >,
      );
    return Object.values(grouped);
  };

  const handleAddSubject = async () => {
    if (
      !subjectName ||
      !targetTeacherId ||
      !targetGradeId ||
      selectedClassIds.length === 0
    ) {
      alert("يجب تعبئة جميع الحقول واختيار فصل واحد على الأقل");
      return;
    }
    setIsProcessing(true);

    try {
      const teacher = data.teachers.find((t) => t.id === targetTeacherId);
      const subjectNamesList = subjectName
        .split(/[,،-]/)
        .map((s) => s.trim())
        .filter(Boolean);

      const promises = subjectNamesList.map((sName, sIdx) => {
        const id =
          editingId && sIdx === 0
            ? editingId
            : "sub_" + Date.now() + "_" + sIdx;
        return firestoreService.saveItem("subjects", id, {
          name: sName,
          teacherId: targetTeacherId,
          teacherName: teacher?.name || "",
          gradeId: targetGradeId,
          classIds: selectedClassIds,
          classId: selectedClassIds[0], // Legacy support
        });
      });

      await Promise.all(promises);

      resetForms();
      alert("تم حفظ المادة بنجاح للفصول المحددة");
    } catch (err) {
      alert("حدث خطأ أثناء الحفظ");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddSkill = async () => {
    if (
      !skillName ||
      !targetGradeId ||
      !targetSubjectName ||
      !skillQuestions.trim()
    ) {
      alert(
        "يرجى ملء جميع الحقول المطلوبة (الاسم، الصف، اسم المادة، والأسئلة)",
      );
      return;
    }
    const id = editingId || "s_" + Date.now();
    const questions = skillQuestions.split("\n").filter((q) => q.trim() !== "");
    setIsProcessing(true);
    try {
      await firestoreService.saveItem("skills", id, {
        name: skillName,
        gradeId: targetGradeId,
        subjectName: targetSubjectName,
        questions,
        term: skillTerm || "term1",
        createdAt: new Date().toISOString(),
      });
      alert("تم حفظ المهارة بنجاح");
      resetForms();
    } catch (err: any) {
      alert("حدث خطأ أثناء الحفظ: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddExternalProfile = async () => {
    if (!extProfileId || !extProfileName) {
      alert("يرجى إدخال رقم الهوية والاسم");
      return;
    }
    setIsProcessing(true);
    try {
      await firestoreService.saveItem("externalProfiles", extProfileId, {
        id: extProfileId,
        name: extProfileName,
        role: extProfileRole,
        linkedTeacherId:
          extProfileRole === "teacher" ? extProfileTeacherId : null,
        supervisorType: extProfileRole === "supervisor" ? supervisorType : null,
        allowedGradeIds: extProfileRole === "supervisor" ? supervisorAllowedGradeIds : [],
        allowedClassIds: extProfileRole === "supervisor" ? supervisorAllowedClassIds : [],
        isArchived: false,
        createdAt: new Date(),
      });
      resetForms();
      alert("تم حفظ الملف بنجاح");
    } catch (err: any) {
      alert("حدث خطأ أثناء الحفظ: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEdit = (type: string, item: any) => {
    setEditingId(item.id);
    if (type === "grades") {
      setGradeName(item.name);
      setGradeStage(item.stage || "primary");
    } else if (type === "teachers") {
      setTeacherName(item.name);
      const profile = data.externalProfiles?.find(p => p.linkedTeacherId === item.id);
      setTeacherNationalId(profile ? profile.id : "");
    } else if (type === "classes") {
      setClassName(item.name);
      setTargetGradeId(item.gradeId || "");
    } else if (type === "students") {
      setStudentName(item.name);
      setStudentNationalId(item.nationalId || "");
      setTargetClassId(item.classId);
      setStudentPhotoUrl(item.photoUrl || "");
    } else if (type === "subjects") {
      setSubjectName(item.name);
      setTargetTeacherId(item.teacherId);
      setTargetGradeId(item.gradeId);
      setSelectedClassIds(
        item.classIds || (item.classId ? [item.classId] : []),
      );
    } else if (type === "skills") {
      setSkillName(item.name);
      setTargetGradeId(item.gradeId || "");
      setTargetSubjectName(item.subjectName || "");
      setSkillQuestions(item.questions.join("\n"));
      setSkillTerm(item.term || "term1");
    } else if (type === "quizzes") {
      setQuizTitle(item.title);
      setQuizStatus(item.status || "draft");
      setQuizTerm(item.term || "term1");
      const subIds =
        item.subjectIds || (item.subjectId ? [item.subjectId] : []);
      setQuizSubjectIds(subIds);
      setQuizSubjectName(
        item.subjectName ||
          (subIds.length > 0 &&
            data.subjects.find((s) => s.id === subIds[0])?.name) ||
          "",
      );
      if (subIds.length > 0) {
        const sub = data.subjects.find((s) => s.id === subIds[0]);
        if (sub) {
          setQuizSelectedGradeId(sub.gradeId);
        } else {
          setQuizSelectedGradeId("");
        }
      } else {
        setQuizSelectedGradeId("");
      }
      setQuizImageUrl(item.imageUrl || "");
      setQuizBookId(item.bookId || "");
      setQuizBookPageReference(item.bookPageReference || "");
      setQuizQuestions(item.questions);
      if (item.bookId) {
        setAiSelectedBookId(item.bookId);
        setAiMode("book");
      }
    } else if (type === "rubrics") {
      setRubricName(item.name);
      setRubricCategories(item.categories || []);
      setIsPeerRubric(!!item.isPeerRubric);
    } else if (type === "external_profiles") {
      setExtProfileId(item.id);
      setExtProfileName(item.name);
      setExtProfileRole(item.role);
      setExtProfileTeacherId(item.linkedTeacherId || "");
      setSupervisorType(item.supervisorType || "general");
      setSupervisorAllowedGradeIds(item.allowedGradeIds || []);
      setSupervisorAllowedClassIds(item.allowedClassIds || []);
    }
  };

  const handleArchive = async (collectionName: string, item: any) => {
    setConfirmConfig({
      isOpen: true,
      title: "تأكيد الأرشفة",
      message: `هل أنت متأكد من أرشفة "${item.name}"؟ لن يظهر في القوائم النشطة ولكن سيتم الاحتفاظ ببياناته.`,
      confirmLabel: "تأكيد الأرشفة",
      isDestructive: false,
      onConfirm: async () => {
        closeConfirm();
        setIsProcessing(true);
        try {
          await firestoreService.saveItem(collectionName, item.id, {
            ...item,
            isArchived: true,
          });
        } catch (err: any) {
          console.error("Archive error:", err);
          alert("حدث خطأ أثناء الأرشفة: " + (err.message || "خطأ غير معروف"));
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };

  const handleDelete = async (
    collectionName: string,
    id: string,
    label: string = "",
  ) => {
    const itemName = label || "هذا العنصر";
    const isQuiz = collectionName === "quizzes";
    setConfirmConfig({
      isOpen: true,
      title: isQuiz ? "تأكيد حذف الاختبار" : "تأكيد الحذف النهائي",
      message: isQuiz
        ? `🚨 تحذير هام: أنت على وشك حذف الاختبار "${itemName}" نهائياً. تأكد من أن هذا الاختبار غير مستخدم في تقارير الطلاب أو سجلات الإنجاز، لأن الحذف سيؤدي إلى فقدان كافة النتائج المرتبطة به. هل تريد الاستمرار؟`
        : `🚨 هل أنت متأكد من حذف "${itemName}"؟ سيتم حذف جميع البيانات المرتبطة به للأبد ولا يمكن التراجع.`,
      confirmLabel: isQuiz ? "حذف الاختبار نهائياً" : "حذف نهائي للأبد",
      isDestructive: true,
      onConfirm: async () => {
        closeConfirm();
        setIsProcessing(true);
        try {
          // Cascading deletions logic
          if (collectionName === "students") {
            // Delete student evaluations
            const studentEvals = Object.keys(evaluations).filter((key) =>
              key.startsWith(id + "-"),
            );
            for (const key of studentEvals) {
              const parts = key.split("-");
              if (parts.length >= 4) {
                const stId = parts[0];
                const skId = parts[1];
                const isBase = parts[2];
                const year = parts.slice(3).join("-");
                await firestoreService.deleteEvaluation(stId, skId, year);
              }
            }
          } else if (collectionName === "classes") {
            const studentsInClass = data.students.filter(
              (s) => s.classId === id,
            );
            if (studentsInClass.length > 0) {
              // Special case for class deletion with students
              setConfirmConfig({
                isOpen: true,
                title: "إدارة طلاب الفصل",
                message: `هذا الفصل يحتوي على ${studentsInClass.length} طلاب. هل تريد حذف الطلاب أيضاً؟ (إلغاء سيقوم فقط بفك ارتباطهم)`,
                confirmLabel: "حذف الطلاب أيضاً",
                isDestructive: true,
                onConfirm: async () => {
                  closeConfirm();
                  setIsProcessing(true);
                  for (const student of studentsInClass) {
                    await firestoreService.deleteItem("students", student.id);
                  }
                  await firestoreService.deleteItem(collectionName, id);
                  setIsProcessing(false);
                },
              });
              // Return and wait for secondary confirmation
              return;
            }
          } else if (collectionName === "teachers") {
            const teacherSubjects = data.subjects.filter(
              (s) => s.teacherId === id || s.teacherIds?.includes(id),
            );
            for (const subject of teacherSubjects) {
              await firestoreService.saveItem("subjects", subject.id, {
                ...subject,
                teacherId: "",
                teacherName: "معلم غير محدد",
              });
            }
          } else if (collectionName === "quizzes") {
            const classResults = (data.quizResults || []).filter(
              (r) => r.quizId === id,
            );
            for (const result of classResults) {
              await firestoreService.deleteItem("quizResults", result.id);
            }
          } else if (collectionName === "subjects") {
            const subSkills = data.skills.filter((s) => s.subjectId === id);
            for (const skill of subSkills) {
              await firestoreService.deleteItem("skills", skill.id);
            }
            const subQuizzes = data.quizzes.filter((q) =>
              q.subjectIds?.includes(id),
            );
            for (const quiz of subQuizzes) {
              const qResults = (data.quizResults || []).filter(
                (r) => r.quizId === quiz.id,
              );
              for (const result of qResults) {
                await firestoreService.deleteItem("quizResults", result.id);
              }
              await firestoreService.deleteItem("quizzes", quiz.id);
            }
          }

          await firestoreService.deleteItem(collectionName, id);
        } catch (err: any) {
          console.error("Delete error:", err);
          alert("حدث خطأ أثناء الحذف: " + (err.message || "خطأ غير معروف"));
        } finally {
          setIsProcessing(false);
        }
      },
    });
  };

  return (
    <div className="flex-1 flex w-full h-full bg-slate-50/50 relative overflow-hidden font-sans" dir="rtl">
      {isProcessing && (
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-[100] flex flex-col items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full mb-4"
          />
          <p className="font-black text-indigo-900">جاري معالجة البيانات...</p>
        </div>
      )}
      
      {/* Mobile Sidebar Overlay Backdrop */}
      {isMobileSidebarOpen && (
        <div 
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-[2px] z-40 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:relative inset-y-0 right-0 w-72 lg:w-72 bg-white border-l border-slate-200 p-6 flex flex-col gap-6 overflow-y-auto shrink-0 scrollbar-hide z-50 lg:translate-x-0 transition-transform duration-300
        ${isMobileSidebarOpen ? "translate-x-0 shadow-2xl" : "translate-x-full"}
      `}>
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shrink-0">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 leading-none">
                الإدارة
              </h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                إدارة النظام
              </p>
            </div>
          </div>
          
          {/* Close Sidebar Button for Mobile Drawer */}
          <button
            onClick={() => setIsMobileSidebarOpen(false)}
            className="lg:hidden w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-red-50 hover:text-red-500 text-slate-500 transition-all active:scale-95 shrink-0"
            title="إغلاق القائمة"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex flex-col gap-8 pb-10">
          <div className="space-y-2">
            <TabButton
              active={activeTab === "overview"}
              onClick={() => selectTab("overview")}
              icon={<LayoutDashboard size={18} />}
              label="نظرة عامة"
            />
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 mb-3">
              الهيكل التنظيمي
            </p>
            <TabButton
              active={activeTab === "grades"}
              onClick={() => selectTab("grades")}
              icon={<ListRestart size={18} />}
              label="المراحل والصفوف"
            />
            <TabButton
              active={activeTab === "classes"}
              onClick={() => selectTab("classes")}
              icon={<Building size={18} />}
              label="الفصول الدراسية"
            />
            <TabButton
              active={activeTab === "subjects"}
              onClick={() => selectTab("subjects")}
              icon={<BookOpen size={18} />}
              label="إسناد المواد"
            />
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 mb-3">
              الأشخاص والطلاب
            </p>
            <TabButton
              active={activeTab === "teachers"}
              onClick={() => selectTab("teachers")}
              icon={<Users size={18} />}
              label="المعلمون"
            />
              <TabButton
                active={activeTab === "students"}
                onClick={() => selectTab("students")}
                icon={<UserPlus size={18} />}
                label="الطلاب"
              />
            </div>

            <div className="space-y-3">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 mb-4 drop-shadow-sm">
                المحتوى والأدوات
              </p>
              <TabButton
                active={activeTab === "skills"}
                onClick={() => selectTab("skills")}
                icon={<Star size={18} />}
                label="بنك المهارات"
              />
              <TabButton
                active={activeTab === "quizzes"}
                onClick={() => selectTab("quizzes")}
                icon={<BrainCircuit size={18} />}
                label="الاختبارات الذكية"
              />
              <TabButton
                active={activeTab === "books"}
                onClick={() => selectTab("books")}
                icon={<BookOpen size={18} />}
                label="بنك الكتب المدرسية"
              />
              <TabButton
                active={activeTab === "rubrics"}
                onClick={() => selectTab("rubrics")}
                icon={<ShieldCheck size={18} />}
                label="معايير الزيارات"
              />
              <TabButton
                active={activeTab === "external_profiles"}
                onClick={() => selectTab("external_profiles")}
                icon={<ShieldCheck size={18} />}
                label="صلاحيات الدخول"
              />
            </div>

            <div className="space-y-3">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 mb-4 drop-shadow-sm">
                الإعدادات
              </p>
              <TabButton
                active={activeTab === "archive"}
                onClick={() => selectTab("archive")}
                icon={<Archive size={18} />}
                label="الأرشفة والترفيع"
              />
              <TabButton
                active={activeTab === "system_settings"}
                onClick={() => selectTab("system_settings")}
                icon={<Settings size={18} />}
                label="شعار النظام"
              />
            </div>
          </nav>

          <div className="mt-auto space-y-3 pt-6 border-t border-slate-200">
            {/* Simplified Filters - removed the crowded dropdowns from first view */}
            <button
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 py-5 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 active:scale-95 transition-all"
            >
              إغلاق الإدارة
            </button>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto scrollbar-hide">
          {/* Mobile Top Header Bar */}
          <div className="flex md:hidden items-center justify-between mb-4 bg-gradient-to-l from-slate-900 to-indigo-955 bg-gradient-to-l from-slate-900 to-indigo-950 text-white p-4 rounded-2xl shadow-md border border-white/5 shrink-0">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all text-white border border-white/10"
                title="افتح القائمة"
              >
                <Menu size={20} />
              </button>
              <div>
                <h3 className="font-black text-xs">إدارة مدرسة التميز</h3>
                <p className="text-[9px] text-indigo-200 mt-0.5 font-bold">
                  {activeTab === "grades" && "المراحل والصفوف"}
                  {activeTab === "classes" && "الفصول الدراسية"}
                  {activeTab === "subjects" && "إسناد المواد"}
                  {activeTab === "teachers" && "المعلمون"}
                  {activeTab === "students" && "الطلاب"}
                  {activeTab === "skills" && "بنك المهارات"}
                  {activeTab === "quizzes" && "الاختبارات الذكية"}
                  {activeTab === "rubrics" && "معايير الزيارات"}
                  {activeTab === "external_profiles" && "صلاحيات الدخول"}
                  {activeTab === "archive" && "الأرشفة والترفيع"}
                  {activeTab === "system_settings" && "شعار النظام"}
                  {activeTab === "books" && "بنك الكتب المدرسية"}
                </p>
              </div>
            </div>
            
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-300 flex items-center justify-center hover:bg-rose-500/20 active:scale-95 transition-all border border-rose-500/10"
              title="إغلاق الإدارة"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2 bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
            {/* Grade Selector */}
            <select
              value={filterGradeId}
              onChange={(e) => {
                setFilterGradeId(e.target.value);
                setFilterClassId(""); // reset class filtering
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 font-bold text-[10px] outline-none cursor-pointer text-slate-700 min-w-[100px]"
            >
              <option value="">كل الصفوف</option>
              {data.grades
                .filter((g) => !g.isArchived)
                .map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
            </select>

            {/* Subject Selector */}
            <select
              value={filterSubjectId}
              onChange={(e) => setFilterSubjectId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 font-bold text-[10px] outline-none cursor-pointer text-slate-700 min-w-[100px]"
            >
              <option value="">كل المواد</option>
              {data.subjects
                .filter((s) => !s.isArchived)
                .filter(
                  (s) => !filterGradeId || s.gradeId === filterGradeId,
                )
                .map((s) => {
                  const grade = data.grades.find((g) => g.id === s.gradeId);
                  return (
                    <option key={s.id} value={s.id}>
                      {s.name} {grade ? `(${grade.name})` : ""}
                    </option>
                  );
                })}
            </select>
            
            <div className="flex-1" />

            <div className="relative w-full max-w-[150px]">
              <Search
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
                size={12}
              />
              <input
                type="text"
                placeholder="بحث..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 bg-slate-50 border border-slate-200 rounded-lg pr-7 pl-2 font-bold text-[10px] outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>
            
            {/* Clear Filters Button */}
            {(filterGradeId || filterSubjectId) && (
              <button
                onClick={() => {
                  setFilterGradeId("");
                  setFilterSubjectId("");
                  setFilterClassId("");
                }}
                className="p-1.5 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-500 hover:text-white transition-all flex items-center gap-1"
                title="مسح التصفية"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {activeTab === "overview" && (
            <div className="space-y-6">
              <TabTitle
                title="نظرة عامة على النظام"
                description="احصائيات شاملة للنظام التعليمي وإدارة البيانات"
              />
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center items-center gap-1 hover:border-indigo-200 transition-all">
                  <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-1">
                    <Building size={16} />
                  </div>
                  <span className="text-xl font-black text-slate-800">{data.classes?.length || 0}</span>
                  <span className="text-[10px] font-bold text-slate-500 text-center">فصل دراسي</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center items-center gap-1 hover:border-blue-200 transition-all">
                  <div className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-1">
                    <UserPlus size={16} />
                  </div>
                  <span className="text-xl font-black text-slate-800">{data.students?.length || 0}</span>
                  <span className="text-[10px] font-bold text-slate-500 text-center">طالب مسجل</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center items-center gap-1 hover:border-purple-200 transition-all">
                  <div className="w-9 h-9 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-1">
                    <Users size={16} />
                  </div>
                  <span className="text-xl font-black text-slate-800">{data.teachers?.length || 0}</span>
                  <span className="text-[10px] font-bold text-slate-500 text-center">معلم</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center items-center gap-1 hover:border-amber-200 transition-all">
                  <div className="w-9 h-9 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-1">
                    <BrainCircuit size={16} />
                  </div>
                  <span className="text-xl font-black text-slate-800">{data.quizzes?.length || 0}</span>
                  <span className="text-[10px] font-bold text-slate-500 text-center">اختبار إلكتروني</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <TabCard title="إعدادات سريعة">
                  <div className="flex flex-col gap-3">
                    <button onClick={() => selectTab('students')} className="bg-slate-50 hover:bg-indigo-50 border border-slate-100 p-4 rounded-2xl flex items-center justify-between group transition-all">
                      <div className="flex items-center gap-3">
                        <UserPlus size={20} className="text-indigo-500" />
                        <span className="font-bold text-sm text-slate-700">إدارة الطلاب ونقلهم</span>
                      </div>
                      <ChevronRight size={16} className="text-slate-400 group-hover:text-indigo-600 group-hover:-translate-x-1 transition-all" />
                    </button>
                    <button onClick={() => selectTab('system_settings')} className="bg-slate-50 hover:bg-indigo-50 border border-slate-100 p-4 rounded-2xl flex items-center justify-between group transition-all">
                      <div className="flex items-center gap-3">
                        <Settings size={20} className="text-slate-500" />
                        <span className="font-bold text-sm text-slate-700">إعدادات النظام العامة</span>
                      </div>
                      <ChevronRight size={16} className="text-slate-400 group-hover:text-indigo-600 group-hover:-translate-x-1 transition-all" />
                    </button>
                    <button onClick={() => selectTab('archive')} className="bg-slate-50 hover:bg-rose-50 border border-slate-100 p-4 rounded-2xl flex items-center justify-between group transition-all">
                      <div className="flex items-center gap-3">
                        <Archive size={20} className="text-rose-500" />
                        <span className="font-bold text-sm text-slate-700">ترفيع الطلاب للعام الجديد</span>
                      </div>
                      <ChevronRight size={16} className="text-slate-400 group-hover:text-rose-600 group-hover:-translate-x-1 transition-all" />
                    </button>
                  </div>
                </TabCard>
                <div />
              </div>
            </div>
          )}

          {activeTab === "grades" && (
            <div className="space-y-6">
              <TabTitle
                title="الهيكل والسلم التعليمي"
                description="إدارة المراحل الدراسية والصفوف والفصول"
              />

              <TabCard title="إضافة صف جديد">
                <div className="flex flex-col md:flex-row gap-4 items-center">
                  <select
                    value={gradeStage}
                    onChange={(e) => setGradeStage(e.target.value)}
                    className="h-14 bg-slate-50 border border-slate-200 rounded-xl px-4 font-bold outline-none md:w-64"
                  >
                    <option value="kindergarten">رياض الأطفال</option>
                    <option value="primary">المرحلة الابتدائية</option>
                    <option value="middle">المرحلة المتوسطة</option>
                    <option value="high">المرحلة الثانوية</option>
                  </select>
                  <input
                    type="text"
                    value={gradeName}
                    onChange={(e) => setGradeName(e.target.value)}
                    placeholder="اسم الصف (مثال: الصف الأول)..."
                    className="flex-1 h-14 bg-slate-50 border border-slate-200 rounded-xl px-4 font-bold outline-none"
                  />
                  <button
                    onClick={handleAddGrade}
                    className="bg-indigo-600 text-white h-14 px-8 rounded-xl font-black hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                  >
                    {editingId ? <Save size={18} /> : <Plus size={18} />}
                    {editingId ? "حفظ" : "إضافة"}
                  </button>
                  {editingId && (
                    <button
                      onClick={resetForms}
                      className="bg-slate-200 text-slate-500 py-3 px-4 rounded-xl"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
              </TabCard>

              <div className="flex flex-col gap-8">
                {["kindergarten", "primary", "middle", "high"]
                  .filter((id) => !filterStageId || id === filterStageId)
                  .map((stageId) => {
                    const stageGrades = data.grades.filter(
                      (g) =>
                        !g.isArchived &&
                        (g.stage || "primary") === stageId &&
                        g.name.includes(searchQuery),
                    );
                    if (stageGrades.length === 0) return null;
                    const stageName =
                      stageId === "kindergarten"
                        ? "رياض الأطفال"
                        : stageId === "primary"
                          ? "المرحلة الابتدائية"
                          : stageId === "middle"
                            ? "المرحلة المتوسطة"
                            : "المرحلة الثانوية";

                    return (
                      <div key={stageId} className="space-y-4">
                        <h3 className="text-lg font-black text-slate-800 border-b border-slate-100 pb-2">
                          {stageName}
                        </h3>
                        <div className="flex flex-col gap-4">
                          {stageGrades.map((g) => (
                            <GradeManagerCard
                              key={g.id}
                              grade={g}
                              data={data}
                              isProcessing={isProcessing}
                              onEdit={() => handleEdit("grades", g)}
                              onDelete={() =>
                                handleDelete("grades", g.id, g.name)
                              }
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                {data.grades.filter((g) => !g.isArchived).length === 0 && (
                  <div className="text-center p-12 bg-white rounded-3xl border border-dashed border-slate-200">
                    <p className="text-slate-400 font-bold">
                      لا يوجد صفوف مسجلة.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "teachers" && (
            <div className="space-y-6 animate-fadeIn">
              <TabTitle
                title="إدارة المعلمين"
                description="إضافة المعلمين للمدرسة وإدارة حسابات دخولهم."
              />

              <TabCard title={editingId ? "تعديل بيانات معلم" : "إضافة معلمين"}>
                <div className="flex flex-col gap-5">
                  {!editingId && (
                    <div className="flex bg-slate-100 p-1 rounded-2xl w-full max-w-xs">
                      <button
                        type="button"
                        onClick={() => { setTeacherImportMode("single"); setParsedTeachers([]); }}
                        className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
                          teacherImportMode === "single"
                            ? "bg-white text-indigo-600 shadow-sm"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        إضافة فردية
                      </button>
                      <button
                        type="button"
                        onClick={() => setTeacherImportMode("file")}
                        className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
                          teacherImportMode === "file"
                            ? "bg-white text-indigo-600 shadow-sm"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        استيراد ملف Excel/CSV
                      </button>
                    </div>
                  )}

                  {editingId || teacherImportMode === "single" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 mr-1">الاسم</label>
                        <input
                          type="text"
                          value={teacherName}
                          onChange={(e) => setTeacherName(e.target.value)}
                          placeholder="الاسم الكريم..."
                          className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 font-bold outline-none focus:ring-2 focus:ring-indigo-100"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 mr-1">رقم الهوية الوطنية</label>
                        <input
                          type="text"
                          value={teacherNationalId}
                          onChange={(e) => setTeacherNationalId(normalizeNumerals(e.target.value))}
                          placeholder="مثال: 1029384756"
                          className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 font-bold outline-none text-right focus:ring-2 focus:ring-indigo-100"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row gap-3 items-stretch justify-end">
                        <button
                          type="button"
                          onClick={() => downloadCSVTemplate("teachers")}
                          className="text-xs bg-indigo-50 border border-indigo-100 hover:bg-slate-900 hover:text-white hover:border-slate-900 text-indigo-700 px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shrink-0 w-full sm:w-auto"
                        >
                          <Download size={14} />
                          تحميل ملف القالب
                        </button>
                      </div>

                      <div className="relative flex flex-col justify-center items-center p-8 border-2 border-dashed border-slate-200 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50/10 bg-slate-50/50 transition-colors text-center group">
                        <Upload className="text-slate-400 group-hover:text-indigo-500 mb-2 transition-all" size={28} />
                        <span className="text-xs font-black text-slate-600">اختر أو اسحب ملف CSV/TXT للأسماء هنا</span>
                        <input
                          type="file"
                          accept=".csv,.txt"
                          onChange={(e) => handleCSVUpload(e, "teachers")}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </div>

                      {parsedTeachers.length > 0 && (
                        <div className="bg-emerald-50/80 border border-emerald-100 p-5 rounded-2xl flex flex-col gap-3">
                          <p className="text-emerald-800 text-xs font-black flex items-center gap-1">
                            <CheckCircle2 size={16} className="text-emerald-500 animate-bounce" />
                            تم التعرف على ({parsedTeachers.length}) معلمين من الملف:
                          </p>
                          <div className="max-h-40 overflow-y-auto overflow-x-auto w-full bg-white rounded-xl border border-emerald-100/60 shadow-inner">
                            <table className="w-full text-xs text-right">
                              <thead className="bg-slate-50 border-b border-emerald-100/60 text-slate-500 sticky top-0">
                                <tr>
                                  <th className="px-3 py-2 font-black">#</th>
                                  <th className="px-3 py-2 font-black">الاسم</th>
                                  <th className="px-3 py-2 font-black">رقم الهوية</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-emerald-100/30 font-bold text-slate-800">
                                {parsedTeachers.map((p, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/50">
                                    <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                                    <td className="px-3 py-2">{p.name}</td>
                                    <td className="px-3 py-2 font-mono text-indigo-600">{p.nationalId || "-"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <button
                            type="button"
                            onClick={() => setParsedTeachers([])}
                            className="text-rose-500 text-[10px] font-black underline self-start hover:text-rose-700 transition"
                          >
                            إلغاء واستيراد ملف آخر
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleAddTeacher}
                      disabled={isProcessing || (!editingId && teacherImportMode === "single" && !teacherName.trim()) || (!editingId && teacherImportMode === "file" && parsedTeachers.length === 0)}
                      className="flex-1 bg-indigo-600 text-white h-14 rounded-xl font-black hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 disabled:opacity-50"
                    >
                      {editingId ? <Save size={18} /> : <Plus size={18} />}
                      {editingId ? "حفظ التعديلات" : parsedTeachers.length > 0 ? `تأكيد وإضافة (${parsedTeachers.length}) معلمين` : "إضافة المعلم"}
                    </button>
                    {editingId && (
                      <button
                        onClick={resetForms}
                        className="bg-slate-200 text-slate-500 w-14 rounded-xl flex items-center justify-center hover:bg-slate-300 transition-colors"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </TabCard>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.teachers
                  .filter((t) => !t.isArchived)
                  .filter((t) => !filterTeacherId || t.id === filterTeacherId)
                  .filter((t) => t.name.includes(searchQuery))
                  .map((t) => (
                    <div
                      key={t.id}
                      className="p-5 border border-slate-100 rounded-2xl flex justify-between items-center bg-white shadow-sm hover:border-indigo-100 transition-all"
                    >
                      <div>
                        <p className="font-black text-slate-800">{t.name}</p>
                        {t.nationalId && (
                          <div className="flex items-center gap-2 mt-1 mb-2 flex-wrap">
                            <span className="text-slate-300 font-black">•</span>
                            <p className="text-[11px] text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded-md">
                               هوية: {t.nationalId}
                            </p>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1">
                          {data.subjects
                            .filter(
                              (s) =>
                                s.teacherId === t.id ||
                                s.teacherIds?.includes(t.id),
                            )
                            .map((s) => (
                              <span
                                key={s.id}
                                className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full text-[9px] font-black border border-indigo-100"
                              >
                                {s.name} -{" "}
                                {
                                  data.grades.find((g) => g.id === s.gradeId)
                                    ?.name
                                }
                              </span>
                            ))}
                        </div>
                      </div>
                      <div className="flex gap-1 text-slate-400">
                        <button
                          disabled={isProcessing}
                          onClick={() => handleEdit("teachers", t)}
                          className="w-8 h-8 flex items-center justify-center hover:text-indigo-600"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          disabled={isProcessing}
                          onClick={() => handleArchive("teachers", t)}
                          className="w-8 h-8 flex items-center justify-center hover:text-amber-600"
                        >
                          <Archive size={16} />
                        </button>
                        <button
                          disabled={isProcessing}
                          onClick={() => handleDelete("teachers", t.id, t.name)}
                          className="w-8 h-8 flex items-center justify-center hover:text-red-500"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {activeTab === "classes" && (
            <SectionContainer
              title="إدارة الفصول"
              description="إضافة فصول دراسية جديدة"
            >
              <div className="space-y-6">
                <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    <textarea
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      placeholder="أدخل أسماء الفصول (اسم في كل سطر للإضافة السريعة)..."
                      className="flex-[2] h-32 bg-white border border-slate-200 rounded-xl p-4 font-bold outline-none focus:ring-2 focus:ring-indigo-200 resize-none"
                    />
                    <div className="flex-1 flex flex-col gap-4">
                      <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mr-2">
                        تحديد الصف
                      </p>
                      <select
                        value={targetGradeId}
                        onChange={(e) => setTargetGradeId(e.target.value)}
                        className="w-full h-14 bg-white border border-slate-200 rounded-xl px-4 font-bold outline-none"
                      >
                        <option value="">اختر الصف...</option>
                        {data.grades.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={handleAddClass}
                        disabled={isProcessing}
                        className="bg-indigo-600 text-white h-14 rounded-xl font-black hover:bg-indigo-700 transition-colors disabled:opacity-50"
                      >
                        {isProcessing
                          ? "جاري الحفظ..."
                          : editingId
                            ? "حفظ التعديلات"
                            : "إضافة الفصول"}
                      </button>
                    </div>
                  </div>
                  {editingId && (
                    <button
                      onClick={resetForms}
                      className="bg-slate-200 text-slate-500 py-3 rounded-xl flex items-center justify-center"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.classes
                    .filter((c) => !c.isArchived)
                    .filter((c) => !filterClassId || c.id === filterClassId)
                    .filter(
                      (c) => !filterGradeId || c.gradeId === filterGradeId,
                    )
                    .filter(
                      (c) =>
                        !filterStageId ||
                        data.grades.find((g) => g.id === c.gradeId)?.stage ===
                          filterStageId,
                    )
                    .filter((c) => {
                      if (!filterTeacherId) return true;
                      const teacherSubjects = data.subjects.filter(
                        (s) =>
                          s.teacherId === filterTeacherId ||
                          s.teacherIds?.includes(filterTeacherId),
                      );
                      return teacherSubjects.some(
                        (s) => s.gradeId === c.gradeId,
                      );
                    })
                    .filter((c) => c.name.includes(searchQuery))
                    .map((c) => (
                      <div
                        key={c.id}
                        className="p-5 border border-slate-100 rounded-2xl flex justify-between items-center shadow-sm text-right"
                      >
                        <div>
                          <p className="font-black text-slate-800">{c.name}</p>
                          <p className="text-[10px] text-indigo-600 font-bold uppercase">
                            {data.grades.find((g) => g.id === c.gradeId)
                              ?.name || "غير محدد"}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            disabled={isProcessing}
                            onClick={() => handleEdit("classes", c)}
                            title="تعديل"
                            className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all bg-slate-50 rounded-xl disabled:opacity-30"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            disabled={isProcessing}
                            onClick={() => handleArchive("classes", c)}
                            title="أرشفة"
                            className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-all bg-slate-50 rounded-xl disabled:opacity-30"
                          >
                            <Archive size={18} />
                          </button>
                          <button
                            disabled={isProcessing}
                            onClick={() =>
                              handleDelete("classes", c.id, c.name)
                            }
                            title="حذف نهائي"
                            className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-red-500 hover:bg-red-50 transition-all bg-slate-50 rounded-xl disabled:opacity-30"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </SectionContainer>
          )}

          {activeTab === "students" && (
            <SectionContainer
              title="إدارة الطلاب"
              description="تسجيل الطلاب وتعيين فصولهم وهوياتهم الوطنية بدقة."
            >
              <div className="space-y-6 animate-fadeIn">
                <div className="bg-slate-50 border border-slate-200/60 p-6 rounded-3xl flex flex-col gap-6">
                  
                  {!editingId && (
                    <div className="flex bg-slate-200/50 p-1 rounded-2xl w-full max-w-xs">
                      <button
                        type="button"
                        onClick={() => { setStudentImportMode("single"); setParsedStudents([]); }}
                        className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
                          studentImportMode === "single"
                            ? "bg-white text-indigo-600 shadow-sm"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        إضافة فردية
                      </button>
                      <button
                        type="button"
                        onClick={() => setStudentImportMode("file")}
                        className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
                          studentImportMode === "file"
                            ? "bg-white text-indigo-600 shadow-sm"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        استيراد ملف Excel/CSV
                      </button>
                    </div>
                  )}

                  <div className="flex flex-col md:flex-row-reverse gap-6">
                    {/* Left form elements (now on the left visually) */}
                    <div className="space-y-4 flex-1">
                      {editingId || studentImportMode === "single" ? (
                        <>
                          <div className="space-y-1">
                            <label className="text-xs font-black text-slate-400 mr-1">الاسم</label>
                            <input
                              type="text"
                              value={studentName}
                              onChange={(e) => setStudentName(e.target.value)}
                              placeholder="اسم الطالب..."
                              className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 font-bold outline-none focus:ring-2 focus:ring-indigo-100 shadow-sm"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-black text-slate-400 mr-1">رقم الهوية الوطنية</label>
                            <input 
                              type="text"
                              value={studentNationalId}
                              onChange={(e) => setStudentNationalId(normalizeNumerals(e.target.value))}
                              placeholder="رقم الهوية الوطنية..."
                              className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 font-bold outline-none focus:ring-2 focus:ring-indigo-100 shadow-sm"
                            />
                          </div>
                        </>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex flex-col sm:flex-row gap-3 items-stretch justify-end">
                            <button
                              type="button"
                              onClick={() => downloadCSVTemplate("students")}
                              className="text-xs bg-indigo-50 border border-indigo-100 hover:bg-slate-950 hover:text-white hover:border-slate-950 text-indigo-700 px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all w-full sm:w-auto"
                            >
                              <Download size={14} />
                              تحميل ملف القالب
                            </button>
                          </div>

                          <div className="relative flex flex-col justify-center items-center p-8 border-2 border-dashed border-slate-200 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50/10 bg-white transition-colors text-center group">
                            <Upload className="text-slate-400 group-hover:text-indigo-500 mb-2 transition-all" size={28} />
                            <span className="text-xs font-black text-slate-600">اختر أو اسحب ملف CSV/TXT للطلاب هنا</span>
                            <input
                              type="file"
                              accept=".csv,.txt"
                              onChange={(e) => handleCSVUpload(e, "students")}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                          </div>

                          {parsedStudents.length > 0 && (
                            <div className="bg-emerald-50/80 border border-emerald-100 p-4 rounded-2xl flex flex-col gap-2">
                              <p className="text-emerald-800 text-xs font-black flex items-center gap-1">
                                <CheckCircle2 size={16} className="text-emerald-500 animate-bounce" />
                                تم التعرف على ({parsedStudents.length}) طلاب من الملف:
                              </p>
                              <div className="max-h-40 overflow-y-auto overflow-x-auto w-full bg-white rounded-xl border border-emerald-100/60 shadow-inner">
                                <table className="w-full text-xs text-right">
                                  <thead className="bg-slate-50 border-b border-emerald-100/60 text-slate-500 sticky top-0">
                                    <tr>
                                      <th className="px-3 py-2 font-black">#</th>
                                      <th className="px-3 py-2 font-black">الاسم</th>
                                      <th className="px-3 py-2 font-black">رقم الهوية</th>
                                      <th className="px-3 py-2 font-black">الصف</th>
                                      <th className="px-3 py-2 font-black">الفصل</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-emerald-100/30 font-bold text-slate-800">
                                    {parsedStudents.map((p, idx) => (
                                      <tr key={idx} className="hover:bg-slate-50/50">
                                        <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                                        <td className="px-3 py-2">{p.name}</td>
                                        <td className="px-3 py-2 font-mono text-indigo-600">{p.nationalId || "-"}</td>
                                        <td className="px-3 py-2 text-slate-500">{p.gradeName || <span className="text-rose-400 italic">غير محدد</span>}</td>
                                        <td className="px-3 py-2 text-slate-500">{p.className || <span className="text-rose-400 italic">غير محدد</span>}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              <button
                                type="button"
                                onClick={() => setParsedStudents([])}
                                className="text-rose-500 text-[10px] font-black underline self-start hover:text-rose-700 transition"
                              >
                                إلغاء واستيراد ملف آخر
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right form elements */}
                    <div className="space-y-4 flex flex-col justify-end flex-1">
                      <div className="space-y-1">
                        <label className="text-xs font-black text-slate-400 mr-1">الفصل المستهدف</label>
                        <select
                          value={targetClassId}
                          onChange={(e) => setTargetClassId(e.target.value)}
                          className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 font-bold outline-none shadow-sm focus:ring-2 focus:ring-indigo-100"
                        >
                          <option value="">اختر الفصل...</option>
                          {data.classes
                            .filter((c) => !c.isArchived)
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                        </select>
                      </div>

                      <ImageUploader
                        label="صورة الطالب"
                        value={studentPhotoUrl}
                        onChange={setStudentPhotoUrl}
                        placeholder="رابط صورة الطالب..."
                      />

                      <div className="flex gap-2">
                        <button
                          onClick={handleAddStudent}
                          disabled={isProcessing || !targetClassId || (!editingId && studentImportMode === "single" && !studentName.trim()) || (!editingId && studentImportMode === "file" && parsedStudents.length === 0)}
                          className="flex-1 bg-indigo-600 text-white h-14 rounded-xl font-black hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {isProcessing ? (
                            "جاري الحفظ..."
                          ) : editingId ? (
                            <>
                              <Save size={18} />
                              حفظ التعديلات
                            </>
                          ) : (
                            <>
                              <Plus size={18} />
                              {parsedStudents.length > 0 ? `تأكيد وإضافة (${parsedStudents.length}) طلاب` : "إضافة الطالب"}
                            </>
                          )}
                        </button>
                        {editingId && (
                          <button
                            onClick={resetForms}
                            className="bg-slate-200 text-slate-500 w-14 rounded-xl flex items-center justify-center hover:bg-slate-300 transition-colors"
                          >
                            <X size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.students
                    .filter((s) => !s.isArchived)
                    .filter((s) => {
                      if (filterClassId) return s.classId === filterClassId;
                      if (filterGradeId) {
                        const studentClass = data.classes.find(
                          (c) => c.id === s.classId,
                        );
                        return (
                          studentClass && studentClass.gradeId === filterGradeId
                        );
                      }
                      return true;
                    })
                    .filter((s) => {
                      if (!filterTeacherId) return true;
                      const teacherGrades = data.subjects
                        .filter(
                          (sub) =>
                            sub.teacherId === filterTeacherId ||
                            sub.teacherIds?.includes(filterTeacherId),
                        )
                        .map((sub) => sub.gradeId);
                      const studentGradeId = data.classes.find(
                        (c) => c.id === s.classId,
                      )?.gradeId;
                      return (
                        studentGradeId && teacherGrades.includes(studentGradeId)
                      );
                    })
                    .filter((s) => s.name.includes(searchQuery))
                    .map((s) => (
                      <div
                        key={s.id}
                        onClick={() => onSelectStudent && onSelectStudent(s)}
                        className="p-5 border border-slate-100 rounded-2xl flex justify-between items-center shadow-sm bg-white hover:border-indigo-100 hover:shadow-md cursor-pointer transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          {s.photoUrl ? (
                            <img
                              src={s.photoUrl}
                              alt={s.name}
                              className="w-12 h-12 rounded-xl object-cover border border-slate-100"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300">
                              <Plus size={20} />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-black text-slate-800">
                                {s.name}
                              </p>
                              {data.quizResults?.some(
                                (qr) => qr.studentId === s.id,
                              ) && (
                                <CheckCircle2
                                  size={14}
                                  className="text-emerald-500"
                                />
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <p className="text-xs text-indigo-600 font-bold">
                                {data.classes.find((c) => c.id === s.classId)
                                  ?.name || "بدون فصل"}
                              </p>
                              {s.nationalId && (
                                <>
                                  <span className="text-slate-300 font-black">•</span>
                                  <p className="text-[11px] text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded-md">
                                     هوية: {s.nationalId}
                                  </p>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            disabled={isProcessing}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit("students", s);
                            }}
                            title="تعديل"
                            className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all bg-slate-50 rounded-lg disabled:opacity-30"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            disabled={isProcessing}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleArchive("students", s);
                            }}
                            title="أرشفة (انسحاب طالب)"
                            className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-all bg-slate-50 rounded-lg disabled:opacity-30"
                          >
                            <Archive size={16} />
                          </button>
                          <button
                            disabled={isProcessing}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete("students", s.id, s.name);
                            }}
                            title="حذف نهائي"
                            className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-red-500 hover:bg-red-50 transition-all bg-slate-50 rounded-lg disabled:opacity-30"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </SectionContainer>
          )}

          {activeTab === "subjects" && (
            <SectionContainer
              title="إدارة المواد"
              description="إضافة مواد دراسية جديدة وتعيين المعلمين لها"
            >
              <div className="space-y-6">
                <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    <input
                      type="text"
                      value={subjectName}
                      onChange={(e) => setSubjectName(e.target.value)}
                      placeholder="اسم المادة (يمكن إضافة أكثر من مادة مفصولة بفاصلة، مثال: لغتي، رياضيات)"
                      className="flex-[2] bg-white border border-slate-200 rounded-xl px-4 font-bold h-12 outline-none"
                    />
                    <select
                      value={targetTeacherId}
                      onChange={(e) => setTargetTeacherId(e.target.value)}
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-4 font-bold outline-none"
                    >
                      <option value="">اختر المعلم...</option>
                      {data.teachers
                        .filter((t) => !t.isArchived)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                    </select>
                    <select
                      value={targetGradeId}
                      onChange={(e) => {
                        setTargetGradeId(e.target.value);
                        setSelectedClassIds([]); // Reset classes when grade changes
                      }}
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-4 font-bold outline-none"
                    >
                      <option value="">اختر الصف...</option>
                      {data.grades
                        .filter((g) => !g.isArchived)
                        .map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  {targetGradeId && (
                    <div className="flex flex-col gap-2 bg-white p-4 rounded-xl border border-slate-200">
                      <p className="text-xs font-bold text-slate-500">
                        اختر الفصول المستهدفة للمادة مع هذا المعلم:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {data.classes
                          .filter(
                            (c) => !c.isArchived && c.gradeId === targetGradeId,
                          )
                          .map((c) => {
                            const isSelected = selectedClassIds.includes(c.id);
                            return (
                              <button
                                key={c.id}
                                onClick={() => {
                                  setSelectedClassIds((prev) =>
                                    isSelected
                                      ? prev.filter((id) => id !== c.id)
                                      : [...prev, c.id],
                                  );
                                }}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${isSelected ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                              >
                                فصل {c.name}
                              </button>
                            );
                          })}
                        {data.classes.filter(
                          (c) => !c.isArchived && c.gradeId === targetGradeId,
                        ).length === 0 && (
                          <p className="text-xs text-red-500 font-bold">
                            لا توجد فصول مضافة لهذا الصف، الرجاء إنشاء فصول
                            أولاً.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 self-end">
                    <button
                      onClick={handleAddSubject}
                      className="bg-indigo-600 text-white px-8 h-12 rounded-xl font-black hover:bg-indigo-700 transition-colors"
                    >
                      {editingId ? "حفظ التعديلات" : "إضافة مادة"}
                    </button>
                    {editingId && (
                      <button
                        onClick={resetForms}
                        className="bg-slate-200 text-slate-500 px-4 h-12 rounded-xl"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid gap-3">
                  {data.subjects
                    .filter((s) => !s.isArchived)
                    .filter(
                      (s) =>
                        !filterTeacherId ||
                        s.teacherId === filterTeacherId ||
                        s.teacherIds?.includes(filterTeacherId),
                    )
                    .filter(
                      (s) => !filterGradeId || s.gradeId === filterGradeId,
                    )
                    .filter(
                      (s) =>
                        !filterStageId ||
                        data.grades.find((g) => g.id === s.gradeId)?.stage ===
                          filterStageId,
                    )
                    .filter((s) => s.name.includes(searchQuery))
                    .map((s) => (
                      <div
                        key={s.id}
                        className="p-6 bg-white rounded-3xl border border-slate-100 flex justify-between items-center shadow-sm"
                      >
                        <div>
                          <p className="font-black text-slate-800 text-lg">
                            {s.name}
                          </p>
                          <div className="flex gap-4 mt-1">
                            <p className="text-xs text-indigo-600 font-bold">
                              المعلم: {s.teacherName}
                            </p>
                            <p className="text-xs text-indigo-600 font-bold">
                              الصف:{" "}
                              {
                                data.grades.find((g) => g.id === s.gradeId)
                                  ?.name
                              }
                            </p>
                            {s.classIds && s.classIds.length > 0 ? (
                              <p className="text-xs text-indigo-600 font-bold">
                                الفصول:{" "}
                                {data.classes
                                  .filter((c) => s.classIds?.includes(c.id))
                                  .map((c) => c.name)
                                  .join("، ")}
                              </p>
                            ) : s.classId ? (
                              <p className="text-xs text-indigo-600 font-bold">
                                الفصل:{" "}
                                {
                                  data.classes.find((c) => c.id === s.classId)
                                    ?.name
                                }
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            disabled={isProcessing}
                            onClick={() => handleEdit("subjects", s)}
                            title="تعديل"
                            className="w-12 h-12 flex items-center justify-center bg-white border border-slate-200 rounded-2xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-100 transition-all disabled:opacity-30"
                          >
                            <Edit2 size={20} />
                          </button>
                          <button
                            disabled={isProcessing}
                            onClick={() => handleArchive("subjects", s)}
                            title="أرشفة"
                            className="w-12 h-12 flex items-center justify-center bg-white border border-slate-200 rounded-2xl text-slate-500 hover:text-amber-600 hover:bg-amber-50 hover:border-amber-100 transition-all disabled:opacity-30"
                          >
                            <Archive size={20} />
                          </button>
                          <button
                            disabled={isProcessing}
                            onClick={() =>
                              handleDelete("subjects", s.id, s.name)
                            }
                            title="حذف نهائي"
                            className="w-12 h-12 flex items-center justify-center bg-white border border-slate-200 rounded-2xl text-slate-500 hover:text-red-500 hover:bg-red-50 hover:border-red-100 transition-all disabled:opacity-30"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </SectionContainer>
          )}

          {activeTab === "skills" && (
            <SectionContainer
              title="بنك المهارات والأسئلة"
              description="تعريف المهارات التربوية والأسئلة القياسية لكل مادة"
            >
              <div className="space-y-8">
                <div className="bg-yellow-50 p-6 rounded-3xl border border-yellow-100 flex flex-col gap-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    <select
                      value={targetGradeId}
                      onChange={(e) => setTargetGradeId(e.target.value)}
                      className="flex-1 h-14 bg-white border border-slate-200 rounded-2xl px-6 font-bold outline-none"
                    >
                      <option value="">اختر الصف...</option>
                      {data.grades.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={targetSubjectName}
                      onChange={(e) => setTargetSubjectName(e.target.value)}
                      className="flex-1 h-14 bg-white border border-slate-200 rounded-2xl px-6 font-bold outline-none"
                    >
                      <option value="">اختر المادة...</option>
                      {getSubjectOptions().map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={skillTerm}
                      onChange={(e) => setSkillTerm(e.target.value as 'term1' | 'term2' | 'full')}
                      className="flex-1 h-14 bg-white border border-indigo-200 rounded-2xl px-6 font-bold outline-none text-indigo-700 bg-indigo-50/10"
                    >
                      <option value="term1">الفصل الدراسي الأول</option>
                      <option value="term2">الفصل الدراسي الثاني</option>
                      <option value="full">الفصلين (العام الدراسي كامل)</option>
                    </select>
                    <input
                      type="text"
                      value={skillName}
                      onChange={(e) => setSkillName(e.target.value)}
                      placeholder="اسم المهارة..."
                      className="flex-[2] bg-white border border-slate-200 rounded-xl px-4 h-14 font-bold outline-none"
                    />
                  </div>
                  <textarea
                    value={skillQuestions}
                    onChange={(e) => setSkillQuestions(e.target.value)}
                    placeholder="أضف الأسئلة القياسية (سؤال في كل سطر)..."
                    className="w-full h-32 bg-white border border-slate-200 rounded-xl p-4 font-medium resize-none outline-none"
                  />
                  <div className="flex gap-3 self-end">
                    <button
                      onClick={handleAddSkill}
                      className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black hover:bg-slate-800 transition-colors flex items-center gap-2"
                    >
                      <Save size={18} />
                      {editingId ? "تعديل المهارة" : "حفظ المهارة في البنك"}
                    </button>
                    {editingId && (
                      <button
                        onClick={resetForms}
                        className="bg-slate-200 text-slate-500 px-4 rounded-xl"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.skills
                    .filter((s) => {
                      if (filterGradeId && s.gradeId !== filterGradeId)
                        return false;
                      if (filterSubjectId) {
                        const subject = data.subjects.find(
                          (sub) => sub.id === filterSubjectId,
                        );
                        if (subject && s.subjectName !== subject.name)
                          return false;
                      }
                      return true;
                    })
                    .filter(
                      (s) =>
                        s.name.includes(searchQuery) ||
                        s.subjectName?.includes(searchQuery),
                    )
                    .map((s) => (
                      <div
                        key={s.id}
                        className="p-6 bg-white rounded-3xl border border-slate-100 flex justify-between items-center shadow-sm hover:border-indigo-100 transition-all"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-[9px] font-black border border-indigo-100">
                              {s.subjectName}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400">
                              {
                                data.grades.find((g) => g.id === s.gradeId)
                                  ?.name
                              }
                            </span>
                          </div>
                          <p className="font-black text-slate-800">{s.name}</p>
                          <p className="text-[10px] text-zinc-500 font-bold mt-1">
                            اسم المادة:{" "}
                            <span className="text-slate-900">
                              {s.subjectName}
                            </span>
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold mt-1 italic">
                            عدد الأسئلة: {s.questions.length}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit("skills", s)}
                            title="تعديل"
                            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete("skills", s.id, s.name)}
                            title="حذف"
                            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  {data.skills.length === 0 && (
                    <div className="col-span-full py-12 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                      <Star size={40} className="mx-auto text-slate-200 mb-4" />
                      <p className="text-slate-400 font-bold">
                        لا توجد مهارات مضافة حالياً.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </SectionContainer>
          )}

          {activeTab === "quizzes" && (
            <SectionContainer
              title="مصمم الاختبارات الذكية"
              description="أنشئ تجارب تعليمية تفاعلية بأسلوب احترافي"
            >
                {/* Professional Quiz Builder Container */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                  <div className="p-5 space-y-6">
                    {/* Section 1: Basic Identity */}
                    <div className="flex flex-col gap-4">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div className="col-span-12 md:col-span-4 space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                            هوية الاختبار وعنوانه
                          </label>
                          <input
                            type="text"
                            value={quizTitle}
                            onChange={(e) => setQuizTitle(e.target.value)}
                            placeholder="مثال: رحلة الفهم القرائي (١)..."
                            className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg px-3 text-xs font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm"
                          />
                        </div>

                        <div className="col-span-12 md:col-span-3 space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                            المادة الدراسية المستهدفة
                          </label>
                          <select
                            value={quizSubjectName}
                            onChange={(e) => {
                              setQuizSubjectName(e.target.value);
                              setQuizSubjectIds([]); // reset selection
                            }}
                            className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg px-3 text-xs font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-800"
                          >
                            <option value="">اختر المادة الدراسية...</option>
                            {getSubjectOptions().map((name) => (
                              <option key={name} value={name}>
                                {name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="col-span-12 md:col-span-2 space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                            الفصل الدراسي الأكاديمي
                          </label>
                          <select
                            value={quizTerm}
                            onChange={(e) => setQuizTerm(e.target.value as "term1" | "term2" | "all")}
                            className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg px-3 text-xs font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-800"
                          >
                            <option value="all">كل الفصول</option>
                            <option value="term1">الفصل الأول</option>
                            <option value="term2">الفصل الثاني</option>
                            <option value="term3">الفصل الثالث</option>
                          </select>
                        </div>

                        <div className="col-span-12 md:col-span-3 space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 col-span-12">
                            صورة الواجهة
                          </label>
                          <ImageUploader
                            value={quizImageUrl}
                            onChange={setQuizImageUrl}
                            label="صورة الخلفية"
                            compact={true}
                          />
                        </div>
                      </div>

                      {/* Section 1.5: Reference Book Connection */}
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <BookOpen size={16} className="text-slate-600" />
                          <h4 className="text-xs font-black text-slate-700">الكتاب المنهجي وسند المعرفة (اختياري)</h4>
                        </div>
                        <p className="text-[9px] font-bold text-slate-400">
                          يرجى ربط هذا الاختبار بكتاب الطالب أو منهج دراسي مخزن كمرجع معرفي لتسهيل توليد الأسئلة أوتوماتيكياً بالذكاء الاصطناعي بدقة متناهية.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                              اختر كتاب الطالب المرجعي
                            </label>
                            <select
                              value={quizBookId}
                              onChange={(e) => {
                                setQuizBookId(e.target.value);
                                if (e.target.value) {
                                  setAiSelectedBookId(e.target.value);
                                  setAiMode("book");
                                }
                              }}
                              className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 text-xs font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-800"
                            >
                              <option value="">لا يوجد مرجع كتاب محدد...</option>
                              {data.studentBooks?.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.title} ({b.subjectName} - {data.grades.find(g => g.id === b.gradeId)?.name || b.gradeId})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                              أرقام الصفحات / الأجزاء المخصصة المستهدفة
                            </label>
                            <input
                              type="text"
                              value={quizBookPageReference}
                              onChange={(e) => setQuizBookPageReference(e.target.value)}
                              placeholder="مثلاً: الفصل الثاني كاملاً، ص 20 - ص 35"
                              className="w-full h-10 bg-white border border-slate-200 rounded-lg px-3 text-xs font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all text-slate-800"
                            />
                          </div>
                        </div>
                      </div>

                      {quizSubjectName && (
                        <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 flex flex-col gap-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                            الصفوف الدراسية المستهدفة (يمكن اختيار أكثر من صف)
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {data.subjects
                              .filter(
                                (s) =>
                                  !s.isArchived &&
                                  s.name === quizSubjectName,
                              )
                              .map((subject) => {
                                const isSelected = quizSubjectIds.includes(
                                  subject.id,
                                );
                                const grade = data.grades.find(
                                  (g) => g.id === subject.gradeId,
                                );
                                return (
                                  <button
                                    key={subject.id}
                                    onClick={() => {
                                      if (isSelected) {
                                        setQuizSubjectIds(
                                          quizSubjectIds.filter(
                                            (id) => id !== subject.id,
                                          ),
                                        );
                                      } else {
                                        setQuizSubjectIds([
                                          ...quizSubjectIds,
                                          subject.id,
                                        ]);
                                      }
                                    }}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                                      isSelected
                                        ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                                        : "border-slate-200 bg-white text-slate-500 hover:border-indigo-200"
                                    }`}
                                  >
                                    <span>{grade?.name || "بدون صف"}</span>
                                    {isSelected && <Check size={12} className="text-indigo-600" />}
                                  </button>
                                );
                              })}
                              {data.subjects.filter(
                                (s) =>
                                  !s.isArchived && s.name === quizSubjectName,
                              ).length === 0 && (
                                <p className="text-xs text-red-500 font-bold bg-red-50 p-2 rounded-lg">
                                  لا توجد صفوف مرتبطة بهذه المادة حالياً.
                                </p>
                              )}
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col lg:flex-row gap-6 mt-5">
                            {/* AI Generation Sidebar */}
                            <div className="lg:w-1/4 shrink-0 bg-slate-50 p-6 rounded-[24px] border border-slate-100 flex flex-col gap-4 sticky top-8 h-fit">
                              <h3 className="text-sm font-black text-slate-800">أدوات توليد الأسئلة</h3>
                              <div className="flex flex-col bg-white p-1 rounded-2xl border border-slate-200">
                                <button type="button" onClick={() => setAiMode("lesson")} className={`py-2 px-4 rounded-xl font-black text-xs ${aiMode === 'lesson' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50 text-right'}`}>توليد باسم الدرس</button>
                                <button type="button" onClick={() => setAiMode("book")} className={`py-2 px-4 rounded-xl font-black text-xs ${aiMode === 'book' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50 text-right'}`}>من كتاب الطالب</button>
                                <button type="button" onClick={() => setAiMode("custom")} className={`py-2 px-4 rounded-xl font-black text-xs ${aiMode === 'custom' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50 text-right'}`}>توليد حر</button>
                              </div>
                              <div className="space-y-4">
                                {aiMode === "lesson" && (
                                  <div className="space-y-4 bg-white p-4 rounded-2xl border border-slate-100">
                                    <div className="space-y-2">
                                      <label className="text-[10px] font-black text-slate-400 uppercase">الصف الدراسي</label>
                                      <select value={aiSelectedGradeId} onChange={(e) => setAiSelectedGradeId(e.target.value)} disabled={aiIsGenerating} className="w-full h-10 bg-slate-50 border border-slate-100 rounded-xl px-2 text-xs font-bold outline-none focus:border-indigo-500">
                                        <option value="">اختر الصف...</option>
                                        {data.grades.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                      </select>
                                    </div>
                                    <div className="space-y-2">
                                      <label className="text-[10px] font-black text-slate-400 uppercase">المادة الدراسية</label>
                                      <select value={aiSelectedSubject} onChange={(e) => setAiSelectedSubject(e.target.value)} disabled={aiIsGenerating} className="w-full h-10 bg-slate-50 border border-slate-100 rounded-xl px-2 text-xs font-bold outline-none focus:border-indigo-500">
                                        <option value="">اختر المادة...</option>
                                        {getSubjectOptions().map(name => <option key={name} value={name}>{name}</option>)}
                                      </select>
                                    </div>
                                    <div className="space-y-2">
                                      <label className="text-[10px] font-black text-slate-400 uppercase">اسم الدرس</label>
                                      <input type="text" value={aiLessonName} onChange={(e) => setAiLessonName(e.target.value)} disabled={aiIsGenerating} placeholder="مثال: الفاعل" className="w-full h-10 bg-slate-50 border border-slate-100 rounded-xl px-2 text-xs font-bold outline-none focus:border-indigo-500" />
                                    </div>
                                  </div>
                                )}
                                {aiMode === "book" && (
                                  <div className="space-y-4 bg-white p-4 rounded-2xl border border-slate-100">
                                    <div className="space-y-2">
                                      <label className="text-[10px] font-black text-slate-400 uppercase">اختر المنهج</label>
                                      <select value={aiSelectedBookId} onChange={(e) => { setAiSelectedBookId(e.target.value); setAiSelectedChapterIds([]); }} disabled={aiIsGenerating} className="w-full h-10 bg-slate-50 border border-slate-100 rounded-xl px-2 text-xs font-bold outline-none focus:border-indigo-500">
                                        <option value="">اختر الكتاب...</option>
                                        {data.studentBooks?.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
                                      </select>
                                    </div>
                                    {aiSelectedBookId && (
                                      <div className="space-y-2 pt-2 border-t border-slate-100">
                                        <label className="text-[10px] font-black text-slate-400 uppercase">حدد الفصول</label>
                                        <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-1">
                                          {data.studentBooks?.find(b => b.id === aiSelectedBookId)?.chapters?.map(ch => (
                                            <label key={ch.id} className="flex gap-2 items-center p-2 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer hover:border-indigo-200">
                                              <input type="checkbox" disabled={aiIsGenerating} checked={aiSelectedChapterIds.includes(ch.id)} onChange={(e) => { if (e.target.checked) setAiSelectedChapterIds([...aiSelectedChapterIds, ch.id]); else setAiSelectedChapterIds(aiSelectedChapterIds.filter(id => id !== ch.id)); }} className="w-4 h-4 text-indigo-600 rounded" />
                                              <div className="flex flex-col text-right">
                                                <span className="text-xs font-bold text-slate-700">{ch.title}</span>
                                                {ch.pages && (
                                                  <span className="text-[10px] font-bold text-indigo-500 mt-0.5">ص: {ch.pages}</span>
                                                )}
                                              </div>
                                            </label>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {aiMode === "custom" && (
                                  <div className="space-y-2 bg-white p-4 rounded-2xl border border-slate-100">
                                    <label className="text-[10px] font-black text-slate-400 uppercase">وصف الأسئلة</label>
                                    <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} disabled={aiIsGenerating} placeholder="مثال: أسئلة في لغتي الجميلة..." className="w-full h-24 bg-slate-50 border border-slate-100 rounded-xl p-2 text-xs font-bold outline-none focus:border-indigo-500 resize-none" />
                                  </div>
                                )}
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-slate-400 uppercase">عدد الأسئلة</label>
                                  <div className="flex gap-2">
                                    {[3, 5, 10].map(count => (
                                      <button key={count} type="button" disabled={aiIsGenerating} onClick={() => setAiQuestionCount(count)} className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-all ${aiQuestionCount === count ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}>{count}</button>
                                    ))}
                                  </div>
                                </div>
                                <button type="button" onClick={handleGenerateQuestionsWithAI} disabled={aiIsGenerating} className={`w-full h-11 rounded-xl font-black text-xs flex justify-center items-center gap-2 transition-all ${aiIsGenerating ? 'bg-indigo-400 text-white cursor-not-allowed shadow-none' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20 active:scale-[0.98]'}`}>
                                  {aiIsGenerating ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> جاري التوليد ...</> : <><Sparkles size={14} /> توليد الأسئلة الذكية</>}
                                </button>
                                {aiError && <div className="text-xs text-rose-500 font-bold p-3 bg-rose-50 rounded-xl flex items-start gap-2"><AlertCircle size={14} className="shrink-0 mt-0.5" /><span>{aiError}</span></div>}
                                {aiSuccess && <div className="text-xs text-emerald-500 font-bold p-3 bg-emerald-50 rounded-xl flex items-start gap-2"><CheckCircle2 size={14} className="shrink-0 mt-0.5"/><span>{aiSuccess}</span></div>}
                              </div>
                            </div>

                            {/* Question Area (Center/Right) */}
                            <div className="flex-1 space-y-6">
                              <h3 className="text-lg font-black text-slate-800">الأسئلة ({quizQuestions.length})</h3>
                              <div className="grid grid-cols-1 gap-6">
                                  {quizQuestions.map((q, qIndex) => (
                                    <div
                                      key={q.id}
                                      className="bg-white p-6 rounded-[24px] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col gap-6 relative transition-all"
                                    >
                                      <div className="absolute top-0 right-0 w-10 h-10 bg-indigo-50 rounded-bl-3xl flex items-center justify-center font-black text-xs text-indigo-600">
                                        {qIndex + 1}
                                      </div>
                                      <div className="space-y-4 pt-4">
                                        <label className="text-[10px] font-black text-slate-400 uppercase px-1">
                                          نص السؤال
                                        </label>
                                        <textarea
                                          value={q.text}
                                          onChange={(e) => {
                                            const n = [...quizQuestions];
                                            n[qIndex].text = e.target.value;
                                            setQuizQuestions(n);
                                          }}
                                          placeholder="بداية نص السؤال..."
                                          className="w-full h-24 bg-slate-50 border border-slate-100 rounded-xl p-4 font-bold text-sm resize-none outline-none focus:border-indigo-300 focus:bg-white transition-all shadow-sm"
                                        />
                                        <ImageUploader
                                          value={q.imageUrl || ""}
                                          onChange={(val) => {
                                            const n = [...quizQuestions];
                                            n[qIndex].imageUrl = val;
                                            setQuizQuestions(n);
                                          }}
                                          label="صورة مرتبطة بالسؤال"
                                          iconOnly={true}
                                        />
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setQuizQuestions(
                                              quizQuestions.filter(
                                                (_, i) => i !== qIndex,
                                              ),
                                            )
                                          }
                                          className="h-10 px-4 bg-rose-50 text-rose-500 rounded-xl font-black text-xs flex items-center justify-center gap-2 hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
                                        >
                                          <Trash2 size={14} /> حذف السؤال
                                        </button>
                                      </div>

                                      <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase px-1">
                                          الخيارات (اختر الإجابة الصحيحة)
                                        </label>
                                        <div className="grid grid-cols-1 gap-2">
                                          {q.options.map((opt, optIdx) => (
                                            <div
                                              key={optIdx}
                                              className={`p-2 rounded-xl border-2 flex flex-col md:flex-row items-start md:items-center gap-3 transition-all ${q.correctAnswerIndex === optIdx ? "border-emerald-400 bg-emerald-50/50" : "border-slate-100 bg-white hover:border-indigo-100"}`}
                                            >
                                              <div className="flex items-center gap-2 w-full">
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const n = [...quizQuestions];
                                                    n[qIndex].correctAnswerIndex =
                                                      optIdx;
                                                    setQuizQuestions(n);
                                                  }}
                                                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0 font-black text-[12px] cursor-pointer ${q.correctAnswerIndex === optIdx ? "bg-emerald-500 text-white shadow-md" : "bg-slate-100 text-slate-500 hover:bg-emerald-100 hover:text-emerald-600"}`}
                                                >
                                                  {q.correctAnswerIndex === optIdx
                                                    ? "✓"
                                                    : optIdx + 1}
                                                </button>
                                                <input
                                                  type="text"
                                                  value={opt}
                                                  onChange={(e) => {
                                                    const n = [...quizQuestions];
                                                    n[qIndex].options[optIdx] =
                                                      e.target.value;
                                                    setQuizQuestions(n);
                                                  }}
                                                  placeholder={`الخيار ${optIdx + 1}`}
                                                  className="flex-1 bg-transparent font-bold text-sm text-slate-800 outline-none h-10 px-2"
                                                />
                                                <ImageUploader
                                                  value={q.optionImages?.[optIdx] || ""}
                                                  onChange={(val) => {
                                                    const n = [...quizQuestions];
                                                    if (!n[qIndex].optionImages)
                                                      n[qIndex].optionImages = ["", "", "", ""];
                                                    n[qIndex].optionImages![optIdx] = val;
                                                    setQuizQuestions(n);
                                                  }}
                                                  iconOnly={true}
                                                  label="صورة للخيار"
                                                />
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  ))}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setQuizQuestions([
                                        ...quizQuestions,
                                        {
                                          id: `q_${Date.now()}_${Math.random()}`,
                                          text: "",
                                          options: ["", "", "", ""],
                                          correctAnswerIndex: 0,
                                          imageUrl: "",
                                          optionImages: ["", "", "", ""],
                                        },
                                      ]);
                                    }}
                                    className="w-full py-8 border-2 border-dashed border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-500 rounded-[24px] font-black flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
                                  >
                                    <PlusCircle size={32} />
                                    <span>أضف سؤال جديد</span>
                                  </button>
                              </div>
                            </div>
                          </div>

                      {/* Master Publish Button */}
                      <div className="pt-8 border-t border-slate-100">
                        <div className="bg-slate-50/50 rounded-[48px] p-2 ring-1 ring-slate-100/50 shadow-xl flex flex-col md:flex-row gap-2">
                          <button
                            onClick={handleSaveQuiz}
                            disabled={isProcessing}
                            className={`flex-[3] min-h-[5rem] md:min-h-[6rem] py-6 rounded-[36px] font-black text-xl flex flex-col md:flex-row items-center justify-center gap-3 transition-all active:scale-[0.98] ${!quizTitle || quizSubjectIds.length === 0 || quizQuestions.length === 0 ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none" : "bg-slate-900 text-white hover:bg-indigo-600 hover:shadow-indigo-500/20 hover:shadow-xl"}`}
                          >
                            {isProcessing ? (
                              <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              <>
                                <Save
                                  size={28}
                                  className={
                                    !quizTitle ||
                                    quizSubjectIds.length === 0 ||
                                    quizQuestions.length === 0
                                      ? "text-slate-300"
                                      : "text-yellow-400"
                                  }
                                />
                                <span className="text-center leading-tight">
                                  {editingId
                                    ? "حفظ التعديلات النهائية"
                                    : "اعتماد وحفظ الاختبار في البنك"}
                                </span>
                              </>
                            )}
                          </button>
                          
                          <button
                            type="button"
                            onClick={resetForms}
                            className="flex-[1] min-h-[5rem] md:min-h-[6rem] py-6 rounded-[36px] bg-white border-2 border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 font-black text-lg flex flex-col md:flex-row items-center justify-center gap-2 transition-all active:scale-[0.98]"
                          >
                            <X size={24} />
                            <span>إلغاء الأمر</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Existing Quizzes */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pt-6 border-t border-slate-100">
                    <h4 className="font-black text-slate-800">
                      الاختبارات الحالية
                    </h4>
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                      {/* Stage Filter */}
                      <select
                        value={filterQuizStage}
                        onChange={(e) => {
                          setFilterQuizStage(e.target.value);
                          setFilterQuizGradeId("");
                          setFilterQuizSubjectId("");
                        }}
                        className="flex-1 sm:flex-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold text-xs outline-none cursor-pointer focus:border-indigo-400 focus:bg-white transition-all"
                      >
                        <option value="">كل المراحل</option>
                        <option value="الابتدائي">المرحلة الابتدائية</option>
                        <option value="المتوسط">المرحلة المتوسطة</option>
                        <option value="الثانوي">المرحلة الثانوية</option>
                      </select>

                      {/* Grade Filter */}
                      <select
                        value={filterQuizGradeId}
                        onChange={(e) => {
                          setFilterQuizGradeId(e.target.value);
                          setFilterQuizSubjectId(""); // Reset subject selection when grade changes
                        }}
                        className="flex-1 sm:flex-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold text-xs outline-none cursor-pointer focus:border-indigo-400 focus:bg-white transition-all"
                      >
                        <option value="">كل الصفوف</option>
                        {data.grades
                          .filter((g) => !g.isArchived)
                          .filter((g) => !filterQuizStage || g.name.includes(filterQuizStage))
                          .map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                      </select>

                      {/* Term Filter */}
                      <select
                        value={filterQuizTerm}
                        onChange={(e) => setFilterQuizTerm(e.target.value)}
                        className="flex-1 sm:flex-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold text-xs outline-none cursor-pointer focus:border-indigo-400 focus:bg-white transition-all"
                      >
                        <option value="">كل الفصول الدراسية</option>
                        <option value="term1">الفصل الأول</option>
                        <option value="term2">الفصل الثاني</option>
                        <option value="full">طوال العام</option>
                      </select>

                      {/* Subject Filter */}
                      <select
                        value={filterQuizSubjectId}
                        onChange={(e) => setFilterQuizSubjectId(e.target.value)}
                        className="flex-1 sm:flex-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold text-xs outline-none cursor-pointer focus:border-indigo-400 focus:bg-white transition-all"
                      >
                        <option value="">كل المواد</option>
                        {data.subjects
                          .filter((s) => !s.isArchived)
                          .filter(
                            (s) =>
                              !filterQuizGradeId ||
                              s.gradeId === filterQuizGradeId,
                          )
                          .filter((s) => {
                            if (!filterQuizStage) return true;
                            const g = data.grades.find(gr => gr.id === s.gradeId);
                            return g && g.name.includes(filterQuizStage);
                          })
                          .map((s) => {
                            const grade = data.grades.find(
                              (g) => g.id === s.gradeId,
                            );
                            return (
                              <option key={s.id} value={s.id}>
                                {s.name} {grade ? `(${grade.name})` : ""}
                              </option>
                            );
                          })}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3">
                    {data.quizzes
                      .filter((q) => {
                        if (
                          filterQuizSubjectId &&
                          !q.subjectIds?.includes(filterQuizSubjectId)
                        )
                          return false;
                        const hasNoSubjects =
                          !q.subjectIds || q.subjectIds.length === 0;
                        if (hasNoSubjects) return true; // ALWAYS Show orphaned quizzes so they can be deleted
                        const subject = data.subjects.find((sub) =>
                          q.subjectIds?.includes(sub.id),
                        );
                        if (
                          filterTeacherId &&
                          (!subject ||
                            (subject.teacherId !== filterTeacherId &&
                              !subject.teacherIds?.includes(filterTeacherId)))
                        )
                          return false;
                        if (
                          filterGradeId &&
                          (!subject || subject.gradeId !== filterGradeId)
                        )
                          return false;
                        if (
                          filterQuizGradeId &&
                          (!subject || subject.gradeId !== filterQuizGradeId)
                        )
                          return false;
                        if (
                          filterQuizStage &&
                          (!subject || !data.grades.find(g => g.id === subject.gradeId)?.name.includes(filterQuizStage))
                        )
                          return false;
                        if (
                          filterQuizTerm &&
                          q.term !== filterQuizTerm
                        )
                          return false;
                        return true;
                      })
                      .filter((quiz) => quiz.title.includes(searchQuery))
                      .map((quiz) => {
                        let classNames = "كل الفصول";
                        if (quiz.classIds && quiz.classIds.length > 0) {
                          classNames = quiz.classIds.map(cid => data.classes.find(c => c.id === cid)?.name).filter(Boolean).join("، ");
                        }
                        
                        let termName = "";
                        if (quiz.term === 'term1') termName = "الفصل الأول";
                        if (quiz.term === 'term2') termName = "الفصل الثاني";
                        if (quiz.term === 'full') termName = "طوال العام";

                        return (
                        <motion.div
                          key={quiz.id}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all overflow-hidden flex flex-col"
                        >
                          {/* Image Container */}
                          <div className="h-24 bg-slate-50 relative overflow-hidden shrink-0 border-b border-slate-100">
                            {quiz.imageUrl ? (
                              <img
                                src={quiz.imageUrl}
                                alt={quiz.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                                <BrainCircuit
                                  size={40}
                                  className="text-slate-200 absolute -right-4 -bottom-4"
                                />
                              </div>
                            )}
                            <div className="absolute top-2 right-2 flex gap-1">
                              <span
                                className={`px-1.5 py-0.5 rounded-sm text-[8px] font-black border backdrop-blur-md shadow-sm ${quiz.status === "published" ? "bg-emerald-500 text-white border-emerald-600" : "bg-amber-500 text-white border-amber-600"}`}
                              >
                                {quiz.status === "published"
                                  ? "منشور"
                                  : "مسودة"}
                              </span>
                            </div>
                          </div>

                          {/* Quiz Information Container */}
                          <div className="p-3 bg-white flex-1 flex flex-col justify-start relative">
                            <div className="flex flex-wrap items-center gap-1.5 mb-2">
                              <span className="text-[9px] font-black text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-100/50 flex items-center gap-1">
                                <BookOpen size={9} />
                                {quiz.subjectName ||
                                  (quiz.subjectIds && quiz.subjectIds.length > 0
                                    ? data.subjects
                                        .filter((s) =>
                                          quiz.subjectIds?.includes(s.id),
                                        )
                                        .map((s) => s.name)
                                        .join("، ")
                                    : "مادة محذوفة")}
                              </span>
                              {termName && (
                                <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100/50">
                                  {termName}
                                </span>
                              )}
                            </div>
                            
                            <h5
                              className="text-sm font-black text-slate-800 leading-tight line-clamp-2 mb-1"
                              title={quiz.title}
                            >
                              {quiz.title}
                            </h5>
                            
                            <p className="text-[10px] text-slate-500 font-bold mb-2 line-clamp-1 truncate w-full" title={classNames}>الصفوف: {classNames}</p>
                          </div>

                          {(() => {
                            const getStats = () => {
                              const validStudents = data.students.filter(
                                (s) => !s.isArchived,
                              );
                              const classResults = (
                                data.quizResults || []
                              ).filter(
                                (r) =>
                                  r.quizId === quiz.id &&
                                  validStudents.some(
                                    (s) => s.id === r.studentId,
                                  ),
                              );
                              const latestResultsMap = new Map();
                              classResults.forEach((r) => {
                                const existing = latestResultsMap.get(
                                  r.studentId,
                                );
                                if (
                                  !existing ||
                                  new Date(r.updatedAt).getTime() >
                                    new Date(existing.updatedAt).getTime()
                                ) {
                                  latestResultsMap.set(r.studentId, r);
                                }
                              });
                              const uniqueResults = Array.from(
                                latestResultsMap.values(),
                              );
                              if (uniqueResults.length === 0)
                                return { avg: 0, count: 0 };
                              const avg = Math.round(
                                uniqueResults.reduce(
                                  (acc, r) => acc + (r.score || 0),
                                  0,
                                ) / uniqueResults.length,
                              );
                              return { avg, count: uniqueResults.length };
                            };
                            const stats = getStats();
                            return (
                              <div className="p-3 flex-1 flex flex-col justify-between gap-3">
                                <div className="flex justify-between items-center text-[10px]">
                                  <div
                                    className="flex items-center gap-1 font-bold text-slate-500"
                                    title="عدد الأسئلة"
                                  >
                                    <BrainCircuit
                                      size={10}
                                      className="text-slate-400"
                                    />
                                    {quiz.questions.length} سؤال
                                  </div>
                                  <div
                                    className="flex items-center gap-1 font-bold text-slate-500"
                                    title="المختبرون"
                                  >
                                    <Users
                                      size={10}
                                      className="text-slate-400"
                                    />
                                    {stats.count} طالب
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-black text-indigo-400 uppercase shrink-0">
                                    إنجاز: {stats.avg}%
                                  </span>
                                  <div
                                    className="w-full h-1 bg-indigo-50 rounded-full overflow-hidden"
                                    dir="ltr"
                                  >
                                    <div
                                      className="h-full bg-indigo-500 rounded-full"
                                      style={{ width: `${stats.avg}%` }}
                                    ></div>
                                  </div>
                                </div>

                                <div className="flex gap-2 justify-between mt-1">
                                  <button
                                    disabled={isProcessing}
                                    onClick={() => handleEdit("quizzes", quiz)}
                                    className="flex-1 py-1 rounded-md bg-slate-50 text-slate-600 hover:bg-slate-900 hover:text-white transition-all text-[9px] font-black flex items-center justify-center gap-1"
                                  >
                                    <Edit2 size={10} /> تعديل
                                  </button>
                                  <button
                                    disabled={isProcessing}
                                    onClick={() =>
                                      handleArchive("quizzes", quiz)
                                    }
                                    className="w-6 h-6 rounded-md bg-slate-50 text-slate-400 hover:bg-amber-50 hover:text-amber-600 flex items-center justify-center transition-all"
                                  >
                                    <Archive size={9} />
                                  </button>
                                  <button
                                    disabled={isProcessing}
                                    onClick={() =>
                                      handleDelete(
                                        "quizzes",
                                        quiz.id,
                                        quiz.title,
                                      )
                                    }
                                    className="w-6 h-6 rounded-md bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-all"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                </div>
                              </div>
                            );
                          })()}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </SectionContainer>
            )}

            {activeTab === "system_settings" && (
            <SectionContainer
              title="شعار وإعدادات النظام"
              description="إعدادات الهوية البصرية وشعار المدرسة"
            >
              <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-minimal space-y-6 max-w-2xl">
                <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                  <Settings size={32} />
                </div>
                <h3 className="text-xl md:text-2xl font-black tracking-tighter text-slate-800">
                  تحديث شعار المدرسة
                </h3>
                <p className="text-slate-500 font-medium text-sm leading-relaxed">
                  هذا الشعار سيظهر في صفحة الدخول وفي التقارير المطبوعة.
                </p>

                <div className="pt-6 border-t border-slate-100 flex flex-col gap-4">
                  <ImageUploader 
                     label="رابط صورة شعار المدرسة"
                     value={data.settings?.[0]?.schoolLogoUrl || ""}
                     onChange={async (url) => {
                        const settingId = data.settings?.[0]?.id || "default";
                        await firestoreService.saveItem("settings", settingId, {
                           ...data.settings?.[0],
                           schoolLogoUrl: url
                        });
                        alert("تم تحديث الشعار بنجاح!");
                     }}
                     placeholder="ارفع أو ضع رابط الشعار"
                  />
                </div>

                <div className="pt-6 border-t border-slate-100 flex flex-col gap-4">
                  <h4 className="text-sm font-black tracking-tighter text-slate-800">
                    صلاحيات المشرف الفني (الزيارات التبادلية)
                  </h4>
                  <div className="flex gap-3 items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <input 
                      type="checkbox"
                      id="allowSupervisorPeerVisits"
                      checked={data.settings?.[0]?.allowSupervisorPeerVisits ?? false}
                      onChange={async (e) => {
                         const settingId = data.settings?.[0]?.id || "default";
                         await firestoreService.saveItem("settings", settingId, {
                            ...data.settings?.[0],
                            allowSupervisorPeerVisits: e.target.checked
                         });
                      }}
                      className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                    <label htmlFor="allowSupervisorPeerVisits" className="text-xs font-black text-slate-705 select-none cursor-pointer">
                      السماح للمشرفين بالاطلاع على الزيارات التبادلية ونقل الأثر ونقاشاتها بين المعلمين
                    </label>
                  </div>
                </div>
              </div>
            </SectionContainer>
          )}

          {activeTab === "books" && (
            <SectionContainer
              title="بنك الكتب المدرسية والمناهج"
              description="حمّل مناهج الطلاب ليرتكز عليها الذكاء الاصطناعي في صياغة وتوليد أسئلة الاختبارات الذكية بدقة مذهلة"
            >
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                <div className="xl:col-span-5 bg-white p-6 md:p-8 rounded-[36px] border border-slate-100 shadow-minimal space-y-6">
                  <h3 className="text-lg font-black text-slate-800 border-b border-slate-50 pb-4">
                    {editingBookId ? "تعديل كتاب / منهج دراسي" : "إضافة كتاب / منهج دراسي جديد"}
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">اسم الكتاب أو المنهج:</label>
                      <input
                        type="text"
                        value={bookTitle}
                        onChange={(e) => setBookTitle(e.target.value)}
                        placeholder="مثال: كتاب العلوم - الصف الخامس"
                        className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 font-bold outline-none focus:ring-4 focus:ring-indigo-100 focus:bg-white transition-all text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">الصف الدراسي:</label>
                        <select
                          value={bookSelectedGradeId}
                          onChange={(e) => setBookSelectedGradeId(e.target.value)}
                          className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-3 font-bold outline-none text-sm"
                        >
                          <option value="">اختر الصف...</option>
                          {data.grades.map((g) => (
                            <option key={g.id} value={g.id}>{g.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">الفصل الدراسي:</label>
                        <select
                          value={bookTerm}
                          onChange={(e) => setBookTerm(e.target.value as any)}
                          className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-3 font-bold outline-none text-sm"
                        >
                          <option value="term1">الفصل الأول</option>
                          <option value="term2">الفصل الثاني</option>
                          <option value="full">العام الدراسي كامل</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">المادة الدراسية:</label>
                      <select
                        value={bookSubjectName}
                        onChange={(e) => setBookSubjectName(e.target.value)}
                        className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-3 font-bold outline-none text-sm"
                      >
                        <option value="">اختر المادة...</option>
                        {Array.from(new Set(data.subjects.map((s) => s.name))).map((subjectName) => (
                          <option key={subjectName} value={subjectName}>{subjectName}</option>
                        ))}
                        <option value="CUSTOM">مادة مخصصة أخرى...</option>
                      </select>
                    </div>

                    {bookSubjectName === "CUSTOM" && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">اسم المادة المخصصة:</label>
                        <input
                          type="text"
                          placeholder="اكتب اسم المادة..."
                          onBlur={(e) => setBookSubjectName(e.target.value)}
                          className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 font-bold outline-none text-sm"
                        />
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-100 pt-6 space-y-4">
                    <h4 className="font-black text-xs text-slate-700">إضافة الفصول / الأبواب والدروس:</h4>
                    
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase">عنوان الدرس / الفصل:</label>
                          <input
                            type="text"
                            value={newChapterTitle}
                            onChange={(e) => setNewChapterTitle(e.target.value)}
                            placeholder="مثال: الفصل الأول: دورات حياة النباتات"
                            className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 font-bold outline-none text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase">أرقام الصفحات / البند <span className="text-[9px] font-medium text-slate-400">(اختياري)</span>:</label>
                          <input
                            type="text"
                            value={newChapterPages}
                            onChange={(e) => setNewChapterPages(e.target.value)}
                            placeholder="مثلاً: 12-15 أو الجزء الأول"
                            className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 font-bold outline-none text-xs"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <label className="text-[9px] font-black text-slate-400 uppercase">محتوى أو شرح تفصيلي للدرس:</label>
                          {newChapterContent && newChapterContent.startsWith("data:application/pdf;") && (
                            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                              تم إرفاق ملف الدرس PDF بنجاح 📁
                            </span>
                          )}
                        </div>
                        <textarea
                          value={newChapterContent.startsWith("data:application/pdf;") ? "" : newChapterContent}
                          onChange={(e) => setNewChapterContent(e.target.value)}
                          placeholder="اكتب أو الصق شرح الدرس أو الكلمات المفتاحية لمساعدة الذكاء الاصطناعي... (أو اتركه فارغاً وارفع ملف PDF بالأسفل لتلخيصه)"
                          className="w-full h-24 bg-white border border-slate-200 rounded-xl p-3 font-medium outline-none text-xs resize-y"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase">ملف الدرس (PDF) <span className="text-[9px] font-medium text-slate-400">(اختياري في حال كتابة الشرح بالأعلى)</span>:</label>
                        <PdfUploader
                          value={newChapterContent}
                          onChange={setNewChapterContent}
                          label="ملف PDF"
                        />
                      </div>

                      <div className="flex flex-col gap-2 pt-1">
                        <button
                          type="button"
                          onClick={async () => {
                            if (!newChapterTitle.trim()) {
                              alert("يرجى كتابة عنوان للدرس للتوليد له");
                              return;
                            }
                            setAiChapterGenerating(true);
                            try {
                              const selectedGradeName = data.grades.find(g => g.id === bookSelectedGradeId)?.name || "";
                              const isPdf = newChapterContent.startsWith("data:application/pdf;");
                              const response = await fetch("/api/gemini/generate-chapter-content", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  chapterTitle: newChapterTitle,
                                  subject: bookSubjectName,
                                  grade: selectedGradeName,
                                  pdfData: isPdf ? newChapterContent : undefined
                                })
                              });
                              const resData = await response.json();
                              if (resData.success && resData.content) {
                                setNewChapterContent(resData.content);
                              } else {
                                alert("لم نتمكن من توليد المحتوى. " + (resData.error || ""));
                              }
                            } catch (e: any) {
                              alert("حدث خطأ أثناء التوليد: " + e.message);
                            } finally {
                              setAiChapterGenerating(false);
                            }
                          }}
                          disabled={aiChapterGenerating}
                          className="py-2.5 px-3 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100/50 text-indigo-700 rounded-xl font-bold text-[10px] flex items-center justify-center gap-1 transition-all disabled:opacity-50"
                        >
                          <Sparkles size={12} className="text-indigo-500" />
                          {aiChapterGenerating ? "جاري شرح وتلخيص الدرس من خلال الذكاء الاصطناعي..." : "توليد ملخص شرح الدرس تلقائياً بالذكاء الاصطناعي ✨"}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (!newChapterTitle.trim() || !newChapterContent.trim()) {
                              alert("يرجى ملء عنوان ومحتوى الدرس أولاً");
                              return;
                            }

                            if (editingChapterIndex !== null) {
                              const updated = [...bookChapters];
                              updated[editingChapterIndex] = {
                                id: bookChapters[editingChapterIndex].id,
                                title: newChapterTitle.trim(),
                                content: newChapterContent.trim(),
                                pages: newChapterPages.trim() || undefined
                              };
                              setBookChapters(updated);
                              setEditingChapterIndex(null);
                            } else {
                              setBookChapters([
                                ...bookChapters,
                                {
                                  id: "chap_" + Date.now() + Math.random().toString(36).substr(2, 4),
                                  title: newChapterTitle.trim(),
                                  content: newChapterContent.trim(),
                                  pages: newChapterPages.trim() || undefined
                                }
                              ]);
                            }

                            setNewChapterTitle("");
                            setNewChapterContent("");
                            setNewChapterPages("");
                          }}
                          className="py-3 px-4 bg-slate-900 border border-slate-900 text-white rounded-xl font-black text-xs hover:bg-slate-800 transition-all shadow-sm"
                        >
                          {editingChapterIndex !== null ? "تحديث الدرس" : "إضافة الدرس المنهجي"}
                        </button>
                      </div>
                    </div>

                    {bookChapters.length > 0 && (
                      <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-hide pr-1">
                        {bookChapters.map((chap, idx) => (
                          <div key={chap.id} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between gap-3 shadow-sm">
                            <div className="flex-1 min-w-0">
                              <p className="font-black text-xs text-slate-700 truncate flex items-center gap-1.5">
                                <span>{chap.title}</span>
                                {chap.pages && (
                                  <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                                    ص: {chap.pages}
                                  </span>
                                )}
                              </p>
                              <p className="text-[10px] font-bold text-slate-400 mt-0.5 truncate">{chap.content.substring(0, 60)}...</p>
                            </div>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingChapterIndex(idx);
                                  setNewChapterTitle(chap.title);
                                  setNewChapterContent(chap.content);
                                  setNewChapterPages(chap.pages || "");
                                }}
                                className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setBookChapters(bookChapters.filter((_, i) => i !== idx));
                                  if (editingChapterIndex === idx) {
                                    setEditingChapterIndex(null);
                                    setNewChapterTitle("");
                                    setNewChapterContent("");
                                    setNewChapterPages("");
                                  }
                                }}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        resetForms();
                      }}
                      className="py-3 px-4 bg-slate-100 text-slate-700 rounded-xl font-black text-xs hover:bg-slate-200 transition-all flex-1"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!bookTitle.trim()) {
                          alert("يرجى كتابة عنوان للكتاب");
                          return;
                        }
                        if (!bookSelectedGradeId) {
                          alert("يرجى تحديد الصف الدراسي");
                          return;
                        }
                        if (!bookSubjectName) {
                          alert("يرجى تحديد المادة الدراسية");
                          return;
                        }
                        await handleSaveBook();
                      }}
                      className="py-3 px-6 bg-indigo-600 text-white rounded-xl font-black text-xs hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 flex-1"
                    >
                      {editingBookId ? "تعديل الكتاب" : "حفظ المنهج الدراسي"}
                    </button>
                  </div>
                </div>

                <div className="xl:col-span-7 bg-white p-6 md:p-8 rounded-[36px] border border-slate-100 shadow-minimal space-y-6">
                  <h3 className="text-lg font-black text-slate-800 border-b border-slate-50 pb-4">
                    المناهج والكتب المدخلة حالياً
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.studentBooks?.map((book) => {
                      const gr = data.grades.find((g) => g.id === book.gradeId);
                      return (
                        <div key={book.id} className="bg-slate-50 p-5 rounded-3xl border border-slate-100 shadow-sm hover:border-indigo-100 transition-all relative group flex flex-col justify-between h-44">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">{gr?.name || "صف متميز"}</span>
                              <span className="text-[9px] font-black uppercase text-slate-500 bg-slate-200/50 px-2.5 py-1 rounded-full">
                                {book.term === "term1" ? "الفصل الأول" : book.term === "term2" ? "الفصل الثاني" : "العام كامل"}
                              </span>
                            </div>
                            <h4 className="font-black text-slate-800 text-sm mt-3 line-clamp-1">{book.title}</h4>
                            <p className="text-xs font-bold text-slate-400 mt-1">المادة: {book.subjectName}</p>
                          </div>

                          <div className="flex items-center justify-between pt-4 border-t border-slate-100/50">
                            <p className="text-[10px] font-black text-indigo-500">عدد الفصول الكلي: {book.chapters?.length || 0}</p>
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleEditBook(book)}
                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                title="تعديل هذا الكتاب"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={async () => {
                                  if (confirm("هل تريد حذف هذا المنهج نهائياً؟")) {
                                    try {
                                      await firestoreService.deleteItem("studentBooks", book.id);
                                    } catch (err) {
                                      alert("فشل حذف المنهج");
                                    }
                                  }
                                }}
                                className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                title="حذف هذا الكتاب"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {(!data.studentBooks || data.studentBooks.length === 0) && (
                      <div className="col-span-1 md:col-span-2 py-12 text-center text-slate-400 font-semibold italic text-xs">
                        لا توجد كتب دراسية مضافة حالياً. حمّل كتاباً لمدينة المناهج لبدء التوليد الذكي.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </SectionContainer>
          )}

          {activeTab === "archive" && (
            <SectionContainer
              title="إدارة الدورات الدراسية"
              description="أرشفة بيانات العام الحالي وترفيع الطلاب للمراحل الأعلى"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Archive Card */}
                <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-minimal space-y-6">
                  <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                    <Archive size={32} />
                  </div>
                  <h3 className="text-xl md:text-2xl font-black tracking-tighter text-slate-800">
                    أرشفة العام الدراسي
                  </h3>
                  <p className="text-slate-500 font-medium text-sm leading-relaxed">
                    عند انتهاء العام الدراسي، يمكنك أرشفة جميع الطلاب الحاليين.
                    سيتم الاحتفاظ بسجلاتهم ولكن لن يظهروا في القوائم النشطة.
                  </p>

                  <div className="pt-6 border-t border-slate-100 flex flex-col gap-4">
                    <select
                      id="archive-year-input"
                      className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 font-black outline-none"
                    >
                      <option value="2024-2025">
                        ٢٠٢٤ - ٢٠٢٥ (العام الحالي)
                      </option>
                    </select>
                    <button
                      onClick={() => {
                        const input = document.getElementById(
                          "archive-year-input",
                        ) as HTMLSelectElement;
                        handleArchiveYear(input.value);
                      }}
                      className="w-full py-4 bg-amber-600 text-white rounded-2xl font-black hover:bg-amber-700 transition-all flex items-center justify-center gap-2"
                    >
                      تأكيد أرشفة العام الحالي
                    </button>
                  </div>
                </div>

                {/* Promotion Card */}
                <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-minimal space-y-6">
                  <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                    <ArrowUpCircle size={32} />
                  </div>
                  <h3 className="text-xl md:text-2xl font-black tracking-tighter text-slate-800">
                    ترفيع الطلاب للعام القادم
                  </h3>
                  <p className="text-slate-500 font-medium text-sm leading-relaxed">
                    نقل مجموعة من الطلاب من فصل إلى آخر (مثلاً من الأول
                    الابتدائي إلى الثاني الابتدائي) مع بدء عام دراسي جديد.
                  </p>

                  <div className="pt-6 border-t border-slate-100 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">
                          من فصل:
                        </label>
                        <select
                          value={promoFromClassId}
                          onChange={(e) => setPromoFromClassId(e.target.value)}
                          className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 font-bold outline-none"
                        >
                          <option value="">اختر...</option>
                          {data.classes.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase">
                          إلى فصل:
                        </label>
                        <select
                          value={promoToClassId}
                          onChange={(e) => setPromoToClassId(e.target.value)}
                          className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 font-bold outline-none"
                        >
                          <option value="">اختر...</option>
                          {data.classes.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">
                        للعام الدراسي الجديد:
                      </label>
                      <select
                        value={promoYear}
                        onChange={(e) => setPromoYear(e.target.value)}
                        className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 font-black outline-none"
                      >
                        <option value="2025-2026">٢٠٢٥ - ٢٠٢٦</option>
                      </select>
                    </div>

                    <button
                      onClick={handlePromoteStudents}
                      disabled={!promoFromClassId || !promoToClassId}
                      className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-30"
                    >
                      بدء عملية الترفيع
                    </button>
                  </div>
                </div>
              </div>
            </SectionContainer>
          )}

          {activeTab === "rubrics" && (
            <SectionContainer
              title="معايير الزيارات الإشرافية"
              description="تصميم نماذج تقييم الزيارات (بنود، أقسام، درجات)"
            >
              <div className="space-y-8">
                <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 flex flex-col gap-6">
                  <div className="flex gap-4">
                    <input
                      type="text"
                      value={rubricName}
                      onChange={(e) => setRubricName(e.target.value)}
                      placeholder="اسم نموذج الزيارة (مثال: تقييم الأداء التعليمي)"
                      className="flex-1 h-14 bg-white border border-slate-200 rounded-2xl px-6 font-black outline-none focus:ring-4 focus:ring-indigo-50"
                    />
                    <div
                      className={`px-4 py-3 rounded-2xl font-black text-xs flex items-center ${
                        rubricCategories.reduce(
                          (acc, cat) =>
                            acc +
                            cat.items.reduce(
                              (a, item) => a + (item.maxScore || 0),
                              0,
                            ),
                          0,
                        ) === 100
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      المجموع:{" "}
                      {rubricCategories.reduce(
                        (acc, cat) =>
                          acc +
                          cat.items.reduce(
                            (a, item) => a + (item.maxScore || 0),
                            0,
                          ),
                        0,
                      )}{" "}
                      / 100
                    </div>
                    <button
                      onClick={handleAddRubric}
                      disabled={!rubricName || rubricCategories.length === 0}
                      className="bg-indigo-600 text-white px-8 rounded-2xl font-black hover:bg-slate-800 transition-colors flex items-center gap-2 disabled:opacity-30"
                    >
                      <Save size={18} /> حفظ النموذج
                    </button>
                  </div>

                  <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-100 w-fit">
                    <input 
                      type="checkbox"
                      id="isPeerRubric"
                      checked={isPeerRubric}
                      onChange={(e) => setIsPeerRubric(e.target.checked)}
                      className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                    <label htmlFor="isPeerRubric" className="text-xs font-black text-slate-700 select-none cursor-pointer">
                      هذا النموذج خاص بالزيارات التبادلية ونقل الأثر البيني بين المعلمين (Peer Visit Rubric)
                    </label>
                  </div>

                  <div className="flex gap-4 items-center bg-white p-4 rounded-2xl border border-slate-100">
                    <input
                      type="text"
                      value={newCatTitle}
                      onChange={(e) => setNewCatTitle(e.target.value)}
                      placeholder="أضف قسماً (مثال: إدارة الصف)"
                      className="flex-1 h-12 bg-slate-50 border border-slate-100 rounded-xl px-4 font-bold outline-none"
                    />
                    <button
                      onClick={addCategory}
                      className="bg-slate-900 text-white px-6 h-12 rounded-xl font-black flex items-center gap-2 transition-all"
                    >
                      <Plus size={18} /> أضف القسم
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {rubricCategories.map((cat, catIdx) => (
                      <div
                        key={cat.id}
                        className="bg-white p-6 rounded-3xl border border-indigo-100 shadow-sm space-y-4"
                      >
                        <div className="flex justify-between items-center group">
                          <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                            <h4 className="font-black text-slate-800 text-sm">
                              {cat.title}
                            </h4>
                          </div>
                          <button
                            onClick={() => removeCategory(catIdx)}
                            className="text-slate-300 hover:text-red-500 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <div className="space-y-2">
                          {cat.items.map((item, itemIdx) => (
                            <div
                              key={item.id}
                              className="bg-slate-50 p-3 rounded-2xl flex items-center gap-3 border border-slate-100"
                            >
                              <span className="flex-1 text-[11px] font-black text-slate-700">
                                {item.title}
                              </span>
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  value={item.maxScore}
                                  onChange={(e) => {
                                    const updated = [...rubricCategories];
                                    updated[catIdx].items[itemIdx].maxScore =
                                      Number(e.target.value);
                                    setRubricCategories(updated);
                                  }}
                                  className="w-12 text-center text-[10px] font-black bg-white border border-slate-200 rounded-lg p-1.5 outline-none focus:border-indigo-500"
                                  placeholder="الدرجة"
                                />
                              </div>
                              <button
                                onClick={() => removeItem(catIdx, itemIdx)}
                                className="text-slate-300 hover:text-red-400"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className="pt-2 flex gap-2">
                          <input
                            type="text"
                            id={`new-item-title-${catIdx}`}
                            placeholder="عنوان البند..."
                            className="flex-1 text-xs font-bold bg-slate-100/50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-indigo-500"
                          />
                          <input
                            type="number"
                            id={`new-item-score-${catIdx}`}
                            placeholder="الدرجة"
                            defaultValue={4}
                            min={1}
                            className="w-16 text-center text-xs font-bold bg-slate-100/50 border border-slate-200 rounded-xl px-2 py-2.5 outline-none focus:border-indigo-500"
                          />
                          <button
                            onClick={() => {
                              const titleInput = document.getElementById(
                                `new-item-title-${catIdx}`,
                              ) as HTMLInputElement;
                              const scoreInput = document.getElementById(
                                `new-item-score-${catIdx}`,
                              ) as HTMLInputElement;
                              const title = titleInput.value.trim();
                              const score = Number(scoreInput.value) || 4;

                              if (title) {
                                const updated = [...rubricCategories];
                                updated[catIdx].items.push({
                                  id: "item_" + Date.now(),
                                  title,
                                  maxScore: score,
                                  weight: 0,
                                });
                                setRubricCategories(updated);
                                titleInput.value = "";
                                scoreInput.value = "4";
                              }
                            }}
                            className="bg-indigo-50 text-indigo-600 px-4 rounded-xl flex items-center justify-center hover:bg-indigo-100 transition-colors"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {data.rubrics
                      ?.filter((r) => !r.isArchived)
                      .map((rubric) => (
                        <div
                          key={rubric.id}
                          className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-4 hover:border-indigo-100 transition-all"
                        >
                          <div>
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h4 className="font-black text-slate-800">
                                {rubric.name}
                              </h4>
                              <span className={`px-2 py-0.5 rounded-md text-[9px] font-black ${rubric.isPeerRubric ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-indigo-50 text-indigo-700 border border-indigo-100'}`}>
                                {rubric.isPeerRubric ? 'زيارة تبادلية بين المعلمين' : 'زيارة إشرافية'}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold">
                              {rubric.categories.length} أقسام |{" "}
                              {rubric.categories.reduce(
                                (acc, c) => acc + c.items.length,
                                0,
                              )}{" "}
                              بنود
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit("rubrics", rubric)}
                              className="flex-1 py-2 bg-slate-50 text-slate-500 rounded-xl font-black text-xs hover:bg-indigo-50 hover:text-indigo-600"
                            >
                              تعديل
                            </button>
                            <button
                              onClick={() =>
                                handleDelete("rubrics", rubric.id, rubric.name)
                              }
                              className="px-3 py-2 bg-slate-50 text-rose-300 rounded-xl hover:bg-rose-50 hover:text-rose-600"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </SectionContainer>
          )}

          {activeTab === "external_profiles" && (
            <SectionContainer
              title="بوابة الدخول الخارجي"
              description="إدارة حسابات المشرفين والمعلمين للدخول عبر رقم الهوية"
            >
              <div className="space-y-8">
                <div className="bg-indigo-900 p-8 rounded-3xl text-white flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl shadow-indigo-100">
                  <div>
                    <h3 className="text-xl font-black mb-2">
                      رابط الخدمة الخارجية
                    </h3>
                    <p className="text-indigo-200 text-sm font-medium">
                      قم بنسخ هذا الرابط وإرساله للمشرفين والمعلمين للدخول عبر
                      رقم الهوية فقط
                    </p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl flex items-center gap-4 w-full md:w-auto">
                    <code className="text-xs font-mono font-bold select-all break-all">
                      {window.location.origin}/?portal=true
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(
                          window.location.origin + "/?portal=true",
                        );
                        alert("تم نسخ الرابط بنجاح");
                      }}
                      className="bg-white text-indigo-900 px-4 py-2 rounded-xl text-xs font-black hover:bg-yellow-400 transition-colors shrink-0"
                    >
                      نسخ الرابط
                    </button>
                  </div>
                </div>

                <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 flex flex-col gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase mr-2">
                        رقم الهوية
                      </label>
                      <input
                        type="text"
                        value={extProfileId}
                        onChange={(e) => setExtProfileId(e.target.value)}
                        placeholder="أدخل رقم الهوية..."
                        className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 font-black outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase mr-2">
                        الاسم الثلاثي
                      </label>
                      <input
                        type="text"
                        value={extProfileName}
                        onChange={(e) => setExtProfileName(e.target.value)}
                        placeholder="اسم المستخدم..."
                        className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 font-black outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase mr-2">
                        نوع الحساب
                      </label>
                      <select
                        value={extProfileRole}
                        onChange={(e) =>
                          setExtProfileRole(
                            e.target.value as "teacher" | "supervisor",
                          )
                        }
                        className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 font-black outline-none"
                      >
                        <option value="teacher">معلم</option>
                        <option value="supervisor">مشرف</option>
                      </select>
                    </div>
                    {extProfileRole === "teacher" && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase mr-2">
                          ربط مع المعلم
                        </label>
                        <select
                          value={extProfileTeacherId}
                          onChange={(e) =>
                            setExtProfileTeacherId(e.target.value)
                          }
                          className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 font-black outline-none"
                        >
                          <option value="">اختر المعلم من القائمة...</option>
                          {data.teachers
                            .filter((t) => !t.isArchived)
                            .map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                    {extProfileRole === "supervisor" && (
                      <>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase mr-2">
                            صلاحية المشرف
                          </label>
                          <select
                            value={supervisorType}
                            onChange={(e) => setSupervisorType(e.target.value as "general"|"stage"|"classes")}
                            className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 font-black outline-none"
                          >
                            <option value="general">مشرف عام (جميع الصلاحيات)</option>
                            <option value="stage">مشرف مرحلة</option>
                            <option value="classes">مشرف صفوف</option>
                          </select>
                        </div>
                        {supervisorType === "stage" && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase mr-2">
                              المراحل الدراسية المخصصة
                            </label>
                            <div className="h-32 overflow-y-auto bg-white border border-slate-200 rounded-xl p-2 space-y-1 w-full text-xs">
                              {data.grades.filter(g => !g.isArchived).map(g => (
                                <label key={g.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer">
                                  <input 
                                    type="checkbox"
                                    checked={supervisorAllowedGradeIds.includes(g.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSupervisorAllowedGradeIds([...supervisorAllowedGradeIds, g.id]);
                                      } else {
                                        setSupervisorAllowedGradeIds(supervisorAllowedGradeIds.filter(id => id !== g.id));
                                      }
                                    }}
                                  />
                                  <span className="font-bold">{g.name}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                        {supervisorType === "classes" && (
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase mr-2">
                              الصفوف الدراسية المخصصة
                            </label>
                            <div className="h-32 overflow-y-auto bg-white border border-slate-200 rounded-xl p-2 space-y-1 w-full text-xs">
                              {data.classes.filter(c => !c.isArchived).map(c => {
                                const grd = data.grades.find(g => g.id === c.gradeId);
                                return (
                                  <label key={c.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer">
                                    <input 
                                      type="checkbox"
                                      checked={supervisorAllowedClassIds.includes(c.id)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSupervisorAllowedClassIds([...supervisorAllowedClassIds, c.id]);
                                        } else {
                                          setSupervisorAllowedClassIds(supervisorAllowedClassIds.filter(id => id !== c.id));
                                        }
                                      }}
                                    />
                                    <span className="font-bold">{c.name} {grd ? `(${grd.name})` : ''}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <button
                    onClick={handleAddExternalProfile}
                    className="bg-indigo-600 text-white h-14 rounded-2xl font-black hover:bg-slate-900 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2"
                  >
                    <Save size={20} />
                    {editingId ? "حفظ التعديلات" : "إضافة حساب جديد"}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.externalProfiles
                    ?.filter((p) => !p.isArchived)
                    .map((p) => (
                      <div
                        key={p.id}
                        className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm flex justify-between items-center group hover:border-indigo-200 transition-all"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[8px] font-black border ${p.role === "supervisor" ? "bg-amber-100 text-amber-700 border-amber-200" : "bg-emerald-100 text-emerald-700 border-emerald-200"}`}
                            >
                              {p.role === "supervisor" ? "مشرف" : "معلم"}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400">
                              ID: {p.id}
                            </span>
                          </div>
                          <h4 className="font-black text-slate-800">
                            {p.name}
                          </h4>
                          {p.role === "teacher" && p.linkedTeacherId && (
                            <p className="text-[10px] text-indigo-600 font-bold mt-1">
                              مرتبط بـ:{" "}
                              {
                                data.teachers.find(
                                  (t) => t.id === p.linkedTeacherId,
                                )?.name
                              }
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit("external_profiles", p)}
                            className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 flex items-center justify-center transition-all"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() =>
                              handleDelete("externalProfiles", p.id, p.name)
                            }
                            className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </SectionContainer>
          )}
        </main>
      <ConfirmationModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmLabel={confirmConfig.confirmLabel}
        cancelLabel="إلغاء التراجع"
        onConfirm={confirmConfig.onConfirm}
        onCancel={closeConfirm}
        isDestructive={confirmConfig.isDestructive}
      />
    </div>
  );
}

function SectionContainer({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
      <div className="mb-10">
        <h2 className="text-xl md:text-2xl font-black tracking-tighter text-slate-900 leading-tight">
          {title}
        </h2>
        <p className="text-slate-500 font-medium mt-2">{description}</p>
      </div>
      {children}
    </motion.div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-black text-sm transition-all ${
        active
          ? "bg-indigo-600 text-white shadow-xl shadow-indigo-100 translate-x-2"
          : "text-slate-400 hover:bg-white hover:text-slate-600"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function GradeManagerCard({
  grade,
  data,
  onEdit,
  onDelete,
  isProcessing,
}: {
  key?: string | number;
  grade: any;
  data: any;
  onEdit: () => void;
  onDelete: () => void;
  isProcessing: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);
  
  const toggleTeacher = (tId: string) => {
    setSelectedTeacherIds((prev) =>
      prev.includes(tId) ? prev.filter((id) => id !== tId) : [...prev, tId],
    );
  };

  const gradeClasses = data.classes.filter(
    (c: any) => c.gradeId === grade.id && !c.isArchived,
  );
  const gradeSubjects = data.subjects.filter(
    (s: any) => s.gradeId === grade.id && !s.isArchived,
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <ListRestart size={18} />
          </div>
          <div>
            <h3 className="font-black text-slate-800 text-sm leading-tight">{grade.name}</h3>
            <p className="text-slate-400 font-bold text-[10px] mt-0.5">
              {gradeClasses.length} فصول • {gradeSubjects.length} مواد
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            <ChevronRight
              size={16}
              className={`transform transition-transform ${isExpanded ? "-rotate-90" : "rotate-90"}`}
            />
          </button>
          <button
            onClick={onEdit}
            disabled={isProcessing}
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={onDelete}
            disabled={isProcessing}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      {isExpanded && (
        <motion.div
           initial={{ height: 0, opacity: 0 }}
           animate={{ height: "auto", opacity: 1 }}
           exit={{ height: 0, opacity: 0 }}
           className="p-6 space-y-8"
         >


            {/* Classes Section */}
            <div className="space-y-4">
              <h4 className="font-black text-slate-800 flex items-center gap-2 text-lg">
                <div className="w-2 h-6 bg-blue-500 rounded-full"></div>
                فصول هذه المرحلة
              </h4>
              <div className="flex flex-wrap gap-2">
                {gradeClasses.map((cls: any) => (
                  <div
                    key={cls.id}
                    className="bg-blue-50 border border-blue-100 text-blue-800 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 group"
                  >
                    {cls.name}
                  </div>
                ))}
                {gradeClasses.length === 0 && (
                  <span className="text-slate-400 text-sm italic py-2">
                    لا توجد فصول حالياً
                  </span>
                )}
              </div>

            </div>

            <div className="h-px bg-slate-100 w-full" />

            {/* Subjects Section */}
            <div className="space-y-4">
              <h4 className="font-black text-slate-800 flex items-center gap-2 text-lg">
                <div className="w-2 h-6 bg-purple-500 rounded-full"></div>
                المواد والمعلمين في هذه المرحلة
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {gradeSubjects.map((sub: any) => (
                  <div
                    key={sub.id}
                    className="bg-white border border-slate-200 p-3 rounded-2xl flex flex-col gap-1 hover:border-purple-200 transition-colors relative group"
                  >
                    <p className="font-black text-slate-800">{sub.name}</p>
                    <p className="text-xs font-bold text-purple-600 flex items-center gap-1">
                      <UserPlus size={12} />
                      {sub.teacherNames?.join("، ") ||
                        sub.teacherName ||
                        "بدون معلم"}
                    </p>
                    <button
                      onClick={async () =>
                        await firestoreService.deleteItem("subjects", sub.id)
                      }
                      className="absolute top-2 left-2 p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              {gradeSubjects.length === 0 && (
                <span className="block text-slate-400 text-sm italic py-2">
                  لا توجد مواد حالياً
                </span>
              )}

            </div>
          </motion.div>
        )}
      </div>
  );
}
