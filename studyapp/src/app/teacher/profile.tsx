import React, { useState, useEffect } from "react";
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { auth, db } from "../../firebase/config";
import { useAppTheme } from "../../context/ThemeContext";
import { parseNameAndRoleFromEmail } from "../../utils/userEmailParser";

export default function TeacherProfileScreen() {
  const { width } = useWindowDimensions();
  const { colors, isDark } = useAppTheme();

  const [name, setName] = useState("Dr. Rajesh Kumar");
  const [designation, setDesignation] = useState("Assistant Professor");
  const [department, setDepartment] = useState("Computer Science & Engineering");
  const [email, setEmail] = useState("rajesh.kumar@college.edu");
  const [phone, setPhone] = useState("+91 98765 43210");
  const [editModal, setEditModal] = useState(false);

  const [tempName, setTempName] = useState(name);
  const [tempPhone, setTempPhone] = useState(phone);
  const [tempDesignation, setTempDesignation] = useState(designation);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const parsed = parseNameAndRoleFromEmail(user.email);
    setName(user.displayName || parsed.fullName || "Dr. Rajesh Kumar");
    setEmail(user.email || "rajesh.kumar@college.edu");

    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.fullName || d.name) setName(d.fullName || d.name);
        if (d.phone) setPhone(d.phone);
        if (d.designation) setDesignation(d.designation);
        if (d.department) setDepartment(d.department);
      }
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    setName(tempName);
    setPhone(tempPhone);
    setDesignation(tempDesignation);
    setEditModal(false);

    const user = auth.currentUser;
    if (user) {
      try {
        await setDoc(
          doc(db, "users", user.uid),
          { fullName: tempName, phone: tempPhone, designation: tempDesignation },
          { merge: true }
        );
      } catch {}
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: isDark ? "#0B132B" : "#F4F7FC" }]}>
      {/* Top Header */}
      <View style={[styles.topBar, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", borderColor: colors.border }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TouchableOpacity onPress={() => router.push("/teacher")} style={{ padding: 4 }}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.pageTitle, { color: colors.text }]}>Profile</Text>
            <Text style={styles.pageSub}>Upload and manage your profile details</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.editBtn} onPress={() => setEditModal(true)}>
          <Ionicons name="pencil" size={13} color="#FFFFFF" />
          <Text style={styles.editBtnText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentPadding} showsVerticalScrollIndicator={false}>
        {/* Profile Card (Matching Screen 9 in Image 2) */}
        <View style={[styles.profileCard, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", borderColor: colors.border }]}>
          <View style={styles.avatarRow}>
            <Image
              source={{
                uri: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
              }}
              style={styles.avatarImg}
            />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[styles.profileName, { color: colors.text }]}>{name}</Text>
              <Text style={styles.profileDept}>Faculty - CSE</Text>
              <Text style={styles.profileDesignation}>{designation}</Text>
            </View>
          </View>

          {/* Details list */}
          <View style={[styles.detailsSection, { borderTopColor: isDark ? "#334155" : "#F1F5F9" }]}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Email</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{email}</Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Department</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{department}</Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Designation</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{designation}</Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Phone</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{phone}</Text>
            </View>
          </View>
        </View>

        {/* Teaching Statistics Section */}
        <View style={[styles.statsCard, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", borderColor: colors.border, marginTop: 12 }]}>
          <Text style={[styles.statsTitle, { color: colors.text }]}>Teaching Statistics</Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: "#2563EB" }]}>6</Text>
              <Text style={styles.statName}>Classes</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: "#059669" }]}>186</Text>
              <Text style={styles.statName}>Students</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: "#EA580C" }]}>5</Text>
              <Text style={styles.statName}>Assignments</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNum, { color: "#7C3AED" }]}>3</Text>
              <Text style={styles.statName}>Exams</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={editModal} transparent animationType="fade" onRequestClose={() => setEditModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF" }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setEditModal(false)}>
                <Ionicons name="close" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={[styles.inputField, { color: colors.text, borderColor: colors.border }]}
              value={tempName}
              onChangeText={setTempName}
            />

            <Text style={styles.inputLabel}>Designation</Text>
            <TextInput
              style={[styles.inputField, { color: colors.text, borderColor: colors.border }]}
              value={tempDesignation}
              onChangeText={setTempDesignation}
            />

            <Text style={styles.inputLabel}>Phone</Text>
            <TextInput
              style={[styles.inputField, { color: colors.text, borderColor: colors.border }]}
              value={tempPhone}
              onChangeText={setTempPhone}
            />

            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  pageTitle: { fontSize: 15, fontWeight: "900" },
  pageSub: { fontSize: 10, color: "#64748B" },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#2563EB",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  editBtnText: { fontSize: 11, fontWeight: "700", color: "#FFFFFF" },
  contentScroll: { flex: 1 },
  contentPadding: { padding: 12, paddingBottom: 30 },
  profileCard: { borderRadius: 10, borderWidth: 1, padding: 14 },
  avatarRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  avatarImg: { width: 56, height: 56, borderRadius: 28 },
  profileName: { fontSize: 15, fontWeight: "900" },
  profileDept: { fontSize: 11, color: "#2563EB", fontWeight: "700", marginTop: 2 },
  profileDesignation: { fontSize: 10.5, color: "#64748B", marginTop: 1 },
  detailsSection: { borderTopWidth: 1, paddingTop: 10, gap: 10 },
  detailItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  detailLabel: { fontSize: 10.5, color: "#64748B", fontWeight: "600" },
  detailValue: { fontSize: 11, fontWeight: "700" },
  statsCard: { borderRadius: 10, borderWidth: 1, padding: 12 },
  statsTitle: { fontSize: 12.5, fontWeight: "800", marginBottom: 10 },
  statsRow: { flexDirection: "row", justifyContent: "space-between" },
  statBox: { flex: 1, alignItems: "center", paddingVertical: 6 },
  statNum: { fontSize: 18, fontWeight: "900" },
  statName: { fontSize: 10, color: "#64748B", marginTop: 2 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 14 },
  modalCard: { width: "100%", maxWidth: 380, borderRadius: 10, padding: 12 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  modalTitle: { fontSize: 13, fontWeight: "800" },
  inputLabel: { fontSize: 10, fontWeight: "700", color: "#64748B", marginBottom: 3 },
  inputField: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5, fontSize: 11, marginBottom: 8 },
  cancelBtn: { paddingHorizontal: 10, paddingVertical: 5 },
  cancelBtnText: { fontSize: 11, color: "#64748B", fontWeight: "600" },
  saveBtn: { backgroundColor: "#2563EB", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6 },
  saveBtnText: { fontSize: 11, fontWeight: "700", color: "#FFFFFF" },
});