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
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { auth, db } from "../../firebase/config";
import { confirmAction, confirmLogout } from "../../firebase/auth";
import { useAppTheme } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";
import NotificationBellModal from "../../components/NotificationBellModal";
import AdminThemeToggle from "../../components/admin/AdminThemeToggle";
import UniversalRoleControls from "../../components/UniversalRoleControls";
import { downloadFeeReportPdf } from "../../services/feePdfReportService";

export const FEE_NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "grid-outline", route: "/fee-manager" },
  { id: "students", label: "Students", icon: "people-outline", route: "/fee-manager/students" },
  { id: "fee-mgmt", label: "Fee Management", icon: "card-outline", route: "/fee-manager/fee-management" },
  { id: "payments", label: "Payments", icon: "cash-outline", route: "/fee-manager/payments" },
  { id: "receipts", label: "Receipts", icon: "receipt-outline", route: "/fee-manager/receipts" },
  { id: "notices", label: "Fee Notices", icon: "megaphone-outline", route: "/fee-manager/notices" },
  { id: "reminders", label: "Reminders", icon: "notifications-outline", route: "/fee-manager/reminders" },
  { id: "reports", label: "Reports", icon: "bar-chart-outline", route: "/fee-manager/reports" },
  { id: "settings", label: "Settings", icon: "settings-outline", route: "/fee-manager/settings" },
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

export default function FeeManagerDashboardScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;
  const { colors, isDark } = useAppTheme();
  const { t } = useLanguage();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [managerName, setManagerName] = useState("Finance Officer");

  // Tab View Mode: "students" (Student List) vs "catalog" (Fee Structures)
  const [activeTab, setActiveTab] = useState<"students" | "catalog">("students");

  // Connected Students Fee State (Realtime from 'users' collection)
  const [students, setStudents] = useState<StudentFeeRecord[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentDeptFilter, setStudentDeptFilter] = useState("All");
  const [studentStatusFilter, setStudentStatusFilter] = useState<"All" | "Cleared" | "Pending">("All");

  // Fee Structures State (Realtime from 'fees' collection)
  const [feeItems, setFeeItems] = useState<FeeItem[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogCategory, setCatalogCategory] = useState<string>("All");

  // Update Student Fees Modal State (Fee Manager can update amount and date)
  const [feeUpdateModalVisible, setFeeUpdateModalVisible] = useState(false);
  const [selectedStudentForFee, setSelectedStudentForFee] = useState<StudentFeeRecord | null>(null);
  const [editTotalFees, setEditTotalFees] = useState("");
  const [editPaidFees, setEditPaidFees] = useState("");
  const [editRemainingFees, setEditRemainingFees] = useState("");
  const [editFeeStatus, setEditFeeStatus] = useState<"Paid" | "Partial" | "Pending" | "Overdue">("Partial");
  const [editPaymentDate, setEditPaymentDate] = useState("");
  const [paymentAmountInput, setPaymentAmountInput] = useState("");
  const [paymentTitleInput, setPaymentTitleInput] = useState("Semester Fee Installment");
  const [savingStudentFee, setSavingStudentFee] = useState(false);

  // Add / Edit Fee Structure Modal State
  const [catalogModalVisible, setCatalogModalVisible] = useState(false);
  const [editingCatalogItem, setEditingCatalogItem] = useState<FeeItem | null>(null);
  const [catalogTitleInput, setCatalogTitleInput] = useState("");
  const [catalogAmountInput, setCatalogAmountInput] = useState("");
  const [catalogCategoryInput, setCatalogCategoryInput] = useState<FeeCategory>("Tuition");
  const [catalogDueDateInput, setCatalogDueDateInput] = useState("30 Oct 2026");
  const [catalogStatusInput, setCatalogStatusInput] = useState<"Paid" | "Pending">("Pending");
  const [catalogRollNoInput, setCatalogRollNoInput] = useState("");
  const [catalogDescInput, setCatalogDescInput] = useState("");
  const [savingCatalog, setSavingCatalog] = useState(false);

  // Broadcast Notice State
  const [noticeText, setNoticeText] = useState("");
  const [sendingNotice, setSendingNotice] = useState(false);

  // 1. Fetch current manager name from auth & users doc
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    if (user.displayName) setManagerName(user.displayName);

    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        const d = snap.data();
        if (d.fullName || d.name) setManagerName(d.fullName || d.name);
      }
    });
    return () => unsub();
  }, []);

  // 2. Realtime sync with 'users' collection for Student Fee Records
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
          const remaining =
            typeof d.remainingFees === "number"
              ? d.remainingFees
              : Math.max(0, total - paid);
          const status =
            (d.feeStatus as any) ||
            (remaining === 0 ? "Paid" : paid > 0 ? "Partial" : "Pending");

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
        console.warn("Fee manager students listener warning:", err);
        setStudents([]);
        setLoadingStudents(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // 3. Realtime sync with 'fees' collection for Fee Structures
  useEffect(() => {
    const feesCol = collection(db, "fees");
    const unsubscribe = onSnapshot(
      feesCol,
      (snapshot) => {
        const loaded: FeeItem[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          const amountNum =
            typeof d.amount === "number"
              ? d.amount
              : parseFloat(String(d.amount).replace(/[^0-9.]/g, "")) || 0;
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

        loaded.sort((a, b) => b.amount - a.amount);
        setFeeItems(loaded);
        setLoadingCatalog(false);
      },
      (err) => {
        console.warn("Fee structures listener warning:", err);
        setFeeItems([]);
        setLoadingCatalog(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Student Metrics & Filters
  const clearedStudentsCount = students.filter(
    (s) => s.feeStatus === "Paid" || s.remainingFees === 0
  ).length;
  const pendingStudentsCount = students.filter(
    (s) => s.feeStatus !== "Paid" && s.remainingFees > 0
  ).length;
  const clearedPercentage = students.length
    ? Math.round((clearedStudentsCount / students.length) * 100)
    : 0;

  const totalStudentFees = students.reduce((sum, s) => sum + s.totalFees, 0);
  const totalStudentPaid = students.reduce((sum, s) => sum + s.paidFees, 0);
  const totalStudentRemaining = students.reduce((sum, s) => sum + s.remainingFees, 0);

  const filteredStudents = students.filter((s) => {
    const matchesDept =
      studentDeptFilter === "All" ||
      s.department.toUpperCase().includes(studentDeptFilter.toUpperCase());
    const matchesSearch =
      s.fullName.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.rollNo.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.email.toLowerCase().includes(studentSearch.toLowerCase());
    const isCleared = s.feeStatus === "Paid" || s.remainingFees === 0;
    const matchesStatus =
      studentStatusFilter === "All"
        ? true
        : studentStatusFilter === "Cleared"
        ? isCleared
        : !isCleared;
    return matchesDept && matchesSearch && matchesStatus;
  });

  // Fee Structure Metrics & Filters
  const totalCatalogAmount = feeItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  const paidCatalogAmount = feeItems
    .filter((item) => item.isPaid || item.status === "Paid")
    .reduce((sum, item) => sum + (item.amount || 0), 0);
  const pendingCatalogAmount = totalCatalogAmount - paidCatalogAmount;

  const filteredCatalogItems = feeItems.filter((item) => {
    const matchesCategory =
      catalogCategory === "All" || item.category === catalogCategory;
    const matchesSearch =
      item.title.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      (item.rollNo && item.rollNo.toLowerCase().includes(catalogSearch.toLowerCase())) ||
      item.category.toLowerCase().includes(catalogSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // ==========================================
  // FEE MANAGER ACTION: UPDATE STUDENT FEES & DATE
  // ==========================================
  const handleOpenStudentFeeUpdate = (student: StudentFeeRecord) => {
    setSelectedStudentForFee(student);
    setEditTotalFees(String(student.totalFees));
    setEditPaidFees(String(student.paidFees));
    setEditRemainingFees(String(student.remainingFees));
    setEditFeeStatus(student.feeStatus);
    const todayStr = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    setEditPaymentDate(student.lastPaymentDate || todayStr);
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

    const finalPaymentDate =
      editPaymentDate.trim() ||
      new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

    setSavingStudentFee(true);
    try {
      // 1. Update student's user doc in Firestore
      await updateDoc(doc(db, "users", selectedStudentForFee.id), {
        totalFees: parsedTotal,
        paidFees: finalPaid,
        remainingFees: finalRemaining,
        feeStatus: finalStatus,
        lastPaymentDate: finalPaymentDate,
        updatedAt: serverTimestamp(),
      });

      // 2. If an installment was added, record in student's fees_breakdown
      if (extraPayment > 0) {
        await addDoc(
          collection(db, "users", selectedStudentForFee.id, "fees_breakdown"),
          {
            title: paymentTitleInput.trim() || "Fee Payment Installment",
            amount: extraPayment,
            status: "Paid",
            category: "Tuition",
            dueDate: finalPaymentDate,
            paidAt: serverTimestamp(),
          }
        );
      }

      // 3. Log activity
      await addDoc(collection(db, "activities"), {
        title: `Fee Updated by Manager: ${selectedStudentForFee.fullName} (Paid: ₹${finalPaid.toLocaleString("en-IN")}, Date: ${finalPaymentDate})`,
        time: "Just now",
        user: "Fee Manager",
        type: "fees",
        createdAt: serverTimestamp(),
      });

      setFeeUpdateModalVisible(false);
      const msg = `Updated ${selectedStudentForFee.fullName}'s fees successfully.\nPaid: ₹${finalPaid.toLocaleString("en-IN")}\nRemaining: ₹${finalRemaining.toLocaleString("en-IN")}\nPayment Date: ${finalPaymentDate}\nUpdated directly in the student's app.`;
      if (Platform.OS === "web") {
        window.alert(msg);
      } else {
        Alert.alert("Student Fees Updated", msg);
      }
    } catch (e: any) {
      const err = e?.message || "Could not update student fees.";
      if (Platform.OS === "web") window.alert(err);
      else Alert.alert("Error Updating Fees", err);
    } finally {
      setSavingStudentFee(false);
    }
  };

  // ==========================================
  // FEE MANAGER ACTION: REMOVE / RESET STUDENT FEE DATA
  // ==========================================
  const handlePromptRemoveFeeData = (student: StudentFeeRecord) => {
    confirmAction(
      `Remove / Reset Fee Data for ${student.fullName}?`,
      `Choose what action to perform on ${student.fullName} (${student.rollNo}):\n• Reset remaining dues to ₹0 (Mark Fully Paid)\n• Clear/Reset all fee ledger records\nThis will synchronize immediately to Firebase.`,
      async () => {
        try {
          await updateDoc(doc(db, "users", student.id), {
            remainingFees: 0,
            feeStatus: "Paid",
            paidFees: student.totalFees,
            lastPaymentDate: "Cleared by Fee Manager",
            updatedAt: serverTimestamp(),
          });

          await addDoc(collection(db, "activities"), {
            title: `Fee Dues Cleared: ${student.fullName} by Fee Manager`,
            time: "Just now",
            user: "Fee Manager",
            type: "fees",
            createdAt: serverTimestamp(),
          });

          if (Platform.OS === "web") {
            window.alert(`Dues for ${student.fullName} have been cleared to ₹0.`);
          } else {
            Alert.alert("Dues Cleared", `Dues for ${student.fullName} have been cleared.`);
          }
          if (feeUpdateModalVisible) setFeeUpdateModalVisible(false);
        } catch (e: any) {
          Alert.alert("Error", e?.message || "Failed to remove fee data.");
        }
      },
      "Clear Dues to ₹0"
    );
  };

  const handleFullResetFeeData = (student: StudentFeeRecord) => {
    confirmAction(
      `Completely Reset Fee Record for ${student.fullName}?`,
      `This will reset Total Fee to ₹0, Paid to ₹0, and Remaining to ₹0 for ${student.rollNo}. Continue?`,
      async () => {
        try {
          await updateDoc(doc(db, "users", student.id), {
            totalFees: 0,
            paidFees: 0,
            remainingFees: 0,
            feeStatus: "Pending",
            lastPaymentDate: "Reset",
            updatedAt: serverTimestamp(),
          });

          await addDoc(collection(db, "activities"), {
            title: `Fee Record Reset to Zero: ${student.fullName}`,
            time: "Just now",
            user: "Fee Manager",
            type: "fees",
            createdAt: serverTimestamp(),
          });

          if (Platform.OS === "web") {
            window.alert(`Fee record for ${student.fullName} reset to ₹0.`);
          } else {
            Alert.alert("Fee Reset", `Fee record for ${student.fullName} reset.`);
          }
          if (feeUpdateModalVisible) setFeeUpdateModalVisible(false);
        } catch (e: any) {
          Alert.alert("Error", e?.message || "Failed to reset fee data.");
        }
      },
      "Reset All to ₹0"
    );
  };

  // ==========================================
  // FEE STRUCTURE ACTIONS (ADD / EDIT / DELETE)
  // ==========================================
  const handleOpenAddCatalogModal = () => {
    setEditingCatalogItem(null);
    setCatalogTitleInput("");
    setCatalogAmountInput("");
    setCatalogCategoryInput("Tuition");
    setCatalogDueDateInput("30 Oct 2026");
    setCatalogStatusInput("Pending");
    setCatalogRollNoInput("");
    setCatalogDescInput("");
    setCatalogModalVisible(true);
  };

  const handleOpenEditCatalogModal = (item: FeeItem) => {
    setEditingCatalogItem(item);
    setCatalogTitleInput(item.title);
    setCatalogAmountInput(String(item.amount));
    setCatalogCategoryInput(item.category);
    setCatalogDueDateInput(item.dueDate);
    setCatalogStatusInput(item.status);
    setCatalogRollNoInput(item.rollNo || "");
    setCatalogDescInput(item.description || "");
    setCatalogModalVisible(true);
  };

  const handleSaveCatalogFee = async () => {
    if (!catalogTitleInput.trim()) {
      Alert.alert("Missing Title", "Please provide a title for this fee structure.");
      return;
    }
    const parsed = parseFloat(catalogAmountInput.replace(/[^0-9.]/g, ""));
    if (isNaN(parsed) || parsed < 0) {
      Alert.alert("Invalid Amount", "Please enter a valid numeric fee amount.");
      return;
    }

    setSavingCatalog(true);
    const payload = {
      title: catalogTitleInput.trim(),
      amount: parsed,
      category: catalogCategoryInput,
      dueDate: catalogDueDateInput.trim() || "30 Oct 2026",
      status: catalogStatusInput,
      isPaid: catalogStatusInput === "Paid",
      rollNo: catalogRollNoInput.trim().toUpperCase() || "ALL",
      description: catalogDescInput.trim(),
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingCatalogItem) {
        await updateDoc(doc(db, "fees", editingCatalogItem.id), payload);
        await addDoc(collection(db, "activities"), {
          title: `Fee Structure Updated: ${catalogTitleInput.trim()} (₹${parsed.toLocaleString("en-IN")})`,
          time: "Just now",
          user: "Fee Manager",
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
          title: `New Fee Head Added: ${catalogTitleInput.trim()} (₹${parsed.toLocaleString("en-IN")})`,
          time: "Just now",
          user: "Fee Manager",
          type: "fees",
          createdAt: serverTimestamp(),
        });
        Alert.alert("Created", "New fee record has been added to Firebase!");
      }
      setCatalogModalVisible(false);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to save fee structure.");
    } finally {
      setSavingCatalog(false);
    }
  };

  const handleDeleteCatalogFee = (item: FeeItem) => {
    confirmAction(
      "Delete Fee Structure Record",
      `Are you sure you want to remove "${item.title}" from Firebase?`,
      async () => {
        try {
          if (!item.id.startsWith("fee-init-")) {
            await deleteDoc(doc(db, "fees", item.id));
          }
          setFeeItems((prev) => prev.filter((f) => f.id !== item.id));
          await addDoc(collection(db, "activities"), {
            title: `Fee Structure Removed: ${item.title}`,
            time: "Just now",
            user: "Fee Manager",
            type: "fees",
            createdAt: serverTimestamp(),
          });
          if (Platform.OS === "web") {
            window.alert("Fee structure removed from Firebase.");
          } else {
            Alert.alert("Deleted", "Fee structure removed from Firebase.");
          }
        } catch (e: any) {
          Alert.alert("Error", e?.message || "Failed to delete fee structure.");
        }
      },
      "Delete"
    );
  };

  const handleToggleCatalogStatus = async (item: FeeItem) => {
    const nextStatus = item.status === "Paid" ? "Pending" : "Paid";
    try {
      await updateDoc(doc(db, "fees", item.id), {
        status: nextStatus,
        isPaid: nextStatus === "Paid",
        updatedAt: serverTimestamp(),
      });
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to toggle status.");
    }
  };

  const handleBroadcastNotice = async () => {
    if (!noticeText.trim()) {
      Alert.alert("Missing Text", "Please enter a fee notice announcement.");
      return;
    }
    setSendingNotice(true);
    try {
      await addDoc(collection(db, "notices"), {
        title: "Fee Department Official Announcement",
        content: noticeText.trim(),
        category: "Fees",
        author: managerName || "Accounts & Finance Office",
        date: new Date().toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        priority: "High",
        createdAt: serverTimestamp(),
      });

      await addDoc(collection(db, "activities"), {
        title: `Fee Notice Broadcasted: ${noticeText.trim().slice(0, 40)}...`,
        time: "Just now",
        user: "Fee Manager",
        type: "fees",
        createdAt: serverTimestamp(),
      });

      Alert.alert("Published", "Fee notice broadcasted to students and logged in Firebase.");
      setNoticeText("");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to publish notice.");
    } finally {
      setSendingNotice(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.adminSidebar }]} edges={["top", "left", "right"]}>
      <View style={[styles.mainLayout, { backgroundColor: colors.adminBg }]}>
        {/* DESKTOP SIDEBAR */}
        {isDesktop && (
          <View style={[styles.sidebar, { backgroundColor: "#0A1E3F", borderRightColor: "#1E293B" }]}>
            <View>
              <View style={styles.brandRow}>
                <View style={styles.brandLogo}>
                  <Ionicons name="card" size={20} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.brandTitle}>CAMPUSLY</Text>
                  <Text style={styles.brandSubtitle}>Fees & Finance Hub</Text>
                </View>
              </View>

              <ScrollView style={styles.navScroll} showsVerticalScrollIndicator={false}>
                {FEE_NAV_ITEMS.map((item) => {
                  const isActive = item.id === "dashboard";
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.navItem, isActive && styles.navItemActive]}
                      onPress={() => router.push(item.route as any)}
                    >
                      <Ionicons
                        name={item.icon as any}
                        size={18}
                        color={isActive ? "#FFFFFF" : "#94A3B8"}
                      />
                      <Text style={[styles.navItemText, isActive && styles.navItemTextActive]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.sidebarFooter}>
              <TouchableOpacity
                style={styles.profileMini}
                onPress={() => router.push("/fee-manager/profile")}
              >
                <View style={styles.avatarMini}>
                  <Text style={styles.avatarMiniText}>
                    {managerName
                      .split(" ")
                      .map((w) => w[0])
                      .filter(Boolean)
                      .join("")
                      .toUpperCase()
                      .slice(0, 2) || "FM"}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userNameMini} numberOfLines={1}>
                    {managerName}
                  </Text>
                  <Text style={styles.userRoleMini}>Fee Manager</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.logoutBtn}
                onPress={() => confirmLogout("Sign out of Fee Manager portal?")}
              >
                <Ionicons name="log-out-outline" size={16} color="#94A3B8" />
                <Text style={styles.logoutBtnText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* MAIN WORKSPACE */}
        <View style={[styles.contentArea, { backgroundColor: colors.adminBg }]}>
          {/* TOP BAR */}
          <View style={[styles.topBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <View style={styles.topBarLeft}>
              {!isDesktop && (
                <TouchableOpacity
                  style={styles.menuButton}
                  onPress={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  <Ionicons name="menu" size={24} color={colors.text} />
                </TouchableOpacity>
              )}
              <View>
                <Text style={[styles.topBarTitle, { color: colors.text }]}>Fee Management</Text>
                <Text style={[styles.topBarSub, { color: colors.textSecondary }]}>
                  Dynamic Firebase Records & Realtime Tracking
                </Text>
              </View>
            </View>

            <View style={styles.topBarRight}>
              {/* PDF REPORT DOWNLOAD BUTTON */}
              <TouchableOpacity
                style={[styles.pdfHeaderBtn, { backgroundColor: "#059669" }]}
                onPress={() =>
                  downloadFeeReportPdf(students, {
                    filter: studentStatusFilter,
                    departmentFilter: studentDeptFilter,
                    generatedBy: `${managerName} (Fee Manager)`,
                    title: `Official University Student Fee Dues & Status Report (${studentStatusFilter})`,
                  })
                }
              >
                <Ionicons name="document-text" size={15} color="#FFFFFF" />
                {isDesktop && <Text style={styles.pdfHeaderBtnText}>PDF Report</Text>}
              </TouchableOpacity>

              {/* + ADD FEE RECORD BUTTON */}
              <TouchableOpacity
                style={[styles.addFeeHeaderBtn, { backgroundColor: colors.primary }]}
                onPress={handleOpenAddCatalogModal}
              >
                <Ionicons name="add" size={17} color="#FFFFFF" />
                <Text style={styles.addFeeHeaderBtnText}>{isDesktop ? "+ Add Fee Record" : "Add"}</Text>
              </TouchableOpacity>

              <UniversalRoleControls compact />
              <NotificationBellModal />
            </View>
          </View>

          {/* MOBILE DRAWER */}
          {!isDesktop && mobileMenuOpen && (
            <View style={[styles.mobileDrawer, { backgroundColor: "#0A1E3F" }]}>
              {FEE_NAV_ITEMS.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.mobileNavItem}
                  onPress={() => {
                    setMobileMenuOpen(false);
                    router.push(item.route as any);
                  }}
                >
                  <Ionicons name={item.icon as any} size={20} color="#FFFFFF" />
                  <Text style={styles.mobileNavText}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* SCROLLABLE DASHBOARD WORKSPACE */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* VIEW MODE SWITCHER TABS: STUDENT LIST VS FEE STRUCTURES */}
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

            {/* TAB 1: STUDENT LIST (EXACT SCREENSHOT STRUCTURE WITH UPDATE DATE & REMOVE DATA) */}
            {activeTab === "students" ? (
              <View>
                {/* BIG INDIGO HERO CARD */}
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

                  {/* Summary Counter Badges */}
                  <View style={styles.heroStatusCounterRow}>
                    <View style={styles.heroStatusBadgeCleared}>
                      <Ionicons name="checkmark-circle" size={15} color="#10B981" />
                      <Text style={styles.heroStatusBadgeTextCleared}>
                        Cleared Students: {clearedStudentsCount} ({clearedPercentage}%)
                      </Text>
                    </View>
                    <View style={styles.heroStatusBadgePending}>
                      <Ionicons name="time" size={15} color="#F59E0B" />
                      <Text style={styles.heroStatusBadgeTextPending}>
                        Pending Dues: {pendingStudentsCount}
                      </Text>
                    </View>
                  </View>
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

                {/* CLEARED VS PENDING STATUS FILTER TABS */}
                <View style={[styles.statusTabsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.statusTabsRow}>
                    <TouchableOpacity
                      style={[
                        styles.statusTabPill,
                        studentStatusFilter === "All" && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                      onPress={() => setStudentStatusFilter("All")}
                    >
                      <Text
                        style={[
                          styles.statusTabPillText,
                          { color: studentStatusFilter === "All" ? "#FFFFFF" : colors.text },
                          studentStatusFilter === "All" && { fontWeight: "700" },
                        ]}
                      >
                        All Students ({students.length})
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.statusTabPill,
                        studentStatusFilter === "Cleared" && { backgroundColor: "#10B981", borderColor: "#10B981" },
                      ]}
                      onPress={() => setStudentStatusFilter("Cleared")}
                    >
                      <Ionicons
                        name="checkmark-circle"
                        size={14}
                        color={studentStatusFilter === "Cleared" ? "#FFFFFF" : "#10B981"}
                      />
                      <Text
                        style={[
                          styles.statusTabPillText,
                          { color: studentStatusFilter === "Cleared" ? "#FFFFFF" : "#10B981" },
                          studentStatusFilter === "Cleared" && { fontWeight: "700" },
                        ]}
                      >
                        Cleared ({clearedStudentsCount})
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.statusTabPill,
                        studentStatusFilter === "Pending" && { backgroundColor: "#EA580C", borderColor: "#EA580C" },
                      ]}
                      onPress={() => setStudentStatusFilter("Pending")}
                    >
                      <Ionicons
                        name="time"
                        size={14}
                        color={studentStatusFilter === "Pending" ? "#FFFFFF" : "#EA580C"}
                      />
                      <Text
                        style={[
                          styles.statusTabPillText,
                          { color: studentStatusFilter === "Pending" ? "#FFFFFF" : "#EA580C" },
                          studentStatusFilter === "Pending" && { fontWeight: "700" },
                        ]}
                      >
                        Pending Dues ({pendingStudentsCount})
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[styles.downloadPdfActionBtn, { backgroundColor: "#059669" }]}
                    onPress={() =>
                      downloadFeeReportPdf(students, {
                        filter: studentStatusFilter,
                        departmentFilter: studentDeptFilter,
                        generatedBy: `${managerName} (Fee Manager)`,
                        title: `University Student Fee Dues & Status Report (${studentStatusFilter})`,
                      })
                    }
                  >
                    <Ionicons name="download-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.downloadPdfActionBtnText}>
                      Download Serialized PDF ({studentStatusFilter})
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* DEPARTMENT FILTER CHIPS */}
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

                {/* STUDENT LIST CARDS CONTAINER */}
                <View style={[styles.breakdownCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.breakdownHeaderRow}>
                    <View>
                      <Text style={[styles.sectionTitle, { color: colors.text }]}>Connected Students Fee Status</Text>
                      <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                        Fee Manager has full authority to update amounts, payment dates & remove records
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
                        Loading student records from Firebase...
                      </Text>
                    </View>
                  ) : filteredStudents.length === 0 ? (
                    <View style={{ paddingVertical: 40, alignItems: "center" }}>
                      <Ionicons name="people-outline" size={48} color={colors.textMuted} />
                      <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text, marginTop: 12 }}>
                        No Students Found
                      </Text>
                      <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
                        {studentSearch ? "No students match your query." : "No connected student accounts found."}
                      </Text>
                    </View>
                  ) : (
                    <View style={{ gap: 14 }}>
                      {filteredStudents.map((s) => {
                        const pct =
                          s.totalFees > 0
                            ? Math.min(100, Math.round((s.paidFees / s.totalFees) * 100))
                            : 0;
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
                                  <Text style={[styles.studentCardName, { color: colors.text }]}>
                                    {s.fullName}
                                  </Text>
                                  <View style={[styles.deptBadge, { backgroundColor: colors.primaryLight }]}>
                                    <Text style={[styles.deptBadgeText, { color: colors.primary }]}>
                                      {s.department}
                                    </Text>
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
                              <View
                                style={[
                                  styles.progressBarFill,
                                  { width: `${pct}%`, backgroundColor: isFullyPaid ? "#10B981" : "#4F46E5" },
                                ]}
                              />
                            </View>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
                              <Text style={{ fontSize: 11, color: colors.textSecondary }}>{pct}% Paid</Text>
                              <Text style={{ fontSize: 11, color: colors.textMuted }}>
                                Last updated / paid: {s.lastPaymentDate || "Recently"}
                              </Text>
                            </View>

                            {/* 3 Metrics Row */}
                            <View style={styles.metricsRow}>
                              <View style={[styles.metricBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Total Fee</Text>
                                <Text style={[styles.metricValue, { color: colors.text }]}>
                                  ₹ {s.totalFees.toLocaleString("en-IN")}
                                </Text>
                              </View>
                              <View style={[styles.metricBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Text style={[styles.metricLabel, { color: "#16A34A" }]}>Paid Portion</Text>
                                <Text style={[styles.metricValue, { color: "#16A34A" }]}>
                                  ₹ {s.paidFees.toLocaleString("en-IN")}
                                </Text>
                              </View>
                              <View style={[styles.metricBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                <Text style={[styles.metricLabel, { color: isFullyPaid ? "#16A34A" : "#EF4444" }]}>
                                  Remaining Portion
                                </Text>
                                <Text style={[styles.metricValue, { color: isFullyPaid ? "#16A34A" : "#EF4444" }]}>
                                  ₹ {s.remainingFees.toLocaleString("en-IN")}
                                </Text>
                              </View>
                            </View>

                            {/* Action Buttons: Update Fees/Date & Remove Data */}
                            <View style={styles.studentActionRow}>
                              <TouchableOpacity
                                style={[styles.updateStudentFeeBtn, { backgroundColor: colors.primary, flex: 2 }]}
                                onPress={() => handleOpenStudentFeeUpdate(s)}
                              >
                                <Ionicons name="create-outline" size={16} color="#FFFFFF" />
                                <Text style={styles.updateStudentFeeBtnText}>Update Fees & Date</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[styles.removeFeeBtn, { backgroundColor: "#FEE2E2", borderColor: "#FCA5A5" }]}
                                onPress={() => handlePromptRemoveFeeData(s)}
                              >
                                <Ionicons name="trash-outline" size={15} color="#DC2626" />
                                <Text style={styles.removeFeeBtnText}>Remove Data</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              </View>
            ) : (
              /* TAB 2: FEE STRUCTURES / CATALOG */
              <View>
                {/* HERO CARD: PENDING AMOUNT */}
                <View style={[styles.heroCard, { backgroundColor: "#4F46E5" }]}>
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
                    ₹ {pendingCatalogAmount.toLocaleString("en-IN")}
                  </Text>
                  <Text style={styles.heroDueDate}>
                    Across {feeItems.length} active fee heads in Firebase
                  </Text>
                </View>

                {/* 3 STAT CARDS */}
                <View style={styles.statGrid}>
                  <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.statIconCircle, { backgroundColor: colors.primaryLight }]}>
                      <Ionicons name="cash" size={16} color={colors.primary} />
                    </View>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Scheduled</Text>
                    <Text style={[styles.statVal, { color: colors.text }]}>
                      ₹ {totalCatalogAmount.toLocaleString("en-IN")}
                    </Text>
                  </View>

                  <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.statIconCircle, { backgroundColor: "#ECFDF5" }]}>
                      <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    </View>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Collected / Paid</Text>
                    <Text style={[styles.statVal, { color: "#10B981" }]}>
                      ₹ {paidCatalogAmount.toLocaleString("en-IN")}
                    </Text>
                  </View>

                  <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.statIconCircle, { backgroundColor: "#FFF7ED" }]}>
                      <Ionicons name="time" size={16} color="#EA580C" />
                    </View>
                    <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending Amount</Text>
                    <Text style={[styles.statVal, { color: "#EA580C" }]}>
                      ₹ {pendingCatalogAmount.toLocaleString("en-IN")}
                    </Text>
                  </View>
                </View>

                {/* CATEGORY FILTER CHIPS */}
                <View style={styles.filterSection}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                    {["All", ...CATEGORIES].map((cat) => {
                      const isSelected = catalogCategory === cat;
                      return (
                        <TouchableOpacity
                          key={cat}
                          style={[
                            styles.filterChip,
                            { borderColor: colors.border, backgroundColor: isSelected ? colors.primary : colors.card },
                          ]}
                          onPress={() => setCatalogCategory(cat)}
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
                    value={catalogSearch}
                    onChangeText={setCatalogSearch}
                  />
                  {catalogSearch.length > 0 && (
                    <TouchableOpacity onPress={() => setCatalogSearch("")}>
                      <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* FEE BREAKDOWN & ACTIONS */}
                <View style={[styles.breakdownCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.breakdownHeaderRow}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Fee Breakdown & Actions</Text>
                    <TouchableOpacity style={styles.smallAddBtn} onPress={handleOpenAddCatalogModal}>
                      <Ionicons name="add" size={16} color="#FFFFFF" />
                      <Text style={styles.smallAddBtnText}>Add Fee</Text>
                    </TouchableOpacity>
                  </View>

                  {loadingCatalog ? (
                    <View style={{ paddingVertical: 40, alignItems: "center" }}>
                      <ActivityIndicator size="large" color={colors.primary} />
                      <Text style={{ marginTop: 10, color: colors.textSecondary, fontSize: 13 }}>
                        Loading fee structures from Firebase...
                      </Text>
                    </View>
                  ) : filteredCatalogItems.length === 0 ? (
                    <View style={{ paddingVertical: 40, alignItems: "center" }}>
                      <Ionicons name="wallet-outline" size={48} color={colors.textMuted} />
                      <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text, marginTop: 12 }}>
                        No Fee Records Found
                      </Text>
                      <TouchableOpacity style={[styles.smallAddBtn, { marginTop: 12 }]} onPress={handleOpenAddCatalogModal}>
                        <Ionicons name="add" size={16} color="#FFFFFF" />
                        <Text style={styles.smallAddBtnText}>Create New Fee Head</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.feeList}>
                      {filteredCatalogItems.map((item) => (
                        <View key={item.id} style={[styles.feeRow, { borderBottomColor: colors.border }]}>
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
                            <TouchableOpacity
                              style={[
                                styles.statusBadge,
                                item.isPaid ? styles.paidBadge : styles.pendingBadge,
                              ]}
                              onPress={() => handleToggleCatalogStatus(item)}
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

                            <TouchableOpacity
                              style={[styles.actionIconBtn, { backgroundColor: colors.primaryLight }]}
                              onPress={() => handleOpenEditCatalogModal(item)}
                            >
                              <Ionicons name="pencil" size={14} color={colors.primary} />
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.actionIconBtn, { backgroundColor: "#FEE2E2" }]}
                              onPress={() => handleDeleteCatalogFee(item)}
                            >
                              <Ionicons name="trash-outline" size={14} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* BROADCAST NOTICE CARD */}
                <View style={[styles.queryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.queryTitle, { color: colors.text }]}>Broadcast Fee Notice to Students</Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 10 }}>
                    Publish payment deadlines, concession guidelines, or penalty alerts to student dashboards.
                  </Text>
                  <TextInput
                    style={[
                      styles.queryInput,
                      { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text },
                    ]}
                    placeholder="e.g. Last date for semester fee without penalty is 30 Oct 2026..."
                    placeholderTextColor={colors.textMuted}
                    value={noticeText}
                    onChangeText={setNoticeText}
                    multiline
                    numberOfLines={3}
                  />
                  <TouchableOpacity
                    style={[styles.sendButton, { backgroundColor: colors.primary }]}
                    onPress={handleBroadcastNotice}
                    disabled={sendingNotice}
                  >
                    {sendingNotice ? (
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

      {/* ======================================================== */}
      {/* MODAL 1: UPDATE STUDENT FEES, PAYMENT DATE & REMOVE DATA */}
      {/* ======================================================== */}
      <Modal
        visible={feeUpdateModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFeeUpdateModalVisible(false)}
      >
        <Pressable
          style={[styles.modalBackdrop, { backgroundColor: colors.modalOverlay }]}
          onPress={() => setFeeUpdateModalVisible(false)}
        >
          <Pressable
            style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Update Student Fees & Date</Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                  Fee Manager Direct Control • Synchronizes to student app
                </Text>
              </View>
              <TouchableOpacity onPress={() => setFeeUpdateModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedStudentForFee && (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
                {/* Student Banner */}
                <View style={[styles.studentBannerBox, { backgroundColor: colors.primaryLight, borderColor: colors.border }]}>
                  <Ionicons name="person-circle-outline" size={30} color={colors.primary} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.bannerStudentName, { color: colors.primary }]}>
                      {selectedStudentForFee.fullName}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                      Roll No: {selectedStudentForFee.rollNo} • {selectedStudentForFee.department} • Sem {selectedStudentForFee.semester}
                    </Text>
                  </View>
                </View>

                {/* Total Fees */}
                <Text style={[styles.modalInputLabel, { color: colors.text, marginTop: 14 }]}>
                  Total Course Fees (₹) *
                </Text>
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
                <Text style={[styles.modalInputLabel, { color: colors.text, marginTop: 12 }]}>
                  Paid Amount / Realized Portion (₹) *
                </Text>
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

                {/* Remaining Amount Preview */}
                <View style={[styles.remainingPreviewBox, { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5" }]}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#991B1B" }}>
                    Remaining Portion (Auto-Calculated):
                  </Text>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: "#DC2626", marginTop: 2 }}>
                    ₹ {(Math.max(0, (parseFloat(editTotalFees.replace(/[^0-9.]/g, "")) || 0) - (parseFloat(editPaidFees.replace(/[^0-9.]/g, "")) || 0))).toLocaleString("en-IN")}
                  </Text>
                </View>

                {/* PAYMENT DATE / LAST PAYMENT DATE (REQUESTED BY USER) */}
                <Text style={[styles.modalInputLabel, { color: colors.text, marginTop: 14 }]}>
                  Payment Date / Last Paid Date *
                </Text>
                <TextInput
                  style={[styles.modalTextInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  placeholder="e.g. 08 Oct 2026 or 2026-10-08"
                  placeholderTextColor={colors.textMuted}
                  value={editPaymentDate}
                  onChangeText={setEditPaymentDate}
                />
                <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                  <TouchableOpacity
                    style={[styles.dateQuickBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                    onPress={() => {
                      const todayStr = new Date().toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      });
                      setEditPaymentDate(todayStr);
                    }}
                  >
                    <Text style={[styles.dateQuickBtnText, { color: colors.primary }]}>Set Today</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.dateQuickBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                    onPress={() => {
                      const y = new Date();
                      y.setDate(y.getDate() - 1);
                      const yesterdayStr = y.toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      });
                      setEditPaymentDate(yesterdayStr);
                    }}
                  >
                    <Text style={[styles.dateQuickBtnText, { color: colors.primary }]}>Set Yesterday</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.dateQuickBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                    onPress={() => setEditPaymentDate("-")}
                  >
                    <Text style={[styles.dateQuickBtnText, { color: colors.textSecondary }]}>Clear Date</Text>
                  </TouchableOpacity>
                </View>

                {/* Status Selector */}
                <Text style={[styles.modalInputLabel, { color: colors.text, marginTop: 14 }]}>
                  Fee Status
                </Text>
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

                {/* Optional: Add Installment Payment */}
                <View style={[styles.recordPaymentSection, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                  <Text style={[styles.recordPaymentTitle, { color: colors.text }]}>Record Additional Payment</Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 8 }}>
                    Automatically credits this installment and logs to student's payment history.
                  </Text>
                  <TextInput
                    style={[styles.modalTextInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text, marginBottom: 8 }]}
                    placeholder="Installment Description (e.g. Sem 4 Tuition)"
                    placeholderTextColor={colors.textMuted}
                    value={paymentTitleInput}
                    onChangeText={setPaymentTitleInput}
                  />
                  <TextInput
                    style={[styles.modalTextInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                    placeholder="Installment Amount to Credit (₹)"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={paymentAmountInput}
                    onChangeText={setPaymentAmountInput}
                  />
                </View>

                {/* REMOVE / RESET DATA BUTTON INSIDE MODAL (REQUESTED BY USER) */}
                <View style={styles.modalDangerSection}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#DC2626", marginBottom: 6 }}>
                    Remove / Reset Fee Options
                  </Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity
                      style={[styles.modalDangerBtn, { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5" }]}
                      onPress={() => selectedStudentForFee && handlePromptRemoveFeeData(selectedStudentForFee)}
                    >
                      <Ionicons name="checkmark-done" size={14} color="#DC2626" />
                      <Text style={styles.modalDangerBtnText}>Clear Dues (Mark Paid)</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.modalDangerBtn, { backgroundColor: "#FEF2F2", borderColor: "#FCA5A5" }]}
                      onPress={() => selectedStudentForFee && handleFullResetFeeData(selectedStudentForFee)}
                    >
                      <Ionicons name="trash-bin-outline" size={14} color="#DC2626" />
                      <Text style={styles.modalDangerBtnText}>Reset to ₹0</Text>
                    </TouchableOpacity>
                  </View>
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
                  <Text style={styles.saveBtnText}>Save & Update Student</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 2: ADD / EDIT GLOBAL FEE STRUCTURE HEAD            */}
      {/* ======================================================== */}
      <Modal
        visible={catalogModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCatalogModalVisible(false)}
      >
        <Pressable
          style={[styles.modalBackdrop, { backgroundColor: colors.modalOverlay }]}
          onPress={() => setCatalogModalVisible(false)}
        >
          <Pressable
            style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {editingCatalogItem ? "Edit Fee Structure Record" : "Add New Fee Structure"}
              </Text>
              <TouchableOpacity onPress={() => setCatalogModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <Text style={[styles.modalInputLabel, { color: colors.text }]}>Fee Title *</Text>
              <TextInput
                style={[styles.modalTextInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                placeholder="e.g. Tuition Fee - Semester 4"
                placeholderTextColor={colors.textMuted}
                value={catalogTitleInput}
                onChangeText={setCatalogTitleInput}
              />

              <Text style={[styles.modalInputLabel, { color: colors.text, marginTop: 12 }]}>Amount (₹) *</Text>
              <TextInput
                style={[styles.modalTextInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                placeholder="e.g. 40000"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={catalogAmountInput}
                onChangeText={setCatalogAmountInput}
              />

              <Text style={[styles.modalInputLabel, { color: colors.text, marginTop: 12 }]}>Category</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryPickerBtn,
                      {
                        backgroundColor: catalogCategoryInput === cat ? colors.primary : colors.inputBg,
                        borderColor: catalogCategoryInput === cat ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setCatalogCategoryInput(cat)}
                  >
                    <Text
                      style={{
                        color: catalogCategoryInput === cat ? "#FFFFFF" : colors.text,
                        fontSize: 12,
                        fontWeight: catalogCategoryInput === cat ? "700" : "500",
                      }}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.modalInputLabel, { color: colors.text, marginTop: 12 }]}>Due Date</Text>
              <TextInput
                style={[styles.modalTextInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                placeholder="e.g. 30 Oct 2026"
                placeholderTextColor={colors.textMuted}
                value={catalogDueDateInput}
                onChangeText={setCatalogDueDateInput}
              />

              <Text style={[styles.modalInputLabel, { color: colors.text, marginTop: 12 }]}>Status</Text>
              <View style={{ flexDirection: "row", gap: 12, marginTop: 6 }}>
                {(["Pending", "Paid"] as const).map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[
                      styles.statusToggleBtn,
                      {
                        backgroundColor:
                          catalogStatusInput === st
                            ? st === "Paid"
                              ? "#10B981"
                              : "#EA580C"
                            : colors.inputBg,
                        borderColor:
                          catalogStatusInput === st
                            ? st === "Paid"
                              ? "#10B981"
                              : "#EA580C"
                            : colors.border,
                      },
                    ]}
                    onPress={() => setCatalogStatusInput(st)}
                  >
                    <Text
                      style={{
                        color: catalogStatusInput === st ? "#FFFFFF" : colors.text,
                        fontWeight: "700",
                        fontSize: 13,
                      }}
                    >
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.modalInputLabel, { color: colors.text, marginTop: 12 }]}>
                Target Student Roll No (Optional)
              </Text>
              <TextInput
                style={[styles.modalTextInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                placeholder="Leave blank for ALL or enter e.g. 23CSE001"
                placeholderTextColor={colors.textMuted}
                value={catalogRollNoInput}
                onChangeText={setCatalogRollNoInput}
              />

              <Text style={[styles.modalInputLabel, { color: colors.text, marginTop: 12 }]}>Remarks / Description</Text>
              <TextInput
                style={[
                  styles.modalTextInput,
                  { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text, height: 70, textAlignVertical: "top" },
                ]}
                placeholder="Additional notes or payment instructions..."
                placeholderTextColor={colors.textMuted}
                value={catalogDescInput}
                onChangeText={setCatalogDescInput}
                multiline
              />
            </ScrollView>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                onPress={() => setCatalogModalVisible(false)}
              >
                <Text style={[styles.modalCancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveCatalogFee}
                disabled={savingCatalog}
              >
                {savingCatalog ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>{editingCatalogItem ? "Update Record" : "Save Record"}</Text>
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
    width: 205,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRightWidth: 1,
    justifyContent: "space-between",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  brandLogo: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 9.5,
    color: "#94A3B8",
    fontWeight: "500",
  },
  navScroll: {
    paddingVertical: 2,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6.5,
    paddingHorizontal: 9,
    borderRadius: 8,
    marginBottom: 2,
  },
  navItemActive: {
    backgroundColor: "#2563EB",
  },
  navItemText: {
    marginLeft: 8,
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "500",
  },
  navItemTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  sidebarFooter: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    paddingTop: 10,
    gap: 8,
  },
  profileMini: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avatarMini: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarMiniText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  userNameMini: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "700",
  },
  userRoleMini: {
    color: "#94A3B8",
    fontSize: 9.5,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  logoutBtnText: {
    color: "#94A3B8",
    fontSize: 11,
  },
  contentArea: {
    flex: 1,
  },
  topBar: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  menuButton: {
    padding: 3,
  },
  topBarTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  topBarSub: {
    fontSize: 10.5,
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pdfHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  pdfHeaderBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  addFeeHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  addFeeHeaderBtnText: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "700",
  },
  mobileDrawer: {
    padding: 12,
    gap: 6,
  },
  mobileNavItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 8,
  },
  mobileNavText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  scrollContent: {
    padding: 12,
  },
  mainTabSwitchRow: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
    gap: 6,
  },
  mainTabSwitchBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
  },
  mainTabSwitchText: {
    fontSize: 11.5,
    fontWeight: "600",
  },
  heroCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  heroIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  dueSoonBadge: {
    backgroundColor: "#EA580C",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  dueSoonText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  heroLabel: {
    color: "#E0E7FF",
    fontSize: 11.5,
    fontWeight: "500",
    marginBottom: 2,
  },
  heroAmount: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 4,
  },
  heroDueDate: {
    color: "#C7D2FE",
    fontSize: 11,
  },
  heroStatusCounterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.15)",
  },
  heroStatusBadgeCleared: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  heroStatusBadgeTextCleared: {
    color: "#A7F3D0",
    fontSize: 10,
    fontWeight: "700",
  },
  heroStatusBadgePending: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  heroStatusBadgeTextPending: {
    color: "#FDE68A",
    fontSize: 10,
    fontWeight: "700",
  },
  statGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 10,
    padding: 8,
    alignItems: "center",
    borderWidth: 1,
  },
  statIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "500",
    textAlign: "center",
  },
  statVal: {
    fontSize: 13,
    fontWeight: "800",
    marginTop: 1,
    textAlign: "center",
  },
  statusTabsCard: {
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
    gap: 6,
  },
  statusTabsRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  statusTabPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  statusTabPillText: {
    fontSize: 11,
    fontWeight: "600",
  },
  downloadPdfActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  downloadPdfActionBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
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
    marginBottom: 16,
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
  studentActionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  updateStudentFeeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  updateStudentFeeBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  removeFeeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  removeFeeBtnText: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "700",
  },
  smallAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 520,
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
  dateQuickBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  dateQuickBtnText: {
    fontSize: 11,
    fontWeight: "700",
  },
  categoryPickerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
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
  modalDangerSection: {
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "rgba(220, 38, 38, 0.05)",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  modalDangerBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  modalDangerBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#DC2626",
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
});
