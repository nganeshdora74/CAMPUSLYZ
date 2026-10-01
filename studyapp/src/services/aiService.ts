/**
 * Campusly AI Cloud Service
 *
 * Provides direct cloud-connected AI intelligence over any internet connection
 * (Mobile Data / Cellular 4G/5G, Wi-Fi, Web) without requiring a local Node.js backend.
 */

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

// OpenRouter Cloud API configuration
const DEFAULT_OPENROUTER_KEY = "";
const DEFAULT_OPENROUTER_URL = "https://openrouter.ai/api/v1";

const CANDIDATE_MODELS = [
  "openrouter/free",
  "nvidia/nemotron-3.5-lightning:free",
  "google/gemma-4-26b-a4b-it:free",
  "liquid/lfm-2.5-2.6b:free",
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
   - Remember details and context across previous turns in the chat history.
   - If the user asks "What is my name?" or "Who am I?", answer correctly with "${userName}".

2. Mathematics & Calculations (Strict BODMAS / PEMDAS):
   - Always apply standard mathematical order of operations (Brackets, Orders/Exponents, Division/Multiplication from left to right, Addition/Subtraction from left to right).
   - For simple calculations (e.g. "sum of 4, 6", "4 + 6", "15 * 8"), provide the accurate numerical answer immediately and clearly.
   - Show step-by-step arithmetic working out when helpful.

3. Academic & Campus Assistance:
   - Explain engineering, science, business, mathematics, and arts concepts clearly with diagrams in Markdown, bullet points, and real-world examples.
   ${
     options?.isAdmin
       ? `- Assist faculty with syllabus design, lecture planning, grading rubrics, formal notices, exam question generation, and campus administrative tasks.`
       : `- Assist students with study schedules, revision notes, viva prep, exam tips, and problem-solving.`
   }

4. Output Quality:
   - Provide direct, helpful Markdown-formatted answers.
   - Do NOT output internal scratchpads, "Thinking Process", or safety classifications.
`;

  return prompt;
}

/**
 * Direct Cloud AI Chat using OpenRouter API over HTTPS.
 * Works seamlessly over mobile cellular networks (4G/5G) and Wi-Fi.
 */
async function callCloudAI(
  userPrompt: string,
  options?: AskAIOptions
): Promise<string> {
  const apiKey = getOpenRouterApiKey();
  const baseUrl = getOpenRouterBaseUrl();

  // 1. Build messages payload
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

  // 2. Format past conversation history (last 8 turns)
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

  // 3. Try models in candidate list
  let lastError: Error | null = null;
  const preferredModel =
    process.env.EXPO_PUBLIC_OPENROUTER_MODEL || CANDIDATE_MODELS[0];
  const modelsToTry = [
    preferredModel,
    ...CANDIDATE_MODELS.filter((m) => m !== preferredModel),
  ];

  for (const model of modelsToTry) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 14000);

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://campusly.app",
          "X-Title": "Campusly AI",
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 900,
          temperature: 0.4,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        console.warn(
          `OpenRouter model ${model} HTTP ${response.status}: ${errorText}`
        );
        continue;
      }

      const data = await response.json();
      let replyContent = data.choices?.[0]?.message?.content;

      if (replyContent && typeof replyContent === "string" && replyContent.trim()) {
        // Strip any residual thinking tags if a model emitted them
        replyContent = replyContent.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
        return replyContent;
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`Cloud AI call to ${model} failed:`, err?.message || err);
    }
  }

  throw lastError || new Error("All cloud AI models were unavailable.");
}

/**
 * Main AI Query entry point for both student and admin interfaces.
 *
 * 1. Queries the Direct Cloud AI over HTTPS (Works anywhere with internet / mobile network).
 * 2. If completely offline (no internet), returns an offline-aware response.
 */
export async function askCampuslyAI(
  message: string,
  options?: AskAIOptions
): Promise<string> {
  const text = message.trim();

  if (!text && !options?.mobileNetData && !options?.imageUri) {
    throw new Error("Please enter a question or attach an image.");
  }

  // 1. Direct Cloud AI request via internet (Mobile data / Wi-Fi)
  try {
    const cloudReply = await callCloudAI(text, options);
    if (cloudReply) {
      return cloudReply;
    }
  } catch (cloudErr: any) {
    console.warn("Direct Cloud AI request failed, checking network:", cloudErr);

    // If device has no internet connection
    const isNetworkError =
      cloudErr instanceof TypeError ||
      cloudErr?.message?.includes("Network request failed") ||
      cloudErr?.message?.includes("Failed to fetch") ||
      cloudErr?.name === "AbortError";

    if (isNetworkError) {
      return (
        "⚠️ **Internet Connection Required**\n\n" +
        "Campusly AI runs in the cloud and requires an active internet connection (Mobile Network 4G/5G or Wi-Fi).\n\n" +
        "Please check that your mobile data or Wi-Fi is enabled and try again."
      );
    }

    throw cloudErr;
  }

  throw new Error("Unable to obtain AI response. Please try again.");
}
