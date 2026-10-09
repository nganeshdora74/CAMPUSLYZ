import React, { useEffect, useState } from "react";
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
import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import HostelLayout from "../../components/hostel/HostelLayout";
import hostelDataService, { HostelResident } from "../../services/hostelDataService";
import unifiedStudentService from "../../services/unifiedStudentService";
import { notifyStudent } from "../../services/notificationService";

export default function HostelStudentsScreen() {
  const { width } = useWindowDimensions();
  const [residents, setResidents] = useState<HostelResident[]>(
    hostelDataService.getResidents()
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [yearFilter, setYearFilter] = useState<"All" | "1st Year" | "2nd Year" | "3rd Year" | "4th Year">("All");
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Quick Add Resident Modal
  const [addModal, setAddModal] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [idInput, setIdInput] = useState("");
  const [roomInput, setRoomInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [courseInput, setCourseInput] = useState("B.Tech CSE");
  const [yearInput, setYearInput] = useState("1st Year");
  const [emergencyInput, setEmergencyInput] = useState("");

  // View Details Modal
  const [detailModal, setDetailModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<HostelResident | null>(null);

  // Edit Resident Modal
  const [editModal, setEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editStudentId, setEditStudentId] = useState("");
  const [editRoomNo, setEditRoomNo] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCourse, setEditCourse] = useState("");
  const [editYear, setEditYear] = useState("");
  const [editEmergency, setEditEmergency] = useState("");
  const [editStatus, setEditStatus] = useState<"Active" | "Inactive">("Active");
  const [savingEdit, setSavingEdit] = useState(false);

  // 1. Live Firestore Sync with 'users' collection & in-memory service
  useEffect(() => {
    // Listen to unifiedStudentService
    const unsubUnified = unifiedStudentService.subscribeStudents(() => {
      refreshResidents();
    });

    // Listen directly to Firestore 'users' for immediate updates when authorized users make changes
    let unsubUsers: (() => void) | undefined;
    try {
      const q = query(collection(db, "users"));
      unsubUsers = onSnapshot(
        q,
        (snapshot) => {
          const fsResidents: HostelResident[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const role = (data.role || "").toLowerCase();
            const isEnrolled = data.hostelStatus === "Enrolled" || !!data.roomNo;

            if (role === "student" && isEnrolled) {
              fsResidents.push({
                id: docSnap.id,
                name: data.fullName || data.name || "Student",
                studentId: data.rollNo || data.studentId || docSnap.id.slice(0, 6).toUpperCase(),
                roomNo: data.roomNo || "Unassigned",
                phone: data.phone || "—",
                course: data.course || data.department || "B.Tech",
                year: data.year || (data.semester ? `Sem ${data.semester}` : "1st Year"),
                status: data.status === "inactive" || data.status === "blocked" ? "Inactive" : "Active",
                checkInDate: data.checkInDate || "Active",
                emergencyContact: data.emergencyContact || data.guardianPhone || "—",
              });
            }
          });

          if (fsResidents.length > 0) {
            // Merge with local service to ensure all records exist
            const inMemory = hostelDataService.getResidents();
            const mergedMap = new Map<string, HostelResident>();

            inMemory.forEach((r) => mergedMap.set(r.studentId, r));
            fsResidents.forEach((r) => mergedMap.set(r.studentId, r));

            setResidents(Array.from(mergedMap.values()));
          } else {
            setResidents(hostelDataService.getResidents());
          }
        },
        (err) => console.warn("Firestore users listener warning:", err)
      );
    } catch (_) {}

    return () => {
      if (typeof unsubUnified === "function") unsubUnified();
      if (typeof unsubUsers === "function") unsubUsers();
    };
  }, []);

  const refreshResidents = () => {
    setResidents(hostelDataService.getResidents());
  };

  const filtered = residents.filter((r) => {
    const matchesYear = yearFilter === "All" || r.year === yearFilter;
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.roomNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.course && r.course.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesYear && matchesSearch;
  });

  // Handler: Add New Resident to Hostel
  const handleAddResident = async () => {
    if (!nameInput.trim() || !roomInput.trim()) {
      Alert.alert("Required", "Please provide resident name and room number");
      return;
    }

    const cleanName = nameInput.trim();
    const cleanId = idInput.trim() || `ID-${Math.floor(1000 + Math.random() * 9000)}`;
    const cleanRoom = roomInput.trim();
    const cleanPhone = phoneInput.trim() || "9876543210";
    const cleanCourse = courseInput.trim() || "B.Tech CSE";
    const cleanYear = yearInput;
    const cleanEmergency = emergencyInput.trim() || "9876543299";

    // 1. Add to local hostel service
    hostelDataService.addResident({
      name: cleanName,
      studentId: cleanId,
      roomNo: cleanRoom,
      phone: cleanPhone,
      course: cleanCourse,
      year: cleanYear,
      status: "Active",
      checkInDate: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      emergencyContact: cleanEmergency,
    });

    // 2. Allocate room in hostel service
    hostelDataService.allocateRoom(cleanName, cleanRoom);

    // 3. Write to Firestore 'users' collection
    try {
      await addDoc(collection(db, "users"), {
        fullName: cleanName,
        name: cleanName,
        rollNo: cleanId,
        studentId: cleanId,
        roomNo: cleanRoom,
        phone: cleanPhone,
        course: cleanCourse,
        department: cleanCourse,
        year: cleanYear,
        emergencyContact: cleanEmergency,
        role: "student",
        hostelStatus: "Enrolled",
        status: "active",
        checkInDate: new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        createdAt: serverTimestamp(),
      });
    } catch (fsErr) {
      console.warn("Firestore user creation warning:", fsErr);
    }

    // 4. Notify student
    try {
      await notifyStudent(
        cleanPhone,
        "Hostel Room Allocated! 🏨",
        `Hello ${cleanName}, you have been assigned to Room ${cleanRoom} in the hostel.`
      );
    } catch (_) {}

    setNameInput("");
    setIdInput("");
    setRoomInput("");
    setPhoneInput("");
    setEmergencyInput("");
    setAddModal(false);
    refreshResidents();
    setActionNotice(`Resident ${cleanName} successfully registered to Room ${cleanRoom}!`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  // Handler: Open Edit Resident Form
  const handleOpenEdit = (res: HostelResident) => {
    setSelectedStudent(res);
    setEditName(res.name);
    setEditStudentId(res.studentId);
    setEditRoomNo(res.roomNo);
    setEditPhone(res.phone || "");
    setEditCourse(res.course || "B.Tech CSE");
    setEditYear(res.year || "1st Year");
    setEditEmergency(res.emergencyContact || "");
    setEditStatus(res.status === "Inactive" ? "Inactive" : "Active");
    setDetailModal(false);
    setEditModal(true);
  };

  // Handler: Save Updated Resident Details
  const handleSaveEdit = async () => {
    if (!selectedStudent) return;
    if (!editName.trim() || !editRoomNo.trim()) {
      Alert.alert("Required", "Please provide name and room number");
      return;
    }

    try {
      setSavingEdit(true);

      const updates: Partial<HostelResident> = {
        name: editName.trim(),
        roomNo: editRoomNo.trim(),
        phone: editPhone.trim(),
        course: editCourse.trim(),
        year: editYear.trim(),
        emergencyContact: editEmergency.trim(),
        status: editStatus,
      };

      // 1. Update in-memory hostel service
      hostelDataService.updateResident(selectedStudent.id, updates);
      if (editRoomNo.trim() !== selectedStudent.roomNo) {
        hostelDataService.allocateRoom(editName.trim(), editRoomNo.trim());
      }

      // 2. Update Firestore 'users' collection
      try {
        const usersRef = collection(db, "users");
        // Check by studentId or rollNo
        const q = query(usersRef, where("rollNo", "==", selectedStudent.studentId));
        const snap = await getDocs(q);

        if (!snap.empty) {
          const docId = snap.docs[0].id;
          await updateDoc(doc(db, "users", docId), {
            fullName: editName.trim(),
            name: editName.trim(),
            roomNo: editRoomNo.trim(),
            phone: editPhone.trim(),
            course: editCourse.trim(),
            year: editYear.trim(),
            emergencyContact: editEmergency.trim(),
            status: editStatus.toLowerCase() === "active" ? "active" : "inactive",
            updatedAt: serverTimestamp(),
          });
        } else {
          // If doc exists by ID directly
          try {
            await updateDoc(doc(db, "users", selectedStudent.id), {
              fullName: editName.trim(),
              name: editName.trim(),
              roomNo: editRoomNo.trim(),
              phone: editPhone.trim(),
              course: editCourse.trim(),
              year: editYear.trim(),
              emergencyContact: editEmergency.trim(),
              status: editStatus.toLowerCase() === "active" ? "active" : "inactive",
              updatedAt: serverTimestamp(),
            });
          } catch (_) {}
        }
      } catch (fsErr) {
        console.warn("Firestore update error:", fsErr);
      }

      // 3. Notify student if details/room changed
      try {
        await notifyStudent(
          editPhone.trim() || selectedStudent.studentId,
          "Hostel Details Updated 🏨",
          `Your hostel details have been updated. Room: ${editRoomNo.trim()} (Status: ${editStatus}).`
        );
      } catch (_) {}

      // 4. Update local list state
      setResidents((prev) =>
        prev.map((r) =>
          r.studentId === selectedStudent.studentId
            ? { ...r, ...updates }
            : r
        )
      );

      setEditModal(false);
      setSelectedStudent(null);
      setActionNotice(`Resident details for ${editName.trim()} updated successfully!`);
      setTimeout(() => setActionNotice(null), 3000);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to update resident details");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleStatus = (res: HostelResident) => {
    const nextStatus = res.status === "Active" ? "Inactive" : "Active";
    hostelDataService.updateResident(res.id, { status: nextStatus });
    refreshResidents();
    setActionNotice(`${res.name} marked as ${nextStatus}`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  return (
    <HostelLayout
      activeNav="students"
      pageTitle="Students & Residents"
      pageSubtitle={`${residents.length} enrolled hostel residents • Live synchronised`}
      actionNotice={actionNotice}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search student name, roll number, room..."
      rightAction={
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setAddModal(true)}
        >
          <Ionicons name="person-add" size={16} color="#FFFFFF" />
          <Text style={styles.addBtnText}>+ Add Resident</Text>
        </TouchableOpacity>
      }
    >
      {/* Year Filter Pills */}
      <View style={styles.filterRow}>
        {(["All", "1st Year", "2nd Year", "3rd Year", "4th Year"] as const).map((yr) => (
          <TouchableOpacity
            key={yr}
            style={[styles.filterPill, yearFilter === yr && styles.filterPillActive]}
            onPress={() => setYearFilter(yr)}
          >
            <Text
              style={[
                styles.filterPillText,
                yearFilter === yr && styles.filterPillTextActive,
              ]}
            >
              {yr === "All" ? `All Students (${residents.length})` : yr}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Student List Cards */}
      <View style={styles.cardContainer}>
        {filtered.map((res) => {
          const isActive = res.status === "Active";
          return (
            <View key={res.id} style={styles.studentCard}>
              <View style={styles.cardHeader}>
                <View style={styles.avatarPill}>
                  <Text style={styles.avatarLetter}>{res.name.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.studentName}>{res.name}</Text>
                  <Text style={styles.studentIdText}>ID: {res.studentId} • Room {res.roomNo}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusInactive]}
                  onPress={() => handleToggleStatus(res)}
                >
                  <Text style={[styles.statusBadgeText, isActive ? styles.statusActiveText : styles.statusInactiveText]}>
                    {res.status}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.infoGrid}>
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>Course</Text>
                  <Text style={styles.infoVal}>{res.course || "B.Tech"}</Text>
                </View>
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>Year</Text>
                  <Text style={styles.infoVal}>{res.year || "3rd Year"}</Text>
                </View>
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.infoVal}>{res.phone || "—"}</Text>
                </View>
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>Check-in</Text>
                  <Text style={styles.infoVal}>{res.checkInDate || "—"}</Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <TouchableOpacity
                  style={styles.detailBtn}
                  onPress={() => {
                    setSelectedStudent(res);
                    setDetailModal(true);
                  }}
                >
                  <Ionicons name="information-circle-outline" size={15} color="#2563EB" />
                  <Text style={styles.detailBtnText}>Full Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.detailBtn, { borderColor: "#F59E0B" }]}
                  onPress={() => handleOpenEdit(res)}
                >
                  <Ionicons name="create-outline" size={15} color="#D97706" />
                  <Text style={[styles.detailBtnText, { color: "#D97706" }]}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.changeRoomBtn}
                  onPress={() => router.push("/hostel-manager/room-allocation")}
                >
                  <Ionicons name="swap-horizontal-outline" size={15} color="#475569" />
                  <Text style={styles.changeRoomBtnText}>Reallocate</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </View>

      {/* Add Resident Modal */}
      <Modal visible={addModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Register New Resident</Text>
              <TouchableOpacity onPress={() => setAddModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Student Full Name *</Text>
            <TextInput
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="e.g. Vikramaditya Singh"
              style={styles.input}
            />

            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Student ID</Text>
                <TextInput
                  value={idInput}
                  onChangeText={setIdInput}
                  placeholder="e.g. B009"
                  style={styles.input}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Room No *</Text>
                <TextInput
                  value={roomInput}
                  onChangeText={setRoomInput}
                  placeholder="e.g. 104"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Phone</Text>
                <TextInput
                  value={phoneInput}
                  onChangeText={setPhoneInput}
                  placeholder="9876543210"
                  keyboardType="phone-pad"
                  style={styles.input}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Academic Year</Text>
                <TextInput
                  value={yearInput}
                  onChangeText={setYearInput}
                  placeholder="1st Year"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Course</Text>
                <TextInput
                  value={courseInput}
                  onChangeText={setCourseInput}
                  placeholder="B.Tech CSE"
                  style={styles.input}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Emergency Contact</Text>
                <TextInput
                  value={emergencyInput}
                  onChangeText={setEmergencyInput}
                  placeholder="9876543299"
                  keyboardType="phone-pad"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setAddModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleAddResident}
              >
                <Text style={styles.saveBtnText}>Save Resident</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Resident Details Modal */}
      <Modal visible={editModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Resident Details</Text>
              <TouchableOpacity onPress={() => setEditModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Student Full Name *</Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              placeholder="Full Name"
              style={styles.input}
            />

            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Student ID</Text>
                <TextInput
                  value={editStudentId}
                  editable={false}
                  style={[styles.input, { backgroundColor: "#F1F5F9" }]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Room No *</Text>
                <TextInput
                  value={editRoomNo}
                  onChangeText={setEditRoomNo}
                  placeholder="Room No"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Phone</Text>
                <TextInput
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="Phone"
                  keyboardType="phone-pad"
                  style={styles.input}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Academic Year</Text>
                <TextInput
                  value={editYear}
                  onChangeText={setEditYear}
                  placeholder="Year"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Course</Text>
                <TextInput
                  value={editCourse}
                  onChangeText={setEditCourse}
                  placeholder="Course"
                  style={styles.input}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Emergency Contact</Text>
                <TextInput
                  value={editEmergency}
                  onChangeText={setEditEmergency}
                  placeholder="Emergency Phone"
                  keyboardType="phone-pad"
                  style={styles.input}
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Hostel Status</Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
              {(["Active", "Inactive"] as const).map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[
                    styles.statusSelectChip,
                    editStatus === st && styles.statusSelectChipActive,
                  ]}
                  onPress={() => setEditStatus(st)}
                >
                  <Text
                    style={[
                      styles.statusSelectChipText,
                      editStatus === st && styles.statusSelectChipTextActive,
                    ]}
                  >
                    {st}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditModal(false)}
                disabled={savingEdit}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: "#D97706" }]}
                onPress={handleSaveEdit}
                disabled={savingEdit}
              >
                <Text style={styles.saveBtnText}>
                  {savingEdit ? "Saving..." : "Save Changes"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Student Profile Modal */}
      <Modal visible={detailModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Resident Details</Text>
              <TouchableOpacity onPress={() => setDetailModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedStudent && (
              <View style={styles.detailContainer}>
                <View style={styles.detailHeader}>
                  <View style={styles.bigAvatar}>
                    <Text style={styles.bigAvatarText}>
                      {selectedStudent.name.charAt(0)}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.bigName}>{selectedStudent.name}</Text>
                    <Text style={styles.bigSub}>Room {selectedStudent.roomNo} • {selectedStudent.studentId}</Text>
                    <View style={styles.statusPillSmall}>
                      <Text style={styles.statusPillSmallText}>{selectedStudent.status}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.infoSection}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoKey}>Course / Branch:</Text>
                    <Text style={styles.infoValBold}>{selectedStudent.course}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoKey}>Academic Year:</Text>
                    <Text style={styles.infoValBold}>{selectedStudent.year}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoKey}>Contact Phone:</Text>
                    <Text style={styles.infoValBold}>{selectedStudent.phone}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoKey}>Hostel Check-in:</Text>
                    <Text style={styles.infoValBold}>{selectedStudent.checkInDate}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoKey}>Emergency Contact:</Text>
                    <Text style={styles.infoValBold}>{selectedStudent.emergencyContact || "—"}</Text>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: "#D97706" }]}
                onPress={() => {
                  if (selectedStudent) {
                    handleOpenEdit(selectedStudent);
                  }
                }}
              >
                <Ionicons name="create-outline" size={16} color="#FFFFFF" />
                <Text style={styles.saveBtnText}>Edit Details</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={() => setDetailModal(false)}
              >
                <Text style={styles.saveBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </HostelLayout>
  );
}

const styles = StyleSheet.create({
  addBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  addBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  filterPill: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  filterPillActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  filterPillTextActive: {
    color: "#FFFFFF",
  },
  cardContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  studentCard: {
    flex: 1,
    minWidth: 280,
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarPill: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    color: "#4F46E5",
    fontSize: 15,
    fontWeight: "800",
  },
  studentName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  studentIdText: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: "#ECFDF5",
  },
  statusInactive: {
    backgroundColor: "#F1F5F9",
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  statusActiveText: {
    color: "#059669",
  },
  statusInactiveText: {
    color: "#64748B",
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
    padding: 10,
    gap: 8,
    marginBottom: 12,
  },
  infoCol: {
    width: "47%",
  },
  infoLabel: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "600",
  },
  infoVal: {
    fontSize: 12,
    color: "#1E293B",
    fontWeight: "700",
    marginTop: 1,
  },
  cardFooter: {
    flexDirection: "row",
    gap: 8,
  },
  detailBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  detailBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563EB",
  },
  changeRoomBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
  },
  changeRoomBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 20,
    width: "100%",
    maxWidth: 500,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 5,
    marginTop: 8,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: "#0F172A",
  },
  twoCol: {
    flexDirection: "row",
    gap: 10,
  },
  statusSelectChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
  },
  statusSelectChipActive: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  statusSelectChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  statusSelectChipTextActive: {
    color: "#2563EB",
    fontWeight: "700",
  },
  modalBtnRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 18,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  cancelBtnText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  saveBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  saveBtnText: {
    fontSize: 13,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  detailContainer: {
    gap: 14,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  bigAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  bigAvatarText: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },
  bigName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  bigSub: {
    fontSize: 12,
    color: "#64748B",
  },
  statusPillSmall: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  statusPillSmallText: {
    color: "#059669",
    fontSize: 10,
    fontWeight: "700",
  },
  infoSection: {
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoKey: {
    fontSize: 12,
    color: "#64748B",
  },
  infoValBold: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E293B",
  },
});