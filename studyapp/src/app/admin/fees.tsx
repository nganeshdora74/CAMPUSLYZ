import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { auth, db } from "../../firebase/config";
import { confirmAction, confirmLogout } from "../../firebase/auth";
import { useAppTheme } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";
import AdminThemeToggle from "../../components/admin/AdminThemeToggle";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminTopBar from "../../components/admin/AdminTopBar";

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

export type FeeCategory = "Tuition" | "Hostel" | "Mess" | "Examination" | "Library" | "Other";

export interface StudentFeeRecord {
  id: string;
  fullName: string;
  rollNo: string;
  department: string;
  email: string;
  semester?: string | number;
  totalFees: number;
  paidFees: number;
  remainingFees: number;
  feeStatus: "Paid" | "Partial" | "Pending" | "Overdue";
  lastPaymentDate?: string;
}

export interface FeeItem {
  id: string;
  title: string;
  amount: number;
  status: "Paid" | "Pending";
  isPaid: boolean;
  dueDate: string;
  category: FeeCategory;
  rollNo?: string;
  studentName?: string;
  description?: string;
  createdAt?: any;
  updatedAt?: any;
}

const CATEGORIES: FeeCategory[] = ["Tuition", "Hostel", "Mess", "Examination", "Library", "Other"];

function getCategoryIcon(cat: string): any {
  switch (cat) {
    case "Tuition":
      return "receipt-outline";
    case "Hostel":
      return "business-outline";
    case "Mess":
      return "restaurant-outline";
    case "Examination":
      return "school-outline";
    case "Library":
      return "book-outline";
    default:
      return "cash-outline";
  }
}

export default function AdminFeesScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const { colors, isDark } = useAppTheme();
  const { t } = useLanguage();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [feeItems, setFeeItems] = useState<FeeItem[]>([]);
  const [loading, setLoading] = useState(true);

  // View Mode: "students" (Student List) vs "catalog" (Global Fee Structures)
  const [activeTab, setActiveTab] = useState<"students" | "catalog">("students");

  // Connected Students Fee State
  const [students, setStudents] = useState<StudentFeeRecord[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentDeptFilter, setStudentDeptFilter] = useState("All");

  // Update Student Fees Modal State
  const [feeUpdateModalVisible, setFeeUpdateModalVisible] = useState(false);
  const [selectedStudentForFee, setSelectedStudentForFee] = useState<StudentFeeRecord | null>(null);
  const [editTotalFees, setEditTotalFees] = useState("");
  const [editPaidFees, setEditPaidFees] = useState("");
  const [editRemainingFees, setEditRemainingFees] = useState("");
  const [editFeeStatus, setEditFeeStatus] = useState<"Paid" | "Partial" | "Pending" | "Overdue">("Partial");
  const [paymentAmountInput, setPaymentAmountInput] = useState("");
  const [paymentTitleInput, setPaymentTitleInput] = useState("Semester Fee Installment");
  const [savingStudentFee, setSavingStudentFee] = useState(false);

  // Filter & Search for Global Catalog
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Modal state for catalog
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<FeeItem | null>(null);
  const [titleInput, setTitleInput] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [categoryInput, setCategoryInput] = useState<FeeCategory>("Tuition");
  const [dueDateInput, setDueDateInput] = useState("30 Oct 2026");
  const [statusInput, setStatusInput] = useState<"Paid" | "Pending">("Pending");
  const [rollNoInput, setRollNoInput] = useState("");
  const [descInput, setDescInput] = useState("");
  const [saving, setSaving] = useState(false);

  // Log Query State
  const [queryText, setQueryText] = useState("");
  const [loggingQuery, setLoggingQuery] = useState(false);

  // 1. Realtime Firestore sync with 'users' collection for Connected Student Fees
  useEffect(() => {
    const usersCol = collection(db, "users");
    const unsubscribe = onSnapshot(
      usersCol,
      (snapshot) => {
        const loaded: StudentFeeRecord[] = [];
        snapshot.docs.forEach((docSnap) => {
          const d = docSnap.data();
          const role = (d.role || "").toLowerCase();
          if (role === "admin" || role === "teacher") return;

          const total = typeof d.totalFees === "number" ? d.totalFees : 64000;
          const paid = typeof d.paidFees === "number" ? d.paidFees : 42500;
          const remaining = typeof d.remainingFees === "number" ? d.remainingFees : Math.max(0, total - paid);
          const status = (d.feeStatus as any) || (remaining === 0 ? "Paid" : paid > 0 ? "Partial" : "Pending");

          loaded.push({
            id: docSnap.id,
            fullName: d.fullName || d.name || "Student",
            rollNo: d.rollNo || "23CSE001",
            department: d.department || "CSE",
            email: d.email || "",
            semester: d.semester || "4",
            totalFees: total,
            paidFees: paid,
            remainingFees: remaining,
            feeStatus: status,
            lastPaymentDate: d.lastPaymentDate || "Recently",
          });
        });
        setStudents(loaded);
        setLoadingStudents(false);
      },
      (err) => {
        console.warn("Connected students fees listener error:", err);
        setStudents([]);
        setLoadingStudents(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // 2. Realtime Firestore sync with 'fees' collection for Catalog
  useEffect(() => {
    const feesCol = collection(db, "fees");
    const unsubscribe = onSnapshot(
      feesCol,
      (snapshot) => {
        const loaded: FeeItem[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          const amountNum = typeof d.amount === "number" ? d.amount : parseFloat(String(d.amount).replace(/[^0-9.]/g, "")) || 0;
          const isPaid = d.isPaid === true || d.status === "Paid";
          return {
            id: docSnap.id,
            title: d.title || "Academic Fee",
            amount: amountNum,
            status: isPaid ? "Paid" : "Pending",
            isPaid,
            dueDate: d.dueDate || "30 Oct 2026",
            category: (d.category || "Tuition") as FeeCategory,
            rollNo: d.rollNo || "",
            studentName: d.studentName || "",
            description: d.description || "",
            createdAt: d.createdAt,
            updatedAt: d.updatedAt,
          };
        });

        // Sort descending by amount or creation
        loaded.sort((a, b) => b.amount - a.amount);
        setFeeItems(loaded);
        setLoading(false);
      },
      (err) => {
        console.warn("Fees snapshot warning:", err);
        setFeeItems([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Compute dynamic totals
  const totalAmount = feeItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  const paidAmount = feeItems
    .filter((item) => item.isPaid || item.status === "Paid")
    .reduce((sum, item) => sum + (item.amount || 0), 0);
  const pendingAmount = totalAmount - paidAmount;

  const filteredItems = feeItems.filter((item) => {
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    const matchesSearch =
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      (item.rollNo && item.rollNo.toLowerCase().includes(search.toLowerCase())) ||
      item.category.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Student List Filter & Calculations
  const filteredStudents = students.filter((s) => {
    const matchesDept = studentDeptFilter === "All" || s.department.toUpperCase().includes(studentDeptFilter.toUpperCase());
    const matchesSearch =
      s.fullName.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.rollNo.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.email.toLowerCase().includes(studentSearch.toLowerCase());
    return matchesDept && matchesSearch;
  });

  const totalStudentFees = students.reduce((sum, s) => sum + s.totalFees, 0);
  const totalStudentPaid = students.reduce((sum, s) => sum + s.paidFees, 0);
  const totalStudentRemaining = students.reduce((sum, s) => sum + s.remainingFees, 0);

  const handleOpenStudentFeeUpdate = (student: StudentFeeRecord) => {
    setSelectedStudentForFee(student);
    setEditTotalFees(String(student.totalFees));
    setEditPaidFees(String(student.paidFees));
    setEditRemainingFees(String(student.remainingFees));
    setEditFeeStatus(student.feeStatus);
    setPaymentAmountInput("");
    setPaymentTitleInput("Semester Fee Installment");
    setFeeUpdateModalVisible(true);
  };

  const handleSaveStudentFeeUpdate = async () => {
    if (!selectedStudentForFee) return;

    const parsedTotal = parseFloat(editTotalFees.replace(/[^0-9.]/g, "")) || 0;
    const parsedPaid = parseFloat(editPaidFees.replace(/[^0-9.]/g, "")) || 0;
    const extraPayment = parseFloat(paymentAmountInput.replace(/[^0-9.]/g, "")) || 0;
    const finalPaid = extraPayment > 0 ? parsedPaid + extraPayment : parsedPaid;
    const finalRemaining = Math.max(0, parsedTotal - finalPaid);
    const finalStatus: "Paid" | "Partial" | "Pending" | "Overdue" =
      finalRemaining === 0 ? "Paid" : finalPaid > 0 ? "Partial" : editFeeStatus;

    setSavingStudentFee(true);
    try {
      // 1. Update the student's main user record in users/{uid}
      await updateDoc(doc(db, "users", selectedStudentForFee.id), {
        totalFees: parsedTotal,
        paidFees: finalPaid,
        remainingFees: finalRemaining,
        feeStatus: finalStatus,
        lastPaymentDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        updatedAt: serverTimestamp(),
      });

      // 2. If a specific payment installment was entered, log to users/{uid}/fees_breakdown
      if (extraPayment > 0) {
        await addDoc(collection(db, "users", selectedStudentForFee.id, "fees_breakdown"), {
          title: paymentTitleInput.trim() || "Fee Payment",
          amount: extraPayment,
          status: "Paid",
          category: "Tuition",
          dueDate: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          paidAt: serverTimestamp(),
        });
      }

      // 3. Log Activity
      await addDoc(collection(db, "activities"), {
        title: `Fees Updated: ${selectedStudentForFee.fullName} (Paid: ₹${finalPaid.toLocaleString("en-IN")}, Remaining: ₹${finalRemaining.toLocaleString("en-IN")})`,
        time: "Just now",
        user: "Admin",
        type: "fees",
        createdAt: serverTimestamp(),
      });

      setFeeUpdateModalVisible(false);
      Alert.alert(
        "Student Fees Updated",
        `Updated ${selectedStudentForFee.fullName}'s fees successfully.\nPaid: ₹${finalPaid.toLocaleString("en-IN")}\nRemaining: ₹${finalRemaining.toLocaleString("en-IN")}\nDirectly updated in the student's app.`
      );
    } catch (e: any) {
      Alert.alert("Error Updating Fees", e?.message || "Could not update student fees.");
    } finally {
      setSavingStudentFee(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setTitleInput("");
    setAmountInput("");
    setCategoryInput("Tuition");
    setDueDateInput("30 Oct 2026");
    setStatusInput("Pending");
    setRollNoInput("");
    setDescInput("");
    setModalVisible(true);
  };

  const handleOpenEditModal = (item: FeeItem) => {
    setEditingItem(item);
    setTitleInput(item.title);
    setAmountInput(String(item.amount));
    setCategoryInput(item.category);
    setDueDateInput(item.dueDate);
    setStatusInput(item.status);
    setRollNoInput(item.rollNo || "");
    setDescInput(item.description || "");
    setModalVisible(true);
  };

  const handleSaveFee = async () => {
    if (!titleInput.trim()) {
      Alert.alert("Missing Title", "Please provide a title for this fee item.");
      return;
    }
    const parsedAmount = parseFloat(amountInput.replace(/[^0-9.]/g, ""));
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      Alert.alert("Invalid Amount", "Please enter a valid numeric fee amount.");
      return;
    }

    setSaving(true);
    const payload = {
      title: titleInput.trim(),
      amount: parsedAmount,
      category: categoryInput,
      dueDate: dueDateInput.trim() || "30 Oct 2026",
      status: statusInput,
      isPaid: statusInput === "Paid",
      rollNo: rollNoInput.trim().toUpperCase() || "ALL",
      description: descInput.trim(),
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingItem) {
        await updateDoc(doc(db, "fees", editingItem.id), payload);
        await addDoc(collection(db, "activities"), {
          title: `Fee Updated: ${titleInput.trim()} (₹ ${parsedAmount.toLocaleString("en-IN")})`,
          time: "Just now",
          user: "Admin",
          type: "fees",
          createdAt: serverTimestamp(),
        });
        Alert.alert("Success", "Fee record updated in Firebase!");
      } else {
        await addDoc(collection(db, "fees"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        await addDoc(collection(db, "activities"), {
          title: `Fee Added: ${titleInput.trim()} (₹ ${parsedAmount.toLocaleString("en-IN")})`,
          time: "Just now",
          user: "Admin",
          type: "fees",
          createdAt: serverTimestamp(),
        });
        Alert.alert("Created", "New fee record has been added to Firebase!");
      }
      setModalVisible(false);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to save fee record.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFee = (item: FeeItem) => {
    confirmAction(
      "Delete Fee Record",
      `Are you sure you want to remove "${item.title}" from Firebase?`,
      async () => {
        try {
          if (!item.id.startsWith("fee-init-")) {
            await deleteDoc(doc(db, "fees", item.id));
          }
          setFeeItems((prev) => prev.filter((f) => f.id !== item.id));
          await addDoc(collection(db, "activities"), {
            title: `Fee Removed: ${item.title}`,
            time: "Just now",
            user: "Admin",
            type: "fees",
            createdAt: serverTimestamp(),
          }).catch(() => {});
          if (Platform.OS === "web") {
            window.alert("Fee record removed from Firebase.");
          } else {
            Alert.alert("Deleted", "Fee record removed from Firebase.");
          }
        } catch (e: any) {
          if (Platform.OS === "web") {
            window.alert(e?.message || "Failed to delete fee record.");
          } else {
            Alert.alert("Error", e?.message || "Failed to delete fee record.");
          }
        }
      },
      "Delete"
    );
  };

  const handleToggleStatus = async (item: FeeItem) => {
    const nextStatus = item.status === "Paid" ? "Pending" : "Paid";
    const nextIsPaid = nextStatus === "Paid";
    try {
      await updateDoc(doc(db, "fees", item.id), {
        status: nextStatus,
        isPaid: nextIsPaid,
        updatedAt: serverTimestamp(),
      });
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to toggle status.");
    }
  };

  const handleSendQuery = async () => {
    if (!queryText.trim()) {
      Alert.alert("Enter Note", "Please type your fee update or announcement.");
      return;
    }
    setLoggingQuery(true);
    try {
      await addDoc(collection(db, "activities"), {
        title: `Fee Notice/Update: ${queryText.trim()}`,
        time: "Just now",
        user: "Admin",
        type: "fees",
        createdAt: serverTimestamp(),
      });
      // Also write to notices collection so students can see it
      await addDoc(collection(db, "notices"), {
        title: "Fee Department Announcement",
        content: queryText.trim(),
        category: "Fees",
        author: "Accounts & Administration",
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        priority: "High",
        createdAt: serverTimestamp(),
      });
      Alert.alert("Published", "Fee update broadcasted to notices and logged in Firebase.");
      setQueryText("");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to log fee update");
    } finally {
      setLoggingQuery(false);
    }
  };

  const handleLogout = () => {
    confirmLogout("Are you sure you want to sign out?");
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.adminSidebar }]} edges={["top", "left", "right"]}>
      <View style={[styles.mainLayout, { backgroundColor: colors.adminBg }]}>
        <AdminSidebar
          activeNav="fees"
          isDesktop={isDesktop}
          mobileMenuOpen={mobileMenuOpen}
          onCloseMobileMenu={() => setMobileMenuOpen(false)}
        />

        {/* Main Workspace */}
        <View style={[styles.contentArea, { backgroundColor: colors.adminBg }]}>
          <AdminTopBar
            title="Fee Management"
            subtitle="Dynamic Firebase Records & Realtime Tracking"
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
            rightActions={
              <TouchableOpacity
                style={styles.addFeeHeaderBtn}
                onPress={handleOpenAddModal}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.addFeeHeaderBtnText}>+ Add Fee Record</Text>
              </TouchableOpacity>
            }
          />

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* VIEW MODE SWITCHER: STUDENT LIST VS CATALOG */}
            <View style={[styles.mainTabSwitchRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TouchableOpacity
                style={[
                  styles.mainTabSwitchBtn,
                  activeTab === "students" && { backgroundColor: colors.primary },
                ]}
                onPress={() => setActiveTab("students")}
              >
                <Ionicons
                  name="people"
                  size={18}
                  color={activeTab === "students" ? "#FFFFFF" : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.mainTabSwitchText,
                    { color: activeTab === "students" ? "#FFFFFF" : colors.textSecondary },
                    activeTab === "students" && { fontWeight: "700" },
                  ]}
                >
                  Student List ({students.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.mainTabSwitchBtn,
                  activeTab === "catalog" && { backgroundColor: colors.primary },
                ]}
                onPress={() => setActiveTab("catalog")}
              >
                <Ionicons
                  name="list"
                  size={18}
                  color={activeTab === "catalog" ? "#FFFFFF" : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.mainTabSwitchText,
                    { color: activeTab === "catalog" ? "#FFFFFF" : colors.textSecondary },
                    activeTab === "catalog" && { fontWeight: "700" },
                  ]}
                >
                  Fee Structures ({feeItems.length})
                </Text>
              </TouchableOpacity>
            </View>

            {activeTab === "students" ? (
              <View>
                {/* HERO CARD: STUDENT REMAINING DUES */}
                <View style={[styles.heroCard, { backgroundColor: "#4F46E5" }]}>
                  <View style={styles.heroTopRow}>
                    <View style={styles.heroIconBox}>
                      <Ionicons name="wallet" size={24} color="#FFFFFF" />
                    </View>
                    <View style={styles.dueSoonBadge}>
                      <Text style={styles.dueSoonText}>Realtime Sync</Text>
                    </View>
                  </View>

                  <Text style={styles.heroLabel}>Total Remaining Portion (All Students)</Text>
                  <Text style={styles.heroAmount}>
                    ₹ {totalStudentRemaining.toLocaleString("en-IN")}
                  </Text>
                  <Text style={styles.heroDueDate}>
                    Across {students.length} connected students • Total: ₹ {totalStudentFees.toLocaleString("en-IN")}
                  </Text>
                </View>

                {/* 3 STAT CARDS ROW */}
                <View style={styles.statGrid}>
                  <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.statIconCircle, { backgroundColor: colors.primaryLight }]}>
                      <Ionicons name="cash" size={16} color={colors.primary} />
                    </View>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Student Fees</Text>
                    <Text style={[styles.statVal, { color: colors.text }]}>
                      ₹ {totalStudentFees.toLocaleString("en-IN")}
                    </Text>
                  </View>

                  <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.statIconCircle, { backgroundColor: "#ECFDF5" }]}>
                      <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    </View>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Paid Portion</Text>
                    <Text style={[styles.statVal, { color: "#10B981" }]}>
                      ₹ {totalStudentPaid.toLocaleString("en-IN")}
                    </Text>
                  </View>

                  <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.statIconCircle, { backgroundColor: "#FFF7ED" }]}>
                      <Ionicons name="time" size={16} color="#EA580C" />
                    </View>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Remaining Portion</Text>
                    <Text style={[styles.statVal, { color: "#EA580C" }]}>
                      ₹ {totalStudentRemaining.toLocaleString("en-IN")}
                    </Text>
                  </View>
                </View>

                {/* DEPARTMENT FILTER PILLS */}
                <View style={styles.filterSection}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                    {["All", "CSE", "ECE", "ME", "Civil", "IT", "BSH"].map((dept) => {
                      const isSelected = studentDeptFilter === dept;
                      return (
                        <TouchableOpacity
                          key={dept}
                          style={[
                            styles.filterChip,
                            { borderColor: colors.border, backgroundColor: isSelected ? colors.primary : colors.card },
                          ]}
                          onPress={() => setStudentDeptFilter(dept)}
                        >
                          <Text
                            style={[
                              styles.filterChipText,
                              { color: isSelected ? "#FFFFFF" : colors.textSecondary, fontWeight: isSelected ? "700" : "500" },
                            ]}
                          >
                            {dept}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* SEARCH BAR */}
                <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
                  <TextInput
                    style={[styles.searchInput, { color: colors.text }]}
                    placeholder="Search connected student by name, roll no, or email..."
                    placeholderTextColor={colors.textMuted}
                    value={studentSearch}
                    onChangeText={setStudentSearch}
                  />
                  {studentSearch.length > 0 && (
                    <TouchableOpacity onPress={() => setStudentSearch("")}>
                      <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* STUDENT LIST CARDS */}
                <View style={[styles.breakdownCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.breakdownHeaderRow}>
                    <View>
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>Connected Students Fee Status</Text>
                      <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                        Teachers can update fees here and it directly updates for students
                      </Text>
                    </View>
                    <View style={styles.liveTagBadge}>
                      <View style={styles.greenDot} />
                      <Text style={styles.liveTagText}>Sync Active</Text>
                    </View>
                  </View>

                  {loadingStudents ? (
                    <View style={{ paddingVertical: 40, alignItems: "center" }}>
                      <ActivityIndicator size="large" color={colors.primary} />
                      <Text style={{ marginTop: 10, color: colors.textSecondary, fontSize: 13 }}>
                        Loading students from Firebase...
                      </Text>
                    </View>
                  ) : filteredStudents.length === 0 ? (
                    <View style={{ paddingVertical: 40, alignItems: "center" }}>
                      <Ionicons name="people-outline" size={48} color={colors.textMuted} />
                      <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text, marginTop: 12 }}>
                        No Students Found
                      </Text>
                      <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
                        {studentSearch ? "No students match your search." : "No student accounts connected yet."}
                      </Text>
                    </View>
                  ) : (
                    <View style={{ gap: 14 }}>
                      {filteredStudents.map((s) => {
                        const pct = s.totalFees > 0 ? Math.min(100, Math.round((s.paidFees / s.totalFees) * 100)) : 0;
                        const isFullyPaid = s.remainingFees <= 0;
                        const isPartial = s.paidFees > 0 && s.remainingFees > 0;

                        return (
                          <View
                            key={s.id}
                            style={[
                              styles.studentFeeCard,
                              { backgroundColor: isDark ? "#1E293B" : "#F8FAFC", borderColor: colors.border },
                            ]}
                          >
                            <View style={styles.studentCardHeader}>
                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                  <Text style={[styles.studentCardName, { color: colors.text }]}>{s.fullName}</Text>
                                  <View style={[styles.deptBadge, { backgroundColor: colors.primaryLight }]}>
                                    <Text style={[styles.deptBadgeText, { color: colors.primary }]}>{s.department}</Text>
                                  </View>
                                </View>
                                <Text style={[styles.studentCardRoll, { color: colors.textSecondary }]}>
                                  Roll No: {s.rollNo} • Sem {s.semester} {s.email ? `• ${s.email}` : ""}
                                </Text>
                              </View>

                              {/* Status Badge */}
                              <View
                                style={[
                                  styles.studentStatusBadge,
                                  isFullyPaid
                                    ? { backgroundColor: "#DCFCE7" }
                                    : isPartial
                                    ? { backgroundColor: "#FEF3C7" }
                                    : { backgroundColor: "#FEE2E2" },
                                ]}
                              >
                                <Ionicons
                                  name={isFullyPaid ? "checkmark-circle" : isPartial ? "pie-chart" : "alert-circle"}
                                  size={13}
                                  color={isFullyPaid ? "#16A34A" : isPartial ? "#D97706" : "#EF4444"}
                                  style={{ marginRight: 3 }}
                                />
                                <Text
                                  style={[
                                    styles.studentStatusText,
                                    { color: isFullyPaid ? "#16A34A" : isPartial ? "#D97706" : "#EF4444" },
                                  ]}
                                >
                                  {isFullyPaid ? "Fully Paid" : isPartial ? "Partial Paid" : "Pending"}
                                </Text>
                              </View>
                            </View>

                            {/* Progress bar */}
                            <View style={styles.progressBarBg}>
                              <View style={[styles.progressBarFill, { width: `${pct}%`, backgroundColor: isFullyPaid ? "#10B981" : "#4F46E5" }]} />
                            </View>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                              <Text style={{ fontSize: 11, color: colors.textSecondary }}>{pct}% Paid</Text>
                              <Text style={{ fontSize: 11, color: colors.textMuted }}>Last updated: {s.lastPaymentDate}</Text>
                            </View>

                            {/* 3 Metrics Row */}
                            <View style={styles.metricsRow}>
                              <View style={[styles.metricBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Total Fee</Text>
                                <Text style={[styles.metricValue, { color: colors.text }]}>₹ {s.totalFees.toLocaleString("en-IN")}</Text>
                              </View>
                              <View style={[styles.metricBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Text style={[styles.metricLabel, { color: "#16A34A" }]}>Paid Portion</Text>
                                <Text style={[styles.metricValue, { color: "#16A34A" }]}>₹ {s.paidFees.toLocaleString("en-IN")}</Text>
                              </View>
                              <View style={[styles.metricBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Text style={[styles.metricLabel, { color: isFullyPaid ? "#16A34A" : "#EF4444" }]}>Remaining Portion</Text>
                                <Text style={[styles.metricValue, { color: isFullyPaid ? "#16A34A" : "#EF4444" }]}>
                                  ₹ {s.remainingFees.toLocaleString("en-IN")}
                                </Text>
                              </View>
                            </View>

                            {/* Update Button */}
                            <TouchableOpacity
                              style={[styles.updateStudentFeeBtn, { backgroundColor: colors.primary }]}
                              onPress={() => handleOpenStudentFeeUpdate(s)}
                            >
                              <Ionicons name="create-outline" size={16} color="#FFFFFF" />
                              <Text style={styles.updateStudentFeeBtnText}>Update Student Fees & Portions</Text>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              </View>
            ) : (
              /* CATALOG / GLOBAL STRUCTURES VIEW */
              <View>
                {/* HERO CARD: PENDING AMOUNT */}
                <View style={styles.heroCard}>
                  <View style={styles.heroTopRow}>
                    <View style={styles.heroIconBox}>
                      <Ionicons name="wallet" size={24} color="#FFFFFF" />
                    </View>
                    <View style={styles.dueSoonBadge}>
                      <Text style={styles.dueSoonText}>Live Sync</Text>
                    </View>
                  </View>

                  <Text style={styles.heroLabel}>Total Pending Collection</Text>
                  <Text style={styles.heroAmount}>
                    ₹ {pendingAmount.toLocaleString("en-IN")}
                  </Text>
                  <Text style={styles.heroDueDate}>
                    Across {feeItems.length} active fee structures in Firebase
                  </Text>
                </View>

                {/* 3 STAT CARDS ROW */}
                <View style={styles.statGrid}>
                  <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.statIconCircle, { backgroundColor: colors.primaryLight }]}>
                      <Ionicons name="cash" size={16} color={colors.primary} />
                    </View>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Scheduled</Text>
                    <Text style={[styles.statVal, { color: colors.text }]}>
                      ₹ {totalAmount.toLocaleString("en-IN")}
                    </Text>
                  </View>

                  <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.statIconCircle, { backgroundColor: "#ECFDF5" }]}>
                      <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    </View>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Collected / Paid</Text>
                    <Text style={[styles.statVal, { color: "#10B981" }]}>
                      ₹ {paidAmount.toLocaleString("en-IN")}
                    </Text>
                  </View>

                  <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.statIconCircle, { backgroundColor: "#FFF7ED" }]}>
                      <Ionicons name="time" size={16} color="#EA580C" />
                    </View>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending Amount</Text>
                    <Text style={[styles.statVal, { color: "#EA580C" }]}>
                      ₹ {pendingAmount.toLocaleString("en-IN")}
                    </Text>
                  </View>
                </View>

                {/* CATEGORY FILTER CHIPS */}
                <View style={styles.filterSection}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                    {["All", ...CATEGORIES].map((cat) => {
                      const isSelected = selectedCategory === cat;
                      return (
                        <TouchableOpacity
                          key={cat}
                          style={[
                            styles.filterChip,
                            { borderColor: colors.border, backgroundColor: isSelected ? colors.primary : colors.card },
                          ]}
                          onPress={() => setSelectedCategory(cat)}
                        >
                          <Text
                            style={[
                              styles.filterChipText,
                              { color: isSelected ? "#FFFFFF" : colors.textSecondary, fontWeight: isSelected ? "700" : "500" },
                            ]}
                          >
                            {cat}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* SEARCH BAR */}
                <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
                  <TextInput
                    style={[styles.searchInput, { color: colors.text }]}
                    placeholder="Search fee by title, roll number, or category..."
                    placeholderTextColor={colors.textMuted}
                    value={search}
                    onChangeText={setSearch}
                  />
                  {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch("")}>
                      <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* FEE BREAKDOWN CARD */}
                <View style={[styles.breakdownCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.breakdownHeaderRow}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Fee Breakdown & Actions</Text>
                    <TouchableOpacity style={styles.smallAddBtn} onPress={handleOpenAddModal}>
                      <Ionicons name="add" size={16} color="#FFFFFF" />
                      <Text style={styles.smallAddBtnText}>Add Fee</Text>
                    </TouchableOpacity>
                  </View>

                  {loading ? (
                    <View style={{ paddingVertical: 40, alignItems: "center" }}>
                      <ActivityIndicator size="large" color={colors.primary} />
                      <Text style={{ marginTop: 10, color: colors.textSecondary, fontSize: 13 }}>
                        Loading fee structures from Firebase...
                      </Text>
                    </View>
                  ) : filteredItems.length === 0 ? (
                    <View style={{ paddingVertical: 50, alignItems: "center" }}>
                      <Ionicons name="wallet-outline" size={48} color={colors.textMuted} />
                      <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text, marginTop: 12 }}>
                        No Fee Records Found
                      </Text>
                      <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: "center", marginTop: 4, marginBottom: 16 }}>
                        {search ? "No fee records match your query." : "No fee structures configured in Firebase yet."}
                      </Text>
                      <TouchableOpacity style={styles.smallAddBtn} onPress={handleOpenAddModal}>
                        <Ionicons name="add" size={16} color="#FFFFFF" />
                        <Text style={styles.smallAddBtnText}>Create New Fee Record</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.feeList}>
                      {filteredItems.map((item) => (
                        <View
                          key={item.id}
                          style={[styles.feeRow, { borderBottomColor: colors.border }]}
                        >
                          <View style={styles.feeLeftGroup}>
                            <View
                              style={[
                                styles.feeIconCircle,
                                item.isPaid ? styles.paidBg : styles.pendingBg,
                              ]}
                            >
                              <Ionicons
                                name={getCategoryIcon(item.category)}
                                size={18}
                                color={item.isPaid ? "#10B981" : "#EA580C"}
                              />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.feeTitle, { color: colors.text }]}>{item.title}</Text>
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
                                <Text style={[styles.feeAmount, { color: colors.primary, fontWeight: "700" }]}>
                                  ₹ {item.amount.toLocaleString("en-IN")}
                                </Text>
                                <Text style={{ fontSize: 11, color: colors.textSecondary }}>• Due: {item.dueDate}</Text>
                                {!!item.rollNo && (
                                  <Text style={{ fontSize: 11, color: colors.textSecondary }}>• Roll: {item.rollNo}</Text>
                                )}
                              </View>
                              {!!item.description && (
                                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }} numberOfLines={1}>
                                  {item.description}
                                </Text>
                              )}
                            </View>
                          </View>

                          {/* Right Action buttons */}
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            {/* Quick Toggle Status */}
                            <TouchableOpacity
                              style={[
                                styles.statusBadge,
                                item.isPaid ? styles.paidBadge : styles.pendingBadge,
                              ]}
                              onPress={() => handleToggleStatus(item)}
                            >
                              <Ionicons
                                name={item.isPaid ? "checkmark-circle" : "time-outline"}
                                size={13}
                                color={item.isPaid ? "#10B981" : "#EA580C"}
                                style={{ marginRight: 3 }}
                              />
                              <Text
                                style={[
                                  styles.statusText,
                                  item.isPaid ? styles.paidText : styles.pendingText,
                                ]}
                              >
                                {item.status}
                              </Text>
                            </TouchableOpacity>

                            {/* Edit Button */}
                            <TouchableOpacity
                              style={[styles.actionIconBtn, { backgroundColor: colors.primaryLight }]}
                              onPress={() => handleOpenEditModal(item)}
                            >
                              <Ionicons name="pencil" size={14} color={colors.primary} />
                            </TouchableOpacity>

                            {/* Delete Button */}
                            <TouchableOpacity
                              style={[styles.actionIconBtn, { backgroundColor: "#FEE2E2" }]}
                              onPress={() => handleDeleteFee(item)}
                            >
                              <Ionicons name="trash-outline" size={14} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* FEE NOTICE & BROADCAST INPUT */}
                <View style={[styles.queryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.queryTitle, { color: colors.text }]}>Broadcast Fee Notice to Students</Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 10 }}>
                    Publish fee deadlines, payment instructions, or penalty alerts to Firebase notices.
                  </Text>
                  <TextInput
                    style={[
                      styles.queryInput,
                      { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text },
                    ]}
                    placeholder="e.g. Last date for semester 4 tuition fee without fine is 30 Oct 2026..."
                    placeholderTextColor={colors.textMuted}
                    value={queryText}
                    onChangeText={setQueryText}
                    multiline
                    numberOfLines={3}
                  />
                  <TouchableOpacity
                    style={[styles.sendButton, { backgroundColor: colors.primary }]}
                    onPress={handleSendQuery}
                    disabled={loggingQuery}
                  >
                    {loggingQuery ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.sendButtonText}>Broadcast Notice to Firebase</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>

      {/* UPDATE STUDENT FEES MODAL */}
      <Modal
        visible={feeUpdateModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFeeUpdateModalVisible(false)}
      >
        <Pressable style={[styles.modalBackdrop, { backgroundColor: colors.modalOverlay }]} onPress={() => setFeeUpdateModalVisible(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Update Student Fees</Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                  Directly synchronizes to student app in real-time
                </Text>
              </View>
              <TouchableOpacity onPress={() => setFeeUpdateModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedStudentForFee && (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
                {/* Student Banner */}
                <View style={[styles.studentBannerBox, { backgroundColor: colors.primaryLight, borderColor: colors.border }]}>
                  <Ionicons name="person-circle-outline" size={28} color={colors.primary} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={[styles.bannerStudentName, { color: colors.primary }]}>{selectedStudentForFee.fullName}</Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                      Roll No: {selectedStudentForFee.rollNo} • {selectedStudentForFee.department}
                    </Text>
                  </View>
                </View>

                {/* Total Fees */}
                <Text style={[styles.modalInputLabel, { color: colors.text, marginTop: 14 }]}>Total Course Fees (₹) *</Text>
                <TextInput
                  style={[styles.modalTextInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  placeholder="e.g. 64000"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={editTotalFees}
                  onChangeText={(val) => {
                    setEditTotalFees(val);
                    const t = parseFloat(val.replace(/[^0-9.]/g, "")) || 0;
                    const p = parseFloat(editPaidFees.replace(/[^0-9.]/g, "")) || 0;
                    setEditRemainingFees(String(Math.max(0, t - p)));
                  }}
                />

                {/* Paid Fees */}
                <Text style={[styles.modalInputLabel, { color: colors.text, marginTop: 14 }]}>Paid Amount / Portion (₹) *</Text>
                <TextInput
                  style={[styles.modalTextInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  placeholder="e.g. 45000"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={editPaidFees}
                  onChangeText={(val) => {
                    setEditPaidFees(val);
                    const t = parseFloat(editTotalFees.replace(/[^0-9.]/g, "")) || 0;
                    const p = parseFloat(val.replace(/[^0-9.]/g, "")) || 0;
                    setEditRemainingFees(String(Math.max(0, t - p)));
                  }}
                />

                {/* Remaining Amount (Auto-Calculated) */}
                <View style={[styles.remainingPreviewBox, { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5" }]}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#991B1B" }}>Remaining Portion (Auto-Calculated):</Text>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: "#DC2626", marginTop: 2 }}>
                    ₹ {(Math.max(0, (parseFloat(editTotalFees.replace(/[^0-9.]/g, "")) || 0) - (parseFloat(editPaidFees.replace(/[^0-9.]/g, "")) || 0))).toLocaleString("en-IN")}
                  </Text>
                </View>

                {/* Fee Status */}
                <Text style={[styles.modalInputLabel, { color: colors.text, marginTop: 14 }]}>Payment Status</Text>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                  {(["Paid", "Partial", "Pending", "Overdue"] as const).map((st) => (
                    <TouchableOpacity
                      key={st}
                      style={[
                        styles.categoryPickerBtn,
                        {
                          flex: 1,
                          backgroundColor: editFeeStatus === st ? colors.primary : colors.inputBg,
                          borderColor: editFeeStatus === st ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setEditFeeStatus(st)}
                    >
                      <Text
                        style={{
                          color: editFeeStatus === st ? "#FFFFFF" : colors.text,
                          fontSize: 11,
                          fontWeight: editFeeStatus === st ? "700" : "500",
                          textAlign: "center",
                        }}
                      >
                        {st}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Record New Payment Section (Optional) */}
                <View style={[styles.recordPaymentSection, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                  <Text style={[styles.recordPaymentTitle, { color: colors.text }]}>Record New Payment (Optional)</Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 8 }}>
                    Add an extra payment amount to automatically credit this student.
                  </Text>
                  <TextInput
                    style={[styles.modalTextInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text, marginBottom: 8 }]}
                    placeholder="Installment Description (e.g. Sem 4 Tuition Due)"
                    placeholderTextColor={colors.textMuted}
                    value={paymentTitleInput}
                    onChangeText={setPaymentTitleInput}
                  />
                  <TextInput
                    style={[styles.modalTextInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                    placeholder="Payment Amount to Add (₹ e.g. 5000)"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={paymentAmountInput}
                    onChangeText={setPaymentAmountInput}
                  />
                </View>
              </ScrollView>
            )}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                onPress={() => setFeeUpdateModalVisible(false)}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveStudentFeeUpdate}
                disabled={savingStudentFee}
              >
                {savingStudentFee ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Save & Directly Update Student</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ADD / EDIT FEE MODAL */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={[styles.modalBackdrop, { backgroundColor: colors.modalOverlay }]} onPress={() => setModalVisible(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingItem ? "Edit Fee Record" : "Add New Fee Structure"}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {/* Fee Title */}
              <Text style={[styles.modalInputLabel, { color: colors.text }]}>Fee Title *</Text>
              <TextInput
                style={[styles.modalTextInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                placeholder="e.g. Tuition Fee - Semester 4"
                placeholderTextColor={colors.textMuted}
                value={titleInput}
                onChangeText={setTitleInput}
              />

              {/* Amount */}
              <Text style={[styles.modalInputLabel, { color: colors.text, marginTop: 12 }]}>Amount (₹) *</Text>
              <TextInput
                style={[styles.modalTextInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                placeholder="e.g. 40000"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={amountInput}
                onChangeText={setAmountInput}
              />

              {/* Category */}
              <Text style={[styles.modalInputLabel, { color: colors.text, marginTop: 12 }]}>Category</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryPickerBtn,
                      {
                        backgroundColor: categoryInput === cat ? colors.primary : colors.inputBg,
                        borderColor: categoryInput === cat ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setCategoryInput(cat)}
                  >
                    <Text
                      style={{
                        color: categoryInput === cat ? "#FFFFFF" : colors.text,
                        fontSize: 12,
                        fontWeight: categoryInput === cat ? "700" : "500",
                      }}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Due Date */}
              <Text style={[styles.modalInputLabel, { color: colors.text, marginTop: 12 }]}>Due Date</Text>
              <TextInput
                style={[styles.modalTextInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                placeholder="e.g. 30 Oct 2026"
                placeholderTextColor={colors.textMuted}
                value={dueDateInput}
                onChangeText={setDueDateInput}
              />

              {/* Status */}
              <Text style={[styles.modalInputLabel, { color: colors.text, marginTop: 12 }]}>Status</Text>
              <View style={{ flexDirection: "row", gap: 12, marginTop: 6 }}>
                {(["Pending", "Paid"] as const).map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[
                      styles.statusToggleBtn,
                      {
                        backgroundColor: statusInput === st ? (st === "Paid" ? "#10B981" : "#EA580C") : colors.inputBg,
                        borderColor: statusInput === st ? (st === "Paid" ? "#10B981" : "#EA580C") : colors.border,
                      },
                    ]}
                    onPress={() => setStatusInput(st)}
                  >
                    <Text
                      style={{
                        color: statusInput === st ? "#FFFFFF" : colors.text,
                        fontWeight: "700",
                        fontSize: 13,
                      }}
                    >
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Target Student Roll No */}
              <Text style={[styles.modalInputLabel, { color: colors.text, marginTop: 12 }]}>
                Target Student Roll No (Optional)
              </Text>
              <TextInput
                style={[styles.modalTextInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                placeholder="Leave blank for ALL or enter e.g. 23CSE001"
                placeholderTextColor={colors.textMuted}
                value={rollNoInput}
                onChangeText={setRollNoInput}
              />

              {/* Description */}
              <Text style={[styles.modalInputLabel, { color: colors.text, marginTop: 12 }]}>Remarks / Description</Text>
              <TextInput
                style={[
                  styles.modalTextInput,
                  { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text, height: 70, textAlignVertical: "top" },
                ]}
                placeholder="Additional notes, bank account info, or late fee terms..."
                placeholderTextColor={colors.textMuted}
                value={descInput}
                onChangeText={setDescInput}
                multiline
              />
            </ScrollView>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.modalCancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveFee}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>{editingItem ? "Update Record" : "Save to Firebase"}</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainLayout: {
    flex: 1,
    flexDirection: "row",
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
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
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  navItemActive: {
    backgroundColor: "#5D3EBC",
  },
  navItemLabel: {
    marginLeft: 12,
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "500",
  },
  navItemLabelActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  sidebarLogout: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    marginTop: 6,
  },
  sidebarLogoutText: {
    marginLeft: 12,
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "500",
  },
  contentArea: {
    flex: 1,
  },
  topBar: {
    height: 70,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuButton: {
    padding: 6,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  topBarSub: {
    fontSize: 12,
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  addFeeHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#5D3EBC",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addFeeHeaderBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  adminAvatarCircle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  adminBadgeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  scrollContent: {
    padding: 20,
  },
  heroCard: {
    backgroundColor: "#5D3EBC",
    borderRadius: 20,
    padding: 22,
    marginBottom: 20,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  heroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  dueSoonBadge: {
    backgroundColor: "#EA580C",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  dueSoonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  heroLabel: {
    color: "#E9D5FF",
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 4,
  },
  heroAmount: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 6,
  },
  heroDueDate: {
    color: "#D8B4FE",
    fontSize: 12,
  },
  statGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  statIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
  },
  statVal: {
    fontSize: 15,
    fontWeight: "800",
    marginTop: 2,
    textAlign: "center",
  },
  filterSection: {
    marginBottom: 14,
  },
  filterScroll: {
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  breakdownCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  breakdownHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  smallAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#5D3EBC",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  smallAddBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  feeList: {
    gap: 12,
  },
  feeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 12,
  },
  feeLeftGroup: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  feeIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  paidBg: {
    backgroundColor: "#ECFDF5",
  },
  pendingBg: {
    backgroundColor: "#FFF7ED",
  },
  feeTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  feeAmount: {
    fontSize: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  paidBadge: {
    backgroundColor: "#ECFDF5",
  },
  pendingBadge: {
    backgroundColor: "#FFF7ED",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  paidText: {
    color: "#10B981",
  },
  pendingText: {
    color: "#EA580C",
  },
  actionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  queryCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  queryTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  queryInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 14,
  },
  sendButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  sendButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  // Modal styles
  modalCard: {
    width: "100%",
    maxWidth: 500,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  modalInputLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  modalTextInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
  },
  categoryPickerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
  },
  modalActionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 18,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  modalSaveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalSaveBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  /* Student List Styles */
  mainTabSwitchRow: {
    flexDirection: "row",
    padding: 6,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8,
  },
  mainTabSwitchBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  mainTabSwitchText: {
    fontSize: 13,
    fontWeight: "600",
  },
  liveTagBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  liveTagText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#10B981",
  },
  studentFeeCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  studentCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  studentCardName: {
    fontSize: 15,
    fontWeight: "700",
  },
  deptBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  deptBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  studentCardRoll: {
    fontSize: 12,
    marginTop: 2,
  },
  studentStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  studentStatusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E2E8F0",
    overflow: "hidden",
    marginTop: 4,
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 12,
  },
  metricBox: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 13,
    fontWeight: "800",
  },
  updateStudentFeeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  updateStudentFeeBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  studentBannerBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 6,
  },
  bannerStudentName: {
    fontSize: 14,
    fontWeight: "700",
  },
  remainingPreviewBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
  },
  recordPaymentSection: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
  },
  recordPaymentTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  modalBtnRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  saveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});