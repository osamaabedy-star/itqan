import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Helper function to call generateContent with retry on transient errors
async function generateContentWithRetry(ai: any, params: any, maxRetries = 6, initialDelay = 2000) {
  let attempt = 0;
  // Use gemini-3.5-flash as the primary recommended model for text tasks
  const originalModel = params.model || "gemini-3.5-flash";
  
  // Stable and supported models list from skill
  const fallbackModels = [
    "gemini-3.5-flash",
    "gemini-flash-latest",
    "gemini-3.1-flash-lite",
    "gemini-1.5-flash-8b", // Sometimes available when others aren't
  ];

  // Ensure initial model is set
  if (!params.model) params.model = originalModel;

  while (true) {
    try {
      console.log(`[Gemini API] Calling ${params.model} (Attempt ${attempt + 1})`);
      return await ai.models.generateContent(params);
    } catch (error: any) {
      attempt++;
      const errorMsg = String(error?.stack || error?.message || error);
      console.error(`[Gemini API] Failure on ${params.model}: ${errorMsg.substring(0, 400)}`);
      
      // Resource Exhausted (429) / Service Unavailable (503) / Internal Error (500)
      const isTransient = 
        errorMsg.includes("503") || 
        errorMsg.includes("429") || 
        errorMsg.includes("UNAVAILABLE") || 
        errorMsg.includes("high demand") || 
        errorMsg.includes("ResourceExhausted") || 
        errorMsg.includes("resource exhausted") ||
        errorMsg.includes("overloaded") ||
        errorMsg.includes("limit") ||
        errorMsg.includes("quota");

      // Model Not Found (404)
      const isNotFound = 
        errorMsg.includes("404") || 
        errorMsg.includes("NOT_FOUND") || 
        errorMsg.includes("is not found") || 
        errorMsg.includes("not supported") ||
        errorMsg.includes("invalid model");

      if (attempt <= maxRetries && (isTransient || isNotFound)) {
        // Switch model for either 404 (wrong model) OR 429/503 (full for this model)
        const nextModel = fallbackModels[attempt % fallbackModels.length];
        
        if (params.model !== nextModel) {
          console.warn(`[Gemini API] Switching model from ${params.model} to ${nextModel} due to ${isNotFound ? '404' : '429/503'}`);
          params.model = nextModel;
        }

        // Increase delay significantly for quota issues
        let delay = initialDelay * Math.pow(2.5, attempt - 1);
        if (errorMsg.includes("429")) {
          delay += 2000; // Extra buffer for quota
          console.warn(`[Gemini API] Quota hit. Waiting extra long: ${delay}ms`);
        }

        console.warn(`[Gemini API] Retrying in ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // If we exhausted retries or hit a non-retryable error
      if (errorMsg.includes("429") || errorMsg.includes("quota")) {
        throw new Error("لقد تجاوزت حد الاستخدام اليومي للذكاء الاصطناعي (Quota Exceeded). يرجى المحاولة مرة أخرى بعد بضع دقائق أو في وقت لاحق.");
      }
      if (errorMsg.includes("503") || errorMsg.includes("UNAVAILABLE")) {
        throw new Error("خدمة الذكاء الاصطناعي تعاني حالياً من ضغط شديد. يرجى المحاولة مرة أخرى بعد قليل.");
      }
      
      throw error;
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body Parsing Middleware for bulk content uploads
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ limit: "15mb", extended: true }));

  // Health check
  app.get("/api/health", (req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));
  app.post("/api/gemini/parse-quizzes", async (req, res) => {
    try {
      const { text, metadata } = req.body;
      if (!text) {
        return res.status(400).json({ error: "النص المطلوب فارغ" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
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

      const response = await generateContentWithRetry(ai, {
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
      const { prompt, count, subject, grade, chapters } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "الرجاء كتابة تفاصيل الأسئلة المطلوبة" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error("GEMINI_API_KEY is missing!");
        return res.status(500).json({ error: "مفتاح الذكاء الاصطناعي (API KEY) غير متوفر." });
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

      const contents: any[] = [];
      let promptRequestText = `قم بتوليد أسئلة اختبار بناءً على المعايير التالية:\n`;
      promptRequestText += `- عدد الأسئلة المطلوب: ${count || 5}\n`;
      promptRequestText += `- المادة الدراسية: ${subject || "غير محددة"}\n`;
      promptRequestText += `- الصف الدراسي: ${grade || "غير محدد"}\n\n`;

      if (chapters && Array.isArray(chapters) && chapters.length > 0) {
        promptRequestText += `أنت بصدد توليد أسئلة اختبار دقيقة ومطابقة بنسبة 100% للنصوص والمناهج المرجعية المرفقة أدناه لمادة {${subject || "المواد"}}:\n\n`;
        contents.push(promptRequestText);

        for (const chap of chapters) {
          if (chap.content && typeof chap.content === "string" && chap.content.startsWith("data:application/pdf;base64,")) {
            const base64Data = chap.content.split(",")[1];
            contents.push({ text: `محتوى الدرس والملخص المرجعي لكل من درس: ${chap.title}${chap.pages ? ` (المأخوذ من الصفحات: ${chap.pages})` : ""}:` });
            contents.push({
              inlineData: {
                mimeType: "application/pdf",
                data: base64Data
              }
            });
          } else {
            contents.push({ text: `عنوان الدرس/البند: ${chap.title}${chap.pages ? ` (الصفحات المستهدفة: ${chap.pages})` : ""}\nالمحتوى المرجعي والشرح:\n${chap.content}` });
          }
        }

        contents.push({ text: `يرجى صياغة أسئلة اختبار ذكية وبنفس مفردات ومصطلحات المراجع والمناهج المرفقة أعلاه تقيس فهم وتحصيل الطلاب بنظام الأسئلة المتعددة MCQ وبدقة تامة.` });
      } else {
        // Clean prompt from raw base64 if it accidentally leaked to string
        let cleanedPrompt = prompt;
        if (typeof prompt === "string" && prompt.includes("data:application/pdf;base64,")) {
          cleanedPrompt = prompt.replace(/data:application\/pdf;base64,[A-Za-z0-9+/=\s\r\n]+/g, "[ملف PDF مدمج]");
        }
        promptRequestText += `- الطلب أو موضوع الأسئلة: ${cleanedPrompt}\n`;
        contents.push(promptRequestText);
      }

      const response = await generateContentWithRetry(ai, {
        model: "gemini-3.5-flash",
        contents: { parts: contents.map(item => typeof item === "string" ? { text: item } : item) },
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

  app.post("/api/gemini/generate-chapter-content", async (req, res) => {
    try {
      const { chapterTitle, subject, grade, pdfData } = req.body;
      if (!chapterTitle) {
        return res.status(400).json({ error: "الرجاء كتابة اسم أو عنوان الفصل/الدرس" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const systemInstruction = `
أنت خبير مناهج تعليمية ومؤلف كتب مدرسية متميز باللغة العربية.
مهمتك هي كتابة محتوى درس تعليمي متميز وشامل ودقيق علمياً ولغوياً يناسب الطلاب في الصف الدراسي المعني.
اكتب شرحاً وافياً ومثرياً ومقسماً إلى نقاط وعناوين فرعية واضحة، ولا تضف مقدمات أو استخلاصات خارج نطاق الدرس نفسه.
`;

      const contents: any[] = [];
      let promptRequest = "";

      if (pdfData && typeof pdfData === "string" && pdfData.startsWith("data:application/pdf;base64,")) {
        const base64Data = pdfData.split(",")[1];
        contents.push({
          inlineData: {
            mimeType: "application/pdf",
            data: base64Data
          }
        });
        promptRequest = `قم بقراءة وتحليل ملف المنهج المرفق PDF وكتابة تلخيص وشرح وافٍ وتفصيلي ومنظم في نقاط وعناوين لمحتوى هذا الدرس:
- عنوان الدرس: ${chapterTitle}
- المادة الدراسية: ${subject || "غير محددة"}
- الصف الدراسي: ${grade || "غير محدد"}

تأكد من استخراج وتوضيح كافة المفاهيم والمعلومات والأمثلة الهامة الواردة بدقة ممتازة باللغة العربية ليكون مرجعاً ممتازاً لإنتاج أسئلة الاختبارات واكتساب المعرفة.`;
      } else {
        promptRequest = `قم بتأليف محتوى درس كامل ومتميز ومنظم لعنوان الفصل/الدرس التالي:
- عنوان الدرس: ${chapterTitle}
- المادة الدراسية: ${subject || "غير محددة"}
- الصف الدراسي: ${grade || "غير محدد"}`;
      }

      contents.push({ text: promptRequest });

      const response = await generateContentWithRetry(ai, {
        model: "gemini-3.5-flash",
        contents: { parts: contents },
        config: {
          systemInstruction,
        }
      });

      const generatedContent = response.text || "";
      res.json({ success: true, content: generatedContent });
    } catch (error: any) {
      console.error("Generate Chapter Content API Error:", error);
      res.status(500).json({ error: error?.message || "فشلت كتابة محتوى الدرس بالذكاء الاصطناعي." });
    }
  });

  // Catch-all for API routes to ensure they always return JSON and not SPA HTML
  app.all("/api/*", (req, res) => {
    res.status(404).json({ 
      error: "المسار غير موجود (endpoint not found)", 
      method: req.method, 
      path: req.url 
    });
  });

  // Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Global Server Error:", err);
    res.status(500).json({ 
      error: "حدث خطأ غير متوقع في الخادم", 
      message: err.message || String(err) 
    });
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

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
