const { GoogleGenAI } = require("@google/genai");
const aiConfig = require("../config/ai");

const LANGUAGE_CODES = {
  English: "en",
  Hindi: "hi",
  Odia: "or",
  Telugu: "te",
  Bengali: "bn",
  Tamil: "ta",
  Kannada: "kn",
  Malayalam: "ml",
  Marathi: "mr",
  Gujarati: "gu",
  Punjabi: "pa",
  Urdu: "ur",
  Sanskrit: "sa",
  Spanish: "es",
  French: "fr",
  German: "de",
};

exports.translateText = async (req, res) => {
  try {
    const { text, from = "English", to = "Hindi" } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Text is required for translation",
      });
    }

    const sl = LANGUAGE_CODES[from] || "auto";
    const tl = LANGUAGE_CODES[to] || "en";

    // ============================================================
    // 1. FIRST ATTEMPT: GOOGLE TRANSLATE
    // ============================================================

    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(
        text.trim()
      )}`;

      const gtxResponse = await fetch(url);

      if (gtxResponse.ok) {
        const gtxData = await gtxResponse.json();

        if (Array.isArray(gtxData?.[0])) {
          const translation = gtxData[0]
            .map((item) => item[0])
            .join("");

          if (translation) {
            return res.json({
              success: true,
              translation,
              from,
              to,
            });
          }
        }
      }
    } catch (apiErr) {
      console.warn(
        "Direct translation failed, falling back to Gemini:",
        apiErr.message
      );
    }

    // ============================================================
    // 2. SECOND ATTEMPT: GOOGLE GEMINI
    // ============================================================

    if (aiConfig?.apiKey) {
      try {
        const ai = new GoogleGenAI({
          apiKey: aiConfig.apiKey,
        });

        const prompt = `
Translate the following text from ${from} to ${to}.

Rules:
- Return ONLY the translated text.
- Do not add explanations.
- Do not add quotation marks.
- Preserve the original meaning.
- Preserve names, numbers, formatting, and important technical terms.
- If the text is already in the target language, return it unchanged.

Text:
${text.trim()}
`;

        const response = await ai.models.generateContent({
          model: aiConfig.model || "gemini-2.5-flash",
          contents: prompt,
          config: {
            temperature: 0.2,
            maxOutputTokens: 500,
          },
        });

        const aiTranslation = response?.text?.trim();

        if (aiTranslation) {
          return res.json({
            success: true,
            translation: aiTranslation,
            from,
            to,
          });
        }
      } catch (aiErr) {
        console.warn("Gemini translation error:", aiErr.message);
      }
    }

    // ============================================================
    // 3. TRANSLATION FAILED
    // ============================================================

    return res.status(500).json({
      success: false,
      message: "Could not translate text. Please try again.",
    });
  } catch (error) {
    console.error("Translation Controller Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Translation failed",
    });
  }
};