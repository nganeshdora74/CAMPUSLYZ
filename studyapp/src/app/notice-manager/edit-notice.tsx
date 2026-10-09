import React, { useEffect, useState } from "react";
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
import { router, useLocalSearchParams } from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import {
  NoticeItem,
  subscribeToNotices,
  updateNotice,
} from "../../services/noticeService";

export default function EditNoticeScreen() {
  const { isDark } = useTheme();
  const params = useLocalSearchParams();
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [selectedNotice, setSelectedNotice] = useState<NoticeItem | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Academic");
  const [target, setTarget] = useState("All Students");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsub = subscribeToNotices((items) => {
      setNotices(items);
      if (items.length > 0) {
        const found = params.id ? items.find((i) => i.id === params.id) || items[0] : items[0];
        setSelectedNotice(found);
        setTitle(found.title);
        setContent(found.content);
        setCategory(found.category);
        setTarget(found.target);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [params.id]);

  const handleSelectNotice = (n: NoticeItem) => {
    setSelectedNotice(n);
    setTitle(n.title);
    setContent(n.content);
    setCategory(n.category);
    setTarget(n.target);
  };

  const handleUpdate = async () => {
    if (!selectedNotice) return;
    if (!title.trim() || !content.trim()) {
      Alert.alert("Required", "Title and description are required.");
      return;
    }

    try {
      setSubmitting(true);
      await updateNotice(selectedNotice.id, {
        title: title.trim(),
        content: content.trim(),
        category,
        target,
        mongoId: selectedNotice.mongoId,
      });

      Alert.alert("Notice Updated", `"${title}" successfully saved in Firebase & MongoDB.`, [
        { text: "OK", onPress: () => router.push("/notice-manager") },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to update notice.");
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
      <View style={[styles.topBar, { backgroundColor: cardBg, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={22} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.topBarTitle, { color: textColor }]}>Edit Notice</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          <Text style={[styles.cardTitle, { color: textColor }]}>Edit Notice</Text>

          {/* If multiple notices, show selector pill list */}
          {notices.length > 1 && (
            <View style={{ marginBottom: 16 }}>
              <Text style={[styles.label, { color: textColor }]}>Select Notice to Edit</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {notices.map((n) => (
                    <TouchableOpacity
                      key={n.id}
                      style={[
                        styles.chip,
                        selectedNotice?.id === n.id && styles.chipActive,
                      ]}
                      onPress={() => handleSelectNotice(n)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          selectedNotice?.id === n.id && styles.chipTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        {n.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {loading ? (
            <ActivityIndicator size="small" color="#2563EB" style={{ marginVertical: 40 }} />
          ) : !selectedNotice ? (
            <Text style={{ color: subTextColor, textAlign: "center", marginVertical: 30 }}>
              No notices available to edit.
            </Text>
          ) : (
            <View style={{ gap: 14 }}>
              <View>
                <Text style={[styles.label, { color: textColor }]}>Title *</Text>
                <TextInput
                  style={[styles.input, { color: textColor, backgroundColor: isDark ? "#0F172A" : "#F8FAFC", borderColor }]}
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              <View>
                <Text style={[styles.label, { color: textColor }]}>Description *</Text>
                <TextInput
                  style={[
                    styles.textArea,
                    { color: textColor, backgroundColor: isDark ? "#0F172A" : "#F8FAFC", borderColor },
                  ]}
                  value={content}
                  onChangeText={setContent}
                  multiline
                />
              </View>

              <View>
                <Text style={[styles.label, { color: textColor }]}>Category</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
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

              <View>
                <Text style={[styles.label, { color: textColor }]}>Target Audience</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {["All Students", "Hostel Students", "Faculty", "CSE"].map((t) => (
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

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]}
                  onPress={() => router.back()}
                >
                  <Text style={[styles.cancelBtnText, { color: textColor }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.updateBtn}
                  onPress={handleUpdate}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.updateBtnText}>Update</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topBarTitle: { fontSize: 18, fontWeight: "800" },
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
  cardTitle: { fontSize: 20, fontWeight: "800", marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "700", marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 120,
    textAlignVertical: "top",
    fontSize: 14,
  },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: "#F1F5F9" },
  chipActive: { backgroundColor: "#2563EB" },
  chipText: { fontSize: 12, fontWeight: "600", color: "#64748B" },
  chipTextActive: { color: "#FFFFFF", fontWeight: "700" },
  actionRow: { flexDirection: "row", gap: 12, marginTop: 14, justifyContent: "flex-end" },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  cancelBtnText: { fontSize: 13, fontWeight: "700" },
  updateBtn: { backgroundColor: "#2563EB", paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8 },
  updateBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
});