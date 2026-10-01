const { User } = require("../models");
const aiConfig = require("../config/ai");
const { getCampusContext } = require("../services/campusContextService");

exports.chatWithAI = async (req, res) => {
  try {
    const { message, image, imageBase64, mobileNetData, history } = req.body;

    if (!message?.trim() && !mobileNetData && !image) {
      return res.status(400).json({
        success: false,
        message: "Message or visual scan is required",
      });
    }

    const effectiveMessage = message?.trim() || (mobileNetData ? `Analyze this scanned ${mobileNetData.primaryClass || "study object"}` : "Explain this image");

    if (!aiConfig) {
      return res.status(503).json({
        success: false,
        message: "AI chatbot is not configured. Add OPENROUTER_API_KEY to .env",
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
   - If the user introduces themselves with their name (e.g., "I am Roshan Pradhan", "My name is ..."), REMEMBER and respect their preferred name. When asked "What is my name?" or "Say my name?", reply with their preferred name from this conversation.
   - Maintain context across previous turns in the chat history.

2. Strict BODMAS / PEMDAS Order of Operations for Mathematics:
   - When solving any arithmetic, algebraic, or mathematical problem, you MUST strictly apply the standard BODMAS / PEMDAS order:
     * B / P: Brackets / Parentheses first
     * O / E: Orders / Exponents (powers, square roots)
     * D / M: Division and Multiplication (evaluated from left to right)
     * A / S: Addition and Subtraction (evaluated from left to right)
   - ALWAYS show clear, step-by-step arithmetic working out before presenting the final answer so the student understands how the result was derived.

3. Academic Assistance:
   - Clear academic doubts with simple, clear explanations, diagrams in markdown, and real-world examples.
   - Assist with syllabus, timetable, faculty, rooms, notices, exams, and notes using the campus context below when asked.
   - If campus-specific information is not available in the database, honestly state that it is not available.

4. Clean Response Format:
   - Do NOT include internal classifier tags, safety labels, or "User Safety: safe" in your response.
   - Provide direct, formatted Markdown answers.

Campus database context:
${campusContext}
`;

    let promptContent = effectiveMessage;
    if (mobileNetData) {
      promptContent = `[STUDENT VISUAL CAMERA SCAN (Powered by MobileNet-v2 Neural Vision)]:
Object Identified: ${mobileNetData.primaryClass || mobileNetData.label || "Academic Object"}
Category: ${mobileNetData.category || "Engineering & Science"}
Confidence: ${((mobileNetData.confidence || 0.95) * 100).toFixed(1)}%
Model: MobileNet-v2 (Depthwise Separable CNN, ~28ms Latency)

Student's Question:
"${effectiveMessage}"

Please provide a structured academic breakdown for the student:
1. Clear explanation of the scientific/engineering concepts.
2. Operating principles, circuit diagrams, or key equations.
3. Top 3 high-yield viva and university exam questions with answers.
4. Laboratory tips and practical study guidance.`;
    }

    // Format previous conversation turns if provided
    let conversationTurns = [];
    if (Array.isArray(history) && history.length > 0) {
      conversationTurns = history
        .filter((h) => h && (h.content || h.text))
        .map((h) => ({
          role: h.role === "assistant" ? "assistant" : "user",
          content: String(h.content || h.text).slice(0, 1500),
        }))
        .slice(-8); // Keep last 8 turns for conversational context
    }

    const messagesPayload = [
      { role: "system", content: systemPrompt },
      ...conversationTurns,
      { role: "user", content: promptContent },
    ];

    const modelsToTry = [
      aiConfig.model,
      "nvidia/nemotron-3.5-lightning:free",
      "openrouter/free",
    ];

    let reply = "";
    let lastError = null;

    for (const modelCandidate of [...new Set(modelsToTry)]) {
      try {
        const completion = await fetch(`${aiConfig.baseURL}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${aiConfig.apiKey}`,
            ...(aiConfig.headers?.["HTTP-Referer"]
              ? { "HTTP-Referer": aiConfig.headers["HTTP-Referer"] }
              : {}),
            ...(aiConfig.headers?.["X-Title"]
              ? { "X-Title": aiConfig.headers["X-Title"] }
              : {}),
          },
          body: JSON.stringify({
            model: modelCandidate,
            messages: messagesPayload,
            max_tokens: 850,
            temperature: 0.3,
          }),
        });

        if (!completion.ok) {
          console.warn(`OpenRouter model ${modelCandidate} returned HTTP ${completion.status}`);
          continue;
        }

        const data = await completion.json();
        let candidateReply = data?.choices?.[0]?.message?.content || "";

        // Strip thinking/reasoning prefixes if leaked into content
        if (candidateReply.includes("</think>")) {
          candidateReply = candidateReply.split("</think>").pop().trim();
        }
        if (candidateReply.startsWith("Here's a thinking process:") && candidateReply.includes(":")) {
          const parts = candidateReply.split("\n\n");
          if (parts.length > 1) {
            candidateReply = parts.slice(1).join("\n\n").trim();
          }
        }

        // If the reply is contaminated by a moderation classification leak (e.g. "User Safety: safe")
        if (
          candidateReply.toLowerCase().includes("user safety:") ||
          candidateReply.trim().toLowerCase() === "safe"
        ) {
          console.warn(`Model ${modelCandidate} output content-safety leak, trying next candidate...`);
          continue;
        }

        if (candidateReply.trim()) {
          reply = candidateReply.trim();
          break;
        }
      } catch (err) {
        lastError = err;
        console.warn(`Error trying model ${modelCandidate}:`, err.message);
      }
    }

    if (!reply) {
      reply = "Sorry, I could not generate an answer right now. Please try asking again in a moment.";
    }

    res.json({
      success: true,
      reply,
    });
  } catch (error) {
    console.error("AI ERROR:", error.message);

    res.json({
      success: true,
      reply: "I am having temporary trouble connecting to the AI language model. Please try asking your question again in a moment!",
    });
  }
};
