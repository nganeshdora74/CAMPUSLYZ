import React, { useState, useEffect } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import HostelLayout from "../../components/hostel/HostelLayout";
import hostelDataService, {
  HostelResident,
  GatePassItem,
} from "../../services/hostelDataService";

export default function ResidentDetailsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [residents, setResidents] = useState(hostelDataService.getResidents());
  const [resident, setResident] = useState<HostelResident | null>(null);
  const [gatePasses, setGatePasses] = useState<GatePassItem[]>([]);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  useEffect(() => {
    const list = hostelDataService.getResidents();
    setResidents(list);
    const target = id ? list.find((r) => r.id === id) : list[0];
    setResident(target || list[0] || null);

    if (target) {
      const studentPasses = hostelDataService
        .getGatePasses()
        .filter((g) => g.studentName.toLowerCase() === target.name.toLowerCase());
      setGatePasses(studentPasses);
    }
  }, [id]);

  const handleCheckout = () => {
    if (!resident) return;
    Alert.alert(
      "Confirm Check Out",
      `Are you sure you want to mark ${resident.name} as Checked Out?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Check Out",
          style: "destructive",
          onPress: () => {
            hostelDataService.updateResident(resident.id, { status: "Inactive" });
            setResident({ ...resident, status: "Inactive" });
            setActionNotice(`${resident.name} checked out successfully.`);
            setTimeout(() => setActionNotice(null), 3000);
          },
        },
      ]
    );
  };

  if (!resident) {
    return (
      <HostelLayout
        activeNav="students"
        pageTitle="Resident Details"
        pageSubtitle="Student Profile"
      >
        <Text style={{ padding: 20, color: "#64748B" }}>No resident found.</Text>
      </HostelLayout>
    );
  }

  return (
    <HostelLayout
      activeNav="students"
      pageTitle="Resident Details"
      pageSubtitle={`Profile of ${resident.name} • Room ${resident.roomNo}`}
      actionNotice={actionNotice}
      rightAction={
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.push("/hostel-manager/residents")}
        >
          <Ionicons name="arrow-back" size={16} color="#FFFFFF" />
          <Text style={styles.backBtnText}>All Residents</Text>
        </TouchableOpacity>
      }
    >
      <View style={styles.mainGrid}>
        {/* Left Column: Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarBig}>
            <Text style={styles.avatarLetter}>{resident.name.charAt(0)}</Text>
          </View>

          <Text style={styles.profileName}>{resident.name}</Text>
          <Text style={styles.profileId}>{resident.studentId}</Text>

          <View style={[styles.statusTag, resident.status === "Active" ? styles.statusActive : styles.statusInactive]}>
            <Text style={[styles.statusText, resident.status === "Active" ? styles.statusActiveText : styles.statusInactiveText]}>
              {resident.status} Resident
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.metaList}>
            <View style={styles.metaItem}>
              <Ionicons name="business-outline" size={16} color="#64748B" />
              <Text style={styles.metaLabel}>Assigned Room:</Text>
              <Text style={styles.metaValue}>Room {resident.roomNo}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="call-outline" size={16} color="#64748B" />
              <Text style={styles.metaLabel}>Phone:</Text>
              <Text style={styles.metaValue}>{resident.phone}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="mail-outline" size={16} color="#64748B" />
              <Text style={styles.metaLabel}>Email:</Text>
              <Text style={styles.metaValue}>{resident.email || "N/A"}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={16} color="#64748B" />
              <Text style={styles.metaLabel}>Move-in Date:</Text>
              <Text style={styles.metaValue}>{resident.checkInDate}</Text>
            </View>
          </View>

          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.reallocBtn}
              onPress={() => router.push("/hostel-manager/room-allocation")}
            >
              <Ionicons name="swap-horizontal" size={15} color="#2563EB" />
              <Text style={styles.reallocBtnText}>Change Room</Text>
            </TouchableOpacity>

            {resident.status === "Active" && (
              <TouchableOpacity
                style={styles.checkoutBtn}
                onPress={handleCheckout}
              >
                <Ionicons name="log-out-outline" size={15} color="#DC2626" />
                <Text style={styles.checkoutBtnText}>Check Out</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Right Column: Academic & Gate Pass History */}
        <View style={styles.detailsRightCol}>
          {/* Academic Particulars Card */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Academic Particulars</Text>
            <View style={styles.infoRowsGrid}>
              <View style={styles.infoBox}>
                <Text style={styles.infoKey}>Department / Course</Text>
                <Text style={styles.infoVal}>{resident.course || "B.Tech"}</Text>
              </View>
              <View style={styles.infoBox}>
                <Text style={styles.infoKey}>Academic Year</Text>
                <Text style={styles.infoVal}>{resident.year || "3rd Year"}</Text>
              </View>
              <View style={styles.infoBox}>
                <Text style={styles.infoKey}>Emergency Contact</Text>
                <Text style={styles.infoVal}>{resident.emergencyContact || "9876543299"}</Text>
              </View>
              <View style={styles.infoBox}>
                <Text style={styles.infoKey}>Hostel Fee Status</Text>
                <Text style={[styles.infoVal, { color: "#059669" }]}>Cleared (₹5,000 / mo)</Text>
              </View>
            </View>
          </View>

          {/* Gate Pass & Activity Log */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Recent Gate Pass Records</Text>
            {gatePasses.length === 0 ? (
              <Text style={styles.emptyText}>No gate pass requests recorded for this resident yet.</Text>
            ) : (
              gatePasses.map((pass) => (
                <View key={pass.id} style={styles.passRow}>
                  <View>
                    <Text style={styles.passPurpose}>Reason: {pass.purpose}</Text>
                    <Text style={styles.passTime}>Out: {pass.outTime} • Requested: {pass.requestedAt}</Text>
                  </View>
                  <View style={[styles.statusTag, pass.status === "Approved" ? styles.statusActive : styles.statusPending]}>
                    <Text style={[styles.statusText, pass.status === "Approved" ? styles.statusActiveText : styles.statusPendingText]}>
                      {pass.status}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </View>
    </HostelLayout>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  backBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  mainGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  profileCard: {
    width: "32%",
    minWidth: 280,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  avatarBig: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarLetter: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
  },
  profileName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  profileId: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    marginBottom: 8,
  },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: "#ECFDF5",
  },
  statusInactive: {
    backgroundColor: "#F1F5F9",
  },
  statusPending: {
    backgroundColor: "#FEF3C7",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  statusActiveText: {
    color: "#059669",
  },
  statusInactiveText: {
    color: "#64748B",
  },
  statusPendingText: {
    color: "#D97706",
  },
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 16,
  },
  metaList: {
    width: "100%",
    gap: 10,
    marginBottom: 20,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaLabel: {
    fontSize: 12,
    color: "#64748B",
    width: 100,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1E293B",
    flex: 1,
  },
  cardActions: {
    width: "100%",
    gap: 8,
  },
  reallocBtn: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  reallocBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  checkoutBtn: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  checkoutBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#DC2626",
  },
  detailsRightCol: {
    flex: 1,
    minWidth: 320,
    gap: 16,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 14,
  },
  infoRowsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  infoBox: {
    width: "48%",
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  infoKey: {
    fontSize: 11,
    color: "#64748B",
    marginBottom: 4,
  },
  infoVal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
  },
  passRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  passPurpose: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
  },
  passTime: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  emptyText: {
    fontSize: 12,
    color: "#94A3B8",
    fontStyle: "italic",
  },
});