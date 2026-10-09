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
import { collection, doc, getDocs, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { db } from "../../firebase/config";
import HostelLayout from "../../components/hostel/HostelLayout";
import hostelDataService, { HostelResident } from "../../services/hostelDataService";
import unifiedStudentService from "../../services/unifiedStudentService";

export default function ResidentsScreen() {
  const { width } = useWindowDimensions();
  const [residents, setResidents] = useState<HostelResident[]>(
    hostelDataService.getResidents()
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  React.useEffect(() => {
    const unsubscribe = unifiedStudentService.subscribeStudents(() => {
      setResidents(hostelDataService.getResidents());
    });
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  const refreshResidents = () => {
    setResidents(hostelDataService.getResidents());
  };

  const filtered = residents.filter((r) => {
    return (
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.roomNo.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleVacateResident = (res: HostelResident) => {
    Alert.alert(
      "Check Out Resident",
      `Are you sure you want to check out ${res.name} from Room ${res.roomNo}? This will free their bed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Check Out",
          style: "destructive",
          onPress: async () => {
            hostelDataService.updateResident(res.id, { status: "Inactive" });

            // Update in Firestore 'users'
            try {
              const usersRef = collection(db, "users");
              const q = query(usersRef, where("rollNo", "==", res.studentId));
              const snap = await getDocs(q);
              if (!snap.empty) {
                await updateDoc(doc(db, "users", snap.docs[0].id), {
                  hostelStatus: "Unassigned",
                  status: "inactive",
                  updatedAt: serverTimestamp(),
                });
              } else {
                try {
                  await updateDoc(doc(db, "users", res.id), {
                    hostelStatus: "Unassigned",
                    status: "inactive",
                    updatedAt: serverTimestamp(),
                  });
                } catch (_) {}
              }
            } catch (_) {}

            refreshResidents();
            setActionNotice(`${res.name} has been checked out successfully.`);
            setTimeout(() => setActionNotice(null), 3000);
          },
        },
      ]
    );
  };

  return (
    <HostelLayout
      activeNav="students"
      pageTitle="Hostel Residents"
      pageSubtitle={`${residents.length} active residents currently residing in campus hostels`}
      actionNotice={actionNotice}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search resident name, ID, or room..."
      rightAction={
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push("/hostel-manager/add-resident")}
        >
          <Ionicons name="person-add" size={16} color="#FFFFFF" />
          <Text style={styles.addBtnText}>+ Add Resident</Text>
        </TouchableOpacity>
      }
    >
      <View style={styles.tableCard}>
        <View style={styles.tableHead}>
          <Text style={[styles.th, { width: 140 }]}>Resident Name</Text>
          <Text style={[styles.th, { width: 90 }]}>Student ID</Text>
          <Text style={[styles.th, { width: 80 }]}>Room No</Text>
          <Text style={[styles.th, { width: 120 }]}>Course</Text>
          <Text style={[styles.th, { width: 110 }]}>Contact</Text>
          <Text style={[styles.th, { width: 90 }]}>Status</Text>
          <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>Actions</Text>
        </View>

        {filtered.map((r) => {
          const isActive = r.status === "Active";
          return (
            <View key={r.id} style={styles.tableRow}>
              <View style={[styles.nameCell, { width: 140 }]}>
                <View style={styles.avatarMini}>
                  <Text style={styles.avatarMiniText}>{r.name.charAt(0)}</Text>
                </View>
                <Text style={styles.nameText} numberOfLines={1}>{r.name}</Text>
              </View>

              <Text style={[styles.td, { width: 90 }]}>{r.studentId}</Text>
              <Text style={[styles.tdBold, { width: 80 }]}>Room {r.roomNo}</Text>
              <Text style={[styles.td, { width: 120 }]} numberOfLines={1}>{r.course || "B.Tech"}</Text>
              <Text style={[styles.td, { width: 110 }]}>{r.phone || "—"}</Text>

              <View style={{ width: 90 }}>
                <View style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusInactive]}>
                  <Text style={[styles.statusText, isActive ? styles.statusActiveText : styles.statusInactiveText]}>
                    {r.status}
                  </Text>
                </View>
              </View>

              <View style={[styles.actionRow, { flex: 1 }]}>
                <TouchableOpacity
                  style={styles.actionBtnSmall}
                  onPress={() => router.push(`/hostel-manager/resident-details?id=${r.id}` as any)}
                >
                  <Text style={styles.actionBtnSmallText}>View</Text>
                </TouchableOpacity>

                {isActive && (
                  <TouchableOpacity
                    style={[styles.actionBtnSmall, { backgroundColor: "#FEE2E2" }]}
                    onPress={() => handleVacateResident(r)}
                  >
                    <Text style={[styles.actionBtnSmallText, { color: "#DC2626" }]}>Check Out</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </View>
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
  tableCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  tableHead: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  th: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  nameCell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avatarMini: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarMiniText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  nameText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
  },
  td: {
    fontSize: 12,
    color: "#475569",
  },
  tdBold: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E293B",
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  statusActive: {
    backgroundColor: "#ECFDF5",
  },
  statusInactive: {
    backgroundColor: "#F1F5F9",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  statusActiveText: {
    color: "#059669",
  },
  statusInactiveText: {
    color: "#64748B",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 6,
  },
  actionBtnSmall: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  actionBtnSmallText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },
});