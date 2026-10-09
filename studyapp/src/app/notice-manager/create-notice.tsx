import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { useTheme } from "../../context/ThemeContext";
import { createNotice } from "../../services/noticeService";

export default function CreateNoticeScreen() {
  const { isDark } = useTheme();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Academic");
  const [target, setTarget] = useState("All Students");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [attachmentName, setAttachmentName] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handlePickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets?.[0]) {
        setAttachmentName(res.assets[0].name);
        setAttachmentUrl(res.assets[0].uri);
      }
    } catch (e: any) {
      Alert.alert("File Error", e?.message || "Could not select file.");
    }
  };

  const handleSubmit = async (status: "published" | "draft") => {
    if (!title.trim()) {
      Alert.alert("Notice Title Required", "Please enter a title for the notice.");
      return;
    }
    if (!description.trim()) {
      Alert.alert("Notice Description Required", "Please write the notice content.");
      return;
    }

    try {
      setSubmitting(true);
      await createNotice({
        title: title.trim(),
        content: description.trim(),
        category,
        priority,
        authorName: "Anita Verma",
        authorRole: "Notice Manager",
        target,
        attachmentName: attachmentName || undefined,
        attachmentUrl: attachmentUrl || undefined,
        status,
        date: new Date().toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
      });

      Alert.alert(
        status === "published" ? "Notice Published! 📢" : "Draft Saved 📝",
        `Notice "${title}" has been ${status === "published" ? "broadcasted across all student apps in Firebase & MongoDB." : "saved to your drafts."}`,
        [{ text: "OK", onPress: () => router.push("/notice-manager") }]
      );
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Could not save notice.");
    } finally {
      setSubmitting(false);
    }
  };

  const bg = isDark ? "#0F172A" : "#F4F7FB";
  const cardBg = isDark ? "#1E293B" : "#FFFFFF";
  const textColor = isDark ? "#F8FAFC" : "#0F172A";
  const subTextColor = isDark ? "#94A3B8" : "#64748B";
  const borderColor = isDark ? "#334155" : "#E2E8F0";

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Top Header */}
      <View style={[styles.topBar, { backgroundColor: cardBg, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={22} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: textColor }]}>Create Notice</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.cardTitle, { color: textColor }]}>Create Notice</Text>

          {/* Title */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: textColor }]}>Title *</Text>
            <TextInput
              style={[styles.input, { color: textColor, backgroundColor: isDark ? "#0F172A" : "#F8FAFC", borderColor }]}
              placeholder="Enter notice title"
              placeholderTextColor="#94A3B8"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Description */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: textColor }]}>Description *</Text>

            {/* Rich Text Toolbar Mockup matching Screenshot */}
            <View style={[styles.toolbar, { borderColor }]}>
              <TouchableOpacity style={styles.toolBtn}>
                <Ionicons name="text" size={14} color={subTextColor} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolBtn}>
                <Text style={{ fontWeight: "800", fontSize: 13, color: subTextColor }}>B</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolBtn}>
                <Text style={{ fontStyle: "italic", fontSize: 13, color: subTextColor }}>I</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolBtn}>
                <Ionicons name="list" size={14} color={subTextColor} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolBtn}>
                <Ionicons name="link" size={14} color={subTextColor} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.toolBtn}>
                <Ionicons name="code-slash" size={14} color={subTextColor} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[
                styles.textArea,
                { color: textColor, backgroundColor: isDark ? "#0F172A" : "#F8FAFC", borderColor },
              ]}
              placeholder="Write your notice here..."
              placeholderTextColor="#94A3B8"
              value={description}
              onChangeText={setDescription}
              multiline
            />
          </View>

          {/* Category */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: textColor }]}>Category</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
              {["Academic", "Examination", "Hostel", "Events", "General"].map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.chip, category === c && styles.chipActive]}
                  onPress={() => setCategory(c)}
                >
                  <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Target Audience */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: textColor }]}>Target Audience</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
              {["All Students", "Hostel Students", "Faculty", "CSE", "ECE"].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.chip, target === t && styles.chipActive]}
                  onPress={() => setTarget(t)}
                >
                  <Text style={[styles.chipText, target === t && styles.chipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Attachment */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: textColor }]}>Attachment (Optional)</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 }}>
              <TouchableOpacity style={styles.chooseFileBtn} onPress={handlePickDocument}>
                <Ionicons name="attach" size={16} color="#475569" />
                <Text style={styles.chooseFileText}>Choose File</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 13, color: subTextColor, flex: 1 }} numberOfLines={1}>
                {attachmentName ? attachmentName : "No file chosen"}
              </Text>
            </View>
          </View>

          {/* Action Buttons Row */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.draftBtn, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]}
              onPress={() => handleSubmit("draft")}
              disabled={submitting}
            >
              <Text style={[styles.draftBtnText, { color: textColor }]}>Save as Draft</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.publishBtn}
              onPress={() => handleSubmit("published")}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.publishBtnText}>Publish</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  card: {
    maxWidth: 620,
    width: "100%",
    alignSelf: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  toolbar: {
    flexDirection: "row",
    borderWidth: 1,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 12,
  },
  toolBtn: {
    padding: 4,
  },
  textArea: {
    borderWidth: 1,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 120,
    textAlignVertical: "top",
    fontSize: 14,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  chipActive: {
    backgroundColor: "#2563EB",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  chipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  chooseFileBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  chooseFileText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
    justifyContent: "flex-end",
  },
  draftBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  draftBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  publishBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 8,
  },
  publishBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
});