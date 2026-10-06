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
      userContext,
      userName,
    } = req.body;

    if (!message?.trim() && !mobileNetData && !image && !imageBase64) {
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

    let user = req.user?.id ? await User.findById(req.user.id) : null;

    if (!user) {
      user = {
        name:
          userName ||
          userContext?.name ||
          req.user?.name ||
          "Campusly Member",
        role: req.user?.role || userContext?.role || "student",
        department: userContext?.department || "General",
        semester: userContext?.semester || null,
        section: userContext?.section || null,
      };
    }

    const campusContext = await getCampusContext(user, effectiveMessage);

    const systemPrompt = `
You are Campusly AI, a highly intelligent, empathetic academic and campus assistant for university students, faculty, and administrators.

User Context:
Account Name: ${user.name}
Role: ${user.role || "student"}
Department: ${user.department || "Not provided"}
Semester: ${user.semester || "Not provided"}
Section: ${user.section || "Not provided"}

Core Behavioral Guidelines:

1. User Identity & Conversational Memory:
   - If the user introduces themselves with their name (e.g., "I am Roshan Pradhan", "My name is ..."), ALWAYS prioritize, remember, and address them by their introduced name throughout the entire conversation!
   - When asked "What is my name?", "Can you know my name?", or "Say my name?":
     * If they introduced themselves with a name in the conversation history, reply directly and naturally with that introduced name (e.g., "Your name is Roshan Pradhan!").
     * If they have NOT introduced themselves in the chat, use their account name: "${user.name}".
     * NEVER say "from the student information provided: Test Administrator" or refer to internal system records when they already told you their name.

2. Friendly Greetings:
   - When the user sends a greeting (e.g., "Hi", "Hello", "Hey"), respond warmly and politely, acknowledge them by name, and ask how you can help with their studies or campus activities. Never provide irrelevant canned lecture notes or study outlines in response to simple greetings.

3. Strict BODMAS / PEMDAS Order of Operations for Mathematics:
   - Brackets / Parentheses first.
   - Orders / Exponents next.
   - Division and Multiplication from left to right.
   - Addition and Subtraction from left to right.
   - Always show clear step-by-step mathematical working before the final answer.

4. Academic Assistance:
   - Explain academic doubts clearly and simply.
   - Use examples, equations, tables, and Markdown where useful.
   - Assist with syllabus, timetable, faculty, rooms, notices, exams, and notes using the campus context below.
   - If campus-specific information is unavailable, honestly say that it is unavailable.

5. Clean Response Format:
   - Do NOT include internal classifier tags, moderation markers, or "User Safety: safe".
   - Do NOT output internal thinking blocks.
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

    const candidateModels = [
      aiConfig.model || "gemini-3.5-flash",
      "gemini-3.5-flash",
      "gemini-flash-lite-latest",
      "gemini-3.5-flash-lite",
      "gemini-3.8-flash",
    ];
    const uniqueModels = [...new Set(candidateModels)];

    let reply = "";
    let lastError = null;

    for (const modelCandidate of uniqueModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelCandidate,
          contents,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.3,
            maxOutputTokens: 850,
          },
        });

        const text = response?.text || "";
        if (text.trim()) {
          reply = text.trim();
          break;
        }
      } catch (err) {
        lastError = err;
        console.warn(
          `Gemini model ${modelCandidate} failed:`,
          err.message?.slice(0, 120)
        );
      }
    }

    if (!reply && lastError) {
      throw lastError;
    }

    /*
     * Remove accidental thinking markers if a model response
     * contains them.
     */
    if (reply.includes("</think>")) {
      reply = reply.split("</think>").pop().trim();
    }

    // Strip internal safety tags like "User Safety: safe"
    reply = reply.replace(/^User Safety:\s*safe\s*$/gim, "").trim();

    if (!reply || reply.toLowerCase() === "safe") {
      const lowerMsg = effectiveMessage.toLowerCase();
      if (
        lowerMsg.includes("say my name") ||
        lowerMsg.includes("what is my name") ||
        lowerMsg.includes("know my name")
      ) {
        reply = `You are **${user.name}**! How can I assist you with your academics or campus schedule today?`;
      } else {
        reply = `Hello, **${user.name}**! How can I assist you today? Feel free to ask about your courses, timetable, exams, or campus services.`;
      }
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