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
import { router } from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import {
  AnnouncementItem,
  createAnnouncement,
  subscribeToAnnouncements,
} from "../../services/noticeService";

export default function AnnouncementsScreen() {
  const { isDark } = useTheme();
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    const unsub = subscribeToAnnouncements((data) => {
      setAnnouncements(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert("Required", "Title and content are required.");
      return;
    }
    await createAnnouncement({
      title: title.trim(),
      content: content.trim(),
      category: "General",
      priority: "high",
      authorName: "Anita Verma",
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    });
    setTitle("");
    setContent("");
    setModalVisible(false);
    Alert.alert("Broadcasted", "Campus announcement broadcasted live.");
  };

  const bg = isDark ? "#0F172A" : "#F4F7FB";
  const cardBg = isDark ? "#1E293B" : "#FFFFFF";
  const textColor = isDark ? "#F8FAFC" : "#0F172A";
  const subTextColor = isDark ? "#94A3B8" : "#64748B";
  const borderColor = isDark ? "#334155" : "#E2E8F0";

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.topBar, { backgroundColor: cardBg, borderBottomColor: borderColor }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
            <Ionicons name="arrow-back" size={22} color={textColor} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.screenTitle, { color: textColor }]}>📣 Announcements</Text>
            <Text style={[styles.screenSubtitle, { color: subTextColor }]}>
              Urgent broadcasts and notices across campus displays
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.createBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={styles.createBtnText}>+ Create Announcement</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.mainCard, { backgroundColor: cardBg, borderColor }]}>
          {loading ? (
            <ActivityIndicator size="small" color="#2563EB" style={{ marginVertical: 30 }} />
          ) : announcements.length === 0 ? (
            <View style={{ padding: 40, alignItems: "center" }}>
              <Ionicons name="megaphone-outline" size={40} color="#94A3B8" />
              <Text style={{ fontSize: 16, fontWeight: "700", color: textColor, marginTop: 10 }}>
                No Active Announcements
              </Text>
              <Text style={{ fontSize: 13, color: subTextColor, marginTop: 4 }}>
                Broadcast a new announcement using "+ Create Announcement".
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {announcements.map((a) => (
                <View
                  key={a.id}
                  style={[styles.announcementRow, { backgroundColor: isDark ? "#0F172A" : "#F8FAFC", borderColor }]}
                >
                  <View style={styles.iconBox}>
                    <Ionicons name="megaphone" size={18} color="#2563EB" />
                  </View>
                  <View style={{ flex: 1, marginHorizontal: 12 }}>
                    <Text style={[styles.announcementTitle, { color: textColor }]}>{a.title}</Text>
                    <Text style={[styles.announcementBody, { color: subTextColor }]}>{a.content}</Text>
                    <Text style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>
                      By {a.authorName} • {a.date}
                    </Text>
                  </View>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Active</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Create Announcement Modal */}
      {modalVisible && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: cardBg, borderColor }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <Text style={[styles.screenTitle, { color: textColor }]}>New Announcement</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={subTextColor} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 12 }}>
              <View>
                <Text style={[styles.label, { color: textColor }]}>Title</Text>
                <TextInput
                  style={[styles.input, { color: textColor, backgroundColor: isDark ? "#0F172A" : "#F8FAFC", borderColor }]}
                  placeholder="Enter announcement title"
                  placeholderTextColor="#94A3B8"
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              <View>
                <Text style={[styles.label, { color: textColor }]}>Content</Text>
                <TextInput
                  style={[styles.input, { color: textColor, backgroundColor: isDark ? "#0F172A" : "#F8FAFC", borderColor, minHeight: 90 }]}
                  placeholder="Details for all college students..."
                  placeholderTextColor="#94A3B8"
                  value={content}
                  onChangeText={setContent}
                  multiline
                />
              </View>

              <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { flex: 1, backgroundColor: isDark ? "#334155" : "#F1F5F9" }]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={{ textAlign: "center", color: subTextColor, fontWeight: "600" }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.createBtn, { flex: 1, justifyContent: "center" }]}
                  onPress={handleCreate}
                >
                  <Text style={styles.createBtnText}>Broadcast</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}
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
  screenTitle: { fontSize: 20, fontWeight: "800" },
  screenSubtitle: { fontSize: 12, marginTop: 2 },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2563EB",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  mainCard: { borderRadius: 16, borderWidth: 1, padding: 20 },
  announcementRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  announcementTitle: { fontSize: 14, fontWeight: "700" },
  announcementBody: { fontSize: 13, marginTop: 4, lineHeight: 18 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: "#DCFCE7",
  },
  badgeText: { fontSize: 11, fontWeight: "700", color: "#15803D" },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    zIndex: 999,
  },
  modalCard: {
    width: "100%",
    maxWidth: 480,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  label: { fontSize: 13, fontWeight: "700", marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13 },
  cancelBtn: { paddingVertical: 10, borderRadius: 8 },
});