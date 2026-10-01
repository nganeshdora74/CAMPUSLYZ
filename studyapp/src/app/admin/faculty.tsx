import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { auth, db } from "../../firebase/config";
import { confirmLogout } from "../../firebase/auth";
import { useAppTheme } from "../../context/ThemeContext";
import AdminThemeToggle from "../../components/admin/AdminThemeToggle";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminTopBar from "../../components/admin/AdminTopBar";
import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "home", route: "/admin" },
  { id: "students", label: "Students", icon: "person", route: "/admin/student" },
  { id: "faculty", label: "Faculty", icon: "people", route: "/admin/faculty" },
  { id: "academics", label: "Academics", icon: "book", route: "/admin/academics" },
  { id: "schedule", label: "Schedule", icon: "calendar", route: "/admin/schedule" },
  { id: "attendance", label: "Attendance", icon: "checkbox", route: "/admin/attendence" },
  { id: "certificates", label: "Certificates", icon: "ribbon", route: "/admin/certificate" },
  { id: "ai-assistant", label: "AI Assistant", icon: "sparkles", route: "/admin/ai-assistant" },
  { id: "hostel", label: "Hostel", icon: "business", route: "/admin/hostel" },
  { id: "mess", label: "Mess", icon: "restaurant", route: "/admin/mess" },
  { id: "fees", label: "Fees", icon: "wallet", route: "/admin/fees" },
  { id: "notices", label: "Notices", icon: "megaphone", route: "/admin/notices" },
  { id: "requests", label: "Requests", icon: "document-text", route: "/admin/requests" },
  { id: "reports", label: "Reports", icon: "bar-chart", route: "/admin/reports" },
  { id: "settings", label: "Settings", icon: "settings", route: "/admin/settings" },
  { id: "profile", label: "Profile", icon: "person-circle", route: "/admin/profile" },
];

export type Faculty = {
  id: string;
  name: string;
  designation: string;
  department: string;
  code: "CSE" | "ECE" | "ME" | "BSH";
  phone: string;
  email: string;
  room: string;
  subjects: string[];
  avatar: string;
};

export default function AdminFacultyScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const { isDark, colors } = useAppTheme();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [addModal, setAddModal] = useState(false);

  const [nameInput, setNameInput] = useState("");
  const [designationInput, setDesignationInput] = useState("Assistant Professor");
  const [deptInput, setDeptInput] = useState<"CSE" | "ECE" | "ME" | "BSH">("CSE");
  const [phoneInput, setPhoneInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [roomInput, setRoomInput] = useState("Cabin 301, Block A");
  const [subjectsInput, setSubjectsInput] = useState("");
  const [avatarInput, setAvatarInput] = useState(
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80"
  );

  // Edit Faculty States
  const [editModal, setEditModal] = useState(false);
  const [editingFacultyId, setEditingFacultyId] = useState("");
  const [editNameInput, setEditNameInput] = useState("");
  const [editDesignationInput, setEditDesignationInput] = useState("");
  const [editDeptInput, setEditDeptInput] = useState<"CSE" | "ECE" | "ME" | "BSH">("CSE");
  const [editPhoneInput, setEditPhoneInput] = useState("");
  const [editEmailInput, setEditEmailInput] = useState("");
  const [editRoomInput, setEditRoomInput] = useState("");
  const [editSubjectsInput, setEditSubjectsInput] = useState("");
  const [editAvatarInput, setEditAvatarInput] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);

  // Firestore Realtime Listener (Dynamic in Firebase - Syncs directly with students)
  React.useEffect(() => {
    const facultyCol = collection(db, "faculty");
    const unsubscribe = onSnapshot(
      facultyCol,
      (snapshot) => {
        const list: Faculty[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          const subjectsArr = Array.isArray(d.subjects)
            ? d.subjects
            : typeof d.subjects === "string"
            ? d.subjects.split(",").map((s: string) => s.trim())
            : ["General Studies"];

          return {
            id: docSnap.id,
            name: d.name || "Faculty Member",
            designation: d.designation || "Assistant Professor",
            department: d.department || "Computer Science & Engineering",
            code: (d.code || "CSE") as "CSE" | "ECE" | "ME" | "BSH",
            phone: d.phone || "",
            email: d.email || "",
            room: d.room || "Faculty Cabin",
            subjects: subjectsArr,
            avatar:
              d.avatar ||
              "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80",
          };
        });
        setFacultyList(list);
        setLoading(false);
      },
      (error) => {
        console.warn("Faculty snapshot error:", error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handlePickPhoto = async (isEdit: boolean) => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission Required", "Please allow photo library access to select faculty photo.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        if (isEdit) {
          setEditAvatarInput(result.assets[0].uri);
        } else {
          setAvatarInput(result.assets[0].uri);
        }
      }
    } catch (err: any) {
      Alert.alert("Photo Selection Error", err?.message || "Could not pick image.");
    }
  };

  const handleTakePhoto = async (isEdit: boolean) => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission Required", "Please allow camera access to capture faculty photo.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        if (isEdit) {
          setEditAvatarInput(result.assets[0].uri);
        } else {
          setAvatarInput(result.assets[0].uri);
        }
      }
    } catch (err: any) {
      Alert.alert("Camera Error", err?.message || "Could not take photo.");
    }
  };

  const filteredFaculty = facultyList.filter((f) => {
    const matchesDept = selectedDept === "All" || f.code === selectedDept;
    const matchesSearch =
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.subjects.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesDept && matchesSearch;
  });

  const handleAddFaculty = async () => {
    if (!nameInput.trim()) {
      Alert.alert("Missing Information", "Please enter faculty member's name.");
      return;
    }

    const deptMap: Record<string, string> = {
      CSE: "Computer Science & Engineering",
      ECE: "Electronics & Communication",
      ME: "Mechanical Engineering",
      BSH: "Basic Science & Humanities",
    };

    const subs = subjectsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      await addDoc(collection(db, "faculty"), {
        name: nameInput.trim(),
        designation: designationInput.trim() || "Assistant Professor",
        department: deptMap[deptInput] || deptInput,
        code: deptInput,
        phone: phoneInput.trim(),
        email: emailInput.trim(),
        room: roomInput.trim() || "Faculty Cabin",
        subjects: subs.length > 0 ? subs : ["Academic Instruction"],
        avatar:
          avatarInput.trim() ||
          "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80",
        createdAt: serverTimestamp(),
      });

      await addDoc(collection(db, "activities"), {
        title: `Faculty Added: ${nameInput.trim()} (${deptInput})`,
        time: "Just now",
        user: "Admin",
        type: "system",
        createdAt: serverTimestamp(),
      });

      setNameInput("");
      setDesignationInput("Assistant Professor");
      setPhoneInput("");
      setEmailInput("");
      setRoomInput("Cabin 301, Block A");
      setSubjectsInput("");
      setAvatarInput("https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80");
      setAddModal(false);
      Alert.alert("Faculty Added", "New faculty member has been added and synced directly with students.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to add faculty");
    }
  };

  const confirmAction = (title: string, message: string, onConfirm: () => void) => {
    if (Platform.OS === "web") {
      const confirmed =
        typeof window !== "undefined" && typeof window.confirm === "function"
          ? window.confirm(`${title}\n\n${message}`)
          : true;
      if (confirmed) {
        onConfirm();
      }
    } else {
      Alert.alert(title, message, [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: onConfirm },
      ]);
    }
  };

  const handleDeleteFaculty = (item: Faculty) => {
    confirmAction(
      "Remove Faculty Member",
      `Are you sure you want to remove ${item.name}? This will remove them from student view in real-time.`,
      async () => {
        try {
          await deleteDoc(doc(db, "faculty", item.id));
          await addDoc(collection(db, "activities"), {
            title: `Faculty Removed: ${item.name}`,
            time: "Just now",
            user: "Admin",
            type: "system",
            createdAt: serverTimestamp(),
          });
          if (Platform.OS === "web") {
            window.alert(`Faculty member ${item.name} has been removed.`);
          } else {
            Alert.alert("Faculty Removed", `${item.name} has been removed.`);
          }
        } catch (e: any) {
          if (Platform.OS === "web") {
            window.alert(e?.message || "Failed to delete faculty");
          } else {
            Alert.alert("Error", e?.message || "Failed to delete faculty");
          }
        }
      }
    );
  };

  const handleOpenEditFaculty = (item: Faculty) => {
    setEditingFacultyId(item.id);
    setEditNameInput(item.name);
    setEditDesignationInput(item.designation);
    setEditDeptInput(item.code);
    setEditPhoneInput(item.phone);
    setEditEmailInput(item.email);
    setEditRoomInput(item.room);
    setEditSubjectsInput(item.subjects.join(", "));
    setEditAvatarInput(item.avatar);
    setEditModal(true);
  };

  const handleSaveEditFaculty = async () => {
    if (!editNameInput.trim()) {
      Alert.alert("Missing Details", "Please enter faculty member's name.");
      return;
    }

    const deptMap: Record<string, string> = {
      CSE: "Computer Science & Engineering",
      ECE: "Electronics & Communication",
      ME: "Mechanical Engineering",
      BSH: "Basic Science & Humanities",
    };

    const subs = editSubjectsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      setSavingEdit(true);
      await updateDoc(doc(db, "faculty", editingFacultyId), {
        name: editNameInput.trim(),
        designation: editDesignationInput.trim() || "Assistant Professor",
        department: deptMap[editDeptInput] || editDeptInput,
        code: editDeptInput,
        phone: editPhoneInput.trim(),
        email: editEmailInput.trim(),
        room: editRoomInput.trim(),
        subjects: subs.length > 0 ? subs : ["Academic Instruction"],
        avatar: editAvatarInput.trim(),
        updatedAt: serverTimestamp(),
      });

      await addDoc(collection(db, "activities"), {
        title: `Faculty Updated: ${editNameInput.trim()} (${editDeptInput})`,
        time: "Just now",
        user: "Admin",
        type: "system",
        createdAt: serverTimestamp(),
      });

      setEditModal(false);
      Alert.alert("Profile Updated", "Faculty details updated and synced directly with students.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to update faculty member.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleLogout = () => {
    confirmLogout("Are you sure you want to sign out?");
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.adminSidebar }]}
      edges={["top", "left", "right"]}
    >
      <View style={[styles.mainLayout, { backgroundColor: colors.adminBg }]}>
        {/* Standardized Admin Sidebar */}
        <AdminSidebar
          activeNav="faculty"
          isDesktop={isDesktop}
          mobileMenuOpen={mobileMenuOpen}
          onCloseMobileMenu={() => setMobileMenuOpen(false)}
        />

        <View style={[styles.contentArea, { backgroundColor: colors.adminBg }]}>
          {/* Standardized Top Bar */}
          <AdminTopBar
            showSearch={true}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search faculty by name or department..."
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
            rightActions={
              <TouchableOpacity
                style={styles.addFacultyHeaderBtn}
                onPress={() => setAddModal(true)}
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.addFacultyHeaderText}>Add Faculty</Text>
              </TouchableOpacity>
            }
          />

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* TITLE & FILTER PILLS */}
            <View style={styles.headingGroup}>
              <Text style={[styles.mainTitle, { color: colors.adminText }]}>Faculty Directory</Text>
              <Text style={[styles.mainSubtitle, { color: colors.adminTextSecondary }]}>
                Manage professors, department heads, and lecturers
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterPillsRow}
            >
              {["All", "CSE", "ECE", "ME", "BSH"].map((pill) => {
                const isSelected = selectedDept === pill;
                return (
                  <TouchableOpacity
                    key={pill}
                    style={[
                      styles.filterPill,
                      {
                        backgroundColor: isSelected ? "#7545D8" : colors.adminSurfaceAlt,
                      },
                    ]}
                    onPress={() => setSelectedDept(pill)}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        {
                          color: isSelected ? "#FFFFFF" : colors.adminTextSecondary,
                        },
                      ]}
                    >
                      {pill}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* FACULTY CARDS GRID */}
            {loading ? (
              <View style={{ padding: 40, alignItems: "center" }}>
                <ActivityIndicator size="large" color="#7545D8" />
                <Text style={{ marginTop: 12, color: colors.adminTextSecondary, fontWeight: "600" }}>Loading faculty from Firebase...</Text>
              </View>
            ) : filteredFaculty.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                <Ionicons name="people-outline" size={48} color={colors.adminTextSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.adminText }]}>No Faculty Found</Text>
                <Text style={[styles.emptySub, { color: colors.adminTextSecondary }]}>Add a new faculty member using the "+ Add Faculty" button above.</Text>
              </View>
            ) : (
              <View style={styles.facultyGrid}>
                {filteredFaculty.map((item) => (
                  <View
                    key={item.id}
                    style={[
                      styles.facultyCard,
                      {
                        backgroundColor: colors.adminCard,
                        borderColor: colors.adminCardBorder,
                      },
                    ]}
                  >
                    <View style={styles.facultyAvatarContainer}>
                      <Image source={{ uri: item.avatar }} style={styles.facultyAvatar} />
                    </View>
                    <View style={styles.facultyInfo}>
                      <View style={styles.facultyHeaderRow}>
                        <View style={{ flex: 1, paddingRight: 6 }}>
                          <Text style={[styles.facultyName, { color: colors.adminText }]} numberOfLines={1}>{item.name}</Text>
                          <Text style={[styles.facultyDesignationText, { color: colors.adminTextSecondary }]}>{item.designation}</Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <View style={styles.deptCodeBadge}>
                            <Text style={styles.deptCodeText}>{item.code}</Text>
                          </View>
                          <TouchableOpacity
                            style={[
                              styles.editFacultyBtn,
                              isDark && { backgroundColor: "rgba(117,69,216,0.2)" },
                            ]}
                            onPress={() => handleOpenEditFaculty(item)}
                          >
                            <Ionicons name="pencil-outline" size={15} color="#7545D8" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.deleteFacultyBtn,
                              isDark && { backgroundColor: "rgba(239,68,68,0.2)" },
                            ]}
                            onPress={() => handleDeleteFaculty(item)}
                          >
                            <Ionicons name="trash-outline" size={15} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                      <Text style={[styles.facultyDept, { color: colors.adminTextSecondary }]}>{item.department}</Text>
                      
                      {item.room ? (
                        <View style={styles.cardDetailRow}>
                          <Ionicons name="location-outline" size={13} color={colors.adminTextSecondary} />
                          <Text style={[styles.cardDetailText, { color: colors.adminTextSecondary }]}>{item.room}</Text>
                        </View>
                      ) : null}

                      <View style={styles.cardContactRow}>
                        {item.phone ? (
                          <View style={styles.cardDetailRow}>
                            <Ionicons name="call-outline" size={13} color="#818CF8" />
                            <Text style={[styles.cardDetailText, { color: "#818CF8" }]}>{item.phone}</Text>
                          </View>
                        ) : null}
                        {item.email ? (
                          <View style={styles.cardDetailRow}>
                            <Ionicons name="mail-outline" size={13} color={colors.adminTextSecondary} />
                            <Text style={[styles.cardDetailText, { color: colors.adminTextSecondary }]} numberOfLines={1}>{item.email}</Text>
                          </View>
                        ) : null}
                      </View>

                      {item.subjects && item.subjects.length > 0 ? (
                        <View style={styles.cardSubjectsRow}>
                          {item.subjects.slice(0, 3).map((sub, idx) => (
                            <View
                              key={idx}
                              style={[
                                styles.cardSubjectChip,
                                { backgroundColor: colors.adminSurfaceAlt },
                              ]}
                            >
                              <Text style={[styles.cardSubjectText, { color: colors.adminText }]}>{sub}</Text>
                            </View>
                          ))}
                          {item.subjects.length > 3 && (
                            <Text style={[styles.cardMoreSubjects, { color: colors.adminTextSecondary }]}>+{item.subjects.length - 3} more</Text>
                          )}
                        </View>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {/* ADD FACULTY MODAL */}
      <Modal visible={addModal} transparent animationType="fade" onRequestClose={() => setAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                maxHeight: "90%",
                backgroundColor: colors.adminCard,
                borderColor: colors.adminCardBorder,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.adminText }]}>Add Faculty Member</Text>
                <Text style={[styles.modalSubtitle, { color: colors.adminTextSecondary }]}>Directly syncs to student faculty directory</Text>
              </View>
              <TouchableOpacity onPress={() => setAddModal(false)}>
                <Ionicons name="close" size={24} color={colors.adminTextSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
              {/* Photo Upload Section */}
              <View style={styles.photoUploadSection}>
                <Image source={{ uri: avatarInput }} style={styles.photoPreviewLarge} />
                <View style={styles.photoButtonsCol}>
                  <Text style={[styles.photoSectionTitle, { color: colors.adminText }]}>Faculty Profile Photo</Text>
                  <View style={styles.photoBtnRow}>
                    <TouchableOpacity
                      style={[styles.photoPickerBtn, { backgroundColor: colors.adminSurfaceAlt }]}
                      onPress={() => handlePickPhoto(false)}
                    >
                      <Ionicons name="image-outline" size={15} color="#7545D8" />
                      <Text style={[styles.photoPickerBtnText, { color: colors.adminText }]}>Gallery</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.photoPickerBtn, { backgroundColor: colors.adminSurfaceAlt }]}
                      onPress={() => handleTakePhoto(false)}
                    >
                      <Ionicons name="camera-outline" size={15} color="#7545D8" />
                      <Text style={[styles.photoPickerBtnText, { color: colors.adminText }]}>Camera</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={[
                      styles.modalInput,
                      {
                        marginTop: 8,
                        fontSize: 11,
                        paddingVertical: 6,
                        backgroundColor: colors.adminInputBg,
                        borderColor: colors.adminInputBorder,
                        color: colors.adminText,
                      },
                    ]}
                    placeholderTextColor={colors.adminTextSecondary}
                    placeholder="Or enter image URL (https://...)"
                    value={avatarInput}
                    onChangeText={setAvatarInput}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Full Name *</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: colors.adminInputBg,
                      borderColor: colors.adminInputBorder,
                      color: colors.adminText,
                    },
                  ]}
                  placeholderTextColor={colors.adminTextSecondary}
                  placeholder="e.g. Dr. Ganesh Sharma"
                  value={nameInput}
                  onChangeText={setNameInput}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Designation / Role *</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: colors.adminInputBg,
                      borderColor: colors.adminInputBorder,
                      color: colors.adminText,
                    },
                  ]}
                  placeholderTextColor={colors.adminTextSecondary}
                  placeholder="e.g. Associate Professor & HOD"
                  value={designationInput}
                  onChangeText={setDesignationInput}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Department</Text>
                <View style={styles.deptSelectRow}>
                  {(["CSE", "ECE", "ME", "BSH"] as const).map((code) => (
                    <TouchableOpacity
                      key={code}
                      style={[
                        styles.deptChoiceBtn,
                        {
                          backgroundColor:
                            deptInput === code ? "#7545D8" : colors.adminSurfaceAlt,
                        },
                      ]}
                      onPress={() => setDeptInput(code)}
                    >
                      <Text
                        style={[
                          styles.deptChoiceText,
                          {
                            color:
                              deptInput === code ? "#FFFFFF" : colors.adminTextSecondary,
                          },
                        ]}
                      >
                        {code}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Phone Number</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: colors.adminInputBg,
                      borderColor: colors.adminInputBorder,
                      color: colors.adminText,
                    },
                  ]}
                  placeholderTextColor={colors.adminTextSecondary}
                  placeholder="e.g. +91 98765 43210"
                  value={phoneInput}
                  onChangeText={setPhoneInput}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Email Address</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: colors.adminInputBg,
                      borderColor: colors.adminInputBorder,
                      color: colors.adminText,
                    },
                  ]}
                  placeholderTextColor={colors.adminTextSecondary}
                  placeholder="e.g. ganesh.sharma@campusly.edu"
                  value={emailInput}
                  onChangeText={setEmailInput}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Cabin / Room Location</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: colors.adminInputBg,
                      borderColor: colors.adminInputBorder,
                      color: colors.adminText,
                    },
                  ]}
                  placeholderTextColor={colors.adminTextSecondary}
                  placeholder="e.g. Cabin 304, Academic Block B"
                  value={roomInput}
                  onChangeText={setRoomInput}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Subjects Taught (comma-separated)</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: colors.adminInputBg,
                      borderColor: colors.adminInputBorder,
                      color: colors.adminText,
                    },
                  ]}
                  placeholderTextColor={colors.adminTextSecondary}
                  placeholder="e.g. Data Structures, Algorithms, OS"
                  value={subjectsInput}
                  onChangeText={setSubjectsInput}
                />
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: colors.adminCardBorder }]}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: colors.adminSurfaceAlt }]}
                onPress={() => setAddModal(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.adminTextSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleAddFaculty}
              >
                <Text style={styles.modalSubmitText}>Add Member</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* EDIT FACULTY MODAL */}
      <Modal visible={editModal} transparent animationType="fade" onRequestClose={() => setEditModal(false)}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                maxHeight: "90%",
                backgroundColor: colors.adminCard,
                borderColor: colors.adminCardBorder,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.adminText }]}>Update Faculty Profile</Text>
                <Text style={[styles.modalSubtitle, { color: colors.adminTextSecondary }]}>Directly updates in student view in real-time</Text>
              </View>
              <TouchableOpacity onPress={() => setEditModal(false)}>
                <Ionicons name="close" size={24} color={colors.adminTextSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
              {/* Photo Upload Section */}
              <View style={styles.photoUploadSection}>
                <Image source={{ uri: editAvatarInput }} style={styles.photoPreviewLarge} />
                <View style={styles.photoButtonsCol}>
                  <Text style={[styles.photoSectionTitle, { color: colors.adminText }]}>Faculty Profile Photo</Text>
                  <View style={styles.photoBtnRow}>
                    <TouchableOpacity
                      style={[styles.photoPickerBtn, { backgroundColor: colors.adminSurfaceAlt }]}
                      onPress={() => handlePickPhoto(true)}
                    >
                      <Ionicons name="image-outline" size={15} color="#7545D8" />
                      <Text style={[styles.photoPickerBtnText, { color: colors.adminText }]}>Gallery</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.photoPickerBtn, { backgroundColor: colors.adminSurfaceAlt }]}
                      onPress={() => handleTakePhoto(true)}
                    >
                      <Ionicons name="camera-outline" size={15} color="#7545D8" />
                      <Text style={[styles.photoPickerBtnText, { color: colors.adminText }]}>Camera</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={[
                      styles.modalInput,
                      {
                        marginTop: 8,
                        fontSize: 11,
                        paddingVertical: 6,
                        backgroundColor: colors.adminInputBg,
                        borderColor: colors.adminInputBorder,
                        color: colors.adminText,
                      },
                    ]}
                    placeholderTextColor={colors.adminTextSecondary}
                    placeholder="Or enter image URL (https://...)"
                    value={editAvatarInput}
                    onChangeText={setEditAvatarInput}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Full Name *</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: colors.adminInputBg,
                      borderColor: colors.adminInputBorder,
                      color: colors.adminText,
                    },
                  ]}
                  placeholderTextColor={colors.adminTextSecondary}
                  placeholder="e.g. Dr. Ganesh Sharma"
                  value={editNameInput}
                  onChangeText={setEditNameInput}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Designation / Role *</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: colors.adminInputBg,
                      borderColor: colors.adminInputBorder,
                      color: colors.adminText,
                    },
                  ]}
                  placeholderTextColor={colors.adminTextSecondary}
                  placeholder="e.g. Associate Professor & HOD"
                  value={editDesignationInput}
                  onChangeText={setEditDesignationInput}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Department</Text>
                <View style={styles.deptSelectRow}>
                  {(["CSE", "ECE", "ME", "BSH"] as const).map((code) => (
                    <TouchableOpacity
                      key={code}
                      style={[
                        styles.deptChoiceBtn,
                        {
                          backgroundColor:
                            editDeptInput === code ? "#7545D8" : colors.adminSurfaceAlt,
                        },
                      ]}
                      onPress={() => setEditDeptInput(code)}
                    >
                      <Text
                        style={[
                          styles.deptChoiceText,
                          {
                            color:
                              editDeptInput === code ? "#FFFFFF" : colors.adminTextSecondary,
                          },
                        ]}
                      >
                        {code}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Phone Number</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: colors.adminInputBg,
                      borderColor: colors.adminInputBorder,
                      color: colors.adminText,
                    },
                  ]}
                  placeholderTextColor={colors.adminTextSecondary}
                  placeholder="e.g. +91 98765 43210"
                  value={editPhoneInput}
                  onChangeText={setEditPhoneInput}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Email Address</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: colors.adminInputBg,
                      borderColor: colors.adminInputBorder,
                      color: colors.adminText,
                    },
                  ]}
                  placeholderTextColor={colors.adminTextSecondary}
                  placeholder="e.g. ganesh.sharma@campusly.edu"
                  value={editEmailInput}
                  onChangeText={setEditEmailInput}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Cabin / Room Location</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: colors.adminInputBg,
                      borderColor: colors.adminInputBorder,
                      color: colors.adminText,
                    },
                  ]}
                  placeholderTextColor={colors.adminTextSecondary}
                  placeholder="e.g. Cabin 304, Academic Block B"
                  value={editRoomInput}
                  onChangeText={setEditRoomInput}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Subjects Taught (comma-separated)</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: colors.adminInputBg,
                      borderColor: colors.adminInputBorder,
                      color: colors.adminText,
                    },
                  ]}
                  placeholderTextColor={colors.adminTextSecondary}
                  placeholder="e.g. Data Structures, Algorithms, OS"
                  value={editSubjectsInput}
                  onChangeText={setEditSubjectsInput}
                />
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: colors.adminCardBorder }]}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: colors.adminSurfaceAlt }]}
                onPress={() => setEditModal(false)}
                disabled={savingEdit}
              >
                <Text style={[styles.modalCancelText, { color: colors.adminTextSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: "#7545D8" }]}
                onPress={handleSaveEditFaculty}
                disabled={savingEdit}
              >
                {savingEdit ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#2A174E",
  },
  mainLayout: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
  },
  sidebar: {
    width: 250,
    backgroundColor: "#2A174E",
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRightWidth: 1,
    borderRightColor: "#3B2268",
    justifyContent: "space-between",
  },
  mobileSidebar: {
    width: 280,
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 999,
  },
  sidebarBrand: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 26,
    paddingHorizontal: 6,
  },
  brandIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#5D3EBC",
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 11,
    color: "#A78BFA",
    fontWeight: "500",
  },
  closeSidebarBtn: {
    marginLeft: "auto",
    padding: 6,
  },
  sidebarNavScroll: {
    paddingVertical: 6,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 4,
  },
  navItemActive: {
    backgroundColor: "#5D3EBC",
  },
  navItemLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    marginLeft: 12,
    fontWeight: "500",
  },
  navItemLabelActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  sidebarLogout: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    marginTop: 6,
  },
  sidebarLogoutText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    marginLeft: 12,
    fontWeight: "600",
  },
  mobileModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    flexDirection: "row",
  },
  contentArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  menuHamburger: {
    marginRight: 14,
    padding: 4,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 500,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
    marginLeft: 8,
  },
  topRightRow: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 16,
    gap: 10,
  },
  addFacultyHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4F46E5",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 4,
  },
  addFacultyHeaderText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  adminAvatarSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#4F46E5",
    alignItems: "center",
    justifyContent: "center",
  },
  adminBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4338CA",
    marginLeft: 8,
  },
  scrollContent: {
    padding: 24,
  },
  headingGroup: {
    marginBottom: 16,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
  },
  mainSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  filterPillsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#E2E8F0",
  },
  filterPillActive: {
    backgroundColor: "#4F46E5",
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  filterPillTextActive: {
    color: "#FFFFFF",
  },
  facultyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  facultyCard: {
    flex: 1,
    minWidth: 300,
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 14,
  },
  facultyAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  facultyInfo: {
    flex: 1,
  },
  facultyHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  facultyName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  deptCodeBadge: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  deptCodeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4338CA",
  },
  facultyDept: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  facultyPhone: {
    fontSize: 12,
    color: "#4F46E5",
    marginTop: 4,
    fontWeight: "600",
  },
  editFacultyBtn: {
    padding: 6,
    backgroundColor: "#F3EEFD",
    borderRadius: 8,
  },
  deleteFacultyBtn: {
    padding: 6,
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    elevation: 8,
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
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
  },
  deptSelectRow: {
    flexDirection: "row",
    gap: 8,
  },
  deptChoiceBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
  },
  deptChoiceBtnActive: {
    backgroundColor: "#4F46E5",
  },
  deptChoiceText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  deptChoiceTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 10,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  modalSubmitBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: "#4F46E5",
  },
  modalSubmitText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  emptyCard: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginVertical: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  facultyAvatarContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#E0E7FF",
  },
  facultyDesignationText: {
    fontSize: 12,
    color: "#5D3EBC",
    fontWeight: "600",
    marginTop: 2,
  },
  cardDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  cardDetailText: {
    fontSize: 12,
    color: "#64748B",
  },
  cardContactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 4,
  },
  cardSubjectsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 8,
    alignItems: "center",
  },
  cardSubjectChip: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardSubjectText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#475569",
  },
  cardMoreSubjects: {
    fontSize: 10,
    color: "#8B5CF6",
    fontWeight: "600",
  },
  photoUploadSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
    padding: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  photoPreviewLarge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#E2E8F0",
    borderWidth: 2,
    borderColor: "#7C3AED",
  },
  photoButtonsCol: {
    flex: 1,
  },
  photoSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 6,
  },
  photoBtnRow: {
    flexDirection: "row",
    gap: 8,
  },
  photoPickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  photoPickerBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#5D3EBC",
  },
});