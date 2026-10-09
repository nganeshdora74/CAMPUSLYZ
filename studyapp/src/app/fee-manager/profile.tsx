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

export default function FeeManagerProfileScreen() {
  const { width } = useWindowDimensions();

  const [name, setName] = useState("Ritesh Sahu");
  const [role, setRole] = useState("Accounts Officer & Fees Manager");
  const [empId, setEmpId] = useState("FIN-2023-018");
  const [email, setEmail] = useState("ritesh.fee@gmail.com");
  const [phone, setPhone] = useState("+91 98450 12345");
  const [office, setOffice] = useState("Admin Block, Room G-04 (Fee Counter)");

  const [editModal, setEditModal] = useState(false);
  const [editPhone, setEditPhone] = useState(phone);
  const [editOffice, setEditOffice] = useState(office);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const parsed = parseNameAndRoleFromEmail(user.email);
    setName(user.displayName || parsed.fullName || "Ritesh Sahu");
    setEmail(user.email || "ritesh.fee@gmail.com");

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
      (err) => console.warn("Fee manager profile listener:", err?.message)
    );

    return () => unsub();
  }, []);

  const handleSave = async () => {
    setPhone(editPhone);
    setOffice(editOffice);
    setEditModal(false);
    setToastMessage("Officer profile updated successfully.");

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
        console.warn("Could not save fee manager profile to Firestore:", e?.message);
      }
    }
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/fee-manager")}
          >
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </TouchableOpacity>
          <View>
            <Text style={styles.pageTitle}>Finance Officer Profile</Text>
            <Text style={styles.pageSubtitle}>Institutional Credentials & Authorization</Text>
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
            <Text style={styles.avatarText}>
              {name.split(" ").map((w) => w[0]).filter(Boolean).join("").toUpperCase().slice(0, 2) || "FM"}
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: 240 }}>
            <Text style={styles.heroName}>{name}</Text>
            <Text style={styles.heroRole}>{role}</Text>
            <Text style={styles.heroDept}>Department of Finance & Student Billing</Text>

            <View style={styles.badgeRow}>
              <View style={styles.idBadge}>
                <Ionicons name="card-outline" size={14} color="#2563EB" />
                <Text style={styles.idBadgeText}>Emp ID: {empId}</Text>
              </View>
              <View style={styles.activeBadge}>
                <Ionicons name="shield-checkmark" size={14} color="#10B981" />
                <Text style={styles.activeBadgeText}>Authorized Signatory</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Contact info card */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Office Contact Details</Text>

          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="mail-outline" size={18} color="#2563EB" />
            </View>
            <View>
              <Text style={styles.infoLabel}>Official Email</Text>
              <Text style={styles.infoVal}>{email}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="call-outline" size={18} color="#10B981" />
            </View>
            <View>
              <Text style={styles.infoLabel}>Desk / Phone</Text>
              <Text style={styles.infoVal}>{phone}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="location-outline" size={18} color="#F59E0B" />
            </View>
            <View>
              <Text style={styles.infoLabel}>Counter Location</Text>
              <Text style={styles.infoVal}>{office}</Text>
            </View>
          </View>
        </View>

        {/* Access Rights */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Role Privileges & Access Scope</Text>

          <View style={styles.privilegeList}>
            {[
              "Collect fees and post real-time ledger entries",
              "Generate institutional GST receipts with electronic stamps",
              "Broadcast dues notifications to students and parents",
              "Issue formal defaulter notices and fine levies",
              "Export bank reconciliation sheets and semester audits",
            ].map((p, i) => (
              <View key={i} style={styles.pRow}>
                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                <Text style={styles.pText}>{p}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editModal}
        transparent
        animationType="fade"
        onRequestClose={() => setEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile Contact</Text>
              <TouchableOpacity onPress={() => setEditModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Phone Number</Text>
              <TextInput
                style={styles.formInput}
                value={editPhone}
                onChangeText={setEditPhone}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Office Location</Text>
              <TextInput
                style={styles.formInput}
                value={editOffice}
                onChangeText={setEditOffice}
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditModal(false)}
              >
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
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topBar: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
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
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#0A1E3F",
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  scrollContent: {
    padding: 20,
    maxWidth: 800,
    width: "100%",
    alignSelf: "center",
    gap: 16,
  },
  toastBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    padding: 12,
    borderRadius: 8,
    gap: 10,
  },
  toastText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#065F46",
  },
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 18,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#0A1E3F",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  heroName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
  },
  heroRole: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563EB",
    marginTop: 2,
  },
  heroDept: {
    fontSize: 12,
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
    gap: 5,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  idBadgeText: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "600",
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeBadgeText: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  infoVal: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
    marginTop: 1,
  },
  privilegeList: {
    gap: 10,
  },
  pRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pText: {
    fontSize: 13,
    color: "#334155",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: "100%",
    maxWidth: 440,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  formGroup: {
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 4,
  },
  formInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: "#0F172A",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  cancelBtnText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  saveBtn: {
    backgroundColor: "#0A1E3F",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveBtnText: {
    fontSize: 13,
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
