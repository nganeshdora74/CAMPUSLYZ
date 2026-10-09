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
import HostelLayout from "../../components/hostel/HostelLayout";
import hostelDataService, {
  HostelRoom,
  HostelResident,
} from "../../services/hostelDataService";

export default function RoomAllocationScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Available Rooms
  const availableRooms = hostelDataService
    .getRooms()
    .filter((r) => r.status === "Available");

  // Existing residents to pick or custom student
  const [existingResidents] = useState<HostelResident[]>(
    hostelDataService.getResidents()
  );

  // Form state
  const [studentName, setStudentName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [course, setCourse] = useState("B.Tech CSE");
  const [selectedRoom, setSelectedRoom] = useState<HostelRoom | null>(null);
  const [selectedBed, setSelectedBed] = useState("Bed A");
  const [checkInDate, setCheckInDate] = useState("Today");

  const handleSelectExistingStudent = (res: HostelResident) => {
    setStudentName(res.name);
    setStudentId(res.studentId);
    setStudentPhone(res.phone);
    if (res.course) setCourse(res.course);
    setCurrentStep(2);
  };

  const handleNextStep1 = () => {
    if (!studentName.trim()) {
      Alert.alert("Required", "Please provide a student name");
      return;
    }
    setCurrentStep(2);
  };

  const handleSelectRoom = (room: HostelRoom) => {
    setSelectedRoom(room);
    setCurrentStep(3);
  };

  const handleConfirmAllocation = () => {
    if (!selectedRoom || !studentName.trim()) {
      Alert.alert("Incomplete", "Please ensure student and room are selected");
      return;
    }

    // Allocate room in service
    hostelDataService.allocateRoom(studentName.trim(), selectedRoom.roomNo);

    // Also register resident if new
    const existing = existingResidents.find(
      (r) => r.name.toLowerCase() === studentName.toLowerCase()
    );
    if (!existing) {
      hostelDataService.addResident({
        name: studentName.trim(),
        studentId: studentId.trim() || `S-${Math.floor(100 + Math.random() * 900)}`,
        roomNo: selectedRoom.roomNo,
        phone: studentPhone.trim() || "9876543210",
        course: course,
        year: "1st Year",
        status: "Active",
        checkInDate: new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
      });
    }

    setActionNotice(`Room ${selectedRoom.roomNo} successfully allocated to ${studentName}!`);
    setTimeout(() => {
      router.push("/hostel-manager/rooms");
    }, 1500);
  };

  return (
    <HostelLayout
      activeNav="allocation"
      pageTitle="Room Allocation Wizard"
      pageSubtitle="Step-by-step room and bed assignment for incoming students"
      actionNotice={actionNotice}
    >
      {/* 3-Step Wizard Navigation */}
      <View style={styles.wizardStepper}>
        {[
          { step: 1, label: "1. Select Student" },
          { step: 2, label: "2. Choose Room" },
          { step: 3, label: "3. Confirm & Assign" },
        ].map((item) => {
          const isDone = currentStep > item.step;
          const isCurrent = currentStep === item.step;
          return (
            <TouchableOpacity
              key={item.step}
              style={[
                styles.stepperItem,
                isCurrent && styles.stepperItemCurrent,
                isDone && styles.stepperItemDone,
              ]}
              onPress={() => {
                if (item.step < currentStep) setCurrentStep(item.step as any);
              }}
            >
              <View
                style={[
                  styles.stepBadge,
                  isCurrent && styles.stepBadgeCurrent,
                  isDone && styles.stepBadgeDone,
                ]}
              >
                {isDone ? (
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                ) : (
                  <Text
                    style={[
                      styles.stepBadgeText,
                      isCurrent && styles.stepBadgeTextCurrent,
                    ]}
                  >
                    {item.step}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.stepperLabel,
                  isCurrent && styles.stepperLabelCurrent,
                  isDone && styles.stepperLabelDone,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* STEP 1: Select Student */}
      {currentStep === 1 && (
        <View style={styles.stepContentCard}>
          <Text style={styles.stepTitle}>Step 1: Enter Student Details</Text>
          <Text style={styles.stepDescription}>
            Type new student details or select from existing resident records.
          </Text>

          <View style={styles.formGrid}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Student Full Name *</Text>
              <TextInput
                value={studentName}
                onChangeText={setStudentName}
                placeholder="e.g. Aryan Mehra"
                style={styles.input}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Roll / Student ID</Text>
              <TextInput
                value={studentId}
                onChangeText={setStudentId}
                placeholder="e.g. B2024-055"
                style={styles.input}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Contact Phone Number</Text>
              <TextInput
                value={studentPhone}
                onChangeText={setStudentPhone}
                placeholder="e.g. 9876543210"
                keyboardType="phone-pad"
                style={styles.input}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Course / Branch</Text>
              <TextInput
                value={course}
                onChangeText={setCourse}
                placeholder="e.g. B.Tech CSE, MBA, MCA"
                style={styles.input}
              />
            </View>
          </View>

          {/* Quick pick from recent students */}
          <Text style={styles.subHeading}>Or Select from Existing Students:</Text>
          <View style={styles.quickStudentList}>
            {existingResidents.slice(0, 4).map((res) => (
              <TouchableOpacity
                key={res.id}
                style={styles.quickStudentCard}
                onPress={() => handleSelectExistingStudent(res)}
              >
                <View style={styles.studentAvatar}>
                  <Text style={styles.avatarText}>{res.name.charAt(0)}</Text>
                </View>
                <View>
                  <Text style={styles.studentNameText}>{res.name}</Text>
                  <Text style={styles.studentSubText}>{res.studentId} • {res.course}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.btnRowRight}>
            <TouchableOpacity
              style={styles.primaryNextBtn}
              onPress={handleNextStep1}
            >
              <Text style={styles.primaryNextBtnText}>Proceed to Choose Room</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* STEP 2: Choose Room */}
      {currentStep === 2 && (
        <View style={styles.stepContentCard}>
          <Text style={styles.stepTitle}>Step 2: Choose an Available Room</Text>
          <Text style={styles.stepDescription}>
            Assigning for: <Text style={{ fontWeight: "700", color: "#0F172A" }}>{studentName}</Text>
          </Text>

          {availableRooms.length === 0 ? (
            <View style={styles.emptyAlert}>
              <Ionicons name="alert-circle-outline" size={30} color="#DC2626" />
              <Text style={styles.emptyAlertText}>
                No rooms are currently vacant. You can add a new room from the Rooms page or vacate an occupied room.
              </Text>
            </View>
          ) : (
            <View style={styles.roomSelectGrid}>
              {availableRooms.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={[
                    styles.roomSelectCard,
                    selectedRoom?.id === r.id && styles.roomSelectCardActive,
                  ]}
                  onPress={() => handleSelectRoom(r)}
                >
                  <View style={styles.roomCardTop}>
                    <Text style={styles.roomNum}>Room {r.roomNo}</Text>
                    <View style={styles.roomTypeTag}>
                      <Text style={styles.roomTypeTagText}>{r.type}</Text>
                    </View>
                  </View>

                  <Text style={styles.roomInfoRow}>🏢 {r.floor || "1st Floor"}</Text>
                  <Text style={styles.roomInfoRow}>👥 Capacity: {r.capacity} beds</Text>
                  <Text style={styles.roomRent}>₹{r.rent || 4500} / mo</Text>

                  <View style={styles.selectRoomAction}>
                    <Text style={styles.selectRoomActionText}>Select Room</Text>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#2563EB" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.btnRowBetween}>
            <TouchableOpacity
              style={styles.secondaryBackBtn}
              onPress={() => setCurrentStep(1)}
            >
              <Ionicons name="arrow-back" size={16} color="#64748B" />
              <Text style={styles.secondaryBackBtnText}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* STEP 3: Confirm Allocation */}
      {currentStep === 3 && selectedRoom && (
        <View style={styles.stepContentCard}>
          <Text style={styles.stepTitle}>Step 3: Bed & Allocation Confirmation</Text>
          <Text style={styles.stepDescription}>
            Review the assignment summary before finalizing room key delivery.
          </Text>

          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Student Name:</Text>
              <Text style={styles.summaryValue}>{studentName}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Student ID:</Text>
              <Text style={styles.summaryValue}>{studentId || "Auto-assigned"}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Course:</Text>
              <Text style={styles.summaryValue}>{course}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Assigned Room:</Text>
              <Text style={styles.summaryHighlight}>Room {selectedRoom.roomNo} ({selectedRoom.type})</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Floor:</Text>
              <Text style={styles.summaryValue}>{selectedRoom.floor || "1st Floor"}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Monthly Fee:</Text>
              <Text style={styles.summaryRent}>₹{selectedRoom.rent || 4500} / month</Text>
            </View>
          </View>

          {/* Bed Selection */}
          <Text style={styles.subHeading}>Select Bed Position:</Text>
          <View style={styles.bedSelector}>
            {["Bed A (Window)", "Bed B (Door)", "Bed C (Middle)"].slice(0, selectedRoom.capacity).map((bed) => (
              <TouchableOpacity
                key={bed}
                style={[
                  styles.bedOption,
                  selectedBed === bed && styles.bedOptionActive,
                ]}
                onPress={() => setSelectedBed(bed)}
              >
                <Ionicons
                  name="bed-outline"
                  size={16}
                  color={selectedBed === bed ? "#2563EB" : "#64748B"}
                />
                <Text
                  style={[
                    styles.bedOptionText,
                    selectedBed === bed && styles.bedOptionTextActive,
                  ]}
                >
                  {bed}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.btnRowBetween}>
            <TouchableOpacity
              style={styles.secondaryBackBtn}
              onPress={() => setCurrentStep(2)}
            >
              <Ionicons name="arrow-back" size={16} color="#64748B" />
              <Text style={styles.secondaryBackBtnText}>Change Room</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmFinalBtn}
              onPress={handleConfirmAllocation}
            >
              <Ionicons name="key" size={16} color="#FFFFFF" />
              <Text style={styles.confirmFinalBtnText}>Complete Allocation</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </HostelLayout>
  );
}

const styles = StyleSheet.create({
  wizardStepper: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 20,
    gap: 12,
  },
  stepperItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  stepperItemCurrent: {
    backgroundColor: "#EFF6FF",
  },
  stepperItemDone: {
    backgroundColor: "#F8FAFC",
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  stepBadgeCurrent: {
    backgroundColor: "#2563EB",
  },
  stepBadgeDone: {
    backgroundColor: "#10B981",
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  stepBadgeTextCurrent: {
    color: "#FFFFFF",
  },
  stepperLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  stepperLabelCurrent: {
    color: "#2563EB",
    fontWeight: "700",
  },
  stepperLabelDone: {
    color: "#10B981",
  },
  stepContentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 20,
  },
  formGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginBottom: 20,
  },
  formGroup: {
    width: "48%",
    minWidth: 260,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#0F172A",
  },
  subHeading: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 10,
    marginBottom: 12,
  },
  quickStudentList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  quickStudentCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 10,
    borderRadius: 8,
    minWidth: 200,
  },
  studentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  studentNameText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  studentSubText: {
    fontSize: 11,
    color: "#64748B",
  },
  btnRowRight: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  btnRowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
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
  secondaryBackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  secondaryBackBtnText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "600",
  },
  roomSelectGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginBottom: 20,
  },
  roomSelectCard: {
    width: "31%",
    minWidth: 240,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 14,
  },
  roomSelectCardActive: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  roomCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  roomNum: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  roomTypeTag: {
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roomTypeTagText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
  },
  roomInfoRow: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 4,
  },
  roomRent: {
    fontSize: 13,
    fontWeight: "800",
    color: "#2563EB",
    marginTop: 4,
    marginBottom: 10,
  },
  selectRoomAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 8,
  },
  selectRoomActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  emptyAlert: {
    backgroundColor: "#FEF2F2",
    padding: 16,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  emptyAlertText: {
    flex: 1,
    color: "#B91C1C",
    fontSize: 13,
  },
  summaryCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 16,
    gap: 8,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryLabel: {
    fontSize: 13,
    color: "#64748B",
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
  },
  summaryHighlight: {
    fontSize: 14,
    fontWeight: "800",
    color: "#2563EB",
  },
  summaryRent: {
    fontSize: 14,
    fontWeight: "800",
    color: "#059669",
  },
  bedSelector: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  bedOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
  },
  bedOptionActive: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  bedOptionText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  bedOptionTextActive: {
    color: "#2563EB",
    fontWeight: "700",
  },
  confirmFinalBtn: {
    backgroundColor: "#10B981",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  confirmFinalBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});