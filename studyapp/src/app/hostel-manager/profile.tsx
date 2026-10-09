import React, { useState, useEffect } from "react";
import {
  Alert,
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
import NotificationBellModal from "../../components/NotificationBellModal";
import { parseNameAndRoleFromEmail } from "../../utils/userEmailParser";

export default function HostelProfileScreen() {
  const { width } = useWindowDimensions();

  const [name, setName] = useState("Rahul Sharma");
  const [role, setRole] = useState("Chief Warden & Hostel Manager");
  const [empId, setEmpId] = useState("HST-2023-009");
  const [email, setEmail] = useState("rahul.hostel@gmail.com");
  const [phone, setPhone] = useState("+91 98111 22334");
  const [office, setOffice] = useState("Hostel Block A, Ground Floor Warden Office");

  const [editModal, setEditModal] = useState(false);
  const [editPhone, setEditPhone] = useState(phone);
  const [editOffice, setEditOffice] = useState(office);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const parsed = parseNameAndRoleFromEmail(user.email);
    setName(user.displayName || parsed.fullName || "Rahul Sharma");
    setEmail(user.email || "rahul.hostel@gmail.com");

    const unsub = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          if (d.fullName || d.name) setName(d.fullName || d.name);
          if (d.email) setEmail(d.email);
          if (d.phone) setPhone(d.phone);
          if (d.office) setOffice(d.office);
          if (d.empId) setEmpId(d.empId);
        }
      },
      (err) => console.warn("Hostel manager profile listener:", err?.message)
    );

    return () => unsub();
  }, []);

  const handleSave = async () => {
    setPhone(editPhone);
    setOffice(editOffice);
    setEditModal(false);
    setToastMessage("Hostel warden profile updated successfully.");

    const user = auth.currentUser;
    if (user) {
      try {
        await setDoc(
          doc(db, "users", user.uid),
          {
            phone: editPhone,
            office: editOffice,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (e: any) {
        console.warn("Could not save hostel profile to Firestore:", e?.message);
      }
    }
    setTimeout(() => setToastMessage(null), 4000);
  };

  const initials =
    name
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .join("")
      .toUpperCase()
      .slice(0, 2) || "HM";

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/hostel-manager")}
          >
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </TouchableOpacity>
          <View>
            <Text style={styles.pageTitle}>Hostel Manager Profile</Text>
            <Text style={styles.pageSubtitle}>Campus Residence & Warden Credentials</Text>
          </View>
        </View>

        <View style={styles.topBarRight}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => {
              setEditPhone(phone);
              setEditOffice(office);
              setEditModal(true);
            }}
          >
            <Ionicons name="create-outline" size={16} color="#FFFFFF" />
            <Text style={styles.editBtnText}>Edit Details</Text>
          </TouchableOpacity>
          <NotificationBellModal />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {toastMessage && (
          <View style={styles.toastBanner}>
            <Ionicons name="checkmark-circle" size={20} color="#059669" />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        )}

        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 240 }}>
            <Text style={styles.heroName}>{name}</Text>
            <Text style={styles.heroRole}>{role}</Text>
            <Text style={styles.heroDept}>Hostel Administration & Student Residence</Text>

            <View style={styles.badgeRow}>
              <View style={styles.idBadge}>
                <Ionicons name="card-outline" size={14} color="#059669" />
                <Text style={styles.idBadgeText}>Emp ID: {empId}</Text>
              </View>
              <View style={styles.activeBadge}>
                <Ionicons name="shield-checkmark" size={14} color="#10B981" />
                <Text style={styles.activeBadgeText}>Active Warden</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Contact info card */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Residence Office Details</Text>

          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="mail-outline" size={18} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Unique Login ID / Email</Text>
              <Text style={styles.infoValue}>{email}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="call-outline" size={18} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Official Phone / Extension</Text>
              <Text style={styles.infoValue}>{phone}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="business-outline" size={18} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Office Location</Text>
              <Text style={styles.infoValue}>{office}</Text>
            </View>
          </View>
        </View>

        {/* Hostel Overview Card */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Hostel Capacity & Management</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>250</Text>
              <Text style={styles.statLabel}>Total Rooms</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>420</Text>
              <Text style={styles.statLabel}>Residents</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>18</Text>
              <Text style={styles.statLabel}>Active Passes</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={editModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile Information</Text>

            <Text style={styles.inputLabel}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={editPhone}
              onChangeText={setEditPhone}
              placeholder="e.g. +91 98111 22334"
            />

            <Text style={styles.inputLabel}>Office Location</Text>
            <TextInput
              style={styles.input}
              value={editOffice}
              onChangeText={setEditOffice}
              placeholder="e.g. Hostel Block A Office"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  pageSubtitle: {
    fontSize: 12,
    color: "#64748B",
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#059669",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  toastBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 10,
    padding: 12,
  },
  toastText: {
    color: "#065F46",
    fontSize: 14,
    fontWeight: "600",
  },
  heroCard: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  heroName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
  },
  heroRole: {
    fontSize: 14,
    fontWeight: "600",
    color: "#059669",
    marginTop: 2,
  },
  heroDept: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },
  idBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  idBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#059669",
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#065F46",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 14,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "600",
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  statNum: {
    fontSize: 20,
    fontWeight: "800",
    color: "#059669",
  },
  statLabel: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 22,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0F172A",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 14,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  cancelBtnText: {
    color: "#475569",
    fontWeight: "600",
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#059669",
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});