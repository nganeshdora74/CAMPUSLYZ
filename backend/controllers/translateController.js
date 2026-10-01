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

    // 1. First attempt: Fast Google Translate API
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(
        text.trim()
      )}`;
      const gtxResponse = await fetch(url);
      if (gtxResponse.ok) {
        const gtxData = await gtxResponse.json();
        if (Array.isArray(gtxData?.[0])) {
          const translation = gtxData[0].map((item) => item[0]).join("");
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
      console.warn("Direct translation failed, falling back to AI:", apiErr.message);
    }

    // 2. Second attempt: OpenRouter AI translation if configured
    if (aiConfig?.apiKey) {
      try {
        const prompt = `Translate the following text from ${from} to ${to}. Only return the translation, nothing else.\n\nText:\n${text.trim()}`;
        const completion = await fetch(`${aiConfig.baseURL}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${aiConfig.apiKey}`,
          },
          body: JSON.stringify({
            model: aiConfig.model,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.2,
            max_tokens: 300,
          }),
        });

        if (completion.ok) {
          const data = await completion.json();
          const aiTranslation = data?.choices?.[0]?.message?.content?.trim();
          if (aiTranslation) {
            return res.json({
              success: true,
              translation: aiTranslation,
              from,
              to,
            });
          }
        }
      } catch (aiErr) {
        console.warn("AI translation error:", aiErr.message);
      }
    }

    return res.status(500).json({
      success: false,
      message: "Could not translate text. Please try again.",
    });
  } catch (error) {
    console.error("Translation Controller Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Translation failed",
    });
  }
};
