import React, { useState } from "react";
import {
  Alert,
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
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase/config";
import HostelLayout from "../../components/hostel/HostelLayout";
import hostelDataService, { HostelRoom } from "../../services/hostelDataService";
import { notifyStudent } from "../../services/notificationService";

export default function AddResidentScreen() {
  const { width } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<"personal" | "academic" | "hostel">("personal");
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Tab 1: Personal Details
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [bloodGroup, setBloodGroup] = useState("O+");
  const [guardianName, setGuardianName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");

  // Tab 2: Academic Details
  const [studentId, setStudentId] = useState("");
  const [course, setCourse] = useState("B.Tech Computer Science");
  const [year, setYear] = useState("1st Year");
  const [semester, setSemester] = useState("Semester 1");

  // Tab 3: Hostel Details
  const availableRooms = hostelDataService
    .getRooms()
    .filter((r) => r.status === "Available");
  const [selectedRoomNo, setSelectedRoomNo] = useState(
    availableRooms.length > 0 ? availableRooms[0].roomNo : "103"
  );
  const [depositPaid, setDepositPaid] = useState("5000");

  const handleSubmit = async () => {
    if (!fullName.trim() || !phone.trim() || !selectedRoomNo.trim()) {
      Alert.alert("Required Fields", "Please provide Full Name, Phone, and select a Room.");
      return;
    }

    const cleanName = fullName.trim();
    const cleanId = studentId.trim() || `S-${Math.floor(100 + Math.random() * 900)}`;
    const cleanEmail = email.trim() || `${cleanName.toLowerCase().replace(/\s+/g, ".")}@campusly.edu`;
    const cleanPhone = phone.trim();
    const cleanEmergency = emergencyPhone.trim() || cleanPhone;

    // Add resident to service
    hostelDataService.addResident({
      name: cleanName,
      studentId: cleanId,
      roomNo: selectedRoomNo,
      phone: cleanPhone,
      email: cleanEmail,
      course: course,
      year: year,
      status: "Active",
      checkInDate: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      emergencyContact: cleanEmergency,
    });

    // Allocate room
    hostelDataService.allocateRoom(cleanName, selectedRoomNo);

    // Dual-write to Firestore 'users'
    try {
      await addDoc(collection(db, "users"), {
        fullName: cleanName,
        name: cleanName,
        email: cleanEmail,
        rollNo: cleanId,
        studentId: cleanId,
        roomNo: selectedRoomNo,
        phone: cleanPhone,
        course,
        department: course,
        year,
        semester,
        bloodGroup,
        guardianName,
        emergencyContact: cleanEmergency,
        role: "student",
        hostelStatus: "Enrolled",
        status: "active",
        depositPaid: Number(depositPaid) || 5000,
        createdAt: serverTimestamp(),
      });
    } catch (_) {}

    // Send direct notification
    try {
      await notifyStudent(
        cleanEmail || cleanPhone,
        "Hostel Enrollment Confirmed 🏨",
        `Welcome to Campusly Hostels! You are assigned to Room ${selectedRoomNo}.`
      );
    } catch (_) {}

    setActionNotice(`Resident ${cleanName} successfully registered to Room ${selectedRoomNo}!`);
    setTimeout(() => {
      router.push("/hostel-manager/residents");
    }, 1500);
  };

  return (
    <HostelLayout
      activeNav="students"
      pageTitle="Add New Resident"
      pageSubtitle="Register student details, assign room bed, and verify documentation"
      actionNotice={actionNotice}
      rightAction={
        <TouchableOpacity
          style={styles.backBtnTop}
          onPress={() => router.push("/hostel-manager/students")}
        >
          <Ionicons name="arrow-back" size={16} color="#FFFFFF" />
          <Text style={styles.backBtnTopText}>Student Roster</Text>
        </TouchableOpacity>
      }
    >
      {/* 3 Step Tabs */}
      <View style={styles.tabHeader}>
        {[
          { key: "personal", label: "1. Personal Info", icon: "person-outline" as const },
          { key: "academic", label: "2. Academic Info", icon: "school-outline" as const },
          { key: "hostel", label: "3. Hostel & Room", icon: "bed-outline" as const },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Ionicons
              name={tab.icon}
              size={16}
              color={activeTab === tab.key ? "#2563EB" : "#64748B"}
            />
            <Text
              style={[
                styles.tabButtonText,
                activeTab === tab.key && styles.tabButtonTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Form Card */}
      <View style={styles.formCard}>
        {/* TAB 1: Personal Details */}
        {activeTab === "personal" && (
          <View>
            <Text style={styles.sectionTitle}>Personal & Guardian Information</Text>
            <Text style={styles.sectionSubtitle}>
              Basic identification and contact particulars
            </Text>

            <View style={styles.grid2}>
              <View style={styles.fieldBox}>
                <Text style={styles.fieldLabel}>Full Name *</Text>
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="e.g. Yash Vardhan"
                  style={styles.fieldInput}
                />
              </View>

              <View style={styles.fieldBox}>
                <Text style={styles.fieldLabel}>Phone Number *</Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="e.g. 9876543210"
                  keyboardType="phone-pad"
                  style={styles.fieldInput}
                />
              </View>

              <View style={styles.fieldBox}>
                <Text style={styles.fieldLabel}>Email Address</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="e.g. yash@campusly.edu"
                  keyboardType="email-address"
                  style={styles.fieldInput}
                />
              </View>

              <View style={styles.fieldBox}>
                <Text style={styles.fieldLabel}>Blood Group</Text>
                <TextInput
                  value={bloodGroup}
                  onChangeText={setBloodGroup}
                  placeholder="e.g. B+, O+, AB+"
                  style={styles.fieldInput}
                />
              </View>

              <View style={styles.fieldBox}>
                <Text style={styles.fieldLabel}>Guardian / Parent Name</Text>
                <TextInput
                  value={guardianName}
                  onChangeText={setGuardianName}
                  placeholder="e.g. Suresh Vardhan"
                  style={styles.fieldInput}
                />
              </View>

              <View style={styles.fieldBox}>
                <Text style={styles.fieldLabel}>Emergency Contact Number</Text>
                <TextInput
                  value={emergencyPhone}
                  onChangeText={setEmergencyPhone}
                  placeholder="e.g. 9876543299"
                  keyboardType="phone-pad"
                  style={styles.fieldInput}
                />
              </View>
            </View>

            <View style={styles.btnRowRight}>
              <TouchableOpacity
                style={styles.primaryNextBtn}
                onPress={() => setActiveTab("academic")}
              >
                <Text style={styles.primaryNextBtnText}>Next: Academic Details</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* TAB 2: Academic Details */}
        {activeTab === "academic" && (
          <View>
            <Text style={styles.sectionTitle}>Academic Records</Text>
            <Text style={styles.sectionSubtitle}>
              Course enrollment, roll code, and academic batch
            </Text>

            <View style={styles.grid2}>
              <View style={styles.fieldBox}>
                <Text style={styles.fieldLabel}>Student / Roll ID</Text>
                <TextInput
                  value={studentId}
                  onChangeText={setStudentId}
                  placeholder="e.g. B010"
                  style={styles.fieldInput}
                />
              </View>

              <View style={styles.fieldBox}>
                <Text style={styles.fieldLabel}>Course / Department</Text>
                <TextInput
                  value={course}
                  onChangeText={setCourse}
                  placeholder="e.g. B.Tech Computer Science"
                  style={styles.fieldInput}
                />
              </View>

              <View style={styles.fieldBox}>
                <Text style={styles.fieldLabel}>Year of Study</Text>
                <TextInput
                  value={year}
                  onChangeText={setYear}
                  placeholder="e.g. 1st Year, 2nd Year"
                  style={styles.fieldInput}
                />
              </View>

              <View style={styles.fieldBox}>
                <Text style={styles.fieldLabel}>Semester</Text>
                <TextInput
                  value={semester}
                  onChangeText={setSemester}
                  placeholder="e.g. Semester 1"
                  style={styles.fieldInput}
                />
              </View>
            </View>

            <View style={styles.btnRowBetween}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => setActiveTab("personal")}
              >
                <Ionicons name="arrow-back" size={16} color="#64748B" />
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.primaryNextBtn}
                onPress={() => setActiveTab("hostel")}
              >
                <Text style={styles.primaryNextBtnText}>Next: Hostel & Room</Text>
                <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* TAB 3: Hostel Details */}
        {activeTab === "hostel" && (
          <View>
            <Text style={styles.sectionTitle}>Hostel Room Assignment</Text>
            <Text style={styles.sectionSubtitle}>
              Choose available room and security deposit
            </Text>

            <Text style={styles.fieldLabel}>Select Available Room *</Text>
            <View style={styles.roomSelectPillRow}>
              {availableRooms.length === 0 ? (
                <Text style={{ color: "#EF4444", fontSize: 13 }}>
                  No available rooms found. Please free up or add a room first.
                </Text>
              ) : (
                availableRooms.map((r) => (
                  <TouchableOpacity
                    key={r.id}
                    style={[
                      styles.roomPickPill,
                      selectedRoomNo === r.roomNo && styles.roomPickPillActive,
                    ]}
                    onPress={() => setSelectedRoomNo(r.roomNo)}
                  >
                    <Text
                      style={[
                        styles.roomPickText,
                        selectedRoomNo === r.roomNo && styles.roomPickTextActive,
                      ]}
                    >
                      Room {r.roomNo} ({r.type} - ₹{r.rent})
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>

            <View style={[styles.grid2, { marginTop: 16 }]}>
              <View style={styles.fieldBox}>
                <Text style={styles.fieldLabel}>Security Deposit / Rent Paid (₹)</Text>
                <TextInput
                  value={depositPaid}
                  onChangeText={setDepositPaid}
                  placeholder="5000"
                  keyboardType="numeric"
                  style={styles.fieldInput}
                />
              </View>

              <View style={styles.fieldBox}>
                <Text style={styles.fieldLabel}>Check-In Date</Text>
                <TextInput
                  value="Today"
                  editable={false}
                  style={[styles.fieldInput, { backgroundColor: "#F1F5F9" }]}
                />
              </View>
            </View>

            <View style={styles.btnRowBetween}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => setActiveTab("academic")}
              >
                <Ionicons name="arrow-back" size={16} color="#64748B" />
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.finalSubmitBtn}
                onPress={handleSubmit}
              >
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                <Text style={styles.finalSubmitBtnText}>Register & Allocate Room</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </HostelLayout>
  );
}

const styles = StyleSheet.create({
  backBtnTop: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  backBtnTopText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  tabHeader: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 20,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: "#EFF6FF",
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  tabButtonTextActive: {
    color: "#2563EB",
    fontWeight: "700",
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 20,
  },
  grid2: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  fieldBox: {
    width: "48%",
    minWidth: 260,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
  },
  fieldInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: "#0F172A",
  },
  roomSelectPillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 6,
  },
  roomPickPill: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  roomPickPillActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
  },
  roomPickText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
  },
  roomPickTextActive: {
    color: "#2563EB",
    fontWeight: "700",
  },
  btnRowRight: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 24,
  },
  btnRowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 24,
  },
  primaryNextBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  primaryNextBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  backBtnText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  finalSubmitBtn: {
    backgroundColor: "#10B981",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  finalSubmitBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});