import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body Parsing Middleware for bulk content uploads
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ limit: "15mb", extended: true }));

  // API Routes MUST go before Vite middlewares
  app.post("/api/gemini/parse-quizzes", async (req, res) => {
    try {
      const { text, metadata } = req.body;
      if (!text) {
        return res.status(400).json({ error: "النص المطلوب فارغ" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: "مفتاح الذكاء الاصطناعي (GEMINI_API_KEY) غير مهيأ. يرجى تهيئته في الإعدادات أولاً."
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const systemInstruction = `
أنت خبير ومعلم تربوي متخصص في تحليل وصياغة الأسئلة والاختبارات المدرسية باللغة العربية بأسلوب احترافي.
مهمتك هي قراءة النص المستند المرسل واستخراج جميع الاختبارات والتقييمات الواردة فيه بشكل كامل ودقيق وصياغتها كـ JSON.

لديك في قاعدة بيانات النظام قائمة بالصفوف المتاحة، والفصول، والمواد الدراسية. يرجى مطابقة كل اختبار مستخرج مع هذه العناصر بدقة عالية:
1. الصفوف الدراسية المتاحة (Grades): ${JSON.stringify(metadata?.grades || [])}
2. الفصول المتاحة (Classes): ${JSON.stringify(metadata?.classes || [])}
3. المواد الدراسية المتاحة (Subjects): ${JSON.stringify(metadata?.subjects || [])}

مبادئ وقواعد الاستخراج والربط الذكي:
- قد يتكون النص من اختبار واحد أو عدة اختبارات مختلفة (مثلاً 10 أو 20 اختباراً). يرجى استخراج كل اختبار بشكل منفصل تماماً ضمن مصفوفة النتائج.
- طابق اسم "الصف" المذكور بالاختبار مع الرتب المتاحة (Grades) لتحديد معرف الصف "gradeId" (مثلاً الصف الأول، الصف الثاني، الصف الثالث).
- طابق اسم "المادة" مع قائمة المواد المتاحة (Subjects) لتحديد معرف المادة "subjectIds" (مصفوفة من المعرفات). يرجى الانتباه للمطابقات اللغوية مثل (رياضيات -> الرياضيات، قرآن كريم -> القرآن الكريم، لغتي الجميلة -> لغتي وهكذا) بما يتناسب مع صف المادة.
- حدد الفصول المذكورة في الاختبار مثل ("أ"، "ب") وطابقها مع قائمة الفصول (Classes) للحصول على "classIds" (مصفوفة من المعرفات) الملحقة بالصف المحدد.
- إذا لم تعثر على مطابقة دقيقة لأي عنصر، اترك المعرف فارغاً، واملأ قيمة "rawGrade" أو "rawClass" أو "rawSubject" بالاسم الأصيل المذكور بالنص لمساعدة المستخدم لاحقاً في التحديد اليدوي ضمن واجهة الاستيراد.
- استخرج كافة الأسئلة (questions) لكل اختبار. يرجى صياغتها كأسئلة اختيار من متعدد (MCQ) تتضمن دائماً 4 خيارات (options).
- حدد رقم الخيار الصحيح بدقة "correctAnswerIndex" كـ index يبدأ من 0 (أي 0 هو الخيار الأول، 1 هو الخيار الثاني، 2 هو الخيار الثالث، 3 هو الخيار الرابع).
- إذا كان السؤال في النص يحتوي على عدد خيارات أقل من 4، يرجى تكميل الخيارات ببدائل معقولة جداً حتى يصبح المجموع 4 خيارات دائمًا.
- يجب أن تكون النتيجة النهائية كود JSON نظيفاً تماماً ومطابقاً للـ Schema المطلوبة دون أي هوامش أو نصوص تفسيرية إضافية.
`;

      const promptRequest = `يرجى تحليل النص التالي واستخراج كافة الاختبارات الذكية وصياغتها دفعة واحدة:
-------------------------
${text}
-------------------------`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptRequest,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            description: "List of parsed school quizzes.",
            items: {
              type: Type.OBJECT,
              properties: {
                title: {
                  type: Type.STRING,
                  description: "The name / title of the quiz."
                },
                gradeId: {
                  type: Type.STRING,
                  description: "The ID of the matching grade from database."
                },
                classIds: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Array of matching class IDs."
                },
                subjectIds: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Array of matching subject IDs."
                },
                rawGrade: {
                  type: Type.STRING,
                  description: "The grade name extracted (e.g. 'الصف الثالث')."
                },
                rawClass: {
                  type: Type.STRING,
                  description: "The class letter extracted (e.g. 'ب' or 'أ وب')."
                },
                rawSubject: {
                  type: Type.STRING,
                  description: "The subject name extracted (e.g. 'لغتي' or 'رياضيات')."
                },
                questions: {
                  type: Type.ARRAY,
                  description: "The questions for this quiz.",
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      text: {
                        type: Type.STRING,
                        description: "The text of the question."
                      },
                      options: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: "Four options for this MCQ question."
                      },
                      correctAnswerIndex: {
                        type: Type.INTEGER,
                        description: "The index of the correct answer (0-3)."
                      }
                    },
                    required: ["text", "options", "correctAnswerIndex"]
                  }
                }
              },
              required: ["title", "questions"]
            }
          }
        }
      });

      const resultText = response.text || "[]";
      const parsedQuizzes = JSON.parse(resultText);

      res.json({ success: true, quizzes: parsedQuizzes });
    } catch (error: any) {
      console.error("Batch Quiz Parser API Error:", error);
      res.status(500).json({ error: error?.message || "فشلت معالجة الاختبارات. يرجى المحاولة لاحقاً." });
    }
  });

  app.post("/api/gemini/generate-questions", async (req, res) => {
    try {
      const { prompt, count, subject, grade } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "الرجاء كتابة تفاصيل الأسئلة المطلوبة" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: "مفتاح الذكاء الاصطناعي (GEMINI_API_KEY) غير مهيأ. يرجى تهيئته في الإعدادات أولاً."
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const systemInstruction = `
أنت خبير تربوي ومعلم متميز في صياغة الأسئلة والاختبارات المدرسية باللغة العربية بطريقة احترافية وعلمية دقيقة وتناسب الفئات العمرية والصفوف الدراسية المختلفة.
مهمتك هي صياغة وتوليد أسئلة اختيار من متعدد (MCQ) بناءً على طلب المستخدم (الموضوع، الصف، المادة، عدد الأسئلة).

شروط وقواعد توليد الأسئلة:
1. توليد العدد المطلوب من الأسئلة بدقة (العدد الافتراضي هو 5 أسئلة إذا لم يُحدد المستخدم العدد).
2. كل سؤال يجب أن يكون من نوع الاختيار من متعدد مع 4 خيارات (options) واضحة ومميزة ودقيقة علمياً ولغوياً.
3. حدد رقم الإجابة الصحيحة (correctAnswerIndex) بدقة بين 0 و 3 (حيث 0 هو الخيار الأول و 3 هو الخيار الرابع).
4. تأكد من أن الأسئلة تغطي جوانب الفهم والمعرفة والمهارات المناسبة للموضوع والصف المذكور.
5. لا تضف أي نصوص مقدمة أو مؤخرة، فقط أرجع مصفوفة JSON تحتوي على الأسئلة متوافقة تماماً مع الـ Schema المحددة.
`;

      const promptRequest = `قم بتوليد أسئلة اختبار بناءً على المعايير التالية:
- الطلب أو موضوع الأسئلة: ${prompt}
- عدد الأسئلة المطلوب: ${count || 5}
- المادة الدراسية: ${subject || "غير محددة"}
- الصف الدراسي: ${grade || "غير محدد"}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: promptRequest,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            description: "List of generated MCQ questions.",
            items: {
              type: Type.OBJECT,
              properties: {
                text: {
                  type: Type.STRING,
                  description: "The text of the question."
                },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Four options for this MCQ question."
                },
                correctAnswerIndex: {
                  type: Type.INTEGER,
                  description: "The index of the correct answer (0-3)."
                }
              },
              required: ["text", "options", "correctAnswerIndex"]
            }
          }
        }
      });

      const resultText = response.text || "[]";
      const generatedQuestions = JSON.parse(resultText);

      res.json({ success: true, questions: generatedQuestions });
    } catch (error: any) {
      console.error("Generate Questions API Error:", error);
      res.status(500).json({ error: error?.message || "فشل توليد الأسئلة. يرجى المحاولة لاحقاً." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve from dist
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
