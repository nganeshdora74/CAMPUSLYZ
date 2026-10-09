import React, { useState } from "react";
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
import HostelLayout from "../../components/hostel/HostelLayout";
import hostelDataService, { HostelRoom } from "../../services/hostelDataService";

export default function AvailableRoomsScreen() {
  const { width } = useWindowDimensions();
  const [rooms, setRooms] = useState<HostelRoom[]>(
    hostelDataService.getRooms().filter((r) => r.status === "Available")
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"All" | "Single" | "Double" | "Triple">("All");
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Allocate Modal
  const [allocModal, setAllocModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<HostelRoom | null>(null);
  const [studentNameInput, setStudentNameInput] = useState("");

  const refreshRooms = () => {
    setRooms(hostelDataService.getRooms().filter((r) => r.status === "Available"));
  };

  const filtered = rooms.filter((r) => {
    const matchesType = typeFilter === "All" || r.type === typeFilter;
    const matchesSearch =
      r.roomNo.includes(searchQuery) ||
      (r.floor && r.floor.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesType && matchesSearch;
  });

  const handleAllocate = () => {
    if (!studentNameInput.trim() || !selectedRoom) {
      Alert.alert("Required", "Please enter the resident name");
      return;
    }
    hostelDataService.allocateRoom(studentNameInput.trim(), selectedRoom.roomNo);
    setStudentNameInput("");
    setAllocModal(false);
    setSelectedRoom(null);
    refreshRooms();
    setActionNotice(`Room ${selectedRoom.roomNo} successfully booked for ${studentNameInput}`);
    setTimeout(() => setActionNotice(null), 3500);
  };

  return (
    <HostelLayout
      activeNav="rooms"
      pageTitle="Available Rooms"
      pageSubtitle={`${rooms.length} rooms ready for immediate student move-in`}
      actionNotice={actionNotice}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search available room number or floor..."
      rightAction={
        <TouchableOpacity
          style={styles.allocNavBtn}
          onPress={() => router.push("/hostel-manager/room-allocation")}
        >
          <Ionicons name="key-outline" size={16} color="#FFFFFF" />
          <Text style={styles.allocNavBtnText}>Allocation Wizard</Text>
        </TouchableOpacity>
      }
    >
      {/* Type Filter Pills */}
      <View style={styles.pillRow}>
        {(["All", "Single", "Double", "Triple"] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.pill, typeFilter === t && styles.pillActive]}
            onPress={() => setTypeFilter(t)}
          >
            <Text style={[styles.pillText, typeFilter === t && styles.pillTextActive]}>
              {t === "All" ? `All Types (${rooms.length})` : `${t} Rooms`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Grid of Available Rooms */}
      <View style={styles.gridContainer}>
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="alert-circle-outline" size={40} color="#94A3B8" />
            <Text style={styles.emptyText}>No available rooms match your criteria</Text>
          </View>
        ) : (
          filtered.map((room) => (
            <View key={room.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.roomNoBadge}>
                  <Ionicons name="business" size={16} color="#059669" />
                  <Text style={styles.roomNoText}>Room {room.roomNo}</Text>
                </View>
                <View style={styles.vacantBadge}>
                  <Text style={styles.vacantBadgeText}>Ready to Book</Text>
                </View>
              </View>

              <View style={styles.cardDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Room Type:</Text>
                  <Text style={styles.detailValue}>{room.type} Bedded</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Capacity:</Text>
                  <Text style={styles.detailValue}>{room.capacity} Students</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Floor:</Text>
                  <Text style={styles.detailValue}>{room.floor || "1st Floor"}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Monthly Rent:</Text>
                  <Text style={styles.detailRent}>₹{room.rent || 4500} / mo</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.bookBtn}
                onPress={() => {
                  setSelectedRoom(room);
                  setAllocModal(true);
                }}
              >
                <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
                <Text style={styles.bookBtnText}>Book / Allocate</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* Allocate Modal */}
      <Modal visible={allocModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Book Room {selectedRoom?.roomNo}
              </Text>
              <TouchableOpacity onPress={() => setAllocModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.formLabel}>Resident Student Name</Text>
            <TextInput
              value={studentNameInput}
              onChangeText={setStudentNameInput}
              placeholder="Enter student full name..."
              style={styles.formInput}
            />

            <View style={styles.infoSummary}>
              <Text style={styles.infoSummaryText}>
                🛏️ Type: {selectedRoom?.type} (Capacity {selectedRoom?.capacity})
              </Text>
              <Text style={styles.infoSummaryText}>
                🏢 Floor: {selectedRoom?.floor || "1st Floor"}
              </Text>
              <Text style={styles.infoSummaryText}>
                💰 Rent: ₹{selectedRoom?.rent || 4500} / month
              </Text>
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setAllocModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleAllocate}
              >
                <Text style={styles.confirmBtnText}>Confirm Allocation</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </HostelLayout>
  );
}

const styles = StyleSheet.create({
  allocNavBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  allocNavBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  pillRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  pill: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  pillActive: {
    backgroundColor: "#059669",
    borderColor: "#059669",
  },
  pillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  pillTextActive: {
    color: "#FFFFFF",
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  card: {
    width: "31.5%",
    minWidth: 260,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  roomNoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  roomNoText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  vacantBadge: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  vacantBadgeText: {
    color: "#059669",
    fontSize: 11,
    fontWeight: "700",
  },
  cardDetails: {
    gap: 6,
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailLabel: {
    fontSize: 12,
    color: "#64748B",
  },
  detailValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1E293B",
  },
  detailRent: {
    fontSize: 13,
    fontWeight: "800",
    color: "#2563EB",
  },
  bookBtn: {
    backgroundColor: "#059669",
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  bookBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyState: {
    width: "100%",
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: "#64748B",
    fontSize: 14,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 20,
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
  formLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
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
  infoSummary: {
    backgroundColor: "#F1F5F9",
    padding: 12,
    borderRadius: 8,
    marginTop: 14,
    gap: 4,
  },
  infoSummaryText: {
    fontSize: 12,
    color: "#334155",
    fontWeight: "500",
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
  confirmBtn: {
    backgroundColor: "#059669",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  confirmBtnText: {
    fontSize: 13,
    color: "#FFFFFF",
    fontWeight: "700",
  },
});