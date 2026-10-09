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
  CircularItem,
  createCircular,
  subscribeToCirculars,
} from "../../services/noticeService";

export default function CircularsScreen() {
  const { isDark } = useTheme();
  const [circulars, setCirculars] = useState<CircularItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [dept, setDept] = useState("Academic Administration");

  useEffect(() => {
    const unsub = subscribeToCirculars((items) => {
      setCirculars(items);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleCreate = async () => {
    if (!title.trim()) return Alert.alert("Required", "Title is required.");
    await createCircular({
      title: title.trim(),
      circularNo: `CIR-2026-${Math.floor(100 + Math.random() * 900)}`,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      category: "Academic",
      department: dept.trim() || "Academic Administration",
    });
    setTitle("");
    setModalVisible(false);
    Alert.alert("Circular Issued", "Official circular released.");
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
            <Text style={[styles.screenTitle, { color: textColor }]}>📄 Circulars</Text>
            <Text style={[styles.screenSubtitle, { color: subTextColor }]}>
              Official gazettes, notifications and institutional orders
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.createBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={styles.createBtnText}>+ Issue Circular</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.mainCard, { backgroundColor: cardBg, borderColor }]}>
          {loading ? (
            <ActivityIndicator size="small" color="#2563EB" style={{ marginVertical: 30 }} />
          ) : circulars.length === 0 ? (
            <View style={{ padding: 40, alignItems: "center" }}>
              <Ionicons name="document-text-outline" size={40} color="#94A3B8" />
              <Text style={{ fontSize: 16, fontWeight: "700", color: textColor, marginTop: 10 }}>
                No Circulars Found
              </Text>
              <Text style={{ fontSize: 13, color: subTextColor, marginTop: 4 }}>
                Issue a circular using "+ Issue Circular".
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {circulars.map((c) => (
                <View
                  key={c.id}
                  style={[styles.circularRow, { backgroundColor: isDark ? "#0F172A" : "#F8FAFC", borderColor }]}
                >
                  <View style={styles.iconBox}>
                    <Ionicons name="document-text" size={18} color="#2563EB" />
                  </View>
                  <View style={{ flex: 1, marginHorizontal: 12 }}>
                    <Text style={[styles.circularTitle, { color: textColor }]}>{c.title}</Text>
                    <Text style={{ fontSize: 11, color: subTextColor, marginTop: 2 }}>
                      Ref: {c.circularNo} • {c.department} • {c.date}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.viewBtn}
                    onPress={() => Alert.alert("Circular Details", `${c.title}\nRef: ${c.circularNo}`)}
                  >
                    <Ionicons name="eye-outline" size={14} color="#2563EB" />
                    <Text style={styles.viewBtnText}>View</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal */}
      {modalVisible && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: cardBg, borderColor }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <Text style={[styles.screenTitle, { color: textColor }]}>Issue Circular</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={subTextColor} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 12 }}>
              <View>
                <Text style={[styles.label, { color: textColor }]}>Title</Text>
                <TextInput
                  style={[styles.input, { color: textColor, backgroundColor: isDark ? "#0F172A" : "#F8FAFC", borderColor }]}
                  placeholder="e.g. End Semester Exam Guidelines 2026"
                  placeholderTextColor="#94A3B8"
                  value={title}
                  onChangeText={setTitle}
                />
              </View>

              <View>
                <Text style={[styles.label, { color: textColor }]}>Issuing Department</Text>
                <TextInput
                  style={[styles.input, { color: textColor, backgroundColor: isDark ? "#0F172A" : "#F8FAFC", borderColor }]}
                  value={dept}
                  onChangeText={setDept}
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
                  <Text style={styles.createBtnText}>Issue</Text>
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
  circularRow: {
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
  circularTitle: { fontSize: 14, fontWeight: "700" },
  viewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  viewBtnText: { fontSize: 11, fontWeight: "700", color: "#2563EB" },
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