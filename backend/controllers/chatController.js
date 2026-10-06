const { GoogleGenAI } = require("@google/genai");
const { User } = require("../models");
const aiConfig = require("../config/ai");
const { getCampusContext } = require("../services/campusContextService");

exports.chatWithAI = async (req, res) => {
  try {
    const {
      message,
      image,
      imageBase64,
      mobileNetData,
      history,
    } = req.body;

    if (!message?.trim() && !mobileNetData && !image) {
      return res.status(400).json({
        success: false,
        message: "Message or visual scan is required",
      });
    }

    const effectiveMessage =
      message?.trim() ||
      (mobileNetData
        ? `Analyze this scanned ${
            mobileNetData.primaryClass || "study object"
          }`
        : "Explain this image");

    if (!aiConfig) {
      return res.status(503).json({
        success: false,
        message: "AI chatbot is not configured. Add GEMINI_API_KEY to .env",
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const campusContext = await getCampusContext(user, message);

    const systemPrompt = `
You are Campusly AI, a highly intelligent, empathetic academic and campus assistant for university students, faculty, and administrators.

User Context:
Account Name: ${user.name}
Department: ${user.department || "Not provided"}
Semester: ${user.semester || "Not provided"}
Section: ${user.section || "Not provided"}

Core Behavioral Guidelines:

1. User Identity & Conversational Memory:
   - If the user introduces themselves with their name, remember and respect their preferred name during the current conversation.
   - Maintain context across previous turns supplied in the conversation history.

2. Strict BODMAS / PEMDAS Order of Operations for Mathematics:
   - Brackets / Parentheses first.
   - Orders / Exponents next.
   - Division and Multiplication from left to right.
   - Addition and Subtraction from left to right.
   - Always show clear step-by-step mathematical working before the final answer.

3. Academic Assistance:
   - Explain academic doubts clearly and simply.
   - Use examples, equations, tables, and Markdown where useful.
   - Assist with syllabus, timetable, faculty, rooms, notices, exams, and notes using the campus context below.
   - If campus-specific information is unavailable, honestly say that it is unavailable.

4. Clean Response Format:
   - Do not include internal classifier tags.
   - Do not include "User Safety: safe".
   - Provide a direct, useful Markdown response.

Campus database context:
${campusContext}
`;

    let promptContent = effectiveMessage;

    if (mobileNetData) {
      promptContent = `[STUDENT VISUAL CAMERA SCAN (Powered by MobileNet-v2 Neural Vision)]:

Object Identified: ${
        mobileNetData.primaryClass ||
        mobileNetData.label ||
        "Academic Object"
      }

Category: ${mobileNetData.category || "Engineering & Science"}

Confidence: ${(
        (mobileNetData.confidence || 0.95) * 100
      ).toFixed(1)}%

Model: MobileNet-v2 (Depthwise Separable CNN, ~28ms Latency)

Student's Question:
"${effectiveMessage}"

Please provide a structured academic breakdown:

1. Clear explanation of the scientific/engineering concepts.
2. Operating principles, circuit diagrams, or key equations where relevant.
3. Top 3 high-yield viva and university exam questions with answers.
4. Laboratory tips and practical study guidance.
`;
    }

    /*
     * Convert previous Campusly chat history into Gemini's
     * conversation format.
     */
    let conversationHistory = [];

    if (Array.isArray(history) && history.length > 0) {
      conversationHistory = history
        .filter((h) => h && (h.content || h.text))
        .map((h) => ({
          role: h.role === "assistant" ? "model" : "user",
          parts: [
            {
              text: String(h.content || h.text).slice(0, 1500),
            },
          ],
        }))
        .slice(-8);
    }

    const ai = new GoogleGenAI({
      apiKey: aiConfig.apiKey,
    });

    /*
     * Gemini's system instruction is separate from the
     * conversation messages.
     */
    const contents = [
      ...conversationHistory,
      {
        role: "user",
        parts: [
          {
            text: promptContent,
          },
        ],
      },
    ];

    /*
     * Support imageBase64 when the client sends an image.
     * The existing MobileNet path remains supported as well.
     */
    if (imageBase64) {
      const cleanBase64 = String(imageBase64).replace(
        /^data:image\/[^;]+;base64,/,
        ""
      );

      const lastContent = contents[contents.length - 1];

      lastContent.parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: cleanBase64,
        },
      });
    }

    const response = await ai.models.generateContent({
      model: aiConfig.model,
      contents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.3,
        maxOutputTokens: 850,
      },
    });

    let reply = response?.text || "";

    /*
     * Remove accidental thinking markers if a model response
     * contains them.
     */
    if (reply.includes("</think>")) {
      reply = reply.split("</think>").pop().trim();
    }

    if (
      reply.toLowerCase().includes("user safety:") ||
      reply.trim().toLowerCase() === "safe"
    ) {
      reply =
        "Sorry, I could not generate a suitable answer right now. Please try asking your question again.";
    }

    if (!reply.trim()) {
      reply =
        "Sorry, I could not generate an answer right now. Please try again in a moment.";
    }

    return res.json({
      success: true,
      reply: reply.trim(),
    });
  } catch (error) {
    console.error("GEMINI AI ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "I am having temporary trouble connecting to Gemini.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};