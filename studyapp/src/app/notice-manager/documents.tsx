import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { useTheme } from "../../context/ThemeContext";
import {
  DocumentItem,
  createDocumentItem,
  subscribeToDocuments,
} from "../../services/noticeService";

export default function DocumentsScreen() {
  const { isDark } = useTheme();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToDocuments((items) => {
      setDocuments(items);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleUpload = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*", "application/msword"],
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets?.[0]) {
        const file = res.assets[0];
        const sizeMb = file.size ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : "1.2 MB";

        await createDocumentItem({
          title: file.name,
          category: "Official Documents",
          fileName: file.name,
          fileUrl: file.uri,
          fileSize: sizeMb,
          uploadedBy: "Anita Verma",
          date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        });

        Alert.alert("Uploaded", `"${file.name}" saved to institutional documents repository.`);
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not upload document.");
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
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
            <Ionicons name="arrow-back" size={22} color={textColor} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.screenTitle, { color: textColor }]}>📁 Documents</Text>
            <Text style={[styles.screenSubtitle, { color: subTextColor }]}>
              Institutional repository for academic & administrative files
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.uploadBtn} onPress={handleUpload}>
          <Ionicons name="cloud-upload" size={16} color="#FFFFFF" />
          <Text style={styles.uploadBtnText}>+ Upload Document</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.mainCard, { backgroundColor: cardBg, borderColor }]}>
          {loading ? (
            <ActivityIndicator size="small" color="#2563EB" style={{ marginVertical: 30 }} />
          ) : documents.length === 0 ? (
            <View style={{ padding: 40, alignItems: "center" }}>
              <Ionicons name="folder-open-outline" size={44} color="#94A3B8" />
              <Text style={{ fontSize: 16, fontWeight: "700", color: textColor, marginTop: 10 }}>
                No Documents Uploaded
              </Text>
              <Text style={{ fontSize: 13, color: subTextColor, marginTop: 4 }}>
                Upload official forms and guidelines using "+ Upload Document".
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {documents.map((d) => (
                <View
                  key={d.id}
                  style={[styles.docRow, { backgroundColor: isDark ? "#0F172A" : "#F8FAFC", borderColor }]}
                >
                  <View style={styles.iconBox}>
                    <Ionicons name="document-text" size={20} color="#2563EB" />
                  </View>

                  <View style={{ flex: 1, marginHorizontal: 12 }}>
                    <Text style={[styles.docTitle, { color: textColor }]}>{d.title}</Text>
                    <Text style={{ fontSize: 11, color: subTextColor, marginTop: 2 }}>
                      {d.category} • {d.fileSize} • {d.date}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.downloadBtn}
                    onPress={() => Alert.alert("Download", `Downloading "${d.title}"...`)}
                  >
                    <Ionicons name="download-outline" size={14} color="#2563EB" />
                    <Text style={styles.downloadBtnText}>Download</Text>
                  </TouchableOpacity>
                </View>
              ))}
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
  screenTitle: { fontSize: 20, fontWeight: "800" },
  screenSubtitle: { fontSize: 12, marginTop: 2 },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2563EB",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  uploadBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  mainCard: { borderRadius: 16, borderWidth: 1, padding: 20 },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 9,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  docTitle: { fontSize: 14, fontWeight: "700" },
  downloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  downloadBtnText: { fontSize: 12, fontWeight: "700", color: "#2563EB" },
});