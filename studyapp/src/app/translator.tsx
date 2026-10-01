import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Language = {
  name: string;
  code: string;
};

const LANGUAGES: Language[] = [
  { name: "English", code: "en" },
  { name: "Hindi", code: "hi" },
  { name: "Odia", code: "or" },
  { name: "Telugu", code: "te" },
  { name: "Bengali", code: "bn" },
  { name: "Tamil", code: "ta" },
  { name: "Kannada", code: "kn" },
  { name: "Malayalam", code: "ml" },
  { name: "Marathi", code: "mr" },
  { name: "Gujarati", code: "gu" },
];

export default function TranslatorScreen() {
  const [text, setText] = useState("");
  const [result, setResult] = useState("");

  const [fromLanguage, setFromLanguage] = useState<Language>(
    LANGUAGES[0]
  );

  const [toLanguage, setToLanguage] = useState<Language>(
    LANGUAGES[1]
  );

  const [loading, setLoading] = useState(false);

  const [showFromLanguages, setShowFromLanguages] = useState(false);
  const [showToLanguages, setShowToLanguages] = useState(false);

  /**
   * Translate the entered sentence.
   */
  const translateText = async () => {
    const sentence = text.trim();

    if (!sentence) {
      Alert.alert(
        "Enter a sentence",
        "Please type something before translating."
      );
      return;
    }

    if (fromLanguage.code === toLanguage.code) {
      setResult(sentence);
      return;
    }

    setLoading(true);
    setResult("");

    try {
      const url =
        "https://api.mymemory.translated.net/get" +
        `?q=${encodeURIComponent(sentence)}` +
        `&langpair=${fromLanguage.code}|${toLanguage.code}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          `Translation server returned ${response.status}`
        );
      }

      const data = await response.json();

      const translatedText =
        data?.responseData?.translatedText;

      if (
        typeof translatedText !== "string" ||
        !translatedText.trim()
      ) {
        throw new Error("No translation was returned.");
      }

      setResult(translatedText.trim());
    } catch (error) {
      console.error("Translation error:", error);

      Alert.alert(
        "Translation failed",
        "We couldn't translate your sentence. Please check your internet connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Swap source and target languages.
   */
  const swapLanguages = () => {
    const oldFrom = fromLanguage;

    setFromLanguage(toLanguage);
    setToLanguage(oldFrom);

    // Also swap the visible text and result.
    if (result) {
      setText(result);
      setResult("");
    }
  };

  /**
   * Clear everything.
   */
  const clearAll = () => {
    setText("");
    setResult("");
  };

  /**
   * Copy translated text.
   */
  const copyResult = async () => {
    if (!result) return;

    try {
      await Clipboard.setString(result);

      Alert.alert(
        "Copied",
        "Translation copied to clipboard."
      );
    } catch (error) {
      Alert.alert(
        "Error",
        "Could not copy the translation."
      );
    }
  };

  /**
   * Select source language.
   */
  const selectFromLanguage = (language: Language) => {
    setFromLanguage(language);
    setShowFromLanguages(false);

    if (language.code === toLanguage.code) {
      const replacement = LANGUAGES.find(
        (item) => item.code !== language.code
      );

      if (replacement) {
        setToLanguage(replacement);
      }
    }
  };

  /**
   * Select target language.
   */
  const selectToLanguage = (language: Language) => {
    setToLanguage(language);
    setShowToLanguages(false);

    if (language.code === fromLanguage.code) {
      const replacement = LANGUAGES.find(
        (item) => item.code !== language.code
      );

      if (replacement) {
        setFromLanguage(replacement);
      }
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Translator</Text>

          <Text style={styles.subtitle}>
            Translate sentences quickly
          </Text>
        </View>

        <View style={styles.headerIcon}>
          <Ionicons
            name="language"
            size={26}
            color="#4B2E91"
          />
        </View>
      </View>

      {/* Language selection */}
      <View style={styles.languageSection}>
        {/* From */}
        <View style={styles.languageColumn}>
          <Text style={styles.languageLabel}>FROM</Text>

          <TouchableOpacity
            style={styles.languageButton}
            activeOpacity={0.8}
            onPress={() =>
              setShowFromLanguages(!showFromLanguages)
            }
          >
            <Text style={styles.languageButtonText}>
              {fromLanguage.name}
            </Text>

            <Ionicons
              name={
                showFromLanguages
                  ? "chevron-up"
                  : "chevron-down"
              }
              size={18}
              color="#4B2E91"
            />
          </TouchableOpacity>

          {showFromLanguages && (
            <View style={styles.dropdown}>
              {LANGUAGES.map((language) => (
                <TouchableOpacity
                  key={language.code}
                  style={[
                    styles.dropdownItem,
                    language.code === fromLanguage.code &&
                      styles.selectedItem,
                  ]}
                  onPress={() =>
                    selectFromLanguage(language)
                  }
                >
                  <Text
                    style={[
                      styles.dropdownText,
                      language.code ===
                        fromLanguage.code &&
                        styles.selectedText,
                    ]}
                  >
                    {language.name}
                  </Text>

                  {language.code ===
                    fromLanguage.code && (
                    <Ionicons
                      name="checkmark"
                      size={18}
                      color="#4B2E91"
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Swap */}
        <TouchableOpacity
          style={styles.swapButton}
          onPress={swapLanguages}
          activeOpacity={0.7}
        >
          <Ionicons
            name="swap-horizontal"
            size={23}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        {/* To */}
        <View style={styles.languageColumn}>
          <Text style={styles.languageLabel}>TO</Text>

          <TouchableOpacity
            style={styles.languageButton}
            activeOpacity={0.8}
            onPress={() =>
              setShowToLanguages(!showToLanguages)
            }
          >
            <Text style={styles.languageButtonText}>
              {toLanguage.name}
            </Text>

            <Ionicons
              name={
                showToLanguages
                  ? "chevron-up"
                  : "chevron-down"
              }
              size={18}
              color="#4B2E91"
            />
          </TouchableOpacity>

          {showToLanguages && (
            <View style={styles.dropdown}>
              {LANGUAGES.map((language) => (
                <TouchableOpacity
                  key={language.code}
                  style={[
                    styles.dropdownItem,
                    language.code === toLanguage.code &&
                      styles.selectedItem,
                  ]}
                  onPress={() =>
                    selectToLanguage(language)
                  }
                >
                  <Text
                    style={[
                      styles.dropdownText,
                      language.code === toLanguage.code &&
                        styles.selectedText,
                    ]}
                  >
                    {language.name}
                  </Text>

                  {language.code === toLanguage.code && (
                    <Ionicons
                      name="checkmark"
                      size={18}
                      color="#4B2E91"
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Input */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>
            Enter sentence
          </Text>

          {text.length > 0 && (
            <TouchableOpacity onPress={() => setText("")}>
              <Ionicons
                name="close-circle"
                size={21}
                color="#999"
              />
            </TouchableOpacity>
          )}
        </View>

        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder="Type or paste your sentence here..."
          placeholderTextColor="#A3A0AA"
          multiline
          textAlignVertical="top"
          maxLength={5000}
        />

        <Text style={styles.characterCount}>
          {text.length}/5000
        </Text>
      </View>

      {/* Translate button */}
      <TouchableOpacity
        style={[
          styles.translateButton,
          loading && styles.translateButtonDisabled,
        ]}
        onPress={translateText}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <>
            <ActivityIndicator
              size="small"
              color="#FFFFFF"
            />

            <Text style={styles.translateButtonText}>
              Translating...
            </Text>
          </>
        ) : (
          <>
            <Ionicons
              name="language-outline"
              size={21}
              color="#FFFFFF"
            />

            <Text style={styles.translateButtonText}>
              Translate
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Result */}
      <View style={styles.resultCard}>
        <View style={styles.resultHeader}>
          <View style={styles.resultTitleRow}>
            <View style={styles.resultIcon}>
              <Ionicons
                name="checkmark"
                size={16}
                color="#FFFFFF"
              />
            </View>

            <Text style={styles.resultTitle}>
              Translation
            </Text>
          </View>

          {result.length > 0 && (
            <TouchableOpacity
              onPress={copyResult}
              style={styles.copyButton}
            >
              <Ionicons
                name="copy-outline"
                size={19}
                color="#4B2E91"
              />

              <Text style={styles.copyText}>Copy</Text>
            </TouchableOpacity>
          )}
        </View>

        {result ? (
          <Text style={styles.resultText}>{result}</Text>
        ) : (
          <View style={styles.emptyResult}>
            <Ionicons
              name="chatbox-ellipses-outline"
              size={32}
              color="#B9B2C8"
            />

            <Text style={styles.emptyResultText}>
              Your translation will appear here
            </Text>
          </View>
        )}
      </View>

      {/* Clear */}
      {(text.length > 0 || result.length > 0) && (
        <TouchableOpacity
          style={styles.clearButton}
          onPress={clearAll}
        >
          <Ionicons
            name="trash-outline"
            size={18}
            color="#777"
          />

          <Text style={styles.clearText}>
            Clear
          </Text>
        </TouchableOpacity>
      )}

      {/* Supported languages */}
      <Text style={styles.supportedTitle}>
        Supported languages
      </Text>

      <View style={styles.chips}>
        {LANGUAGES.map((language) => (
          <View
            key={language.code}
            style={styles.chip}
          >
            <Text style={styles.chipText}>
              {language.name}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F7FC",
  },

  content: {
    padding: 20,
    paddingBottom: 45,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },

  title: {
    fontSize: 30,
    fontWeight: "900",
    color: "#292052",
  },

  subtitle: {
    fontSize: 14,
    color: "#77727F",
    marginTop: 4,
  },

  headerIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: "#EEEAFB",
    justifyContent: "center",
    alignItems: "center",
  },

  languageSection: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 20,
  },

  languageColumn: {
    flex: 1,
    zIndex: 10,
  },

  languageLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#77727F",
    marginBottom: 7,
    letterSpacing: 0.5,
  },

  languageButton: {
    minHeight: 48,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E1ED",
    borderRadius: 14,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  languageButtonText: {
    color: "#292052",
    fontSize: 14,
    fontWeight: "700",
  },

  swapButton: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: "#4B2E91",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 3,
  },

  dropdown: {
    position: "absolute",
    top: 75,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E1ED",
    overflow: "hidden",
    zIndex: 100,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },

  dropdownItem: {
    minHeight: 43,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  selectedItem: {
    backgroundColor: "#F0ECFB",
  },

  dropdownText: {
    color: "#55515D",
    fontSize: 14,
  },

  selectedText: {
    color: "#4B2E91",
    fontWeight: "800",
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E7E3EF",
    padding: 15,
    marginBottom: 13,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  cardTitle: {
    color: "#292052",
    fontSize: 14,
    fontWeight: "800",
  },

  input: {
    minHeight: 145,
    color: "#292052",
    fontSize: 16,
    lineHeight: 25,
    padding: 0,
  },

  characterCount: {
    color: "#AAA5B0",
    fontSize: 11,
    textAlign: "right",
  },

  translateButton: {
    height: 54,
    borderRadius: 16,
    backgroundColor: "#4B2E91",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 9,
    marginBottom: 18,
  },

  translateButtonDisabled: {
    opacity: 0.7,
  },

  translateButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  resultCard: {
    backgroundColor: "#EEEAFB",
    borderRadius: 18,
    padding: 16,
    minHeight: 145,
  },

  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  resultTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  resultIcon: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: "#4B2E91",
    justifyContent: "center",
    alignItems: "center",
  },

  resultTitle: {
    color: "#292052",
    fontSize: 14,
    fontWeight: "800",
  },

  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    padding: 5,
  },

  copyText: {
    color: "#4B2E91",
    fontSize: 12,
    fontWeight: "700",
  },

  resultText: {
    color: "#292052",
    fontSize: 18,
    lineHeight: 29,
    marginTop: 18,
  },

  emptyResult: {
    flex: 1,
    minHeight: 95,
    justifyContent: "center",
    alignItems: "center",
  },

  emptyResultText: {
    color: "#9B96A4",
    fontSize: 13,
    marginTop: 8,
  },

  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 14,
  },

  clearText: {
    color: "#77727F",
    fontSize: 13,
    fontWeight: "700",
  },

  supportedTitle: {
    color: "#292052",
    fontSize: 17,
    fontWeight: "800",
    marginTop: 25,
    marginBottom: 12,
  },

  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  chip: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7E3EF",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  chipText: {
    color: "#4B2E91",
    fontSize: 12,
    fontWeight: "700",
  },
});
