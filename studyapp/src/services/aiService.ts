/**
 * Campusly AI Service
 *
 * Provides hybrid AI intelligence:
 * 1. Queries Campusly Backend Intelligence Engine (Gemini AI + University Database Context)
 * 2. Seamlessly falls back to direct Cloud AI when backend is offline
 * 3. Provides intelligent, graceful offline assistance when no network is reachable
 */

import { getApiUrl } from "../api";
import { auth } from "../firebase/config";

export interface AIChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface UserContext {
  name?: string;
  role?: "student" | "faculty" | "admin" | string;
  department?: string;
  semester?: string;
  section?: string;
}

export interface MobileNetScanInfo {
  primaryClass?: string;
  label?: string;
  category?: string;
  confidence?: number;
}

export interface AskAIOptions {
  history?: Array<{ role: string; content?: string; text?: string }>;
  userContext?: UserContext;
  mobileNetData?: MobileNetScanInfo | null;
  imageUri?: string | null;
  isAdmin?: boolean;
}

// OpenRouter Cloud API fallback configuration
const DEFAULT_OPENROUTER_URL = "https://openrouter.ai/api/v1";

const CANDIDATE_MODELS = [
  "openrouter/free",
  "liquid/lfm-2.5-2.6b:free",
  "nvidia/nemotron-3.5-lightning:free",
];

function getOpenRouterApiKey(): string {
  return process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || "";
}

function getOpenRouterBaseUrl(): string {
  return process.env.EXPO_PUBLIC_OPENROUTER_BASE_URL || DEFAULT_OPENROUTER_URL;
}

function buildSystemPrompt(options?: AskAIOptions): string {
  const ctx = options?.userContext;
  const userName = ctx?.name || (options?.isAdmin ? "Faculty Admin" : "Student");
  const roleName = options?.isAdmin ? "Administrator / Faculty Member" : "University Student";

  let prompt = `You are Campusly AI, a highly capable, friendly, and intelligent academic assistant designed for university students, faculty, and administrators.

User Information:
- Name: ${userName}
- Role: ${roleName}
${ctx?.department ? `- Department: ${ctx.department}` : ""}
${ctx?.semester ? `- Semester: ${ctx.semester}` : ""}
${ctx?.section ? `- Section: ${ctx.section}` : ""}

Core Rules & Guidelines:
1. Conversational Memory & Personalization:
   - Greet or address the user by their preferred name (${userName}).
   - If the user introduces themselves in conversation (e.g., "I am Roshan Pradhan"), ALWAYS remember and address them by that name!
   - If the user asks "What is my name?", "Can you know my name?", or "Say my name?", answer directly with their name (${userName}).

2. Friendly Greetings:
   - When the user sends a greeting (e.g., "Hi", "Hello", "Hey"), respond warmly and personally, greeting them by name.

3. Mathematics & Calculations (Strict BODMAS / PEMDAS):
   - Always apply standard mathematical order of operations (Brackets, Orders/Exponents, Division/Multiplication from left to right, Addition/Subtraction from left to right).
   - For simple calculations (e.g. "sum of 4, 6", "4 + 6", "15 * 8"), provide the accurate numerical answer immediately and clearly.
   - Show step-by-step arithmetic working out when helpful.

4. Academic & Campus Assistance:
   - Explain engineering, science, business, mathematics, and arts concepts clearly with diagrams in Markdown, bullet points, and real-world examples.
   ${
     options?.isAdmin
       ? `- Assist faculty with syllabus design, lecture planning, grading rubrics, formal notices, exam question generation, and campus administrative tasks.`
       : `- Assist students with study schedules, revision notes, viva prep, exam tips, and problem-solving.`
   }

5. Output Quality:
   - Provide direct, helpful Markdown-formatted answers.
   - Do NOT output internal scratchpads, "Thinking Process", or safety classifications like "User Safety: safe".
`;

  return prompt;
}

/**
 * 1. Query Campusly Backend Engine (Gemini AI + MongoDB Campus Context)
 */
async function callBackendAI(
  userPrompt: string,
  options?: AskAIOptions
): Promise<string | null> {
  try {
    const baseUrl = getApiUrl();
    if (!baseUrl) return null;

    let token = "";
    try {
      if (auth.currentUser) {
        token = await auth.currentUser.getIdToken();
      }
    } catch {}

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        message: userPrompt,
        history: options?.history,
        mobileNetData: options?.mobileNetData,
        imageBase64: options?.imageUri,
        userName: options?.userContext?.name,
        userContext: options?.userContext,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data?.reply && typeof data.reply === "string" && data.reply.trim()) {
        return data.reply.trim();
      }
    }
  } catch (err: any) {
    console.warn("Backend AI call unavailable, attempting cloud fallback:", err?.message || err);
  }

  return null;
}

/**
 * 2. Direct Cloud AI Chat using OpenRouter API over HTTPS.
 */
async function callCloudAI(
  userPrompt: string,
  options?: AskAIOptions
): Promise<string | null> {
  const apiKey = getOpenRouterApiKey();
  const baseUrl = getOpenRouterBaseUrl();

  const systemPrompt = buildSystemPrompt(options);

  let formattedPrompt = userPrompt;
  if (options?.mobileNetData) {
    const scan = options.mobileNetData;
    formattedPrompt = `[Visual Camera Scan powered by MobileNet Neural Vision]:
Item Detected: ${scan.primaryClass || scan.label || "Academic Object"}
Category: ${scan.category || "General"}
Confidence: ${((scan.confidence || 0.95) * 100).toFixed(1)}%

User's Query:
"${userPrompt || "Explain this object and its academic concepts"}"

Please provide a structured academic breakdown:
1. Concept explanation and operating principles.
2. Key scientific/engineering equations or diagrams.
3. Top high-yield exam / viva questions with answers.
4. Practical study advice.`;
  }

  const conversationTurns: Array<{ role: "user" | "assistant"; content: string }> = [];
  if (Array.isArray(options?.history) && options.history.length > 0) {
    for (const h of options.history.slice(-8)) {
      const role = h.role === "assistant" ? "assistant" : "user";
      const text = (h.content || h.text || "").trim();
      if (text) {
        conversationTurns.push({ role, content: text });
      }
    }
  }

  const messages = [
    { role: "system", content: systemPrompt },
    ...conversationTurns,
    { role: "user", content: formattedPrompt },
  ];

  const preferredModel =
    process.env.EXPO_PUBLIC_OPENROUTER_MODEL || CANDIDATE_MODELS[0];
  const modelsToTry = [
    preferredModel,
    ...CANDIDATE_MODELS.filter((m) => m !== preferredModel),
  ];

  for (const model of modelsToTry) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          "X-Title": "Campusly AI",
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 900,
          temperature: 0.3,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        continue;
      }

      const data = await response.json();
      let replyContent = data.choices?.[0]?.message?.content;

      if (replyContent && typeof replyContent === "string" && replyContent.trim()) {
        replyContent = replyContent.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
        replyContent = replyContent.replace(/^User Safety:\s*safe\s*$/gim, "").trim();

        if (replyContent.length > 0 && replyContent.toLowerCase() !== "safe") {
          return replyContent;
        }
      }
    } catch (err: any) {
      console.warn(`Cloud AI call to ${model} failed:`, err?.message || err);
    }
  }

  return null;
}

/**
 * 3. Graceful offline/local fallback response
 */
function generateFallbackResponse(userPrompt: string, options?: AskAIOptions): string {
  const userName =
    options?.userContext?.name ||
    (options?.isAdmin ? "Administrator" : "Student");
  const trimmed = userPrompt.trim();
  const lower = trimmed.toLowerCase();

  // Greetings
  if (
    /^(hi|hello|hey|good\s*(morning|afternoon|evening)|greetings|hola)\b/i.test(
      trimmed
    )
  ) {
    if (options?.isAdmin) {
      return `Hello, **${userName}**! 👋 How can I assist you with faculty lesson planning, campus operations, or student requests today?`;
    }
    return `Hello, **${userName}**! 👋 How can I help you with your studies, courses, or campus schedule today?`;
  }

  // Name queries
  if (
    lower.includes("say my name") ||
    lower.includes("what is my name") ||
    lower.includes("know my name")
  ) {
    return `You are **${userName}**! How can I assist you today?`;
  }

  // BODMAS / Mathematics
  if (
    lower.includes("bodmas") ||
    lower.includes("pemdas") ||
    /(\d+)\s*[\+\-\*\/]\s*(\d+)/.test(trimmed)
  ) {
    return `### 📐 Mathematical Order of Operations (BODMAS / PEMDAS)\n\nIn mathematics, calculations strictly follow the **BODMAS / PEMDAS** rule:\n1. **B / P**: Brackets / Parentheses first $(...)$\n2. **O / E**: Orders / Exponents ($x^2, \\sqrt{x}$)\n3. **D / M**: Division and Multiplication (evaluated from **left to right**)\n4. **A / S**: Addition and Subtraction (evaluated from **left to right**)\n\nFeel free to ask for step-by-step arithmetic working for any equation!`;
  }

  // Admin Operational Queries
  if (options?.isAdmin) {
    return `Here are the operational areas I can assist you with:\n\n` +
      `- **Timetable & Faculty:** Class scheduling and room allotments\n` +
      `- **Campus Maintenance:** Hostel, Wi-Fi, and electrical SLA complaints\n` +
      `- **Gate Passes:** Reviewing pending student leave requests\n` +
      `- **Academic Notices:** Drafting formal college circulars\n\n` +
      `How can I assist you with this task, **${userName}**?`;
  }

  // General helpful student response
  return `I'm here to help you, **${userName}**!\n\n` +
    `You can ask me about:\n` +
    `- **Academic Doubts**: Explaining topics, solving math, and viva prep\n` +
    `- **Study Schedules**: Structuring your revision for university exams\n` +
    `- **Campus Services**: Library hours, timetable, and campus facilities\n\n` +
    `What specific topic or question would you like to explore?`;
}

/**
 * Main AI Query entry point for both student and admin interfaces.
 */
export async function askCampuslyAI(
  message: string,
  options?: AskAIOptions
): Promise<string> {
  const text = message.trim();

  if (!text && !options?.mobileNetData && !options?.imageUri) {
    throw new Error("Please enter a question or attach an image.");
  }

  // 1. Try Backend Intelligence Engine (Gemini + Campus Database Context)
  try {
    const backendReply = await callBackendAI(text, options);
    if (backendReply) {
      return backendReply;
    }
  } catch (backendErr) {
    console.warn("Backend AI unavailable, trying cloud fallback:", backendErr);
  }

  // 2. Direct Cloud AI request via OpenRouter fallback
  try {
    const cloudReply = await callCloudAI(text, options);
    if (cloudReply) {
      return cloudReply;
    }
  } catch (cloudErr) {
    console.warn("Direct Cloud AI request failed:", cloudErr);
  }

  // 3. Fallback response (offline / network down)
  return generateFallbackResponse(text, options);
}
