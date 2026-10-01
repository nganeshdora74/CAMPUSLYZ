import React from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface MarkdownViewProps {
  content: string;
  style?: object;
  baseTextColor?: string;
}

type Block =
  | { type: "h1" | "h2" | "h3" | "h4"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "blockquote"; text: string }
  | { type: "bullet"; text: string }
  | { type: "number"; index: string; text: string }
  | { type: "code"; code: string; language: string }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "hr" };

type InlineToken = {
  type: "text" | "bold" | "italic" | "bold_italic" | "code" | "link";
  text: string;
  url?: string;
};

// Inline tokenizer for bold, italic, inline code, and links
function parseInline(text: string): InlineToken[] {
  const regex =
    /(\*\*\*[\s\S]+?\*\*\*|\*\*[\s\S]+?\*\*|\*[^\s\*][\s\S]*?\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(regex);
  const tokens: InlineToken[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (!part) continue;

    if (part.startsWith("***") && part.endsWith("***") && part.length >= 6) {
      tokens.push({ type: "bold_italic", text: part.slice(3, -3) });
    } else if (
      part.startsWith("**") &&
      part.endsWith("**") &&
      part.length >= 4
    ) {
      tokens.push({ type: "bold", text: part.slice(2, -2) });
    } else if (
      part.startsWith("*") &&
      part.endsWith("*") &&
      part.length >= 2
    ) {
      tokens.push({ type: "italic", text: part.slice(1, -1) });
    } else if (
      part.startsWith("`") &&
      part.endsWith("`") &&
      part.length >= 2
    ) {
      tokens.push({ type: "code", text: part.slice(1, -1) });
    } else if (
      part.startsWith("[") &&
      part.includes("](") &&
      part.endsWith(")")
    ) {
      const match = part.match(/^\[(.*?)\]\((.*?)\)$/);
      if (match) {
        tokens.push({ type: "link", text: match[1], url: match[2] });
      } else {
        tokens.push({ type: "text", text: part });
      }
    } else {
      tokens.push({ type: "text", text: part });
    }
  }

  return tokens;
}

// Block parser for headers, lists, quotes, tables, code blocks
function parseBlocks(markdown: string): Block[] {
  const lines = markdown.split("\n");
  const blocks: Block[] = [];

  let inCodeBlock = false;
  let codeLines: string[] = [];
  let codeLanguage = "";

  let tableLines: string[] = [];

  const flushTable = () => {
    if (tableLines.length >= 2) {
      const headerLine = tableLines[0];
      const headers = headerLine
        .split("|")
        .map((h) => h.trim())
        .filter((h) => h.length > 0);

      const rows: string[][] = [];
      for (let r = 2; r < tableLines.length; r++) {
        const rowLine = tableLines[r];
        if (rowLine.includes("|")) {
          const cells = rowLine
            .split("|")
            .map((c) => c.trim())
            .filter((_, idx, arr) => idx > 0 && idx < arr.length - (rowLine.endsWith("|") ? 1 : 0));
          if (cells.length > 0) {
            rows.push(cells);
          }
        }
      }
      blocks.push({ type: "table", headers, rows });
    }
    tableLines = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fenced Code Blocks
    if (line.trim().startsWith("```")) {
      if (tableLines.length > 0) flushTable();

      if (inCodeBlock) {
        blocks.push({
          type: "code",
          code: codeLines.join("\n"),
          language: codeLanguage,
        });
        codeLines = [];
        codeLanguage = "";
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeLanguage = line.trim().slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    const trimmed = line.trim();

    // Table detection
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      tableLines.push(trimmed);
      continue;
    } else if (tableLines.length > 0) {
      flushTable();
    }

    if (!trimmed) {
      continue;
    }

    // Horizontal Rule
    if (/^(---|___|\*\*\*)$/.test(trimmed)) {
      blocks.push({ type: "hr" });
      continue;
    }

    // Headings
    if (trimmed.startsWith("#### ")) {
      blocks.push({ type: "h4", text: trimmed.slice(5) });
      continue;
    }
    if (trimmed.startsWith("### ")) {
      blocks.push({ type: "h3", text: trimmed.slice(4) });
      continue;
    }
    if (trimmed.startsWith("## ")) {
      blocks.push({ type: "h2", text: trimmed.slice(3) });
      continue;
    }
    if (trimmed.startsWith("# ")) {
      blocks.push({ type: "h1", text: trimmed.slice(2) });
      continue;
    }

    // Blockquote
    if (trimmed.startsWith("> ")) {
      blocks.push({ type: "blockquote", text: trimmed.slice(2).trim() });
      continue;
    }

    // Bullet list
    if (/^[-*•]\s+/.test(trimmed)) {
      blocks.push({
        type: "bullet",
        text: trimmed.replace(/^[-*•]\s+/, ""),
      });
      continue;
    }

    // Numbered list
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      blocks.push({
        type: "number",
        index: numMatch[1],
        text: numMatch[2],
      });
      continue;
    }

    // Regular Paragraph
    blocks.push({ type: "paragraph", text: trimmed });
  }

  if (tableLines.length > 0) {
    flushTable();
  }

  if (inCodeBlock && codeLines.length > 0) {
    blocks.push({
      type: "code",
      code: codeLines.join("\n"),
      language: codeLanguage,
    });
  }

  return blocks;
}

export default function MarkdownView({
  content,
  style,
  baseTextColor = "#1F2937",
}: MarkdownViewProps) {
  if (!content) {
    return null;
  }

  const blocks = parseBlocks(content);

  const renderInlineTokens = (
    text: string,
    extraStyle?: object,
    keyPrefix = ""
  ) => {
    const tokens = parseInline(text);

    return tokens.map((token, idx) => {
      const key = `${keyPrefix}-${idx}`;

      switch (token.type) {
        case "bold_italic":
          return (
            <Text
              key={key}
              style={[styles.boldText, styles.italicText, extraStyle]}
            >
              {token.text}
            </Text>
          );
        case "bold":
          return (
            <Text key={key} style={[styles.boldText, extraStyle]}>
              {token.text}
            </Text>
          );
        case "italic":
          return (
            <Text key={key} style={[styles.italicText, extraStyle]}>
              {token.text}
            </Text>
          );
        case "code":
          return (
            <Text key={key} style={styles.inlineCode}>
              {token.text}
            </Text>
          );
        case "link":
          return (
            <Text
              key={key}
              style={[styles.linkText, extraStyle]}
              onPress={() => {
                if (token.url) {
                  Linking.openURL(token.url).catch(() => {});
                }
              }}
            >
              {token.text}
            </Text>
          );
        default:
          return (
            <Text
              key={key}
              style={[{ color: baseTextColor }, styles.regularText, extraStyle]}
            >
              {token.text}
            </Text>
          );
      }
    });
  };

  return (
    <View style={[styles.container, style]}>
      {blocks.map((block, index) => {
        const blockKey = `block-${index}`;

        switch (block.type) {
          case "h1":
            return (
              <View key={blockKey} style={styles.h1Container}>
                <Text style={styles.h1Text}>
                  {renderInlineTokens(block.text, styles.h1Text, blockKey)}
                </Text>
              </View>
            );

          case "h2":
            return (
              <View key={blockKey} style={styles.h2Container}>
                <Text style={styles.h2Text}>
                  {renderInlineTokens(block.text, styles.h2Text, blockKey)}
                </Text>
              </View>
            );

          case "h3":
            return (
              <View key={blockKey} style={styles.h3Container}>
                <Text style={styles.h3Text}>
                  {renderInlineTokens(block.text, styles.h3Text, blockKey)}
                </Text>
              </View>
            );

          case "h4":
            return (
              <View key={blockKey} style={styles.h4Container}>
                <Text style={styles.h4Text}>
                  {renderInlineTokens(block.text, styles.h4Text, blockKey)}
                </Text>
              </View>
            );

          case "blockquote":
            return (
              <View key={blockKey} style={styles.blockquoteContainer}>
                <Text style={styles.blockquoteText}>
                  {renderInlineTokens(
                    block.text,
                    styles.blockquoteText,
                    blockKey
                  )}
                </Text>
              </View>
            );

          case "bullet":
            return (
              <View key={blockKey} style={styles.bulletRow}>
                <Text style={styles.bulletSymbol}>•</Text>
                <Text style={styles.listText}>
                  {renderInlineTokens(block.text, undefined, blockKey)}
                </Text>
              </View>
            );

          case "number":
            return (
              <View key={blockKey} style={styles.numberRow}>
                <Text style={styles.numberSymbol}>{block.index}.</Text>
                <Text style={styles.listText}>
                  {renderInlineTokens(block.text, undefined, blockKey)}
                </Text>
              </View>
            );

          case "code":
            return (
              <View key={blockKey} style={styles.codeBlockContainer}>
                {block.language ? (
                  <View style={styles.codeBlockHeader}>
                    <Text style={styles.codeBlockLang}>
                      {block.language.toUpperCase()}
                    </Text>
                  </View>
                ) : null}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.codeScrollContent}
                >
                  <Text style={styles.codeBlockText}>{block.code}</Text>
                </ScrollView>
              </View>
            );

          case "table":
            return (
              <ScrollView
                key={blockKey}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.tableScroll}
              >
                <View style={styles.tableContainer}>
                  {/* Table Header */}
                  <View style={styles.tableHeaderRow}>
                    {block.headers.map((h, hIdx) => (
                      <View key={`th-${hIdx}`} style={styles.tableHeaderCell}>
                        <Text style={styles.tableHeaderText}>{h}</Text>
                      </View>
                    ))}
                  </View>
                  {/* Table Rows */}
                  {block.rows.map((row, rIdx) => (
                    <View
                      key={`tr-${rIdx}`}
                      style={[
                        styles.tableRow,
                        rIdx % 2 === 1 && styles.tableRowAlt,
                      ]}
                    >
                      {row.map((cell, cIdx) => (
                        <View key={`td-${rIdx}-${cIdx}`} style={styles.tableCell}>
                          <Text style={styles.tableCellText}>
                            {renderInlineTokens(cell, undefined, `${blockKey}-${rIdx}-${cIdx}`)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              </ScrollView>
            );

          case "hr":
            return <View key={blockKey} style={styles.hr} />;

          case "paragraph":
          default:
            return (
              <View key={blockKey} style={styles.paragraphContainer}>
                <Text style={styles.paragraphText}>
                  {renderInlineTokens(block.text, undefined, blockKey)}
                </Text>
              </View>
            );
        }
      })}
    </View>
  );
}

const monoFont = Platform.select({
  ios: "Menlo",
  android: "monospace",
  default: "monospace",
});

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },

  regularText: {
    fontSize: 14.5,
    lineHeight: 22,
  },

  boldText: {
    fontWeight: "700",
    color: "#0F172A",
  },

  italicText: {
    fontStyle: "italic",
    color: "#334155",
  },

  inlineCode: {
    fontFamily: monoFont,
    fontSize: 13,
    color: "#5B45E6",
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: "hidden",
  },

  linkText: {
    color: "#2563EB",
    textDecorationLine: "underline",
    fontWeight: "500",
  },

  // Headings
  h1Container: {
    marginTop: 10,
    marginBottom: 6,
  },
  h1Text: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    lineHeight: 26,
  },

  h2Container: {
    marginTop: 8,
    marginBottom: 5,
  },
  h2Text: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1E293B",
    lineHeight: 23,
  },

  h3Container: {
    marginTop: 7,
    marginBottom: 4,
  },
  h3Text: {
    fontSize: 15.5,
    fontWeight: "700",
    color: "#334155",
    lineHeight: 21,
  },

  h4Container: {
    marginTop: 6,
    marginBottom: 3,
  },
  h4Text: {
    fontSize: 14.5,
    fontWeight: "600",
    color: "#475569",
    lineHeight: 20,
  },

  // Paragraph
  paragraphContainer: {
    marginVertical: 3,
  },
  paragraphText: {
    fontSize: 14.5,
    lineHeight: 22,
    color: "#1E293B",
  },

  // Blockquote
  blockquoteContainer: {
    borderLeftWidth: 3.5,
    borderLeftColor: "#5B5FEF",
    backgroundColor: "#F3F0FF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 6,
    borderRadius: 6,
  },
  blockquoteText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#475569",
    fontStyle: "italic",
  },

  // Lists
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginVertical: 2.5,
    paddingLeft: 4,
  },
  bulletSymbol: {
    color: "#5B5FEF",
    fontSize: 15,
    lineHeight: 22,
    marginRight: 8,
    fontWeight: "700",
  },

  numberRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginVertical: 2.5,
    paddingLeft: 4,
  },
  numberSymbol: {
    color: "#5B5FEF",
    fontSize: 13.5,
    lineHeight: 22,
    marginRight: 6,
    fontWeight: "700",
  },

  listText: {
    flex: 1,
    fontSize: 14.5,
    lineHeight: 22,
    color: "#1E293B",
  },

  // Code Block
  codeBlockContainer: {
    backgroundColor: "#0F172A",
    borderRadius: 8,
    marginVertical: 8,
    overflow: "hidden",
  },
  codeBlockHeader: {
    backgroundColor: "#1E293B",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  codeBlockLang: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  codeScrollContent: {
    padding: 12,
  },
  codeBlockText: {
    fontFamily: monoFont,
    color: "#F1F5F9",
    fontSize: 13,
    lineHeight: 19,
  },

  // Table
  tableScroll: {
    marginVertical: 8,
  },
  tableContainer: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 6,
    overflow: "hidden",
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderBottomWidth: 1,
    borderBottomColor: "#CBD5E1",
  },
  tableHeaderCell: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 100,
    borderRightWidth: 1,
    borderRightColor: "#E2E8F0",
  },
  tableHeaderText: {
    fontWeight: "700",
    fontSize: 13,
    color: "#0F172A",
  },
  tableRow: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  tableRowAlt: {
    backgroundColor: "#F8FAFC",
  },
  tableCell: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    minWidth: 100,
    borderRightWidth: 1,
    borderRightColor: "#E2E8F0",
  },
  tableCellText: {
    fontSize: 13.5,
    color: "#334155",
  },

  // Divider
  hr: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 10,
  },
});
